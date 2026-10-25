import { Order, TableOrder, CashRegisterEntry, ExpenseEntry } from '../context/AppContext';

export const SAFE_MODE_MAX_CAP = 9999; // Strict maximum upper cap (always under 10k Tk)
export const SAFE_MODE_MONTHLY_TARGET = SAFE_MODE_MAX_CAP;

/**
 * Generate a dynamic, natural monthly target strictly under 10,000 Tk (ranging ~7,000 to ~9,850 Tk).
 * e.g., 7.2k, 8.4k, 8.9k, 9.5k, 9.8k.
 * Uses a deterministic hash of the monthKey so the target stays consistent on page reloads
 * but naturally varies from month to month so it never looks artificial or suspicious.
 */
export function getMonthlySafeTarget(monthKey: string): number {
  if (!monthKey || monthKey === 'unknown') return 9200;

  let hash = 0;
  for (let i = 0; i < monthKey.length; i++) {
    hash = (hash << 5) - hash + monthKey.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);

  // Varied realistic targets strictly under 10k
  const realisticTargets = [
    8900, 9500, 7800, 9800, 8400, 7200, 9600, 8700, 9300, 7900, 9750, 8600
  ];

  const baseTarget = realisticTargets[positiveHash % realisticTargets.length];
  const jitter = ((positiveHash >> 3) % 300) - 150;
  return Math.min(9850, Math.max(7000, baseTarget + jitter));
}

// Asia/Dhaka is UTC+6
export const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

export function parseDhakaTimestamp(dateVal: any): number {
  if (!dateVal) return 0;
  if (typeof dateVal === 'number' && !isNaN(dateVal)) return dateVal;
  if (typeof dateVal === 'string') {
    const ts = new Date(dateVal).getTime();
    if (!isNaN(ts)) return ts;
  }
  return 0;
}

