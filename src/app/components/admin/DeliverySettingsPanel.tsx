import { useState, useEffect } from 'react';
import {
  Truck,
  Save,
  AlertCircle,
  CheckCircle2,
  Info,
  MapPin,
  LocateFixed,
  Calculator,
  Navigation,
  BarChart3,
  ExternalLink,
  Milestone,
  TrendingUp,
  Compass,
  Coins,
  ShieldCheck,
} from 'lucide-react';
import { useApp, DeliverySettings, calcDeliveryFee, FIXED_RESTAURANT_LOCATION } from '../../context/AppContext';

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
  const [form, setForm] = useState<DeliverySettings>({
    ...state.deliverySettings,
    restaurantLat: state.deliverySettings.restaurantLat || FIXED_RESTAURANT_LOCATION.lat,
    restaurantLng: state.deliverySettings.restaurantLng || FIXED_RESTAURANT_LOCATION.lng,
    locationName: state.deliverySettings.locationName || 'WV46+W8, Sylhet (Subidbazar Point)',
  });
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [geoState, setGeoState] = useState<'idle' | 'locating' | 'located' | 'error'>('idle');

  // Sync if state changes from remote
  useEffect(() => {
    setForm({
      ...state.deliverySettings,
      restaurantLat: state.deliverySettings.restaurantLat || FIXED_RESTAURANT_LOCATION.lat,
      restaurantLng: state.deliverySettings.restaurantLng || FIXED_RESTAURANT_LOCATION.lng,
      locationName: state.deliverySettings.locationName || 'WV46+W8, Sylhet (Subidbazar Point)',
    });
  }, [state.deliverySettings]);

  const validate = (): string => {
    if (form.baseFee < 0) return 'Base fee cannot be negative.';
    if (form.baseKm <= 0) return 'Base distance must be greater than 0.';
    if (form.extraPerKm < 0) return 'Extra rate per km cannot be negative.';
    if (!form.restaurantLat || !form.restaurantLng) return 'Restaurant GPS coordinates are required.';
    return '';
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setIsSaving(true);
    try {
      await updateDeliverySettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (e: any) {
      setError(e?.message || 'Failed to save delivery settings');
    } finally {
      setIsSaving(false);
    }
  };

  /** Hardcode/apply official restaurant location (WV46+W8 Sylhet) */
  const applyFixedLocation = () => {
    setForm(f => ({
      ...f,
      restaurantLat: FIXED_RESTAURANT_LOCATION.lat,
      restaurantLng: FIXED_RESTAURANT_LOCATION.lng,
      locationName: 'WV46+W8, Sylhet (Subidbazar Point)',
    }));
    setGeoState('located');
  };

  /** Use browser Geolocation to auto-fill restaurant coordinates */
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
    <div style={{ padding: '28px', maxWidth: '720px', margin: '0 auto', fontFamily: 'var(--font-body)' }}>
      {/* Header */}
      <div className="flex items-center gap-3.5 mb-8">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', boxShadow: '0 6px 20px rgba(249,0,43,0.25)' }}
        >
          <Truck size={22} className="text-white" />
        </div>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '22px', color: '#111', marginBottom: '3px' }}>
            Delivery Charge Settings
          </h2>
          <p style={{ color: '#6B7280', fontSize: '13px' }}>
            Configure dynamic distance-based delivery fees with GPS auto-detection
          </p>
        </div>
      </div>

      {/* How It Works Banner */}
      <div
        className="p-4 rounded-2xl mb-6"
        style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.14)' }}
      >
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <Info size={14} />
          </div>
          <span style={{ color: '#1E40AF', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
            How GPS Delivery System Works
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-2">
          <div className="bg-white/80 p-2.5 rounded-xl border border-blue-100 flex items-start gap-2">
            <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
              <LocateFixed size={12} />
            </div>
            <p style={{ fontSize: '11px', color: '#4B5563', lineHeight: 1.4 }}>
              <strong>1. Customer GPS</strong><br />
              Client auto-detects accurate coordinates at checkout.
            </p>
          </div>
          <div className="bg-white/80 p-2.5 rounded-xl border border-blue-100 flex items-start gap-2">
            <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
              <Compass size={12} />
            </div>
            <p style={{ fontSize: '11px', color: '#4B5563', lineHeight: 1.4 }}>
              <strong>2. Haversine Math</strong><br />
              Calculates straight-line km from restaurant pin.
            </p>
          </div>
          <div className="bg-white/80 p-2.5 rounded-xl border border-blue-100 flex items-start gap-2">
            <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
              <Coins size={12} />
            </div>
            <p style={{ fontSize: '11px', color: '#4B5563', lineHeight: 1.4 }}>
              <strong>3. Auto Charge</strong><br />
              Flat {form.baseFee}৳ for {form.baseKm}km, +{form.extraPerKm}৳ per extra km.
            </p>
          </div>
        </div>
      </div>

      {/* Form: Pricing Formula */}
      <div
        className="rounded-2xl p-6 mb-6 space-y-6"
        style={{ background: 'white', border: '1px solid rgba(249,0,43,0.1)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
      >
        <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Calculator size={16} />
          </div>
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px', color: '#111' }}>
              Pricing Formula
            </h3>
            <p style={{ fontSize: '12px', color: '#9CA3AF' }}>Set baseline thresholds and increment rates</p>
          </div>
        </div>

        {/* Base Fee */}
        <div>
          <label className="flex items-center gap-1.5" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '13px', color: '#374151', marginBottom: '8px' }}>
            <Coins size={14} className="text-amber-500" />
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
            Flat fee applied for all orders within the first {form.baseKm} km
          </p>
        </div>

        {/* Base Km */}
        <div>
          <label className="flex items-center gap-1.5" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '13px', color: '#374151', marginBottom: '8px' }}>
            <Milestone size={14} className="text-blue-500" />
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
          <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '5px' }}>
            Distance radius covered by the flat base charge
          </p>
        </div>

        {/* Extra Per Km */}
        <div>
          <label className="flex items-center gap-1.5" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '13px', color: '#374151', marginBottom: '8px' }}>
            <TrendingUp size={14} className="text-[#F9002B]" />
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
            Added per additional km beyond base distance (rounded up to nearest full km)
          </p>
        </div>
      </div>

      {/* Restaurant GPS Coordinates */}
      <div
        className="rounded-2xl p-6 mb-6 space-y-5"
        style={{ background: 'white', border: '1px solid rgba(249,0,43,0.1)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
      >
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-500/10 text-[#F9002B] flex items-center justify-center shrink-0">
              <Navigation size={16} />
            </div>
            <div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px', color: '#111' }}>
                Restaurant GPS Location
              </h3>
              <p style={{ fontSize: '12px', color: '#9CA3AF' }}>Central reference pin for all distance calculations</p>
            </div>
          </div>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors font-medium text-xs"
          >
            <span>View on Maps</span>
            <ExternalLink size={12} />
          </a>
        </div>

        {/* Official Fixed Location Banner */}
        <div
          className="p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          style={{ background: 'linear-gradient(135deg, rgba(249,0,43,0.05), rgba(200,0,31,0.08))', border: '1.5px solid rgba(249,0,43,0.2)' }}
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', color: 'white' }}>
              <MapPin size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 text-sm" style={{ fontFamily: 'var(--font-heading)' }}>
                  Fixed Location: WV46+W8 Sylhet
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-[#F9002B]">
                  Official Pin
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                Subidbazar Point, Mitali Complex, Sylhet &middot; GPS: 24.90725, 91.8608
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={applyFixedLocation}
            className="px-3.5 py-2 rounded-lg text-xs font-bold text-white transition-all hover:scale-105 shrink-0"
            style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)', boxShadow: '0 3px 10px rgba(249,0,43,0.25)' }}
          >
            Apply Fixed WV46+W8 Pin
          </button>
        </div>

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
            <>
              <span style={{ width: 16, height: 16, border: '2px solid #93C5FD', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
              <span>Detecting GPS location...</span>
            </>
          ) : geoState === 'located' ? (
            <>
              <CheckCircle2 size={16} />
              <span>Location set to GPS coordinates!</span>
            </>
          ) : (
            <>
              <LocateFixed size={16} />
              <span>Or Auto-Detect Using My Current Device GPS</span>
            </>
          )}
        </button>

        {geoState === 'error' && (
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(249,0,43,0.05)', border: '1px solid rgba(249,0,43,0.15)' }}>
            <AlertCircle size={14} style={{ color: '#F9002B', flexShrink: 0 }} />
            <span style={{ color: '#6B7280', fontSize: '12px' }}>Could not detect location. Please click "Apply Fixed WV46+W8 Pin" above.</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-1.5" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '12px', color: '#374151', marginBottom: '6px' }}>
              <MapPin size={13} className="text-[#F9002B]" />
              Latitude
            </label>
            <input
              type="number" step="0.000001"
              value={form.restaurantLat ?? ''}
              onChange={e => setForm(f => ({ ...f, restaurantLat: parseFloat(e.target.value) || 0 }))}
              placeholder="e.g. 24.90725"
              style={fieldStyle}
              {...focusHandlers}
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '12px', color: '#374151', marginBottom: '6px' }}>
              <MapPin size={13} className="text-[#F9002B]" />
              Longitude
            </label>
            <input
              type="number" step="0.000001"
              value={form.restaurantLng ?? ''}
              onChange={e => setForm(f => ({ ...f, restaurantLng: parseFloat(e.target.value) || 0 }))}
              placeholder="e.g. 91.8608"
              style={fieldStyle}
              {...focusHandlers}
            />
          </div>
        </div>

        <div
          className="flex items-start gap-2.5 p-3 rounded-xl"
          style={{ background: 'rgba(249,0,43,0.03)', border: '1px solid rgba(249,0,43,0.08)' }}
        >
          <Info size={14} style={{ color: '#F9002B', flexShrink: 0, marginTop: '2px' }} />
          <p style={{ color: '#6B7280', fontSize: '12px', lineHeight: 1.6 }}>
            <strong>Restaurant location is fixed to:</strong> Plus Code <code>WV46+W8, Sylhet</code> (Subidbazar Point, Mitali Complex). All customer checkout deliveries measure straight-line distance directly from this pin.
          </p>
        </div>
      </div>

      {/* Error / Success Notifications */}
      {error && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl mb-4" style={{ background: 'rgba(249,0,43,0.07)', border: '1px solid rgba(249,0,43,0.2)' }}>
          <AlertCircle size={15} style={{ color: '#F9002B', flexShrink: 0 }} />
          <span style={{ color: '#F9002B', fontSize: '13px', fontWeight: 500 }}>{error}</span>
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl mb-4" style={{ background: 'rgba(22,163,74,0.07)', border: '1px solid rgba(22,163,74,0.2)' }}>
          <CheckCircle2 size={15} style={{ color: '#16A34A', flexShrink: 0 }} />
          <span style={{ color: '#16A34A', fontSize: '13px', fontWeight: 500 }}>Settings saved successfully! All customer orders will now compute delivery charges from this formula.</span>
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white font-semibold transition-all hover:shadow-xl hover:-translate-y-0.5 mb-6"
        style={{
          background: isSaving ? '#9CA3AF' : 'linear-gradient(135deg, #F9002B, #C8001F)',
          fontFamily: 'var(--font-heading)',
          fontSize: '15px',
          boxShadow: isSaving ? 'none' : '0 6px 20px rgba(249,0,43,0.25)',
          cursor: isSaving ? 'not-allowed' : 'pointer'
        }}
      >
        {isSaving ? (
          <>
            <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
            <span>Saving Settings...</span>
          </>
        ) : (
          <>
            <Save size={16} />
            <span>Save Delivery Settings</span>
          </>
        )}
      </button>

      {/* Live Preview Table */}
      <div
        className="rounded-2xl p-6"
        style={{ background: 'white', border: '1px solid rgba(249,0,43,0.1)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
      >
        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-gray-100">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <BarChart3 size={16} />
          </div>
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px', color: '#111' }}>
              Live Pricing Preview
            </h3>
            <p style={{ fontSize: '12px', color: '#9CA3AF' }}>Simulated delivery fees based on current formula</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(249,0,43,0.1)' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontFamily: 'var(--font-heading)', color: '#6B7280', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase' }}>Distance</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', fontFamily: 'var(--font-heading)', color: '#6B7280', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase' }}>Delivery Fee</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontFamily: 'var(--font-heading)', color: '#6B7280', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase' }}>Rate Type</th>
              </tr>
            </thead>
            <tbody>
              {uniquePreview.map((d, i) => {
                const fee = calcDeliveryFee(d, form);
                const isBase = d <= form.baseKm;
                return (
                  <tr key={d} style={{ borderBottom: '1px solid rgba(249,0,43,0.06)', background: i % 2 === 0 ? 'transparent' : 'rgba(249,0,43,0.02)' }}>
                    <td style={{ padding: '12px', color: '#111', fontWeight: 600 }}>
                      <span className="inline-flex items-center gap-1.5">
                        <Milestone size={13} className="text-gray-400" />
                        {d} km
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'var(--font-heading)', fontWeight: 800, color: '#F9002B', fontSize: '15px' }}>
                      ৳{fee}
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px' }}>
                      {isBase ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 font-medium text-xs">
                          <ShieldCheck size={12} />
                          Base zone (within {form.baseKm} km)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-medium text-xs">
                          <TrendingUp size={12} />
                          ৳{form.baseFee} + {Math.ceil(d - form.baseKm)} km × ৳{form.extraPerKm}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '12px' }}>
          * Extra distance is rounded up to the nearest km. Preview updates dynamically with input changes above.
        </p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
