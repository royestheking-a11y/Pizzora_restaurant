import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Minus, X, Save, Trash2, QrCode, Download, Users, Clock, CheckCircle,
  ChefHat, Bell, Utensils, RefreshCw, ExternalLink, Eye,
  FileText, Printer, Crown, Leaf, CookingPot, CircleDot,
  Receipt, StickyNote, TableProperties, Wifi, ArrowRight, Zap,
  Search, CreditCard, Smartphone, Banknote,
  Tag, Percent, CheckCircle2, AlertTriangle, PrinterCheck, Split,
  MoveRight, Sparkles, Phone, User, Flame, LayoutGrid, ArrowLeft, MousePointerClick, Edit2
} from 'lucide-react';
import {
  useApp,
  RestaurantTable,
  TableArea,
  TableStatus,
  TableOrderStatus,
  TableOrder,
  TableOrderItem,
  MenuItem,
  SplitPaymentItem,
} from '../../context/AppContext';
import { AdminStatSkeleton } from '../Skeletons';
import { ConfirmModal } from '../ConfirmModal';
import {
  printerService,
  generateInvoiceNumber,
  loadPrinterSettings,
  type InvoiceData,
} from '../../utils/printerService';
import { optimizeCloudinaryUrl } from '../../utils/image';

// ─── Status Config ────────────────────────────────────────────────────────────
const statusConfig: Record<TableStatus, { label: string; bg: string; text: string; border: string; dot: string; icon: typeof CircleDot }> = {
  Available: { label: 'Available', bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0', dot: '#16A34A', icon: CheckCircle },
  Ordering:  { label: 'Ordering',  bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', dot: '#2563EB', icon: Utensils },
  Cooking:   { label: 'Cooking',   bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA', dot: '#EA580C', icon: CookingPot },
  Ready:     { label: 'Ready',     bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA', dot: '#DC2626', icon: Bell },
  Served:    { label: 'Served',    bg: '#FAF5FF', text: '#6B21A8', border: '#E9D5FF', dot: '#9333EA', icon: ChefHat },
  Paid:      { label: 'Bill Paid', bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB', dot: '#9CA3AF', icon: Receipt },
};

const areas: TableArea[] = ['Dining', 'VIP', 'Outdoor'];

const areaConfig: Record<TableArea, { color: string; bg: string; borderColor: string; Icon: typeof Utensils; label: string }> = {
  Dining:  { color: '#F9002B', bg: '#FFF5F5', borderColor: 'rgba(249,0,43,0.12)', Icon: Utensils,  label: 'Dining Area' },
  VIP:     { color: '#EA580C', bg: '#FFF7ED', borderColor: 'rgba(234,88,12,0.12)', Icon: Crown,     label: 'VIP Lounge' },
  Outdoor: { color: '#0284C7', bg: '#F0F9FF', borderColor: 'rgba(2,132,199,0.12)',  Icon: Leaf,      label: 'Outdoor Terrace' },
};

const orderStatusNext: Partial<Record<TableOrderStatus, TableOrderStatus>> = {
  Pending: 'Confirmed', Confirmed: 'Cooking', Cooking: 'Ready', Ready: 'Served', Served: 'Paid',
};
const orderStatusLabel: Partial<Record<TableOrderStatus, string>> = {
  Pending: 'Confirm Order', Confirmed: 'Start Cooking', Cooking: 'Mark Ready', Ready: 'Mark Served', Served: 'Mark Paid',
};
const orderStatusIcon: Partial<Record<TableOrderStatus, typeof CheckCircle>> = {
  Pending: Zap, Confirmed: CookingPot, Cooking: Bell, Ready: ChefHat, Served: Receipt,
};

type PaymentMethod = 'Cash' | 'Card' | 'bKash' | 'Nagad' | 'Split';
type DiscountType = 'flat' | 'percent';

interface TableDraftSession {
  items: TableOrderItem[];
  discountVal: string;
  discountType: DiscountType;
  customerNote: string;
  customerName: string;
  customerPhone: string;
  guestCount: number;
}

function ElapsedTime({ since }: { since: number }) {
  const [elapsed, setElapsed] = useState(Math.floor((Date.now() - since) / 1000));
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - since) / 1000)), 1000);
    return () => clearInterval(id);
  }, [since]);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return (
    <span style={{ color: m >= 25 ? '#DC2626' : undefined, fontWeight: m >= 25 ? 800 : 700 }}>
      {m}m {String(s).padStart(2, '0')}s
    </span>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: '10px',
  border: '1.5px solid rgba(249,0,43,0.18)', fontSize: '13px',
  fontFamily: 'var(--font-body)', outline: 'none', color: '#111', backgroundColor: '#fff',
};
const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-heading)', fontSize: '11px', fontWeight: 700, color: '#374151',
  display: 'block', marginBottom: '5px', textTransform: 'uppercase' as const, letterSpacing: '0.5px',
};

