import React, { useState, useMemo } from 'react';
import {
  Plus, Trash2, Save, X, DollarSign, TrendingDown, TrendingUp, Calendar,
  Search, Edit2, Printer, Download, Filter, Clock, Flame, Zap, Sparkles,
  Users, Truck, Building2, Wrench, Megaphone, Receipt, ChefHat, ArrowUpRight,
  ArrowDownRight, BarChart3, PieChart, Layers, RefreshCw, FileText, Check,
  AlertTriangle, ShieldCheck
} from 'lucide-react';
import { useApp, ExpenseEntry } from '../../context/AppContext';
import { TableRowSkeleton } from '../Skeletons';
import { ConfirmModal } from '../ConfirmModal';
import { generatePremiumPDF } from '../../utils/pdfGenerator';

const PZ = '#F9002B';
const PZD = '#C8001F';

// ── Number & Currency Formatting Helpers ─────────────────────────────────────
const formatCurrency = (n: number | undefined): string => {
  if (n === undefined || isNaN(n) || n === 0) return '৳0';
  return `৳${Math.round(n).toLocaleString()}`;
};

const formatQty = (n: number | undefined): string => {
  if (n === undefined || isNaN(n) || n === 0) return '0';
  if (Math.abs(n - Math.round(n)) < 0.001) return Math.round(n).toLocaleString();
  return Number(n.toFixed(2)).toLocaleString();
};

// ── Section Definitions ───────────────────────────────────────────────────────
export interface SectionMeta {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  color: string;
  bg: string;
  border: string;
  desc: string;
}

export const EXPENSE_SECTIONS: SectionMeta[] = [
  { id: 'Kitchen', label: 'Kitchen', icon: ChefHat, color: '#EA580C', bg: '#FFEDD5', border: '#FDBA74', desc: 'Raw ingredients, meat, cheese, spices & kitchen consumables' },
  { id: 'Outside', label: 'Outside', icon: Truck, color: '#2563EB', bg: '#DBEAFE', border: '#93C5FD', desc: 'Rider fuel, delivery allowance, vehicle repair & transport' },
  { id: 'Cleaning', label: 'Cleaning', icon: Sparkles, color: '#059669', bg: '#D1FAE5', border: '#6EE7B7', desc: 'Sanitizers, dishwashing gel, floor cleaners & trash bags' },
  { id: 'Gas Bill', label: 'Gas Bill', icon: Flame, color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5', desc: 'LPG cylinders, gas line monthly utility bills & pipe fittings' },
  { id: 'Electricity', label: 'Electricity', icon: Zap, color: '#D97706', bg: '#FEF3C7', border: '#FCD34D', desc: 'Electric meter bill, generator diesel fuel & maintenance' },
  { id: 'Staff Salary', label: 'Staff Salary', icon: Users, color: '#7C3AED', bg: '#EDE9FE', border: '#C4B5FD', desc: 'Chef, waiter, cashier & cleaner monthly salaries & bonuses' },
  { id: 'Rent & Premises', label: 'Rent & Premises', icon: Building2, color: '#4B5563', bg: '#F3F4F6', border: '#D1D5DB', desc: 'Restaurant shop rent, storage space & building service fees' },
  { id: 'Maintenance', label: 'Maintenance', icon: Wrench, color: '#0891B2', bg: '#CFFAFE', border: '#67E8F9', desc: 'Pizza oven, AC, chiller, plumbing & electrical servicing' },
  { id: 'Marketing', label: 'Marketing', icon: Megaphone, color: '#DB2777', bg: '#FCE7F3', border: '#F9A8D4', desc: 'Facebook ads, banners, signage, flyers & photo shoots' },
  { id: 'Other', label: 'Other', icon: Receipt, color: '#64748B', bg: '#F1F5F9', border: '#CBD5E1', desc: 'POS software, office stationery, tea & emergency expenses' },
];

export const SECTION_CATEGORIES: Record<string, Record<string, string[]>> = {
  'Kitchen': {
    'Food & Raw Materials': ['Flour & Dough Essentials', 'Cheese & Dairy (Mozzarella)', 'Chicken & Meat Stock', 'Vegetables, Mushrooms & Olives', 'Cooking Oil, Ghee & Butter', 'Tomato Sauce & Seasonings', 'Beverage Cans & Syrups'],
    'Kitchen Consumables': ['Kitchen LPG Refill', 'Kitchen Utensils, Trays & Knives', 'Food Grade Packaging Wrap', 'Aluminum Foil', 'Chef Caps & Aprons'],
    'Kitchen Prep & Tasting': ['Trial Recipes & Sample Runs', 'Emergency Grocery Run', 'Kitchen Spoilage Replacements']
  },
  'Outside': {
    'Delivery & Fuel': ['Rider Petrol Allowance', 'Bike Engine Oil & Servicing', 'Delivery Commission (External)', 'Local Parcel Courier / Rider Fee'],
    'Logistics & Transport': ['Market Shopping Transport', 'Raw Material Pickup Transport', 'Waste Disposal Transport']
  },
  'Cleaning': {
    'Sanitation Chemicals': ['Dishwashing Liquid & Paste', 'Floor & Tile Cleaner', 'Chlorine Bleach & Disinfectant', 'Hand Wash Liquid & Soap', 'Glass Cleaner Spray'],
    'Cleaning Supplies': ['Heavy Duty Mops & Squeegees', 'Scrubbers & Steel Wool', 'Heavy Duty Black Garbage Bags', 'Microfiber Cleaning Towels']
  },
  'Gas Bill': {
    'LPG Cylinders': ['12kg LPG Gas Cylinder', '35kg Heavy Commercial Cylinder', '45kg Commercial Cylinder'],
    'Gas Utility & Pipeline': ['Monthly Gas Pipeline Bill', 'High Pressure Gas Regulator', 'Gas Hose & Brass Fittings', 'Burner Stove Service & Cleaning']
  },
  'Electricity': {
    'Utility Bills': ['Monthly Electricity Bill (DESCO/PDB)', 'Sub-station Maintenance Fee', 'Commercial Electric Meter Charges'],
    'Generator & Backup': ['Generator Diesel Fuel', 'Generator Mobile Oil & Filters', 'IPS / Battery Upkeep', 'Electrician Wiring & LED Replacement']
  },
  'Staff Salary': {
    'Monthly Salaries': ['Head Chef Monthly Salary', 'Assistant Cook Salary', 'Floor Waiter Salary', 'Cashier & Counter Staff Salary', 'Kitchen Cleaner / Dishwasher Salary'],
    'Allowances & Overtime': ['Staff Daily Meal Allowance', 'Late Night Overtime Pay', 'Festival / Eid Bonus', 'Staff Medical & Emergency Advance']
  },
  'Rent & Premises': {
    'Property Rent': ['Restaurant Main Floor Rent', 'Kitchen Storage Room Rent', 'Outdoor Terrace Space Rent'],
    'Building Charges': ['Commercial Common Service Charge', 'Commercial Water Bill', 'Security Guard Fee', 'Holding & Municipality Tax']
  },
  'Maintenance': {
    'Equipment Servicing': ['Pizza Conveyor Oven Service', 'Chiller & Deep Freezer Servicing', 'Air Conditioner (AC) Gas Refill & Cleaning', 'Dough Spiral Mixer Repair'],
    'Premises Repair': ['Plumbing & Drainage Fixing', 'Exhaust Fan & Hood Degreasing', 'Interior Paint & Woodwork Touchup', 'Electrical Socket & Switch Repair']
  },
  'Marketing': {
    'Digital Advertising': ['Facebook / Meta Sponsored Ads', 'Instagram Promotion', 'Google Maps / Local SEO Promotion', 'SMS Marketing Gateway'],
    'Print & Signage': ['Outdoor Acrylic Glow-Signboard', 'Flyers, Leaflets & Menus', 'Loyalty Cards & Table Standees', 'Festival Banners & Cutouts']
  },
  'Other': {
    'Software & Administrative': ['POS Software Monthly License', 'Thermal Receipt Paper Rolls', 'Broadband Internet & Wi-Fi', 'Counter Stationery & Pens'],
    'Petty Cash & Miscellaneous': ['VIP Guest Refreshments', 'Tea & Coffee for Staff/Guests', 'Bank Transaction & Terminal Fees', 'Unforeseen Emergency Cash']
  }
};

export const normalizeSectionId = (raw?: string): string => {
  if (!raw || !raw.trim()) return '';
  const s = raw.trim().toLowerCase();
  if (s === 'kitchen' || s.includes('kitchen') || s.includes('food') || s.includes('raw') || s.includes('chef')) return 'Kitchen';
  if (s === 'outside' || s === 'transport' || s.includes('delivery') || s.includes('rider') || s.includes('fuel')) return 'Outside';
  if (s === 'cleaning' || s.includes('clean') || s.includes('sanit') || s.includes('wash')) return 'Cleaning';
  if (s === 'gas bill' || s === 'gas' || s.includes('gas') || s.includes('lpg') || s.includes('cylinder')) return 'Gas Bill';
  if (s === 'electricity' || s === 'electric' || s.includes('power') || s.includes('generator') || s === 'utilities' || s === 'utility') return 'Electricity';
  if (s === 'staff salary' || s === 'salary' || s.includes('payroll') || s.includes('wage')) return 'Staff Salary';
  if (s === 'rent & premises' || s === 'rent' || s.includes('rent') || s.includes('premise')) return 'Rent & Premises';
  if (s === 'maintenance' || s.includes('repair') || s.includes('service') || s.includes('fix')) return 'Maintenance';
  if (s === 'marketing' || s.includes('market') || s.includes('ad') || s.includes('promo') || s.includes('banner')) return 'Marketing';
  if (s === 'other' || s === 'miscellaneous' || s === 'software' || s.includes('office') || s.includes('stationery')) return 'Other';

  const match = EXPENSE_SECTIONS.find(sec => sec.id.toLowerCase() === s || sec.label.toLowerCase() === s);
  if (match) return match.id;
  return '';
};

const getExpenseSection = (exp: ExpenseEntry): string => {
  if (exp.section && exp.section.trim()) {
    const normalized = normalizeSectionId(exp.section);
    if (normalized) return normalized;
  }
  const combined = `${exp.category || ''} ${exp.subcategory || ''} ${exp.description || ''}`.toLowerCase();
  if (combined.includes('electric') || combined.includes('power') || combined.includes('generator') || combined.includes('desco') || combined.includes('pdb')) return 'Electricity';
  if (combined.includes('gas') || combined.includes('lpg') || combined.includes('cylinder')) return 'Gas Bill';
  if (combined.includes('clean') || combined.includes('sanit') || combined.includes('detergent') || combined.includes('dishwash') || combined.includes('bleach')) return 'Cleaning';
  if (combined.includes('salary') || combined.includes('wage') || combined.includes('bonus') || combined.includes('payroll') || combined.includes('chef salary')) return 'Staff Salary';
  if (combined.includes('fuel') || combined.includes('petrol') || combined.includes('rider') || combined.includes('transport') || combined.includes('delivery')) return 'Outside';
  if (combined.includes('rent') || combined.includes('storage') || combined.includes('holding tax')) return 'Rent & Premises';
  if (combined.includes('repair') || combined.includes('service') || combined.includes('maintenance') || combined.includes('ac ')) return 'Maintenance';
  if (combined.includes('ad') || combined.includes('banner') || combined.includes('flyer') || combined.includes('marketing') || combined.includes('campaign')) return 'Marketing';
  if (combined.includes('software') || combined.includes('pos') || combined.includes('stationery') || combined.includes('office') || combined.includes('paper roll')) return 'Other';
  return 'Kitchen';
};

const inputSt: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: '10px',
  border: '1px solid #E5E7EB',
  fontSize: '13px',
  outline: 'none',
  fontFamily: 'var(--font-body)',
  color: '#111827',
  backgroundColor: '#fff',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
};

