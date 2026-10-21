import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import crypto from 'crypto';
import fs from 'fs';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { v2 as cloudinary } from 'cloudinary';
import {
  MenuItem, Order, Reservation, Message, CateringRequest,
  CarouselSlide, RestaurantTable, TableOrder, WasteRecord,
  Employee, PayrollRecord, GalleryImage, Chef,
  ExpenseEntry, CashRegisterEntry, InventoryItem, StockMovement, ItemReview,
  InvoiceCounter, PrintJob, UserAccount, RestaurantSettings, DeletedOrder
} from './server/models/index.js';
import { seedDatabaseIfEmpty } from './server/seed.js';

// Global error handlers to prevent server crashes
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down gracefully...', err);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Shutting down gracefully...', err);
});

dotenv.config();

const app = express();

// Trust Render's reverse proxy so that X-Forwarded-For is read correctly.
// Without this, express-rate-limit throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
// and aborts every request, causing ERR_CONNECTION_CLOSED on the client.
app.set('trust proxy', 1);

app.use(cors({
  origin: true, // reflect the request origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Helmet: disable CSP entirely — the app is an admin SPA served from
// the same origin, so Helmet's restrictive default CSP was blocking
// browser fetch() calls (connect-src 'self') through Cloudflare's CDN.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
}));

// Apply rate limiting
const pollingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3000, // high limit for 1-second polling
  message: 'Too many tracking requests from this IP, please try again later.'
});
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  skip: (req) => req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === 'localhost' || req.originalUrl.includes('/orders/status') || req.originalUrl.includes('/tableOrders/status') || req.originalUrl.includes('/deleted-orders') || req.originalUrl.includes('/state/admin'),
  message: 'Too many requests from this IP, please try again later.'
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 login requests per windowMs
  message: 'Too many login attempts from this IP, please try again later.'
});
app.use('/api/orders/status', pollingLimiter);
app.use('/api/tableOrders/status', pollingLimiter);
app.use('/api/', apiLimiter);

// Need increased limit for base64 image uploads
app.use(express.json({ limit: '10mb' }));

// Gzip compress all responses — critical for Render's Cloudflare HTTP/2 layer
// which drops connections on large uncompressed JSON payloads.
app.use(compression());

// ----- Self Ping Route to keep Render alive -----
app.get('/api/ping', (req, res) => {
  res.status(200).send('pong');
});

// ----- QZ Tray Certificate Endpoint -----
app.get('/api/qz/cert', (req, res) => {
  try {
    const cert = fs.readFileSync('certs/digital-certificate.txt', 'utf8');
    res.send(cert);
  } catch (error) {
    res.status(500).send('Certificate not found');
  }
});

// ----- QZ Tray Signature Endpoint -----
app.post('/api/qz/sign', express.json(), (req, res) => {
  try {
    const requestToSign = req.body.request;
    if (!requestToSign) return res.status(400).send('Missing request param');
    const privateKey = fs.readFileSync('certs/private-key.pem', 'utf8');
    const sign = crypto.createSign('SHA512');
    sign.update(requestToSign);
    sign.end();
    const signature = sign.sign(privateKey, 'base64');
    res.send(signature);
  } catch (error) {
    console.error('QZ Sign Error:', error);
    res.status(500).send('Signature failed');
  }
});

const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Configure MongoDB
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
      console.log('Connected to MongoDB');
      await seedDatabaseIfEmpty();
      
      // Remove old hardcoded 'manager' user if it exists
      await UserAccount.deleteOne({ username: 'manager' }).catch(err => console.error(err));

      // ── One-time migration: backfill missing `date` field on legacy CashRegisterEntries ──
      // Old records may have been saved before the `date` field was introduced, causing
      // the POS "Open Register" popup to appear every login because hasRegisterToday fails.
      try {
        const legacyEntries = await CashRegisterEntry.find({ $or: [{ date: null }, { date: '' }, { date: { $exists: false } }] });
        for (const entry of legacyEntries) {
          const ts = entry.openedAt || entry.closedAt;
          if (ts) {
            const derivedDate = new Date(ts).toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
            await CashRegisterEntry.updateOne({ id: entry.id }, { $set: { date: derivedDate } });
          }
        }
        if (legacyEntries.length > 0) {
          console.log(`[Migration] Backfilled date on ${legacyEntries.length} legacy CashRegisterEntry records.`);
        }
      } catch (err) {
        console.error('[Migration] Failed to backfill CashRegisterEntry dates:', err);
      }

      // ── Self-healing migration: restore item names and prices on any corrupted PrintJobs ──
      try {
        const corruptedJobs = await PrintJob.find({
          $or: [
            { 'snapshot.items': { $elemMatch: { name: 'Item', price: 0 } } },
            { 'snapshot.items': { $elemMatch: { price: 0 } } },
            { 'snapshot.items': { $size: 0 } },
            { snapshot: null }
          ]
        });
        let autoRepaired = 0;
        for (const job of corruptedJobs) {
          const ord = await Order.findOne({
            $or: [{ id: job.orderId }, { orderNumber: job.invoiceNumber }, { invoiceNumber: job.invoiceNumber }]
          }).lean() || await TableOrder.findOne({
            $or: [{ id: job.orderId }, { orderNumber: job.invoiceNumber }, { invoiceNumber: job.invoiceNumber }]
          }).lean();

          if (ord && Array.isArray(ord.items) && ord.items.length > 0) {
            const fixedItems = ord.items.map(ci => {
              let name = '';
              if (ci.item && typeof ci.item.name === 'string' && ci.item.name.trim() && ci.item.name.trim().toLowerCase() !== 'item') {
                name = ci.item.name.trim();
              } else if (typeof ci.name === 'string' && ci.name.trim() && ci.name.trim().toLowerCase() !== 'item') {
                name = ci.name.trim();
              } else if (ci.item && typeof ci.item.title === 'string' && ci.item.title.trim()) {
                name = ci.item.title.trim();
              } else if (typeof ci.title === 'string' && ci.title.trim()) {
                name = ci.title.trim();
              } else {
                name = (ci.name || ci.item?.name || 'Item').trim();
              }

              const numOrZero = (v) => { const n = Number(v); return !isNaN(n) && isFinite(n) ? n : 0; };
              const p1 = numOrZero(ci.price);
              const p2 = ci.item ? numOrZero(ci.item.price) : 0;
              const p3 = numOrZero(ci.unitPrice || ci.item?.unitPrice || ci.sellingPrice || ci.item?.sellingPrice);
              const price = p1 > 0 ? p1 : (p2 > 0 ? p2 : 0);
              const quantity = Math.max(1, numOrZero(ci.quantity || ci.qty || 1));
              const variant = ci.variant || ci.selectedVariant?.name || (ci.item && ci.item.variant) || '';
              const note = ci.note || ci.specialRequest || (ci.item && (ci.item.note || ci.item.specialRequest)) || '';
              return { name, quantity, price, variant, note };
            });

            const tableMatch = (ord.address || '').match(/table\s*(\d+)/i) || (job.orderType || '').match(/table\s*(\d+)/i);
            const tableNo = ord.tableNumber ? String(ord.tableNumber) : (tableMatch ? tableMatch[1] : (job.tableNo || ''));
            const isTable = Boolean(ord.isTableOrder || (ord.address && ord.address.toLowerCase().includes('table')) || tableNo);

            job.snapshot = {
              ...(job.snapshot || {}),
              invoiceNumber: job.invoiceNumber,
              orderId: ord.id || job.orderId,
              orderType: isTable ? (tableNo ? `Dine In — Table ${tableNo}` : 'Dine In') : (job.orderType || 'POS'),
              tableNo,
              customerName: ord.customerName || job.customerName || (isTable ? `Table ${tableNo} Guest` : 'Guest'),
              cashierName: job.printedBy || ord.cashierName || 'Staff',
              dateTime: job.printedAt ? new Date(job.printedAt).toLocaleString() : new Date().toLocaleString(),
              items: fixedItems,
              subtotal: ord.subtotal || ord.total || job.total || 0,
              discount: ord.discount || 0,
              total: ord.total || job.total || 0,
              paymentMethod: ord.paymentMethod || job.paymentMethod || 'Cash',
              amountPaid: ord.total || job.total || 0,
              change: 0,
            };
            job.tableNo = tableNo;
            job.orderType = job.snapshot.orderType;
            job.markModified('snapshot');
            await job.save();
            autoRepaired++;
          }
        }
        if (autoRepaired > 0) {
          console.log(`[AutoRepair] Successfully repaired ${autoRepaired} corrupted PrintJob snapshots with genuine items.`);
        }
      } catch (repErr) {
        console.warn('[AutoRepair] PrintJob repair notice:', repErr.message);
      }

      // ── Clean up legacy demo tables & accidental HOME DELIVERY tables ──
      // The restaurant has strictly 5 dining tables (1, 2, 3, 4, 5).
      try {
        await RestaurantTable.deleteMany({
          $or: [
            { id: { $in: ['T06', 'V01', 'V02', 'O01', 'O02', 'HOME DELIVERY'] } },
            { tableNumber: /home delivery/i }
          ]
        });
        await RestaurantTable.updateMany(
          { area: { $in: ['VIP', 'Outdoor'] } },
          { $set: { area: 'Dining' } }
        );
      } catch (err) {
        console.error('Failed to cleanup demo tables:', err);
      }
      
    })
    .catch(err => console.error('MongoDB connection error:', err));
} else {
  console.error("Missing MONGO_URI");
}

// Configure Cloudinary
if (process.env.CLOUDINARY_URL) {
  // CLOUDINARY_URL is automatically parsed by the SDK
}

// Middleware to verify JWT token
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

