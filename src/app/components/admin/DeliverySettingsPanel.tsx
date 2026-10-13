import { useState, useEffect } from 'react';
import { Truck, Save, AlertCircle, CheckCircle2, Info, MapPin, LocateFixed } from 'lucide-react';
import { useApp, DeliverySettings, calcDeliveryFee } from '../../context/AppContext';

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: '10px',
  border: '1.5px solid rgba(249,0,43,0.15)',
  fontSize: '15px',
  fontFamily: 'var(--font-body)',
  outline: 'none',
  color: '#111',
  backgroundColor: 'white',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const focusHandlers = {
  onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'rgba(249,0,43,0.4)';
    e.target.style.boxShadow = '0 0 0 3px rgba(249,0,43,0.06)';
  },
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'rgba(249,0,43,0.15)';
    e.target.style.boxShadow = 'none';
  },
};

export function DeliverySettingsPanel() {
  const { state, updateDeliverySettings } = useApp();
  const [form, setForm] = useState<DeliverySettings>({ ...state.deliverySettings });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [geoState, setGeoState] = useState<'idle' | 'locating' | 'located' | 'error'>('idle');

  // Sync if state changes from remote
  useEffect(() => {
    setForm({ ...state.deliverySettings });
  }, [state.deliverySettings]);

  const validate = (): string => {
    if (form.baseFee < 0) return 'Base fee cannot be negative.';
    if (form.baseKm <= 0) return 'Base distance must be greater than 0.';
    if (form.extraPerKm < 0) return 'Extra rate per km cannot be negative.';
    if (!form.restaurantLat || !form.restaurantLng) return 'Restaurant GPS coordinates are required.';
    return '';
  };

  const handleSave = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    updateDeliverySettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  /** Use browser Geolocation to auto-fill restaurant coordinates (admin runs this from the restaurant) */
  const detectRestaurantLocation = () => {
    if (!navigator.geolocation) {
      setGeoState('error');
      return;
    }
    setGeoState('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({
          ...f,
          restaurantLat: Math.round(pos.coords.latitude * 1000000) / 1000000,
          restaurantLng: Math.round(pos.coords.longitude * 1000000) / 1000000,
        }));
        setGeoState('located');
      },
      () => setGeoState('error'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Preview sample distances
  const uniquePreview = Array.from(new Set([
    1,
    Math.max(1, form.baseKm - 1),
    form.baseKm,
    form.baseKm + 1,
    form.baseKm + 3,
    form.baseKm + 5,
  ])).filter(d => d > 0).sort((a, b) => a - b);

  const mapsUrl = `https://www.google.com/maps?q=${form.restaurantLat},${form.restaurantLng}`;

  return (
    <div style={{ padding: '28px', maxWidth: '700px', margin: '0 auto', fontFamily: 'var(--font-body)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', boxShadow: '0 6px 20px rgba(249,0,43,0.25)' }}
        >
          <Truck size={22} className="text-white" />
        </div>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '22px', color: '#111', marginBottom: '3px' }}>
            Delivery Charge Settings
          </h2>
          <p style={{ color: '#6B7280', fontSize: '13px' }}>
            Configure distance-based delivery fees — GPS auto-detected at customer checkout
          </p>
        </div>
      </div>

      {/* How It Works Banner */}
      <div
        className="flex items-start gap-3 p-4 rounded-xl mb-6"
        style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}
      >
        <Info size={16} style={{ color: '#3B82F6', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <p style={{ color: '#374151', fontSize: '13px', lineHeight: 1.7, fontWeight: 600, marginBottom: '4px' }}>
            How GPS delivery works:
          </p>
          <ol style={{ color: '#6B7280', fontSize: '12px', lineHeight: 1.8, paddingLeft: '16px', margin: 0 }}>
            <li>Customer clicks <strong>"Auto-Detect My Location"</strong> in checkout</li>
            <li>Browser gets their GPS coordinates (they must allow permission)</li>
            <li>System calculates exact distance using <strong>Haversine formula</strong></li>
            <li>Delivery fee is auto-calculated: flat {form.baseFee}৳ up to {form.baseKm} km, then +{form.extraPerKm}৳/km</li>
            <li>Customer can also type distance manually if GPS fails</li>
          </ol>
        </div>
      </div>

      {/* Form */}
      <div
        className="rounded-2xl p-6 mb-6 space-y-6"
        style={{ background: 'white', border: '1px solid rgba(249,0,43,0.1)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
      >
        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px', color: '#111', paddingBottom: '12px', borderBottom: '1px solid rgba(249,0,43,0.08)' }}>
          💰 Pricing Formula
        </h3>

        {/* Base Fee */}
        <div>
          <label style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '13px', color: '#374151', display: 'block', marginBottom: '8px' }}>
            Base Delivery Fee (৳)
          </label>
          <div className="relative">
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: '15px', pointerEvents: 'none' }}>৳</span>
            <input
              type="number" min="0" step="5"
              value={form.baseFee}
              onChange={e => setForm(f => ({ ...f, baseFee: parseFloat(e.target.value) || 0 }))}
              style={{ ...fieldStyle, paddingLeft: '32px' }}
              {...focusHandlers}
            />
          </div>
          <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '5px' }}>
            Fixed charge for the first {form.baseKm} km
          </p>
        </div>

        {/* Base Km */}
        <div>
          <label style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '13px', color: '#374151', display: 'block', marginBottom: '8px' }}>
            Base Distance (km)
          </label>
          <div className="relative">
            <input
              type="number" min="0.5" step="0.5"
              value={form.baseKm}
              onChange={e => setForm(f => ({ ...f, baseKm: parseFloat(e.target.value) || 1 }))}
              style={{ ...fieldStyle, paddingRight: '50px' }}
              {...focusHandlers}
            />
            <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: '13px', pointerEvents: 'none' }}>km</span>
          </div>
        </div>

        {/* Extra Per Km */}
        <div>
          <label style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '13px', color: '#374151', display: 'block', marginBottom: '8px' }}>
            Extra Charge per km (৳/km)
          </label>
          <div className="relative">
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: '15px', pointerEvents: 'none' }}>৳</span>
            <input
              type="number" min="0" step="1"
              value={form.extraPerKm}
              onChange={e => setForm(f => ({ ...f, extraPerKm: parseFloat(e.target.value) || 0 }))}
              style={{ ...fieldStyle, paddingLeft: '32px', paddingRight: '55px' }}
              {...focusHandlers}
            />
            <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: '13px', pointerEvents: 'none' }}>/km</span>
          </div>
          <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '5px' }}>
            Added per km beyond base distance (rounded up)
          </p>
        </div>
      </div>

      {/* Restaurant GPS Coordinates */}
      <div
        className="rounded-2xl p-6 mb-6 space-y-5"
        style={{ background: 'white', border: '1px solid rgba(249,0,43,0.1)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
      >
        <div className="flex items-center justify-between">
          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px', color: '#111' }}>
            📍 Restaurant GPS Location
          </h3>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '12px', color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}
          >
            View on Maps ↗
          </a>
        </div>
        <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '-8px' }}>
          This is the origin point used to calculate customer delivery distances. Open the restaurant on Google Maps, copy the coordinates, and paste them below. Or click "Use My Current Location" if you're at the restaurant.
        </p>

        {/* Auto-detect restaurant location button */}
        <button
          type="button"
          onClick={detectRestaurantLocation}
          disabled={geoState === 'locating'}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all"
          style={{
            background: geoState === 'located' ? 'rgba(22,163,74,0.08)' : 'rgba(59,130,246,0.07)',
            border: geoState === 'located' ? '1.5px solid rgba(22,163,74,0.3)' : '1.5px solid rgba(59,130,246,0.2)',
            color: geoState === 'located' ? '#16A34A' : '#2563EB',
            fontSize: '13px',
            fontFamily: 'var(--font-heading)',
            cursor: geoState === 'locating' ? 'not-allowed' : 'pointer',
          }}
        >
          {geoState === 'locating' ? (
            <><span style={{ width: 16, height: 16, border: '2px solid #93C5FD', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /><span>Detecting location...</span></>
          ) : geoState === 'located' ? (
            <><CheckCircle2 size={15} /><span>Location set from GPS!</span></>
          ) : (
            <><LocateFixed size={15} /><span>Use My Current Location (I'm at the restaurant)</span></>
          )}
        </button>

        {geoState === 'error' && (
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(249,0,43,0.05)', border: '1px solid rgba(249,0,43,0.15)' }}>
            <AlertCircle size={13} style={{ color: '#F9002B' }} />
            <span style={{ color: '#6B7280', fontSize: '12px' }}>Could not detect location. Please enter coordinates manually below.</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '12px', color: '#374151', display: 'block', marginBottom: '6px' }}>
              Latitude
            </label>
            <input
              type="number" step="0.000001"
              value={form.restaurantLat ?? ''}
              onChange={e => setForm(f => ({ ...f, restaurantLat: parseFloat(e.target.value) || 0 }))}
              placeholder="e.g. 24.8965"
              style={fieldStyle}
              {...focusHandlers}
            />
          </div>
          <div>
            <label style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '12px', color: '#374151', display: 'block', marginBottom: '6px' }}>
              Longitude
            </label>
            <input
              type="number" step="0.000001"
              value={form.restaurantLng ?? ''}
              onChange={e => setForm(f => ({ ...f, restaurantLng: parseFloat(e.target.value) || 0 }))}
              placeholder="e.g. 91.8744"
              style={fieldStyle}
              {...focusHandlers}
            />
          </div>
        </div>

        <div
          className="flex items-start gap-2 p-3 rounded-xl"
          style={{ background: 'rgba(249,0,43,0.03)', border: '1px solid rgba(249,0,43,0.08)' }}
        >
          <MapPin size={13} style={{ color: '#F9002B', flexShrink: 0, marginTop: '1px' }} />
          <p style={{ color: '#6B7280', fontSize: '11px', lineHeight: 1.6 }}>
            <strong>How to get coordinates:</strong> Open <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" style={{ color: '#2563EB' }}>Google Maps</a>, right-click on the restaurant, click the coordinates to copy them (format: lat, lng).
          </p>
        </div>
      </div>

      {/* Error / Success */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl mb-4" style={{ background: 'rgba(249,0,43,0.07)', border: '1px solid rgba(249,0,43,0.2)' }}>
          <AlertCircle size={14} style={{ color: '#F9002B', flexShrink: 0 }} />
          <span style={{ color: '#F9002B', fontSize: '13px' }}>{error}</span>
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-2 p-3 rounded-xl mb-4" style={{ background: 'rgba(22,163,74,0.07)', border: '1px solid rgba(22,163,74,0.2)' }}>
          <CheckCircle2 size={14} style={{ color: '#16A34A', flexShrink: 0 }} />
          <span style={{ color: '#16A34A', fontSize: '13px' }}>Settings saved! All customers will now get GPS-based delivery charges.</span>
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white font-semibold transition-all hover:shadow-xl hover:-translate-y-0.5 mb-6"
        style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)', fontSize: '15px', boxShadow: '0 6px 20px rgba(249,0,43,0.25)' }}
      >
        <Save size={16} />
        Save Delivery Settings
      </button>

      {/* Live Preview Table */}
      <div
        className="rounded-2xl p-6"
        style={{ background: 'white', border: '1px solid rgba(249,0,43,0.1)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
      >
        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px', color: '#111', marginBottom: '16px' }}>
          📊 Live Pricing Preview
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(249,0,43,0.1)' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontFamily: 'var(--font-heading)', color: '#6B7280', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase' }}>Distance</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', fontFamily: 'var(--font-heading)', color: '#6B7280', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase' }}>Delivery Fee</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontFamily: 'var(--font-heading)', color: '#6B7280', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase' }}>Breakdown</th>
              </tr>
            </thead>
            <tbody>
              {uniquePreview.map((d, i) => {
                const fee = calcDeliveryFee(d, form);
                const isBase = d <= form.baseKm;
                return (
                  <tr key={d} style={{ borderBottom: '1px solid rgba(249,0,43,0.06)', background: i % 2 === 0 ? 'transparent' : 'rgba(249,0,43,0.02)' }}>
                    <td style={{ padding: '10px 12px', color: '#111', fontWeight: 500 }}>{d} km</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-heading)', fontWeight: 700, color: '#F9002B', fontSize: '15px' }}>৳{fee}</td>
                    <td style={{ padding: '10px 12px', color: '#9CA3AF', fontSize: '12px' }}>
                      {isBase ? `Flat fee (within ${form.baseKm} km)` : `৳${form.baseFee} + ${Math.ceil(d - form.baseKm)} km × ৳${form.extraPerKm}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '12px' }}>
          * Extra km is rounded up. Preview updates live as you change settings above.
        </p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
