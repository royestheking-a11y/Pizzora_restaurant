import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { TrendingUp, DollarSign, Package, Star } from 'lucide-react';
import { TableRowSkeleton, AdminStatSkeleton } from '../Skeletons';

export function ProductAnalytics() {
  const { state } = useApp();

  const productStats = useMemo(() => {
    const stats: Record<string, {
      id: string;
      name: string;
      sold: number;
      revenue: number;
      cost: number;
    }> = {};

    // Helper to process items
    const processItem = (id: string, name: string, price: number, quantity: number, cost?: number) => {
      const key = name;
      if (!stats[key]) {
        stats[key] = { id: id || key, name, sold: 0, revenue: 0, cost: 0 };
      }
      stats[key].sold += quantity;
      stats[key].revenue += price * quantity;
      // Default cost to 38% of price if unknown (62% margin)
      const itemCost = cost ?? (price * 0.38);
      stats[key].cost += itemCost * quantity;
    };

    // Tally POS Orders
    state.orders.forEach(order => {
      if (order.status !== 'Cancelled') {
        order.items.forEach(c => {
          processItem(c.item.id, c.item.name, c.item.price, c.quantity, c.item.cost);
        });
      }
    });

    // Tally Table Orders
    state.tableOrders.forEach(order => {
      if (order.status !== 'Pending') {
        order.items.forEach(c => {
          // Find matching menu item to get cost, if possible
          const menuItem = state.menuItems.find(m => m.id === c.itemId || m.name === c.name);
          processItem(c.itemId, c.name, c.price, c.quantity, menuItem?.cost);
        });
      }
    });

    return Object.values(stats).sort((a, b) => b.sold - a.sold);
  }, [state.orders, state.tableOrders, state.menuItems]);

  const totalRevenue = productStats.reduce((sum, p) => sum + p.revenue, 0);
  const totalCost = productStats.reduce((sum, p) => sum + p.cost, 0);
  const totalProfit = totalRevenue - totalCost;
  const overallMargin = totalRevenue ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)', color: '#111' }}>Product Analytics</h2>
          <p className="text-gray-500 text-sm mt-1">Track sales, revenue, and profit margins per product.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {state.isInitialLoading ? (
          Array.from({ length: 4 }).map((_, i) => <AdminStatSkeleton key={i} />)
        ) : (
          [<div key={1} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-50 text-green-600">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Product Revenue</p>
            <p className="text-2xl font-bold text-gray-900">৳ {totalRevenue.toFixed(2)}</p>
          </div>
        </div>,
        <div key={2} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-50 text-blue-600">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Est. Gross Profit</p>
            <p className="text-2xl font-bold text-gray-900">৳ {totalProfit.toFixed(2)}</p>
          </div>
        </div>,
        <div key={3} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-purple-50 text-purple-600">
            <Star size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Overall Margin</p>
            <p className="text-2xl font-bold text-gray-900">{overallMargin}%</p>
          </div>
        </div>])}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
                <th className="p-4">Product Name</th>
                <th className="p-4">Units Sold</th>
                <th className="p-4">Revenue</th>
                <th className="p-4">Est. Cost</th>
                <th className="p-4">Gross Profit</th>
                <th className="p-4">Margin</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100">
              {state.isInitialLoading ? (
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={6} />)
              ) : (
                <>
                  {productStats.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">No sales data available.</td>
                    </tr>
                  ) : (
                    productStats.map(stat => {
                  const profit = stat.revenue - stat.cost;
                  const margin = stat.revenue ? ((profit / stat.revenue) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={stat.name} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-bold text-gray-900 flex items-center gap-2">
                        <Package size={16} className="text-gray-400" />
                        {stat.name}
                      </td>
                      <td className="p-4 text-gray-900 font-medium">{stat.sold}</td>
                      <td className="p-4 text-green-600 font-semibold">৳ {stat.revenue.toFixed(2)}</td>
                      <td className="p-4 text-gray-500">৳ {stat.cost.toFixed(2)}</td>
                      <td className="p-4 text-blue-600 font-semibold">৳ {profit.toFixed(2)}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${parseFloat(margin) >= 50 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {margin}%
                        </span>
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
  );
}