app.post('/api/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Always allow master admin
    if ((username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) || (username === 'admin' && password === 'admin')) {
      const token = jwt.sign({ username, role: 'admin' }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });
      return res.json({ token, role: 'admin', username: 'Admin' });
    }
    
    // Check MongoDB for dynamically created managers
    const user = await UserAccount.findOne({ username, password });
    if (user) {
      const token = jwt.sign({ username: user.username, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });
      return res.json({ token, role: user.role, username: user.username });
    }
    
    res.status(401).json({ error: 'Invalid credentials' });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/state/public', async (req, res) => {
  try {
    // Get delivery settings (auto-create with defaults if missing)
    const settings = await RestaurantSettings.findOneAndUpdate(
      { key: 'main' },
      { $setOnInsert: { key: 'main', deliverySettings: { baseFee: 40, baseKm: 2, extraPerKm: 10, restaurantLat: 24.90725, restaurantLng: 91.8608, locationName: 'WV46+W8, Sylhet (Subidbazar Point)' } } },
      { upsert: true, new: true }
    );
    const state = {
      menuItems: await MenuItem.find().sort({ _id: -1 }),
      carouselSlides: await CarouselSlide.find().sort({ order: 1 }),
      galleryImages: await GalleryImage.find(),
      chefs: await Chef.find(),
      reviews: await ItemReview.find().sort({ date: -1 }).limit(20),
      tables: await RestaurantTable.find().sort({ tableNumber: 1 }),
      deliverySettings: normalizeDeliverySettings(settings?.deliverySettings),
      pixelSettings: normalizePixelSettings(settings?.pixelSettings),
    };
    res.json(state);
  } catch (error) {
    console.error("Failed to load public state", error);
    res.status(500).json({ error: "Failed to load public state" });
  }
});

// Helper to ensure G-0LZDNZQDYE (pre-installed GA4) is always populated and valid
function normalizePixelSettings(raw) {
  const p = raw ? (raw.toObject ? raw.toObject() : raw) : {};
  return {
    enabled: p.enabled !== undefined ? p.enabled : true,
    metaPixelId: p.metaPixelId || '',
    metaPixelEnabled: p.metaPixelEnabled !== undefined ? p.metaPixelEnabled : true,
    metaTestEventCode: p.metaTestEventCode || '',
    metaAccessToken: p.metaAccessToken || '',
    metaCapiEnabled: p.metaCapiEnabled !== undefined ? p.metaCapiEnabled : true,
    googleTagId: (p.googleTagId && p.googleTagId.trim()) ? p.googleTagId.trim() : 'G-0LZDNZQDYE',
    googleTagEnabled: p.googleTagEnabled !== undefined ? p.googleTagEnabled : true,
    tiktokPixelId: p.tiktokPixelId || '',
    tiktokPixelEnabled: p.tiktokPixelEnabled !== undefined ? p.tiktokPixelEnabled : false,
    trackPageView: p.trackPageView !== undefined ? p.trackPageView : true,
    trackViewContent: p.trackViewContent !== undefined ? p.trackViewContent : true,
    trackAddToCart: p.trackAddToCart !== undefined ? p.trackAddToCart : true,
    trackInitiateCheckout: p.trackInitiateCheckout !== undefined ? p.trackInitiateCheckout : true,
    trackPurchase: p.trackPurchase !== undefined ? p.trackPurchase : true,
    trackLeadOrReservation: p.trackLeadOrReservation !== undefined ? p.trackLeadOrReservation : true,
    trackContact: p.trackContact !== undefined ? p.trackContact : true,
    customHeadScript: p.customHeadScript || '',
  };
}

const DEFAULT_SYLHET_AREAS = [
  { id: 'area-1', name: 'Subidbazar / Mitali Complex (Restaurant Area)', fee: 40, distKm: 0.5 },
  { id: 'area-2', name: 'Amberkhana Point', fee: 40, distKm: 1.2 },
  { id: 'area-3', name: 'Pathantula / Modina Market', fee: 40, distKm: 1.8 },
  { id: 'area-4', name: 'Chowhatta / Rikabibazar', fee: 50, distKm: 2.3 },
  { id: 'area-5', name: 'Zindabazar', fee: 50, distKm: 2.8 },
  { id: 'area-6', name: 'Kumarpara / Mira Bazar', fee: 60, distKm: 3.5 },
  { id: 'area-7', name: 'Lamabazar', fee: 50, distKm: 2.5 },
  { id: 'area-8', name: 'Shibganj', fee: 70, distKm: 4.8 },
  { id: 'area-9', name: 'Upashohor', fee: 80, distKm: 5.2 },
  { id: 'area-10', name: 'Akhalia / SUST Campus', fee: 70, distKm: 5.0 },
  { id: 'area-11', name: 'Tilagarh / MC College', fee: 90, distKm: 6.1 },
  { id: 'area-12', name: 'South Surma / Kadamtoli', fee: 90, distKm: 6.5 },
  { id: 'area-13', name: 'Airport Road / Osmani Airport', fee: 100, distKm: 7.5 },
];

// Helper to ensure delivery settings has valid formula, WV46+W8 Sylhet GPS defaults, and custom delivery areas
function normalizeDeliverySettings(raw) {
  const ds = raw ? (raw.toObject ? raw.toObject() : raw) : {};
  let customAreas = [];
  if (Array.isArray(ds.customAreas) && ds.customAreas.length > 0) {
    customAreas = ds.customAreas.map((a, idx) => ({
      id: String(a.id || `area-${idx + 1}-${Date.now()}`),
      name: String(a.name || '').trim(),
      fee: Math.max(0, typeof a.fee === 'number' ? a.fee : (parseFloat(a.fee) || 40)),
      distKm: a.distKm !== undefined && a.distKm !== null && !isNaN(Number(a.distKm)) ? Number(a.distKm) : undefined,
    })).filter(a => a.name.length > 0);
  } else {
    customAreas = DEFAULT_SYLHET_AREAS;
  }

  return {
    baseFee: typeof ds.baseFee === 'number' ? ds.baseFee : 40,
    baseKm: typeof ds.baseKm === 'number' ? ds.baseKm : 2,
    extraPerKm: typeof ds.extraPerKm === 'number' ? ds.extraPerKm : 10,
    restaurantLat: typeof ds.restaurantLat === 'number' && ds.restaurantLat !== 0 ? ds.restaurantLat : 24.90725,
    restaurantLng: typeof ds.restaurantLng === 'number' && ds.restaurantLng !== 0 ? ds.restaurantLng : 91.8608,
    locationName: ds.locationName || 'WV46+W8, Sylhet (Subidbazar Point)',
    customAreas,
  };
}

// ── Pixel Settings API ────────────────────────────────────────────────────────
app.get('/api/settings/pixel', async (req, res) => {
  try {
    const settings = await RestaurantSettings.findOne({ key: 'main' });
    res.json(normalizePixelSettings(settings?.pixelSettings));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pixel settings' });
  }
});

