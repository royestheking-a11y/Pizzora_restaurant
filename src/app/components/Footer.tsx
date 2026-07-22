import { Link } from 'react-router';
import { Phone, Mail, MapPin, Clock, Facebook, Instagram, Twitter, Youtube, ChevronRight } from 'lucide-react';

const PZ = '#F9002B';

const TikTokSVG = ({ size, style }: { size: number, style?: any }) => (
  <svg viewBox="0 0 448 512" fill="currentColor" width={size} height={size} style={style}><path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z"/></svg>
);

const ThreadsSVG = ({ size, style }: { size: number, style?: any }) => (
  <svg viewBox="0 0 192 192" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} style={style}>
    <path d="M141.53,108.82A44,44,0,1,1,104,64h3.69" />
    <path d="M104,108a20,20,0,1,1,20-20v14.06c0,8.44-5.34,13.94-12,13.94s-12-5.5-12-13.94V64" />
  </svg>
);

const PinterestSVG = ({ size, style }: { size: number, style?: any }) => (
  <svg viewBox="0 0 496 512" fill="currentColor" width={size} height={size} style={style}><path d="M496 256c0 137-111 248-248 248-25.6 0-50.2-3.9-73.4-11.1 10.1-16.5 25.2-43.5 30.8-65 3-11.6 15.4-59 15.4-59 8.1 15.4 31.7 28.5 56.8 28.5 74.8 0 128.7-68.8 128.7-154.3 0-81.9-66.9-143.2-152.9-143.2-107 0-163.9 71.8-163.9 150.1 0 36.4 19.4 81.7 50.3 96.1 4.7 2.2 7.2 1.2 8.3-3.3 .8-3.4 5-20.3 6.9-28.1 .6-2.5 .3-4.7-1.7-7.1-10.1-12.5-18.3-35.3-18.3-56.6 0-54.7 41.4-107.6 112-107.6 60.9 0 103.6 41.5 103.6 100.9 0 67.1-33.9 113.6-78 113.6-24.3 0-42.6-20.1-36.7-44.8 7-29.5 20.5-61.3 20.5-82.6 0-19-10.2-34.9-31.4-34.9-24.9 0-44.9 25.7-44.9 60.2 0 22 7.4 36.8 7.4 36.8s-24.5 103.8-29 123.2c-5 21.4-3 51.6-.9 71.2C65.4 450.9 0 361.1 0 256 0 119 111 8 248 8s248 111 248 248z"/></svg>
);

