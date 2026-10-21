import { useState, useEffect, useMemo } from 'react';
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
  Plus,
  Trash2,
  Search,
  RotateCcw,
  Building2,
  Sparkles,
} from 'lucide-react';
import {
  useApp,
  DeliverySettings,
  CustomDeliveryArea,
  DEFAULT_SYLHET_CUSTOM_AREAS,
  calcDeliveryFee,
  FIXED_RESTAURANT_LOCATION,
} from '../../context/AppContext';

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: '10px',
  border: '1.5px solid rgba(249,0,43,0.15)',
  fontSize: '14px',
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
    customAreas: (state.deliverySettings.customAreas && state.deliverySettings.customAreas.length > 0)
      ? state.deliverySettings.customAreas
      : DEFAULT_SYLHET_CUSTOM_AREAS,
  });

  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [geoState, setGeoState] = useState<'idle' | 'locating' | 'located' | 'error'>('idle');

  // Quick add area form state
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaFee, setNewAreaFee] = useState<number | string>(50);
  const [newAreaDist, setNewAreaDist] = useState<number | string>('');
  const [searchFilter, setSearchFilter] = useState('');
  const [addError, setAddError] = useState('');

  // Sync if state changes from remote
  useEffect(() => {
    setForm({
      ...state.deliverySettings,
      restaurantLat: state.deliverySettings.restaurantLat || FIXED_RESTAURANT_LOCATION.lat,
      restaurantLng: state.deliverySettings.restaurantLng || FIXED_RESTAURANT_LOCATION.lng,
      locationName: state.deliverySettings.locationName || 'WV46+W8, Sylhet (Subidbazar Point)',
      customAreas: (state.deliverySettings.customAreas && state.deliverySettings.customAreas.length > 0)
        ? state.deliverySettings.customAreas
        : DEFAULT_SYLHET_CUSTOM_AREAS,
    });
  }, [state.deliverySettings]);

  const validate = (): string => {
    if (form.baseFee < 0) return 'Base fee cannot be negative.';
    if (form.baseKm <= 0) return 'Base distance must be greater than 0.';
    if (form.extraPerKm < 0) return 'Extra rate per km cannot be negative.';
    if (!form.restaurantLat || !form.restaurantLng) return 'Restaurant GPS coordinates are required.';
    if (form.customAreas) {
      for (const a of form.customAreas) {
        if (!a.name.trim()) return 'All custom delivery areas must have a name.';
        if (a.fee < 0) return `Delivery fee for "${a.name}" cannot be negative.`;
      }
    }
    return '';
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setIsSaving(true);
    try {
      const sanitizedAreas = (form.customAreas || []).map(a => ({
        id: a.id,
        name: a.name.trim(),
        fee: Math.max(0, typeof a.fee === 'number' ? a.fee : (parseFloat(String(a.fee)) || 0)),
        distKm: a.distKm !== undefined && a.distKm !== null && !isNaN(Number(a.distKm)) ? Number(a.distKm) : undefined,
      }));
      const payloadToSave: DeliverySettings = {
        ...form,
        customAreas: sanitizedAreas,
      };
      await updateDeliverySettings(payloadToSave);
      setForm(payloadToSave);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
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

  // ─── Custom Areas Management ──────────────────────────────────────────────
  const handleAddArea = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newAreaName.trim();
    if (!name) {
      setAddError('Please enter a location name (e.g. Zindabazar, Upashohor)');
      return;
    }
    const feeNum = Number(newAreaFee);
    if (isNaN(feeNum) || feeNum < 0) {
      setAddError('Please enter a valid non-negative delivery fee amount');
      return;
    }

    const distNum = newAreaDist !== '' && !isNaN(Number(newAreaDist)) ? Number(newAreaDist) : undefined;

    const newArea: CustomDeliveryArea = {
      id: `area-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      fee: feeNum,
      distKm: distNum,
    };

    setForm(prev => ({
      ...prev,
      customAreas: [newArea, ...(prev.customAreas || [])],
    }));

    setNewAreaName('');
    setNewAreaFee(50);
    setNewAreaDist('');
    setAddError('');
  };

  const handleUpdateArea = (id: string, updates: Partial<CustomDeliveryArea>) => {
    setForm(prev => ({
      ...prev,
      customAreas: (prev.customAreas || []).map(a => (a.id === id ? { ...a, ...updates } : a)),
    }));
  };

  const handleDeleteArea = (id: string) => {
    setForm(prev => ({
      ...prev,
      customAreas: (prev.customAreas || []).filter(a => a.id !== id),
    }));
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset delivery areas to standard 13 Sylhet presets? Any unsaved changes will be replaced.')) {
      setForm(prev => ({
        ...prev,
        customAreas: DEFAULT_SYLHET_CUSTOM_AREAS,
      }));
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all custom delivery areas?')) {
      setForm(prev => ({
        ...prev,
        customAreas: [],
      }));
    }
  };

  const filteredAreas = useMemo(() => {
    const list = form.customAreas || [];
    if (!searchFilter.trim()) return list;
    const query = searchFilter.toLowerCase().trim();
    return list.filter(a => a.name.toLowerCase().includes(query));
  }, [form.customAreas, searchFilter]);

  // Preview sample distances for formula
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
    <div style={{ padding: '24px 20px', maxWidth: '1360px', margin: '0 auto', fontFamily: 'var(--font-body)' }}>
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-200">
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', boxShadow: '0 6px 20px rgba(249,0,43,0.25)' }}
          >
            <Truck size={22} className="text-white" />
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '22px', color: '#111', marginBottom: '2px' }}>
              Delivery Charge & Sylhet Areas Settings
            </h2>
            <p style={{ color: '#6B7280', fontSize: '13px' }}>
              Configure GPS distance pricing formula & customize Sylhet delivery locations and amounts
            </p>
          </div>
        </div>

        {/* Global Save Button */}
        <div className="flex items-center gap-3">
          {saved && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-semibold">
              <CheckCircle2 size={14} />
              <span>Saved</span>
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-bold transition-all hover:shadow-xl hover:-translate-y-0.5"
            style={{
              background: isSaving ? '#9CA3AF' : 'linear-gradient(135deg, #F9002B, #C8001F)',
              fontFamily: 'var(--font-heading)',
              fontSize: '14px',
              boxShadow: isSaving ? 'none' : '0 6px 20px rgba(249,0,43,0.25)',
              cursor: isSaving ? 'not-allowed' : 'pointer'
            }}
          >
            {isSaving ? (
              <>
                <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                <span>Saving All Settings...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Delivery Settings</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl mb-6" style={{ background: 'rgba(249,0,43,0.07)', border: '1px solid rgba(249,0,43,0.2)' }}>
          <AlertCircle size={15} style={{ color: '#F9002B', flexShrink: 0 }} />
          <span style={{ color: '#F9002B', fontSize: '13px', fontWeight: 600 }}>{error}</span>
        </div>
      )}

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ─── LEFT COLUMN: Formula & GPS Settings (5 Cols) ─── */}
        <div className="lg:col-span-5 space-y-6">
          {/* How It Works Banner */}
          <div
            className="p-4 rounded-2xl"
            style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.14)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                <Info size={14} />
              </div>
              <span style={{ color: '#1E40AF', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                GPS Formula vs Custom Areas
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#4B5563', lineHeight: 1.5 }}>
              Customers can either <strong>Auto-Detect My Location (GPS)</strong> to compute distance from restaurant, or <strong>Select Your Sylhet Delivery Area</strong> from the customized list on the right.
            </p>
          </div>

          {/* Pricing Formula Card */}
          <div
            className="rounded-2xl p-6 space-y-5"
            style={{ background: 'white', border: '1px solid rgba(249,0,43,0.1)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
          >
            <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <Calculator size={16} />
              </div>
              <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px', color: '#111' }}>
                  Distance Pricing Formula
                </h3>
                <p style={{ fontSize: '12px', color: '#9CA3AF' }}>Set baseline thresholds and increment rates</p>
              </div>
            </div>

            {/* Base Fee */}
            <div>
              <label className="flex items-center gap-1.5" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '13px', color: '#374151', marginBottom: '6px' }}>
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
              <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
                Flat fee applied for orders within the first {form.baseKm} km
              </p>
            </div>

            {/* Base Km */}
            <div>
              <label className="flex items-center gap-1.5" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '13px', color: '#374151', marginBottom: '6px' }}>
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
              <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
                Distance radius covered by the flat base charge
              </p>
            </div>

            {/* Extra Per Km */}
            <div>
              <label className="flex items-center gap-1.5" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '13px', color: '#374151', marginBottom: '6px' }}>
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
              <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
                Added per additional km beyond base distance
              </p>
            </div>
          </div>

          {/* Restaurant GPS Coordinates */}
          <div
            className="rounded-2xl p-6 space-y-4"
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
                  <p style={{ fontSize: '12px', color: '#9CA3AF' }}>Central reference pin for Sylhet deliveries</p>
                </div>
              </div>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors font-medium text-xs"
              >
                <span>Maps</span>
                <ExternalLink size={12} />
              </a>
            </div>

            {/* Official Fixed Location Banner */}
            <div
              className="p-3.5 rounded-xl flex flex-col gap-2.5"
              style={{ background: 'linear-gradient(135deg, rgba(249,0,43,0.05), rgba(200,0,31,0.08))', border: '1.5px solid rgba(249,0,43,0.2)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', color: 'white' }}>
                    <MapPin size={16} />
                  </div>
                  <div>
                    <span className="font-bold text-gray-900 text-xs" style={{ fontFamily: 'var(--font-heading)' }}>
                      Fixed Pin: WV46+W8 Sylhet
                    </span>
                    <p className="text-[11px] text-gray-600">
                      Subidbazar Point, Mitali Complex &middot; 24.90725, 91.8608
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={applyFixedLocation}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white transition-all hover:scale-105 shrink-0"
                  style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)' }}
                >
                  Apply WV46+W8
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-600 mb-1 block">Latitude</label>
                <input
                  type="number" step="0.000001"
                  value={form.restaurantLat ?? ''}
                  onChange={e => setForm(f => ({ ...f, restaurantLat: parseFloat(e.target.value) || 0 }))}
                  style={fieldStyle}
                  {...focusHandlers}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-600 mb-1 block">Longitude</label>
                <input
                  type="number" step="0.000001"
                  value={form.restaurantLng ?? ''}
                  onChange={e => setForm(f => ({ ...f, restaurantLng: parseFloat(e.target.value) || 0 }))}
                  style={fieldStyle}
                  {...focusHandlers}
                />
              </div>
            </div>
          </div>

          {/* Live Pricing Preview Table */}
          <div
            className="rounded-2xl p-6"
            style={{ background: 'white', border: '1px solid rgba(249,0,43,0.1)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
          >
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                <BarChart3 size={16} />
              </div>
              <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px', color: '#111' }}>
                  Live Formula Preview
                </h3>
                <p style={{ fontSize: '12px', color: '#9CA3AF' }}>Simulated delivery fees based on current formula</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(249,0,43,0.1)' }}>
                    <th className="text-left py-2 px-2 text-gray-500 uppercase font-semibold">Distance</th>
                    <th className="text-right py-2 px-2 text-gray-500 uppercase font-semibold">Charge</th>
                    <th className="text-left py-2 px-2 text-gray-500 uppercase font-semibold">Zone</th>
                  </tr>
                </thead>
                <tbody>
                  {uniquePreview.map((d, i) => {
                    const fee = calcDeliveryFee(d, form);
                    const isBase = d <= form.baseKm;
                    return (
                      <tr key={d} style={{ borderBottom: '1px solid rgba(249,0,43,0.06)', background: i % 2 === 0 ? 'transparent' : 'rgba(249,0,43,0.02)' }}>
                        <td className="py-2.5 px-2 font-semibold text-gray-800">{d} km</td>
                        <td className="py-2.5 px-2 text-right font-extrabold text-[#F9002B] text-sm">৳{fee}</td>
                        <td className="py-2.5 px-2">
                          {isBase ? (
                            <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium text-[10px]">
                              Base ({form.baseKm}km)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium text-[10px]">
                              +{form.extraPerKm}৳/km
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ─── RIGHT COLUMN: Custom Sylhet Delivery Areas & Amounts (7 Cols) ─── */}
        <div className="lg:col-span-7 space-y-6">
          <div
            className="rounded-2xl p-6"
            style={{
              background: 'white',
              border: '1.5px solid rgba(249,0,43,0.18)',
              boxShadow: '0 4px 20px rgba(249,0,43,0.06)',
            }}
          >
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-gray-100">
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, #111, #333)', color: 'white' }}
                >
                  <Building2 size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '17px', color: '#111' }}>
                      Sylhet Delivery Areas & Custom Amounts
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-[#F9002B]">
                      {(form.customAreas || []).length} Active
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                    Controls the <strong>"Or Select Your Sylhet Delivery Area:"</strong> dropdown on the customer website.
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-colors"
                  title="Reload 13 default Sylhet areas"
                >
                  <RotateCcw size={12} />
                  <span>Sylhet Presets</span>
                </button>
                {(form.customAreas || []).length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-100 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors"
                    title="Clear all areas"
                  >
                    <Trash2 size={12} />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Add Area Form */}
            <form onSubmit={handleAddArea} className="mt-5 p-4 rounded-xl bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} className="text-[#F9002B]" />
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wider" style={{ fontFamily: 'var(--font-heading)' }}>
                  Add New Delivery Location & Charge
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                {/* Location Name */}
                <div className="sm:col-span-6">
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">
                    Location / Area Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newAreaName}
                    onChange={e => { setNewAreaName(e.target.value); setAddError(''); }}
                    placeholder="e.g. Zindabazar, Upashohor, Tilagarh..."
                    className="w-full py-2.5 px-3 rounded-lg border border-gray-300 text-xs text-gray-900 bg-white focus:outline-none focus:border-[#F9002B]"
                  />
                </div>

                {/* Delivery Amount (৳) */}
                <div className="sm:col-span-3">
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">
                    Amount (৳) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">৳</span>
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={newAreaFee}
                      onChange={e => setNewAreaFee(e.target.value)}
                      placeholder="50"
                      className="w-full py-2.5 pl-6 pr-2 rounded-lg border border-gray-300 text-xs font-bold text-[#F9002B] bg-white focus:outline-none focus:border-[#F9002B]"
                    />
                  </div>
                </div>

                {/* Approx Distance (km) */}
                <div className="sm:col-span-3">
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">
                    Dist (~km)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={newAreaDist}
                      onChange={e => setNewAreaDist(e.target.value)}
                      placeholder="2.5"
                      className="w-full py-2.5 px-2 rounded-lg border border-gray-300 text-xs text-gray-800 bg-white focus:outline-none focus:border-[#F9002B]"
                    />
                    <button
                      type="submit"
                      className="flex items-center justify-center gap-1 px-4 py-2.5 rounded-lg text-white font-bold text-xs shrink-0 transition-transform active:scale-95"
                      style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', boxShadow: '0 3px 10px rgba(249,0,43,0.2)' }}
                    >
                      <Plus size={14} />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>

              {addError && (
                <p className="mt-2 text-xs text-red-600 font-semibold flex items-center gap-1">
                  <AlertCircle size={12} />
                  <span>{addError}</span>
                </p>
              )}
            </form>

            {/* Search Filter Bar */}
            <div className="mt-5 flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  placeholder="Search areas (e.g. Amberkhana, Zinda, 20/30/40 locations)..."
                  className="w-full py-2 pl-8 pr-3 rounded-lg border border-gray-200 text-xs bg-gray-50 focus:bg-white focus:outline-none focus:border-red-400 transition-colors"
                />
              </div>
              <span className="text-[11px] text-gray-500 font-medium px-1 shrink-0">
                Showing {filteredAreas.length} of {(form.customAreas || []).length}
              </span>
            </div>

            {/* List of Custom Areas */}
            <div className="mt-4 space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {filteredAreas.length === 0 ? (
                <div className="text-center py-10 px-4 rounded-xl border border-dashed border-gray-200">
                  <MapPin size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm font-bold text-gray-700">No delivery areas found</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                    {searchFilter ? 'Try clearing your search keyword.' : 'Click "+ Add" above or click "Sylhet Presets" to add standard Sylhet areas.'}
                  </p>
                  {!searchFilter && (
                    <button
                      type="button"
                      onClick={handleResetDefaults}
                      className="mt-3 px-4 py-2 rounded-lg bg-red-50 text-[#F9002B] text-xs font-bold hover:bg-red-100 transition-colors"
                    >
                      Load 13 Default Sylhet Areas
                    </button>
                  )}
                </div>
              ) : (
                filteredAreas.map((area, idx) => (
                  <div
                    key={area.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition-all hover:border-red-200 hover:shadow-sm"
                    style={{ background: '#FAFBFD', borderColor: 'rgba(0,0,0,0.06)' }}
                  >
                    {/* Index & Area Name */}
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <span className="w-6 h-6 rounded-md bg-gray-200/80 text-gray-700 font-extrabold text-[11px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={area.name}
                          onChange={e => handleUpdateArea(area.id, { name: e.target.value })}
                          className="w-full font-bold text-gray-900 text-xs bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#F9002B] focus:bg-white px-1.5 py-1 rounded transition-colors focus:outline-none"
                          title="Click to edit location name"
                        />
                      </div>
                    </div>

                    {/* Delivery Charge Input & Distance */}
                    <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                      {/* Distance input */}
                      <div className="flex items-center gap-1 text-[11px] text-gray-500 bg-white px-2 py-1 rounded-lg border border-gray-200">
                        <Milestone size={11} className="text-gray-400" />
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={area.distKm ?? ''}
                          onChange={e => handleUpdateArea(area.id, { distKm: e.target.value ? parseFloat(e.target.value) : undefined })}
                          placeholder="~km"
                          className="w-10 text-center font-medium text-gray-700 bg-transparent focus:outline-none"
                          title="Approximate distance (km)"
                        />
                        <span className="text-[10px] text-gray-400">km</span>
                      </div>

                      {/* Amount Fee (৳) */}
                      <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-red-200 shadow-xs">
                        <span className="text-xs font-bold text-[#F9002B]">৳</span>
                        <input
                          type="number"
                          min="0"
                          step="5"
                          value={area.fee === 0 ? 0 : (area.fee || '')}
                          onChange={e => {
                            const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                            handleUpdateArea(area.id, { fee: isNaN(val) ? 0 : Math.max(0, val) });
                          }}
                          className="w-14 text-center font-extrabold text-sm text-[#F9002B] bg-transparent focus:outline-none"
                          title="Click to edit delivery fee"
                        />
                      </div>

                      {/* Delete Area Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteArea(area.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete this delivery area"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="mt-5 flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
              <div className="text-xs text-gray-500 font-medium">
                {(form.customAreas || []).length} delivery zones configured
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-xs transition-all hover:shadow-lg active:scale-95"
                style={{
                  background: isSaving ? '#9CA3AF' : 'linear-gradient(135deg, #F9002B, #C8001F)',
                  fontFamily: 'var(--font-heading)',
                  boxShadow: isSaving ? 'none' : '0 4px 14px rgba(249,0,43,0.25)',
                  cursor: isSaving ? 'not-allowed' : 'pointer'
                }}
              >
                {isSaving ? (
                  <>
                    <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Save Delivery Settings</span>
                  </>
                )}
              </button>
            </div>

            {/* Bottom Info note */}
            <div className="mt-3 p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-2">
              <ShieldCheck size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-900 leading-relaxed">
                Click <strong>"Save Delivery Settings"</strong> after editing or adding locations. All changes immediately sync and store to the database.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
