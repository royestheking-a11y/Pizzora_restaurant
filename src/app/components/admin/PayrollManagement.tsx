import React, { useState } from 'react';
import { Plus, Trash2, Edit2, FileText, Printer, CheckCircle2, DollarSign, Users, X, Minus } from 'lucide-react';
import { useApp, Employee, PayrollRecord } from '../../context/AppContext';
import { ChefCardSkeleton, TableRowSkeleton } from '../Skeletons';
import { ConfirmModal } from '../ConfirmModal';

export function PayrollManagement() {
  const { state, addEmployee, updateEmployee, deleteEmployee, addPayrollRecord } = useApp();
  
  const [activeTab, setActiveTab] = useState<'employees' | 'payroll'>('employees');
  
  const adminRole = sessionStorage.getItem('pizzora_admin_role') || 'admin';
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  
  // Employee Form State
  const [showEmpForm, setShowEmpForm] = useState(false);
  const [editEmpId, setEditEmpId] = useState<string | null>(null);
  const [empForm, setEmpForm] = useState({ name: '', role: '', basicSalary: '', shift: 'Morning' });

  // Payroll Form State
  const [showPayrollForm, setShowPayrollForm] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [payrollForm, setPayrollForm] = useState({ month: new Date().toLocaleString('default', { month: 'long' }), year: new Date().getFullYear(), bonus: '0', overtime: '0', deduction: '0', fine: '0' });

  // Print State
  const [printRecord, setPrintRecord] = useState<{ emp: Employee, record: PayrollRecord } | null>(null);

  // ── Employee Handlers ───────────────────────────────────────────────────────
  const handleEmpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.name || !empForm.role || !empForm.basicSalary) return;
    
    if (editEmpId) {
      updateEmployee({
        id: editEmpId,
        name: empForm.name,
        role: empForm.role,
        basicSalary: parseFloat(empForm.basicSalary),
        joinDate: state.employees.find(e => e.id === editEmpId)?.joinDate || new Date().toISOString(),
        shift: empForm.shift,
      });
    } else {
      addEmployee({
        id: `EMP${Date.now()}`,
        name: empForm.name,
        role: empForm.role,
        basicSalary: parseFloat(empForm.basicSalary),
        joinDate: new Date().toISOString(),
        shift: empForm.shift,
      });
    }
    
    setShowEmpForm(false);
    setEditEmpId(null);
    setEmpForm({ name: '', role: '', basicSalary: '', shift: 'Morning' });
  };

  const handleEditEmp = (emp: Employee) => {
    setEditEmpId(emp.id);
    setEmpForm({ name: emp.name, role: emp.role, basicSalary: emp.basicSalary.toString(), shift: emp.shift });
    setShowEmpForm(true);
  };

  // ── Payroll Handlers ────────────────────────────────────────────────────────
  const handlePayrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = state.employees.find(e => e.id === selectedEmpId);
    if (!emp) return;

    const basic = emp.basicSalary;
    const bonus = parseFloat(payrollForm.bonus) || 0;
    const overtime = parseFloat(payrollForm.overtime) || 0;
    const deduction = parseFloat(payrollForm.deduction) || 0;
    const fine = parseFloat(payrollForm.fine) || 0;
    const netSalary = basic + bonus + overtime - deduction - fine;

    const record: PayrollRecord = {
      id: `PAY${Date.now()}`,
      employeeId: emp.id,
      month: payrollForm.month,
      year: payrollForm.year,
      bonus,
      overtime,
      deduction,
      fine,
      netSalary,
      datePaid: new Date().toISOString()
    };

    addPayrollRecord(record);
    setShowPayrollForm(false);
    
    // Auto-trigger print view after a small delay
    setPrintRecord({ emp, record });
    setTimeout(() => {
      document.body.classList.add('print-payroll');
      window.print();
      document.body.classList.remove('print-payroll');
      setPrintRecord(null);
    }, 500);
  };

  const handlePrintSlip = (record: PayrollRecord) => {
    const emp = state.employees.find(e => e.id === record.employeeId);
    if (!emp) return;
    setPrintRecord({ emp, record });
    setTimeout(() => {
      document.body.classList.add('print-payroll');
      window.print();
      document.body.classList.remove('print-payroll');
      setPrintRecord(null);
    }, 500);
  };

  return (
    <>
      <div className="space-y-6 animate-fade-in print-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)', color: '#111' }}>Payroll Management</h2>
          <p className="text-gray-500 text-sm mt-1">Manage employee data and generate salary slips.</p>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('employees')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'employees' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Employees
          </button>
          <button
            onClick={() => setActiveTab('payroll')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'payroll' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Salary Slips
          </button>
        </div>

        </div>

      {activeTab === 'employees' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { setEditEmpId(null); setEmpForm({ name: '', role: '', basicSalary: '', shift: 'Morning' }); setShowEmpForm(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold transition-all hover:-translate-y-0.5 shadow-lg shadow-red-500/20"
              style={{ background: `linear-gradient(135deg, #F9002B, #C8001F)`, fontFamily: 'var(--font-heading)' }}
            >
              <Plus size={18} /> Add Employee
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {state.isInitialLoading ? (
              Array.from({ length: 3 }).map((_, i) => <ChefCardSkeleton key={i} />)
            ) : (
              <>
                {state.employees.map(emp => (
              <div key={emp.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative group transition-all hover:shadow-md">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                    {emp.name.charAt(0)}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEditEmp(emp)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Edit2 size={16} />
                    </button>
                    {adminRole === 'admin' && (
                      <button onClick={() => setDeleteConfirm({
                        isOpen: true,
                        title: 'Delete Employee?',
                        message: `Are you sure you want to delete ${emp.name}?`,
                        onConfirm: () => {
                          deleteEmployee(emp.id);
                          setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
                        }
                      })} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{emp.name}</h3>
                  <p className="text-gray-500 text-sm font-medium">{emp.role} • {emp.shift} Shift</p>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Basic Salary</span>
                  <span className="font-bold text-gray-900">৳ {emp.basicSalary.toLocaleString()}</span>
                </div>
              </div>
                ))}
                {state.employees.length === 0 && (
                  <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                    <Users size={48} className="mx-auto text-gray-300 mb-3" />
                    <h3 className="text-gray-500 font-semibold">No employees found</h3>
                    <p className="text-gray-400 text-sm mt-1">Add an employee to start tracking payroll.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'payroll' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { 
                if (state.employees.length === 0) return alert('Please add employees first!');
                setSelectedEmpId(state.employees[0].id);
                setPayrollForm({ month: new Date().toLocaleString('default', { month: 'long' }), year: new Date().getFullYear(), bonus: '0', overtime: '0', deduction: '0', fine: '0' });
                setShowPayrollForm(true); 
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold transition-all hover:-translate-y-0.5 shadow-lg shadow-gray-900/20 bg-gray-900"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <FileText size={18} /> Generate Salary Slip
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
                    <th className="p-4">Date Paid</th>
                    <th className="p-4">Employee</th>
                    <th className="p-4">Month</th>
                    <th className="p-4">Net Salary</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-100">
                  {state.isInitialLoading ? (
                    Array.from({ length: 3 }).map((_, i) => <TableRowSkeleton key={i} columns={5} />)
                  ) : (
                    <>
                      {state.payrollRecords.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-gray-500">No payroll records generated yet.</td>
                        </tr>
                      ) : (
                        state.payrollRecords.map(record => {
                      const emp = state.employees.find(e => e.id === record.employeeId);
                      return (
                        <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-4 whitespace-nowrap text-gray-600">
                            {new Date(record.datePaid).toLocaleDateString()}
                          </td>
                          <td className="p-4 font-semibold text-gray-900">
                            {emp?.name || 'Unknown Employee'}
                            <span className="block text-xs text-gray-500 font-normal">{emp?.role}</span>
                          </td>
                          <td className="p-4 text-gray-600">{record.month} {record.year}</td>
                          <td className="p-4 text-green-600 font-bold flex items-center gap-1">
                            ৳ {record.netSalary.toLocaleString()}
                            <CheckCircle2 size={14} />
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handlePrintSlip(record)}
                              className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1 ml-auto"
                            >
                              <Printer size={12} /> Print PDF
                            </button>
                          </td>
                        </tr>
                      );
                        })
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────────────────────── */}
      {showEmpForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowEmpForm(false); }}>
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl animate-fade-in">
            <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              {editEmpId ? 'Edit Employee' : 'Add Employee'}
            </h3>
            <form onSubmit={handleEmpSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Full Name</label>
                <input type="text" required value={empForm.name} onChange={e => setEmpForm({ ...empForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-100 outline-none focus:border-red-500 transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Role / Position</label>
                  <input type="text" required value={empForm.role} onChange={e => setEmpForm({ ...empForm, role: e.target.value })}
                    placeholder="e.g. Chef, Waiter"
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-100 outline-none focus:border-red-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Shift</label>
                  <select value={empForm.shift} onChange={e => setEmpForm({ ...empForm, shift: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-100 outline-none focus:border-red-500 transition-colors bg-white">
                    <option value="Morning">Morning</option>
                    <option value="Evening">Evening</option>
                    <option value="Night">Night</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Basic Monthly Salary (৳)</label>
                <input type="number" min="0" required value={empForm.basicSalary} onChange={e => setEmpForm({ ...empForm, basicSalary: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-100 outline-none focus:border-red-500 transition-colors" />
              </div>
              
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowEmpForm(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3 rounded-xl font-bold text-white transition-all shadow-lg hover:-translate-y-0.5" style={{ background: `linear-gradient(135deg, #F9002B, #C8001F)` }}>Save Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPayrollForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowPayrollForm(false); }}>
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-fade-in">
            <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Generate Salary Slip</h3>
            <form onSubmit={handlePayrollSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Select Employee</label>
                  <select required value={selectedEmpId} onChange={e => setSelectedEmpId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-100 outline-none focus:border-gray-900 transition-colors bg-white">
                    {state.employees.map(e => <option key={e.id} value={e.id}>{e.name} (৳{e.basicSalary})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Salary Month</label>
                  <input type="text" required value={payrollForm.month} onChange={e => setPayrollForm({ ...payrollForm, month: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-100 outline-none focus:border-gray-900 transition-colors" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                  <h4 className="text-xs font-bold text-green-700 uppercase tracking-wider mb-3 flex items-center gap-1"><Plus size={12}/> Additions</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Bonus (৳)</label>
                      <input type="number" min="0" value={payrollForm.bonus} onChange={e => setPayrollForm({ ...payrollForm, bonus: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-green-200 outline-none focus:border-green-500 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Overtime (৳)</label>
                      <input type="number" min="0" value={payrollForm.overtime} onChange={e => setPayrollForm({ ...payrollForm, overtime: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-green-200 outline-none focus:border-green-500 text-sm" />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                  <h4 className="text-xs font-bold text-red-700 uppercase tracking-wider mb-3 flex items-center gap-1"><Minus size={12} className="lucide lucide-minus"/> Deductions</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Deduction (৳)</label>
                      <input type="number" min="0" value={payrollForm.deduction} onChange={e => setPayrollForm({ ...payrollForm, deduction: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-red-200 outline-none focus:border-red-500 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Fine (৳)</label>
                      <input type="number" min="0" value={payrollForm.fine} onChange={e => setPayrollForm({ ...payrollForm, fine: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-red-200 outline-none focus:border-red-500 text-sm" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowPayrollForm(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3 rounded-xl font-bold text-white transition-all shadow-lg hover:-translate-y-0.5 bg-gray-900">Generate & Print Slip</button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>

      {/* ── PRINT ONLY: SALARY SLIP ────────────────────────────────────────────── */}
      <div id="payroll-print-area" style={{ display: 'none' }}>
        {printRecord && (() => {
          const { emp, record } = printRecord;
          const totalEarnings = emp.basicSalary + record.bonus + record.overtime;
          const totalDeductions = record.deduction + record.fine;
          return (
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
                  <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '1px', color: '#111', textTransform: 'uppercase' }}>Salary Slip</div>
                  <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>Slip No: <strong>{record.id.slice(-8).toUpperCase()}</strong></div>
                  <div style={{ fontSize: '11px', color: '#555' }}>Period: <strong>{record.month} {record.year}</strong></div>
                  <div style={{ fontSize: '11px', color: '#555' }}>Date Paid: <strong>{new Date(record.datePaid).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</strong></div>
                </div>
              </div>

              {/* Employee Info */}
              <div style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '10px 16px', marginBottom: '8mm' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '9px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Employee Name</div>
                    <div style={{ fontWeight: '700', fontSize: '13px' }}>{emp.name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Role / Designation</div>
                    <div style={{ fontWeight: '700', fontSize: '13px' }}>{emp.role}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Employee ID</div>
                    <div style={{ fontWeight: '700', fontSize: '13px' }}>#{emp.id.slice(-8).toUpperCase()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Joining Date</div>
                    <div style={{ fontWeight: '600', fontSize: '12px' }}>{emp.joinDate}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Shift</div>
                    <div style={{ fontWeight: '600', fontSize: '12px' }}>{emp.shift}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Pay Status</div>
                    <div style={{ fontWeight: '700', fontSize: '12px', color: '#16A34A' }}>✓ PAID</div>
                  </div>
                </div>
              </div>

              {/* Earnings & Deductions Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8mm' }}>
                <thead>
                  <tr style={{ backgroundColor: '#E31837', color: '#fff' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', width: '40%', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Earnings</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', width: '10%', fontSize: '11px', fontWeight: '700' }}>Amount</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', width: '40%', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', borderLeft: '1px solid rgba(255,255,255,0.3)' }}>Deductions</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', width: '10%', fontSize: '11px', fontWeight: '700' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { earn: 'Basic Salary', earnVal: emp.basicSalary, ded: 'Deductions', dedVal: record.deduction },
                    { earn: 'Bonus', earnVal: record.bonus, ded: 'Fines', dedVal: record.fine },
                    { earn: 'Overtime', earnVal: record.overtime, ded: '', dedVal: null },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #E5E7EB', backgroundColor: i % 2 === 0 ? '#fff' : '#F9FAFB' }}>
                      <td style={{ padding: '9px 12px', fontSize: '12px' }}>{row.earn}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>৳ {row.earnVal.toLocaleString()}</td>
                      <td style={{ padding: '9px 12px', fontSize: '12px', borderLeft: '1px solid #E5E7EB' }}>{row.ded}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>{row.dedVal !== null ? `৳ ${row.dedVal.toLocaleString()}` : ''}</td>
                    </tr>
                  ))}
                  <tr style={{ backgroundColor: '#F3F4F6', fontWeight: '700', borderTop: '2px solid #000' }}>
                    <td style={{ padding: '10px 12px', fontSize: '12px', fontWeight: '800' }}>Total Earnings</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12px', fontWeight: '800' }}>৳ {totalEarnings.toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', fontSize: '12px', fontWeight: '800', borderLeft: '1px solid #E5E7EB' }}>Total Deductions</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12px', fontWeight: '800', color: '#DC2626' }}>৳ {totalDeductions.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              {/* Net Salary Box */}
              <div style={{ backgroundColor: '#E31837', color: '#fff', padding: '14px 20px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10mm' }}>
                <div>
                  <div style={{ fontSize: '11px', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Net Salary Payable</div>
                  <div style={{ fontSize: '10px', opacity: 0.75 }}>({record.month} {record.year})</div>
                </div>
                <div style={{ fontSize: '26px', fontWeight: '900', letterSpacing: '1px' }}>
                  ৳ {record.netSalary.toLocaleString()}
                </div>
              </div>

              {/* Signature Area */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14mm' }}>
                <div style={{ width: '170px', textAlign: 'center' }}>
                  <div style={{ borderBottom: '1.5px solid #000', marginBottom: '6px', height: '30px' }}></div>
                  <div style={{ fontSize: '11px', fontWeight: '700' }}>Employer Signature</div>
                  <div style={{ fontSize: '10px', color: '#666' }}>Authorized By</div>
                </div>
                <div style={{ width: '170px', textAlign: 'center' }}>
                  <div style={{ borderBottom: '1.5px solid #000', marginBottom: '6px', height: '30px' }}></div>
                  <div style={{ fontSize: '11px', fontWeight: '700' }}>Employee Signature</div>
                  <div style={{ fontSize: '10px', color: '#666' }}>{emp.name}</div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ marginTop: '10mm', paddingTop: '5mm', borderTop: '1px solid #E5E7EB', textAlign: 'center' }}>
                <div style={{ fontSize: '9px', color: '#9CA3AF' }}>
                  This is a computer-generated salary slip issued by Pizzora Restaurant | pizzora.bd | Generated on {new Date().toLocaleDateString('en-GB')}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {printRecord && (
        <style>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 0;
            }
            body * { visibility: hidden !important; }
            .print-hidden { display: none !important; }
            #thermal-print-area { display: none !important; }
            #expense-print-area { display: none !important; }
            #payroll-print-area { display: block !important; }
            #payroll-print-area, #payroll-print-area * { visibility: visible !important; }
            #payroll-print-area {
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
