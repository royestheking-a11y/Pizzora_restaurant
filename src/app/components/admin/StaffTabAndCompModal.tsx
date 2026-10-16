import React, { useState, useMemo } from 'react';
import {
  X, Users, Gift, CheckCircle2, Clock, Banknote, Smartphone,
  CreditCard, Search, FileText, ChevronRight, User, AlertCircle,
  Sparkles, Calendar, ArrowRight, ShieldCheck, Tag, Download, Printer
} from 'lucide-react';
import { useApp, Order } from '../../context/AppContext';

interface StaffTabAndCompModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'staff-tabs' | 'complimentary';
}

// Net order total to be paid by staff member
export const getStaffOrderDue = (o: Order) => {
  if (typeof o.total === 'number' && o.total >= 0) return o.total;
  return o.subtotal || 0;
};

// Original menu subtotal before 100% comp
export const getCompRetailVal = (o: Order) => {
  return o.subtotal || o.total || 0;
};

export function StaffTabAndCompModal({ isOpen, onClose, initialTab = 'staff-tabs' }: StaffTabAndCompModalProps) {
  const { state, dispatch, showNotification } = useApp();
  const [activeTab, setActiveTab] = useState<'staff-tabs' | 'complimentary'>(initialTab);

  // Staff Tab Filters & Search
  const [staffSearch, setStaffSearch] = useState('');
  const [staffStatusFilter, setStaffStatusFilter] = useState<'all' | 'pending' | 'settled'>('pending');

  // Comp Filters & Search
  const [compSearch, setCompSearch] = useState('');
  const [compReasonFilter, setCompReasonFilter] = useState<string>('all');

  // Settlement Modal State
  const [settleOrder, setSettleOrder] = useState<Order | null>(null);
  const [settlementMethod, setSettlementMethod] = useState<'Cash' | 'bKash' | 'Nagad' | 'Salary Deduction' | 'Waived'>('Cash');
  const [settlementNotes, setSettlementNotes] = useState('');
  const [settleAllForStaff, setSettleAllForStaff] = useState<string | null>(null);

  // Sync initial tab when opened
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Extract all Staff Tab Orders (strictly only real Staff Tab payment method or valid staff member tab)
  const staffTabOrders = useMemo(() => {
    return (state.orders || []).filter(o => {
      const pm = (o.paymentMethod || '').trim().toLowerCase();
      if (pm === 'staff tab') return true;
      if (o.staffTabDetails?.staffName && o.staffTabDetails.staffName.trim() !== '') {
        const nonStaffPms = ['cash', 'card', 'bkash', 'nagad', 'split', 'cash on delivery', 'table check', 'pos'];
        if (!nonStaffPms.includes(pm)) {
          return true;
        }
      }
      return false;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.orders]);

  // Extract all Complimentary Orders (strictly only real Complimentary payment method or valid guest comp)
  const compOrders = useMemo(() => {
    return (state.orders || []).filter(o => {
      const pm = (o.paymentMethod || '').trim().toLowerCase();
      if (pm === 'complimentary') return true;
      if (o.compDetails?.guestName || o.compDetails?.reason) {
        const nonCompPms = ['cash', 'card', 'bkash', 'nagad', 'split', 'cash on delivery', 'table check', 'pos'];
        if (!nonCompPms.includes(pm)) {
          return true;
        }
      }
      return false;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.orders]);

  // Filtered Staff Orders
  const filteredStaffOrders = useMemo(() => {
    return staffTabOrders.filter(o => {
      const isSettled = o.staffTabDetails?.isSettled ?? false;
      if (staffStatusFilter === 'pending' && isSettled) return false;
      if (staffStatusFilter === 'settled' && !isSettled) return false;

      if (staffSearch.trim()) {
        const q = staffSearch.toLowerCase();
        const staffName = (o.staffTabDetails?.staffName || 'Staff Member').toLowerCase();
        const inv = (o.orderNumber || o.id || '').toLowerCase();
        const items = o.items.map(i => i.item.name).join(' ').toLowerCase();
        if (!staffName.includes(q) && !inv.includes(q) && !items.includes(q)) return false;
      }
      return true;
    });
  }, [staffTabOrders, staffStatusFilter, staffSearch]);

  // Filtered Comp Orders
  const filteredCompOrders = useMemo(() => {
    return compOrders.filter(o => {
      const reason = o.compDetails?.reason || 'Other';
      if (compReasonFilter !== 'all' && reason !== compReasonFilter) return false;

      if (compSearch.trim()) {
        const q = compSearch.toLowerCase();
        const guest = (o.compDetails?.guestName || o.customerName || 'VIP Guest').toLowerCase();
        const auth = (o.compDetails?.authorizedBy || '').toLowerCase();
        const inv = (o.orderNumber || o.id || '').toLowerCase();
        const items = o.items.map(i => i.item.name).join(' ').toLowerCase();
        if (!guest.includes(q) && !auth.includes(q) && !inv.includes(q) && !items.includes(q)) return false;
      }
      return true;
    });
  }, [compOrders, compReasonFilter, compSearch]);

  // Staff Tab Summary Metrics
  const staffMetrics = useMemo(() => {
    const pendingOrders = staffTabOrders.filter(o => !(o.staffTabDetails?.isSettled));
    const totalPendingAmount = pendingOrders.reduce((sum, o) => sum + getStaffOrderDue(o), 0);
    const uniquePendingStaff = new Set(pendingOrders.map(o => o.staffTabDetails?.staffName?.trim() || 'Staff Member')).size;

    const currentMonth = new Date().toISOString().slice(0, 7);
    const settledThisMonth = staffTabOrders.filter(o => {
      return o.staffTabDetails?.isSettled && (o.staffTabDetails?.settledAt || '').startsWith(currentMonth);
    }).reduce((sum, o) => sum + getStaffOrderDue(o), 0);

    return { totalPendingAmount, uniquePendingStaff, settledThisMonth, totalStaffOrders: staffTabOrders.length };
  }, [staffTabOrders]);

  // Group Pending Orders by Staff Member
  const staffGroupedPending = useMemo(() => {
    const groups: Record<string, { staffName: string; staffId?: string; orders: Order[]; totalDue: number }> = {};
    staffTabOrders.filter(o => !(o.staffTabDetails?.isSettled)).forEach(o => {
      const key = o.staffTabDetails?.staffName?.trim() || 'Staff Member';
      if (!groups[key]) {
        groups[key] = {
          staffName: key,
          staffId: o.staffTabDetails?.staffId,
          orders: [],
          totalDue: 0,
        };
      }
      groups[key].orders.push(o);
      groups[key].totalDue += getStaffOrderDue(o);
    });
    return Object.values(groups).sort((a, b) => b.totalDue - a.totalDue);
  }, [staffTabOrders]);

  // Comp Metrics
  const compMetrics = useMemo(() => {
    const totalCompValue = compOrders.reduce((sum, o) => sum + getCompRetailVal(o), 0);
    const currentMonth = new Date().toISOString().slice(0, 7);
    const thisMonthValue = compOrders
      .filter(o => (o.createdAt || '').startsWith(currentMonth))
      .reduce((sum, o) => sum + getCompRetailVal(o), 0);

    const reasonCounts: Record<string, number> = {};
    compOrders.forEach(o => {
      const r = o.compDetails?.reason || 'Other';
      reasonCounts[r] = (reasonCounts[r] || 0) + 1;
    });

    return { totalCompOrders: compOrders.length, totalCompValue, thisMonthValue, reasonCounts };
  }, [compOrders]);

  // Export current active tab as CSV
  const handleExportCSV = () => {
    if (activeTab === 'staff-tabs') {
      const rows = [
        ['Invoice', 'Date', 'Staff Name', 'Items Consumed', 'Amount (BDT)', 'Status', 'Settled Date', 'Payment Method', 'Notes'],
        ...filteredStaffOrders.map(o => [
          `"${o.orderNumber || o.id}"`,
          `"${new Date(o.createdAt).toLocaleString()}"`,
          `"${(o.staffTabDetails?.staffName || o.customerName || 'Staff Member').replace(/"/g, '""')}"`,
          `"${o.items.map(i => `${i.quantity}x ${i.item.name}`).join('; ').replace(/"/g, '""')}"`,
          getStaffOrderDue(o),
          o.staffTabDetails?.isSettled ? 'Settled' : 'Unpaid Due',
          o.staffTabDetails?.settledAt ? `"${new Date(o.staffTabDetails.settledAt).toLocaleString()}"` : '""',
          `"${o.staffTabDetails?.settledMethod || ''}"`,
          `"${(o.staffTabDetails?.notes || '').replace(/"/g, '""')}"`
        ])
      ];
      const csv = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(r => r.join(',')).join('\n');
      const link = document.createElement('a');
      link.setAttribute('href', encodeURI(csv));
      link.setAttribute('download', `Pizzora_Staff_Tabs_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showNotification('Staff Tab records exported to CSV!', 'success');
    } else {
      const rows = [
        ['Invoice', 'Date', 'Guest / Host', 'Reason', 'Authorized By', 'Items Served', 'Retail Value (BDT)', 'Notes'],
        ...filteredCompOrders.map(o => [
          `"${o.orderNumber || o.id}"`,
          `"${new Date(o.createdAt).toLocaleString()}"`,
          `"${(o.compDetails?.guestName || o.customerName || 'VIP Guest').replace(/"/g, '""')}"`,
          `"${(o.compDetails?.reason || 'Other').replace(/"/g, '""')}"`,
          `"${(o.compDetails?.authorizedBy || 'Manager').replace(/"/g, '""')}"`,
          `"${o.items.map(i => `${i.quantity}x ${i.item.name}`).join('; ').replace(/"/g, '""')}"`,
          getCompRetailVal(o),
          `"${(o.compDetails?.notes || '').replace(/"/g, '""')}"`
        ])
      ];
      const csv = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(r => r.join(',')).join('\n');
      const link = document.createElement('a');
      link.setAttribute('href', encodeURI(csv));
      link.setAttribute('download', `Pizzora_Complimentary_Meals_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showNotification('Complimentary meal records exported to CSV!', 'success');
    }
  };

  // Handle single order settlement
  const handleConfirmSingleSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleOrder) return;

    const adminName = sessionStorage.getItem('pizzora_admin_name') || 'Admin';
    dispatch({
      type: 'SETTLE_STAFF_TAB',
      payload: {
        orderId: settleOrder.id,
        settledMethod: settlementMethod,
        settledBy: adminName,
        notes: settlementNotes,
      }
    });

    showNotification(
      `Order ${settleOrder.orderNumber || settleOrder.id} settled via ${settlementMethod}! ${
        settlementMethod === 'Cash' ? 'Cash added to today\'s drawer.' : ''
      }`,
      'success'
    );

    setSettleOrder(null);
    setSettlementNotes('');
  };

  // Handle batch settlement for all orders of a staff member
  const handleConfirmAllStaffSettlement = (staffName: string) => {
    const ordersToSettle = staffTabOrders.filter(
      o => (o.staffTabDetails?.staffName || 'Staff Member') === staffName && !o.staffTabDetails?.isSettled
    );

    const adminName = sessionStorage.getItem('pizzora_admin_name') || 'Admin';
    ordersToSettle.forEach(o => {
      dispatch({
        type: 'SETTLE_STAFF_TAB',
        payload: {
          orderId: o.id,
          settledMethod: settlementMethod,
          settledBy: adminName,
          notes: settlementNotes || `Batch settlement for ${staffName}`,
        }
      });
    });

    showNotification(
      `All ${ordersToSettle.length} orders for ${staffName} settled via ${settlementMethod}!`,
      'success'
    );

    setSettleAllForStaff(null);
    setSettlementNotes('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="w-full max-w-5xl rounded-3xl shadow-2xl bg-white border border-gray-100 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md bg-gradient-to-br from-red-500 to-amber-500">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                  Staff Tab & Guest Free Meals Hub
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-white/10 text-amber-300">
                  Audit & Cash Protection
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-0.5">
                Track deferred staff dining, collect past dues, and log 100% complimentary VIP meals
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Export current tab records as CSV"
            >
              <Download size={13} /> Export CSV
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-gray-100 flex items-center gap-4 bg-gray-50/70">
          <button
            onClick={() => setActiveTab('staff-tabs')}
            className={`pb-3 px-2 text-xs font-black transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'staff-tabs'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            <Users size={15} />
            <span>Staff Tab & Due Ledger</span>
            {staffMetrics.totalPendingAmount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                ৳{staffMetrics.totalPendingAmount.toLocaleString()} Due
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('complimentary')}
            className={`pb-3 px-2 text-xs font-black transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'complimentary'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            <Gift size={15} />
            <span>Guest Free Meals (Complimentary)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
              {compMetrics.totalCompOrders} Logged
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* ═════════════════ TAB 1: STAFF TAB DUE LEDGER ═════════════════ */}
          {activeTab === 'staff-tabs' && (
            <div className="space-y-6">
              
              {/* Metric Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200">
                  <div className="flex items-center justify-between text-amber-800">
                    <span className="text-[11px] font-black uppercase tracking-wider">Total Unpaid Staff Due</span>
                    <Clock size={16} />
                  </div>
                  <div className="text-2xl font-black text-amber-900 mt-2" style={{ fontFamily: 'var(--font-heading)' }}>
                    ৳{staffMetrics.totalPendingAmount.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-amber-700 mt-1 font-semibold">
                    Across {staffMetrics.uniquePendingStaff} staff members
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200">
                  <div className="flex items-center justify-between text-emerald-800">
                    <span className="text-[11px] font-black uppercase tracking-wider">Settled This Month</span>
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="text-2xl font-black text-emerald-900 mt-2" style={{ fontFamily: 'var(--font-heading)' }}>
                    ৳{staffMetrics.settledThisMonth.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-1 font-semibold">
                    Collected or deducted from payroll
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-200">
                  <div className="flex items-center justify-between text-purple-800">
                    <span className="text-[11px] font-black uppercase tracking-wider">Total Staff Orders</span>
                    <Users size={16} />
                  </div>
                  <div className="text-2xl font-black text-purple-900 mt-2" style={{ fontFamily: 'var(--font-heading)' }}>
                    {staffMetrics.totalStaffOrders}
                  </div>
                  <div className="text-[11px] text-purple-700 mt-1 font-semibold">
                    Lifetime staff meals punched
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200">
                  <div className="flex items-center justify-between text-blue-800">
                    <span className="text-[11px] font-black uppercase tracking-wider">Cash Register Rule</span>
                    <ShieldCheck size={16} />
                  </div>
                  <div className="text-xs text-blue-900 font-bold mt-2 leading-relaxed">
                    Zero False Shortages:
                  </div>
                  <div className="text-[10.5px] text-blue-700 mt-0.5 leading-snug">
                    Staff tabs do not count as expected drawer cash until settled!
                  </div>
                </div>
              </div>

              {/* Grouped Staff Overview (Quick Settle by Staff) */}
              {staffGroupedPending.length > 0 && (
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-amber-600" />
                      <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider" style={{ fontFamily: 'var(--font-heading)' }}>
                        Staff Members with Pending Dues
                      </h4>
                    </div>
                    <span className="text-xs text-gray-500 font-semibold">
                      Click "Settle All" to clear entire tab at once
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {staffGroupedPending.map(group => (
                      <div key={group.staffName} className="p-3.5 rounded-xl bg-white border border-gray-200 hover:border-amber-400 hover:shadow-xs transition-all space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-extrabold text-sm text-gray-900 block" style={{ fontFamily: 'var(--font-heading)' }}>
                              {group.staffName}
                            </span>
                            <span className="text-[11px] text-gray-500 font-medium">
                              {group.orders.length} unpaid {group.orders.length === 1 ? 'order' : 'orders'}
                            </span>
                          </div>
                          <span className="px-2 py-1 rounded-lg text-xs font-black bg-amber-100 text-amber-900">
                            ৳{group.totalDue.toLocaleString()}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSettleAllForStaff(group.staffName)}
                          className="w-full py-1.5 px-3 rounded-lg text-xs font-extrabold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 flex items-center justify-center gap-1.5 transition-colors"
                          style={{ fontFamily: 'var(--font-heading)' }}
                        >
                          <CheckCircle2 size={13} className="text-amber-700" />
                          <span>Settle Full Tab (৳{group.totalDue.toLocaleString()})</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="relative w-full sm:w-72">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={staffSearch}
                    onChange={e => setStaffSearch(e.target.value)}
                    placeholder="Search staff, item, invoice..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                  />
                  {staffSearch && (
                    <button onClick={() => setStaffSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  {(['pending', 'settled', 'all'] as const).map(tabKey => (
                    <button
                      key={tabKey}
                      onClick={() => setStaffStatusFilter(tabKey)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors ${
                        staffStatusFilter === tabKey
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {tabKey === 'all' ? 'All History' : `${tabKey} Dues`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Staff Orders Table */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                {filteredStaffOrders.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 space-y-2">
                    <Users size={32} className="mx-auto text-gray-300" />
                    <p className="text-xs font-medium">No staff tab orders match your filter.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[10px] font-black">
                          <th className="py-3 px-4">Invoice / Date</th>
                          <th className="py-3 px-4">Staff Member</th>
                          <th className="py-3 px-4">Items Consumed</th>
                          <th className="py-3 px-4 text-right">Amount (৳)</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredStaffOrders.map(order => {
                          const isSettled = order.staffTabDetails?.isSettled ?? false;
                          const staffName = order.staffTabDetails?.staffName || 'Staff Member';
                          const orderAmt = getStaffOrderDue(order);

                          return (
                            <tr key={order.id} className="hover:bg-amber-50/20 transition-colors">
                              <td className="py-3 px-4">
                                <span className="font-bold text-gray-900 block" style={{ fontFamily: 'var(--font-heading)' }}>
                                  #{order.orderNumber || order.id.slice(-6)}
                                </span>
                                <span className="text-[10.5px] text-gray-400">
                                  {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-black text-xs">
                                    {staffName.charAt(0)}
                                  </div>
                                  <div>
                                    <span className="font-extrabold text-gray-900 block">{staffName}</span>
                                    {order.staffTabDetails?.notes && (
                                      <span className="text-[10px] text-gray-500 block italic">"{order.staffTabDetails.notes}"</span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="max-w-xs truncate text-gray-700">
                                  {order.items.map(i => `${i.quantity}x ${i.item.name}`).join(', ')}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right font-black text-gray-900 text-sm" style={{ fontFamily: 'var(--font-heading)' }}>
                                ৳{orderAmt.toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {isSettled ? (
                                  <div className="inline-flex flex-col items-center">
                                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-emerald-100 text-emerald-800">
                                      Settled
                                    </span>
                                    <span className="text-[9.5px] text-gray-400 mt-0.5">
                                      via {order.staffTabDetails?.settledMethod || 'Cash'}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-amber-100 text-amber-800 animate-pulse">
                                    Unpaid Due
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {!isSettled ? (
                                  <button
                                    type="button"
                                    onClick={() => setSettleOrder(order)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-all flex items-center gap-1 ml-auto"
                                    style={{ fontFamily: 'var(--font-heading)' }}
                                  >
                                    <CheckCircle2 size={13} />
                                    <span>Settle</span>
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-gray-400 font-medium">
                                    {order.staffTabDetails?.settledAt ? new Date(order.staffTabDetails.settledAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Paid'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═════════════════ TAB 2: COMPLIMENTARY GUEST MEALS ═════════════════ */}
          {activeTab === 'complimentary' && (
            <div className="space-y-6">

              {/* Metric Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200">
                  <div className="flex items-center justify-between text-emerald-800">
                    <span className="text-[11px] font-black uppercase tracking-wider">Total Comp Value (Retail)</span>
                    <Gift size={16} />
                  </div>
                  <div className="text-2xl font-black text-emerald-900 mt-2" style={{ fontFamily: 'var(--font-heading)' }}>
                    ৳{compMetrics.totalCompValue.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-1 font-semibold">
                    100% complimentary to guests
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200">
                  <div className="flex items-center justify-between text-blue-800">
                    <span className="text-[11px] font-black uppercase tracking-wider">This Month's Comp</span>
                    <Calendar size={16} />
                  </div>
                  <div className="text-2xl font-black text-blue-900 mt-2" style={{ fontFamily: 'var(--font-heading)' }}>
                    ৳{compMetrics.thisMonthValue.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-blue-700 mt-1 font-semibold">
                    Marketing / hospitality cost
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200">
                  <div className="flex items-center justify-between text-amber-800">
                    <span className="text-[11px] font-black uppercase tracking-wider">Total Free Orders</span>
                    <FileText size={16} />
                  </div>
                  <div className="text-2xl font-black text-amber-900 mt-2" style={{ fontFamily: 'var(--font-heading)' }}>
                    {compMetrics.totalCompOrders}
                  </div>
                  <div className="text-[11px] text-amber-700 mt-1 font-semibold">
                    Guests / VIPs entertained
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
                  <div className="flex items-center justify-between text-gray-700">
                    <span className="text-[11px] font-black uppercase tracking-wider">Inventory Deduction</span>
                    <ShieldCheck size={16} />
                  </div>
                  <div className="text-xs text-gray-900 font-bold mt-2 leading-relaxed">
                    Automatically Deducted
                  </div>
                  <div className="text-[10.5px] text-gray-600 mt-0.5 leading-snug">
                    Kitchen uses real ingredients; inventory stock is 100% reconciled.
                  </div>
                </div>
              </div>

              {/* Reasons Breakdown Pills */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex flex-wrap items-center gap-2">
                <span className="text-xs font-black text-gray-700 uppercase tracking-wider mr-2" style={{ fontFamily: 'var(--font-heading)' }}>
                  Breakdown by Reason:
                </span>
                {Object.entries(compMetrics.reasonCounts).map(([reason, count]) => (
                  <span key={reason} className="px-3 py-1 rounded-xl text-xs font-bold bg-white border border-gray-200 text-gray-800 shadow-2xs flex items-center gap-1.5">
                    <Tag size={12} className="text-emerald-600" />
                    <span>{reason}:</span>
                    <strong className="text-emerald-700 font-black">{count}</strong>
                  </span>
                ))}
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="relative w-full sm:w-72">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={compSearch}
                    onChange={e => setCompSearch(e.target.value)}
                    placeholder="Search guest, authorizer, item..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs bg-white text-gray-900 focus:outline-none focus:border-emerald-500"
                  />
                  {compSearch && (
                    <button onClick={() => setCompSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={compReasonFilter}
                    onChange={e => setCompReasonFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs bg-white text-gray-900 font-bold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="all">All Reasons</option>
                    <option value="Owner / Partner Guest">Owner / Partner Guest</option>
                    <option value="VIP / Influencer">VIP / Influencer</option>
                    <option value="Customer Compensation">Customer Compensation</option>
                    <option value="Food Tasting / Quality Check">Food Tasting / Quality Check</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Complimentary Orders Table */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                {filteredCompOrders.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 space-y-2">
                    <Gift size={32} className="mx-auto text-gray-300" />
                    <p className="text-xs font-medium">No complimentary orders recorded yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[10px] font-black">
                          <th className="py-3 px-4">Invoice / Date</th>
                          <th className="py-3 px-4">Guest / Host</th>
                          <th className="py-3 px-4">Reason & Authorized By</th>
                          <th className="py-3 px-4">Items Served</th>
                          <th className="py-3 px-4 text-right">Retail Value (৳)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredCompOrders.map(order => {
                          const guestName = order.compDetails?.guestName || order.customerName || 'VIP Guest';
                          const reason = order.compDetails?.reason || 'Owner Guest';
                          const authBy = order.compDetails?.authorizedBy || 'Manager';
                          const orderVal = order.subtotal || order.total || 0;

                          return (
                            <tr key={order.id} className="hover:bg-emerald-50/20 transition-colors">
                              <td className="py-3 px-4">
                                <span className="font-bold text-gray-900 block" style={{ fontFamily: 'var(--font-heading)' }}>
                                  #{order.orderNumber || order.id.slice(-6)}
                                </span>
                                <span className="text-[10.5px] text-gray-400">
                                  {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs">
                                    <User size={13} />
                                  </div>
                                  <div>
                                    <span className="font-extrabold text-gray-900 block">{guestName}</span>
                                    {order.compDetails?.notes && (
                                      <span className="text-[10px] text-gray-500 block italic">"{order.compDetails.notes}"</span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-purple-100 text-purple-900 block w-max">
                                  {reason}
                                </span>
                                <span className="text-[10px] text-gray-500 font-semibold mt-0.5 block">
                                  Auth by: <strong className="text-gray-800">{authBy}</strong>
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="max-w-xs truncate text-gray-700">
                                  {order.items.map(i => `${i.quantity}x ${i.item.name}`).join(', ')}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span className="font-black text-emerald-700 text-sm block" style={{ fontFamily: 'var(--font-heading)' }}>
                                  ৳{orderVal.toLocaleString()}
                                </span>
                                <span className="text-[10px] text-emerald-600 font-bold block uppercase tracking-wider">
                                  100% Free
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-emerald-600" />
            <span>Pizzora Restaurant Food & Cash Governance System</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-gray-900 hover:bg-black text-white transition-colors"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Close Hub
          </button>
        </div>

      </div>

      {/* ── Settlement Modal (Single Order) ── */}
      {settleOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h4 className="text-base font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                  Settle Staff Tab
                </h4>
                <p className="text-xs text-gray-500">
                  Order #{settleOrder.orderNumber || settleOrder.id.slice(-6)} • {settleOrder.staffTabDetails?.staffName || 'Staff Member'}
                </p>
              </div>
              <button onClick={() => setSettleOrder(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900">Total Due Amount:</span>
              <span className="text-lg font-black text-amber-900" style={{ fontFamily: 'var(--font-heading)' }}>
                ৳{getStaffOrderDue(settleOrder).toLocaleString()}
              </span>
            </div>

            <form onSubmit={handleConfirmSingleSettlement} className="space-y-4">
              <div>
                <label className="text-[11px] font-black text-gray-700 uppercase tracking-wider block mb-1.5" style={{ fontFamily: 'var(--font-heading)' }}>
                  Settlement Payment Method *
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Cash', 'bKash', 'Nagad', 'Salary Deduction', 'Waived'] as const).map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setSettlementMethod(method)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center border ${
                        settlementMethod === method
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {method}
                    </button>
                  ))}
                </div>
                {settlementMethod === 'Cash' && (
                  <p className="text-[11px] text-emerald-600 font-bold mt-1.5 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    This cash will be immediately added to today's register drawer count!
                  </p>
                )}
                {settlementMethod === 'Salary Deduction' && (
                  <p className="text-[11px] text-purple-600 font-bold mt-1.5 flex items-center gap-1">
                    <Tag size={12} />
                    Will be deducted when preparing monthly salary payroll.
                  </p>
                )}
              </div>

              <div>
                <label className="text-[11px] font-black text-gray-700 uppercase tracking-wider block mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                  Reference / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={settlementNotes}
                  onChange={e => setSettlementNotes(e.target.value)}
                  placeholder="e.g. Paid in counter, Trx ID, or reason for waiver"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSettleOrder(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-black bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Confirm Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Settlement Modal (Batch All For Staff Member) ── */}
      {settleAllForStaff && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h4 className="text-base font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                  Clear Entire Tab for {settleAllForStaff}
                </h4>
                <p className="text-xs text-gray-500">
                  Settle all outstanding dining orders in a single transaction
                </p>
              </div>
              <button onClick={() => setSettleAllForStaff(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900">Total Outstanding:</span>
              <span className="text-lg font-black text-amber-900" style={{ fontFamily: 'var(--font-heading)' }}>
                ৳{(
                  staffGroupedPending.find(g => g.staffName === settleAllForStaff)?.totalDue || 0
                ).toLocaleString()}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-black text-gray-700 uppercase tracking-wider block mb-1.5" style={{ fontFamily: 'var(--font-heading)' }}>
                  Settlement Method *
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Cash', 'bKash', 'Nagad', 'Salary Deduction', 'Waived'] as const).map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setSettlementMethod(method)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center border ${
                        settlementMethod === method
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-gray-700 uppercase tracking-wider block mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                  Batch Reference Notes (Optional)
                </label>
                <input
                  type="text"
                  value={settlementNotes}
                  onChange={e => setSettlementNotes(e.target.value)}
                  placeholder="e.g. October monthly salary clearance"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSettleAllForStaff(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmAllStaffSettlement(settleAllForStaff)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-black bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Settle All Orders
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
