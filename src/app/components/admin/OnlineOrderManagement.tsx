import React, { useState, useMemo, useEffect } from 'react';
import {
  ShoppingBag, Globe, Truck, Phone, MapPin, Clock, CheckCircle2,
  AlertCircle, ChefHat, Printer, Eye, Trash2, Filter, Search, Download,
  Calendar, DollarSign, ArrowRight, MessageSquare, Send, Sparkles,
  RefreshCw, X, ChevronDown, Check, Volume2, VolumeX, ExternalLink,
  FileText, Share2, CreditCard, LayoutGrid, ListFilter, Plus, Minus,
  PhoneCall, User
} from 'lucide-react';
import { useApp, Order, OrderStatus, MenuItem } from '../../context/AppContext';
import { generatePremiumPDF } from '../../utils/pdfGenerator';
import { ConfirmModal } from '../ConfirmModal';
import { generateInvoiceNumber } from '../../utils/printerService';

export function isWebsiteOnlineOrder(o: Order): boolean {
  if (!o) return false;

  // 1. Explicit flags
  if ((o as any).isTableOrder === true) return false;
  if (o.isOnlineOrder === false) return false;
  if (o.source === 'pos' || o.source === 'table') return false;
  if (o.orderType === 'Dine In' || o.orderType === 'POS') return false;

  // 2. Customer Name heuristics ("Table 2 Guest", "Table 3", "POS Customer", "Walk-in Guest")
  const name = (o.customerName || '').trim().toLowerCase();
  if (name.startsWith('table ') || name === 'pos customer' || name === 'walk-in guest') {
    return false;
  }

  // 3. Address heuristics (Dine-in / Table orders have "Table X", "Dine In — Table X")
  const addr = (o.address || '').trim().toLowerCase();
  if (addr.includes('dine in') || addr.includes('table ') || addr.includes('— table') || addr.startsWith('table')) {
    return false;
  }

  // 4. Online Invoice Prefix: PIZO (Pizzora Online) or legacy RZQ
  if (o.orderNumber?.toUpperCase().startsWith('PIZO') || o.orderNumber?.toUpperCase().startsWith('RZQ')) {
    return true;
  }

  // 5. POS generated invoice format: "PIZ-YYYY-XXXXXX" (excluding PIZO)
  if (o.orderNumber?.startsWith('PIZ-') && !o.orderNumber?.startsWith('PIZO') && (!o.phone || o.phone.trim() === '' || addr === 'dine in' || addr === 'pos' || addr === '')) {
    return false;
  }

  // 6. Explicit online flag
  if (o.isOnlineOrder === true || o.source === 'website') return true;

  // Genuine website online orders always have an actual customer phone number
  return Boolean(o.phone && o.phone.trim().length >= 8);
}

interface OnlineOrderManagementProps {
  onPrintOrder?: (order: Order) => void;
}