export function toDhakaDateKey(timestamp: number): string {
  if (!timestamp) return '';
  const d = new Date(timestamp + DHAKA_OFFSET_MS);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function toDhakaMonthKey(timestamp: number): string {
  if (!timestamp) return '';
  const d = new Date(timestamp + DHAKA_OFFSET_MS);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export interface SafeModeDataset {
  safeOrders: Order[];
  safeTableOrders: TableOrder[];
  safeOrderIds: Set<string>;
  safeTableOrderIds: Set<string>;
  safeCashRegister: CashRegisterEntry[];
  safeExpenses: ExpenseEntry[];
  safeAnalytics: any;
}

const HISTORICAL_CUSTOMERS = [
  { name: 'Arif Hossain', phone: '+8801712345678', address: 'Pizzora Dine-in' },
  { name: 'Farhana Islam', phone: '+8801823456789', address: 'Banani Block D, Dhaka' },
  { name: 'Tanvir Ahmed', phone: '+8801934567890', address: 'Pizzora Takeaway' },
  { name: 'Nusrat Jahan', phone: '+8801645678901', address: 'Gulshan-1, Dhaka' },
  { name: 'Kamrul Hasan', phone: '+8801556789012', address: 'Pizzora Dine-in' },
  { name: 'Mehedi Hasan', phone: '+8801767890123', address: 'Mirpur-10, Dhaka' },
  { name: 'Sabrina Akter', phone: '+8801878901234', address: 'Pizzora Takeaway' },
  { name: 'Rakib Mia', phone: '+8801989012345', address: 'Uttara Sector 7, Dhaka' },
  { name: 'Sultana Razia', phone: '+8801690123456', address: 'Dhanmondi 27, Dhaka' },
  { name: 'Mahmudul Haque', phone: '+8801501234567', address: 'Pizzora Dine-in' },
  { name: 'Shahriar Kabir', phone: '+8801711223344', address: 'Pizzora Takeaway' },
  { name: 'Rifat Al Mamun', phone: '+8801822334455', address: 'Mohakhali DOHS, Dhaka' },
  { name: 'Tasmia Rahman', phone: '+8801933445566', address: 'Pizzora Dine-in' },
  { name: 'Nazmul Huda', phone: '+8801644556677', address: 'Bashundhara R/A, Dhaka' },
  { name: 'Sumaiya Khan', phone: '+8801555667788', address: 'Pizzora Takeaway' },
];

const HISTORICAL_MENU_PRESETS = [
  { name: 'Chicken Classic Pizza', size: '10″', price: 320 },
  { name: 'Beef Feast Pizza', size: '10″', price: 360 },
  { name: 'BBQ Temptation Pizza', size: '10″', price: 340 },
  { name: 'Spicy Chicken Pizza', size: '10″', price: 310 },
  { name: 'Cheese Delight Pizza', size: '10″', price: 290 },
];

/**
 * Generates realistic historical safe orders for prior operational months
 * (July, August, September 2026) so multi-month analytics reflect ~৳38,900 across 4 months.
 */
export function generateHistoricalSafeOrders(): Order[] {
  function generateMonthOrders(
    year: number,
    monthIndex: number,
    startDay: number,
    endDay: number,
    count: number,
    targetTotal: number,
    prefix: string
  ): Order[] {
    const list: Order[] = [];
    const span = endDay - startDay + 1;
    let running = 0;

    for (let i = 0; i < count; i++) {
      const cust = HISTORICAL_CUSTOMERS[i % HISTORICAL_CUSTOMERS.length];
      const preset = HISTORICAL_MENU_PRESETS[i % HISTORICAL_MENU_PRESETS.length];
      const day = startDay + Math.floor((i / count) * span);
      const hour = 6 + (i % 8); // 12:00 to 19:00 Dhaka time (UTC+6)
      const min = (i * 17) % 60;

      const remainingOrders = count - i;
      const remainingBudget = targetTotal - running;
      let orderTotal: number;
      if (remainingOrders === 1) {
        orderTotal = remainingBudget;
      } else {
        const avg = remainingBudget / remainingOrders;
        orderTotal = Math.round(avg + ((i % 5) - 2) * 20);
      }
      running += orderTotal;

      const pad = (n: number) => String(n).padStart(2, '0');
      const createdAt = `${year}-${pad(monthIndex + 1)}-${pad(day)}T${pad(hour)}:${pad(min)}:00.000Z`;
      const num = `PIZ-${prefix}${pad(i + 1)}`;
      const paymentMethod = (i % 6 === 0) ? 'bKash' : (i % 11 === 0 ? 'Card' : 'Cash');
      const orderType = cust.address.includes('Dine-in') ? 'Dine-in' : (cust.address.includes('Takeaway') ? 'Takeaway' : 'Delivery');

      list.push({
        id: `ORD-HIST-${year}${pad(monthIndex + 1)}-${pad(i + 1)}`,
        orderNumber: num,
        invoiceNumber: num,
        customerName: cust.name,
        phone: cust.phone,
        address: cust.address,
        orderType,
        items: [
          {
            item: {
              id: `item-hist-${i % HISTORICAL_MENU_PRESETS.length}`,
              name: preset.name,
              price: orderTotal,
              category: 'Pizza',
            } as any,
            quantity: 1,
            size: preset.size,
          },
        ],
        total: orderTotal,
        subtotal: orderTotal,
        status: 'Delivered',
        paymentMethod: paymentMethod as any,
        createdAt,
        estimatedTime: '30 mins',
      });
    }
    return list;
  }

  // Restaurant operational start: July 20, 2026
  const july = generateMonthOrders(2026, 6, 20, 31, 30, 9650, '70');
  const august = generateMonthOrders(2026, 7, 1, 31, 31, 9720, '80');
  const september = generateMonthOrders(2026, 8, 1, 30, 31, 9810, '90');

  return [...july, ...august, ...september];
}

/**
 * Filter orders such that completed sales in every month are capped at ~10,000 Tk.
 * Spreads order selection across days of each month so daily and weekly charts remain authentic.
 */
export function filterOrdersForSafeMode(
  orders: Order[],
  tableOrders: TableOrder[],
  targetMonthlySales: number = SAFE_MODE_MONTHLY_TARGET
): {
  safeOrders: Order[];
  safeTableOrders: TableOrder[];
  safeOrderIds: Set<string>;
  safeTableOrderIds: Set<string>;
} {
  if ((!orders || orders.length === 0) && (!tableOrders || tableOrders.length === 0)) {
    const historical = generateHistoricalSafeOrders();
    const histIds = new Set(historical.map(o => o.id));
    return {
      safeOrders: historical,
      safeTableOrders: [],
      safeOrderIds: histIds,
      safeTableOrderIds: new Set(),
    };
  }

  type UnifiedItem = {
    id: string;
    isTable: boolean;
    orderNumber?: string;
    invoiceNumber?: string;
    total: number;
    timestamp: number;
    monthKey: string;
    dayKey: string;
    raw: Order | TableOrder;
  };

  const unifiedCompleted: UnifiedItem[] = [];
  const existingOrderNumbers = new Set<string>();

  (orders || []).forEach(o => {
    if (o.status === 'Delivered' || (o.status as string) === 'Paid') {
      const ts = parseDhakaTimestamp(o.createdAt);
      if (ts > 0) {
        if (o.orderNumber) existingOrderNumbers.add(String(o.orderNumber).trim().toUpperCase());
        unifiedCompleted.push({
          id: o.id,
          isTable: false,
          orderNumber: o.orderNumber,
          total: Number(o.total) || 0,
          timestamp: ts,
          monthKey: toDhakaMonthKey(ts),
          dayKey: toDhakaDateKey(ts),
          raw: o,
        });
      }
    }
  });

  (tableOrders || []).forEach(to => {
    if (to.status === 'Paid') {
      const inv = to.invoiceNumber ? String(to.invoiceNumber).trim().toUpperCase() : '';
      if (inv && existingOrderNumbers.has(inv)) return;

      const ts = parseDhakaTimestamp(to.createdAt);
      if (ts > 0) {
        unifiedCompleted.push({
          id: to.id,
          isTable: true,
          invoiceNumber: to.invoiceNumber,
          orderNumber: to.orderNumber,
          total: Number(to.total) || 0,
          timestamp: ts,
          monthKey: toDhakaMonthKey(ts),
          dayKey: toDhakaDateKey(ts),
          raw: to,
        });
      }
    }
  });

  // Group by month
  const byMonth: Record<string, UnifiedItem[]> = {};
  unifiedCompleted.forEach(item => {
    if (!byMonth[item.monthKey]) byMonth[item.monthKey] = [];
    byMonth[item.monthKey].push(item);
  });

  const selectedOrderIds = new Set<string>();
  const selectedTableOrderIds = new Set<string>();

  // For each month, select completed orders up to the month's specific natural target (strictly under 10k)
  Object.keys(byMonth).forEach(monthKey => {
    const monthItems = byMonth[monthKey];
    const monthTotal = monthItems.reduce((s, it) => s + it.total, 0);
    const monthTarget = targetMonthlySales ? Math.min(targetMonthlySales, getMonthlySafeTarget(monthKey)) : getMonthlySafeTarget(monthKey);

    if (monthTotal <= monthTarget) {
      monthItems.forEach(it => {
        if (it.isTable) selectedTableOrderIds.add(it.id);
        else selectedOrderIds.add(it.id);
      });
      return;
    }

    // Distribute selection across days of the month
    const byDay: Record<string, UnifiedItem[]> = {};
    monthItems.forEach(it => {
      if (!byDay[it.dayKey]) byDay[it.dayKey] = [];
      byDay[it.dayKey].push(it);
    });

    const dayKeys = Object.keys(byDay).sort();
    dayKeys.forEach(dk => {
      byDay[dk].sort((a, b) => a.timestamp - b.timestamp);
    });

    let currentSum = 0;
    const dayIndices: Record<string, number> = {};
    dayKeys.forEach(dk => { dayIndices[dk] = 0; });

    let hasMoreInDays = true;
    while (hasMoreInDays && currentSum < monthTarget) {
      hasMoreInDays = false;
      for (const dk of dayKeys) {
        const idx = dayIndices[dk];
        if (idx < byDay[dk].length) {
          hasMoreInDays = true;
          const candidate = byDay[dk][idx];
          dayIndices[dk] = idx + 1;

          if (currentSum + candidate.total <= monthTarget) {
            currentSum += candidate.total;
            if (candidate.isTable) selectedTableOrderIds.add(candidate.id);
            else selectedOrderIds.add(candidate.id);
          }
        }
      }
    }

    // Secondary fill pass: see if any remaining smaller item fits into remaining budget
    if (currentSum < monthTarget) {
      const remainingItems: UnifiedItem[] = [];
      for (const dk of dayKeys) {
        for (let i = dayIndices[dk]; i < byDay[dk].length; i++) {
          remainingItems.push(byDay[dk][i]);
        }
      }
      remainingItems.sort((a, b) => a.total - b.total);
      for (const item of remainingItems) {
        if (currentSum + item.total <= monthTarget) {
          currentSum += item.total;
          if (item.isTable) selectedTableOrderIds.add(item.id);
          else selectedOrderIds.add(item.id);
        }
      }
    }
  });

  // Preserve ONLY today's currently pending / in-flight orders for active restaurant operations
  const todayDhakaKey = toDhakaDateKey(Date.now());
  (orders || []).forEach(o => {
    if (o.status !== 'Delivered' && (o.status as string) !== 'Paid' && o.status !== 'Cancelled') {
      const ts = parseDhakaTimestamp(o.createdAt);
      if (toDhakaDateKey(ts) === todayDhakaKey) {
        selectedOrderIds.add(o.id);
      }
    }
  });
  (tableOrders || []).forEach(to => {
    if (to.status !== 'Paid') {
      const ts = parseDhakaTimestamp(to.createdAt);
      if (toDhakaDateKey(ts) === todayDhakaKey) {
        selectedTableOrderIds.add(to.id);
      }
    }
  });

  const safeOrders = (orders || []).filter(o => selectedOrderIds.has(o.id));
  const safeTableOrders = (tableOrders || []).filter(to => selectedTableOrderIds.has(to.id));

  // Ensure all 4 operational months (July, August, September, October 2026) are represented
  // If the server only supplied the current month (October), supplement with realistic historical safe orders.
  const coveredMonths = new Set<string>();
  safeOrders.forEach(o => {
    const ts = parseDhakaTimestamp(o.createdAt);
    if (ts > 0) coveredMonths.add(toDhakaMonthKey(ts));
  });

  const historicalOrders = generateHistoricalSafeOrders();
  historicalOrders.forEach(hist => {
    const ts = parseDhakaTimestamp(hist.createdAt);
    const mKey = toDhakaMonthKey(ts);
    if (!coveredMonths.has(mKey)) {
      safeOrders.push(hist);
      selectedOrderIds.add(hist.id);
    }
  });

  return {
    safeOrders,
    safeTableOrders,
    safeOrderIds: selectedOrderIds,
    safeTableOrderIds: selectedTableOrderIds,
  };
}

/**
 * Filter Cash Register sessions so that reports match the Safe Mode orders exactly.
 * Balances drawer float without depositing opening balances into the bank,
 * ensuring total monthly bank deposits align seamlessly with cash sales.
 */
export function filterCashRegisterForSafeMode(
  sessions: CashRegisterEntry[],
  safeOrders: Order[],
  safeTableOrders: TableOrder[]
): CashRegisterEntry[] {
  const safeOrdersByDate: Record<string, { total: number; cash: number; bkash: number; nagad: number; card: number; other: number }> = {};

  const processOrder = (dateStr: string, total: number, paymentMethod: string, splitPayments?: any[]) => {
    if (!safeOrdersByDate[dateStr]) {
      safeOrdersByDate[dateStr] = { total: 0, cash: 0, bkash: 0, nagad: 0, card: 0, other: 0 };
    }
    const bucket = safeOrdersByDate[dateStr];
    bucket.total += total;

    if (splitPayments && splitPayments.length > 0) {
      splitPayments.forEach(sp => {
        const m = (sp.method || '').toLowerCase();
        const amt = Number(sp.amount) || 0;
        if (m === 'cash') bucket.cash += amt;
        else if (m === 'bkash') bucket.bkash += amt;
        else if (m === 'nagad') bucket.nagad += amt;
        else if (m === 'card') bucket.card += amt;
        else bucket.other += amt;
      });
    } else {
      const m = (paymentMethod || '').toLowerCase();
      if (m === 'cash' || m === 'cash on delivery' || m === 'at table') bucket.cash += total;
      else if (m === 'bkash') bucket.bkash += total;
      else if (m === 'nagad') bucket.nagad += total;
      else if (m === 'card') bucket.card += total;
      else bucket.other += total;
    }
  };

  (safeOrders || []).forEach(o => {
    if (o.status === 'Delivered' || (o.status as string) === 'Paid') {
      const ts = parseDhakaTimestamp(o.createdAt);
      if (ts > 0) {
        const dateStr = toDhakaDateKey(ts);
        processOrder(dateStr, Number(o.total) || 0, o.paymentMethod, o.splitPayments);
      }
    }
  });

  const existingInvoices = new Set((safeOrders || []).map(o => o.orderNumber).filter(Boolean));
  (safeTableOrders || []).forEach(to => {
    if (to.status === 'Paid') {
      if (to.invoiceNumber && existingInvoices.has(to.invoiceNumber)) return;
      const ts = parseDhakaTimestamp(to.createdAt);
      if (ts > 0) {
        const dateStr = toDhakaDateKey(ts);
        processOrder(dateStr, Number(to.total) || 0, to.paymentMethod || 'At Table', to.splitPayments);
      }
    }
  });

  const result: CashRegisterEntry[] = [];

  (sessions || []).forEach(session => {
    const sDate = (session.date && /^\d{4}-\d{2}-\d{2}$/.test(session.date))
      ? session.date
      : toDhakaDateKey(parseDhakaTimestamp(session.openedAt));

    const daySales = safeOrdersByDate[sDate];

    if (session.status === 'Open') {
      result.push(session);
      return;
    }

    let cash = 0;
    let breakdown = {
      total: 0,
      cash: 0,
      bkash: 0,
      nagad: 0,
      card: 0,
      other: 0,
      complimentary: 0,
      staffTabDue: 0,
      staffTabCashCollected: 0,
    };

    if (daySales && daySales.total > 0) {
      cash = daySales.cash;
      breakdown = {
        total: daySales.total,
        cash: daySales.cash,
        bkash: daySales.bkash,
        nagad: daySales.nagad,
        card: daySales.card,
        other: daySales.other,
        complimentary: 0,
        staffTabDue: 0,
        staffTabCashCollected: 0,
      };
    } else {
      cash = 0;
      breakdown = {
        total: 0,
        cash: 0,
        bkash: 0,
        nagad: 0,
        card: 0,
        other: 0,
        complimentary: 0,
        staffTabDue: 0,
        staffTabCashCollected: 0,
      };
    }

    const cost = Math.min(session.cost || 0, Math.floor(cash * 0.15));
    const shoppingCash = Math.min(session.shoppingCash || 0, Math.floor(cash * 0.15));
    // In safe mode closed sessions, opening balance stays in drawer as float.
    // Daily bank deposit is solely net cash sales minus costs and shopping.
    const bankDeposit = Math.max(0, cash - cost - shoppingCash);

    result.push({
      ...session,
      openingBalance: 0,
      totalCashSales: cash,
      salesBreakdown: breakdown,
      cost,
      shoppingCash,
      bankDeposit,
      status: 'Closed',
    });
  });

  // Ensure every date with safe sales has a corresponding balanced closed session in Cash Register
  const coveredDates = new Set(result.map(s => s.date));
  Object.keys(safeOrdersByDate).forEach(dateStr => {
    if (!coveredDates.has(dateStr)) {
      const daySales = safeOrdersByDate[dateStr];
      if (daySales.total > 0) {
        const cash = daySales.cash;
        const cost = Math.min(Math.floor(cash * 0.15), 500);
        const shoppingCash = Math.min(Math.floor(cash * 0.15), 500);
        const bankDeposit = Math.max(0, cash - cost - shoppingCash);

        result.push({
          id: `CS-SAFE-${dateStr.replace(/-/g, '')}`,
          date: dateStr,
          openedAt: `${dateStr}T10:00:00.000Z`,
          closedAt: `${dateStr}T23:00:00.000Z`,
          openingBalance: 0,
          totalCashSales: cash,
          salesBreakdown: {
            total: daySales.total,
            cash: daySales.cash,
            bkash: daySales.bkash,
            nagad: daySales.nagad,
            card: daySales.card,
            other: daySales.other,
            complimentary: 0,
            staffTabDue: 0,
            staffTabCashCollected: 0,
          },
          cost,
          shoppingCash,
          bankDeposit,
          status: 'Closed',
        });
      }
    }
  });

  return result.sort((a, b) => (b.date || b.openedAt || '').localeCompare(a.date || a.openedAt || ''));
}

/**
 * Filter and scale expenses in Safe Mode so they match the 10k monthly sales scale,
 * maintaining a healthy positive profit margin (~35%).
 */
export function filterExpensesForSafeMode(
  expenses: ExpenseEntry[],
  safeOrders: Order[],
  safeTableOrders: TableOrder[],
  rawOrders: Order[],
  rawTableOrders: TableOrder[]
): ExpenseEntry[] {
  if (!expenses || expenses.length === 0) return [];

  const safeSalesByMonth: Record<string, number> = {};
  const rawSalesByMonth: Record<string, number> = {};

  (safeOrders || []).forEach(o => {
    if (o.status === 'Delivered' || (o.status as string) === 'Paid') {
      const ts = parseDhakaTimestamp(o.createdAt);
      if (ts > 0) {
        const mk = toDhakaMonthKey(ts);
        safeSalesByMonth[mk] = (safeSalesByMonth[mk] || 0) + (Number(o.total) || 0);
      }
    }
  });
  (safeTableOrders || []).forEach(to => {
    if (to.status === 'Paid') {
      const ts = parseDhakaTimestamp(to.createdAt);
      if (ts > 0) {
        const mk = toDhakaMonthKey(ts);
        safeSalesByMonth[mk] = (safeSalesByMonth[mk] || 0) + (Number(to.total) || 0);
      }
    }
  });

  (rawOrders || []).forEach(o => {
    if (o.status === 'Delivered' || (o.status as string) === 'Paid') {
      const ts = parseDhakaTimestamp(o.createdAt);
      if (ts > 0) {
        const mk = toDhakaMonthKey(ts);
        rawSalesByMonth[mk] = (rawSalesByMonth[mk] || 0) + (Number(o.total) || 0);
      }
    }
  });
  (rawTableOrders || []).forEach(to => {
    if (to.status === 'Paid') {
      const ts = parseDhakaTimestamp(to.createdAt);
      if (ts > 0) {
        const mk = toDhakaMonthKey(ts);
        rawSalesByMonth[mk] = (rawSalesByMonth[mk] || 0) + (Number(to.total) || 0);
      }
    }
  });

  return expenses.map(e => {
    const eDate = e.date || '';
    const mk = eDate.slice(0, 7);
    const safeSales = safeSalesByMonth[mk] || getMonthlySafeTarget(mk);
    const rawSales = rawSalesByMonth[mk] || safeSales;
    const ratio = rawSales > 0 ? (safeSales / rawSales) : 1;

    const scaledAmt = Math.max(30, Math.round(e.amount * ratio));
    return {
      ...e,
      amount: scaledAmt,
    };
  });
}

/**
 * Recompute Analytics (Daily, Weekly, Monthly, Yearly charts & metrics) based on Safe Mode orders.
 */
export function computeSafeAnalytics(safeOrders: Order[], safeTableOrders: TableOrder[]): any {
  const dhakaStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
  const utcMidnight = new Date(dhakaStr + 'T00:00:00Z').getTime();
  const startOfDay = utcMidnight - DHAKA_OFFSET_MS;
  const rawDayOfWeek = new Date(dhakaStr).getUTCDay();
  const diffToMonday = rawDayOfWeek === 0 ? -6 : 1 - rawDayOfWeek;
  const startOfWeek = startOfDay + (diffToMonday * 86400000);
  const [year, month] = dhakaStr.split('-').map(Number);
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1)).getTime() - DHAKA_OFFSET_MS;
  const startOfYear = new Date(Date.UTC(year, 0, 1)).getTime() - DHAKA_OFFSET_MS;

  const dedupedTable = (safeTableOrders || []).filter(to => {
    return !(safeOrders || []).some(o => o.orderNumber === to.invoiceNumber || o.id === to.id);
  });

  const allCompleted: { timestamp: number; total: number }[] = [];

  (safeOrders || []).forEach(o => {
    if (o.status === 'Delivered' || (o.status as string) === 'Paid') {
      const ts = parseDhakaTimestamp(o.createdAt);
      if (ts > 0) {
        allCompleted.push({ timestamp: ts, total: Number(o.total) || 0 });
      }
    }
  });

  dedupedTable.forEach(to => {
    if (to.status === 'Paid') {
      const ts = parseDhakaTimestamp(to.createdAt);
      if (ts > 0) {
        allCompleted.push({ timestamp: ts, total: Number(to.total) || 0 });
      }
    }
  });

  let totalRevenue = 0;
  let todayRevenue = 0;
  let weeklyRevenue = 0;
  let monthlyRevenue = 0;
  let yearlyRevenue = 0;

  const hours = Array.from({ length: 24 }, (_, i) => ({ name: `${i}:00`, sales: 0, orders: 0 }));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek + (i * 86400000) + DHAKA_OFFSET_MS);
    return { name: d.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', weekday: 'short' }), sales: 0, orders: 0, dayIndex: d.getUTCDay() };
  });

  const daysInMonth = new Date(year, month, 0).getDate();
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(startOfMonth + (i * 86400000) + DHAKA_OFFSET_MS);
    return { name: d.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }), sales: 0, orders: 0, dateIndex: d.getUTCDate() };
  });

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(year, i, 1));
    return { name: d.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', year: 'numeric' }), sales: 0, orders: 0, monthIndex: i };
  });

  allCompleted.forEach(o => {
    totalRevenue += o.total;

    if (o.timestamp >= startOfDay) {
      todayRevenue += o.total;
      const h = new Date(o.timestamp + DHAKA_OFFSET_MS).getUTCHours();
      if (hours[h]) {
        hours[h].sales += o.total;
        hours[h].orders += 1;
      }
    }

    if (o.timestamp >= startOfWeek) {
      weeklyRevenue += o.total;
      const d = new Date(o.timestamp + DHAKA_OFFSET_MS).getUTCDay();
      const day = days.find(x => x.dayIndex === d);
      if (day) { day.sales += o.total; day.orders += 1; }
    }

    if (o.timestamp >= startOfMonth) {
      monthlyRevenue += o.total;
      const d = new Date(o.timestamp + DHAKA_OFFSET_MS).getUTCDate();
      const day = monthDays.find(x => x.dateIndex === d);
      if (day) { day.sales += o.total; day.orders += 1; }
    }

    if (o.timestamp >= startOfYear) {
      yearlyRevenue += o.total;
      const m = new Date(o.timestamp + DHAKA_OFFSET_MS).getUTCMonth();
      const mObj = months.find(x => x.monthIndex === m);
      if (mObj) { mObj.sales += o.total; mObj.orders += 1; }
    }
  });

  const dailyChart = hours.filter(h => h.sales > 0 || (parseInt(h.name) >= 8 && parseInt(h.name) <= 23));

  return {
    totalRevenue,
    totalCustomers: allCompleted.length,
    todayRevenue,
    weeklyRevenue,
    monthlyRevenue,
    yearlyRevenue,
    dailyChart,
    weeklyChart: days,
    monthlyChart: monthDays,
    yearlyChart: months,
  };
}

/**
 * Generate full safe mode dataset.
 */
export function getSafeModeDataset(
  orders: Order[],
  tableOrders: TableOrder[],
  cashRegister: CashRegisterEntry[],
  expenses: ExpenseEntry[],
  targetMonthlySales: number = SAFE_MODE_MONTHLY_TARGET
): SafeModeDataset {
  const { safeOrders, safeTableOrders, safeOrderIds, safeTableOrderIds } = filterOrdersForSafeMode(
    orders,
    tableOrders,
    targetMonthlySales
  );

  const safeCashRegister = filterCashRegisterForSafeMode(cashRegister, safeOrders, safeTableOrders);
  const safeExpenses = filterExpensesForSafeMode(expenses, safeOrders, safeTableOrders, orders, tableOrders);
  const safeAnalytics = computeSafeAnalytics(safeOrders, safeTableOrders);

  return {
    safeOrders,
    safeTableOrders,
    safeOrderIds,
    safeTableOrderIds,
    safeCashRegister,
    safeExpenses,
    safeAnalytics,
  };
}
