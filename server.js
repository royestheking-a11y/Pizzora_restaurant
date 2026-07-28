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
  InvoiceCounter, PrintJob, UserAccount
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
  max: 200, // limit each IP to 200 requests per windowMs
  skip: (req) => req.originalUrl.includes('/orders/status') || req.originalUrl.includes('/tableOrders/status'),
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
    const state = {
      menuItems: await MenuItem.find().sort({ _id: -1 }),
      carouselSlides: await CarouselSlide.find().sort({ order: 1 }),
      galleryImages: await GalleryImage.find(),
      chefs: await Chef.find(),
      reviews: await ItemReview.find().sort({ date: -1 }).limit(20),
      tables: await RestaurantTable.find().sort({ tableNumber: 1 }),
    };
    res.json(state);
  } catch (error) {
    console.error("Failed to load public state", error);
    res.status(500).json({ error: "Failed to load public state" });
  }
});

app.get('/api/state/admin', authenticateJWT, async (req, res) => {
  try {
    // Only load today's orders + any still-active orders (not yet Delivered/Cancelled).
    // This keeps the response small no matter how many total orders exist.
    // Older orders are available on-demand via GET /api/orders/history (paginated).
    const todayStart = new Date();
    // Use Bangladesh timezone (UTC+6) for "today"
    todayStart.setUTCHours(-6, 0, 0, 0); // midnight in Asia/Dhaka

    const todayStartStr = todayStart.toISOString();

    // Run ALL queries in parallel — sequential awaits were causing Render/Cloudflare
    // to time out the HTTP/2 stream before the response could be sent.
    const [
      orders, reservations, messages, cateringRequests, tables,
      tableOrders, wasteRecords, employees, payrollRecords,
      expenses, cashRegister, inventory, stockMovements, users
    ] = await Promise.all([
      Order.find().sort({ createdAt: -1 }).limit(100), // Reduced to 100 for fast loading. Analytics handles the rest.
      Reservation.find().sort({ createdAt: -1 }).limit(100),
      Message.find().sort({ createdAt: -1 }).limit(100),
      CateringRequest.find().sort({ createdAt: -1 }).limit(100),
      RestaurantTable.find().sort({ tableNumber: 1 }),
      TableOrder.find().sort({ createdAt: -1 }).limit(100),
      WasteRecord.find().sort({ date: -1 }),
      Employee.find().sort({ name: 1 }),
      PayrollRecord.find().sort({ year: -1, month: -1 }),
      ExpenseEntry.find().sort({ date: -1 }),       // All expenses needed for accurate P&L
      CashRegisterEntry.find().sort({ id: -1 }),    // All register entries for auditing
      InventoryItem.find().sort({ name: 1 }),       // All inventory items
      StockMovement.find().sort({ date: -1 }),      // All stock movements
      UserAccount.find().sort({ createdAt: -1 }),
    ]);

    res.json({
      orders, reservations, messages, cateringRequests, tables,
      tableOrders, wasteRecords, employees, payrollRecords,
      expenses, cashRegister, inventory, stockMovements, users
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
    const orders = await Order.find({ status: { $in: ['Delivered', 'Paid'] } }, 'createdAt total').lean();
    const tableOrders = await TableOrder.find({ status: 'Paid' }, 'createdAt total').lean();
    
    const allOrders = [
      ...orders.map(o => ({ timestamp: new Date(o.createdAt).getTime(), total: o.total })),
      ...tableOrders.map(o => ({ timestamp: new Date(o.createdAt).getTime(), total: o.total }))
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
      const d = new Date(startOfWeek + (i * 86400000));
      return { name: d.toLocaleDateString('en-US', { timeZone: 'Asia/Dhaka', month: 'short', day: 'numeric', weekday: 'short' }), sales: 0, orders: 0, dayIndex: d.getUTCDay() };
    });
    
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthDays = Array.from({length: daysInMonth}, (_, i) => {
      const d = new Date(startOfMonth + (i * 86400000));
      return { name: d.toLocaleDateString('en-US', { timeZone: 'Asia/Dhaka', month: 'short', day: 'numeric' }), sales: 0, orders: 0, dateIndex: d.getUTCDate() };
    });
    
    const months = Array.from({length: 12}, (_, i) => {
      const d = new Date(Date.UTC(year, i, 1));
      return { name: d.toLocaleDateString('en-US', { timeZone: 'Asia/Dhaka', month: 'short', year: 'numeric' }), sales: 0, orders: 0, monthIndex: i };
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

app.get('/api/orders/track/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const order = await Order.findOne({ orderNumber });
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
  'PLACE_ORDER', 'PLACE_TABLE_ORDER', 'ADD_RESERVATION', 'ADD_MESSAGE',
  'ADD_CATERING', 'ADD_REVIEW', 'HELPFUL_REVIEW', 'SET_TABLE_STATUS'
];

function checkPermanentError(err) {
  const msg = err.message || '';
  return msg.includes('E11000') || msg.includes('validation failed') || msg.includes('Invalid ID format') || msg.includes('Unauthorized');
}

async function processDbAction(action) {
  // Prevent NoSQL Injection (skip for actions with non-id payloads)
  const skipIdCheck = ['REORDER_CAROUSEL_SLIDE'];
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
    // Menu
    case 'ADD_MENU_ITEM': await MenuItem.create(action.payload); break;
    case 'UPDATE_MENU_ITEM': await MenuItem.findOneAndUpdate({ id: action.payload.id }, { $set: action.payload }, { new: true }); break;
    case 'DELETE_MENU_ITEM': await MenuItem.findOneAndDelete({ id: action.payload }); break;

    // Orders
    case 'PLACE_ORDER': await Order.create(action.payload); break;
    case 'BATCH_PLACE_ORDERS':
      if (action.payload && action.payload.length > 0) {
        await Order.insertMany(action.payload);
      }
      break;
    case 'UPDATE_ORDER_STATUS': await Order.findOneAndUpdate({ id: action.payload.id }, { status: action.payload.status }); break;

    // Table Orders
    case 'PLACE_TABLE_ORDER': await TableOrder.create(action.payload); break;
    case 'UPDATE_TABLE_ORDER_STATUS': await TableOrder.findOneAndUpdate({ id: action.payload.id }, { status: action.payload.status }); break;
    case 'DELETE_ORDER': await Order.findOneAndDelete({ id: action.payload }); break;
    case 'DELETE_TABLE_ORDER': await TableOrder.findOneAndDelete({ id: action.payload }); break;

    // Tables
    case 'ADD_TABLE': await RestaurantTable.create(action.payload); break;
    case 'UPDATE_TABLE': await RestaurantTable.findOneAndUpdate({ id: action.payload.id }, action.payload); break;
    case 'DELETE_TABLE': await RestaurantTable.findOneAndDelete({ id: action.payload }); break;
    case 'SET_TABLE_STATUS':
      await RestaurantTable.findOneAndUpdate(
        { id: action.payload.id },
        {
          status: action.payload.status,
          currentOrderId: action.payload.currentOrderId,
          occupiedSince: action.payload.occupiedSince
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
    case 'UPDATE_INVENTORY_ITEM': await InventoryItem.findOneAndUpdate({ id: action.payload.id }, action.payload); break;
    case 'DELETE_INVENTORY_ITEM': await InventoryItem.findOneAndDelete({ id: action.payload }); break;

    case 'ADD_STOCK_MOVEMENT': await StockMovement.create(action.payload); break;

    case 'ADD_REVIEW': await ItemReview.create(action.payload); break;
    case 'HELPFUL_REVIEW': await ItemReview.findOneAndUpdate({ id: action.payload }, { $inc: { helpful: 1 } }); break;

    // User Management
    case 'ADD_USER': await UserAccount.create(action.payload); break;
    case 'UPDATE_USER': await UserAccount.findOneAndUpdate({ id: action.payload.id }, action.payload); break;
    case 'DELETE_USER': await UserAccount.findOneAndDelete({ id: action.payload }); break;
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

// ── Print Job Log (POST to create, GET to fetch history) ──────────────────────
app.post('/api/print-jobs', authenticateJWT, async (req, res) => {
  try {
    const job = req.body;
    if (!job || !job.id) return res.status(400).json({ error: 'Invalid print job data' });
    const created = await PrintJob.create(job);
    res.json({ success: true, printJob: created });
  } catch (error) {
    console.error('Failed to log print job:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/print-jobs', authenticateJWT, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const skip = parseInt(req.query.skip) || 0;
    const search = req.query.search || '';
    const query = search
      ? { $or: [{ invoiceNumber: new RegExp(search, 'i') }, { orderId: new RegExp(search, 'i') }] }
      : {};
    const jobs = await PrintJob.find(query).sort({ printedAt: -1 }).skip(skip).limit(limit);
    const total = await PrintJob.countDocuments(query);
    res.json({ success: true, printJobs: jobs, total });
  } catch (error) {
    console.error('Failed to fetch print jobs:', error);
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
    io.to('adminRoom').emit('REMOTE_ACTION', action);
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
      
      // Broadcast to all admins securely
      socket.to('adminRoom').emit('REMOTE_ACTION', action);
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