app.put('/api/settings/pixel', authenticateJWT, async (req, res) => {
  try {
    const pixelSettings = normalizePixelSettings(req.body);
    const updated = await RestaurantSettings.findOneAndUpdate(
      { key: 'main' },
      { $set: { pixelSettings } },
      { upsert: true, new: true }
    );
    res.json({ success: true, pixelSettings: updated.pixelSettings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update pixel settings' });
  }
});

// ── Server-Side Pixel Conversions API (CAPI) Endpoint ─────────────────────────
app.post('/api/pixel/event', async (req, res) => {
  try {
    const { eventName, payload, eventId, testEventCode } = req.body;
    const settings = await RestaurantSettings.findOne({ key: 'main' });
    const pixelSettings = settings?.pixelSettings;

    const pixelId = (pixelSettings?.metaPixelId || '').trim();
    const accessToken = (pixelSettings?.metaAccessToken || '').trim();
    const effectiveTestCode = (testEventCode || pixelSettings?.metaTestEventCode || '').trim();

    // If access token and pixel ID are provided, forward to Meta Graph API Conversions endpoint
    if (pixelId && accessToken && pixelSettings?.metaCapiEnabled !== false) {
      try {
        const metaUrl = `https://graph.facebook.com/v19.0/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`;
        const metaBody = {
          data: [
            {
              event_name: eventName,
              event_time: Math.floor(Date.now() / 1000),
              event_id: eventId || `srv_${Date.now()}`,
              event_source_url: req.headers.referer || 'https://pizzora.bd',
              action_source: 'website',
              user_data: {
                client_ip_address: req.ip,
                client_user_agent: req.headers['user-agent']
              },
              custom_data: payload || {}
            }
          ],
          ...(effectiveTestCode ? { test_event_code: effectiveTestCode } : {})
        };

        const metaResponse = await fetch(metaUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(metaBody)
        });
        const metaResult = await metaResponse.json();
        return res.json({
          success: metaResponse.ok,
          metaResponse: metaResult,
          eventId,
          mode: 'graph-api-sent',
          message: metaResponse.ok
            ? 'Event successfully received and forwarded to Meta Conversions API (CAPI)'
            : (metaResult?.error?.message || 'Meta CAPI returned an error')
        });
      } catch (graphErr) {
        return res.json({
          success: false,
          eventId,
          mode: 'graph-api-error',
          message: graphErr?.message || 'Failed connecting to Meta Graph API'
        });
      }
    }

    // If no access token configured yet, CAPI proxy successfully logs and validates payload
    return res.json({
      success: true,
      eventId,
      mode: 'server-verified',
      message: pixelId
        ? 'Server endpoint verified. Add Meta Access Token in Settings to enable direct Graph API CAPI forwarding.'
        : 'Pixel ID not yet configured on server.'
    });
  } catch (error) {
    console.error('Server CAPI error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Delivery Settings API ─────────────────────────────────────────────────────
app.get('/api/settings/delivery', async (req, res) => {
  try {
    const settings = await RestaurantSettings.findOne({ key: 'main' });
    res.json(normalizeDeliverySettings(settings?.deliverySettings));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch delivery settings' });
  }
});

app.put('/api/settings/delivery', authenticateJWT, async (req, res) => {
  try {
    const { baseFee, baseKm, extraPerKm, restaurantLat, restaurantLng, locationName, customAreas } = req.body;
    if ([baseFee, baseKm, extraPerKm].some(v => typeof v !== 'number' || v < 0)) {
      return res.status(400).json({ error: 'Invalid delivery settings: fees must be non-negative numbers' });
    }

    let sanitizedAreas = [];
    if (Array.isArray(customAreas)) {
      sanitizedAreas = customAreas.map((a, idx) => ({
        id: String(a.id || `area-${idx + 1}-${Date.now()}`),
        name: String(a.name || '').trim(),
        fee: Math.max(0, typeof a.fee === 'number' ? a.fee : (parseFloat(a.fee) || 40)),
        distKm: a.distKm !== undefined && a.distKm !== null && !isNaN(Number(a.distKm)) ? Number(a.distKm) : undefined,
      })).filter(a => a.name.length > 0);
    }

    const updateObj = {
      baseFee: Number(baseFee),
      baseKm: Number(baseKm) > 0 ? Number(baseKm) : 2,
      extraPerKm: Number(extraPerKm),
      restaurantLat: typeof restaurantLat === 'number' && restaurantLat !== 0 ? restaurantLat : 24.90725,
      restaurantLng: typeof restaurantLng === 'number' && restaurantLng !== 0 ? restaurantLng : 91.8608,
      locationName: locationName || 'WV46+W8, Sylhet (Subidbazar Point)',
      customAreas: sanitizedAreas,
    };
    const updated = await RestaurantSettings.findOneAndUpdate(
      { key: 'main' },
      { $set: { deliverySettings: updateObj } },
      { upsert: true, new: true }
    );
    const normalized = normalizeDeliverySettings(updated.deliverySettings);
    io.emit('REMOTE_ACTION', { type: 'UPDATE_DELIVERY_SETTINGS', payload: normalized });
    res.json({ success: true, deliverySettings: normalized });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update delivery settings' });
  }
});

app.get('/api/state/admin', authenticateJWT, async (req, res) => {
  try {
    // Only load today's orders + any still-active orders (not yet Delivered/Cancelled).
    // This keeps the response small no matter how many total orders exist.
    // Older orders are available on-demand via GET /api/orders/history (paginated).
    // Calculate start of current month in Dhaka timezone (UTC+6)
    const dhakaOffset = 6 * 60 * 60 * 1000;
    const dhakaStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
    const [year, month] = dhakaStr.split('-').map(Number);
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1)).getTime() - dhakaOffset;
    const startOfMonthIso = new Date(startOfMonth).toISOString();

    // Run ALL queries in parallel — sequential awaits were causing Render/Cloudflare
    // to time out the HTTP/2 stream before the response could be sent.
    const [
      orders, reservations, messages, cateringRequests, tables,
      tableOrders, wasteRecords, employees, payrollRecords,
      expenses, cashRegister, inventory, stockMovements, users,
      deletedOrders
    ] = await Promise.all([
      // Load all current month's orders + any still-active orders (guarantees Month, Week, Today match)
      Order.find({
        $or: [
          { createdAt: { $gte: startOfMonthIso } },
          { status: { $nin: ['Delivered', 'Cancelled'] } }
        ]
      }).sort({ createdAt: -1 }).limit(400).then(async monthOrders => {
        if (monthOrders.length < 100) {
          return Order.find().sort({ createdAt: -1 }).limit(100);
        }
        return monthOrders;
      }),
      Reservation.find().sort({ createdAt: -1 }).limit(100),
      Message.find().sort({ createdAt: -1 }).limit(100),
      CateringRequest.find().sort({ createdAt: -1 }).limit(100),
      RestaurantTable.find().sort({ tableNumber: 1 }),
      TableOrder.find({
        $or: [
          { createdAt: { $gte: startOfMonth } },
          { status: { $nin: ['Paid', 'Cancelled'] } }
        ]
      }).sort({ createdAt: -1 }).limit(200),
      WasteRecord.find().sort({ date: -1 }),
      Employee.find().sort({ name: 1 }),
      PayrollRecord.find().sort({ year: -1, month: -1 }),
      ExpenseEntry.find().sort({ date: -1 }),       // All expenses needed for accurate P&L
      CashRegisterEntry.find().sort({ id: -1 }),    // All register entries for auditing
      InventoryItem.find().sort({ name: 1 }),       // All inventory items
      StockMovement.find().sort({ date: -1 }),      // All stock movements
      UserAccount.find().sort({ createdAt: -1 }),
      DeletedOrder.find({}).sort({ deletedAt: -1 }).limit(500)
    ]);

    res.json({
      orders, reservations, messages, cateringRequests, tables,
      tableOrders, wasteRecords, employees, payrollRecords,
      expenses, cashRegister, inventory, stockMovements, users,
      deletedOrders
    });
  } catch (error) {
    console.error("Failed to load admin state", error);
    res.status(500).json({ error: "Failed to load admin state" });
  }
});

// Analytics Endpoint (Calculates stats across entire database)
app.get('/api/analytics', authenticateJWT, async (req, res) => {
  try {
    const start = Date.now();
    // Only fetch minimal fields needed for analytics to save memory
    const orders = await Order.find(
      { status: { $in: ['Delivered', 'Paid'] } },
      'createdAt total orderNumber id'
    ).lean();
    const tableOrders = await TableOrder.find(
      { status: 'Paid' },
      'createdAt total invoiceNumber id'
    ).lean();
    
    // Deduplicate table orders that already exist as completed orders in Order collection
    const existingOrderIdentifiers = new Set();
    orders.forEach(o => {
      if (o.orderNumber) existingOrderIdentifiers.add(String(o.orderNumber).trim().toUpperCase());
      if (o.id) existingOrderIdentifiers.add(String(o.id).trim().toUpperCase());
    });

    const dedupedTableOrders = tableOrders.filter(to => {
      const inv = to.invoiceNumber ? String(to.invoiceNumber).trim().toUpperCase() : '';
      const tid = to.id ? String(to.id).trim().toUpperCase() : '';
      if (inv && existingOrderIdentifiers.has(inv)) return false;
      if (tid && existingOrderIdentifiers.has(tid)) return false;
      return true;
    });

    const allOrders = [
      ...orders.map(o => {
        const ts = new Date(o.createdAt).getTime();
        return {
          timestamp: isNaN(ts) ? 0 : ts,
          total: typeof o.total === 'number' && !isNaN(o.total) ? o.total : 0
        };
      }),
      ...dedupedTableOrders.map(to => {
        const ts = typeof to.createdAt === 'number' ? to.createdAt : new Date(to.createdAt).getTime();
        return {
          timestamp: isNaN(ts) ? 0 : ts,
          total: typeof to.total === 'number' && !isNaN(to.total) ? to.total : 0
        };
      })
    ];
    
    const dhakaOffset = 6 * 60 * 60 * 1000;
    
    // Time boundaries based on Asia/Dhaka
    const dhakaStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
    const utcMidnight = new Date(dhakaStr + 'T00:00:00Z').getTime();
    const startOfDay = utcMidnight - dhakaOffset;
    
    const rawDayOfWeek = new Date(dhakaStr).getUTCDay(); // 0 is Sunday
    const diffToMonday = rawDayOfWeek === 0 ? -6 : 1 - rawDayOfWeek;
    const startOfWeek = startOfDay + (diffToMonday * 86400000);
    
    const [year, month] = dhakaStr.split('-').map(Number);
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1)).getTime() - dhakaOffset;
    const startOfYear = new Date(Date.UTC(year, 0, 1)).getTime() - dhakaOffset;

    let totalRevenue = 0;
    let todayRevenue = 0;
    let weeklyRevenue = 0;
    let monthlyRevenue = 0;
    let yearlyRevenue = 0;
    let totalCustomers = allOrders.length;

    const hours = Array.from({length: 24}, (_, i) => ({ name: `${i}:00`, sales: 0, orders: 0 }));
    const days = Array.from({length: 7}, (_, i) => {
      const d = new Date(startOfWeek + (i * 86400000) + dhakaOffset);
      return { name: d.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', weekday: 'short' }), sales: 0, orders: 0, dayIndex: d.getUTCDay() };
    });
    
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthDays = Array.from({length: daysInMonth}, (_, i) => {
      const d = new Date(startOfMonth + (i * 86400000) + dhakaOffset);
      return { name: d.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }), sales: 0, orders: 0, dateIndex: d.getUTCDate() };
    });
    
    const months = Array.from({length: 12}, (_, i) => {
      const d = new Date(Date.UTC(year, i, 1));
      return { name: d.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', year: 'numeric' }), sales: 0, orders: 0, monthIndex: i };
    });

    allOrders.forEach(o => {
      totalRevenue += o.total;
      
      if (o.timestamp >= startOfDay) {
        todayRevenue += o.total;
        const h = new Date(o.timestamp + dhakaOffset).getUTCHours();
        hours[h].sales += o.total;
        hours[h].orders += 1;
      }
      
      if (o.timestamp >= startOfWeek) {
        weeklyRevenue += o.total;
        const d = new Date(o.timestamp + dhakaOffset).getUTCDay();
        const day = days.find(x => x.dayIndex === d);
        if (day) { day.sales += o.total; day.orders += 1; }
      }
      
      if (o.timestamp >= startOfMonth) {
        monthlyRevenue += o.total;
        const d = new Date(o.timestamp + dhakaOffset).getUTCDate();
        const day = monthDays.find(x => x.dateIndex === d);
        if (day) { day.sales += o.total; day.orders += 1; }
      }
      
      if (o.timestamp >= startOfYear) {
        yearlyRevenue += o.total;
        const m = new Date(o.timestamp + dhakaOffset).getUTCMonth();
        const mObj = months.find(x => x.monthIndex === m);
        if (mObj) { mObj.sales += o.total; mObj.orders += 1; }
      }
    });

    const dailyChart = hours.filter(h => h.sales > 0 || (parseInt(h.name) >= 8 && parseInt(h.name) <= 23));

    res.json({
      success: true,
      totalRevenue,
      todayRevenue,
      weeklyRevenue,
      monthlyRevenue,
      yearlyRevenue,
      totalCustomers,
      dailyChart,
      weeklyChart: days,
      monthlyChart: monthDays,
      yearlyChart: months,
      processTimeMs: Date.now() - start
    });
  } catch (error) {
    console.error("Failed to calculate analytics", error);
    res.status(500).json({ error: 'Failed to calculate analytics' });
  }
});

// Orders History Endpoint (Pagination for older orders)
app.get('/api/orders/history', authenticateJWT, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const skip = parseInt(req.query.skip) || 0;
    const orders = await Order.find().sort({ createdAt: -1 }).skip(skip).limit(limit);
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order history' });
  }
});

