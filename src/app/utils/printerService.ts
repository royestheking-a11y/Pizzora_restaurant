/**
 * printerService.ts
 * 
 * QZ Tray bridge for ESC/POS printing with the RONGTA RP335 thermal printer.
 * Communicates via WebSocket with the QZ Tray desktop application running on
 * the local machine (ws://localhost:8182).
 *
 * Cash drawer is connected via RJ11/RJ12 through the printer and is triggered
 * with a specific ESC/POS command sent to the printer.
 */

export type PrinterStatus = 'online' | 'offline' | 'connecting' | 'not_installed';
import { getBackendUrl } from '../context/AppContext';

export interface PrinterSettings {
  printerName: string;
  autoPrint: boolean;
  autoOpenDrawer: boolean;
  paperWidth: '58mm' | '80mm';
  copies: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  orderId: string;
  orderType: string;
  tableNo?: string;
  customerName?: string;
  cashierName: string;
  dateTime: string;
  items: Array<{ name: string; quantity: number; price: number; variant?: string }>;
  subtotal: number;
  discount: number;
  vat?: number;
  serviceCharge?: number;
  total: number;
  paymentMethod: string;
  amountPaid: number;
  change: number;
  isRefund?: boolean;
}

const SETTINGS_KEY = 'pizzora_printer_settings';
const QZ_WS_URL = 'ws://localhost:8182';

const DEFAULT_SETTINGS: PrinterSettings = {
  printerName: '',
  autoPrint: true,
  autoOpenDrawer: true,
  paperWidth: '80mm',
  copies: 1,
};

// ─── Settings helpers (persisted to localStorage) ────────────────────────────
export function loadPrinterSettings(): PrinterSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function savePrinterSettings(s: Partial<PrinterSettings>): PrinterSettings {
  const current = loadPrinterSettings();
  const merged = { ...current, ...s };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  return merged;
}

// ─── QZ Tray Connection Manager ──────────────────────────────────────────────
class QZTrayService {
  private qz: typeof import('qz-tray') | null = null;
  private status: PrinterStatus = 'offline';
  private listeners: Set<(s: PrinterStatus) => void> = new Set();

  onStatusChange(fn: (s: PrinterStatus) => void) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  private setStatus(s: PrinterStatus) {
    this.status = s;
    this.listeners.forEach(fn => fn(s));
  }

  getStatus(): PrinterStatus {
    return this.status;
  }

