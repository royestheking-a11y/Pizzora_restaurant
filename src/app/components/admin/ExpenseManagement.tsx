import React, { useState } from 'react';
import { Plus, Trash2, Save, X, DollarSign, TrendingDown, Calendar, Search, Edit2, Printer } from 'lucide-react';
import { useApp, ExpenseEntry } from '../../context/AppContext';
import { TableRowSkeleton } from '../Skeletons';
import { ConfirmModal } from '../ConfirmModal';
const PZ = '#F9002B';
const PZD = '#C8001F';

const EXPENSE_CATEGORIES: Record<string, string[]> = {
  'Utilities':   ['Electricity', 'Gas', 'Water', 'Internet', 'Phone'],
  'Salary':      ['Chef Salary', 'Cashier Salary', 'Waiter Salary', 'Cleaner Salary'],
  'Rent':        ['Branch Rent', 'Storage Rent'],
  'Marketing':   ['Facebook Ads', 'Banner', 'Flyer', 'Online Campaign'],
  'Maintenance': ['AC Repair', 'Oven Service', 'Plumbing', 'Electrical'],
  'Packaging':   ['Pizza Boxes', 'Paper Bags', 'Tissue', 'Sauce Cups'],
  'Cleaning':    ['Detergent', 'Sanitizer', 'Cleaning Equipment'],
  'Transport':   ['Delivery Fuel', 'Rider Expense', 'Vehicle Maintenance'],
  'Software':    ['ERP / POS License', 'Domain / Hosting', 'Subscription'],
  'Miscellaneous': ['Other', 'Emergency', 'Office Supplies'],
};

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

