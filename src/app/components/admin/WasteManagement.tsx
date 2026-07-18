import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Trash2, Plus, AlertCircle, Calendar } from 'lucide-react';
import { ConfirmModal } from '../ConfirmModal';

export function WasteManagement() {
  const { state, addWasteRecord, deleteWasteRecord } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ product: '', reason: '', costLoss: '', quantity: '1' });

  const adminRole = sessionStorage.getItem('pizzora_admin_role') || 'admin';
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product || !form.reason || !form.costLoss || !form.quantity) return;
    
    addWasteRecord({
      id: `WST${Date.now()}`,
      product: form.product,
      reason: form.reason,
      costLoss: parseFloat(form.costLoss),
      quantity: parseInt(form.quantity, 10),
      date: new Date().toISOString(),
    });
    setForm({ product: '', reason: '', costLoss: '', quantity: '1' });
    setShowAdd(false);
  };

  const totalWasteCost = state.wasteRecords.reduce((acc, curr) => acc + curr.costLoss, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)', color: '#111' }}>Waste Tracking</h2>
          <p className="text-gray-500 text-sm mt-1">Log and monitor kitchen waste, returned food, and spoiled items.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold transition-all hover:-translate-y-0.5 shadow-lg shadow-red-500/20"
          style={{ background: `linear-gradient(135deg, #F9002B, #C8001F)`, fontFamily: 'var(--font-heading)' }}
        >
          <Plus size={18} /> Log Waste
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-red-50 text-red-600">
            <Trash2 size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Items Wasted</p>
            <p className="text-2xl font-bold text-gray-900">{state.wasteRecords.reduce((acc, c) => acc + c.quantity, 0)}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-orange-50 text-orange-600">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Cost Loss</p>
            <p className="text-2xl font-bold text-gray-900">৳ {totalWasteCost.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
                <th className="p-4">Date</th>
                <th className="p-4">Product</th>
                <th className="p-4">Reason</th>
                <th className="p-4">Quantity</th>
                <th className="p-4">Cost Loss</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100">
              {state.wasteRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">No waste records found.</td>
                </tr>
              ) : (
                state.wasteRecords.map(record => (
                  <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 whitespace-nowrap text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        {new Date(record.date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-gray-900">{record.product}</td>
                    <td className="p-4 text-gray-600">{record.reason}</td>
                    <td className="p-4 text-gray-900 font-medium">{record.quantity}</td>
                    <td className="p-4 text-red-600 font-bold">৳ {record.costLoss.toFixed(2)}</td>
                    <td className="p-4 text-right">
                      {adminRole === 'admin' && (
                        <button
                          onClick={() => setDeleteConfirm({
                            isOpen: true,
                            title: 'Delete Waste Record?',
                            message: `Are you sure you want to delete this record for ${record.product}?`,
                            onConfirm: () => {
                              deleteWasteRecord(record.id);
                              setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
                            }
                          })}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl animate-fade-in">
            <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Log Waste</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Product / Item</label>
                <input type="text" required value={form.product} onChange={e => setForm({ ...form, product: e.target.value })}
                  placeholder="e.g. Pepperoni Pizza, Mozzarella"
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-100 outline-none focus:border-red-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Reason</label>
                <select required value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-100 outline-none focus:border-red-500 transition-colors bg-white">
                  <option value="">Select a reason...</option>
                  <option value="Burnt/Overcooked">Burnt / Overcooked</option>
                  <option value="Spoiled/Expired">Spoiled / Expired</option>
                  <option value="Returned by Customer">Returned by Customer</option>
                  <option value="Dropped/Spilled">Dropped / Spilled</option>
                  <option value="Preparation Error">Preparation Error</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Quantity</label>
                  <input type="number" min="1" required value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-100 outline-none focus:border-red-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Cost Loss (৳)</label>
                  <input type="number" min="0" step="0.01" required value={form.costLoss} onChange={e => setForm({ ...form, costLoss: e.target.value })}
                    placeholder="e.g. 150"
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-100 outline-none focus:border-red-500 transition-colors" />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3 rounded-xl font-bold text-white transition-all shadow-lg hover:-translate-y-0.5" style={{ background: `linear-gradient(135deg, #F9002B, #C8001F)` }}>Save Record</button>
              </div>
            </form>
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
