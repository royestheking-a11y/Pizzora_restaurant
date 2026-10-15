import React, { useState, useEffect, useMemo } from 'react';
import { useApp, CashRegisterEntry } from '../../context/AppContext';
import {
  Banknote, Save, Clock, Lock, CheckCircle2, TrendingUp, AlertCircle,
  Calendar, ArrowRight, DollarSign, Smartphone, CreditCard, ChevronLeft,
  ChevronRight, Filter, Download, Printer, Eye, X, RefreshCw, Sparkles,
  AlertTriangle, ShieldCheck, PieChart, FileText, Search, ArrowUpRight,
  HelpCircle, Receipt
} from 'lucide-react';
import { TableRowSkeleton } from '../Skeletons';
import { generatePremiumPDF } from '../../utils/pdfGenerator';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '12px',
  border: '1.5px solid #E5E7EB',
  fontSize: '14px',
  outline: 'none',
  fontFamily: 'var(--font-body)',
  color: '#111',
  backgroundColor: '#fff',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  marginBottom: '14px'
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 800,
  color: '#374151',
  display: 'block',
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  fontFamily: 'var(--font-heading)',
};

export function CashRegisterManagement() {
  const { state, dispatch } = useApp();

  // All sessions sorted newest first
  const sessions = useMemo(() => 
    [...state.cashRegister].sort((a, b) => 
      (b.date || b.openedAt || '').localeCompare(a.date || a.openedAt || '') || 
      (b.openedAt || '').localeCompare(a.openedAt || '')
    ),
    [state.cashRegister]
  );

  const [activeSession, setActiveSession] = useState<CashRegisterEntry | null>(null);
  const [openingBalance, setOpeningBalance] = useState('');
  const [bankDeposit, setBankDeposit] = useState('');
  const [shoppingCash, setShoppingCash] = useState('');
  const [cost, setCost] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [viewingSession, setViewingSession] = useState<CashRegisterEntry | null>(null);

  // Month & Date Filtering States
  const currentDhakaMonth = useMemo(() => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }).slice(0, 7);
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentDhakaMonth);
  const [filterMode, setFilterMode] = useState<'month' | 'range' | 'all'>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Closed'>('All');

  useEffect(() => {
    const openSession = sessions.find(s => s.status === 'Open');
    setActiveSession(openSession || null);
  }, [sessions]);

  // Available distinct months extracted from sessions
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(currentDhakaMonth);
    sessions.forEach(s => {
      const d = s.date || (s.openedAt ? s.openedAt.slice(0, 10) : '');
      if (d && /^\d{4}-\d{2}/.test(d)) {
        set.add(d.slice(0, 7));
      }
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [sessions, currentDhakaMonth]);

  // Month navigation helpers
  const currentMonthIndex = availableMonths.indexOf(selectedMonth);
  const hasPrevMonth = currentMonthIndex < availableMonths.length - 1;
  const hasNextMonth = currentMonthIndex > 0;

  const goToPrevMonth = () => {
    if (hasPrevMonth) {
      setSelectedMonth(availableMonths[currentMonthIndex + 1]);
    } else {
      // Calculate 1 month earlier mathematically
      const [y, m] = selectedMonth.split('-').map(Number);
      const prevDate = new Date(y, m - 2, 1);
      const str = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
      setSelectedMonth(str);
    }
  };

  const goToNextMonth = () => {
    if (hasNextMonth) {
      setSelectedMonth(availableMonths[currentMonthIndex - 1]);
    } else {
      // Calculate 1 month forward mathematically
      const [y, m] = selectedMonth.split('-').map(Number);
      const nextDate = new Date(y, m, 1);
      const str = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
      setSelectedMonth(str);
    }
  };

  const formatMonthLabel = (yyyyMm: string) => {
    try {
      const [y, m] = yyyyMm.split('-').map(Number);
      const d = new Date(y, m - 1, 1);
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return yyyyMm;
    }
  };

  // Helper to extract sanitized YYYY-MM-DD from an entry
  const getEntryDate = (r: CashRegisterEntry): string => {
    if (r.date && /^\d{4}-\d{2}-\d{2}$/.test(r.date)) return r.date;
    const ts = r.openedAt || (r.closedAt ?? undefined);
    if (ts) {
      try {
        return new Date(ts).toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
      } catch {}
    }
    return '';
  };

  // Compute Sales Breakdown for Active Session
  const computeSalesBreakdown = () => {
    const breakdown = { cash: 0, bkash: 0, nagad: 0, card: 0, other: 0, total: 0 };
    if (!activeSession) return breakdown;

    const sessionDate = (activeSession.date && /^\d{4}-\d{2}-\d{2}$/.test(activeSession.date))
      ? activeSession.date
      : new Date(activeSession.openedAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
    const utcMidnight = new Date(sessionDate + 'T00:00:00Z').getTime();
    const dayStart = utcMidnight - (6 * 60 * 60 * 1000); // Bangladesh UTC+6
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
  const hasRegisterToday = sessions.some(s => getEntryDate(s) === dhakaStr);

  // Yesterday's shopping reserve (convenience suggestion for opening cash)
  const yesterdaysReserve = useMemo(() => {
    const closedSessions = sessions.filter(s => s.status === 'Closed' && s.shoppingCash > 0);
    return closedSessions.length > 0 ? closedSessions[0].shoppingCash : 0;
  }, [sessions]);

  // Filtered Sessions according to Month / Date Range / Search
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const entryDate = getEntryDate(s);

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDate = entryDate.toLowerCase().includes(q);
        const matchesId = (s.id || '').toLowerCase().includes(q);
        const matchesAmounts = String(s.openingBalance).includes(q) ||
          String(s.totalCashSales).includes(q) ||
          String(s.bankDeposit).includes(q) ||
          String(s.shoppingCash).includes(q);
        if (!matchesDate && !matchesId && !matchesAmounts) return false;
      }

      // Status filter
      if (statusFilter !== 'All' && s.status !== statusFilter) return false;

      // Date Filtering Mode
      if (filterMode === 'month') {
        if (!entryDate.startsWith(selectedMonth)) return false;
      } else if (filterMode === 'range') {
        if (customStartDate && entryDate < customStartDate) return false;
        if (customEndDate && entryDate > customEndDate) return false;
      }

      return true;
    });
  }, [sessions, filterMode, selectedMonth, customStartDate, customEndDate, searchQuery, statusFilter]);

  // Aggregate KPI Metrics for the Selected View
  const monthlyStats = useMemo(() => {
    let totalOpening = 0;
    let totalSales = 0;
    let totalCashSales = 0;
    let totalDigitalSales = 0;
    let totalBank = 0;
    let totalShopping = 0;
    let totalCost = 0;
    let balancedCount = 0;
    let mismatchCount = 0;

    filteredSessions.forEach(s => {
      totalOpening += s.openingBalance || 0;

      const sales = s.status === 'Open'
        ? currentSales.total
        : (s.salesBreakdown?.total ?? (s.salesBreakdown ? (s.salesBreakdown.cash + s.salesBreakdown.bkash + s.salesBreakdown.nagad + s.salesBreakdown.card + s.salesBreakdown.other) : s.totalCashSales));

      const cash = s.status === 'Open'
        ? currentSales.cash
        : (s.salesBreakdown ? s.salesBreakdown.cash : s.totalCashSales);

      totalSales += sales;
      totalCashSales += cash;
      totalDigitalSales += Math.max(0, sales - cash);

      if (s.status === 'Closed') {
        totalBank += s.bankDeposit || 0;
        totalShopping += s.shoppingCash || 0;
        totalCost += s.cost || 0;

        const expected = (s.openingBalance || 0) + cash;
        const allocated = (s.bankDeposit || 0) + (s.shoppingCash || 0) + (s.cost || 0);
        if (Math.abs(expected - allocated) <= 1) {
          balancedCount++;
        } else {
          mismatchCount++;
        }
      }
    });

    const netDrawerVolume = totalOpening + totalCashSales;
    const totalAllocated = totalBank + totalShopping + totalCost;

    return {
      count: filteredSessions.length,
      totalOpening,
      totalSales,
      totalCashSales,
      totalDigitalSales,
      totalBank,
      totalShopping,
      totalCost,
      netDrawerVolume,
      totalAllocated,
      balancedCount,
      mismatchCount
    };
  }, [filteredSessions, currentSales]);

  // Master All-Time Grand Totals (Unfiltered Benchmark)
  const allTimeStats = useMemo(() => {
    let totalSales = 0;
    let totalCash = 0;
    let totalDigital = 0;
    sessions.forEach(s => {
      const sales = s.status === 'Open'
        ? currentSales.total
        : (s.salesBreakdown?.total ?? (s.salesBreakdown ? (s.salesBreakdown.cash + s.salesBreakdown.bkash + s.salesBreakdown.nagad + s.salesBreakdown.card + s.salesBreakdown.other) : s.totalCashSales));

      const cash = s.status === 'Open'
        ? currentSales.cash
        : (s.salesBreakdown ? s.salesBreakdown.cash : s.totalCashSales);

      totalSales += sales;
      totalCash += cash;
      totalDigital += Math.max(0, sales - cash);
    });
    return {
      totalSales,
      totalCash,
      totalDigital,
      count: sessions.length
    };
  }, [sessions, currentSales]);

  // Register Handlers
  const handleOpenRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeSession || hasRegisterToday) {
      alert('A register is already active or was already closed for today.');
      return;
    }
    const balance = Number(openingBalance);
    if (isNaN(balance) || balance < 0) return alert('Enter a valid opening balance amount.');

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

    if (isNaN(bDeposit) || isNaN(sCash) || isNaN(costAmt)) return alert('Enter valid amounts.');

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

  // Export to PDF
  const handleExportPDF = () => {
    const reportTitle = filterMode === 'month'
      ? `Cash Register Audit Report — ${formatMonthLabel(selectedMonth)}`
      : 'Cash Register Audit & EOD Reconciliation Report';

    const tableData = filteredSessions.map((s, idx) => {
      const entryDate = getEntryDate(s) || 'N/A';
      const openTime = s.openedAt ? new Date(s.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka' }) : '—';
      const closeTime = s.closedAt ? new Date(s.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka' }) : (s.status === 'Open' ? 'Active' : '—');

      const totalSales = s.status === 'Open'
        ? currentSales.total
        : (s.salesBreakdown?.total ?? (s.salesBreakdown ? (s.salesBreakdown.cash + s.salesBreakdown.bkash + s.salesBreakdown.nagad + s.salesBreakdown.card + s.salesBreakdown.other) : s.totalCashSales));

      const cashSales = s.status === 'Open'
        ? currentSales.cash
        : (s.salesBreakdown ? s.salesBreakdown.cash : s.totalCashSales);

      const digitalSales = Math.max(0, totalSales - cashSales);
      const expected = (s.openingBalance || 0) + cashSales;
      const allocated = (s.bankDeposit || 0) + (s.shoppingCash || 0) + (s.cost || 0);
      const diff = allocated - expected;
      const varianceStr = s.status === 'Open' ? 'Active' : (Math.abs(diff) <= 1 ? 'Balanced' : `${diff > 0 ? '+' : ''}৳${diff}`);

      return [
        String(idx + 1),
        entryDate,
        `${openTime} - ${closeTime}`,
        `৳${(s.openingBalance || 0).toLocaleString()}`,
        `৳${totalSales.toLocaleString()}`,
        `৳${cashSales.toLocaleString()}`,
        `৳${digitalSales.toLocaleString()}`,
        s.status === 'Open' ? '—' : `৳${(s.bankDeposit || 0).toLocaleString()}`,
        s.status === 'Open' ? '—' : `৳${(s.shoppingCash || 0).toLocaleString()}`,
        s.status === 'Open' ? '—' : `৳${(s.cost || 0).toLocaleString()}`,
        s.status,
        varianceStr
      ];
    });

    generatePremiumPDF({
      title: reportTitle,
      columns: ['#', 'Date', 'Shift Time', 'Opening', 'Total Sales', 'Cash Sales', 'Digital', 'Bank Deposit', 'Shopping', 'Expenses', 'Status', 'Variance'],
      data: tableData,
      filename: `Cash_Register_${filterMode === 'month' ? selectedMonth : 'Custom'}`
    });
  };

  // Print Slip Dialog / Browser Print
  const handlePrintSlip = (session: CashRegisterEntry) => {
    const entryDate = getEntryDate(session);
    const openTime = session.openedAt ? new Date(session.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka' }) : '—';
    const closeTime = session.closedAt ? new Date(session.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka' }) : (session.status === 'Open' ? 'Active' : '—');

    const totalSales = session.status === 'Open'
      ? currentSales.total
      : (session.salesBreakdown?.total ?? (session.salesBreakdown ? (session.salesBreakdown.cash + session.salesBreakdown.bkash + session.salesBreakdown.nagad + session.salesBreakdown.card + session.salesBreakdown.other) : session.totalCashSales));

    const cashSales = session.status === 'Open'
      ? currentSales.cash
      : (session.salesBreakdown ? session.salesBreakdown.cash : session.totalCashSales);

    const digitalSales = Math.max(0, totalSales - cashSales);
    const bkash = session.salesBreakdown?.bkash || 0;
    const nagad = session.salesBreakdown?.nagad || 0;
    const card = (session.salesBreakdown?.card || 0) + (session.salesBreakdown?.other || 0);

    const expected = (session.openingBalance || 0) + cashSales;
    const allocated = (session.bankDeposit || 0) + (session.shoppingCash || 0) + (session.cost || 0);
    const variance = allocated - expected;

    const printWindow = window.open('', '_blank', 'width=380,height=600');
    if (!printWindow) return alert('Please allow popups to print register slips.');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>EOD Slip - ${entryDate}</title>
          <style>
            @page { size: 80mm auto; margin: 4mm; }
            body {
              font-family: 'Courier New', monospace;
              width: 72mm;
              margin: 0 auto;
              padding: 6px;
              color: #000;
              font-size: 11px;
              line-height: 1.35;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .title { font-size: 16px; font-weight: 900; letter-spacing: 1px; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; margin: 2px 0; }
            .total-row { font-size: 12px; font-weight: bold; }
            .sign-area { margin-top: 25px; border-top: 1px dotted #555; padding-top: 4px; text-align: center; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="title">PIZZORA</div>
            <div>END-OF-DAY REGISTER SLIP</div>
            <div>Shift: ${session.id}</div>
            <div>Date: ${entryDate}</div>
            <div>Hours: ${openTime} - ${closeTime}</div>
          </div>
          
          <div class="divider"></div>
          
          <div class="row bold"><span>OPENING CASH:</span><span>৳${session.openingBalance.toLocaleString()}</span></div>
          
          <div class="divider"></div>
          <div class="center bold">-- SALES COLLECTION --</div>
          <div class="row"><span>Physical Cash Sales:</span><span>৳${cashSales.toLocaleString()}</span></div>
          <div class="row"><span>bKash Digital:</span><span>৳${bkash.toLocaleString()}</span></div>
          <div class="row"><span>Nagad Digital:</span><span>৳${nagad.toLocaleString()}</span></div>
          <div class="row"><span>Card & Others:</span><span>৳${card.toLocaleString()}</span></div>
          <div class="row total-row" style="border-top: 1px solid #000; padding-top: 2px;">
            <span>TOTAL SALES:</span><span>৳${totalSales.toLocaleString()}</span>
          </div>
          
          <div class="divider"></div>
          <div class="center bold">-- DRAWER RECONCILIATION --</div>
          <div class="row"><span>Expected Drawer Cash:</span><span>৳${expected.toLocaleString()}</span></div>
          <div class="row"><span>1. Bank Deposit:</span><span>৳${(session.bankDeposit || 0).toLocaleString()}</span></div>
          <div class="row"><span>2. Tomorrow Shopping:</span><span>৳${(session.shoppingCash || 0).toLocaleString()}</span></div>
          <div class="row"><span>3. Store Expenses:</span><span>৳${(session.cost || 0).toLocaleString()}</span></div>
          <div class="row total-row" style="border-top: 1px solid #000; padding-top: 2px;">
            <span>TOTAL ACCOUNTED:</span><span>৳${allocated.toLocaleString()}</span>
          </div>
          <div class="row bold" style="margin-top: 4px;">
            <span>VARIANCE:</span>
            <span>${Math.abs(variance) <= 1 ? 'RECONCILED (৳0)' : (variance > 0 ? `+৳${variance} OVER` : `-৳${Math.abs(variance)} SHORT`)}</span>
          </div>

          <div class="divider"></div>
          <div class="center" style="font-size: 10px;">Status: ${session.status.toUpperCase()}</div>
          <div class="sign-area">Cashier / Manager Signature</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  return (
    <div className="space-y-6 animate-fade-in" style={{ fontFamily: 'var(--font-body)' }}>

      {/* ── Page Header & Quick Controls ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-1">
        <div>
          <h2
            className="text-2xl font-black text-gray-900 tracking-tight"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Cash Register & EOD Station
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Reconcile daily counter cash, channel collections, bank transfers, and shopping reserves.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 shadow-2xs transition-colors"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            <Download size={14} /> Export Report (PDF)
          </button>
        </div>
      </div>

      {/* ── Month & Calendar Selector Bar (The Monthly Divide) ── */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setFilterMode('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterMode === 'month' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
              }`}
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <Calendar size={14} className={filterMode === 'month' ? 'text-red-600' : ''} />
              Monthly View
            </button>
            <button
              onClick={() => setFilterMode('range')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterMode === 'range' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
              }`}
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <Clock size={14} className={filterMode === 'range' ? 'text-red-600' : ''} />
              Custom Dates
            </button>
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterMode === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
              }`}
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              All Time ({sessions.length})
            </button>
          </div>

          {/* Month Stepper & Selector when in 'month' mode */}
          {filterMode === 'month' && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-gray-50 rounded-xl border border-gray-200 p-1">
                <button
                  onClick={goToPrevMonth}
                  className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-600 transition-colors"
                  title="Previous Month"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="px-3 text-center">
                  <span className="text-xs font-black text-gray-900 uppercase tracking-wide block" style={{ fontFamily: 'var(--font-heading)' }}>
                    {formatMonthLabel(selectedMonth)}
                  </span>
                  <span className="text-[10px] text-gray-500 block font-semibold">
                    {filteredSessions.length} Register Days
                  </span>
                </div>

                <button
                  onClick={goToNextMonth}
                  className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-600 transition-colors"
                  title="Next Month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Month Dropdown quick picker */}
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none cursor-pointer hover:border-gray-300"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {availableMonths.map(m => (
                  <option key={m} value={m}>
                    {formatMonthLabel(m)} {m === currentDhakaMonth ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Custom Date Range Picker when in 'range' mode */}
          {filterMode === 'range' && (
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-gray-500 font-bold">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs outline-none bg-gray-50 font-medium"
              />
              <span className="text-gray-500 font-bold">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs outline-none bg-gray-50 font-medium"
              />
              {(customStartDate || customEndDate) && (
                <button
                  onClick={() => { setCustomStartDate(''); setCustomEndDate(''); }}
                  className="text-xs text-red-600 font-bold hover:underline ml-1"
                >
                  Reset
                </button>
              )}
            </div>
          )}

          {/* Quick Search Box */}
          <div className="relative min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search date or amount..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-red-500 focus:bg-white transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Context Notification Pill ── */}
      {filterMode === 'month' && (
        <div className="px-4 py-2.5 bg-amber-50/80 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-amber-700 flex-shrink-0" />
            <span>
              Showing sales for <strong>{formatMonthLabel(selectedMonth)} only</strong>: <strong>৳{monthlyStats.totalSales.toLocaleString()}</strong> ({monthlyStats.count} shifts). Overall restaurant lifetime sales is <strong>৳{allTimeStats.totalSales.toLocaleString()}</strong>.
            </span>
          </div>
          <button
            onClick={() => setFilterMode('all')}
            className="text-xs font-black text-amber-800 hover:text-amber-950 underline flex-shrink-0"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            View All-Time Total →
          </button>
        </div>
      )}

      {/* ── Monthly Executive KPI Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Metric 1: Monthly Total Sales */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              {filterMode === 'month' ? `${formatMonthLabel(selectedMonth).split(' ')[0]} Sales` : (filterMode === 'all' ? 'All-Time Sales' : 'Range Sales')}
            </span>
            <TrendingUp size={14} className="text-green-600" />
          </div>
          <span className="text-xl font-black text-gray-900 block mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
            ৳{monthlyStats.totalSales.toLocaleString()}
          </span>
          <span className="text-[11px] text-gray-500 font-semibold block mt-0.5">
            {filterMode === 'month'
              ? `${monthlyStats.count} shifts in ${formatMonthLabel(selectedMonth).split(' ')[0]}`
              : `${monthlyStats.count} shifts recorded`}
          </span>
        </div>

        {/* Metric 2: Physical Cash Collected */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              {filterMode === 'month' ? `${formatMonthLabel(selectedMonth).split(' ')[0]} Cash` : 'Cash Collected'}
            </span>
            <Banknote size={14} className="text-emerald-600" />
          </div>
          <span className="text-xl font-black text-emerald-700 block mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
            ৳{monthlyStats.totalCashSales.toLocaleString()}
          </span>
          <span className="text-[11px] text-gray-500 font-semibold block mt-0.5">
            Digital: ৳{monthlyStats.totalDigitalSales.toLocaleString()}
          </span>
        </div>

        {/* Metric 3: Bank Deposits */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              {filterMode === 'month' ? `${formatMonthLabel(selectedMonth).split(' ')[0]} Bank` : 'Bank Deposits'}
            </span>
            <DollarSign size={14} className="text-blue-600" />
          </div>
          <span className="text-xl font-black text-blue-700 block mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
            ৳{monthlyStats.totalBank.toLocaleString()}
          </span>
          <span className="text-[11px] text-blue-600 font-bold block mt-0.5">
            Deposited to bank
          </span>
        </div>

        {/* Metric 4: Tomorrow Shopping Reserve */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              {filterMode === 'month' ? `${formatMonthLabel(selectedMonth).split(' ')[0]} Shopping` : 'Shopping Reserves'}
            </span>
            <Sparkles size={14} className="text-amber-600" />
          </div>
          <span className="text-xl font-black text-amber-700 block mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
            ৳{monthlyStats.totalShopping.toLocaleString()}
          </span>
          <span className="text-[11px] text-amber-600 font-bold block mt-0.5">
            Market purchase fund
          </span>
        </div>

        {/* Metric 5: Store Expenses Paid */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              {filterMode === 'month' ? `${formatMonthLabel(selectedMonth).split(' ')[0]} Expenses` : 'Drawer Expenses'}
            </span>
            <Receipt size={14} className="text-red-600" />
          </div>
          <span className="text-xl font-black text-red-700 block mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
            ৳{monthlyStats.totalCost.toLocaleString()}
          </span>
          <span className="text-[11px] text-red-600 font-bold block mt-0.5">
            Operating costs paid
          </span>
        </div>

        {/* Metric 6: Reconciliation Health */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Audit Health</span>
            <ShieldCheck size={14} className="text-emerald-600" />
          </div>
          <span className="text-xl font-black text-gray-900 block mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
            {monthlyStats.balancedCount} / {monthlyStats.count}
          </span>
          <span
            className="text-[11px] text-emerald-600 font-bold block mt-0.5 cursor-help"
            title="Balanced shifts match exact expected drawer cash. Variances represent historical shifts where cashier split differed (such as multi-day bank deposits, rounding, or cancelled order offsets)."
          >
            {monthlyStats.mismatchCount === 0 ? '100% Balanced' : `${monthlyStats.mismatchCount} Logged Variances`}
          </span>
        </div>
      </div>

      {/* ── Main Two-Column Operational Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── Left Column: Active Register Command Center (4 Cols) ── */}
        <div className="lg:col-span-4 space-y-4">
          {!activeSession ? (
            hasRegisterToday ? (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-200">
                  <CheckCircle2 size={28} />
                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-extrabold rounded-full mb-2 uppercase tracking-wider" style={{ fontFamily: 'var(--font-heading)' }}>
                  Today's Shift Finalized
                </span>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '18px', color: '#111' }}>
                  Register Closed for Today
                </h3>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                  All drawer counts, collections, and bank allocations for today ({dhakaStr}) are finalized and securely archived.
                </p>
                <div className="w-full mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
                  <span className="font-semibold">Need to open tomorrow?</span>
                  <span className="font-bold text-gray-900">Starts automatically at 00:00</span>
                </div>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="text-center mb-5">
                  <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3 border border-red-100 shadow-2xs">
                    <Banknote size={26} />
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '19px', color: '#111' }}>
                    Open Today's Register
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Start shift by counting and entering the cash currently in the counter.
                  </p>
                </div>

                <form onSubmit={handleOpenRegister} className="space-y-4">
                  <div>
                    <label style={labelStyle}>Opening Balance (৳) *</label>
                    <input
                      type="number"
                      value={openingBalance}
                      onChange={e => setOpeningBalance(e.target.value)}
                      placeholder="e.g. 4000"
                      style={inputStyle}
                      required
                      min="0"
                      step="any"
                    />

                    {/* Quick suggestion button using yesterday's reserve */}
                    {yesterdaysReserve > 0 && (
                      <button
                        type="button"
                        onClick={() => setOpeningBalance(String(yesterdaysReserve))}
                        className="w-full -mt-2 mb-2 p-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold flex items-center justify-between transition-colors"
                        style={{ fontFamily: 'var(--font-heading)' }}
                      >
                        <span className="flex items-center gap-1.5">
                          <Sparkles size={13} className="text-amber-600" /> Use Yesterday's Reserve:
                        </span>
                        <span className="font-black">৳{yesterdaysReserve.toLocaleString()}</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl font-black text-white transition-all hover:shadow-lg hover:shadow-red-500/25 active:scale-[0.98]"
                    style={{ backgroundColor: '#F9002B', fontFamily: 'var(--font-heading)' }}
                  >
                    Start Day & Open Drawer
                  </button>
                </form>
              </div>
            )
          ) : (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-200 ring-2 ring-emerald-500/10">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '17px', color: '#111' }}>
                    Active Register
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                  Open Shift
                </span>
              </div>

              {/* Real-time Drawer Calculation Box */}
              <div className="mb-5 p-4 bg-gray-50/90 rounded-xl space-y-2.5 border border-gray-100 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600 font-semibold">Opening Balance:</span>
                  <span className="font-black text-gray-900">৳{activeSession.openingBalance.toLocaleString()}</span>
                </div>

                <div className="border-t border-gray-200/80 pt-2 space-y-1.5">
                  <div className="flex justify-between text-emerald-700">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Banknote size={13} /> Physical Cash Sales:
                    </span>
                    <span className="font-black">+ ৳{currentSales.cash.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-pink-700">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Smartphone size={13} /> bKash Digital:
                    </span>
                    <span className="font-bold">+ ৳{currentSales.bkash.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-orange-700">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Smartphone size={13} /> Nagad Digital:
                    </span>
                    <span className="font-bold">+ ৳{currentSales.nagad.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-blue-700">
                    <span className="font-semibold flex items-center gap-1.5">
                      <CreditCard size={13} /> Card & Other:
                    </span>
                    <span className="font-bold">+ ৳{(currentSales.card + currentSales.other).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex justify-between text-gray-900 border-t border-gray-200/80 pt-2 font-bold">
                  <span>Total Sales (All Channels):</span>
                  <span className="text-emerald-600 font-black">৳{currentSales.total.toLocaleString()}</span>
                </div>

                {/* Expected Cash in Drawer */}
                {(() => {
                  const digitalSales = currentSales.bkash + currentSales.nagad + currentSales.card + currentSales.other;
                  return (
                    <div className="mt-2.5 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-950 block" style={{ fontFamily: 'var(--font-heading)' }}>
                            Expected Cash In Drawer
                          </span>
                          <span className="text-[10px] text-emerald-700 font-medium">
                            Opening ৳{activeSession.openingBalance.toLocaleString()} + Cash Sales ৳{currentSales.cash.toLocaleString()}
                          </span>
                        </div>
                        <span className="text-xl font-black text-emerald-700" style={{ fontFamily: 'var(--font-heading)' }}>
                          ৳{expectedDrawerCash.toLocaleString()}
                        </span>
                      </div>

                      {digitalSales > 0 && (
                        <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-xs">
                          <span className="text-gray-600 font-semibold flex items-center gap-1.5">
                            Total with Digital <span className="text-[10px] text-pink-600 font-bold">(+bKash ৳{digitalSales.toLocaleString()})</span>:
                          </span>
                          <span className="font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                            ৳{(expectedDrawerCash + digitalSales).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* End of Day Split Form */}
              <form onSubmit={handleCloseRegister} className="space-y-3">
                <div className="pb-1 border-b border-gray-100">
                  <span className="text-xs font-black text-gray-800 uppercase tracking-wide block" style={{ fontFamily: 'var(--font-heading)' }}>
                    End of Day Allocations
                  </span>
                </div>

                <div>
                  <label style={labelStyle}>1. Deposit to Bank (৳) *</label>
                  <input
                    type="number"
                    value={bankDeposit}
                    onChange={e => setBankDeposit(e.target.value)}
                    placeholder="e.g. 5000"
                    style={inputStyle}
                    required
                    min="0"
                    step="any"
                  />
                </div>

                <div>
                  <label style={labelStyle}>2. Keep for Tomorrow (Shopping) (৳) *</label>
                  <input
                    type="number"
                    value={shoppingCash}
                    onChange={e => setShoppingCash(e.target.value)}
                    placeholder="e.g. 3000"
                    style={inputStyle}
                    required
                    min="0"
                    step="any"
                  />
                </div>

                <div>
                  <label style={labelStyle}>3. Store Operating Expenses (৳) *</label>
                  <input
                    type="number"
                    value={cost}
                    onChange={e => setCost(e.target.value)}
                    placeholder="e.g. 1500"
                    style={inputStyle}
                    required
                    min="0"
                    step="any"
                  />
                </div>

                {/* Real-time sum calculation */}
                {(bankDeposit || shoppingCash || cost) && (
                  <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs flex justify-between font-bold">
                    <span>Allocated Sum:</span>
                    <span className={Number(bankDeposit) + Number(shoppingCash) + Number(cost) === expectedDrawerCash ? 'text-emerald-700 font-black' : 'text-amber-700'}>
                      ৳{(Number(bankDeposit) + Number(shoppingCash) + Number(cost)).toLocaleString()} / ৳{expectedDrawerCash.toLocaleString()}
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl font-black text-white transition-all hover:bg-black active:scale-[0.98]"
                  style={{ backgroundColor: '#111', fontFamily: 'var(--font-heading)' }}
                >
                  Close & Reconcile Day
                </button>
              </form>
            </div>
          )}
        </div>

        {/* ── Right Column: Register History Ledger Table (8 Cols) ── */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            
            {/* Header Strip with Quick Count & Table Filters */}
            <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700">
                  <Clock size={16} />
                </div>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '16px', color: '#111' }}>
                    Register History Ledger
                  </h3>
                  <p className="text-xs text-gray-400">
                    {filterMode === 'month' ? formatMonthLabel(selectedMonth) : 'Selected Period'} · {filteredSessions.length} total entries
                  </p>
                </div>
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setStatusFilter('All')}
                  className={`px-3 py-1 rounded-lg transition-colors ${statusFilter === 'All' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500'}`}
                >
                  All ({filteredSessions.length})
                </button>
                <button
                  onClick={() => setStatusFilter('Open')}
                  className={`px-3 py-1 rounded-lg transition-colors ${statusFilter === 'Open' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-gray-500'}`}
                >
                  Active ({filteredSessions.filter(s => s.status === 'Open').length})
                </button>
                <button
                  onClick={() => setStatusFilter('Closed')}
                  className={`px-3 py-1 rounded-lg transition-colors ${statusFilter === 'Closed' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500'}`}
                >
                  Closed ({filteredSessions.filter(s => s.status === 'Closed').length})
                </button>
              </div>
            </div>

            {/* Responsive Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 uppercase text-[10px] font-black tracking-wider">
                    <th className="px-4 py-3.5">Date & Shift</th>
                    <th className="px-4 py-3.5">Opening Cash</th>
                    <th className="px-4 py-3.5">Sales Collection</th>
                    <th className="px-4 py-3.5">Bank</th>
                    <th className="px-4 py-3.5">Shopping</th>
                    <th className="px-4 py-3.5">Expenses</th>
                    <th className="px-4 py-3.5">Reconciliation</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {state.isInitialLoading ? (
                    Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} columns={8} />)
                  ) : filteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-16 text-center text-gray-400">
                        <Banknote size={36} className="mx-auto mb-2 text-gray-300" />
                        <p className="font-bold text-gray-600">No register entries found for this period</p>
                        <p className="text-xs text-gray-400 mt-1">Try selecting another month or adjusting your filter</p>
                      </td>
                    </tr>
                  ) : (
                    filteredSessions.map(session => {
                      const entryDate = getEntryDate(session);
                      const openTime = session.openedAt
                        ? new Date(session.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka' })
                        : '—';
                      const closeTime = session.closedAt
                        ? new Date(session.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka' })
                        : (session.status === 'Open' ? 'Active' : '—');

                      const totalSales = session.status === 'Open'
                        ? currentSales.total
                        : (session.salesBreakdown?.total ?? (session.salesBreakdown ? (session.salesBreakdown.cash + session.salesBreakdown.bkash + session.salesBreakdown.nagad + session.salesBreakdown.card + session.salesBreakdown.other) : session.totalCashSales));

                      const cashSales = session.status === 'Open'
                        ? currentSales.cash
                        : (session.salesBreakdown ? session.salesBreakdown.cash : session.totalCashSales);

                      const digitalSales = Math.max(0, totalSales - cashSales);

                      const expected = (session.openingBalance || 0) + cashSales;
                      const allocated = (session.bankDeposit || 0) + (session.shoppingCash || 0) + (session.cost || 0);
                      const diff = allocated - expected;
                      const isBalanced = Math.abs(diff) <= 1;

                      // Day of week
                      let dayOfWeek = '';
                      try {
                        if (entryDate) {
                          dayOfWeek = new Date(entryDate + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short' });
                        }
                      } catch {}

                      return (
                        <tr key={session.id} className="hover:bg-gray-50/70 transition-colors">
                          
                          {/* Date & Shift */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 uppercase">
                                {dayOfWeek || 'Day'}
                              </span>
                              <span className="font-extrabold text-gray-900 text-sm" style={{ fontFamily: 'var(--font-heading)' }}>
                                {entryDate || '—'}
                              </span>
                            </div>
                            <span className="text-[11px] text-gray-400 block mt-0.5">
                              {openTime} – {closeTime}
                            </span>
                          </td>

                          {/* Opening Cash */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="font-extrabold text-gray-900">
                              ৳{(session.openingBalance || 0).toLocaleString()}
                            </span>
                          </td>

                          {/* Sales Breakdown */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-black text-emerald-700 text-sm">
                                ৳{totalSales.toLocaleString()}
                              </span>
                              <span className="text-[10px] text-gray-500 font-medium">
                                Cash: ৳{cashSales.toLocaleString()} · Dig: ৳{digitalSales.toLocaleString()}
                              </span>
                            </div>
                          </td>

                          {/* Bank */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {session.status === 'Open' ? (
                              <span className="text-gray-300 font-bold">—</span>
                            ) : (
                              <span className="font-bold text-blue-700">
                                ৳{(session.bankDeposit || 0).toLocaleString()}
                              </span>
                            )}
                          </td>

                          {/* Shopping */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {session.status === 'Open' ? (
                              <span className="text-gray-300 font-bold">—</span>
                            ) : (
                              <span className="font-bold text-amber-700">
                                ৳{(session.shoppingCash || 0).toLocaleString()}
                              </span>
                            )}
                          </td>

                          {/* Cost */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {session.status === 'Open' ? (
                              <span className="text-gray-300 font-bold">—</span>
                            ) : (
                              <span className="font-bold text-red-700">
                                ৳{(session.cost || 0).toLocaleString()}
                              </span>
                            )}
                          </td>

                          {/* Reconciliation Status */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {session.status === 'Open' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                                Active
                              </span>
                            ) : isBalanced ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 size={11} /> Balanced
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 cursor-help"
                                title={`Expected ৳${expected.toLocaleString()} vs Allocated ৳${allocated.toLocaleString()}`}
                              >
                                <AlertTriangle size={11} className="text-amber-600" />
                                {diff > 0 ? `+৳${diff}` : `-৳${Math.abs(diff)}`}
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setViewingSession(session)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                                title="View Complete Shift Audit"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                onClick={() => handlePrintSlip(session)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Print EOD Slip"
                              >
                                <Printer size={15} />
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

            {/* Table Footer Summary Bar */}
            <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-gray-500 gap-2">
              <span className="font-bold text-gray-700">
                Displaying {filteredSessions.length} of {sessions.length} recorded register sessions
              </span>
              <span className="text-gray-400">
                Pizzora Finance & Reconciliation Engine
              </span>
            </div>

          </div>
        </div>

      </div>

      {/* ── Discrepancy Confirmation Modal ── */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowConfirmModal(false); }}
        >
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in border border-gray-100">
            <div className="p-6">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-xl font-black text-center text-gray-900 mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                Drawer Mismatch Warning
              </h3>

              <div className="bg-amber-50 rounded-xl p-4 mb-5 border border-amber-200/80 text-xs text-amber-900 space-y-2">
                <div className="flex justify-between">
                  <span>Expected Drawer Cash:</span>
                  <span className="font-black">৳{expectedDrawerCash.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Your Total Split (Bank + Shop + Cost):</span>
                  <span className="font-black">৳{(Number(bankDeposit) + Number(shoppingCash) + Number(cost)).toLocaleString()}</span>
                </div>
                <div className="border-t border-amber-200 pt-1.5 flex justify-between font-black text-amber-800">
                  <span>Variance / Discrepancy:</span>
                  <span>
                    {Number(bankDeposit) + Number(shoppingCash) + Number(cost) - expectedDrawerCash > 0 ? '+' : ''}
                    ৳{(Number(bankDeposit) + Number(shoppingCash) + Number(cost) - expectedDrawerCash).toLocaleString()}
                  </span>
                </div>
              </div>

              <p className="text-center text-gray-600 mb-6 text-xs">
                Are you sure you want to close the shift with this variance? It will be logged in the permanent audit ledger.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold transition-colors text-xs"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Go Back & Adjust
                </button>
                <button
                  onClick={finalizeClose}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-white transition-all text-xs"
                  style={{ backgroundColor: '#F9002B', fontFamily: 'var(--font-heading)' }}
                >
                  Confirm & Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Shift Audit Detail Modal ── */}
      {viewingSession && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setViewingSession(null); }}
        >
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in border border-gray-100 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 bg-gray-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-red-400 block" style={{ fontFamily: 'var(--font-heading)' }}>
                  Pizzora EOD Audit Slip
                </span>
                <h3 className="text-xl font-black text-white mt-0.5" style={{ fontFamily: 'var(--font-heading)' }}>
                  Shift Audit: {getEntryDate(viewingSession)}
                </h3>
              </div>
              <button
                onClick={() => setViewingSession(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              
              {/* Timing */}
              <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between text-gray-600">
                <span>Opened: <strong className="text-gray-900">{new Date(viewingSession.openedAt).toLocaleString()}</strong></span>
                <span>Closed: <strong className="text-gray-900">{viewingSession.closedAt ? new Date(viewingSession.closedAt).toLocaleString() : 'Active'}</strong></span>
              </div>

              {/* Collections Breakdown */}
              <div className="space-y-2">
                <span className="font-black text-gray-400 uppercase tracking-wider text-[10px] block" style={{ fontFamily: 'var(--font-heading)' }}>
                  Collections & Sales
                </span>
                <div className="bg-gray-50 p-3.5 rounded-xl space-y-2 border border-gray-100">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Opening Balance:</span>
                    <span className="font-extrabold text-gray-900">৳{(viewingSession.openingBalance || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span className="font-semibold">Physical Cash Sales:</span>
                    <span className="font-extrabold">৳{(viewingSession.salesBreakdown?.cash ?? viewingSession.totalCashSales ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-pink-700">
                    <span className="font-semibold">bKash Sales:</span>
                    <span className="font-bold">৳{(viewingSession.salesBreakdown?.bkash ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-orange-700">
                    <span className="font-semibold">Nagad Sales:</span>
                    <span className="font-bold">৳{(viewingSession.salesBreakdown?.nagad ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-blue-700">
                    <span className="font-semibold">Card & Others:</span>
                    <span className="font-bold">৳{((viewingSession.salesBreakdown?.card ?? 0) + (viewingSession.salesBreakdown?.other ?? 0)).toLocaleString()}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between font-black text-gray-900 text-sm">
                    <span>Total Sales:</span>
                    <span className="text-emerald-600">
                      ৳{(viewingSession.salesBreakdown?.total ?? viewingSession.totalCashSales ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Allocations Breakdown */}
              <div className="space-y-2">
                <span className="font-black text-gray-400 uppercase tracking-wider text-[10px] block" style={{ fontFamily: 'var(--font-heading)' }}>
                  Drawer Allocations & Reconciliation
                </span>
                <div className="bg-gray-50 p-3.5 rounded-xl space-y-2 border border-gray-100">
                  <div className="flex justify-between text-blue-700">
                    <span className="font-semibold">Bank Deposit:</span>
                    <span className="font-extrabold">৳{(viewingSession.bankDeposit || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-amber-700">
                    <span className="font-semibold">Shopping Reserve:</span>
                    <span className="font-extrabold">৳{(viewingSession.shoppingCash || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-red-700">
                    <span className="font-semibold">Direct Store Expenses:</span>
                    <span className="font-extrabold">৳{(viewingSession.cost || 0).toLocaleString()}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between font-black text-gray-900 text-sm">
                    <span>Total Accounted:</span>
                    <span>৳{((viewingSession.bankDeposit || 0) + (viewingSession.shoppingCash || 0) + (viewingSession.cost || 0)).toLocaleString()}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => handlePrintSlip(viewingSession)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white font-bold hover:bg-black transition-colors"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                <Printer size={14} /> Print Thermal Slip
              </button>
              <button
                onClick={() => setViewingSession(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
