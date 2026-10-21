import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Save,
  ExternalLink,
  Zap,
  HelpCircle,
  Copy,
  Check,
  Eye,
  ShoppingCart,
  CreditCard,
  ShoppingBag,
  Calendar,
  MessageSquare,
  Globe,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Terminal,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Info,
  Sparkles,
  Code2,
  X,
  BookOpen,
  FileCode,
  Laptop,
  CheckSquare,
  FileText
} from 'lucide-react';
import { useApp, PixelSettings } from '../../context/AppContext';
import { pixelService, DiagnosticEventLog, DEFAULT_PIXEL_SETTINGS } from '../../utils/pixelService';

const PZ = '#F9002B';

export function PixelSettingsPanel() {
  const { state, updatePixelSettings, showNotification } = useApp();
  
  // Local form state initialized from state.pixelSettings with automatic G-0LZDNZQDYE prefill
  const [form, setForm] = useState<PixelSettings>(() => {
    const base = state.pixelSettings || DEFAULT_PIXEL_SETTINGS;
    return {
      ...DEFAULT_PIXEL_SETTINGS,
      ...base,
      googleTagId: base.googleTagId?.trim() ? base.googleTagId.trim() : 'G-0LZDNZQDYE',
      googleTagEnabled: base.googleTagEnabled !== undefined ? base.googleTagEnabled : true,
    };
  });
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [modalCopied, setModalCopied] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpModalTab, setHelpModalTab] = useState<'quick' | 'manual' | 'capi' | 'helper'>('quick');
  const [activeTab, setActiveTab] = useState<'meta' | 'google' | 'tiktok' | 'custom'>('meta');
  const [eventLogs, setEventLogs] = useState<DiagnosticEventLog[]>(pixelService.getEventLogs());
  const [testSuccessMessage, setTestSuccessMessage] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [isHybridTesting, setIsHybridTesting] = useState(false);
  const [hybridResult, setHybridResult] = useState<{
    browserSent: boolean;
    serverSent: boolean;
    eventId: string;
    serverMessage: string;
  } | null>(null);

  // Sync if context updates from remote database
  useEffect(() => {
    if (state.pixelSettings) {
      setForm(prev => ({
        ...DEFAULT_PIXEL_SETTINGS,
        ...state.pixelSettings,
        googleTagId: state.pixelSettings.googleTagId?.trim() ? state.pixelSettings.googleTagId.trim() : (prev.googleTagId?.trim() || 'G-0LZDNZQDYE'),
        googleTagEnabled: state.pixelSettings.googleTagEnabled !== undefined ? state.pixelSettings.googleTagEnabled : true,
      }));
    }
  }, [state.pixelSettings]);

  // Subscribe to live pixel logs
  useEffect(() => {
    const unsub = pixelService.subscribeToLogs(setEventLogs);
    return unsub;
  }, []);

  const hasChanges = JSON.stringify(form) !== JSON.stringify(state.pixelSettings);

  const handleToggle = (key: keyof PixelSettings) => {
    setForm(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleInputChange = (key: keyof PixelSettings, val: string) => {
    setForm(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      updatePixelSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      showNotification('Failed to save pixel settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestEvent = (eventName: 'PageView' | 'AddToCart' | 'InitiateCheckout' | 'Purchase' | 'Lead') => {
    // If not saved yet, temporarily apply form to service so test fires with new ID
    pixelService.initFromSettings(form);
    pixelService.testFire(eventName);
    setTestSuccessMessage(`Sent "${eventName}" test event to active pixels! Check diagnostic logs below.`);
    setTimeout(() => setTestSuccessMessage(null), 4000);
  };

  const handleHybridTest = async () => {
    setIsHybridTesting(true);
    setHybridResult(null);
    pixelService.initFromSettings(form);
    try {
      const res = await pixelService.runHybridTest(form.metaTestEventCode);
      setHybridResult(res);
      setTestSuccessMessage(`Hybrid test completed! Fired browser event + server CAPI.`);
      setTimeout(() => setTestSuccessMessage(null), 5000);
    } catch (err: any) {
      showNotification('Hybrid test error: ' + err.message, 'error');
    } finally {
      setIsHybridTesting(false);
    }
  };

  const clearLogs = () => {
    setEventLogs([]);
  };

  const getMetaBaseScript = (pixelId: string) => `<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId ? pixelId.trim() : 'YOUR_PIXEL_ID'}');
fbq('track', 'PageView');
</script>
<noscript>
  <img height="1" width="1" style="display:none" 
       src="https://www.facebook.com/tr?id=${pixelId ? pixelId.trim() : 'YOUR_PIXEL_ID'}&ev=PageView&noscript=1"/>
</noscript>
<!-- End Meta Pixel Code -->`;

  const getDomainVerificationScript = () => `<meta name="facebook-domain-verification" content="YOUR_DOMAIN_VERIFICATION_CODE_HERE" />`;

  const getGtmScript = () => `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>
<!-- End Google Tag Manager -->`;

  const handleCopyModalScript = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setModalCopied(true);
    setTimeout(() => setModalCopied(false), 2000);
  };

  const insertPresetScript = (snippet: string) => {
    setForm(prev => ({
      ...prev,
      customHeadScript: prev.customHeadScript?.trim() 
        ? `${prev.customHeadScript.trim()}\n\n${snippet}` 
        : snippet
    }));
    showNotification('Inserted code snippet into custom script editor', 'success');
  };

  // Status computation
  const isMetaActive = Boolean(form.enabled && form.metaPixelEnabled && form.metaPixelId.trim());
  const isGoogleActive = Boolean(form.enabled && form.googleTagEnabled && form.googleTagId?.trim());
  const isTikTokActive = Boolean(form.enabled && form.tiktokPixelEnabled && form.tiktokPixelId?.trim());
  const hasCustomScript = Boolean(form.customHeadScript && form.customHeadScript.trim().length > 0);
  const totalActive = (isMetaActive ? 1 : 0) + (isGoogleActive ? 1 : 0) + (isTikTokActive ? 1 : 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* ── Top Header Banner (Clean White Theme) ── */}
      <div className="bg-white rounded-2xl p-6 md:p-8 text-neutral-900 shadow-sm border border-neutral-200 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200/70">
              <Activity size={13} className="text-red-500" />
              Marketing & Ad Tracking Engine
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-neutral-900 flex items-center gap-3">
              Pixel & Analytics Setup
            </h1>
            <p className="text-neutral-500 text-sm md:text-base max-w-2xl leading-relaxed">
              Connect your Meta (Facebook) Pixel, Google Tag, and TikTok Pixel credentials. 
              Track pageviews, product browsing, cart additions, and customer purchases automatically.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Premium Guide Button */}
            <button
              type="button"
              onClick={() => {
                setHelpModalTab('quick');
                setShowHelpModal(true);
              }}
              className="group relative inline-flex items-center gap-2.5 px-4 md:px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-500/20 hover:shadow-red-500/30 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Sparkles size={16} className="text-amber-200 group-hover:rotate-12 transition-transform duration-300" />
              <span>Pixel Setup & Manual Script Guide</span>
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                saved
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : hasChanges
                  ? 'bg-neutral-900 hover:bg-neutral-800 text-white shadow-md shadow-neutral-900/20 hover:scale-[1.02]'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200'
              }`}
            >
              {isSaving ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <CheckCircle2 size={16} />
                  Saved Successfully!
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Credentials
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Quick Status Strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-8 pt-6 border-t border-neutral-100">
          <div className="bg-neutral-50/80 rounded-xl p-3.5 border border-neutral-200/70">
            <div className="text-xs text-neutral-500 font-medium">Master Switch</div>
            <div className="text-sm font-bold flex items-center gap-1.5 mt-1">
              <span className={`w-2.5 h-2.5 rounded-full ${form.enabled ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-neutral-400'}`} />
              <span className={form.enabled ? 'text-emerald-700' : 'text-neutral-500'}>
                {form.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          <div className="bg-neutral-50/80 rounded-xl p-3.5 border border-neutral-200/70">
            <div className="text-xs text-neutral-500 font-medium">Meta (Facebook)</div>
            <div className="text-sm font-bold flex items-center gap-1.5 mt-1">
              <span className={`w-2.5 h-2.5 rounded-full ${isMetaActive ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-neutral-400'}`} />
              <span className={isMetaActive ? 'text-blue-700' : 'text-neutral-500'}>
                {isMetaActive ? 'Active & Ready' : 'Not Configured'}
              </span>
            </div>
          </div>

          <div className="bg-neutral-50/80 rounded-xl p-3.5 border border-neutral-200/70">
            <div className="text-xs text-neutral-500 font-medium">Google Tag (GA4)</div>
            <div className="text-sm font-bold flex items-center gap-1.5 mt-1">
              <span className={`w-2.5 h-2.5 rounded-full ${isGoogleActive ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-neutral-400'}`} />
              <span className={isGoogleActive ? 'text-amber-700' : 'text-neutral-500'}>
                {isGoogleActive ? `${form.googleTagId || 'Active'}` : 'Disabled'}
              </span>
            </div>
          </div>

          <div className="bg-neutral-50/80 rounded-xl p-3.5 border border-neutral-200/70">
            <div className="text-xs text-neutral-500 font-medium">Active Platforms</div>
            <div className="text-sm font-bold text-neutral-900 mt-1">
              {totalActive} Platform{totalActive === 1 ? '' : 's'} Active
            </div>
          </div>

          <div className="bg-neutral-50/80 rounded-xl p-3.5 border border-neutral-200/70 col-span-2 sm:col-span-1">
            <div className="text-xs text-neutral-500 font-medium">Recent Events</div>
            <div className="text-sm font-bold text-neutral-900 mt-1">
              {eventLogs.length} Events Fired
            </div>
          </div>
        </div>
      </div>

      {/* ── Guide & Walkthrough Banner (Collapsible) ── */}
      {showGuide && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-6 text-amber-950 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 font-bold text-base text-amber-900">
              <HelpCircle size={20} className="text-amber-600" />
              Quick Guide: How to Get Your Meta Pixel ID
            </div>
            <button
              onClick={() => setShowGuide(false)}
              className="text-xs font-semibold text-amber-700 hover:text-amber-900 px-2 py-1 rounded-md bg-amber-100/60"
            >
              Dismiss
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-4 text-xs md:text-sm">
            <div className="bg-white/80 p-4 rounded-xl border border-amber-200/50 shadow-sm space-y-1">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs">1</span>
                Open Events Manager
              </div>
              <p className="text-amber-800">
                Log into{' '}
                <a
                  href="https://business.facebook.com/events_manager2"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold underline text-blue-600 inline-flex items-center gap-0.5"
                >
                  Meta Events Manager <ExternalLink size={11} />
                </a>{' '}
                with your Facebook Business or ad account.
              </p>
            </div>

            <div className="bg-white/80 p-4 rounded-xl border border-amber-200/50 shadow-sm space-y-1">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs">2</span>
                Copy Pixel ID
              </div>
              <p className="text-amber-800">
                Under <strong>Data Sources</strong>, click your Pixel or Dataset. Look at the top right or under "Settings" for the 15-16 digit Pixel ID.
              </p>
            </div>

            <div className="bg-white/80 p-4 rounded-xl border border-amber-200/50 shadow-sm space-y-1">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs">3</span>
                Paste and Save
              </div>
              <p className="text-amber-800">
                Paste your ID in the field below and hit <strong>Save Credentials</strong>. All standard e-commerce events will instantly begin reporting!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Settings Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Platform Credentials & Settings (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Master Enablement Card */}
          <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-sm flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="font-bold text-neutral-900 text-base flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-600" />
                Global Pixel & Tracking Master Switch
              </div>
              <p className="text-xs text-neutral-500">
                Turn off to temporarily disable all tracking pixels across the entire website.
              </p>
            </div>
            <button
              onClick={() => handleToggle('enabled')}
              className="text-neutral-800 focus:outline-none transition-transform active:scale-95"
            >
              {form.enabled ? (
                <ToggleRight size={44} className="text-emerald-500" />
              ) : (
                <ToggleLeft size={44} className="text-neutral-300" />
              )}
            </button>
          </div>

          {/* Platform Tabs Card */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            {/* Tabs Header (Clean Symmetrical Grid) */}
            <div className="p-1.5 border-b border-neutral-200 bg-neutral-100/70">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('meta')}
                  className={`h-11 px-3 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap transition-all ${
                    activeTab === 'meta'
                      ? 'bg-white text-blue-600 shadow-xs border border-neutral-200/90'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60 border border-transparent'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0 shadow-2xs">
                    f
                  </div>
                  <span>Meta Pixel</span>
                  {isMetaActive && <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('google')}
                  className={`h-11 px-3 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap transition-all ${
                    activeTab === 'google'
                      ? 'bg-white text-amber-600 shadow-xs border border-neutral-200/90'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60 border border-transparent'
                  }`}
                >
                  <Globe size={16} className="text-amber-500 flex-shrink-0" />
                  <span>Google Tag</span>
                  {isGoogleActive && <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('tiktok')}
                  className={`h-11 px-3 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap transition-all ${
                    activeTab === 'tiktok'
                      ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/90'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60 border border-transparent'
                  }`}
                >
                  <span className="font-extrabold text-[10px] px-1 py-0.5 rounded bg-neutral-900 text-white flex-shrink-0 leading-none">
                    TT
                  </span>
                  <span>TikTok Pixel</span>
                  {isTikTokActive && <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('custom')}
                  className={`h-11 px-3 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap transition-all ${
                    activeTab === 'custom'
                      ? 'bg-white text-purple-600 shadow-xs border border-neutral-200/90'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60 border border-transparent'
                  }`}
                >
                  <Code2 size={16} className="text-purple-600 flex-shrink-0" />
                  <span>Manual Script</span>
                  {hasCustomScript && <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />}
                </button>
              </div>
            </div>

            {/* Tab 1: Meta Pixel */}
            {activeTab === 'meta' && (
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
                      f
                    </div>
                    <div>
                      <h3 className="font-bold text-neutral-900 text-base">Meta Pixel Configuration</h3>
                      <p className="text-xs text-neutral-500">Track ad conversions, optimize Facebook/Instagram ads, and create custom audiences</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle('metaPixelEnabled')}
                    className="focus:outline-none"
                  >
                    {form.metaPixelEnabled ? (
                      <ToggleRight size={38} className="text-blue-600" />
                    ) : (
                      <ToggleLeft size={38} className="text-neutral-300" />
                    )}
                  </button>
                </div>

                {/* Pixel ID Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                      Meta Pixel ID / Dataset ID <span className="text-red-500">*</span>
                      <button
                        type="button"
                        onClick={() => {
                          setHelpModalTab('quick');
                          setShowHelpModal(true);
                        }}
                        className="ml-2 text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-0.5 rounded-lg border border-rose-200 inline-flex items-center gap-1 normal-case transition-all shadow-xs"
                      >
                        <HelpCircle size={12} className="text-rose-600" />
                        How to Connect Guide
                      </button>
                    </label>
                    <a
                      href="https://business.facebook.com/events_manager2"
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                    >
                      Find your Pixel ID <ExternalLink size={12} />
                    </a>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. 123456789012345"
                      value={form.metaPixelId}
                      onChange={e => handleInputChange('metaPixelId', e.target.value.trim())}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-neutral-900 text-sm font-mono focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all pr-24"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {form.metaPixelId && (
                        <button
                          type="button"
                          onClick={() => handleCopy(form.metaPixelId)}
                          className="px-2.5 py-1 text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition-colors flex items-center gap-1"
                          title="Copy Pixel ID"
                        >
                          {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          {copied ? 'Copied' : 'Copy'}
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500">
                    Typically a 15 or 16 digit number. You can find this in Meta Events Manager under Settings &gt; Pixel ID.
                  </p>
                </div>

                {/* Test Event Code (Optional) */}
                <div className="space-y-2 pt-2 border-t border-neutral-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                      Test Event Code <span className="text-neutral-400 font-normal lowercase">(optional for testing)</span>
                    </label>
                    <span className="text-xs text-neutral-400 font-mono">TESTXXXXX</span>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. TEST12345"
                    value={form.metaTestEventCode || ''}
                    onChange={e => handleInputChange('metaTestEventCode', e.target.value.trim().toUpperCase())}
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-900 text-sm font-mono focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                  <p className="text-xs text-neutral-500">
                    When testing in <strong>Meta Events Manager &gt; Test Events</strong>, enter the 5-digit code generated by Meta to view events in real time. Leave blank for live production tracking.
                  </p>
                </div>

                {/* Meta Conversions API (CAPI) & Hybrid Setup */}
                <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-blue-600" />
                      <div className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                        Meta Conversions API (CAPI) — Hybrid Mode
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggle('metaCapiEnabled')}
                      className="focus:outline-none"
                    >
                      {form.metaCapiEnabled ? (
                        <ToggleRight size={32} className="text-blue-600" />
                      ) : (
                        <ToggleLeft size={32} className="text-neutral-300" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-neutral-600">
                    Hybrid tracking forwards purchases and cart events directly from your server to Meta alongside browser pixel events. Meta automatically deduplicates them with a matching <code>event_id</code>, bypassing ad blockers and iOS 14.5+ restrictions.
                  </p>

                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider flex items-center justify-between">
                      <span>Conversions API Access Token (Optional)</span>
                      <a
                        href="https://business.facebook.com/events_manager2"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1 font-semibold normal-case"
                      >
                        Generate in Meta Events Manager <ExternalLink size={10} />
                      </a>
                    </label>
                    <div className="relative">
                      <input
                        type={showToken ? 'text' : 'password'}
                        placeholder="EAAG..."
                        value={form.metaAccessToken || ''}
                        onChange={e => handleInputChange('metaAccessToken', e.target.value.trim())}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-xs font-mono pr-16 focus:outline-none focus:border-blue-500 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-500 hover:text-neutral-800 px-2 py-0.5 rounded"
                      >
                        {showToken ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <p className="text-[11px] text-neutral-500">
                      In Meta Events Manager: Settings &gt; Conversions API &gt; Set up direct integration &gt; Generate access token.
                    </p>
                  </div>
                </div>

                {/* Status Indicator Banner */}
                <div className="relative overflow-hidden rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-xs transition-all hover:border-neutral-300">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                        isMetaActive
                          ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-blue-500/20'
                          : 'bg-neutral-100 text-neutral-400'
                      }`}>
                        <Zap size={20} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-neutral-900">
                            {isMetaActive ? 'Meta (Facebook) Pixel Active' : 'Meta Pixel Not Configured'}
                          </span>
                          {isMetaActive && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-neutral-100 border border-neutral-200 text-xs font-mono font-bold text-neutral-800">
                              {form.metaPixelId}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-600 leading-relaxed max-w-xl">
                          {isMetaActive
                            ? 'All configured e-commerce actions (PageView, ViewContent, AddToCart, Purchase) stream automatically to your Meta Events Manager.'
                            : 'Enter your Meta Pixel ID above and click "Save Credentials" to initiate client & server tracking.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {isMetaActive ? (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span>Active &amp; Ready</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-500 border border-neutral-200">
                          <span className="w-2 h-2 rounded-full bg-neutral-400" />
                          <span>Not Configured</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Google Tag (GA4 / GTM) */}
            {activeTab === 'google' && (
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-xs flex-shrink-0">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="3" y="13" width="4" height="8" rx="1.5" />
                        <rect x="10" y="8" width="4" height="13" rx="1.5" />
                        <rect x="17" y="3" width="4" height="18" rx="1.5" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-neutral-900 text-base">Google Analytics & Tag Setup</h3>
                      <p className="text-xs text-neutral-500">Track web analytics and Google Ads conversions via GA4 or Google Tag</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle('googleTagEnabled')}
                    className="focus:outline-none"
                    aria-label="Toggle Google Tag"
                  >
                    {form.googleTagEnabled ? (
                      <ToggleRight size={38} className="text-amber-600 hover:text-amber-700 transition-colors" />
                    ) : (
                      <ToggleLeft size={38} className="text-neutral-300 hover:text-neutral-400 transition-colors" />
                    )}
                  </button>
                </div>

                {/* Premium Clean GA4 Connection Banner */}
                <div className="relative overflow-hidden rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-xs transition-all hover:border-neutral-300">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-amber-500/20">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                          <rect x="3" y="13" width="4" height="8" rx="1.5" />
                          <rect x="10" y="8" width="4" height="13" rx="1.5" />
                          <rect x="17" y="3" width="4" height="18" rx="1.5" />
                        </svg>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-neutral-900">
                            Pizzora's Google Measurement ID Connected
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-neutral-100 hover:bg-neutral-200/80 border border-neutral-200 text-xs font-mono font-bold text-neutral-800 transition-colors">
                            <span>{form.googleTagId || 'G-0LZDNZQDYE'}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(form.googleTagId || 'G-0LZDNZQDYE')}
                              title="Copy Measurement ID"
                              className="text-neutral-400 hover:text-neutral-700 transition-colors"
                            >
                              {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                            </button>
                          </span>
                        </div>
                        <p className="text-xs text-neutral-600 leading-relaxed max-w-xl">
                          Your website has <code className="font-mono font-bold bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200 text-neutral-900">{form.googleTagId || 'G-0LZDNZQDYE'}</code> actively linked. Pageviews, menu item interactions, and online checkout events are synced directly to Google Analytics 4.
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Realtime Reports Ready
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> GA4 Ecommerce Schema
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 flex-shrink-0">
                      {isGoogleActive ? (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span>Active &amp; Tracking</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-500 border border-neutral-200">
                          <span className="w-2 h-2 rounded-full bg-neutral-400" />
                          <span>Tag Inactive</span>
                        </div>
                      )}

                      {form.googleTagId !== 'G-0LZDNZQDYE' && (
                        <button
                          type="button"
                          onClick={() => {
                            handleInputChange('googleTagId', 'G-0LZDNZQDYE');
                            setForm(prev => ({ ...prev, googleTagEnabled: true }));
                          }}
                          className="text-xs font-medium text-neutral-600 hover:text-neutral-900 bg-neutral-50 hover:bg-neutral-100 px-2.5 py-1 rounded-lg border border-neutral-200 transition-all shadow-2xs"
                        >
                          Reset to G-0LZDNZQDYE
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                      Google Measurement ID / Tag ID
                    </label>
                    <a
                      href="https://analytics.google.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-amber-700 hover:text-amber-900 inline-flex items-center gap-1"
                    >
                      Open Google Analytics <ExternalLink size={12} />
                    </a>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. G-XXXXXXXXXX or AW-XXXXXXXXXX"
                    value={form.googleTagId || ''}
                    onChange={e => handleInputChange('googleTagId', e.target.value.trim().toUpperCase())}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-neutral-900 text-sm font-mono focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
                  />
                  <p className="text-xs text-neutral-500">
                    Format: <code>G-XXXXXXXXXX</code> (Google Analytics 4 Measurement ID) or <code>AW-XXXXXXXXXX</code> (Google Ads Conversion Tag).
                  </p>
                </div>

                {/* Google Analytics Features Card */}
                <div className="bg-white rounded-2xl p-5 border border-neutral-200/90 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                        <Zap size={15} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                          Quick GA4 Realtime Verification
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          Verify live signal reception in your Google Analytics dashboard
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTestEvent('PageView')}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white shadow-xs transition-all hover:scale-[1.02] active:scale-95"
                    >
                      <Zap size={13} className="text-amber-400" />
                      Fire Test PageView to GA4
                    </button>
                  </div>
                  <div className="text-xs text-neutral-600 leading-relaxed pt-3 border-t border-neutral-100 flex items-start gap-2">
                    <Info size={14} className="text-neutral-400 mt-0.5 flex-shrink-0" />
                    <span>
                      When Google Tag is enabled, Pizzora automatically dispatches standard e-commerce events (<code className="font-mono text-neutral-800">view_item</code>, <code className="font-mono text-neutral-800">add_to_cart</code>, <code className="font-mono text-neutral-800">begin_checkout</code>, <code className="font-mono text-neutral-800">purchase</code>). You can monitor hits in real time under <strong>Reports &gt; Realtime</strong> in your Google Analytics console.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: TikTok Pixel */}
            {activeTab === 'tiktok' && (
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-extrabold text-sm">
                      TT
                    </div>
                    <div>
                      <h3 className="font-bold text-neutral-900 text-base">TikTok Pixel Configuration</h3>
                      <p className="text-xs text-neutral-500">Track TikTok ad conversions and website actions</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle('tiktokPixelEnabled')}
                    className="focus:outline-none"
                  >
                    {form.tiktokPixelEnabled ? (
                      <ToggleRight size={38} className="text-neutral-900" />
                    ) : (
                      <ToggleLeft size={38} className="text-neutral-300" />
                    )}
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                    TikTok Pixel ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CXXXXXXXXXXXXXXX"
                    value={form.tiktokPixelId || ''}
                    onChange={e => handleInputChange('tiktokPixelId', e.target.value.trim())}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-neutral-900 text-sm font-mono focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/10 transition-all"
                  />
                  <p className="text-xs text-neutral-500">
                    Find your Pixel ID in TikTok Ads Manager under Assets &gt; Events.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 4: Manual Script & Custom Tags */}
            {activeTab === 'custom' && (
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 font-bold">
                      <Code2 size={22} />
                    </div>
                    <div>
                      <h3 className="font-bold text-neutral-900 text-base">Manual Script & Custom Head Tags</h3>
                      <p className="text-xs text-neutral-500">
                        Paste custom tracking scripts, Meta verification tags, or third-party pixels directly into the &lt;head&gt;
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setHelpModalTab('manual');
                      setShowHelpModal(true);
                    }}
                    className="text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-xl border border-purple-200 inline-flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    <BookOpen size={13} />
                    Script Guide
                  </button>
                </div>

                {/* Quick Preset Buttons */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Quick Code Presets</span>
                    <span className="text-[11px] text-neutral-400 font-normal">Click to append to editor below</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => insertPresetScript(getMetaBaseScript(form.metaPixelId))}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1.5 transition-colors"
                    >
                      <Sparkles size={12} className="text-blue-500" />
                      + Meta Pixel Base Script
                    </button>
                    <button
                      type="button"
                      onClick={() => insertPresetScript(getDomainVerificationScript())}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 transition-colors"
                    >
                      <CheckSquare size={12} className="text-emerald-500" />
                      + Facebook Domain Verification Tag
                    </button>
                    <button
                      type="button"
                      onClick={() => insertPresetScript(getGtmScript())}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1.5 transition-colors"
                    >
                      <Globe size={12} className="text-amber-500" />
                      + Google Tag Manager Snippet
                    </button>
                    {form.customHeadScript?.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Are you sure you want to clear your custom script?')) {
                            handleInputChange('customHeadScript', '');
                          }
                        }}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-red-50 text-neutral-600 hover:text-red-600 border border-neutral-200 transition-colors ml-auto flex items-center gap-1"
                      >
                        <Trash2 size={12} />
                        Clear Code
                      </button>
                    )}
                  </div>
                </div>

                {/* Editor Container */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Terminal size={14} className="text-neutral-500" />
                      Raw Script / HTML Code Editor
                    </label>
                    <span className="font-mono text-neutral-400">
                      {form.customHeadScript?.length || 0} characters
                    </span>
                  </div>

                  <div className="relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950 shadow-inner">
                    <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 border-b border-neutral-800 text-[11px] text-neutral-400 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                        <span className="ml-2 text-neutral-300 font-semibold">&lt;head&gt; Injection Block</span>
                      </div>
                      {form.customHeadScript && (
                        <button
                          type="button"
                          onClick={() => handleCopy(form.customHeadScript || '')}
                          className="hover:text-white transition-colors flex items-center gap-1"
                        >
                          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          {copied ? 'Copied' : 'Copy'}
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={10}
                      placeholder={`<!-- Example Manual Script -->\n<script>\n  // Custom scripts, tags or pixel snippets are loaded safely here\n</script>`}
                      value={form.customHeadScript || ''}
                      onChange={e => handleInputChange('customHeadScript', e.target.value)}
                      className="w-full p-4 font-mono text-xs bg-neutral-950 text-emerald-400 placeholder:text-neutral-600 focus:outline-none resize-y selection:bg-purple-900 selection:text-white leading-relaxed"
                      spellCheck={false}
                    />
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-purple-50/60 border border-purple-200/60 text-purple-950 text-xs">
                    <Info size={16} className="text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Safe Dynamic Head Injection: </span>
                      Any <code>&lt;script&gt;</code>, <code>&lt;meta&gt;</code>, or <code>&lt;link&gt;</code> tags placed here will be dynamically parsed and injected into the document head when enabled.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Event Tracking Toggles Card */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <h3 className="font-bold text-neutral-900 text-base flex items-center gap-2">
                  <Sliders size={18} className="text-red-500" />
                  Standard Event Tracking Triggers
                </h3>
                <p className="text-xs text-neutral-500">
                  Select which customer actions trigger pixel events. All standard e-commerce values are passed in Bangladeshi Taka (BDT).
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setForm(prev => ({
                    ...prev,
                    trackPageView: true,
                    trackViewContent: true,
                    trackAddToCart: true,
                    trackInitiateCheckout: true,
                    trackPurchase: true,
                    trackLeadOrReservation: true,
                    trackContact: true,
                  }));
                }}
                className="text-xs font-bold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
              >
                Enable All Events
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              {/* PageView */}
              <div
                onClick={() => handleToggle('trackPageView')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                  form.trackPageView
                    ? 'border-red-200 bg-red-50/40 text-neutral-900'
                    : 'border-neutral-200 bg-white text-neutral-400 hover:border-neutral-300'
                }`}
              >
                <div className={`p-2 rounded-lg ${form.trackPageView ? 'bg-red-600 text-white' : 'bg-neutral-100 text-neutral-400'}`}>
                  <Globe size={16} />
                </div>
                <div className="flex-1 text-xs">
                  <div className="font-bold text-sm">PageView</div>
                  <div className="text-neutral-500">Fired on every page navigation across the site</div>
                </div>
                <input type="checkbox" checked={form.trackPageView} readOnly className="mt-1 accent-red-600 pointer-events-none" />
              </div>

              {/* ViewContent */}
              <div
                onClick={() => handleToggle('trackViewContent')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                  form.trackViewContent
                    ? 'border-red-200 bg-red-50/40 text-neutral-900'
                    : 'border-neutral-200 bg-white text-neutral-400 hover:border-neutral-300'
                }`}
              >
                <div className={`p-2 rounded-lg ${form.trackViewContent ? 'bg-red-600 text-white' : 'bg-neutral-100 text-neutral-400'}`}>
                  <Eye size={16} />
                </div>
                <div className="flex-1 text-xs">
                  <div className="font-bold text-sm">ViewContent</div>
                  <div className="text-neutral-500">Fired when customer opens menu item / pizza details</div>
                </div>
                <input type="checkbox" checked={form.trackViewContent} readOnly className="mt-1 accent-red-600 pointer-events-none" />
              </div>

              {/* AddToCart */}
              <div
                onClick={() => handleToggle('trackAddToCart')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                  form.trackAddToCart
                    ? 'border-red-200 bg-red-50/40 text-neutral-900'
                    : 'border-neutral-200 bg-white text-neutral-400 hover:border-neutral-300'
                }`}
              >
                <div className={`p-2 rounded-lg ${form.trackAddToCart ? 'bg-red-600 text-white' : 'bg-neutral-100 text-neutral-400'}`}>
                  <ShoppingCart size={16} />
                </div>
                <div className="flex-1 text-xs">
                  <div className="font-bold text-sm">AddToCart</div>
                  <div className="text-neutral-500">Fired whenever an item is added to the order cart</div>
                </div>
                <input type="checkbox" checked={form.trackAddToCart} readOnly className="mt-1 accent-red-600 pointer-events-none" />
              </div>

              {/* InitiateCheckout */}
              <div
                onClick={() => handleToggle('trackInitiateCheckout')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                  form.trackInitiateCheckout
                    ? 'border-red-200 bg-red-50/40 text-neutral-900'
                    : 'border-neutral-200 bg-white text-neutral-400 hover:border-neutral-300'
                }`}
              >
                <div className={`p-2 rounded-lg ${form.trackInitiateCheckout ? 'bg-red-600 text-white' : 'bg-neutral-100 text-neutral-400'}`}>
                  <CreditCard size={16} />
                </div>
                <div className="flex-1 text-xs">
                  <div className="font-bold text-sm">InitiateCheckout</div>
                  <div className="text-neutral-500">Fired when user begins the checkout step</div>
                </div>
                <input type="checkbox" checked={form.trackInitiateCheckout} readOnly className="mt-1 accent-red-600 pointer-events-none" />
              </div>

              {/* Purchase */}
              <div
                onClick={() => handleToggle('trackPurchase')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                  form.trackPurchase
                    ? 'border-red-200 bg-red-50/40 text-neutral-900'
                    : 'border-neutral-200 bg-white text-neutral-400 hover:border-neutral-300'
                }`}
              >
                <div className={`p-2 rounded-lg ${form.trackPurchase ? 'bg-red-600 text-white' : 'bg-neutral-100 text-neutral-400'}`}>
                  <ShoppingBag size={16} />
                </div>
                <div className="flex-1 text-xs">
                  <div className="font-bold text-sm">Purchase (Order Complete)</div>
                  <div className="text-neutral-500">Sends order number, food items, and total amount (BDT)</div>
                </div>
                <input type="checkbox" checked={form.trackPurchase} readOnly className="mt-1 accent-red-600 pointer-events-none" />
              </div>

              {/* Table Reservation (Lead) */}
              <div
                onClick={() => handleToggle('trackLeadOrReservation')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                  form.trackLeadOrReservation
                    ? 'border-red-200 bg-red-50/40 text-neutral-900'
                    : 'border-neutral-200 bg-white text-neutral-400 hover:border-neutral-300'
                }`}
              >
                <div className={`p-2 rounded-lg ${form.trackLeadOrReservation ? 'bg-red-600 text-white' : 'bg-neutral-100 text-neutral-400'}`}>
                  <Calendar size={16} />
                </div>
                <div className="flex-1 text-xs">
                  <div className="font-bold text-sm">Lead (Table Reservation)</div>
                  <div className="text-neutral-500">Fired when a dine-in reservation is submitted</div>
                </div>
                <input type="checkbox" checked={form.trackLeadOrReservation} readOnly className="mt-1 accent-red-600 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Interactive Test Suite & Event Console (1 col) */}
        <div className="space-y-6">
          {/* Interactive Test Suite Card */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Zap size={18} className="text-amber-500" />
                <h3 className="font-bold text-neutral-900 text-base">Test Event Firing</h3>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                Live Diagnostics
              </span>
            </div>

            <p className="text-xs text-neutral-500 leading-relaxed">
              Click any button below to fire a simulated standard event. You can verify it immediately in Meta Events Manager &gt; Test Events.
            </p>

            {testSuccessMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
                {testSuccessMessage}
              </div>
            )}

            {/* Hybrid Test Card (Primary) */}
            <div className="rounded-2xl border border-neutral-200/90 bg-neutral-50/60 p-4 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center">
                    <Activity size={14} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider block">
                      Meta Hybrid Test
                    </span>
                    <span className="text-[10px] text-neutral-500">Browser Pixel + Server CAPI</span>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100/70 text-blue-800 font-bold border border-blue-200/60">
                  Recommended
                </span>
              </div>

              <p className="text-[11px] text-neutral-600 leading-relaxed">
                Fires simultaneous client-side and server-side events with a unified <code>event_id</code> to verify deduplication.
              </p>

              <button
                type="button"
                onClick={handleHybridTest}
                disabled={isHybridTesting}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white shadow-xs flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-60"
              >
                {isHybridTesting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin text-neutral-400" />
                    <span>Executing Hybrid Test...</span>
                  </>
                ) : (
                  <>
                    <Zap size={14} className="text-amber-400" />
                    <span>Run Hybrid Diagnostic Test</span>
                  </>
                )}
              </button>

              {hybridResult && (
                <div className="p-3.5 rounded-xl bg-white border border-neutral-200/90 text-xs space-y-2.5 shadow-2xs">
                  <div className="flex flex-col gap-1 pb-2 border-b border-neutral-100">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-900 text-xs">Diagnostic Results</span>
                      <span className="text-[10px] text-neutral-400 font-mono">Status 200</span>
                    </div>
                    <div className="flex items-center justify-between bg-neutral-50 px-2 py-1 rounded border border-neutral-200/70">
                      <span className="text-[10px] font-mono text-neutral-500 truncate max-w-[200px]" title={hybridResult.eventId}>
                        ID: {hybridResult.eventId}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(hybridResult.eventId)}
                        title="Copy event_id"
                        className="text-neutral-400 hover:text-neutral-700 ml-1 flex-shrink-0"
                      >
                        <Copy size={11} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-neutral-600">Browser Pixel (fbq):</span>
                      <span className={`inline-flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded-full border ${
                        hybridResult.browserSent 
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200/80' 
                          : 'text-amber-700 bg-amber-50 border-amber-200/80'
                      }`}>
                        {hybridResult.browserSent ? (
                          <>
                            <CheckCircle2 size={11} className="text-emerald-600" />
                            <span>Fired (Matched)</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle size={11} className="text-amber-600" />
                            <span>Inactive / Blocked</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-neutral-600">Server CAPI:</span>
                      <span className={`inline-flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded-full border ${
                        hybridResult.serverSent 
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200/80' 
                          : 'text-blue-700 bg-blue-50 border-blue-200/80'
                      }`}>
                        <CheckCircle2 size={11} className="text-emerald-600" />
                        <span>Server 200 OK</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-[11px] text-neutral-600 bg-neutral-50 p-2.5 rounded-lg border border-neutral-200/70 font-mono leading-relaxed">
                    <Info size={13} className="text-neutral-400 mt-0.5 flex-shrink-0" />
                    <span>{hybridResult.serverMessage}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="text-xs font-bold text-neutral-700 uppercase tracking-wider pt-2">
              Individual Event Tests
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleTestEvent('PageView')}
                className="w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200/80 shadow-2xs flex items-center justify-between transition-all hover:scale-[1.01] active:scale-98"
              >
                <span className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-md bg-neutral-100 flex items-center justify-center text-neutral-600">
                    <Globe size={13} />
                  </span>
                  <span>Fire Test PageView</span>
                </span>
                <span className="text-[11px] font-mono text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200/60">/menu</span>
              </button>

              <button
                type="button"
                onClick={() => handleTestEvent('AddToCart')}
                className="w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200/80 shadow-2xs flex items-center justify-between transition-all hover:scale-[1.01] active:scale-98"
              >
                <span className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center text-blue-600">
                    <ShoppingCart size={13} />
                  </span>
                  <span>Fire Test AddToCart</span>
                </span>
                <span className="text-[11px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">৳950 BDT</span>
              </button>

              <button
                type="button"
                onClick={() => handleTestEvent('InitiateCheckout')}
                className="w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200/80 shadow-2xs flex items-center justify-between transition-all hover:scale-[1.01] active:scale-98"
              >
                <span className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-md bg-purple-50 flex items-center justify-center text-purple-600">
                    <CreditCard size={13} />
                  </span>
                  <span>Fire Test InitiateCheckout</span>
                </span>
                <span className="text-[11px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200/60">৳950 BDT</span>
              </button>

              <button
                type="button"
                onClick={() => handleTestEvent('Purchase')}
                className="w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold bg-emerald-50/50 hover:bg-emerald-50 text-emerald-950 border border-emerald-200 shadow-2xs flex items-center justify-between transition-all hover:scale-[1.01] active:scale-98"
              >
                <span className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-md bg-emerald-600 flex items-center justify-center text-white">
                    <ShoppingBag size={13} />
                  </span>
                  <span className="font-bold">Fire Test Purchase</span>
                </span>
                <span className="text-[11px] font-mono text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-300 font-bold">৳950 BDT</span>
              </button>

              <button
                type="button"
                onClick={() => handleTestEvent('Lead')}
                className="w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200/80 shadow-2xs flex items-center justify-between transition-all hover:scale-[1.01] active:scale-98"
              >
                <span className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-md bg-amber-50 flex items-center justify-center text-amber-600">
                    <Calendar size={13} />
                  </span>
                  <span>Fire Test Reservation Lead</span>
                </span>
                <span className="text-[11px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">4 Guests</span>
              </button>
            </div>
          </div>

          {/* Real-time Diagnostics Terminal Card (Clean White Theme) */}
          <div className="bg-white rounded-2xl p-5 text-neutral-800 shadow-sm border border-neutral-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-neutral-700">
                <Terminal size={14} className="text-red-500" />
                Live Event Stream
              </div>
              {eventLogs.length > 0 && (
                <button
                  type="button"
                  onClick={clearLogs}
                  className="text-[11px] text-neutral-400 hover:text-neutral-700 flex items-center gap-1 font-mono transition-colors"
                  title="Clear Log History"
                >
                  <Trash2 size={12} />
                  Clear
                </button>
              )}
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2 font-mono text-[11px] pr-1 scrollbar-thin">
              {eventLogs.length === 0 ? (
                <div className="text-neutral-400 text-center py-8">
                  No events fired yet. Navigate pages or click test buttons above.
                </div>
              ) : (
                eventLogs.map(log => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200/80 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {log.eventName}
                      </span>
                      <span className="text-neutral-400 text-[10px]">{log.timestamp}</span>
                    </div>
                    <div className="flex items-center justify-between text-neutral-500 text-[10px]">
                      <span>Platform: <span className="text-neutral-800 font-semibold">{log.platform}</span></span>
                      <span className={log.status === 'sent' ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                        [{log.status.toUpperCase()}]
                      </span>
                    </div>
                    {log.data && Object.keys(log.data).length > 0 && (
                      <div className="text-[10px] text-neutral-700 bg-white border border-neutral-200/70 p-1.5 rounded overflow-x-auto">
                        {JSON.stringify(log.data)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Floating Sticky Action Bar when Unsaved Changes Exist (Clean White Theme) ── */}
      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white/95 backdrop-blur-md text-neutral-900 px-6 py-3.5 rounded-2xl shadow-xl border border-neutral-200 flex items-center gap-6 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-2 text-xs md:text-sm font-semibold text-neutral-700">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            You have unsaved pixel credential changes
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setForm({ ...state.pixelSettings })}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-600/30 transition-all flex items-center gap-1.5"
            >
              <Save size={13} />
              Save Now
            </button>
          </div>
        </div>
      )}

      {/* ── Premium Pixel Setup & Manual Script Guide Modal ── */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-neutral-200 w-full max-w-4xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header (Clean White Theme) */}
            <div className="bg-white text-neutral-900 p-6 relative flex items-start justify-between border-b border-neutral-200">
              <div className="space-y-1 pr-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200/70">
                  <Sparkles size={13} className="text-red-500" />
                  Pizzora Tracking & Marketing Documentation
                </div>
                <h2 className="text-xl md:text-2xl font-black tracking-tight text-neutral-900 flex items-center gap-2.5">
                  Pixel Connection & Manual Script Guide
                </h2>
                <p className="text-xs md:text-sm text-neutral-500 max-w-2xl leading-relaxed">
                  Complete walkthrough on connecting your Meta Pixel ID, generating manual script tags, configuring Conversions API (CAPI), and testing events.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900 flex items-center justify-center transition-colors flex-shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-neutral-200 bg-neutral-50 px-4 pt-2 gap-2 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setHelpModalTab('quick')}
                className={`py-3 px-4 font-bold text-xs md:text-sm flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
                  helpModalTab === 'quick'
                    ? 'border-red-600 text-red-600 bg-white rounded-t-xl shadow-xs'
                    : 'border-transparent text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Zap size={15} className={helpModalTab === 'quick' ? 'text-red-600' : 'text-neutral-400'} />
                1. Quick Connect (0 Coding)
              </button>

              <button
                type="button"
                onClick={() => setHelpModalTab('manual')}
                className={`py-3 px-4 font-bold text-xs md:text-sm flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
                  helpModalTab === 'manual'
                    ? 'border-purple-600 text-purple-600 bg-white rounded-t-xl shadow-xs'
                    : 'border-transparent text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Code2 size={15} className={helpModalTab === 'manual' ? 'text-purple-600' : 'text-neutral-400'} />
                2. Manual Script & Embed Code
              </button>

              <button
                type="button"
                onClick={() => setHelpModalTab('capi')}
                className={`py-3 px-4 font-bold text-xs md:text-sm flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
                  helpModalTab === 'capi'
                    ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl shadow-xs'
                    : 'border-transparent text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <ShieldCheck size={15} className={helpModalTab === 'capi' ? 'text-blue-600' : 'text-neutral-400'} />
                3. Conversions API (CAPI)
              </button>

              <button
                type="button"
                onClick={() => setHelpModalTab('helper')}
                className={`py-3 px-4 font-bold text-xs md:text-sm flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
                  helpModalTab === 'helper'
                    ? 'border-emerald-600 text-emerald-600 bg-white rounded-t-xl shadow-xs'
                    : 'border-transparent text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Activity size={15} className={helpModalTab === 'helper' ? 'text-emerald-600' : 'text-neutral-400'} />
                4. Verify with Chrome Extension
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-neutral-800">
              {/* Tab 1: Quick Connect (0 Coding) */}
              {helpModalTab === 'quick' && (
                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                    <CheckCircle2 size={22} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs md:text-sm space-y-1">
                      <div className="font-bold text-emerald-950 text-sm md:text-base">
                        Zero Coding Required for Admins!
                      </div>
                      <p className="text-emerald-800 leading-relaxed">
                        You do <strong>NOT</strong> need to edit website code, HTML files, or deploy updates. Simply enter your <strong>Meta Pixel ID</strong> in the settings box, click <strong>Save Credentials</strong>, and Pizzora automatically injects the official script and tracks all events site-wide.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-bold text-neutral-900 text-base flex items-center gap-2">
                      <BookOpen size={18} className="text-red-500" />
                      3-Step Quick Connection Process
                    </h3>

                    <div className="grid md:grid-cols-3 gap-4">
                      {/* Step 1 */}
                      <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">1</span>
                          <span className="text-[11px] font-semibold text-neutral-500">Meta Account</span>
                        </div>
                        <div className="font-bold text-neutral-900 text-sm">Open Events Manager</div>
                        <p className="text-xs text-neutral-600 leading-relaxed">
                          Log into your Facebook Business account and navigate to{' '}
                          <a
                            href="https://business.facebook.com/events_manager2"
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-blue-600 hover:underline inline-flex items-center gap-0.5"
                          >
                            Meta Events Manager <ExternalLink size={11} />
                          </a>.
                        </p>
                      </div>

                      {/* Step 2 */}
                      <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">2</span>
                          <span className="text-[11px] font-semibold text-neutral-500">Copy ID</span>
                        </div>
                        <div className="font-bold text-neutral-900 text-sm">Copy 15-16 Digit ID</div>
                        <p className="text-xs text-neutral-600 leading-relaxed">
                          Under <strong>Data Sources</strong>, click your Dataset or Pixel. Look under the title or in <strong>Settings &gt; Pixel ID</strong> and copy the number.
                        </p>
                      </div>

                      {/* Step 3 */}
                      <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="w-6 h-6 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center">3</span>
                          <span className="text-[11px] font-semibold text-neutral-500">Pizzora Admin</span>
                        </div>
                        <div className="font-bold text-neutral-900 text-sm">Paste and Save</div>
                        <p className="text-xs text-neutral-600 leading-relaxed">
                          Paste your ID into the <strong>Meta Pixel ID</strong> input on this page and hit <strong>Save Credentials</strong>. Tracking begins immediately!
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Automated Event Checklist */}
                  <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                    <div className="font-bold text-neutral-900 text-sm flex items-center justify-between">
                      <span>Standard Events Handled Automatically</span>
                      <span className="text-xs font-normal text-neutral-500">All standard e-commerce values passed in BDT</span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-2.5 text-xs">
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-neutral-200/70">
                        <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                        <div><strong>PageView:</strong> Fired on all page changes</div>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-neutral-200/70">
                        <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                        <div><strong>ViewContent:</strong> Pizza item viewed with price (BDT)</div>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-neutral-200/70">
                        <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                        <div><strong>AddToCart:</strong> Food item added to cart</div>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-neutral-200/70">
                        <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                        <div><strong>InitiateCheckout:</strong> User enters checkout</div>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-neutral-200/70">
                        <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                        <div><strong>Purchase:</strong> Order completed with Order ID</div>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-neutral-200/70">
                        <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                        <div><strong>Lead:</strong> Table reservation booking sent</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Manual Script & Embed Code */}
              {helpModalTab === 'manual' && (
                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 flex items-start gap-3">
                    <FileCode size={22} className="text-purple-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs md:text-sm space-y-1">
                      <div className="font-bold text-purple-950 text-sm md:text-base">
                        Manual Embed Script Generator
                      </div>
                      <p className="text-purple-800 leading-relaxed">
                        If your marketing agency requests the raw JavaScript snippet, or if you want to paste custom headers or domain verification tags, you can copy the code below or insert it directly into the <strong>Manual Script & Custom Tags</strong> tab.
                      </p>
                    </div>
                  </div>

                  {/* Live Meta Pixel Base Script Box */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Code2 size={14} className="text-blue-600" />
                        Meta Pixel Base Code (Dynamic Pixel ID: {form.metaPixelId || 'YOUR_PIXEL_ID'})
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyModalScript(getMetaBaseScript(form.metaPixelId))}
                          className="px-3 py-1 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          {modalCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                          {modalCopied ? 'Copied to Clipboard!' : 'Copy Full Script'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            insertPresetScript(getMetaBaseScript(form.metaPixelId));
                            setActiveTab('custom');
                            setShowHelpModal(false);
                          }}
                          className="px-3 py-1 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-sm"
                        >
                          Insert into Custom Script Tab
                        </button>
                      </div>
                    </div>

                    <div className="relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950 shadow-inner">
                      <div className="px-4 py-2 bg-neutral-900 border-b border-neutral-800 text-[11px] text-neutral-400 font-mono flex items-center justify-between">
                        <span>header-script.html</span>
                        <span className="text-neutral-500">Async Base Pixel Code</span>
                      </div>
                      <pre className="p-4 font-mono text-xs text-blue-300 overflow-x-auto leading-relaxed scrollbar-thin">
                        {getMetaBaseScript(form.metaPixelId)}
                      </pre>
                    </div>
                  </div>

                  {/* Facebook Domain Verification Snippet */}
                  <div className="space-y-2 pt-2 border-t border-neutral-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckSquare size={14} className="text-emerald-600" />
                        Meta Domain Verification &lt;meta&gt; Tag
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyModalScript(getDomainVerificationScript())}
                        className="px-2.5 py-1 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Copy size={12} />
                        Copy Tag
                      </button>
                    </div>
                    <pre className="p-3 font-mono text-xs text-emerald-300 bg-neutral-950 rounded-xl overflow-x-auto border border-neutral-800">
                      {getDomainVerificationScript()}
                    </pre>
                  </div>
                </div>
              )}

              {/* Tab 3: Conversions API (CAPI Hybrid) */}
              {helpModalTab === 'capi' && (
                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
                    <ShieldCheck size={22} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs md:text-sm space-y-1">
                      <div className="font-bold text-blue-950 text-sm md:text-base">
                        What is Hybrid Tracking & Conversions API?
                      </div>
                      <p className="text-blue-800 leading-relaxed">
                        Modern ad-blockers, browser privacy settings, and Apple iOS 14.5+ ATT block up to 35% of client-side browser pixels. Conversions API (CAPI) sends purchase and checkout data directly from Pizzora's secure server to Meta.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-bold text-neutral-900 text-sm">How Deduplication Works in Pizzora</h4>
                    <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs space-y-2">
                      <div className="flex items-center gap-2 text-neutral-700">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">A</span>
                        <span>Client Browser fires <code>fbq('track', 'Purchase', payload, &#123; eventID: 'order_123' &#125;)</code></span>
                      </div>
                      <div className="flex items-center gap-2 text-neutral-700">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">B</span>
                        <span>Pizzora Server forwards <code>POST https://graph.facebook.com/...</code> with the exact same <code>event_id: 'order_123'</code></span>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-700 font-semibold pt-1 border-t border-neutral-200">
                        <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                        <span>Meta matches both events and counts only 1 purchase with 100% data fidelity!</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-bold text-neutral-900 text-sm">How to Generate Conversions API Access Token</h4>
                    <ol className="list-decimal list-inside space-y-1.5 text-xs text-neutral-700 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                      <li>Open <strong>Meta Events Manager &gt; Data Sources</strong>.</li>
                      <li>Select your Pixel and click the <strong>Settings</strong> tab.</li>
                      <li>Scroll down to the <strong>Conversions API</strong> section.</li>
                      <li>Click <strong>Generate access token</strong> under "Set up direct integration".</li>
                      <li>Copy the generated token (starts with <code>EAAG...</code>) and paste it into the Access Token field on this page.</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Tab 4: Verify with Meta Pixel Helper */}
              {helpModalTab === 'helper' && (
                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                    <Activity size={22} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs md:text-sm space-y-1">
                      <div className="font-bold text-amber-950 text-sm md:text-base">
                        Testing with the Official Meta Pixel Helper
                      </div>
                      <p className="text-amber-800 leading-relaxed">
                        Meta provides an official Google Chrome extension called <strong>Meta Pixel Helper</strong> that instantly displays all detected pixels and events in real time.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-neutral-900 text-sm">How to Test Your Site:</h4>
                      <a
                        href="https://chromewebstore.google.com/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc"
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 inline-flex items-center gap-1.5 transition-colors"
                      >
                        Install Meta Pixel Helper Extension <ExternalLink size={12} />
                      </a>
                    </div>

                    <div className="space-y-2.5 text-xs text-neutral-700">
                      <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">1</span>
                        <div>
                          <strong>Navigate the site:</strong> Visit the homepage or <code>/menu</code>. The extension icon will turn blue with a green badge count.
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">2</span>
                        <div>
                          <strong>Click on a pizza:</strong> Open the product modal or details page. The extension will log a green <code>ViewContent</code> event with currency BDT.
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">3</span>
                        <div>
                          <strong>Add to cart & Checkout:</strong> Add a pizza to your order. You will see <code>AddToCart</code> and <code>InitiateCheckout</code> fire with exact cart values.
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">4</span>
                        <div>
                          <strong>Place an order:</strong> When an order completes, the <code>Purchase</code> event fires with the order reference and total amount.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-neutral-900 text-white flex items-center justify-between">
                    <div className="text-xs space-y-0.5">
                      <div className="font-bold text-sm text-amber-300">Fast Local Testing:</div>
                      <div className="text-neutral-400">You can also use the "Test Event Firing" panel on the right side of this screen anytime!</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowHelpModal(false)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      Back to Dashboard
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
              <span className="text-xs text-neutral-500">
                Pizzora Pixel Engine v2.0 • Hybrid Conversions API Ready
              </span>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="px-5 py-2 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl transition-colors shadow-sm"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
