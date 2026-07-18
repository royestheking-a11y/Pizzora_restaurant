import React, { useState } from 'react';
import {
  Plus, Edit2, Trash2, Save, X, AlertTriangle, Package,
  TrendingDown, TrendingUp, Search, ChevronDown, BarChart3,
} from 'lucide-react';
import { useApp, InventoryItem, StockMovement } from '../../context/AppContext';
import { TableRowSkeleton } from '../Skeletons';
import { ConfirmModal } from '../ConfirmModal';

const CATEGORIES = ['Food Raw Materials','Beverages','Packaging','Cleaning','Kitchen Supplies','Utility Consumables', 'Fixed Assets'];
const UNITS = ['Kg','Gram','Liter','ml','Piece','Packet','Box','Dozen'];
const PZ = '#F9002B';
const PZD = '#C8001F';

const inputSt: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: '8px',
  border: '1.5px solid #E5E7EB', fontSize: '13px', outline: 'none',
  fontFamily: 'var(--font-body)', color: '#111', backgroundColor: '#fff',
};
const labelSt: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, color: '#374151', display: 'block',
  marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px',
  fontFamily: 'var(--font-heading)',
};

export function InventoryManagement() {
  const { state, dispatch } = useApp();
  const { inventory: items, stockMovements: movements } = state;
  const [tab, setTab] = useState<'stock' | 'movements' | 'alerts'>('stock');
  const [search, setSearch] = useState('');
  
  const adminRole = sessionStorage.getItem('pizzora_admin_role') || 'admin';
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [movementItem, setMovementItem] = useState('');
  const [movementType, setMovementType] = useState<StockMovement['type']>('Purchase IN');
  const [movementQty, setMovementQty] = useState('');
  const [movementNote, setMovementNote] = useState('');

  const blankForm = (): InventoryItem => ({
    id: '', name: '', sku: '', category: 'Food Raw Materials', unit: 'Kg',
    supplier: '', costPrice: 0, currentStock: 0, minStock: 0, maxStock: 100, expiryDate: '',
  });
  const [form, setForm] = useState<InventoryItem>(blankForm());

  const handleSave = () => {
    if (!form.name || !form.sku) return;
    if (editing) {
      dispatch({ type: 'UPDATE_INVENTORY_ITEM', payload: { ...form, id: editing.id } });
    } else {
      dispatch({ type: 'ADD_INVENTORY_ITEM', payload: { ...form, id: `inv-${Date.now()}` } });
    }
    setShowForm(false); setEditing(null); setForm(blankForm());
  };

  const handleDelete = (id: string) => dispatch({ type: 'DELETE_INVENTORY_ITEM', payload: id });

  const handleMovement = () => {
    if (!movementItem || !movementQty) return;
    const item = items.find(i => i.id === movementItem);
    if (!item) return;
    const qty = Number(movementQty);
    const delta = (movementType === 'Purchase IN' || movementType === 'Return IN') ? qty : -qty;
    dispatch({ type: 'UPDATE_INVENTORY_ITEM', payload: { ...item, currentStock: Math.max(0, item.currentStock + delta) } });
    const m: StockMovement = {
      id: `mv-${Date.now()}`, itemId: movementItem, itemName: item.name,
      type: movementType, quantity: qty, date: new Date().toISOString().split('T')[0], note: movementNote,
    };
    dispatch({ type: 'ADD_STOCK_MOVEMENT', payload: m });
    setShowMovementForm(false); setMovementQty(''); setMovementNote(''); setMovementItem('');
  };

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  );
  const lowStock = items.filter(i => i.currentStock <= i.minStock);
  const expiringSoon = items.filter(i => {
    if (!i.expiryDate) return false;
    const diff = (new Date(i.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff <= 7 && diff >= 0;
  });

  const totalValue = items.reduce((s, i) => s + i.currentStock * i.costPrice, 0);

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Items', value: items.length, color: '#0891B2', bg: '#CFFAFE' },
          { label: 'Low Stock Alerts', value: lowStock.length, color: PZ, bg: '#FEE2E2' },
          { label: 'Expiring Soon', value: expiringSoon.length, color: '#D97706', bg: '#FEF3C7' },
          { label: 'Total Value', value: `৳${totalValue.toLocaleString()}`, color: '#16A34A', bg: '#DCFCE7' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="bg-white p-4 rounded-2xl shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: '22px', fontWeight: 800, color, fontFamily: 'var(--font-heading)' }}>{value}</p>
            <p style={{ fontSize: '12px', color: '#6B7280', fontFamily: 'var(--font-heading)', fontWeight: 600, marginTop: '2px' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Tab Bar */}
      <div className="flex gap-2 mb-5">
        {(['stock', 'movements', 'alerts'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all"
            style={{ background: tab === t ? `linear-gradient(135deg,${PZ},${PZD})` : '#F3F4F6', color: tab === t ? '#fff' : '#6B7280', fontFamily: 'var(--font-heading)' }}>
            {t === 'stock' ? 'Stock Items' : t === 'movements' ? 'Stock Movements' : `Alerts (${lowStock.length + expiringSoon.length})`}
          </button>
        ))}
      </div>

      {/* STOCK TAB */}
      {tab === 'stock' && (
        <div className="bg-white rounded-2xl shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
          <div className="flex flex-col sm:flex-row gap-3 p-4 border-b" style={{ borderColor: '#F3F4F6' }}>
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search inventory…"
                style={{ ...inputSt, paddingLeft: '32px' }} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowMovementForm(true); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold"
                style={{ border: `1.5px solid ${PZ}`, color: PZ, fontFamily: 'var(--font-heading)' }}>
                <TrendingUp size={14} /> Stock In/Out
              </button>
              <button onClick={() => { setShowForm(true); setEditing(null); setForm(blankForm()); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-bold"
                style={{ background: `linear-gradient(135deg,${PZ},${PZD})`, fontFamily: 'var(--font-heading)' }}>
                <Plus size={14} /> Add Item
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#FFF5F5', borderBottom: `1px solid rgba(249,0,43,0.1)` }}>
                  {['SKU', 'Item Name', 'Category', 'Current Stock', 'Min Stock', 'Cost/Unit', 'Expiry', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left" style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'var(--font-heading)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state.isInitialLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={9} />)
                ) : (
                  <>
                    {filtered.map(item => {
                      const isLow = item.currentStock <= item.minStock;
                  return (
                    <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors" style={{ borderColor: '#F3F4F6' }}>
                      <td className="px-4 py-3" style={{ fontSize: '12px', color: PZ, fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{item.sku}</td>
                      <td className="px-4 py-3">
                        <p style={{ fontSize: '13px', fontWeight: 700, color: '#111', fontFamily: 'var(--font-heading)' }}>{item.name}</p>
                        <p style={{ fontSize: '11px', color: '#9CA3AF' }}>{item.supplier}</p>
                      </td>
                      <td className="px-4 py-3"><span className="px-2 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: '#F3F4F6', color: '#374151' }}>{item.category}</span></td>
                      <td className="px-4 py-3" style={{ fontSize: '14px', fontWeight: 800, color: isLow ? PZ : '#16A34A', fontFamily: 'var(--font-heading)' }}>{item.currentStock} {item.unit}</td>
                      <td className="px-4 py-3" style={{ fontSize: '13px', color: '#6B7280' }}>{item.minStock} {item.unit}</td>
                      <td className="px-4 py-3" style={{ fontSize: '13px', fontWeight: 700, color: '#111' }}>৳{item.costPrice.toLocaleString()}</td>
                      <td className="px-4 py-3" style={{ fontSize: '12px', color: '#6B7280' }}>{item.expiryDate || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: isLow ? '#FEE2E2' : '#DCFCE7', color: isLow ? PZ : '#16A34A' }}>
                          {isLow ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => { setEditing(item); setForm(item); setShowForm(true); }} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}><Edit2 size={12} /></button>
                          {adminRole === 'admin' && (
                            <button onClick={() => setDeleteConfirm({
                              isOpen: true,
                              title: 'Delete Inventory Item?',
                              message: `Are you sure you want to delete ${item.name}?`,
                              onConfirm: () => {
                                handleDelete(item.id);
                                setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
                              }
                            })} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}><Trash2 size={12} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={9} className="py-10 text-center" style={{ color: '#9CA3AF', fontSize: '14px' }}>No items found</td></tr>}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MOVEMENTS TAB */}
      {tab === 'movements' && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#FFF5F5', borderBottom: `1px solid rgba(249,0,43,0.1)` }}>
                  {['Date', 'Item', 'Movement Type', 'Quantity', 'Note'].map(h => (
                    <th key={h} className="px-4 py-3 text-left" style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'var(--font-heading)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state.isInitialLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={6} />)
                ) : (
                  <>
                    {movements.map(m => (
                  <tr key={m.id} className="border-b hover:bg-gray-50" style={{ borderColor: '#F3F4F6' }}>
                    <td className="px-4 py-3" style={{ fontSize: '12px', color: '#6B7280' }}>{m.date}</td>
                    <td className="px-4 py-3" style={{ fontSize: '13px', fontWeight: 700, color: '#111', fontFamily: 'var(--font-heading)' }}>{m.itemName}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-xs font-bold"
                        style={{ backgroundColor: m.type.includes('IN') ? '#DCFCE7' : '#FEE2E2', color: m.type.includes('IN') ? '#16A34A' : PZ }}>
                        {m.type}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ fontSize: '13px', fontWeight: 800, color: m.type.includes('IN') ? '#16A34A' : '#EF4444', fontFamily: 'var(--font-heading)' }}>
                      {m.type.includes('IN') ? '+' : '−'}{m.quantity}
                    </td>
                    <td className="px-4 py-3" style={{ fontSize: '12px', color: '#6B7280' }}>{m.note || '—'}</td>
                    </tr>
                  ))}
                  {movements.length === 0 && <tr><td colSpan={6} className="py-10 text-center" style={{ color: '#9CA3AF', fontSize: '14px' }}>No movements recorded</td></tr>}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ALERTS TAB */}
      {tab === 'alerts' && (
        <div className="space-y-4">
          {lowStock.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-5" style={{ border: `1px solid rgba(249,0,43,0.15)` }}>
              <h3 className="flex items-center gap-2 mb-4" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px', color: PZ }}>
                <AlertTriangle size={16} /> Low Stock Items ({lowStock.length})
              </h3>
              <div className="space-y-2">
                {lowStock.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: '#FFF5F5', border: `1px solid rgba(249,0,43,0.1)` }}>
                    <div>
                      <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '13px', color: '#111' }}>{item.name}</p>
                      <p style={{ fontSize: '11px', color: '#9CA3AF' }}>Supplier: {item.supplier}</p>
                    </div>
                    <div className="text-right">
                      <p style={{ fontWeight: 800, fontSize: '14px', color: PZ, fontFamily: 'var(--font-heading)' }}>{item.currentStock} {item.unit}</p>
                      <p style={{ fontSize: '11px', color: '#9CA3AF' }}>Min: {item.minStock} {item.unit}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {expiringSoon.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-5" style={{ border: '1px solid rgba(217,119,6,0.2)' }}>
              <h3 className="flex items-center gap-2 mb-4" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px', color: '#D97706' }}>
                <AlertTriangle size={16} /> Expiring Within 7 Days ({expiringSoon.length})
              </h3>
              <div className="space-y-2">
                {expiringSoon.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: '#FFFBEB', border: '1px solid rgba(217,119,6,0.15)' }}>
                    <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '13px', color: '#111' }}>{item.name}</p>
                    <p style={{ fontSize: '12px', color: '#D97706', fontWeight: 700 }}>Expires: {item.expiryDate}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {lowStock.length === 0 && expiringSoon.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
              <Package size={40} className="mx-auto mb-3" style={{ color: '#D1D5DB' }} />
              <p style={{ color: '#6B7280', fontSize: '15px', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>All stock levels are healthy!</p>
              <p style={{ color: '#9CA3AF', fontSize: '13px', marginTop: '4px' }}>No alerts at this time.</p>
            </div>
          )}
        </div>
      )}

      {/* ADD/EDIT FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl bg-white">
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: `rgba(249,0,43,0.1)` }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '17px', color: '#111' }}>
                {editing ? 'Edit Inventory Item' : 'Add Inventory Item'}
              </h2>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              {[
                { label: 'Item Name *', key: 'name', type: 'text', placeholder: 'e.g. Mozzarella Cheese' },
                { label: 'SKU *', key: 'sku', type: 'text', placeholder: 'e.g. CHE-001' },
                { label: 'Supplier', key: 'supplier', type: 'text', placeholder: 'Supplier name' },
                { label: 'Cost Price (৳/unit)', key: 'costPrice', type: 'number', placeholder: '0' },
                { label: 'Current Stock', key: 'currentStock', type: 'number', placeholder: '0' },
                { label: 'Min Stock', key: 'minStock', type: 'number', placeholder: '0' },
                { label: 'Max Stock', key: 'maxStock', type: 'number', placeholder: '100' },
                { label: 'Expiry Date', key: 'expiryDate', type: 'date', placeholder: '' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label style={labelSt}>{label}</label>
                  <input type={type} value={(form as any)[key]} placeholder={placeholder}
                    onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                    style={inputSt} />
                </div>
              ))}
              <div>
                <label style={labelSt}>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inputSt}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelSt}>Unit</label>
                <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} style={inputSt}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t" style={{ borderColor: 'rgba(249,0,43,0.08)' }}>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50" style={{ border: '1.5px solid #E5E7EB', color: '#374151', fontFamily: 'var(--font-heading)' }}>Cancel</button>
              <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold" style={{ background: `linear-gradient(135deg,${PZ},${PZD})`, fontFamily: 'var(--font-heading)' }}>
                <Save size={13} className="inline mr-1.5" />Save Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOVEMENT MODAL */}
      {showMovementForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl shadow-2xl bg-white">
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: `rgba(249,0,43,0.1)` }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '17px', color: '#111' }}>Stock Movement</h2>
              <button onClick={() => setShowMovementForm(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label style={labelSt}>Select Item</label>
                <select value={movementItem} onChange={e => setMovementItem(e.target.value)} style={inputSt}>
                  <option value="">— Select —</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.currentStock} {i.unit})</option>)}
                </select>
              </div>
              <div>
                <label style={labelSt}>Movement Type</label>
                <select value={movementType} onChange={e => setMovementType(e.target.value as StockMovement['type'])} style={inputSt}>
                  {(['Purchase IN','Return IN','Sale OUT','Waste OUT','Adjustment'] as StockMovement['type'][]).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelSt}>Quantity</label>
                <input type="number" value={movementQty} onChange={e => setMovementQty(e.target.value)} placeholder="0" style={inputSt} />
              </div>
              <div>
                <label style={labelSt}>Note (optional)</label>
                <input type="text" value={movementNote} onChange={e => setMovementNote(e.target.value)} placeholder="Reason or reference…" style={inputSt} />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t" style={{ borderColor: 'rgba(249,0,43,0.08)' }}>
              <button onClick={() => setShowMovementForm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50" style={{ border: '1.5px solid #E5E7EB', color: '#374151', fontFamily: 'var(--font-heading)' }}>Cancel</button>
              <button onClick={handleMovement} className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold" style={{ background: `linear-gradient(135deg,${PZ},${PZD})`, fontFamily: 'var(--font-heading)' }}>
                Record Movement
              </button>
            </div>
          </div>
        </div>
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
