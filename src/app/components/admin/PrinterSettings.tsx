import React, { useState, useEffect } from 'react';
import {
  Printer, CheckCircle2, AlertTriangle, Loader2,
  ToggleLeft, ToggleRight, RefreshCw, Wifi, Receipt,
  ChevronDown, Save, ExternalLink, PrinterCheck,
  Zap, Info, HelpCircle, UtensilsCrossed
} from 'lucide-react';
import {
  printerService,
  loadPrinterSettings,
  savePrinterSettings,
  type PrinterSettings as IPrinterSettings,
  type PrinterStatus,
  type PrintMode,
} from '../../utils/printerService';

const PZ = '#F9002B';

export function PrinterSettings() {
  const [settings, setSettings] = useState<IPrinterSettings>(loadPrinterSettings());
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus>(printerService.getStatus());
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isTestingKOT, setIsTestingKOT] = useState(false);
  const [isOpeningDrawer, setIsOpeningDrawer] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (settings.printMode === 'qz' && printerService.getStatus() !== 'online') {
      setTimeout(() => printerService.connect(), 1000);
    }
    const unsub = printerService.onStatusChange(setPrinterStatus);
    return unsub;
  }, [settings.printMode]);

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
      const rongta = list.find(p => p.toLowerCase().includes('rongta') || p.toLowerCase().includes('rp33') || p.toLowerCase().includes('pos'));
      handleChange('printerName', rongta || list[0]);
    }
  };

  const handleChange = <K extends keyof IPrinterSettings>(key: K, value: IPrinterSettings[K]) => {
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
      ? { success: true, message: 'Test receipt sent successfully! Check your printer.' }
      : { success: false, message: result.error || 'Test print failed.' }
    );
  };

  const handleTestPrintKOT = async () => {
    setIsTestingKOT(true);
    setTestResult(null);
    const result = await printerService.testPrintKOT(settings);
    setIsTestingKOT(false);
    setTestResult(result.success
      ? { success: true, message: 'Kitchen Order Ticket (KOT) test sent successfully!' }
      : { success: false, message: result.error || 'KOT test print failed.' }
    );
  };

  const handleOpenDrawer = async () => {
    setIsOpeningDrawer(true);
    setTestResult(null);
    const result = await printerService.openCashDrawer(settings);
    setIsOpeningDrawer(false);
    setTestResult(result.success
      ? { success: true, message: 'Cash drawer trigger sent! (In Direct Print mode, drawer kicks automatically on print)' }
      : { success: false, message: result.error || 'Failed to open cash drawer.' }
    );
  };

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
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '24px 16px', fontFamily: 'var(--font-body)' }}>
      {/* ─── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: `linear-gradient(135deg, ${PZ}, #c8001f)`, borderRadius: '14px', padding: '12px' }}>
            <Printer size={24} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#111', margin: 0 }}>Printer Settings</h2>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: '2px 0 0 0' }}>
              Direct System Printing · Kitchen Order Tickets (KOT) · Thermal 80mm/58mm
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowGuide(!showGuide)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '10px',
            border: '1.5px solid #E5E7EB',
            background: '#fff',
            color: '#4B5563',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <HelpCircle size={15} color={PZ} />
          {showGuide ? 'Hide Setup Guide' : 'Setup Guide & Tips'}
        </button>
      </div>

      {/* ─── Setup Guide Modal / Banner ──────────────────────────────────────── */}
      {showGuide && (
        <div style={{ ...cardStyle, background: '#FFFDF0', border: '1.5px solid #FDE68A', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Zap size={18} color="#D97706" />
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#92400E', margin: 0 }}>
              Thermal Printer Setup Guide (No QZ Tray Needed!)
            </h3>
          </div>
          <div style={{ fontSize: '13px', color: '#78350F', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <strong>1. Direct System Print:</strong> Works with any thermal printer (Rongta RP335, Xprinter, Epson, POS-80, etc.) installed on Windows/Mac. You do NOT need QZ Tray!
            </div>
            <div>
              <strong>2. 1-Click Silent Auto-Print (Zero Clicks!):</strong> In Google Chrome, you can print instantly without the print preview window:
              <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                <li>Right-click your Google Chrome desktop shortcut → click <strong>Properties</strong>.</li>
                <li>In the <strong>Target</strong> box, add a space and <code>--kiosk-printing</code> at the end.</li>
                <li>Example: <code>"chrome.exe" --kiosk-printing</code></li>
                <li>Now when you place an order in POS, it will print silently and instantly!</li>
              </ul>
            </div>
            <div>
              <strong>3. Automatic Cash Drawer Kick:</strong>
              <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                <li>Open Windows <strong>Control Panel → Devices and Printers</strong>.</li>
                <li>Right-click your thermal printer (e.g. Rongta) → click <strong>Printer Properties</strong>.</li>
                <li>Go to <strong>Device Settings</strong> tab → set <strong>Cash Drawer</strong> to <em>"Open before printing"</em> or <em>"Open after printing"</em>.</li>
                <li>Click <strong>OK</strong>. The cash drawer will now pop open automatically every time a customer receipt prints!</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ─── Mode Selection ──────────────────────────────────────────────────── */}
      <div style={cardStyle}>
        <label style={labelStyle}>Print Mode Selection</label>
        <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 14px 0' }}>
          Choose how Pizzora communicates with your receipt printer:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {/* Option 1: Direct Browser Print (Recommended) */}
          <div
            onClick={() => handleChange('printMode', 'browser')}
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: `2px solid ${settings.printMode === 'browser' ? PZ : '#E5E7EB'}`,
              background: settings.printMode === 'browser' ? `${PZ}08` : '#fff',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} color={settings.printMode === 'browser' ? PZ : '#6B7280'} />
                <span style={{ fontSize: '15px', fontWeight: 800, color: settings.printMode === 'browser' ? PZ : '#111' }}>
                  Direct System Print
                </span>
              </div>
              <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '99px', background: '#DCFCE7', color: '#15803D' }}>
                RECOMMENDED
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#4B5563', margin: 0, lineHeight: 1.4 }}>
              Prints directly via Windows / Mac printer driver. <strong>No QZ Tray or external software needed.</strong> 100% reliable with all thermal printers.
            </p>
          </div>

          {/* Option 2: QZ Tray Mode */}
          <div
            onClick={() => handleChange('printMode', 'qz')}
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: `2px solid ${settings.printMode === 'qz' ? PZ : '#E5E7EB'}`,
              background: settings.printMode === 'qz' ? `${PZ}08` : '#fff',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wifi size={18} color={settings.printMode === 'qz' ? PZ : '#6B7280'} />
                <span style={{ fontSize: '15px', fontWeight: 800, color: settings.printMode === 'qz' ? PZ : '#111' }}>
                  QZ Tray (Raw ESC/POS)
                </span>
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: '#F3F4F6', color: '#6B7280' }}>
                LEGACY
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#4B5563', margin: 0, lineHeight: 1.4 }}>
              Sends raw binary ESC/POS over WebSocket (ws://localhost:8182). Requires QZ Tray desktop app running on the PC.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Mode Specific Status / Configuration ────────────────────────────── */}
      {settings.printMode === 'browser' ? (
        <div style={{ ...cardStyle, background: '#F0FDF4', border: '1.5px solid #BBF7D0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckCircle2 size={22} color="#16A34A" />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#15803D', margin: 0 }}>
                Direct System Printing Active
              </h4>
              <p style={{ fontSize: '12px', color: '#166534', margin: '2px 0 0 0' }}>
                Pizzora will send thermal receipts and KOTs directly to your system's default thermal printer. No QZ Tray required.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* QZ Tray Status Card */
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: printerStatus === 'online' ? '#16A34A' : printerStatus === 'connecting' ? '#D97706' : '#DC2626',
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
              <div>
                <p style={{ fontSize: '14px', fontWeight: 700, color: printerStatus === 'online' ? '#16A34A' : '#DC2626', margin: 0 }}>
                  {printerStatus === 'online' ? 'QZ Tray Connected' : 'QZ Tray Offline'}
                </p>
                <p style={{ fontSize: '12px', color: '#6B7280', margin: '2px 0 0 0' }}>
                  {printerStatus === 'online' ? `${availablePrinters.length} printer(s) detected` : 'WebSocket: ws://localhost:8182'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {printerStatus !== 'online' && (
                <button
                  onClick={connectQZ}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: `1.5px solid ${PZ}`, background: 'transparent', color: PZ, fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >
                  <Wifi size={14} /> Connect QZ Tray
                </button>
              )}
              {printerStatus === 'online' && (
                <button
                  onClick={loadPrinters}
                  disabled={isLoadingPrinters}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: '1.5px solid #D1D5DB', background: 'transparent', color: '#374151', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: isLoadingPrinters ? 0.6 : 1 }}
                >
                  {isLoadingPrinters ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  Refresh Printers
                </button>
              )}
              <a
                href="https://qz.io/download/"
                target="_blank"
                rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: '1.5px solid #D1D5DB', background: 'transparent', color: '#6B7280', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}
              >
                <ExternalLink size={13} /> Download QZ Tray
              </a>
            </div>
          </div>

          {/* QZ Printer Selection Dropdown */}
          <div style={{ marginTop: '16px', borderTop: '1px solid #F3F4F6', paddingTop: '16px' }}>
            <label style={labelStyle}>Target ESC/POS Printer Name</label>
            {printerStatus === 'online' && availablePrinters.length > 0 ? (
              <div style={{ position: 'relative' }}>
                <select
                  value={settings.printerName}
                  onChange={e => handleChange('printerName', e.target.value)}
                  style={{ ...inputStyle, appearance: 'none', paddingRight: '36px', cursor: 'pointer' }}
                >
                  <option value="">— Select Detected Printer —</option>
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
                placeholder="e.g. RONGTA RP335"
                style={inputStyle}
              />
            )}
          </div>
        </div>
      )}

      {/* ─── Receipt Paper & Layout ──────────────────────────────────────────── */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111', marginTop: 0, marginBottom: '18px', borderBottom: '1px solid #F3F4F6', paddingBottom: '10px' }}>
          Paper & Layout Settings
        </h3>

        <div style={{ marginBottom: '18px' }}>
          <label style={labelStyle}>Thermal Paper Roll Width</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            {[
              { val: '80mm' as const, label: '80mm (Standard Restaurant POS)' },
              { val: '58mm' as const, label: '58mm (Compact Mobile Thermal)' }
            ].map(({ val, label }) => (
              <button
                key={val}
                onClick={() => handleChange('paperWidth', val)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: `2px solid ${settings.paperWidth === val ? PZ : '#E5E7EB'}`,
                  background: settings.paperWidth === val ? `${PZ}12` : '#fff',
                  color: settings.paperWidth === val ? PZ : '#374151',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '4px' }}>
          <label style={labelStyle}>Number of Copies per Receipt</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[1, 2, 3].map(n => (
              <button
                key={n}
                onClick={() => handleChange('copies', n)}
                style={{
                  width: '54px',
                  height: '42px',
                  borderRadius: '10px',
                  border: `2px solid ${settings.copies === n ? PZ : '#E5E7EB'}`,
                  background: settings.copies === n ? `${PZ}12` : '#fff',
                  color: settings.copies === n ? PZ : '#374151',
                  fontWeight: 700,
                  fontSize: '15px',
                  cursor: 'pointer',
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
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111', marginTop: 0, marginBottom: '18px', borderBottom: '1px solid #F3F4F6', paddingBottom: '10px' }}>
          Automation
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            {
              key: 'autoPrint' as const,
              label: 'Auto-Print Customer Receipt',
              desc: 'Automatically triggers receipt print as soon as payment is confirmed in POS'
            },
            {
              key: 'autoOpenDrawer' as const,
              label: 'Auto Open Cash Drawer (RJ11)',
              desc: 'Triggers drawer kick on Cash transactions via printer RJ11 port'
            },
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
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111', marginTop: 0, marginBottom: '18px', borderBottom: '1px solid #F3F4F6', paddingBottom: '10px' }}>
          Test Hardware & Print Quality
        </h3>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {/* Test Customer Receipt */}
          <button
            onClick={handleTestPrint}
            disabled={isTesting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 18px',
              borderRadius: '12px',
              background: PZ,
              color: '#fff',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              opacity: isTesting ? 0.7 : 1,
            }}
          >
            {isTesting ? <Loader2 size={16} className="animate-spin" /> : <PrinterCheck size={16} />}
            {isTesting ? 'Sending…' : 'Test Print Receipt'}
          </button>

          {/* Test Kitchen Ticket */}
          <button
            onClick={handleTestPrintKOT}
            disabled={isTestingKOT}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 18px',
              borderRadius: '12px',
              background: '#4F46E5',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              opacity: isTestingKOT ? 0.7 : 1,
            }}
          >
            {isTestingKOT ? <Loader2 size={16} className="animate-spin" /> : <UtensilsCrossed size={16} />}
            {isTestingKOT ? 'Sending…' : 'Test Print KOT (Kitchen)'}
          </button>

          {/* Test Cash Drawer */}
          <button
            onClick={handleOpenDrawer}
            disabled={isOpeningDrawer}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 18px',
              borderRadius: '12px',
              background: '#16A34A',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              opacity: isOpeningDrawer ? 0.7 : 1,
            }}
          >
            {isOpeningDrawer ? <Loader2 size={16} className="animate-spin" /> : <Receipt size={16} />}
            {isOpeningDrawer ? 'Opening…' : 'Kick Cash Drawer'}
          </button>
        </div>

        {testResult && (
          <div
            style={{
              marginTop: '14px',
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: testResult.success ? '#F0FDF4' : '#FEF2F2',
              border: `1px solid ${testResult.success ? '#BBF7D0' : '#FECACA'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
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

      {/* ─── Save Button ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
        {saved && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16A34A', fontWeight: 700, fontSize: '13px' }}>
            <CheckCircle2 size={16} /> Settings Saved!
          </div>
        )}
        <button
          onClick={handleSave}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 28px',
            borderRadius: '12px',
            background: PZ,
            color: '#fff',
            fontSize: '14px',
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(249,0,43,0.3)',
          }}
        >
          <Save size={16} /> Save Settings
        </button>
      </div>
    </div>
  );
}
