import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router';
import { optimizeCloudinaryUrl } from '../utils/image';
import {
  CheckCircle, ChefHat, Bell, Utensils, FileText,
  Star, Clock, Search, ShoppingCart, Plus, Minus,
  Trash2, ChevronDown, ChevronUp, X, Eye, Users
} from 'lucide-react';
import { useApp, SOCKET_URL } from '../context/AppContext';
import type { TableOrder as TableOrderData } from '../context/AppContext';

const spiceColors: Record<string, string> = {
  Mild: '#16A34A',
  Medium: '#D97706',
  Hot: '#DC2626',
  'Extra Hot': '#7C3AED',
};

// ─── Status config ────────────────────────────────────────────────────────────
const statusConfig = {
  Pending:   { label: 'Order Received',  icon: CheckCircle, color: '#2563EB', bg: '#DBEAFE', step: 0 },
  Confirmed: { label: 'Confirmed',       icon: CheckCircle, color: '#7C3AED', bg: '#EDE9FE', step: 1 },
  Cooking:   { label: 'Cooking',         icon: ChefHat,     color: '#EA580C', bg: '#FEF3C7', step: 2 },
  Ready:     { label: 'Ready to Serve',  icon: Bell,        color: '#16A34A', bg: '#DCFCE7', step: 3 },
  Served:    { label: 'Served',          icon: Utensils,    color: '#6B7280', bg: '#F3F4F6', step: 4 },
  Paid:      { label: 'Paid',            icon: FileText,    color: '#6B7280', bg: '#F3F4F6', step: 5 },
};

const cookingStages = [
  { key: 'Pending',   label: 'Order Received', icon: CheckCircle, desc: 'Your order has been received!' },
  { key: 'Confirmed', label: 'Confirmed',      icon: CheckCircle, desc: 'Staff confirmed your order' },
  { key: 'Cooking',   label: 'Cooking',        icon: ChefHat,     desc: 'Our chef is preparing your food' },
  { key: 'Ready',     label: 'Ready!',         icon: Bell,        desc: 'Food is ready to be served' },
];

interface LocalCartItem {
  item: {
    id: string;
    name: string;
    price: number;
    image: string;
    category: string;
    description: string;
    rating: number;
    spiceLevel: string;
    isVeg: boolean;
  };
  quantity: number;
  note: string;
}

function StarRating({ rating, size = 11 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} fill={i <= Math.floor(rating) ? '#F59E0B' : 'none'}
          color={i <= Math.floor(rating) ? '#F59E0B' : '#D1D5DB'} />
      ))}
    </div>
  );
}

// ─── Elapsed Timer ────────────────────────────────────────────────────────────
function ElapsedTimer({ since }: { since: number }) {
  const [elapsed, setElapsed] = useState(Math.floor((Date.now() - since) / 1000));
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - since) / 1000)), 1000);
    return () => clearInterval(id);
  }, [since]);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return <span>{m}:{String(s).padStart(2, '0')}</span>;
}

