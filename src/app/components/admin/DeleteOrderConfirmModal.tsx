import React, { useState } from 'react';
import { AlertTriangle, Trash2, RotateCcw, PackageCheck, X, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface DeleteOrderConfirmModalProps {
  order: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DeleteOrderConfirmModal({
  order,
  isOpen,
  onClose,
  onSuccess
}: DeleteOrderConfirmModalProps) {
  const { deleteOrderWithCleanup, showNotification } = useApp();
  const [selectedReason, setSelectedReason] = useState<string>('Customer Cancelled');
  const [customReason, setCustomReason] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  if (!isOpen || !order) return null;

  const orderNumber = order.orderNumber || order.invoiceNumber || (order.id ? order.id.slice(-6) : 'Unknown');
  const isTable = Boolean(order.isTableOrder || order.tableNumber || order.tableId);
  const items = Array.isArray(order.items) ? order.items : [];
  const totalQty = items.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 1), 0);

  const reasonOptions = [
    'Customer Cancelled',
    'Wrong Table / Entry',
    'Duplicate Bill',
    'Customer Walkout',
    'Test / Practice Order',
    'Manager Void'
  ];

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const finalReason = customReason.trim() ? `${selectedReason} - ${customReason.trim()}` : selectedReason;
      const res = await deleteOrderWithCleanup(order, finalReason);
      if (res.success) {
        showNotification(`Order #${orderNumber} deleted, payment cleared & ${totalQty} items restocked.`, 'success');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        showNotification(res.error || 'Failed to delete order', 'error');
      }
    } catch (err: any) {
      showNotification(err.message || 'Error deleting order', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-red-100 flex flex-col max-h-[90vh]"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 px-6 py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
              <AlertTriangle className="text-white" size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight leading-tight">Delete Order & Clear Payment</h3>
              <p className="text-xs text-red-100 font-medium">1-Click cascading cleanup & inventory restock</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm text-gray-700">
          {/* Order Snapshot Card */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Order Reference</span>
                <div className="text-base font-extrabold text-red-600">#{orderNumber}</div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase ${
                isTable ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {isTable ? `Dine-In • Table ${order.tableNumber || ''}` : (order.orderType || 'POS')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-gray-200/60">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Customer</span>
                <span className="font-bold text-gray-800">{order.customerName || (order.tableNumber ? `Table ${order.tableNumber}` : 'Walk-in Guest')}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Amount & Payment</span>
                <span className="font-extrabold text-emerald-600">৳{Number(order.total || 0).toLocaleString()}</span>
                <span className="text-gray-500 font-semibold ml-1">({order.paymentMethod || 'Cash'})</span>
              </div>
            </div>
          </div>

          {/* 3-in-1 Guarantee Checklist */}
          <div className="space-y-2 bg-red-50/70 border border-red-200/60 rounded-2xl p-3.5">
            <span className="text-xs font-black text-red-900 uppercase tracking-wider block">
              What Happens When You Delete:
            </span>
            <div className="space-y-1.5 text-xs text-red-950 font-medium">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={15} className="text-red-600 shrink-0 mt-0.5" />
                <span><strong>Payment Cleared:</strong> Completely removed from Orders, Payments tab, and Cash Register reports in one step.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Inventory Restocked:</strong> <strong>{items.length}</strong> items ({totalQty} units) will be returned to stock with a logged Return-IN movement.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 size={15} className="text-blue-600 shrink-0 mt-0.5" />
                <span><strong>30-Day Archive:</strong> Stored in the <strong>Deleted Orders History</strong> for 30 days so you can audit or restore it anytime.</span>
              </div>
            </div>
          </div>

          {/* Items Preview */}
          {items.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Items Being Restocked ({totalQty})</span>
                <PackageCheck size={14} className="text-emerald-600" />
              </div>
              <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100 max-h-28 overflow-y-auto space-y-1">
                {items.map((it: any, i: number) => {
                  const name = it.name || it.item?.name || it.title || 'Item';
                  const qty = it.quantity || 1;
                  return (
                    <div key={i} className="flex items-center justify-between text-xs py-0.5 border-b border-gray-200/40 last:border-0">
                      <span className="font-semibold text-gray-800 truncate pr-2">
                        <strong className="text-emerald-700">{qty}x</strong> {name}
                      </span>
                      <span className="text-[11px] text-gray-400 font-bold shrink-0">
                        ৳{((it.price || it.item?.price || 0) * qty).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reason Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              Reason for Deletion
            </label>
            <div className="flex flex-wrap gap-1.5">
              {reasonOptions.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedReason(r)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    selectedReason === r
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Optional additional notes / remarks..."
              value={customReason}
              onChange={e => setCustomReason(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancel / Keep Order
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-extrabold shadow-lg shadow-red-600/30 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Deleting & Restocking...
              </>
            ) : (
              <>
                <Trash2 size={14} />
                Confirm Delete & Restock
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
