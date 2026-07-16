import React, { useState, useEffect } from 'react';
import { useApp, CashRegisterEntry } from '../../context/AppContext';
import { Banknote, Save, Clock, Lock, CheckCircle2, TrendingUp, AlertCircle, Calendar, ArrowRight, DollarSign } from 'lucide-react';
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
  const sessions = state.cashRegister;
  const [activeSession, setActiveSession] = useState<CashRegisterEntry | null>(null);
  const [openingBalance, setOpeningBalance] = useState('');
  const [bankDeposit, setBankDeposit] = useState('');
  const [shoppingCash, setShoppingCash] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    const openSession = sessions.find(s => s.status === 'Open');
    setActiveSession(openSession || null);
  }, [sessions]);

  // Compute Cash Sales for Active Session
  const computeCashSales = () => {
    if (!activeSession) return 0;
    const start = new Date(activeSession.openedAt).getTime();
    
    // Only count "Cash" and "Cash on Delivery" orders within this session
    return state.orders
      .filter(o => 
        (o.paymentMethod === 'Cash' || o.paymentMethod === 'Cash on Delivery') &&
        new Date(o.createdAt).getTime() >= start
      )
      .reduce((sum, o) => sum + o.total, 0);
  };

  const currentCashSales = computeCashSales();
  const expectedDrawerCash = activeSession ? activeSession.openingBalance + currentCashSales : 0;

  const handleOpenRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const balance = Number(openingBalance);
    if (isNaN(balance) || balance < 0) return alert('Enter a valid amount');

    const newSession: CashRegisterEntry = {
      id: `CS-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
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
    
    if (isNaN(bDeposit) || isNaN(sCash)) return alert('Enter valid amounts');
    
    if (bDeposit + sCash !== expectedDrawerCash) {
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
      totalCashSales: currentCashSales,
      bankDeposit: Number(bankDeposit),
      shoppingCash: Number(shoppingCash),
    };

    dispatch({ type: 'UPDATE_CASH_ENTRY', payload: closedSession });
    setBankDeposit('');
    setShoppingCash('');
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
                <div className="flex justify-between text-sm text-green-600">
                  <span className="font-semibold">Cash Sales Today:</span>
                  <span className="font-bold">+ ৳{currentCashSales}</span>
                </div>
                <div className="border-t pt-3 flex justify-between text-base">
                  <span className="text-gray-800 font-bold">Expected Drawer Cash:</span>
                  <span className="font-black text-red-600">৳{expectedDrawerCash}</span>
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
                          <td className="px-5 py-3.5">
                            <p className="font-bold text-sm text-gray-900">{s.date}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(s.openedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                              {s.closedAt ? ` - ${new Date(s.closedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : ' (Active)'}
                            </p>
                          </td>
                          <td className="px-5 py-3.5 font-bold text-sm">৳{s.openingBalance}</td>
                          <td className="px-5 py-3.5 text-sm text-green-600 font-semibold">+৳{s.status === 'Open' ? currentCashSales : s.totalCashSales}</td>
                          <td className="px-5 py-3.5 font-bold text-sm">{s.status === 'Closed' ? `৳${s.bankDeposit}` : '-'}</td>
                          <td className="px-5 py-3.5 font-bold text-sm text-red-600">{s.status === 'Closed' ? `৳${s.shoppingCash}` : '-'}</td>
                          <td className="px-5 py-3.5">
                            {s.status === 'Open' ? (
                              <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">OPEN</span>
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
                  Your split (Bank: ৳{bankDeposit} + Shopping: ৳{shoppingCash} = <span className="font-bold text-amber-900">৳{Number(bankDeposit) + Number(shoppingCash)}</span>) 
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
