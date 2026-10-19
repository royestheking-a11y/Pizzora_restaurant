import React, { useState, useMemo, useEffect } from 'react';
import {
  Trash2,
  RotateCcw,
  Search,
  Calendar,
  Package,
  Clock,
  Eye,
  Filter,
  Download,
  ShieldCheck,
  AlertCircle,
  FileText,
  Printer,
  ChevronRight,
  CheckCircle2,
  X,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { useApp, DeletedOrder } from '../../context/AppContext';

export function DeletedOrdersManagement() {
  const { state, dispatch, restoreDeletedOrder, purgeDeletedOrder, showNotification } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | '7days' | '30days' | 'all'>('today');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [viewingOrder, setViewingOrder] = useState<DeletedOrder | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [purgingId, setPurgingId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'restore' | 'purge'; order: DeletedOrder } | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Sync latest deleted orders from DB on component mount
  useEffect(() => {
    const token = typeof window !== 'undefined' ? (sessionStorage.getItem('pizzora_token') || localStorage.getItem('pizzora_token') || '') : '';
    fetch('/api/deleted-orders', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
        const list = data?.deletedOrders || data?.orders;
        if (data && data.success && Array.isArray(list)) {
          dispatch({ type: 'SET_DELETED_ORDERS', payload: list });
        }
      })
      .catch(err => console.warn('Could not refresh deleted orders:', err));
  }, [dispatch]);

  // Handle ESC key to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmAction && !isActionLoading) {
          setConfirmAction(null);
        } else if (viewingOrder) {
          setViewingOrder(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmAction, isActionLoading, viewingOrder]);

  const deletedOrders: DeletedOrder[] = state.deletedOrders || [];

  // Dynamic badge counts for each date preset
  const dateCounts = useMemo(() => {
    const now = Date.now();
    const dhakaToday = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const dhakaYesterday = y.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });

    let today = 0;
    let yesterday = 0;
    let sevenDays = 0;
    let thirtyDays = 0;

    deletedOrders.forEach(o => {
      const orderDateDhaka = new Date(o.deletedAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
      const orderTime = new Date(o.deletedAt).getTime();

      if (orderDateDhaka === dhakaToday) today++;
      if (orderDateDhaka === dhakaYesterday) yesterday++;
      if (orderTime >= now - 7 * 24 * 3600 * 1000) sevenDays++;
      if (orderTime >= now - 30 * 24 * 3600 * 1000) thirtyDays++;
    });

    return {
      today,
      yesterday,
      '7days': sevenDays,
      '30days': thirtyDays,
      all: deletedOrders.length
    };
  }, [deletedOrders]);

  // Filter logic
  const filteredOrders = useMemo(() => {
    const now = Date.now();
    const dhakaToday = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const dhakaYesterday = y.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });

    return deletedOrders.filter(order => {
      const orderDateDhaka = new Date(order.deletedAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
      const orderTime = new Date(order.deletedAt).getTime();

      // Date Filter
      if (dateFilter === 'today') {
        if (orderDateDhaka !== dhakaToday) return false;
      } else if (dateFilter === 'yesterday') {
        if (orderDateDhaka !== dhakaYesterday) return false;
      } else if (dateFilter === '7days') {
        if (orderTime < now - 7 * 24 * 60 * 60 * 1000) return false;
      } else if (dateFilter === '30days') {
        if (orderTime < now - 30 * 24 * 60 * 60 * 1000) return false;
      }

      // Payment Filter
      if (paymentFilter !== 'all' && (order.paymentMethod || '').toLowerCase() !== paymentFilter.toLowerCase()) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = (order.orderNumber || '').toLowerCase().includes(q);
        const matchesInv = (order.invoiceNumber || '').toLowerCase().includes(q);
        const matchesCust = (order.customerName || '').toLowerCase().includes(q);
        const matchesPhone = (order.customerPhone || '').toLowerCase().includes(q);
        const matchesReason = (order.deletionReason || '').toLowerCase().includes(q);
        const matchesBy = (order.deletedBy || '').toLowerCase().includes(q);
        const matchesTable = (order.tableNumber || '').toLowerCase().includes(q);
        if (!matchesNum && !matchesInv && !matchesCust && !matchesPhone && !matchesReason && !matchesBy && !matchesTable) {
          return false;
        }
      }

      return true;
    });
  }, [deletedOrders, searchQuery, dateFilter, paymentFilter]);

  // Summary Metrics reflecting active filter
  const stats = useMemo(() => {
    const totalDeleted = filteredOrders.length;
    const totalValue = filteredOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const totalRestockedItems = filteredOrders.reduce((sum, o) => {
      const items = Array.isArray(o.items) ? o.items : [];
      return sum + items.reduce((s, it) => s + (Number(it.quantity) || 1), 0);
    }, 0);

    return { totalDeleted, totalValue, totalRestockedItems };
  }, [filteredOrders]);

  const handleRestoreClick = (order: DeletedOrder) => {
    const validOrder = {
      ...order,
      id: order.id || (order as any)._id?.toString() || order.orderNumber
    };
    setConfirmAction({ type: 'restore', order: validOrder });
  };

  const handlePurgeClick = (order: DeletedOrder) => {
    const validOrder = {
      ...order,
      id: order.id || (order as any)._id?.toString() || order.orderNumber
    };
    setConfirmAction({ type: 'purge', order: validOrder });
  };

  const handleExecuteConfirm = async () => {
    if (!confirmAction) return;
    const { type, order } = confirmAction;
    const targetId = order.id || (order as any)._id?.toString() || order.orderNumber;
    setIsActionLoading(true);
    try {
      if (type === 'restore') {
        setRestoringId(targetId);
        await restoreDeletedOrder(targetId);
      } else {
        setPurgingId(targetId);
        await purgeDeletedOrder(targetId);
      }
      setConfirmAction(null);
    } finally {
      setIsActionLoading(false);
      setRestoringId(null);
      setPurgingId(null);
    }
  };

  const getDaysRemaining = (deletedAt: string) => {
    const deleteTime = new Date(deletedAt).getTime();
    const expiryTime = deleteTime + 30 * 24 * 60 * 60 * 1000;
    const remainingMs = expiryTime - Date.now();
    const days = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
    return Math.max(0, days);
  };

  const handleExportCSV = () => {
    if (!filteredOrders.length) {
      showNotification('No deleted orders to export.', 'info');
      return;
    }
    const headers = ['Order No', 'Invoice No', 'Type', 'Customer', 'Phone', 'Total (BDT)', 'Payment Method', 'Items Count', 'Deleted At', 'Deleted By', 'Reason'];
    const rows = filteredOrders.map(o => [
      `"${o.orderNumber || ''}"`,
      `"${o.invoiceNumber || ''}"`,
      `"${o.orderType || ''}"`,
      `"${o.customerName || ''}"`,
      `"${o.customerPhone || ''}"`,
      o.total || 0,
      `"${o.paymentMethod || 'Cash'}"`,
      (o.items || []).length,
      `"${new Date(o.deletedAt).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}"`,
      `"${o.deletedBy || 'Admin'}"`,
      `"${(o.deletionReason || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pizzora_deleted_orders_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" style={{ fontFamily: 'var(--font-heading)' }}>
      {/* Top Banner / Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-red-50 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Deleted Orders</span>
            <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
              <Trash2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">{stats.totalDeleted}</div>
          <p className="text-[11px] text-gray-400 mt-1">Archived deletion records</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-red-50 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cleared Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <span className="text-[17px] font-black leading-none select-none text-amber-700">৳</span>
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">৳{stats.totalValue.toLocaleString()}</div>
          <p className="text-[11px] text-gray-400 mt-1">Cleared from payments & sales reports</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-red-50 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Restocked Items</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Package size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">{stats.totalRestockedItems} Units</div>
          <p className="text-[11px] text-gray-400 mt-1">Auto-returned to inventory on delete</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-red-50 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Retention Policy</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-600">{deletedOrders.length} Records</div>
          <p className="text-[11px] text-gray-400 mt-1">Audit trail & retention archive</p>
        </div>
      </div>

      {/* Control Bar: Search & Filters (Mobile Responsive) */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Search Bar & Date Filter Pills */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 w-full">
          {/* Search Input */}
          <div className="relative flex-1 w-full min-w-0">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by order #, customer, table, reason..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all bg-gray-50/50 focus:bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Date Filter Pills (Guaranteed single-line with smooth horizontal touch-scroll on mobile) */}
          <div className="flex items-center gap-1 bg-gray-100/90 p-1 rounded-xl border border-gray-200/50 overflow-x-auto no-scrollbar shrink-0 max-w-full">
            {(['today', 'yesterday', '7days', '30days', 'all'] as const).map(f => {
              const label = f === 'today' ? 'Today' : f === 'yesterday' ? 'Yesterday' : f === '7days' ? '7 Days' : f === '30days' ? '30 Days' : 'All';
              const count = dateCounts[f];
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setDateFilter(f)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                    dateFilter === f
                      ? 'bg-white text-red-600 shadow-xs font-bold'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <span className="whitespace-nowrap">{label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold shrink-0 ${
                    dateFilter === f ? 'bg-red-50 text-red-600' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Controls: Payment Select & Export Button */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end shrink-0 pt-2 lg:pt-0 border-t border-gray-100 lg:border-t-0">
          {/* Payment Filter */}
          <select
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value)}
            className="flex-1 sm:flex-initial px-3 py-2 text-[11px] rounded-xl border border-gray-200 font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">All Payments</option>
            <option value="cash">Cash</option>
            <option value="bkash">bKash</option>
            <option value="nagad">Nagad</option>
            <option value="card">Card</option>
            <option value="split">Split</option>
          </select>

          {/* Export Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-[11px] font-semibold transition-all shadow-sm active:scale-95 shrink-0 whitespace-nowrap"
          >
            <Download size={13} />
            <span>Export Audit</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div>
            <h3 className="text-base font-bold text-gray-900">Deleted Orders Archive</h3>
            <p className="text-xs text-gray-400">Showing {filteredOrders.length} deleted records (cleared from reports & auto-restocked)</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-black bg-red-50 text-red-600 border border-red-100 shrink-0">
            Audit Trail Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                <th className="py-3 px-4"># Order</th>
                <th className="py-3 px-4">Customer / Table</th>
                <th className="py-3 px-4">Amount Cleared</th>
                <th className="py-3 px-4">Items Restocked</th>
                <th className="py-3 px-4">Deleted By & Reason</th>
                <th className="py-3 px-4">Deleted Date</th>
                <th className="py-3 px-4 text-center">Retention</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-400">
                    <Trash2 size={36} className="mx-auto mb-2 text-gray-300 stroke-[1.5]" />
                    <p className="font-bold text-gray-600 text-sm">No deleted orders in this view</p>
                    <p className="text-xs text-gray-400 mt-0.5">Orders deleted in the last 30 days will appear here automatically.</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const rowId = order.id || (order as any)._id?.toString() || order.orderNumber;
                  const daysLeft = getDaysRemaining(order.deletedAt);
                  const isTable = Boolean(order.tableNumber || order.tableId || order.orderType === 'Dine In');
                  const items = Array.isArray(order.items) ? order.items : [];
                  const totalUnits = items.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);

                  return (
                    <tr key={rowId} className="hover:bg-red-50/20 transition-colors">
                      {/* Order # */}
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-red-600">#{order.orderNumber}</div>
                        {order.invoiceNumber && order.invoiceNumber !== order.orderNumber && (
                          <div className="text-[10px] text-gray-400">{order.invoiceNumber}</div>
                        )}
                        <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                          isTable ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {isTable ? `Table ${order.tableNumber || ''}` : (order.orderType || 'POS')}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900">{order.customerName || 'Guest'}</div>
                        <div className="text-[11px] text-gray-400">{order.customerPhone || 'Walk-In'}</div>
                      </td>

                      {/* Amount & Payment */}
                      <td className="py-3 px-4">
                        <div className="font-extrabold line-through text-gray-400">
                          ৳{Number(order.total || 0).toLocaleString()}
                        </div>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                          {order.paymentMethod || 'Cash'}
                        </span>
                      </td>

                      {/* Items Restocked */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                          <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                          <span>{items.length} items ({totalUnits} units)</span>
                        </div>
                        <div className="text-[10px] text-gray-400 truncate max-w-[180px]">
                          {items.map(it => it.name || it.item?.name || 'Item').join(', ')}
                        </div>
                      </td>

                      {/* Deleted By & Reason */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-800">{order.deletedBy || 'Admin'}</div>
                        <div className="text-[11px] text-red-600 font-semibold">{order.deletionReason || 'Manual Deletion'}</div>
                      </td>

                      {/* Deleted Date */}
                      <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                        <div className="font-semibold">
                          {new Date(order.deletedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' })}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {new Date(order.deletedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' })}
                        </div>
                      </td>

                      {/* Retention countdown */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black ${
                          daysLeft > 10
                            ? 'bg-emerald-100 text-emerald-800'
                            : daysLeft > 3
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800 animate-pulse'
                        }`}>
                          <Clock size={11} />
                          {daysLeft} days left
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingOrder(order)}
                            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                            title="View Full Order Snapshot"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleRestoreClick(order)}
                            disabled={restoringId === rowId}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors disabled:opacity-50"
                            title="Restore Order (Undo Deletion & Re-deduct Stock)"
                          >
                            {restoringId === rowId ? (
                              <Loader2 size={14} className="animate-spin text-emerald-600" />
                            ) : (
                              <RotateCcw size={14} />
                            )}
                          </button>
                          <button
                            onClick={() => handlePurgeClick(order)}
                            disabled={purgingId === rowId}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors disabled:opacity-50"
                            title="Permanently Purge Record Now"
                          >
                            {purgingId === rowId ? (
                              <Loader2 size={14} className="animate-spin text-red-600" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Snapshot Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-5 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold">Deleted Order Snapshot</h3>
                <p className="text-xs text-gray-300">Order #{viewingOrder.orderNumber} • {viewingOrder.orderType}</p>
              </div>
              <button
                onClick={() => setViewingOrder(null)}
                className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="bg-red-50 p-3 rounded-2xl border border-red-100 space-y-1">
                <div className="flex justify-between font-bold text-red-900">
                  <span>Deletion Reason:</span>
                  <span>{viewingOrder.deletionReason || 'Manual Deletion'}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Deleted By:</span>
                  <span className="font-bold text-gray-800">{viewingOrder.deletedBy || 'Admin'}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Deleted At:</span>
                  <span>{new Date(viewingOrder.deletedAt).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-gray-700 block mb-2 uppercase text-[10px] tracking-wider">Restocked Items</span>
                <div className="bg-gray-50 rounded-2xl p-3 divide-y divide-gray-200/50 space-y-2">
                  {(viewingOrder.items || []).map((it, idx) => (
                    <div key={idx} className="flex justify-between pt-1.5 first:pt-0">
                      <div>
                        <span className="font-bold text-gray-900">{it.quantity}x {it.name || it.item?.name || 'Item'}</span>
                        {it.variant && <div className="text-[10px] text-gray-500 font-semibold">({it.variant})</div>}
                      </div>
                      <span className="font-extrabold text-gray-800">৳{((it.price || 0) * (it.quantity || 1)).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-3 space-y-1 text-gray-600 font-medium">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-bold text-gray-800">৳{(viewingOrder.subtotal || 0).toLocaleString()}</span>
                </div>
                {viewingOrder.discount > 0 && (
                  <div className="flex justify-between text-red-600 font-bold">
                    <span>Discount:</span>
                    <span>-৳{viewingOrder.discount.toLocaleString()}</span>
                  </div>
                )}
                {viewingOrder.deliveryFee && viewingOrder.deliveryFee > 0 ? (
                  <div className="flex justify-between">
                    <span>Delivery Fee:</span>
                    <span>৳{viewingOrder.deliveryFee}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-sm font-black text-gray-900 pt-1 border-t border-gray-200">
                  <span>Total Cleared:</span>
                  <span className="text-red-600">৳{Number(viewingOrder.total || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-1 text-[11px]">
                  <span>Payment Method:</span>
                  <span className="font-bold text-gray-800">{viewingOrder.paymentMethod || 'Cash'}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 border-t border-gray-100 flex items-center justify-between shrink-0">
              <button
                onClick={() => {
                  const o = viewingOrder;
                  setViewingOrder(null);
                  handleRestoreClick(o);
                }}
                disabled={restoringId === viewingOrder.id}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
              >
                {restoringId === viewingOrder.id ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <RotateCcw size={13} />
                )}
                Restore Order
              </button>
              <button
                onClick={() => setViewingOrder(null)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Confirmation Dialog (Replaces native browser popup) */}
      {confirmAction && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => { if (!isActionLoading) setConfirmAction(null); }}
        >
          <div 
            className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`p-6 pb-4 flex items-start gap-4 ${
              confirmAction.type === 'purge' ? 'bg-gradient-to-b from-red-50/70 to-transparent' : 'bg-gradient-to-b from-emerald-50/70 to-transparent'
            }`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                confirmAction.type === 'purge' 
                  ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-red-500/25' 
                  : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/25'
              }`}>
                {confirmAction.type === 'purge' ? (
                  <Trash2 size={22} className="stroke-[2.2]" />
                ) : (
                  <RotateCcw size={22} className="stroke-[2.2]" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    confirmAction.type === 'purge' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {confirmAction.type === 'purge' ? 'Permanent Purge' : 'Restore Order'}
                  </span>
                  <button
                    type="button"
                    onClick={() => { if (!isActionLoading) setConfirmAction(null); }}
                    className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
                <h3 className="text-base font-black text-gray-900 mt-1">
                  {confirmAction.type === 'purge' ? 'Permanently Purge Record?' : 'Restore This Order to Active?'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Order <span className="font-bold text-gray-800">#{confirmAction.order.orderNumber}</span>
                  {confirmAction.order.tableNumber ? ` • Table ${confirmAction.order.tableNumber}` : ''}
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-2 space-y-3.5 text-xs">
              {/* Order quick snapshot card */}
              <div className="bg-gray-50/90 rounded-2xl p-3.5 border border-gray-100 space-y-2">
                <div className="flex justify-between items-center text-gray-500 text-[11px]">
                  <span>Customer:</span>
                  <span className="font-bold text-gray-800">{confirmAction.order.customerName || 'Guest'}</span>
                </div>
                <div className="flex justify-between items-center text-gray-500 text-[11px]">
                  <span>Total Cleared:</span>
                  <span className="font-black text-gray-900 text-xs">৳{Number(confirmAction.order.total || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-gray-500 text-[11px]">
                  <span>Restocked Items:</span>
                  <span className="font-semibold text-gray-700">{(confirmAction.order.items || []).length} items</span>
                </div>
              </div>

              {/* Warning or Info banner */}
              {confirmAction.type === 'purge' ? (
                <div className="bg-red-50/90 border border-red-200/70 rounded-2xl p-3.5 text-red-900 space-y-1">
                  <div className="font-bold text-[11px] flex items-center gap-1.5 text-red-700">
                    <AlertTriangle size={13} className="shrink-0" />
                    <span>Warning: Irreversible Action</span>
                  </div>
                  <p className="text-[11px] text-red-700/90 leading-relaxed">
                    This order will be permanently erased from database records. You will not be able to view, trace, or restore it again.
                  </p>
                </div>
              ) : (
                <div className="bg-emerald-50/90 border border-emerald-200/70 rounded-2xl p-3.5 text-emerald-900 space-y-1">
                  <div className="font-bold text-[11px] flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle2 size={13} className="shrink-0" />
                    <span>Automatic Inventory Re-deduction</span>
                  </div>
                  <p className="text-[11px] text-emerald-700/90 leading-relaxed">
                    This order will be placed back into active orders and its items will be automatically re-deducted from current inventory.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-6 pt-4 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                disabled={isActionLoading}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 font-bold text-xs transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteConfirm}
                disabled={isActionLoading}
                className={`flex-1 py-2.5 px-4 rounded-xl font-extrabold text-xs text-white shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                  confirmAction.type === 'purge'
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-red-500/25'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/25'
                }`}
              >
                {isActionLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>{confirmAction.type === 'purge' ? 'Purging...' : 'Restoring...'}</span>
                  </>
                ) : (
                  <>
                    {confirmAction.type === 'purge' ? <Trash2 size={14} /> : <RotateCcw size={14} />}
                    <span>{confirmAction.type === 'purge' ? 'Yes, Purge Permanently' : 'Yes, Restore Order'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
