import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, X, Save, Trash2, QrCode, Download, Users, Clock, CheckCircle,
  ChefHat, Bell, Utensils, DollarSign, RefreshCw, ExternalLink, Eye,
  FileText, Printer, Crown, Leaf, CookingPot, CircleDot,
  Receipt, StickyNote, TableProperties, Wifi, ArrowRight, Zap,
} from 'lucide-react';
import { useApp, RestaurantTable, TableArea, TableStatus, TableOrderStatus } from '../../context/AppContext';
import { AdminStatSkeleton } from '../Skeletons';

// ─── Status Config ────────────────────────────────────────────────────────────
const statusConfig: Record<TableStatus, { label: string; bg: string; text: string; border: string; dot: string; icon: typeof CircleDot }> = {
  Available: { label: 'Available', bg: '#F9F5F0', text: '#374151', border: '#E5E7EB', dot: '#9CA3AF', icon: CheckCircle },
  Ordering:  { label: 'Ordering',  bg: '#FFF5F5', text: '#F9002B', border: '#FEE2E2', dot: '#F9002B', icon: Utensils },
  Cooking:   { label: 'Cooking',   bg: '#FFF7ED', text: '#EA580C', border: '#FFEDD5', dot: '#EA580C', icon: CookingPot },
  Ready:     { label: 'Ready',     bg: '#F9002B', text: '#FFFFFF', border: '#C8001F', dot: '#FFFFFF', icon: Bell },
  Served:    { label: 'Served',    bg: '#C8001F', text: '#FFFFFF', border: '#990017', dot: '#FFFFFF', icon: ChefHat },
  Paid:      { label: 'Paid',      bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB', dot: '#D1D5DB', icon: Receipt },
};

const areas: TableArea[] = ['Dining', 'VIP', 'Outdoor'];

const areaConfig: Record<TableArea, { color: string; bg: string; borderColor: string; Icon: typeof Utensils; label: string }> = {
  Dining:  { color: '#F9002B', bg: '#FFF5F5', borderColor: 'rgba(249,0,43,0.12)', Icon: Utensils,  label: 'Dining Area' },
  VIP:     { color: '#EA580C', bg: '#FFF7ED', borderColor: 'rgba(234,88,12,0.12)', Icon: Crown,     label: 'VIP Area' },
  Outdoor: { color: '#0284C7', bg: '#F0F9FF', borderColor: 'rgba(2,132,199,0.12)',  Icon: Leaf,      label: 'Outdoor Area' },
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

function ElapsedTime({ since }: { since: number }) {
  const [elapsed, setElapsed] = useState(Math.floor((Date.now() - since) / 1000));
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - since) / 1000)), 1000);
    return () => clearInterval(id);
  }, [since]);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return <span style={{ color: m >= 20 ? '#DC2626' : undefined, fontWeight: m >= 20 ? 700 : undefined }}>{m}m {String(s).padStart(2, '0')}s</span>;
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: '10px',
  border: '1.5px solid rgba(249,0,43,0.18)', fontSize: '13px',
  fontFamily: 'var(--font-body)', outline: 'none', color: '#111', backgroundColor: '#fff',
};
const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-heading)', fontSize: '12px', fontWeight: 600, color: '#374151',
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
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgba(249,0,43,0.12)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)' }}>
              <TableProperties size={16} className="text-white" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '17px', color: '#111' }}>{title}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
            <X size={16} style={{ color: '#6B7280' }} />
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
            <label style={labelStyle}>Seats *</label>
            <input
              type="number" min={1} max={20} value={form.seats}
              onChange={e => setForm(f => ({ ...f, seats: e.target.value }))}
              placeholder="Number of seats" style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Area *</label>
            <div className="grid grid-cols-3 gap-2">
              {areas.map(a => {
                const cfg = areaConfig[a];
                const isActive = form.area === a;
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, area: a }))}
                    className="flex flex-col items-center gap-2 py-3 rounded-xl transition-all"
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
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5" style={{ background: 'linear-gradient(135deg, #1A0000, #C8001F)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(249,0,43,0.2)', border: '1px solid rgba(249,0,43,0.3)' }}>
                <QrCode size={16} style={{ color: '#F9002B' }} />
              </div>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '15px', color: '#fff' }}>QR Code</span>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <X size={14} style={{ color: 'rgba(255,255,255,0.7)' }} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '13px', color: '#1A0000' }}>{table.tableNumber}</span>
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '20px', color: '#F9002B', lineHeight: 1 }}>Table {table.tableNumber}</p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '2px' }}>
                <areaCfg.Icon size={10} style={{ display: 'inline', marginRight: '4px' }} />
                {table.area} Area · {table.seats} Seats
              </p>
            </div>
          </div>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center px-6 py-6">
          <div className="p-3 rounded-2xl shadow-lg mb-4" style={{ border: '3px solid #F9002B' }}>
            <img src={qrSrc} alt={`QR for Table ${table.tableNumber}`} className="w-56 h-56" />
          </div>
          <div className="flex items-center gap-2 mb-3">
            <Wifi size={13} style={{ color: '#16A34A' }} />
            <p style={{ fontSize: '12px', color: '#16A34A', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
              Scan to place order instantly
            </p>
          </div>
          <p className="text-center px-3 py-2 rounded-xl break-all w-full" style={{ fontSize: '10px', color: '#F9002B', backgroundColor: '#FFF5F5', fontFamily: 'monospace', border: '1px solid rgba(249,0,43,0.15)' }}>
            {tableUrl}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={() => window.open(tableUrl, '_blank')}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all hover:shadow-md"
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

// ─── Invoice Modal ─────────────────────────────────────────────────────────────
function InvoiceModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const { state } = useApp();
  const order = (state.tableOrders ?? []).find(o => o.id === orderId);
  if (!order) return null;
  const date = new Date(order.createdAt);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>
        {`
          @media print {
            @page { size: 80mm 297mm; margin: 0; }
            body * { visibility: hidden; }
            #printable-table-invoice, #printable-table-invoice * { visibility: visible; }
            #printable-table-invoice { position: absolute; left: 0; top: 0; width: 80mm; padding: 10px; font-family: monospace !important; font-size: 14px; background: white !important; }
            .pos-invoice-buttons { display: none !important; }
          }
        `}
      </style>
      <div id="printable-table-invoice" className="bg-white p-6 md:p-8 rounded-lg shadow-2xl w-full max-w-sm font-mono text-sm relative" style={{ color: '#000' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 4px 0', fontFamily: 'var(--font-heading)' }}>Pizzora Restaurant</h2>
          <p style={{ fontSize: '15px', margin: '2px 0' }}>Sylhet, Bangladesh</p>
        </div>

        <div style={{ borderBottom: '1.5px dashed #000', margin: '12px 0' }} />

        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <p style={{ fontSize: '15px', margin: '2px 0', fontWeight: 'bold' }}>Table {order.tableNumber}</p>
          <p style={{ fontSize: '15px', margin: '2px 0' }}>{date.toLocaleDateString()} {date.toLocaleTimeString()}</p>
          <p style={{ fontSize: '15px', margin: '2px 0' }}>Invoice #{order.id.split('-')[1] || order.id.slice(-6)}</p>
        </div>

        <div style={{ borderBottom: '1.5px dashed #000', margin: '12px 0' }} />

        <div style={{ marginBottom: '16px' }}>
          {order.items.map((item, i) => (
            <div key={item.itemId || i} style={{ display: 'flex', fontSize: '15px', margin: '6px 0' }}>
              <span style={{ width: '28px' }}>{item.quantity}</span>
              <span style={{ flex: 1 }}>{item.name}</span>
              <span>{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div style={{ borderBottom: '1.5px dashed #000', margin: '12px 0' }} />

        <div style={{ fontSize: '15px', fontWeight: 'bold' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0', fontSize: '18px' }}>
            <span>Total:</span>
            <span>{order.total.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0', fontWeight: 'normal' }}>
            <span>Status:</span>
            <span>{order.status === 'Paid' ? 'Paid' : 'Payment Pending'}</span>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <p style={{ fontSize: '15px', margin: '2px 0' }}>Thank you for dining at Pizzora!</p>
          <p style={{ fontSize: '13px', margin: '6px 0', color: '#555' }}>Powered by www.rizqara.tech</p>
        </div>

        <div className="flex gap-2 mt-8 pos-invoice-buttons">
          <button onClick={() => window.print()} className="flex-1 py-3 rounded text-sm font-bold flex items-center justify-center gap-2 transition-all hover:bg-gray-100"
            style={{ border: '1.5px solid #000', color: '#000' }}>
            <Printer size={15} /> Print Receipt
          </button>
          <button onClick={onClose} className="flex-1 py-3 rounded text-sm font-bold text-white transition-all hover:bg-gray-800"
            style={{ background: '#000' }}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Table Card ───────────────────────────────────────────────────────────────
function TableCard({
  table, isSelected, onClick,
}: {
  table: RestaurantTable;
  isSelected: boolean;
  onClick: () => void;
}) {
  const cfg = statusConfig[table.status];
  const StatusIcon = cfg.icon;
  const currentOrder = (useApp().state.tableOrders ?? []).find(
    o => o.id === table.currentOrderId && !['Paid'].includes(o.status)
  );

  return (
    <button
      onClick={onClick}
      className="relative p-5 rounded-3xl transition-all text-left w-full group overflow-hidden bg-white"
      style={{
        border: `1px solid ${table.status === 'Available' ? '#16A34A' : '#F9002B'}`,
        boxShadow: isSelected ? `0 12px 32px ${table.status === 'Available' ? 'rgba(22,163,74,0.2)' : 'rgba(249,0,43,0.2)'}` : '0 4px 16px rgba(0,0,0,0.03)',
        transform: isSelected ? 'translateY(-4px)' : 'translateY(0)',
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-1.5 transition-all group-hover:h-2" style={{ backgroundColor: cfg.dot }} />
      <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-5 transition-transform group-hover:scale-150" style={{ backgroundColor: cfg.dot }} />

      <div className="flex justify-between items-start mb-5 mt-1 relative z-10">
        <div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '20px', color: '#111', letterSpacing: '-0.5px' }}>
            Table {table.tableNumber}
          </h3>
          <p className="flex items-center gap-1.5 mt-1.5" style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, fontFamily: 'var(--font-body)' }}>
            <Users size={14} /> {table.seats} Seats
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-sm" style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}>
          <StatusIcon size={12} style={{ color: cfg.dot }} />
          <span style={{ fontSize: '11px', fontWeight: 800, color: cfg.text, fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{cfg.label}</span>
        </div>
      </div>

      {currentOrder ? (
        <div className="flex items-center justify-between pt-4 mt-2 relative z-10" style={{ borderTop: '1px dashed rgba(0,0,0,0.08)' }}>
          <div className="flex flex-col">
            <span style={{ fontSize: '10px', color: '#9CA3AF', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Amount</span>
            <span style={{ fontSize: '15px', fontFamily: 'var(--font-heading)', fontWeight: 800, color: '#F9002B' }}>
              ৳{currentOrder.total}
            </span>
          </div>
          {table.occupiedSince && (
            <div className="flex flex-col items-end">
              <span style={{ fontSize: '10px', color: '#9CA3AF', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Duration</span>
              <span className="flex items-center gap-1" style={{ fontSize: '13px', color: '#374151', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                <Clock size={12} style={{ color: '#9CA3AF' }} />
                <ElapsedTime since={table.occupiedSince} />
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center pt-4 mt-2 relative z-10" style={{ borderTop: '1px dashed rgba(0,0,0,0.06)' }}>
           <p style={{ fontSize: '12px', color: '#9CA3AF', fontFamily: 'var(--font-body)', fontWeight: 500 }}>No active order</p>
        </div>
      )}
    </button>
  );
}

// ─── Order Detail Panel ───────────────────────────────────────────────────────
function TableDetailPanel({
  table,
  onClose,
  isDrawer,
}: {
  table: RestaurantTable;
  onClose: () => void;
  isDrawer?: boolean;
}) {
  const { state, updateTableOrderStatus, setTableStatus, dispatch, showNotification } = useApp();
  const tableOrders = state.tableOrders ?? [];

  const selectedOrder = table.currentOrderId
    ? tableOrders.find(o => o.id === table.currentOrderId)
    : null;

  const [showQR, setShowQR] = useState(false);
  const [showInvoice, setShowInvoice] = useState<string | null>(null);

  const handleResetTable = () => {
    setTableStatus(table.id, 'Available', undefined);
    showNotification('Table reset to Available.', 'success');
  };

  const handleDeleteTable = () => {
    if (window.confirm('Delete this table?')) {
      dispatch({ type: 'DELETE_TABLE', payload: table.id });
      showNotification('Table deleted.', 'info');
      onClose();
    }
  };

  const cfg = statusConfig[table.status];
  const StatusIcon = cfg.icon;
  const areaCfg = areaConfig[table.area];

  const panelContent = (
    <>
      {/* Panel header */}
      <div className="p-5" style={{ background: 'linear-gradient(135deg, #1A0000, #C8001F)', borderRadius: isDrawer ? '20px 20px 0 0' : '16px 16px 0 0' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '13px', color: '#1A0000' }}>{table.tableNumber}</span>
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '16px', color: '#fff', lineHeight: 1 }}>
                Table {table.tableNumber}
              </p>
              <p className="flex items-center gap-1 mt-1" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>
                <areaCfg.Icon size={10} /> {table.area} · {table.seats} seats
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <X size={14} style={{ color: 'rgba(255,255,255,0.7)' }} />
          </button>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: cfg.bg }}>
          <StatusIcon size={11} style={{ color: cfg.dot }} />
          <span style={{ fontSize: '11px', fontWeight: 700, color: cfg.text, fontFamily: 'var(--font-heading)' }}>{cfg.label}</span>
        </div>
      </div>

      <div className="p-5 space-y-5 overflow-y-auto flex-1">
        {/* Quick Actions */}
        <div>
          <p style={{ ...labelStyle, marginBottom: '10px' }}>Quick Actions</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowQR(true)}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all hover:shadow-md active:scale-95"
              style={{ backgroundColor: '#DBEAFE', border: '1px solid #93C5FD' }}
            >
              <QrCode size={18} style={{ color: '#1E40AF' }} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#1E40AF', fontFamily: 'var(--font-heading)' }}>View QR</span>
            </button>
            <a
              href={`/table/${table.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all hover:shadow-md"
              style={{ backgroundColor: '#EDE9FE', border: '1px solid #C4B5FD', textDecoration: 'none' }}
            >
              <Eye size={18} style={{ color: '#7C3AED' }} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#7C3AED', fontFamily: 'var(--font-heading)' }}>Preview</span>
            </a>
            <button
              onClick={handleResetTable}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all hover:shadow-md active:scale-95"
              style={{ backgroundColor: '#DCFCE7', border: '1px solid #86EFAC' }}
            >
              <RefreshCw size={18} style={{ color: '#16A34A' }} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#16A34A', fontFamily: 'var(--font-heading)' }}>Reset</span>
            </button>
            <button
              onClick={handleDeleteTable}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all hover:shadow-md active:scale-95"
              style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5' }}
            >
              <Trash2 size={18} style={{ color: '#DC2626' }} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#DC2626', fontFamily: 'var(--font-heading)' }}>Delete</span>
            </button>
          </div>
        </div>

        {/* Current Order */}
        {selectedOrder ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p style={{ ...labelStyle, marginBottom: 0 }}>Current Order</p>
              <span className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ backgroundColor: statusConfig[selectedOrder.status as TableStatus]?.bg || '#F3F4F6' }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusConfig[selectedOrder.status as TableStatus]?.dot || '#9CA3AF' }} />
                <span style={{ fontSize: '10px', fontWeight: 700, color: statusConfig[selectedOrder.status as TableStatus]?.text || '#374151', fontFamily: 'var(--font-heading)' }}>{selectedOrder.status}</span>
              </span>
            </div>
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(249,0,43,0.1)' }}>
              {/* Order header */}
              <div className="px-4 py-3" style={{ backgroundColor: '#FDF8F3', borderBottom: '1px solid rgba(249,0,43,0.08)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '13px', color: '#111' }}>
                      Order #{selectedOrder.id.slice(-6).toUpperCase()}
                    </p>
                    <p style={{ fontSize: '11px', color: '#9CA3AF' }}>
                      {new Date(selectedOrder.createdAt).toLocaleTimeString()} · <ElapsedTime since={selectedOrder.createdAt} />
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={11} style={{ color: '#6B7280' }} />
                    <span style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'var(--font-heading)' }}>
                      {selectedOrder.items.length} item{selectedOrder.items.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items list */}
              <div className="px-4 py-3 space-y-2.5">
                {selectedOrder.items.map(item => (
                  <div key={item.itemId} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={item.image} alt={item.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="truncate" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '12px', color: '#111' }}>{item.name}</p>
                        {item.note && (
                          <p className="flex items-center gap-1 truncate" style={{ fontSize: '10px', color: '#9CA3AF' }}>
                            <StickyNote size={9} /> {item.note}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>×{item.quantity}</p>
                      <p style={{ fontSize: '12px', color: '#F9002B', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>৳{item.price * item.quantity}</p>
                    </div>
                  </div>
                ))}
                {selectedOrder.customerNote && (
                  <div className="flex items-start gap-2 px-3 py-2 rounded-xl mt-2" style={{ backgroundColor: 'rgba(249,0,43,0.04)', border: '1px solid rgba(249,0,43,0.1)' }}>
                    <StickyNote size={13} style={{ color: '#F9002B', flexShrink: 0, marginTop: '1px' }} />
                    <p style={{ fontSize: '11px', color: '#F9002B' }}>{selectedOrder.customerNote}</p>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: '1px solid rgba(249,0,43,0.08)', backgroundColor: '#FDF8F3' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '13px', color: '#374151' }}>Total</span>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '18px', color: '#F9002B' }}>৳{selectedOrder.total}</span>
              </div>

              {/* Status Action Buttons */}
              <div className="px-4 py-3 space-y-2" style={{ borderTop: '1px solid rgba(249,0,43,0.06)' }}>
                {orderStatusNext[selectedOrder.status] && (() => {
                  const nextStatus = orderStatusNext[selectedOrder.status]!;
                  const NextIcon = orderStatusIcon[selectedOrder.status] || ArrowRight;
                  const isConfirm = selectedOrder.status === 'Pending';
                  return (
                    <button
                      onClick={() => updateTableOrderStatus(selectedOrder.id, nextStatus)}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2"
                      style={{
                        background: isConfirm
                          ? 'linear-gradient(135deg, #16A34A, #15803D)'
                          : 'linear-gradient(135deg, #F9002B, #C8001F)',
                        fontFamily: 'var(--font-heading)',
                      }}
                    >
                      <NextIcon size={14} />
                      {orderStatusLabel[selectedOrder.status]}
                    </button>
                  );
                })()}
                <button
                  onClick={() => setShowInvoice(selectedOrder.id)}
                  className="w-full py-2 rounded-xl text-sm font-semibold transition-all hover:shadow-md flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#F3F4F6', color: '#374151', fontFamily: 'var(--font-heading)' }}
                >
                  <Receipt size={13} /> View Invoice
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center rounded-2xl" style={{ backgroundColor: '#F9F5F0', border: '1.5px dashed rgba(249,0,43,0.2)' }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: '#F3F4F6' }}>
              <Utensils size={24} style={{ color: '#D1D5DB' }} />
            </div>
            <p style={{ fontSize: '13px', color: '#9CA3AF', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>No active order</p>
            <p style={{ fontSize: '11px', color: '#D1D5DB', marginTop: '4px' }}>Scan QR to start ordering</p>
          </div>
        )}

        {/* Order History */}
        {(() => {
          const history = tableOrders.filter(
            o => o.tableId === table.id && ['Served', 'Paid'].includes(o.status)
          );
          if (history.length === 0) return null;
          return (
            <div>
              <p style={{ ...labelStyle, marginBottom: '10px' }}>Order History</p>
              <div className="space-y-2">
                {history.slice(0, 5).map(o => (
                  <div key={o.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ backgroundColor: '#F9F5F0', border: '1px solid rgba(249,0,43,0.06)' }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F3F4F6' }}>
                        <FileText size={12} style={{ color: '#9CA3AF' }} />
                      </div>
                      <div className="min-w-0">
                        <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '12px', color: '#111' }}>#{o.id.slice(-6).toUpperCase()}</p>
                        <p style={{ fontSize: '10px', color: '#9CA3AF' }}>{new Date(o.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '13px', color: '#F9002B' }}>৳{o.total}</span>
                      <button onClick={() => setShowInvoice(o.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
                        <Receipt size={12} style={{ color: '#9CA3AF' }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Modals */}
      {showQR && <QRModal table={table} onClose={() => setShowQR(false)} />}
      {showInvoice && <InvoiceModal orderId={showInvoice} onClose={() => setShowInvoice(null)} />}
    </>
  );

  if (isDrawer) {
    return createPortal(
      <div
        className="fixed inset-0 z-[9999] flex flex-col justify-end"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="bg-white flex flex-col"
          style={{ borderRadius: '20px 20px 0 0', maxHeight: '90vh', boxShadow: '0 -20px 60px rgba(0,0,0,0.3)' }}
        >
          {panelContent}
        </div>
      </div>,
      document.body
    );
  }

  return (
    <div className="w-80 flex-shrink-0">
      <div className="bg-white rounded-2xl shadow-sm flex flex-col sticky top-0" style={{ border: '1px solid rgba(0,0,0,0.06)', maxHeight: 'calc(100vh - 120px)' }}>
        {panelContent}
      </div>
    </div>
  );
}

// ─── Main TableManagement Component ──────────────────────────────────────────
export function TableManagement() {
  const { state, dispatch, showNotification } = useApp();

  const tables = state.tables ?? [];
  const tableOrders = state.tableOrders ?? [];

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [showAddTable, setShowAddTable] = useState(false);
  const [tableForm, setTableForm] = useState<{ tableNumber: string; seats: string; area: TableArea }>({
    tableNumber: '', seats: '4', area: 'Dining',
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const selectedTable = tables.find(t => t.id === selectedTableId) || null;
  const tablesByArea = (area: TableArea) => tables.filter(t => t.area === area);

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
    setShowAddTable(false);
    setTableForm({ tableNumber: '', seats: '4', area: 'Dining' });
  };

  const totalTables = tables.length;
  const availableTables = tables.filter(t => t.status === 'Available').length;
  const activeTables = totalTables - availableTables;
  const pendingOrders = tableOrders.filter(o => o.status === 'Pending').length;

  return (
    <div className="flex gap-5 h-full">
      {/* ── Left/Main: Floor Map ───────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-2">
          {[
            { label: 'Total Tables',  value: totalTables,       Icon: TableProperties, color: '#0284C7', bg: '#F0F9FF' },
            { label: 'Available',     value: availableTables,   Icon: CheckCircle,     color: '#16A34A', bg: '#F0FDF4' },
            { label: 'Occupied',      value: activeTables,      Icon: Users,           color: '#F9002B', bg: '#FFF5F5' },
            { label: 'New Orders',    value: pendingOrders,     Icon: Bell,            color: '#EA580C', bg: '#FFF7ED' },
          ].map(({ label, value, Icon, color, bg }) => (
            <div key={label} className="bg-white p-5 rounded-3xl relative overflow-hidden group transition-all hover:shadow-lg" style={{ border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.04] transition-transform duration-500 group-hover:scale-150" style={{ backgroundColor: color }} />
              <div className="flex justify-between items-start mb-4 relative z-10">
                <p style={{ fontSize: '12px', color: '#6B7280', fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm" style={{ backgroundColor: bg }}>
                  <Icon size={18} style={{ color }} />
                </div>
              </div>
              <p className="relative z-10" style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '36px', color: '#111', lineHeight: 1 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '16px', color: '#111' }}>
            Restaurant Floor Layout
          </h3>
          <div className="flex gap-2 flex-wrap">
            <a
              href="/kitchen"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all hover:shadow-md"
              style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontFamily: 'var(--font-heading)', border: '1px solid #FDE68A', textDecoration: 'none' }}
            >
              <ChefHat size={14} />
              <span className="hidden sm:inline">Kitchen Display</span>
              <span className="sm:hidden">Kitchen</span>
            </a>
            <button
              onClick={() => setShowAddTable(true)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)' }}
            >
              <Plus size={15} />
              <span className="hidden sm:inline">Add Table</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* Status Legend */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(statusConfig).map(([key, cfg]) => {
            const LegIcon = cfg.icon;
            return (
              <div key={key} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}>
                <LegIcon size={10} style={{ color: cfg.dot }} />
                <span style={{ fontSize: '11px', fontWeight: 600, color: cfg.text, fontFamily: 'var(--font-heading)' }}>{cfg.label}</span>
              </div>
            );
          })}
        </div>

        {/* Floor Areas */}
        <div className="space-y-10 mt-6 pb-12">
          {areas.map(area => {
            const areaTables = tablesByArea(area);
            if (areaTables.length === 0) return null;
            const areaCfg = areaConfig[area];
            return (
              <div key={area}>
                <div className="flex items-center justify-between mb-6 pb-4" style={{ borderBottom: '2px solid rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md" style={{ backgroundColor: areaCfg.bg, border: `1px solid ${areaCfg.borderColor}` }}>
                      <areaCfg.Icon size={20} style={{ color: areaCfg.color }} />
                    </div>
                    <div>
                      <h4 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '22px', color: '#111', letterSpacing: '-0.5px' }}>
                        {areaCfg.label}
                      </h4>
                      <p style={{ fontSize: '13px', color: '#6B7280', fontFamily: 'var(--font-body)', marginTop: '2px' }}>
                        {areaTables.length} tables in this section
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                     <span className="px-3 py-1.5 rounded-full" style={{ backgroundColor: `${areaCfg.color}15`, color: areaCfg.color, fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                       {areaTables.filter(t => t.status === 'Available').length} Available
                     </span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
                  {state.isInitialLoading ? (
                    Array.from({ length: Math.max(3, areaTables.length) }).map((_, i) => <AdminStatSkeleton key={i} />)
                  ) : (
                    areaTables.map(table => (
                      <TableCard
                        key={table.id}
                        table={table}
                        isSelected={selectedTableId === table.id}
                        onClick={() => setSelectedTableId(selectedTableId === table.id ? null : table.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}

          {tables.length === 0 && (
            <div className="py-20 text-center rounded-3xl" style={{ backgroundColor: '#fff', border: '2px dashed rgba(0,0,0,0.1)' }}>
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner" style={{ backgroundColor: '#FEE2E2' }}>
                <TableProperties size={32} style={{ color: '#F9002B' }} />
              </div>
              <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '20px', color: '#111', marginBottom: '8px' }}>No tables configured yet</p>
              <p style={{ fontSize: '15px', color: '#6B7280' }}>Click "Add Table" to map out your restaurant floor.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Table Detail Panel (desktop) ────────────── */}
      {selectedTable && !isMobile && (
        <TableDetailPanel
          table={selectedTable}
          onClose={() => setSelectedTableId(null)}
        />
      )}

      {/* ── Bottom Drawer (mobile) ─────────────────────────── */}
      {selectedTable && isMobile && (
        <TableDetailPanel
          table={selectedTable}
          onClose={() => setSelectedTableId(null)}
          isDrawer
        />
      )}

      {/* ── Add Table Modal ──────────────────────────────────── */}
      {showAddTable && (
        <TableModal
          title="Add New Table"
          form={tableForm}
          setForm={setTableForm}
          onSave={handleAddTable}
          onClose={() => setShowAddTable(false)}
        />
      )}
    </div>
  );
}