// ─── Add/Edit Table Modal ─────────────────────────────────────────────────────
function TableModal({
  title, form, setForm, onSave, onClose,
}: {
  title: string;
  form: { tableNumber: string; seats: string; area: TableArea };
  setForm: React.Dispatch<React.SetStateAction<{ tableNumber: string; seats: string; area: TableArea }>>;
  onSave: () => void;
  onClose: () => void;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgba(249,0,43,0.12)', background: 'linear-gradient(135deg, #1A0000, #C8001F)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <TableProperties size={18} className="text-white" />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '17px', color: '#fff' }}>{title}</h2>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Configure restaurant table</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors text-white/80">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label style={labelStyle}>Table Number *</label>
            <input
              type="text" value={form.tableNumber}
              onChange={e => setForm(f => ({ ...f, tableNumber: e.target.value.toUpperCase() }))}
              placeholder="e.g. T07, V03, O03" style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Seats Capacity *</label>
            <input
              type="number" min={1} max={20} value={form.seats}
              onChange={e => setForm(f => ({ ...f, seats: e.target.value }))}
              placeholder="Number of seats" style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Restaurant Area *</label>
            <div className="grid grid-cols-3 gap-2">
              {areas.map(a => {
                const cfg = areaConfig[a];
                const isActive = form.area === a;
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, area: a }))}
                    className="flex flex-col items-center gap-2 py-3 rounded-2xl transition-all"
                    style={{
                      backgroundColor: isActive ? cfg.bg : '#F9FAFB',
                      border: `2px solid ${isActive ? cfg.color : '#E5E7EB'}`,
                    }}
                  >
                    <cfg.Icon size={16} style={{ color: isActive ? cfg.color : '#9CA3AF' }} />
                    <span style={{ fontSize: '11px', fontWeight: 700, color: isActive ? cfg.color : '#9CA3AF', fontFamily: 'var(--font-heading)' }}>{a}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t" style={{ borderColor: 'rgba(249,0,43,0.08)' }}>
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-all" style={{ border: '1.5px solid rgba(249,0,43,0.15)', color: '#374151', fontFamily: 'var(--font-heading)' }}>
            Cancel
          </button>
          <button onClick={onSave} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)' }}>
            <Save size={14} className="inline mr-2" /> Save Table
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── QR Modal ─────────────────────────────────────────────────────────────────
function QRModal({ table, onClose }: { table: RestaurantTable; onClose: () => void }) {
  const tableUrl = `${window.location.origin}/table/${table.id}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(tableUrl)}`;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = qrSrc;
    a.download = `QR-Table-${table.tableNumber}.png`;
    a.target = '_blank';
    a.click();
  };

  const areaCfg = areaConfig[table.area];

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
        <div className="px-6 py-5" style={{ background: 'linear-gradient(135deg, #1A0000, #C8001F)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(249,0,43,0.2)', border: '1px solid rgba(249,0,43,0.3)' }}>
                <QrCode size={16} style={{ color: '#F9002B' }} />
              </div>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '15px', color: '#fff' }}>Digital Menu QR</span>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <X size={14} style={{ color: 'rgba(255,255,255,0.7)' }} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold" style={{ background: '#fff', color: '#F9002B' }}>
              {table.tableNumber}
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '20px', color: '#fff', lineHeight: 1 }}>Table {table.tableNumber}</p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginTop: '3px' }}>
                <areaCfg.Icon size={11} style={{ display: 'inline', marginRight: '4px' }} />
                {table.area} Area · {table.seats} Seats
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center px-6 py-6">
          <div className="p-3 rounded-2xl shadow-lg mb-4 bg-white" style={{ border: '3px solid #F9002B' }}>
            <img src={qrSrc} alt={`QR for Table ${table.tableNumber}`} className="w-52 h-52" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Wifi size={13} style={{ color: '#16A34A' }} />
            <p style={{ fontSize: '12px', color: '#16A34A', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
              Guests can scan & self-order instantly
            </p>
          </div>
          <p className="text-center px-3 py-2 rounded-xl break-all w-full select-all" style={{ fontSize: '10px', color: '#F9002B', backgroundColor: '#FFF5F5', fontFamily: 'monospace', border: '1px solid rgba(249,0,43,0.15)' }}>
            {tableUrl}
          </p>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={() => window.open(tableUrl, '_blank')}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all hover:bg-red-50"
            style={{ border: '1.5px solid rgba(249,0,43,0.2)', color: '#F9002B', fontFamily: 'var(--font-heading)' }}
          >
            <ExternalLink size={14} /> Preview
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)' }}
          >
            <Download size={14} /> Download
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Transfer Table Modal ─────────────────────────────────────────────────────
function TransferTableModal({
  currentTable,
  tables,
  onTransfer,
  onClose,
}: {
  currentTable: RestaurantTable;
  tables: RestaurantTable[];
  onTransfer: (targetTableId: string) => void;
  onClose: () => void;
}) {
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const availableTables = tables.filter(t => t.id !== currentTable.id && t.status === 'Available');

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
        <div className="p-5 flex items-center justify-between border-b" style={{ borderColor: 'rgba(249,0,43,0.12)', background: 'linear-gradient(135deg, #1A0000, #C8001F)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20 text-white">
              <MoveRight size={20} />
            </div>
            <div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '17px', color: '#fff' }}>Transfer Table</h3>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>Move Table {currentTable.tableNumber} ticket to another table</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p style={{ fontSize: '13px', color: '#4B5563' }}>
            Select an available table to migrate this running order, customer details, and timer:
          </p>
          {availableTables.length === 0 ? (
            <div className="p-4 rounded-2xl bg-amber-50 text-amber-800 text-sm border border-amber-200">
              No other available tables at this moment. You can add a new table from the floor toolbar.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 max-h-64 overflow-y-auto p-1">
              {availableTables.map(t => {
                const isPicked = selectedTarget === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTarget(t.id)}
                    className="p-3 rounded-2xl border text-left transition-all flex items-center justify-between"
                    style={{
                      borderColor: isPicked ? '#F9002B' : '#E5E7EB',
                      backgroundColor: isPicked ? '#FFF5F5' : '#FAFAFA',
                    }}
                  >
                    <div>
                      <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '15px', color: '#111' }}>
                        Table {t.tableNumber}
                      </p>
                      <p style={{ fontSize: '11px', color: '#6B7280' }}>
                        {t.area} · {t.seats} seats
                      </p>
                    </div>
                    {isPicked && <CheckCircle2 size={18} className="text-red-600" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="p-5 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border text-sm font-semibold text-gray-700 hover:bg-gray-100">
            Cancel
          </button>
          <button
            onClick={() => {
              if (selectedTarget) {
                onTransfer(selectedTarget);
                onClose();
              }
            }}
            disabled={!selectedTarget}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:shadow-lg"
            style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)' }}
          >
            Confirm Move
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Complete Payment & Invoice Modal ─────────────────────────────────────────
function TablePaymentModal({
  table,
  activeOrder,
  draftItems,
  discountVal,
  discountType,
  customerName,
  customerPhone,
  guestCount,
  onComplete,
  onClose,
}: {
  table: RestaurantTable;
  activeOrder: TableOrder | null;
  draftItems: TableOrderItem[];
  discountVal: string;
  discountType: DiscountType;
  customerName: string;
  customerPhone: string;
  guestCount: number;
  onComplete: () => void;
  onClose: () => void;
}) {
  const { state, dispatch, showNotification } = useApp();

  // Combine confirmed items and any draft items
  const combinedItems: TableOrderItem[] = useMemo(() => {
    const list: TableOrderItem[] = [...(activeOrder?.items || [])];
    draftItems.forEach(d => {
      const ex = list.find(x => x.itemId === d.itemId && x.note === d.note);
      if (ex) {
        ex.quantity += d.quantity;
      } else {
        list.push({ ...d });
      }
    });
    return list;
  }, [activeOrder, draftItems]);

  const subtotal = useMemo(() => {
    return combinedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [combinedItems]);

  const discountAmount = useMemo(() => {
    if (!discountVal) return 0;
    const val = Number(discountVal) || 0;
    if (discountType === 'percent') {
      return (subtotal * val) / 100;
    }
    return Math.min(subtotal, val);
  }, [subtotal, discountVal, discountType]);

  const total = Math.max(0, subtotal - discountAmount);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [splitAmounts, setSplitAmounts] = useState<{ Cash: string; bKash: string; Nagad: string; Card: string }>({
    Cash: '', bKash: '', Nagad: '', Card: ''
  });
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [printFeedback, setPrintFeedback] = useState<string | null>(null);

  useEffect(() => {
    generateInvoiceNumber().then(setInvoiceNumber).catch(() => {
      setInvoiceNumber(`PIZ-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`);
    });
  }, []);

  const change = useMemo(() => {
    if (paymentMethod !== 'Cash' || !cashTendered) return 0;
    const tendered = Number(cashTendered) || 0;
    return Math.max(0, tendered - total);
  }, [paymentMethod, cashTendered, total]);

  const splitTotal = useMemo(() => {
    return (
      (parseFloat(splitAmounts.Cash) || 0) +
      (parseFloat(splitAmounts.bKash) || 0) +
      (parseFloat(splitAmounts.Nagad) || 0) +
      (parseFloat(splitAmounts.Card) || 0)
    );
  }, [splitAmounts]);

  const splitRemaining = Math.max(0, total - splitTotal);

  const handleProcessPayment = async (shouldAutoPrint: boolean = true) => {
    if (combinedItems.length === 0) {
      showNotification('Cannot settle empty order.', 'error');
      return;
    }

    if (paymentMethod === 'Split' && splitTotal < total) {
      alert(`Split payment not balanced! Remaining due: ৳${splitRemaining.toFixed(2)}`);
      return;
    }

    setIsProcessing(true);
    const cashierName = sessionStorage.getItem('pizzora_admin_name') || 'Manager';
    const invNum = invoiceNumber || `PIZ-${Date.now().toString().slice(-6)}`;
    const finalCustomerName = customerName.trim() || `Table ${table.tableNumber} Guest`;

    const activeSplitPayments: SplitPaymentItem[] = paymentMethod === 'Split' ? [
      ...(parseFloat(splitAmounts.Cash) > 0 ? [{ method: 'Cash' as const, amount: parseFloat(splitAmounts.Cash) }] : []),
      ...(parseFloat(splitAmounts.bKash) > 0 ? [{ method: 'bKash' as const, amount: parseFloat(splitAmounts.bKash) }] : []),
      ...(parseFloat(splitAmounts.Nagad) > 0 ? [{ method: 'Nagad' as const, amount: parseFloat(splitAmounts.Nagad) }] : []),
      ...(parseFloat(splitAmounts.Card) > 0 ? [{ method: 'Card' as const, amount: parseFloat(splitAmounts.Card) }] : []),
    ] : [];

    // 1. Construct final formal Order for master sales database
    const finalOrder = {
      id: `PZ-TABLE-${Date.now()}`,
      items: combinedItems.map(c => {
        const found = state.menuItems.find(m => m.id === c.itemId);
        const itemObj: MenuItem = found || {
          id: c.itemId,
          name: c.name,
          slug: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          price: c.price,
          category: 'Dine-In',
          image: c.image || '',
          description: '',
          ingredients: [],
          nutrition: { calories: 0, protein: '0g', carbs: '0g', fat: '0g' },
          rating: 5,
          reviewCount: 0,
          spiceLevel: 'Mild' as const,
          isVeg: false,
          isSpicy: false,
          isPopular: false,
          prepTime: '15 min',
          serves: '1 Person',
        };
        return {
          item: itemObj,
          quantity: c.quantity,
          specialRequest: c.note || '',
        };
      }),
      subtotal,
      discount: discountAmount,
      total,
      status: 'Delivered' as const,
      paymentMethod,
      splitPayments: activeSplitPayments.length > 0 ? activeSplitPayments : undefined,
      customerName: finalCustomerName,
      phone: customerPhone || '',
      address: `Dine In — Table ${table.tableNumber} (${table.area})`,
      createdAt: new Date().toISOString(),
      estimatedTime: 'Completed',
      orderNumber: invNum,
    };

    // Save into restaurant orders and cash registers
    dispatch({ type: 'PLACE_ORDER', payload: finalOrder });

    // Mark table order as Paid if order exists
    if (activeOrder) {
      dispatch({
        type: 'UPDATE_TABLE_ORDER',
        payload: {
          ...activeOrder,
          items: combinedItems,
          subtotal,
          discount: discountAmount,
          total,
          status: 'Paid',
          customerName: finalCustomerName,
          customerPhone,
          guestCount,
          invoiceNumber: invNum,
          paymentMethod,
          splitPayments: activeSplitPayments.length > 0 ? activeSplitPayments : undefined,
        }
      });
      dispatch({ type: 'UPDATE_TABLE_ORDER_STATUS', payload: { id: activeOrder.id, status: 'Paid' } });
    }

    // Prepare Invoice Data for Thermal Printer
    const invoiceData: InvoiceData = {
      invoiceNumber: invNum,
      orderId: finalOrder.id,
      orderType: `Dine In - Table ${table.tableNumber}`,
      tableNo: table.tableNumber,
      customerName: finalCustomerName,
      cashierName,
      dateTime: new Date().toLocaleString(),
      items: combinedItems.map(c => ({
        name: c.name,
        quantity: c.quantity,
        price: c.price,
        note: c.note,
      })),
      subtotal,
      discount: discountAmount,
      total,
      paymentMethod,
      splitPayments: activeSplitPayments.length > 0 ? activeSplitPayments.map(p => ({ method: p.method, amount: p.amount })) : undefined,
      amountPaid: paymentMethod === 'Cash' ? (Number(cashTendered) || total) : total,
      change: paymentMethod === 'Cash' ? change : 0,
    };

    const settings = loadPrinterSettings();

    // Auto-open cash drawer if cash was tendered
    const hasCash = paymentMethod === 'Cash' || (paymentMethod === 'Split' && parseFloat(splitAmounts.Cash) > 0);
    if (hasCash && settings.autoOpenDrawer && settings.printMode === 'qz') {
      try {
        await printerService.openCashDrawer(settings);
      } catch (e) {
        console.warn('Cash drawer pulse error', e);
      }
    }

    // Print Receipt
    if (shouldAutoPrint) {
      try {
        const printRes = await printerService.printReceipt(invoiceData, settings);
        if (!printRes.success) {
          setPrintFeedback(printRes.error || 'Print window blocked');
        }
      } catch (err: any) {
        setPrintFeedback(err.message || 'Printing failed');
      }
    }

    // Automatically free table
    dispatch({
      type: 'SET_TABLE_STATUS',
      payload: {
        id: table.id,
        status: 'Available',
        currentOrderId: undefined,
        occupiedSince: undefined,
        customerName: '',
        customerPhone: '',
        guestCount: undefined,
      }
    });

    showNotification(`Table ${table.tableNumber} payment settled & table cleared for new guests!`, 'success');
    setIsProcessing(false);
    onComplete();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(5px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden my-6 animate-scale-in">
        {/* Header */}
        <div className="p-6 text-white" style={{ background: 'linear-gradient(135deg, #1A0000, #C8001F)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Receipt size={20} className="text-red-400" />
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '18px' }}>
                Settle & Print Invoice
              </span>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10 hover:bg-white/20">
              <X size={16} />
            </button>
          </div>
          <div className="flex items-center justify-between text-xs text-white/80 mt-1">
            <span>Table {table.tableNumber} • {table.area}</span>
            <span>Invoice #{invoiceNumber || 'Generating...'}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
          {/* Customer Summary */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs">
            <div>
              <span className="font-bold text-gray-700 block text-sm">
                👤 {customerName.trim() || 'Walk-in Guest'}
              </span>
              <span className="text-gray-500">{customerPhone || 'No phone'} · 👥 {guestCount} Guests</span>
            </div>
            <div className="text-right">
              <span className="text-gray-400 text-[10px] block uppercase font-bold">Total Items</span>
              <span className="font-extrabold text-sm text-gray-800">{combinedItems.length} items</span>
            </div>
          </div>

          {/* Items Preview */}
          <div className="border border-gray-100 rounded-2xl p-3 bg-gray-50/50 space-y-2 max-h-44 overflow-y-auto text-xs">
            {combinedItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-1 border-b border-gray-200/50 last:border-none">
                <span className="font-medium text-gray-800">
                  <strong className="text-red-600 font-bold mr-1.5">{item.quantity}×</strong> {item.name}
                </span>
                <span className="font-bold text-gray-700">৳{item.price * item.quantity}</span>
              </div>
            ))}
          </div>

          {/* Totals Summary */}
          <div className="bg-red-50/40 p-4 rounded-2xl border border-red-100 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="font-bold">৳{subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Discount ({discountType === 'percent' ? `${discountVal}%` : `৳${discountVal}`}):</span>
                <span className="font-bold">-৳{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-black pt-2 border-t border-red-200 text-red-600" style={{ fontFamily: 'var(--font-heading)' }}>
              <span>Total Payable:</span>
              <span>৳{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label style={labelStyle}>Select Payment Method</label>
            <div className="grid grid-cols-5 gap-2 mt-1">
              {(['Cash', 'Card', 'bKash', 'Nagad', 'Split'] as PaymentMethod[]).map(pm => {
                const isSelected = paymentMethod === pm;
                return (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => setPaymentMethod(pm)}
                    className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl text-xs font-bold transition-all"
                    style={{
                      backgroundColor: isSelected ? '#F9002B' : '#F3F4F6',
                      color: isSelected ? '#fff' : '#4B5563',
                      border: `1.5px solid ${isSelected ? '#F9002B' : '#E5E7EB'}`,
                      fontFamily: 'var(--font-heading)'
                    }}
                  >
                    {pm === 'Cash' && <Banknote size={15} className="mb-1" />}
                    {pm === 'Card' && <CreditCard size={15} className="mb-1" />}
                    {pm === 'bKash' && <Smartphone size={15} className="mb-1" />}
                    {pm === 'Nagad' && <Smartphone size={15} className="mb-1" />}
                    {pm === 'Split' && <Split size={15} className="mb-1" />}
                    <span>{pm}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash Tendered Input */}
          {paymentMethod === 'Cash' && (
            <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200 space-y-3">
              <div>
                <label style={labelStyle}>Cash Tendered by Customer (৳)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={cashTendered}
                    onChange={e => setCashTendered(e.target.value)}
                    placeholder={`e.g. ${total}`}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-amber-300 font-bold text-base outline-none focus:ring-2 focus:ring-red-400 bg-white"
                  />
                  <span className="absolute left-3 top-2.5 font-bold text-gray-500">৳</span>
                </div>
              </div>
              <div className="flex gap-2">
                {[total, total + 50, Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500].filter((v, i, a) => a.indexOf(v) === i && v >= total).map(quickAmt => (
                  <button
                    key={quickAmt}
                    type="button"
                    onClick={() => setCashTendered(String(quickAmt))}
                    className="flex-1 py-1 rounded-lg bg-white border border-amber-200 text-xs font-bold text-gray-700 hover:bg-amber-100"
                  >
                    ৳{quickAmt}
                  </button>
                ))}
              </div>
              {Number(cashTendered) > 0 && (
                <div className="flex justify-between items-center pt-2 border-t border-amber-200 text-sm">
                  <span className="font-semibold text-gray-700">Change Due:</span>
                  <span className="text-base font-black text-green-700">৳{change.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Split Payment Inputs */}
          {paymentMethod === 'Split' && (
            <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-200 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-1 border-b border-purple-200/70">
                <span className="font-bold text-purple-900" style={{ fontFamily: 'var(--font-heading)' }}>
                  Divide Payment (৳{total.toFixed(2)})
                </span>
                <span className={splitRemaining === 0 ? 'text-green-700 font-extrabold flex items-center gap-1' : 'text-red-600 font-extrabold'}>
                  {splitRemaining === 0 ? '✓ Balanced' : `Due: ৳${splitRemaining.toFixed(2)}`}
                </span>
              </div>
              <div className="space-y-2">
                {([
                  { key: 'bKash' as const, label: 'bKash', color: '#E2136E', bg: '#FDF2F8' },
                  { key: 'Nagad' as const, label: 'Nagad', color: '#F7941D', bg: '#FFF7ED' },
                  { key: 'Cash' as const, label: 'Cash', color: '#16A34A', bg: '#F0FDF4' },
                  { key: 'Card' as const, label: 'Card', color: '#0284C7', bg: '#F0F9FF' },
                ]).map(({ key, label, color, bg }) => {
                  const other = splitTotal - (parseFloat(splitAmounts[key]) || 0);
                  const rem = Math.max(0, total - other);

                  return (
                    <div key={key} className="flex items-center gap-2">
                      <span className="w-14 text-xs font-bold" style={{ color, fontFamily: 'var(--font-heading)' }}>
                        {label}
                      </span>
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">৳</span>
                        <input
                          type="number"
                          min="0"
                          value={splitAmounts[key]}
                          onChange={e => setSplitAmounts(prev => ({ ...prev, [key]: e.target.value }))}
                          placeholder="0"
                          className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-gray-200 text-xs font-bold bg-white outline-none focus:border-purple-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setSplitAmounts(prev => ({ ...prev, [key]: rem ? String(rem) : '' }))}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors hover:opacity-80 active:scale-95 shadow-sm"
                        style={{ backgroundColor: bg, color, border: `1px solid ${color}40` }}
                        title={`Fill remaining balance to ${label}`}
                      >
                        Fill
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-purple-200/60 text-[11px]">
                <span className="text-gray-600">
                  Entered: <strong>৳{splitTotal.toFixed(2)}</strong> of ৳{total.toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => setSplitAmounts({ Cash: '', bKash: '', Nagad: '', Card: '' })}
                  className="text-gray-500 hover:text-red-600 font-bold"
                >
                  Clear All
                </button>
              </div>
            </div>
          )}

          {printFeedback && (
            <div className="p-3 rounded-xl bg-amber-50 text-amber-800 text-xs flex items-center gap-2 border border-amber-200">
              <AlertTriangle size={15} />
              <span>{printFeedback}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 py-3 rounded-xl border border-gray-300 font-bold text-xs text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={() => handleProcessPayment(true)}
            disabled={isProcessing}
            className="flex-[2] py-3.5 rounded-xl font-bold text-xs text-white shadow-lg transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #16A34A, #15803D)', fontFamily: 'var(--font-heading)' }}
          >
            <Printer size={16} />
            {isProcessing ? 'Processing...' : 'Print Receipt & Clear Table'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Table Card (Floor Grid) ──────────────────────────────────────────────────
function TableCard({
  table,
  isSelected,
  onOpenPOS,
  onQuickView,
  onEdit,
  onDelete,
}: {
  table: RestaurantTable;
  isSelected: boolean;
  onOpenPOS: () => void;
  onQuickView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cfg = statusConfig[table.status];
  const StatusIcon = cfg.icon;
  const currentOrder = (useApp().state.tableOrders ?? []).find(
    o => o.id === table.currentOrderId && !['Paid'].includes(o.status)
  );

  const isOccupied = table.status !== 'Available';

  return (
    <div
      onClick={onOpenPOS}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenPOS();
        }
      }}
      className="relative rounded-3xl transition-all duration-200 text-left w-full group overflow-hidden bg-white flex flex-col justify-between cursor-pointer hover:-translate-y-1.5 hover:shadow-2xl active:scale-[0.985] focus:outline-none focus:ring-2 focus:ring-red-500 select-none"
      style={{
        border: `2px solid ${isSelected ? '#F9002B' : isOccupied ? 'rgba(249,0,43,0.35)' : '#E5E7EB'}`,
        boxShadow: isSelected
          ? '0 16px 36px rgba(249,0,43,0.22)'
          : isOccupied
          ? '0 8px 24px rgba(249,0,43,0.08)'
          : '0 4px 16px rgba(0,0,0,0.03)',
      }}
    >
      {/* Status top accent bar */}
      <div className="h-2.5 w-full transition-all group-hover:h-3.5" style={{ backgroundColor: cfg.dot }} />

      <div className="p-5 flex-1 flex flex-col justify-between">
        {/* Top: Table Number and Status */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3
                style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '22px', color: '#111', letterSpacing: '-0.5px' }}
                className="group-hover:text-red-600 transition-colors"
              >
                Table {table.tableNumber}
              </h3>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ backgroundColor: `${areaConfig[table.area].color}15`, color: areaConfig[table.area].color }}>
                {table.area}
              </span>
            </div>
            <p className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 font-medium">
              <Users size={13} /> {table.seats} Seats
              {table.guestCount ? ` · 👥 ${table.guestCount} guests` : ''}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full shadow-sm text-xs" style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}>
              <StatusIcon size={12} style={{ color: cfg.dot }} />
              <span style={{ fontSize: '11px', fontWeight: 800, color: cfg.text, fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>
                {cfg.label}
              </span>
            </div>
            <span className="text-[10px] font-bold text-red-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
              Open POS ➜
            </span>
          </div>
        </div>

        {/* Middle: Customer / Active Order summary */}
        {isOccupied ? (
          <div className="my-3 p-3 rounded-2xl bg-gray-50/80 border border-gray-100 group-hover:bg-red-50/30 group-hover:border-red-100 transition-colors space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-700 truncate max-w-[140px]">
                👤 {table.customerName || 'Dine-In Customer'}
              </span>
              {table.occupiedSince && (
                <span className="flex items-center gap-1 text-[11px] text-gray-500 font-semibold">
                  <Clock size={11} />
                  <ElapsedTime since={table.occupiedSince} />
                </span>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-dashed border-gray-200">
              <span className="text-[11px] text-gray-500 font-medium">
                {currentOrder ? `${currentOrder.items.length} items ordered` : 'Active table ticket'}
              </span>
              <span className="text-base font-extrabold text-red-600" style={{ fontFamily: 'var(--font-heading)' }}>
                ৳{currentOrder?.total || 0}
              </span>
            </div>
          </div>
        ) : (
          <div className="my-4 py-5 text-center rounded-2xl border border-dashed border-gray-200 bg-emerald-50/20 group-hover:bg-emerald-50/60 group-hover:border-emerald-300 transition-colors">
            <CheckCircle2 size={22} className="text-emerald-500 mx-auto mb-1 opacity-70 group-hover:scale-110 transition-transform" />
            <p className="text-xs text-emerald-800 font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Table Ready</p>
            <p className="text-[10px] text-gray-400 group-hover:text-emerald-700 transition-colors">Click anywhere to seat guests & open POS</p>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenPOS();
            }}
            className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-white transition-all shadow-sm group-hover:shadow-md flex items-center justify-center gap-1.5 active:scale-95"
            style={{
              background: isOccupied
                ? 'linear-gradient(135deg, #F9002B, #C8001F)'
                : 'linear-gradient(135deg, #16A34A, #15803D)',
              fontFamily: 'var(--font-heading)',
            }}
          >
            <Utensils size={13} />
            {isOccupied ? 'Manage POS' : 'Seat & POS'}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickView();
            }}
            className="w-9 h-9 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all flex items-center justify-center hover:text-black flex-shrink-0"
            title="Quick Details & QR"
          >
            <Eye size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="w-9 h-9 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-all flex items-center justify-center flex-shrink-0"
            title="Edit Table (Name, Capacity, Zone)"
          >
            <Edit2 size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="w-9 h-9 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-all flex items-center justify-center flex-shrink-0"
            title="Delete Table"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main TableManagement Component ──────────────────────────────────────────
export function TableManagement() {
  const {
    state,
    dispatch,
    showNotification,
    updateTableOrderStatus,
  } = useApp();

  const tables = state.tables ?? [];
  const tableOrders = state.tableOrders ?? [];
  const menuItems = state.menuItems ?? [];

  // Active View: 'floor' layout or dedicated 'pos' terminal
  const [viewMode, setViewMode] = useState<'floor' | 'pos'>('floor');
  const [selectedTableId, setSelectedTableId] = useState<string>(tables[0]?.id || 'T01');
  const [areaFilter, setAreaFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [tableForm, setTableForm] = useState<{ tableNumber: string; seats: string; area: TableArea }>({
    tableNumber: '', seats: '4', area: 'Dining',
  });

  // Modals
  const [qrModalTable, setQrModalTable] = useState<RestaurantTable | null>(null);
  const [transferModalTable, setTransferModalTable] = useState<RestaurantTable | null>(null);
  const [paymentModalTable, setPaymentModalTable] = useState<RestaurantTable | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({
    isOpen: false, title: '', message: '', onConfirm: () => {}
  });

  // Multi-Table Draft Sessions (keeps independent unconfirmed carts per table in memory)
  const [tableDrafts, setTableDrafts] = useState<Record<string, TableDraftSession>>(() => {
    try {
      const saved = localStorage.getItem('pizzora_table_pos_drafts');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('pizzora_table_pos_drafts', JSON.stringify(tableDrafts));
  }, [tableDrafts]);

  // Menu Explorer in POS mode
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Right Panel POS Payment state (same as POS terminal)
  const [panelPaymentMethod, setPanelPaymentMethod] = useState<PaymentMethod>('Cash');
  const [panelCashTendered, setPanelCashTendered] = useState<string>('');
  const [panelTrxRef, setPanelTrxRef] = useState<string>('');
  const [panelSplitAmounts, setPanelSplitAmounts] = useState<{ Cash: string; bKash: string; Nagad: string; Card: string }>({
    Cash: '', bKash: '', Nagad: '', Card: ''
  });
  const [isPanelProcessing, setIsPanelProcessing] = useState<boolean>(false);

  const currentTable = useMemo(() => {
    return tables.find(t => t.id === selectedTableId) || tables[0] || null;
  }, [tables, selectedTableId]);

  const activeOrder = useMemo(() => {
    if (!currentTable) return null;
    return tableOrders.find(o => o.tableId === currentTable.id && !['Served', 'Paid'].includes(o.status)) || null;
  }, [tableOrders, currentTable]);

  // Active Draft Session for Current Table
  const currentDraft = useMemo<TableDraftSession>(() => {
    if (!currentTable) {
      return { items: [], discountVal: '', discountType: 'flat', customerNote: '', customerName: '', customerPhone: '', guestCount: 2 };
    }
    const draft = tableDrafts[currentTable.id];
    return draft || {
      items: [],
      discountVal: '',
      discountType: 'flat',
      customerNote: '',
      customerName: currentTable.customerName || '',
      customerPhone: currentTable.customerPhone || '',
      guestCount: currentTable.guestCount || currentTable.seats || 2,
    };
  }, [tableDrafts, currentTable]);

  // Update Draft helper
  const updateCurrentDraft = useCallback((updater: (prev: TableDraftSession) => TableDraftSession) => {
    if (!currentTable) return;
    setTableDrafts(prev => {
      const existing = prev[currentTable.id] || {
        items: [],
        discountVal: '',
        discountType: 'flat',
        customerNote: '',
        customerName: currentTable.customerName || '',
        customerPhone: currentTable.customerPhone || '',
        guestCount: currentTable.guestCount || currentTable.seats || 2,
      };
      return {
        ...prev,
        [currentTable.id]: updater(existing),
      };
    });
  }, [currentTable]);

  // Add Item to Current Table Draft
  const handleAddItemToTable = (item: MenuItem) => {
    if (!currentTable) return;
    updateCurrentDraft(draft => {
      const exIndex = draft.items.findIndex(i => i.itemId === item.id && !i.note);
      if (exIndex >= 0) {
        const next = [...draft.items];
        next[exIndex].quantity += 1;
        return { ...draft, items: next };
      }
      const newItem: TableOrderItem = {
        itemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        note: '',
        image: item.image || '',
      };
      return { ...draft, items: [...draft.items, newItem] };
    });
  };

  const handleUpdateDraftQty = (itemId: string, delta: number) => {
    updateCurrentDraft(draft => {
      const next = draft.items
        .map(i => i.itemId === itemId ? { ...i, quantity: i.quantity + delta } : i)
        .filter(i => i.quantity > 0);
      return { ...draft, items: next };
    });
  };

  const handleRemoveDraftItem = (itemId: string) => {
    updateCurrentDraft(draft => ({
      ...draft,
      items: draft.items.filter(i => i.itemId !== itemId),
    }));
  };

  // Combine Active Order items and Draft items for grand subtotal
  const combinedTicketItems = useMemo(() => {
    return [
      ...(activeOrder?.items || []).map(i => ({ ...i, isConfirmed: true })),
      ...(currentDraft.items || []).map(i => ({ ...i, isConfirmed: false })),
    ];
  }, [activeOrder, currentDraft.items]);

  const ticketSubtotal = useMemo(() => {
    return combinedTicketItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
  }, [combinedTicketItems]);

  const discountAmount = useMemo(() => {
    if (!currentDraft.discountVal) return 0;
    const val = Number(currentDraft.discountVal) || 0;
    if (currentDraft.discountType === 'percent') {
      return (ticketSubtotal * val) / 100;
    }
    return Math.min(ticketSubtotal, val);
  }, [ticketSubtotal, currentDraft.discountVal, currentDraft.discountType]);

  const ticketTotal = Math.max(0, ticketSubtotal - discountAmount);

  // Panel Payment Calculations (Cash tendered, Change, Due, Split remainder)
  const panelChange = useMemo(() => {
    if (panelPaymentMethod !== 'Cash' || !panelCashTendered) return 0;
    const tendered = Number(panelCashTendered) || 0;
    return Math.max(0, tendered - ticketTotal);
  }, [panelPaymentMethod, panelCashTendered, ticketTotal]);

  const panelDue = useMemo(() => {
    if (panelPaymentMethod !== 'Cash' || !panelCashTendered) return 0;
    const tendered = Number(panelCashTendered) || 0;
    return Math.max(0, ticketTotal - tendered);
  }, [panelPaymentMethod, panelCashTendered, ticketTotal]);

  const panelSplitTotal = useMemo(() => {
    return (
      (parseFloat(panelSplitAmounts.Cash) || 0) +
      (parseFloat(panelSplitAmounts.bKash) || 0) +
      (parseFloat(panelSplitAmounts.Nagad) || 0) +
      (parseFloat(panelSplitAmounts.Card) || 0)
    );
  }, [panelSplitAmounts]);

  const panelSplitRemaining = Math.max(0, ticketTotal - panelSplitTotal);

  // Direct Settle & Print Receipt from Side Panel
  const handlePanelSettleAndComplete = async (printDirect: boolean = true) => {
    if (!currentTable) return;
    if (combinedTicketItems.length === 0) {
      showNotification('Cannot settle an empty order.', 'error');
      return;
    }

    if (panelPaymentMethod === 'Split' && panelSplitTotal < ticketTotal) {
      alert(`Split payment not balanced! Remaining due: ৳${panelSplitRemaining.toFixed(2)}`);
      return;
    }

    setIsPanelProcessing(true);
    try {
      const cashierName = sessionStorage.getItem('pizzora_admin_name') || 'Manager';
      let invNum = `PIZ-${Date.now().toString().slice(-6)}`;
      try {
        invNum = await generateInvoiceNumber();
      } catch (e) {
        console.warn('Invoice number fallback', e);
      }

      const finalCustomerName = currentDraft.customerName.trim() || `Table ${currentTable.tableNumber} Guest`;
      const finalCustomerPhone = currentDraft.customerPhone.trim();

      const activeSplitPayments: SplitPaymentItem[] = panelPaymentMethod === 'Split' ? [
        ...(parseFloat(panelSplitAmounts.Cash) > 0 ? [{ method: 'Cash' as const, amount: parseFloat(panelSplitAmounts.Cash) }] : []),
        ...(parseFloat(panelSplitAmounts.bKash) > 0 ? [{ method: 'bKash' as const, amount: parseFloat(panelSplitAmounts.bKash) }] : []),
        ...(parseFloat(panelSplitAmounts.Nagad) > 0 ? [{ method: 'Nagad' as const, amount: parseFloat(panelSplitAmounts.Nagad) }] : []),
        ...(parseFloat(panelSplitAmounts.Card) > 0 ? [{ method: 'Card' as const, amount: parseFloat(panelSplitAmounts.Card) }] : []),
      ] : [];

      const finalPaymentMethod = panelTrxRef.trim() ? `${panelPaymentMethod} (${panelTrxRef.trim()})` : panelPaymentMethod;

      // 1. Construct final formal Order for master sales database
      const finalOrder = {
        id: `PZ-TABLE-${Date.now()}`,
        items: combinedTicketItems.map(c => {
          const found = state.menuItems.find(m => m.id === c.itemId);
          const itemObj: MenuItem = found || {
            id: c.itemId,
            name: c.name,
            slug: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            price: c.price,
            category: 'Dine-In',
            image: c.image || '',
            description: '',
            ingredients: [],
            nutrition: { calories: 0, protein: '0g', carbs: '0g', fat: '0g' },
            rating: 5,
            reviewCount: 0,
            spiceLevel: 'Mild' as const,
            isVeg: false,
            isSpicy: false,
            isPopular: false,
            prepTime: '15 min',
            serves: '1 Person',
          };
          return {
            item: itemObj,
            quantity: c.quantity,
            specialRequest: c.note || '',
          };
        }),
        subtotal: ticketSubtotal,
        discount: discountAmount,
        total: ticketTotal,
        status: 'Delivered' as const,
        paymentMethod: panelPaymentMethod,
        splitPayments: activeSplitPayments.length > 0 ? activeSplitPayments : undefined,
        customerName: finalCustomerName,
        phone: finalCustomerPhone,
        address: `Dine In — Table ${currentTable.tableNumber} (${currentTable.area})${panelTrxRef.trim() ? ` [Ref: ${panelTrxRef.trim()}]` : ''}`,
        createdAt: new Date().toISOString(),
        estimatedTime: 'Completed',
        orderNumber: invNum,
      };

      // Save into restaurant orders and cash registers
      dispatch({ type: 'PLACE_ORDER', payload: finalOrder });

      // Mark table order as Paid if order exists or was created
      if (activeOrder) {
        dispatch({
          type: 'UPDATE_TABLE_ORDER',
          payload: {
            ...activeOrder,
            items: combinedTicketItems.map(c => ({
              itemId: c.itemId,
              name: c.name,
              price: c.price,
              quantity: c.quantity,
              note: c.note,
              image: c.image,
            })),
            subtotal: ticketSubtotal,
            discount: discountAmount,
            total: ticketTotal,
            status: 'Paid',
            customerName: finalCustomerName,
            customerPhone: finalCustomerPhone,
            guestCount: currentDraft.guestCount,
            invoiceNumber: invNum,
            paymentMethod: finalPaymentMethod,
            splitPayments: activeSplitPayments.length > 0 ? activeSplitPayments : undefined,
          }
        });
        dispatch({ type: 'UPDATE_TABLE_ORDER_STATUS', payload: { id: activeOrder.id, status: 'Paid' } });
      }

      // Print thermal receipt via printerService
      if (printDirect) {
        const invoiceData: InvoiceData = {
          invoiceNumber: invNum,
          orderId: finalOrder.id,
          orderType: `Dine In - Table ${currentTable.tableNumber}`,
          tableNo: currentTable.tableNumber,
          customerName: finalCustomerName,
          cashierName,
          dateTime: new Date().toLocaleString(),
          items: combinedTicketItems.map(c => ({
            name: c.name,
            quantity: c.quantity,
            price: c.price,
            note: c.note,
          })),
          subtotal: ticketSubtotal,
          discount: discountAmount,
          total: ticketTotal,
          paymentMethod: finalPaymentMethod,
          splitPayments: activeSplitPayments.length > 0 ? activeSplitPayments.map(p => ({ method: p.method, amount: p.amount })) : undefined,
          amountPaid: panelPaymentMethod === 'Cash' ? (Number(panelCashTendered) || ticketTotal) : ticketTotal,
          change: panelPaymentMethod === 'Cash' ? panelChange : 0,
        };

        const settings = loadPrinterSettings();
        const hasCash = panelPaymentMethod === 'Cash' || (panelPaymentMethod === 'Split' && parseFloat(panelSplitAmounts.Cash) > 0);
        if (hasCash && settings.autoOpenDrawer && settings.printMode === 'qz') {
          try {
            await printerService.openCashDrawer(settings);
          } catch (e) {
            console.warn('Cash drawer pulse error', e);
          }
        }

        try {
          await printerService.printReceipt(invoiceData, settings);
        } catch (err) {
          console.warn('Print receipt notice', err);
        }
      }

      // Reset Table to Available
      dispatch({
        type: 'SET_TABLE_STATUS',
        payload: {
          id: currentTable.id,
          status: 'Available',
          currentOrderId: undefined,
          occupiedSince: undefined,
          customerName: '',
          customerPhone: '',
          guestCount: undefined,
        }
      });

      // Clear local draft and inputs for this table
      setTableDrafts(prev => {
        const next = { ...prev };
        delete next[currentTable.id];
        return next;
      });
      setPanelCashTendered('');
      setPanelTrxRef('');
      setPanelSplitAmounts({ Cash: '', bKash: '', Nagad: '', Card: '' });

      showNotification(`Table ${currentTable.tableNumber} settled (৳${ticketTotal}) via ${panelPaymentMethod} and cleared!`, 'success');
    } catch (err: any) {
      showNotification(`Settlement error: ${err.message || 'Failed to complete'}`, 'error');
    } finally {
      setIsPanelProcessing(false);
    }
  };

  // Send Draft to Kitchen / Hold Order
  const handleSendToKitchen = async () => {
    if (!currentTable) return;
    if (currentDraft.items.length === 0 && !activeOrder) {
      showNotification('Please add items to this table first.', 'error');
      return;
    }

    const customerName = currentDraft.customerName.trim() || `Table ${currentTable.tableNumber}`;
    const customerPhone = currentDraft.customerPhone.trim();
    const guestCount = currentDraft.guestCount;

    if (activeOrder) {
      // Append new items to existing order
      const mergedItems: TableOrderItem[] = [...activeOrder.items];
      currentDraft.items.forEach(newItem => {
        const match = mergedItems.find(m => m.itemId === newItem.itemId && m.note === newItem.note);
        if (match) {
          match.quantity += newItem.quantity;
        } else {
          mergedItems.push(newItem);
        }
      });

      const updatedOrder: TableOrder = {
        ...activeOrder,
        items: mergedItems,
        subtotal: ticketSubtotal,
        discount: discountAmount,
        total: ticketTotal,
        customerName,
        customerPhone,
        guestCount,
        status: activeOrder.status === 'Pending' ? 'Confirmed' : activeOrder.status,
      };

      dispatch({ type: 'UPDATE_TABLE_ORDER', payload: updatedOrder });
      showNotification(`Added ${currentDraft.items.length} new item(s) to Table ${currentTable.tableNumber}'s active ticket!`, 'success');
    } else {
      // Create new Table Order
      const newOrder: TableOrder = {
        id: `TO-${Date.now()}`,
        tableId: currentTable.id,
        tableNumber: currentTable.tableNumber,
        items: currentDraft.items,
        subtotal: ticketSubtotal,
        discount: discountAmount,
        total: ticketTotal,
        status: 'Confirmed',
        createdAt: Date.now(),
        customerNote: currentDraft.customerNote,
        customerName,
        customerPhone,
        guestCount,
      };

      dispatch({ type: 'PLACE_TABLE_ORDER', payload: newOrder });
      dispatch({
        type: 'SET_TABLE_STATUS',
        payload: {
          id: currentTable.id,
          status: 'Cooking',
          currentOrderId: newOrder.id,
          occupiedSince: Date.now(),
          customerName,
          customerPhone,
          guestCount,
        }
      });
      showNotification(`Order placed for Table ${currentTable.tableNumber} and sent to kitchen!`, 'success');
    }

    // Try auto-print KOT if printer ready
    try {
      const kotInvoice: InvoiceData = {
        invoiceNumber: `KOT-${currentTable.tableNumber}`,
        orderId: `KOT-${Date.now()}`,
        orderType: `Dine-In • Table ${currentTable.tableNumber}`,
        tableNo: currentTable.tableNumber,
        customerName,
        cashierName: sessionStorage.getItem('pizzora_admin_name') || 'Captain',
        dateTime: new Date().toLocaleTimeString(),
        items: currentDraft.items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price, note: i.note })),
        subtotal: ticketSubtotal,
        discount: discountAmount,
        total: ticketTotal,
        paymentMethod: 'Unpaid (Kitchen)',
        amountPaid: 0,
        change: 0,
      };
      await printerService.printKOT(kotInvoice);
    } catch (e) {
      console.warn('Auto KOT print skipped', e);
    }

    // Clear local draft items since they are now committed to the active table order
    updateCurrentDraft(draft => ({ ...draft, items: [] }));
  };

  // Transfer Table handler
  const handleTransferTable = (targetTableId: string) => {
    if (!currentTable || !activeOrder) return;
    const targetTable = tables.find(t => t.id === targetTableId);
    if (!targetTable) return;

    // Migrate order
    dispatch({
      type: 'UPDATE_TABLE_ORDER',
      payload: {
        ...activeOrder,
        tableId: targetTable.id,
        tableNumber: targetTable.tableNumber,
      }
    });

    // Occupy target table
    dispatch({
      type: 'SET_TABLE_STATUS',
      payload: {
        id: targetTable.id,
        status: currentTable.status,
        currentOrderId: activeOrder.id,
        occupiedSince: currentTable.occupiedSince,
        customerName: currentTable.customerName,
        customerPhone: currentTable.customerPhone,
        guestCount: currentTable.guestCount,
      }
    });

    // Free source table
    dispatch({
      type: 'SET_TABLE_STATUS',
      payload: {
        id: currentTable.id,
        status: 'Available',
        currentOrderId: undefined,
        occupiedSince: undefined,
        customerName: '',
        customerPhone: '',
        guestCount: undefined,
      }
    });

    // Move draft if any
    if (tableDrafts[currentTable.id]) {
      setTableDrafts(prev => {
        const copy = { ...prev };
        copy[targetTable.id] = copy[currentTable.id];
        delete copy[currentTable.id];
        return copy;
      });
    }

    setSelectedTableId(targetTable.id);
    showNotification(`Transferred Table ${currentTable.tableNumber} to Table ${targetTable.tableNumber}!`, 'success');
  };

  // Reset Table / Clear to Available
  const handleResetTable = (tableId: string) => {
    setDeleteConfirm({
      isOpen: true,
      title: 'Reset Table to Available?',
      message: 'This will clear any active orders and reset this table for new guests.',
      onConfirm: () => {
        dispatch({
          type: 'SET_TABLE_STATUS',
          payload: {
            id: tableId,
            status: 'Available',
            currentOrderId: undefined,
            occupiedSince: undefined,
            customerName: '',
            customerPhone: '',
            guestCount: undefined,
          }
        });
        setTableDrafts(prev => {
          const next = { ...prev };
          delete next[tableId];
          return next;
        });
        showNotification('Table cleared & reset to Available.', 'success');
        setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Add Table Form handler
  const handleAddTable = () => {
    if (!tableForm.tableNumber || !tableForm.seats) {
      showNotification('Table number and seats are required.', 'error');
      return;
    }
    if (tables.find(t => t.id === tableForm.tableNumber)) {
      showNotification('Table number already exists.', 'error');
      return;
    }
    const newTable: RestaurantTable = {
      id: tableForm.tableNumber,
      tableNumber: tableForm.tableNumber,
      seats: Number(tableForm.seats),
      area: tableForm.area,
      status: 'Available',
    };
    dispatch({ type: 'ADD_TABLE', payload: newTable });
    showNotification(`Table ${tableForm.tableNumber} added!`, 'success');
    setShowAddTableModal(false);
    setTableForm({ tableNumber: '', seats: '4', area: 'Dining' });
  };

  // Edit Table handler
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [editForm, setEditForm] = useState<{ tableNumber: string; seats: string; area: TableArea }>({
    tableNumber: '', seats: '4', area: 'Dining',
  });

  const handleOpenEditTable = (table: RestaurantTable) => {
    setEditingTable(table);
    setEditForm({
      tableNumber: table.tableNumber,
      seats: String(table.seats),
      area: table.area,
    });
  };

  const handleSaveEditTable = () => {
    if (!editingTable) return;
    if (!editForm.tableNumber.trim() || !editForm.seats) {
      showNotification('Table number and seats are required.', 'error');
      return;
    }
    const duplicate = tables.find(
      t => t.id !== editingTable.id && t.tableNumber.toUpperCase() === editForm.tableNumber.trim().toUpperCase()
    );
    if (duplicate) {
      showNotification(`Another table with number "${editForm.tableNumber.trim().toUpperCase()}" already exists.`, 'error');
      return;
    }
    const updated: RestaurantTable = {
      ...editingTable,
      tableNumber: editForm.tableNumber.trim().toUpperCase(),
      seats: Number(editForm.seats),
      area: editForm.area,
    };
    dispatch({ type: 'UPDATE_TABLE', payload: updated });
    showNotification(`Table ${updated.tableNumber} updated successfully!`, 'success');
    setEditingTable(null);
  };

  // Delete Table handler
  const handleDeleteTable = (table: RestaurantTable) => {
    const activeOrd = tableOrders.find(o => o.tableId === table.id && !['Paid'].includes(o.status));
    if (activeOrd) {
      showNotification(`Cannot delete Table ${table.tableNumber} because it has an active order (৳${activeOrd.total}). Please settle or cancel the order first.`, 'error');
      return;
    }

    setDeleteConfirm({
      isOpen: true,
      title: `Delete Table ${table.tableNumber}?`,
      message: `Are you sure you want to delete Table ${table.tableNumber} (${table.area} area, ${table.seats} seats)? This table will be permanently removed from your restaurant floor.`,
      onConfirm: () => {
        dispatch({ type: 'DELETE_TABLE', payload: table.id });
        showNotification(`Table ${table.tableNumber} deleted.`, 'success');
        setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
        if (selectedTableId === table.id) {
          const remaining = tables.filter(t => t.id !== table.id);
          if (remaining.length > 0) setSelectedTableId(remaining[0].id);
        }
      }
    });
  };

  // 1-click prune to 5 tables
  const handlePruneToFiveTables = () => {
    const extraTables = tables.filter(t => !['T01', 'T02', 'T03', 'T04', 'T05'].includes(t.tableNumber));
    if (extraTables.length === 0) {
      showNotification('You already have only the 5 main dining tables (T01 - T05).', 'info');
      return;
    }

    setDeleteConfirm({
      isOpen: true,
      title: `Keep Only 5 Active Tables?`,
      message: `You currently have ${tables.length} tables. Do you want to remove the ${extraTables.length} extra demo tables (${extraTables.map(t => t.tableNumber).join(', ')}) and keep only your 5 active dining tables (T01 - T05)?`,
      onConfirm: () => {
        extraTables.forEach(t => {
          dispatch({ type: 'DELETE_TABLE', payload: t.id });
        });
        showNotification(`Removed ${extraTables.length} demo tables. 5 tables remain.`, 'success');
        setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
        setSelectedTableId('T01');
      }
    });
  };

  // Filtered menu
  const filteredMenuItems = useMemo(() => {
    let list = menuItems;
    if (activeCategory !== 'All') {
      list = list.filter(i => i.category.toLowerCase() === activeCategory.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
    }
    return list;
  }, [menuItems, activeCategory, searchQuery]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    menuItems.forEach(i => set.add(i.category));
    return ['All', ...Array.from(set)];
  }, [menuItems]);

  // Filtered tables for floor view
  const filteredTables = useMemo(() => {
    return tables.filter(t => {
      const matchesArea = areaFilter === 'All' || t.area === areaFilter;
      const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
      return matchesArea && matchesStatus;
    });
  }, [tables, areaFilter, statusFilter]);

  // Overall Floor Stats
  const totalTables = tables.length;
  const availableCount = tables.filter(t => t.status === 'Available').length;
  const occupiedCount = totalTables - availableCount;
  const cookingCount = tables.filter(t => t.status === 'Cooking').length;
  const activeRevenue = tableOrders
    .filter(o => !['Paid'].includes(o.status))
    .reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <div className="space-y-5 pb-12" style={{ fontFamily: 'var(--font-body)' }}>

      {/* ─── Top Stats & Control Toolbar ─────────────────────────────────────── */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        {/* Title and Top Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)' }}>
              <LayoutGrid size={22} />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '24px', color: '#111', letterSpacing: '-0.5px' }}>
                Table Management & POS Hub
              </h2>
              <p style={{ fontSize: '12px', color: '#6B7280' }}>
                Multi-table POS terminal, live dining floor status, and instant invoice settlement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Switcher Pill */}
            <div className="flex items-center p-1 rounded-2xl bg-gray-100 border border-gray-200">
              <button
                onClick={() => setViewMode('floor')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                style={{
                  backgroundColor: viewMode === 'floor' ? '#fff' : 'transparent',
                  color: viewMode === 'floor' ? '#F9002B' : '#4B5563',
                  boxShadow: viewMode === 'floor' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  fontFamily: 'var(--font-heading)'
                }}
              >
                <TableProperties size={14} />
                Floor Layout Grid
              </button>
              <button
                onClick={() => setViewMode('pos')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                style={{
                  backgroundColor: viewMode === 'pos' ? '#F9002B' : 'transparent',
                  color: viewMode === 'pos' ? '#fff' : '#4B5563',
                  boxShadow: viewMode === 'pos' ? '0 2px 10px rgba(249,0,43,0.3)' : 'none',
                  fontFamily: 'var(--font-heading)'
                }}
              >
                <Utensils size={14} />
                Table POS Terminal
              </button>
            </div>

            <a
              href="/kitchen"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all hover:bg-amber-100"
              style={{ backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', textDecoration: 'none', fontFamily: 'var(--font-heading)' }}
            >
              <ChefHat size={14} /> Kitchen Screen ↗
            </a>

            <button
              onClick={() => setShowAddTableModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:shadow-lg hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)' }}
            >
              <Plus size={15} /> Add Table
            </button>
          </div>
        </div>

        {/* Floor KPI Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-gray-100">
          {[
            { label: 'Total Tables', value: totalTables, color: '#0284C7', bg: '#F0F9FF', icon: TableProperties },
            { label: 'Available', value: availableCount, color: '#16A34A', bg: '#F0FDF4', icon: CheckCircle },
            { label: 'Occupied', value: occupiedCount, color: '#F9002B', bg: '#FFF5F5', icon: Users },
            { label: 'Cooking Now', value: cookingCount, color: '#EA580C', bg: '#FFF7ED', icon: CookingPot },
            { label: 'Active Bill Total', value: `৳${activeRevenue.toLocaleString()}`, color: '#9333EA', bg: '#FAF5FF', icon: Receipt },
          ].map((stat, i) => (
            <div key={i} className="p-3.5 rounded-2xl flex items-center gap-3 border border-gray-100" style={{ backgroundColor: stat.bg }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-sm" style={{ color: stat.color }}>
                <stat.icon size={18} />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{stat.label}</p>
                <p className="text-xl font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Persistent Top Table Switcher Bar ──────────────────────────────── */}
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-200 overflow-x-auto flex items-center gap-2.5 scrollbar-thin">
        <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-gray-500 uppercase tracking-wider flex-shrink-0">
          <Utensils size={13} className="text-red-600" />
          <span>Quick Switch Table:</span>
        </div>
        {tables.map(t => {
          const isSelected = selectedTableId === t.id;
          const cfg = statusConfig[t.status];
          const activeOrd = tableOrders.find(o => o.tableId === t.id && !['Paid'].includes(o.status));
          const hasDraft = (tableDrafts[t.id]?.items?.length || 0) > 0;

          return (
            <button
              key={t.id}
              onClick={() => {
                setSelectedTableId(t.id);
                if (viewMode === 'floor') setViewMode('pos');
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0"
              style={{
                backgroundColor: isSelected ? '#1A0000' : t.status === 'Available' ? '#F9FAFB' : '#FFF5F5',
                color: isSelected ? '#fff' : t.status === 'Available' ? '#374151' : '#F9002B',
                border: `1.5px solid ${isSelected ? '#F9002B' : cfg.border}`,
                boxShadow: isSelected ? '0 4px 12px rgba(249,0,43,0.25)' : 'none',
                fontFamily: 'var(--font-heading)',
              }}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: isSelected ? '#F9002B' : cfg.dot }} />
              <span>{t.tableNumber}</span>
              {activeOrd ? (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold" style={{ backgroundColor: isSelected ? 'rgba(249,0,43,0.3)' : '#FEE2E2', color: isSelected ? '#fff' : '#DC2626' }}>
                  ৳{activeOrd.total}
                </span>
              ) : hasDraft ? (
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" title="Unsent Draft" />
              ) : (
                <span className="text-[10px] text-gray-400 font-normal">({t.seats}s)</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          MODE 1: FLOOR LAYOUT GRID VIEW
      ──────────────────────────────────────────────────────────────────────── */}
      {viewMode === 'floor' && (
        <div className="space-y-6 animate-fade-in">
          {/* Notice banner when more than 5 tables exist */}
          {tables.length > 5 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <p className="text-xs font-black text-amber-900" style={{ fontFamily: 'var(--font-heading)' }}>
                    {tables.length} Tables in System (Active Restaurant Floor has 5 Tables)
                  </p>
                  <p className="text-[11px] text-amber-700">
                    Your restaurant has 5 physical tables (T01 - T05). Clean up demo tables in one click.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handlePruneToFiveTables}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-all shadow-sm flex items-center gap-1.5 self-start sm:self-auto flex-shrink-0"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                <Trash2 size={13} />
                Keep Only 5 Tables (T01 - T05)
              </button>
            </div>
          )}

          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-gray-500 uppercase mr-1">Area:</span>
              {['All', ...areas].map(a => (
                <button
                  key={a}
                  onClick={() => setAreaFilter(a)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                  style={{
                    backgroundColor: areaFilter === a ? '#F9002B' : '#fff',
                    color: areaFilter === a ? '#fff' : '#4B5563',
                    border: '1px solid',
                    borderColor: areaFilter === a ? '#F9002B' : '#E5E7EB',
                    fontFamily: 'var(--font-heading)',
                  }}
                >
                  {a}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-gray-500 uppercase mr-1">Status:</span>
              {['All', 'Available', 'Ordering', 'Cooking', 'Ready', 'Served'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                  style={{
                    backgroundColor: statusFilter === st ? '#111' : '#fff',
                    color: statusFilter === st ? '#fff' : '#4B5563',
                    border: '1px solid',
                    borderColor: statusFilter === st ? '#111' : '#E5E7EB',
                    fontFamily: 'var(--font-heading)',
                  }}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-xs text-red-600 font-bold border border-red-100">
              <MousePointerClick size={14} className="text-red-500 animate-pulse" />
              <span>Click any table to open Table POS Terminal</span>
            </div>
          </div>

          {/* Table Cards Grid by Area */}
          {areas.map(area => {
            if (areaFilter !== 'All' && areaFilter !== area) return null;
            const areaTables = filteredTables.filter(t => t.area === area);
            if (areaTables.length === 0) return null;
            const areaCfg = areaConfig[area];

            return (
              <div key={area} className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm" style={{ backgroundColor: areaCfg.bg, color: areaCfg.color }}>
                      <areaCfg.Icon size={18} />
                    </div>
                    <div>
                      <h4 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '20px', color: '#111' }}>
                        {areaCfg.label}
                      </h4>
                      <p className="text-xs text-gray-500">{areaTables.length} tables in this zone</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {areaTables.filter(t => t.status === 'Available').length} Available
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                  {state.isInitialLoading ? (
                    Array.from({ length: 4 }).map((_, i) => <AdminStatSkeleton key={i} />)
                  ) : (
                    areaTables.map(table => (
                      <TableCard
                        key={table.id}
                        table={table}
                        isSelected={selectedTableId === table.id}
                        onOpenPOS={() => {
                          setSelectedTableId(table.id);
                          setViewMode('pos');
                        }}
                        onQuickView={() => {
                          setSelectedTableId(table.id);
                          setQrModalTable(table);
                        }}
                        onEdit={() => handleOpenEditTable(table)}
                        onDelete={() => handleDeleteTable(table)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          MODE 2: FULL TABLE POS TERMINAL
      ──────────────────────────────────────────────────────────────────────── */}
      {viewMode === 'pos' && currentTable && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-fade-in items-start">

          {/* ── Left / Center Column: Menu Explorer (7 Cols) ────────────────── */}
          <div className="lg:col-span-7 bg-white p-5 rounded-3xl shadow-sm border border-gray-200 space-y-4">
            {/* Search & Back Bar */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setViewMode('floor')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-100"
              >
                <ArrowLeft size={14} /> Back to Floor
              </button>
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search pizzas, burgers, wings, drinks..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-xs font-medium outline-none focus:ring-2 focus:ring-red-400 bg-gray-50 focus:bg-white"
                />
              </div>
            </div>

            {/* Category Selector Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {categories.map(cat => {
                const isActive = activeCategory.toLowerCase() === cat.toLowerCase();
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all"
                    style={{
                      backgroundColor: isActive ? '#F9002B' : '#F3F4F6',
                      color: isActive ? '#fff' : '#4B5563',
                      boxShadow: isActive ? '0 2px 8px rgba(249,0,43,0.3)' : 'none',
                      fontFamily: 'var(--font-heading)',
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Menu Items Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[68vh] overflow-y-auto p-1 scrollbar-thin">
              {filteredMenuItems.map(item => {
                const draftCount = currentDraft.items.find(i => i.itemId === item.id)?.quantity || 0;
                const confirmedCount = activeOrder?.items.find(i => i.itemId === item.id)?.quantity || 0;
                const totalItemQty = draftCount + confirmedCount;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleAddItemToTable(item)}
                    className="relative group p-3 rounded-2xl border border-gray-200 hover:border-red-400 transition-all bg-white hover:shadow-lg cursor-pointer flex flex-col justify-between"
                  >
                    {totalItemQty > 0 && (
                      <span className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-red-600 text-white font-extrabold text-[11px] flex items-center justify-center shadow-md">
                        {totalItemQty}
                      </span>
                    )}

                    <div>
                      <div className="w-full h-28 rounded-xl overflow-hidden mb-2 bg-gray-100 relative">
                        <img
                          src={optimizeCloudinaryUrl(item.image, 300)}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {item.spiceLevel && item.spiceLevel !== 'Mild' && (
                          <span className="absolute bottom-1.5 left-1.5 bg-black/70 backdrop-blur-sm text-amber-400 px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-0.5">
                            <Flame size={10} /> {item.spiceLevel}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-xs text-gray-900 line-clamp-1 group-hover:text-red-600 transition-colors">
                        {item.name}
                      </h4>
                      <p className="text-[10px] text-gray-400 line-clamp-1">{item.category}</p>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                      <span className="text-sm font-black text-red-600" style={{ fontFamily: 'var(--font-heading)' }}>
                        ৳{item.price}
                      </span>
                      <button
                        type="button"
                        className="w-7 h-7 rounded-lg bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors flex items-center justify-center"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Right Column: Live Table POS Ticket (5 Cols) ─────────────────── */}
          <div className="lg:col-span-5 bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden sticky top-4 flex flex-col">

            {/* Table POS Header Banner */}
            <div className="p-5 text-white" style={{ background: 'linear-gradient(135deg, #1A0000, #C8001F)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white text-red-600 font-black text-lg flex items-center justify-center shadow-lg">
                    {currentTable.tableNumber}
                  </div>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '20px' }}>
                      Table {currentTable.tableNumber}
                    </h3>
                    <p className="text-xs text-white/70">
                      {currentTable.area} Area · {currentTable.seats} Seats Capacity
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setTransferModalTable(currentTable)}
                    disabled={!activeOrder}
                    className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all disabled:opacity-40"
                    title="Transfer Table"
                  >
                    <MoveRight size={13} className="inline mr-1" /> Move
                  </button>
                  <button
                    onClick={() => setQrModalTable(currentTable)}
                    className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                    title="Table QR"
                  >
                    <QrCode size={14} />
                  </button>
                  <button
                    onClick={() => handleResetTable(currentTable.id)}
                    className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                    title="Reset Table"
                  >
                    <RefreshCw size={14} />
                  </button>
                  <button
                    onClick={() => handleOpenEditTable(currentTable)}
                    className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                    title="Edit Table Details"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteTable(currentTable)}
                    className="w-8 h-8 rounded-xl bg-white/10 hover:bg-red-500/40 text-white flex items-center justify-center"
                    title="Delete Table"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Customer Details Inputs */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-xs">
                <div>
                  <span className="text-[10px] text-white/60 block font-bold">Customer Name</span>
                  <input
                    type="text"
                    value={currentDraft.customerName}
                    onChange={e => updateCurrentDraft(d => ({ ...d, customerName: e.target.value }))}
                    placeholder="Guest Name"
                    className="w-full bg-white/10 text-white placeholder-white/40 px-2 py-1 rounded-lg text-xs font-bold outline-none border border-white/20 focus:border-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-white/60 block font-bold">Phone No</span>
                  <input
                    type="text"
                    value={currentDraft.customerPhone}
                    onChange={e => updateCurrentDraft(d => ({ ...d, customerPhone: e.target.value }))}
                    placeholder="017xxxxxxxx"
                    className="w-full bg-white/10 text-white placeholder-white/40 px-2 py-1 rounded-lg text-xs font-bold outline-none border border-white/20 focus:border-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-white/60 block font-bold">Guests</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={currentDraft.guestCount}
                    onChange={e => updateCurrentDraft(d => ({ ...d, guestCount: Number(e.target.value) || 1 }))}
                    className="w-full bg-white/10 text-white px-2 py-1 rounded-lg text-xs font-bold outline-none border border-white/20 focus:border-white"
                  />
                </div>
              </div>
            </div>

            {/* Active Ticket Items Container */}
            <div className="p-4 space-y-4 max-h-[46vh] overflow-y-auto flex-1 scrollbar-thin">

              {/* 1. Already Sent / Confirmed Kitchen Items */}
              {activeOrder && activeOrder.items.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase tracking-wider pb-1 border-b">
                    <span className="flex items-center gap-1.5 text-green-700">
                      <CookingPot size={13} /> In Kitchen / Confirmed ({activeOrder.items.length})
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ backgroundColor: statusConfig[activeOrder.status as TableStatus]?.bg || '#F3F4F6', color: statusConfig[activeOrder.status as TableStatus]?.text || '#374151' }}>
                      {activeOrder.status}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {activeOrder.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-gray-800 bg-gray-200 px-1.5 py-0.5 rounded text-[11px]">
                            {item.quantity}×
                          </span>
                          <div>
                            <p className="font-bold text-gray-800">{item.name}</p>
                            {item.note && <p className="text-[10px] text-gray-400 italic">Note: {item.note}</p>}
                          </div>
                        </div>
                        <span className="font-extrabold text-gray-800">৳{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. New / Unsent Draft Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider pb-1 border-b">
                  <span className="flex items-center gap-1.5 text-blue-700">
                    <Sparkles size={13} /> New Items (Unsent) ({currentDraft.items.length})
                  </span>
                  {currentDraft.items.length > 0 && (
                    <button
                      onClick={() => updateCurrentDraft(d => ({ ...d, items: [] }))}
                      className="text-[10px] text-red-600 hover:underline"
                    >
                      Clear Draft
                    </button>
                  )}
                </div>

                {currentDraft.items.length === 0 ? (
                  <div className="py-6 text-center text-gray-400 text-xs italic">
                    {activeOrder ? 'No new uncommitted items. Click items on the menu to add more.' : 'Click items on the left to start building Table ticket.'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentDraft.items.map(item => (
                      <div key={item.itemId} className="flex items-center justify-between p-2.5 rounded-2xl bg-blue-50/50 border border-blue-100 text-xs">
                        <div className="flex-1 pr-2">
                          <p className="font-bold text-gray-800">{item.name}</p>
                          <p className="text-[11px] text-blue-600 font-extrabold">৳{item.price}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-white rounded-lg border border-blue-200 p-0.5">
                            <button
                              onClick={() => handleUpdateDraftQty(item.itemId, -1)}
                              className="w-5 h-5 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded"
                            >
                              <Minus size={11} />
                            </button>
                            <span className="px-2 font-black text-xs text-gray-800">{item.quantity}</span>
                            <button
                              onClick={() => handleUpdateDraftQty(item.itemId, 1)}
                              className="w-5 h-5 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded"
                            >
                              <Plus size={11} />
                            </button>
                          </div>

                          <button
                            onClick={() => handleRemoveDraftItem(item.itemId)}
                            className="w-6 h-6 flex items-center justify-center text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Financial Summary & Actions */}
            <div className="p-5 border-t border-gray-100 bg-gray-50/70 space-y-3">
              {/* Discount Selector */}
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-bold text-gray-600 flex items-center gap-1">
                  <Tag size={13} /> Discount:
                </span>
                <div className="flex items-center gap-1">
                  {(['5', '10', '15'].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => updateCurrentDraft(d => ({
                        ...d,
                        discountVal: d.discountVal === pct && d.discountType === 'percent' ? '' : pct,
                        discountType: 'percent',
                      }))}
                      className="px-2 py-0.5 rounded text-[11px] font-bold border transition-all"
                      style={{
                        backgroundColor: currentDraft.discountVal === pct && currentDraft.discountType === 'percent' ? '#F9002B' : '#fff',
                        color: currentDraft.discountVal === pct && currentDraft.discountType === 'percent' ? '#fff' : '#4B5563',
                        borderColor: currentDraft.discountVal === pct && currentDraft.discountType === 'percent' ? '#F9002B' : '#E5E7EB',
                      }}
                    >
                      {pct}%
                    </button>
                  )))}
                  <input
                    type="number"
                    value={currentDraft.discountVal}
                    onChange={e => updateCurrentDraft(d => ({ ...d, discountVal: e.target.value, discountType: 'flat' }))}
                    placeholder="৳ Flat"
                    className="w-16 px-2 py-0.5 rounded text-[11px] border border-gray-200 bg-white font-bold outline-none text-right"
                  />
                </div>
              </div>

              {/* Totals Breakdown */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal:</span>
                  <span className="font-bold">৳{ticketSubtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Discount:</span>
                    <span className="font-bold">-৳{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-2 border-t border-gray-200">
                  <span className="font-black text-gray-900 text-sm">Grand Total:</span>
                  <span className="text-2xl font-black text-red-600" style={{ fontFamily: 'var(--font-heading)' }}>
                    ৳{ticketTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Payment Method Selector (same as POS terminal) */}
              <div className="space-y-2 pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5" style={{ fontFamily: 'var(--font-heading)' }}>
                    <CreditCard size={13} className="text-red-600" /> Payment Method:
                  </span>
                  <span className="text-[11px] font-bold text-gray-500">
                    Selected: <strong className="text-gray-900">{panelPaymentMethod}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {(['Cash', 'Card', 'bKash', 'Nagad', 'Split'] as PaymentMethod[]).map(pm => {
                    const isSelected = panelPaymentMethod === pm;
                    const bgActive =
                      pm === 'bKash' ? '#E2136E' :
                      pm === 'Nagad' ? '#F7941D' :
                      pm === 'Split' ? '#7C3AED' :
                      pm === 'Card' ? '#0284C7' : '#F9002B';

                    return (
                      <button
                        key={pm}
                        type="button"
                        onClick={() => setPanelPaymentMethod(pm)}
                        className="py-2.5 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 active:scale-95 shadow-sm"
                        style={{
                          backgroundColor: isSelected ? bgActive : '#FFFFFF',
                          color: isSelected ? '#FFFFFF' : '#4B5563',
                          border: `1.5px solid ${isSelected ? bgActive : '#E5E7EB'}`,
                          fontFamily: 'var(--font-heading)',
                          boxShadow: isSelected ? `0 4px 12px ${bgActive}33` : 'none',
                        }}
                      >
                        {pm === 'Cash' && <Banknote size={15} />}
                        {pm === 'Card' && <CreditCard size={15} />}
                        {pm === 'bKash' && <Smartphone size={15} />}
                        {pm === 'Nagad' && <Smartphone size={15} />}
                        {pm === 'Split' && <Split size={15} />}
                        <span className="leading-none text-[11px]">{pm}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Cash Tendered Input & Change Calc */}
                {panelPaymentMethod === 'Cash' && (
                  <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2.5 animate-fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-700">Cash Given / Tendered:</span>
                      <span className="text-[11px] text-gray-500">Total: ৳{ticketTotal}</span>
                    </div>
                    <div className="relative">
                      <Banknote size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-600" />
                      <input
                        type="number"
                        value={panelCashTendered}
                        onChange={e => setPanelCashTendered(e.target.value)}
                        placeholder={`e.g. ${ticketTotal}`}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-amber-300 font-black text-sm bg-white outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                    {/* Quick Cash Suggestions */}
                    <div className="flex gap-1.5 flex-wrap">
                      {[ticketTotal, ticketTotal + 50, Math.ceil(ticketTotal / 100) * 100, Math.ceil(ticketTotal / 500) * 500]
                        .filter((v, i, a) => a.indexOf(v) === i && v >= ticketTotal && v > 0)
                        .map(quickAmt => (
                          <button
                            key={quickAmt}
                            type="button"
                            onClick={() => setPanelCashTendered(String(quickAmt))}
                            className="flex-1 py-1 rounded-lg bg-white border border-amber-200 text-xs font-bold text-gray-700 hover:bg-amber-100"
                          >
                            ৳{quickAmt}
                          </button>
                        ))}
                    </div>
                    {Number(panelCashTendered) > 0 && (
                      <div className="flex justify-between items-center pt-1.5 border-t border-amber-200 text-xs">
                        {panelDue > 0 ? (
                          <span className="font-bold text-red-600">Remaining Due: ৳{panelDue.toLocaleString()}</span>
                        ) : (
                          <span className="font-black text-green-700 text-sm">Change to Return: ৳{panelChange.toLocaleString()}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* bKash / Nagad / Card confirmation badge & optional TrxID */}
                {(panelPaymentMethod === 'bKash' || panelPaymentMethod === 'Nagad' || panelPaymentMethod === 'Card') && (
                  <div
                    className="p-3 rounded-2xl border text-xs space-y-2 animate-fade-in"
                    style={{
                      backgroundColor:
                        panelPaymentMethod === 'bKash' ? '#FDF2F8' :
                        panelPaymentMethod === 'Nagad' ? '#FFF7ED' : '#F0F9FF',
                      borderColor:
                        panelPaymentMethod === 'bKash' ? '#FBCFE8' :
                        panelPaymentMethod === 'Nagad' ? '#FFEDD5' : '#BAE6FD',
                    }}
                  >
                    <div className="flex items-center justify-between font-bold"
                      style={{
                        color:
                          panelPaymentMethod === 'bKash' ? '#BE185D' :
                          panelPaymentMethod === 'Nagad' ? '#C2410C' : '#0369A1',
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        {panelPaymentMethod === 'Card' ? <CreditCard size={15} /> : <Smartphone size={15} />}
                        <span>{panelPaymentMethod} Digital Pay</span>
                      </div>
                      <span className="text-sm font-black">৳{ticketTotal.toFixed(2)}</span>
                    </div>

                    <div className="relative">
                      {panelPaymentMethod === 'Card' ? (
                        <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-600" />
                      ) : (
                        <Smartphone size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: panelPaymentMethod === 'bKash' ? '#E2136E' : '#F7941D' }} />
                      )}
                      <input
                        type="text"
                        value={panelTrxRef}
                        onChange={e => setPanelTrxRef(e.target.value)}
                        placeholder={
                          panelPaymentMethod === 'bKash' ? 'bKash TrxID / Mobile No (Optional)' :
                          panelPaymentMethod === 'Nagad' ? 'Nagad TrxID / Mobile No (Optional)' :
                          'Card Last 4 / Auth Ref (Optional)'
                        }
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold bg-white outline-none focus:ring-2 focus:ring-red-400"
                      />
                    </div>
                  </div>
                )}

                {/* Split Payment (Divide Payment among Cash, bKash, Nagad, Card) */}
                {panelPaymentMethod === 'Split' && (
                  <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-2.5 text-xs animate-fade-in">
                    <div className="flex items-center justify-between pb-1.5 border-b border-purple-200/70">
                      <div className="flex items-center gap-1.5 font-bold text-purple-900" style={{ fontFamily: 'var(--font-heading)' }}>
                        <Split size={14} className="text-purple-600" />
                        <span>Divide Payment (৳{ticketTotal.toFixed(2)})</span>
                      </div>
                      <div>
                        {panelSplitRemaining > 0 ? (
                          <span className="font-extrabold text-red-600">
                            Due: ৳{panelSplitRemaining.toFixed(2)}
                          </span>
                        ) : panelSplitTotal > ticketTotal ? (
                          <span className="font-extrabold text-amber-600">
                            +৳{(panelSplitTotal - ticketTotal).toFixed(2)} Extra
                          </span>
                        ) : (
                          <span className="font-extrabold text-green-700 flex items-center gap-1">
                            <CheckCircle2 size={13} /> Balanced
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Method Split Inputs with 1-click Fill */}
                    <div className="space-y-1.5">
                      {([
                        { key: 'bKash' as const, label: 'bKash', color: '#E2136E', bg: '#FDF2F8' },
                        { key: 'Nagad' as const, label: 'Nagad', color: '#F7941D', bg: '#FFF7ED' },
                        { key: 'Cash' as const, label: 'Cash', color: '#16A34A', bg: '#F0FDF4' },
                        { key: 'Card' as const, label: 'Card', color: '#0284C7', bg: '#F0F9FF' },
                      ]).map(({ key, label, color, bg }) => {
                        const other = panelSplitTotal - (parseFloat(panelSplitAmounts[key]) || 0);
                        const rem = Math.max(0, ticketTotal - other);

                        return (
                          <div key={key} className="flex items-center gap-1.5">
                            <span className="w-14 text-xs font-bold" style={{ color, fontFamily: 'var(--font-heading)' }}>
                              {label}
                            </span>
                            <div className="relative flex-1">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">৳</span>
                              <input
                                type="number"
                                min="0"
                                value={panelSplitAmounts[key]}
                                onChange={e => setPanelSplitAmounts(s => ({ ...s, [key]: e.target.value }))}
                                placeholder="0"
                                className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-gray-200 text-xs font-bold bg-white outline-none focus:border-purple-500"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setPanelSplitAmounts(s => ({ ...s, [key]: rem ? String(rem) : '' }))}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors hover:opacity-80 active:scale-95 shadow-sm"
                              style={{ backgroundColor: bg, color, border: `1px solid ${color}40` }}
                              title={`Fill remaining balance to ${label}`}
                            >
                              Fill
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Summary row */}
                    <div className="flex justify-between items-center pt-1 border-t border-purple-200/60 text-[11px]">
                      <span className="text-gray-600">
                        Entered: <strong>৳{panelSplitTotal.toFixed(2)}</strong> of ৳{ticketTotal.toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPanelSplitAmounts({ Cash: '', bKash: '', Nagad: '', Card: '' })}
                        className="text-gray-500 hover:text-red-600 font-bold"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* POS Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={handleSendToKitchen}
                  disabled={currentDraft.items.length === 0}
                  className="py-3.5 rounded-2xl text-xs font-bold text-white transition-all hover:shadow-md disabled:opacity-40 flex items-center justify-center gap-1.5 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #EA580C, #C2410C)', fontFamily: 'var(--font-heading)' }}
                >
                  <CookingPot size={15} />
                  Send to Kitchen (KOT)
                </button>

                <button
                  onClick={() => handlePanelSettleAndComplete(true)}
                  disabled={combinedTicketItems.length === 0 || isPanelProcessing || (panelPaymentMethod === 'Split' && panelSplitRemaining > 0)}
                  className="py-3.5 rounded-2xl text-xs font-bold text-white transition-all hover:shadow-xl disabled:opacity-40 flex items-center justify-center gap-1.5 active:scale-95"
                  style={{
                    background:
                      panelPaymentMethod === 'Split'
                        ? 'linear-gradient(135deg, #7C3AED, #6D28D9)'
                        : 'linear-gradient(135deg, #16A34A, #15803D)',
                    fontFamily: 'var(--font-heading)',
                  }}
                >
                  <Receipt size={15} />
                  {isPanelProcessing
                    ? 'Processing...'
                    : panelPaymentMethod === 'Split' && panelSplitRemaining > 0
                    ? `Due ৳${panelSplitRemaining.toFixed(2)}`
                    : `Settle (${panelPaymentMethod}) & Print`}
                </button>
              </div>

              {/* Secondary Actions */}
              {activeOrder && (
                <div className="flex items-center gap-2 pt-1">
                  {orderStatusNext[activeOrder.status] && (
                    <button
                      onClick={() => updateTableOrderStatus(activeOrder.id, orderStatusNext[activeOrder.status]!)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors flex items-center justify-center gap-1"
                    >
                      <ArrowRight size={13} /> {orderStatusLabel[activeOrder.status]}
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      const kotData: InvoiceData = {
                        invoiceNumber: `PRE-${currentTable.tableNumber}`,
                        orderId: activeOrder.id,
                        orderType: `Table ${currentTable.tableNumber}`,
                        tableNo: currentTable.tableNumber,
                        customerName: currentDraft.customerName || 'Guest',
                        cashierName: sessionStorage.getItem('pizzora_admin_name') || 'Captain',
                        dateTime: new Date().toLocaleTimeString(),
                        items: combinedTicketItems.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
                        subtotal: ticketSubtotal,
                        discount: discountAmount,
                        total: ticketTotal,
                        paymentMethod: 'Bill Preview',
                        amountPaid: 0,
                        change: 0,
                      };
                      await printerService.printReceipt(kotData);
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-bold border border-gray-300 text-gray-700 hover:bg-gray-100 flex items-center gap-1"
                    title="Print Guest Check"
                  >
                    <Printer size={13} /> Pre-Print Bill
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Modals ────────────────────────────────────────────────────────── */}
      {showAddTableModal && (
        <TableModal
          title="Add New Table"
          form={tableForm}
          setForm={setTableForm}
          onSave={handleAddTable}
          onClose={() => setShowAddTableModal(false)}
        />
      )}

      {editingTable && (
        <TableModal
          title={`Edit Table ${editingTable.tableNumber}`}
          form={editForm}
          setForm={setEditForm}
          onSave={handleSaveEditTable}
          onClose={() => setEditingTable(null)}
        />
      )}

      {qrModalTable && (
        <QRModal
          table={qrModalTable}
          onClose={() => setQrModalTable(null)}
        />
      )}

      {transferModalTable && (
        <TransferTableModal
          currentTable={transferModalTable}
          tables={tables}
          onTransfer={handleTransferTable}
          onClose={() => setTransferModalTable(null)}
        />
      )}

      {paymentModalTable && (
        <TablePaymentModal
          table={paymentModalTable}
          activeOrder={activeOrder}
          draftItems={currentDraft.items}
          discountVal={currentDraft.discountVal}
          discountType={currentDraft.discountType}
          customerName={currentDraft.customerName}
          customerPhone={currentDraft.customerPhone}
          guestCount={currentDraft.guestCount}
          onComplete={() => {
            setPaymentModalTable(null);
            setViewMode('floor');
          }}
          onClose={() => setPaymentModalTable(null)}
        />
      )}

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
