import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  Search, Plus, Minus, Trash2, X, ChevronDown, Printer,
  ShoppingCart, Tag, Percent, CreditCard, Smartphone, Banknote,
  Users, MapPin, Package, Clock, CheckCircle2, AlertCircle,
  LayoutGrid, RefreshCw, Receipt, ArrowLeft, ChevronRight, User,
  Pause, Play, LogOut, Star, WifiOff, CloudOff, CloudUpload, Lock, ExternalLink,
  BadgeCheck, ShieldCheck, KeyRound, EyeOff, Eye, Loader2, Fingerprint, Activity,
  PrinterCheck, AlertTriangle, Settings
} from 'lucide-react';
import type { MenuItem } from '../data/restaurantData';
import { useApp } from '../context/AppContext';
import { enqueueOrder, getPendingOrders, dequeueOrder, getPendingCount } from '../utils/offlineQueue';
import { POSCardSkeleton } from '../components/Skeletons';
import {
  printerService,
  generateInvoiceNumber,
  logPrintJob,
  loadPrinterSettings,
  type InvoiceData,
  type PrinterStatus,
} from '../utils/printerService';

// Inline category list — avoids dependency on restaurantData export
const POS_CATEGORIES = [
  'Pizza', 'Fried Corner', 'Wings', 'Meatbox', 'Burger', 'Sub', 'Shawarma', 'Momo',
  'Combo', 'Wonton', 'Soup', 'Chawomen', 'Seafood', 'Pasta', 'Salad', 'Rich Bowl',
  'Curry', 'Sizzling', 'Platter', 'Ramen', 'Naan', 'Cold Coffee', 'Hot Coffee',
  'Lassi', 'Dessert', 'Biryani', 'Couple',
] as const;

const POS_USER = 'Admin';

type OrderType = 'Dine In' | 'Takeaway' | 'Delivery';
type PaymentMethod = 'Cash' | 'Card' | 'bKash' | 'Nagad';
type DiscountType = 'flat' | 'percent';

interface CartItem {
  item: MenuItem;
  quantity: number;
  note: string;
  variant?: string;
}

interface HoldOrder {
  id: string;
  label: string;
  cart: CartItem[];
  orderType: OrderType;
  tableNo: string;
  createdAt: number;
}

// ─── Colour helpers ──────────────────────────────────────────────────────────
const PZ = '#F9002B';
const PZD = '#C8001F';
const CREAM = '#F8EFDC';

