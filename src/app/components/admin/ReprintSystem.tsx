import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Printer, Clock, CheckCircle2, XCircle, Loader2,
  AlertTriangle, RefreshCw, RotateCcw, Receipt, Filter, Eye, Utensils, Globe, Monitor
} from 'lucide-react';
import { printerService, loadPrinterSettings, logPrintJob, type InvoiceData } from '../../utils/printerService';
import { getBackendUrl } from '../../context/AppContext';

export interface PrintJob {
  id: string;
  invoiceNumber: string;
  orderId: string;
  printedBy: string;
  printedAt: string;
  isReprint: boolean;
  reprintReason: string;
  status: 'success' | 'failed';
  paymentMethod: string;
  total: number;
  orderType?: string;
  customerName?: string;
  tableNo?: string;
  source?: 'pos' | 'table' | 'online' | 'admin';
  snapshot?: any;
}

const PZ = '#F9002B';
const BACKEND_URL = getBackendUrl();

function getToken() {
  return typeof window !== 'undefined'
    ? (sessionStorage.getItem('pizzora_token') || localStorage.getItem('pizzora_token') || '')
    : '';
}

function formatPrintDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

async function fetchPrintJobs(search = '', source = 'all', days = '2', skip = 0, limit = 50): Promise<{ jobs: PrintJob[]; total: number }> {
  const params = new URLSearchParams({
    limit: String(limit),
    skip: String(skip),
    days: String(days),
    ...(search ? { search } : {}),
    ...(source && source !== 'all' ? { source } : {}),
  });
  const token = getToken();
  const res = await fetch(`${BACKEND_URL}/api/print-jobs?${params}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new Error('Failed to fetch print jobs');
  const data = await res.json();
  return { jobs: data.printJobs || [], total: data.total || 0 };
}

// Fetch order details from server state to reconstruct receipt if snapshot not stored
async function fetchOrderById(orderId: string): Promise<any | null> {
  try {
    const token = getToken();
    const res = await fetch(`${BACKEND_URL}/api/state/admin`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) return null;
    const state = await res.json();
    const regularOrder = state.orders?.find((o: any) => o.id === orderId);
    if (regularOrder) return regularOrder;
    const tableOrder = state.tableOrders?.find((o: any) => o.id === orderId);
    if (tableOrder) return tableOrder;
    return null;
  } catch {
    return null;
  }
}

export function ReprintSystem() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [activeSource, setActiveSource] = useState<'all' | 'table' | 'pos' | 'online'>('all');
  const [daysRange, setDaysRange] = useState<'2' | 'all'>('2');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reprinting, setReprinting] = useState<string | null>(null);
  const [reprintResult, setReprintResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [showReasonModal, setShowReasonModal] = useState<PrintJob | null>(null);
  const [reprintReason, setReprintReason] = useState('');
  const [previewJob, setPreviewJob] = useState<PrintJob | null>(null);

  const loadJobs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { jobs: j, total: t } = await fetchPrintJobs(search, activeSource, daysRange);
      setJobs(j);
      setTotal(t);
    } catch (e: any) {
      setError(e.message || 'Error loading print jobs');
    } finally {
      setIsLoading(false);
    }
  }, [search, activeSource, daysRange]);

  // Synchronize any completed table/online orders that were missing from printjobs
  const handleSyncMissing = async () => {
    setIsSyncing(true);
    try {
      const token = getToken();
      const res = await fetch(`${BACKEND_URL}/api/print-jobs/sync-missing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        await loadJobs();
      }
    } catch (err) {
      console.warn('Sync missing print jobs failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const s = loadPrinterSettings();
    if (s.printMode === 'qz' && printerService.getStatus() !== 'online') {
      setTimeout(() => printerService.connect(), 1000);
    }
    // Auto sync on mount to ensure table orders & online orders are always included
    handleSyncMissing();
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleReprint = async (job: PrintJob, reason: string) => {
    setReprinting(job.id);
    setReprintResult(null);
    setShowReasonModal(null);

    const settings = loadPrinterSettings();
    let invoiceData: InvoiceData;

    // 1. If snapshot was saved directly in PrintJob, use it with 100% fidelity!
    if (job.snapshot && job.snapshot.items && job.snapshot.items.length > 0) {
      invoiceData = {
        ...job.snapshot,
        invoiceNumber: job.invoiceNumber,
        orderId: job.orderId,
        isRefund: false,
      };
    } else {
      // 2. Fetch original order from DB state
      const order = await fetchOrderById(job.orderId);
      if (order) {
        const isTable = Boolean(order.isTableOrder || (order.address && order.address.toLowerCase().includes('table')) || order.tableNumber || job.tableNo);
        const items = (order.items || []).map((item: any) => ({
          name: item.name || item.item?.name || 'Item',
          quantity: item.quantity || 1,
          price: item.price || item.item?.price || 0,
          variant: item.variant,
          note: item.note || item.specialRequest,
        }));
        const itemsSubtotal = items.reduce((s: number, i: any) => s + (i.price * i.quantity), 0);
        const subtotal = order.subtotal !== undefined ? order.subtotal : itemsSubtotal;
        const deliveryFee = order.deliveryFee !== undefined
          ? Number(order.deliveryFee)
          : Math.max(0, (Number(order.total) || 0) - subtotal);
        const orderTotalNum = Number(order.total) || Number(job.total) || 0;
        const discount = order.discount || 0;
        const isLegacyCombined = deliveryFee > 0 && orderTotalNum >= (subtotal - discount + deliveryFee - 0.5);
        const slipTotal = isLegacyCombined ? orderTotalNum : (orderTotalNum + deliveryFee);

        invoiceData = {
          invoiceNumber: job.invoiceNumber,
          orderId: job.orderId,
          orderType: isTable ? `Dine In — Table ${order.tableNumber || job.tableNo || ''}` : (order.orderType || job.orderType || 'Delivery'),
          tableNo: order.tableNumber ? String(order.tableNumber) : (job.tableNo || undefined),
          customerName: order.customerName || job.customerName || undefined,
          customerPhone: order.phone || undefined,
          deliveryAddress: order.address || undefined,
          deliveryFee: deliveryFee > 0 ? deliveryFee : undefined,
          riderNote: order.notes || undefined,
          cashierName: job.printedBy || 'Cashier',
          dateTime: new Date(job.printedAt || Date.now()).toLocaleString(),
          items,
          subtotal,
          discount: order.discount || 0,
          total: slipTotal,
          paymentMethod: order.paymentMethod || job.paymentMethod || 'Cash',
          splitPayments: order.splitPayments,
          amountPaid: slipTotal,
          change: 0,
        };
      } else {
        // 3. Fallback: reconstruct a clean receipt directly from PrintJob metadata so reprint never fails
        invoiceData = {
          invoiceNumber: job.invoiceNumber,
          orderId: job.orderId,
          orderType: job.orderType || (job.source === 'table' ? 'Dine In' : (job.source === 'online' ? 'Online Order' : 'POS')),
          tableNo: job.tableNo || undefined,
          customerName: job.customerName || undefined,
          cashierName: job.printedBy || 'Cashier',
          dateTime: new Date(job.printedAt || Date.now()).toLocaleString(),
          items: [
            {
              name: `Order Receipt (${job.invoiceNumber})`,
              quantity: 1,
              price: job.total || 0,
            }
          ],
          subtotal: job.total || 0,
          discount: 0,
          total: job.total || 0,
          paymentMethod: job.paymentMethod || 'Cash',
          amountPaid: job.total || 0,
          change: 0,
        };
      }
    }

    const result = await printerService.printReceipt(invoiceData, settings, {
      skipAutoLog: true, // we log manually below as a reprint
      isReprint: true,
      reprintReason: reason,
      source: job.source,
    });

    // Log the reprint attempt
    await logPrintJob({
      invoiceNumber: job.invoiceNumber,
      orderId: job.orderId,
      printedBy: `${sessionStorage.getItem('pizzora_admin_name') || 'Admin'} (Reprint)`,
      isReprint: true,
      reprintReason: reason,
      status: result.success ? 'success' : 'failed',
      paymentMethod: job.paymentMethod,
      total: job.total,
      orderType: job.orderType,
      customerName: job.customerName,
      tableNo: job.tableNo,
      source: job.source,
      snapshot: invoiceData,
    });

    setReprinting(null);
    setReprintResult({
      id: job.id,
      success: result.success,
      message: result.success ? 'Receipt reprinted successfully!' : (result.error || 'Reprint failed'),
    });

    setTimeout(loadJobs, 1200);
  };

  const getSourceBadge = (job: PrintJob) => {
    const src = job.source || (job.tableNo || job.orderType?.toLowerCase().includes('table') ? 'table' : (job.orderType?.toLowerCase().includes('online') || job.orderId.startsWith('PIZO') ? 'online' : 'pos'));
    if (src === 'table') {
      return (
        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '8px', background: '#DCFCE7', color: '#15803D', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Utensils size={12} /> {job.tableNo ? `Table ${job.tableNo}` : 'Table Dine-In'}
        </span>
      );
    }
    if (src === 'online') {
      return (
        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '8px', background: '#DBEAFE', color: '#1D4ED8', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Globe size={12} /> Online Order
        </span>
      );
    }
    return (
      <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '8px', background: '#FFEDD5', color: '#C2410C', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <Monitor size={12} /> POS Counter
      </span>
    );
  };

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    border: '1.5px solid rgba(249,0,43,0.12)',
    borderRadius: '16px',
    padding: '14px 18px',
    marginBottom: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    flexWrap: 'wrap',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 16px', fontFamily: 'var(--font-body)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: `linear-gradient(135deg, ${PZ}, #c8001f)`, borderRadius: '16px', padding: '14px', boxShadow: '0 8px 20px rgba(249,0,43,0.25)' }}>
            <RotateCcw size={26} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#111', margin: 0, letterSpacing: '-0.5px' }}>
              Universal Reprint System
            </h2>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: '3px 0 0 0' }}>
              {daysRange === '2' ? (
                <>Last <strong>2 Days</strong> (Today & Yesterday) · <strong>{total}</strong> prints recorded</>
              ) : (
                <>All Time History · <strong>{total}</strong> prints recorded</>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={handleSyncMissing}
          disabled={isSyncing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '12px',
            background: '#F3F4F6',
            border: '1px solid #E5E7EB',
            color: '#374151',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
          title="Scan orders and sync any unrecorded prints"
        >
          <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
          {isSyncing ? 'Syncing Prints…' : 'Sync All Prints'}
        </button>
      </div>

      {/* Filter Tabs & Time Range Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {/* Source Tabs: All, Tables, POS, Online */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: 'All Prints', icon: Receipt },
            { key: 'table', label: 'Table Management', icon: Utensils },
            { key: 'pos', label: 'POS Counter', icon: Monitor },
            { key: 'online', label: 'Online Orders', icon: Globe },
          ].map(tab => {
            const Icon = tab.icon;
            const isSelected = activeSource === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveSource(tab.key as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: isSelected ? `2px solid ${PZ}` : '1.5px solid #E5E7EB',
                  background: isSelected ? '#FEF2F2' : '#fff',
                  color: isSelected ? PZ : '#4B5563',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={14} color={isSelected ? PZ : '#6B7280'} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 2 Days vs All Time Toggle */}
        <div style={{ display: 'flex', background: '#F3F4F6', padding: '3px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
          <button
            onClick={() => setDaysRange('2')}
            style={{
              padding: '7px 14px',
              borderRadius: '9px',
              fontSize: '12.5px',
              fontWeight: 700,
              border: 'none',
              background: daysRange === '2' ? '#fff' : 'transparent',
              color: daysRange === '2' ? PZ : '#6B7280',
              boxShadow: daysRange === '2' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Last 2 Days
          </button>
          <button
            onClick={() => setDaysRange('all')}
            style={{
              padding: '7px 14px',
              borderRadius: '9px',
              fontSize: '12.5px',
              fontWeight: 700,
              border: 'none',
              background: daysRange === 'all' ? '#fff' : 'transparent',
              color: daysRange === 'all' ? PZ : '#6B7280',
              boxShadow: daysRange === 'all' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            All History
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
        <input
          type="text"
          placeholder="Search by invoice (PIZ-2026-002052), Table number, Customer name, Order ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '13px 16px 13px 46px',
            borderRadius: '14px',
            border: '1.5px solid rgba(249,0,43,0.22)',
            fontSize: '14px',
            outline: 'none',
            boxSizing: 'border-box',
            backgroundColor: '#fff',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{ position: 'absolute', right: '40px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '13px' }}
          >
            Clear
          </button>
        )}
        <button
          onClick={loadJobs}
          style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
          title="Refresh list"
        >
          <RefreshCw size={17} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Results List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#6B7280' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px', color: PZ }} />
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Loading print records…</p>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '32px', color: '#DC2626', background: '#FEF2F2', borderRadius: '16px', border: '1px solid #FCA5A5' }}>
          <AlertTriangle size={28} style={{ margin: '0 auto 10px' }} />
          <p style={{ margin: 0, fontWeight: 700 }}>{error}</p>
        </div>
      ) : jobs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#9CA3AF', background: '#fff', borderRadius: '16px', border: '1px dashed #E5E7EB' }}>
          <Receipt size={44} style={{ margin: '0 auto 14px', opacity: 0.35 }} />
          <h4 style={{ margin: '0 0 6px', fontSize: '16px', color: '#374151', fontWeight: 700 }}>
            {search ? 'No print records matching your search' : 'No print jobs recorded in this category yet'}
          </h4>
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#6B7280' }}>
            When an order is printed from Table Management, POS, or Online Orders, it appears here automatically.
          </p>
          <button
            onClick={handleSyncMissing}
            style={{ padding: '8px 16px', borderRadius: '10px', background: PZ, color: '#fff', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
          >
            Scan & Sync Recent Orders
          </button>
        </div>
      ) : (
        jobs.map(job => (
          <div key={job.id} style={cardStyle}>
            {/* Left Area: Status Dot + Invoice + Badges + Metadata */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 360px', minWidth: '260px' }}>
              {/* Status Indicator Dot */}
              <span
                style={{
                  width: '11px',
                  height: '11px',
                  borderRadius: '50%',
                  backgroundColor: job.status === 'success' ? '#16A34A' : '#DC2626',
                  flexShrink: 0,
                  boxShadow: job.status === 'success' ? '0 0 8px rgba(22,163,74,0.4)' : '0 0 8px rgba(220,38,38,0.4)',
                }}
                title={job.status === 'success' ? 'Print Success' : 'Print Failed'}
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Line 1: Invoice Number & Badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 900, color: '#111', fontFamily: 'monospace', letterSpacing: '-0.2px' }}>
                    {job.invoiceNumber}
                  </span>
                  {getSourceBadge(job)}
                  {job.isReprint && (
                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '99px', background: '#EDE9FE', color: '#6D28D9', whiteSpace: 'nowrap' }}>
                      REPRINT
                    </span>
                  )}
                  {job.status === 'failed' && (
                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '99px', background: '#FEE2E2', color: '#991B1B', whiteSpace: 'nowrap' }}>
                      FAILED
                    </span>
                  )}
                </div>

                {/* Line 2: Compact, Unbroken Metadata Row */}
                <div style={{ fontSize: '12px', color: '#6B7280', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', lineHeight: 1.4 }}>
                  {job.customerName && (
                    <span style={{ fontWeight: 700, color: '#1F2937', whiteSpace: 'nowrap' }}>
                      {job.customerName}
                    </span>
                  )}
                  {job.customerName && <span style={{ color: '#D1D5DB' }}>•</span>}

                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', color: '#4B5563' }}>
                    <Clock size={12} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                    {formatPrintDate(job.printedAt)}
                  </span>

                  <span style={{ color: '#D1D5DB' }}>•</span>

                  <span style={{ whiteSpace: 'nowrap', color: '#4B5563' }}>
                    By: <strong style={{ color: '#1F2937', fontWeight: 600 }}>{job.printedBy}</strong>
                  </span>

                  <span style={{ color: '#D1D5DB' }}>•</span>

                  <span style={{ background: '#F3F4F6', color: '#374151', padding: '1px 7px', borderRadius: '5px', fontWeight: 700, fontSize: '11px', whiteSpace: 'nowrap', border: '1px solid #E5E7EB' }}>
                    {job.paymentMethod || 'Cash'}
                  </span>
                </div>

                {job.isReprint && job.reprintReason && (
                  <p style={{ fontSize: '11px', color: '#6D28D9', margin: '4px 0 0', fontStyle: 'italic' }}>
                    Reason: {job.reprintReason}
                  </p>
                )}
              </div>
            </div>

            {/* Reprint result notification if present */}
            {reprintResult?.id === job.id && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: reprintResult.success ? '#F0FDF4' : '#FEF2F2' }}>
                {reprintResult.success ? <CheckCircle2 size={14} color="#16A34A" /> : <XCircle size={14} color="#DC2626" />}
                <span style={{ fontSize: '12px', fontWeight: 700, color: reprintResult.success ? '#15803D' : '#DC2626' }}>
                  {reprintResult.message}
                </span>
              </div>
            )}

            {/* Right Area: Total Amount + Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0, justifyContent: 'flex-end', marginLeft: 'auto' }}>
              {/* Total Amount */}
              <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Total
                </div>
                <div style={{ fontSize: '17px', fontWeight: 900, color: PZ, lineHeight: 1.1 }}>
                  ৳{job.total?.toFixed(2)}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {job.snapshot && (
                  <button
                    onClick={() => setPreviewJob(job)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: '1px solid #D1D5DB',
                      background: '#F9FAFB',
                      color: '#4B5563',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                    title="Preview Items"
                  >
                    <Eye size={13} /> View
                  </button>
                )}

                <button
                  onClick={() => { setShowReasonModal(job); setReprintReason(''); }}
                  disabled={reprinting === job.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: `1.5px solid ${PZ}`,
                    background: 'transparent',
                    color: PZ,
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    opacity: reprinting === job.id ? 0.6 : 1,
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {reprinting === job.id ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
                  {reprinting === job.id ? 'Printing…' : 'Reprint'}
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      {/* Snapshot Preview Modal */}
      {previewJob && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #E5E7EB', paddingBottom: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>Invoice: {previewJob.invoiceNumber}</h3>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>Order ID: {previewJob.orderId}</span>
              </div>
              <button
                onClick={() => setPreviewJob(null)}
                style={{ background: '#F3F4F6', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '13px', marginBottom: '16px', lineHeight: '1.6' }}>
              <div><strong>Customer:</strong> {previewJob.customerName || previewJob.snapshot?.customerName || 'Guest'}</div>
              <div><strong>Type:</strong> {previewJob.orderType || previewJob.snapshot?.orderType || 'Standard'}</div>
              <div><strong>Payment:</strong> {previewJob.paymentMethod}</div>
              <div><strong>Printed:</strong> {new Date(previewJob.printedAt).toLocaleString()}</div>
            </div>

            <div style={{ background: '#F9FAFB', borderRadius: '12px', padding: '12px', marginBottom: '16px' }}>
              <div style={{ fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', color: '#6B7280', marginBottom: '8px' }}>
                Items
              </div>
              {(previewJob.snapshot?.items || []).length > 0 ? (
                previewJob.snapshot.items.map((it: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0', borderBottom: '1px dashed #E5E7EB' }}>
                    <span>{it.quantity}x {it.name}</span>
                    <span style={{ fontWeight: 600 }}>৳{(it.price * it.quantity).toFixed(2)}</span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Item details not recorded in legacy print. Total: ৳{previewJob.total}</div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '15px', marginTop: '10px', paddingTop: '8px', borderTop: '2px solid #E5E7EB', color: PZ }}>
                <span>Total</span>
                <span>৳{previewJob.total?.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setPreviewJob(null)}
                style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1.5px solid #E5E7EB', background: 'transparent', color: '#374151', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  const targetJob = previewJob;
                  setPreviewJob(null);
                  setShowReasonModal(targetJob);
                }}
                style={{ flex: 1, padding: '11px', borderRadius: '10px', background: PZ, color: '#fff', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Printer size={15} /> Reprint Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reprint Reason Modal */}
      {showReasonModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800 }}>Reprint Receipt</h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#6B7280' }}>
              Invoice: <strong>{showReasonModal.invoiceNumber}</strong> ({showReasonModal.orderType || showReasonModal.source})
            </p>

            <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Reason for Reprint (optional)
            </label>
            <input
              type="text"
              value={reprintReason}
              onChange={e => setReprintReason(e.target.value)}
              placeholder="e.g. Customer requested copy / paper jammed"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid rgba(249,0,43,0.2)', fontSize: '13px', outline: 'none', marginBottom: '20px', boxSizing: 'border-box' }}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleReprint(showReasonModal, reprintReason)}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowReasonModal(null)}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid #E5E7EB', background: 'transparent', color: '#374151', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleReprint(showReasonModal, reprintReason)}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', background: PZ, color: '#fff', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Printer size={15} /> Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