  async connect(): Promise<boolean> {
    try {
      this.setStatus('connecting');

      // Dynamically load qz-tray (CDN or local)
      if (!this.qz) {
        this.qz = await this.loadQZTray();
      }

      if (!this.qz) {
        this.setStatus('not_installed');
        return false;
      }

      const qz = this.qz as any;

      qz.websocket.setClosedCallbacks(() => this.setStatus('offline'));
      qz.websocket.setErrorCallbacks(() => this.setStatus('offline'));

      if (qz.websocket.isActive()) {
        this.setStatus('online');
        return true;
      }

      const API_URL = getBackendUrl();
      qz.security.setCertificatePromise((resolve: any, reject: any) => {
        fetch(`${API_URL}/api/qz/cert`)
          .then(res => res.text())
          .then(resolve)
          .catch(reject);
      });

      qz.security.setSignatureAlgorithm("SHA512");
      qz.security.setSignaturePromise((toSign: string) => {
        return (resolve: any, reject: any) => {
          fetch(`${API_URL}/api/qz/sign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ request: toSign })
          })
            .then(res => res.text())
            .then(resolve)
            .catch(reject);
        };
      });

      await qz.websocket.connect({ host: 'localhost', port: { secure: [8181], insecure: [8182] } });
      this.setStatus('online');
      return true;
    } catch (err) {
      console.warn('[QZ Tray] Not available:', err);
      this.setStatus('not_installed');
      return false;
    }
  }

  async disconnect() {
    try {
      if (this.qz) {
        const qz = this.qz as any;
        if (qz.websocket.isActive()) await qz.websocket.disconnect();
      }
    } catch { /* ignore */ }
    this.setStatus('offline');
  }

  private async loadQZTray(): Promise<any | null> {
    // Try to load qz-tray from window (if script tag loaded it)
    if (typeof window !== 'undefined' && (window as any).qz) {
      return (window as any).qz;
    }

    // Try dynamic import
    try {
      const mod = await import('qz-tray');
      return mod.default || mod;
    } catch {
      // Not installed — try injecting CDN script as last resort
      return await this.loadQZFromCDN();
    }
  }

  private loadQZFromCDN(): Promise<any | null> {
    return new Promise((resolve) => {
      if ((window as any).qz) return resolve((window as any).qz);

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.min.js';
      script.onload = () => resolve((window as any).qz || null);
      script.onerror = () => resolve(null);
      document.head.appendChild(script);

      // 5 second timeout
      setTimeout(() => resolve(null), 5000);
    });
  }

  async getAvailablePrinters(): Promise<string[]> {
    if (this.status !== 'online' || !this.qz) return [];
    try {
      const qz = this.qz as any;
      return await qz.printers.find();
    } catch {
      return [];
    }
  }

  // ─── ESC/POS Command Helpers ────────────────────────────────────────────────
  private ESC = 0x1B;
  private GS = 0x1D;

  private cmd(...bytes: number[]): { hex: string }[] {
    return [{ hex: bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join('') }];
  }

  private init(): { hex: string }[] { return this.cmd(this.ESC, 0x40); }
  private cutPaper(): { hex: string }[] { return this.cmd(this.GS, 0x56, 0x41, 0x10); }
  // Cash drawer kick: 200ms pulse (0x64) on pin 2 (0x00)
  private kickDrawer(): { hex: string }[] {
    const pin2 = this.cmd(this.ESC, 0x70, 0x00, 0x64, 0x64)[0].hex;
    return [{ hex: pin2 }];
  }
  private bold(on: boolean): { hex: string }[] { return this.cmd(this.ESC, 0x45, on ? 1 : 0); }
  private align(a: 'left' | 'center' | 'right'): { hex: string }[] {
    return this.cmd(this.ESC, 0x61, a === 'left' ? 0 : a === 'center' ? 1 : 2);
  }
  private fontSize(w: number, h: number): { hex: string }[] {
    return this.cmd(this.GS, 0x21, (w - 1) * 16 + (h - 1));
  }
  private lineBreak(count = 1): string[] { return Array(count).fill('\n'); }

  // ─── Receipt Builder ─────────────────────────────────────────────────────────
  buildReceiptData(invoice: InvoiceData, settings: PrinterSettings): (string | { hex: string })[] {
    const width = settings.paperWidth === '58mm' ? 32 : 48;
    const sep = '-'.repeat(width);
    const dbl = '='.repeat(width);

    const padRight = (s: string, len: number) => s.padEnd(len, ' ').slice(0, Math.max(len, s.length));
    const padLeft = (s: string, len: number) => s.padStart(len, ' ').slice(-Math.max(len, s.length));
    const currency = (n: number) => n.toFixed(2);

    const data: (string | { hex: string })[] = [];

    // Init
    data.push(...this.init());

    // Kick Cash Drawer (opens drawer as soon as print starts)
    data.push(...this.kickDrawer());

    if (invoice.isRefund) {
      data.push(...this.align('center'));
      data.push(...this.bold(true));
      data.push(...this.fontSize(2, 2));
      data.push('*** REFUND RECEIPT ***\n');
      data.push(...this.fontSize(1, 1));
      data.push(...this.bold(false));
    }

    // Header
    data.push(...this.align('center'));
    data.push(...this.bold(true));
    data.push(...this.fontSize(1, 2));
    data.push('PIZZORA RESTAURANT\n');
    data.push(...this.fontSize(1, 1));
    data.push(...this.bold(false));
    data.push('Subidbazar Point, Mitali Complex\n');
    data.push('Sylhet, Bangladesh\n');
    data.push('Tel: 01620026649\n');

    data.push(dbl + '\n');

    // Order info
    data.push(...this.align('left'));
    data.push(...this.bold(true));
    data.push(`Order Type : ${invoice.orderType}\n`);
    data.push(...this.bold(false));
    data.push(`Invoice    : ${invoice.invoiceNumber}\n`);
    data.push(`Date/Time  : ${invoice.dateTime}\n`);
    data.push(`Cashier    : ${invoice.cashierName}\n`);
    if (invoice.orderType === 'Dine In' && invoice.tableNo) {
      data.push(`Table      : ${invoice.tableNo}\n`);
    }
    if (invoice.customerName) {
      data.push(`Customer   : ${invoice.customerName}\n`);
    }

    data.push(sep + '\n');

    // Column header
    const qLen = 4, priceLen = 12;
    const nameLen = width - qLen - priceLen - 2;
    data.push(...this.bold(true));
    data.push(`${padRight('Qty', qLen)} ${padRight('Item', nameLen)} ${padLeft('Price', priceLen)}\n`);
    data.push(...this.bold(false));
    data.push(sep + '\n');

    // Items
    for (const item of invoice.items) {
      const lineTotal = currency(item.price * item.quantity);
      const qtyStr = String(item.quantity);
      let namePart = item.variant ? `${item.name} (${item.variant})` : item.name;
      namePart = namePart.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      // Handle long names with wrapping
      const chunks: string[] = [];
      let remaining = namePart;
      while (remaining.length > nameLen) {
        chunks.push(remaining.slice(0, nameLen));
        remaining = remaining.slice(nameLen);
      }
      chunks.push(remaining);

      const firstLine = `${padRight(qtyStr, qLen)} ${padRight(chunks[0], nameLen)} ${padLeft(lineTotal, priceLen)}\n`;
      data.push(firstLine);
      for (let i = 1; i < chunks.length; i++) {
        data.push(`${' '.repeat(qLen + 1)}${padRight(chunks[i], nameLen)}\n`);
      }
    }

    data.push(sep + '\n');

    // Totals
    const totRow = (label: string, val: string) =>
      `${padRight(label, width - priceLen - 1)} ${padLeft(val, priceLen)}\n`;

    data.push(totRow('Subtotal:', `Tk ${currency(invoice.subtotal)}`));
    if (invoice.discount > 0) {
      data.push(totRow('Discount:', `-Tk ${currency(invoice.discount)}`));
    }
    if (invoice.vat && invoice.vat > 0) {
      data.push(totRow('VAT:', `Tk ${currency(invoice.vat)}`));
    }
    if (invoice.serviceCharge && invoice.serviceCharge > 0) {
      data.push(totRow('Service Charge:', `Tk ${currency(invoice.serviceCharge)}`));
    }

    data.push(dbl + '\n');
    data.push(...this.bold(true));
    data.push(...this.fontSize(1, 2));
    data.push(totRow('TOTAL:', `Tk ${currency(invoice.total)}`));
    data.push(...this.fontSize(1, 1));
    data.push(...this.bold(false));
    data.push(dbl + '\n');

    data.push(totRow(`Payment (${invoice.paymentMethod}):`, `Tk ${currency(invoice.amountPaid)}`));
    if (invoice.change > 0) {
      data.push(totRow('Change:', `Tk ${currency(invoice.change)}`));
    }

    data.push(sep + '\n');

    // Footer
    data.push(...this.align('center'));
    data.push(...this.lineBreak());
    data.push(...this.bold(true));
    data.push('Thank you for dining at Pizzora!\n');
    data.push(...this.bold(false));
    data.push('www.rizqara.tech\n');
    data.push(...this.lineBreak(3));

    // Cut paper
    data.push(...this.cutPaper());

    return data;
  }

  // ─── Main print method ───────────────────────────────────────────────────────
  async printReceipt(
    invoice: InvoiceData,
    settings?: PrinterSettings
  ): Promise<{ success: boolean; error?: string }> {
    const s = settings || loadPrinterSettings();

    if (!s.printerName) {
      return { success: false, error: 'No printer selected. Please configure printer in Settings.' };
    }

    if (this.status !== 'online') {
      const connected = await this.connect();
      if (!connected) {
        return { success: false, error: 'QZ Tray is not running. Please start QZ Tray on this computer.' };
      }
    }

    try {
      const qz = this.qz as any;
      const config = qz.configs.create(s.printerName, {
        copies: s.copies || 1,
        encoding: 'UTF-8',
      });

      const receiptData = this.buildReceiptData(invoice, s);

      const printData = receiptData.map(item =>
        typeof item === 'object' && 'hex' in item
          ? { type: 'raw', format: 'hex', data: item.hex }
          : { type: 'raw', format: 'plain', data: item }
      );

      for (let i = 0; i < (s.copies || 1); i++) {
        await qz.print(config, printData);
      }

      return { success: true };
    } catch (err: any) {
      console.error('[QZ Tray] Print error:', err);
      return { success: false, error: err?.message || 'Unknown print error' };
    }
  }

  // ─── Cash Drawer ─────────────────────────────────────────────────────────────
  async openCashDrawer(settings?: PrinterSettings): Promise<{ success: boolean; error?: string }> {
    const s = settings || loadPrinterSettings();

    if (!s.printerName) {
      return { success: false, error: 'No printer selected to trigger cash drawer.' };
    }

    if (this.status !== 'online') {
      const connected = await this.connect();
      if (!connected) {
        return { success: false, error: 'QZ Tray is not running.' };
      }
    }

    try {
      const qz = this.qz as any;
      const config = qz.configs.create(s.printerName, { encoding: 'ISO-8859-1' });
      await qz.print(config, [{ type: 'raw', format: 'hex', data: this.kickDrawer()[0].hex }]);
      return { success: true };
    } catch (err: any) {
      console.error('[QZ Tray] Drawer error:', err);
      return { success: false, error: err?.message || 'Failed to open cash drawer' };
    }
  }

  // ─── Test Print ──────────────────────────────────────────────────────────────
  async testPrint(settings?: PrinterSettings): Promise<{ success: boolean; error?: string }> {
    const s = settings || loadPrinterSettings();
    return this.printReceipt({
      invoiceNumber: 'PIZ-TEST-000000',
      orderId: 'TEST',
      orderType: 'Test Print',
      cashierName: 'System',
      dateTime: new Date().toLocaleString(),
      items: [{ name: 'Test Item', quantity: 1, price: 100 }],
      subtotal: 100,
      discount: 0,
      total: 100,
      paymentMethod: 'Cash',
      amountPaid: 100,
      change: 0,
    }, s);
  }
}

// Singleton
export const printerService = new QZTrayService();

// ─── Generate Invoice Number (calls backend) ──────────────────────────────────
export async function generateInvoiceNumber(): Promise<string> {
  try {
    const token = sessionStorage.getItem('pizzora_token');
    const BACKEND_URL = getBackendUrl();

    // 2 second strict timeout to prevent delaying the POS checkout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${BACKEND_URL}/api/invoices/generate-number`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const { invoiceNumber } = await res.json();
      return invoiceNumber;
    }
  } catch (err) {
    console.warn('[Invoice] Failed to generate sequential invoice number, using fallback:', err);
  }
  // Fallback: timestamp-based
  const y = new Date().getFullYear();
  const n = String(Date.now()).slice(-6);
  return `PIZ-${y}-${n}`;
}

// ─── Log a Print Job (calls backend) ─────────────────────────────────────────
export async function logPrintJob(job: {
  invoiceNumber: string;
  orderId: string;
  printedBy: string;
  isReprint: boolean;
  reprintReason?: string;
  status: 'success' | 'failed';
  paymentMethod: string;
  total: number;
}): Promise<void> {
  try {
    const token = sessionStorage.getItem('pizzora_token');
    const BACKEND_URL = getBackendUrl();

    // 2 second strict timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    await fetch(`${BACKEND_URL}/api/print-jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: controller.signal,
      body: JSON.stringify({
        id: `PJ${Date.now()}`,
        ...job,
        printedAt: new Date().toISOString(),
        reprintReason: job.reprintReason || '',
      }),
    });

    clearTimeout(timeoutId);
  } catch (err) {
    console.warn('[PrintJob] Failed to log print job:', err);
  }
}
