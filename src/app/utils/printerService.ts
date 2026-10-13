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

export type PrinterStatus = 'online' | 'offline' | 'connecting' | 'not_installed' | 'ready';
export type PrintMode = 'browser' | 'qz';
import { getBackendUrl } from '../context/AppContext';

export interface PrinterSettings {
  printMode: PrintMode; // 'browser' (default) or 'qz'
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
  items: Array<{ name: string; quantity: number; price: number; variant?: string; specialRequest?: string; note?: string }>;
  subtotal: number;
  discount: number;
  vat?: number;
  serviceCharge?: number;
  total: number;
  paymentMethod: string;
  splitPayments?: Array<{ method: string; amount: number }>;
  amountPaid: number;
  change: number;
  isRefund?: boolean;
}

const SETTINGS_KEY = 'pizzora_printer_settings';
const QZ_WS_URL = 'ws://localhost:8182';

const DEFAULT_SETTINGS: PrinterSettings = {
  printMode: 'browser', // Default: Direct System / Browser Print (NO QZ Tray required!)
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
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      printMode: parsed.printMode || 'browser',
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function savePrinterSettings(s: Partial<PrinterSettings>): PrinterSettings {
  const current = loadPrinterSettings();
  const merged = { ...current, ...s };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  printerService.notifyStatus();
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

  notifyStatus() {
    const s = this.getStatus();
    this.listeners.forEach(fn => fn(s));
  }

  private setStatus(s: PrinterStatus) {
    this.status = s;
    this.listeners.forEach(fn => fn(this.getStatus()));
  }

  getStatus(): PrinterStatus {
    const s = loadPrinterSettings();
    if (s.printMode === 'browser') {
      return 'ready';
    }
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
  // Cash drawer kick: Safe 100ms pulse (0x32 = 50 * 2ms = 100ms) on both Pin 2 (0x00) and Pin 5 (0x01)
  // 100ms provides optimal magnetic pull force to open heavy/loaded drawers reliably
  // while remaining well below the thermal threshold that burns printer driver transistors.
  // Dual-pin ensures compatibility regardless of whether the drawer is wired for Pin 2 or Pin 5.
  kickDrawer(): { hex: string }[] {
    const pin2 = this.cmd(this.ESC, 0x70, 0x00, 0x32, 0x32)[0].hex;
    const pin5 = this.cmd(this.ESC, 0x70, 0x01, 0x32, 0x32)[0].hex;
    return [{ hex: pin2 + pin5 }];
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

    if (invoice.splitPayments && invoice.splitPayments.length > 0) {
      data.push(totRow('Payment (Split):', ''));
      invoice.splitPayments.forEach(p => {
        data.push(totRow(`  * ${p.method}:`, `Tk ${currency(p.amount)}`));
      });
    } else {
      data.push(totRow(`Payment (${invoice.paymentMethod}):`, `Tk ${currency(invoice.amountPaid)}`));
    }
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
    data.push('Powered by rizqara.tech\n');
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

    // 1. Direct Browser Print (Default & Recommended - No QZ Tray needed!)
    if (s.printMode !== 'qz') {
      const html = generateReceiptHtml(invoice, s);
      const ok = await printHtmlViaIframe(html);
      return ok
        ? { success: true }
        : { success: false, error: 'Could not open print window. Please allow print/popups in browser.' };
    }

    // 2. QZ Tray Mode (Raw ESC/POS)
    if (!s.printerName) {
      console.warn('[QZ Tray] No printer configured, falling back to Direct Browser Print');
      const html = generateReceiptHtml(invoice, s);
      const ok = await printHtmlViaIframe(html);
      return ok ? { success: true } : { success: false, error: 'No printer selected.' };
    }

    if (this.status !== 'online') {
      const connected = await this.connect();
      if (!connected) {
        console.warn('[QZ Tray] Not running, automatically falling back to Direct Browser Print');
        const html = generateReceiptHtml(invoice, s);
        const ok = await printHtmlViaIframe(html);
        return ok
          ? { success: true }
          : { success: false, error: 'QZ Tray is not running and browser print failed.' };
      }
    }

    try {
      const qz = this.qz as any;
      const config = qz.configs.create(s.printerName, {
        copies: 1,
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
      console.error('[QZ Tray] Print error, falling back to Direct Browser Print:', err);
      const html = generateReceiptHtml(invoice, s);
      const ok = await printHtmlViaIframe(html);
      return ok ? { success: true } : { success: false, error: err?.message || 'Unknown print error' };
    }
  }

  // ─── Kitchen Order Ticket (KOT) Builder ──────────────────────────────────────
  buildKOTData(invoice: InvoiceData, settings: PrinterSettings): (string | { hex: string })[] {
    const width = settings.paperWidth === '58mm' ? 32 : 48;
    const sep = '-'.repeat(width);
    const dbl = '='.repeat(width);

    const padRight = (s: string, len: number) => s.padEnd(len, ' ').slice(0, Math.max(len, s.length));
    const padLeft = (s: string, len: number) => s.padStart(len, ' ').slice(-Math.max(len, s.length));

    const data: (string | { hex: string })[] = [];

    // Init
    data.push(...this.init());

    // Header (Address & Info)
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

    // KOT Title
    data.push(...this.align('center'));
    data.push(...this.bold(true));
    data.push(...this.fontSize(2, 2));
    data.push('*** KITCHEN TICKET ***\n');
    data.push(...this.fontSize(1, 1));
    data.push(...this.bold(false));

    data.push(dbl + '\n');

    // Order info
    data.push(...this.align('left'));
    data.push(...this.bold(true));
    data.push(...this.fontSize(1, 2));
    if (invoice.orderType === 'Dine In' && invoice.tableNo) {
      data.push(`TABLE: ${invoice.tableNo}\n`);
    } else {
      data.push(`${invoice.orderType.toUpperCase()}\n`);
    }
    data.push(...this.fontSize(1, 1));
    data.push(...this.bold(false));
    data.push(`Order      : ${invoice.invoiceNumber}\n`);
    data.push(`Time       : ${invoice.dateTime}\n`);

    data.push(sep + '\n');

    // Column header
    const qLen = 6;
    const nameLen = width - qLen - 1;
    data.push(...this.bold(true));
    data.push(`${padRight('Qty', qLen)} ${padRight('Item', nameLen)}\n`);
    data.push(...this.bold(false));
    data.push(sep + '\n');

    // Items
    for (const item of invoice.items) {
      const qtyStr = `[ ${item.quantity} ]`;
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

      data.push(...this.bold(true));
      data.push(...this.fontSize(1, 2)); // Slightly larger items
      const firstLine = `${padRight(qtyStr, qLen)} ${padRight(chunks[0], nameLen)}\n`;
      data.push(firstLine);
      for (let i = 1; i < chunks.length; i++) {
        data.push(`${' '.repeat(qLen + 1)}${padRight(chunks[i], nameLen)}\n`);
      }
      data.push(...this.fontSize(1, 1));
      data.push(...this.bold(false));

      // If there's a note on the item
      const specialNote = (item as any).specialRequest || (item as any).note;
      if (specialNote) {
        data.push(...this.bold(true));
        data.push(`  ** Note: ${specialNote} **\n`);
        data.push(...this.bold(false));
      }
      data.push('\n'); // blank line between items
    }

    data.push(dbl + '\n');

    // Footer
    data.push(...this.align('center'));
    data.push(...this.lineBreak());
    data.push(...this.bold(true));
    data.push('Thank you for dining at Pizzora!\n');
    data.push(...this.bold(false));
    data.push('Powered by rizqara.tech\n');
    data.push(...this.lineBreak(3));

    // Cut paper
    data.push(...this.cutPaper());

    return data;
  }

  // ─── Print KOT Method ────────────────────────────────────────────────────────
  async printKOT(
    invoice: InvoiceData,
    settings?: PrinterSettings
  ): Promise<{ success: boolean; error?: string }> {
    const s = settings || loadPrinterSettings();

    // 1. Direct Browser Print Mode (Default & Recommended - No QZ Tray needed!)
    if (s.printMode !== 'qz') {
      const html = generateKOTHtml(invoice, s);
      const ok = await printHtmlViaIframe(html);
      return ok
        ? { success: true }
        : { success: false, error: 'Could not open print window for KOT.' };
    }

    // 2. QZ Tray Mode
    if (!s.printerName || this.status !== 'online') {
      const connected = this.status === 'online' || (await this.connect());
      if (!connected || !s.printerName) {
        console.warn('[QZ Tray] Offline, automatically falling back to Direct Browser Print for KOT');
        const html = generateKOTHtml(invoice, s);
        const ok = await printHtmlViaIframe(html);
        return ok ? { success: true } : { success: false, error: 'QZ Tray is not running.' };
      }
    }

    try {
      const qz = this.qz as any;
      const config = qz.configs.create(s.printerName, {
        copies: 1, // KOT usually printed once
        encoding: 'UTF-8',
      });

      const receiptData = this.buildKOTData(invoice, s);

      const printData = receiptData.map(item =>
        typeof item === 'object' && 'hex' in item
          ? { type: 'raw', format: 'hex', data: item.hex }
          : { type: 'raw', format: 'plain', data: item }
      );

      await qz.print(config, printData);
      return { success: true };
    } catch (err: any) {
      console.error('[QZ Tray] KOT Print error, falling back to Direct Browser Print:', err);
      const html = generateKOTHtml(invoice, s);
      const ok = await printHtmlViaIframe(html);
      return ok ? { success: true } : { success: false, error: err?.message || 'Unknown print error' };
    }
  }

  // ─── Cash Drawer ─────────────────────────────────────────────────────────────
  async openCashDrawer(settings?: PrinterSettings): Promise<{ success: boolean; error?: string }> {
    const s = settings || loadPrinterSettings();

    // If QZ mode is explicitly configured and online, send ESC/POS kick pulse
    if (s.printMode === 'qz' && this.status === 'online' && s.printerName) {
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

    // In Direct Browser Print mode:
    // Thermal printers (Rongta RP335, Epson, etc.) have the cash drawer connected via RJ11.
    // When enabled in Windows Printer Properties (Device Settings -> Cash Drawer -> Open before/after print),
    // the driver kicks the drawer automatically whenever a receipt prints.
    return { success: true };
  }

  // ─── Test Print ──────────────────────────────────────────────────────────────
  async testPrint(settings?: PrinterSettings): Promise<{ success: boolean; error?: string }> {
    const s = settings || loadPrinterSettings();
    return this.printReceipt({
      invoiceNumber: 'PIZ-TEST-' + String(Date.now()).slice(-6),
      orderId: 'TEST-001',
      orderType: 'Dine In',
      tableNo: '3',
      cashierName: 'Admin',
      dateTime: new Date().toLocaleString(),
      items: [
        { name: '12" Pepperoni Pizza', quantity: 1, price: 650, variant: 'Medium' },
        { name: 'Garlic Breadsticks', quantity: 1, price: 180 },
        { name: 'Coca-Cola (500ml)', quantity: 2, price: 50 },
      ],
      subtotal: 930,
      discount: 50,
      vat: 0,
      serviceCharge: 0,
      total: 880,
      paymentMethod: 'Cash',
      amountPaid: 1000,
      change: 120,
    }, s);
  }

  // ─── Test Print KOT ──────────────────────────────────────────────────────────
  async testPrintKOT(settings?: PrinterSettings): Promise<{ success: boolean; error?: string }> {
    const s = settings || loadPrinterSettings();
    return this.printKOT({
      invoiceNumber: 'PIZ-TEST-' + String(Date.now()).slice(-6),
      orderId: 'TEST-001',
      orderType: 'Dine In',
      tableNo: '3',
      cashierName: 'Admin',
      dateTime: new Date().toLocaleTimeString(),
      items: [
        { name: '12" Pepperoni Pizza', quantity: 2, price: 650, variant: 'Medium', note: 'Extra Crispy Crust' },
        { name: 'Garlic Breadsticks', quantity: 1, price: 180, note: 'Serve Hot First' },
      ],
      subtotal: 1480,
      discount: 0,
      total: 1480,
      paymentMethod: 'Cash',
      amountPaid: 1480,
      change: 0,
    }, s);
  }
}

// ─── Direct Browser HTML Generators & Print Runner ───────────────────────────

function escapeHtml(str: string = ''): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function generateReceiptHtml(invoice: InvoiceData, settings: PrinterSettings): string {
  const is58 = settings.paperWidth === '58mm';
  const widthMm = is58 ? '58mm' : '80mm';
  // Safe printable area: 68mm for 80mm rolls (print head is 72mm max), 46mm for 58mm rolls
  const contentWidth = is58 ? '46mm' : '68mm';
  const numCopies = Math.max(1, settings.copies || 1);

  const formatMoney = (n: number) => (Number(n) || 0).toFixed(2);

  const itemsHtml = invoice.items.map(item => {
    const lineTotal = formatMoney(item.price * item.quantity);
    const variantStr = item.variant ? `<div class="item-variant">(${escapeHtml(item.variant)})</div>` : '';
    const note = item.specialRequest || item.note;
    const noteStr = note ? `<div class="item-note">* Note: ${escapeHtml(note)}</div>` : '';

    return `
      <tr>
        <td class="col-qty">${item.quantity}x</td>
        <td class="col-item">
          <div class="item-name">${escapeHtml(item.name)}</div>
          ${variantStr}
          ${noteStr}
        </td>
        <td class="col-price">Tk ${lineTotal}</td>
      </tr>
    `;
  }).join('');

  const renderSingleReceipt = (copyNum: number) => `
    <div class="receipt-instance" style="${copyNum > 0 ? 'page-break-before: always; padding-top: 4mm;' : ''}">
      <div class="center">
        <div class="header-brand">PIZZORA RESTAURANT</div>
        <div class="header-info">Subidbazar Point, Mitali Complex</div>
        <div class="header-info">Sylhet, Bangladesh</div>
        <div class="header-info">Tel: 01620026649</div>
        ${copyNum > 0 ? `<div style="font-size: 11px; font-weight: 900; margin-top: 2px;">(CUSTOMER COPY ${copyNum + 1})</div>` : ''}
      </div>

      ${invoice.isRefund ? '<div class="refund-banner">*** REFUND RECEIPT ***</div>' : ''}

      <div class="double-line"></div>

      <table class="meta-table">
        <tr>
          <td class="meta-label">Order Type:</td>
          <td class="meta-val">${escapeHtml(invoice.orderType)}</td>
        </tr>
        <tr>
          <td class="meta-label">Invoice #:</td>
          <td class="meta-val">${escapeHtml(invoice.invoiceNumber)}</td>
        </tr>
        <tr>
          <td class="meta-label">Date/Time:</td>
          <td class="meta-val">${escapeHtml(invoice.dateTime)}</td>
        </tr>
        <tr>
          <td class="meta-label">Cashier:</td>
          <td class="meta-val">${escapeHtml(invoice.cashierName)}</td>
        </tr>
        ${invoice.orderType === 'Dine In' && invoice.tableNo ? `
        <tr>
          <td class="meta-label">Table No:</td>
          <td class="meta-val" style="font-size: ${is58 ? '12px' : '13px'}; font-weight: 900;">Table ${escapeHtml(invoice.tableNo)}</td>
        </tr>` : ''}
        ${invoice.customerName ? `
        <tr>
          <td class="meta-label">Customer:</td>
          <td class="meta-val">${escapeHtml(invoice.customerName)}</td>
        </tr>` : ''}
      </table>

      <table class="items-table">
        <thead>
          <tr>
            <th class="left col-qty">Qty</th>
            <th class="left col-item">Item</th>
            <th class="right col-price">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="dashed-line"></div>

      <table class="totals-table">
        <tr>
          <td>Subtotal:</td>
          <td class="right">Tk ${formatMoney(invoice.subtotal)}</td>
        </tr>
        ${invoice.discount > 0 ? `
        <tr>
          <td>Discount:</td>
          <td class="right">-Tk ${formatMoney(invoice.discount)}</td>
        </tr>` : ''}
        ${invoice.vat && invoice.vat > 0 ? `
        <tr>
          <td>VAT:</td>
          <td class="right">Tk ${formatMoney(invoice.vat)}</td>
        </tr>` : ''}
        ${invoice.serviceCharge && invoice.serviceCharge > 0 ? `
        <tr>
          <td>Service Charge:</td>
          <td class="right">Tk ${formatMoney(invoice.serviceCharge)}</td>
        </tr>` : ''}
      </table>

      <div class="double-line"></div>

      <table class="totals-table">
        <tr class="grand-total-row">
          <td>TOTAL:</td>
          <td class="right">Tk ${formatMoney(invoice.total)}</td>
        </tr>
      </table>

      <div class="double-line"></div>

      <table class="totals-table">
        ${invoice.splitPayments && invoice.splitPayments.length > 0 ? `
        <tr>
          <td colspan="2" style="font-weight: 900; border-bottom: 1.5px dashed #000; padding-bottom: 3px;">
            Payment (Split):
          </td>
        </tr>
        ${invoice.splitPayments.map(p => `
        <tr>
          <td style="padding-left: 6px; font-weight: 700;">* ${escapeHtml(p.method)}:</td>
          <td class="right">Tk ${formatMoney(p.amount)}</td>
        </tr>
        `).join('')}
        ` : `
        <tr>
          <td>Payment (${escapeHtml(invoice.paymentMethod)}):</td>
          <td class="right">Tk ${formatMoney(invoice.amountPaid)}</td>
        </tr>
        `}
        ${invoice.change > 0 ? `
        <tr>
          <td>Change:</td>
          <td class="right">Tk ${formatMoney(invoice.change)}</td>
        </tr>` : ''}
      </table>

      <div class="dashed-line"></div>

      <div class="footer">
        <div class="bold" style="font-size: ${is58 ? '11px' : '12px'};">Thank you for dining at Pizzora!</div>
        <div style="font-size: 10px; font-weight: 700; margin-top: 3px;">Powered by rizqara.tech</div>
      </div>

      <div class="cut-spacing"></div>
    </div>
  `;

  let fullBody = '';
  for (let i = 0; i < numCopies; i++) {
    fullBody += renderSingleReceipt(i);
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt - ${escapeHtml(invoice.invoiceNumber)}</title>
  <style>
    @page {
      size: ${widthMm} auto;
      margin: 0;
    }
    @media print {
      html, body {
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .no-print { display: none !important; }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: ${is58 ? '11px' : '12px'};
      font-weight: 700;
      line-height: 1.25;
      color: #000000;
      background: #ffffff;
      width: ${contentWidth};
      max-width: ${contentWidth};
      margin: 0 auto;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }
    .receipt-instance {
      width: ${contentWidth};
      max-width: ${contentWidth};
      box-sizing: border-box;
      margin: 0 auto;
      padding: 2mm 2mm 4mm 2mm;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-weight: 700;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .left { text-align: left; }
    .bold { font-weight: 800; }
    
    .header-brand {
      font-size: ${is58 ? '16px' : '19px'};
      font-weight: 900;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
      text-transform: uppercase;
      color: #000;
    }
    .header-info {
      font-size: ${is58 ? '10px' : '11px'};
      font-weight: 700;
      line-height: 1.25;
      margin-bottom: 1.5px;
      color: #000;
    }
    
    .refund-banner {
      border: 2px dashed #000;
      font-size: ${is58 ? '12px' : '14px'};
      font-weight: 900;
      padding: 4px;
      margin: 5px 0;
      text-align: center;
      color: #000;
    }

    .dashed-line {
      border-top: 1.5px dashed #000;
      margin: 5px 0;
    }
    .double-line {
      border-top: 2px solid #000;
      margin: 5px 0;
    }

    .meta-table {
      width: 100%;
      border-collapse: collapse;
      font-size: ${is58 ? '11px' : '12px'};
      margin: 3px 0;
    }
    .meta-table td {
      padding: 1.5px 0;
      color: #000;
      font-weight: 700;
    }
    .meta-table .meta-label {
      text-align: left;
      white-space: nowrap;
      width: 38%;
      font-weight: 800;
    }
    .meta-table .meta-val {
      text-align: right;
      padding-right: 2px;
      word-break: break-word;
      font-weight: 700;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0;
    }
    .items-table th {
      border-top: 1.5px dashed #000;
      border-bottom: 1.5px dashed #000;
      padding: 3px 0;
      font-weight: 900;
      font-size: ${is58 ? '11px' : '12px'};
      color: #000;
    }
    .items-table td {
      padding: 3px 0;
      vertical-align: top;
      font-size: ${is58 ? '11px' : '12px'};
      font-weight: 700;
      color: #000;
    }
    .col-qty { width: 14%; font-weight: 900; }
    .col-item { width: 54%; font-weight: 700; }
    .col-price { width: 32%; text-align: right; padding-right: 2px; font-weight: 800; white-space: nowrap; }
    .item-name { font-weight: 800; word-break: break-word; color: #000; }
    .item-variant { font-size: ${is58 ? '10px' : '11px'}; color: #000; font-weight: 700; }
    .item-note { font-size: ${is58 ? '10px' : '11px'}; font-style: italic; color: #000; font-weight: 800; margin-top: 1px; }

    .totals-table {
      width: 100%;
      border-collapse: collapse;
      margin: 3px 0;
      font-size: ${is58 ? '11px' : '12px'};
      font-weight: 700;
      color: #000;
    }
    .totals-table td {
      padding: 1.5px 0;
      color: #000;
    }
    .totals-table td.right {
      text-align: right;
      padding-right: 2px;
      font-weight: 800;
      white-space: nowrap;
    }
    .grand-total-row td {
      font-size: ${is58 ? '15px' : '17px'};
      font-weight: 900;
      padding: 4px 0;
      color: #000;
    }

    .footer {
      text-align: center;
      margin-top: 8px;
      font-size: ${is58 ? '10px' : '11px'};
      line-height: 1.3;
      color: #000;
    }
    .cut-spacing {
      height: 10mm;
    }
  </style>
</head>
<body>
  ${fullBody}
</body>
</html>`;
}

export function generateKOTHtml(invoice: InvoiceData, settings: PrinterSettings): string {
  const is58 = settings.paperWidth === '58mm';
  const widthMm = is58 ? '58mm' : '80mm';
  const contentWidth = is58 ? '46mm' : '68mm';

  const itemsHtml = invoice.items.map(item => {
    const variantStr = item.variant ? `<div style="font-size: ${is58 ? '11px' : '12px'}; font-weight: 700; margin-top: 1px;">(${escapeHtml(item.variant)})</div>` : '';
    const note = item.specialRequest || item.note;
    const noteStr = note ? `<div style="font-weight: 900; margin-top: 2px; padding: 2px 4px; border: 1.5px solid #000; background: #fff;">** ${escapeHtml(note)} **</div>` : '';
    return `
      <div style="margin-bottom: 7px; padding-bottom: 5px; border-bottom: 1.5px dashed #000;">
        <div style="display: flex; gap: 6px; align-items: flex-start;">
          <div style="font-size: ${is58 ? '15px' : '17px'}; font-weight: 900; min-width: 28px;">[ ${item.quantity} ]</div>
          <div style="flex: 1;">
            <div style="font-size: ${is58 ? '14px' : '16px'}; font-weight: 900; line-height: 1.2;">${escapeHtml(item.name)}</div>
            ${variantStr}
            ${noteStr}
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>KOT - ${escapeHtml(invoice.invoiceNumber)}</title>
  <style>
    @page {
      size: ${widthMm} auto;
      margin: 0;
    }
    @media print {
      html, body {
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .no-print { display: none !important; }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: ${is58 ? '11px' : '12px'};
      font-weight: 700;
      line-height: 1.25;
      color: #000000;
      background: #ffffff;
      width: ${contentWidth};
      max-width: ${contentWidth};
      margin: 0 auto;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }
    .kot-instance {
      width: ${contentWidth};
      max-width: ${contentWidth};
      box-sizing: border-box;
      margin: 0 auto;
      padding: 2mm 2mm 4mm 2mm;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-weight: 700;
    }
    .center { text-align: center; }
    .bold { font-weight: 900; }
    .kot-banner {
      border: 2px solid #000;
      padding: 5px;
      margin: 4px 0;
      text-align: center;
      font-size: ${is58 ? '15px' : '17px'};
      font-weight: 900;
      letter-spacing: 0.5px;
    }
    .kot-target {
      font-size: ${is58 ? '18px' : '22px'};
      font-weight: 900;
      padding: 5px 0;
      text-align: center;
      border-bottom: 2px solid #000;
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    .meta-line {
      display: flex;
      justify-content: space-between;
      font-size: ${is58 ? '11px' : '12px'};
      font-weight: 700;
      margin-bottom: 3px;
    }
    .cut-spacing {
      height: 10mm;
    }
  </style>
</head>
<body>
  <div class="kot-instance">
    <div class="center" style="font-size: 13px; font-weight: 900;">PIZZORA RESTAURANT</div>
    
    <div class="kot-banner">*** KITCHEN TICKET ***</div>

    <div class="kot-target">
      ${invoice.orderType === 'Dine In' && invoice.tableNo ? `TABLE ${escapeHtml(invoice.tableNo)}` : escapeHtml(invoice.orderType)}
    </div>

    <div class="meta-line">
      <span>Order: <strong>${escapeHtml(invoice.invoiceNumber)}</strong></span>
      <span>Time: <strong>${escapeHtml(invoice.dateTime)}</strong></span>
    </div>
    <div class="meta-line" style="margin-bottom: 8px;">
      <span>Cashier: ${escapeHtml(invoice.cashierName)}</span>
    </div>

    <div style="border-top: 2px solid #000; margin-bottom: 8px;"></div>

    <div>
      ${itemsHtml}
    </div>

    <div style="text-align: center; margin-top: 10px; font-size: 11px; font-weight: 800; border-top: 1.5px dashed #000; padding-top: 4px;">
      Kitchen Copy · Pizzora POS
    </div>

    <div class="cut-spacing"></div>
  </div>
</body>
</html>`;
}

export function printHtmlViaIframe(htmlContent: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return resolve(false);
    }

    try {
      const oldFrame = document.getElementById('pizzora-thermal-print-frame');
      if (oldFrame) {
        try { oldFrame.remove(); } catch {}
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'pizzora-thermal-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';

      document.body.appendChild(iframe);

      const iframeWindow = iframe.contentWindow;
      const iframeDoc = iframeWindow?.document || iframe.contentDocument;

      if (!iframeDoc || !iframeWindow) {
        resolve(false);
        return;
      }

      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      let hasPrinted = false;
      const executePrint = () => {
        if (hasPrinted) return;
        hasPrinted = true;
        try {
          iframeWindow.focus();
          iframeWindow.print();
          resolve(true);
        } catch (printErr) {
          console.error('[Browser Print] Iframe print failed:', printErr);
          resolve(false);
        } finally {
          setTimeout(() => {
            try { iframe.remove(); } catch {}
          }, 15000);
        }
      };

      if (iframeDoc.readyState === 'complete') {
        setTimeout(executePrint, 200);
      } else {
        iframe.onload = () => setTimeout(executePrint, 150);
        setTimeout(executePrint, 500);
      }
    } catch (e) {
      console.error('[Browser Print] Error setting up print iframe:', e);
      resolve(false);
    }
  });
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
