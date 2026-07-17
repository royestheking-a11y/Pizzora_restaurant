import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ChefHat, Clock, Bell, CheckCircle, Utensils, RefreshCw, Monitor,
  CookingPot, Receipt, Zap, StickyNote, Wifi, WifiOff, Eye, Printer, X,
  AlertCircle, User, KeyRound, Loader2, Fingerprint, Activity, ChevronRight, BadgeCheck, ShieldCheck, Lock, EyeOff, LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { TableOrderStatus } from '../context/AppContext';

const statusColors: Record<string, { bg: string; border: string; text: string; badge: string; badgeText: string }> = {
  Pending:   { bg: '#ffffff', border: '#E5E7EB', text: '#111827', badge: 'rgba(75,85,99,0.06)', badgeText: '#4B5563' },
  Confirmed: { bg: '#ffffff', border: 'rgba(249,0,43,0.15)', text: '#111827', badge: 'rgba(249,0,43,0.06)', badgeText: '#F9002B' },
  Cooking:   { bg: '#ffffff', border: '#E5E7EB', text: '#111827', badge: 'rgba(75,85,99,0.06)', badgeText: '#4B5563' },
  Ready:     { bg: '#ffffff', border: 'rgba(22,163,74,0.15)', text: '#111827', badge: 'rgba(22,163,74,0.06)', badgeText: '#16A34A' },
};

const activeStatuses: TableOrderStatus[] = ['Pending', 'Confirmed', 'Cooking', 'Ready'];

const statusMeta: Record<string, { Icon: typeof ChefHat; label: string; color: string; nextLabel: string; nextIcon: typeof ChefHat }> = {
  Pending:   { Icon: Clock,       label: 'Pending',   color: '#F9002B', nextLabel: 'Confirm Order',  nextIcon: Zap },
  Confirmed: { Icon: CheckCircle, label: 'Confirmed', color: '#F9002B', nextLabel: 'Start Cooking',  nextIcon: CookingPot },
  Cooking:   { Icon: CookingPot,  label: 'Cooking',   color: '#F9002B', nextLabel: 'Mark Ready',     nextIcon: Bell },
  Ready:     { Icon: Bell,        label: 'Ready',     color: '#16A34A', nextLabel: 'Mark Served',    nextIcon: ChefHat },
};

function ElapsedTimer({ since }: { since: number }) {
  const [elapsed, setElapsed] = useState(Math.floor((Date.now() - since) / 1000));
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - since) / 1000)), 1000);
    return () => clearInterval(id);
  }, [since]);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  const isLate = m >= 20;
  return (
    <span style={{ color: isLate ? '#EF4444' : undefined, fontWeight: isLate ? 700 : undefined }}>
      {m}:{String(s).padStart(2, '0')}
    </span>
  );
}

type KitchenStatus = 'Pending' | 'Confirmed' | 'Cooking' | 'Ready';

interface UnifiedKitchenOrder {
  id: string;
  type: string;
  identifier: string;
  status: KitchenStatus;
  createdAt: number;
  items: { name: string; quantity: number; note?: string; image?: string; itemId?: string; price: number }[];
  isTableOrder: boolean;
  originalStatus: string;
  total: number;
  customerNote?: string;
}

