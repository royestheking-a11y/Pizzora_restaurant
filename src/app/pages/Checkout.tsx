import { useState, ReactNode } from 'react';
import { useNavigate, Link } from 'react-router';
import {
  ArrowLeft, Check, ShoppingBag, CreditCard, Truck,
  Clock, MapPin, Phone, User, FileText, ChevronRight, Package,
} from 'lucide-react';
import { useApp, PaymentMethod } from '../context/AppContext';

const paymentMethods: { id: PaymentMethod; label: string; icon: ReactNode; desc: string }[] = [
  { id: 'bKash',            label: 'bKash',            icon: <img src="/payment/Bkash.jpg" alt="bKash" className="w-full h-full object-contain rounded-xl" style={{ padding: '6px' }} />, desc: 'Pay securely via bKash mobile banking' },
  { id: 'Nagad',            label: 'Nagad',            icon: <img src="/payment/Nagad.jpg" alt="Nagad" className="w-full h-full object-contain rounded-xl" style={{ padding: '4px' }} />, desc: 'Pay securely via Nagad mobile banking' },
  { id: 'Card',             label: 'Card Payment',     icon: <div className="flex flex-col items-center justify-center h-full w-full gap-0.5" style={{ padding: '6px' }}><img src="/payment/Visa-Logo.png" alt="Visa" className="h-3.5 object-contain" /><img src="/payment/mastercard-featured-image-1080x628.jpg" alt="MasterCard" className="h-4 object-contain" /></div>, desc: 'Pay securely via Visa or MasterCard' },
  { id: 'Cash on Delivery', label: 'Cash on Delivery', icon: <div className="w-9 h-9 flex items-center justify-center rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 font-extrabold text-xl shadow-sm">৳</div>, desc: 'Pay when your order arrives' },
];

const STEPS = ['Delivery Info', 'Payment', 'Confirm'];