export function ExpenseManagement() {
  const { state, dispatch } = useApp();
  const { expenses } = state;
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  
  const adminRole = sessionStorage.getItem('pizzora_admin_role') || 'manager';
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ExpenseEntry | null>(null);
  const [printExpense, setPrintExpense] = useState<ExpenseEntry | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('Utilities');
  const [form, setForm] = useState<Omit<ExpenseEntry, 'id'>>({
    category: 'Utilities', subcategory: 'Electricity', amount: 0,
    date: new Date().toLocaleDateString('en-CA'),
    paymentMethod: 'Cash', description: '', invoiceNo: '',
  });

  const handleSave = () => {
    if (!form.category || !form.amount) return;
    const autoInvoiceNo = form.invoiceNo.trim() !== '' ? form.invoiceNo : `EXP-${Date.now().toString().slice(-6)}`;
    if (editing) {
      dispatch({ type: 'UPDATE_EXPENSE', payload: { ...form, invoiceNo: autoInvoiceNo, id: editing.id } });
    } else {
      dispatch({ type: 'ADD_EXPENSE', payload: { ...form, invoiceNo: autoInvoiceNo, id: `exp-${Date.now()}` } });
    }
    setShowForm(false); setEditing(null);
  };

  const handlePrint = (exp: ExpenseEntry) => {
    setPrintExpense(exp);
    setTimeout(() => {
      document.body.classList.add('print-expense');
      window.print();
      document.body.classList.remove('print-expense');
      setPrintExpense(null);
    }, 500);
  };

  const filtered = expenses.filter(e => {
    const matchSearch = e.category.toLowerCase().includes(search.toLowerCase()) || e.subcategory.toLowerCase().includes(search.toLowerCase()) || e.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'All' || e.category === filterCat;
    return matchSearch && matchCat;
  });

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const thisMonth = expenses.filter(e => e.date.startsWith(new Date().toLocaleDateString('en-CA').slice(0, 7))).reduce((s, e) => s + e.amount, 0);
  const byCategory = Object.keys(EXPENSE_CATEGORIES).map(cat => ({
    cat, total: expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter(x => x.total > 0).sort((a, b) => b.total - a.total);

  return (
    <>
      <div className="print-hidden">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Expenses', value: `৳${totalExpenses.toLocaleString()}`, color: PZ, bg: '#FEE2E2' },
          { label: 'This Month', value: `৳${thisMonth.toLocaleString()}`, color: '#7C3AED', bg: '#EDE9FE' },
          { label: 'Total Entries', value: expenses.length, color: '#0891B2', bg: '#CFFAFE' },
          { label: 'Categories Used', value: byCategory.length, color: '#16A34A', bg: '#DCFCE7' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="bg-white p-4 rounded-2xl shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: '22px', fontWeight: 800, color, fontFamily: 'var(--font-heading)' }}>{value}</p>
            <p style={{ fontSize: '12px', color: '#6B7280', fontFamily: 'var(--font-heading)', fontWeight: 600, marginTop: '2px' }}>{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Category Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm p-5" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '14px', color: '#111', marginBottom: '14px' }}>Expense by Category</h3>
          <div className="space-y-3">
            {byCategory.slice(0, 6).map(({ cat, total }) => {
              const pct = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0;
              return (
                <div key={cat}>
                  <div className="flex justify-between mb-1">
                    <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading)', fontWeight: 600, color: '#374151' }}>{cat}</span>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: PZ, fontFamily: 'var(--font-heading)' }}>৳{total.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ backgroundColor: '#F3F4F6' }}>
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: `linear-gradient(90deg,${PZ},${PZD})` }} />
                  </div>
                </div>
              );
            })}
            {byCategory.length === 0 && <p style={{ color: '#9CA3AF', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>No expense data</p>}
          </div>
        </div>

        {/* Expense List */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
          <div className="flex flex-col sm:flex-row gap-2 p-4 border-b" style={{ borderColor: '#F3F4F6' }}>
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search expenses…" style={{ ...inputSt, paddingLeft: '32px' }} />
            </div>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ ...inputSt, width: 'auto' }}>
              <option value="All">All Categories</option>
              {Object.keys(EXPENSE_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
              onClick={() => { setEditing(null); setForm({ category:'Utilities', subcategory:'Electricity', amount:0, date:new Date().toLocaleDateString('en-CA'), paymentMethod:'Cash', description:'', invoiceNo:'' }); setSelectedCategory('Utilities'); setShowForm(true); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-bold whitespace-nowrap"
              style={{ background: `linear-gradient(135deg,${PZ},${PZD})`, fontFamily: 'var(--font-heading)' }}>
              <Plus size={14} /> Add Expense
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#FFF5F5', borderBottom: `1px solid rgba(249,0,43,0.1)` }}>
                  {['Date', 'Category', 'Description', 'Method', 'Amount', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left" style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'var(--font-heading)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state.isInitialLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={6} />)
                ) : (
                  <>
                    {filtered.map(exp => (

                      <tr key={exp.id} className="border-b hover:bg-gray-50 transition-colors" style={{ borderColor: '#F3F4F6' }}>
                        <td className="px-4 py-3" style={{ fontSize: '12px', color: '#6B7280' }}>{exp.date}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: '#FFF5F5', color: PZ }}>{exp.category}</span>
                          <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>{exp.subcategory}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p style={{ fontSize: '12px', color: '#374151' }}>{exp.description || '—'}</p>
                          {exp.invoiceNo && <p style={{ fontSize: '10px', color: '#9CA3AF' }}>#{exp.invoiceNo}</p>}
                        </td>
                        <td className="px-4 py-3"><span className="px-2 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: '#F3F4F6', color: '#374151' }}>{exp.paymentMethod}</span></td>
                        <td className="px-4 py-3" style={{ fontSize: '14px', fontWeight: 800, color: PZ, fontFamily: 'var(--font-heading)' }}>৳{exp.amount.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            <button onClick={() => handlePrint(exp)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F3F4F6', color: '#4B5563' }}><Printer size={12} /></button>
                            <button onClick={() => { setEditing(exp); setForm({ category:exp.category, subcategory:exp.subcategory, amount:exp.amount, date:exp.date, paymentMethod:exp.paymentMethod, description:exp.description, invoiceNo:exp.invoiceNo }); setSelectedCategory(exp.category); setShowForm(true); }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}><Edit2 size={12} /></button>
                            {adminRole === 'admin' && (
                              <button onClick={() => setDeleteConfirm({
                                isOpen: true,
                                title: 'Delete Expense?',
                                message: `Are you sure you want to delete this expense of ৳${exp.amount}?`,
                                onConfirm: () => {
                                  dispatch({ type: 'DELETE_EXPENSE', payload: exp.id });
                                  setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
                                }
                              })} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}><Trash2 size={12} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && <tr><td colSpan={6} className="py-10 text-center" style={{ color: '#9CA3AF', fontSize: '14px' }}>No expenses found</td></tr>}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl shadow-2xl bg-white">
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: `rgba(249,0,43,0.1)` }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '17px', color: '#111' }}>{editing ? 'Edit Expense' : 'Add Expense'}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div>
                <label style={labelSt}>Category</label>
                <select value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setForm(f => ({ ...f, category: e.target.value, subcategory: EXPENSE_CATEGORIES[e.target.value][0] })); }} style={inputSt}>
                  {Object.keys(EXPENSE_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelSt}>Sub-category</label>
                <select value={form.subcategory} onChange={e => setForm(f => ({ ...f, subcategory: e.target.value }))} style={inputSt}>
                  {(EXPENSE_CATEGORIES[selectedCategory] || []).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelSt}>Amount (৳) *</label>
                <input type="number" value={form.amount || ''} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} placeholder="0" style={inputSt} />
              </div>
              <div>
                <label style={labelSt}>Date *</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputSt} />
              </div>
              <div>
                <label style={labelSt}>Payment Method</label>
                <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value as ExpenseEntry['paymentMethod'] }))} style={inputSt}>
                  {(['Cash','Bank Transfer','bKash','Card'] as ExpenseEntry['paymentMethod'][]).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={labelSt}>Invoice No. (Auto-generates if empty)</label>
                <input type="text" value={form.invoiceNo} onChange={e => setForm(f => ({ ...f, invoiceNo: e.target.value }))} placeholder="EXP-001" style={inputSt} />
              </div>
              <div className="col-span-2">
                <label style={labelSt}>Description</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description…" style={inputSt} />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t" style={{ borderColor: 'rgba(249,0,43,0.08)' }}>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50" style={{ border: '1.5px solid #E5E7EB', color: '#374151', fontFamily: 'var(--font-heading)' }}>Cancel</button>
              <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold" style={{ background: `linear-gradient(135deg,${PZ},${PZD})`, fontFamily: 'var(--font-heading)' }}>
                <Save size={13} className="inline mr-1.5" />Save Expense
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* ── PRINT ONLY: EXPENSE VOUCHER A4 ────────────────────────────────────── */}
      <div id="expense-print-area" style={{ display: 'none' }}>
        {printExpense && (
          <div style={{
            width: '210mm',
            minHeight: '297mm',
            margin: '0 auto',
            padding: '15mm 20mm',
            fontFamily: 'Arial, sans-serif',
            fontSize: '12px',
            color: '#000',
            background: '#fff',
            boxSizing: 'border-box',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8mm', paddingBottom: '5mm', borderBottom: '3px solid #E31837' }}>
              <div>
                <img src="/pizzoralogo.png" alt="Pizzora" style={{ height: '45px', marginBottom: '4px' }} />
                <div style={{ fontSize: '10px', color: '#666' }}>Authentic Pizza & Dining Experience</div>
                <div style={{ fontSize: '10px', color: '#666' }}>📞 +8801620026649 | 🌐 pizzora.bd</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '1px', color: '#111', textTransform: 'uppercase' }}>Expense Voucher</div>
                <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>
                  Voucher No: <strong style={{ color: '#E31837' }}>#{printExpense.invoiceNo || printExpense.id.slice(0,8).toUpperCase()}</strong>
                </div>
                <div style={{ fontSize: '11px', color: '#555' }}>
                  Date: <strong>{new Date(printExpense.date).toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' })}</strong>
                </div>
              </div>
            </div>

            {/* Category Info Grid */}
            <div style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '10px 16px', marginBottom: '8mm' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '9px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Category</div>
                  <div style={{ fontWeight: '700', fontSize: '13px' }}>{printExpense.category}</div>
                </div>
                <div>
                  <div style={{ fontSize: '9px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Sub-Category</div>
                  <div style={{ fontWeight: '700', fontSize: '13px' }}>{printExpense.subcategory}</div>
                </div>
                <div>
                  <div style={{ fontSize: '9px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Payment Method</div>
                  <div style={{ fontWeight: '700', fontSize: '13px' }}>{printExpense.paymentMethod}</div>
                </div>
              </div>
            </div>

            {/* Expense Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8mm' }}>
              <thead>
                <tr style={{ backgroundColor: '#E31837', color: '#fff' }}>
                  <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</th>
                  <th style={{ padding: '8px 14px', textAlign: 'right', width: '25%', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '14px', fontSize: '13px' }}>
                    {printExpense.description || `${printExpense.category} — ${printExpense.subcategory}`}
                  </td>
                  <td style={{ padding: '14px', textAlign: 'right', fontSize: '13px', fontWeight: '700' }}>
                    ৳ {printExpense.amount.toLocaleString()}
                  </td>
                </tr>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6B7280' }}>
                    Subtotal
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '13px', fontWeight: '700' }}>
                    ৳ {printExpense.amount.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Total Box */}
            <div style={{ backgroundColor: '#E31837', color: '#fff', padding: '14px 20px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12mm' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Amount Due
              </div>
              <div style={{ fontSize: '26px', fontWeight: '900', letterSpacing: '1px' }}>
                ৳ {printExpense.amount.toLocaleString()}
              </div>
            </div>

            {/* Signature Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20mm' }}>
              <div style={{ width: '180px', textAlign: 'center' }}>
                <div style={{ borderBottom: '1.5px solid #000', marginBottom: '6px', height: '35px' }}></div>
                <div style={{ fontSize: '11px', fontWeight: '700' }}>Prepared By</div>
                <div style={{ fontSize: '10px', color: '#666' }}>Accounts Team</div>
              </div>
              <div style={{ width: '180px', textAlign: 'center' }}>
                <div style={{ borderBottom: '1.5px solid #000', marginBottom: '6px', height: '35px' }}></div>
                <div style={{ fontSize: '11px', fontWeight: '700' }}>Authorized Signatory</div>
                <div style={{ fontSize: '10px', color: '#666' }}>Management</div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ marginTop: 'auto', paddingTop: '5mm', borderTop: '1px solid #E5E7EB', textAlign: 'center', position: 'absolute', bottom: '15mm', left: '20mm', right: '20mm' }}>
              <div style={{ fontSize: '9px', color: '#9CA3AF' }}>
                This is a computer-generated expense voucher issued by Pizzora Restaurant | pizzora.bd | Generated on {new Date().toLocaleDateString('en-GB')}
              </div>
            </div>
          </div>
        )}
      </div>

      {printExpense && (
        <style>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 0;
            }
            body * { visibility: hidden !important; }
            .print-hidden { display: none !important; }
            #thermal-print-area { display: none !important; }
            #payroll-print-area { display: none !important; }
            #expense-print-area { display: block !important; }
            #expense-print-area, #expense-print-area * { visibility: visible !important; }
            #expense-print-area {
              position: fixed;
              left: 0;
              top: 0;
              width: 210mm;
              background: #fff;
              z-index: 99999;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}</style>
      )}

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.title}
        message={deleteConfirm.message}
        onConfirm={deleteConfirm.onConfirm}
        onCancel={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}
