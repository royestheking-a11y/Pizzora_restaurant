import { NavLink } from 'react-router';
import { Home, Search, ShoppingBag, Phone, Pizza } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function MobileNav() {
  const { dispatch, cartCount } = useApp();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 px-2 relative">
        <NavLink 
          to="/" 
          end
          className={({ isActive }) => `flex flex-col items-center justify-center w-16 h-full transition-colors outline-none focus:outline-none ${isActive ? 'text-[#F9002B]' : 'text-gray-400 hover:text-gray-600'}`}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <Home size={22} className="mb-1" />
          <span className="text-[10px] font-medium tracking-wide">Home</span>
        </NavLink>

        <NavLink 
          to="/reservation" 
          className={({ isActive }) => `flex flex-col items-center justify-center w-16 h-full transition-colors outline-none focus:outline-none ${isActive ? 'text-[#F9002B]' : 'text-gray-400 hover:text-gray-600'}`}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <Search size={22} className="mb-1" />
          <span className="text-[10px] font-medium tracking-wide">Book</span>
        </NavLink>

        {/* Center Prominent Button (Menu/Order) */}
        <div className="relative -top-6 flex justify-center w-16">
          <NavLink 
            to="/menu"
            className="group flex items-center justify-center w-[60px] h-[60px] rounded-full shadow-[0_12px_24px_rgba(249,0,43,0.4)] transition-all hover:scale-110 active:scale-95 outline-none focus:outline-none"
            style={{ background: 'linear-gradient(135deg, #F9002B, #990012)', border: '4px solid #FFFFFF', WebkitTapHighlightColor: 'transparent' }}
          >
            <Pizza size={28} className="text-white drop-shadow-md" />
          </NavLink>
        </div>

        <button 
          onClick={() => dispatch({ type: 'TOGGLE_CART' })}
          className="flex flex-col items-center justify-center w-16 h-full transition-colors text-gray-400 hover:text-gray-600 relative outline-none focus:outline-none"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <div className="relative mb-1">
            <ShoppingBag size={22} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#F9002B] text-white text-[9px] font-bold flex items-center justify-center rounded-full border border-white">
                {cartCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium tracking-wide">Cart</span>
        </button>

        <NavLink 
          to="/contact" 
          className={({ isActive }) => `flex flex-col items-center justify-center w-16 h-full transition-colors outline-none focus:outline-none ${isActive ? 'text-[#F9002B]' : 'text-gray-400 hover:text-gray-600'}`}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <Phone size={22} className="mb-1" />
          <span className="text-[10px] font-medium tracking-wide">Contact</span>
        </NavLink>
      </div>
    </div>
  );
}