export function Checkout() {
  const { state, dispatch, cartTotal } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash on Delivery');
  const [form, setForm] = useState({ name: '', phone: '', address: '', city: 'Sylhet', notes: '' });
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState('');

  const delivery = cartTotal > 0 ? 40 : 0;
  const grandTotal = cartTotal + delivery;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '13px 16px 13px 42px',
    borderRadius: '12px',
    border: '1.5px solid rgba(249,0,43,0.15)',
    fontSize: '14px',
    fontFamily: 'var(--font-body)',
    outline: 'none',
    color: '#111',
    backgroundColor: 'white',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  /* ── Empty cart guard ── */
  if (state.cart.length === 0 && !orderId) {
    return (
      <div style={{ paddingTop: '80px', minHeight: '100vh', background: '#F9F5F0' }} className="flex items-center justify-center">
        <div className="text-center px-4 max-w-sm">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg" style={{ background: 'white', border: '2px solid rgba(249,0,43,0.08)' }}>
            <ShoppingBag size={40} style={{ color: '#F9002B' }} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '26px', color: '#111', marginBottom: '10px' }}>Your cart is empty</h2>
          <p style={{ color: '#6B7280', marginBottom: '24px', lineHeight: 1.7 }}>Add items to your cart before checking out.</p>
          <Link
            to="/menu"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-white font-semibold transition-all hover:shadow-xl hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)' }}
          >
            Browse Menu
          </Link>
        </div>
      </div>
    );
  }

  const handlePlaceOrder = () => {
    setLoading(true);
    setTimeout(() => {
      const id = `RZQ${Date.now().toString().slice(-6)}`;
      const order = {
        id: Date.now().toString(),
        orderNumber: id,
        items: state.cart,
        total: grandTotal,
        status: 'Pending' as const,
        paymentMethod,
        customerName: form.name,
        phone: form.phone,
        address: `${form.address}, ${form.city}`,
        createdAt: new Date().toISOString(),
        estimatedTime: '30-45 minutes',
      };
      dispatch({ type: 'PLACE_ORDER', payload: order });
      
      // Save purchased item IDs for review eligibility
      try {
        const purchasedIds = state.cart.map(c => c.item.id);
        const stored = JSON.parse(localStorage.getItem('pizzora_purchased_items') || '[]');
        const updated = Array.from(new Set([...stored, ...purchasedIds]));
        localStorage.setItem('pizzora_purchased_items', JSON.stringify(updated));
      } catch (e) {}

      setOrderId(id);
      setLoading(false);
      setStep(3);
    }, 2000);
  };

  /* ── Success Screen ── */
  if (step === 3) {
    return (
      <div style={{ paddingTop: '80px', minHeight: '100vh', background: '#F9F5F0' }} className="flex items-center justify-center">
        <div className="text-center max-w-lg mx-auto px-6 py-16" style={{ animation: 'fadeUp 0.5s ease' }}>
          {/* Checkmark */}
          <div className="relative mx-auto mb-8 w-32 h-32">
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #F9002B, #F9002B)' }}
            >
              <Check size={54} className="text-white" strokeWidth={2.5} />
            </div>
          </div>

          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '32px', color: '#111', marginBottom: '10px' }}>
            Order Placed! 🎉
          </h2>
          <p style={{ color: '#6B7280', fontSize: '16px', lineHeight: 1.7, marginBottom: '20px' }}>
            Thank you, <span style={{ color: '#F9002B', fontWeight: 700 }}>{form.name}</span>! Your order is being prepared.
          </p>

          <div
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-8"
            style={{ background: 'rgba(249,0,43,0.07)', border: '1px solid rgba(249,0,43,0.15)' }}
          >
            <Package size={14} style={{ color: '#F9002B' }} />
            <span style={{ color: '#F9002B', fontWeight: 800, fontSize: '16px', fontFamily: 'var(--font-heading)' }}>
              #{orderId}
            </span>
          </div>

          {/* Info Card */}
          <div
            className="rounded-2xl p-6 mb-8 text-left space-y-4 shadow-sm"
            style={{ background: 'white', border: '1px solid rgba(249,0,43,0.08)' }}
          >
            {[
              { icon: Clock,      label: 'Estimated Time',  value: '30-45 minutes' },
              { icon: CreditCard, label: 'Payment Method',  value: paymentMethod },
              { icon: Truck,      label: 'Delivering To',   value: `${form.address}, ${form.city}` },
              { icon: Phone,      label: 'Contact',         value: form.phone },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(249,0,43,0.06)', border: '1px solid rgba(249,0,43,0.08)' }}
                >
                  <Icon size={15} style={{ color: '#F9002B' }} />
                </div>
                <div>
                  <p style={{ color: '#9CA3AF', fontSize: '12px', marginBottom: '2px' }}>{label}</p>
                  <p style={{ color: '#111', fontSize: '14px', fontWeight: 600 }}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/order-tracking')}
              className="flex-1 py-4 rounded-2xl text-white font-semibold transition-all hover:shadow-xl hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)', boxShadow: '0 6px 20px rgba(249,0,43,0.25)' }}
            >
              Track Order
            </button>
            <Link
              to="/menu"
              className="flex-1 py-4 rounded-2xl text-center font-semibold flex items-center justify-center transition-all hover:bg-gray-50"
              style={{ border: '2px solid rgba(249,0,43,0.2)', color: '#F9002B', fontFamily: 'var(--font-heading)' }}
            >
              Order More
            </Link>
          </div>
        </div>
        <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }`}</style>
      </div>
    );
  }

  /* ── Main Checkout Layout ── */
  return (
    <div style={{ paddingTop: '80px', minHeight: '100vh', background: '#F9F5F0', fontFamily: 'var(--font-body)' }}>

      {/* Page Hero Banner */}
      <div
        className="py-12 px-4 text-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)' }}
      >
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 70% 30%, #F9002B 0%, transparent 60%)' }} />
        <div className="relative max-w-6xl mx-auto flex items-center gap-4 px-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-white/20 flex-shrink-0"
            style={{ border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.8)' }}
          >
            <ArrowLeft size={17} />
          </button>
          <div className="text-left">
            <p style={{ color: '#F9002B', fontSize: '12px', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', fontFamily: 'var(--font-heading)', marginBottom: '4px' }}>
              Secure Checkout
            </p>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 'clamp(22px, 4vw, 34px)', color: '#fff' }}>
              Complete Your Order
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Progress Steps */}
        <div
          className="flex items-center mb-8 p-4 sm:p-5 rounded-2xl shadow-sm overflow-hidden"
          style={{ background: 'white', border: '1px solid rgba(249,0,43,0.08)' }}
        >
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center flex-1 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
                <div
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all flex-shrink-0"
                  style={{
                    background: step > i + 1
                      ? 'linear-gradient(135deg, #F9002B, #C8001F)'
                      : step === i + 1
                      ? 'linear-gradient(135deg, #F9002B, #C8001F)'
                      : '#F3F4F6',
                    color: step >= i + 1 ? 'white' : '#9CA3AF',
                    fontFamily: 'var(--font-heading)',
                    boxShadow: step === i + 1 ? '0 4px 14px rgba(249,0,43,0.3)' : 'none',
                    fontSize: '13px',
                  }}
                >
                  {step > i + 1 ? <Check size={13} strokeWidth={3} /> : i + 1}
                </div>
                <span
                  className="hidden sm:block truncate"
                  style={{
                    fontSize: '13px',
                    fontWeight: step === i + 1 ? 700 : 500,
                    color: step >= i + 1 ? '#111' : '#9CA3AF',
                    fontFamily: 'var(--font-heading)',
                  }}
                >
                  {label}
                </span>
                {/* Mobile: show label only for active step */}
                <span
                  className="sm:hidden truncate"
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: step === i + 1 ? '#F9002B' : 'transparent',
                    fontFamily: 'var(--font-heading)',
                    maxWidth: '60px',
                  }}
                >
                  {step === i + 1 ? label : ''}
                </span>
              </div>
              {i < 2 && (
                <div
                  className="flex-1 h-0.5 mx-1.5 sm:mx-3 rounded-full transition-all duration-500"
                  style={{ background: step > i + 1 ? 'linear-gradient(90deg, #F9002B, rgba(249,0,43,0.3))' : '#F3F4F6', minWidth: '8px' }}
                />
              )}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">

          {/* ── Left Panel ── */}
          <div className="order-2 lg:order-1">
            {/* Step 1 — Delivery */}
            {step === 1 && (
              <div
                className="rounded-2xl overflow-hidden shadow-sm"
                style={{ background: 'white', border: '1px solid rgba(249,0,43,0.08)' }}
              >
                <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(249,0,43,0.07)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(249,0,43,0.06)', border: '1px solid rgba(249,0,43,0.1)' }}>
                      <MapPin size={16} style={{ color: '#F9002B' }} />
                    </div>
                    <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '18px', color: '#111' }}>
                      Delivery Information
                    </h2>
                  </div>
                </div>

                <div className="px-6 py-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Name */}
                    <div>
                      <label style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '12px', color: '#6B7280', display: 'block', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Full Name *
                      </label>
                      <div className="relative">
                        <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9CA3AF' }} />
                        <input
                          type="text"
                          required
                          placeholder="Your full name"
                          value={form.name}
                          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                          style={inputStyle}
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <label style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '12px', color: '#6B7280', display: 'block', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Phone Number *
                      </label>
                      <div className="relative">
                        <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9CA3AF' }} />
                        <input
                          type="tel"
                          required
                          placeholder="+880 1XXXXXXXXX"
                          value={form.phone}
                          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                          style={inputStyle}
                        />
                      </div>
                    </div>

                    {/* Address */}
                    <div className="sm:col-span-2">
                      <label style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '12px', color: '#6B7280', display: 'block', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Delivery Address *
                      </label>
                      <div className="relative">
                        <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9CA3AF' }} />
                        <input
                          type="text"
                          required
                          placeholder="Street, area, landmark..."
                          value={form.address}
                          onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                          style={inputStyle}
                        />
                      </div>
                    </div>

                    {/* City */}
                    <div>
                      <label style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '12px', color: '#6B7280', display: 'block', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        City
                      </label>
                      <select
                        value={form.city}
                        onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                        style={{ ...inputStyle, paddingLeft: '16px' }}
                      >
                        <option value="Sylhet">Sylhet</option>
                        <option value="Sylhet Sadar">Sylhet Sadar</option>
                        <option value="Wazirpur">Wazirpur</option>
                        <option value="Muladi">Muladi</option>
                      </select>
                    </div>

                    {/* Notes */}
                    <div>
                      <label style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '12px', color: '#6B7280', display: 'block', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Order Notes
                      </label>
                      <div className="relative">
                        <FileText size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9CA3AF' }} />
                        <input
                          type="text"
                          placeholder="Special instructions..."
                          value={form.notes}
                          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                          style={inputStyle}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => { if (form.name && form.phone && form.address) setStep(2); }}
                    className="w-full mt-6 flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-semibold transition-all hover:shadow-xl hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)', fontSize: '15px', boxShadow: '0 6px 20px rgba(249,0,43,0.25)' }}
                  >
                    Continue to Payment
                    <ChevronRight size={17} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 — Payment */}
            {step === 2 && (
              <div
                className="rounded-2xl overflow-hidden shadow-sm"
                style={{ background: 'white', border: '1px solid rgba(249,0,43,0.08)' }}
              >
                <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(249,0,43,0.07)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(249,0,43,0.06)', border: '1px solid rgba(249,0,43,0.1)' }}>
                      <CreditCard size={16} style={{ color: '#F9002B' }} />
                    </div>
                    <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '18px', color: '#111' }}>
                      Payment Method
                    </h2>
                  </div>
                </div>

                <div className="px-6 py-6">
                  <div className="space-y-3 mb-6">
                    {paymentMethods.map(method => (
                      <div
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id)}
                        className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all hover:shadow-sm"
                        style={{
                          background: paymentMethod === method.id ? 'rgba(249,0,43,0.04)' : '#F9F5F0',
                          border: `2px solid ${paymentMethod === method.id ? '#F9002B' : 'rgba(249,0,43,0.1)'}`,
                          boxShadow: paymentMethod === method.id ? '0 0 0 4px rgba(249,0,43,0.06)' : 'none',
                        }}
                      >
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                          style={{ background: 'white', border: '1px solid rgba(249,0,43,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                        >
                          {method.icon}
                        </div>
                        <div className="flex-1">
                          <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px', color: '#111' }}>
                            {method.label}
                          </p>
                          <p style={{ fontSize: '13px', color: '#6B7280' }}>{method.desc}</p>
                        </div>
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center transition-all flex-shrink-0"
                          style={{
                            background: paymentMethod === method.id ? 'linear-gradient(135deg, #F9002B, #C8001F)' : 'white',
                            border: `2px solid ${paymentMethod === method.id ? '#F9002B' : '#D1D5DB'}`,
                          }}
                        >
                          {paymentMethod === method.id && <Check size={10} className="text-white" strokeWidth={3} />}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(1)}
                      className="flex-1 py-4 rounded-2xl font-semibold transition-all hover:bg-gray-50"
                      style={{ border: '1.5px solid rgba(249,0,43,0.15)', color: '#6B7280', fontFamily: 'var(--font-heading)' }}
                    >
                      ← Back
                    </button>
                    <button
                      onClick={handlePlaceOrder}
                      disabled={loading}
                      className="flex-[2] py-4 rounded-2xl text-white font-semibold transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)', fontSize: '15px', boxShadow: '0 6px 20px rgba(249,0,43,0.25)' }}
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Placing Order...
                        </span>
                      ) : 'Place Order →'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Right Panel: Order Summary ── */}
          <div className="order-1 lg:order-2">
            <div
              className="rounded-2xl overflow-hidden shadow-sm lg:sticky lg:top-24"
              style={{ background: 'white', border: '1px solid rgba(249,0,43,0.08)' }}
            >
              <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(249,0,43,0.07)' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '16px', color: '#111' }}>
                  Order Summary
                </h3>
                <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '3px' }}>
                  {state.cart.reduce((a, c) => a + c.quantity, 0)} items
                </p>
              </div>

              {/* Items */}
              <div className="px-5 py-4 space-y-3 max-h-56 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(249,0,43,0.15) transparent' }}>
                {state.cart.map(cartItem => (
                  <div key={cartItem.item.id} className="flex gap-3">
                    <div className="relative flex-shrink-0">
                      <img
                        src={cartItem.item.image}
                        alt={cartItem.item.name}
                        className="w-14 h-14 rounded-xl object-cover"
                        style={{ border: '1px solid rgba(249,0,43,0.08)' }}
                      />
                      <span
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)' }}
                      >
                        {cartItem.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '13px', color: '#111' }}>
                        {cartItem.item.name}
                      </p>
                      <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>
                        ৳{cartItem.item.price} × {cartItem.quantity}
                      </p>
                      <p style={{ fontWeight: 700, fontSize: '13px', color: '#F9002B', marginTop: '2px' }}>
                        ৳{cartItem.item.price * cartItem.quantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="px-6 py-4 space-y-2.5" style={{ borderTop: '1px solid rgba(249,0,43,0.07)', background: '#F9F5F0' }}>
                <div className="flex justify-between">
                  <span style={{ color: '#6B7280', fontSize: '14px' }}>Subtotal</span>
                  <span style={{ color: '#111', fontSize: '14px', fontWeight: 600 }}>৳{cartTotal}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#6B7280', fontSize: '14px' }}>Delivery</span>
                  <span style={{ color: '#111', fontSize: '14px', fontWeight: 600 }}>৳{delivery}</span>
                </div>
                <div
                  className="flex justify-between pt-3"
                  style={{ borderTop: '1px solid rgba(249,0,43,0.1)' }}
                >
                  <span style={{ color: '#111', fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '17px' }}>Total</span>
                  <span style={{ color: '#F9002B', fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '22px' }}>৳{grandTotal}</span>
                </div>
              </div>

              {/* Delivery note */}
              <div
                className="mx-4 mb-4 mt-3 px-4 py-3 rounded-xl flex items-center gap-2"
                style={{ background: 'rgba(249,0,43,0.07)', border: '1px solid rgba(249,0,43,0.2)' }}
              >
                <Truck size={13} style={{ color: '#F9002B', flexShrink: 0 }} />
                <p style={{ color: '#6B7280', fontSize: '12px', lineHeight: 1.5 }}>
                  Estimated delivery: <span style={{ color: '#F9002B', fontWeight: 700 }}>30–45 minutes</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        input:focus, select:focus {
          border-color: rgba(249,0,43,0.4) !important;
          box-shadow: 0 0 0 3px rgba(249,0,43,0.06) !important;
        }
        input::placeholder { color: #9CA3AF; }
      `}</style>
    </div>
  );
}