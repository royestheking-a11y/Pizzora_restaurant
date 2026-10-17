import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, Save, X, AlertTriangle, Package,
  TrendingDown, TrendingUp, Search, ChevronDown, BarChart3, Download,
  Scale, History, Calendar, DollarSign, CheckCircle2, AlertCircle,
  ArrowRight, Clock, FileText, Layers, ShoppingBag, Filter, RefreshCw,
  Check, ArrowUpRight, ArrowDownRight, ShieldCheck, Tag, MinusCircle,
  Sparkles, ChefHat, Zap, Flame, Building2, ShoppingCart, Receipt, CalendarDays
} from 'lucide-react';
import { useApp, InventoryItem, StockMovement } from '../../context/AppContext';
import { generatePremiumPDF, generateDailyBazarSlipPDF } from '../../utils/pdfGenerator';
import { TableRowSkeleton } from '../Skeletons';
import { ConfirmModal } from '../ConfirmModal';

export interface InventoryCategoryMeta {
  id: string;
  label: string;
  name?: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  color: string;
  bg: string;
  border: string;
  desc: string;
  description?: string;
  badge?: string;
}

export const INVENTORY_CATEGORIES: InventoryCategoryMeta[] = [
  { id: 'Raw Materials & Ingredients', label: 'Raw Materials & Ingredients', icon: ChefHat, color: '#EA580C', bg: '#FFEDD5', border: '#FDBA74', desc: 'Flour, mozzarella cheese, chicken, beef, dough, tomato sauce, seasonings & toppings' },
  { id: 'Packaging & Boxes', label: 'Packaging & Boxes', icon: Package, color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5', desc: '10" & 12" pizza boxes, burger boxes, food wrapping foil, sauce cups & takeout carry bags' },
  { id: 'Beverages & Retail', label: 'Beverages & Retail', icon: ShoppingBag, color: '#2563EB', bg: '#DBEAFE', border: '#93C5FD', desc: 'Kinley 500ml water bottles, Coca-Cola cans, soft drinks, juices & coffee syrups' },
  { id: 'Kitchen Supplies', label: 'Kitchen Supplies', icon: Flame, color: '#D97706', bg: '#FEF3C7', border: '#FCD34D', desc: 'Commercial LPG gas cylinders, cooking oil, baking pans, pizza screens & chef knives' },
  { id: 'Cleaning & Sanitation', label: 'Cleaning & Sanitation', icon: Sparkles, color: '#059669', bg: '#D1FAE5', border: '#6EE7B7', desc: 'Dishwashing gel, heavy floor cleaner, hand sanitizers, degreasers & trash bags' },
  { id: 'Utility Consumables', label: 'Utility Consumables', icon: Zap, color: '#7C3AED', bg: '#EDE9FE', border: '#C4B5FD', desc: 'Generator diesel fuel, 80mm thermal receipt paper rolls, tissues & napkins' },
  { id: 'Fixed Assets', label: 'Fixed Assets', icon: Building2, color: '#4B5563', bg: '#F3F4F6', border: '#D1D5DB', desc: 'Conveyor pizza oven, commercial chillers, spiral dough mixers & POS hardware' },
];

const CATEGORIES = INVENTORY_CATEGORIES.map(c => c.id);

const UNITS = ['Bottle', 'Piece', 'Box', 'Packet', 'Can', 'Cup', 'Bag', 'Kg', 'Gram', 'Liter', 'ml', 'Dozen', 'Roll', 'Portion', 'Set'];
const PZ = '#F9002B';
const PZD = '#C8001F';

// Number formatting helpers to prevent float precision leaks (e.g., 6773.53117300000)
const formatQty = (n: number | undefined): string => {
  if (n === undefined || isNaN(n) || n === 0) return '0';
  if (Math.abs(n - Math.round(n)) < 0.001) {
    return Math.round(n).toLocaleString();
  }
  return Number(n.toFixed(2)).toLocaleString();
};

const formatCurrency = (n: number | undefined): string => {
  if (n === undefined || isNaN(n) || n === 0) return '৳0';
  return `৳${Math.round(n).toLocaleString()}`;
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
  marginBottom: '5px',
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  fontFamily: 'var(--font-heading)',
};

export function InventoryManagement() {
  const { state, dispatch } = useApp();
  const { inventory: items, stockMovements: movements } = state;
  const [tab, setTab] = useState<'stock' | 'daily-bazar' | 'analytics' | 'comparison' | 'custom-range' | 'report' | 'history' | 'reconciliation' | 'alerts'>('stock');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<'All Time' | 'This Month' | 'Last Month' | 'Today' | 'Yesterday' | 'Last 7 Days' | 'Custom'>('All Time');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(''); // format: YYYY-MM

  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString('en-CA');
  }, []);
  const currentMonthStr = useMemo(() => todayStr.slice(0, 7), [todayStr]);
  const previousMonthStr = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toLocaleDateString('en-CA').slice(0, 7);
  }, []);

  // Daily Bazar View & Entry States
  const [bazarDateFilter, setBazarDateFilter] = useState<'today' | 'yesterday' | 'older' | 'all'>('today');
  const [bazarCustomDate, setBazarCustomDate] = useState<string>('');
  const [bazarSearch, setBazarSearch] = useState<string>('');
  const [showBazarModal, setShowBazarModal] = useState<boolean>(false);
  const [bazarForm, setBazarForm] = useState({
    date: new Date().toLocaleDateString('en-CA'),
    itemId: '',
    isNewItem: true,
    name: '',
    category: 'Raw Materials & Ingredients',
    unit: 'Kg',
    quantity: '' as number | string,
    unitPrice: '' as number | string,
    totalCost: '' as number | string,
    sellingPrice: '' as number | string,
    supplier: '',
    note: ''
  });

  const [compareMonthA, setCompareMonthA] = useState<string>(currentMonthStr);
  const [compareMonthB, setCompareMonthB] = useState<string>(previousMonthStr);
  const [viewCategoryModal, setViewCategoryModal] = useState<InventoryCategoryMeta | null>(null);

  const handleViewCategoryItems = (catId: string) => {
    setSelectedCategory(catId);
    setSearch('');
    setDateFilter('All Time');
    setSelectedMonth('');
    setTab('stock');
  };

  // Movement history tab filters
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('All');
  const [movementItemFilter, setMovementItemFilter] = useState<string>('All');

  const adminRole = sessionStorage.getItem('pizzora_admin_role') || 'manager';

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);

  // Quick Restock / Stock In Modal
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [stockInForm, setStockInForm] = useState({
    itemId: '',
    date: new Date().toLocaleDateString('en-CA'),
    quantity: '',
    purchasePrice: '',
    supplier: '',
    note: ''
  });

  // Manual Stock Out / Kitchen Usage Modal
  const [showStockOutModal, setShowStockOutModal] = useState(false);
  const [stockOutForm, setStockOutForm] = useState({
    itemId: '',
    date: new Date().toLocaleDateString('en-CA'),
    quantity: '',
    reason: 'Kitchen Usage',
    note: ''
  });

  // Product Full History Modal
  const [historyModalItem, setHistoryModalItem] = useState<InventoryItem | null>(null);

  // Reconciliation state
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, number>>({});
  const [reconcileReasons, setReconcileReasons] = useState<Record<string, string>>({});
  const [reconcileCustomNotes, setReconcileCustomNotes] = useState<Record<string, string>>({});
  const [reconcileConfirm, setReconcileConfirm] = useState<{
    isOpen: boolean;
    item: InventoryItem | null;
    systemStock: number;
    physicalStock: number;
    difference: number;
    reason: string;
    valueDiff: number;
  }>({
    isOpen: false,
    item: null,
    systemStock: 0,
    physicalStock: 0,
    difference: 0,
    reason: '',
    valueDiff: 0
  });

  // Delete Confirm Modal
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // ─── Daily Bazar Calculations ────────────────────────────────────
  const allBazarMovements = useMemo(() => {
    return movements
      .filter(m => m.type === 'Daily Bazar' || m.type === 'Purchase IN' || m.type === 'Initial Stock')
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.id || '').localeCompare(a.id || ''));
  }, [movements]);

  const todayBazarMovements = useMemo(() => {
    return allBazarMovements.filter(m => m.date === todayStr);
  }, [allBazarMovements, todayStr]);

  const yesterdayBazarMovements = useMemo(() => {
    return allBazarMovements.filter(m => m.date === yesterdayStr);
  }, [allBazarMovements, yesterdayStr]);

  const olderBazarMovements = useMemo(() => {
    return allBazarMovements.filter(m => m.date !== todayStr && m.date !== yesterdayStr);
  }, [allBazarMovements, todayStr, yesterdayStr]);

  const activeBazarList = useMemo(() => {
    let list = allBazarMovements;
    if (bazarDateFilter === 'today') list = todayBazarMovements;
    else if (bazarDateFilter === 'yesterday') list = yesterdayBazarMovements;
    else if (bazarDateFilter === 'older') list = olderBazarMovements;

    if (bazarCustomDate) {
      list = allBazarMovements.filter(m => m.date === bazarCustomDate);
    }
    if (bazarSearch.trim()) {
      const q = bazarSearch.trim().toLowerCase();
      list = list.filter(m => (m.itemName || '').toLowerCase().includes(q) || (m.supplier || '').toLowerCase().includes(q) || (m.note || '').toLowerCase().includes(q));
    }
    return list;
  }, [bazarDateFilter, todayBazarMovements, yesterdayBazarMovements, olderBazarMovements, allBazarMovements, bazarCustomDate, bazarSearch]);

  const todayBazarTotalCost = useMemo(() => {
    return todayBazarMovements.reduce((sum, m) => sum + (m.totalCost || ((Number(m.quantity) || 0) * (Number(m.unitPrice) || 0))), 0);
  }, [todayBazarMovements]);

  const todayBazarTotalUnits = useMemo(() => {
    return todayBazarMovements.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);
  }, [todayBazarMovements]);

  const yesterdayBazarTotalCost = useMemo(() => {
    return yesterdayBazarMovements.reduce((sum, m) => sum + (m.totalCost || ((Number(m.quantity) || 0) * (Number(m.unitPrice) || 0))), 0);
  }, [yesterdayBazarMovements]);

  const activeBazarTotalCost = useMemo(() => {
    return activeBazarList.reduce((sum, m) => sum + (m.totalCost || ((Number(m.quantity) || 0) * (Number(m.unitPrice) || 0))), 0);
  }, [activeBazarList]);

  const allBazarTotalCost = useMemo(() => {
    return allBazarMovements.reduce((sum, m) => sum + (m.totalCost || ((Number(m.quantity) || 0) * (Number(m.unitPrice) || 0))), 0);
  }, [allBazarMovements]);

  // Today's Usage
  const todayUsageMovements = useMemo(() => {
    return movements.filter(m => (m.type === 'Sale OUT' || m.type.includes('OUT') || m.type === 'Kitchen Usage') && m.date === todayStr);
  }, [movements, todayStr]);

  const todayUsageTotalUnits = useMemo(() => {
    return todayUsageMovements.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);
  }, [todayUsageMovements]);

  const formatBazarDate = (dateStr: string) => {
    if (!dateStr) return '';
    if (dateStr === todayStr) return 'Today';
    if (dateStr === yesterdayStr) return 'Yesterday';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Initial Item Form
  const blankForm = () => ({
    id: '',
    name: '',
    sku: '',
    category: 'Raw Materials & Ingredients',
    unit: 'Bottle',
    supplier: '',
    costPrice: 0, // Purchase Price
    sellingPrice: 0, // Selling / Retail Price
    initialStock: 0, // Stock on hand
    newPurchasedQty: 0,
    currentStock: 0,
    minStock: 10,
    maxStock: 100,
    addedDate: new Date().toLocaleDateString('en-CA'),
    menuItemId: '',
  });
  const [form, setForm] = useState(blankForm());

  // Custom Categories State (persisted locally and merged with existing inventory)
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('pizzora_custom_inv_categories');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [skuManuallyEdited, setSkuManuallyEdited] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('pizzora_custom_inv_categories', JSON.stringify(customCategories));
    } catch {}
  }, [customCategories]);

  const allCategories = useMemo(() => {
    const set = new Set(CATEGORIES);
    items.forEach(i => { if (i.category) set.add(i.category); });
    customCategories.forEach(c => set.add(c));
    return Array.from(set);
  }, [items, customCategories]);

  // Intelligent SKU Auto-Generator
  const generateSkuFromName = (name: string, category: string): string => {
    if (!name.trim()) return '';
    const clean = name.trim().replace(/[^a-zA-Z0-9\s]/g, '');
    const words = clean.split(/\s+/).filter(Boolean);
    let code = '';
    if (words.length >= 2) {
      code = (words[0].slice(0, 2) + words[1].slice(0, 2)).toUpperCase();
    } else if (words.length === 1) {
      code = words[0].slice(0, 3).toUpperCase();
    }
    if (code.length < 3) {
      code = (code + 'INV').slice(0, 3);
    }
    const prefix = code.slice(0, 3);
    const existingCount = items.filter(i => (i.sku || '').toUpperCase().startsWith(prefix)).length;
    return `${prefix}-${String(existingCount + 1).padStart(3, '0')}`;
  };

  // Date Boundaries Calculation
  const getFilterDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toLocaleDateString('en-CA');
  };
  const todayDate = getFilterDate(0);
  const yesterdayDate = getFilterDate(1);
  const sevenDaysAgo = getFilterDate(7);
  const now = new Date();
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA');
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString('en-CA');
  const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toLocaleDateString('en-CA');

  const isDateInRange = (dateStr?: string) => {
    if (!dateStr) return false;
    const cleanDate = dateStr.slice(0, 10);

    if (selectedMonth) {
      return cleanDate.startsWith(selectedMonth);
    }

    if (dateFilter === 'All Time') return true;
    if (dateFilter === 'Today') return cleanDate === todayDate;
    if (dateFilter === 'Yesterday') return cleanDate === yesterdayDate;
    if (dateFilter === 'Last 7 Days') return cleanDate >= sevenDaysAgo && cleanDate <= todayDate;
    if (dateFilter === 'This Month') return cleanDate >= firstOfThisMonth && cleanDate <= todayDate;
    if (dateFilter === 'Last Month') return cleanDate >= firstOfLastMonth && cleanDate <= lastOfLastMonth;
    if (dateFilter === 'Custom') {
      if (customStartDate && customEndDate) return cleanDate >= customStartDate && cleanDate <= customEndDate;
      if (customStartDate) return cleanDate >= customStartDate;
      if (customEndDate) return cleanDate <= customEndDate;
    }
    return true;
  };

  // Save or edit item
  const handleSave = () => {
    if (!form.name.trim() || !form.sku.trim()) return;

    const unitPrice = Number(form.costPrice) || 0;
    const retailPrice = Number(form.sellingPrice) || 0;
    const stockQty = Number(form.initialStock) || 0;
    const entryDate = form.addedDate || new Date().toLocaleDateString('en-CA');

    if (editing) {
      const updatedItem: InventoryItem = {
        ...editing,
        name: form.name.trim(),
        sku: form.sku.trim().toUpperCase(),
        category: form.category,
        unit: form.unit,
        supplier: form.supplier.trim(),
        costPrice: unitPrice,
        sellingPrice: retailPrice,
        minStock: Number(form.minStock) || 0,
        maxStock: Number(form.maxStock) || 100,
        addedDate: form.addedDate || editing.addedDate,
        menuItemId: form.menuItemId || undefined,
        currentStock: stockQty, // Allow updating stock directly if adjusted
      };
      dispatch({ type: 'UPDATE_INVENTORY_ITEM', payload: updatedItem });
    } else {
      const newItemId = `inv-${Date.now()}`;

      const newItem: InventoryItem = {
        id: newItemId,
        name: form.name.trim(),
        sku: form.sku.trim().toUpperCase(),
        category: form.category,
        unit: form.unit,
        supplier: form.supplier.trim(),
        costPrice: unitPrice,
        sellingPrice: retailPrice,
        initialStock: stockQty,
        currentStock: stockQty,
        minStock: Number(form.minStock) || 0,
        maxStock: Number(form.maxStock) || 100,
        addedDate: entryDate,
        lastPurchasePrice: unitPrice,
        lastPurchasedDate: entryDate,
        lastPurchasedQty: stockQty,
        menuItemId: form.menuItemId || undefined,
      };

      dispatch({ type: 'ADD_INVENTORY_ITEM', payload: newItem });

      // Clean single initial stock movement
      if (stockQty > 0) {
        dispatch({
          type: 'ADD_STOCK_MOVEMENT',
          payload: {
            id: `mv-${Date.now()}-init`,
            itemId: newItemId,
            itemName: newItem.name,
            type: 'Initial Stock',
            quantity: stockQty,
            unitPrice: unitPrice,
            totalCost: stockQty * unitPrice,
            date: entryDate,
            note: 'Initial Stock on Hand'
          }
        });
      }
    }

    setShowForm(false);
    setEditing(null);
    setForm(blankForm());
    setSkuManuallyEdited(false);
    setShowAddCategoryInput(false);
  };

  const handleDelete = (id: string) => dispatch({ type: 'DELETE_INVENTORY_ITEM', payload: id });

  // ─── Daily Bazar Handlers ─────────────────────────────────────────
  const handleSaveBazarEntry = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const qty = Number(bazarForm.quantity) || 0;
    if (qty <= 0) {
      alert('Please enter a valid purchased quantity');
      return;
    }
    const unitP = Number(bazarForm.unitPrice) || 0;
    const totalC = Number(bazarForm.totalCost) || (qty * unitP);
    const retailP = Number(bazarForm.sellingPrice) || 0;
    const entryDate = bazarForm.date || todayStr;

    let targetItem = items.find(i => i.id === bazarForm.itemId);
    if (!targetItem && bazarForm.name.trim()) {
      targetItem = items.find(i => i.name.toLowerCase() === bazarForm.name.trim().toLowerCase());
    }

    let savedItemId = '';
    let savedItemName = '';
    let savedCategory = bazarForm.category;
    let savedUnit = bazarForm.unit;
    let newStock = qty;

    if (targetItem) {
      // 1. Existing Product - UPDATE IT, NEVER DUPLICATE!
      savedItemId = targetItem.id;
      savedItemName = targetItem.name;
      savedCategory = targetItem.category;
      savedUnit = targetItem.unit;
      newStock = (targetItem.currentStock || 0) + qty;

      const updatedItem: InventoryItem = {
        ...targetItem,
        currentStock: newStock,
        costPrice: unitP > 0 ? unitP : targetItem.costPrice,
        sellingPrice: retailP > 0 ? retailP : targetItem.sellingPrice,
        lastPurchasePrice: unitP > 0 ? unitP : targetItem.costPrice,
        lastPurchasedDate: entryDate,
        lastPurchasedQty: qty,
        supplier: bazarForm.supplier.trim() || targetItem.supplier,
      };
      dispatch({ type: 'UPDATE_INVENTORY_ITEM', payload: updatedItem });
    } else {
      // 2. New Product - Create in Master Catalog with auto SKU
      if (!bazarForm.name.trim()) {
        alert('Please enter a product / item name');
        return;
      }
      savedItemId = `inv-${Date.now()}`;
      savedItemName = bazarForm.name.trim();
      const autoSku = generateSkuFromName(savedItemName, bazarForm.category);

      const newItem: InventoryItem = {
        id: savedItemId,
        name: savedItemName,
        sku: autoSku,
        category: bazarForm.category,
        unit: bazarForm.unit,
        supplier: bazarForm.supplier.trim(),
        costPrice: unitP,
        sellingPrice: retailP,
        initialStock: qty,
        currentStock: qty,
        minStock: 10,
        maxStock: 100,
        addedDate: entryDate,
        lastPurchasePrice: unitP,
        lastPurchasedDate: entryDate,
        lastPurchasedQty: qty,
      };
      dispatch({ type: 'ADD_INVENTORY_ITEM', payload: newItem });
    }

    // 3. Log the Daily Bazar Stock Movement
    const movement: StockMovement = {
      id: `mv-bazar-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      itemId: savedItemId,
      itemName: savedItemName,
      category: savedCategory,
      unit: savedUnit,
      type: 'Daily Bazar',
      quantity: qty,
      unitPrice: unitP,
      totalCost: totalC,
      date: entryDate,
      supplier: bazarForm.supplier.trim() || targetItem?.supplier || 'Local Market',
      stockAfter: newStock,
      note: bazarForm.note.trim() || `Daily Bazar purchase: +${qty} ${savedUnit}`,
      performedBy: adminRole || 'Admin',
    };
    dispatch({ type: 'ADD_STOCK_MOVEMENT', payload: movement });

    setShowBazarModal(false);
    setBazarForm({
      date: todayStr,
      itemId: '',
      isNewItem: false,
      name: '',
      category: 'Raw Materials & Ingredients',
      unit: 'Kg',
      quantity: '',
      unitPrice: '',
      totalCost: '',
      sellingPrice: '',
      supplier: '',
      note: ''
    });
  };

  // Delete / Undo a Bazar Entry
  const handleDeleteBazarMovement = (movement: StockMovement) => {
    setDeleteConfirm({
      isOpen: true,
      title: 'Delete Bazar Entry?',
      message: `Are you sure you want to remove the purchase entry for "${movement.itemName}" (${movement.quantity} ${movement.unit || 'units'} on ${movement.date})? This will also revert store stock by ${movement.quantity} units.`,
      onConfirm: () => {
        const target = items.find(i => i.id === movement.itemId);
        if (target) {
          const revertedStock = Math.max(0, (target.currentStock || 0) - (movement.quantity || 0));
          dispatch({
            type: 'UPDATE_INVENTORY_ITEM',
            payload: { ...target, currentStock: revertedStock }
          });
        }
        dispatch({ type: 'DELETE_STOCK_MOVEMENT', payload: movement.id });
        setDeleteConfirm({ isOpen: false, title: '', message: '', onConfirm: () => {} });
      }
    });
  };

  // Download Daily Bazar Slip PDF
  const handleDownloadBazarSlip = (targetDate: string = todayStr, customList?: StockMovement[]) => {
    const listToExport = customList || allBazarMovements.filter(m => m.date === targetDate);
    if (listToExport.length === 0) {
      alert(`No bazar items recorded for ${targetDate}`);
      return;
    }

    const itemsData = listToExport.map((m, index) => {
      const liveItem = items.find(i => i.id === m.itemId || (i.name && m.itemName && i.name.toLowerCase() === m.itemName.toLowerCase()));
      const totalCostNum = m.totalCost || ((Number(m.quantity) || 0) * (Number(m.unitPrice) || 0));
      const unitPriceNum = m.unitPrice || (m.quantity ? Math.round(totalCostNum / m.quantity) : 0);
      return {
        sl: index + 1,
        name: m.itemName,
        category: m.category || liveItem?.category || 'Kitchen Supplies',
        qty: `${formatQty(m.quantity)} ${m.unit || liveItem?.unit || 'Units'}`,
        unitPrice: `BDT ${unitPriceNum}`,
        totalCost: `BDT ${Math.round(totalCostNum).toLocaleString()}`,
        currentStock: liveItem ? `${formatQty(liveItem.currentStock)} ${liveItem.unit}` : `${formatQty(m.stockAfter || m.quantity)}`,
        supplier: m.supplier || liveItem?.supplier || 'Local Market',
        note: m.note || ''
      };
    });

    const totalExpense = listToExport.reduce((s, m) => s + (m.totalCost || ((Number(m.quantity) || 0) * (Number(m.unitPrice) || 0))), 0);
    const totalUnits = listToExport.reduce((s, m) => s + (Number(m.quantity) || 0), 0);

    generateDailyBazarSlipPDF({
      date: targetDate,
      items: itemsData,
      totalExpense,
      totalItems: listToExport.length,
      totalUnits
    });
  };

  // Handle Quick Restock / Stock In
  const handleRecordStockIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockInForm.itemId || !stockInForm.quantity) return;

    const targetItem = items.find(i => i.id === stockInForm.itemId);
    if (!targetItem) return;

    const qty = Number(stockInForm.quantity);
    if (qty <= 0) return;

    const purchasePrice = Number(stockInForm.purchasePrice) || targetItem.costPrice || 0;
    const date = stockInForm.date || new Date().toLocaleDateString('en-CA');
    const newStock = targetItem.currentStock + qty;

    const updatedItem: InventoryItem = {
      ...targetItem,
      currentStock: newStock,
      costPrice: purchasePrice,
      lastPurchasePrice: purchasePrice,
      lastPurchasedDate: date,
      lastPurchasedQty: qty,
      supplier: stockInForm.supplier || targetItem.supplier
    };

    dispatch({ type: 'UPDATE_INVENTORY_ITEM', payload: updatedItem });

    const movement: StockMovement = {
      id: `mv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      itemId: targetItem.id,
      itemName: targetItem.name,
      type: 'Purchase IN',
      quantity: qty,
      unitPrice: purchasePrice,
      totalCost: qty * purchasePrice,
      date: date,
      note: stockInForm.note ? `Restock: ${stockInForm.note}` : 'Purchase Restock',
    };

    dispatch({ type: 'ADD_STOCK_MOVEMENT', payload: movement });

    setShowStockInModal(false);
    setStockInForm({
      itemId: '',
      date: new Date().toLocaleDateString('en-CA'),
      quantity: '',
      purchasePrice: '',
      supplier: '',
      note: ''
    });
  };

  // Handle Manual Stock Out / Kitchen Usage
  const handleRecordStockOut = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockOutForm.itemId || !stockOutForm.quantity) return;

    const targetItem = items.find(i => i.id === stockOutForm.itemId);
    if (!targetItem) return;

    const qty = Number(stockOutForm.quantity);
    if (qty <= 0) return;

    const date = stockOutForm.date || new Date().toLocaleDateString('en-CA');
    const newStock = Math.max(0, targetItem.currentStock - qty);

    const updatedItem: InventoryItem = {
      ...targetItem,
      currentStock: newStock
    };

    dispatch({ type: 'UPDATE_INVENTORY_ITEM', payload: updatedItem });

    const movementType = stockOutForm.reason.toLowerCase().includes('waste') || stockOutForm.reason.toLowerCase().includes('damage')
      ? 'Waste OUT'
      : 'Usage OUT';

    const movement: StockMovement = {
      id: `mv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      itemId: targetItem.id,
      itemName: targetItem.name,
      type: movementType,
      quantity: qty,
      unitPrice: targetItem.costPrice || 0,
      totalCost: qty * (targetItem.costPrice || 0),
      date: date,
      note: `${stockOutForm.reason}${stockOutForm.note ? `: ${stockOutForm.note}` : ''}`,
    };

    dispatch({ type: 'ADD_STOCK_MOVEMENT', payload: movement });

    setShowStockOutModal(false);
    setStockOutForm({
      itemId: '',
      date: new Date().toLocaleDateString('en-CA'),
      quantity: '',
      reason: 'Kitchen Usage',
      note: ''
    });
  };

  // Open Quick Stock In for a specific item
  const openStockInForItem = (item: InventoryItem) => {
    setStockInForm({
      itemId: item.id,
      date: new Date().toLocaleDateString('en-CA'),
      quantity: '',
      purchasePrice: String(item.costPrice || ''),
      supplier: item.supplier || '',
      note: ''
    });
    setShowStockInModal(true);
  };

  // Open Quick Stock Out for a specific item
  const openStockOutForItem = (item: InventoryItem) => {
    setStockOutForm({
      itemId: item.id,
      date: new Date().toLocaleDateString('en-CA'),
      quantity: '',
      reason: 'Kitchen Usage',
      note: ''
    });
    setShowStockOutModal(true);
  };

  // Handle Reconciliation Initiation
  const initiateReconciliation = (item: InventoryItem) => {
    const physicalInput = physicalCounts[item.id];
    const systemStock = item.currentStock || 0;
    const physicalStock = physicalInput !== undefined ? physicalInput : systemStock;
    const diff = physicalStock - systemStock;

    if (diff === 0) return;

    const reasonType = reconcileReasons[item.id] || 'Physical Count Discrepancy';
    const customNote = reconcileCustomNotes[item.id] || '';
    const finalReason = customNote ? `${reasonType} - ${customNote}` : reasonType;
    const valueDiff = diff * (item.costPrice || 0);

    setReconcileConfirm({
      isOpen: true,
      item,
      systemStock,
      physicalStock,
      difference: diff,
      reason: finalReason,
      valueDiff
    });
  };

  // Execute Confirmed Reconciliation
  const executeReconciliation = () => {
    const { item, systemStock, physicalStock, difference, reason, valueDiff } = reconcileConfirm;
    if (!item) return;

    const updatedItem: InventoryItem = {
      ...item,
      currentStock: physicalStock
    };
    dispatch({ type: 'UPDATE_INVENTORY_ITEM', payload: updatedItem });

    const movement: StockMovement = {
      id: `mv-${Date.now()}-audit`,
      itemId: item.id,
      itemName: item.name,
      type: 'Adjustment',
      quantity: Math.abs(difference),
      unitPrice: item.costPrice || 0,
      totalCost: Math.abs(valueDiff),
      systemStock: systemStock,
      physicalStock: physicalStock,
      difference: difference,
      performedBy: adminRole,
      date: new Date().toLocaleDateString('en-CA'),
      note: `Audit Reconciliation: System was ${systemStock}, Counted ${physicalStock}. Variance: ${difference > 0 ? '+' : ''}${difference} ${item.unit}. Reason: ${reason}`
    };
    dispatch({ type: 'ADD_STOCK_MOVEMENT', payload: movement });

    setPhysicalCounts(prev => ({ ...prev, [item.id]: physicalStock }));
    setReconcileConfirm({ isOpen: false, item: null, systemStock: 0, physicalStock: 0, difference: 0, reason: '', valueDiff: 0 });
  };

  // Filtered Items for Main List
  const filtered = useMemo(() => {
    return items.filter(i => {
      const matchSearch =
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.sku.toLowerCase().includes(search.toLowerCase()) ||
        (i.supplier && i.supplier.toLowerCase().includes(search.toLowerCase())) ||
        i.category.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCategory === 'All' || i.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [items, search, selectedCategory]);

  const lowStock = useMemo(() => items.filter(i => (i.currentStock || 0) <= (i.minStock || 0)), [items]);

  // Comprehensive Stock Statistics & Ledger Calculations
  const stockReportData = useMemo(() => {
    const rangeMovements = movements.filter(m => isDateInRange(m.date));

    const itemStats = items.map(item => {
      const itemMovements = rangeMovements.filter(m => m.itemId === item.id);

      const stockInQty = itemMovements
        .filter(m => m.type.includes('IN') || m.type === 'Initial Stock' || m.type === 'Daily Bazar')
        .reduce((sum, m) => sum + (m.quantity || 0), 0);

      const stockOutQty = itemMovements
        .filter(m => m.type === 'Sale OUT' || m.type === 'Usage OUT')
        .reduce((sum, m) => sum + (m.quantity || 0), 0);

      const wasteQty = itemMovements
        .filter(m => m.type === 'Waste OUT')
        .reduce((sum, m) => sum + (m.quantity || 0), 0);

      const adjQty = itemMovements
        .filter(m => m.type === 'Adjustment')
        .reduce((sum, m) => {
          if (m.difference !== undefined) return sum + m.difference;
          return sum;
        }, 0);

      const totalValuation = (item.currentStock || 0) * (item.costPrice || 0);

      return {
        item,
        stockInQty,
        stockOutQty,
        wasteQty,
        adjQty,
        currentStock: item.currentStock || 0,
        valuation: totalValuation
      };
    });

    const totalAdded = rangeMovements
      .filter(m => m.type.includes('IN') || m.type === 'Initial Stock' || m.type === 'Daily Bazar')
      .reduce((sum, m) => sum + (m.quantity || 0), 0);

    const totalSold = rangeMovements
      .filter(m => m.type === 'Sale OUT' || m.type === 'Usage OUT')
      .reduce((sum, m) => sum + (m.quantity || 0), 0);

    const totalWaste = rangeMovements
      .filter(m => m.type === 'Waste OUT')
      .reduce((sum, m) => sum + (m.quantity || 0), 0);

    const totalPurchaseCost = rangeMovements
      .filter(m => m.type === 'Purchase IN' || m.type === 'Initial Stock' || m.type === 'Daily Bazar')
      .reduce((sum, m) => sum + (m.totalCost || 0), 0);

    const totalCurrentStock = items.reduce((sum, i) => sum + (i.currentStock || 0), 0);
    const totalCurrentValue = items.reduce((sum, i) => sum + ((i.currentStock || 0) * (i.costPrice || 0)), 0);

    return {
      itemStats,
      totalAdded,
      totalSold,
      totalWaste,
      totalPurchaseCost,
      totalCurrentStock,
      totalCurrentValue
    };
  }, [items, movements, dateFilter, customStartDate, customEndDate, selectedMonth]);

  // ── Category Analytics & Time Breakdown ──────────────────────────────────
  const categoryAnalytics = useMemo(() => {
    const today = todayStr;
    const currMonth = currentMonthStr;
    const prevMonth = previousMonthStr;
    const weekMinDate = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d.toLocaleDateString('en-CA');
    })();
    const yDate = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d.toLocaleDateString('en-CA');
    })();

    let totalValuationAll = 0;
    let totalStockUnitsAll = 0;
    let todayPurchases = 0;
    let yesterdayPurchases = 0;
    let weekPurchases = 0;
    let monthPurchases = 0;
    let lastMonthPurchases = 0;
    let yearPurchases = 0;
    let allTimePurchases = 0;

    items.forEach(item => {
      const val = (item.currentStock || 0) * (item.costPrice || 0);
      totalValuationAll += val;
      totalStockUnitsAll += (item.currentStock || 0);
    });

    movements.forEach(m => {
      const cost = m.totalCost || ((m.quantity || 0) * (m.unitPrice || 0)) || 0;
      if (m.type === 'Purchase IN' || m.type === 'Initial Stock') {
        allTimePurchases += cost;
        if (m.date === today) todayPurchases += cost;
        if (m.date === yDate) yesterdayPurchases += cost;
        if (m.date >= weekMinDate && m.date <= today) weekPurchases += cost;
        if (m.date && m.date.startsWith(currMonth)) monthPurchases += cost;
        if (m.date && m.date.startsWith(prevMonth)) lastMonthPurchases += cost;
        if (m.date && m.date.startsWith(today.slice(0, 4))) yearPurchases += cost;
      }
    });

    const categoryBreakdown = INVENTORY_CATEGORIES.map(cat => {
      const catItems = items.filter(i => (i.category || '').trim().toLowerCase() === cat.id.toLowerCase());
      const catItemIds = new Set(catItems.map(i => i.id));

      const count = catItems.length;
      const stockUnits = catItems.reduce((s, i) => s + (i.currentStock || 0), 0);
      const valuation = catItems.reduce((s, i) => s + ((i.currentStock || 0) * (i.costPrice || 0)), 0);
      const pct = totalValuationAll > 0 ? (valuation / totalValuationAll) * 100 : 0;

      const catMovs = movements.filter(m => catItemIds.has(m.itemId));
      const inMovs = catMovs.filter(m => m.type.includes('IN') || m.type === 'Initial Stock' || m.type === 'Daily Bazar');
      const outMovs = catMovs.filter(m => m.type.includes('OUT'));

      const inUnits = inMovs.reduce((s, m) => s + (m.quantity || 0), 0);
      const inCost = inMovs.reduce((s, m) => s + (m.totalCost || ((m.quantity || 0) * (m.unitPrice || 0))), 0);
      const outUnits = outMovs.reduce((s, m) => s + (m.quantity || 0), 0);
      const outCost = outMovs.reduce((s, m) => s + (m.totalCost || ((m.quantity || 0) * (m.unitPrice || 0))), 0);
      const monthPurch = inMovs.filter(m => m.date && m.date.startsWith(currMonth)).reduce((s, m) => s + (m.totalCost || ((m.quantity || 0) * (m.unitPrice || 0))), 0);

      return {
        cat,
        count,
        stockUnits,
        valuation,
        pct,
        inUnits,
        inCost,
        outUnits,
        outCost,
        monthPurch
      };
    });

    let topCategory = { name: 'Raw Materials & Ingredients', valuation: 0 };
    categoryBreakdown.forEach(c => {
      if (c.valuation > topCategory.valuation) {
        topCategory = { name: c.cat.label, valuation: c.valuation };
      }
    });

    return {
      totalValuationAll,
      totalStockUnitsAll,
      todayPurchases,
      yesterdayPurchases,
      weekPurchases,
      monthPurchases,
      lastMonthPurchases,
      yearPurchases,
      allTimePurchases,
      categoryBreakdown,
      topCategory
    };
  }, [items, movements, todayStr, currentMonthStr, previousMonthStr]);

  // ── Month-over-Month (MoM) Inventory Comparison ──────────────────────────
  const momComparisonData = useMemo(() => {
    const movsA = movements.filter(m => m.date && m.date.startsWith(compareMonthA));
    const movsB = movements.filter(m => m.date && m.date.startsWith(compareMonthB));

    const totalInA = movsA.filter(m => m.type.includes('IN') || m.type === 'Initial Stock' || m.type === 'Daily Bazar')
      .reduce((s, m) => s + (m.totalCost || ((m.quantity || 0) * (m.unitPrice || 0))), 0);
    const totalInB = movsB.filter(m => m.type.includes('IN') || m.type === 'Initial Stock' || m.type === 'Daily Bazar')
      .reduce((s, m) => s + (m.totalCost || ((m.quantity || 0) * (m.unitPrice || 0))), 0);
    const diffIn = totalInA - totalInB;
    const pctIn = totalInB > 0 ? (diffIn / totalInB) * 100 : (totalInA > 0 ? 100 : 0);

    const breakdown = INVENTORY_CATEGORIES.map(cat => {
      const catItems = items.filter(i => (i.category || '').trim().toLowerCase() === cat.id.toLowerCase());
      const catItemIds = new Set(catItems.map(i => i.id));

      const inA = movsA.filter(m => catItemIds.has(m.itemId) && (m.type.includes('IN') || m.type === 'Initial Stock' || m.type === 'Daily Bazar'))
        .reduce((s, m) => s + (m.totalCost || ((m.quantity || 0) * (m.unitPrice || 0))), 0);
      const inB = movsB.filter(m => catItemIds.has(m.itemId) && (m.type.includes('IN') || m.type === 'Initial Stock' || m.type === 'Daily Bazar'))
        .reduce((s, m) => s + (m.totalCost || ((m.quantity || 0) * (m.unitPrice || 0))), 0);
      const diff = inA - inB;
      const pct = inB > 0 ? (diff / inB) * 100 : (inA > 0 ? 100 : 0);

      const outA = movsA.filter(m => catItemIds.has(m.itemId) && m.type.includes('OUT'))
        .reduce((s, m) => s + (m.totalCost || ((m.quantity || 0) * (m.unitPrice || 0))), 0);
      const outB = movsB.filter(m => catItemIds.has(m.itemId) && m.type.includes('OUT'))
        .reduce((s, m) => s + (m.totalCost || ((m.quantity || 0) * (m.unitPrice || 0))), 0);

      return {
        cat,
        inA,
        inB,
        diff,
        pct,
        outA,
        outB,
        trend: diff > 0 ? 'increased' : diff < 0 ? 'decreased' : 'equal'
      };
    });

    return {
      totalInA,
      totalInB,
      diffIn,
      pctIn,
      breakdown
    };
  }, [items, movements, compareMonthA, compareMonthB]);

  const handleExportMoMInventoryPDF = () => {
    const data = momComparisonData.breakdown.map(b => [
      b.cat.label,
      `BDT ${Math.round(b.inB).toLocaleString()}`,
      `BDT ${Math.round(b.inA).toLocaleString()}`,
      `${b.diff >= 0 ? '+' : ''}BDT ${Math.round(b.diff).toLocaleString()}`,
      `${b.diff >= 0 ? '+' : ''}${b.pct.toFixed(1)}%`,
      b.trend.toUpperCase()
    ]);

    generatePremiumPDF({
      title: `Inventory MoM Comparison (${compareMonthB} vs ${compareMonthA})`,
      columns: ['Category', `${compareMonthB} Purchases`, `${compareMonthA} Purchases`, 'Difference (BDT)', 'Variance (%)', 'Trend'],
      data,
      filename: `Inventory_MoM_Comparison_${compareMonthB}_vs_${compareMonthA}`
    });
  };

  const handleExportCustomRangeInventoryPDF = () => {
    const data = stockReportData.itemStats.map(({ item, stockInQty, stockOutQty, wasteQty, currentStock, valuation }) => [
      item.sku,
      item.name,
      item.category,
      `${formatQty(stockInQty)} ${item.unit}`,
      `${formatQty(stockOutQty)} ${item.unit}`,
      `${formatQty(wasteQty)} ${item.unit}`,
      `${formatQty(currentStock)} ${item.unit}`,
      `BDT ${item.costPrice}`,
      `BDT ${Math.round(valuation).toLocaleString()}`
    ]);

    generatePremiumPDF({
      title: `Custom Date Range Inventory Audit (${customStartDate || 'Start'} to ${customEndDate || 'Present'})`,
      columns: ['SKU', 'Item Name', 'Category', 'Added', 'Sold/Used', 'Waste', 'Balance', 'Unit Cost', 'Valuation'],
      data,
      filename: `Inventory_Audit_${(customStartDate || 'start').replace(/-/g, '')}_${(customEndDate || 'end').replace(/-/g, '')}`
    });
  };

  // Export PDF: Complete Stock Status & Ledger Report
  const handleExportStockReport = () => {
    const data = stockReportData.itemStats.map(({ item, stockInQty, stockOutQty, wasteQty, adjQty, currentStock, valuation }) => [
      item.sku,
      item.name,
      item.category,
      `${formatQty(stockInQty)} ${item.unit}`,
      `${formatQty(stockOutQty)} ${item.unit}`,
      `${adjQty >= 0 ? '+' : ''}${formatQty(adjQty)} ${item.unit}`,
      `${formatQty(currentStock)} ${item.unit}`,
      `BDT ${item.costPrice}`,
      `BDT ${Math.round(valuation).toLocaleString()}`,
      currentStock <= item.minStock ? 'Low Stock' : 'Optimal'
    ]);

    generatePremiumPDF({
      title: `Inventory Stock & Movement Report (${dateFilter})`,
      columns: ['SKU', 'Item Name', 'Category', 'Total In', 'Total Sold', 'Variance', 'Current Stock', 'Unit Cost', 'Valuation', 'Status'],
      data,
      filename: `Stock_Ledger_Report_${dateFilter.replace(/\s+/g, '_')}`
    });
  };

  // Export PDF: Movements History
  const handleExportMovements = () => {
    const filteredMovements = movements.filter(m => {
      const matchDate = isDateInRange(m.date);
      const matchType = movementTypeFilter === 'All' || m.type === movementTypeFilter;
      const matchItem = movementItemFilter === 'All' || m.itemId === movementItemFilter;
      return matchDate && matchType && matchItem;
    });

    const data = filteredMovements.map(m => [
      m.date,
      m.itemName,
      m.type,
      `${m.type.includes('IN') || m.type === 'Initial Stock' || m.type === 'Daily Bazar' ? '+' : '−'}${formatQty(m.quantity)}`,
      m.unitPrice ? `BDT ${m.unitPrice}` : '—',
      m.totalCost ? `BDT ${Math.round(m.totalCost).toLocaleString()}` : '—',
      m.note || '—'
    ]);

    generatePremiumPDF({
      title: `Stock Transaction & Movement History (${dateFilter})`,
      columns: ['Date', 'Item Name', 'Movement Type', 'Qty', 'Unit Cost', 'Total Cost', 'Reference / Note'],
      data,
      filename: `Stock_Movements_${dateFilter.replace(/\s+/g, '_')}`
    });
  };

  // Export Single Product History PDF
  const handleExportProductLedger = (item: InventoryItem) => {
    const itemMovs = movements
      .filter(m => m.itemId === item.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = 0;
    const data = itemMovs.map(m => {
      const delta = (m.type.includes('IN') || m.type === 'Initial Stock' || m.type === 'Daily Bazar')
        ? m.quantity
        : (m.type === 'Adjustment' && m.difference !== undefined)
          ? m.difference
          : -m.quantity;
      running += delta;

      return [
        m.date,
        m.type,
        delta > 0 ? `+${formatQty(delta)}` : `${formatQty(delta)}`,
        `${formatQty(running)} ${item.unit}`,
        m.unitPrice ? `BDT ${m.unitPrice}` : '—',
        m.totalCost ? `BDT ${Math.round(m.totalCost).toLocaleString()}` : '—',
        m.note || '—'
      ];
    });

    generatePremiumPDF({
      title: `Audit Ledger: ${item.name} (${item.sku})`,
      columns: ['Date', 'Type', 'Movement', 'Balance', 'Unit Cost', 'Total Cost', 'Reference / Note'],
      data,
      filename: `Product_Ledger_${item.sku}`
    });
  };

  const pastReconciliations = useMemo(() => {
    return movements.filter(m => m.type === 'Adjustment');
  }, [movements]);

  return (
    <div className="w-full max-w-full min-w-0 space-y-4 animate-fade-in overflow-hidden">
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* 1. UPPER SECTION: DAILY BAZAR & KITCHEN PROCUREMENT                       */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {(tab === 'stock' || tab === 'daily-bazar') && (
        <div className="bg-white rounded-2xl shadow-sm border border-red-200/90 overflow-hidden">
          {/* Header Bar */}
          <div className="p-4 sm:p-5 bg-linear-to-r from-red-600 via-rose-600 to-amber-600 text-white flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-inner flex-shrink-0">
                <ShoppingCart size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-black tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                    Daily Bazar & Kitchen Procurement
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/25 text-white uppercase tracking-wider">
                    {formatBazarDate(bazarDateFilter === 'today' ? todayStr : bazarDateFilter === 'yesterday' ? yesterdayStr : bazarCustomDate || todayStr)}
                  </span>
                </div>
                <p className="text-xs text-red-100 mt-0.5">
                  Record daily bazar purchases, auto-update cumulative master stock, and generate official vouchers
                </p>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setBazarForm({
                    date: todayStr,
                    itemId: '',
                    isNewItem: true,
                    name: '',
                    category: 'Raw Materials & Ingredients',
                    unit: 'Kg',
                    quantity: '',
                    unitPrice: '',
                    totalCost: '',
                    sellingPrice: '',
                    supplier: '',
                    note: ''
                  });
                  setShowBazarModal(true);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-red-600 hover:bg-red-50 shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                <Plus size={14} /> + Record Daily Bazar
              </button>

              <button
                type="button"
                onClick={() => handleDownloadBazarSlip(bazarDateFilter === 'yesterday' ? yesterdayStr : todayStr)}
                className="px-3 py-2 text-xs font-bold bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-xl shadow-xs flex items-center gap-1.5 transition-all active:scale-95"
                style={{ fontFamily: 'var(--font-heading)' }}
                title="Download official restaurant bazar voucher slip (PDF)"
              >
                <Receipt size={14} /> Download {bazarDateFilter === 'yesterday' ? 'Yesterday' : 'Today'}&apos;s Slip (PDF)
              </button>
            </div>
          </div>

          {/* Quick Stats Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-gray-50/70 border-b border-gray-100 text-xs">
            <div className="bg-white p-3 rounded-xl border border-gray-200/80 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Today&apos;s Total Bazar Spent</span>
              <span className="text-base sm:text-lg font-black text-red-600 block mt-0.5" style={{ fontFamily: 'var(--font-heading)' }}>
                ৳{todayBazarTotalCost.toLocaleString()}
              </span>
              <span className="text-[10px] text-gray-500 font-medium">Recorded for {todayStr}</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-gray-200/80 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Items Bought Today</span>
              <span className="text-base sm:text-lg font-black text-gray-900 block mt-0.5" style={{ fontFamily: 'var(--font-heading)' }}>
                {todayBazarMovements.length} Products
              </span>
              <span className="text-[10px] text-gray-500 font-medium">{todayBazarTotalUnits} Total Units</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-gray-200/80 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Yesterday&apos;s Total Bazar</span>
              <span className="text-base sm:text-lg font-black text-amber-700 block mt-0.5" style={{ fontFamily: 'var(--font-heading)' }}>
                ৳{yesterdayBazarTotalCost.toLocaleString()}
              </span>
              <span className="text-[10px] text-gray-500 font-medium">{yesterdayBazarMovements.length} Products Bought</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-gray-200/80 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">All-Time Bazar Spent</span>
              <span className="text-base sm:text-lg font-black text-purple-700 block mt-0.5" style={{ fontFamily: 'var(--font-heading)' }}>
                ৳{allBazarTotalCost.toLocaleString()}
              </span>
              <span className="text-[10px] text-gray-500 font-medium">{allBazarMovements.length} Total Purchases Logged</span>
            </div>
          </div>

          {/* Date Segment Filter & Search Bar */}
          <div className="p-3.5 bg-white border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-100 border border-gray-200 overflow-x-auto w-full md:w-auto">
              <button
                type="button"
                onClick={() => { setBazarDateFilter('today'); setBazarCustomDate(''); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  bazarDateFilter === 'today' && !bazarCustomDate
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/70'
                }`}
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Today&apos;s Bazar</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${bazarDateFilter === 'today' ? 'bg-white/20 text-white font-black' : 'bg-gray-200 text-gray-700'}`}>
                  {todayBazarMovements.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setBazarDateFilter('yesterday'); setBazarCustomDate(''); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  bazarDateFilter === 'yesterday' && !bazarCustomDate
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/70'
                }`}
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                <span className="w-2 h-2 rounded-full bg-amber-300"></span>
                <span>Yesterday&apos;s Bazar</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${bazarDateFilter === 'yesterday' ? 'bg-white/20 text-white font-black' : 'bg-gray-200 text-gray-700'}`}>
                  {yesterdayBazarMovements.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setBazarDateFilter('older'); setBazarCustomDate(''); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  bazarDateFilter === 'older' && !bazarCustomDate
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/70'
                }`}
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                <CalendarDays size={13} />
                <span>Earlier Days</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${bazarDateFilter === 'older' ? 'bg-white/20 text-white font-black' : 'bg-gray-200 text-gray-700'}`}>
                  {olderBazarMovements.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setBazarDateFilter('all'); setBazarCustomDate(''); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  bazarDateFilter === 'all' && !bazarCustomDate
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/70'
                }`}
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                <span>All Bazar History</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${bazarDateFilter === 'all' ? 'bg-white/20 text-white font-black' : 'bg-gray-200 text-gray-700'}`}>
                  {allBazarMovements.length}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <input
                type="date"
                value={bazarCustomDate}
                onChange={e => {
                  setBazarCustomDate(e.target.value);
                  if (e.target.value) setBazarDateFilter('older');
                }}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 outline-none"
                title="Select specific date"
              />
              {bazarCustomDate && (
                <button
                  type="button"
                  onClick={() => { setBazarCustomDate(''); setBazarDateFilter('today'); }}
                  className="text-xs text-red-600 hover:text-red-800 font-bold px-2 py-1 flex items-center gap-1"
                >
                  Clear Date <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Active Date Bazar Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Product / Raw Material</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-center">Bazar Qty Added</th>
                  <th className="px-4 py-3 text-right">Unit Rate</th>
                  <th className="px-4 py-3 text-right">Total Cost</th>
                  <th className="px-4 py-3 text-center">Store Total Stock</th>
                  <th className="px-4 py-3">Market / Supplier</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeBazarList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-gray-400">
                      <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-2">
                        <ShoppingCart size={18} />
                      </div>
                      <p className="font-bold text-gray-700 text-xs">
                        No bazar entries recorded for {bazarCustomDate ? bazarCustomDate : bazarDateFilter === 'today' ? 'Today' : bazarDateFilter === 'yesterday' ? 'Yesterday' : 'this period'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setBazarForm({
                            date: bazarCustomDate || (bazarDateFilter === 'yesterday' ? yesterdayStr : todayStr),
                            itemId: '',
                            isNewItem: true,
                            name: '',
                            category: 'Raw Materials & Ingredients',
                            unit: 'Kg',
                            quantity: '',
                            unitPrice: '',
                            totalCost: '',
                            sellingPrice: '',
                            supplier: '',
                            note: ''
                          });
                          setShowBazarModal(true);
                        }}
                        className="mt-2.5 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-white font-bold text-xs bg-red-600 hover:bg-red-700 shadow-xs"
                      >
                        <Plus size={12} /> Record Bazar for {bazarCustomDate || (bazarDateFilter === 'yesterday' ? 'Yesterday' : 'Today')}
                      </button>
                    </td>
                  </tr>
                ) : (
                  activeBazarList.map(m => {
                    const liveItem = items.find(i => i.id === m.itemId || (i.name && m.itemName && i.name.toLowerCase() === m.itemName.toLowerCase()));
                    const totalCostNum = m.totalCost || ((Number(m.quantity) || 0) * (Number(m.unitPrice) || 0));
                    const unitPriceNum = m.unitPrice || (m.quantity ? Math.round(totalCostNum / m.quantity) : 0);
                    return (
                      <tr key={m.id} className="hover:bg-red-50/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-[11px] font-bold text-gray-700">
                          {m.date}
                          <span className="block text-[9px] text-gray-400 font-normal">{formatBazarDate(m.date)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-gray-900 block" style={{ fontFamily: 'var(--font-heading)' }}>
                            {m.itemName}
                          </span>
                          {m.note && <span className="text-[10px] text-gray-400 block">{m.note}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700">
                            {m.category || liveItem?.category || 'Kitchen Supplies'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 rounded-md text-xs font-black bg-emerald-100 text-emerald-800" style={{ fontFamily: 'var(--font-heading)' }}>
                            +{formatQty(m.quantity)} <span className="text-[10px] font-bold">{m.unit || liveItem?.unit || 'Units'}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-700">
                          ৳{unitPriceNum}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-black text-red-600 text-xs" style={{ fontFamily: 'var(--font-heading)' }}>
                            ৳{Math.round(totalCostNum).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {liveItem ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-50 text-blue-800 border border-blue-200">
                              {formatQty(liveItem.currentStock)} {liveItem.unit}
                            </span>
                          ) : (
                            <span className="text-gray-500 font-medium">
                              {formatQty(m.stockAfter || m.quantity)} {m.unit}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 font-medium">
                          {m.supplier || liveItem?.supplier || 'Local Market'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDownloadBazarSlip(m.date, [m])}
                              className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
                              title="Print Slip for this item"
                            >
                              <Receipt size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBazarMovement(m)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete this purchase entry"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {activeBazarList.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-100/80 font-bold border-t border-gray-200 text-gray-900">
                    <td colSpan={3} className="px-4 py-3 uppercase text-[10px] tracking-wider">
                      Total Bazar Cost ({activeBazarList.length} Items)
                    </td>
                    <td className="px-4 py-3 text-center font-black text-emerald-800">
                      +{activeBazarList.reduce((s, m) => s + (Number(m.quantity) || 0), 0)} Units
                    </td>
                    <td></td>
                    <td className="px-4 py-3 text-right font-black text-red-700 text-sm" style={{ fontFamily: 'var(--font-heading)' }}>
                      ৳{Math.round(activeBazarTotalCost).toLocaleString()}
                    </td>
                    <td colSpan={3} className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDownloadBazarSlip(activeBazarList[0]?.date || todayStr, activeBazarList)}
                        className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-xs inline-flex items-center gap-1"
                      >
                        <Download size={12} /> Download Voucher (PDF)
                      </button>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* 2. LOWER SECTION: RESTAURANT INVENTORY & STOCK MANAGEMENT                 */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-gray-200/90">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 min-w-0">
          {/* Left Title & Status */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm flex-shrink-0 bg-linear-to-br from-red-600 to-rose-700"
            >
              <Package size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                  Restaurant Inventory & Stock Management
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200/80 tracking-wider">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Auto-Deduction Active
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Automatically subtracts packaging boxes & ingredients on food orders, plus water bottles & direct retail items.
              </p>
            </div>
          </div>

          {/* Right Action Controls Group */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-start xl:justify-end flex-shrink-0">
            {/* Quick Stock Movements Group (Paired Pill Segment) */}
            <div className="inline-flex items-center rounded-xl bg-gray-100/90 p-1 border border-gray-200 shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  setStockInForm({
                    itemId: items[0]?.id || '',
                    date: new Date().toLocaleDateString('en-CA'),
                    quantity: '',
                    purchasePrice: '',
                    supplier: '',
                    note: ''
                  });
                  setShowStockInModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-700 hover:text-emerald-700 hover:bg-white transition-all active:scale-95"
                style={{ fontFamily: 'var(--font-heading)' }}
                title="Quick stock intake / restock"
              >
                <TrendingUp size={13} className="text-emerald-600" />
                <span>+ Stock In</span>
              </button>
              <div className="w-px h-3.5 bg-gray-300 mx-0.5"></div>
              <button
                type="button"
                onClick={() => {
                  setStockOutForm({
                    itemId: items[0]?.id || '',
                    date: new Date().toLocaleDateString('en-CA'),
                    quantity: '',
                    reason: 'Kitchen Usage',
                    note: ''
                  });
                  setShowStockOutModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-700 hover:text-amber-800 hover:bg-white transition-all active:scale-95"
                style={{ fontFamily: 'var(--font-heading)' }}
                title="Manual kitchen deduction or damage waste"
              >
                <TrendingDown size={13} className="text-amber-600" />
                <span>− Stock Out</span>
              </button>
            </div>

            {/* Export Report */}
            <button
              type="button"
              onClick={handleExportStockReport}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 shadow-2xs transition-all active:scale-95"
              style={{ fontFamily: 'var(--font-heading)' }}
              title="Export CSV stock ledger report"
            >
              <Download size={13} className="text-gray-500" />
              <span>Export</span>
            </button>

            {/* Add New Product to Master Catalog */}
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(blankForm());
                setShowForm(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-200 shadow-2xs transition-all active:scale-95"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <Plus size={14} className="text-gray-700" />
              <span>Add Product</span>
            </button>

            {/* Daily Bazar Hero Primary Action */}
            <button
              type="button"
              onClick={() => {
                setBazarForm({
                  date: todayStr,
                  itemId: '',
                  isNewItem: true,
                  name: '',
                  category: 'Raw Materials & Ingredients',
                  unit: 'Kg',
                  quantity: '',
                  unitPrice: '',
                  totalCost: '',
                  sellingPrice: '',
                  supplier: '',
                  note: ''
                });
                setShowBazarModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white shadow-sm transition-all active:scale-95 bg-linear-to-r from-red-600 via-rose-600 to-amber-600 hover:opacity-95"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <ShoppingCart size={14} />
              <span>+ Record Daily Bazar</span>
            </button>
          </div>
        </div>

        {/* ── Metric Overview Cards ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-4 pt-4 border-t border-gray-100">
          {/* 1. Total Stock In */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-700 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Stock Added</span>
              <TrendingUp size={16} />
            </div>
            <p className="text-xl sm:text-2xl font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
              {formatQty(stockReportData.totalAdded)}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5 truncate">Purchases & Opening Stock</p>
          </div>

          {/* 2. Total Sold */}
          <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-100 flex flex-col justify-between">
            <div className="flex items-center justify-between text-rose-700 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Sold / Used</span>
              <ShoppingBag size={16} />
            </div>
            <p className="text-xl sm:text-2xl font-black text-rose-600" style={{ fontFamily: 'var(--font-heading)' }}>
              {formatQty(stockReportData.totalSold)}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5 truncate">Auto Orders & Usage</p>
          </div>

          {/* 3. Available Stock */}
          <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-100 flex flex-col justify-between">
            <div className="flex items-center justify-between text-sky-700 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Available Stock</span>
              <Layers size={16} />
            </div>
            <p className="text-xl sm:text-2xl font-black text-sky-900" style={{ fontFamily: 'var(--font-heading)' }}>
              {formatQty(stockReportData.totalCurrentStock)}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5 truncate">Active Balance Units</p>
          </div>

          {/* 4. Total Valuation */}
          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 flex flex-col justify-between">
            <div className="flex items-center justify-between text-indigo-700 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Stock Valuation</span>
              <DollarSign size={16} />
            </div>
            <p className="text-xl sm:text-2xl font-black text-indigo-900" style={{ fontFamily: 'var(--font-heading)' }}>
              {formatCurrency(stockReportData.totalCurrentValue)}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5 truncate">Active Inventory Value</p>
          </div>

          {/* 5. Alerts */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-100 flex flex-col justify-between col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-amber-700 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Restock Alerts</span>
              <AlertTriangle size={16} />
            </div>
            <p className="text-xl sm:text-2xl font-black" style={{ color: lowStock.length > 0 ? PZ : '#16A34A', fontFamily: 'var(--font-heading)' }}>
              {lowStock.length}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5 truncate">Below Min Threshold</p>
          </div>
        </div>

        {/* ── Segmented Navigation Tabs ──────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-100/90 border border-gray-200 overflow-x-auto hide-scrollbar">
            {[
              { id: 'stock', label: 'Inventory Master', icon: Package, count: items.length },
              { id: 'daily-bazar', label: 'Daily Bazar', icon: ShoppingCart, count: todayBazarMovements.length, highlight: todayBazarMovements.length > 0 },
              { id: 'analytics', label: 'Category & Time Analytics', icon: BarChart3 },
              { id: 'comparison', label: 'MoM Comparison Audit', icon: TrendingUp },
              { id: 'custom-range', label: 'Custom Range Audit', icon: Calendar },
              { id: 'report', label: 'Stock Ledger Report', icon: FileText },
              { id: 'history', label: 'Movement Logs', icon: History, count: movements.length },
              { id: 'reconciliation', label: 'Reconciliation', icon: Scale },
              { id: 'alerts', label: `Alerts (${lowStock.length})`, icon: AlertTriangle, highlight: lowStock.length > 0 }
            ].map(t => {
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id as any)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
                  style={{
                    backgroundColor: isActive ? '#fff' : 'transparent',
                    color: isActive ? '#111827' : '#6B7280',
                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    fontFamily: 'var(--font-heading)'
                  }}
                >
                  <t.icon size={13} style={{ color: isActive ? PZ : '#9CA3AF' }} />
                  <span>{t.label}</span>
                  {t.count !== undefined && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-red-50 text-red-600 font-extrabold' : 'bg-gray-200 text-gray-600'}`}>
                      {t.count}
                    </span>
                  )}
                  {t.highlight && !isActive && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Time & Month Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600">
              <Calendar size={13} className="text-gray-400" />
              <select
                value={dateFilter}
                onChange={e => {
                  setDateFilter(e.target.value as any);
                  setSelectedMonth('');
                }}
                className="bg-transparent outline-none cursor-pointer text-xs font-semibold text-gray-700"
              >
                <option value="All Time">All Time</option>
                <option value="This Month">This Month</option>
                <option value="Last Month">Last Month</option>
                <option value="Last 7 Days">Last 7 Days</option>
                <option value="Yesterday">Yesterday</option>
                <option value="Today">Today</option>
                <option value="Custom">Custom Range...</option>
              </select>
            </div>

            <input
              type="month"
              value={selectedMonth}
              onChange={e => {
                setSelectedMonth(e.target.value);
                if (e.target.value) setDateFilter('Custom');
              }}
              title="Filter by Month"
              className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 outline-none cursor-pointer"
            />

            {dateFilter === 'Custom' && !selectedMonth && (
              <div className="flex items-center gap-1 text-xs">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                  className="px-2 py-1 border border-gray-200 rounded-lg outline-none text-xs"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  className="px-2 py-1 border border-gray-200 rounded-lg outline-none text-xs"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* 1. MASTER STOCK ITEMS TAB                                               */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {tab === 'stock' && (
        <div className="space-y-4">
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider" style={{ fontFamily: 'var(--font-heading)' }}>
                  Master Product Inventory & Catalog
                </h3>
                <p className="text-[11px] text-gray-500">
                  Unified product catalog showing live cumulative stock, purchase cost & selling prices
                </p>
              </div>
              <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                {filtered.length} Unique Products
              </span>
            </div>
          </div>

              {/* Quick Category Filter Bar */}
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="text-[11px] font-black uppercase text-gray-400 px-2 tracking-wider">Categories:</span>
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === 'All'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Categories ({items.length})
            </button>
            {INVENTORY_CATEGORIES.map(c => {
              const isSel = selectedCategory === c.id;
              const Icon = c.icon;
              const count = items.filter(i => (i.category || '').trim().toLowerCase() === c.id.toLowerCase()).length;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    isSel
                      ? 'text-white shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  style={{
                    backgroundColor: isSel ? c.color : '#F9FAFB',
                    border: `1px solid ${isSel ? c.color : '#E5E7EB'}`,
                  }}
                >
                  <Icon size={13} />
                  <span>{c.label}</span>
                  <span className={`text-[10px] px-1.5 rounded-full ${isSel ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Category Banner */}
          {selectedCategory !== 'All' && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs animate-fade-in shadow-sm">
              <span className="font-bold flex items-center gap-2">
                <Filter size={14} className="text-red-600" />
                Filtering Category: <strong className="text-red-900 bg-red-100 px-2 py-0.5 rounded-md underline">{selectedCategory}</strong>
                <span className="text-gray-500 font-medium">({filtered.length} products found, Total Valuation: {formatCurrency(filtered.reduce((s, i) => s + ((i.currentStock || 0) * (i.costPrice || 0)), 0))})</span>
              </span>
              <button
                type="button"
                onClick={() => { setSelectedCategory('All'); setSearch(''); setDateFilter('All Time'); setSelectedMonth(''); }}
                className="font-bold text-red-700 hover:text-red-900 bg-white px-3 py-1 rounded-xl border border-red-200 shadow-sm hover:bg-red-50 transition-all text-xs flex items-center gap-1"
              >
                Clear Category Filter <X size={12} />
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Table Toolbar */}
            <div className="p-3.5 sm:p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search products by SKU, name, category, or supplier..."
                style={{ ...inputSt, paddingLeft: '36px' }}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                style={{ ...inputSt, width: 'auto', minWidth: '180px' }}
              >
                <option value="All">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Clean Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                  {['SKU', 'Product Details', 'Category / Type', 'Current Stock', 'Min Stock', 'Price (Cost / Sell)', 'Valuation', 'Last Activity', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'var(--font-heading)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {state.isInitialLoading ? (
                  Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} columns={10} />)
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-gray-400 text-sm">
                      <Package size={36} className="mx-auto mb-2 text-gray-300" />
                      No inventory items found matching your filter criteria
                    </td>
                  </tr>
                ) : (
                  filtered.map(item => {
                    const isLow = (item.currentStock || 0) <= (item.minStock || 0);
                    const isOut = (item.currentStock || 0) <= 0;
                    const stockVal = (item.currentStock || 0) * (item.costPrice || 0);

                    return (
                      <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-4 py-3.5">
                          <span className="text-xs font-mono font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                            {item.sku}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-xs font-bold text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                            {item.name}
                          </p>
                          {item.supplier && (
                            <span className="text-[11px] text-gray-400 block mt-0.5">Supplier: {item.supplier}</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-600">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-sm font-black ${isOut ? 'text-red-700' : isLow ? 'text-amber-600' : 'text-gray-900'}`} style={{ fontFamily: 'var(--font-heading)' }}>
                            {formatQty(item.currentStock)} <span className="text-xs font-medium text-gray-400">{item.unit}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-gray-500">
                          {formatQty(item.minStock)} {item.unit}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cost:</span>
                              <span className="font-bold text-gray-800">{formatCurrency(item.costPrice)}</span>
                            </div>
                            {item.sellingPrice && item.sellingPrice > 0 ? (
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Sell:</span>
                                <span className="font-bold text-emerald-700">{formatCurrency(item.sellingPrice)}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-400 italic">No retail price</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-black text-gray-900">{formatCurrency(stockVal)}</span>
                            {item.sellingPrice && item.sellingPrice > 0 ? (
                              <span className="text-[10px] text-emerald-700 font-semibold">
                                Retail: {formatCurrency((item.currentStock || 0) * (item.sellingPrice || 0))}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-[11px] text-gray-500 font-mono">
                          {item.lastPurchasedDate || item.addedDate || '—'}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                            isOut
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : isLow
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'Optimal'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            {/* Stock In Pill Button */}
                            <button
                              onClick={() => openStockInForItem(item)}
                              title="Restock Item (+ In)"
                              className="px-2 py-1 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-0.5 transition-all active:scale-95"
                              style={{ fontFamily: 'var(--font-heading)' }}
                            >
                              <TrendingUp size={11} /> +In
                            </button>

                            {/* Stock Out Pill Button */}
                            <button
                              onClick={() => openStockOutForItem(item)}
                              title="Record Kitchen Usage / Out (− Out)"
                              className="px-2 py-1 rounded-lg text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 flex items-center gap-0.5 transition-all active:scale-95"
                              style={{ fontFamily: 'var(--font-heading)' }}
                            >
                              <TrendingDown size={11} /> −Out
                            </button>

                            {/* Full Product History Ledger Button */}
                            <button
                              onClick={() => setHistoryModalItem(item)}
                              title="Audit Ledger & Movement History"
                              className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 text-gray-600 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                            >
                              <History size={13} />
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => {
                                setEditing(item);
                                setForm({
                                  id: item.id,
                                  name: item.name,
                                  sku: item.sku,
                                  category: item.category,
                                  unit: item.unit,
                                  supplier: item.supplier || '',
                                  costPrice: item.costPrice || 0,
                                  sellingPrice: item.sellingPrice || 0,
                                  initialStock: item.currentStock,
                                  newPurchasedQty: 0,
                                  currentStock: item.currentStock,
                                  minStock: item.minStock,
                                  maxStock: item.maxStock,
                                  addedDate: item.addedDate || new Date().toLocaleDateString('en-CA'),
                                  menuItemId: item.menuItemId || '',
                                });
                                setSkuManuallyEdited(true);
                                setShowAddCategoryInput(false);
                                setShowForm(true);
                              }}
                              title="Edit Item"
                              className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            >
                              <Edit2 size={13} />
                            </button>

                            {/* Delete Button (Admin Only) */}
                            {adminRole === 'admin' && (
                              <button
                                onClick={() => setDeleteConfirm({
                                  isOpen: true,
                                  title: 'Delete Inventory Item?',
                                  message: `Are you sure you want to permanently delete "${item.name}"?`,
                                  onConfirm: () => {
                                    handleDelete(item.id);
                                    setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
                                  }
                                })}
                                title="Delete Item"
                                className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
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

      {/* ── Daily Bazar Dedicated Tab Fallback ─────────────────────────── */}
      {tab === 'daily-bazar' && (
        <div className="bg-white p-8 rounded-2xl border border-gray-200/80 shadow-xs text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-inner">
            <ShoppingCart size={24} />
          </div>
          <div>
            <h4 className="text-sm font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
              Daily Bazar & Kitchen Procurement Hub is Active Above
            </h4>
            <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
              All daily bazar entries, kitchen consumption logs, and printable vouchers are managed in the command section located at the top of the page.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setBazarForm({
                  date: todayStr,
                  itemId: '',
                  isNewItem: true,
                  name: '',
                  category: 'Raw Materials & Ingredients',
                  unit: 'Kg',
                  quantity: '',
                  unitPrice: '',
                  totalCost: '',
                  sellingPrice: '',
                  supplier: '',
                  note: ''
                });
                setShowBazarModal(true);
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs inline-flex items-center gap-1.5 transition-all"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <Plus size={14} /> + Record Daily Bazar
            </button>
            <button
              type="button"
              onClick={() => handleDownloadBazarSlip(bazarDateFilter === 'yesterday' ? yesterdayStr : todayStr)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 shadow-2xs inline-flex items-center gap-1.5 transition-all"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <Receipt size={14} /> Download Daily Voucher (PDF)
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* 2. CATEGORY & TIME ANALYTICS TAB                                         */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {tab === 'analytics' && (
        <div className="space-y-6 animate-fade-in">
          {/* Top Insight Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Highest Valuation Category
              </span>
              <div className="flex items-center gap-3 mt-2">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                  <ChefHat size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                    {categoryAnalytics.topCategory.name}
                  </h4>
                  <p className="text-xs text-red-600 font-bold">{formatCurrency(categoryAnalytics.topCategory.valuation)} asset value</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Monthly Inflow Velocity
              </span>
              <div className="flex items-center gap-3 mt-2">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                    {formatCurrency(categoryAnalytics.monthPurchases)}
                  </h4>
                  <p className="text-xs text-gray-500 font-medium">Purchased in {currentMonthStr}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Average Value per Product
              </span>
              <div className="flex items-center gap-3 mt-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                    {formatCurrency(items.length > 0 ? categoryAnalytics.totalValuationAll / items.length : 0)}
                  </h4>
                  <p className="text-xs text-gray-500 font-medium">Across {items.length} active inventory SKUs</p>
                </div>
              </div>
            </div>
          </div>

          {/* Category Breakdown Cards Grid */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                  Category & Section Stock Valuation Breakdown
                </h3>
                <p className="text-xs text-gray-500">
                  Live asset calculations, inward flow, consumption, and valuation across all inventory departments
                </p>
              </div>
              <span className="text-xs font-bold text-gray-500">
                Total Stock Valuation: <strong className="text-gray-900 font-black">{formatCurrency(categoryAnalytics.totalValuationAll)}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryAnalytics.categoryBreakdown.map(c => {
                const Icon = c.cat.icon;

                return (
                  <div
                    key={c.cat.id}
                    className="p-5 rounded-2xl border transition-all hover:shadow-sm"
                    style={{ backgroundColor: '#FAFAFA', borderColor: '#F3F4F6' }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-9 h-9 rounded-xl flex items-center justify-center font-bold"
                          style={{ backgroundColor: c.cat.bg, color: c.cat.color }}
                        >
                          <Icon size={18} />
                        </span>
                        <div>
                          <span className="text-xs font-black text-gray-900 block" style={{ fontFamily: 'var(--font-heading)' }}>
                            {c.cat.label}
                          </span>
                          <span className="text-[10px] text-gray-400 block line-clamp-1">{c.cat.desc}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-gray-900 block" style={{ fontFamily: 'var(--font-heading)' }}>
                          {formatCurrency(c.valuation)}
                        </span>
                        <span className="text-[11px] font-bold text-gray-500">{c.pct.toFixed(1)}% of total</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden mb-3">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${c.pct}%`, backgroundColor: c.cat.color }}
                      />
                    </div>

                    {/* Numerical Stats Breakdown */}
                    <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-white border border-gray-100 text-[11px] mb-3">
                      <div>
                        <span className="text-gray-400 block text-[10px] uppercase font-bold">Physical Stock</span>
                        <strong className="text-gray-800">{formatQty(c.stockUnits)} Units</strong>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px] uppercase font-bold">Total Added</span>
                        <strong className="text-emerald-600">+{formatQty(c.inUnits)}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px] uppercase font-bold">Total Consumed</span>
                        <strong className="text-rose-600">−{formatQty(c.outUnits)}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                      <span>This Month Inward: <strong className="text-gray-800">{formatCurrency(c.monthPurch)}</strong></span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewCategoryModal(c.cat)}
                          className="px-2 py-0.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-colors"
                          title="Quick preview items"
                        >
                          Quick View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleViewCategoryItems(c.cat.id)}
                          className="font-bold text-red-600 hover:underline flex items-center gap-0.5"
                        >
                          View Items ({c.count}) →
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

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* 3. MONTH-OVER-MONTH (MoM) COMPARISON TAB                                 */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {tab === 'comparison' && (
        <div className="space-y-6 animate-fade-in">
          {/* Controls Bar */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                Month-over-Month (MoM) Inventory Audit & Variance
              </h3>
              <p className="text-xs text-gray-500">
                Compare inward stock purchases and consumption across categories to detect surges or waste
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
                type="button"
                onClick={handleExportMoMInventoryPDF}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-all ml-auto"
              >
                <Download size={13} /> Export MoM PDF
              </button>
            </div>
          </div>

          {/* Overall Comparison Summary Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-xs font-bold text-gray-400 block mb-1">Base Month Purchases ({compareMonthB})</span>
              <p className="text-2xl font-black text-gray-800" style={{ fontFamily: 'var(--font-heading)' }}>
                {formatCurrency(momComparisonData.totalInB)}
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-xs font-bold text-gray-400 block mb-1">Target Month Purchases ({compareMonthA})</span>
              <p className="text-2xl font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                {formatCurrency(momComparisonData.totalInA)}
              </p>
            </div>

            <div
              className={`p-5 rounded-2xl border shadow-sm ${
                momComparisonData.diffIn > 0
                  ? 'bg-red-50/70 border-red-200'
                  : momComparisonData.diffIn < 0
                  ? 'bg-emerald-50/70 border-emerald-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-600">Net Purchase Variance</span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black ${
                    momComparisonData.diffIn > 0
                      ? 'bg-red-600 text-white'
                      : momComparisonData.diffIn < 0
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-300 text-gray-700'
                  }`}
                >
                  {momComparisonData.diffIn > 0 ? (
                    <>
                      <ArrowUpRight size={12} /> +{momComparisonData.pctIn.toFixed(1)}% Surge
                    </>
                  ) : momComparisonData.diffIn < 0 ? (
                    <>
                      <ArrowDownRight size={12} /> {momComparisonData.pctIn.toFixed(1)}% Reduced
                    </>
                  ) : (
                    'No Change'
                  )}
                </span>
              </div>
              <p
                className={`text-2xl font-black ${
                  momComparisonData.diffIn > 0
                    ? 'text-red-600'
                    : momComparisonData.diffIn < 0
                    ? 'text-emerald-700'
                    : 'text-gray-700'
                }`}
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {momComparisonData.diffIn >= 0 ? '+' : ''}{formatCurrency(momComparisonData.diffIn)}
              </p>
            </div>
          </div>

          {/* Section-by-Section Comparison Table */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h4 className="text-sm font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                Category Purchases & Inflow Comparison Table
              </h4>
              <span className="text-xs text-gray-400">Comparing 7 inventory categories</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-4 py-3.5 text-right">{compareMonthB} (Prev)</th>
                    <th className="px-4 py-3.5 text-right">{compareMonthA} (Curr)</th>
                    <th className="px-4 py-3.5 text-right">Difference (৳)</th>
                    <th className="px-4 py-3.5 text-right">Variance (%)</th>
                    <th className="px-6 py-3.5">Relative Visual Comparison</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {momComparisonData.breakdown.map(b => {
                    const SecIcon = b.cat.icon;
                    const maxVal = Math.max(1, Math.max(b.inA, b.inB));
                    const pctA = (b.inA / maxVal) * 100;
                    const pctB = (b.inB / maxVal) * 100;

                    return (
                      <tr key={b.cat.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-7 h-7 rounded-lg flex items-center justify-center font-bold"
                              style={{ backgroundColor: b.cat.bg, color: b.cat.color }}
                            >
                              <SecIcon size={14} />
                            </span>
                            <div>
                              <span className="font-bold text-gray-900 block" style={{ fontFamily: 'var(--font-heading)' }}>
                                {b.cat.label}
                              </span>
                              <span className="text-[10px] text-gray-400 block line-clamp-1">{b.cat.desc}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-right font-medium text-gray-700">
                          {formatCurrency(b.inB)}
                        </td>

                        <td className="px-4 py-3.5 text-right font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                          {formatCurrency(b.inA)}
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

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* 4. CUSTOM DATE RANGE AUDIT TAB                                           */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {tab === 'custom-range' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-base font-black text-gray-900 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
              Custom Date Range Stock Audit (e.g. Feb 1-15, Last 60 Days)
            </h3>
            <p className="text-xs text-gray-500 mb-5">
              Filter and extract exact inventory additions, consumption, and purchases for custom audit windows
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
                  type="button"
                  onClick={() => {
                    const r = p.getRange();
                    setCustomStartDate(r.start);
                    setCustomEndDate(r.end);
                    setDateFilter('Custom');
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
                  onChange={e => { setCustomStartDate(e.target.value); setDateFilter('Custom'); }}
                  style={{ ...inputSt, width: 'auto' }}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-600">End Date:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={e => { setCustomEndDate(e.target.value); setDateFilter('Custom'); }}
                  style={{ ...inputSt, width: 'auto' }}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setDateFilter('Custom');
                  setTab('report');
                }}
                className="px-4 py-2 rounded-xl text-white text-xs font-bold shadow-sm"
                style={{ background: `linear-gradient(135deg, ${PZ}, ${PZD})` }}
              >
                Apply & View in Ledger
              </button>
              <button
                type="button"
                onClick={handleExportCustomRangeInventoryPDF}
                className="px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-all"
              >
                Export Custom Range PDF
              </button>
            </div>
          </div>

          {/* Quick Result Summary for Custom Range */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-xs font-bold text-gray-400 block mb-1">Purchases Cost (Period)</span>
              <p className="text-2xl font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                {formatCurrency(stockReportData.totalPurchaseCost)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Inward purchases in window</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-xs font-bold text-gray-400 block mb-1">Units Inward (Added)</span>
              <p className="text-2xl font-black text-emerald-600" style={{ fontFamily: 'var(--font-heading)' }}>
                +{formatQty(stockReportData.totalAdded)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Total physical stock in</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-xs font-bold text-gray-400 block mb-1">Units Consumed (Sold/Used)</span>
              <p className="text-2xl font-black text-rose-600" style={{ fontFamily: 'var(--font-heading)' }}>
                −{formatQty(stockReportData.totalSold)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Orders & Kitchen usage</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-xs font-bold text-gray-400 block mb-1">Waste Discarded</span>
              <p className="text-2xl font-black text-amber-600" style={{ fontFamily: 'var(--font-heading)' }}>
                {formatQty(stockReportData.totalWaste)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Spoilage / damage units</p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* 2. COMPREHENSIVE STOCK REPORT TAB                                        */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {tab === 'report' && (
        <div className="space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                Comprehensive Stock Movement Ledger Report
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Complete audit trail of total additions, sales, waste, adjustments, and current balance ({dateFilter}).
              </p>
            </div>
            <button
              onClick={handleExportStockReport}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-sm transition-transform active:scale-95"
              style={{ background: `linear-gradient(135deg, ${PZ}, ${PZD})`, fontFamily: 'var(--font-heading)' }}
            >
              <Download size={14} /> Download PDF Ledger
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200">
                    {['SKU', 'Item Name', 'Category', 'Total Inflow', 'Total Sales / Out', 'Waste', 'Audit Adj', 'Current Balance', 'Unit Cost', 'Valuation', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'var(--font-heading)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stockReportData.itemStats.map(({ item, stockInQty, stockOutQty, wasteQty, adjQty, currentStock, valuation }) => (
                    <tr key={item.id} className="hover:bg-gray-50/70">
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-mono font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                          {item.sku}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-bold text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                          {item.name}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-500">{item.category}</td>
                      <td className="px-4 py-3.5 text-xs font-extrabold text-emerald-600">
                        +{formatQty(stockInQty)} {item.unit}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-extrabold text-rose-600">
                        −{formatQty(stockOutQty)} {item.unit}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-bold text-amber-600">
                        {wasteQty > 0 ? `−${formatQty(wasteQty)} ${item.unit}` : '0'}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-bold text-indigo-600">
                        {adjQty !== 0 ? `${adjQty > 0 ? '+' : ''}${formatQty(adjQty)} ${item.unit}` : '0'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                          {formatQty(currentStock)} {item.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-gray-700">
                        {formatCurrency(item.costPrice)}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-bold text-gray-900">
                        {formatCurrency(valuation)}
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => setHistoryModalItem(item)}
                          className="px-2.5 py-1 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg flex items-center gap-1 transition-colors"
                          style={{ fontFamily: 'var(--font-heading)' }}
                        >
                          <History size={12} /> View Ledger
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* 3. STOCK IN / OUT HISTORY TAB                                            */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {tab === 'history' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Movement Filters Bar */}
          <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Filter size={14} className="text-gray-400" />
              <select
                value={movementTypeFilter}
                onChange={e => setMovementTypeFilter(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 outline-none"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                <option value="All">All Movement Types</option>
                <option value="Daily Bazar">Daily Bazar (Market Purchases)</option>
                <option value="Purchase IN">Purchase IN (Restock)</option>
                <option value="Sale OUT">Sale OUT (Order Deductions)</option>
                <option value="Usage OUT">Usage OUT (Kitchen Usage)</option>
                <option value="Adjustment">Adjustment (Audit Reconciliation)</option>
                <option value="Waste OUT">Waste OUT (Disposal)</option>
                <option value="Initial Stock">Initial Stock (Opening)</option>
                <option value="Return IN">Return IN</option>
              </select>

              <select
                value={movementItemFilter}
                onChange={e => setMovementItemFilter(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 outline-none max-w-[220px]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                <option value="All">All Inventory Products</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>

            <button
              onClick={handleExportMovements}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-gray-700 bg-gray-100 hover:bg-gray-200 text-xs font-bold border border-gray-200 shadow-xs transition-transform active:scale-95"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <Download size={13} /> Export Ledger PDF
            </button>
          </div>

          {/* Movements Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                  {['Date', 'Item Name', 'Movement Type', 'Quantity', 'Unit Cost', 'Total Cost', 'Reference / Note', 'Auditor / Source'].map(h => (
                    <th key={h} className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'var(--font-heading)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(() => {
                  const filteredMovements = movements.filter(m => {
                    const matchDate = isDateInRange(m.date);
                    const matchType = movementTypeFilter === 'All' || m.type === movementTypeFilter;
                    const matchItem = movementItemFilter === 'All' || m.itemId === movementItemFilter;
                    return matchDate && matchType && matchItem;
                  });

                  if (filteredMovements.length === 0) {
                    return (
                      <tr>
                        <td colSpan={8} className="py-16 text-center text-gray-400 text-sm">
                          <Clock size={32} className="mx-auto mb-2 text-gray-300" />
                          No stock movement transactions recorded in this period
                        </td>
                      </tr>
                    );
                  }

                  return filteredMovements.map(m => {
                    const isIn = m.type.includes('IN') || m.type === 'Initial Stock' || m.type === 'Daily Bazar';
                    const isSale = m.type === 'Sale OUT';
                    const isAdj = m.type === 'Adjustment';
                    const isWaste = m.type === 'Waste OUT';

                    return (
                      <tr key={m.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-500 font-mono font-medium">
                          {m.date}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-bold text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                            {m.itemName}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            isIn
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : isSale
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : isAdj
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : isWaste
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-gray-100 text-gray-800 border border-gray-200'
                          }`}>
                            {m.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-black" style={{
                          color: isIn ? '#16A34A' : isSale ? '#DC2626' : isAdj ? '#7C3AED' : '#D97706',
                          fontFamily: 'var(--font-heading)'
                        }}>
                          {isIn ? '+' : isSale || isWaste ? '−' : ''}{formatQty(m.quantity)}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-gray-700">
                          {m.unitPrice ? formatCurrency(m.unitPrice) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs font-black text-gray-900">
                          {m.totalCost ? formatCurrency(m.totalCost) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 max-w-sm truncate" title={m.note}>
                          {m.note || '—'}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-gray-500 font-semibold uppercase">
                          {m.performedBy || (isSale ? 'POS Order' : 'System')}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* 4. STOCK RECONCILIATION TAB                                              */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {tab === 'reconciliation' && (
        <div className="space-y-4">
          {/* Executive Header Banner */}
          <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-5 rounded-2xl text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-300 flex items-center justify-center shrink-0">
                <Scale size={22} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                  Physical Inventory Audit & Stock Reconciliation
                </h3>
                <p className="text-xs text-gray-300 mt-1">
                  Compare recorded system stock with real-world physical count (e.g. System: 70, Counted: 65 → Discrepancy: -5 Shortage). Authorized users can adjust system stock to match reality.
                </p>
              </div>
            </div>

            <div className="px-3.5 py-2 rounded-xl bg-white/10 border border-white/20 text-xs font-bold text-gray-200">
              Active Session: <span className="uppercase text-white font-extrabold">{adminRole}</span>
            </div>
          </div>

          {/* Reconciliation Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200">
                    {['Product & SKU', 'Unit Cost', 'System Stock', 'Physical Count', 'Variance', 'Cost Impact', 'Discrepancy Reason', 'Action'].map(h => (
                      <th key={h} className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'var(--font-heading)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map(item => {
                    const physicalInput = physicalCounts[item.id];
                    const systemStock = item.currentStock || 0;
                    const physicalStock = physicalInput !== undefined ? physicalInput : systemStock;
                    const diff = physicalStock - systemStock;
                    const valueDiff = diff * (item.costPrice || 0);

                    return (
                      <tr key={item.id} className="hover:bg-purple-50/20 transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="text-xs font-bold text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                            {item.name}
                          </p>
                          <span className="text-[11px] font-mono text-gray-400">{item.sku} • {item.unit}</span>
                        </td>
                        <td className="px-4 py-3.5 text-xs font-bold text-gray-700">
                          {formatCurrency(item.costPrice)}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-900 font-black text-xs" style={{ fontFamily: 'var(--font-heading)' }}>
                            {formatQty(systemStock)} {item.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 w-32">
                            <input
                              type="number"
                              min={0}
                              value={physicalStock}
                              onChange={e => {
                                const val = Number(e.target.value);
                                setPhysicalCounts(prev => ({ ...prev, [item.id]: isNaN(val) ? 0 : val }));
                              }}
                              className="w-20 px-2.5 py-1 rounded-lg border border-gray-300 text-xs font-bold text-gray-900 outline-none text-center bg-white shadow-xs focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                            />
                            <span className="text-xs text-gray-400 font-medium">{item.unit}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                            diff < 0
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : diff > 0
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`} style={{ fontFamily: 'var(--font-heading)' }}>
                            {diff > 0 ? `+${formatQty(diff)}` : diff < 0 ? `${formatQty(diff)}` : '0'} {item.unit}
                            {diff < 0 ? ' (Shortage)' : diff > 0 ? ' (Surplus)' : ' (Match)'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs font-black" style={{
                          color: diff < 0 ? '#DC2626' : diff > 0 ? '#16A34A' : '#6B7280',
                          fontFamily: 'var(--font-heading)'
                        }}>
                          {diff !== 0 ? `${diff > 0 ? '+' : ''}${formatCurrency(valueDiff)}` : '—'}
                        </td>
                        <td className="px-4 py-3.5">
                          <select
                            disabled={diff === 0}
                            value={reconcileReasons[item.id] || 'Physical Count Discrepancy'}
                            onChange={e => setReconcileReasons(prev => ({ ...prev, [item.id]: e.target.value }))}
                            className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg outline-none bg-white text-gray-700 max-w-[220px] disabled:opacity-40"
                          >
                            <option value="Physical Count Discrepancy">Physical Count Mismatch</option>
                            <option value="Damaged / Expired Goods">Damaged / Expired Goods</option>
                            <option value="Kitchen Waste / Spillage">Kitchen Waste / Spillage</option>
                            <option value="Theft / Inventory Shrinkage">Theft / Shrinkage</option>
                            <option value="Surplus Stock Discovered">Surplus Stock Discovered</option>
                            <option value="System Data Entry Error">System Data Correction</option>
                          </select>
                        </td>
                        <td className="px-4 py-3.5">
                          <button
                            disabled={diff === 0}
                            onClick={() => initiateReconciliation(item)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all shadow-xs disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-95 active:scale-95"
                            style={{
                              background: diff === 0 ? '#9CA3AF' : `linear-gradient(135deg, #7C3AED, #6D28D9)`,
                              fontFamily: 'var(--font-heading)'
                            }}
                          >
                            Reconcile
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Past Reconciliation Audit History */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5" style={{ fontFamily: 'var(--font-heading)' }}>
              <History size={14} /> Audit Adjustment Log
            </h4>

            {pastReconciliations.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No reconciliation audits recorded yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] uppercase font-bold text-gray-400">
                      <th className="py-2.5">Date</th>
                      <th className="py-2.5">Item Name</th>
                      <th className="py-2.5">Variance</th>
                      <th className="py-2.5">Financial Impact</th>
                      <th className="py-2.5">Audit Reason & Notes</th>
                      <th className="py-2.5">Auditor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pastReconciliations.slice(0, 10).map(m => (
                      <tr key={m.id} className="text-xs">
                        <td className="py-2.5 text-gray-500 font-mono">{m.date}</td>
                        <td className="py-2.5 font-bold text-gray-900">{m.itemName}</td>
                        <td className="py-2.5 font-black text-purple-700">
                          {m.difference !== undefined ? `${m.difference > 0 ? '+' : ''}${formatQty(m.difference)}` : formatQty(m.quantity)}
                        </td>
                        <td className="py-2.5 font-semibold text-gray-700">
                          {m.totalCost ? formatCurrency(m.totalCost) : '—'}
                        </td>
                        <td className="py-2.5 text-gray-600 max-w-sm truncate">{m.note}</td>
                        <td className="py-2.5 text-gray-500 font-semibold uppercase text-[10px]">{m.performedBy || 'admin'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* 5. LOW STOCK ALERTS TAB                                                  */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {tab === 'alerts' && (
        <div className="space-y-4">
          {lowStock.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-5 border border-red-200">
              <h3 className="flex items-center gap-2 mb-4 font-bold text-sm text-red-600" style={{ fontFamily: 'var(--font-heading)' }}>
                <AlertTriangle size={16} /> Low Stock & Reorder Required ({lowStock.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {lowStock.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-red-50/50 border border-red-100">
                    <div>
                      <p className="font-bold text-xs text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>{item.name}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Supplier: {item.supplier || 'N/A'} • SKU: {item.sku}</p>
                      <p className="text-[11px] text-gray-400">Min Threshold: {formatQty(item.minStock)} {item.unit}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1.5">
                      <span className="text-base font-black text-red-600" style={{ fontFamily: 'var(--font-heading)' }}>
                        {formatQty(item.currentStock)} {item.unit}
                      </span>
                      <button
                        onClick={() => openStockInForItem(item)}
                        className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1 shadow-xs transition-transform active:scale-95"
                        style={{ fontFamily: 'var(--font-heading)' }}
                      >
                        <TrendingUp size={12} /> Restock
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm p-14 text-center border border-gray-200">
              <Package size={44} className="mx-auto mb-3 text-emerald-400" />
              <p className="text-gray-900 text-base font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
                All stock levels are optimal!
              </p>
              <p className="text-gray-400 text-xs mt-1">Every inventory product is currently above its minimum safety threshold.</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 0: DAILY BAZAR ENTRY MODAL                                         */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {showBazarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl bg-white border border-gray-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-linear-to-r from-red-600 via-rose-600 to-amber-600 text-white rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-inner flex-shrink-0">
                  <ShoppingCart size={20} />
                </div>
                <div>
                  <h2 className="text-base font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                    Record Daily Bazar Purchase
                  </h2>
                  <p className="text-[11px] text-red-100 mt-0.5">
                    Entries log market receipts individually while automatically accumulating master store stock.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBazarModal(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveBazarEntry} className="p-5 sm:p-6 space-y-4">
              {/* Date Selector Row */}
              <div className="bg-gray-50/80 p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 shadow-2xs">
                      <CalendarDays size={13} />
                    </div>
                    <span className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1" style={{ fontFamily: 'var(--font-heading)' }}>
                      Bazar / Purchase Date <span className="text-red-500">*</span>
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-gray-500 bg-white px-2 py-0.5 rounded-md border border-gray-200">
                    {formatBazarDate(bazarForm.date)}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <div className="inline-flex rounded-xl bg-white p-1 border border-gray-200 shadow-2xs flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setBazarForm(f => ({ ...f, date: todayStr }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        bazarForm.date === todayStr
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setBazarForm(f => ({ ...f, date: yesterdayStr }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        bazarForm.date === yesterdayStr
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      Yesterday
                    </button>
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <input
                      type="date"
                      value={bazarForm.date}
                      onChange={e => setBazarForm(f => ({ ...f, date: e.target.value }))}
                      style={{ ...inputSt, padding: '7px 12px', fontSize: '12px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Mode Toggle: New Product (First) vs Existing Item (Second) */}
              <div>
                <label style={{ ...labelSt, marginBottom: '6px' }}>
                  Select Product / Item Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1.5 rounded-2xl border border-gray-200/80">
                  {/* 1. + New Product / Supply FIRST */}
                  <button
                    type="button"
                    onClick={() => {
                      setBazarForm(f => ({
                        ...f,
                        isNewItem: true,
                        itemId: '',
                        name: '',
                        category: 'Raw Materials & Ingredients',
                        unit: 'Kg',
                        unitPrice: '',
                        totalCost: '',
                        sellingPrice: '',
                        supplier: ''
                      }));
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                      bazarForm.isNewItem
                        ? 'bg-white text-red-600 shadow-sm border border-red-100'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    <Plus size={14} className={bazarForm.isNewItem ? 'text-red-600' : 'text-gray-400'} />
                    + New Product / Supply
                  </button>

                  {/* 2. Existing Store Item (Add Stock) SECOND */}
                  <button
                    type="button"
                    onClick={() => {
                      const first = items[0];
                      setBazarForm(f => ({
                        ...f,
                        isNewItem: false,
                        itemId: first?.id || '',
                        name: first?.name || '',
                        category: first?.category || 'Raw Materials & Ingredients',
                        unit: first?.unit || 'Kg',
                        unitPrice: first?.lastPurchasePrice || first?.costPrice || '',
                        sellingPrice: first?.sellingPrice || '',
                        supplier: first?.supplier || '',
                        totalCost: (parseFloat(String(f.quantity)) || 0) * (first?.lastPurchasePrice || first?.costPrice || 0) || ''
                      }));
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                      !bazarForm.isNewItem
                        ? 'bg-white text-red-600 shadow-sm border border-red-100'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    <Package size={14} className={!bazarForm.isNewItem ? 'text-red-600' : 'text-gray-400'} />
                    Existing Store Item (Add Stock)
                  </button>
                </div>
              </div>

              {/* Item Details Block */}
              {!bazarForm.isNewItem ? (
                <div>
                  <label style={labelSt}>
                    Choose Existing Inventory Item <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={bazarForm.itemId}
                    onChange={e => {
                      const selId = e.target.value;
                      const it = items.find(i => i.id === selId);
                      if (it) {
                        const qtyNum = parseFloat(String(bazarForm.quantity)) || 0;
                        const cost = it.lastPurchasePrice || it.costPrice || 0;
                        setBazarForm(f => ({
                          ...f,
                          itemId: it.id,
                          name: it.name,
                          category: it.category,
                          unit: it.unit,
                          unitPrice: cost || '',
                          sellingPrice: it.sellingPrice || '',
                          supplier: it.supplier || f.supplier,
                          totalCost: qtyNum && cost ? Math.round(qtyNum * cost) : f.totalCost
                        }));
                      }
                    }}
                    style={inputSt}
                  >
                    <option value="">-- Select Product from Inventory --</option>
                    {items.map(it => (
                      <option key={it.id} value={it.id}>
                        {it.name} [{it.category}] • Current Stock: {formatQty(it.currentStock)} {it.unit}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label style={labelSt}>
                      New Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mineral Water 500ml, Chicken Breast, Mozzarella"
                      value={bazarForm.name}
                      onChange={e => setBazarForm(f => ({ ...f, name: e.target.value }))}
                      style={inputSt}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label style={labelSt}>Category / Type <span className="text-red-500">*</span></label>
                      <select
                        value={bazarForm.category}
                        onChange={e => setBazarForm(f => ({ ...f, category: e.target.value }))}
                        style={inputSt}
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelSt}>Measurement Unit <span className="text-red-500">*</span></label>
                      <select
                        value={bazarForm.unit}
                        onChange={e => setBazarForm(f => ({ ...f, unit: e.target.value }))}
                        style={inputSt}
                      >
                        {['Kg', 'Gram', 'Litre', 'Bottle', 'Can', 'Packet', 'Box', 'Pcs', 'Dozen', 'Bag', 'Roll', 'Jar'].map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Live Cumulative Stock Preview Badge */}
              {(() => {
                const target = !bazarForm.isNewItem && bazarForm.itemId ? items.find(i => i.id === bazarForm.itemId) : null;
                const qtyVal = parseFloat(String(bazarForm.quantity)) || 0;
                if (!target && !bazarForm.name) return null;
                const cur = target ? (target.currentStock || 0) : 0;
                const next = cur + qtyVal;
                const u = target ? target.unit : bazarForm.unit;
                return (
                  <div className="p-3 rounded-2xl bg-blue-50/80 border border-blue-200/80 flex items-center justify-between text-xs animate-fade-in">
                    <div>
                      <span className="text-blue-900 font-bold flex items-center gap-1.5">
                        <TrendingUp size={14} className="text-blue-600" /> Live Stock Accumulation Preview:
                      </span>
                      <span className="text-blue-700 text-[11px]">
                        {target ? (
                          <>Store Stock: <strong>{formatQty(cur)} {u}</strong> + Today's Bazar: <strong>+{qtyVal} {u}</strong></>
                        ) : (
                          <>Initial Master Stock will start at <strong>+{qtyVal} {u}</strong></>
                        )}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-blue-500 block">Total After Purchase</span>
                      <span className="text-base font-black text-blue-900" style={{ fontFamily: 'var(--font-heading)' }}>
                        {formatQty(next)} {u}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Quantity, Unit Cost & Total Cost (Bi-directional) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label style={labelSt}>
                    Quantity ({bazarForm.unit}) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    placeholder="e.g. 100"
                    value={bazarForm.quantity}
                    onChange={e => {
                      const q = e.target.value;
                      const qNum = parseFloat(q);
                      setBazarForm(f => {
                        const uNum = parseFloat(String(f.unitPrice));
                        const tNum = parseFloat(String(f.totalCost));
                        let newTotal = f.totalCost;
                        if (!isNaN(qNum) && qNum > 0 && !isNaN(uNum) && uNum > 0) {
                          newTotal = Math.round(qNum * uNum);
                        } else if (!isNaN(qNum) && qNum > 0 && isNaN(uNum) && !isNaN(tNum) && tNum > 0) {
                          // calculate unit price if total cost is present
                          return { ...f, quantity: q, unitPrice: (tNum / qNum).toFixed(2) };
                        }
                        return { ...f, quantity: q, totalCost: newTotal };
                      });
                    }}
                    style={inputSt}
                  />
                </div>

                <div>
                  <label style={labelSt}>
                    Unit Cost Price (৳/{bazarForm.unit}) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 15"
                    value={bazarForm.unitPrice}
                    onChange={e => {
                      const u = e.target.value;
                      const uNum = parseFloat(u);
                      setBazarForm(f => {
                        const qNum = parseFloat(String(f.quantity));
                        const newTotal = !isNaN(qNum) && qNum > 0 && !isNaN(uNum) ? Math.round(qNum * uNum) : f.totalCost;
                        return { ...f, unitPrice: u, totalCost: newTotal };
                      });
                    }}
                    style={inputSt}
                  />
                </div>

                <div>
                  <label style={labelSt}>
                    Total Bill Paid (৳ Total) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 1500"
                    value={bazarForm.totalCost}
                    onChange={e => {
                      const t = e.target.value;
                      const tNum = parseFloat(t);
                      setBazarForm(f => {
                        const qNum = parseFloat(String(f.quantity));
                        const newUnit = !isNaN(qNum) && qNum > 0 && !isNaN(tNum) ? (tNum / qNum).toFixed(2) : f.unitPrice;
                        return { ...f, totalCost: t, unitPrice: newUnit };
                      });
                    }}
                    style={{ ...inputSt, fontWeight: 'bold', color: '#B91C1C' }}
                  />
                </div>
              </div>

              {/* Selling Price (Optional) & Supplier / Vendor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label style={labelSt}>
                    Selling / Retail Price (৳ Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 25 (if sold to customer)"
                    value={bazarForm.sellingPrice}
                    onChange={e => setBazarForm(f => ({ ...f, sellingPrice: e.target.value }))}
                    style={inputSt}
                  />
                  {(() => {
                    const cost = parseFloat(String(bazarForm.unitPrice)) || 0;
                    const sell = parseFloat(String(bazarForm.sellingPrice)) || 0;
                    if (cost > 0 && sell > 0) {
                      const margin = ((sell - cost) / sell) * 100;
                      return (
                        <p className="text-[11px] font-bold text-emerald-600 mt-1">
                          Margin: ৳{(sell - cost).toFixed(2)} ({margin.toFixed(1)}%)
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div>
                  <label style={labelSt}>
                    Vendor / Market Source
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Karwan Bazar, Local Vendor, Akij Food Ltd"
                    value={bazarForm.supplier}
                    onChange={e => setBazarForm(f => ({ ...f, supplier: e.target.value }))}
                    style={inputSt}
                  />
                </div>
              </div>

              {/* Notes / Receipt Ref */}
              <div>
                <label style={labelSt}>
                  Notes / Receipt Voucher # (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Morning fresh batch, Bazar Cash Voucher #482"
                  value={bazarForm.note}
                  onChange={e => setBazarForm(f => ({ ...f, note: e.target.value }))}
                  style={inputSt}
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowBazarModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-linear-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-md flex items-center gap-2 transition-transform active:scale-95"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  <Check size={14} />
                  Save Bazar Entry & Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: ADD / EDIT PRODUCT                                              */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl bg-white border border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-linear-to-r from-red-50/50 to-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs" style={{ background: `linear-gradient(135deg, ${PZ}, ${PZD})` }}>
                  <Package size={18} />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                    {editing ? 'Edit Inventory Item' : 'Add New Inventory Product'}
                  </h2>
                  <p className="text-[11px] text-gray-500">Quickly add item name, auto-generate SKU, set category, purchase & selling price, stock quantity</p>
                </div>
              </div>
              <button
                onClick={() => { setShowForm(false); setEditing(null); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Fields */}
            <div className="p-5 space-y-4">
              {/* Row 1: Product Name & Auto SKU */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label style={labelSt}>
                    Product / Item Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mineral Water 500ml, 10&quot; Pizza Box, Mozzarella"
                    value={form.name}
                    onChange={e => {
                      const val = e.target.value;
                      setForm(f => {
                        const updated = { ...f, name: val };
                        if (!skuManuallyEdited) {
                          updated.sku = generateSkuFromName(val, f.category);
                        }
                        // Auto-match menu item if name matches
                        const matchedMenu = state.menuItems?.find(m => m.name.toLowerCase() === val.trim().toLowerCase());
                        if (matchedMenu && !f.menuItemId) {
                          updated.menuItemId = matchedMenu.id;
                        }
                        return updated;
                      });
                    }}
                    style={inputSt}
                    autoFocus
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label style={{ ...labelSt, marginBottom: 0 }}>
                      SKU Code <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setSkuManuallyEdited(false);
                        const autoSku = generateSkuFromName(form.name || 'ITEM', form.category);
                        setForm(f => ({ ...f, sku: autoSku }));
                      }}
                      className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors"
                      title="Generate SKU automatically from product name"
                    >
                      <Zap size={11} /> Auto Generate
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. WAT-001"
                      value={form.sku}
                      onChange={e => {
                        setSkuManuallyEdited(true);
                        setForm(f => ({ ...f, sku: e.target.value.toUpperCase() }));
                      }}
                      style={{ ...inputSt, fontFamily: 'monospace', fontWeight: 600, letterSpacing: '0.05em' }}
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Category (with Custom Category Add) & Unit of Measure */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label style={{ ...labelSt, marginBottom: 0 }}>
                      Category / Item Type <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddCategoryInput(!showAddCategoryInput)}
                      className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-0.5 transition-colors"
                    >
                      <Plus size={12} /> {showAddCategoryInput ? 'Existing Categories' : 'Custom Category'}
                    </button>
                  </div>
                  {showAddCategoryInput ? (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Type custom category name..."
                        value={newCategoryInput}
                        onChange={e => setNewCategoryInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newCategoryInput.trim()) {
                              const cat = newCategoryInput.trim();
                              setCustomCategories(prev => prev.includes(cat) ? prev : [...prev, cat]);
                              setForm(f => ({ ...f, category: cat }));
                              setNewCategoryInput('');
                              setShowAddCategoryInput(false);
                            }
                          }
                        }}
                        style={inputSt}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newCategoryInput.trim()) {
                            const cat = newCategoryInput.trim();
                            setCustomCategories(prev => prev.includes(cat) ? prev : [...prev, cat]);
                            setForm(f => ({ ...f, category: cat }));
                            setNewCategoryInput('');
                            setShowAddCategoryInput(false);
                          }
                        }}
                        className="px-3.5 py-1.5 rounded-xl text-white font-bold text-xs shadow-xs hover:opacity-90 flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${PZ}, ${PZD})` }}
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <select
                      value={form.category}
                      onChange={e => {
                        const newCat = e.target.value;
                        setForm(f => {
                          const updated = { ...f, category: newCat };
                          if (!skuManuallyEdited && form.name) {
                            updated.sku = generateSkuFromName(form.name, newCat);
                          }
                          return updated;
                        });
                      }}
                      style={inputSt}
                    >
                      {allCategories.map(c => (
                        <option key={c} value={c}>
                          {c} {customCategories.includes(c) ? '(Custom)' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label style={labelSt}>
                    Unit of Measure <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.unit}
                    onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    style={inputSt}
                  >
                    {UNITS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Purchase Price & Selling / Retail Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label style={labelSt}>
                    Purchase Price (৳/unit) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">৳</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={form.costPrice || ''}
                      onChange={e => setForm(f => ({ ...f, costPrice: Number(e.target.value) }))}
                      style={{ ...inputSt, paddingLeft: '28px', fontWeight: 600 }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 block">Cost paid per single unit</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label style={{ ...labelSt, marginBottom: 0 }}>
                      Selling / Retail Price (৳/unit)
                    </label>
                    {Number(form.sellingPrice) > 0 && Number(form.costPrice) > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        Number(form.sellingPrice) >= Number(form.costPrice)
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {Number(form.sellingPrice) >= Number(form.costPrice)
                          ? `+৳${(Number(form.sellingPrice) - Number(form.costPrice)).toFixed(1)} (+${(((Number(form.sellingPrice) - Number(form.costPrice)) / Number(form.costPrice)) * 100).toFixed(0)}% profit)`
                          : `-৳${(Number(form.costPrice) - Number(form.sellingPrice)).toFixed(1)} loss`
                        }
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-sm">৳</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0 (e.g. 25, 30 for retail resale)"
                      value={form.sellingPrice || ''}
                      onChange={e => setForm(f => ({ ...f, sellingPrice: Number(e.target.value) }))}
                      style={{ ...inputSt, paddingLeft: '28px', fontWeight: 600, borderColor: Number(form.sellingPrice) > 0 ? '#10B981' : undefined }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 block">Customer retail price · Leave 0 for raw ingredients</span>
                </div>
              </div>

              {/* Row 4: Stock Quantity on Hand & Supplier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200">
                  <div className="flex items-center justify-between mb-1">
                    <label style={{ ...labelSt, color: '#047857', marginBottom: 0 }}>
                      {editing ? 'Current Stock on Hand' : 'Initial Stock Quantity'} <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {form.unit || 'Units'}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 100"
                    value={form.initialStock !== undefined && form.initialStock !== 0 ? form.initialStock : (form.initialStock === 0 ? '' : form.initialStock)}
                    onChange={e => {
                      const qty = e.target.value === '' ? 0 : Number(e.target.value);
                      setForm(f => ({ ...f, initialStock: qty, currentStock: qty }));
                    }}
                    style={{ ...inputSt, borderColor: '#A7F3D0', fontWeight: 'bold', fontSize: '15px' }}
                  />
                  <div className="flex items-center justify-between text-[11px] text-emerald-800 font-medium mt-1.5">
                    <span>Stock Asset Value (Cost):</span>
                    <span className="font-extrabold font-mono text-emerald-900">
                      ৳{((Number(form.initialStock) || 0) * (Number(form.costPrice) || 0)).toLocaleString()}
                    </span>
                  </div>
                  {Number(form.sellingPrice) > 0 && (
                    <div className="flex items-center justify-between text-[11px] text-emerald-700 font-medium mt-0.5">
                      <span>Retail Sales Value:</span>
                      <span className="font-extrabold font-mono text-emerald-800">
                        ৳{((Number(form.initialStock) || 0) * (Number(form.sellingPrice) || 0)).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label style={labelSt}>Supplier / Vendor</label>
                  <input
                    type="text"
                    placeholder="e.g. Akij Beverage, Bismillah Store, Dhaka Market"
                    value={form.supplier}
                    onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
                    style={inputSt}
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">Vendor or company name item is procured from</span>
                </div>
              </div>

              {/* Row 5: Link to POS Menu Item (Optional) */}
              <div>
                <label style={labelSt}>Link to POS Menu Item (Optional)</label>
                <select
                  value={form.menuItemId || ''}
                  onChange={e => {
                    const selectedId = e.target.value;
                    setForm(f => {
                      const updated = { ...f, menuItemId: selectedId };
                      if (selectedId && (!f.sellingPrice || f.sellingPrice === 0)) {
                        const m = state.menuItems?.find(item => item.id === selectedId);
                        if (m && m.price) {
                          updated.sellingPrice = m.price;
                        }
                      }
                      return updated;
                    });
                  }}
                  style={inputSt}
                >
                  <option value="">None / Standalone Raw Material</option>
                  {state.menuItems?.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.category} · ৳{m.price})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-gray-400 mt-1 block">Connects to POS sales for real-time stock deduction</span>
              </div>

              {/* Row 5: Capacity, Safety Threshold & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label style={labelSt}>Minimum Safety Stock</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="10"
                    value={form.minStock}
                    onChange={e => setForm(f => ({ ...f, minStock: Number(e.target.value) }))}
                    style={inputSt}
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">Alerts when low</span>
                </div>

                <div>
                  <label style={labelSt}>Maximum Storage Capacity</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="100"
                    value={form.maxStock}
                    onChange={e => setForm(f => ({ ...f, maxStock: Number(e.target.value) }))}
                    style={inputSt}
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">Full shelf limit</span>
                </div>

                <div>
                  <label style={labelSt}>Entry Date</label>
                  <input
                    type="date"
                    value={form.addedDate}
                    onChange={e => setForm(f => ({ ...f, addedDate: e.target.value }))}
                    style={inputSt}
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">Stock record date</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50/70">
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditing(null); }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!form.name.trim() || !form.sku.trim()}
                className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold shadow-sm transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                style={{ background: `linear-gradient(135deg, ${PZ}, ${PZD})`, fontFamily: 'var(--font-heading)' }}
              >
                <Save size={14} />
                {editing ? 'Update Inventory Item' : 'Save Product & Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: QUICK RESTOCK / PURCHASE IN                                     */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {showStockInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl shadow-2xl bg-white border border-gray-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-600 text-white">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                    Stock In / Restock Product
                  </h3>
                  <p className="text-[11px] text-gray-500">Record incoming stock purchase with cost and supplier</p>
                </div>
              </div>
              <button onClick={() => setShowStockInModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-400">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRecordStockIn} className="p-5 space-y-3.5">
              <div>
                <label style={labelSt}>Select Product *</label>
                <select
                  value={stockInForm.itemId}
                  onChange={e => {
                    const selItem = items.find(i => i.id === e.target.value);
                    setStockInForm(f => ({
                      ...f,
                      itemId: e.target.value,
                      purchasePrice: selItem ? String(selItem.costPrice || '') : f.purchasePrice,
                      supplier: selItem ? (selItem.supplier || '') : f.supplier
                    }));
                  }}
                  style={inputSt}
                  required
                >
                  <option value="">— Select Product —</option>
                  {items.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.name} (Current: {formatQty(i.currentStock)} {i.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelSt}>Purchase Date *</label>
                  <input
                    type="date"
                    value={stockInForm.date}
                    onChange={e => setStockInForm(f => ({ ...f, date: e.target.value }))}
                    style={inputSt}
                    required
                  />
                </div>

                <div>
                  <label style={labelSt}>Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 100"
                    value={stockInForm.quantity}
                    onChange={e => setStockInForm(f => ({ ...f, quantity: e.target.value }))}
                    style={inputSt}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelSt}>Purchase Price (৳/unit) *</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={stockInForm.purchasePrice}
                    onChange={e => setStockInForm(f => ({ ...f, purchasePrice: e.target.value }))}
                    style={inputSt}
                    required
                  />
                </div>

                <div>
                  <label style={labelSt}>Supplier / Vendor</label>
                  <input
                    type="text"
                    placeholder="Supplier name"
                    value={stockInForm.supplier}
                    onChange={e => setStockInForm(f => ({ ...f, supplier: e.target.value }))}
                    style={inputSt}
                  />
                </div>
              </div>

              <div>
                <label style={labelSt}>Invoice # / Memo Reference</label>
                <input
                  type="text"
                  placeholder="e.g. INV-2026-904"
                  value={stockInForm.note}
                  onChange={e => setStockInForm(f => ({ ...f, note: e.target.value }))}
                  style={inputSt}
                />
              </div>

              {Number(stockInForm.quantity) > 0 && Number(stockInForm.purchasePrice) > 0 && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800">Total Purchase Cost:</span>
                  <span className="text-sm font-black text-emerald-700" style={{ fontFamily: 'var(--font-heading)' }}>
                    {formatCurrency(Number(stockInForm.quantity) * Number(stockInForm.purchasePrice))}
                  </span>
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowStockInModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-100"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-transform active:scale-95"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Confirm Stock In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 3: MANUAL STOCK OUT / KITCHEN USAGE                                */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {showStockOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl shadow-2xl bg-white border border-gray-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-600 text-white">
                  <TrendingDown size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                    Stock Out / Record Kitchen Usage
                  </h3>
                  <p className="text-[11px] text-gray-500">Record manual consumption, kitchen transfer, or damage</p>
                </div>
              </div>
              <button onClick={() => setShowStockOutModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-400">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRecordStockOut} className="p-5 space-y-3.5">
              <div>
                <label style={labelSt}>Select Product *</label>
                <select
                  value={stockOutForm.itemId}
                  onChange={e => setStockOutForm(f => ({ ...f, itemId: e.target.value }))}
                  style={inputSt}
                  required
                >
                  <option value="">— Select Product —</option>
                  {items.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.name} (Current: {formatQty(i.currentStock)} {i.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelSt}>Date *</label>
                  <input
                    type="date"
                    value={stockOutForm.date}
                    onChange={e => setStockOutForm(f => ({ ...f, date: e.target.value }))}
                    style={inputSt}
                    required
                  />
                </div>

                <div>
                  <label style={labelSt}>Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 5"
                    value={stockOutForm.quantity}
                    onChange={e => setStockOutForm(f => ({ ...f, quantity: e.target.value }))}
                    style={inputSt}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={labelSt}>Usage Reason *</label>
                <select
                  value={stockOutForm.reason}
                  onChange={e => setStockOutForm(f => ({ ...f, reason: e.target.value }))}
                  style={inputSt}
                >
                  <option value="Kitchen Usage">Kitchen Preparation / Usage</option>
                  <option value="Damaged / Spoiled">Damaged or Expired Stock</option>
                  <option value="Staff Consumption">Staff Meal / Tasting</option>
                  <option value="Vendor Return">Returned to Vendor</option>
                  <option value="Internal Transfer">Internal Transfer / Banquet</option>
                </select>
              </div>

              <div>
                <label style={labelSt}>Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Prep shift for 100 pizzas"
                  value={stockOutForm.note}
                  onChange={e => setStockOutForm(f => ({ ...f, note: e.target.value }))}
                  style={inputSt}
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowStockOutModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-100"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold bg-amber-600 hover:bg-amber-700 shadow-sm transition-transform active:scale-95"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Confirm Stock Out
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 4: PRODUCT COMPLETE AUDIT LEDGER / HISTORY                         */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {historyModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl bg-white border border-gray-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white bg-purple-600 shadow-sm">
                  <History size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                    {historyModalItem.name} — Audit Ledger
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    SKU: {historyModalItem.sku} • Category: {historyModalItem.category} • Cost: {formatCurrency(historyModalItem.costPrice)}{historyModalItem.sellingPrice && historyModalItem.sellingPrice > 0 ? ` • Sell: ${formatCurrency(historyModalItem.sellingPrice)}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportProductLedger(historyModalItem)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-purple-700 bg-white border border-purple-200 hover:bg-purple-50 flex items-center gap-1 shadow-xs"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  <Download size={13} /> Export PDF
                </button>
                <button onClick={() => setHistoryModalItem(null)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-400">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Product Summary Header Card */}
            <div className="p-5 grid grid-cols-2 sm:grid-cols-5 gap-3 bg-gray-50/40 border-b border-gray-100">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold">Current Stock</span>
                <p className="text-base font-black text-emerald-600" style={{ fontFamily: 'var(--font-heading)' }}>
                  {formatQty(historyModalItem.currentStock)} {historyModalItem.unit}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold">Unit Cost Price</span>
                <p className="text-base font-bold text-gray-800" style={{ fontFamily: 'var(--font-heading)' }}>
                  {formatCurrency(historyModalItem.costPrice)}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold">Unit Selling Price</span>
                <p className={`text-base font-bold ${historyModalItem.sellingPrice && historyModalItem.sellingPrice > 0 ? 'text-emerald-700' : 'text-gray-400 italic'}`} style={{ fontFamily: 'var(--font-heading)' }}>
                  {historyModalItem.sellingPrice && historyModalItem.sellingPrice > 0 ? formatCurrency(historyModalItem.sellingPrice) : 'N/A'}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold">Total Valuation</span>
                <p className="text-base font-bold text-indigo-700" style={{ fontFamily: 'var(--font-heading)' }}>
                  {formatCurrency((historyModalItem.currentStock || 0) * (historyModalItem.costPrice || 0))}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold">Supplier</span>
                <p className="text-xs font-semibold text-gray-700 truncate">
                  {historyModalItem.supplier || 'N/A'}
                </p>
              </div>
            </div>

            {/* Complete Transaction Table */}
            <div className="p-5">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                Transaction & Movement History
              </h4>

              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200">
                      <th className="px-3.5 py-2.5 text-[10px] uppercase font-bold text-gray-500">Date</th>
                      <th className="px-3.5 py-2.5 text-[10px] uppercase font-bold text-gray-500">Event Type</th>
                      <th className="px-3.5 py-2.5 text-[10px] uppercase font-bold text-gray-500">Change</th>
                      <th className="px-3.5 py-2.5 text-[10px] uppercase font-bold text-gray-500">Unit Cost</th>
                      <th className="px-3.5 py-2.5 text-[10px] uppercase font-bold text-gray-500">Total ৳</th>
                      <th className="px-3.5 py-2.5 text-[10px] uppercase font-bold text-gray-500">Reference / Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(() => {
                      const itemMovements = movements.filter(m => m.itemId === historyModalItem.id);
                      if (itemMovements.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-gray-400">
                              No prior transactions recorded for this item
                            </td>
                          </tr>
                        );
                      }

                      return itemMovements.map(m => {
                        const isIn = m.type.includes('IN') || m.type === 'Initial Stock' || m.type === 'Daily Bazar';
                        const isSale = m.type === 'Sale OUT';

                        return (
                          <tr key={m.id} className="hover:bg-gray-50">
                            <td className="px-3.5 py-2.5 text-gray-500 font-mono">{m.date}</td>
                            <td className="px-3.5 py-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isIn ? 'bg-emerald-100 text-emerald-800' : isSale ? 'bg-rose-100 text-rose-800' : 'bg-purple-100 text-purple-800'
                              }`}>
                                {m.type}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 font-black" style={{
                              color: isIn ? '#16A34A' : isSale ? '#DC2626' : '#7C3AED',
                              fontFamily: 'var(--font-heading)'
                            }}>
                              {isIn ? '+' : isSale ? '−' : ''}{formatQty(m.quantity)} {historyModalItem.unit}
                            </td>
                            <td className="px-3.5 py-2.5 font-medium text-gray-700">
                              {m.unitPrice ? formatCurrency(m.unitPrice) : '—'}
                            </td>
                            <td className="px-3.5 py-2.5 font-bold text-gray-900">
                              {m.totalCost ? formatCurrency(m.totalCost) : '—'}
                            </td>
                            <td className="px-3.5 py-2.5 text-gray-600 text-[11px]">
                              {m.note || '—'}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 5: RECONCILIATION CONFIRMATION MODAL                               */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {reconcileConfirm.isOpen && reconcileConfirm.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl shadow-2xl bg-white border border-gray-200 p-5 space-y-4">
            <div className="flex items-center gap-3 text-purple-900">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Scale size={20} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold" style={{ fontFamily: 'var(--font-heading)' }}>
                  Confirm Stock Reconciliation
                </h3>
                <p className="text-[11px] text-gray-500">Apply physical count adjustment to system inventory</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Item:</span>
                <span className="font-bold text-gray-900">{reconcileConfirm.item.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Recorded System Stock:</span>
                <span className="font-bold text-gray-700">{formatQty(reconcileConfirm.systemStock)} {reconcileConfirm.item.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Physical Audited Count:</span>
                <span className="font-extrabold text-purple-700">{formatQty(reconcileConfirm.physicalStock)} {reconcileConfirm.item.unit}</span>
              </div>
              <div className="flex justify-between border-t border-purple-200/60 pt-2">
                <span className="text-gray-600 font-bold">Variance:</span>
                <span className={`font-black ${reconcileConfirm.difference < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {reconcileConfirm.difference > 0 ? '+' : ''}{formatQty(reconcileConfirm.difference)} {reconcileConfirm.item.unit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-bold">Financial Impact:</span>
                <span className={`font-black ${reconcileConfirm.valueDiff < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {reconcileConfirm.valueDiff > 0 ? '+' : ''}{formatCurrency(reconcileConfirm.valueDiff)}
                </span>
              </div>
              <div className="border-t border-purple-200/60 pt-2 text-gray-600">
                <span className="font-bold block text-[11px]">Audit Reason:</span>
                <span className="text-[11px] text-gray-800 font-medium">{reconcileConfirm.reason}</span>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setReconcileConfirm(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-100"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Cancel
              </button>
              <button
                onClick={executeReconciliation}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 shadow-sm transition-transform active:scale-95"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Confirm Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 6: CATEGORY QUICK VIEW DIALOG                                       */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {viewCategoryModal && (() => {
        const catItems = items.filter((i: InventoryItem) => {
          const c = (i.category || 'General').trim().toLowerCase();
          const target = viewCategoryModal.id.toLowerCase();
          if (c === target) return true;
          if (
            (target === 'others' || target === 'general' || target === 'fixed assets') &&
            !['ingredients', 'beverages', 'packaging', 'dairy & cheese', 'meat & poultry', 'vegetables & produce', 'sauces & condiments', 'cleaning & sanitation'].includes(c)
          ) {
            return true;
          }
          return false;
        });

        const totalUnits = catItems.reduce((s: number, i: InventoryItem) => s + (i.currentStock || 0), 0);
        const totalVal = catItems.reduce((s: number, i: InventoryItem) => s + ((i.currentStock || 0) * (i.costPrice || 0)), 0);
        const lowCount = catItems.filter((i: InventoryItem) => (i.currentStock || 0) <= (i.minStock || 5) && (i.currentStock || 0) > 0).length;
        const outCount = catItems.filter((i: InventoryItem) => (i.currentStock || 0) <= 0).length;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="w-full max-w-4xl rounded-2xl shadow-2xl bg-white border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="p-5 border-b border-gray-100 flex items-center justify-between" style={{ backgroundColor: `${viewCategoryModal.bg}35` }}>
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center font-bold shadow-xs"
                    style={{ backgroundColor: viewCategoryModal.bg, color: viewCategoryModal.color }}
                  >
                    <viewCategoryModal.icon size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                        {viewCategoryModal.label}
                      </h3>
                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider"
                        style={{ backgroundColor: viewCategoryModal.bg, color: viewCategoryModal.color }}
                      >
                        {viewCategoryModal.id}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {viewCategoryModal.desc} • {catItems.length} registered products
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewCategoryModal(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-200/60 text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Quick Summary Strip */}
              <div className="p-4 bg-gray-50 border-b border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-xl border border-gray-200/70 shadow-2xs">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Live Asset Valuation</span>
                  <span className="text-sm font-black text-gray-900 block mt-0.5" style={{ fontFamily: 'var(--font-heading)' }}>
                    {formatCurrency(totalVal)}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-gray-200/70 shadow-2xs">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Physical Units</span>
                  <span className="text-sm font-black text-blue-600 block mt-0.5" style={{ fontFamily: 'var(--font-heading)' }}>
                    {formatQty(totalUnits)} Units
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-gray-200/70 shadow-2xs">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Low Stock Alerts</span>
                  <span className={`text-sm font-black block mt-0.5 ${lowCount > 0 ? 'text-amber-600' : 'text-gray-500'}`} style={{ fontFamily: 'var(--font-heading)' }}>
                    {lowCount} Items
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-gray-200/70 shadow-2xs">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Out of Stock</span>
                  <span className={`text-sm font-black block mt-0.5 ${outCount > 0 ? 'text-red-600' : 'text-green-600'}`} style={{ fontFamily: 'var(--font-heading)' }}>
                    {outCount} Items
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="flex-1 overflow-y-auto p-4">
                {catItems.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-400">
                      <Package size={22} />
                    </div>
                    <p className="text-sm font-bold text-gray-700">No items found in {viewCategoryModal.label}</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                      Add your first raw material, food item, or supply in this department to track its stock and costs.
                    </p>
                    <button
                      onClick={() => {
                        const targetCat = viewCategoryModal.label;
                        setViewCategoryModal(null);
                        setEditing(null);
                        setForm({ ...blankForm(), category: targetCat });
                        setShowForm(true);
                      }}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-sm"
                      style={{ background: `linear-gradient(135deg, ${PZ}, ${PZD})` }}
                    >
                      <Plus size={14} /> Add Product to {viewCategoryModal.label}
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-100/75 border-b border-gray-200 text-gray-600 uppercase text-[10px] font-black tracking-wider">
                          <th className="py-2.5 px-3">Item & SKU</th>
                          <th className="py-2.5 px-3 text-right">In Stock</th>
                          <th className="py-2.5 px-3 text-right">Cost / Sell</th>
                          <th className="py-2.5 px-3 text-right">Valuation</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                        {catItems.map((item: InventoryItem) => {
                          const stock = item.currentStock || 0;
                          const minAlert = item.minStock || 5;
                          const isOut = stock <= 0;
                          const isLow = !isOut && stock <= minAlert;
                          const itemVal = stock * (item.costPrice || 0);

                          return (
                            <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-gray-900">{item.name}</div>
                                <div className="text-[10px] text-gray-400 font-mono">SKU: {item.sku || 'N/A'}</div>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <span className="font-extrabold text-gray-900">{formatQty(stock)}</span>{' '}
                                <span className="text-[10px] text-gray-500 font-bold">{item.unit}</span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="font-bold text-gray-700">{formatCurrency(item.costPrice)}</div>
                                {item.sellingPrice && item.sellingPrice > 0 ? (
                                  <div className="text-[10px] text-emerald-700 font-semibold">
                                    Sell: {formatCurrency(item.sellingPrice)}
                                  </div>
                                ) : null}
                              </td>
                              <td className="py-2.5 px-3 text-right font-extrabold text-gray-900">
                                {formatCurrency(itemVal)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {isOut ? (
                                  <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 font-extrabold text-[10px]">
                                    Out of Stock
                                  </span>
                                ) : isLow ? (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-extrabold text-[10px]">
                                    Low Stock ({formatQty(stock)} left)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md bg-green-100 text-green-700 font-extrabold text-[10px]">
                                    Optimal
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => {
                                      setViewCategoryModal(null);
                                      openStockInForItem(item);
                                    }}
                                    title="Quick Stock In"
                                    className="px-2 py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100 text-[10px] font-bold border border-green-200 transition-colors"
                                  >
                                    + Stock In
                                  </button>
                                  <button
                                    onClick={() => {
                                      setViewCategoryModal(null);
                                      openStockOutForItem(item);
                                    }}
                                    title="Quick Stock Out"
                                    className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 text-[10px] font-bold border border-amber-200 transition-colors"
                                  >
                                    − Stock Out
                                  </button>
                                  <button
                                    onClick={() => {
                                      setViewCategoryModal(null);
                                      setHistoryModalItem(item);
                                    }}
                                    title="Audit Ledger"
                                    className="w-6 h-6 rounded-md flex items-center justify-center bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                  >
                                    <Clock size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => {
                    const targetCat = viewCategoryModal.label;
                    setViewCategoryModal(null);
                    setEditing(null);
                    setForm({ ...blankForm(), category: targetCat });
                    setShowForm(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-transform active:scale-95"
                  style={{ background: `linear-gradient(135deg, ${PZ}, ${PZD})`, fontFamily: 'var(--font-heading)' }}
                >
                  <Plus size={14} /> Add Product in {viewCategoryModal.label}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const targetName = viewCategoryModal.label;
                      setViewCategoryModal(null);
                      setSelectedCategory(targetName);
                      setTab('stock');
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-gray-800 bg-white hover:bg-gray-100 border border-gray-200 shadow-2xs transition-colors"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    Open in Master Table <ArrowUpRight size={14} />
                  </button>
                  <button
                    onClick={() => setViewCategoryModal(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-200/60 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete Confirmation Modal */}
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
