import React, { useState, useMemo } from 'react';
import {
  BarChart3, TrendingUp, Calendar, DollarSign, ShoppingBag, Search,
  ArrowUpDown, Download, Printer, Eye, X, Award, Sparkles, Filter,
  CheckCircle2, Clock, ChevronDown, PackageCheck, AlertCircle, Utensils
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
  totalRevenue: number;
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
    totalLine: number;
    isTableOrder: boolean;
  }[];
}

export function ProductOrderAnalytics() {
  const { state } = useApp();
  const [period, setPeriod] = useState<TimePeriod>('today');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'quantity' | 'revenue' | 'least' | 'name'>('quantity');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedProduct, setSelectedProduct] = useState<ProductStats | null>(null);

  // Time boundaries (Bangladesh time UTC+6 reference)
  const timeBounds = useMemo(() => {
    const now = new Date();
    // Start of Today
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // Yesterday
    const yesterdayStart = new Date(today);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(today);

    // Start of Week (last 7 days or since Monday)
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 6);

    // Start of Month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Start of Year
    const yearStart = new Date(now.getFullYear(), 0, 1);

    return {
      today: today.getTime(),
      yesterdayStart: yesterdayStart.getTime(),
      yesterdayEnd: yesterdayEnd.getTime(),
      week: weekStart.getTime(),
      month: monthStart.getTime(),
      year: yearStart.getTime(),
    };
  }, []);

  // Normalize all orders into unified list of items with timestamp
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
      image?: string;
    }[] = [];

    // Online & POS Direct Orders
    (state.orders || []).forEach(o => {
      const ts = new Date(o.createdAt).getTime();
      const num = o.orderNumber || o.id.slice(-6);
      const cust = o.customerName || (o.address?.startsWith('Table') ? o.address : 'Customer');

      (o.items || []).forEach(ci => {
        const itemObj = ci.item || (ci as any);
        if (!itemObj) return;
        list.push({
          orderId: o.id,
          orderNumber: num,
          customer: cust,
          timestamp: ts,
          isTableOrder: false,
          itemId: itemObj.id || itemObj.name,
          name: itemObj.name,
          category: itemObj.category,
          price: itemObj.price || 0,
          quantity: ci.quantity || 1,
          image: itemObj.image,
        });
      });
    });

    // Table Dine-In Orders
    (state.tableOrders || []).forEach(to => {
      const ts = typeof to.createdAt === 'number' ? to.createdAt : new Date(to.createdAt).getTime();
      const num = to.invoiceNumber || `TBL-${to.tableNumber}`;
      const cust = to.customerName ? `Table ${to.tableNumber} (${to.customerName})` : `Table ${to.tableNumber}`;

      (to.items || []).forEach(ti => {
        list.push({
          orderId: to.id,
          orderNumber: num,
          customer: cust,
          timestamp: ts,
          isTableOrder: true,
          itemId: ti.itemId || ti.name,
          name: ti.name,
          category: undefined, // Will cross-reference with catalog
          price: ti.price || 0,
          quantity: ti.quantity || 1,
          image: ti.image,
        });
      });
    });

    return list;
  }, [state.orders, state.tableOrders]);

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
  const { productStats, totalPeriodUnits, totalPeriodRevenue } = useMemo(() => {
    const statsMap = new Map<string, ProductStats>();

    // Seed from catalog so EVERY product appears in calculations
    (state.menuItems || []).forEach(m => {
      statsMap.set(m.name.trim().toLowerCase(), {
        id: m.id,
        name: m.name,
        category: m.category || 'General',
        price: m.price,
        image: m.image || '',
        totalQuantity: 0,
        orderCount: 0,
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
    let periodRevenue = 0;

    // Process every unified item order
    unifiedOrderItems.forEach(item => {
      const key = item.name.trim().toLowerCase();
      let stat = statsMap.get(key);

      if (!stat) {
        // Unknown menu item (e.g. customized or historical)
        stat = {
          id: item.itemId,
          name: item.name,
          category: item.category || 'Other',
          price: item.price,
          image: item.image || '',
          totalQuantity: 0,
          orderCount: 0,
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
      const rev = item.price * q;

      // Period Counters
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
        stat.totalRevenue += rev;
        periodUnits += q;
        periodRevenue += rev;

        stat.recentOrders.push({
          orderNumber: item.orderNumber,
          timestamp: item.timestamp,
          customer: item.customer,
          quantity: q,
          totalLine: rev,
          isTableOrder: item.isTableOrder,
        });
      }
    });

    const list = Array.from(statsMap.values()).map(s => ({
      ...s,
      unitsShare: periodUnits > 0 ? (s.totalQuantity / periodUnits) * 100 : 0,
      revenueShare: periodRevenue > 0 ? (s.totalRevenue / periodRevenue) * 100 : 0,
      recentOrders: s.recentOrders.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10),
    }));

    return {
      productStats: list,
      totalPeriodUnits: periodUnits,
      totalPeriodRevenue: periodRevenue,
    };
  }, [state.menuItems, unifiedOrderItems, period, timeBounds]);

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

    if (selectedCategory !== 'All') {
      list = list.filter(p => p.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    }

    return list.sort((a, b) => {
      if (sortBy === 'quantity') return b.totalQuantity - a.totalQuantity;
      if (sortBy === 'revenue') return b.totalRevenue - a.totalRevenue;
      if (sortBy === 'least') return a.totalQuantity - b.totalQuantity;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });
  }, [productStats, selectedCategory, searchQuery, sortBy]);

  // Top performers
  const topQuantityItem = useMemo(() => {
    const sorted = [...productStats].sort((a, b) => b.totalQuantity - a.totalQuantity);
    return sorted[0]?.totalQuantity > 0 ? sorted[0] : null;
  }, [productStats]);

  const topRevenueItem = useMemo(() => {
    const sorted = [...productStats].sort((a, b) => b.totalRevenue - a.totalRevenue);
    return sorted[0]?.totalRevenue > 0 ? sorted[0] : null;
  }, [productStats]);

  const activeSoldProductsCount = useMemo(() => {
    return productStats.filter(p => p.totalQuantity > 0).length;
  }, [productStats]);

  // Export to CSV
  const handleExportCSV = () => {
    const rows = [
      ['Product Name', 'Category', 'Unit Price', 'Quantity Ordered', 'Orders Count', 'Total Revenue (BDT)', 'Volume Share (%)'],
      ...filteredProducts.map(p => [
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.category}"`,
        p.price,
        p.totalQuantity,
        p.orderCount,
        p.totalRevenue,
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
    const printWindow = window.open('', '_blank', 'width=700,height=800');
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
            <div class="kpi-lbl">Total Item Revenue</div>
            <div class="kpi-val">৳${totalPeriodRevenue.toLocaleString()}</div>
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
              <th class="num">Total Revenue</th>
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
                <td class="num"><strong>৳${p.totalRevenue.toLocaleString()}</strong></td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="4"><strong>GRAND TOTAL</strong></td>
              <td class="num"><strong>${totalPeriodUnits}</strong></td>
              <td class="num">—</td>
              <td class="num"><strong>৳${totalPeriodRevenue.toLocaleString()}</strong></td>
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

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Top Header Banner ────────────────────────────────────────────── */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #F9002B, #9f001c)' }}
            >
              <BarChart3 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                  Product Sales & Order Intelligence
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-red-100 text-red-700 tracking-wider">
                  Live Calculator
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Exact order counts, units sold, and revenue breakdown for each burger, drink, pizza & side item.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all active:scale-95 border border-gray-200"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <Download size={14} /> Export CSV
            </button>
            <button
              onClick={handlePrintSummary}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-all hover:shadow-md active:scale-95"
              style={{ background: 'linear-gradient(135deg, #111, #333)', fontFamily: 'var(--font-heading)' }}
            >
              <Printer size={14} /> Print Summary
            </button>
          </div>
        </div>

        {/* ── Time Period Segmented Switcher ──────────────────────────────── */}
        <div className="flex items-center gap-1.5 mt-5 p-1.5 rounded-2xl bg-gray-100/80 border border-gray-200 overflow-x-auto scrollbar-thin">
          {[
            { id: 'today', label: 'Today', icon: Clock },
            { id: 'yesterday', label: 'Yesterday', icon: Calendar },
            { id: 'week', label: 'This Week', icon: TrendingUp },
            { id: 'month', label: 'This Month', icon: Calendar },
            { id: 'year', label: 'This Year', icon: Award },
            { id: 'all', label: 'All Time History', icon: Sparkles },
          ].map(t => {
            const isActive = period === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setPeriod(t.id as TimePeriod)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0"
                style={{
                  backgroundColor: isActive ? '#fff' : 'transparent',
                  color: isActive ? '#F9002B' : '#4B5563',
                  boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-gray-100">
          <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100">
            <div className="flex items-center justify-between text-blue-600 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Units Sold</span>
              <ShoppingBag size={16} />
            </div>
            <p className="text-2xl font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
              {totalPeriodUnits}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">items ordered in {period}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100">
            <div className="flex items-center justify-between text-emerald-600 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Product Revenue</span>
              <DollarSign size={16} />
            </div>
            <p className="text-2xl font-black text-emerald-700" style={{ fontFamily: 'var(--font-heading)' }}>
              ৳{totalPeriodRevenue.toLocaleString()}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">gross item sales in {period}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-100">
            <div className="flex items-center justify-between text-amber-600 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">#1 Most Ordered</span>
              <Award size={16} />
            </div>
            <p className="text-sm font-black text-gray-900 truncate" style={{ fontFamily: 'var(--font-heading)' }} title={topQuantityItem?.name}>
              {topQuantityItem ? topQuantityItem.name : 'No orders'}
            </p>
            <p className="text-[11px] font-extrabold text-amber-700 mt-0.5">
              {topQuantityItem ? `${topQuantityItem.totalQuantity} units sold` : '—'}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100">
            <div className="flex items-center justify-between text-purple-600 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Top Revenue Item</span>
              <Sparkles size={16} />
            </div>
            <p className="text-sm font-black text-gray-900 truncate" style={{ fontFamily: 'var(--font-heading)' }} title={topRevenueItem?.name}>
              {topRevenueItem ? topRevenueItem.name : 'No orders'}
            </p>
            <p className="text-[11px] font-extrabold text-purple-700 mt-0.5">
              {topRevenueItem ? `৳${topRevenueItem.totalRevenue.toLocaleString()}` : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Filter Bar: Search, Category Pills & Sort ─────────────────────── */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-200 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search product (e.g. burger, water bottle, wings, pizza)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold outline-none focus:ring-2 focus:ring-red-400 bg-gray-50 focus:bg-white"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sort & View Mode Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700">
              <ArrowUpDown size={13} className="text-gray-400" />
              <span>Sort:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-transparent font-bold text-red-600 outline-none cursor-pointer"
              >
                <option value="quantity">Most Ordered (Qty ↓)</option>
                <option value="revenue">Highest Revenue (৳ ↓)</option>
                <option value="least">Least Ordered (Qty ↑)</option>
                <option value="name">Product Name (A-Z)</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center p-1 rounded-xl bg-gray-100 border border-gray-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500'}`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500'}`}
              >
                Table
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 scrollbar-thin">
          {categories.map(cat => {
            const isActive = selectedCategory.toLowerCase() === cat.toLowerCase();
            const catCount = cat === 'All'
              ? productStats.reduce((sum, p) => sum + p.totalQuantity, 0)
              : productStats.filter(p => p.category.toLowerCase() === cat.toLowerCase()).reduce((sum, p) => sum + p.totalQuantity, 0);

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all"
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
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-200">
          <AlertCircle size={36} className="text-gray-300 mx-auto mb-2" />
          <h3 className="text-base font-bold text-gray-800">No products match your criteria</h3>
          <p className="text-xs text-gray-400 mt-1">Try resetting the search filter or changing the period.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* ── Grid View ─────────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((p, idx) => {
            const isTop3 = idx < 3 && p.totalQuantity > 0;
            const rankBadgeColor = idx === 0 ? '#EAB308' : idx === 1 ? '#94A3B8' : '#D97706';

            return (
              <div
                key={p.id || p.name}
                onClick={() => setSelectedProduct(p)}
                className="group relative bg-white rounded-3xl p-4 border border-gray-200 hover:border-red-400 transition-all hover:shadow-xl cursor-pointer flex flex-col justify-between"
              >
                {/* Rank Badge */}
                {isTop3 && (
                  <div
                    className="absolute top-3 left-3 z-10 w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-md"
                    style={{ backgroundColor: rankBadgeColor }}
                    title={`Rank #${idx + 1}`}
                  >
                    #{idx + 1}
                  </div>
                )}

                {/* Top Section */}
                <div>
                  <div className="w-full h-36 rounded-2xl overflow-hidden bg-gray-100 relative mb-3">
                    <img
                      src={optimizeCloudinaryUrl(p.image, 350)}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm text-white px-2 py-0.5 rounded-lg text-[10px] font-bold">
                      {p.category}
                    </span>
                    <span className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm text-red-600 px-2 py-0.5 rounded-lg text-xs font-black shadow-sm" style={{ fontFamily: 'var(--font-heading)' }}>
                      ৳{p.price}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-gray-900 group-hover:text-red-600 transition-colors line-clamp-1" title={p.name}>
                    {p.name}
                  </h4>

                  {/* Primary Order Metrics */}
                  <div className="grid grid-cols-2 gap-2 mt-3 p-2.5 rounded-2xl bg-gray-50 border border-gray-100">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Ordered</span>
                      <span className="text-lg font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                        {p.totalQuantity} <span className="text-xs font-medium text-gray-400">units</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Total Sales</span>
                      <span className="text-lg font-black text-red-600" style={{ fontFamily: 'var(--font-heading)' }}>
                        ৳{p.totalRevenue.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Multi-Period Quick Sparkline / Chips */}
                  <div className="grid grid-cols-4 gap-1 mt-2.5 text-center">
                    <div className="p-1.5 rounded-lg bg-gray-50 text-[10px]">
                      <span className="text-gray-400 block text-[9px]">Today</span>
                      <strong className="text-gray-800">{p.countToday}</strong>
                    </div>
                    <div className="p-1.5 rounded-lg bg-gray-50 text-[10px]">
                      <span className="text-gray-400 block text-[9px]">Week</span>
                      <strong className="text-gray-800">{p.countWeek}</strong>
                    </div>
                    <div className="p-1.5 rounded-lg bg-gray-50 text-[10px]">
                      <span className="text-gray-400 block text-[9px]">Month</span>
                      <strong className="text-gray-800">{p.countMonth}</strong>
                    </div>
                    <div className="p-1.5 rounded-lg bg-gray-50 text-[10px]">
                      <span className="text-gray-400 block text-[9px]">Year</span>
                      <strong className="text-gray-800">{p.countYear}</strong>
                    </div>
                  </div>
                </div>

                {/* Bottom Bar: Volume Share Progress Bar */}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-gray-500 font-medium">Share of Total Orders:</span>
                    <strong className="text-gray-900 font-bold">{p.unitsShare.toFixed(1)}%</strong>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
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
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 w-12">#</th>
                  <th className="py-3.5 px-4">Product Name</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 text-right">Price</th>
                  <th className="py-3.5 px-4 text-right">Today</th>
                  <th className="py-3.5 px-4 text-right">This Week</th>
                  <th className="py-3.5 px-4 text-right">This Month</th>
                  <th className="py-3.5 px-4 text-right font-black text-red-600">Selected Units</th>
                  <th className="py-3.5 px-4 text-right font-black text-gray-900">Total Revenue</th>
                  <th className="py-3.5 px-4 w-28">Volume Share</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map((p, idx) => (
                  <tr
                    key={p.id || p.name}
                    className="hover:bg-red-50/20 transition-colors cursor-pointer"
                    onClick={() => setSelectedProduct(p)}
                  >
                    <td className="py-3 px-4 font-bold text-gray-400">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={optimizeCloudinaryUrl(p.image, 80)}
                          alt={p.name}
                          className="w-9 h-9 rounded-xl object-cover bg-gray-100 flex-shrink-0"
                        />
                        <span className="font-bold text-gray-900">{p.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-bold">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-700">
                      ৳{p.price}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-600">
                      {p.countToday}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-600">
                      {p.countWeek}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-600">
                      {p.countMonth}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-sm text-red-600" style={{ fontFamily: 'var(--font-heading)' }}>
                      {p.totalQuantity}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-sm text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                      ৳{p.totalRevenue.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-red-600"
                            style={{ width: `${Math.min(100, p.unitsShare)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 w-8 text-right">
                          {p.unitsShare.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProduct(p);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 font-bold text-[11px] transition-colors"
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
            className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 text-white flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #1A0000, #C8001F)' }}>
              <div className="flex items-center gap-3">
                <img
                  src={optimizeCloudinaryUrl(selectedProduct.image, 120)}
                  alt={selectedProduct.name}
                  className="w-12 h-12 rounded-2xl object-cover bg-white/20 border-2 border-white/40 shadow-sm"
                />
                <div>
                  <h3 className="text-lg font-black" style={{ fontFamily: 'var(--font-heading)' }}>
                    {selectedProduct.name}
                  </h3>
                  <p className="text-xs text-white/70">
                    {selectedProduct.category} · ৳{selectedProduct.price} unit price
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5 overflow-y-auto">
              {/* Period Quick Calculation Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-3 rounded-2xl bg-red-50 border border-red-100">
                  <span className="text-[10px] font-bold text-red-600 uppercase">Today</span>
                  <p className="text-xl font-black text-red-700" style={{ fontFamily: 'var(--font-heading)' }}>
                    {selectedProduct.countToday} <span className="text-xs font-normal">sold</span>
                  </p>
                  <p className="text-[10px] text-gray-500">৳{(selectedProduct.countToday * selectedProduct.price).toLocaleString()}</p>
                </div>

                <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100">
                  <span className="text-[10px] font-bold text-blue-600 uppercase">This Week</span>
                  <p className="text-xl font-black text-blue-700" style={{ fontFamily: 'var(--font-heading)' }}>
                    {selectedProduct.countWeek} <span className="text-xs font-normal">sold</span>
                  </p>
                  <p className="text-[10px] text-gray-500">৳{(selectedProduct.countWeek * selectedProduct.price).toLocaleString()}</p>
                </div>

                <div className="p-3 rounded-2xl bg-purple-50 border border-purple-100">
                  <span className="text-[10px] font-bold text-purple-600 uppercase">This Month</span>
                  <p className="text-xl font-black text-purple-700" style={{ fontFamily: 'var(--font-heading)' }}>
                    {selectedProduct.countMonth} <span className="text-xs font-normal">sold</span>
                  </p>
                  <p className="text-[10px] text-gray-500">৳{(selectedProduct.countMonth * selectedProduct.price).toLocaleString()}</p>
                </div>

                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100">
                  <span className="text-[10px] font-bold text-amber-600 uppercase">This Year</span>
                  <p className="text-xl font-black text-amber-700" style={{ fontFamily: 'var(--font-heading)' }}>
                    {selectedProduct.countYear} <span className="text-xs font-normal">sold</span>
                  </p>
                  <p className="text-[10px] text-gray-500">৳{(selectedProduct.countYear * selectedProduct.price).toLocaleString()}</p>
                </div>
              </div>

              {/* All-time Summary Banner */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-gray-500 font-bold">All-Time Cumulative Units:</span>
                  <p className="text-base font-black text-gray-900 mt-0.5" style={{ fontFamily: 'var(--font-heading)' }}>
                    {selectedProduct.countAllTime} items sold
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-gray-500 font-bold">All-Time Total Revenue:</span>
                  <p className="text-base font-black text-red-600 mt-0.5" style={{ fontFamily: 'var(--font-heading)' }}>
                    ৳{(selectedProduct.countAllTime * selectedProduct.price).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Recent Orders Containing this Item */}
              <div>
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Receipt size={14} className="text-red-600" />
                  Recent Orders Including {selectedProduct.name}
                </h4>

                {selectedProduct.recentOrders.length === 0 ? (
                  <p className="text-xs text-gray-400 py-3 text-center bg-gray-50 rounded-xl">
                    No orders for this item in the selected period.
                  </p>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto rounded-xl border border-gray-200">
                    {selectedProduct.recentOrders.map((ro, i) => (
                      <div key={i} className="p-2.5 bg-white flex items-center justify-between text-xs hover:bg-gray-50">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-red-600">#{ro.orderNumber}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
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
                            ৳{ro.totalLine}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 transition-colors"
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
