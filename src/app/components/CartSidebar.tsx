import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';

export function CartSidebar() {
  const { state, dispatch, removeFromCart, updateQuantity, cartTotal, cartCount } = useApp();
  const navigate = useNavigate();

  const delivery = cartTotal > 0 ? 40 : 0;
  const grandTotal = cartTotal + delivery;

  const handleCheckout = () => {
    dispatch({ type: 'SET_CART_OPEN', payload: false });
    navigate('/checkout');
  };

  if (!state.cartOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={() => dispatch({ type: 'SET_CART_OPEN', payload: false })}
      />

      {/* Sidebar */}
      <div
        className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 flex flex-col shadow-2xl"
        style={{ background: '#fff' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'rgba(249,0,43,0.1)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)' }}>
              <ShoppingBag size={18} className="text-white" />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '18px', color: '#111' }}>
                Your Cart
              </h2>
              <p style={{ fontSize: '13px', color: '#6B7280' }}>{cartCount} item{cartCount !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={() => dispatch({ type: 'SET_CART_OPEN', payload: false })}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <X size={18} style={{ color: '#6B7280' }} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {state.cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-16">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(249,0,43,0.06)' }}
              >
                <ShoppingBag size={36} style={{ color: '#F9002B' }} />
              </div>
              <div className="text-center">
                <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '18px', color: '#111' }}>
                  Your cart is empty
                </p>
                <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
                  Add some delicious items from our menu
                </p>
              </div>
              <button
                onClick={() => { dispatch({ type: 'SET_CART_OPEN', payload: false }); navigate('/menu'); }}
                className="px-6 py-3 rounded-full text-white text-sm font-semibold transition-all hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)' }}
              >
                Browse Menu
              </button>
            </div>
          ) : (
            state.cart.map(cartItem => (
              <div
                key={cartItem.item.id}
                className="flex gap-3 p-3 rounded-xl border transition-all hover:shadow-sm"
                style={{ borderColor: 'rgba(249,0,43,0.08)', backgroundColor: '#FAFAFA' }}
              >
                <img
                  src={cartItem.item.image}
                  alt={cartItem.item.name}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="truncate" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '14px', color: '#111' }}>
                    {cartItem.item.name}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>
                    ৳{cartItem.item.price}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div
                      className="flex items-center gap-2 rounded-full px-2 py-1"
                      style={{ backgroundColor: 'rgba(249,0,43,0.06)' }}
                    >
                      <button
                        onClick={() => updateQuantity(cartItem.item.id, cartItem.quantity - 1)}
                        className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-white transition-colors"
                        style={{ color: '#F9002B' }}
                      >
                        <Minus size={10} />
                      </button>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#111', minWidth: '16px', textAlign: 'center' }}>
                        {cartItem.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(cartItem.item.id, cartItem.quantity + 1)}
                        className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-white transition-colors"
                        style={{ color: '#F9002B' }}
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ fontWeight: 700, fontSize: '14px', color: '#F9002B' }}>
                        ৳{cartItem.item.price * cartItem.quantity}
                      </span>
                      <button
                        onClick={() => removeFromCart(cartItem.item.id)}
                        className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={12} style={{ color: '#EF4444' }} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {state.cart.length > 0 && (
          <div className="px-6 py-5 border-t space-y-4" style={{ borderColor: 'rgba(249,0,43,0.1)' }}>
            <div className="space-y-2">
              <div className="flex justify-between" style={{ fontSize: '14px', color: '#6B7280' }}>
                <span>Subtotal</span>
                <span>৳{cartTotal}</span>
              </div>
              <div className="flex justify-between" style={{ fontSize: '14px', color: '#6B7280' }}>
                <span>Delivery</span>
                <span>৳{delivery}</span>
              </div>
              <div className="flex justify-between pt-2 border-t" style={{ borderColor: 'rgba(249,0,43,0.1)' }}>
                <span style={{ fontWeight: 700, fontSize: '16px', color: '#111', fontFamily: 'var(--font-heading)' }}>Total</span>
                <span style={{ fontWeight: 700, fontSize: '18px', color: '#F9002B', fontFamily: 'var(--font-heading)' }}>৳{grandTotal}</span>
              </div>
            </div>
            <button
              onClick={handleCheckout}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white font-semibold transition-all hover:shadow-lg hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)' }}
            >
              Proceed to Checkout
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => dispatch({ type: 'CLEAR_CART' })}
              className="w-full py-2 text-sm transition-colors"
              style={{ color: '#6B7280' }}
            >
              Clear Cart
            </button>
          </div>
        )}
      </div>
    </>
  );
}
