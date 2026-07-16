import { useEffect } from 'react';
import { Link } from 'react-router';
import { Package, ChefHat, Truck, CheckCircle, XCircle, Clock, Phone, ShoppingBag } from 'lucide-react';
import { useApp, OrderStatus } from '../context/AppContext';
import { SOCKET_URL } from '../context/AppContext';

const statusSteps: { status: OrderStatus; icon: typeof Package; label: string; desc: string }[] = [
  { status: 'Pending', icon: Clock, label: 'Order Received', desc: 'Your order has been received and is being reviewed.' },
  { status: 'Preparing', icon: ChefHat, label: 'Preparing', desc: 'Our chefs are preparing your delicious food.' },
  { status: 'Out for Delivery', icon: Truck, label: 'Out for Delivery', desc: 'Your order is on its way to you!' },
  { status: 'Delivered', icon: CheckCircle, label: 'Delivered', desc: 'Your order has been delivered. Enjoy your meal!' },
];

function getStatusIndex(status: OrderStatus): number {
  const map: Record<OrderStatus, number> = {
    Pending: 0, Preparing: 1, 'Out for Delivery': 2, Delivered: 3, Cancelled: -1,
  };
  return map[status];
}

export function OrderTracking() {
  const { state, dispatch } = useApp();
  const orders = state.orders;

  // Smart Polling: Fetch active order statuses every 5 seconds
  useEffect(() => {
    const activeOrders = orders.filter(o => !['Delivered', 'Cancelled'].includes(o.status));
    if (activeOrders.length === 0) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`${SOCKET_URL}/api/orders/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderIds: activeOrders.map(o => o.id) })
        });
        const data = await res.json();
        if (data.success && data.statuses) {
          const changed = data.statuses.filter((s: any) => {
            const current = activeOrders.find(o => o.id === s.id);
            return current && current.status !== s.status;
          });
          if (changed.length > 0) {
            dispatch({ type: 'SYNC_ORDER_STATUSES', payload: changed });
          }
        }
      } catch (err) {
        console.error('Failed to poll order status', err);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [orders, dispatch]);

  if (orders.length === 0) {
    return (
      <div style={{ paddingTop: '80px', minHeight: '100vh' }} className="flex items-center justify-center">
        <div className="text-center px-4">
          <ShoppingBag size={64} className="mx-auto mb-4" style={{ color: '#D1D5DB' }} />
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '24px', color: '#111', marginBottom: '8px' }}>No Orders Yet</h2>
          <p style={{ color: '#6B7280', marginBottom: '20px' }}>You haven't placed any orders yet.</p>
          <Link
            to="/menu"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold"
            style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)' }}
          >
            Order Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '80px', minHeight: '100vh', backgroundColor: '#F9F5F0' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '32px', color: '#111', marginBottom: '6px' }}>
          Order Tracking
        </h1>
        <p style={{ color: '#6B7280', fontSize: '15px', marginBottom: '28px' }}>
          Track your recent orders in real-time.
        </p>

        <div className="space-y-6">
          {orders.map(order => {
            const currentStep = getStatusIndex(order.status);
            const isCancelled = order.status === 'Cancelled';

            return (
              <div key={order.id} className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(249,0,43,0.06)' }}>
                {/* Order Header */}
                <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgba(249,0,43,0.06)' }}>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '16px', color: '#111' }}>
                        Order #{order.orderNumber}
                      </h3>
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: isCancelled ? '#FEE2E2' : order.status === 'Delivered' ? '#D1FAE5' : order.status === 'Out for Delivery' ? '#DBEAFE' : '#FEF3C7',
                          color: isCancelled ? '#991B1B' : order.status === 'Delivered' ? '#065F46' : order.status === 'Out for Delivery' ? '#1E40AF' : '#92400E',
                          fontFamily: 'var(--font-heading)',
                        }}
                      >
                        {order.status}
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
                      {new Date(order.createdAt).toLocaleDateString('en-BD', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '20px', color: '#F9002B' }}>৳{order.total}</p>
                    <p style={{ fontSize: '13px', color: '#6B7280' }}>{order.paymentMethod}</p>
                  </div>
                </div>

                {/* Status Tracker */}
                {!isCancelled ? (
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-8 relative">
                      <div className="absolute top-5 left-10 right-10 h-0.5" style={{ backgroundColor: '#E5E7EB', zIndex: 0 }}>
                        <div
                          className="h-full transition-all duration-500"
                          style={{
                            width: `${(currentStep / (statusSteps.length - 1)) * 100}%`,
                            background: 'linear-gradient(90deg, #F9002B, #F9002B)',
                          }}
                        />
                      </div>
                      {statusSteps.map((step, i) => {
                        const Icon = step.icon;
                        const isDone = i <= currentStep;
                        return (
                          <div key={step.status} className="flex flex-col items-center gap-2 relative z-10">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-all"
                              style={{
                                background: isDone ? 'linear-gradient(135deg, #F9002B, #C8001F)' : 'white',
                                border: `2px solid ${isDone ? '#F9002B' : '#E5E7EB'}`,
                              }}
                            >
                              <Icon size={18} style={{ color: isDone ? '#F9002B' : '#D1D5DB' }} />
                            </div>
                            <p style={{ fontFamily: 'var(--font-heading)', fontWeight: isDone ? 700 : 400, fontSize: '11px', color: isDone ? '#F9002B' : '#9CA3AF', textAlign: 'center', maxWidth: '70px' }}>
                              {step.label}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Current Status Message */}
                    <div
                      className="flex items-start gap-3 p-4 rounded-xl"
                      style={{ backgroundColor: 'rgba(249,0,43,0.05)', border: '1px solid rgba(249,0,43,0.1)' }}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)' }}>
                        {(() => { const Icon = statusSteps[currentStep]?.icon || Clock; return <Icon size={14} className="text-white" />; })()}
                      </div>
                      <div>
                        <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '14px', color: '#111' }}>
                          {statusSteps[currentStep]?.label}
                        </p>
                        <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>
                          {statusSteps[currentStep]?.desc}
                        </p>
                        {order.status !== 'Delivered' && (
                          <p style={{ fontSize: '13px', color: '#F9002B', fontWeight: 600, marginTop: '4px' }}>
                            Estimated: {order.estimatedTime}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 flex items-center gap-3">
                    <XCircle size={20} style={{ color: '#DC2626' }} />
                    <p style={{ color: '#DC2626', fontWeight: 600, fontSize: '14px' }}>This order has been cancelled.</p>
                  </div>
                )}

                {/* Order Items */}
                <div className="px-6 pb-5 border-t" style={{ borderColor: 'rgba(249,0,43,0.06)' }}>
                  <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '13px', color: '#6B7280', margin: '14px 0 10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Items Ordered
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {order.items.map(ci => (
                      <div key={ci.item.id} className="flex items-center gap-2">
                        <img src={ci.item.image} alt={ci.item.name} className="w-10 h-10 rounded-lg object-cover" />
                        <div>
                          <p style={{ fontSize: '12px', fontWeight: 600, color: '#111' }}>{ci.item.name}</p>
                          <p style={{ fontSize: '11px', color: '#6B7280' }}>x{ci.quantity} • ৳{ci.item.price * ci.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delivery Info */}
                <div className="px-6 py-4 border-t flex flex-wrap gap-4" style={{ borderColor: 'rgba(249,0,43,0.06)', backgroundColor: '#FAFAFA' }}>
                  <div className="flex items-center gap-2" style={{ fontSize: '13px', color: '#6B7280' }}>
                    <Truck size={14} /> {order.address}
                  </div>
                  <div className="flex items-center gap-2" style={{ fontSize: '13px', color: '#6B7280' }}>
                    <Phone size={14} /> {order.phone}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
