import React, { useState } from 'react';
import { Check, Calendar, Clock, Users, Phone, Mail, MapPin } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SEO } from '../components/SEO';

export function Reservation() {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', date: '', time: '', guests: '2', specialRequest: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { dispatch, showNotification } = useApp();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const reservation = {
        id: Date.now().toString(),
        ...form,
        guests: parseInt(form.guests),
        status: 'Pending' as const,
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_RESERVATION', payload: reservation });
      setSuccess(true);
      setLoading(false);
    }, 1500);
  };

  const inputCls = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1.5px solid rgba(249,0,43,0.18)',
    fontSize: '14px',
    fontFamily: 'var(--font-body)',
    outline: 'none',
    color: '#111',
    backgroundColor: 'white',
    transition: 'border-color 0.2s',
  };

  if (success) {
    return (
      <div style={{ paddingTop: '80px', minHeight: '100vh' }} className="flex items-center justify-center">
        <SEO 
          title="Reservation Confirmed | Pizzora Restaurant"
          description="Your table reservation at Pizzora Restaurant is confirmed."
          url="https://pizzora.bd/reservation"
        />
        <div className="text-center max-w-lg mx-auto px-4 py-16">
          <div className="w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl" style={{ background: 'linear-gradient(135deg, #F9002B, #F9002B)' }}>
            <Check size={48} className="text-white" />
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '32px', color: '#111', marginBottom: '12px' }}>
            Table Reserved! 🎉
          </h2>
          <p style={{ color: '#6B7280', fontSize: '16px', lineHeight: '1.7', marginBottom: '8px' }}>
            Your reservation has been successfully submitted. We'll call you shortly to confirm.
          </p>
          <div className="my-8 p-6 rounded-2xl text-left space-y-3" style={{ backgroundColor: '#F9F5F0', border: '1px solid rgba(249,0,43,0.1)' }}>
            {[
              { label: 'Name', value: form.name },
              { label: 'Date', value: form.date },
              { label: 'Time', value: form.time },
              { label: 'Guests', value: form.guests },
              { label: 'Phone', value: form.phone },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between" style={{ fontSize: '14px' }}>
                <span style={{ color: '#6B7280', fontWeight: 500 }}>{label}:</span>
                <span style={{ color: '#111', fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>
          <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '24px' }}>
            Questions? Call us at <a href="tel:+8801620026649" style={{ color: '#F9002B', fontWeight: 600 }}>+880 1620-026649</a>
          </p>
          <button
            onClick={() => { setSuccess(false); setForm({ name: '', phone: '', email: '', date: '', time: '', guests: '2', specialRequest: '' }); }}
            className="px-8 py-3.5 rounded-full text-white font-semibold transition-all hover:shadow-lg"
            style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)' }}
          >
            Make Another Reservation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '80px', minHeight: '100vh', backgroundColor: '#FEFCF8' }}>
      <SEO 
        title="Book a Table | Pizzora Restaurant Bangladesh"
        description="Reserve your table at Pizzora and enjoy freshly baked pizza with friends and family in a comfortable dining environment."
        url="https://pizzora.bd/reservation"
      />
      
      {/* Header */}
      <div className="py-20 px-4 text-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)' }}>
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 70% 30%, #ffffff 0%, transparent 60%)' }} />
        <div className="relative">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div style={{ width: '40px', height: '2px', backgroundColor: 'rgba(255,255,255,0.5)' }} />
            <span style={{ color: '#ffffff', fontSize: '13px', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', fontFamily: 'var(--font-heading)' }}>Book Your Seat</span>
            <div style={{ width: '40px', height: '2px', backgroundColor: 'rgba(255,255,255,0.5)' }} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(32px, 5vw, 56px)', color: '#fff', marginBottom: '12px' }}>
            Table Reservation
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '16px', maxWidth: '400px', margin: '0 auto' }}>
            Reserve your table and we'll prepare an unforgettable experience just for you.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid lg:grid-cols-3 gap-10">
          {/* Left Info */}
          <div className="space-y-5">
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '22px', color: '#111', marginBottom: '8px' }}>
              Reservation Info
            </h2>

            {[
              { icon: Clock, title: 'Opening Hours', lines: ['All Week: 11AM – 11PM'] },
              { icon: Phone, title: 'Contact', lines: ['+880 1620-026649'] },
              { icon: Mail, title: 'Email', lines: ['reservations@pizzora.com'] },
              { icon: MapPin, title: 'Location', lines: ['WV4P+3H, Subidbazar,', 'Sylhet, Bangladesh'] },
            ].map(({ icon: Icon, title, lines }) => (
              <div key={title} className="flex gap-4 p-5 rounded-2xl" style={{ backgroundColor: '#F9F5F0', border: '1px solid rgba(249,0,43,0.08)' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)' }}>
                  <Icon size={16} className="text-white" />
                </div>
                <div>
                  <h4 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '14px', color: '#111', marginBottom: '4px' }}>{title}</h4>
                  {lines.map(line => (
                    <p key={line} style={{ fontSize: '13px', color: '#6B7280' }}>{line}</p>
                  ))}
                </div>
              </div>
            ))}

            <div className="p-5 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(249,0,43,0.1), rgba(249,0,43,0.05))', border: '1px solid rgba(249,0,43,0.3)' }}>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '14px', color: '#F9002B', marginBottom: '8px' }}>
                ★ Special Notes
              </h4>
              <ul className="space-y-1.5" style={{ fontSize: '13px', color: '#6B7280' }}>
                <li>• Reservations confirmed within 2 hours</li>
                <li>• Please arrive 10 minutes early</li>
                <li>• Tables held for 15 minutes after booking time</li>
                <li>• For groups of 10+, please call directly</li>
              </ul>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <form
              onSubmit={handleSubmit}
              className="p-8 sm:p-10 rounded-3xl shadow-xl"
              style={{ border: '1px solid rgba(249,0,43,0.1)', backgroundColor: 'white' }}
            >
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '24px', color: '#111', marginBottom: '24px' }}>
                Complete Your Reservation
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {[
                  { field: 'name', label: 'Full Name', placeholder: 'Your full name', type: 'text', icon: null },
                  { field: 'phone', label: 'Phone Number', placeholder: '+880 1XXXXXXXXX', type: 'tel', icon: null },
                  { field: 'email', label: 'Email Address', placeholder: 'your@email.com', type: 'email', icon: null },
                ].map(({ field, label, placeholder, type }) => (
                  <div key={field} className={field === 'name' ? 'sm:col-span-2' : ''}>
                    <label style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '13px', color: '#374151', display: 'block', marginBottom: '6px' }}>
                      {label} *
                    </label>
                    <input
                      type={type}
                      required
                      placeholder={placeholder}
                      value={form[field as keyof typeof form]}
                      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                      style={inputCls}
                    />
                  </div>
                ))}

                <div>
                  <label style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '13px', color: '#374151', display: 'block', marginBottom: '6px' }}>
                    <Calendar size={13} className="inline mr-1" /> Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    style={inputCls}
                  />
                </div>

                <div>
                  <label style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '13px', color: '#374151', display: 'block', marginBottom: '6px' }}>
                    <Clock size={13} className="inline mr-1" /> Time *
                  </label>
                  <select
                    required
                    value={form.time}
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    style={inputCls}
                  >
                    <option value="">Select time</option>
                    {['11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '13px', color: '#374151', display: 'block', marginBottom: '10px' }}>
                  <Users size={13} className="inline mr-1" /> Number of Guests *
                </label>
                <div className="flex flex-wrap gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10+'].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, guests: n }))}
                      className="w-12 h-12 rounded-xl font-semibold text-sm transition-all hover:-translate-y-0.5"
                      style={{
                        background: form.guests === n ? 'linear-gradient(135deg, #F9002B, #C8001F)' : 'white',
                        color: form.guests === n ? 'white' : '#6B7280',
                        border: '1.5px solid',
                        borderColor: form.guests === n ? 'transparent' : 'rgba(249,0,43,0.15)',
                        fontFamily: 'var(--font-heading)',
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '13px', color: '#374151', display: 'block', marginBottom: '6px' }}>
                  Special Request (Optional)
                </label>
                <textarea
                  placeholder="Any special occasions, dietary requirements, or seating preferences..."
                  value={form.specialRequest}
                  onChange={e => setForm(f => ({ ...f, specialRequest: e.target.value }))}
                  rows={4}
                  style={{ ...inputCls, resize: 'none' }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl font-semibold text-base text-white transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)' }}
              >
                {loading ? (
                  <span>Confirming Reservation...</span>
                ) : (
                  <><Check size={18} /> Confirm Reservation</>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Map */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '26px', color: '#111' }}>
              Find Us on <span style={{ color: '#F9002B' }}>Map</span>
            </h2>
          </div>
          <div className="rounded-3xl overflow-hidden shadow-xl" style={{ height: '400px' }}>
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
        </div>
      </div>
    </div>
  );
}