export function OnlineOrderManagement({ onPrintOrder }: OnlineOrderManagementProps) {
  const { state, dispatch, showNotification } = useApp();
  const [sourceScope, setSourceScope] = useState<'website' | 'all-delivery'>('all-delivery');

  // ── Take Home Delivery Order State ──────────────────────────────────────────
  const [showTakeOrderModal, setShowTakeOrderModal] = useState(false);
  const [delCustomerName, setDelCustomerName] = useState('');
  const [delPhone, setDelPhone] = useState('');
  const [delAddress, setDelAddress] = useState('');
  const [delArea, setDelArea] = useState('Zindabazar');
  const [delFee, setDelFee] = useState<number>(40);
  const [delPaymentMethod, setDelPaymentMethod] = useState<'Cash on Delivery' | 'bKash' | 'Nagad' | 'Card'>('Cash on Delivery');
  const [delRiderNote, setDelRiderNote] = useState('');
  const [delSelectedItems, setDelSelectedItems] = useState<{ item: MenuItem; quantity: number; note?: string }[]>([]);
  const [delMenuSearch, setDelMenuSearch] = useState('');
  const [delCategory, setDelCategory] = useState('All');
  const [isSubmittingDelivery, setIsSubmittingDelivery] = useState(false);

  const SYLHET_AREAS = [
    { name: 'Zindabazar', fee: 40 },
    { name: 'Amberkhana', fee: 50 },
    { name: 'Subidbazar', fee: 50 },
    { name: 'Shibganj', fee: 60 },
    { name: 'Upashohor', fee: 60 },
    { name: 'Kumarpara', fee: 40 },
    { name: 'Chowhatta', fee: 40 },
    { name: 'Mira Bazar', fee: 50 },
    { name: 'Lamabazar', fee: 50 },
    { name: 'Tilagarh', fee: 70 },
    { name: 'South Surma / Kadamtoli', fee: 80 },
    { name: 'Akhalia / SUST', fee: 80 },
    { name: 'Airport Road', fee: 90 },
    { name: 'Custom Area', fee: 50 },
  ];

  const handleSelectArea = (areaName: string) => {
    setDelArea(areaName);
    const found = SYLHET_AREAS.find(a => a.name === areaName);
    if (found) {
      setDelFee(found.fee);
    }
  };

  const menuCategories = useMemo(() => {
    return ['All', ...Array.from(new Set((state.menuItems || []).map(m => m.category)))];
  }, [state.menuItems]);

  const filteredPickerItems = useMemo(() => {
    return (state.menuItems || []).filter(item => {
      const matchCat = delCategory === 'All' || item.category === delCategory;
      const matchSearch = !delMenuSearch.trim() || item.name.toLowerCase().includes(delMenuSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [state.menuItems, delCategory, delMenuSearch]);

  const addDeliveryItem = (item: MenuItem) => {
    setDelSelectedItems(prev => {
      const exists = prev.find(p => p.item.id === item.id);
      if (exists) {
        return prev.map(p => p.item.id === item.id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { item, quantity: 1, note: '' }];
    });
  };

  const updateDeliveryItemQty = (itemId: string, delta: number) => {
    setDelSelectedItems(prev => {
      return prev
        .map(p => {
          if (p.item.id === itemId) {
            const newQty = p.quantity + delta;
            return newQty > 0 ? { ...p, quantity: newQty } : null;
          }
          return p;
        })
        .filter(Boolean) as { item: MenuItem; quantity: number; note?: string }[];
    });
  };

  const removeDeliveryItem = (itemId: string) => {
    setDelSelectedItems(prev => prev.filter(p => p.item.id !== itemId));
  };

  const updateDeliveryItemNote = (itemId: string, note: string) => {
    setDelSelectedItems(prev => prev.map(p => p.item.id === itemId ? { ...p, note } : p));
  };

  const delSubtotal = useMemo(() => {
    return delSelectedItems.reduce((acc, c) => acc + (c.item.price * c.quantity), 0);
  }, [delSelectedItems]);

  const delGrandTotal = delSubtotal + Number(delFee || 0);

  const handleCreateDeliveryOrder = async (initialStatus: OrderStatus) => {
    if (!delPhone.trim()) {
      showNotification('Customer phone number is required for delivery.', 'error');
      return;
    }
    if (!delAddress.trim()) {
      showNotification('Delivery address (house/street) is required.', 'error');
      return;
    }
    if (delSelectedItems.length === 0) {
      showNotification('Please add at least 1 food item to the delivery ticket.', 'error');
      return;
    }

    setIsSubmittingDelivery(true);
    try {
      let invNo = '';
      try {
        invNo = await generateInvoiceNumber();
      } catch {
        invNo = `PIZD-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      }

      const fullAddress = `${delAddress.trim()}${delArea ? ` [${delArea}]` : ''}`;

      const newOrder: Order = {
        id: `del-${Date.now()}`,
        orderNumber: invNo,
        customerName: delCustomerName.trim() || 'Home Delivery Guest',
        phone: delPhone.trim(),
        address: fullAddress,
        items: delSelectedItems.map(c => ({
          item: c.item,
          quantity: c.quantity,
          specialRequest: c.note || '',
        })),
        subtotal: delSubtotal,
        deliveryFee: Number(delFee || 0),
        discount: 0,
        total: delGrandTotal,
        status: initialStatus,
        paymentMethod: delPaymentMethod,
        createdAt: new Date().toISOString(),
        estimatedTime: '30-45 mins',
        isOnlineOrder: true,
        source: 'delivery-admin',
        orderType: 'Delivery',
        notes: delRiderNote.trim() || undefined,
      };

      dispatch({ type: 'PLACE_ORDER', payload: newOrder });
      showNotification(`Home Delivery Order #${invNo} created & ${initialStatus}!`, 'success');

      if (onPrintOrder) {
        onPrintOrder(newOrder);
      }

      // Reset
      setDelCustomerName('');
      setDelPhone('');
      setDelAddress('');
      setDelRiderNote('');
      setDelSelectedItems([]);
      setShowTakeOrderModal(false);
    } catch (e: any) {
      showNotification('Failed to create delivery order: ' + (e?.message || ''), 'error');
    } finally {
      setIsSubmittingDelivery(false);
    }
  };

  const websiteCount = useMemo(() => (state.orders || []).filter(isWebsiteOnlineOrder).length, [state.orders]);
  const allDeliveryCount = useMemo(() => {
    return (state.orders || []).filter(o => {
      if (isWebsiteOnlineOrder(o)) return true;
      const addr = (o.address || '').toLowerCase();
      return (o.orderType === 'Delivery' || addr === 'delivery') && !addr.includes('table') && !o.customerName?.toLowerCase().startsWith('table');
    }).length;
  }, [state.orders]);

  const orders = useMemo(() => {
    return (state.orders || []).filter(o => {
      if (sourceScope === 'website') {
        return isWebsiteOnlineOrder(o);
      }
      if (isWebsiteOnlineOrder(o)) return true;
      const addr = (o.address || '').toLowerCase();
      return (o.orderType === 'Delivery' || addr === 'delivery') && !addr.includes('table') && !o.customerName?.toLowerCase().startsWith('table');
    });
  }, [state.orders, sourceScope]);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | OrderStatus>('All');
  const [paymentFilter, setPaymentFilter] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<'All Time' | 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Custom'>('All Time');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Modals
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const adminRole = sessionStorage.getItem('pizzora_admin_role') || 'manager';

  // Audio notification when new pending orders appear
  const pendingCount = useMemo(() => orders.filter(o => o.status === 'Pending').length, [orders]);
  const [prevPendingCount, setPrevPendingCount] = useState(pendingCount);

  useEffect(() => {
    if (pendingCount > prevPendingCount && soundEnabled) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      } catch {
        // Audio playback error fallback
      }
    }
    setPrevPendingCount(pendingCount);
  }, [pendingCount, prevPendingCount, soundEnabled]);

  // Date bounds
  const dateBounds = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const todayMidnight = new Date(todayStr + 'T00:00:00').getTime();

    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yesterdayStr = y.toLocaleDateString('en-CA');
    const yesterdayMidnight = new Date(yesterdayStr + 'T00:00:00').getTime();

    const weekAgo = todayMidnight - 7 * 86400000;
    const monthStr = todayStr.slice(0, 7);

    return { todayMidnight, yesterdayMidnight, weekAgo, monthStr, todayStr };
  }, []);

  // Filtered Online Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchNum = (o.orderNumber || '').toLowerCase().includes(q);
        const matchName = (o.customerName || '').toLowerCase().includes(q);
        const matchPhone = (o.phone || '').toLowerCase().includes(q);
        const matchAddr = (o.address || '').toLowerCase().includes(q);
        if (!matchNum && !matchName && !matchPhone && !matchAddr) return false;
      }

      // Status
      if (statusFilter !== 'All' && o.status !== statusFilter) return false;

      // Payment Method
      if (paymentFilter !== 'All' && o.paymentMethod !== paymentFilter) return false;

      // Date Filter
      const orderTime = new Date(o.createdAt).getTime();
      const orderDateStr = new Date(o.createdAt).toLocaleDateString('en-CA');

      if (dateFilter === 'Today') {
        if (orderTime < dateBounds.todayMidnight) return false;
      } else if (dateFilter === 'Yesterday') {
        if (orderTime < dateBounds.yesterdayMidnight || orderTime >= dateBounds.todayMidnight) return false;
      } else if (dateFilter === 'This Week') {
        if (orderTime < dateBounds.weekAgo) return false;
      } else if (dateFilter === 'This Month') {
        if (!orderDateStr.startsWith(dateBounds.monthStr)) return false;
      } else if (dateFilter === 'Custom') {
        if (customStartDate && orderDateStr < customStartDate) return false;
        if (customEndDate && orderDateStr > customEndDate) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, search, statusFilter, paymentFilter, dateFilter, customStartDate, customEndDate, dateBounds]);

  // Executive KPI Metrics
  const stats = useMemo(() => {
    const totalOnline = orders.length;
    const pending = orders.filter(o => o.status === 'Pending').length;
    const preparing = orders.filter(o => o.status === 'Preparing').length;
    const delivery = orders.filter(o => o.status === 'Out for Delivery').length;
    const delivered = orders.filter(o => o.status === 'Delivered').length;
    const cancelled = orders.filter(o => o.status === 'Cancelled').length;

    const deliveredRevenue = orders
      .filter(o => o.status === 'Delivered')
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const todayDeliveredRevenue = orders
      .filter(o => o.status === 'Delivered' && new Date(o.createdAt).getTime() >= dateBounds.todayMidnight)
      .reduce((sum, o) => sum + (o.total || 0), 0);

    return { totalOnline, pending, preparing, delivery, delivered, cancelled, deliveredRevenue, todayDeliveredRevenue };
  }, [orders, dateBounds]);

  // Actions
  const handleUpdateStatus = (orderId: string, newStatus: OrderStatus) => {
    dispatch({ type: 'UPDATE_ORDER_STATUS', payload: { id: orderId, status: newStatus } });
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const handleDelete = (orderId: string) => {
    dispatch({ type: 'DELETE_ORDER', payload: orderId });
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder(null);
    }
  };

  // Helper for time ago
  const formatTimeAgo = (isoDate: string) => {
    try {
      const diffMs = Date.now() - new Date(isoDate).getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ${mins % 60}m ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return '';
    }
  };

  // Export to PDF
  const handleExportPDF = () => {
    const data = filteredOrders.map((o, idx) => [
      String(idx + 1),
      `#${o.orderNumber || o.id.slice(-6)}`,
      o.customerName || 'N/A',
      o.phone || 'N/A',
      o.address || 'N/A',
      `${o.items.length} items`,
      o.paymentMethod || 'COD',
      `৳${(o.total || 0).toLocaleString()}`,
      o.status,
      new Date(o.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })
    ]);

    generatePremiumPDF({
      title: 'Online Orders Audit & Execution Report',
      columns: ['#', 'Order No.', 'Customer', 'Phone', 'Address', 'Items', 'Payment', 'Total', 'Status', 'Placed At'],
      data,
      filename: `Online_Orders_${new Date().toISOString().slice(0, 10)}`
    });
  };

  // Status Badge Helper
  const renderStatusBadge = (status: OrderStatus) => {
    const config: Record<OrderStatus, { bg: string; color: string; border: string; label: string }> = {
      Pending: { bg: '#FEF3C7', color: '#92400E', border: '#FCD34D', label: 'Pending Acceptance' },
      Preparing: { bg: '#DBEAFE', color: '#1E40AF', border: '#93C5FD', label: 'Cooking in Kitchen' },
      'Out for Delivery': { bg: '#EDE9FE', color: '#5B21B6', border: '#C4B5FD', label: 'Out with Rider' },
      Delivered: { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7', label: 'Delivered & Paid' },
      Cancelled: { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5', label: 'Cancelled' }
    };
    const c = config[status] || { bg: '#F3F4F6', color: '#4B5563', border: '#E5E7EB', label: status };

    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-2xs"
        style={{ backgroundColor: c.bg, color: c.color, borderColor: c.border, fontFamily: 'var(--font-heading)' }}
      >
        {status === 'Pending' && <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />}
        {status === 'Preparing' && <ChefHat size={12} />}
        {status === 'Out for Delivery' && <Truck size={12} />}
        {status === 'Delivered' && <CheckCircle2 size={12} />}
        {status === 'Cancelled' && <X size={12} />}
        {c.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header Banner ── */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)' }}>
              <Truck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-black text-gray-900 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                  Home Delivery & Online Station
                </h2>
                {pendingCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-600 text-white animate-pulse">
                    {pendingCount} ACTION REQUIRED
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Dedicated real-time station for phone orders, direct home deliveries & website orders
              </p>

              {/* Source Scope Filter Pills */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <button
                  onClick={() => setSourceScope('all-delivery')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    sourceScope === 'all-delivery'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  <Truck size={13} /> All Home Deliveries ({allDeliveryCount})
                </button>
                <button
                  onClick={() => setSourceScope('website')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    sourceScope === 'website'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  <Globe size={13} /> Website Orders Only ({websiteCount})
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls & New Order Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowTakeOrderModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black text-white shadow-md hover:scale-105 active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #16A34A, #15803D)', fontFamily: 'var(--font-heading)' }}
          >
            <Plus size={16} /> Take Home Delivery Order
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
              soundEnabled ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-gray-100 text-gray-500 border-gray-200'
            }`}
            title={soundEnabled ? 'Alert Chime Active' : 'Chime Muted'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span className="hidden sm:inline">{soundEnabled ? 'Chime ON' : 'Muted'}</span>
          </button>

          <div className="flex p-1 bg-gray-100 rounded-xl border border-gray-200">
            <button
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'board' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'
              }`}
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <LayoutGrid size={14} /> Board
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'table' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'
              }`}
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <ListFilter size={14} /> Ledger Table
            </button>
          </div>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 shadow-2xs transition-colors"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            <Download size={14} /> Export PDF
          </button>
        </div>
      </div>

      {/* ── KPI Stat Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => setStatusFilter('All')}
          className={`cursor-pointer bg-white p-4 rounded-2xl border transition-all hover:shadow-md ${
            statusFilter === 'All' ? 'border-gray-900 ring-2 ring-gray-900/10' : 'border-gray-100'
          }`}
        >
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Total Online</span>
          <span className="text-xl font-black text-gray-900 block mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
            {stats.totalOnline}
          </span>
          <span className="text-[11px] text-gray-500 font-semibold block mt-0.5">৳{stats.deliveredRevenue.toLocaleString()} volume</span>
        </div>

        <div
          onClick={() => setStatusFilter('Pending')}
          className={`cursor-pointer bg-white p-4 rounded-2xl border transition-all hover:shadow-md ${
            statusFilter === 'Pending' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-amber-100'
          } ${stats.pending > 0 ? 'bg-amber-50/40' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">New Pending</span>
            {stats.pending > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />}
          </div>
          <span className="text-xl font-black text-amber-800 block mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
            {stats.pending}
          </span>
          <span className="text-[11px] text-amber-600 font-bold block mt-0.5">Needs kitchen accept</span>
        </div>

        <div
          onClick={() => setStatusFilter('Preparing')}
          className={`cursor-pointer bg-white p-4 rounded-2xl border transition-all hover:shadow-md ${
            statusFilter === 'Preparing' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-blue-100'
          }`}
        >
          <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">In Kitchen</span>
          <span className="text-xl font-black text-blue-800 block mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
            {stats.preparing}
          </span>
          <span className="text-[11px] text-blue-600 font-bold block mt-0.5">Cooking now</span>
        </div>

        <div
          onClick={() => setStatusFilter('Out for Delivery')}
          className={`cursor-pointer bg-white p-4 rounded-2xl border transition-all hover:shadow-md ${
            statusFilter === 'Out for Delivery' ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-purple-100'
          }`}
        >
          <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">On Delivery</span>
          <span className="text-xl font-black text-purple-800 block mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
            {stats.delivery}
          </span>
          <span className="text-[11px] text-purple-600 font-bold block mt-0.5">With delivery rider</span>
        </div>

        <div
          onClick={() => setStatusFilter('Delivered')}
          className={`cursor-pointer bg-white p-4 rounded-2xl border transition-all hover:shadow-md ${
            statusFilter === 'Delivered' ? 'border-green-500 ring-2 ring-green-500/20' : 'border-green-100'
          }`}
        >
          <span className="text-[11px] font-bold text-green-700 uppercase tracking-wider block">Delivered</span>
          <span className="text-xl font-black text-green-800 block mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
            {stats.delivered}
          </span>
          <span className="text-[11px] text-green-600 font-bold block mt-0.5">Successfully fulfilled</span>
        </div>

        <div
          onClick={() => setStatusFilter('Cancelled')}
          className={`cursor-pointer bg-white p-4 rounded-2xl border transition-all hover:shadow-md ${
            statusFilter === 'Cancelled' ? 'border-red-500 ring-2 ring-red-500/20' : 'border-red-100'
          }`}
        >
          <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider block">Cancelled</span>
          <span className="text-xl font-black text-red-800 block mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
            {stats.cancelled}
          </span>
          <span className="text-[11px] text-red-600 font-bold block mt-0.5">Rejected / Failed</span>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by Order #, Customer Name, Phone number or Delivery address..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Date Presets */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
            {(['All Time', 'Today', 'Yesterday', 'This Week', 'This Month', 'Custom'] as const).map(preset => (
              <button
                key={preset}
                onClick={() => setDateFilter(preset)}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                  dateFilter === preset ? 'bg-red-600 text-white shadow-2xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Payment Method Filter */}
          <select
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 bg-white focus:outline-none"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            <option value="All">All Payments</option>
            <option value="Cash on Delivery">Cash on Delivery</option>
            <option value="bKash">bKash</option>
            <option value="Nagad">Nagad</option>
            <option value="Rocket">Rocket</option>
            <option value="Card">Card</option>
          </select>
        </div>

        {/* Custom Date Range Row */}
        {dateFilter === 'Custom' && (
          <div className="flex items-center gap-3 pt-2 border-t border-gray-100 text-xs">
            <span className="font-bold text-gray-600">From Date:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={e => setCustomStartDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs"
            />
            <span className="font-bold text-gray-600">To Date:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={e => setCustomEndDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs"
            />
            {(customStartDate || customEndDate) && (
              <button
                onClick={() => { setCustomStartDate(''); setCustomEndDate(''); }}
                className="text-xs text-red-600 font-bold hover:underline"
              >
                Reset Dates
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Active View ── */}
      {viewMode === 'board' ? (
        /* ═══════════════════════════════════════════════════════════════════ */
        /* KANBAN EXECUTION BOARD VIEW                                         */
        /* ═══════════════════════════════════════════════════════════════════ */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {/* Column 1: New / Pending Orders */}
          <div className="bg-gray-50/80 rounded-2xl p-4 border border-amber-200/80 flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between pb-3 border-b border-amber-200/60 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-900" style={{ fontFamily: 'var(--font-heading)' }}>
                  1. Incoming / Pending
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-md text-xs font-black bg-amber-200 text-amber-900">
                {filteredOrders.filter(o => o.status === 'Pending').length}
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {filteredOrders.filter(o => o.status === 'Pending').length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-xs">
                  No pending online orders right now.
                </div>
              ) : (
                filteredOrders.filter(o => o.status === 'Pending').map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    timeAgo={formatTimeAgo(order.createdAt)}
                    onView={() => setSelectedOrder(order)}
                    onPrint={() => onPrintOrder?.(order)}
                    onUpdateStatus={handleUpdateStatus}
                    onDelete={handleDelete}
                    adminRole={adminRole}
                    setDeleteConfirm={setDeleteConfirm}
                  />
                ))
              )}
            </div>
          </div>

          {/* Column 2: Kitchen Preparing */}
          <div className="bg-gray-50/80 rounded-2xl p-4 border border-blue-200/80 flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between pb-3 border-b border-blue-200/60 mb-3">
              <div className="flex items-center gap-2">
                <ChefHat size={14} className="text-blue-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-blue-900" style={{ fontFamily: 'var(--font-heading)' }}>
                  2. Kitchen Cooking
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-md text-xs font-black bg-blue-200 text-blue-900">
                {filteredOrders.filter(o => o.status === 'Preparing').length}
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {filteredOrders.filter(o => o.status === 'Preparing').length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-xs">
                  No orders currently in the kitchen.
                </div>
              ) : (
                filteredOrders.filter(o => o.status === 'Preparing').map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    timeAgo={formatTimeAgo(order.createdAt)}
                    onView={() => setSelectedOrder(order)}
                    onPrint={() => onPrintOrder?.(order)}
                    onUpdateStatus={handleUpdateStatus}
                    onDelete={handleDelete}
                    adminRole={adminRole}
                    setDeleteConfirm={setDeleteConfirm}
                  />
                ))
              )}
            </div>
          </div>

          {/* Column 3: Out for Delivery */}
          <div className="bg-gray-50/80 rounded-2xl p-4 border border-purple-200/80 flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between pb-3 border-b border-purple-200/60 mb-3">
              <div className="flex items-center gap-2">
                <Truck size={14} className="text-purple-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-purple-900" style={{ fontFamily: 'var(--font-heading)' }}>
                  3. Out with Rider
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-md text-xs font-black bg-purple-200 text-purple-900">
                {filteredOrders.filter(o => o.status === 'Out for Delivery').length}
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {filteredOrders.filter(o => o.status === 'Out for Delivery').length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-xs">
                  No orders currently on the road.
                </div>
              ) : (
                filteredOrders.filter(o => o.status === 'Out for Delivery').map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    timeAgo={formatTimeAgo(order.createdAt)}
                    onView={() => setSelectedOrder(order)}
                    onPrint={() => onPrintOrder?.(order)}
                    onUpdateStatus={handleUpdateStatus}
                    onDelete={handleDelete}
                    adminRole={adminRole}
                    setDeleteConfirm={setDeleteConfirm}
                  />
                ))
              )}
            </div>
          </div>

          {/* Column 4: Delivered / Fulfilled */}
          <div className="bg-gray-50/80 rounded-2xl p-4 border border-green-200/80 flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between pb-3 border-b border-green-200/60 mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-green-900" style={{ fontFamily: 'var(--font-heading)' }}>
                  4. Completed
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-md text-xs font-black bg-green-200 text-green-900">
                {filteredOrders.filter(o => o.status === 'Delivered').length}
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {filteredOrders.filter(o => o.status === 'Delivered').length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-xs">
                  No fulfilled orders in this timeframe.
                </div>
              ) : (
                filteredOrders.filter(o => o.status === 'Delivered').slice(0, 15).map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    timeAgo={formatTimeAgo(order.createdAt)}
                    onView={() => setSelectedOrder(order)}
                    onPrint={() => onPrintOrder?.(order)}
                    onUpdateStatus={handleUpdateStatus}
                    onDelete={handleDelete}
                    adminRole={adminRole}
                    setDeleteConfirm={setDeleteConfirm}
                  />
                ))
              )}
            </div>
          </div>

          {/* Column 5: Cancelled / Voided */}
          {(statusFilter === 'All' || statusFilter === 'Cancelled') && (
            <div className="bg-gray-50/80 rounded-2xl p-4 border border-red-200/80 flex flex-col min-h-[500px]">
              <div className="flex items-center justify-between pb-3 border-b border-red-200/60 mb-3">
                <div className="flex items-center gap-2">
                  <X size={14} className="text-red-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-red-900" style={{ fontFamily: 'var(--font-heading)' }}>
                    5. Cancelled / Void
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-md text-xs font-black bg-red-200 text-red-900">
                  {filteredOrders.filter(o => o.status === 'Cancelled').length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {filteredOrders.filter(o => o.status === 'Cancelled').length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-xs">
                    No cancelled orders in this timeframe.
                  </div>
                ) : (
                  filteredOrders.filter(o => o.status === 'Cancelled').map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      timeAgo={formatTimeAgo(order.createdAt)}
                      onView={() => setSelectedOrder(order)}
                      onPrint={() => onPrintOrder?.(order)}
                      onUpdateStatus={handleUpdateStatus}
                      onDelete={handleDelete}
                      adminRole={adminRole}
                      setDeleteConfirm={setDeleteConfirm}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════════════════ */
        /* LEDGER TABLE VIEW                                                   */
        /* ═══════════════════════════════════════════════════════════════════ */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-600 uppercase text-[10px] font-black tracking-wider">
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Delivery Address</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      No online orders match the current criteria.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-red-600 font-mono text-[13px]">
                          #{order.orderNumber || order.id.slice(-6)}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {formatTimeAgo(order.createdAt)} • {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900">{order.customerName}</div>
                        <a
                          href={`tel:${order.phone}`}
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-bold hover:underline"
                        >
                          <Phone size={10} /> {order.phone}
                        </a>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex items-start gap-1 text-gray-600 line-clamp-2">
                          <MapPin size={12} className="flex-shrink-0 text-red-500 mt-0.5" />
                          <span>{order.address || 'Takeaway / Pickup'}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-gray-800">{order.items.length} items</span>
                        <div className="text-[10px] text-gray-400 line-clamp-1">
                          {order.items.map(i => `${i.quantity}x ${i.item?.name || 'Item'}`).join(', ')}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="font-black text-gray-900 text-sm" style={{ fontFamily: 'var(--font-heading)' }}>
                          ৳{(order.total || 0).toLocaleString()}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 font-bold text-gray-700 text-[11px]">
                          {order.paymentMethod}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <select
                          value={order.status}
                          onChange={e => handleUpdateStatus(order.id, e.target.value as OrderStatus)}
                          className="px-2 py-1 rounded-lg border text-xs font-bold bg-white cursor-pointer"
                          style={{ fontFamily: 'var(--font-heading)' }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Preparing">Preparing</option>
                          <option value="Out for Delivery">Out for Delivery</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onPrintOrder?.(order)}
                            title="Print Thermal Invoice"
                            className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                          >
                            <Printer size={13} />
                          </button>
                          <button
                            onClick={() => setSelectedOrder(order)}
                            title="View Full Details"
                            className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                          >
                            <Eye size={13} />
                          </button>
                          {adminRole === 'admin' && (
                            <button
                              onClick={() => setDeleteConfirm({
                                isOpen: true,
                                title: 'Delete Online Order?',
                                message: `Permanently delete online order #${order.orderNumber || order.id.slice(-6)}? This will remove it from all revenue calculations.`,
                                onConfirm: () => {
                                  handleDelete(order.id);
                                  setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
                                }
                              })}
                              title="Delete Order"
                              className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Order Details Modal ── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-2xl rounded-2xl shadow-2xl bg-white border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-red-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                      Online Order #{selectedOrder.orderNumber || selectedOrder.id.slice(-6)}
                    </h3>
                    {renderStatusBadge(selectedOrder.status)}
                  </div>
                  <p className="text-xs text-gray-500">
                    Placed {new Date(selectedOrder.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })} ({formatTimeAgo(selectedOrder.createdAt)})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-200/60 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Customer & Delivery Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/70 space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Customer Information</span>
                  <div className="font-extrabold text-sm text-gray-900">{selectedOrder.customerName}</div>
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={`tel:${selectedOrder.phone}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-bold border border-blue-200 hover:bg-blue-100 transition-colors"
                    >
                      <Phone size={12} /> Call Customer
                    </a>
                    <a
                      href={`https://wa.me/880${selectedOrder.phone.replace(/^(\+880|880|0)/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 font-bold border border-green-200 hover:bg-green-100 transition-colors"
                    >
                      <MessageSquare size={12} /> WhatsApp
                    </a>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/70 space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Delivery Destination</span>
                  <div className="flex items-start gap-1.5 text-gray-800 font-medium">
                    <MapPin size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <span>{selectedOrder.address || 'Takeaway Pickup at Restaurant'}</span>
                  </div>
                  <div className="text-[11px] text-gray-500 font-semibold pt-1">
                    Payment Method: <span className="font-bold text-gray-900">{selectedOrder.paymentMethod}</span>
                  </div>
                </div>
              </div>

              {/* Status Fast Actions Bar */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-2">
                  Update Execution Phase
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'Pending')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedOrder.status === 'Pending' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'Preparing')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedOrder.status === 'Preparing' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    🍳 Accept & Cook
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'Out for Delivery')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedOrder.status === 'Out for Delivery' ? 'bg-purple-600 text-white shadow-xs' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    🚚 Out for Delivery
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'Delivered')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedOrder.status === 'Delivered' ? 'bg-green-600 text-white shadow-xs' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    ✓ Mark Delivered
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'Cancelled')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedOrder.status === 'Cancelled' ? 'bg-red-600 text-white shadow-xs' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    ✕ Cancel Order
                  </button>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-2">
                  Order Items ({selectedOrder.items.length})
                </span>
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold">
                        <th className="py-2.5 px-3">Item Details</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Price</th>
                        <th className="py-2.5 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedOrder.items.map((cartItem, idx) => {
                        const itemPrice = cartItem.item?.price || 0;
                        const lineTotal = itemPrice * cartItem.quantity;
                        return (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-gray-900">{cartItem.item?.name || 'Item'}</div>
                              {(cartItem.size || cartItem.crust || cartItem.spiceLevel) && (
                                <div className="text-[10px] text-gray-500">
                                  {[cartItem.size, cartItem.crust, cartItem.spiceLevel].filter(Boolean).join(' • ')}
                                </div>
                              )}
                              {(cartItem.specialInstructions || cartItem.specialRequest) && (
                                <div className="text-[10px] text-amber-700 italic mt-0.5">
                                  Note: "{cartItem.specialInstructions || cartItem.specialRequest}"
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-gray-800">
                              {cartItem.quantity}
                            </td>
                            <td className="py-2.5 px-3 text-right text-gray-600 font-medium">
                              ৳{itemPrice.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                              ৳{lineTotal.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold border-t border-gray-200">
                      {(selectedOrder.discount || 0) > 0 && (
                        <tr>
                          <td colSpan={3} className="py-2 px-3 text-right text-gray-500">Discount:</td>
                          <td className="py-2 px-3 text-right text-green-600">-৳{(selectedOrder.discount || 0).toLocaleString()}</td>
                        </tr>
                      )}
                      <tr>
                        <td colSpan={3} className="py-2.5 px-3 text-right text-gray-700 text-sm">Grand Total:</td>
                        <td className="py-2.5 px-3 text-right text-red-600 font-black text-base" style={{ fontFamily: 'var(--font-heading)' }}>
                          ৳{(selectedOrder.total || 0).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => onPrintOrder?.(selectedOrder)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white text-gray-800 border border-gray-200 hover:bg-gray-100 shadow-2xs transition-colors"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                <Printer size={14} /> Print Receipt
              </button>

              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-200/60 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Take Home Delivery Order Modal ── */}
      {showTakeOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="w-full max-w-4xl rounded-3xl shadow-2xl bg-white border border-gray-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-emerald-50/60">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md bg-emerald-600">
                  <Truck size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                    Take New Home Delivery Order
                  </h3>
                  <p className="text-xs text-gray-500">
                    Direct phone call / WhatsApp order entry for rider dispatch & kitchen cooking
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTakeOrderModal(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-200/60 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: 2 Columns on desktop */}
            <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Customer & Delivery Destination (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-3">
                  <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <User size={13} className="text-emerald-600" /> Customer Details
                  </span>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">Customer Name</label>
                    <input
                      type="text"
                      value={delCustomerName}
                      onChange={e => setDelCustomerName(e.target.value)}
                      placeholder="e.g. Tanvir Ahmed (or Guest)"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white text-gray-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">
                      Phone Number <span className="text-red-500">* (for rider call)</span>
                    </label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        value={delPhone}
                        onChange={e => setDelPhone(e.target.value)}
                        placeholder="017XXXXXXXX"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs bg-white text-gray-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-3">
                  <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin size={13} className="text-red-500" /> Delivery Address
                  </span>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">Delivery Area / Zone</label>
                    <select
                      value={delArea}
                      onChange={e => handleSelectArea(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white text-gray-900 focus:outline-none focus:border-emerald-500 font-medium"
                    >
                      {SYLHET_AREAS.map(a => (
                        <option key={a.name} value={a.name}>
                          {a.name} (৳{a.fee})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">
                      House / Flat / Road / Street Details <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={delAddress}
                      onChange={e => setDelAddress(e.target.value)}
                      placeholder="e.g. House 24, Road 5, Block C, 3rd Floor, near Amberkhana Point"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white text-gray-900 focus:outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">Delivery Fee (৳)</label>
                      <input
                        type="number"
                        min={0}
                        value={delFee}
                        onChange={e => setDelFee(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white text-gray-900 focus:outline-none focus:border-emerald-500 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">Payment Method</label>
                      <select
                        value={delPaymentMethod}
                        onChange={e => setDelPaymentMethod(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white text-gray-900 focus:outline-none focus:border-emerald-500 font-medium"
                      >
                        <option value="Cash on Delivery">Cash on Delivery (COD)</option>
                        <option value="bKash">bKash</option>
                        <option value="Nagad">Nagad</option>
                        <option value="Card">Card</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">Rider / Delivery Instructions</label>
                    <input
                      type="text"
                      value={delRiderNote}
                      onChange={e => setDelRiderNote(e.target.value)}
                      placeholder="e.g. Ring bell at main gate, extra sauce packet"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white text-gray-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Menu Item Picker & Ticket Cart (7 cols) */}
              <div className="lg:col-span-7 flex flex-col space-y-4">
                {/* Menu Search & Category Tabs */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={delMenuSearch}
                        onChange={e => setDelMenuSearch(e.target.value)}
                        placeholder="Search menu for pizza, burger, pasta..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs bg-white text-gray-900 focus:outline-none focus:border-emerald-500"
                      />
                      {delMenuSearch && (
                        <button onClick={() => setDelMenuSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {menuCategories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setDelCategory(cat)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                          delCategory === cat ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Menu Item Quick Picker (scrollable list) */}
                <div className="border border-gray-200 rounded-2xl p-2.5 bg-gray-50 max-h-[175px] overflow-y-auto">
                  {filteredPickerItems.length === 0 ? (
                    <div className="py-6 text-center text-xs text-gray-400">No menu items match your search.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {filteredPickerItems.slice(0, 20).map(item => (
                        <div
                          key={item.id}
                          onClick={() => addDeliveryItem(item)}
                          className="p-2 rounded-xl bg-white border border-gray-200 hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-900 truncate">{item.name}</p>
                            <p className="text-[10px] text-gray-400 truncate">{item.category}</p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="font-extrabold text-xs text-emerald-700">৳{item.price}</span>
                            <button
                              type="button"
                              className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors flex items-center justify-center font-bold text-xs"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Items / Cart */}
                <div className="flex-1 flex flex-col rounded-2xl border border-gray-200 p-3 bg-white space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <span className="text-xs font-bold text-gray-700">
                      Delivery Basket ({delSelectedItems.reduce((s, i) => s + i.quantity, 0)} items)
                    </span>
                    {delSelectedItems.length > 0 && (
                      <button
                        onClick={() => setDelSelectedItems([])}
                        className="text-[11px] font-bold text-red-600 hover:underline"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  <div className="flex-1 max-h-[160px] overflow-y-auto space-y-2 divide-y divide-gray-50">
                    {delSelectedItems.length === 0 ? (
                      <div className="py-8 text-center text-gray-400 text-xs">
                        No items selected yet. Tap any item above to add to this order.
                      </div>
                    ) : (
                      delSelectedItems.map(c => (
                        <div key={c.item.id} className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 truncate">{c.item.name}</p>
                            <p className="text-[10.5px] text-gray-400">৳{c.item.price} each</p>
                            <input
                              type="text"
                              value={c.note || ''}
                              onChange={e => updateDeliveryItemNote(c.item.id, e.target.value)}
                              placeholder="Special request / note for this item..."
                              className="mt-1 w-full text-[10.5px] px-2 py-0.5 rounded border border-gray-200 text-gray-600 bg-gray-50 focus:outline-none focus:border-emerald-400"
                            />
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                              <button
                                type="button"
                                onClick={() => updateDeliveryItemQty(c.item.id, -1)}
                                className="w-6 h-6 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold"
                              >
                                <Minus size={11} />
                              </button>
                              <span className="w-6 text-center font-extrabold text-xs text-gray-900">{c.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateDeliveryItemQty(c.item.id, 1)}
                                className="w-6 h-6 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold"
                              >
                                <Plus size={11} />
                              </button>
                            </div>
                            <span className="font-extrabold text-xs text-gray-900 w-12 text-right">
                              ৳{c.item.price * c.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeDeliveryItem(c.item.id)}
                              className="text-gray-400 hover:text-red-600 transition-colors p-1"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Price Calculation Summary */}
                  <div className="pt-2 border-t border-gray-100 space-y-1 text-xs">
                    <div className="flex justify-between text-gray-500">
                      <span>Items Subtotal</span>
                      <span>৳{delSubtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Delivery Charge ({delArea})</span>
                      <span>৳{Number(delFee || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm font-extrabold text-gray-900 pt-1 border-t border-gray-100">
                      <span>Grand Total to Collect</span>
                      <span className="text-emerald-700 text-base" style={{ fontFamily: 'var(--font-heading)' }}>
                        ৳{delGrandTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-gray-500">
                {delSelectedItems.length} items • Total: <strong className="text-gray-900">৳{delGrandTotal.toLocaleString()}</strong> ({delPaymentMethod})
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowTakeOrderModal(false)}
                  disabled={isSubmittingDelivery}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingDelivery}
                  onClick={() => handleCreateDeliveryOrder('Pending')}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 transition-colors"
                >
                  Save as Pending
                </button>
                <button
                  type="button"
                  disabled={isSubmittingDelivery}
                  onClick={() => handleCreateDeliveryOrder('Preparing')}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-md hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  style={{ background: 'linear-gradient(135deg, #16A34A, #15803D)', fontFamily: 'var(--font-heading)' }}
                >
                  <CheckCircle2 size={14} />
                  {isSubmittingDelivery ? 'Placing Order...' : 'Confirm & Send to Kitchen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.title}
        message={deleteConfirm.message}
        onConfirm={deleteConfirm.onConfirm}
        onCancel={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KANBAN ORDER CARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
interface OrderCardProps {
  order: Order;
  timeAgo: string;
  onView: () => void;
  onPrint: () => void;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onDelete: (id: string) => void;
  adminRole: string;
  setDeleteConfirm: React.Dispatch<React.SetStateAction<any>>;
}

function OrderCard({
  order,
  timeAgo,
  onView,
  onPrint,
  onUpdateStatus,
  onDelete,
  adminRole,
  setDeleteConfirm
}: OrderCardProps) {
  const isPending = order.status === 'Pending';
  const isPreparing = order.status === 'Preparing';
  const isDelivery = order.status === 'Out for Delivery';

  return (
    <div className={`bg-white rounded-xl p-3.5 border transition-all hover:shadow-md ${
      isPending ? 'border-amber-300 shadow-xs' : 'border-gray-200/80 shadow-2xs'
    }`}>
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-100">
        <div>
          <span className="font-mono font-black text-red-600 text-xs">
            #{order.orderNumber || order.id.slice(-6)}
          </span>
          <span className="text-[10px] text-gray-400 block">{timeAgo}</span>
        </div>
        <div className="text-right">
          <span className="font-black text-gray-900 text-sm" style={{ fontFamily: 'var(--font-heading)' }}>
            ৳{(order.total || 0).toLocaleString()}
          </span>
          <span className="text-[10px] text-gray-400 font-semibold block">{order.paymentMethod}</span>
        </div>
      </div>

      {/* Customer Info */}
      <div className="py-2 space-y-1">
        <div className="font-extrabold text-xs text-gray-900">{order.customerName}</div>
        <div className="flex items-center justify-between text-[11px]">
          <a
            href={`tel:${order.phone}`}
            className="inline-flex items-center gap-1 text-blue-600 font-bold hover:underline"
          >
            <Phone size={11} /> {order.phone}
          </a>
          <span className="text-gray-400">{order.items.length} items</span>
        </div>
        <div className="flex items-start gap-1 text-[11px] text-gray-500 line-clamp-2">
          <MapPin size={11} className="text-red-500 flex-shrink-0 mt-0.5" />
          <span>{order.address || 'Takeaway'}</span>
        </div>
      </div>

      {/* Items Preview */}
      <div className="py-1.5 px-2 rounded-lg bg-gray-50 text-[10px] text-gray-600 font-medium line-clamp-2 mb-2">
        {order.items.map(i => `${i.quantity}x ${i.item?.name || 'Item'}`).join(', ')}
      </div>

      {/* Action Buttons */}
      <div className="pt-2 border-t border-gray-100 space-y-1.5">
        {/* Fast Phase Transition */}
        {isPending && (
          <button
            onClick={() => onUpdateStatus(order.id, 'Preparing')}
            className="w-full py-1.5 rounded-lg text-xs font-bold text-white shadow-xs transition-transform active:scale-95 flex items-center justify-center gap-1.5"
            style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}
          >
            <ChefHat size={13} /> Accept & Start Cooking
          </button>
        )}

        {isPreparing && (
          <button
            onClick={() => onUpdateStatus(order.id, 'Out for Delivery')}
            className="w-full py-1.5 rounded-lg text-xs font-bold text-white shadow-xs transition-transform active:scale-95 flex items-center justify-center gap-1.5"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}
          >
            <Truck size={13} /> Dispatch to Rider
          </button>
        )}

        {isDelivery && (
          <button
            onClick={() => onUpdateStatus(order.id, 'Delivered')}
            className="w-full py-1.5 rounded-lg text-xs font-bold text-white shadow-xs transition-transform active:scale-95 flex items-center justify-center gap-1.5"
            style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
          >
            <CheckCircle2 size={13} /> Mark Delivered & Paid
          </button>
        )}

        {/* Secondary Actions */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            <button
              onClick={onPrint}
              title="Print Receipt"
              className="p-1.5 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <Printer size={12} />
            </button>
            <button
              onClick={onView}
              title="View Details"
              className="p-1.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
            >
              <Eye size={12} />
            </button>
          </div>

          {adminRole === 'admin' && (
            <button
              onClick={() => setDeleteConfirm({
                isOpen: true,
                title: 'Delete Online Order?',
                message: `Permanently delete order #${order.orderNumber || order.id.slice(-6)}?`,
                onConfirm: () => onDelete(order.id)
              })}
              title="Delete Order"
              className="p-1.5 rounded-md bg-gray-100 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
