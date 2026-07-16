import React, { useState } from 'react';
import { Phone, Mail, MapPin, Clock, MessageCircle, Send, Check, Facebook, Instagram, Twitter, Youtube } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SEO } from '../components/SEO';

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

export function Contact() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { dispatch, showNotification } = useApp();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const msg = {
        id: Date.now().toString(),
        ...form,
        createdAt: new Date().toISOString(),
        isRead: false,
      };
      dispatch({ type: 'ADD_MESSAGE', payload: msg });
      setSuccess(true);
      setLoading(false);
      showNotification('Message sent! We\'ll reply within 24 hours.', 'success');
    }, 1500);
  };

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1.5px solid rgba(249,0,43,0.15)',
    fontSize: '14px',
    fontFamily: 'var(--font-body)',
    outline: 'none',
    color: '#111',
    backgroundColor: 'white',
  };

  return (
    <div style={{ paddingTop: '80px', minHeight: '100vh' }}>
      <SEO 
        title="Contact Pizzora | Pizza Restaurant Bangladesh"
        description="Contact Pizzora for reservations, takeaway, delivery or customer support. We are here to serve your favorite pizza."
        url="https://pizzora.bd/contact"
      />
      {/* Header */}
      <div className="py-20 px-4 text-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)' }}>
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 60% 40%, #ffffff 0%, transparent 60%)' }} />
        <div className="relative">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div style={{ width: '40px', height: '2px', backgroundColor: 'rgba(255,255,255,0.5)' }} />
            <span style={{ color: '#ffffff', fontSize: '13px', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', fontFamily: 'var(--font-heading)' }}>Get in Touch</span>
            <div style={{ width: '40px', height: '2px', backgroundColor: 'rgba(255,255,255,0.5)' }} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(32px, 5vw, 56px)', color: '#fff', marginBottom: '12px' }}>Contact Us</h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '16px', maxWidth: '400px', margin: '0 auto' }}>
            Have a question or feedback? We'd love to hear from you.
          </p>
        </div>
      </div>

      {/* Quick Contact Cards */}
      <section className="py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#F9F5F0' }}>
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Phone, label: 'Phone', value: '+8801620026649', sub: 'All Week, 11AM–11PM', href: 'tel:+8801620026649', color: '#F9002B' },
            { icon: MessageCircle, label: 'WhatsApp', value: '+8801620026649', sub: 'Quick Response', href: 'https://wa.me/8801620026649', color: '#25D366' },
            { icon: Mail, label: 'Email', value: 'Pizzora1@gmail.com', sub: 'Reply within 24h', href: 'mailto:Pizzora1@gmail.com', color: '#2563EB' },
            { icon: MapPin, label: 'Address', value: 'WV4P+3H', sub: 'Subidbazar, Sylhet', href: '#map', color: '#7C3AED' },
          ].map(({ icon: Icon, label, value, sub, href, color }) => (
            <a
              key={label}
              href={href}
              className="flex flex-col items-center text-center p-6 rounded-2xl bg-white card-hover"
              style={{ border: '1px solid rgba(249,0,43,0.08)', textDecoration: 'none' }}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: `${color}15` }}>
                <Icon size={22} style={{ color }} />
              </div>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '14px', color: '#111', marginBottom: '4px' }}>{label}</span>
              <span style={{ fontSize: '13px', color: '#F9002B', fontWeight: 600, marginBottom: '2px' }}>{value}</span>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>{sub}</span>
            </a>
          ))}
        </div>
      </section>

      {/* Contact Form + Info */}
      <section className="py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-5 gap-10">
          {/* Info */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '26px', color: '#111', marginBottom: '12px' }}>
                We're Here to <span style={{ color: '#F9002B' }}>Help</span>
              </h2>
              <p style={{ color: '#6B7280', fontSize: '15px', lineHeight: '1.7' }}>
                Whether you have a question about our menu, want to make a reservation, or need catering services — our team is ready to assist you.
              </p>
            </div>

            <div className="p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '16px', color: '#ffffff', marginBottom: '14px' }}>
                Opening Hours
              </h3>
              {[
                { day: 'All Week', time: '11:00 AM – 11:00 PM' },
              ].map(({ day, time }) => (
                <div key={day} className="flex justify-between py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>{day}</span>
                  <span style={{ fontSize: '13px', color: '#ffffff', fontWeight: 600 }}>{time}</span>
                </div>
              ))}
            </div>

            <div className="p-5 rounded-2xl" style={{ backgroundColor: '#F9F5F0', border: '1px solid rgba(249,0,43,0.08)' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px', color: '#111', marginBottom: '10px' }}>
                Follow Us
              </h3>
              <div className="flex flex-wrap gap-3">
                {[
                  { icon: Facebook, label: 'Facebook', color: '#1877F2', url: 'https://www.facebook.com/pizzoraofficials/' },
                  { icon: Instagram, label: 'Instagram', color: '#E1306C', url: 'https://www.instagram.com/pizzoraofficial/' },
                  { icon: Twitter, label: 'Twitter (X)', color: '#1DA1F2', url: 'https://x.com/pizzoraofficial' },
                  { icon: Youtube, label: 'YouTube', color: '#FF0000', url: 'https://www.youtube.com/@Pizzoraofficial' },
                  { icon: TikTokSVG, label: 'TikTok', color: '#000000', url: 'https://www.tiktok.com/@pizzoraofficial' },
                  { icon: ThreadsSVG, label: 'Threads', color: '#000000', url: 'https://www.threads.com/@pizzoraofficial' },
                  { icon: PinterestSVG, label: 'Pinterest', color: '#E60023', url: 'https://www.pinterest.com/pizzoraofficial/' },
                  { icon: WhatsAppSVG, label: 'WhatsApp', color: '#25D366', url: "https://wa.me/8801620026649?text=Hi%20Pizzora!%20I'd%20like%20to%20place%20an%20order.%20%F0%9F%8D%95" },
                ].map(({ icon: Icon, label, color, url }) => (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:shadow-sm"
                    style={{ backgroundColor: `${color}10`, color, border: `1px solid ${color}30`, fontFamily: 'var(--font-heading)' }}
                  >
                    <Icon size={14} /> {label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-3">
            {success ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'linear-gradient(135deg, #F9002B, #F9002B)' }}>
                  <Check size={36} className="text-white" />
                </div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '24px', color: '#111', marginBottom: '10px' }}>Message Sent!</h3>
                <p style={{ color: '#6B7280', fontSize: '15px', marginBottom: '24px' }}>We'll reply within 24 hours. Thank you for reaching out!</p>
                <button
                  onClick={() => { setSuccess(false); setForm({ name: '', phone: '', email: '', subject: '', message: '' }); }}
                  className="px-6 py-3 rounded-full text-white font-semibold"
                  style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)' }}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { field: 'name', label: 'Full Name', placeholder: 'Your name', type: 'text' },
                    { field: 'phone', label: 'Phone', placeholder: '+880 1XXXXXXXXX', type: 'tel' },
                    { field: 'email', label: 'Email', placeholder: 'your@email.com', type: 'email' },
                    { field: 'subject', label: 'Subject', placeholder: 'How can we help?', type: 'text' },
                  ].map(({ field, label, placeholder, type }) => (
                    <div key={field}>
                      <label style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '13px', color: '#374151', display: 'block', marginBottom: '6px' }}>
                        {label} *
                      </label>
                      <input
                        type={type}
                        required
                        placeholder={placeholder}
                        value={form[field as keyof typeof form]}
                        onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                        style={inputStyle}
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '13px', color: '#374151', display: 'block', marginBottom: '6px' }}>
                    Message *
                  </label>
                  <textarea
                    required
                    placeholder="Tell us how we can help you..."
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    rows={6}
                    style={{ ...inputStyle, resize: 'none' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-xl font-semibold text-white text-base flex items-center justify-center gap-2 transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70"
                  style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)' }}
                >
                  {loading ? 'Sending...' : (<><Send size={18} /> Send Message</>)}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Map */}
      <section id="map" className="px-4 sm:px-6 lg:px-8 pb-14">
        <div className="max-w-6xl mx-auto rounded-[24px] overflow-hidden shadow-xl h-[300px] md:h-[400px]">
          <iframe
            src="https://maps.google.com/maps?q=WV4P%2B3H,%20Sylhet&t=&z=15&ie=UTF8&iwloc=&output=embed"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            title="Pizzora Restaurant Location"
          />
        </div>
      </section>
    </div>
  );
}