const WhatsAppSVG = ({ size, style }: { size: number, style?: any }) => (
  <svg viewBox="0 0 448 512" fill="currentColor" width={size} height={size} style={style}><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>
);

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer style={{ backgroundColor: '#0A0A0A', fontFamily: 'var(--font-body)' }}>
      {/* Top Strip */}
      <div className="border-b" style={{ borderColor: 'rgba(249,0,43,0.2)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center">
              <img src="/pizzo.png" alt="Pizzora Restaurant" className="h-10 md:h-12 object-contain origin-left" />
            </div>
            <p style={{ color: '#9CA3AF', fontSize: '15px', maxWidth: '400px', textAlign: 'center', lineHeight: '1.6', fontWeight: 500 }}>
              "Cancel Plans. Call PIZZORA."
            </p>
            <Link
              to="/reservation"
              className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm whitespace-nowrap transition-all hover:shadow-lg hover:-translate-y-0.5 text-white"
              style={{ background: `linear-gradient(135deg,${PZ},#C8001F)`, fontFamily: 'var(--font-heading)' }}
            >
              Reserve a Table <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10 sm:gap-10">
          {/* About */}
          <div className="col-span-2 sm:col-span-1">
            <h3 style={{ color: PZ, fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '16px', letterSpacing: '1px', marginBottom: '16px' }}>About Pizzora</h3>
            <p style={{ color: '#9CA3AF', fontSize: '14px', lineHeight: '1.8' }}>
              Pizzora is Sylhet's premium fast food &amp; pizza destination, offering authentic pizza, crispy wings, burgers, shawarma and much more since 2020.
            </p>
              <div className="flex flex-wrap gap-3 mt-5">
              {[
                { icon: Facebook, color: '#1877F2', url: 'https://www.facebook.com/pizzoraofficials/', title: 'Facebook' },
                { icon: Instagram, color: '#E1306C', url: 'https://www.instagram.com/pizzoraofficial/', title: 'Instagram' },
                { icon: Twitter, color: '#1DA1F2', url: 'https://x.com/pizzoraofficial', title: 'X (Twitter)' },
                { icon: Youtube, color: '#FF0000', url: 'https://www.youtube.com/@Pizzoraofficial', title: 'YouTube' },
                { icon: TikTokSVG, color: '#FFFFFF', url: 'https://www.tiktok.com/@pizzoraofficial', title: 'TikTok' },
                { icon: ThreadsSVG, color: '#FFFFFF', url: 'https://www.threads.com/@pizzoraofficial', title: 'Threads' },
                { icon: PinterestSVG, color: '#E60023', url: 'https://www.pinterest.com/pizzoraofficial/', title: 'Pinterest' },
                { icon: WhatsAppSVG, color: '#25D366', url: "https://wa.me/8801620026649?text=Hi%20Pizzora!%20I'd%20like%20to%20place%20an%20order.%20%F0%9F%8D%95", title: 'WhatsApp' },
              ].map(({ icon: Icon, color, url, title }, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" title={title} className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <Icon size={16} style={{ color }} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="col-span-1">
            <h3 style={{ color: PZ, fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '16px', letterSpacing: '1px', marginBottom: '16px' }}>Quick Links</h3>
            <ul className="space-y-2.5">
              {[
                { label: 'Home', path: '/' },
                { label: 'Our Menu', path: '/menu' },
                { label: 'About Us', path: '/about' },
                { label: 'Gallery', path: '/gallery' },
                { label: 'Reservation', path: '/reservation' },
                { label: 'Order Tracking', path: '/order-tracking' },
                { label: 'Contact', path: '/contact' },
              ].map(({ label, path }) => (
                <li key={path}>
                  <Link to={path} className="flex items-center gap-2 transition-all hover:translate-x-1" style={{ color: '#9CA3AF', fontSize: '14px' }}>
                    <ChevronRight size={13} style={{ color: PZ }} /> {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Menu Categories */}
          <div className="col-span-1">
            <h3 style={{ color: PZ, fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '16px', letterSpacing: '1px', marginBottom: '16px' }}>Menu</h3>
            <ul className="space-y-2.5">
              {['Pizza', 'Wings', 'Burger', 'Shawarma', 'Pasta', 'Biryani', 'Dessert'].map(cat => (
                <li key={cat}>
                  <Link to={`/menu?category=${cat}`} className="flex items-center gap-2 transition-all hover:translate-x-1" style={{ color: '#9CA3AF', fontSize: '14px' }}>
                    <ChevronRight size={13} style={{ color: PZ }} /> {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="col-span-2 sm:col-span-1">
            <h3 style={{ color: PZ, fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '16px', letterSpacing: '1px', marginBottom: '16px' }}>Contact</h3>
            <div className="space-y-4">
              {[
                { icon: MapPin, text: 'Subidbazar Point, Mitali Complex, Sylhet, Bangladesh' },
                { icon: Phone,  text: '+8801620026649' },
                { icon: Mail,   text: 'pizzora1@gmail.com' },
                { icon: Clock,  text: 'All Week: 11 AM – 11 PM' },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(249,0,43,0.12)' }}>
                    <Icon size={14} style={{ color: PZ }} />
                  </div>
                  <span style={{ color: '#9CA3AF', fontSize: '14px', lineHeight: '1.6' }}>{text}</span>
                </div>
              ))}
              <div className="mt-4 p-3 rounded-xl" style={{ backgroundColor: 'rgba(249,0,43,0.08)', border: `1px solid rgba(249,0,43,0.15)` }}>
                <p style={{ color: PZ, fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>● Now Open</p>
                <p style={{ color: '#9CA3AF', fontSize: '11px', marginTop: '2px' }}>Dine-In &amp; Takeaway</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p style={{ color: '#6B7280', fontSize: '13px' }}>© {currentYear} Pizzora Restaurant. All rights reserved.</p>
          <p style={{ color: '#6B7280', fontSize: '12px' }}>www.pizzora.com.bd</p>
        </div>
      </div>
    </footer>
  );
}
