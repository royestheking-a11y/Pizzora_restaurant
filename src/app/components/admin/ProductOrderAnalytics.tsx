import React, { useState, useMemo } from 'react';
import {
  BarChart3, TrendingUp, Calendar, DollarSign, ShoppingBag, Search,
  ArrowUpDown, Download, Printer, Eye, X, Award, Sparkles, Filter,
  CheckCircle2, Clock, ChevronDown, PackageCheck, AlertCircle, Utensils, Receipt,
  Info, Check, Tag
} from 'lucide-react';
import { useApp, MenuItem } from '../../context/AppContext';
import { optimizeCloudinaryUrl } from '../../utils/image';

export type TimePeriod = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'all';

interface ProductStats {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  totalQuantity: number;
  orderCount: number;
  grossRevenue: number;
  netRevenue: number;
  totalRevenue: number; // dynamically matches revenueMode
  unitsShare: number;
  revenueShare: number;
  // Multi-period quick counts for deep dive
  countToday: number;
  countYesterday: number;
  countWeek: number;
  countMonth: number;
  countYear: number;
  countAllTime: number;
  recentOrders: {
    orderNumber: string;
    timestamp: number;
    customer: string;
    quantity: number;
    grossLine: number;
    netLine: number;
    isTableOrder: boolean;
  }[];
}

// Dhaka time bounds (UTC+6) - exactly matching server.js & Admin.tsx
function getDhakaTimeBounds() {
  const dhakaStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
  const utcMidnight = new Date(dhakaStr + 'T00:00:00Z').getTime();
  const startOfDay = utcMidnight - (6 * 60 * 60 * 1000); // UTC+6
  const rawDayOfWeek = new Date(dhakaStr).getUTCDay(); // 0 is Sunday
  const diffToMonday = rawDayOfWeek === 0 ? -6 : 1 - rawDayOfWeek;
  const startOfWeek = startOfDay + (diffToMonday * 86400000);
  const [year, month] = dhakaStr.split('-').map(Number);
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1)).getTime() - (6 * 60 * 60 * 1000);
  const startOfYear = new Date(Date.UTC(year, 0, 1)).getTime() - (6 * 60 * 60 * 1000);
  const yesterdayStart = startOfDay - 86400000;
  const yesterdayEnd = startOfDay;

  return { startOfDay, yesterdayStart, yesterdayEnd, startOfWeek, startOfMonth, startOfYear, dhakaStr };
}