const labelSt: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#4B5563',
  display: 'block',
  marginBottom: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  fontFamily: 'var(--font-heading)',
};

export function ExpenseManagement() {
  const { state, dispatch } = useApp();
  const { expenses } = state;

  const adminRole = sessionStorage.getItem('pizzora_admin_role') || 'manager';
  const adminName = sessionStorage.getItem('pizzora_admin_user') || 'Accounts Admin';

  // ── Navigation Tabs ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'ledger' | 'reports' | 'comparison' | 'custom-range'>('ledger');

  // ── Search & Filter State ──────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filterSection, setFilterSection] = useState('All');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('All');
  const [datePreset, setDatePreset] = useState<'All Time' | 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Last Month' | 'This Year' | 'Custom'>('All Time');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(''); // YYYY-MM

  // ── Month-over-Month (MoM) Comparison State ────────────────────────────────
  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
  const currentMonthStr = useMemo(() => todayStr.slice(0, 7), [todayStr]);
  const previousMonthStr = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toLocaleDateString('en-CA').slice(0, 7);
  }, []);

  const [compareMonthA, setCompareMonthA] = useState<string>(currentMonthStr);
  const [compareMonthB, setCompareMonthB] = useState<string>(previousMonthStr);

  // ── Modals & Actions ───────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ExpenseEntry | null>(null);
  const [printExpense, setPrintExpense] = useState<ExpenseEntry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });
  const [viewSectionModal, setViewSectionModal] = useState<SectionMeta | null>(null);

  const handleViewSectionEntries = (secId: string, monthOnly?: boolean) => {
    setFilterSection(secId);
    setSearch('');
    setFilterPaymentMethod('All');
    setCustomStartDate('');
    setCustomEndDate('');
    if (monthOnly) {
      setDatePreset('This Month');
      setSelectedMonth(currentMonthStr);
    } else {
      setDatePreset('All Time');
      setSelectedMonth('');
    }
    setActiveTab('ledger');
  };

  // ── Form State ─────────────────────────────────────────────────────────────
  const [formSection, setFormSection] = useState<string>('Kitchen');
  const [formCategory, setFormCategory] = useState<string>('Food & Raw Materials');
  const [formSubcategory, setFormSubcategory] = useState<string>('Flour & Dough Essentials');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formDate, setFormDate] = useState<string>(todayStr);
  const [formTime, setFormTime] = useState<string>(() => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  });
  const [formPaymentMethod, setFormPaymentMethod] = useState<string>('Cash');
  const [formInvoiceNo, setFormInvoiceNo] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formRecordedBy, setFormRecordedBy] = useState<string>(adminName);

  // Reset or fill form
  const openAddForm = (initialSection?: string) => {
    const sec = initialSection || 'Kitchen';
    const cats = SECTION_CATEGORIES[sec] || {};
    const firstCat = Object.keys(cats)[0] || 'General';
    const firstSub = (cats[firstCat] && cats[firstCat][0]) || 'General Expense';
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    setEditing(null);
    setFormSection(sec);
    setFormCategory(firstCat);
    setFormSubcategory(firstSub);
    setFormAmount(0);
    setFormDate(todayStr);
    setFormTime(timeFormatted);
    setFormPaymentMethod('Cash');
    setFormInvoiceNo(`EXP-${Date.now().toString().slice(-6)}`);
    setFormDescription('');
    setFormRecordedBy(adminName);
    setShowForm(true);
  };

  const openEditForm = (exp: ExpenseEntry) => {
    const sec = getExpenseSection(exp);
    setEditing(exp);
    setFormSection(sec);
    setFormCategory(exp.category);
    setFormSubcategory(exp.subcategory || '');
    setFormAmount(exp.amount || 0);
    setFormDate(exp.date || todayStr);
    setFormTime(exp.time || '12:00 PM');
    setFormPaymentMethod(exp.paymentMethod || 'Cash');
    setFormInvoiceNo(exp.invoiceNo || `EXP-${exp.id.slice(-6)}`);
    setFormDescription(exp.description || '');
    setFormRecordedBy(exp.recordedBy || adminName);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!formSection || formAmount <= 0) return;
    const finalInvoiceNo = formInvoiceNo.trim() !== '' ? formInvoiceNo.trim() : `EXP-${Date.now().toString().slice(-6)}`;

    const payload: ExpenseEntry = {
      id: editing ? editing.id : `exp-${Date.now()}`,
      section: formSection,
      category: formCategory,
      subcategory: formSubcategory,
      amount: Number(formAmount),
      date: formDate,
      time: formTime,
      paymentMethod: formPaymentMethod,
      invoiceNo: finalInvoiceNo,
      description: formDescription,
      recordedBy: formRecordedBy
    };

    if (editing) {
      dispatch({ type: 'UPDATE_EXPENSE', payload });
    } else {
      dispatch({ type: 'ADD_EXPENSE', payload });
    }
    setShowForm(false);
    setEditing(null);
  };

  // ── Filtered Expenses Calculation ──────────────────────────────────────────
  const filtered = useMemo(() => {
    return expenses.filter(exp => {
      const expSec = getExpenseSection(exp);

      // Section Filter
      if (filterSection !== 'All' && expSec !== filterSection) return false;

      // Payment Method Filter
      if (filterPaymentMethod !== 'All' && exp.paymentMethod !== filterPaymentMethod) return false;

      // Month Picker Filter (if explicitly chosen)
      if (selectedMonth && !exp.date.startsWith(selectedMonth)) return false;

      // Date Preset Filter
      if (datePreset === 'Today' && exp.date !== todayStr) return false;
      if (datePreset === 'Yesterday') {
        const yDate = new Date();
        yDate.setDate(yDate.getDate() - 1);
        const yStr = yDate.toLocaleDateString('en-CA');
        if (exp.date !== yStr) return false;
      }
      if (datePreset === 'This Week') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        const minDate = d.toLocaleDateString('en-CA');
        if (exp.date < minDate || exp.date > todayStr) return false;
      }
      if (datePreset === 'This Month' && !exp.date.startsWith(currentMonthStr)) return false;
      if (datePreset === 'Last Month' && !exp.date.startsWith(previousMonthStr)) return false;
      if (datePreset === 'This Year' && !exp.date.startsWith(todayStr.slice(0, 4))) return false;

      if (datePreset === 'Custom' || (customStartDate && customEndDate)) {
        if (customStartDate && exp.date < customStartDate) return false;
        if (customEndDate && exp.date > customEndDate) return false;
      }

      // Search Query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchDesc = (exp.description || '').toLowerCase().includes(q);
        const matchInv = (exp.invoiceNo || '').toLowerCase().includes(q);
        const matchCat = (exp.category || '').toLowerCase().includes(q);
        const matchSub = (exp.subcategory || '').toLowerCase().includes(q);
        const matchSec = expSec.toLowerCase().includes(q);
        const matchMethod = (exp.paymentMethod || '').toLowerCase().includes(q);
        const matchUser = (exp.recordedBy || '').toLowerCase().includes(q);
        if (!matchDesc && !matchInv && !matchCat && !matchSub && !matchSec && !matchMethod && !matchUser) {
          return false;
        }
      }

      return true;
    });
  }, [expenses, filterSection, filterPaymentMethod, selectedMonth, datePreset, todayStr, currentMonthStr, previousMonthStr, customStartDate, customEndDate, search]);

  // ── Reporting KPI Aggregations (Daily, Weekly, Monthly, Year-wise, All-Time) ─
  const {
    allTimeTotal,
    allTimeCount,
    todayTotal,
    yesterdayTotal,
    thisWeekTotal,
    thisMonthTotal,
    lastMonthTotal,
    thisYearTotal,
    sectionTotalsAllTime,
    sectionTotalsThisMonth,
    topSectionAllTime,
  } = useMemo(() => {
    let allTime = 0;
    let todayT = 0;
    let yesterdayT = 0;
    let weekT = 0;
    let monthT = 0;
    let lastMonthT = 0;
    let yearT = 0;

    const yDate = new Date();
    yDate.setDate(yDate.getDate() - 1);
    const yStr = yDate.toLocaleDateString('en-CA');

    const weekMinDate = new Date();
    weekMinDate.setDate(weekMinDate.getDate() - 7);
    const weekMinStr = weekMinDate.toLocaleDateString('en-CA');

    const secAll: Record<string, number> = {};
    const secMonth: Record<string, number> = {};

    EXPENSE_SECTIONS.forEach(s => {
      secAll[s.id] = 0;
      secMonth[s.id] = 0;
    });

    expenses.forEach(exp => {
      const amt = exp.amount || 0;
      const sec = getExpenseSection(exp);
      allTime += amt;

      if (secAll[sec] !== undefined) secAll[sec] += amt;
      else secAll[sec] = (secAll[sec] || 0) + amt;

      if (exp.date === todayStr) todayT += amt;
      if (exp.date === yStr) yesterdayT += amt;
      if (exp.date >= weekMinStr && exp.date <= todayStr) weekT += amt;
      if (exp.date.startsWith(currentMonthStr)) {
        monthT += amt;
        if (secMonth[sec] !== undefined) secMonth[sec] += amt;
        else secMonth[sec] = (secMonth[sec] || 0) + amt;
      }
      if (exp.date.startsWith(previousMonthStr)) lastMonthT += amt;
      if (exp.date.startsWith(todayStr.slice(0, 4))) yearT += amt;
    });

    // Determine top spending section all time
    let topSec = { section: 'Kitchen', total: 0 };
    Object.entries(secAll).forEach(([s, t]) => {
      if (t > topSec.total) topSec = { section: s, total: t };
    });

    return {
      allTimeTotal: allTime,
      allTimeCount: expenses.length,
      todayTotal: todayT,
      yesterdayTotal: yesterdayT,
      thisWeekTotal: weekT,
      thisMonthTotal: monthT,
      lastMonthTotal: lastMonthT,
      thisYearTotal: yearT,
      sectionTotalsAllTime: secAll,
      sectionTotalsThisMonth: secMonth,
      topSectionAllTime: topSec,
    };
  }, [expenses, todayStr, currentMonthStr, previousMonthStr]);

  // ── Month-over-Month Comparison Breakdown ───────────────────────────────────
  const comparisonData = useMemo(() => {
    const monthAExpenses = expenses.filter(e => e.date.startsWith(compareMonthA));
    const monthBExpenses = expenses.filter(e => e.date.startsWith(compareMonthB));

    const totalA = monthAExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const totalB = monthBExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const diffTotal = totalA - totalB;
    const pctTotal = totalB > 0 ? (diffTotal / totalB) * 100 : (totalA > 0 ? 100 : 0);

    const breakdown = EXPENSE_SECTIONS.map(sec => {
      const aItems = monthAExpenses.filter(e => getExpenseSection(e) === sec.id);
      const bItems = monthBExpenses.filter(e => getExpenseSection(e) === sec.id);
      const amountA = aItems.reduce((s, e) => s + (e.amount || 0), 0);
      const amountB = bItems.reduce((s, e) => s + (e.amount || 0), 0);
      const diff = amountA - amountB;
      const pct = amountB > 0 ? (diff / amountB) * 100 : (amountA > 0 ? 100 : 0);

      return {
        section: sec,
        countA: aItems.length,
        countB: bItems.length,
        amountA,
        amountB,
        diff,
        pct,
        trend: diff > 0 ? 'increased' : diff < 0 ? 'decreased' : 'equal',
      };
    });

    return {
      totalA,
      totalB,
      diffTotal,
      pctTotal,
      breakdown,
    };
  }, [expenses, compareMonthA, compareMonthB]);

  // ── PDF Exports ────────────────────────────────────────────────────────────
  const handleExportLedgerPDF = () => {
    const data = filtered.map(e => [
      e.date || '-',
      e.time || '-',
      e.invoiceNo || '-',
      getExpenseSection(e),
      `${e.category} - ${e.subcategory || ''}`,
      e.description || '-',
      e.paymentMethod || 'Cash',
      `BDT ${Math.round(e.amount || 0).toLocaleString()}`
    ]);

    const totalFiltered = filtered.reduce((s, e) => s + (e.amount || 0), 0);

    generatePremiumPDF({
      title: `Expense Ledger (${datePreset} - ${filtered.length} entries, Total: BDT ${totalFiltered.toLocaleString()})`,
      columns: ['Date', 'Time', 'Invoice No.', 'Section', 'Category', 'Description', 'Method', 'Amount'],
      data,
      filename: `Pizzora_Expense_Ledger_${datePreset.replace(/\s+/g, '_')}`
    });
  };

  const handleExportMoMPDF = () => {
    const data = comparisonData.breakdown.map(b => [
      b.section.label,
      `BDT ${Math.round(b.amountB).toLocaleString()}`,
      `BDT ${Math.round(b.amountA).toLocaleString()}`,
      `${b.diff >= 0 ? '+' : ''}BDT ${Math.round(b.diff).toLocaleString()}`,
      `${b.diff >= 0 ? '+' : ''}${b.pct.toFixed(1)}%`,
      b.trend.toUpperCase()
    ]);

    generatePremiumPDF({
      title: `Month Comparison Report (${compareMonthB} vs ${compareMonthA})`,
      columns: ['Section', `${compareMonthB} (Prev)`, `${compareMonthA} (Curr)`, 'Diff (BDT)', 'Change (%)', 'Trend'],
      data,
      filename: `Expense_MoM_Comparison_${compareMonthB}_vs_${compareMonthA}`
    });
  };

  // ── Voucher Print ──────────────────────────────────────────────────────────
  const handlePrint = (exp: ExpenseEntry) => {
    setPrintExpense(exp);
    setTimeout(() => {
      document.body.classList.add('print-expense');
      window.print();
      document.body.classList.remove('print-expense');
      setPrintExpense(null);
    }, 400);
  };

  return (
    <>
      <div className="print-hidden space-y-6">
        {/* ── HEADER BANNER ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-2xl flex items-center justify-center text-white" style={{ background: `linear-gradient(135deg, ${PZ}, ${PZD})` }}>
                <DollarSign size={22} />
              </span>
              <div>
                <h1 className="text-xl font-black text-gray-900 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                  Restaurant Expense & Finance Station
                </h1>
                <p className="text-xs text-gray-500 font-medium">
                  Section-based cost accounting, MoM audit analysis, daily/monthly reporting & voucher management
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            <button
              onClick={() => openAddForm()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white text-sm font-bold shadow-md shadow-red-500/20 active:scale-95 transition-all"
              style={{ background: `linear-gradient(135deg, ${PZ}, ${PZD})`, fontFamily: 'var(--font-heading)' }}
            >
              <Plus size={16} /> Record Expense
            </button>
            <button
              onClick={handleExportLedgerPDF}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-gray-700 bg-gray-100 hover:bg-gray-200 text-sm font-bold transition-all"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <Download size={15} /> Export PDF
            </button>
          </div>
        </div>

        {/* ── EXECUTIVE KPI CARDS (Daily, Weekly, Monthly, Year-wise, All-Time) ─ */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* 1. Today */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-red-200 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Today</span>
              <span className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <Clock size={14} />
              </span>
            </div>
            <p className="text-xl font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
              {formatCurrency(todayTotal)}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              Yesterday: {formatCurrency(yesterdayTotal)}
            </p>
          </div>

          {/* 2. This Week */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-blue-200 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">This Week (7D)</span>
              <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Calendar size={14} />
              </span>
            </div>
            <p className="text-xl font-black text-blue-600" style={{ fontFamily: 'var(--font-heading)' }}>
              {formatCurrency(thisWeekTotal)}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              Rolling 7-day spend
            </p>
          </div>

          {/* 3. This Month */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-purple-200 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">This Month</span>
              <span className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <BarChart3 size={14} />
              </span>
            </div>
            <p className="text-xl font-black text-purple-600" style={{ fontFamily: 'var(--font-heading)' }}>
              {formatCurrency(thisMonthTotal)}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              Last Month: {formatCurrency(lastMonthTotal)}
            </p>
          </div>

          {/* 4. Year-Wise */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-amber-200 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Year-To-Date</span>
              <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <TrendingUp size={14} />
              </span>
            </div>
            <p className="text-xl font-black text-amber-600" style={{ fontFamily: 'var(--font-heading)' }}>
              {formatCurrency(thisYearTotal)}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              Calendar year {todayStr.slice(0, 4)}
            </p>
          </div>

          {/* 5. All-Time Summary */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4 rounded-2xl shadow-sm border border-gray-800 col-span-2 md:col-span-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">All-Time Total</span>
              <span className="w-7 h-7 rounded-lg bg-white/10 text-white flex items-center justify-center">
                <ShieldCheck size={14} />
              </span>
            </div>
            <p className="text-xl font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>
              {formatCurrency(allTimeTotal)}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              {allTimeCount} Vouchers Recorded
            </p>
          </div>
        </div>

        {/* ── NAVIGATION TABS ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto scrollbar-none">
          {[
            { id: 'ledger', label: 'Expenses Ledger', icon: Receipt, count: filtered.length },
            { id: 'reports', label: 'Section & Time Analytics', icon: BarChart3 },
            { id: 'comparison', label: 'Month-over-Month Comparison', icon: TrendingUp },
            { id: 'custom-range', label: 'Custom Date Range Audit', icon: Calendar },
          ].map(t => {
            const Icon = t.icon;
            const isAct = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                  isAct
                    ? 'bg-red-50 text-red-600 border border-red-200 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                <Icon size={15} />
                <span>{t.label}</span>
                {t.count !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${isAct ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: EXPENSES LEDGER TABLE                                         */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'ledger' && (
          <div className="space-y-4">
            {/* Quick Section Filter Bar */}
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-2 overflow-x-auto scrollbar-none">
              <span className="text-[11px] font-black uppercase text-gray-400 px-2 tracking-wider">Sections:</span>
              <button
                onClick={() => setFilterSection('All')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  filterSection === 'All'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Sections ({expenses.length})
              </button>
              {EXPENSE_SECTIONS.map(s => {
                const isSel = filterSection === s.id;
                const Icon = s.icon;
                const count = expenses.filter(e => getExpenseSection(e) === s.id).length;
                return (
                  <button
                    key={s.id}
                    onClick={() => setFilterSection(s.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      isSel
                        ? 'text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    style={{
                      backgroundColor: isSel ? s.color : '#F9FAFB',
                      border: `1px solid ${isSel ? s.color : '#E5E7EB'}`,
                    }}
                  >
                    <Icon size={13} />
                    <span>{s.label}</span>
                    <span className={`text-[10px] px-1.5 rounded-full ${isSel ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* If a department filter is active, show the active filter banner with clear button */}
            {filterSection !== 'All' && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs animate-fade-in shadow-sm">
                <span className="font-bold flex items-center gap-2">
                  <Filter size={14} className="text-red-600" />
                  Showing Department: <strong className="text-red-900 bg-red-100 px-2 py-0.5 rounded-md underline">{filterSection}</strong>
                  <span className="text-gray-500 font-medium">({filtered.length} vouchers matching, Total: {formatCurrency(filtered.reduce((s, e) => s + (e.amount || 0), 0))})</span>
                </span>
                <button
                  type="button"
                  onClick={() => { setFilterSection('All'); setDatePreset('All Time'); setSearch(''); setSelectedMonth(''); }}
                  className="font-bold text-red-700 hover:text-red-900 bg-white px-3 py-1 rounded-xl border border-red-200 shadow-sm hover:bg-red-50 transition-all text-xs"
                >
                  Clear Department Filter ✕
                </button>
              </div>
            )}

            {/* Filter Controls Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {/* Search */}
              <div className="relative md:col-span-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search description, invoice, category, staff..."
                  style={{ ...inputSt, paddingLeft: '32px' }}
                />
              </div>

              {/* Date Preset Filter */}
              <div>
                <select
                  value={datePreset}
                  onChange={e => setDatePreset(e.target.value as any)}
                  style={inputSt}
                >
                  <option value="All Time">All Time Records</option>
                  <option value="Today">Today</option>
                  <option value="Yesterday">Yesterday</option>
                  <option value="This Week">This Week (Last 7 Days)</option>
                  <option value="This Month">This Month ({currentMonthStr})</option>
                  <option value="Last Month">Last Month ({previousMonthStr})</option>
                  <option value="This Year">This Year ({todayStr.slice(0, 4)})</option>
                  <option value="Custom">Custom Date Range</option>
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <select
                  value={filterPaymentMethod}
                  onChange={e => setFilterPaymentMethod(e.target.value)}
                  style={inputSt}
                >
                  <option value="All">All Payment Methods</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="bKash">bKash</option>
                  <option value="Nagad">Nagad</option>
                  <option value="Card">Card</option>
                </select>
              </div>

              {/* Explicit Month Filter (Optional) */}
              <div>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  style={inputSt}
                  title="Specific Month (YYYY-MM)"
                />
              </div>

              {/* If Custom Date Preset is selected, render start & end date inputs */}
              {datePreset === 'Custom' && (
                <div className="md:col-span-4 lg:col-span-5 flex flex-wrap items-center gap-3 p-3 bg-red-50/50 rounded-xl border border-red-100">
                  <span className="text-xs font-bold text-red-700">Custom Date Range:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">From:</span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={e => setCustomStartDate(e.target.value)}
                      style={{ ...inputSt, width: 'auto' }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">To:</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={e => setCustomEndDate(e.target.value)}
                      style={{ ...inputSt, width: 'auto' }}
                    />
                  </div>
                  {(customStartDate || customEndDate) && (
                    <button
                      onClick={() => { setCustomStartDate(''); setCustomEndDate(''); }}
                      className="text-xs font-bold text-red-600 hover:underline"
                    >
                      Clear Range
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Expenses List Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                    Itemized Expense Entries ({filtered.length})
                  </h3>
                  <p className="text-xs text-gray-500">
                    Filtered Period Total: <span className="font-bold text-red-600">{formatCurrency(filtered.reduce((s, e) => s + (e.amount || 0), 0))}</span>
                  </p>
                </div>
                {selectedMonth && (
                  <button
                    onClick={() => setSelectedMonth('')}
                    className="text-xs font-bold text-gray-500 hover:text-red-600 bg-gray-100 px-2.5 py-1 rounded-lg"
                  >
                    Clear Month Filter ({selectedMonth})
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Date & Time</th>
                      <th className="px-4 py-3">Invoice No.</th>
                      <th className="px-4 py-3">Section</th>
                      <th className="px-4 py-3">Category & Details</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {state.isInitialLoading ? (
                      Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={8} />)
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-gray-400">
                          <Receipt size={36} className="mx-auto mb-2 opacity-30" />
                          <p className="text-sm font-semibold">No expense records found matching filters</p>
                          <button
                            onClick={() => { setSearch(''); setFilterSection('All'); setDatePreset('All Time'); setSelectedMonth(''); }}
                            className="mt-2 text-xs font-bold text-red-600 hover:underline"
                          >
                            Reset All Filters
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filtered.map(exp => {
                        const secId = getExpenseSection(exp);
                        const secMeta = EXPENSE_SECTIONS.find(s => s.id === secId) || EXPENSE_SECTIONS[0];
                        const SecIcon = secMeta.icon;

                        return (
                          <tr key={exp.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="font-semibold text-gray-900 block">{exp.date}</span>
                              <span className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                                <Clock size={10} /> {exp.time || '12:00 PM'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700 font-mono text-[11px] font-bold">
                                #{exp.invoiceNo || exp.id.slice(-6)}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                                style={{ backgroundColor: secMeta.bg, color: secMeta.color, border: `1px solid ${secMeta.border}` }}
                              >
                                <SecIcon size={12} /> {secMeta.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-semibold text-gray-800 block">{exp.category}</span>
                              {exp.subcategory && (
                                <span className="text-[11px] text-gray-500 block">{exp.subcategory}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 max-w-xs">
                              <p className="text-gray-700 line-clamp-1">{exp.description || '—'}</p>
                              {exp.recordedBy && (
                                <span className="text-[10px] text-gray-400 block mt-0.5">By: {exp.recordedBy}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">
                                {exp.paymentMethod || 'Cash'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <span className="font-black text-sm text-red-600" style={{ fontFamily: 'var(--font-heading)' }}>
                                {formatCurrency(exp.amount)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handlePrint(exp)}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                                  title="Print Voucher A4"
                                >
                                  <Printer size={13} />
                                </button>
                                <button
                                  onClick={() => openEditForm(exp)}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                                  title="Edit Expense"
                                >
                                  <Edit2 size={13} />
                                </button>
                                {adminRole === 'admin' && (
                                  <button
                                    onClick={() => setDeleteConfirm({
                                      isOpen: true,
                                      title: 'Delete Expense Voucher?',
                                      message: `Are you sure you want to permanently delete expense voucher #${exp.invoiceNo || exp.id} of ${formatCurrency(exp.amount)}?`,
                                      onConfirm: () => {
                                        dispatch({ type: 'DELETE_EXPENSE', payload: exp.id });
                                        setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
                                      }
                                    })}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                                    title="Delete Expense"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
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
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: SECTION & TIME REPORTING & ANALYTICS                          */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Top Insight Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Highest Spending Section</span>
                <div className="flex items-center gap-3 mt-2">
                  <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                    <ChefHat size={20} />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                      {topSectionAllTime.section}
                    </h4>
                    <p className="text-xs text-red-600 font-bold">{formatCurrency(topSectionAllTime.total)} total spent</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Monthly Velocity</span>
                <div className="flex items-center gap-3 mt-2">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                    <BarChart3 size={20} />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                      {formatCurrency(thisMonthTotal)}
                    </h4>
                    <p className="text-xs text-gray-500 font-medium">In {currentMonthStr} so far</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Average Daily Spend</span>
                <div className="flex items-center gap-3 mt-2">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                      {formatCurrency(allTimeCount > 0 ? allTimeTotal / Math.max(1, expenses.length) : 0)}
                    </h4>
                    <p className="text-xs text-gray-500 font-medium">Per recorded voucher</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section Breakdown Grid */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                    All-Time Spending Distribution by Section
                  </h3>
                  <p className="text-xs text-gray-500">
                    Live breakdown of expenditure across all restaurant operational departments
                  </p>
                </div>
                <span className="text-xs font-bold text-gray-500">Total: {formatCurrency(allTimeTotal)}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {EXPENSE_SECTIONS.map(sec => {
                  const Icon = sec.icon;
                  const total = sectionTotalsAllTime[sec.id] || 0;
                  const pct = allTimeTotal > 0 ? (total / allTimeTotal) * 100 : 0;
                  const monthTotal = sectionTotalsThisMonth[sec.id] || 0;

                  return (
                    <div
                      key={sec.id}
                      className="p-4 rounded-2xl border transition-all hover:shadow-sm"
                      style={{ backgroundColor: '#FAFAFA', borderColor: '#F3F4F6' }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-8 h-8 rounded-xl flex items-center justify-center font-bold"
                            style={{ backgroundColor: sec.bg, color: sec.color }}
                          >
                            <Icon size={16} />
                          </span>
                          <div>
                            <span className="text-xs font-black text-gray-900 block" style={{ fontFamily: 'var(--font-heading)' }}>
                              {sec.label}
                            </span>
                            <span className="text-[10px] text-gray-400 block">{sec.desc}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-gray-900 block" style={{ fontFamily: 'var(--font-heading)' }}>
                            {formatCurrency(total)}
                          </span>
                          <span className="text-[11px] font-bold text-gray-500">{pct.toFixed(1)}%</span>
                        </div>
                      </div>

                      <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden mb-2">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: sec.color }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                        <button
                          type="button"
                          onClick={() => handleViewSectionEntries(sec.id, true)}
                          className="hover:underline text-left"
                          title="View this month's entries in ledger"
                        >
                          This Month: <strong className="text-gray-800">{formatCurrency(monthTotal)}</strong>
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setViewSectionModal(sec)}
                            className="px-2 py-0.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-colors"
                            title="Quick preview entries"
                          >
                            Quick View
                          </button>
                          <button
                            type="button"
                            onClick={() => handleViewSectionEntries(sec.id, false)}
                            className="font-bold text-red-600 hover:underline flex items-center gap-0.5"
                          >
                            View Entries ({total > 0 ? formatQty(expenses.filter(e => getExpenseSection(e) === sec.id).length) : 0}) →
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: MONTH-OVER-MONTH (MoM) COMPARISON                             */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'comparison' && (
          <div className="space-y-6">
            {/* Control Bar: Select 2 Months */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                  Month-over-Month (MoM) Expense Audit & Variance
                </h3>
                <p className="text-xs text-gray-500">
                  Compare two billing cycles section-by-section to detect cost increases, surges, or savings
                </p>
              </div>

              <div className="flex items-center flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-600">Base Month (B):</span>
                  <input
                    type="month"
                    value={compareMonthB}
                    onChange={e => setCompareMonthB(e.target.value)}
                    style={{ ...inputSt, width: 'auto' }}
                  />
                </div>
                <span className="text-gray-400 font-bold">vs</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-red-600">Target Month (A):</span>
                  <input
                    type="month"
                    value={compareMonthA}
                    onChange={e => setCompareMonthA(e.target.value)}
                    style={{ ...inputSt, width: 'auto', borderColor: '#FCA5A5' }}
                  />
                </div>
                <button
                  onClick={handleExportMoMPDF}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-all ml-auto"
                >
                  <Download size={13} /> Export Comparison PDF
                </button>
              </div>
            </div>

            {/* Overall Comparison Summary Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <span className="text-xs font-bold text-gray-400 block mb-1">Base Month ({compareMonthB})</span>
                <p className="text-2xl font-black text-gray-800" style={{ fontFamily: 'var(--font-heading)' }}>
                  {formatCurrency(comparisonData.totalB)}
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <span className="text-xs font-bold text-gray-400 block mb-1">Target Month ({compareMonthA})</span>
                <p className="text-2xl font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                  {formatCurrency(comparisonData.totalA)}
                </p>
              </div>

              <div
                className={`p-5 rounded-2xl border shadow-sm ${
                  comparisonData.diffTotal > 0
                    ? 'bg-red-50/70 border-red-200'
                    : comparisonData.diffTotal < 0
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-600">Net Variance</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black ${
                      comparisonData.diffTotal > 0
                        ? 'bg-red-600 text-white'
                        : comparisonData.diffTotal < 0
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-300 text-gray-700'
                    }`}
                  >
                    {comparisonData.diffTotal > 0 ? (
                      <>
                        <ArrowUpRight size={12} /> +{comparisonData.pctTotal.toFixed(1)}% Surge
                      </>
                    ) : comparisonData.diffTotal < 0 ? (
                      <>
                        <ArrowDownRight size={12} /> {comparisonData.pctTotal.toFixed(1)}% Saved
                      </>
                    ) : (
                      'No Change'
                    )}
                  </span>
                </div>
                <p
                  className={`text-2xl font-black ${
                    comparisonData.diffTotal > 0
                      ? 'text-red-600'
                      : comparisonData.diffTotal < 0
                      ? 'text-emerald-700'
                      : 'text-gray-700'
                  }`}
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {comparisonData.diffTotal >= 0 ? '+' : ''}{formatCurrency(comparisonData.diffTotal)}
                </p>
              </div>
            </div>

            {/* Section-by-Section Comparison Table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h4 className="text-sm font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                  Departmental Cost Comparison Table
                </h4>
                <span className="text-xs text-gray-400">
                  Comparing 10 operational sections
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                      <th className="px-5 py-3.5">Department / Section</th>
                      <th className="px-4 py-3.5 text-right">{compareMonthB} (Prev)</th>
                      <th className="px-4 py-3.5 text-right">{compareMonthA} (Curr)</th>
                      <th className="px-4 py-3.5 text-right">Difference (৳)</th>
                      <th className="px-4 py-3.5 text-right">Variance (%)</th>
                      <th className="px-6 py-3.5">Relative Visual Comparison</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {comparisonData.breakdown.map(b => {
                      const SecIcon = b.section.icon;
                      const maxVal = Math.max(1, Math.max(b.amountA, b.amountB));
                      const pctA = (b.amountA / maxVal) * 100;
                      const pctB = (b.amountB / maxVal) * 100;

                      return (
                        <tr key={b.section.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <span
                                className="w-7 h-7 rounded-lg flex items-center justify-center font-bold"
                                style={{ backgroundColor: b.section.bg, color: b.section.color }}
                              >
                                <SecIcon size={14} />
                              </span>
                              <div>
                                <span className="font-bold text-gray-900 block" style={{ fontFamily: 'var(--font-heading)' }}>
                                  {b.section.label}
                                </span>
                                <span className="text-[10px] text-gray-400 block">{b.section.desc}</span>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 text-right font-medium text-gray-700">
                            {formatCurrency(b.amountB)}
                            <span className="text-[10px] text-gray-400 block">{b.countB} vouchers</span>
                          </td>

                          <td className="px-4 py-3.5 text-right font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                            {formatCurrency(b.amountA)}
                            <span className="text-[10px] text-gray-400 block">{b.countA} vouchers</span>
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            <span
                              className={`font-black text-xs ${
                                b.diff > 0 ? 'text-red-600' : b.diff < 0 ? 'text-emerald-600' : 'text-gray-400'
                              }`}
                              style={{ fontFamily: 'var(--font-heading)' }}
                            >
                              {b.diff > 0 ? '+' : ''}{formatCurrency(b.diff)}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            <span
                              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-black ${
                                b.diff > 0
                                  ? 'bg-red-100 text-red-700'
                                  : b.diff < 0
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {b.diff > 0 ? '▲ +' : b.diff < 0 ? '▼ ' : ''}{b.pct.toFixed(1)}%
                            </span>
                          </td>

                          <td className="px-6 py-3.5">
                            <div className="space-y-1 w-48">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-gray-400 w-8">B:</span>
                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-gray-400 rounded-full" style={{ width: `${pctB}%` }} />
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-red-500 w-8">A:</span>
                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${pctA}%`,
                                      backgroundColor: b.diff > 0 ? PZ : '#059669',
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* TAB 4: CUSTOM DATE RANGE AUDIT                                       */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'custom-range' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="text-base font-black text-gray-900 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                Custom Date Range Financial Audit (e.g. Feb 1-15, Last 60 Days)
              </h3>
              <p className="text-xs text-gray-500 mb-5">
                Filter and extract exact financial reports for custom audit windows, partner reviews, or tax audits
              </p>

              {/* Fast Presets */}
              <div className="flex items-center flex-wrap gap-2 mb-4">
                <span className="text-xs font-bold text-gray-400 mr-1">Fast Presets:</span>
                {[
                  {
                    label: 'Last 15 Days',
                    getRange: () => {
                      const d = new Date();
                      const end = d.toLocaleDateString('en-CA');
                      d.setDate(d.getDate() - 15);
                      return { start: d.toLocaleDateString('en-CA'), end };
                    }
                  },
                  {
                    label: 'Last 30 Days',
                    getRange: () => {
                      const d = new Date();
                      const end = d.toLocaleDateString('en-CA');
                      d.setDate(d.getDate() - 30);
                      return { start: d.toLocaleDateString('en-CA'), end };
                    }
                  },
                  {
                    label: 'Last 60 Days (2 Months)',
                    getRange: () => {
                      const d = new Date();
                      const end = d.toLocaleDateString('en-CA');
                      d.setDate(d.getDate() - 60);
                      return { start: d.toLocaleDateString('en-CA'), end };
                    }
                  },
                  {
                    label: 'Last 90 Days (Quarter)',
                    getRange: () => {
                      const d = new Date();
                      const end = d.toLocaleDateString('en-CA');
                      d.setDate(d.getDate() - 90);
                      return { start: d.toLocaleDateString('en-CA'), end };
                    }
                  },
                ].map(p => (
                  <button
                    key={p.label}
                    onClick={() => {
                      const r = p.getRange();
                      setCustomStartDate(r.start);
                      setCustomEndDate(r.end);
                      setDatePreset('Custom');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 transition-all"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Date Inputs */}
              <div className="flex flex-wrap items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-200/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-600">Start Date:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={e => { setCustomStartDate(e.target.value); setDatePreset('Custom'); }}
                    style={{ ...inputSt, width: 'auto' }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-600">End Date:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={e => { setCustomEndDate(e.target.value); setDatePreset('Custom'); }}
                    style={{ ...inputSt, width: 'auto' }}
                  />
                </div>
                <button
                  onClick={() => {
                    setDatePreset('Custom');
                    setActiveTab('ledger');
                  }}
                  className="px-4 py-2 rounded-xl text-white text-xs font-bold shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${PZ}, ${PZD})` }}
                >
                  Apply & View in Ledger
                </button>
                <button
                  onClick={handleExportLedgerPDF}
                  className="px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-all"
                >
                  Export Custom Range PDF
                </button>
              </div>
            </div>

            {/* Quick Result Summary for Custom Range */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <span className="text-xs font-bold text-gray-400 block mb-1">Selected Range Total</span>
                <p className="text-2xl font-black text-red-600" style={{ fontFamily: 'var(--font-heading)' }}>
                  {formatCurrency(filtered.reduce((s, e) => s + (e.amount || 0), 0))}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {customStartDate || 'Inception'} → {customEndDate || 'Present'}
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <span className="text-xs font-bold text-gray-400 block mb-1">Matching Entries</span>
                <p className="text-2xl font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                  {filtered.length} Vouchers
                </p>
                <p className="text-xs text-gray-500 mt-1">Filtered from total records</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <span className="text-xs font-bold text-gray-400 block mb-1">Average per Voucher</span>
                <p className="text-2xl font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                  {formatCurrency(filtered.length > 0 ? filtered.reduce((s, e) => s + (e.amount || 0), 0) / filtered.length : 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">For selected date span</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── SECTION DETAIL QUICK PREVIEW MODAL ─────────────────────────────── */}
      {viewSectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl shadow-2xl bg-white border border-gray-100 overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <span
                  className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold"
                  style={{ backgroundColor: viewSectionModal.bg, color: viewSectionModal.color }}
                >
                  <viewSectionModal.icon size={20} />
                </span>
                <div>
                  <h3 className="text-base font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                    {viewSectionModal.label} — Expense Vouchers
                  </h3>
                  <p className="text-xs text-gray-500">
                    {expenses.filter(e => getExpenseSection(e) === viewSectionModal.id).length} recorded vouchers • Total: {formatCurrency(expenses.filter(e => getExpenseSection(e) === viewSectionModal.id).reduce((s, e) => s + (e.amount || 0), 0))}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewSectionModal(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {expenses.filter(e => getExpenseSection(e) === viewSectionModal.id).length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Receipt size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-semibold">No vouchers recorded under this department yet</p>
                  <button
                    type="button"
                    onClick={() => { setViewSectionModal(null); openAddForm(viewSectionModal.id); }}
                    className="mt-3 text-xs font-bold px-4 py-2 rounded-xl text-white shadow-sm inline-flex items-center gap-1.5"
                    style={{ background: `linear-gradient(135deg, ${PZ}, ${PZD})` }}
                  >
                    <Plus size={13} /> Add {viewSectionModal.label} Expense
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        <th className="px-3 py-2.5">Date & Time</th>
                        <th className="px-3 py-2.5">Invoice #</th>
                        <th className="px-3 py-2.5">Category</th>
                        <th className="px-3 py-2.5">Description</th>
                        <th className="px-3 py-2.5">Method</th>
                        <th className="px-3 py-2.5 text-right">Amount</th>
                        <th className="px-3 py-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {expenses
                        .filter(e => getExpenseSection(e) === viewSectionModal.id)
                        .map(exp => (
                          <tr key={exp.id} className="hover:bg-gray-50/80">
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <span className="font-semibold text-gray-900 block">{exp.date}</span>
                              <span className="text-[10px] text-gray-400">{exp.time || '12:00 PM'}</span>
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[10px] font-bold text-gray-700">
                              #{exp.invoiceNo || exp.id.slice(-6)}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="font-semibold text-gray-800 block">{exp.category}</span>
                              <span className="text-[10px] text-gray-500">{exp.subcategory}</span>
                            </td>
                            <td className="px-3 py-2.5 text-gray-700 max-w-xs truncate">
                              {exp.description || '—'}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-700 font-medium">
                                {exp.paymentMethod || 'Cash'}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right font-black text-red-600 whitespace-nowrap">
                              {formatCurrency(exp.amount)}
                            </td>
                            <td className="px-3 py-2.5 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => { setViewSectionModal(null); handlePrint(exp); }}
                                className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600"
                                title="Print Voucher"
                              >
                                <Printer size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between">
              <button
                type="button"
                onClick={() => { setViewSectionModal(null); openAddForm(viewSectionModal.id); }}
                className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1"
              >
                <Plus size={13} /> Add New Entry in {viewSectionModal.label}
              </button>
              <button
                type="button"
                onClick={() => {
                  const secId = viewSectionModal.id;
                  setViewSectionModal(null);
                  handleViewSectionEntries(secId, false);
                }}
                className="px-4 py-2 rounded-xl text-white text-xs font-bold shadow-sm"
                style={{ background: `linear-gradient(135deg, ${PZ}, ${PZD})` }}
              >
                Open in Full Ledger →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ADD / EDIT EXPENSE MODAL                                              */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl shadow-2xl bg-white border border-gray-100 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: `linear-gradient(135deg, ${PZ}, ${PZD})` }}>
                  <DollarSign size={18} />
                </span>
                <div>
                  <h2 className="text-base font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                    {editing ? 'Edit Expense Record' : 'Record New Expense'}
                  </h2>
                  <p className="text-xs text-gray-500">
                    Assign operational section, category, payment method & audit details
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowForm(false); setEditing(null); }}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* 1. Section Selector (Visual Cards) */}
              <div>
                <label style={labelSt}>Operational Section / Department *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {EXPENSE_SECTIONS.map(s => {
                    const isSel = formSection === s.id;
                    const Icon = s.icon;
                    return (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => {
                          setFormSection(s.id);
                          const cats = SECTION_CATEGORIES[s.id] || {};
                          const firstCat = Object.keys(cats)[0] || 'General';
                          const firstSub = (cats[firstCat] && cats[firstCat][0]) || 'General Expense';
                          setFormCategory(firstCat);
                          setFormSubcategory(firstSub);
                        }}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-center ${
                          isSel
                            ? 'ring-2 ring-red-500 shadow-sm'
                            : 'hover:bg-gray-50'
                        }`}
                        style={{
                          backgroundColor: isSel ? s.bg : '#fff',
                          borderColor: isSel ? s.color : '#E5E7EB',
                        }}
                      >
                        <span
                          className="w-7 h-7 rounded-lg flex items-center justify-center mb-1 font-bold"
                          style={{ backgroundColor: isSel ? '#fff' : s.bg, color: s.color }}
                        >
                          <Icon size={14} />
                        </span>
                        <span className="text-[11px] font-bold text-gray-900 block" style={{ fontFamily: 'var(--font-heading)' }}>
                          {s.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Category & Subcategory */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label style={labelSt}>Category</label>
                  <select
                    value={formCategory}
                    onChange={e => {
                      setFormCategory(e.target.value);
                      const subList = (SECTION_CATEGORIES[formSection] || {})[e.target.value] || [];
                      setFormSubcategory(subList[0] || 'General');
                    }}
                    style={inputSt}
                  >
                    {Object.keys(SECTION_CATEGORIES[formSection] || { 'General': [] }).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelSt}>Sub-Category / Item</label>
                  <select
                    value={formSubcategory}
                    onChange={e => setFormSubcategory(e.target.value)}
                    style={inputSt}
                  >
                    {((SECTION_CATEGORIES[formSection] || {})[formCategory] || []).map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                    <option value="Other Specific Item">Other Specific Item</option>
                  </select>
                </div>
              </div>

              {/* 3. Amount & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label style={labelSt}>Amount (৳) *</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={formAmount || ''}
                    onChange={e => setFormAmount(Number(e.target.value))}
                    placeholder="0.00"
                    style={{ ...inputSt, fontWeight: 700, fontSize: '15px', color: PZ }}
                  />
                </div>

                <div>
                  <label style={labelSt}>Date *</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    style={inputSt}
                  />
                </div>

                <div>
                  <label style={labelSt}>Time *</label>
                  <input
                    type="text"
                    value={formTime}
                    onChange={e => setFormTime(e.target.value)}
                    placeholder="02:30 PM"
                    style={inputSt}
                  />
                </div>
              </div>

              {/* 4. Payment Method & Invoice No */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label style={labelSt}>Payment Method</label>
                  <select
                    value={formPaymentMethod}
                    onChange={e => setFormPaymentMethod(e.target.value)}
                    style={inputSt}
                  >
                    <option value="Cash">Cash (Cash Register)</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="bKash">bKash Merchant/Personal</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Card">Credit/Debit Card</option>
                  </select>
                </div>

                <div>
                  <label style={labelSt}>Invoice / Voucher No.</label>
                  <input
                    type="text"
                    value={formInvoiceNo}
                    onChange={e => setFormInvoiceNo(e.target.value)}
                    placeholder="Auto-generated"
                    style={inputSt}
                  />
                </div>

                <div>
                  <label style={labelSt}>Recorded By</label>
                  <input
                    type="text"
                    value={formRecordedBy}
                    onChange={e => setFormRecordedBy(e.target.value)}
                    placeholder="Admin / Staff Name"
                    style={inputSt}
                  />
                </div>
              </div>

              {/* 5. Description */}
              <div>
                <label style={labelSt}>Description / Purpose *</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Detailed notes of expenditure, supplier details, receipt reference..."
                  style={{ ...inputSt, resize: 'none' }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditing(null); }}
                className="px-5 py-2.5 rounded-2xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-100 transition-colors"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={formAmount <= 0}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl text-white text-xs font-bold shadow-md shadow-red-500/20 disabled:opacity-50 active:scale-95 transition-all"
                style={{ background: `linear-gradient(135deg, ${PZ}, ${PZD})`, fontFamily: 'var(--font-heading)' }}
              >
                <Save size={14} /> {editing ? 'Update Expense' : 'Save Expense Voucher'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PRINT ONLY: LUXURY EXPENSE VOUCHER A4 ────────────────────────────── */}
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
                  Date: <strong>{new Date(printExpense.date).toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' })}</strong> {printExpense.time ? `(${printExpense.time})` : ''}
                </div>
              </div>
            </div>

            {/* Department / Category Info Grid */}
            <div style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '10px 16px', marginBottom: '8mm' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '9px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Department / Section</div>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: '#E31837' }}>{getExpenseSection(printExpense)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '9px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Category</div>
                  <div style={{ fontWeight: '700', fontSize: '13px' }}>{printExpense.category}</div>
                </div>
                <div>
                  <div style={{ fontSize: '9px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Sub-Category</div>
                  <div style={{ fontWeight: '700', fontSize: '13px' }}>{printExpense.subcategory || 'General'}</div>
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
                  <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description / Purpose</th>
                  <th style={{ padding: '8px 14px', textAlign: 'right', width: '25%', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '14px', fontSize: '13px' }}>
                    {printExpense.description || `${printExpense.category} — ${printExpense.subcategory}`}
                  </td>
                  <td style={{ padding: '14px', textAlign: 'right', fontSize: '13px', fontWeight: '700' }}>
                    ৳ {Math.round(printExpense.amount).toLocaleString()}
                  </td>
                </tr>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6B7280' }}>
                    Total Expense Disbursed
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '13px', fontWeight: '700' }}>
                    ৳ {Math.round(printExpense.amount).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Total Box */}
            <div style={{ backgroundColor: '#E31837', color: '#fff', padding: '14px 20px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12mm' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Net Amount Disbursed
              </div>
              <div style={{ fontSize: '26px', fontWeight: '900', letterSpacing: '1px' }}>
                ৳ {Math.round(printExpense.amount).toLocaleString()}
              </div>
            </div>

            {/* Signature Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20mm' }}>
              <div style={{ width: '180px', textAlign: 'center' }}>
                <div style={{ borderBottom: '1.5px solid #000', marginBottom: '6px', height: '35px' }}></div>
                <div style={{ fontSize: '11px', fontWeight: '700' }}>Prepared By</div>
                <div style={{ fontSize: '10px', color: '#666' }}>{printExpense.recordedBy || 'Accounts Team'}</div>
              </div>
              <div style={{ width: '180px', textAlign: 'center' }}>
                <div style={{ borderBottom: '1.5px solid #000', marginBottom: '6px', height: '35px' }}></div>
                <div style={{ fontSize: '11px', fontWeight: '700' }}>Authorized Signatory</div>
                <div style={{ fontSize: '10px', color: '#666' }}>Executive Management</div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ marginTop: 'auto', paddingTop: '5mm', borderTop: '1px solid #E5E7EB', textAlign: 'center', position: 'absolute', bottom: '15mm', left: '20mm', right: '20mm' }}>
              <div style={{ fontSize: '9px', color: '#9CA3AF' }}>
                Official Expense Voucher • Pizzora Restaurant • Sylhet, Bangladesh • Generated on {new Date().toLocaleDateString('en-GB')}
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

      {/* Confirm Modal */}
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
