import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { ShoppingCart, Menu, X, MapPin } from 'lucide-react';
import { useApp } from '../context/AppContext';

const navLinks = [
  { label: 'Home', path: '/' },
  { label: 'About', path: '/about' },
  { label: 'Menu', path: '/menu' },
  { label: 'Gallery', path: '/gallery' },
  { label: 'Reservation', path: '/reservation' },
  { label: 'Contact', path: '/contact' },
];

const PZ = '#F9002B';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { state, dispatch, cartCount } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const isHome   = location.pathname === '/';
  const isActive = (path: string) => location.pathname === path;
  const solidBg  = true; // Always solid now
  const textColor = '#111111';

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'glass-panel shadow-premium' : isHome ? 'bg-[#FEFCF8]' : 'bg-white'}`}
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[72px] md:h-24">

            {/* Logo — Image */}
            <Link to="/" className="flex items-center group">
              <img src="/pizzo.png" alt="Pizzora Restaurant" className="h-8 md:h-10 object-contain" />
            </Link>

            {/* Mobile App-style Location Indicator */}
            <a
              href="https://maps.google.com/maps?q=WV46%2BW8,%20Sylhet"
              target="_blank"
              rel="noopener noreferrer"
              className="flex md:hidden items-center gap-1.5 px-3 py-1.5 rounded-full active:scale-95 transition-transform"
              style={{ backgroundColor: 'rgba(249,0,43,0.06)' }}
            >
              <div className="w-5 h-5 rounded-full flex items-center justify-center bg-white shadow-sm">
                <MapPin size={10} style={{ color: PZ }} />
              </div>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#111', letterSpacing: '0.5px' }}>SYLHET</span>
            </a>

            {/* Desktop Links */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative group"
                  style={{
                    color: isActive(link.path) ? PZ : textColor,
                    backgroundColor: isActive(link.path)
                      ? 'rgba(249,0,43,0.08)'
                      : 'transparent',
                  }}
                >
                  {link.label}
                  {!isActive(link.path) && (
                    <span
                      className="absolute bottom-1 left-4 right-4 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-200 rounded-full"
                      style={{ backgroundColor: PZ }}
                    />
                  )}
                </Link>
              ))}
            </div>

            {/* Desktop Right */}
            <div className="hidden lg:flex items-center gap-3">
              <button
                onClick={() => dispatch({ type: 'TOGGLE_CART' })}
                className="relative p-2.5 rounded-full transition-all duration-200 hover:scale-110"
                style={{ backgroundColor: 'rgba(249,0,43,0.08)', color: PZ }}
              >
                <ShoppingCart size={20} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: PZ }}>
                    {cartCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => navigate('/menu')}
                className="px-5 py-2.5 rounded-full text-white text-sm font-bold transition-all hover:shadow-lg hover:-translate-y-0.5"
                style={{ background: `linear-gradient(135deg,${PZ},#C8001F)`, fontFamily: 'var(--font-heading)' }}
              >
                Order Now
              </button>
              {state.isAdminLoggedIn && (
                <Link to="/admin" className="px-4 py-2 rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#111' }}>Admin</Link>
              )}
            </div>

            {/* Tablet Right (Hidden on mobile and desktop) */}
            <div className="hidden md:flex lg:hidden items-center gap-2">
              <button
                onClick={() => dispatch({ type: 'TOGGLE_CART' })}
                className="relative p-2 rounded-full"
                style={{ color: PZ, backgroundColor: 'rgba(249,0,43,0.08)' }}
              >
                <ShoppingCart size={20} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white flex items-center justify-center font-bold" style={{ backgroundColor: PZ, fontSize: '9px' }}>
                    {cartCount}
                  </span>
                )}
              </button>
              <button onClick={() => setMobileOpen(o => !o)} className="p-2 rounded-lg" style={{ color: textColor }}>
                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 w-72 shadow-2xl flex flex-col lg:hidden transition-transform duration-300 glass-panel ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgba(249,0,43,0.1)' }}>
          <img src="/pizzoralogo.png" alt="Pizzora" className="h-12 object-contain scale-110" />
          <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={20} style={{ color: '#374151' }} /></button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all"
              style={{ color: isActive(link.path) ? PZ : '#374151', backgroundColor: isActive(link.path) ? 'rgba(249,0,43,0.06)' : 'transparent', fontFamily: 'var(--font-heading)' }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t space-y-2" style={{ borderColor: 'rgba(249,0,43,0.1)' }}>
          <button
            onClick={() => { navigate('/menu'); setMobileOpen(false); }}
            className="w-full py-3 rounded-xl text-white text-sm font-bold"
            style={{ background: `linear-gradient(135deg,${PZ},#C8001F)`, fontFamily: 'var(--font-heading)' }}
          >
            Order Now
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {state.notification && (
        <div
          className="fixed top-24 right-4 z-[100] px-5 py-3.5 rounded-xl shadow-xl flex items-center gap-3"
          style={{
            backgroundColor: state.notification.type === 'success' ? '#DCFCE7' : state.notification.type === 'error' ? '#FEE2E2' : '#DBEAFE',
            border: `1px solid ${state.notification.type === 'success' ? '#BBF7D0' : state.notification.type === 'error' ? '#FECACA' : '#BFDBFE'}`,
            fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '14px',
            color: state.notification.type === 'success' ? '#15803D' : state.notification.type === 'error' ? '#DC2626' : '#1D4ED8',
          }}
        >
          {state.notification.message}
        </div>
      )}
    </>
  );
}