export function ProductOrderAnalytics() {
  const { state } = useApp();
  const [period, setPeriod] = useState<TimePeriod>('today');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'quantity' | 'revenue' | 'least' | 'name'>('quantity');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedProduct, setSelectedProduct] = useState<ProductStats | null>(null);

  // Revenue calculation mode:
  // 'net'   -> Net Realized Sales (order totals after discounts, 100% matches Sales Report!)
  // 'gross' -> Gross Menu Subtotal (menu price * quantity before discounts)
  const [revenueMode, setRevenueMode] = useState<'net' | 'gross'>('net');

  // Scope: 'completed' (Paid & Delivered only - matches Sales Report) or 'all' (includes active cooking/pending tables)
  const [orderScope, setOrderScope] = useState<'completed' | 'all'>('completed');

  // Show/hide info modal on revenue difference
  const [showReconcileHelp, setShowReconcileHelp] = useState<boolean>(false);

  // Time boundaries based on Dhaka timezone (UTC+6)
  const timeBounds = useMemo(() => {
    const { startOfDay, yesterdayStart, yesterdayEnd, startOfWeek, startOfMonth, startOfYear } = getDhakaTimeBounds();
    return {
      today: startOfDay,
      yesterdayStart,
      yesterdayEnd,
      week: startOfWeek,
      month: startOfMonth,
      year: startOfYear,
    };
  }, []);

  // Normalize all orders into unified list of items with timestamp & discount factoring
  const unifiedOrderItems = useMemo(() => {
    const list: {
      orderId: string;
      orderNumber: string;
      customer: string;
      timestamp: number;
      isTableOrder: boolean;
      itemId: string;
      name: string;
      category?: string;
      price: number;
      quantity: number;
      grossRevenue: number;
      netRevenue: number;
      image?: string;
      status: string;
    }[] = [];

    // Deduplicate table orders that might be duplicated into state.orders
    const dedupedTableOrders = (state.tableOrders || []).filter(
      to => !state.orders.some(o => o.orderNumber === to.invoiceNumber || o.id === to.id)
    );

    // Online & POS Direct Orders
    (state.orders || []).forEach(o => {
      // Status filter
      if (o.status === 'Cancelled') return;
      if (orderScope === 'completed' && o.status !== 'Delivered' && (o.status as string) !== 'Paid') return;

      const ts = new Date(o.createdAt).getTime();
      const num = o.orderNumber || o.id.slice(-6);
      const cust = o.customerName || (o.address?.startsWith('Table') ? o.address : 'Customer');

      // Calculate gross subtotal of this order's items
      const rawItems = o.items || [];
      let orderGrossSubtotal = 0;
      rawItems.forEach(ci => {
        const itemObj = ci.item || (ci as any);
        if (itemObj) {
          orderGrossSubtotal += (itemObj.price || 0) * (ci.quantity || 1);
        }
      });

      const orderNetTotal = typeof o.total === 'number' && o.total >= 0 ? o.total : orderGrossSubtotal;
      const realizationRatio = orderGrossSubtotal > 0 ? (orderNetTotal / orderGrossSubtotal) : 1;

      rawItems.forEach(ci => {
        const itemObj = ci.item || (ci as any);
        if (!itemObj) return;
        const q = ci.quantity || 1;
        const price = itemObj.price || 0;
        const gross = price * q;
        const net = Math.round(gross * realizationRatio);

        list.push({
          orderId: o.id,
          orderNumber: num,
          customer: cust,
          timestamp: ts,
          isTableOrder: false,
          itemId: itemObj.id || itemObj.name,
          name: itemObj.name,
          category: itemObj.category,
          price,
          quantity: q,
          grossRevenue: gross,
          netRevenue: net,
          image: itemObj.image,
          status: o.status,
        });
      });
    });

    // Table Dine-In Orders
    dedupedTableOrders.forEach(to => {
      if ((to.status as string) === 'Cancelled') return;
      if (orderScope === 'completed' && to.status !== 'Paid') return;

      const ts = typeof to.createdAt === 'number' ? to.createdAt : new Date(to.createdAt).getTime();
      const num = to.invoiceNumber || `TBL-${to.tableNumber}`;
      const cust = to.customerName ? `Table ${to.tableNumber} (${to.customerName})` : `Table ${to.tableNumber}`;

      const rawItems = to.items || [];
      let tableGrossSubtotal = 0;
      rawItems.forEach(ti => {
        tableGrossSubtotal += (ti.price || 0) * (ti.quantity || 1);
      });

      const tableNetTotal = typeof to.total === 'number' && to.total >= 0 ? to.total : tableGrossSubtotal;
      const realizationRatio = tableGrossSubtotal > 0 ? (tableNetTotal / tableGrossSubtotal) : 1;

      rawItems.forEach(ti => {
        const q = ti.quantity || 1;
        const price = ti.price || 0;
        const gross = price * q;
        const net = Math.round(gross * realizationRatio);

        list.push({
          orderId: to.id,
          orderNumber: num,
          customer: cust,
          timestamp: ts,
          isTableOrder: true,
          itemId: ti.itemId || ti.name,
          name: ti.name,
          category: undefined,
          price,
          quantity: q,
          grossRevenue: gross,
          netRevenue: net,
          image: ti.image,
          status: to.status,
        });
      });
    });

    return list;
  }, [state.orders, state.tableOrders, orderScope]);

  // Build catalog item lookup
  const catalogMap = useMemo(() => {
    const map = new Map<string, MenuItem>();
    (state.menuItems || []).forEach(m => {
      map.set(m.id, m);
      map.set(m.name.trim().toLowerCase(), m);
    });
    return map;
  }, [state.menuItems]);

  // Aggregate product stats across periods
  const { productStats, totalPeriodUnits, totalPeriodGrossRevenue, totalPeriodNetRevenue } = useMemo(() => {
    const statsMap = new Map<string, ProductStats>();

    // Seed from catalog so EVERY product appears in the system
    (state.menuItems || []).forEach(m => {
      statsMap.set(m.name.trim().toLowerCase(), {
        id: m.id,
        name: m.name,
        category: m.category || 'General',
        price: m.price,
        image: m.image || '',
        totalQuantity: 0,
        orderCount: 0,
        grossRevenue: 0,
        netRevenue: 0,
        totalRevenue: 0,
        unitsShare: 0,
        revenueShare: 0,
        countToday: 0,
        countYesterday: 0,
        countWeek: 0,
        countMonth: 0,
        countYear: 0,
        countAllTime: 0,
        recentOrders: [],
      });
    });

    let periodUnits = 0;
    let periodGross = 0;
    let periodNet = 0;

    // Process every unified item order
    unifiedOrderItems.forEach(item => {
      const key = item.name.trim().toLowerCase();
      let stat = statsMap.get(key);

      if (!stat) {
        // Unknown menu item (e.g. customized or legacy)
        stat = {
          id: item.itemId,
          name: item.name,
          category: item.category || 'Other',
          price: item.price,
          image: item.image || '',
          totalQuantity: 0,
          orderCount: 0,
          grossRevenue: 0,
          netRevenue: 0,
          totalRevenue: 0,
          unitsShare: 0,
          revenueShare: 0,
          countToday: 0,
          countYesterday: 0,
          countWeek: 0,
          countMonth: 0,
          countYear: 0,
          countAllTime: 0,
          recentOrders: [],
        };
        statsMap.set(key, stat);
      }

      const q = item.quantity;
      const grossRev = item.grossRevenue;
      const netRev = item.netRevenue;

      // Period Counters (in Dhaka Timezone UTC+6)
      stat.countAllTime += q;
      if (item.timestamp >= timeBounds.today) stat.countToday += q;
      if (item.timestamp >= timeBounds.yesterdayStart && item.timestamp < timeBounds.yesterdayEnd) {
        stat.countYesterday += q;
      }
      if (item.timestamp >= timeBounds.week) stat.countWeek += q;
      if (item.timestamp >= timeBounds.month) stat.countMonth += q;
      if (item.timestamp >= timeBounds.year) stat.countYear += q;

      // Check if item falls within active selected filter period
      let matchesActivePeriod = false;
      if (period === 'all') matchesActivePeriod = true;
      else if (period === 'today' && item.timestamp >= timeBounds.today) matchesActivePeriod = true;
      else if (period === 'yesterday' && item.timestamp >= timeBounds.yesterdayStart && item.timestamp < timeBounds.yesterdayEnd) matchesActivePeriod = true;
      else if (period === 'week' && item.timestamp >= timeBounds.week) matchesActivePeriod = true;
      else if (period === 'month' && item.timestamp >= timeBounds.month) matchesActivePeriod = true;
      else if (period === 'year' && item.timestamp >= timeBounds.year) matchesActivePeriod = true;

      if (matchesActivePeriod) {
        stat.totalQuantity += q;
        stat.orderCount += 1;
        stat.grossRevenue += grossRev;
        stat.netRevenue += netRev;

        periodUnits += q;
        periodGross += grossRev;
        periodNet += netRev;

        stat.recentOrders.push({
          orderNumber: item.orderNumber,
          timestamp: item.timestamp,
          customer: item.customer,
          quantity: q,
          grossLine: grossRev,
          netLine: netRev,
          isTableOrder: item.isTableOrder,
        });
      }
    });

    const activeTotalRevenue = revenueMode === 'net' ? periodNet : periodGross;

    const list = Array.from(statsMap.values()).map(s => {
      const activeItemRevenue = revenueMode === 'net' ? s.netRevenue : s.grossRevenue;
      return {
        ...s,
        totalRevenue: activeItemRevenue,
        unitsShare: periodUnits > 0 ? (s.totalQuantity / periodUnits) * 100 : 0,
        revenueShare: activeTotalRevenue > 0 ? (activeItemRevenue / activeTotalRevenue) * 100 : 0,
        recentOrders: s.recentOrders.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10),
      };
    });

    return {
      productStats: list,
      totalPeriodUnits: periodUnits,
      totalPeriodGrossRevenue: periodGross,
      totalPeriodNetRevenue: periodNet,
    };
  }, [state.menuItems, unifiedOrderItems, period, timeBounds, revenueMode]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    productStats.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set)];
  }, [productStats]);

  // Filter & Sort
  const filteredProducts = useMemo(() => {
    let list = productStats;

    // Filter by Category
    if (selectedCategory !== 'All') {
      list = list.filter(p => p.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    // Filter by Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    }

    // Sort
    return [...list].sort((a, b) => {
      if (sortBy === 'quantity') return b.totalQuantity - a.totalQuantity;
      if (sortBy === 'revenue') return b.totalRevenue - a.totalRevenue;
      if (sortBy === 'least') return a.totalQuantity - b.totalQuantity;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });
  }, [productStats, selectedCategory, searchQuery, sortBy]);

  // Quick stats highlights
  const topQuantityItem = useMemo(() => {
    const ordered = [...productStats].filter(p => p.totalQuantity > 0).sort((a, b) => b.totalQuantity - a.totalQuantity);
    return ordered[0] || null;
  }, [productStats]);

  const topRevenueItem = useMemo(() => {
    const ordered = [...productStats].filter(p => p.totalRevenue > 0).sort((a, b) => b.totalRevenue - a.totalRevenue);
    return ordered[0] || null;
  }, [productStats]);

  // CSV Export
  const handleExportCSV = () => {
    const rows = [
      ['Product Name', 'Category', 'Unit Price', 'Quantity Ordered', 'Orders Count', 'Gross Revenue (BDT)', 'Net Revenue (BDT)', 'Volume Share (%)'],
      ...filteredProducts.map(p => [
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.category}"`,
        p.price,
        p.totalQuantity,
        p.orderCount,
        p.grossRevenue,
        p.netRevenue,
        p.unitsShare.toFixed(1),
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Pizzora_Product_Sales_${period}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick Print Summary
  const handlePrintSummary = () => {
    const printWindow = window.open('', '_blank', 'width=750,height=850');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Product Sales Summary - ${period.toUpperCase()}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #111; }
          h1 { margin: 0 0 6px 0; font-size: 20px; color: #C8001F; }
          p { margin: 2px 0; font-size: 13px; color: #555; }
          .kpi { display: flex; gap: 16px; margin: 16px 0; padding: 12px; background: #F9FAFB; border-radius: 8px; }
          .kpi-card { flex: 1; }
          .kpi-val { font-size: 18px; font-weight: bold; color: #111; }
          .kpi-lbl { font-size: 11px; color: #666; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
          th { text-align: left; padding: 8px; background: #FEE2E2; color: #991B1B; font-size: 11px; text-transform: uppercase; }
          td { padding: 8px; border-bottom: 1px solid #EEE; }
          .num { text-align: right; }
          .total-row { font-weight: bold; background: #FFF5F5; }
        </style>
      </head>
      <body>
        <h1>Pizzora Restaurant — Product Sales Summary</h1>
        <p><strong>Period:</strong> ${period.toUpperCase()} · Generated: ${new Date().toLocaleString()}</p>
        <div class="kpi">
          <div class="kpi-card">
            <div class="kpi-lbl">Total Units Sold</div>
            <div class="kpi-val">${totalPeriodUnits} items</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-lbl">Net Realized Sales</div>
            <div class="kpi-val">৳${totalPeriodNetRevenue.toLocaleString()}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-lbl">Gross Menu Subtotal</div>
            <div class="kpi-val">৳${totalPeriodGrossRevenue.toLocaleString()}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-lbl">Top Seller</div>
            <div class="kpi-val">${topQuantityItem?.name || 'N/A'} (${topQuantityItem?.totalQuantity || 0})</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Product Name</th>
              <th>Category</th>
              <th class="num">Price</th>
              <th class="num">Units Sold</th>
              <th class="num">Orders</th>
              <th class="num">Gross Sales</th>
              <th class="num">Net Sales</th>
            </tr>
          </thead>
          <tbody>
            ${filteredProducts.map((p, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${p.name}</strong></td>
                <td>${p.category}</td>
                <td class="num">৳${p.price}</td>
                <td class="num"><strong>${p.totalQuantity}</strong></td>
                <td class="num">${p.orderCount}</td>
                <td class="num">৳${p.grossRevenue.toLocaleString()}</td>
                <td class="num"><strong>৳${p.netRevenue.toLocaleString()}</strong></td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="4"><strong>GRAND TOTAL</strong></td>
              <td class="num"><strong>${totalPeriodUnits}</strong></td>
              <td class="num">—</td>
              <td class="num">৳${totalPeriodGrossRevenue.toLocaleString()}</td>
              <td class="num"><strong>৳${totalPeriodNetRevenue.toLocaleString()}</strong></td>
            </tr>
          </tbody>
        </table>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const discountDifference = Math.max(0, totalPeriodGrossRevenue - totalPeriodNetRevenue);

  return (
    <div className="w-full max-w-full min-w-0 space-y-4 animate-fade-in overflow-hidden">

      {/* ── Top Header Banner & KPI Dashboard ────────────────────────────── */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #F9002B, #9f001c)' }}
            >
              <BarChart3 size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-gray-900 truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                  Product Sales & Order Intelligence
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-red-100 text-red-700 tracking-wider flex-shrink-0">
                  Live Calculator
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                Real-time sold counts and revenue per burger, drink, pizza & side item.
              </p>
            </div>
          </div>

          {/* Quick Actions & Order Scope Selector */}
          <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
            {/* Completed vs All Orders Scope Toggle */}
            <div className="flex items-center p-1 rounded-xl bg-gray-100 border border-gray-200 text-xs font-bold">
              <button
                onClick={() => setOrderScope('completed')}
                className={`px-2.5 py-1 rounded-lg transition-all text-xs font-bold ${
                  orderScope === 'completed' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
                title="Only count Delivered & Paid orders (Matches Sales Report)"
              >
                ✓ Paid & Completed
              </button>
              <button
                onClick={() => setOrderScope('all')}
                className={`px-2.5 py-1 rounded-lg transition-all text-xs font-bold ${
                  orderScope === 'all' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
                title="Include pending dine-in tables & cooking kitchen orders"
              >
                All Orders
              </button>
            </div>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all active:scale-95 border border-gray-200"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <Download size={13} /> Export CSV
            </button>
            <button
              onClick={handlePrintSummary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:shadow-md active:scale-95"
              style={{ background: 'linear-gradient(135deg, #111, #333)', fontFamily: 'var(--font-heading)' }}
            >
              <Printer size={13} /> Print
            </button>
          </div>
        </div>

        {/* ── Time Period Segmented Switcher ──────────────────────────────── */}
        <div
          className="flex items-center gap-1.5 mt-4 p-1 rounded-xl bg-gray-100/90 border border-gray-200 overflow-x-auto hide-scrollbar w-full min-w-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {[
            { id: 'today', label: 'Today', icon: Clock },
            { id: 'yesterday', label: 'Yesterday', icon: Calendar },
            { id: 'week', label: 'This Week', icon: TrendingUp },
            { id: 'month', label: 'This Month', icon: Calendar },
          ].map(t => {
            const isActive = period === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setPeriod(t.id as TimePeriod)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex-shrink-0"
                style={{
                  backgroundColor: isActive ? '#fff' : 'transparent',
                  color: isActive ? '#F9002B' : '#4B5563',
                  boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                  fontFamily: 'var(--font-heading)',
                }}
              >
                <t.icon size={13} style={{ color: isActive ? '#F9002B' : '#9CA3AF' }} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Shortcut Calculation KPI Cards ──────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
          {/* 1. Units Sold */}
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 flex flex-col justify-between">
            <div className="flex items-center justify-between text-blue-600 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Units Sold</span>
              <ShoppingBag size={15} />
            </div>
            <p className="text-xl sm:text-2xl font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
              {totalPeriodUnits}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5 truncate">
              items ordered in {period === 'today' ? 'today' : period === 'yesterday' ? 'yesterday' : period === 'week' ? 'this week' : 'this month'}
            </p>
          </div>

          {/* 2. Product Revenue (with Net / Gross Reconciliation) */}
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-700 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                Product Revenue
                <button
                  onClick={() => setShowReconcileHelp(true)}
                  className="text-emerald-600 hover:text-emerald-800"
                  title="Why Net vs Gross difference?"
                >
                  <Info size={12} />
                </button>
              </span>
              {/* Toggle Net / Gross */}
              <div className="flex bg-white/80 rounded-md p-0.5 border border-emerald-200 text-[10px] font-bold">
                <button
                  onClick={() => setRevenueMode('net')}
                  className={`px-1.5 py-0.5 rounded transition-all ${
                    revenueMode === 'net' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-100/50'
                  }`}
                  title="Net sales collected (Matches Sales Report)"
                >
                  Net
                </button>
                <button
                  onClick={() => setRevenueMode('gross')}
                  className={`px-1.5 py-0.5 rounded transition-all ${
                    revenueMode === 'gross' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-100/50'
                  }`}
                  title="Gross item value before discounts"
                >
                  Gross
                </button>
              </div>
            </div>

            <div>
              <p className="text-xl sm:text-2xl font-black text-emerald-800" style={{ fontFamily: 'var(--font-heading)' }}>
                ৳{(revenueMode === 'net' ? totalPeriodNetRevenue : totalPeriodGrossRevenue).toLocaleString()}
              </p>
              <div className="text-[10px] text-gray-600 mt-0.5 flex items-center justify-between">
                <span>{revenueMode === 'net' ? 'Net Paid (Sales Report)' : 'Gross Menu Subtotal'}</span>
                {discountDifference > 0 && (
                  <span className="text-emerald-700 font-semibold" title={`Gross: ৳${totalPeriodGrossRevenue} - Disc: ৳${discountDifference} = Net: ৳${totalPeriodNetRevenue}`}>
                    {revenueMode === 'net' ? `(Gross: ৳${totalPeriodGrossRevenue.toLocaleString()})` : `(Net: ৳${totalPeriodNetRevenue.toLocaleString()})`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 3. Most Ordered Product */}
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-100 flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-600 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">#1 Most Ordered</span>
              <Award size={15} />
            </div>
            <p className="text-xs sm:text-sm font-black text-gray-900 truncate" style={{ fontFamily: 'var(--font-heading)' }} title={topQuantityItem?.name}>
              {topQuantityItem ? topQuantityItem.name : 'No orders'}
            </p>
            <p className="text-[11px] font-extrabold text-amber-700 mt-0.5">
              {topQuantityItem ? `${topQuantityItem.totalQuantity} units sold` : '—'}
            </p>
          </div>

          {/* 4. Top Revenue Product */}
          <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-100 flex flex-col justify-between">
            <div className="flex items-center justify-between text-purple-600 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Top Revenue Item</span>
              <Sparkles size={15} />
            </div>
            <p className="text-xs sm:text-sm font-black text-gray-900 truncate" style={{ fontFamily: 'var(--font-heading)' }} title={topRevenueItem?.name}>
              {topRevenueItem ? topRevenueItem.name : 'No orders'}
            </p>
            <p className="text-[11px] font-extrabold text-purple-700 mt-0.5">
              {topRevenueItem ? `৳${topRevenueItem.totalRevenue.toLocaleString()}` : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Revenue Explanation Pill / Alert ──────────────────────────────── */}
      {discountDifference > 0 && (
        <div className="bg-amber-50/80 border border-amber-200/80 px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-2 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-amber-600 flex-shrink-0" />
            <span>
              <strong>Sales Report Match:</strong> Net collected is <strong>৳{totalPeriodNetRevenue.toLocaleString()}</strong> (matches Daily Sales Report). Menu gross item value is <strong>৳{totalPeriodGrossRevenue.toLocaleString()}</strong> with <strong>৳{discountDifference.toLocaleString()}</strong> promo/discount applied.
            </span>
          </div>
          <button
            onClick={() => setRevenueMode(prev => prev === 'net' ? 'gross' : 'net')}
            className="text-[11px] font-bold text-amber-800 underline hover:text-black whitespace-nowrap flex-shrink-0"
          >
            Switch to {revenueMode === 'net' ? 'Gross (৳' + totalPeriodGrossRevenue.toLocaleString() + ')' : 'Net (৳' + totalPeriodNetRevenue.toLocaleString() + ')'}
          </button>
        </div>
      )}

      {/* ── Filter Bar: Search, Category Pills & Sort ─────────────────────── */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl shadow-sm border border-gray-200 space-y-2.5 min-w-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 min-w-0">
          {/* Search box */}
          <div className="relative flex-1 max-w-md min-w-0">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search product (e.g. burger, water bottle, wings, pizza)..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-gray-200 text-xs font-semibold outline-none focus:ring-2 focus:ring-red-400 bg-gray-50 focus:bg-white"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sort & View Mode Controls */}
          <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700">
              <ArrowUpDown size={12} className="text-gray-400" />
              <span>Sort:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-transparent font-bold text-red-600 outline-none cursor-pointer text-xs"
              >
                <option value="quantity">Most Ordered (Qty ↓)</option>
                <option value="revenue">Highest Revenue (৳ ↓)</option>
                <option value="least">Least Ordered (Qty ↑)</option>
                <option value="name">Product Name (A-Z)</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center p-0.5 rounded-xl bg-gray-100 border border-gray-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-white shadow-xs text-red-600' : 'text-gray-500'}`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-white shadow-xs text-red-600' : 'text-gray-500'}`}
              >
                Table
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div
          className="flex items-center gap-1.5 overflow-x-auto pt-1 hide-scrollbar w-full min-w-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {categories.map(cat => {
            const isActive = selectedCategory.toLowerCase() === cat.toLowerCase();
            const catCount = cat === 'All'
              ? productStats.reduce((sum, p) => sum + p.totalQuantity, 0)
              : productStats.filter(p => p.category.toLowerCase() === cat.toLowerCase()).reduce((sum, p) => sum + p.totalQuantity, 0);

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0"
                style={{
                  backgroundColor: isActive ? '#111' : '#F3F4F6',
                  color: isActive ? '#fff' : '#4B5563',
                  fontFamily: 'var(--font-heading)',
                }}
              >
                <span>{cat}</span>
                <span
                  className="px-1.5 py-0.2 rounded-md text-[10px]"
                  style={{
                    backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : '#E5E7EB',
                    color: isActive ? '#fff' : '#6B7280',
                  }}
                >
                  {catCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Products List / Grid ─────────────────────────────────────────── */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-gray-200">
          <AlertCircle size={32} className="text-gray-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-gray-800">No products match your criteria</h3>
          <p className="text-xs text-gray-400 mt-1">Try resetting the search filter or changing the period.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* ── Grid View ─────────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 w-full min-w-0 max-w-full">
          {filteredProducts.map((p, idx) => {
            const isTop3 = idx < 3 && p.totalQuantity > 0;
            const rankBadgeColor = idx === 0 ? '#EAB308' : idx === 1 ? '#94A3B8' : '#D97706';

            return (
              <div
                key={p.id || p.name}
                onClick={() => setSelectedProduct(p)}
                className="group relative bg-white rounded-2xl p-3 border border-gray-200 hover:border-red-400 transition-all hover:shadow-lg cursor-pointer flex flex-col justify-between w-full min-w-0 overflow-hidden"
              >
                {/* Rank Badge */}
                {isTop3 && (
                  <div
                    className="absolute top-2 left-2 z-10 w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-black shadow-sm"
                    style={{ backgroundColor: rankBadgeColor }}
                    title={`Rank #${idx + 1}`}
                  >
                    #{idx + 1}
                  </div>
                )}

                {/* Top Section */}
                <div className="min-w-0">
                  <div className="w-full h-28 sm:h-32 rounded-xl overflow-hidden bg-gray-100 relative mb-2.5 min-w-0">
                    <img
                      src={optimizeCloudinaryUrl(p.image, 300)}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute bottom-1.5 left-1.5 bg-black/70 backdrop-blur-sm text-white px-1.5 py-0.5 rounded text-[9px] font-bold">
                      {p.category}
                    </span>
                    <span className="absolute bottom-1.5 right-1.5 bg-white/95 backdrop-blur-sm text-red-600 px-1.5 py-0.5 rounded text-[11px] font-black shadow-sm" style={{ fontFamily: 'var(--font-heading)' }}>
                      ৳{p.price}
                    </span>
                  </div>

                  <h4 className="font-bold text-xs sm:text-sm text-gray-900 group-hover:text-red-600 transition-colors truncate min-w-0" title={p.name}>
                    {p.name}
                  </h4>

                  {/* Primary Order Metrics */}
                  <div className="grid grid-cols-2 gap-1.5 mt-2 p-2 rounded-xl bg-gray-50 border border-gray-100 min-w-0">
                    <div className="min-w-0">
                      <span className="text-[9px] text-gray-400 font-bold uppercase block truncate">Ordered</span>
                      <span className="text-sm sm:text-base font-black text-gray-900 block truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                        {p.totalQuantity} <span className="text-[10px] font-medium text-gray-400">qty</span>
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] text-gray-400 font-bold uppercase block truncate">
                        {revenueMode === 'net' ? 'Net Sales' : 'Gross Sales'}
                      </span>
                      <span className="text-sm sm:text-base font-black text-red-600 block truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                        ৳{p.totalRevenue.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Multi-Period Quick Sparkline / Chips */}
                  <div className="grid grid-cols-4 gap-1 mt-2 text-center min-w-0">
                    <div className="p-1 rounded-lg bg-gray-50 text-[9px] min-w-0 overflow-hidden">
                      <span className="text-gray-400 block text-[8px] truncate">Today</span>
                      <strong className="text-gray-800 truncate block">{p.countToday}</strong>
                    </div>
                    <div className="p-1 rounded-lg bg-gray-50 text-[9px] min-w-0 overflow-hidden">
                      <span className="text-gray-400 block text-[8px] truncate">Yday</span>
                      <strong className="text-gray-800 truncate block">{p.countYesterday}</strong>
                    </div>
                    <div className="p-1 rounded-lg bg-gray-50 text-[9px] min-w-0 overflow-hidden">
                      <span className="text-gray-400 block text-[8px] truncate">Week</span>
                      <strong className="text-gray-800 truncate block">{p.countWeek}</strong>
                    </div>
                    <div className="p-1 rounded-lg bg-gray-50 text-[9px] min-w-0 overflow-hidden">
                      <span className="text-gray-400 block text-[8px] truncate">Month</span>
                      <strong className="text-gray-800 truncate block">{p.countMonth}</strong>
                    </div>
                  </div>
                </div>

                {/* Bottom Bar: Volume Share Progress Bar */}
                <div className="mt-3 pt-2 border-t border-gray-100 min-w-0">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-gray-500 font-medium">Order Share:</span>
                    <strong className="text-gray-900 font-bold">{p.unitsShare.toFixed(1)}%</strong>
                  </div>
                  <div className="w-full h-1 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, p.unitsShare)}%`,
                        background: 'linear-gradient(90deg, #F9002B, #EA580C)',
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Table View ─────────────────────────────────────────────────────── */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3 w-10">#</th>
                  <th className="py-3 px-3">Product Name</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3 text-right">Unit Price</th>
                  <th className="py-3 px-3 text-right">Today</th>
                  <th className="py-3 px-3 text-right">Week</th>
                  <th className="py-3 px-3 text-right">Month</th>
                  <th className="py-3 px-3 text-right font-black text-red-600">Selected Qty</th>
                  <th className="py-3 px-3 text-right font-black text-gray-900">
                    {revenueMode === 'net' ? 'Net Sales (Report)' : 'Gross Sales'}
                  </th>
                  <th className="py-3 px-3 w-24">Share</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map((p, idx) => (
                  <tr
                    key={p.id || p.name}
                    className="hover:bg-red-50/20 transition-colors cursor-pointer"
                    onClick={() => setSelectedProduct(p)}
                  >
                    <td className="py-2.5 px-3 font-bold text-gray-400">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={optimizeCloudinaryUrl(p.image, 60)}
                          alt={p.name}
                          className="w-8 h-8 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                        />
                        <span className="font-bold text-gray-900">{p.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-bold">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-gray-700">
                      ৳{p.price}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-gray-600">
                      {p.countToday}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-gray-600">
                      {p.countWeek}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-gray-600">
                      {p.countMonth}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-xs text-red-600" style={{ fontFamily: 'var(--font-heading)' }}>
                      {p.totalQuantity}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-xs text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                      ৳{p.totalRevenue.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-red-600"
                            style={{ width: `${Math.min(100, p.unitsShare)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 w-7 text-right">
                          {p.unitsShare.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProduct(p);
                        }}
                        className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 font-bold text-[10px] transition-colors"
                      >
                        Deep Dive
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Product Deep Dive Modal ───────────────────────────────────────── */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[88vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 text-white flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #1A0000, #C8001F)' }}>
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={optimizeCloudinaryUrl(selectedProduct.image, 100)}
                  alt={selectedProduct.name}
                  className="w-11 h-11 rounded-xl object-cover bg-white/20 border-2 border-white/40 shadow-sm flex-shrink-0"
                />
                <div className="min-w-0">
                  <h3 className="text-base font-black truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                    {selectedProduct.name}
                  </h3>
                  <p className="text-xs text-white/80">
                    {selectedProduct.category} · ৳{selectedProduct.price} base price
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors flex-shrink-0"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4 overflow-y-auto">
              {/* Period Quick Calculation Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-100">
                  <span className="text-[10px] font-bold text-red-600 uppercase">Today</span>
                  <p className="text-lg font-black text-red-700" style={{ fontFamily: 'var(--font-heading)' }}>
                    {selectedProduct.countToday} <span className="text-xs font-normal">sold</span>
                  </p>
                  <p className="text-[10px] text-gray-500">৳{(selectedProduct.countToday * selectedProduct.price).toLocaleString()}</p>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                  <span className="text-[10px] font-bold text-amber-600 uppercase">Yesterday</span>
                  <p className="text-lg font-black text-amber-700" style={{ fontFamily: 'var(--font-heading)' }}>
                    {selectedProduct.countYesterday} <span className="text-xs font-normal">sold</span>
                  </p>
                  <p className="text-[10px] text-gray-500">৳{(selectedProduct.countYesterday * selectedProduct.price).toLocaleString()}</p>
                </div>

                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100">
                  <span className="text-[10px] font-bold text-blue-600 uppercase">This Week</span>
                  <p className="text-lg font-black text-blue-700" style={{ fontFamily: 'var(--font-heading)' }}>
                    {selectedProduct.countWeek} <span className="text-xs font-normal">sold</span>
                  </p>
                  <p className="text-[10px] text-gray-500">৳{(selectedProduct.countWeek * selectedProduct.price).toLocaleString()}</p>
                </div>

                <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100">
                  <span className="text-[10px] font-bold text-purple-600 uppercase">This Month</span>
                  <p className="text-lg font-black text-purple-700" style={{ fontFamily: 'var(--font-heading)' }}>
                    {selectedProduct.countMonth} <span className="text-xs font-normal">sold</span>
                  </p>
                  <p className="text-[10px] text-gray-500">৳{(selectedProduct.countMonth * selectedProduct.price).toLocaleString()}</p>
                </div>
              </div>

              {/* Recent Orders Containing this Item */}
              <div>
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Receipt size={13} className="text-red-600" />
                  Recent Orders Including {selectedProduct.name}
                </h4>

                {selectedProduct.recentOrders.length === 0 ? (
                  <p className="text-xs text-gray-400 py-3 text-center bg-gray-50 rounded-xl">
                    No orders for this item in the selected period.
                  </p>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-44 overflow-y-auto rounded-xl border border-gray-200">
                    {selectedProduct.recentOrders.map((ro, i) => (
                      <div key={i} className="p-2 bg-white flex items-center justify-between text-xs hover:bg-gray-50">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-red-600">#{ro.orderNumber}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-gray-100 text-gray-600">
                              {ro.isTableOrder ? 'Dine In' : 'Online / POS'}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400">
                            {ro.customer} · {new Date(ro.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-right">
                          <strong className="text-gray-900">{ro.quantity}x</strong>
                          <span className="text-xs text-red-600 font-black ml-2" style={{ fontFamily: 'var(--font-heading)' }}>
                            ৳{revenueMode === 'net' ? ro.netLine : ro.grossLine}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Help / Reconciliation Explanation Modal ────────────────────── */}
      {showReconcileHelp && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowReconcileHelp(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-in p-5 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3 border-gray-100">
              <div className="flex items-center gap-2 text-red-600">
                <Info size={18} />
                <h3 className="font-black text-sm text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                  Why Net Sales (৳{totalPeriodNetRevenue.toLocaleString()}) vs Gross (৳{totalPeriodGrossRevenue.toLocaleString()})?
                </h3>
              </div>
              <button onClick={() => setShowReconcileHelp(false)} className="text-gray-400 hover:text-black">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-600 leading-relaxed">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="font-bold text-emerald-900 mb-1">
                  ✓ Net Realized Sales: ৳{totalPeriodNetRevenue.toLocaleString()}
                </p>
                <p className="text-[11px] text-emerald-800">
                  This <strong>strictly matches your Sales Report</strong>. It reflects the exact money paid by customers after promotional discounts, vouchers, coupons, and adjustments.
                </p>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                <p className="font-bold text-amber-900 mb-1">
                  Menu Gross Subtotal: ৳{totalPeriodGrossRevenue.toLocaleString()}
                </p>
                <p className="text-[11px] text-amber-800">
                  This is the raw face value of products ordered (unit price × quantity), calculated before any order-level discount codes or promo offers were deducted.
                </p>
              </div>

              <div className="p-2.5 bg-gray-50 rounded-xl text-gray-500 text-[11px]">
                <strong>Discounts Deducted:</strong> ৳{discountDifference.toLocaleString()} in order-level discounts were applied across today's sales.
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowReconcileHelp(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Got It, Thanks!
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
