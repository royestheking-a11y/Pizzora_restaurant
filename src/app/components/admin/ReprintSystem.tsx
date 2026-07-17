import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Printer, Clock, CheckCircle2, XCircle, Loader2,
  AlertTriangle, RefreshCw, RotateCcw, Receipt
} from 'lucide-react';
import { printerService, loadPrinterSettings, logPrintJob, type InvoiceData } from '../../utils/printerService';

interface PrintJob {
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
}

import { getBackendUrl } from '../../context/AppContext';

const PZ = '#F9002B';
const BACKEND_URL = getBackendUrl();

function getToken() {
  return typeof window !== 'undefined' ? sessionStorage.getItem('pizzora_token') : '';
}

async function fetchPrintJobs(search = '', skip = 0, limit = 30): Promise<{ jobs: PrintJob[]; total: number }> {
  const params = new URLSearchParams({ limit: String(limit), skip: String(skip), ...(search ? { search } : {}) });
  const res = await fetch(`${BACKEND_URL}/api/print-jobs?${params}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed to fetch print jobs');
  const data = await res.json();
  return { jobs: data.printJobs || [], total: data.total || 0 };
}

// Fetch order details from the orders endpoint to reconstruct receipt
async function fetchOrderById(orderId: string): Promise<any | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/state/admin`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) return null;
    const state = await res.json();
    return state.orders?.find((o: any) => o.id === orderId) || null;
  } catch {
    return null;
  }
}

