import React, { useState } from 'react';
import { Check, Star, Users, Calendar, MapPin, ArrowRight, Heart, Gift, Briefcase, Sparkles } from 'lucide-react';
import { cateringPackages } from '../data/restaurantData';
import { useApp } from '../context/AppContext';

const eventTypes = ['Wedding', 'Birthday', 'Corporate Event', 'Party', 'Engagement', 'Anniversary', 'Other'];

export function Catering() {
  const [selectedPackage, setSelectedPackage] = useState('gold');
  const [form, setForm] = useState({
    name: '', phone: '', email: '', eventType: '', guests: '', date: '', location: '', package: 'gold', message: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { dispatch, showNotification } = useApp();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const request = {
        id: Date.now().toString(),
        ...form,
        guests: parseInt(form.guests) || 0,
        package: selectedPackage,
        status: 'Pending' as const,
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_CATERING', payload: request });
      setSuccess(true);
      setLoading(false);
      showNotification('Catering request submitted! We\'ll contact you within 24 hours.', 'success');
    }, 1500);
  };

  if (success) {
    return (
      <div style={{ paddingTop: '80px', minHeight: '100vh' }} className="flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4 py-16">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'linear-gradient(135deg, #6B0F0F, #D4AF37)' }}
          >
            <Check size={40} className="text-white" />
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '30px', color: '#111', marginBottom: '12px' }}>
            Request Submitted!
          </h2>
          <p style={{ color: '#6B7280', fontSize: '16px', lineHeight: '1.7', marginBottom: '24px' }}>
            Thank you for choosing Rizqara for your event! Our catering team will contact you within 24 hours to discuss the details.
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="px-8 py-3.5 rounded-full text-white font-semibold transition-all hover:shadow-lg"
            style={{ background: 'linear-gradient(135deg, #6B0F0F, #4A0A0A)', fontFamily: 'var(--font-heading)' }}
          >
            Submit Another Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '80px', minHeight: '100vh' }}>
      {/* Header */}
      <div className="py-20 px-4 text-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #6B0F0F, #4A0A0A)' }}>
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 25% 50%, #D4AF37 0%, transparent 60%)' }} />
        <div className="relative max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div style={{ width: '40px', height: '2px', backgroundColor: 'rgba(212,175,55,0.5)' }} />
            <span style={{ color: '#D4AF37', fontSize: '13px', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', fontFamily: 'var(--font-heading)' }}>Events</span>
            <div style={{ width: '40px', height: '2px', backgroundColor: 'rgba(212,175,55,0.5)' }} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(32px, 5vw, 56px)', color: '#fff', marginBottom: '16px' }}>
            Professional Catering
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '17px', lineHeight: '1.7' }}>
            From intimate gatherings to grand celebrations — we bring the Rizqara experience to your event.
          </p>
        </div>
      </div>

      {/* Event Types */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="section-line" />
              <span style={{ color: '#6B0F0F', fontSize: '14px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'var(--font-heading)' }}>We Cater For</span>
              <div className="section-line" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(26px, 4vw, 38px)', color: '#111' }}>
              Every <span style={{ color: '#6B0F0F' }}>Occasion</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { type: 'Wedding', Icon: Heart, desc: 'Grand wedding feasts', color: '#D4AF37' },
              { type: 'Birthday', Icon: Gift, desc: 'Birthday celebrations', color: '#6B0F0F' },
              { type: 'Corporate', Icon: Briefcase, desc: 'Business meetings & lunches', color: '#2563EB' },
              { type: 'Party', Icon: Sparkles, desc: 'Any kind of celebration', color: '#7C3AED' },
            ].map(({ type, Icon, desc, color }) => (
              <div
                key={type}
                className="text-center p-6 rounded-2xl card-hover bg-white"
                style={{ border: '1px solid rgba(107,15,15,0.08)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: `linear-gradient(135deg, ${color}18, ${color}30)`, border: `1px solid ${color}30` }}
                >
                  <Icon size={26} style={{ color }} strokeWidth={1.8} />
                </div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '16px', color: '#111', marginBottom: '6px' }}>{type}</h3>
                <p style={{ fontSize: '13px', color: '#6B7280' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#F9F5F0' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="section-line" />
              <span style={{ color: '#6B0F0F', fontSize: '14px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'var(--font-heading)' }}>Pricing</span>
              <div className="section-line" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(26px, 4vw, 38px)', color: '#111', marginBottom: '8px' }}>
              Choose Your <span style={{ color: '#6B0F0F' }}>Package</span>
            </h2>
            <p style={{ color: '#6B7280', fontSize: '15px' }}>All packages include setup, cleanup, and dedicated service staff.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {cateringPackages.map(pkg => (
              <div
                key={pkg.id}
                className={`rounded-3xl p-8 cursor-pointer transition-all relative ${pkg.popular ? 'scale-105 shadow-2xl' : 'shadow-sm card-hover'}`}
                style={{
                  border: `2px solid ${selectedPackage === pkg.id ? pkg.color : 'rgba(107,15,15,0.1)'}`,
                  backgroundColor: pkg.popular ? '#fff' : '#fff',
                }}
                onClick={() => { setSelectedPackage(pkg.id); setForm(f => ({ ...f, package: pkg.id })); }}
              >
                {pkg.popular && (
                  <div
                    className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full text-sm font-bold shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #D4AF37, #B8960C)', color: '#111', fontFamily: 'var(--font-heading)' }}
                  >
                    ★ Most Popular
                  </div>
                )}
                <div className="flex items-center justify-between mb-4">
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '20px', color: '#111' }}>{pkg.name}</h3>
                  <div
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
                    style={{ borderColor: selectedPackage === pkg.id ? pkg.color : '#D1D5DB', backgroundColor: selectedPackage === pkg.id ? pkg.color : 'transparent' }}
                  >
                    {selectedPackage === pkg.id && <Check size={12} className="text-white" />}
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '32px', color: pkg.color, marginBottom: '4px' }}>
                  {pkg.price}
                </div>
                <div className="flex items-center gap-2 mb-6" style={{ color: '#6B7280', fontSize: '14px' }}>
                  <Users size={14} /> {pkg.serves}
                </div>
                <ul className="space-y-3">
                  {pkg.features.map(feature => (
                    <li key={feature} className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${pkg.color}15` }}>
                        <Check size={11} style={{ color: pkg.color }} />
                      </div>
                      <span style={{ fontSize: '14px', color: '#374151' }}>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Catering Form */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="section-line" />
              <span style={{ color: '#6B0F0F', fontSize: '14px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'var(--font-heading)' }}>Get a Quote</span>
              <div className="section-line" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(26px, 4vw, 36px)', color: '#111' }}>
              Book <span style={{ color: '#6B0F0F' }}>Catering</span>
            </h2>
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-8 sm:p-10 rounded-3xl shadow-xl"
            style={{ background: 'linear-gradient(135deg, #6B0F0F, #4A0A0A)' }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {[
                { field: 'name', label: 'Full Name', placeholder: 'Your full name', type: 'text' },
                { field: 'phone', label: 'Phone Number', placeholder: '+880 1XXXXXXXXX', type: 'tel' },
                { field: 'email', label: 'Email Address', placeholder: 'your@email.com', type: 'email' },
                { field: 'guests', label: 'Number of Guests', placeholder: 'e.g. 150', type: 'number' },
                { field: 'date', label: 'Event Date', placeholder: '', type: 'date' },
                { field: 'location', label: 'Event Location', placeholder: 'Venue address', type: 'text' },
              ].map(({ field, label, placeholder, type }) => (
                <div key={field}>
                  <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px', fontFamily: 'var(--font-heading)' }}>
                    {label} *
                  </label>
                  <input
                    type={type}
                    required
                    placeholder={placeholder}
                    value={form[field as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    min={type === 'date' ? new Date().toISOString().split('T')[0] : undefined}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.12)',
                      border: '1px solid rgba(255,255,255,0.25)',
                      color: 'white',
                      fontSize: '14px',
                      outline: 'none',
                      fontFamily: 'var(--font-body)',
                      colorScheme: 'dark',
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="mb-4">
              <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px', fontFamily: 'var(--font-heading)' }}>
                Event Type *
              </label>
              <div className="flex flex-wrap gap-2">
                {eventTypes.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, eventType: type }))}
                    className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: form.eventType === type ? 'linear-gradient(135deg, #D4AF37, #B8960C)' : 'rgba(255,255,255,0.1)',
                      color: form.eventType === type ? '#111' : 'rgba(255,255,255,0.8)',
                      border: '1px solid',
                      borderColor: form.eventType === type ? 'transparent' : 'rgba(255,255,255,0.2)',
                      fontFamily: 'var(--font-heading)',
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px', fontFamily: 'var(--font-heading)' }}>
                Package Selected
              </label>
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: 'rgba(212,175,55,0.2)', border: '1px solid rgba(212,175,55,0.4)' }}
              >
                <Star size={16} style={{ color: '#D4AF37' }} />
                <span style={{ color: '#D4AF37', fontWeight: 600, fontFamily: 'var(--font-heading)' }}>
                  {cateringPackages.find(p => p.id === selectedPackage)?.name} —
                  {cateringPackages.find(p => p.id === selectedPackage)?.price}
                </span>
              </div>
            </div>

            <div className="mb-6">
              <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px', fontFamily: 'var(--font-heading)' }}>
                Additional Message
              </label>
              <textarea
                placeholder="Tell us more about your event, dietary requirements, special requests..."
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  color: 'white',
                  fontSize: '14px',
                  outline: 'none',
                  fontFamily: 'var(--font-body)',
                  resize: 'none',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !form.eventType}
              className="w-full py-4 rounded-xl font-semibold text-base transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #B8960C)', color: '#111', fontFamily: 'var(--font-heading)' }}
            >
              {loading ? 'Submitting...' : (<><ArrowRight size={18} /> Book Catering Service</>)}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}