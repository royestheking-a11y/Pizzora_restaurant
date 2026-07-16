import { useState } from 'react';
import {
  X, Plus, Minus, Trash2, ShoppingBag, ArrowRight,
  ChevronLeft, Tag, Gift, Truck, Shield, Star,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';

const PROMO_CODES: Record<string, number> = {
  PIZZORA10: 10,
  WELCOME20: 20,
  GOLD15: 15,
};

export function CartPage() {
  const { state, dispatch, removeFromCart, updateQuantity, cartTotal, cartCount } = useApp();
  const navigate = useNavigate();
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  const delivery = cartTotal > 0 ? 40 : 0;
  const discount = appliedPromo ? Math.floor(cartTotal * (appliedPromo.discount / 100)) : 0;
  const grandTotal = cartTotal + delivery - discount;

  const handleCheckout = () => {
    dispatch({ type: 'SET_CART_OPEN', payload: false });
    navigate('/checkout');
  };

  const handleRemove = (id: string) => {
    setRemovingId(id);
    setTimeout(() => { removeFromCart(id); setRemovingId(null); }, 280);
  };

  const applyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (PROMO_CODES[code]) {
      setAppliedPromo({ code, discount: PROMO_CODES[code] });
      setPromoError('');
    } else {
      setPromoError('Invalid code. Try PIZZORA10, WELCOME20, or GOLD15');
    }
  };

  if (!state.cartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center" style={{ fontFamily: 'var(--font-body)' }}>
      {/* Frosted backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        onClick={() => dispatch({ type: 'SET_CART_OPEN', payload: false })}
      />

      {/* Full-page card / Bottom Sheet */}
      <div
        className="relative w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl h-[85vh] sm:h-auto sm:max-h-[90vh] flex flex-col rounded-t-[32px] sm:rounded-3xl overflow-hidden shadow-premium bg-[#FFFDF9]"
        style={{
          background: '#FFFDF9',
          border: '1px solid rgba(249,0,43,0.1)',
          animation: 'cartIn 0.3s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        {/* ── Top Bar ── */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-6 md:px-10 py-4"
          style={{ borderBottom: '1px solid rgba(249,0,43,0.08)', background: 'white' }}
        >
          <button
            onClick={() => dispatch({ type: 'SET_CART_OPEN', payload: false })}
            className="flex items-center gap-1.5 transition-all hover:gap-2.5 group"
            style={{ color: '#6B7280', fontSize: '14px', fontFamily: 'var(--font-heading)', fontWeight: 600 }}
          >
            <ChevronLeft size={17} style={{ color: '#F9002B' }} />
            Continue Shopping
          </button>

          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shadow-md"
              style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)' }}
            >
              <ShoppingBag size={16} className="text-white" />
            </div>
            <span style={{ color: '#111', fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '17px' }}>
              Your Cart
            </span>
            {cartCount > 0 && (
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                style={{ background: 'rgba(249,0,43,0.08)', color: '#F9002B', border: '1px solid rgba(249,0,43,0.12)' }}
              >
                {cartCount} item{cartCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <button
            onClick={() => dispatch({ type: 'SET_CART_OPEN', payload: false })}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-gray-100"
            style={{ border: '1px solid rgba(249,0,43,0.1)' }}
          >
            <X size={17} style={{ color: '#6B7280' }} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto flex items-start justify-center px-4 md:px-8 lg:px-10 py-6" style={{ background: '#F9F5F0' }}>
          {state.cart.length === 0 ? (
            /* Empty State */
            <div className="text-center max-w-sm mx-auto py-20">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
                style={{ background: 'white', border: '2px solid rgba(249,0,43,0.08)' }}
              >
                <ShoppingBag size={38} style={{ color: '#F9002B' }} />
              </div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '26px', color: '#111', marginBottom: '10px' }}>
                Your cart is empty
              </h2>
              <p style={{ color: '#6B7280', fontSize: '15px', lineHeight: 1.7, marginBottom: '28px' }}>
                Discover our premium menu and add your favorite dishes.
              </p>
              <button
                onClick={() => { dispatch({ type: 'SET_CART_OPEN', payload: false }); navigate('/menu'); }}
                className="px-8 py-3.5 rounded-full text-white text-sm font-semibold transition-all hover:shadow-xl hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)' }}
              >
                Explore Menu
              </button>
            </div>
          ) : (
            /* Two-Column Layout */
            <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[1fr_320px] lg:grid-cols-[1fr_360px] gap-5" style={{ minHeight: 0 }}>

              {/* ── Left: Items ── */}
              <div
                className="flex flex-col rounded-2xl overflow-hidden shadow-sm"
                style={{ background: 'white', border: '1px solid rgba(249,0,43,0.08)', maxHeight: 'calc(100vh - 180px)', minHeight: '280px' }}
              >
                {/* Column Header */}
                <div
                  className="flex items-center justify-between px-6 py-4 flex-shrink-0"
                  style={{ borderBottom: '1px solid rgba(249,0,43,0.07)' }}
                >
                  <h3 style={{ color: '#111', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px' }}>
                    Order Items ({cartCount})
                  </h3>
                  <button
                    onClick={() => dispatch({ type: 'CLEAR_CART' })}
                    className="text-xs transition-colors hover:text-red-500"
                    style={{ color: '#9CA3AF', fontFamily: 'var(--font-heading)', fontWeight: 600 }}
                  >
                    Clear All
                  </button>
                </div>

                {/* Scrollable Items */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(249,0,43,0.15) transparent' }}>
                  {state.cart.map((cartItem, index) => (
                    <div
                      key={cartItem.item.id}
                      className="flex gap-4 p-4 rounded-2xl transition-all"
                      style={{
                        background: removingId === cartItem.item.id ? 'rgba(239,68,68,0.04)' : '#F9F5F0',
                        border: `1px solid ${removingId === cartItem.item.id ? 'rgba(239,68,68,0.15)' : 'rgba(249,0,43,0.07)'}`,
                        opacity: removingId === cartItem.item.id ? 0.4 : 1,
                        transform: removingId === cartItem.item.id ? 'translateX(16px)' : 'translateX(0)',
                        transition: 'all 0.28s ease',
                      }}
                    >
                      {/* Image */}
                      <div className="relative flex-shrink-0">
                        <img
                          src={cartItem.item.image}
                          alt={cartItem.item.name}
                          className="w-20 h-20 rounded-xl object-cover shadow-sm"
                          style={{ border: '1px solid rgba(249,0,43,0.08)' }}
                        />
                        {cartItem.item.badge && (
                          <span
                            className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-md text-xs font-bold"
                            style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', color: 'white', fontSize: '9px' }}
                          >
                            {cartItem.item.badge}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 style={{ color: '#111', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px', marginBottom: '3px' }}>
                          {cartItem.item.name}
                        </h4>
                        {cartItem.item.category && (
                          <p style={{ color: '#F9002B', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                            {cartItem.item.category}
                          </p>
                        )}
                        <p style={{ color: '#9CA3AF', fontSize: '13px' }}>৳{cartItem.item.price} each</p>

                        {/* Controls */}
                        <div className="flex items-center justify-between mt-3">
                          {/* Qty */}
                          <div
                            className="flex items-center rounded-xl overflow-hidden"
                            style={{ border: '1.5px solid rgba(249,0,43,0.15)', background: 'white' }}
                          >
                            <button
                              onClick={() => updateQuantity(cartItem.item.id, cartItem.quantity - 1)}
                              className="w-8 h-8 flex items-center justify-center transition-colors hover:bg-gray-50"
                              style={{ color: '#F9002B' }}
                            >
                              <Minus size={12} />
                            </button>
                            <span
                              className="w-8 h-8 flex items-center justify-center"
                              style={{ color: '#111', fontWeight: 700, fontSize: '14px', borderLeft: '1px solid rgba(249,0,43,0.1)', borderRight: '1px solid rgba(249,0,43,0.1)' }}
                            >
                              {cartItem.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(cartItem.item.id, cartItem.quantity + 1)}
                              className="w-8 h-8 flex items-center justify-center transition-colors hover:bg-gray-50"
                              style={{ color: '#F9002B' }}
                            >
                              <Plus size={12} />
                            </button>
                          </div>

                          {/* Price + Delete */}
                          <div className="flex items-center gap-3">
                            <span style={{ color: '#F9002B', fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '16px' }}>
                              ৳{cartItem.item.price * cartItem.quantity}
                            </span>
                            <button
                              onClick={() => handleRemove(cartItem.item.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-red-50"
                              style={{ border: '1px solid rgba(239,68,68,0.15)' }}
                            >
                              <Trash2 size={12} style={{ color: '#EF4444' }} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Trust Row */}
                <div
                  className="flex items-center justify-around px-6 py-3 flex-shrink-0"
                  style={{ borderTop: '1px solid rgba(249,0,43,0.07)', background: '#F9F5F0' }}
                >
                  {[
                    { icon: Truck,  label: 'Fast Delivery' },
                    { icon: Shield, label: 'Safe & Fresh' },
                    { icon: Star,   label: 'Premium Quality' },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center justify-center gap-1 sm:gap-1.5">
                      <Icon size={14} style={{ color: '#F9002B' }} className="flex-shrink-0" />
                      <span className="whitespace-nowrap text-[10px] sm:text-xs" style={{ color: '#9CA3AF', fontWeight: 500 }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Right: Summary ── */}
              <div className="flex flex-col gap-4 pb-4" style={{ scrollbarWidth: 'none' }}>

                {/* Summary Card */}
                <div
                  className="rounded-2xl overflow-hidden shadow-sm"
                  style={{ background: 'white', border: '1px solid rgba(249,0,43,0.08)' }}
                >
                  <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(249,0,43,0.07)' }}>
                    <h3 style={{ color: '#111', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px' }}>
                      Order Summary
                    </h3>
                  </div>
                  <div className="px-6 py-5 space-y-3">
                    <div className="flex justify-between">
                      <span style={{ color: '#6B7280', fontSize: '14px' }}>Subtotal ({cartCount} items)</span>
                      <span style={{ color: '#111', fontSize: '14px', fontWeight: 600 }}>৳{cartTotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: '#6B7280', fontSize: '14px' }}>Delivery</span>
                      <span style={{ color: '#111', fontSize: '14px', fontWeight: 600 }}>৳{delivery}</span>
                    </div>
                    {appliedPromo && (
                      <div className="flex justify-between">
                        <span style={{ color: '#16A34A', fontSize: '14px' }}>Promo ({appliedPromo.code})</span>
                        <span style={{ color: '#16A34A', fontSize: '14px', fontWeight: 600 }}>-৳{discount}</span>
                      </div>
                    )}
                    <div
                      className="flex justify-between pt-3"
                      style={{ borderTop: '1px solid rgba(249,0,43,0.08)' }}
                    >
                      <span style={{ color: '#111', fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '17px' }}>Total</span>
                      <span style={{ color: '#F9002B', fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '22px' }}>৳{grandTotal}</span>
                    </div>
                  </div>
                </div>

                {/* Promo Code */}
                <div
                  className="rounded-2xl overflow-hidden shadow-sm"
                  style={{ background: 'white', border: '1px solid rgba(249,0,43,0.08)' }}
                >
                  <div className="px-6 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Tag size={14} style={{ color: '#F9002B' }} />
                      <span style={{ color: '#111', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '14px' }}>Promo Code</span>
                    </div>
                    {appliedPromo ? (
                      <div
                        className="flex items-center justify-between px-4 py-3 rounded-xl"
                        style={{ background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.2)' }}
                      >
                        <div className="flex items-center gap-2">
                          <Gift size={13} style={{ color: '#16A34A' }} />
                          <span style={{ color: '#16A34A', fontSize: '13px', fontWeight: 700 }}>
                            {appliedPromo.code} — {appliedPromo.discount}% OFF
                          </span>
                        </div>
                        <button
                          onClick={() => { setAppliedPromo(null); setPromoCode(''); }}
                          style={{ color: '#9CA3AF', fontSize: '12px', fontWeight: 600 }}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-2 w-full">
                          <input
                            type="text"
                            value={promoCode}
                            onChange={e => { setPromoCode(e.target.value); setPromoError(''); }}
                            onKeyDown={e => e.key === 'Enter' && applyPromo()}
                            placeholder="Enter promo code"
                            className="min-w-0 flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
                            style={{
                              background: '#F9F5F0',
                              border: promoError ? '1.5px solid rgba(239,68,68,0.5)' : '1.5px solid rgba(249,0,43,0.12)',
                              color: '#111',
                              fontFamily: 'var(--font-body)',
                            }}
                          />
                          <button
                            onClick={applyPromo}
                            className="flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:shadow-md"
                            style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', color: 'white', fontFamily: 'var(--font-heading)' }}
                          >
                            Apply
                          </button>
                        </div>
                        {promoError && (
                          <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '6px' }}>{promoError}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* CTA Buttons */}
                <button
                  onClick={handleCheckout}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-semibold transition-all hover:shadow-xl hover:-translate-y-0.5"
                  style={{
                    background: 'linear-gradient(135deg, #F9002B, #C8001F)',
                    fontFamily: 'var(--font-heading)',
                    fontSize: '16px',
                    boxShadow: '0 6px 24px rgba(249,0,43,0.3)',
                  }}
                >
                  Proceed to Checkout
                  <ArrowRight size={18} />
                </button>

                <button
                  onClick={() => { dispatch({ type: 'SET_CART_OPEN', payload: false }); navigate('/menu'); }}
                  className="w-full py-3 rounded-2xl text-sm font-semibold transition-all hover:bg-gray-100"
                  style={{
                    color: '#6B7280',
                    border: '1.5px solid rgba(249,0,43,0.1)',
                    fontFamily: 'var(--font-heading)',
                    background: 'white',
                  }}
                >
                  Add More Items
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes cartIn {
          from { opacity: 0; transform: scale(0.97) translateY(10px); }
          to   { opacity: 1; transform: scale(1)   translateY(0); }
        }
        input::placeholder { color: #9CA3AF; }
      `}</style>
    </div>
  );
}