export function KitchenDisplay() {
  const navigate = useNavigate();
  const { state, updateTableOrderStatus, dispatch } = useApp();
  
  // ── Auth ──────────────────────────────────────────────────────────────────
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ── State ─────────────────────────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState<'All' | TableOrderStatus>('All');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isLive, setIsLive] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<UnifiedKitchenOrder | null>(null);

  // Auto-refresh every 5 seconds (the AppContext storage listener handles cross-tab updates)
  useEffect(() => {
    const id = setInterval(() => {
      setLastRefresh(new Date());
    }, 5000);
    return () => clearInterval(id);
  }, []);

  // Blink the live indicator
  useEffect(() => {
    const id = setInterval(() => setIsLive(v => !v), 1500);
    return () => clearInterval(id);
  }, []);

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
        window.location.reload();
      } else {
        setLoginError('Invalid credentials. Please try again.');
        setIsAuthenticating(false);
      }
    } catch (err) {
      setLoginError('Network error. Please try again.');
      setIsAuthenticating(false);
    }
  };

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

        <div className="w-full max-w-[1100px] mx-4 relative z-10 flex flex-col-reverse lg:flex-row min-h-[600px]" 
          style={{ borderRadius: '2.5rem', overflow: 'hidden', backgroundColor: '#ffffff', boxShadow: '0 40px 80px -20px rgba(92,60,16,0.12), 0 0 0 1px rgba(92,60,16,0.04)' }}>

          {/* ── LEFT: Kitchen Identity Panel (Light Warm Slate) ─────────────────────────── */}
          <div className="w-full lg:w-[45%] flex flex-col justify-between relative overflow-hidden p-10 lg:p-14" style={{ backgroundColor: '#FDFCF9', borderRight: '1px solid rgba(139,92,26,0.06)' }}>
            {/* Grid overlay */}
            <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(to right, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

            {/* Top: Brand */}
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', boxShadow: '0 8px 24px rgba(249,0,43,0.25)' }}>
                  <ChefHat size={28} style={{ color: '#fff' }} />
                </div>
                <div>
                  <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '22px', color: '#111827', letterSpacing: '-0.3px' }}>Pizzora</p>
                  <p style={{ fontSize: '11px', color: '#F9002B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px' }}>Kitchen System</p>
                </div>
              </div>

              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6" style={{ background: 'rgba(249,0,43,0.06)', border: '1px solid rgba(249,0,43,0.12)' }}>
                  <div className="w-2 h-2 rounded-full bg-[#F9002B] animate-pulse" />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#F9002B', textTransform: 'uppercase', letterSpacing: '1px' }}>Kitchen Display Access</span>
                </div>
                <p style={{ color: '#4B5563', fontSize: '15px', lineHeight: 1.7, fontFamily: 'var(--font-body)' }}>
                  Real-time order management for your kitchen crew. Built for speed, clarity, and precision.
                </p>
              </div>

              {/* Feature Pills */}
              <div className="space-y-3">
                {[
                  { icon: <Zap size={14} />, label: 'Live Order Feed', sub: 'Instant real-time updates' },
                  { icon: <Bell size={14} />, label: 'Smart Alerts', sub: 'Never miss an order' },
                  { icon: <Monitor size={14} />, label: 'Multi-Display', sub: 'Supports all screen sizes' },
                ].map(({ icon, label, sub }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(249,0,43,0.06)', border: '1px solid rgba(249,0,43,0.12)' }}>
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

            {/* Bottom: Back link — clearly visible */}
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 mt-10 relative z-10 group w-fit px-4 py-2.5 rounded-xl transition-all"
              style={{ color: '#4B5563', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, background: '#F3F4F6', border: '1px solid #E5E7EB', cursor: 'pointer' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#E5E7EB'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F3F4F6'; }}
            >
              <ChevronRight size={14} className="rotate-180" style={{ color: '#4B5563' }} />
              Return to public website
            </button>
          </div>

          {/* ── RIGHT: Login Form (Pure White) ─────────────────────────────────────── */}
          <div className="w-full lg:w-[55%] flex flex-col justify-center p-10 lg:p-14" style={{ backgroundColor: '#ffffff' }}>
            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-8">
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(249,0,43,0.15), transparent)' }} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#F9002B', textTransform: 'uppercase', letterSpacing: '2px', whiteSpace: 'nowrap' }}>Staff Authentication</span>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, rgba(249,0,43,0.15), transparent)' }} />
            </div>

            <div className="mb-8">
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '30px', color: '#111827', letterSpacing: '-0.5px', marginBottom: '8px' }}>
                Kitchen Login
              </h2>
              <p style={{ color: '#6B7280', fontSize: '14px', lineHeight: 1.6 }}>
                Enter your staff credentials to access the kitchen display and manage live orders.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {loginError && (
                <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'rgba(249,0,43,0.05)', border: '1px solid rgba(249,0,43,0.15)' }}>
                  <AlertCircle size={16} style={{ color: '#F9002B', flexShrink: 0 }} />
                  <span style={{ color: '#F9002B', fontSize: '13px', fontWeight: 600 }}>{loginError}</span>
                </div>
              )}

              {/* Username */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Staff ID</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }}>
                    <ChefHat size={17} />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Enter your staff ID"
                    value={loginForm.username}
                    onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))}
                    className="w-full py-4 pl-11 pr-4 text-[15px] outline-none transition-all"
                    style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '14px', color: '#111827', fontFamily: 'var(--font-body)' }}
                    onFocus={e => { e.target.style.border = '1px solid #F9002B'; e.target.style.background = '#ffffff'; e.target.style.boxShadow = '0 0 0 4px rgba(249,0,43,0.08)'; }}
                    onBlur={e => { e.target.style.border = '1px solid #E5E7EB'; e.target.style.background = '#F9FAFB'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Access Code</label>
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
                className="w-full py-4 rounded-2xl font-bold transition-all active:scale-[0.98] flex justify-center items-center gap-2 relative overflow-hidden mt-2 disabled:opacity-75 disabled:cursor-wait text-white"
                style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', boxShadow: '0 8px 24px rgba(249,0,43,0.2)', cursor: isAuthenticating ? 'wait' : 'pointer' }}
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Fingerprint size={18} />
                    Enter Kitchen Display
                  </>
                )}
              </button>

              {/* Status footer */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>System Online</span>
                </div>
                <span style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 500 }}>Kitchen v2.0</span>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    sessionStorage.removeItem('pizzora_token');
    sessionStorage.removeItem('pizzora_admin_logged_in');
    dispatch({ type: 'ADMIN_LOGOUT' });
    window.location.reload();
  };

  const allUnifiedOrders: UnifiedKitchenOrder[] = [
    ...(state.tableOrders ?? []).map(o => ({
      id: o.id,
      type: 'Dine-In',
      identifier: `Table ${o.tableNumber}`,
      status: (o.status === 'Served' || o.status === 'Paid' || (o.status as any) === 'Cancelled') ? null : (o.status as KitchenStatus),
      createdAt: new Date(o.createdAt || Date.now()).getTime(),
      items: o.items.map((i: any) => ({ ...i, itemId: i.itemId || String(Math.random()) })),
      isTableOrder: true,
      originalStatus: o.status,
      total: o.total || 0,
      customerNote: (o as any).customerNote
    })).filter(o => o.status !== null) as UnifiedKitchenOrder[],
    ...(state.orders ?? []).map(o => {
      let mappedStatus: KitchenStatus | null = null;
      if (o.status === 'Pending') mappedStatus = 'Pending';
      else if (o.status === 'Preparing') mappedStatus = 'Cooking';
      else if (o.status === 'Out for Delivery' || o.status === 'Delivered') mappedStatus = null; // hide finished POS orders from kitchen unless they are ready, but wait, POS goes to Out for Delivery

      return mappedStatus ? {
        id: o.id,
        type: o.orderNumber ? 'POS / Online' : 'POS',
        identifier: `Order #${o.orderNumber || o.id.slice(-6).toUpperCase()}`,
        status: mappedStatus,
        createdAt: new Date(o.createdAt || Date.now()).getTime(),
        items: o.items.map((i: any) => ({ name: i.item?.name || 'Item', quantity: i.quantity, note: i.specialRequest, image: i.item?.image, itemId: i.item?.id || String(Math.random()), price: i.item?.price || 0 })),
        isTableOrder: false,
        originalStatus: o.status,
        total: o.total || 0,
        customerNote: (o as any).customerNote
      } : null;
    }).filter(Boolean) as UnifiedKitchenOrder[]
  ];

  const orders = allUnifiedOrders
    .filter(o => activeStatuses.includes(o.status as any))
    .filter(o => filterStatus === 'All' || o.status === filterStatus)
    .sort((a, b) => a.createdAt - b.createdAt); // oldest first

  const counts = {
    Pending:   allUnifiedOrders.filter(o => o.status === 'Pending').length,
    Confirmed: allUnifiedOrders.filter(o => o.status === 'Confirmed').length,
    Cooking:   allUnifiedOrders.filter(o => o.status === 'Cooking').length,
    Ready:     allUnifiedOrders.filter(o => o.status === 'Ready').length,
  };

  const nextStatus: Partial<Record<TableOrderStatus, TableOrderStatus>> = {
    Pending:   'Confirmed',
    Confirmed: 'Cooking',
    Cooking:   'Ready',
    Ready:     'Served',
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8EFDC', backgroundImage: 'linear-gradient(135deg, #FDFBF7 0%, #F8EFDC 100%)' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 sm:px-6 py-4"
        style={{ backgroundColor: '#ffffff', borderBottom: '1px solid rgba(139,92,26,0.08)', boxShadow: '0 4px 20px rgba(92,60,16,0.03)' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', boxShadow: '0 4px 12px rgba(249,0,43,0.2)' }}>
              <ChefHat size={20} style={{ color: '#fff' }} />
            </div>
            <div className="min-w-0">
              <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '18px', color: '#111827', lineHeight: 1 }}>
                Kitchen Display
              </h1>
              <p style={{ color: '#F9002B', fontSize: '11px', fontFamily: 'var(--font-heading)', fontWeight: 600, letterSpacing: '1px' }}>
                Pizzora Restaurant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Live indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="flex items-center gap-1.5">
                {isLive ? (
                  <Wifi size={12} style={{ color: '#16A34A' }} />
                ) : (
                  <WifiOff size={12} style={{ color: '#6B7280' }} />
                )}
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isLive ? '#16A34A' : '#6B7280', transition: 'background-color 0.3s' }} />
              </div>
              <span style={{ color: '#4B5563', fontSize: '11px', fontFamily: 'var(--font-heading)' }}>
                {lastRefresh.toLocaleTimeString()}
              </span>
            </div>

            {/* Manual refresh */}
            <button
              onClick={() => setLastRefresh(new Date())}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:rotate-180"
              style={{ background: 'rgba(249,0,43,0.06)', border: '1px solid rgba(249,0,43,0.12)', transition: 'all 0.3s', cursor: 'pointer' }}
              title="Refresh Orders"
            >
              <RefreshCw size={15} style={{ color: '#F9002B' }} />
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105"
              style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', transition: 'all 0.3s', cursor: 'pointer' }}
              title="Logout"
            >
              <LogOut size={15} style={{ color: '#4B5563' }} />
            </button>

            {/* Screen mode hint */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)' }}>
              <Monitor size={12} style={{ color: '#6B7280' }} />
              <span style={{ color: '#6B7280', fontSize: '10px', fontFamily: 'var(--font-heading)' }}>Kitchen Screen</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar / Filter */}
      <div className="px-4 sm:px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['Pending', 'Confirmed', 'Cooking', 'Ready'] as const).map(status => {
          const meta = statusMeta[status];
          const count = counts[status];
          const isActive = filterStatus === status;
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(filterStatus === status ? 'All' : status)}
              className="flex items-center gap-3 p-3 sm:p-4 rounded-2xl transition-all"
              style={{
                backgroundColor: isActive ? 'rgba(249,0,43,0.08)' : '#ffffff',
                border: `1px solid ${isActive ? '#F9002B' : 'rgba(139,92,26,0.08)'}`,
                boxShadow: isActive ? '0 10px 20px -5px rgba(249,0,43,0.1)' : '0 4px 12px rgba(92,60,16,0.02)',
                cursor: 'pointer'
              }}
            >
              <div
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: isActive ? 'rgba(249,0,43,0.12)' : 'rgba(249,0,43,0.05)' }}
              >
                <meta.Icon size={17} style={{ color: meta.color }} />
              </div>
              <div className="text-left">
                <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '22px', color: '#111827', lineHeight: 1 }}>{count}</p>
                <p style={{ fontSize: '10px', color: '#4B5563', fontFamily: 'var(--font-heading)', fontWeight: 600, marginTop: '2px' }}>{status}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Orders Grid */}
      <div className="px-4 sm:px-6 pb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {state.isInitialLoading ? (
          <>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-2xl overflow-hidden flex flex-col h-[300px] animate-pulse bg-white" style={{ border: '1px solid #E5E7EB' }}>
                <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gray-100" />
                    <div>
                      <div className="h-4 w-20 rounded mb-1 bg-gray-200" />
                      <div className="h-3 w-12 rounded bg-gray-100" />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="h-4 w-16 rounded-full bg-gray-100" />
                    <div className="h-3 w-12 rounded bg-gray-100" />
                  </div>
                </div>
                <div className="flex-1 px-4 py-3 space-y-3">
                  {[1, 2, 3].map(j => (
                    <div key={j} className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gray-100" />
                      <div className="flex-1 space-y-1.5 mt-1">
                        <div className="flex justify-between">
                          <div className="h-3 w-3/4 rounded bg-gray-200" />
                          <div className="h-3 w-4 rounded bg-gray-200" />
                        </div>
                        <div className="h-2 w-1/2 rounded bg-gray-100" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3">
                  <div className="h-10 rounded-xl w-full bg-gray-100" />
                </div>
              </div>
            ))}
          </>
        ) : orders.length === 0 ? (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(249,0,43,0.05)', border: '1px solid rgba(249,0,43,0.1)' }}>
              <CheckCircle size={32} style={{ color: '#F9002B' }} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 850, fontSize: '20px', color: '#111827', marginBottom: '8px' }}>
              No Active Orders
            </h3>
            <p style={{ color: '#4B5563', fontSize: '13px' }}>
              The kitchen is fully caught up. Great job!
            </p>
          </div>
        ) : (
          orders.map(order => {
            const cfg = statusColors[order.status] || statusColors.Pending;
            const meta = statusMeta[order.status];
            const next = nextStatus[order.status];
            const minutesOld = Math.floor((Date.now() - order.createdAt) / 60000);
            const isUrgent = minutesOld >= 15;
            const NextIcon = meta?.nextIcon || ChefHat;

            return (
              <div
                key={order.id}
                className="rounded-2xl overflow-hidden flex flex-col"
                style={{
                  backgroundColor: '#ffffff',
                  border: isUrgent ? '2px solid #EF4444' : `1px solid ${cfg.border}`,
                  boxShadow: isUrgent
                    ? '0 12px 30px rgba(239,68,68,0.2)'
                    : '0 8px 24px -6px rgba(92,60,16,0.06), 0 0 0 1px rgba(92,60,16,0.02)',
                  transition: 'box-shadow 0.3s',
                }}
              >
                {/* Urgent banner */}
                {isUrgent && (
                  <div className="px-4 py-1.5 flex items-center gap-2" style={{ backgroundColor: '#EF4444' }}>
                    <Zap size={11} style={{ color: '#fff' }} />
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-heading)', letterSpacing: '0.5px' }}>
                      URGENT — {minutesOld}min waiting
                    </span>
                  </div>
                )}

                {/* Card header */}
                <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)' }}
                    >
                      <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '11px', color: '#fff', textTransform: 'uppercase' }}>
                        {order.isTableOrder ? 'T' + order.identifier.split(' ')[1] : 'POS'}
                      </span>
                    </div>
                    <div>
                      <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '15px', color: '#111827' }}>
                        {order.identifier}
                      </p>
                      <p style={{ fontSize: '11px', color: '#6B7280' }}>
                        <span className="font-semibold text-gray-700 mr-1 bg-gray-100 px-1.5 py-0.5 rounded">{order.type}</span>
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1.5 justify-end mb-1">
                      <div
                        className="px-2.5 py-1 rounded-full flex items-center gap-1"
                        style={{ backgroundColor: cfg.badge }}
                      >
                        {meta && <meta.Icon size={10} style={{ color: cfg.badgeText }} />}
                        <span style={{ fontSize: '11px', fontWeight: 700, color: cfg.badgeText, fontFamily: 'var(--font-heading)' }}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 justify-end">
                      <Clock size={10} style={{ color: isUrgent ? '#EF4444' : '#4B5563' }} />
                      <span style={{ fontSize: '11px', color: isUrgent ? '#EF4444' : '#4B5563', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                        <ElapsedTimer since={order.createdAt} />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="flex-1 px-4 py-3 space-y-2.5 bg-[#FCFCFA]">
                  {order.items.map(item => (
                    <div key={item.itemId} className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <p className="truncate" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '13px', color: '#111827', lineHeight: 1.3 }}>
                            {item.name}
                          </p>
                          <span
                            className="flex-shrink-0 px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: 'rgba(249,0,43,0.06)', color: '#F9002B', fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '12px' }}
                          >
                            ×{item.quantity}
                          </span>
                        </div>
                        {item.note && (
                          <p className="flex items-center gap-1 mt-0.5 truncate" style={{ fontSize: '10px', color: '#EA580C' }}>
                            <StickyNote size={9} /> {item.note}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {order.customerNote && (
                    <div className="flex items-start gap-2 mt-1 px-3 py-2 rounded-xl" style={{ backgroundColor: 'rgba(249,0,43,0.05)', border: '1px solid rgba(249,0,43,0.1)' }}>
                      <StickyNote size={12} style={{ color: '#F9002B', flexShrink: 0, marginTop: '1px' }} />
                      <p style={{ fontSize: '11px', color: '#F9002B', fontFamily: 'var(--font-body)', lineHeight: 1.4 }}>
                        {order.customerNote}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 space-y-2 bg-[#ffffff]" style={{ borderTop: '1px solid #E5E7EB' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '12px', color: '#4B5563' }}>Total</span>
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '16px', color: '#F9002B' }}>৳{order.total}</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="flex-1 py-2.5 rounded-xl font-semibold transition-all hover:bg-gray-50 flex items-center justify-center gap-2"
                      style={{ border: '1px solid #E5E7EB', color: '#4B5563', fontFamily: 'var(--font-heading)', fontSize: '12px', cursor: 'pointer' }}
                    >
                      <Eye size={13} /> Details
                    </button>
                    {next && (
                      <button
                        onClick={() => {
                          if (order.isTableOrder) {
                            updateTableOrderStatus(order.id, next as TableOrderStatus);
                          } else {
                            const nextOrderStatus = next === 'Cooking' ? 'Preparing' : (next === 'Ready' ? 'Out for Delivery' : next);
                            dispatch({ type: 'UPDATE_ORDER_STATUS', payload: { id: order.id, status: nextOrderStatus as any } });
                          }
                        }}
                        className="flex-1 py-2.5 rounded-xl font-semibold text-white transition-all active:scale-95 hover:opacity-90 flex items-center justify-center gap-2"
                        style={{
                          background:
                            order.status === 'Pending'   ? 'linear-gradient(135deg, #16A34A, #15803D)' :
                            order.status === 'Confirmed' ? 'linear-gradient(135deg, #EA580C, #C2410C)' :
                            order.status === 'Cooking'   ? 'linear-gradient(135deg, #7C3AED, #6D28D9)' :
                                                           'linear-gradient(135deg, #F9002B, #C8001F)',
                          fontFamily: 'var(--font-heading)',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        <NextIcon size={13} />
                        {meta?.nextLabel}
                      </button>
                    )}
                  </div>

                  {order.status === 'Ready' && (
                    <button
                      onClick={() => updateTableOrderStatus(order.id, 'Paid')}
                      className="w-full mt-2 py-2 rounded-xl font-semibold transition-all active:scale-95 flex items-center justify-center gap-2 hover:bg-gray-50"
                      style={{ backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB', color: '#4B5563', fontFamily: 'var(--font-heading)', fontSize: '12px', cursor: 'pointer' }}
                    >
                      <Receipt size={12} /> Mark Paid
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedOrder && <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
    </div>
  );
}

// ─── Order Details / Invoice Modal ───────────────────────────────────────────
function OrderDetailsModal({ order, onClose }: { order: UnifiedKitchenOrder; onClose: () => void }) {
  const { updateTableOrderStatus, dispatch } = useApp();

  if (!order) return null;
  const date = new Date(order.createdAt);
  const meta = statusMeta[order.status];

  const nextStatus: Partial<Record<TableOrderStatus, TableOrderStatus>> = {
    Pending:   'Confirmed',
    Confirmed: 'Cooking',
    Cooking:   'Ready',
    Ready:     'Served',
  };
  const next = nextStatus[order.status];
  const NextIcon = meta?.nextIcon || ChefHat;

  const statusGradient =
    order.status === 'Pending'   ? 'linear-gradient(135deg,#F59E0B,#D97706)' :
    order.status === 'Confirmed' ? 'linear-gradient(135deg,#3B82F6,#2563EB)' :
    order.status === 'Cooking'   ? 'linear-gradient(135deg,#EA580C,#C2410C)' :
    order.status === 'Ready'     ? 'linear-gradient(135deg,#16A34A,#15803D)' :
                                   'linear-gradient(135deg,#6B7280,#4B5563)';

  const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const orderNum = (order.id.split('-')[1] || order.id.slice(-8)).toUpperCase();

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #kot-print-area, #kot-print-area * { visibility: visible !important; }
          #kot-print-area {
            position: fixed !important;
            left: 0 !important; top: 0 !important;
            width: 80mm !important;
            background: #fff !important;
            color: #000 !important;
            padding: 6mm !important;
            font-family: 'Courier New', Courier, monospace !important;
          }
          #kot-print-area * {
            color: #000 !important;
            background: transparent !important;
            border-color: #000 !important;
          }
          .kot-no-print { display: none !important; }
          @page { margin: 0; size: 80mm auto; }
        }
      `}</style>
      {createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(10,0,0,0.4)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
          <div
            className="w-full max-w-[440px] flex flex-col max-h-[92vh] relative"
            style={{ borderRadius: '24px', overflow: 'hidden', boxShadow: '0 30px 60px -10px rgba(92,60,16,0.15), 0 0 0 1px rgba(92,60,16,0.04)', background: '#ffffff' }}
          >
            {/* ── Header Bar (Screen only) ─────────────────── */}
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0 kot-no-print" style={{ backgroundColor: '#ffffff', borderBottom: '1px solid rgba(139,92,26,0.08)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#F9002B,#C8001F)', boxShadow: '0 4px 12px rgba(249,0,43,0.2)' }}>
                  <ChefHat size={20} style={{ color: '#fff' }} />
                </div>
                <div>
                  <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '16px', color: '#111827' }}>Kitchen Order Ticket</p>
                  <p style={{ fontSize: '11px', color: '#6B7280', marginTop: '1px' }}>{order.identifier} · {order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-gray-100" style={{ border: '1px solid #E5E7EB', background: 'none', cursor: 'pointer' }}>
                <X size={15} style={{ color: '#4B5563' }} />
              </button>
            </div>

            {/* ── Scrollable Content: Screen Preview + Print Area ── */}
            <div className="overflow-y-auto flex-1">

              {/* SCREEN UI: premium light preview */}
              <div className="kot-no-print">
                {/* Brand header */}
                <div className="px-7 pt-6 pb-5" style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '20px', color: '#111827', letterSpacing: '-0.3px' }}>Pizzora Restaurant</p>
                      <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>Subidbazar, Mitali Complex, Sylhet</p>
                    </div>
                    <div className="px-3 py-1.5 rounded-full flex items-center gap-1.5" style={{ background: statusGradient }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-white opacity-80" />
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{order.status}</span>
                    </div>
                  </div>
                </div>

                {/* Meta grid */}
                <div className="grid grid-cols-2 gap-px mx-6 my-5 rounded-2xl overflow-hidden" style={{ border: '1px solid #E5E7EB', background: '#E5E7EB' }}>
                  {[
                    { label: 'Order ID', value: `#${orderNum}` },
                    { label: order.isTableOrder ? 'Table' : 'Order', value: order.identifier },
                    { label: 'Time', value: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) },
                    { label: 'Date', value: date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-4 py-3" style={{ background: '#FDFCF9' }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>{label}</p>
                      <p style={{ fontSize: '13px', fontWeight: 700, color: '#111827', fontFamily: 'var(--font-heading)' }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Items */}
                <div className="px-6 mb-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1" style={{ background: '#E5E7EB' }} />
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Order Items</span>
                    <div className="h-px flex-1" style={{ background: '#E5E7EB' }} />
                  </div>
                  <div className="space-y-3">
                    {order.items.map((item, idx) => (
                      <div key={item.itemId} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#FDFCF9', border: '1px solid #E5E7EB' }}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(249,0,43,0.06)', border: '1px solid rgba(249,0,43,0.15)' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#F9002B' }}>{idx + 1}</span>
                        </div>
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '14px', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</p>
                          {item.note && <p className="flex items-center gap-1 mt-0.5" style={{ fontSize: '11px', color: '#EA580C' }}><StickyNote size={10} style={{ flexShrink: 0 }} /> {item.note}</p>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg" style={{ background: 'rgba(249,0,43,0.06)', border: '1px solid rgba(249,0,43,0.15)' }}>
                            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '13px', color: '#F9002B' }}>×{item.quantity}</span>
                          </div>
                          <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '3px' }}>৳{item.price * item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Customer Note */}
                {order.customerNote && (
                  <div className="mx-6 mb-5 p-4 rounded-xl" style={{ background: '#FCF4F4', border: '1px solid #FCA5A5' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <StickyNote size={13} style={{ color: '#C8001F', flexShrink: 0 }} />
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#C8001F', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Customer Note</span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#C8001F', lineHeight: 1.5 }}>{order.customerNote}</p>
                  </div>
                )}

                {/* Total */}
                <div className="mx-6 mb-6">
                  <div className="flex items-center justify-between p-4 rounded-2xl" style={{ background: '#FCFAF6', border: '1px solid #E5E7EB' }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px', color: '#4B5563' }}>Order Total</span>
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '28px', color: '#F9002B', letterSpacing: '-0.5px' }}>৳{order.total}</span>
                  </div>
                </div>
              </div>

              {/* PRINT RECEIPT: Thermal receipt layout (hidden on screen) */}
              <div id="kot-print-area" style={{ display: 'none', fontFamily: "'Courier New', Courier, monospace", color: '#000', background: '#fff', padding: '8px', width: '100%' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '4px', textTransform: 'uppercase', fontFamily: 'Arial, sans-serif' }}>PIZZORA</div>
                  <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>Authentic Pizza &amp; Dining Experience</div>
                  <div style={{ fontSize: '11px', marginTop: '2px' }}>📞 +8801620026649</div>
                  <div style={{ fontSize: '11px' }}>🌐 pizzora.bd</div>
                </div>

                <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

                {/* Order type badge */}
                <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', border: '1px solid #000', padding: '2px 8px', display: 'inline-block' }}>
                    {order.type.toUpperCase()} ORDER
                  </span>
                </div>

                {/* Order meta */}
                <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Order #</span><span style={{ fontWeight: 700 }}>{orderNum}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Date</span><span style={{ color: '#B8860B' }}>{date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}, {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Type</span><span style={{ fontWeight: 700 }}>{order.type}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Payment</span><span>At Table</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Status</span><span style={{ fontWeight: 700 }}>{order.status}</span></div>
                </div>

                <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

                {/* Column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 55px 55px', fontSize: '11px', fontWeight: 700, marginBottom: '4px', borderBottom: '1px solid #000', paddingBottom: '3px' }}>
                  <span>ITEM</span><span style={{ textAlign: 'center' }}>QTY</span><span style={{ textAlign: 'right' }}>PRICE</span><span style={{ textAlign: 'right' }}>TOTAL</span>
                </div>

                {/* Items */}
                {order.items.map(item => (
                  <div key={item.itemId} style={{ marginBottom: '6px', fontSize: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 55px 55px' }}>
                      <span style={{ color: '#008080', fontWeight: 600, wordBreak: 'break-word' }}>{item.name}</span>
                      <span style={{ textAlign: 'center' }}>x{item.quantity}</span>
                      <span style={{ textAlign: 'right' }}>৳{item.price}</span>
                      <span style={{ textAlign: 'right', fontWeight: 700 }}>৳{item.price * item.quantity}</span>
                    </div>
                    {item.note && <div style={{ fontSize: '10px', color: '#666', paddingLeft: '2px' }}>Note: {item.note}</div>}
                  </div>
                ))}

                {order.customerNote && (
                  <div style={{ fontSize: '11px', fontStyle: 'italic', color: '#666', marginBottom: '4px' }}>
                    Note: {order.customerNote}
                  </div>
                )}

                <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

                {/* Subtotal / Total */}
                <div style={{ fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#555' }}>Subtotal</span>
                    <span>৳{subtotal}</span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #000', marginTop: '4px', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 900 }}>
                  <span>TOTAL</span>
                  <span>৳{order.total}</span>
                </div>

                <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

                {/* Footer */}
                <div style={{ textAlign: 'center', fontSize: '11px', lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 700 }}>*** Thank you for choosing Pizzora! ***</div>
                  <div>Please come again!</div>
                  <div style={{ marginTop: '4px', color: '#555' }}>Status: <span style={{ fontWeight: 700, color: '#B8860B' }}>{order.status}</span></div>
                  <div style={{ color: '#555' }}>pizzora.bd</div>
                </div>
              </div>

            </div>

            {/* ── Footer Actions (Screen only) ─────────────── */}
            <div className="flex gap-3 p-5 flex-shrink-0 kot-no-print" style={{ borderTop: '1px solid #E5E7EB', backgroundColor: '#FDFCF9' }}>
              <button
                onClick={() => {
                  // Show print area and hide screen UI before printing
                  const printArea = document.getElementById('kot-print-area');
                  if (printArea) printArea.style.display = 'block';
                  window.print();
                  if (printArea) printArea.style.display = 'none';
                }}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all hover:bg-gray-100 flex-1"
                style={{ border: '1px solid #E5E7EB', color: '#4B5563', fontFamily: 'var(--font-heading)', fontSize: '13px', background: '#ffffff', cursor: 'pointer' }}
              >
                <Printer size={15} /> Print KOT
              </button>

              {next && (
                <button
                  onClick={() => {
                    if (order.isTableOrder) {
                      updateTableOrderStatus(order.id, next as TableOrderStatus);
                    } else {
                      const nextOrderStatus = next === 'Cooking' ? 'Preparing' : (next === 'Ready' ? 'Out for Delivery' : next);
                      dispatch({ type: 'UPDATE_ORDER_STATUS', payload: { id: order.id, status: nextOrderStatus as any } });
                    }
                    onClose();
                  }}
                  className="flex-1 px-4 py-3 rounded-xl font-semibold text-white transition-all active:scale-95 flex items-center justify-center gap-2 hover:brightness-110"
                  style={{
                    background:
                      order.status === 'Pending'   ? 'linear-gradient(135deg,#16A34A,#15803D)' :
                      order.status === 'Confirmed' ? 'linear-gradient(135deg,#EA580C,#C2410C)' :
                      order.status === 'Cooking'   ? 'linear-gradient(135deg,#7C3AED,#6D28D9)' :
                                                     'linear-gradient(135deg,#F9002B,#C8001F)',
                    fontFamily: 'var(--font-heading)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(249,0,43,0.15)',
                  }}
                >
                  <NextIcon size={15} />
                  {meta?.nextLabel}
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
