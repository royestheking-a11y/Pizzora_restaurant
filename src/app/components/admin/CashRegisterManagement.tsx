import React, { useState, useEffect, useMemo } from 'react';
import { useApp, CashRegisterEntry } from '../../context/AppContext';
import { Banknote, Save, Clock, Lock, CheckCircle2, TrendingUp, AlertCircle, Calendar, ArrowRight, DollarSign, Smartphone, CreditCard } from 'lucide-react';
import { TableRowSkeleton } from '../Skeletons';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: '8px',
  border: '1.5px solid #E5E7EB', fontSize: '14px', outline: 'none',
  fontFamily: 'var(--font-body)', color: '#111', backgroundColor: '#fff',
  marginBottom: '15px'
};
const labelStyle: React.CSSProperties = {
  fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block',
  marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px',
  fontFamily: 'var(--font-heading)',
};

export function CashRegisterManagement() {
  const { state, dispatch } = useApp();
  const sessions = useMemo(() => 
    [...state.cashRegister].sort((a, b) => (b.date || b.openedAt || '').localeCompare(a.date || a.openedAt || '') || (b.openedAt || '').localeCompare(a.openedAt || '')),
    [state.cashRegister]
  );
  const [activeSession, setActiveSession] = useState<CashRegisterEntry | null>(null);
  const [openingBalance, setOpeningBalance] = useState('');
  const [bankDeposit, setBankDeposit] = useState('');
  const [shoppingCash, setShoppingCash] = useState('');
  const [cost, setCost] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    const openSession = sessions.find(s => s.status === 'Open');
    setActiveSession(openSession || null);
  }, [sessions]);

  // Compute Sales Breakdown for Active Session
  const computeSalesBreakdown = () => {
    const breakdown = { cash: 0, bkash: 0, nagad: 0, card: 0, other: 0, total: 0 };
    if (!activeSession) return breakdown;
    // Use start-of-day and end-of-day as boundaries so only this date's sales are counted
    // Fall back to openedAt if date field is missing (legacy records)
    const sessionDate = (activeSession.date && /^\d{4}-\d{2}-\d{2}$/.test(activeSession.date))
      ? activeSession.date
      : new Date(activeSession.openedAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
    const utcMidnight = new Date(sessionDate + 'T00:00:00Z').getTime();
    const dayStart = utcMidnight - (6 * 60 * 60 * 1000); // Bangladesh is UTC+6
    const dayEnd = dayStart + (24 * 60 * 60 * 1000) - 1;
    
    const sessionOrders = state.orders.filter(o => {
      const t = new Date(o.createdAt).getTime();
      return t >= dayStart && t <= dayEnd;
    });
    const sessionTableOrders = (state.tableOrders || []).filter(o => {
      const t = typeof o.createdAt === 'number' ? o.createdAt : new Date(o.createdAt).getTime();
      return t >= dayStart && t <= dayEnd && o.status === 'Paid';
    });
    
    sessionOrders.forEach(o => {
      breakdown.total += o.total;
      if (o.paymentMethod === 'Split' && o.splitPayments && o.splitPayments.length > 0) {
        o.splitPayments.forEach((p: any) => {
          const m = (p.method || '').toLowerCase();
          if (m === 'cash') breakdown.cash += p.amount;
          else if (m === 'bkash') breakdown.bkash += p.amount;
          else if (m === 'nagad') breakdown.nagad += p.amount;
          else if (m === 'card') breakdown.card += p.amount;
          else breakdown.other += p.amount;
        });
      } else {
        const method = (o.paymentMethod || '').toLowerCase();
        if (method === 'cash' || method === 'cash on delivery') breakdown.cash += o.total;
        else if (method === 'bkash') breakdown.bkash += o.total;
        else if (method === 'nagad') breakdown.nagad += o.total;
        else if (method === 'card') breakdown.card += o.total;
        else breakdown.other += o.total;
      }
    });

    // Count sessionTableOrders that aren't already included in sessionOrders
    const orderNumbers = new Set(sessionOrders.map(o => o.orderNumber).filter(Boolean));
    sessionTableOrders.forEach(o => {
      if (o.invoiceNumber && orderNumbers.has(o.invoiceNumber)) return;
      breakdown.total += o.total;
      if (o.paymentMethod === 'Split' && o.splitPayments && o.splitPayments.length > 0) {
        o.splitPayments.forEach((p: any) => {
          const m = (p.method || '').toLowerCase();
          if (m === 'cash') breakdown.cash += p.amount;
          else if (m === 'bkash') breakdown.bkash += p.amount;
          else if (m === 'nagad') breakdown.nagad += p.amount;
          else if (m === 'card') breakdown.card += p.amount;
          else breakdown.other += p.amount;
        });
      } else {
        const method = (o.paymentMethod || '').toLowerCase();
        if (method === 'cash' || method === 'at table') breakdown.cash += o.total;
        else if (method === 'bkash') breakdown.bkash += o.total;
        else if (method === 'nagad') breakdown.nagad += o.total;
        else if (method === 'card') breakdown.card += o.total;
        else breakdown.other += o.total;
      }
    });
    return breakdown;
  };

  const currentSales = computeSalesBreakdown();
  const currentCashSales = currentSales.cash;
  const expectedDrawerCash = activeSession ? activeSession.openingBalance + currentCashSales : 0;

  const dhakaStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
  const getEntryDate = (r: CashRegisterEntry) => {
    if (r.date && /^\d{4}-\d{2}-\d{2}$/.test(r.date)) return r.date;
    const ts = r.openedAt || (r.closedAt ?? undefined);
    if (ts) return new Date(ts).toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
    return null;
  };
  const hasRegisterToday = sessions.some(s => getEntryDate(s) === dhakaStr);

  const handleOpenRegister = (e: React.FormEvent) => {
    e.preventDefault();
    // Prevent opening a second register if one is already open or one was already closed today
    if (activeSession || hasRegisterToday) {
      alert('A register is already active or was already closed for today.');
      return;
    }
    const balance = Number(openingBalance);
    if (isNaN(balance) || balance < 0) return alert('Enter a valid amount');

    const newSession: CashRegisterEntry = {
      id: `CS-${Date.now()}`,
      date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }),
      openedAt: new Date().toISOString(),
      closedAt: null,
      openingBalance: balance,
      totalCashSales: 0,
      bankDeposit: 0,
      shoppingCash: 0,
      status: 'Open'
    };

    dispatch({ type: 'ADD_CASH_ENTRY', payload: newSession });
    setOpeningBalance('');
  };

  const handleCloseRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    
    const bDeposit = Number(bankDeposit);
    const sCash = Number(shoppingCash);
    const costAmt = Number(cost);
    
    if (isNaN(bDeposit) || isNaN(sCash) || isNaN(costAmt)) return alert('Enter valid amounts');
    
    if (Math.abs(bDeposit + sCash + costAmt - expectedDrawerCash) > 0.01) {
      setShowConfirmModal(true);
      return;
    }

    finalizeClose();
  };

  const finalizeClose = () => {
    if (!activeSession) return;
    
    const closedSession: CashRegisterEntry = {
      ...activeSession,
      status: 'Closed',
      closedAt: new Date().toISOString(),
      totalCashSales: currentSales.total,
      salesBreakdown: currentSales,
      bankDeposit: Number(bankDeposit),
      shoppingCash: Number(shoppingCash),
      cost: Number(cost),
    };

    dispatch({ type: 'UPDATE_CASH_ENTRY', payload: closedSession });
    setBankDeposit('');
    setShoppingCash('');
    setCost('');
    setShowConfirmModal(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '24px', color: '#111' }}>Cash Register & EOD</h2>
          <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>Track opening balance, daily cash sales, and end-of-day splits.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Active Register Action */}
        <div className="lg:col-span-1">
          {!activeSession ? (
            hasRegisterToday ? (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
                <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={28} />
                </div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '18px' }}>Register Closed</h3>
                <p className="text-sm text-gray-500 mt-2">The cash register has already been closed for today. All transactions are securely finalized.</p>
              </div>
            ) : (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Banknote size={28} />
                </div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '18px' }}>Open Register</h3>
                <p className="text-sm text-gray-500 mt-1">Start your day by entering the cash currently in the counter.</p>
              </div>

              <form onSubmit={handleOpenRegister}>
                <label style={labelStyle}>Opening Balance (৳) *</label>
                <input
                  type="number"
                  value={openingBalance}
                  onChange={e => setOpeningBalance(e.target.value)}
                  placeholder="e.g. 4000"
                  style={inputStyle}
                  required
                />
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl font-bold text-white transition-transform active:scale-[0.98]"
                  style={{ backgroundColor: '#F9002B', fontFamily: 'var(--font-heading)' }}
                >
                  Start Day
                </button>
              </form>
            </div>
            )
          ) : (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Lock size={28} />
                </div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '18px' }}>Close Register</h3>
                <p className="text-sm text-gray-500 mt-1">End of day. Split the drawer cash for bank and tomorrow's shopping.</p>
              </div>

              <div className="mb-6 p-4 bg-gray-50 rounded-xl space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-semibold">Opening Balance:</span>
                  <span className="font-bold">৳{activeSession.openingBalance}</span>
                </div>
                
                <div className="border-t pt-2 pb-1 border-gray-200/60 space-y-1.5">
                  <div className="flex justify-between text-[13px] text-green-700">
                    <span className="font-semibold flex items-center gap-1.5"><Banknote size={14} /> Physical Cash Sales:</span>
                    <span className="font-bold">+ ৳{currentSales.cash}</span>
                  </div>
                  <div className="flex justify-between text-[13px] text-pink-600">
                    <span className="font-semibold flex items-center gap-1.5"><Smartphone size={14} /> bKash Sales:</span>
                    <span className="font-bold">+ ৳{currentSales.bkash}</span>
                  </div>
                  <div className="flex justify-between text-[13px] text-orange-600">
                    <span className="font-semibold flex items-center gap-1.5"><Smartphone size={14} /> Nagad Sales:</span>
                    <span className="font-bold">+ ৳{currentSales.nagad}</span>
                  </div>
                  <div className="flex justify-between text-[13px] text-blue-600">
                    <span className="font-semibold flex items-center gap-1.5"><CreditCard size={14} /> Card & Other Sales:</span>
                    <span className="font-bold">+ ৳{currentSales.card + currentSales.other}</span>
                  </div>
                </div>

                <div className="flex justify-between text-sm text-gray-800 border-t pt-2 border-gray-200/60">
                  <span className="font-bold">Total Sales (All Methods):</span>
                  <span className="font-bold text-green-600">৳{currentSales.total}</span>
                </div>

                <div className="border-t pt-3 flex flex-col mt-2">
                  <div className="flex justify-between text-base">
                    <span className="text-gray-800 font-bold">Expected Drawer Cash:</span>
                    <span className="font-black text-red-600">৳{expectedDrawerCash}</span>
                  </div>
                  <span className="text-[11px] text-gray-500 mt-1 leading-tight">
                    (Opening Balance + Physical Cash Sales only. Digital payments do not go into the cash drawer.)
                  </span>
                </div>
              </div>

              <form onSubmit={handleCloseRegister}>
                <label style={labelStyle}>Send to Bank (৳) *</label>
                <input
                  type="number"
                  value={bankDeposit}
                  onChange={e => setBankDeposit(e.target.value)}
                  placeholder="e.g. 20000"
                  style={inputStyle}
                  required
                />
                
                <label style={labelStyle}>Keep for Tomorrow (Shopping) (৳) *</label>
                <input
                  type="number"
                  value={shoppingCash}
                  onChange={e => setShoppingCash(e.target.value)}
                  placeholder="e.g. 10000"
                  style={inputStyle}
                  required
                />
                
                <label style={labelStyle}>Daily Cost / Expenses (৳) *</label>
                <input
                  type="number"
                  value={cost}
                  onChange={e => setCost(e.target.value)}
                  placeholder="e.g. 1500"
                  style={inputStyle}
                  required
                />
                
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl font-bold text-white transition-transform active:scale-[0.98] mt-2"
                  style={{ backgroundColor: '#111', fontFamily: 'var(--font-heading)' }}
                >
                  Close & Save Day
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Col: History */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center gap-2">
              <Clock size={20} className="text-gray-400" />
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '16px' }}>Register History</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date / Time</th>
                    <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Opened With</th>
                    <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Sales Add</th>
                    <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Bank</th>
                    <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Shopping</th>
                    <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Cost</th>
                    <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {state.isInitialLoading ? (
                    Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={6} />)
                  ) : (
                    <>
                      {sessions.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-5 py-8 text-center text-gray-400 text-sm">No cash register history found.</td>
                        </tr>
                      )}
                      {sessions.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50/50">
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <p className="font-bold text-sm text-gray-900">{getEntryDate(s) || '—'}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(s.openedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', timeZone: 'Asia/Dhaka'})} 
                              {s.closedAt ? ` - ${new Date(s.closedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', timeZone: 'Asia/Dhaka'})}` : ' (Active)'}
                            </p>
                          </td>
                          <td className="px-5 py-3.5 font-bold text-sm">৳{s.openingBalance}</td>
                          <td className="px-5 py-3.5 text-sm">
                            {s.status === 'Open' ? (
                              <div className="flex flex-col">
                                <span className="text-green-600 font-bold text-sm">৳{currentSales.total} Total</span>
                                <span className="text-[11px] text-gray-500 font-medium whitespace-nowrap">Cash: ৳{currentSales.cash} | Digital: ৳{(currentSales.total - currentSales.cash) || 0}</span>
                              </div>
                            ) : (
                              <div className="flex flex-col group relative">
                                <span className="text-green-600 font-bold text-sm">৳{s.salesBreakdown?.total ?? (s.salesBreakdown ? (s.salesBreakdown.cash + s.salesBreakdown.bkash + s.salesBreakdown.nagad + s.salesBreakdown.card + s.salesBreakdown.other) : s.totalCashSales)} Total</span>
                                {s.salesBreakdown ? (
                                  <span className="text-[11px] text-gray-500 font-medium cursor-help whitespace-nowrap" title={`Cash: ৳${s.salesBreakdown.cash}\nbKash: ৳${s.salesBreakdown.bkash}\nNagad: ৳${s.salesBreakdown.nagad}\nCard/Other: ৳${(s.salesBreakdown.card || 0) + (s.salesBreakdown.other || 0)}`}>
                                    Cash: ৳{s.salesBreakdown.cash} | Digital: ৳{((s.salesBreakdown.total ?? (s.salesBreakdown.cash + s.salesBreakdown.bkash + s.salesBreakdown.nagad + s.salesBreakdown.card + s.salesBreakdown.other)) - s.salesBreakdown.cash) || 0} <AlertCircle size={10} className="inline mb-0.5 text-gray-400" />
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-gray-400 italic">Legacy Entry</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3.5 font-bold text-sm">
                            {s.status === 'Open' ? '-' : `৳${s.bankDeposit}`}
                          </td>
                          <td className="px-5 py-3.5 font-bold text-sm text-red-600">
                            {s.status === 'Open' ? '-' : `৳${s.shoppingCash}`}
                          </td>
                          <td className="px-5 py-3.5 font-bold text-sm text-red-600">
                            {s.status === 'Open' ? '-' : `৳${s.cost || 0}`}
                          </td>
                          <td className="px-5 py-3.5">
                            {s.status === 'Open' ? (
                              <span className="px-3 py-1 bg-green-100 text-green-700 font-bold text-xs rounded-full">OPEN</span>
                            ) : (
                              <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">CLOSED</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {showConfirmModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowConfirmModal(false); }}
        >
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl transform transition-all">
            <div className="p-6">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Banknote size={24} />
              </div>
              <h3 className="text-xl font-bold text-center text-gray-900 mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Drawer Mismatch Warning</h3>
              
              <div className="bg-amber-50 rounded-xl p-4 mb-5 border border-amber-100">
                <p className="text-sm text-amber-800 text-center font-medium">
                  Your split (Bank: ৳{bankDeposit} + Shopping: ৳{shoppingCash} + Cost: ৳{cost} = <span className="font-bold text-amber-900">৳{Number(bankDeposit) + Number(shoppingCash) + Number(cost)}</span>) 
                  does not match the Expected Drawer Cash (<span className="font-bold text-amber-900">৳{expectedDrawerCash}</span>).
                </p>
              </div>
              
              <p className="text-center text-gray-600 mb-6 text-sm">
                Are you sure you want to proceed and save this discrepancy?
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={finalizeClose}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-white transition-transform active:scale-[0.98]"
                  style={{ backgroundColor: '#F9002B' }}
                >
                  Confirm & Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