export function TableOrder() {
  const { tableId } = useParams<{ tableId: string }>();
  const { state, placeTableOrder, dispatch } = useApp();

  const table = state.tables.find(t => t.id === tableId);
  const activeOrder = state.tableOrders.find(
    o => o.tableId === tableId && !['Served', 'Paid'].includes(o.status)
  );

  // Smart Polling: Fetch active order status every 5 seconds
  useEffect(() => {
    if (!activeOrder) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`${SOCKET_URL}/api/tableOrders/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderIds: [activeOrder.id] })
        });
        const data = await res.json();
        if (data.success && data.statuses && data.statuses.length > 0) {
          const newStatus = data.statuses[0].status;
          if (newStatus !== activeOrder.status) {
            dispatch({ type: 'SYNC_TABLE_ORDER_STATUSES', payload: data.statuses });
          }
        }
      } catch (err) {
        console.error('Failed to poll table order status', err);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [activeOrder, dispatch]);

  // Local cart
  const [cart, setCart] = useState<LocalCartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [customerNote, setCustomerNote] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [selectedItem, setSelectedItem] = useState<typeof state.menuItems[0] | null>(null);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(state.menuItems.map(i => i.category)));
    return ['All', ...cats];
  }, [state.menuItems]);

  const filtered = useMemo(() => {
    let items = [...state.menuItems];
    if (activeCategory !== 'All') items = items.filter(i => i.category === activeCategory);
    if (search) items = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
    return items;
  }, [state.menuItems, activeCategory, search]);

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => s + i.item.price * i.quantity, 0);

  const addToLocalCart = useCallback((item: typeof filtered[0]) => {
    setCart(prev => {
      const ex = prev.find(c => c.item.id === item.id);
      if (ex) return prev.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, {
        item: { id: item.id, name: item.name, price: item.price, image: item.image, category: item.category, description: item.description, rating: item.rating, spiceLevel: item.spiceLevel, isVeg: item.isVeg },
        quantity: 1,
        note: '',
      }];
    });
  }, []);

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(c => c.item.id !== id));
    } else {
      setCart(prev => prev.map(c => c.item.id === id ? { ...c, quantity: qty } : c));
    }
  };

  const updateNote = (id: string, note: string) => {
    setCart(prev => prev.map(c => c.item.id === id ? { ...c, note } : c));
  };

  const handlePlaceOrder = () => {
    if (cart.length === 0 || !table) return;
    const orderId = `TBL-${Date.now()}`;
    const order: TableOrderData = {
      id: orderId,
      tableId: table.id,
      tableNumber: table.tableNumber,
      items: cart.map(c => ({
        itemId: c.item.id,
        name: c.item.name,
        price: c.item.price,
        quantity: c.quantity,
        note: c.note,
        image: c.item.image,
      })),
      total: cartTotal,
      status: 'Pending',
      createdAt: Date.now(),
      customerNote,
    };
    placeTableOrder(order);

    // Save purchased item IDs for review eligibility
    try {
      const purchasedIds = cart.map(c => c.item.id);
      const stored = JSON.parse(localStorage.getItem('pizzora_purchased_items') || '[]');
      const updated = Array.from(new Set([...stored, ...purchasedIds]));
      localStorage.setItem('pizzora_purchased_items', JSON.stringify(updated));
    } catch (e) {}
    setCart([]);
    setCartOpen(false);
    setOrderPlaced(true);
  };

  // Track live status for animation triggers
  const [liveStatus, setLiveStatus] = useState<string>('');
  useEffect(() => {
    if (activeOrder) setLiveStatus(activeOrder.status);
  }, [activeOrder]);

  // The AppContext storage event listener (added in AppContext.tsx) handles
  // cross-tab sync automatically, so this component will re-render whenever
  // the Admin or Kitchen Display updates the order status.

  // After order placed, re-read from context
  const placedOrder = state.tableOrders.find(
    o => o.tableId === tableId && !['Paid'].includes(o.status)
  );
  const currentStage = placedOrder ? statusConfig[placedOrder.status as keyof typeof statusConfig] : null;

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (state.isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1A0000, #C8001F)' }}>
        <div className="text-center text-white px-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px', fontFamily: 'var(--font-heading)' }}>Loading table details...</p>
        </div>
      </div>
    );
  }

  // ── Table not found ──────────────────────────────────────────────────────────
  if (!table) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1A0000, #C8001F)' }}>
        <div className="text-center text-white px-6">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(249,0,43,0.12)', border: '2px solid rgba(249,0,43,0.2)' }}>
            <Utensils size={40} style={{ color: 'rgba(249,0,43,0.6)' }} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '26px', fontWeight: 800, marginBottom: '12px' }}>Table Not Found</h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '15px', lineHeight: 1.6, maxWidth: '280px', margin: '0 auto' }}>This QR code is not linked to a valid table. Please ask staff for assistance.</p>
        </div>
      </div>
    );
  }

  // ── Confirmation / Order tracking screen ─────────────────────────────────────
  if (orderPlaced || placedOrder) {
    const order = placedOrder;
    const stepIndex = order ? (statusConfig[order.status as keyof typeof statusConfig]?.step ?? 0) : 0;

    if (order && order.status === 'Served') {
      return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(160deg, #0A0A0A 0%, #1A1A1A 100%)' }}>
          <div className="text-center max-w-sm mx-auto" style={{ animation: 'fadeUp 0.5s ease' }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl" style={{ background: 'rgba(22, 163, 74, 0.1)', border: '2px solid rgba(22, 163, 74, 0.2)' }}>
              <CheckCircle size={36} style={{ color: '#16A34A' }} />
            </div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '24px', color: '#fff', marginBottom: '12px' }}>Enjoy your food!</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', lineHeight: 1.5, marginBottom: '32px' }}>Your order has been served to your table. We hope you love it! Please consider leaving a review for the items you ordered.</p>
            <Link to="/menu" className="block w-full py-3.5 rounded-xl text-sm font-bold transition-all text-white shadow-xl hover:brightness-110" style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)' }}>
              View Menu & Review
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #0A0A0A 0%, #1A1A1A 100%)' }}>
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3">
            <div>
              <p style={{ color: '#fff', fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '14px', lineHeight: 1 }}>Pizzora</p>
              <p style={{ color: '#F9002B', fontSize: '10px', fontFamily: 'var(--font-heading)', fontWeight: 600, letterSpacing: '1px' }}>TABLE {table.tableNumber}</p>
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-full" style={{ background: 'rgba(249,0,43,0.15)', border: '1px solid rgba(249,0,43,0.3)' }}>
            <span style={{ color: '#F9002B', fontSize: '12px', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>{table.area} Area</span>
          </div>
        </div>

        <div className="max-w-md mx-auto px-5 py-8">
          {/* Thank you banner */}
          <div className="text-center mb-8">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)' }}
            >
              <ChefHat size={36} style={{ color: '#1A0000' }} />
            </div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '26px', color: '#fff', marginBottom: '8px' }}>
              Thank you for your order!
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
              Our kitchen is working on your order. Sit back & relax!
            </p>
            {order && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <Clock size={13} style={{ color: '#F9002B' }} />
                <span style={{ color: '#F9002B', fontSize: '13px', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                  Elapsed: <ElapsedTimer since={order.createdAt} />
                </span>
              </div>
            )}
          </div>

          {/* Cooking Progress */}
          <div className="p-5 rounded-2xl mb-5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontFamily: 'var(--font-heading)', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '16px' }}>Order Progress</p>
            <div className="space-y-4">
              {cookingStages.map((stage, idx) => {
                const Icon = stage.icon;
                const isActive = idx === stepIndex;
                const isDone = idx < stepIndex;
                return (
                  <div key={stage.key} className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500"
                      style={{
                        background: isDone ? 'linear-gradient(135deg, #16A34A, #15803D)' : isActive ? 'linear-gradient(135deg, #F9002B, #C8001F)' : 'rgba(255,255,255,0.08)',
                        border: isActive ? '2px solid rgba(249,0,43,0.5)' : '2px solid transparent',
                        boxShadow: isActive ? '0 0 20px rgba(249,0,43,0.4)' : 'none',
                      }}
                    >
                      <Icon size={18} style={{ color: isDone || isActive ? (isDone ? '#fff' : '#1A0000') : 'rgba(255,255,255,0.3)' }} />
                    </div>
                    <div className="flex-1">
                      <p style={{
                        fontFamily: 'var(--font-heading)',
                        fontWeight: 700,
                        fontSize: '14px',
                        color: isDone ? '#86EFAC' : isActive ? '#F9002B' : 'rgba(255,255,255,0.35)',
                        transition: 'color 0.5s',
                      }}>
                        {stage.label}
                        {isActive && (
                          <span style={{ fontSize: '11px', marginLeft: '8px', opacity: 0.8 }}>← Current</span>
                        )}
                      </p>
                      {isActive && (
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{stage.desc}</p>
                      )}
                    </div>
                    {isDone && (
                      <CheckCircle size={16} style={{ color: '#86EFAC', flexShrink: 0 }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order summary */}
          {order && (
            <div className="p-5 rounded-2xl mb-5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontFamily: 'var(--font-heading)', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '14px' }}>Your Order</p>
              <div className="space-y-3">
                {order.items.map(item => (
                  <div key={item.itemId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={item.image} alt={item.name} className="w-10 h-10 rounded-xl object-cover" />
                      <div>
                        <p style={{ color: '#fff', fontSize: '13px', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{item.name}</p>
                        {item.note && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{item.note}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p style={{ color: '#F9002B', fontSize: '13px', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>×{item.quantity}</p>
                      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>৳{item.price * item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex justify-between items-center">
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '14px' }}>Total</p>
                  <p style={{ color: '#F9002B', fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '20px' }}>৳{order.total}</p>
                </div>
              </div>
            </div>
          )}

          {/* Status badge */}
          {order && (
            <div className="text-center">
              {(() => {
                const cfg = statusConfig[order.status as keyof typeof statusConfig];
                const StatusIcon = cfg.icon;
                return (
                  <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full" style={{ backgroundColor: cfg.bg }}>
                    <StatusIcon size={15} style={{ color: cfg.color }} />
                    <span style={{ color: cfg.color, fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '14px' }}>
                      {cfg.label}
                    </span>
                  </div>
                );
              })()}
            </div>
          )}

          <p className="text-center mt-6" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>
            Payment is handled by staff at the table. Thank you!
          </p>
        </div>
      </div>
    );
  }

  // ── Main Ordering Screen ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F9F5F0' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #1A0000, #C8001F)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
      >
        <div className="flex items-center gap-3">
          <div>
            <p style={{ color: '#fff', fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '14px', lineHeight: 1 }}>Pizzora Restaurant</p>
            <p style={{ color: '#F9002B', fontSize: '10px', fontFamily: 'var(--font-heading)', fontWeight: 600, letterSpacing: '1px' }}>
              Welcome — Table {table.tableNumber} · {table.area} · {table.seats} Seats
            </p>
          </div>
        </div>
        <button
          onClick={() => setCartOpen(true)}
          className="relative flex items-center gap-2 px-4 py-2 rounded-xl transition-all"
          style={{ background: cartCount > 0 ? 'linear-gradient(135deg, #F9002B, #C8001F)' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          <ShoppingCart size={16} style={{ color: '#fff' }} />
          {cartCount > 0 && (
            <>
              <span style={{ color: '#fff', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '13px' }}>৳{cartTotal}</span>
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white text-red-600 flex items-center justify-center" style={{ fontSize: '10px', fontWeight: 800 }}>{cartCount}</span>
            </>
          )}
          {cartCount === 0 && <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontFamily: 'var(--font-heading)' }}>Cart</span>}
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder="Search dishes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border"
            style={{ borderColor: 'rgba(249,0,43,0.1)', fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none' }}
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-4 pb-3 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className="px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0"
            style={{
              background: activeCategory === cat ? 'linear-gradient(135deg, #F9002B, #C8001F)' : '#fff',
              color: activeCategory === cat ? '#fff' : '#6B7280',
              border: '1px solid',
              borderColor: activeCategory === cat ? 'transparent' : 'rgba(249,0,43,0.12)',
              fontFamily: 'var(--font-heading)',
              fontSize: '12px',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      <div className="px-4 pb-32 grid grid-cols-2 gap-3 sm:gap-4">
        {filtered.map(item => {
          return (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="bg-white rounded-2xl overflow-hidden shadow-sm card-hover group cursor-pointer flex flex-col"
              style={{ border: '1px solid rgba(249,0,43,0.06)' }}
            >
              <div className="relative overflow-hidden" style={{ height: 'clamp(110px, 30vw, 150px)' }}>
                <img
                  src={optimizeCloudinaryUrl(item.image, 600)}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute top-2 left-2 flex gap-1">
                  {item.isPopular && <span className="premium-badge" style={{ fontSize: '9px', padding: '1px 6px' }}>Popular</span>}
                  {item.isVeg && (
                    <span className="px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: '#16A34A', fontSize: '9px', fontWeight: 600 }}>
                      Veg
                    </span>
                  )}
                </div>
                <div
                  className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full hidden xs:block"
                  style={{ backgroundColor: `${spiceColors[item.spiceLevel] || '#6B7280'}20`, color: spiceColors[item.spiceLevel] || '#6B7280', border: `1px solid ${spiceColors[item.spiceLevel] || '#6B7280'}40`, fontSize: '10px', fontWeight: 600 }}
                >
                  {item.spiceLevel}
                </div>
                <div className="absolute inset-x-0 bottom-2 flex justify-center opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 duration-300">
                  <span
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-semibold card-glass-btn"
                  >
                    <Eye size={12} /> View
                  </span>
                </div>
              </div>

              <div className="p-2.5 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="flex-1 pr-1 line-clamp-1" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'clamp(11px, 3vw, 14px)', color: '#111', lineHeight: 1.3 }}>
                    {item.name}
                  </h3>
                  <span style={{ fontWeight: 800, fontSize: 'clamp(11px, 3vw, 14px)', color: '#F9002B', fontFamily: 'var(--font-heading)', whiteSpace: 'nowrap' }}>
                    ৳{item.price}
                  </span>
                </div>

                <div className="flex items-center gap-1 mb-2">
                  <StarRating rating={item.rating} size={10} />
                  <span style={{ fontSize: '10px', color: '#6B7280' }}>({item.rating})</span>
                </div>

                <p className="line-clamp-2 mb-2 flex-1" style={{ fontSize: '11px', color: '#6B7280', lineHeight: '1.4' }}>
                  {item.description.substring(0, 60)}...
                </p>

                <div className="flex gap-1.5 mt-auto">
                  <button
                    onClick={e => { e.stopPropagation(); setSelectedItem(item); }}
                    className="flex items-center justify-center gap-1 flex-1 rounded-lg font-semibold border transition-all"
                    style={{ borderColor: '#F9002B', color: '#F9002B', fontFamily: 'var(--font-heading)', fontSize: 'clamp(10px, 2.5vw, 12px)', padding: '6px 4px' }}
                  >
                    <Eye size={12} /> <span className="hidden xs:inline">Details</span>
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); addToLocalCart(item); }}
                    className="flex items-center justify-center gap-1 flex-1 rounded-lg font-semibold text-white transition-all active:scale-95 shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)', fontSize: 'clamp(10px, 2.5vw, 12px)', padding: '6px 4px' }}
                  >
                    <Plus size={12} /> <span>Add</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Place Order FAB */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-40" style={{ background: 'linear-gradient(to top, rgba(249,245,240,1) 60%, rgba(249,245,240,0))' }}>
          <button
            onClick={() => setCartOpen(true)}
            className="w-full py-4 rounded-2xl text-white font-bold flex items-center justify-between px-5 transition-all active:scale-98 shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)', fontSize: '15px' }}
          >
            <span className="flex items-center gap-2">
              <ShoppingCart size={18} />
              View Cart ({cartCount} items)
            </span>
            <span style={{ color: '#fff', fontWeight: 900 }}>৳{cartTotal}</span>
          </button>
        </div>
      )}

      {/* Product Details Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedItem(null); }}
        >
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden relative" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center z-10"
            >
              <X size={18} style={{ color: '#111' }} />
            </button>
            <div className="relative h-48 sm:h-64">
              <img src={selectedItem.image} alt={selectedItem.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <div className="flex gap-2 mb-2">
                  {selectedItem.isPopular && <span className="premium-badge text-xs px-2 py-0.5">Popular</span>}
                  {selectedItem.isVeg && <span className="bg-green-600 text-xs font-bold px-2 py-0.5 rounded-full text-white">Veg</span>}
                </div>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '24px', lineHeight: 1.2 }}>{selectedItem.name}</h2>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <span style={{ fontWeight: 900, fontSize: '24px', color: '#F9002B', fontFamily: 'var(--font-heading)' }}>
                  ৳{selectedItem.price}
                </span>
                <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                  <StarRating rating={selectedItem.rating} size={14} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>{selectedItem.rating}</span>
                </div>
              </div>
              
              <div className="flex gap-4 mb-4 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-1.5 text-sm" style={{ color: '#6B7280' }}>
                  <Clock size={16} /> <span style={{ fontWeight: 600 }}>{selectedItem.prepTime}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm" style={{ color: '#6B7280' }}>
                  <Users size={16} /> <span style={{ fontWeight: 600 }}>{selectedItem.serves}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm" style={{ color: spiceColors[selectedItem.spiceLevel] || '#6B7280' }}>
                  <ChefHat size={16} /> <span style={{ fontWeight: 600 }}>{selectedItem.spiceLevel}</span>
                </div>
              </div>
              
              <p style={{ color: '#4B5563', fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' }}>
                {selectedItem.description}
              </p>
              
              <button
                onClick={() => { addToLocalCart(selectedItem); setSelectedItem(null); }}
                className="w-full py-3.5 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg"
                style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)', fontSize: '16px' }}
              >
                <Plus size={18} /> Add to Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {cartOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setCartOpen(false); }}
        >
          <div className="bg-white rounded-t-3xl max-h-[85vh] flex flex-col" style={{ boxShadow: '0 -20px 60px rgba(0,0,0,0.3)' }}>
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(249,0,43,0.08)' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '18px', color: '#111' }}>Your Order</h2>
                <p style={{ fontSize: '12px', color: '#6B7280' }}>Table {table.tableNumber} — {table.area}</p>
              </div>
              <button onClick={() => setCartOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F3F4F6' }}>
                <X size={16} style={{ color: '#374151' }} />
              </button>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {cart.map(c => (
                <div key={c.item.id} className="flex items-start gap-3">
                  <img src={c.item.image} alt={c.item.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '14px', color: '#111' }}>{c.item.name}</p>
                        {c.note && <p style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>Note: {c.note}</p>}
                      </div>
                      <button onClick={() => updateQty(c.item.id, 0)}>
                        <Trash2 size={14} style={{ color: '#9CA3AF' }} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(c.item.id, c.quantity - 1)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)' }}>
                          <Minus size={11} style={{ color: '#fff' }} />
                        </button>
                        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '14px', color: '#111', minWidth: '20px', textAlign: 'center' }}>{c.quantity}</span>
                        <button onClick={() => updateQty(c.item.id, c.quantity + 1)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)' }}>
                          <Plus size={11} style={{ color: '#fff' }} />
                        </button>
                      </div>
                      <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px', color: '#F9002B' }}>৳{c.item.price * c.quantity}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Special note */}
            <div className="px-5 pb-3">
              <label style={{ fontFamily: 'var(--font-heading)', fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Special Instructions (Optional)
              </label>
              <textarea
                rows={2}
                value={customerNote}
                onChange={e => setCustomerNote(e.target.value)}
                placeholder="Any special requests for the whole order..."
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm"
                style={{ borderColor: 'rgba(249,0,43,0.15)', fontFamily: 'var(--font-body)', outline: 'none', resize: 'none' }}
              />
            </div>

            {/* Footer */}
            <div className="px-5 pb-6 pt-3" style={{ borderTop: '1px solid rgba(249,0,43,0.08)' }}>
              <div className="flex items-center justify-between mb-4">
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '15px', color: '#374151' }}>Total</span>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '22px', color: '#F9002B' }}>৳{cartTotal}</span>
              </div>
              <button
                onClick={handlePlaceOrder}
                className="w-full py-4 rounded-2xl text-white font-bold flex items-center justify-center gap-3 transition-all active:scale-98 shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)', fontSize: '16px' }}
              >
                <CheckCircle size={20} />
                Place Order
              </button>
              <p className="text-center mt-3" style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'var(--font-body)' }}>
                Staff will collect payment at the table
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}