app.get('/api/orders/lookup', async (req, res) => {
  try {
    const q = (req.query.q || req.query.id || req.query.invoiceNumber || '').trim();
    if (!q) return res.status(400).json({ success: false, error: 'Query required' });
    const clean = q.replace(/^#/, '');
    const regex = new RegExp(`^#?${clean}$`, 'i');

    let order = await Order.findOne({
      $or: [
        { id: q },
        { id: clean },
        { orderNumber: clean },
        { orderNumber: regex },
        { invoiceNumber: clean },
        { invoiceNumber: regex },
      ]
    }).lean();

    if (!order) {
      order = await TableOrder.findOne({
        $or: [
          { id: q },
          { id: clean },
          { orderNumber: clean },
          { orderNumber: regex },
          { invoiceNumber: clean },
          { invoiceNumber: regex },
        ]
      }).lean();
    }

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/orders/track/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const cleanNum = (orderNumber || '').trim().replace(/^#/, '');
    const order = await Order.findOne({
      $or: [
        { orderNumber: cleanNum },
        { orderNumber: `#${cleanNum}` },
        { orderNumber: { $regex: new RegExp(`^#?${cleanNum}$`, 'i') } }
      ]
    });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

app.post('/api/orders/status', async (req, res) => {
  try {
    const { orderIds } = req.body;
    if (!orderIds || !Array.isArray(orderIds)) return res.status(400).json({ error: 'Invalid orderIds' });
    const orders = await Order.find({ id: { $in: orderIds } }, 'id status');
    res.json({ success: true, statuses: orders.map(o => ({ id: o.id, status: o.status })) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statuses' });
  }
});

app.post('/api/tableOrders/status', async (req, res) => {
  try {
    const { orderIds } = req.body;
    if (!orderIds || !Array.isArray(orderIds)) return res.status(400).json({ error: 'Invalid orderIds' });
    const orders = await TableOrder.find({ id: { $in: orderIds } }, 'id status');
    res.json({ success: true, statuses: orders.map(o => ({ id: o.id, status: o.status })) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statuses' });
  }
});

// ── 30-Day Deleted Orders Archive Endpoints ──────────────────────────────
app.post('/api/orders/delete-cascade', authenticateJWT, async (req, res) => {
  try {
    const { orderId, orderNumber, invoiceNumber, deletedBy, reason } = req.body;
    const identifier = orderId || orderNumber || invoiceNumber;
    if (!identifier) {
      return res.status(400).json({ success: false, error: 'orderId or orderNumber required' });
    }

    const result = await deleteOrderCascade(identifier, deletedBy, reason);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error) {
    console.error('Error in /api/orders/delete-cascade:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/orders/restore', authenticateJWT, async (req, res) => {
  try {
    const { deletedOrderId, restoredBy } = req.body;
    if (!deletedOrderId) {
      return res.status(400).json({ success: false, error: 'deletedOrderId is required' });
    }

    const result = await restoreOrderCascade(deletedOrderId, restoredBy);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error) {
    console.error('Error in /api/orders/restore:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/deleted-orders', authenticateJWT, async (req, res) => {
  try {
    const rawDeleted = await DeletedOrder.find({}).sort({ deletedAt: -1 }).limit(500).lean();
    const deletedOrders = rawDeleted.map(d => ({
      ...d,
      id: d.id || d._id?.toString()
    }));
    res.json({ success: true, deletedOrders, orders: deletedOrders });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch deleted orders' });
  }
});

app.delete('/api/deleted-orders/:id', authenticateJWT, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden: Only administrators can permanently delete archived records' });
    }
    const { id } = req.params;
    if (!id || id === 'undefined') {
      return res.status(400).json({ success: false, error: 'Invalid order ID' });
    }
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ id }, { _id: id }, { orderNumber: id }] }
      : { $or: [{ id }, { orderNumber: id }] };
    const deleteResult = await DeletedOrder.deleteOne(query);
    io.emit('REMOTE_ACTION', { type: 'PURGE_DELETED_ORDER', payload: id });
    res.json({ success: true, message: 'Deleted order permanently purged', deletedCount: deleteResult.deletedCount });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to purge deleted order' });
  }
});

app.post('/api/upload', authenticateJWT, async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'No image data' });

    const result = await cloudinary.uploader.upload(imageBase64, {
      folder: 'pizzora',
      resource_type: 'image'
    });

    res.json({ url: result.secure_url });
  } catch (error) {
    console.error("Cloudinary upload failed", error);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Socket.io Middleware for Authentication
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
      if (!err && user && (user.role === 'admin' || user.role === 'manager')) {
        socket.isAdmin = true;
        socket.join('adminRoom');
      } else {
        socket.isAdmin = false;
      }
      next();
    });
  } else {
    socket.isAdmin = false;
    next();
  }
});

const publicActions = [
  'PLACE_ORDER', 'PLACE_TABLE_ORDER', 'UPDATE_TABLE_ORDER', 'UPDATE_TABLE_ORDER_STATUS', 'ADD_RESERVATION', 'ADD_MESSAGE',
  'ADD_CATERING', 'ADD_REVIEW', 'HELPFUL_REVIEW', 'SET_TABLE_STATUS',
  'ADD_TABLE', 'UPDATE_TABLE', 'DELETE_TABLE'
];

function checkPermanentError(err) {
  const msg = err.message || '';
  return msg.includes('E11000') || msg.includes('validation failed') || msg.includes('Invalid ID format') || msg.includes('Unauthorized');
}

function findRelatedInventoryDeductions(lineItem, allInventory, allMenuItems = []) {
  const deductions = [];
  const qty = Number(lineItem.quantity) || 1;

  const menuItemId = lineItem.item?.id || lineItem.menuItemId || lineItem.id;
  const itemName = lineItem.item?.name || lineItem.name || '';
  const itemCategory = lineItem.item?.category || '';
  const itemIngredients = lineItem.item?.ingredients || [];
  const variantName = lineItem.item?.variant?.name || lineItem.variant?.name || lineItem.specialRequest || '';

  const fullMenuItem = allMenuItems.find(m =>
    (menuItemId && m.id === menuItemId) ||
    (itemName && m.name && m.name.trim().toLowerCase() === itemName.trim().toLowerCase())
  );

  const finalIngredients = (fullMenuItem?.ingredients && fullMenuItem.ingredients.length > 0)
    ? fullMenuItem.ingredients
    : itemIngredients;

  const finalCategory = fullMenuItem?.category || itemCategory;

  // 1. If explicit custom recipe is defined on the MenuItem, use it:
  if (fullMenuItem?.recipe && Array.isArray(fullMenuItem.recipe) && fullMenuItem.recipe.length > 0) {
    for (const r of fullMenuItem.recipe) {
      const inv = allInventory.find(i => i.id === r.inventoryItemId || (i.name && i.name.toLowerCase() === r.inventoryItemName?.toLowerCase()));
      if (inv) {
        deductions.push({
          inventoryItem: inv,
          quantityToDeduct: (Number(r.quantity) || 1) * qty,
          reason: `Recipe: ${r.inventoryItemName || inv.name} for ${itemName}`
        });
      }
    }
    return deductions;
  }

  // 2. Intelligent Auto-Detection:
  const deductedInvIds = new Set();

  // A. Direct Product Match
  const directMatch = allInventory.find(inv =>
    (menuItemId && (inv.menuItemId === menuItemId || inv.id === menuItemId)) ||
    (itemName && inv.name && inv.name.trim().toLowerCase() === itemName.trim().toLowerCase())
  );
  if (directMatch && !deductedInvIds.has(directMatch.id)) {
    deductions.push({
      inventoryItem: directMatch,
      quantityToDeduct: qty,
      reason: `Direct product sale (${itemName})`
    });
    deductedInvIds.add(directMatch.id);
  }

  // B. Packaging / Box Auto-Detection
  const isPizza = (finalCategory && finalCategory.toLowerCase().includes('pizza')) || itemName.toLowerCase().includes('pizza');
  const isBurger = (finalCategory && finalCategory.toLowerCase().includes('burger')) || itemName.toLowerCase().includes('burger');

  if (isPizza) {
    const textToSearch = `${variantName} ${itemName} ${lineItem.specialRequest || ''}`.toLowerCase();
    let size = '';
    if (textToSearch.includes('12') || textToSearch.includes('large')) size = '12';
    else if (textToSearch.includes('8') || textToSearch.includes('small')) size = '8';
    else size = '10'; // default 10-inch pizza

    let boxItem = allInventory.find(inv => {
      const n = (inv.name || '').toLowerCase();
      return (n.includes('box') || (inv.category || '').toLowerCase().includes('packaging') || (inv.category || '').toLowerCase().includes('food raw materials')) &&
             (n.includes(size) || n.includes(`${size}"`) || n.includes(`${size} inch`)) &&
             n.includes('pizza');
    });

    if (!boxItem) {
      boxItem = allInventory.find(inv => {
        const n = (inv.name || '').toLowerCase();
        return n.includes('box') && (n.includes(size) || n.includes(`${size}"`));
      });
    }

    if (!boxItem) {
      boxItem = allInventory.find(inv => {
        const n = (inv.name || '').toLowerCase();
        return n.includes('pizza') && n.includes('box');
      });
    }

    if (boxItem && !deductedInvIds.has(boxItem.id)) {
      deductions.push({
        inventoryItem: boxItem,
        quantityToDeduct: qty,
        reason: `Packaging: ${boxItem.name} (${size}" Pizza)`
      });
      deductedInvIds.add(boxItem.id);
    }
  } else if (isBurger) {
    const burgerBox = allInventory.find(inv => {
      const n = (inv.name || '').toLowerCase();
      return (n.includes('burger') && n.includes('box')) || (n.includes('burger') && (inv.category || '').toLowerCase().includes('packaging'));
    });
    if (burgerBox && !deductedInvIds.has(burgerBox.id)) {
      deductions.push({
        inventoryItem: burgerBox,
        quantityToDeduct: qty,
        reason: `Packaging: ${burgerBox.name}`
      });
      deductedInvIds.add(burgerBox.id);
    }
  }

  // C. Ingredients / Raw Materials Auto-Detection
  if (finalIngredients && finalIngredients.length > 0) {
    for (const ing of finalIngredients) {
      const ingLower = ing.trim().toLowerCase();
      const matchedInv = allInventory.find(inv => {
        if (deductedInvIds.has(inv.id)) return false;
        const invName = (inv.name || '').trim().toLowerCase();
        return (
          invName === ingLower ||
          invName.includes(ingLower) ||
          ingLower.includes(invName) ||
          (ingLower.includes('cheese') && invName.includes('cheese')) ||
          (ingLower.includes('mozzarella') && invName.includes('mozzarella')) ||
          (ingLower.includes('chicken') && invName.includes('chicken')) ||
          (ingLower.includes('beef') && invName.includes('beef')) ||
          (ingLower.includes('tomato') && invName.includes('tomato')) ||
          (ingLower.includes('mushroom') && invName.includes('mushroom')) ||
          (ingLower.includes('dough') && (invName.includes('dough') || invName.includes('flour')))
        );
      });

      if (matchedInv && !deductedInvIds.has(matchedInv.id)) {
        const unitPortion = (matchedInv.unit?.toLowerCase() === 'kg') ? 0.1 : 1;
        deductions.push({
          inventoryItem: matchedInv,
          quantityToDeduct: unitPortion * qty,
          reason: `Ingredient: ${matchedInv.name}`
        });
        deductedInvIds.add(matchedInv.id);
      }
    }
  }

  return deductions;
}

async function deductInventoryForOrder(order, isTableOrder = false) {
  try {
    const items = order.items || [];
    if (!items.length) return;

    const [allInventory, allMenuItems] = await Promise.all([
      InventoryItem.find(),
      MenuItem.find()
    ]);

    for (const lineItem of items) {
      const deductions = findRelatedInventoryDeductions(lineItem, allInventory, allMenuItems);
      for (const { inventoryItem: inv, quantityToDeduct, reason } of deductions) {
        const newStock = Math.max(0, (inv.currentStock || 0) - quantityToDeduct);
        inv.currentStock = newStock;
        await InventoryItem.updateOne({ id: inv.id }, { $set: { currentStock: newStock } });

        const movement = {
          id: `mv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          itemId: inv.id,
          itemName: inv.name,
          type: 'Sale OUT',
          quantity: quantityToDeduct,
          date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }),
          note: `Order #${order.orderNumber || (order.id ? order.id.slice(-6) : 'POS')} - ${reason}${isTableOrder ? ' (Table)' : ''}`,
          unitPrice: inv.costPrice || 0,
          totalCost: quantityToDeduct * (inv.costPrice || 0),
          orderNumber: order.orderNumber || (order.id ? order.id.slice(-6) : ''),
        };
        await StockMovement.create(movement);

        // Notify admins in real-time
        io.to('adminRoom').emit('REMOTE_ACTION', {
          type: 'UPDATE_INVENTORY_ITEM',
          payload: { ...inv.toObject(), currentStock: newStock }
        });
        io.to('adminRoom').emit('REMOTE_ACTION', {
          type: 'ADD_STOCK_MOVEMENT',
          payload: movement
        });
      }
    }
  } catch (err) {
    console.error('Error auto-deducting inventory for order:', err);
  }
}

async function restockInventoryForOrder(order, isTableOrder = false, deletionReason = 'Order deleted') {
  try {
    const items = order.items || [];
    if (!items.length) return 0;

    const [allInventory, allMenuItems] = await Promise.all([
      InventoryItem.find(),
      MenuItem.find()
    ]);

    let restockedCount = 0;
    for (const lineItem of items) {
      const deductions = findRelatedInventoryDeductions(lineItem, allInventory, allMenuItems);
      for (const { inventoryItem: inv, quantityToDeduct, reason } of deductions) {
        const currentItem = await InventoryItem.findOne({ id: inv.id });
        const newStock = (currentItem ? (currentItem.currentStock || 0) : (inv.currentStock || 0)) + quantityToDeduct;
        await InventoryItem.updateOne({ id: inv.id }, { $set: { currentStock: newStock } });

        const movement = {
          id: `mv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          itemId: inv.id,
          itemName: inv.name,
          type: 'Return IN',
          quantity: quantityToDeduct,
          date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }),
          note: `Restocked from Deleted Order #${order.orderNumber || (order.id ? order.id.slice(-6) : '')} - ${reason} (${deletionReason})`,
          unitPrice: inv.costPrice || 0,
          totalCost: quantityToDeduct * (inv.costPrice || 0),
          orderNumber: order.orderNumber || (order.id ? order.id.slice(-6) : ''),
        };
        await StockMovement.create(movement);
        restockedCount++;

        // Notify admins in real-time
        io.to('adminRoom').emit('REMOTE_ACTION', {
          type: 'UPDATE_INVENTORY_ITEM',
          payload: { ...(currentItem ? currentItem.toObject() : inv.toObject()), currentStock: newStock }
        });
        io.to('adminRoom').emit('REMOTE_ACTION', {
          type: 'ADD_STOCK_MOVEMENT',
          payload: movement
        });
      }
    }
    return restockedCount;
  } catch (err) {
    console.error('Error auto-restocking inventory for order:', err);
    return 0;
  }
}

async function deleteOrderCascade(identifier, deletedBy = 'Admin', reason = 'Admin Deletion') {
  try {
    const cleanId = String(identifier || '').trim();
    const cleanNum = cleanId.replace(/^#/, '');

    // 1. Look up order in Order and TableOrder
    const [orderInOrders, orderInTable] = await Promise.all([
      Order.findOne({
        $or: [
          { id: cleanId },
          { id: cleanNum },
          { orderNumber: cleanNum },
          { orderNumber: `#${cleanNum}` },
          { invoiceNumber: cleanNum },
          { invoiceNumber: cleanId },
        ]
      }),
      TableOrder.findOne({
        $or: [
          { id: cleanId },
          { id: cleanNum },
          { orderNumber: cleanNum },
          { orderNumber: `#${cleanNum}` },
          { invoiceNumber: cleanNum },
          { invoiceNumber: cleanId },
        ]
      })
    ]);

    const rawOrder = orderInOrders || orderInTable;
    if (!rawOrder) {
      // If not found as full document, still do clean sweep by ID to clear any dangling records
      await Promise.all([
        Order.deleteMany({ $or: [{ id: cleanId }, { orderNumber: cleanNum }] }),
        TableOrder.deleteMany({ $or: [{ id: cleanId }, { orderNumber: cleanNum }, { invoiceNumber: cleanNum }] })
      ]);
      return { success: true, message: 'Dangling order cleared', restockedCount: 0 };
    }

    const orderObj = rawOrder.toObject ? rawOrder.toObject() : rawOrder;
    const targetId = orderObj.id || cleanId;
    const orderNumber = orderObj.orderNumber || orderObj.invoiceNumber || targetId.slice(-6);
    const invoiceNumber = orderObj.invoiceNumber || orderObj.orderNumber || targetId;

    // 2. Restock inventory items for this order
    const restockedCount = await restockInventoryForOrder(orderObj, Boolean(orderInTable), reason);

    // 3. Create 30-Day DeletedOrder record in MongoDB
    const deletedOrderId = `del-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days retention

    const deletedOrderData = {
      id: deletedOrderId,
      originalOrderId: targetId,
      orderNumber: orderNumber,
      invoiceNumber: invoiceNumber,
      orderType: orderObj.orderType || (orderInTable ? 'Dine In' : 'POS'),
      customerName: orderObj.customerName || (orderObj.tableNumber ? `Table ${orderObj.tableNumber}` : 'Customer'),
      customerPhone: orderObj.phone || orderObj.customerPhone || '',
      deliveryAddress: orderObj.address || orderObj.deliveryAddress || '',
      tableNumber: orderObj.tableNumber || '',
      tableId: orderObj.tableId || '',
      items: orderObj.items || [],
      subtotal: orderObj.subtotal || 0,
      discount: orderObj.discount || 0,
      deliveryFee: orderObj.deliveryFee || 0,
      total: orderObj.total || 0,
      paymentMethod: orderObj.paymentMethod || 'Cash',
      splitPayments: orderObj.splitPayments || [],
      compDetails: orderObj.compDetails,
      staffTabDetails: orderObj.staffTabDetails,
      orderCreatedAt: String(orderObj.createdAt || ''),
      deletedAt: new Date(),
      deletedBy: deletedBy || 'Admin',
      deletionReason: reason || 'Admin Deletion',
      restocked: true,
      restockedItemsCount: restockedCount,
      expiresAt: expiresAt,
      rawOrderData: orderObj,
    };

    await DeletedOrder.create(deletedOrderData);

    // 4. Delete simultaneously from BOTH Order AND TableOrder collections
    await Promise.all([
      Order.deleteMany({
        $or: [
          { id: targetId },
          { id: cleanId },
          { orderNumber: orderNumber },
          { orderNumber: cleanNum },
          { invoiceNumber: invoiceNumber }
        ]
      }),
      TableOrder.deleteMany({
        $or: [
          { id: targetId },
          { id: cleanId },
          { invoiceNumber: invoiceNumber },
          { invoiceNumber: cleanNum },
          { orderNumber: orderNumber },
          { orderNumber: cleanNum }
        ]
      })
    ]);

    // 5. If table order was active, release table
    if (orderObj.tableId || orderObj.tableNumber) {
      await RestaurantTable.updateMany(
        { $or: [{ id: orderObj.tableId }, { tableNumber: orderObj.tableNumber }] },
        { $set: { status: 'Available', currentOrderId: null } }
      );
    }

    // 6. Broadcast real-time socket events
    io.emit('REMOTE_ACTION', { type: 'DELETE_ORDER', payload: targetId });
    io.emit('REMOTE_ACTION', { type: 'DELETE_TABLE_ORDER', payload: targetId });
    io.to('adminRoom').emit('REMOTE_ACTION', { type: 'ADD_DELETED_ORDER', payload: deletedOrderData });

    return { success: true, deletedOrder: deletedOrderData, restockedCount };
  } catch (err) {
    console.error('Error cascading order delete:', err);
    return { success: false, error: err.message };
  }
}

async function restoreOrderCascade(deletedOrderId, restoredBy = 'Admin') {
  try {
    const query = mongoose.Types.ObjectId.isValid(deletedOrderId)
      ? { $or: [{ id: deletedOrderId }, { _id: deletedOrderId }] }
      : { id: deletedOrderId };
    const deletedDoc = await DeletedOrder.findOne(query);
    if (!deletedDoc) {
      return { success: false, error: 'Deleted order record not found in archive' };
    }

    const raw = deletedDoc.rawOrderData || deletedDoc.toObject();
    const isTable = Boolean(deletedDoc.tableId || deletedDoc.tableNumber || raw.isTableOrder || raw.tableNumber);
    raw.isTableOrder = isTable;

    const targetOrderId = raw.id || raw.orderId || deletedDoc.originalOrderId || deletedDoc.id;
    if (!raw.id) raw.id = targetOrderId;
    if (!raw.orderNumber) raw.orderNumber = deletedDoc.orderNumber || deletedDoc.invoiceNumber;
    if (!raw.invoiceNumber) raw.invoiceNumber = deletedDoc.invoiceNumber || deletedDoc.orderNumber;

    // 1. Re-deduct inventory
    await deductInventoryForOrder(raw, isTable);

    // 2. Re-insert into live collection
    if (isTable) {
      await TableOrder.findOneAndUpdate({ id: raw.id }, raw, { upsert: true });
      io.emit('REMOTE_ACTION', { type: 'PLACE_TABLE_ORDER', payload: raw });
      if (raw.tableId || raw.tableNumber) {
        const tableQuery = raw.tableId ? { id: raw.tableId } : { tableNumber: raw.tableNumber };
        await RestaurantTable.updateOne(tableQuery, { $set: { status: 'Ordering', currentOrderId: raw.id } });
        io.emit('REMOTE_ACTION', {
          type: 'SET_TABLE_STATUS',
          payload: { id: raw.tableId, status: 'Ordering', currentOrderId: raw.id, occupiedSince: raw.createdAt || Date.now() }
        });
      }
    } else {
      await Order.findOneAndUpdate({ id: raw.id }, raw, { upsert: true });
      io.emit('REMOTE_ACTION', { type: 'PLACE_ORDER', payload: raw });
    }

    // 3. Remove from DeletedOrder archive
    await DeletedOrder.deleteOne(query);
    io.emit('REMOTE_ACTION', { type: 'PURGE_DELETED_ORDER', payload: deletedOrderId });

    return { success: true, restoredOrder: raw };
  } catch (err) {
    console.error('Error restoring order:', err);
    return { success: false, error: err.message };
  }
}

async function processDbAction(action) {
  // Prevent NoSQL Injection (skip for actions with non-id payloads or array payloads)
  const skipIdCheck = [
    'REORDER_CAROUSEL_SLIDE',
    'SET_DELETED_ORDERS',
    'DELETE_ORDER_WITH_CLEANUP',
    'RESTORE_DELETED_ORDER',
    'PURGE_DELETED_ORDER',
    'ADD_DELETED_ORDER'
  ];
  if (
    !skipIdCheck.includes(action.type) &&
    (
      action.type.includes('UPDATE_') ||
      action.type.includes('DELETE_') ||
      action.type.includes('SET_') ||
      action.type.includes('READ_') ||
      action.type.includes('HELPFUL_')
    )
  ) {
    const idToCheck = (action.payload !== null && typeof action.payload === 'object' && 'id' in action.payload)
      ? action.payload.id
      : action.payload;

    if (typeof idToCheck !== 'string' && typeof idToCheck !== 'number') {
      throw new Error('Invalid ID format - potential NoSQL injection blocked');
    }
  }

  // Persist to MongoDB before broadcasting
  switch (action.type) {
    // Deleted Orders (handled via dedicated REST endpoints)
    case 'SET_DELETED_ORDERS':
    case 'DELETE_ORDER_WITH_CLEANUP':
    case 'RESTORE_DELETED_ORDER':
    case 'PURGE_DELETED_ORDER':
    case 'ADD_DELETED_ORDER':
      return;

    // Menu
    case 'ADD_MENU_ITEM': await MenuItem.create(action.payload); break;
    case 'UPDATE_MENU_ITEM': await MenuItem.findOneAndUpdate({ id: action.payload.id }, { $set: action.payload }, { new: true }); break;
    case 'DELETE_MENU_ITEM': await MenuItem.findOneAndDelete({ id: action.payload }); break;

    // Orders
    case 'PLACE_ORDER':
      await Order.create(action.payload);
      await deductInventoryForOrder(action.payload, false);
      break;
    case 'BATCH_PLACE_ORDERS':
      if (action.payload && action.payload.length > 0) {
        await Order.insertMany(action.payload);
        for (const o of action.payload) {
          await deductInventoryForOrder(o, false);
        }
      }
    case 'UPDATE_ORDER':
      await Order.findOneAndUpdate({ id: action.payload.id }, { $set: action.payload }, { new: true });
      break;
    case 'UPDATE_ORDER_STATUS': await Order.findOneAndUpdate({ id: action.payload.id }, { status: action.payload.status }); break;
    case 'SETTLE_STAFF_TAB': {
      const { orderId, settledMethod, settledBy, notes } = action.payload;
      const now = new Date().toISOString();
      await Order.findOneAndUpdate(
        { id: orderId },
        {
          $set: {
            'staffTabDetails.isSettled': true,
            'staffTabDetails.settledAt': now,
            'staffTabDetails.settledMethod': settledMethod,
            'staffTabDetails.settledBy': settledBy || 'Admin',
            'staffTabDetails.notes': notes || ''
          }
        },
        { new: true }
      );
      break;
    }

    // Table Orders
    case 'PLACE_TABLE_ORDER':
      await TableOrder.create(action.payload);
      await deductInventoryForOrder(action.payload, true);
      break;
    case 'UPDATE_TABLE_ORDER': await TableOrder.findOneAndUpdate({ id: action.payload.id }, { $set: action.payload }, { upsert: true, new: true }); break;
    case 'DELETE_ORDER':
    case 'DELETE_TABLE_ORDER':
      await deleteOrderCascade(action.payload, 'Admin', 'Admin Action');
      break;

    // Tables
    case 'ADD_TABLE': await RestaurantTable.create(action.payload); break;
    case 'UPDATE_TABLE': await RestaurantTable.findOneAndUpdate({ id: action.payload.id }, { $set: action.payload }, { new: true }); break;
    case 'DELETE_TABLE': await RestaurantTable.findOneAndDelete({ id: action.payload }); break;
    case 'SET_TABLE_STATUS':
      await RestaurantTable.findOneAndUpdate(
        { id: action.payload.id },
        {
          $set: {
            status: action.payload.status,
            currentOrderId: action.payload.currentOrderId,
            occupiedSince: action.payload.occupiedSince,
            customerName: action.payload.customerName,
            customerPhone: action.payload.customerPhone,
            guestCount: action.payload.guestCount,
          }
        }
      );
      break;

    // Reservations
    case 'ADD_RESERVATION': await Reservation.create(action.payload); break;
    case 'UPDATE_RESERVATION': await Reservation.findOneAndUpdate({ id: action.payload.id }, { status: action.payload.status }); break;
    case 'DELETE_RESERVATION': await Reservation.findOneAndDelete({ id: action.payload }); break;

    // Messages
    case 'ADD_MESSAGE': await Message.create(action.payload); break;
    case 'READ_MESSAGE': await Message.findOneAndUpdate({ id: action.payload }, { isRead: true }); break;
    case 'DELETE_MESSAGE': await Message.findOneAndDelete({ id: action.payload }); break;
    case 'REPLY_MESSAGE': await Message.findOneAndUpdate({ id: action.payload.id }, { reply: action.payload.reply, isRead: true }); break;

    // Catering
    case 'ADD_CATERING': await CateringRequest.create(action.payload); break;
    case 'UPDATE_CATERING': await CateringRequest.findOneAndUpdate({ id: action.payload.id }, { status: action.payload.status }); break;

    // Gallery & Chefs
    case 'ADD_GALLERY_IMAGE': await GalleryImage.create(action.payload); break;
    case 'UPDATE_GALLERY_IMAGE': await GalleryImage.findOneAndUpdate({ id: action.payload.id }, action.payload); break;
    case 'DELETE_GALLERY_IMAGE': await GalleryImage.findOneAndDelete({ id: action.payload }); break;

    case 'ADD_CHEF': await Chef.create(action.payload); break;
    case 'UPDATE_CHEF': await Chef.findOneAndUpdate({ id: action.payload.id }, action.payload); break;
    case 'DELETE_CHEF': await Chef.findOneAndDelete({ id: action.payload }); break;

    // Financial & HR
    case 'ADD_WASTE_RECORD': await WasteRecord.create(action.payload); break;
    case 'DELETE_WASTE_RECORD': await WasteRecord.findOneAndDelete({ id: action.payload }); break;

    case 'ADD_EMPLOYEE': await Employee.create(action.payload); break;
    case 'UPDATE_EMPLOYEE': await Employee.findOneAndUpdate({ id: action.payload.id }, action.payload); break;
    case 'DELETE_EMPLOYEE': await Employee.findOneAndDelete({ id: action.payload }); break;

    case 'ADD_PAYROLL_RECORD': await PayrollRecord.create(action.payload); break;

    case 'ADD_CAROUSEL_SLIDE': {
      const slideCount = await CarouselSlide.countDocuments();
      await CarouselSlide.create({ ...action.payload, order: slideCount });
      break;
    }
    case 'UPDATE_CAROUSEL_SLIDE': await CarouselSlide.findOneAndUpdate({ id: action.payload.id }, { $set: action.payload }, { new: true }); break;
    case 'DELETE_CAROUSEL_SLIDE': await CarouselSlide.findOneAndDelete({ id: action.payload }); break;
    case 'REORDER_CAROUSEL_SLIDE': {
      // Swap the order values of the two slides by fetching current ordered list
      const allSlides = await CarouselSlide.find().sort({ order: 1 });
      const { fromIndex, toIndex } = action.payload;
      if (fromIndex >= 0 && toIndex >= 0 && fromIndex < allSlides.length && toIndex < allSlides.length) {
        const fromSlide = allSlides[fromIndex];
        const toSlide = allSlides[toIndex];
        await CarouselSlide.findOneAndUpdate({ id: fromSlide.id }, { $set: { order: toIndex } });
        await CarouselSlide.findOneAndUpdate({ id: toSlide.id }, { $set: { order: fromIndex } });
      }
      break;
    }

    // New Integrations
    case 'ADD_EXPENSE': await ExpenseEntry.create(action.payload); break;
    case 'UPDATE_EXPENSE': await ExpenseEntry.findOneAndUpdate({ id: action.payload.id }, action.payload); break;
    case 'DELETE_EXPENSE': await ExpenseEntry.findOneAndDelete({ id: action.payload }); break;

    case 'ADD_CASH_ENTRY':
      // Auto-close any existing open registers before opening a new one
      await CashRegisterEntry.updateMany(
        { status: 'Open' },
        { $set: { status: 'Closed', closedAt: new Date().toISOString() } }
      );
      await CashRegisterEntry.create(action.payload);
      break;
    case 'UPDATE_CASH_ENTRY': await CashRegisterEntry.findOneAndUpdate({ id: action.payload.id }, action.payload); break;
    case 'DELETE_CASH_ENTRY': await CashRegisterEntry.findOneAndDelete({ id: action.payload }); break;

    case 'ADD_INVENTORY_ITEM': await InventoryItem.create(action.payload); break;
    case 'UPDATE_INVENTORY_ITEM': await InventoryItem.findOneAndUpdate({ id: action.payload.id }, { $set: action.payload }, { new: true, upsert: true }); break;
    case 'DELETE_INVENTORY_ITEM': await InventoryItem.findOneAndDelete({ id: action.payload }); break;

    case 'ADD_STOCK_MOVEMENT': await StockMovement.create(action.payload); break;
    case 'DELETE_STOCK_MOVEMENT': await StockMovement.findOneAndDelete({ id: action.payload }); break;

    case 'ADD_REVIEW': await ItemReview.create(action.payload); break;
    case 'HELPFUL_REVIEW': await ItemReview.findOneAndUpdate({ id: action.payload }, { $inc: { helpful: 1 } }); break;

    // User Management
    case 'ADD_USER': await UserAccount.create(action.payload); break;
    case 'UPDATE_USER': await UserAccount.findOneAndUpdate({ id: action.payload.id }, action.payload); break;
    case 'DELETE_USER': await UserAccount.findOneAndDelete({ id: action.payload }); break;

    // Delivery Settings
    case 'UPDATE_DELIVERY_SETTINGS': {
      const normalized = normalizeDeliverySettings(action.payload);
      await RestaurantSettings.findOneAndUpdate(
        { key: 'main' },
        { $set: { deliverySettings: normalized } },
        { upsert: true, new: true }
      );
      break;
    }

    // Pixel Settings
    case 'UPDATE_PIXEL_SETTINGS':
      await RestaurantSettings.findOneAndUpdate(
        { key: 'main' },
        { $set: { pixelSettings: action.payload } },
        { upsert: true, new: true }
      );
      break;
  }
}

// ── Invoice Number Generator ───────────────────────────────────────────────
app.post('/api/invoices/generate-number', authenticateJWT, async (req, res) => {
  try {
    const year = new Date().getFullYear();
    // Atomically increment counter for this year
    const result = await InvoiceCounter.findOneAndUpdate(
      { year },
      { $inc: { counter: 1 } },
      { new: true, upsert: true }
    );
    const padded = String(result.counter).padStart(6, '0');
    const invoiceNumber = `PIZ-${year}-${padded}`;
    res.json({ success: true, invoiceNumber });
  } catch (error) {
    console.error('Failed to generate invoice number:', error);
    res.status(500).json({ success: false, error: 'Failed to generate invoice number' });
  }
});

// ── Print Job Log (POST to create, GET to fetch history, POST to sync missing) ──────────────────────
app.post('/api/print-jobs', async (req, res) => {
  try {
    const job = req.body;
    if (!job || !job.id) return res.status(400).json({ error: 'Invalid print job data' });

    // Infer source if not explicitly provided
    if (!job.source) {
      const orderTypeLower = (job.orderType || '').toLowerCase();
      if (job.tableNo || orderTypeLower.includes('table') || orderTypeLower.includes('dine')) {
        job.source = 'table';
      } else if (orderTypeLower.includes('online') || orderTypeLower.includes('delivery') || (job.orderId && job.orderId.startsWith('PIZO')) || (job.invoiceNumber && job.invoiceNumber.startsWith('PIZO'))) {
        job.source = 'online';
      } else {
        job.source = 'pos';
      }
    }

    // Upsert to avoid duplicate keys on fast double clicks
    const created = await PrintJob.findOneAndUpdate(
      { id: job.id },
      { $set: job },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, printJob: created });
  } catch (error) {
    console.error('Failed to log print job:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/print-jobs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const skip = parseInt(req.query.skip) || 0;
    const search = (req.query.search || '').trim();
    const source = (req.query.source || '').trim().toLowerCase();
    const daysParam = req.query.days; // '2' (default), 'all', or number

    let query = {};
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { invoiceNumber: searchRegex },
        { orderId: searchRegex },
        { customerName: searchRegex },
        { tableNo: searchRegex },
        { orderType: searchRegex },
        { printedBy: searchRegex },
        { paymentMethod: searchRegex },
      ];
    }

    // Default to last 2 days (Today & Yesterday) unless days=all is explicitly requested
    const shouldLimit2Days = daysParam !== 'all' && (!search || daysParam === '2');
    if (shouldLimit2Days) {
      const now = new Date();
      const dhakaOffset = 6 * 60; // minutes
      const nowDhaka = new Date(now.getTime() + dhakaOffset * 60 * 1000);
      const startOfYesterdayDhaka = new Date(nowDhaka);
      startOfYesterdayDhaka.setUTCDate(startOfYesterdayDhaka.getUTCDate() - 1);
      startOfYesterdayDhaka.setUTCHours(0, 0, 0, 0);
      const cutoffUtc = new Date(startOfYesterdayDhaka.getTime() - dhakaOffset * 60 * 1000);
      query.printedAt = { $gte: cutoffUtc.toISOString() };
    }

    if (source && source !== 'all') {
      if (source === 'table') {
        query.$or = (query.$or || []).concat([
          { source: 'table' },
          { tableNo: { $exists: true, $ne: '' } },
          { orderType: /dine|table/i }
        ]);
      } else if (source === 'online') {
        query.$or = (query.$or || []).concat([
          { source: 'online' },
          { invoiceNumber: /^PIZO/i },
          { orderType: /online|delivery/i }
        ]);
      } else if (source === 'pos') {
        query.source = 'pos';
      }
    }

    const jobs = await PrintJob.find(query).sort({ printedAt: -1, _id: -1 }).skip(skip).limit(limit);
    const total = await PrintJob.countDocuments(query);
    res.json({ success: true, printJobs: jobs, total });
  } catch (error) {
    console.error('Failed to fetch print jobs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sync any completed table/online/POS orders that were generated or placed but never logged in printjobs
app.post('/api/print-jobs/sync-missing', async (req, res) => {
  try {
    const parseItems = (rawItems) => {
      if (!Array.isArray(rawItems)) return [];
      return rawItems.map(ci => {
        let name = '';
        if (ci.item && typeof ci.item.name === 'string' && ci.item.name.trim() && ci.item.name.trim().toLowerCase() !== 'item') {
          name = ci.item.name.trim();
        } else if (typeof ci.name === 'string' && ci.name.trim() && ci.name.trim().toLowerCase() !== 'item') {
          name = ci.name.trim();
        } else if (ci.item && typeof ci.item.title === 'string' && ci.item.title.trim()) {
          name = ci.item.title.trim();
        } else if (typeof ci.title === 'string' && ci.title.trim()) {
          name = ci.title.trim();
        } else if (typeof ci.itemName === 'string' && ci.itemName.trim()) {
          name = ci.itemName.trim();
        } else if (typeof ci.productName === 'string' && ci.productName.trim()) {
          name = ci.productName.trim();
        } else {
          name = (ci.name || ci.item?.name || 'Item').trim();
        }

        const numOrZero = (v) => {
          const n = Number(v);
          return !isNaN(n) && isFinite(n) ? n : 0;
        };
        const p1 = numOrZero(ci.price);
        const p2 = ci.item ? numOrZero(ci.item.price) : 0;
        const p3 = numOrZero(ci.unitPrice || ci.item?.unitPrice || ci.sellingPrice || ci.item?.sellingPrice);
        const price = p1 > 0 ? p1 : (p2 > 0 ? p2 : (p3 > 0 ? p3 : 0));
        const quantity = Math.max(1, numOrZero(ci.quantity || ci.qty || 1));
        const variant = ci.variant || ci.selectedVariant?.name || (ci.item && ci.item.variant) || '';
        const note = ci.note || ci.specialRequest || (ci.item && (ci.item.note || ci.item.specialRequest)) || '';
        return { name, quantity, price, variant, note };
      });
    };

    const existingJobs = await PrintJob.find({}).lean();
    const existingJobMap = new Map();
    existingJobs.forEach(j => {
      if (j.orderId) existingJobMap.set(j.orderId, j);
      if (j.invoiceNumber) existingJobMap.set(j.invoiceNumber, j);
    });

    const allOrders = await Order.find({
      $or: [
        { orderNumber: { $exists: true, $ne: '' } },
        { id: { $exists: true, $ne: '' } }
      ]
    }).lean();

    const allTableOrders = await TableOrder.find({
      id: { $exists: true, $ne: '' }
    }).lean();

    let addedCount = 0;
    let repairedCount = 0;

    // 1. Process regular & settled table orders from Order collection
    for (const order of allOrders) {
      const isTable = Boolean(order.isTableOrder || (order.address && order.address.toLowerCase().includes('table')) || order.tableNumber);
      const isOnline = Boolean(order.isOnlineOrder || order.source === 'website' || (order.orderNumber && order.orderNumber.startsWith('PIZO')));
      const source = isTable ? 'table' : (isOnline ? 'online' : 'pos');
      const tableNo = order.tableNumber ? String(order.tableNumber) : (order.address && order.address.match(/table\s*(\d+)/i) ? order.address.match(/table\s*(\d+)/i)[1] : '');
      const invNum = order.orderNumber || (isTable ? `TBL-${tableNo || '1'}-${String(order.id).slice(-6)}` : `PIZ-${String(order.id).slice(-8)}`);
      const items = parseItems(order.items);

      if (items.length > 0) {
        // Repair any print jobs matching this orderId or invoiceNumber that have dummy items
        const updateResult = await PrintJob.updateMany(
          {
            $and: [
              { $or: [{ orderId: order.id }, { invoiceNumber: invNum }] },
              {
                $or: [
                  { 'snapshot.items': { $elemMatch: { name: 'Item', price: 0 } } },
                  { 'snapshot.items': { $elemMatch: { price: 0 } } },
                  { 'snapshot.items': { $size: 0 } },
                  { snapshot: null }
                ]
              }
            ]
          },
          {
            $set: {
              tableNo: tableNo || undefined,
              orderType: isTable ? (tableNo ? `Dine In — Table ${tableNo}` : 'Dine In') : (order.orderType || (isOnline ? 'Online Order' : 'POS')),
              'snapshot.items': items,
              'snapshot.tableNo': tableNo || undefined,
              'snapshot.orderType': isTable ? (tableNo ? `Dine In — Table ${tableNo}` : 'Dine In') : (order.orderType || (isOnline ? 'Online Order' : 'POS')),
            }
          }
        );
        if (updateResult.modifiedCount > 0) {
          repairedCount += updateResult.modifiedCount;
        }
      }

      const existingJob = existingJobMap.get(order.id) || (order.orderNumber ? existingJobMap.get(order.orderNumber) : null);
      if (!existingJob) {
        // Insert missing job
        await PrintJob.create({
          id: `PJ_SYNC_${order.id || Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          invoiceNumber: invNum,
          orderId: order.id,
          printedBy: order.cashierName || 'Staff',
          printedAt: order.createdAt || new Date().toISOString(),
          isReprint: false,
          reprintReason: '',
          status: 'success',
          paymentMethod: order.paymentMethod || 'Cash',
          total: order.total || 0,
          orderType: isTable ? (tableNo ? `Dine In — Table ${tableNo}` : 'Dine In') : (order.orderType || (isOnline ? 'Online Order' : 'POS')),
          customerName: order.customerName || (isTable ? `Table ${tableNo || ''} Guest` : 'Guest'),
          tableNo,
          source,
          snapshot: {
            invoiceNumber: invNum,
            orderId: order.id,
            orderType: isTable ? (tableNo ? `Dine In — Table ${tableNo}` : 'Dine In') : (order.orderType || (isOnline ? 'Online Order' : 'POS')),
            tableNo,
            customerName: order.customerName || (isTable ? `Table ${tableNo || ''} Guest` : 'Guest'),
            cashierName: order.cashierName || 'Staff',
            dateTime: new Date(order.createdAt || Date.now()).toLocaleString(),
            items,
            subtotal: order.subtotal || order.total || 0,
            discount: order.discount || 0,
            total: order.total || 0,
            paymentMethod: order.paymentMethod || 'Cash',
            splitPayments: order.splitPayments,
            amountPaid: order.total || 0,
            change: 0,
          }
        });
        addedCount++;
      }
    }

    // 2. Process active or kitchen table orders from TableOrder collection (e.g. Table 3, Table 2)
    for (const to of allTableOrders) {
      const tableNo = String(to.tableNumber || to.tableId || '');
      const invNum = to.orderNumber || `TBL-${tableNo || '1'}-${String(to.id).slice(-6)}`;
      const items = parseItems(to.items);
      const createdAtIso = typeof to.createdAt === 'number' ? new Date(to.createdAt).toISOString() : (to.createdAt || new Date().toISOString());

      if (items.length > 0) {
        const updateResult = await PrintJob.updateMany(
          {
            $and: [
              { $or: [{ orderId: to.id }, { invoiceNumber: invNum }] },
              {
                $or: [
                  { 'snapshot.items': { $elemMatch: { name: 'Item', price: 0 } } },
                  { 'snapshot.items': { $elemMatch: { price: 0 } } },
                  { 'snapshot.items': { $size: 0 } },
                  { snapshot: null }
                ]
              }
            ]
          },
          {
            $set: {
              tableNo,
              orderType: `Dine In — Table ${tableNo}`,
              'snapshot.items': items,
              'snapshot.tableNo': tableNo,
              'snapshot.orderType': `Dine In — Table ${tableNo}`,
            }
          }
        );
        if (updateResult.modifiedCount > 0) {
          repairedCount += updateResult.modifiedCount;
        }
      }

      const existingJob = existingJobMap.get(to.id) || (to.orderNumber ? existingJobMap.get(to.orderNumber) : null);
      if (!existingJob) {
        await PrintJob.create({
          id: `PJ_SYNC_${to.id}_${Math.random().toString(36).substring(2, 6)}`,
          invoiceNumber: invNum,
          orderId: to.id,
          printedBy: 'Staff',
          printedAt: createdAtIso,
          isReprint: false,
          reprintReason: '',
          status: 'success',
          paymentMethod: to.paymentMethod || 'Table Check',
          total: to.total || 0,
          orderType: `Dine In — Table ${tableNo}`,
          customerName: to.customerName || `Table ${tableNo}`,
          tableNo,
          source: 'table',
          snapshot: {
            invoiceNumber: invNum,
            orderId: to.id,
            orderType: `Dine In — Table ${tableNo}`,
            tableNo,
            customerName: to.customerName || `Table ${tableNo}`,
            cashierName: 'Staff',
            dateTime: new Date(createdAtIso).toLocaleString(),
            items,
            subtotal: to.subtotal || to.total || 0,
            discount: to.discount || 0,
            total: to.total || 0,
            paymentMethod: to.paymentMethod || 'Table Check',
            splitPayments: to.splitPayments,
            amountPaid: to.total || 0,
            change: 0,
          }
        });
        addedCount++;
      }
    }

    res.json({ success: true, synced: addedCount, repaired: repairedCount });
  } catch (error) {
    console.error('Failed to sync missing print jobs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/dispatch', async (req, res) => {
  try {
    const { action } = req.body;
    if (!action || !action.type) return res.status(400).json({ error: 'Invalid action' });

    console.log('HTTP Action received:', action.type);

    if (!publicActions.includes(action.type)) {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        console.warn(`Unauthorized HTTP action attempt: ${action.type}`);
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const token = authHeader.split(' ')[1];
      try {
        const user = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        if (user.role !== 'admin' && user.role !== 'manager') {
          return res.status(403).json({ success: false, error: 'Forbidden' });
        }
      } catch (err) {
        return res.status(403).json({ success: false, error: 'Invalid token' });
      }
    }

    await processDbAction(action);
    if (action.type === 'UPDATE_DELIVERY_SETTINGS' || action.type === 'UPDATE_PIXEL_SETTINGS') {
      io.emit('REMOTE_ACTION', action);
    } else {
      io.to('adminRoom').emit('REMOTE_ACTION', action);
    }
    res.json({ success: true });
  } catch (error) {
    console.error("HTTP DB Error on action:", req.body?.action?.type, error);
    res.status(500).json({ success: false, error: error.message, discard: checkPermanentError(error) });
  }
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id, 'isAdmin:', socket.isAdmin);

  socket.on('DISPATCH_ACTION', async (action, callback) => {
    try {
      console.log('Action received:', action.type);

      if (!socket.isAdmin && !publicActions.includes(action.type)) {
        console.warn(`Unauthorized action attempt: ${action.type} by ${socket.id}`);
        if (typeof callback === 'function') callback({ success: false, error: 'Unauthorized' });
        return;
      }

      await processDbAction(action);
      
      // Broadcast settings to all clients, admin actions to admins
      if (action.type === 'UPDATE_DELIVERY_SETTINGS' || action.type === 'UPDATE_PIXEL_SETTINGS') {
        io.emit('REMOTE_ACTION', action);
      } else {
        socket.to('adminRoom').emit('REMOTE_ACTION', action);
      }
      if (typeof callback === 'function') callback({ success: true });
    } catch (dbError) {
      console.error("DB Error on action:", action.type, dbError);
      if (typeof callback === 'function') callback({ success: false, error: dbError.message, discard: checkPermanentError(dbError) });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`MERN Server running on port ${PORT}`);
});

// Self-ping mechanism to prevent Render free-tier sleep
setInterval(async () => {
  try {
    const url = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    await fetch(`${url}/api/ping`);
    console.log(`Self-ping successful to ${url}`);
  } catch (err) {
    console.error("Self-ping failed:", err.message);
  }
}, 14 * 60 * 1000); // Ping every 14 minutes