export function ReprintSystem() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reprinting, setReprinting] = useState<string | null>(null);
  const [reprintResult, setReprintResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [showReasonModal, setShowReasonModal] = useState<PrintJob | null>(null);
  const [reprintReason, setReprintReason] = useState('');

  const loadJobs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { jobs: j, total: t } = await fetchPrintJobs(search);
      setJobs(j);
      setTotal(t);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (printerService.getStatus() !== 'online') {
      setTimeout(() => printerService.connect(), 1000);
    }
    loadJobs();
  }, [loadJobs]);

  const handleReprint = async (job: PrintJob, reason: string) => {
    setReprinting(job.id);
    setReprintResult(null);
    setShowReasonModal(null);

    // Fetch the original order from DB to reconstruct receipt
    const order = await fetchOrderById(job.orderId);
    const settings = loadPrinterSettings();

    let result: { success: boolean; error?: string };
    if (order) {
      const invoiceData: InvoiceData = {
        invoiceNumber: job.invoiceNumber,
        orderId: job.orderId,
        orderType: order.address?.includes('Table') ? 'Dine In' : (order.address || 'POS'),
        tableNo: order.address?.includes('Table') ? order.address.replace('Table ', '') : undefined,
        customerName: order.customerName || undefined,
        cashierName: job.printedBy || 'Admin',
        dateTime: new Date(job.printedAt).toLocaleString(),
        items: (order.items || []).map((item: any) => ({
          name: item.item?.name || item.name || 'Item',
          quantity: item.quantity || 1,
          price: item.item?.price || item.price || 0,
        })),
        subtotal: order.total || job.total,
        discount: 0,
        total: order.total || job.total,
        paymentMethod: order.paymentMethod || job.paymentMethod || 'Cash',
        amountPaid: order.total || job.total,
        change: 0,
      };
      result = await printerService.printReceipt(invoiceData, settings);
    } else {
      result = { success: false, error: 'Could not load original order data to reprint.' };
    }

    // Log the reprint attempt
    await logPrintJob({
      invoiceNumber: job.invoiceNumber,
      orderId: job.orderId,
      printedBy: 'Admin (Reprint)',
      isReprint: true,
      reprintReason: reason,
      status: result.success ? 'success' : 'failed',
      paymentMethod: job.paymentMethod,
      total: job.total,
    });

    setReprinting(null);
    setReprintResult({
      id: job.id,
      success: result.success,
      message: result.success ? 'Receipt reprinted successfully!' : (result.error || 'Reprint failed'),
    });

    // Refresh list to show new reprint entry
    setTimeout(loadJobs, 1000);
  };

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    border: '1.5px solid rgba(249,0,43,0.10)',
    borderRadius: '14px',
    padding: '16px 20px',
    marginBottom: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    flexWrap: 'wrap',
  };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '24px 16px', fontFamily: 'var(--font-body)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: `linear-gradient(135deg, ${PZ}, #c8001f)`, borderRadius: '14px', padding: '12px' }}>
          <RotateCcw size={24} color="#fff" />
        </div>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#111', margin: 0 }}>Reprint System</h2>
          <p style={{ fontSize: '13px', color: '#6B7280', margin: '2px 0 0 0' }}>Search invoices and reprint receipts · {total} total print records</p>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
        <input
          type="text"
          placeholder="Search by invoice number (PIZ-2026-000001) or order ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '12px 14px 12px 40px', borderRadius: '12px', border: '1.5px solid rgba(249,0,43,0.2)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
        />
        <button onClick={loadJobs} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}>
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Results */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
          <p style={{ margin: 0, fontSize: '14px' }}>Loading print history…</p>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '32px', color: '#DC2626', background: '#FEF2F2', borderRadius: '12px' }}>
          <AlertTriangle size={24} style={{ margin: '0 auto 8px' }} />
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      ) : jobs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#9CA3AF' }}>
          <Receipt size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p style={{ margin: 0, fontSize: '15px' }}>{search ? 'No results found' : 'No print jobs recorded yet'}</p>
        </div>
      ) : (
        jobs.map(job => (
          <div key={job.id} style={cardStyle}>
            {/* Status dot */}
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: job.status === 'success' ? '#16A34A' : '#DC2626', flexShrink: 0 }} />

            {/* Invoice info */}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#111' }}>{job.invoiceNumber}</span>
                {job.isReprint && (
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: '#EDE9FE', color: '#6D28D9' }}>REPRINT</span>
                )}
                {job.status === 'failed' && (
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: '#FEE2E2', color: '#991B1B' }}>FAILED</span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '3px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <span><Clock size={11} style={{ verticalAlign: 'middle', marginRight: '3px' }} />{new Date(job.printedAt).toLocaleString()}</span>
                <span>·</span>
                <span>By: {job.printedBy}</span>
                <span>·</span>
                <span>{job.paymentMethod}</span>
                <span>·</span>
                <span style={{ fontWeight: 600, color: '#111' }}>৳{job.total?.toFixed(2)}</span>
              </div>
              {job.isReprint && job.reprintReason && (
                <p style={{ fontSize: '11px', color: '#6D28D9', margin: '4px 0 0', fontStyle: 'italic' }}>Reason: {job.reprintReason}</p>
              )}
            </div>

            {/* Reprint result for this job */}
            {reprintResult?.id === job.id && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: reprintResult.success ? '#F0FDF4' : '#FEF2F2' }}>
                {reprintResult.success
                  ? <CheckCircle2 size={14} color="#16A34A" />
                  : <XCircle size={14} color="#DC2626" />
                }
                <span style={{ fontSize: '12px', fontWeight: 600, color: reprintResult.success ? '#15803D' : '#DC2626' }}>
                  {reprintResult.message}
                </span>
              </div>
            )}

            {/* Reprint button */}
            <button
              onClick={() => { setShowReasonModal(job); setReprintReason(''); }}
              disabled={reprinting === job.id}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '10px', border: `1.5px solid ${PZ}`, background: 'transparent', color: PZ, fontSize: '13px', fontWeight: 700, cursor: 'pointer', flexShrink: 0, opacity: reprinting === job.id ? 0.6 : 1 }}
            >
              {reprinting === job.id ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
              {reprinting === job.id ? 'Printing…' : 'Reprint'}
            </button>
          </div>
        ))
      )}

      {/* Reprint Reason Modal */}
      {showReasonModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800 }}>Reprint Receipt</h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#6B7280' }}>Invoice: <strong>{showReasonModal.invoiceNumber}</strong></p>

            <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Reason for Reprint (optional)
            </label>
            <input
              type="text"
              value={reprintReason}
              onChange={e => setReprintReason(e.target.value)}
              placeholder="e.g. Customer requested another copy"
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
