import React, { useState, useEffect } from 'react';
import {
  Printer, Settings, CheckCircle2, AlertTriangle, Loader2,
  ToggleLeft, ToggleRight, RefreshCw, Wifi, WifiOff, Receipt,
  ChevronDown, Save, ExternalLink, PrinterCheck
} from 'lucide-react';
import {
  printerService,
  loadPrinterSettings,
  savePrinterSettings,
  type PrinterSettings,
  type PrinterStatus,
} from '../../utils/printerService';

const PZ = '#F9002B';

export function PrinterSettings() {
  const [settings, setSettings] = useState<PrinterSettings>(loadPrinterSettings());
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus>(printerService.getStatus());
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isOpeningDrawer, setIsOpeningDrawer] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (printerService.getStatus() !== 'online') {
      setTimeout(() => printerService.connect(), 1000);
    }
    const unsub = printerService.onStatusChange(setPrinterStatus);
    return unsub;
  }, []);

  const connectQZ = async () => {
    setTestResult(null);
    const ok = await printerService.connect();
    if (ok) {
      await loadPrinters();
    } else {
      setTestResult({ success: false, message: 'Could not connect to QZ Tray. Is it running? Download at qz.io' });
    }
  };

  const loadPrinters = async () => {
    setIsLoadingPrinters(true);
    const list = await printerService.getAvailablePrinters();
    setAvailablePrinters(list);
    setIsLoadingPrinters(false);
    if (list.length > 0 && !settings.printerName) {
      // Auto-select RONGTA if found
      const rongta = list.find(p => p.toLowerCase().includes('rongta') || p.toLowerCase().includes('rp33'));
      handleChange('printerName', rongta || list[0]);
    }
  };

  const handleChange = <K extends keyof PrinterSettings>(key: K, value: PrinterSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    savePrinterSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleTestPrint = async () => {
    setIsTesting(true);
    setTestResult(null);
    const result = await printerService.testPrint(settings);
    setIsTesting(false);
    setTestResult(result.success
      ? { success: true, message: 'Test print sent successfully! Check your printer.' }
      : { success: false, message: result.error || 'Test print failed.' }
    );
  };

  const handleOpenDrawer = async () => {
    setIsOpeningDrawer(true);
    setTestResult(null);
    const result = await printerService.openCashDrawer(settings);
    setIsOpeningDrawer(false);
    setTestResult(result.success
      ? { success: true, message: 'Cash drawer opened successfully!' }
      : { success: false, message: result.error || 'Failed to open cash drawer.' }
    );
  };

  const statusColor = printerStatus === 'online' ? '#16A34A'
    : printerStatus === 'connecting' ? '#D97706'
    : '#DC2626';
  const statusLabel = printerStatus === 'online' ? 'QZ Tray Connected'
    : printerStatus === 'connecting' ? 'Connecting…'
    : printerStatus === 'not_installed' ? 'QZ Tray Not Installed'
    : 'QZ Tray Offline';

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    border: '1.5px solid rgba(249,0,43,0.12)',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '20px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 700,
    color: '#374151',
    display: 'block',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1.5px solid rgba(249,0,43,0.2)',
    fontSize: '13px',
    outline: 'none',
    color: '#111',
    backgroundColor: '#fff',
  };

  const Toggle = ({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!on)}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
    >
      {on
        ? <ToggleRight size={32} color={PZ} />
        : <ToggleLeft size={32} color="#9CA3AF" />
      }
    </button>
  );

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px 16px', fontFamily: 'var(--font-body)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <div style={{ background: `linear-gradient(135deg, ${PZ}, #c8001f)`, borderRadius: '14px', padding: '12px' }}>
          <Printer size={24} color="#fff" />
        </div>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#111', margin: 0 }}>Printer Settings</h2>
          <p style={{ fontSize: '13px', color: '#6B7280', margin: '2px 0 0 0' }}>RONGTA RP335 · ESC/POS · QZ Tray</p>
        </div>
      </div>

      {/* ─── QZ Tray Status ──────────────────────────────────────────────────── */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: statusColor, display: 'inline-block', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: statusColor, margin: 0 }}>{statusLabel}</p>
              <p style={{ fontSize: '12px', color: '#6B7280', margin: '2px 0 0 0' }}>
                {printerStatus === 'online' ? `${availablePrinters.length} printer(s) found` : 'WebSocket: ws://localhost:8182'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {printerStatus !== 'online' && (
              <button onClick={connectQZ} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: `1.5px solid ${PZ}`, background: 'transparent', color: PZ, fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                <Wifi size={14} /> Connect QZ Tray
              </button>
            )}
            {printerStatus === 'online' && (
              <button onClick={loadPrinters} disabled={isLoadingPrinters} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: '1.5px solid #D1D5DB', background: 'transparent', color: '#374151', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: isLoadingPrinters ? 0.6 : 1 }}>
                {isLoadingPrinters ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Refresh Printers
              </button>
            )}
            <a href="https://qz.io/download/" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: '1.5px solid #D1D5DB', background: 'transparent', color: '#6B7280', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
              <ExternalLink size={13} /> Download QZ Tray
            </a>
          </div>
        </div>
      </div>

      {/* ─── Printer Selection ───────────────────────────────────────────────── */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111', marginTop: 0, marginBottom: '18px', borderBottom: '1px solid #F3F4F6', paddingBottom: '10px' }}>Printer Configuration</h3>

        <div style={{ marginBottom: '18px' }}>
          <label style={labelStyle}>Receipt Printer (Customer)</label>
          {printerStatus === 'online' && availablePrinters.length > 0 ? (
            <div style={{ position: 'relative' }}>
              <select
                value={settings.printerName}
                onChange={e => handleChange('printerName', e.target.value)}
                style={{ ...inputStyle, appearance: 'none', paddingRight: '36px', cursor: 'pointer' }}
              >
                <option value="">— Select Printer —</option>
                {availablePrinters.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280', pointerEvents: 'none' }} />
            </div>
          ) : (
            <input
              type="text"
              value={settings.printerName}
              onChange={e => handleChange('printerName', e.target.value)}
              placeholder="e.g. RONGTA RP335 — connect QZ Tray to auto-detect"
              style={inputStyle}
            />
          )}
          <p style={{ fontSize: '11px', color: '#6B7280', margin: '5px 0 0 0' }}>
            Connect QZ Tray above to see all installed printers automatically
          </p>
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label style={labelStyle}>Paper Width</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            {(['58mm', '80mm'] as const).map(w => (
              <button
                key={w}
                onClick={() => handleChange('paperWidth', w)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px', border: `2px solid ${settings.paperWidth === w ? PZ : '#E5E7EB'}`,
                  background: settings.paperWidth === w ? `${PZ}12` : '#fff',
                  color: settings.paperWidth === w ? PZ : '#374151',
                  fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                }}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '4px' }}>
          <label style={labelStyle}>Number of Copies</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[1, 2, 3].map(n => (
              <button
                key={n}
                onClick={() => handleChange('copies', n)}
                style={{
                  width: '52px', height: '42px', borderRadius: '10px',
                  border: `2px solid ${settings.copies === n ? PZ : '#E5E7EB'}`,
                  background: settings.copies === n ? `${PZ}12` : '#fff',
                  color: settings.copies === n ? PZ : '#374151',
                  fontWeight: 700, fontSize: '15px', cursor: 'pointer',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Automation ──────────────────────────────────────────────────────── */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111', marginTop: 0, marginBottom: '18px', borderBottom: '1px solid #F3F4F6', paddingBottom: '10px' }}>Automation</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { key: 'autoPrint' as const, label: 'Auto Print Receipt', desc: 'Automatically print receipt after every successful payment' },
            { key: 'autoOpenDrawer' as const, label: 'Auto Open Cash Drawer', desc: 'Automatically open drawer after Cash payments only' },
          ].map(({ key, label, desc }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#111', margin: 0 }}>{label}</p>
                <p style={{ fontSize: '12px', color: '#6B7280', margin: '2px 0 0 0' }}>{desc}</p>
              </div>
              <Toggle on={settings[key] as boolean} onChange={v => handleChange(key, v)} />
            </div>
          ))}
        </div>
      </div>

      {/* ─── Test Actions ────────────────────────────────────────────────────── */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111', marginTop: 0, marginBottom: '18px', borderBottom: '1px solid #F3F4F6', paddingBottom: '10px' }}>Test Hardware</h3>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={handleTestPrint}
            disabled={isTesting || !settings.printerName}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', background: PZ, color: '#fff', fontSize: '14px', fontWeight: 700, border: 'none', cursor: settings.printerName ? 'pointer' : 'not-allowed', opacity: isTesting || !settings.printerName ? 0.6 : 1 }}
          >
            {isTesting ? <Loader2 size={16} className="animate-spin" /> : <PrinterCheck size={16} />}
            {isTesting ? 'Printing Test…' : 'Test Print'}
          </button>

          <button
            onClick={handleOpenDrawer}
            disabled={isOpeningDrawer || !settings.printerName}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', background: '#16A34A', color: '#fff', fontSize: '14px', fontWeight: 700, border: 'none', cursor: settings.printerName ? 'pointer' : 'not-allowed', opacity: isOpeningDrawer || !settings.printerName ? 0.6 : 1 }}
          >
            {isOpeningDrawer ? <Loader2 size={16} className="animate-spin" /> : <Receipt size={16} />}
            {isOpeningDrawer ? 'Opening…' : 'Open Cash Drawer'}
          </button>
        </div>

        {testResult && (
          <div style={{ marginTop: '14px', padding: '12px 14px', borderRadius: '10px', backgroundColor: testResult.success ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${testResult.success ? '#BBF7D0' : '#FECACA'}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
            {testResult.success
              ? <CheckCircle2 size={18} color="#16A34A" />
              : <AlertTriangle size={18} color="#DC2626" />
            }
            <p style={{ fontSize: '13px', fontWeight: 600, color: testResult.success ? '#15803D' : '#DC2626', margin: 0 }}>
              {testResult.message}
            </p>
          </div>
        )}
      </div>

      {/* ─── Architecture Info ───────────────────────────────────────────────── */}
      <div style={{ ...cardStyle, background: '#F8F9FA', border: '1.5px solid #E5E7EB' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginTop: 0, marginBottom: '12px' }}>Print Architecture</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#6B7280' }}>
          {['React POS', 'printerService.ts', 'QZ Tray (localhost:8182)', 'Windows USB Driver', 'RONGTA RP335', 'Cash Drawer (RJ11)'].map((step, i, arr) => (
            <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: PZ + '20', color: PZ, fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
              <span style={{ fontWeight: 500 }}>{step}</span>
              {i < arr.length - 1 && <span style={{ color: '#D1D5DB', fontSize: '16px' }}>→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* ─── Save Button ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
        {saved && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16A34A', fontWeight: 600, fontSize: '13px' }}>
            <CheckCircle2 size={16} /> Saved!
          </div>
        )}
        <button
          onClick={handleSave}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', background: PZ, color: '#fff', fontSize: '14px', fontWeight: 700, border: 'none', cursor: 'pointer' }}
        >
          <Save size={16} /> Save Settings
        </button>
      </div>
    </div>
  );
}