export function POS() {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsAuthenticating(true);

    try {
      const getBackendUrl = () => {
        if (import.meta.env.VITE_BACKEND_URL) return import.meta.env.VITE_BACKEND_URL;
        if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') return 'http://localhost:3001';
        return window.location.origin;
      };
      const SOCKET_URL = getBackendUrl();
      const res = await fetch(`${SOCKET_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });

      if (res.ok) {
        const { token } = await res.json();
        sessionStorage.setItem('pizzora_token', token);
        sessionStorage.setItem('pizzora_admin_logged_in', 'true');
        dispatch({ type: 'ADMIN_LOGIN' });
        window.location.reload(); // Reload to initialize secure socket & fetch admin state
      } else {
        setLoginError('Invalid credentials. Please try again.');
        setIsAuthenticating(false);
      }
    } catch (err) {
      setLoginError('Network error. Please try again.');
      setIsAuthenticating(false);
    }
  };

  // ── POS state ─────────────────────────────────────────────────────────────
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [orderType, setOrderType] = useState<OrderType>('Dine In');
  const [tableNo, setTableNo] = useState('T01');
  const [customerName, setCustomerName] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('flat');
  const [discountVal, setDiscountVal] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [cashTendered, setCashTendered] = useState('');
  const [holdOrders, setHoldOrders] = useState<HoldOrder[]>([]);
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<{ id: string; invoiceNumber: string; items: CartItem[]; sub: number; vat: number; disc: number; total: number; method: PaymentMethod; change: number; orderType: OrderType; table: string; customer: string; time: string } | null>(null);
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus>(printerService.getStatus());
  const [isPrinting, setIsPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const [printSuccess, setPrintSuccess] = useState(false);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  // ── Cash Register ─────────────────────────────────────────────────────────
  const activeSession = useMemo(() => state.cashRegister.find(r => r.status === 'Open'), [state.cashRegister]);
  const [showOpenRegisterModal, setShowOpenRegisterModal] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  const [showCloseRegisterModal, setShowCloseRegisterModal] = useState(false);
  const [bankDeposit, setBankDeposit] = useState('');
  const [shoppingCash, setShoppingCash] = useState('');

  useEffect(() => {
    if (state.isAdminLoggedIn && !state.isInitialLoading && !activeSession) {
      setShowOpenRegisterModal(true);
    } else {
      setShowOpenRegisterModal(false);
    }
  }, [state.isAdminLoggedIn, state.isInitialLoading, activeSession]);

  const handleOpenRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const balance = Number(openingBalance);
    if (isNaN(balance) || balance < 0) return alert('Enter a valid amount');
    dispatch({ type: 'ADD_CASH_ENTRY', payload: {
      id: `CS-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      openedAt: new Date().toISOString(),
      closedAt: null,
      openingBalance: balance,
      totalCashSales: 0,
      bankDeposit: 0,
      shoppingCash: 0,
      status: 'Open'
    }});
    setShowOpenRegisterModal(false);
    setOpeningBalance('');
  };

  const computeCashSales = () => {
    if (!activeSession) return 0;
    const start = new Date(activeSession.openedAt).getTime();
    return state.orders
      .filter(o => 
        (o.paymentMethod === 'Cash' || o.paymentMethod === 'Cash on Delivery') &&
        new Date(o.createdAt).getTime() >= start
      )
      .reduce((sum, o) => sum + o.total, 0);
  };
  const currentCashSales = computeCashSales();
  const expectedDrawerCash = activeSession ? activeSession.openingBalance + currentCashSales : 0;

  const handleCloseRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    const bDeposit = Number(bankDeposit);
    const sCash = Number(shoppingCash);
    if (isNaN(bDeposit) || isNaN(sCash)) return alert('Enter valid amounts');
    
    dispatch({ type: 'UPDATE_CASH_ENTRY', payload: {
      ...activeSession,
      status: 'Closed',
      closedAt: new Date().toISOString(),
      totalCashSales: currentCashSales,
      bankDeposit: bDeposit,
      shoppingCash: sCash
    }});
    setShowCloseRegisterModal(false);
    setBankDeposit('');
    setShoppingCash('');
  };

  // ── Offline Mode ──────────────────────────────────────────────────────────
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  // Sync all queued offline orders to the app state
  const syncPendingOrders = useCallback(async () => {
    const pending = await getPendingOrders();
    if (!pending.length) return;
    setSyncing(true);
    try {
      dispatch({ type: 'BATCH_PLACE_ORDERS', payload: pending });
      for (const order of pending) {
        await dequeueOrder(order.id);
      }
      setPendingCount(0);
      dispatch({
        type: 'SET_NOTIFICATION',
        payload: { message: `✅ ${pending.length} offline order${pending.length > 1 ? 's' : ''} synced successfully!`, type: 'success' },
      });
    } catch (err) {
      console.error('Sync failed', err);
    } finally {
      setSyncing(false);
    }
  }, [dispatch]);

  useEffect(() => {
    // Load initial pending count
    getPendingCount().then(setPendingCount);

    const handleOnline = () => {
      setIsOffline(false);
      syncPendingOrders();
    };
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingOrders]);

  // ── Printer status listener ────────────────────────────────────────────────
  useEffect(() => {
    if (printerService.getStatus() !== 'online') {
      setTimeout(() => printerService.connect(), 1000);
    }
    const unsubscribe = printerService.onStatusChange(setPrinterStatus);
    return unsubscribe;
  }, []);


  // ── Recommendations (Upsell Engine) ───────────────────────────────────────
  const recommendations = useMemo(() => {
    if (cart.length === 0) return [];

    const cartCategories = cart.map(c => c.item.category.toLowerCase());
    const hasMain = cartCategories.some(c => c.includes('pizza') || c.includes('burger') || c.includes('pasta'));
    const hasDrink = cartCategories.some(c => c.includes('coffee') || c.includes('lassi') || c.includes('drink'));

    if (hasMain && !hasDrink) {
      return state.menuItems.filter(m => m.category.toLowerCase().includes('coffee') || m.category.toLowerCase().includes('lassi')).slice(0, 3);
    }
    if (hasMain) {
      return state.menuItems.filter(m => m.name.toLowerCase().includes('fries') || m.name.toLowerCase().includes('wings')).slice(0, 3);
    }
    return [];
  }, [cart, state.menuItems]);
  const [showHeld, setShowHeld] = useState(false);

  // ── Filtered menu ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = state.menuItems;
    if (activeCategory !== 'All') list = list.filter(i => i.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
    }
    return list;
  }, [activeCategory, search, state.menuItems]);

  // ── Cart helpers ──────────────────────────────────────────────────────────
  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const ex = prev.find(c => c.item.id === item.id);
      if (ex) return prev.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { item, quantity: 1, note: '' }];
    });
  };
  const changeQty = (id: string, delta: number) => {
    setCart(prev => prev.map(c => c.item.id === id ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c));
  };
  const removeItem = (id: string) => setCart(prev => prev.filter(c => c.item.id !== id));
  const clearCart = () => { setCart([]); setDiscountVal(''); setCustomerName(''); };

  // ── Totals ────────────────────────────────────────────────────────────────
  const subtotal = cart.reduce((s, c) => s + c.item.price * c.quantity, 0);
  const discountAmt = discountVal
    ? discountType === 'flat' ? Math.min(Number(discountVal), subtotal) : subtotal * (Number(discountVal) / 100)
    : 0;
  const afterDiscount = subtotal - discountAmt;
  const total = afterDiscount;
  const change = cashTendered ? Math.max(0, Number(cashTendered) - total) : 0;
  const due = cashTendered ? Math.max(0, total - Number(cashTendered)) : 0;

  // ── Hold / Resume ─────────────────────────────────────────────────────────
  const holdOrder = () => {
    if (!cart.length) return;
    const id = `H${Date.now()}`;
    setHoldOrders(prev => [{ id, label: `Order ${prev.length + 1} — ${orderType}`, cart, orderType, tableNo, createdAt: Date.now() }, ...prev]);
    clearCart();
  };
  const resumeOrder = (h: HoldOrder) => {
    setCart(h.cart);
    setOrderType(h.orderType);
    setTableNo(h.tableNo);
    setHoldOrders(prev => prev.filter(x => x.id !== h.id));
    setShowHeld(false);
  };

  // ── Complete payment ──────────────────────────────────────────────────────
  const completePay = async () => {
    if (!cart.length) return;
    const id = `PZ${Date.now()}`;

    // Generate sequential invoice number from backend
    const invoiceNumber = await generateInvoiceNumber();

    const invoiceTime = new Date().toLocaleString();
    setLastInvoice({
      id, invoiceNumber, items: cart, sub: subtotal, vat: 0, disc: discountAmt, total,
      method: paymentMethod, change, orderType, table: tableNo,
      customer: customerName, time: invoiceTime,
    });

    const newOrder = {
      id: id,
      items: cart.map(c => ({
        item: c.item,
        quantity: c.quantity,
        specialRequest: c.note || '',
      })),
      total: total,
      status: 'Delivered' as const,
      paymentMethod: paymentMethod,
      customerName: customerName || (orderType === 'Dine In' ? `Table ${tableNo}` : 'POS Customer'),
      phone: '',
      address: orderType === 'Dine In' ? `Table ${tableNo}` : orderType,
      createdAt: new Date().toISOString(),
      estimatedTime: 'Done',
      orderNumber: invoiceNumber,
    };

    if (isOffline) {
      await enqueueOrder(newOrder);
      const newCount = await getPendingCount();
      setPendingCount(newCount);
    } else {
      dispatch({ type: 'PLACE_ORDER', payload: newOrder });
    }

    setShowInvoice(true);
    clearCart();
    setCashTendered('');
    setPrintError(null);
    setPrintSuccess(false);

    // Auto-print receipt
    const settings = loadPrinterSettings();
    if (settings.autoPrint) {
      await handlePrintReceipt({
        id, invoiceNumber, items: cart, sub: subtotal, vat: 0, disc: discountAmt, total,
        method: paymentMethod, change, orderType, table: tableNo,
        customer: customerName, time: invoiceTime,
      }, false);
    }
  };

  // ── Print receipt helper ──────────────────────────────────────────────────
  const handlePrintReceipt = async (
    inv: typeof lastInvoice,
    isReprint = false,
    reprintReason = ''
  ) => {
    if (!inv) return;
    setIsPrinting(true);
    setPrintError(null);
    const settings = loadPrinterSettings();

    const invoiceData: InvoiceData = {
      invoiceNumber: inv.invoiceNumber,
      orderId: inv.id,
      orderType: inv.orderType,
      tableNo: inv.orderType === 'Dine In' ? inv.table : undefined,
      customerName: inv.customer || undefined,
      cashierName: POS_USER,
      dateTime: inv.time,
      items: inv.items.map(c => ({
        name: c.item.name,
        quantity: c.quantity,
        price: c.item.price,
        variant: c.variant,
      })),
      subtotal: inv.sub,
      discount: inv.disc,
      total: inv.total,
      paymentMethod: inv.method,
      amountPaid: inv.method === 'Cash' ? inv.total + inv.change : inv.total,
      change: inv.change,
    };

    const result = await printerService.printReceipt(invoiceData, settings);
    setIsPrinting(false);

    // Log print job
    await logPrintJob({
      invoiceNumber: inv.invoiceNumber,
      orderId: inv.id,
      printedBy: POS_USER,
      isReprint,
      reprintReason,
      status: result.success ? 'success' : 'failed',
      paymentMethod: inv.method,
      total: inv.total,
    });

    if (result.success) {
      setPrintSuccess(true);
      // Open cash drawer for cash payments
      if (inv.method === 'Cash' && settings.autoOpenDrawer) {
        await printerService.openCashDrawer(settings);
      }
    } else {
      setPrintError(result.error || 'Print failed');
    }
  };

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!state.isAdminLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#F8EFDC', backgroundImage: 'linear-gradient(135deg, #FDFBF7 0%, #F8EFDC 100%)' }}>
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Subtle warm red glow top-left */}
          <div className="absolute top-[-25%] left-[-15%] w-[75vw] h-[75vw] rounded-full" style={{ background: 'radial-gradient(circle, rgba(249,0,43,0.06) 0%, transparent 70%)' }} />
          {/* Warm cream glow bottom-right */}
          <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full" style={{ background: 'radial-gradient(circle, rgba(248,239,220,0.4) 0%, transparent 70%)' }} />
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-[0.4]" style={{ backgroundImage: 'linear-gradient(rgba(139,92,26,0.03) 1px, transparent 1px), linear-gradient(to right, rgba(139,92,26,0.03) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
        </div>

        {/* Main Card */}
        <div className="w-full max-w-[1100px] mx-4 relative z-10 flex flex-col-reverse lg:flex-row min-h-[620px]"
          style={{ borderRadius: '2.5rem', overflow: 'hidden', backgroundColor: '#ffffff', boxShadow: '0 40px 80px -20px rgba(92,60,16,0.12), 0 0 0 1px rgba(92,60,16,0.04)' }}>

          {/* ── LEFT: POS Identity Panel (Light Warm Slate) ─────────────────────────────────── */}
          <div className="w-full lg:w-[45%] flex flex-col justify-between relative overflow-hidden p-10 lg:p-14"
            style={{ backgroundColor: '#FDFCF9', borderRight: '1px solid rgba(139,92,26,0.06)' }}>
            {/* Grid overlay */}
            <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(to right, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

            {/* Top: Brand */}
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', boxShadow: '0 8px 28px rgba(249,0,43,0.25)' }}>
                  <CreditCard size={26} style={{ color: '#fff' }} />
                </div>
                <div>
                  <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '22px', color: '#111827', letterSpacing: '-0.3px' }}>Pizzora</p>
                  <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#F9002B' }}>POS Terminal</p>
                </div>
              </div>

              <div className="mb-8">
                {/* Live badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
                  style={{ background: 'rgba(249,0,43,0.06)', border: '1px solid rgba(249,0,43,0.12)' }}>
                  <div className="w-2 h-2 rounded-full bg-[#F9002B] animate-pulse" />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#F9002B', textTransform: 'uppercase', letterSpacing: '1px' }}>Point of Sale Access</span>
                </div>
                <p style={{ color: '#4B5563', fontSize: '15px', lineHeight: 1.75, fontFamily: 'var(--font-body)' }}>
                  Secure terminal for authorized cashiers and managers. All sessions are monitored and encrypted.
                </p>
              </div>

              {/* Feature list */}
              <div className="space-y-3">
                {[
                  { icon: <ShieldCheck size={15} />, label: 'Encrypted Sessions', sub: 'Bank-grade 256-bit security' },
                  { icon: <Receipt size={15} />, label: 'Live Order Sync', sub: 'Instant POS-to-kitchen relay' },
                  { icon: <Activity size={15} />, label: 'Cash Register Tracking', sub: 'Open & close register with audit log' },
                ].map(({ icon, label, sub }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(249,0,43,0.06)', border: '1px solid rgba(249,0,43,0.12)' }}>
                      <span style={{ color: '#F9002B' }}>{icon}</span>
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '13px', color: '#111827' }}>{label}</p>
                      <p style={{ fontSize: '11px', color: '#6B7280' }}>{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom: Back link */}
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 mt-10 relative z-10 w-fit px-4 py-2.5 rounded-xl transition-all"
              style={{ color: '#4B5563', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, background: '#F3F4F6', border: '1px solid #E5E7EB', cursor: 'pointer' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#E5E7EB'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F3F4F6'; }}
            >
              <ChevronRight size={14} className="rotate-180" style={{ color: '#4B5563' }} />
              Return to public website
            </button>
          </div>

          {/* ── RIGHT: Login Form (Pure White) ─────────────────────────────────────────── */}
          <div className="w-full lg:w-[55%] flex flex-col justify-center p-10 lg:p-14"
            style={{ backgroundColor: '#ffffff' }}>

            {/* Eyebrow divider */}
            <div className="flex items-center gap-3 mb-8">
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(249,0,43,0.15), transparent)' }} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#F9002B', textTransform: 'uppercase', letterSpacing: '2px', whiteSpace: 'nowrap' }}>Cashier Authentication</span>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, rgba(249,0,43,0.15), transparent)' }} />
            </div>

            <div className="mb-8">
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '30px', color: '#111827', letterSpacing: '-0.5px', marginBottom: '8px' }}>
                POS Login
              </h2>
              <p style={{ color: '#6B7280', fontSize: '14px', lineHeight: 1.6 }}>
                Enter your cashier credentials to open the sales terminal.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Error */}
              {loginError && (
                <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'rgba(249,0,43,0.05)', border: '1px solid rgba(249,0,43,0.15)' }}>
                  <AlertCircle size={16} style={{ color: '#F9002B', flexShrink: 0 }} />
                  <span style={{ color: '#F9002B', fontSize: '13px', fontWeight: 600 }}>{loginError}</span>
                </div>
              )}

              {/* POS ID */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                  Cashier ID
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }}>
                    <User size={17} />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Enter your cashier ID"
                    value={loginForm.username}
                    onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))}
                    className="w-full py-4 pl-11 pr-4 text-[15px] outline-none transition-all"
                    style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '14px', color: '#111827', fontFamily: 'var(--font-body)' }}
                    onFocus={e => { e.target.style.border = '1px solid #F9002B'; e.target.style.background = '#ffffff'; e.target.style.boxShadow = '0 0 0 4px rgba(249,0,43,0.08)'; }}
                    onBlur={e => { e.target.style.border = '1px solid #E5E7EB'; e.target.style.background = '#F9FAFB'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {/* Security Key */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                  Security Key
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }}>
                    <KeyRound size={17} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••"
                    value={loginForm.password}
                    onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full py-4 pl-11 pr-12 text-[15px] outline-none transition-all"
                    style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '14px', color: '#111827', fontFamily: 'var(--font-body)' }}
                    onFocus={e => { e.target.style.border = '1px solid #F9002B'; e.target.style.background = '#ffffff'; e.target.style.boxShadow = '0 0 0 4px rgba(249,0,43,0.08)'; }}
                    onBlur={e => { e.target.style.border = '1px solid #E5E7EB'; e.target.style.background = '#F9FAFB'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full py-4 rounded-2xl font-bold transition-all active:scale-[0.98] flex justify-center items-center gap-2 relative overflow-hidden mt-2 disabled:opacity-70 disabled:cursor-wait text-white"
                style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', boxShadow: '0 8px 28px rgba(249,0,43,0.2)', cursor: isAuthenticating ? 'wait' : 'pointer' }}
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Fingerprint size={18} />
                    Open POS Terminal
                  </>
                )}
              </button>
            </form>

            {/* Status footer */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>System Online</span>
              </div>
              <span style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 500 }}>POS v2.0</span>
            </div>
          </div>
        </div>
      </div>
    );
  }



  // ── Invoice Modal ─────────────────────────────────────────────────────────
  if (showInvoice && lastInvoice) {
    const settings = loadPrinterSettings();
    const isCash = lastInvoice.method === 'Cash';
    return (
      <div className="min-h-screen flex items-center justify-center p-4 pos-invoice-modal-bg" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}>
        <style>{`
          @media print {
            @page { margin: 0; size: 80mm auto; }
            body { background: white; margin: 0; padding: 0; }
            .pos-invoice-modal-bg { 
              background: transparent !important; 
              backdrop-filter: none !important; 
              padding: 0 !important; 
              align-items: flex-start !important; 
              justify-content: flex-start !important;
              min-height: auto !important;
            }
            .pos-invoice-container { 
              box-shadow: none !important; 
              border-radius: 0 !important; 
              width: 100% !important;
              max-width: 80mm !important;
              margin: 0 !important;
              padding: 10px !important;
            }
            .pos-invoice-buttons { display: none !important; }
            * { color: #000 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
        `}</style>

        <div className="w-full max-w-sm pos-invoice-container" style={{ backgroundColor: '#fff', color: '#000', fontFamily: 'Arial, sans-serif', padding: '24px', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontWeight: 'bold', fontSize: '20px', margin: '0 0 4px 0' }}>Pizzora Restaurant</h2>
            <p style={{ fontSize: '15px', margin: '2px 0' }}>Subidbazar Point, Mitali Complex</p>
            <p style={{ fontSize: '15px', margin: '2px 0' }}>Sylhet, Bangladesh</p>
            <p style={{ fontSize: '15px', margin: '2px 0' }}>01620026649</p>
          </div>

          <div style={{ borderBottom: '1.5px solid #000', margin: '12px 0' }} />

          {/* Offline Saved Badge */}
          {isOffline && (
            <div style={{ backgroundColor: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '8px', padding: '6px 12px', marginBottom: '12px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: '#C2410C', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <span>☁️</span>
              <span>Saved Offline — Will sync when connected</span>
            </div>
          )}

          {/* Metadata */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <p style={{ fontSize: '15px', margin: '2px 0', fontWeight: 'bold' }}>{lastInvoice.orderType}</p>
            <p style={{ fontSize: '15px', margin: '2px 0' }}>{lastInvoice.time}</p>
            <p style={{ fontSize: '15px', margin: '2px 0' }}>Placed By: {POS_USER}</p>
            {lastInvoice.orderType === 'Dine In' && (
              <p style={{ fontSize: '15px', margin: '2px 0' }}>Table {lastInvoice.table}</p>
            )}
            <p style={{ fontSize: '15px', margin: '2px 0', fontWeight: 'bold' }}>Invoice: {lastInvoice.invoiceNumber}</p>
          </div>

          <div style={{ borderBottom: '1.5px solid #000', margin: '12px 0' }} />

          {/* Items */}
          <div style={{ marginBottom: '16px' }}>
            {lastInvoice.items.map((c, i) => (
              <div key={i} style={{ display: 'flex', fontSize: '15px', margin: '6px 0' }}>
                <span style={{ width: '28px' }}>{c.quantity}</span>
                <span style={{ flex: 1 }}>{c.item.name}</span>
                <span>{(c.item.price * c.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div style={{ borderBottom: '1.5px solid #000', margin: '12px 0' }} />

          {/* Totals */}
          <div style={{ fontSize: '15px', fontWeight: 'bold' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0' }}>
              <span>Subtotal:</span>
              <span>{lastInvoice.sub.toFixed(2)}</span>
            </div>
            {lastInvoice.disc > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0' }}>
                <span>Discount:</span>
                <span>-{Math.round(lastInvoice.disc).toFixed(2)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0', fontSize: '18px' }}>
              <span>Total:</span>
              <span>{lastInvoice.total.toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0', fontWeight: 'normal' }}>
              <span>Paid via {lastInvoice.method}:</span>
              <span>{lastInvoice.total.toFixed(2)}</span>
            </div>
            {lastInvoice.change > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0', fontWeight: 'normal' }}>
                <span>Change:</span>
                <span>{lastInvoice.change.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <p style={{ fontSize: '15px', margin: '2px 0' }}>Thank you for dining at Pizzora!</p>
            <p style={{ fontSize: '13px', margin: '6px 0', color: '#555' }}>Powered by www.rizqara.tech</p>
          </div>

          {/* Print status feedback */}
          {printError && (
            <div className="pos-invoice-buttons" style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <AlertTriangle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: '1px' }} />
              <div>
                <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#DC2626', margin: 0 }}>Print Failed</p>
                <p style={{ fontSize: '11px', color: '#7F1D1D', margin: '2px 0 0 0' }}>{printError}</p>
                {printError.includes('QZ Tray') && (
                  <p style={{ fontSize: '11px', color: '#7F1D1D', margin: '4px 0 0 0' }}>→ Download QZ Tray at <strong>qz.io</strong> and restart it</p>
                )}
                {printError.includes('printer') && (
                  <p style={{ fontSize: '11px', color: '#7F1D1D', margin: '4px 0 0 0' }}>→ Go to Admin → Printer Settings to select your printer</p>
                )}
              </div>
            </div>
          )}
          {printSuccess && (
            <div className="pos-invoice-buttons" style={{ marginTop: '12px', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PrinterCheck size={16} color="#16A34A" />
              <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#15803D', margin: 0 }}>Receipt printed successfully{isCash && settings.autoOpenDrawer ? ' · Cash drawer opened' : ''}</p>
            </div>
          )}

          <div className="flex gap-2 mt-4 pos-invoice-buttons">
            <button
              onClick={() => handlePrintReceipt(lastInvoice, false)}
              disabled={isPrinting}
              className="flex-1 py-3 rounded text-sm font-bold flex items-center justify-center gap-2 transition-all hover:bg-gray-100 disabled:opacity-50"
              style={{ border: `1.5px solid #000`, color: '#000' }}
            >
              {isPrinting ? <Loader2 size={15} className="animate-spin" /> : <Printer size={15} />}
              {isPrinting ? 'Printing…' : 'Print Receipt'}
            </button>
            {isCash && (
              <button
                onClick={() => printerService.openCashDrawer(settings)}
                className="py-3 px-3 rounded text-sm font-bold flex items-center justify-center gap-1 transition-all"
                style={{ border: '1.5px solid #16A34A', color: '#16A34A', whiteSpace: 'nowrap' }}
                title="Open Cash Drawer"
              >
                <Receipt size={14} /> Drawer
              </button>
            )}
            <button onClick={() => { setShowInvoice(false); setPrintError(null); setPrintSuccess(false); }} className="flex-1 py-3 rounded text-sm font-bold text-white transition-all hover:bg-gray-800"
              style={{ background: '#000' }}>
              New Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  const allCategories = ['All', ...POS_CATEGORIES];

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ backgroundColor: '#F5F5F5', fontFamily: 'var(--font-body)' }}>

      {/* ── OFFLINE / SYNCING INDICATOR ───────────────────────────── */}
      {syncing && (
        <div className="text-white text-xs font-bold text-center py-1.5 px-4 flex justify-center items-center gap-2" style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }}>
          <CloudUpload size={14} className="animate-bounce" />
          Syncing {pendingCount} offline order{pendingCount !== 1 ? 's' : ''} to database…
        </div>
      )}
      {!syncing && isOffline && (
        <div className="bg-amber-500 text-white text-xs font-bold text-center py-1.5 px-4 flex justify-center items-center gap-2">
          <CloudOff size={14} />
          OFFLINE MODE — Orders are saved locally and will sync automatically when connected
          {pendingCount > 0 && (
            <span className="ml-2 bg-white text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-black">
              {pendingCount} pending
            </span>
          )}
        </div>
      )}
      {!syncing && !isOffline && pendingCount > 0 && (
        <div className="text-white text-xs font-bold text-center py-1.5 px-4 flex justify-center items-center gap-2" style={{ backgroundColor: '#16a34a' }}>
          <CloudUpload size={14} />
          Back online — syncing {pendingCount} queued order{pendingCount !== 1 ? 's' : ''}…
        </div>
      )}

      {/* ── TOP BAR ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 shadow-sm z-20" style={{ backgroundColor: '#fff', borderBottom: '1px solid #E5E7EB' }}>

        {/* Left: Branding */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)' }}>
              <LayoutGrid size={16} className="text-white" />
            </div>
            <div>
              <span className="block leading-none" style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '18px', color: '#111', letterSpacing: '-0.3px' }}>
                POS Terminal
              </span>
              <span className="block leading-none mt-1.5" style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600 }}>
                {POS_USER} • Logged In
              </span>
            </div>
          </div>
        </div>

        {/* Center: Order Type Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB' }}>
          {(['Dine In', 'Takeaway', 'Delivery'] as OrderType[]).map(t => (
            <button key={t} onClick={() => setOrderType(t)}
              className="px-6 py-1.5 rounded-lg text-sm font-bold transition-all"
              style={{
                background: orderType === t ? 'linear-gradient(135deg, #F9002B, #C8001F)' : 'transparent',
                color: orderType === t ? '#fff' : '#4B5563',
                fontFamily: 'var(--font-heading)',
                boxShadow: orderType === t ? '0 2px 8px rgba(249,0,43,0.3)' : 'none'
              }}>
              {t}
            </button>
          ))}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">

          {/* Printer Status Badge */}
          <div
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black"
            style={{
              backgroundColor: printerStatus === 'online' ? '#F0FDF4' : printerStatus === 'connecting' ? '#FFF7ED' : '#FEF2F2',
              color: printerStatus === 'online' ? '#15803D' : printerStatus === 'connecting' ? '#92400E' : '#991B1B',
              border: `1.5px solid ${printerStatus === 'online' ? '#BBF7D0' : printerStatus === 'connecting' ? '#FED7AA' : '#FECACA'}`,
              fontFamily: 'var(--font-heading)',
              cursor: printerStatus !== 'online' ? 'pointer' : 'default',
            }}
            title={printerStatus === 'online' ? 'Printer Connected' : 'Click to connect QZ Tray'}
            onClick={() => printerStatus !== 'online' && printerService.connect()}
          >
            <Printer size={12} />
            {printerStatus === 'online' ? 'Printer' : printerStatus === 'connecting' ? 'Connecting…' : 'No Printer'}
          </div>

          {/* Offline Queue Badge */}
          {pendingCount > 0 && (
            <div
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black animate-pulse"
              style={{ backgroundColor: '#FFF7ED', color: '#c2410c', border: '1.5px solid #fed7aa', fontFamily: 'var(--font-heading)' }}
              title="Orders saved offline, waiting to sync"
            >
              <CloudOff size={13} />
              {pendingCount} Offline
            </div>
          )}

          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all hover:bg-gray-50 active:scale-95"
            style={{ border: '1.5px solid #E5E7EB', color: '#4B5563', fontFamily: 'var(--font-heading)', fontSize: '13px', fontWeight: 700 }}
          >
            <ExternalLink size={14} className="text-gray-400" />
            Switch to Admin
          </button>

          <button
            onClick={() => setShowCloseRegisterModal(true)}
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl transition-all active:scale-95 text-white font-bold text-sm"
            style={{ backgroundColor: '#111', fontFamily: 'var(--font-heading)', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}
          >
            <Banknote size={16} className="text-gray-300" />
            Close Register
          </button>

          <div className="h-6 w-px bg-gray-200 hidden sm:block mx-1" />

          {orderType === 'Dine In' && (
            <div className="relative group">
              <select value={tableNo} onChange={e => setTableNo(e.target.value)}
                className="appearance-none pr-10 cursor-pointer hover:bg-gray-100 transition-colors"
                style={{ padding: '8px 36px 8px 16px', borderRadius: '12px', border: '1.5px solid #E5E7EB', fontSize: '14px', fontFamily: 'var(--font-heading)', fontWeight: 800, color: '#111', backgroundColor: '#F9FAFB', outline: 'none' }}>
                {['T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'V01', 'V02', 'O01', 'O02'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-transform group-hover:translate-y-[-60%]" style={{ color: '#6B7280' }} />
            </div>
          )}

          <button onClick={() => setShowHeld(true)}
            className="relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
            style={{
              backgroundColor: holdOrders.length ? '#FFF1F2' : '#F9FAFB',
              color: holdOrders.length ? '#F9002B' : '#4B5563',
              border: `1.5px solid ${holdOrders.length ? 'rgba(249,0,43,0.3)' : '#E5E7EB'}`,
              fontFamily: 'var(--font-heading)',
              boxShadow: holdOrders.length ? '0 4px 12px rgba(249,0,43,0.1)' : 'none'
            }}>
            <Pause size={16} style={{ fill: holdOrders.length ? '#F9002B' : 'transparent', color: holdOrders.length ? '#F9002B' : '#6B7280' }} />
            Held
            {holdOrders.length > 0 && (
              <span className="ml-1 w-5 h-5 rounded-md flex items-center justify-center text-white font-black" style={{ backgroundColor: '#F9002B', fontSize: '11px' }}>
                {holdOrders.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: MENU ────────────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Search + Category strip */}
          <div className="px-4 pt-3 pb-2" style={{ backgroundColor: '#fff', borderBottom: '1px solid #E5E7EB' }}>
            <div className="relative mb-2">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search menu items…"
                style={{ width: '100%', padding: '9px 14px 9px 36px', borderRadius: '10px', border: '1.5px solid #E5E7EB', fontSize: '13px', outline: 'none', backgroundColor: '#F9FAFB' }} />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {allCategories.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className="whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0 transition-all"
                  style={{ background: activeCategory === cat ? `linear-gradient(135deg,${PZ},${PZD})` : '#F3F4F6', color: activeCategory === cat ? '#fff' : '#6B7280', fontFamily: 'var(--font-heading)' }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-3">
            {state.isInitialLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {Array.from({ length: 12 }).map((_, i) => <POSCardSkeleton key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full" style={{ color: '#9CA3AF' }}>
                <Package size={40} style={{ opacity: 0.3 }} />
                <p className="mt-2 text-sm">No items found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {filtered.map(item => {
                  const inCart = cart.find(c => c.item.id === item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => addToCart(item)}
                        className="relative rounded-xl overflow-hidden text-left transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
                        style={{ backgroundColor: '#fff', border: inCart ? `2px solid ${PZ}` : '1.5px solid #E5E7EB' }}
                      >
                        <div className="relative">
                          <img src={item.image} alt={item.name} className="w-full object-cover" style={{ height: '80px' }} />
                          {inCart && (
                            <div className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: PZ, fontSize: '10px' }}>
                              {inCart.quantity}
                            </div>
                          )}
                        </div>
                        <div className="p-2">
                          <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '11px', color: '#111', lineHeight: 1.3, marginBottom: '3px' }} className="line-clamp-2">{item.name}</p>
                          <p style={{ color: PZ, fontWeight: 800, fontSize: '12px', fontFamily: 'var(--font-heading)' }}>৳{item.price}</p>
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: CART ───────────────────────────────────────────────── */}
        <div className="flex flex-col w-80 xl:w-96 flex-shrink-0 border-l overflow-hidden" style={{ backgroundColor: '#fff', borderColor: '#E5E7EB' }}>

          {/* Cart header */}
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#E5E7EB', borderBottomWidth: '2px' }}>
            <div className="flex items-center gap-2">
              <ShoppingCart size={16} style={{ color: PZ }} />
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '14px', color: '#111' }}>
                Order {orderType === 'Dine In' ? `— ${tableNo}` : `— ${orderType}`}
              </span>
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-xs px-2 py-1 rounded-lg hover:bg-red-50 transition-colors" style={{ color: '#DC2626', fontFamily: 'var(--font-heading)' }}>
                <Trash2 size={13} className="inline mr-1" />Clear
              </button>
            )}
          </div>

          {/* Customer name */}
          <div className="px-3 pt-3 pb-2 border-b" style={{ borderColor: '#F3F4F6' }}>
            <div className="relative">
              <User size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
              <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer name (optional)"
                style={{ width: '100%', padding: '7px 10px 7px 28px', borderRadius: '8px', border: '1.5px solid #E5E7EB', fontSize: '12px', outline: 'none', backgroundColor: '#F9FAFB' }} />
            </div>
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8" style={{ color: '#9CA3AF' }}>
                <ShoppingCart size={36} style={{ opacity: 0.2 }} />
                <p className="mt-2 text-sm">Cart is empty</p>
                <p style={{ fontSize: '11px', marginTop: '4px', color: '#D1D5DB' }}>Tap items on the left to add</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map(c => (
                  <div key={c.item.id} className="rounded-xl p-2.5" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '12px', color: '#111' }} className="truncate">{c.item.name}</p>
                        <p style={{ color: PZ, fontWeight: 800, fontSize: '12px', fontFamily: 'var(--font-heading)' }}>৳{(c.item.price * c.quantity).toLocaleString()}</p>
                        {c.note && <p style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '2px' }}>📝 {c.note}</p>}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => changeQty(c.item.id, -1)} className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: '#F3F4F6' }}>
                          <Minus size={10} />
                        </button>
                        <span style={{ fontSize: '12px', fontWeight: 800, minWidth: '18px', textAlign: 'center', fontFamily: 'var(--font-heading)' }}>{c.quantity}</span>
                        <button onClick={() => changeQty(c.item.id, 1)} className="w-5 h-5 rounded flex items-center justify-center text-white" style={{ backgroundColor: PZ }}>
                          <Plus size={10} />
                        </button>
                        <button onClick={() => removeItem(c.item.id)} className="w-5 h-5 rounded flex items-center justify-center ml-0.5" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                          <X size={10} />
                        </button>
                      </div>
                    </div>
                    <button onClick={() => { setNoteFor(c.item.id); setNoteText(c.note); }}
                      style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '3px', fontFamily: 'var(--font-body)' }}>
                      + Add note
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upsell Engine */}
          {recommendations.length > 0 && (
            <div className="px-3 py-2 bg-orange-50/50 border-t border-b border-orange-100">
              <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-2 flex items-center gap-1" style={{ fontFamily: 'var(--font-heading)' }}>
                <Star size={11} className="fill-orange-500" /> Customers also bought
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {recommendations.map(item => (
                  <button key={item.id} onClick={() => addToCart(item)} className="flex items-center gap-2 bg-white border border-orange-100 rounded-lg p-1.5 pr-3 shadow-sm hover:border-orange-300 transition-colors flex-shrink-0 text-left">
                    <img src={item.image} alt={item.name} className="w-8 h-8 rounded-md object-cover" />
                    <div>
                      <p className="text-[10px] font-bold text-gray-900 leading-tight line-clamp-1 w-24" style={{ fontFamily: 'var(--font-heading)' }}>{item.name}</p>
                      <p className="text-[9px] font-bold text-red-600">৳{item.price}</p>
                    </div>
                    <Plus size={12} className="text-orange-500 ml-1" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Discount + Totals */}
          {cart.length > 0 && (
            <div className="px-3 py-3 border-t space-y-2" style={{ borderColor: '#E5E7EB' }}>
              {/* Discount row */}
              <div className="flex gap-2">
                <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: '#E5E7EB' }}>
                  {(['flat', 'percent'] as DiscountType[]).map(t => (
                    <button key={t} onClick={() => setDiscountType(t)}
                      className="px-2 py-1.5 text-xs font-bold transition-all"
                      style={{ background: discountType === t ? PZ : 'transparent', color: discountType === t ? '#fff' : '#6B7280', fontFamily: 'var(--font-heading)' }}>
                      {t === 'flat' ? <Tag size={11} /> : <Percent size={11} />}
                    </button>
                  ))}
                </div>
                <input value={discountVal} onChange={e => setDiscountVal(e.target.value)} placeholder={discountType === 'flat' ? 'Flat ৳' : 'Percent %'}
                  type="number" min="0"
                  style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', border: '1.5px solid #E5E7EB', fontSize: '12px', outline: 'none' }} />
              </div>

              {/* Totals */}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span style={{ color: '#6B7280' }}>Subtotal</span><span>৳{subtotal.toLocaleString()}</span></div>
                {discountAmt > 0 && <div className="flex justify-between"><span style={{ color: '#16A34A' }}>Discount</span><span style={{ color: '#16A34A' }}>−৳{Math.round(discountAmt).toLocaleString()}</span></div>}
                <div className="flex justify-between font-bold border-t pt-1.5" style={{ borderColor: '#E5E7EB' }}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: '15px' }}>Total</span>
                  <span style={{ color: PZ, fontFamily: 'var(--font-heading)', fontSize: '16px' }}>৳{total.toLocaleString()}</span>
                </div>
              </div>

              {/* Payment method */}
              <div className="grid grid-cols-4 gap-1.5">
                {(['Cash', 'Card', 'bKash', 'Nagad'] as PaymentMethod[]).map(m => (
                  <button key={m} onClick={() => setPaymentMethod(m)}
                    className="py-2 rounded-lg text-xs font-bold transition-all"
                    style={{ background: paymentMethod === m ? `linear-gradient(135deg,${PZ},${PZD})` : '#F3F4F6', color: paymentMethod === m ? '#fff' : '#6B7280', fontFamily: 'var(--font-heading)' }}>
                    {m}
                  </button>
                ))}
              </div>

              {paymentMethod === 'Cash' && (
                <div>
                  <div className="relative">
                    <Banknote size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
                    <input type="number" value={cashTendered} onChange={e => setCashTendered(e.target.value)} placeholder="Amount given..."
                      className="w-full transition-colors hover:bg-gray-100 focus:bg-white focus:border-red-500"
                      style={{ padding: '9px 12px 9px 34px', borderRadius: '10px', border: '1.5px solid #E5E7EB', fontSize: '14px', fontFamily: 'var(--font-heading)', fontWeight: 600, outline: 'none', backgroundColor: '#F9FAFB' }} />
                  </div>
                  {cashTendered && (
                    <div className="mt-2 flex justify-between text-sm px-1">
                      {due > 0
                        ? <span style={{ color: '#DC2626', fontWeight: 800 }}>Due: ৳{due.toLocaleString()}</span>
                        : <span style={{ color: '#16A34A', fontWeight: 800 }}>Change: ৳{change.toLocaleString()}</span>}
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                <button onClick={holdOrder}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                  style={{ border: `1.5px solid #E5E7EB`, color: '#6B7280', fontFamily: 'var(--font-heading)' }}>
                  <Pause size={12} /> Hold
                </button>
                <button onClick={completePay}
                  className="flex-[2] py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  style={{ background: `linear-gradient(135deg,${PZ},${PZD})`, fontFamily: 'var(--font-heading)' }}>
                  <Receipt size={14} /> Pay ৳{total.toLocaleString()}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── NOTE MODAL ───────────────────────────────────────────────────── */}
      {noteFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-72 rounded-2xl shadow-2xl p-6" style={{ backgroundColor: '#fff' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '16px', color: '#111', marginBottom: '12px' }}>Item Note</h3>
            <textarea rows={3} value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="e.g. No onion, Extra spicy…"
              style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #E5E7EB', fontSize: '13px', resize: 'none', outline: 'none' }} />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setNoteFor(null)} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ border: '1.5px solid #E5E7EB', color: '#374151', fontFamily: 'var(--font-heading)' }}>Cancel</button>
              <button onClick={() => { setCart(prev => prev.map(c => c.item.id === noteFor ? { ...c, note: noteText } : c)); setNoteFor(null); }}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold" style={{ background: `linear-gradient(135deg,${PZ},${PZD})`, fontFamily: 'var(--font-heading)' }}>
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HELD ORDERS MODAL ────────────────────────────────────────────── */}
      {showHeld && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: '#fff' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#E5E7EB' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '16px', color: '#111' }}>Held Orders</h3>
              <button onClick={() => setShowHeld(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              {holdOrders.length === 0
                ? <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: '14px', padding: '24px 0' }}>No held orders</p>
                : holdOrders.map(h => (
                  <div key={h.id} className="flex items-center justify-between p-3 rounded-xl mb-2" style={{ border: '1.5px solid #E5E7EB' }}>
                    <div>
                      <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '13px', color: '#111' }}>{h.label}</p>
                      <p style={{ fontSize: '11px', color: '#9CA3AF' }}>{h.cart.length} items · {h.tableNo}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setHoldOrders(prev => prev.filter(x => x.id !== h.id))}
                        className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                        <Trash2 size={13} />
                      </button>
                      <button onClick={() => resumeOrder(h)}
                        className="px-3 py-1.5 rounded-lg text-white text-xs font-bold flex items-center gap-1"
                        style={{ background: `linear-gradient(135deg,${PZ},${PZD})`, fontFamily: 'var(--font-heading)' }}>
                        <Play size={11} /> Resume
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
      {/* ── Cash Register Modals ─────────────────────────────────────────────────── */}
      {showOpenRegisterModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className="bg-white rounded-3xl max-w-[400px] w-full overflow-hidden shadow-2xl animate-scale-up" style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
            <div className="p-8 text-center border-b" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #111, #333)' }}>
                <Banknote size={32} className="text-white" />
              </div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '24px', color: '#111' }}>Open Cash Register</h2>
              <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '6px' }}>Enter the starting float to unlock the POS terminal for today's shift.</p>
            </div>
            <form onSubmit={handleOpenRegister} className="p-8 bg-gray-50">
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'var(--font-heading)' }}>
                Opening Balance (Cash in Drawer)
              </label>
              <div className="relative mb-8">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">৳</span>
                <input
                  type="number"
                  required
                  value={openingBalance}
                  onChange={e => setOpeningBalance(e.target.value)}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '14px 14px 14px 36px', borderRadius: '12px', border: '2px solid #E5E7EB', fontSize: '18px', fontWeight: 700, outline: 'none', fontFamily: 'var(--font-heading)', color: '#111', backgroundColor: '#fff' }}
                />
              </div>
              <button
                type="submit"
                className="w-full py-4 rounded-xl text-white text-base font-bold transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)', boxShadow: '0 4px 12px rgba(249,0,43,0.3)' }}
              >
                Open Register & Start Shift
              </button>
            </form>
          </div>
        </div>
      )}

      {showCloseRegisterModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className="bg-white rounded-3xl max-w-[450px] w-full overflow-hidden shadow-2xl animate-scale-up" style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '20px', color: '#111' }}>Close Register</h2>
              <button onClick={() => setShowCloseRegisterModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCloseRegister} className="p-6">
              <div className="bg-blue-50 rounded-2xl p-5 mb-6 border border-blue-100">
                <div className="flex justify-between mb-2">
                  <span style={{ fontSize: '13px', color: '#3B82F6', fontWeight: 600 }}>Opening Balance</span>
                  <span style={{ fontSize: '14px', color: '#1E3A8A', fontWeight: 800 }}>৳ {activeSession?.openingBalance.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between mb-2 pb-2 border-b border-blue-200">
                  <span style={{ fontSize: '13px', color: '#3B82F6', fontWeight: 600 }}>+ Cash Sales Today</span>
                  <span style={{ fontSize: '14px', color: '#1E3A8A', fontWeight: 800 }}>৳ {currentCashSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mt-2">
                  <span style={{ fontSize: '14px', color: '#1E3A8A', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>Expected Drawer Cash</span>
                  <span style={{ fontSize: '18px', color: '#1E3A8A', fontWeight: 900, fontFamily: 'var(--font-heading)' }}>৳ {expectedDrawerCash.toFixed(2)}</span>
                </div>
              </div>

              <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'var(--font-heading)' }}>Bank Deposit (Cash to bank)</label>
              <div className="relative mb-4">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">৳</span>
                <input
                  type="number" required value={bankDeposit} onChange={e => setBankDeposit(e.target.value)}
                  style={{ width: '100%', padding: '12px 12px 12px 36px', borderRadius: '12px', border: '1.5px solid #E5E7EB', fontSize: '15px', fontWeight: 600, outline: 'none', backgroundColor: '#F9FAFB' }}
                />
              </div>

              <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'var(--font-heading)' }}>Shopping Cash (Expenses)</label>
              <div className="relative mb-6">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">৳</span>
                <input
                  type="number" required value={shoppingCash} onChange={e => setShoppingCash(e.target.value)}
                  style={{ width: '100%', padding: '12px 12px 12px 36px', borderRadius: '12px', border: '1.5px solid #E5E7EB', fontSize: '15px', fontWeight: 600, outline: 'none', backgroundColor: '#F9FAFB' }}
                />
              </div>
              
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCloseRegisterModal(false)} className="flex-1 py-3.5 rounded-xl font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3.5 rounded-xl font-bold text-white transition-all active:scale-95" style={{ background: 'linear-gradient(135deg, #111, #333)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>Confirm & Close</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
