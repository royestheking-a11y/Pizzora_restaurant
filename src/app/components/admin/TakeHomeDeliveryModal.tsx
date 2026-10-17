import React, { useState, useMemo } from 'react';
import {
  Truck, Phone, MapPin, X, Plus, Minus, Trash2, Search, User, ChefHat,
  Clock, CreditCard, Sparkles, AlertCircle, Printer, FileText, Check, CheckCircle2,
  Loader2
} from 'lucide-react';
import { useApp, Order, OrderStatus, MenuItem } from '../../context/AppContext';
import { generateInvoiceNumber, printerService, loadPrinterSettings, type InvoiceData } from '../../utils/printerService';

export interface TakeHomeDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated?: (order: Order) => void;
}

export const SYLHET_AREAS = [
  { name: 'Zindabazar', fee: 40 },
  { name: 'Amberkhana', fee: 50 },
  { name: 'Subidbazar', fee: 50 },
  { name: 'Shibganj', fee: 60 },
  { name: 'Upashohor', fee: 60 },
  { name: 'Kumarpara', fee: 40 },
  { name: 'Chowhatta', fee: 40 },
  { name: 'Mira Bazar', fee: 50 },
  { name: 'Lamabazar', fee: 50 },
  { name: 'Tilagarh', fee: 70 },
  { name: 'South Surma / Kadamtoli', fee: 80 },
  { name: 'Akhalia / SUST', fee: 80 },
  { name: 'Airport Road', fee: 90 },
  { name: 'Custom Area', fee: 50 },
];

export function TakeHomeDeliveryModal({ isOpen, onClose, onOrderCreated }: TakeHomeDeliveryModalProps) {
  const { state, dispatch, showNotification, refreshAnalytics } = useApp();

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('Zindabazar');
  const [fee, setFee] = useState<number>(40);
  const [paymentMethod, setPaymentMethod] = useState<'Cash on Delivery' | 'bKash' | 'Nagad' | 'Card' | 'Staff Tab' | 'Complimentary'>('Cash on Delivery');
  const [riderNote, setRiderNote] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ item: MenuItem; quantity: number; note?: string }[]>([]);
  const [menuSearch, setMenuSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<'pending' | 'kitchen' | 'confirm' | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ phone?: boolean; address?: boolean; items?: boolean }>({});
  const [printReceiptOnConfirm, setPrintReceiptOnConfirm] = useState(true);
  const [printKOTOnConfirm, setPrintKOTOnConfirm] = useState(false);
  const [initialStatus, setInitialStatus] = useState<OrderStatus>('Preparing');
  const [printFeedback, setPrintFeedback] = useState<string | null>(null);
  const [isPrintingPreview, setIsPrintingPreview] = useState(false);

  const resetForm = () => {
    setCustomerName('');
    setPhone('');
    setAddress('');
    setRiderNote('');
    setSelectedItems([]);
    setValidationError(null);
    setFieldErrors({});
    setPrintFeedback(null);
    setSubmittingAction(null);
  };

  const handleModalClose = () => {
    resetForm();
    onClose();
  };

  const handleSelectArea = (areaName: string) => {
    setArea(areaName);
    const found = SYLHET_AREAS.find(a => a.name === areaName);
    if (found) {
      setFee(found.fee);
    }
  };

  const menuCategories = useMemo(() => {
    const cats = new Set<string>();
    (state.menuItems || []).forEach(m => {
      if (m.category && m.category.trim()) {
        cats.add(m.category.trim());
      }
    });
    return ['All', ...Array.from(cats)];
  }, [state.menuItems]);

  const filteredItems = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    return (state.menuItems || []).filter(item => {
      const matchCat = category === 'All' || (item.category && item.category.trim().toLowerCase() === category.toLowerCase());
      const matchSearch = !q ||
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [state.menuItems, category, menuSearch]);

  const addItem = (item: MenuItem) => {
    setValidationError(null);
    setFieldErrors(prev => ({ ...prev, items: false }));
    setSelectedItems(prev => {
      const existing = prev.find(p => p.item.id === item.id);
      if (existing) {
        return prev.map(p => p.item.id === item.id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const updateItemQty = (itemId: string, delta: number) => {
    setSelectedItems(prev => {
      return prev
        .map(p => {
          if (p.item.id === itemId) {
            const newQty = p.quantity + delta;
            return newQty > 0 ? { ...p, quantity: newQty } : null;
          }
          return p;
        })
        .filter(Boolean) as { item: MenuItem; quantity: number; note?: string }[];
    });
  };

  const updateItemNote = (itemId: string, note: string) => {
    setSelectedItems(prev => prev.map(p => p.item.id === itemId ? { ...p, note } : p));
  };

  const removeItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(p => p.item.id !== itemId));
  };

  const subtotal = useMemo(() => {
    return selectedItems.reduce((acc, c) => acc + (c.item.price * c.quantity), 0);
  }, [selectedItems]);

  const deliveryCharge = Number(fee || 0);
  const grandTotal = subtotal + deliveryCharge; // Total to collect from customer (printed on slip)
  const orderBalance = paymentMethod === 'Complimentary' ? 0 : subtotal; // Restaurant revenue/balance saved in system

  const handlePrePrintBill = async () => {
    if (selectedItems.length === 0) {
      setValidationError('Please add at least 1 food item to preview print bill.');
      setFieldErrors({ items: true });
      showNotification('Please add at least 1 food item to preview print.', 'error');
      return;
    }
    setIsPrintingPreview(true);
    try {
      const fullAddress = `${address.trim()}${area ? ` [${area}]` : ''}`;
      const settings = loadPrinterSettings();
      const customerPayable = paymentMethod === 'Complimentary' ? 0 : grandTotal;
      const invoiceData: InvoiceData = {
        invoiceNumber: 'DRAFT-' + String(Date.now()).slice(-5),
        orderId: 'DRAFT',
        orderType: 'Delivery (Pre-Bill)',
        customerName: customerName.trim() || 'Home Delivery Guest',
        customerPhone: phone.trim() || undefined,
        deliveryAddress: fullAddress || undefined,
        deliveryFee: deliveryCharge,
        riderNote: riderNote.trim() || undefined,
        cashierName: sessionStorage.getItem('pizzora_admin_name') || 'Cashier',
        dateTime: new Date().toLocaleString(),
        items: selectedItems.map(c => ({
          name: c.item.name,
          quantity: c.quantity,
          price: c.item.price,
          variant: (c.item as any).variant,
          specialRequest: c.note,
          note: c.note,
        })),
        subtotal,
        discount: paymentMethod === 'Complimentary' ? subtotal : 0,
        total: customerPayable,
        paymentMethod,
        amountPaid: customerPayable,
        change: 0,
      };
      await printerService.printReceipt(invoiceData, settings, { source: 'online', skipAutoLog: true });
      showNotification('Delivery pre-print bill sent to printer', 'info');
    } catch (err: any) {
      showNotification('Pre-print error: ' + (err?.message || ''), 'error');
    } finally {
      setIsPrintingPreview(false);
    }
  };

  const handleCreateOrder = async (
    targetStatus?: OrderStatus,
    options?: { printReceipt?: boolean; printKOT?: boolean }
  ) => {
    setValidationError(null);
    setFieldErrors({});

    // 1. Food items are required for all delivery orders
    if (selectedItems.length === 0) {
      const msg = 'Please select at least 1 menu item to place the order.';
      setValidationError(msg);
      setFieldErrors({ items: true });
      showNotification(msg, 'error');
      return;
    }

    const isPendingDraft = targetStatus === 'Pending';
    const isKitchenDispatch = targetStatus === 'Preparing' && options?.printReceipt === false;

    // 2. Strict validation for final Confirm & Print Delivery
    if (!isPendingDraft && !isKitchenDispatch) {
      if (!phone.trim()) {
        const msg = 'Customer phone number is required to confirm delivery order.';
        setValidationError(msg);
        setFieldErrors({ phone: true });
        showNotification(msg, 'error');
        return;
      }
      if (!address.trim()) {
        const msg = 'Delivery address (House / Road / Area) is required to confirm order.';
        setValidationError(msg);
        setFieldErrors({ address: true });
        showNotification(msg, 'error');
        return;
      }
    }

    const finalStatus = targetStatus !== undefined ? targetStatus : initialStatus;
    const shouldPrintReceipt = options?.printReceipt !== undefined ? options.printReceipt : printReceiptOnConfirm;
    const shouldPrintKOT = options?.printKOT !== undefined ? options.printKOT : printKOTOnConfirm;

    setIsSubmitting(true);
    setSubmittingAction(isPendingDraft ? 'pending' : isKitchenDispatch ? 'kitchen' : 'confirm');
    setPrintFeedback(null);

    try {
      let invNo = '';
      try {
        invNo = await generateInvoiceNumber();
      } catch {
        invNo = `PIZD-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      }

      // Safe fallback address/phone for draft orders so staff are never blocked
      const finalPhone = phone.trim() || (isPendingDraft ? 'Phone not provided' : 'Customer on call');
      const fullAddress = address.trim()
        ? `${address.trim()}${area ? ` [${area}]` : ''}`
        : area
        ? `Area: ${area} (Exact address pending)`
        : isPendingDraft
        ? 'Address pending confirmation'
        : 'Take Home Delivery';

      // Restaurant order balance: ONLY the food subtotal (excludes delivery fee, which rider receives)
      const orderBalance = paymentMethod === 'Complimentary' ? 0 : subtotal;
      const customerPayable = paymentMethod === 'Complimentary' ? 0 : grandTotal;

      const newOrder: Order = {
        id: `del-${Date.now()}`,
        orderNumber: invNo,
        customerName: customerName.trim() || 'Home Delivery Guest',
        phone: finalPhone,
        address: fullAddress,
        items: selectedItems.map(c => ({
          item: c.item,
          quantity: c.quantity,
          specialRequest: c.note || '',
        })),
        subtotal: subtotal,
        deliveryFee: deliveryCharge,
        discount: paymentMethod === 'Complimentary' ? subtotal : 0,
        total: orderBalance, // Saved in system/database as ONLY the food order balance (e.g. ৳50)
        status: finalStatus,
        paymentMethod: paymentMethod,
        compDetails: paymentMethod === 'Complimentary' ? {
          guestName: customerName.trim() || 'Complimentary Delivery',
          reason: 'Owner / Partner Guest',
          authorizedBy: 'Manager',
        } : undefined,
        staffTabDetails: paymentMethod === 'Staff Tab' ? {
          staffId: 'staff',
          staffName: customerName.trim() || 'Staff Take Home',
          isSettled: false,
          notes: 'Take Home Parcel',
        } : undefined,
        createdAt: new Date().toISOString(),
        estimatedTime: '30-45 mins',
        isOnlineOrder: true,
        source: 'delivery-admin',
        orderType: 'Delivery',
        notes: riderNote.trim() || undefined,
      };

      dispatch({ type: 'PLACE_ORDER', payload: newOrder });

      // Construct InvoiceData: printed slip clearly displays Subtotal (৳50) + Delivery Fee (৳40) = Total (৳90)
      const invoiceData: InvoiceData = {
        invoiceNumber: invNo,
        orderId: newOrder.id,
        orderType: 'Home Delivery',
        customerName: newOrder.customerName,
        customerPhone: finalPhone,
        deliveryAddress: fullAddress,
        deliveryFee: deliveryCharge,
        riderNote: riderNote.trim() || undefined,
        cashierName: sessionStorage.getItem('pizzora_admin_name') || 'Cashier',
        dateTime: new Date().toLocaleString(),
        items: selectedItems.map(c => ({
          name: c.item.name,
          quantity: c.quantity,
          price: c.item.price,
          variant: (c.item as any).variant,
          specialRequest: c.note,
          note: c.note,
        })),
        subtotal,
        discount: paymentMethod === 'Complimentary' ? subtotal : 0,
        total: customerPayable, // Printed on the slip as full customer collection (e.g. ৳90)
        paymentMethod,
        amountPaid: customerPayable,
        change: 0,
      };

      const settings = loadPrinterSettings();

      // Print Thermal Receipt if requested
      if (shouldPrintReceipt) {
        try {
          const printRes = await printerService.printReceipt(invoiceData, settings, { source: 'online' });
          if (!printRes.success) {
            setPrintFeedback(printRes.error || 'Print window blocked');
          }
        } catch (printErr: any) {
          console.warn('Delivery print error:', printErr);
          setPrintFeedback(printErr?.message || 'Print failed');
        }
      }

      // Print Kitchen Ticket (KOT) if requested
      if (shouldPrintKOT) {
        try {
          await printerService.printKOT(invoiceData, settings);
        } catch (kotErr: any) {
          console.warn('Delivery KOT print error:', kotErr);
        }
      }

      if (finalStatus === 'Delivered') {
        refreshAnalytics?.();
        showNotification(`Home Delivery Order #${invNo} confirmed as Delivered & added to Sales Report!`, 'success');
      } else if (finalStatus === 'Pending') {
        showNotification(`Home Delivery Order #${invNo} saved as Pending!`, 'success');
      } else {
        showNotification(`Home Delivery Order #${invNo} confirmed & sent to kitchen${shouldPrintReceipt ? ' with receipt' : ''}!`, 'success');
      }

      if (onOrderCreated) {
        try {
          onOrderCreated(newOrder);
        } catch (cbErr) {
          console.warn('onOrderCreated callback error:', cbErr);
        }
      }

      // Reset form & close modal cleanly
      resetForm();
      onClose();
    } catch (e: any) {
      const errText = 'Failed to create delivery order: ' + (e?.message || '');
      setValidationError(errText);
      showNotification(errText, 'error');
    } finally {
      setIsSubmitting(false);
      setSubmittingAction(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="w-full max-w-5xl xl:max-w-6xl rounded-3xl shadow-2xl bg-white border border-gray-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-emerald-50/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md bg-emerald-600">
              <Truck size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                Take New Home Delivery Order
              </h3>
              <p className="text-xs text-gray-500">
                Direct phone call / WhatsApp order entry for rider dispatch & kitchen cooking
              </p>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-200/60 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: 2 Columns on desktop */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Customer & Delivery Destination (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-3">
              <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <User size={13} className="text-emerald-600" /> Customer Details
              </span>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="e.g. Tanvir Ahmed (or Guest)"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white text-gray-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Phone Number <span className="text-red-500">* (for rider call)</span>
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => {
                      setPhone(e.target.value);
                      if (fieldErrors.phone) {
                        setFieldErrors(prev => ({ ...prev, phone: false }));
                        setValidationError(null);
                      }
                    }}
                    placeholder="017XXXXXXXX"
                    className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs bg-white text-gray-900 focus:outline-none transition-all ${
                      fieldErrors.phone
                        ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/20'
                        : 'border-gray-200 focus:border-emerald-500'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-3">
              <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={13} className="text-red-500" /> Delivery Address
              </span>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Delivery Area / Zone</label>
                <select
                  value={area}
                  onChange={e => handleSelectArea(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white text-gray-900 focus:outline-none focus:border-emerald-500 font-medium"
                >
                  {SYLHET_AREAS.map(a => (
                    <option key={a.name} value={a.name}>
                      {a.name} (৳{a.fee})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  House / Flat / Road / Street Details <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={e => {
                    setAddress(e.target.value);
                    if (fieldErrors.address) {
                      setFieldErrors(prev => ({ ...prev, address: false }));
                      setValidationError(null);
                    }
                  }}
                  placeholder="e.g. House 24, Road 5, Block C, 3rd Floor, near Amberkhana Point"
                  className={`w-full px-3 py-2 rounded-xl border text-xs bg-white text-gray-900 focus:outline-none resize-none transition-all ${
                    fieldErrors.address
                      ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/20'
                      : 'border-gray-200 focus:border-emerald-500'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">Delivery Fee (৳)</label>
                  <input
                    type="number"
                    min={0}
                    value={fee}
                    onChange={e => setFee(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white text-gray-900 focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white text-gray-900 focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="Cash on Delivery">Cash on Delivery (COD)</option>
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Card">Card</option>
                    <option value="Staff Tab">Staff Tab (Pay Later / Due)</option>
                    <option value="Complimentary">Complimentary / Free Delivery</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Rider / Delivery Instructions</label>
                <input
                  type="text"
                  value={riderNote}
                  onChange={e => setRiderNote(e.target.value)}
                  placeholder="e.g. Ring bell at main gate, extra sauce packet"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white text-gray-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Print & Dispatch Preferences (Fills left column naturally) */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Printer size={13} className="text-emerald-600" /> Print & Dispatch Options
                </span>
                <button
                  type="button"
                  onClick={handlePrePrintBill}
                  disabled={selectedItems.length === 0 || isPrintingPreview}
                  className="text-[11px] text-gray-500 hover:text-emerald-700 flex items-center gap-1 font-bold cursor-pointer disabled:opacity-40 transition-colors"
                  title="Print draft estimate slip before confirming"
                >
                  <FileText size={11} className="text-gray-400" />
                  <span>{isPrintingPreview ? 'Printing...' : 'Pre-Print Slip'}</span>
                </button>
              </div>

              <div className="space-y-2 pt-0.5">
                <label className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-gray-200/90 hover:border-emerald-400 cursor-pointer transition-colors shadow-2xs">
                  <div className="flex items-center gap-2">
                    <Printer size={14} className="text-emerald-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-gray-900">Auto-Print Customer Receipt</p>
                      <p className="text-[10px] text-gray-400">Prints bill with rider phone, address & fee</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={printReceiptOnConfirm}
                    onChange={e => setPrintReceiptOnConfirm(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-gray-200/90 hover:border-blue-400 cursor-pointer transition-colors shadow-2xs">
                  <div className="flex items-center gap-2">
                    <ChefHat size={14} className="text-blue-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-gray-900">Print Kitchen Ticket (KOT)</p>
                      <p className="text-[10px] text-gray-400">Sends food ticket to kitchen cooking station</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={printKOTOnConfirm}
                    onChange={e => setPrintKOTOnConfirm(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                  />
                </label>
              </div>

              {/* Initial Order Status Selector */}
              <div className="pt-2.5 border-t border-gray-200/70 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-gray-700">Initial Status:</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    initialStatus === 'Delivered'
                      ? 'bg-emerald-100 text-emerald-800'
                      : initialStatus === 'Preparing'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {initialStatus === 'Delivered' ? '✓ Completed & In Sales' : initialStatus === 'Preparing' ? 'In Kitchen Queue' : 'On Hold'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 p-1 bg-gray-200/60 rounded-xl">
                  {(['Preparing', 'Delivered', 'Pending'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setInitialStatus(s)}
                      className={`py-1.5 px-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer text-center ${
                        initialStatus === s
                          ? s === 'Delivered'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : s === 'Preparing'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-amber-500 text-white shadow-xs'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                      }`}
                    >
                      {s === 'Preparing' ? 'Kitchen' : s === 'Delivered' ? 'Delivered' : 'Pending'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Menu Item Picker & Ticket Cart (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            {/* Menu Search & Category Tabs */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={menuSearch}
                    onChange={e => setMenuSearch(e.target.value)}
                    placeholder="Search menu for pizza, burger, pasta..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs bg-white text-gray-900 focus:outline-none focus:border-emerald-500"
                  />
                  {menuSearch && (
                    <button onClick={() => setMenuSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Categories */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {menuCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                      category === cat ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Item Quick Picker (scrollable list showing ALL products) */}
            <div className="border border-gray-200 rounded-2xl p-2.5 bg-gray-50 max-h-[230px] overflow-y-auto scrollbar-thin">
              <div className="flex items-center justify-between pb-1.5 px-0.5 text-[11px] text-gray-500 font-semibold border-b border-gray-200/60 mb-2">
                <span>All Products ({filteredItems.length})</span>
                {category !== 'All' && (
                  <button onClick={() => setCategory('All')} className="text-emerald-700 hover:underline">
                    Show All Categories
                  </button>
                )}
              </div>
              {filteredItems.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400">No menu items match your search.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredItems.map(item => (
                    <div
                      key={item.id}
                      onClick={() => addItem(item)}
                      className="p-2 rounded-xl bg-white border border-gray-200 hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-900 truncate">{item.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{item.category}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="font-extrabold text-xs text-emerald-700">৳{item.price}</span>
                        <button
                          type="button"
                          className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors flex items-center justify-center font-bold text-xs"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Items / Cart */}
            <div className={`flex-1 flex flex-col rounded-2xl border p-3 bg-white space-y-2 transition-all ${
              fieldErrors.items
                ? 'border-red-400 ring-2 ring-red-400/20 shadow-xs'
                : 'border-gray-200'
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <span>Delivery Basket ({selectedItems.reduce((s, i) => s + i.quantity, 0)} items)</span>
                  {fieldErrors.items && (
                    <span className="text-[10px] text-red-500 font-extrabold">(Select at least 1 item)</span>
                  )}
                </span>
                {selectedItems.length > 0 && (
                  <button
                    onClick={() => setSelectedItems([])}
                    className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="flex-1 max-h-[160px] overflow-y-auto space-y-2 divide-y divide-gray-50 scrollbar-thin">
                {selectedItems.length === 0 ? (
                  <div className={`py-8 text-center text-xs transition-colors ${fieldErrors.items ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                    {fieldErrors.items ? '⚠️ Please add at least 1 food item from the menu above.' : 'No items selected yet. Tap any item above to add to this order.'}
                  </div>
                ) : (
                  selectedItems.map(c => (
                    <div key={c.item.id} className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 truncate">{c.item.name}</p>
                        <p className="text-[10.5px] text-gray-400">৳{c.item.price} each</p>
                        <input
                          type="text"
                          value={c.note || ''}
                          onChange={e => updateItemNote(c.item.id, e.target.value)}
                          placeholder="Special request / note for this item..."
                          className="mt-1 w-full text-[10.5px] px-2 py-0.5 rounded border border-gray-200 text-gray-600 bg-gray-50 focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            type="button"
                            onClick={() => updateItemQty(c.item.id, -1)}
                            className="w-6 h-6 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="w-6 text-center font-extrabold text-xs text-gray-900">{c.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateItemQty(c.item.id, 1)}
                            className="w-6 h-6 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                        <span className="font-extrabold text-xs text-gray-900 w-12 text-right">
                          ৳{c.item.price * c.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItem(c.item.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Price Calculation Summary */}
              <div className="pt-2 border-t border-gray-100 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Food Items Subtotal</span>
                  <span className="font-bold text-gray-900">৳{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span className="flex items-center gap-1">
                    <span>Delivery Charge ({area || 'Rider'})</span>
                    <span className="text-[10px] text-amber-600 font-medium">(Paid to Rider)</span>
                  </span>
                  <span className="font-bold">+৳{deliveryCharge.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-gray-900 pt-1.5 border-t border-gray-200">
                  <span>Slip Total (To Collect)</span>
                  <span className="text-emerald-700 text-base" style={{ fontFamily: 'var(--font-heading)' }}>
                    ৳{grandTotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-500 bg-emerald-50/70 px-2 py-1.5 rounded-lg border border-emerald-100/80">
                  <span className="text-emerald-900 font-semibold">Restaurant Order Balance Saved:</span>
                  <span className="font-extrabold text-emerald-950">৳{orderBalance.toLocaleString()} (Excludes rider fee)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-3.5 border-t border-gray-200 bg-gray-50/90 flex flex-col gap-2.5">
          {/* Validation Notice Banner */}
          {validationError && (
            <div className="w-full px-3.5 py-2.5 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center justify-between shadow-2xs animate-fade-in">
              <span className="flex items-center gap-2 font-bold">
                <AlertCircle size={15} className="text-red-600 flex-shrink-0" />
                <span>{validationError}</span>
              </span>
              <button
                type="button"
                onClick={() => { setValidationError(null); setFieldErrors({}); }}
                className="text-red-600 hover:text-red-900 font-bold p-1 hover:bg-red-100/60 rounded-md transition-colors"
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Printer Warning/Notice Banner */}
          {printFeedback && (
            <div className="w-full px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center justify-between shadow-2xs">
              <span className="flex items-center gap-1.5">
                <AlertCircle size={13} className="text-amber-600 flex-shrink-0" />
                <span>Printer notice: {printFeedback}</span>
              </span>
              <button
                type="button"
                onClick={() => setPrintFeedback(null)}
                className="text-amber-700 font-bold hover:underline text-[11px] ml-2 cursor-pointer"
                title="Dismiss"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Main Action Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
            {/* Left: Compact summary badge */}
            <div className="flex items-center gap-2 text-xs whitespace-nowrap bg-white px-3 py-1.5 rounded-xl border border-gray-200/90 shadow-2xs self-start md:self-auto flex-shrink-0">
              <span className="text-gray-600 font-semibold">
                <span className="font-extrabold text-gray-900">{selectedItems.reduce((s, i) => s + i.quantity, 0)}</span> {selectedItems.reduce((s, i) => s + i.quantity, 0) === 1 ? 'item' : 'items'}
              </span>
              <span className="text-gray-300">•</span>
              <span className="text-gray-500 font-medium">Order:</span>
              <strong className="text-gray-900 text-xs font-black" style={{ fontFamily: 'var(--font-heading)' }}>
                ৳{orderBalance.toLocaleString()}
              </strong>
              {deliveryCharge > 0 && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="text-emerald-700 font-bold text-xs">
                    Slip: ৳{grandTotal.toLocaleString()}
                  </span>
                </>
              )}
            </div>

            {/* Right: Clean Action Buttons properly contained within borders */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end min-w-0">
              <button
                type="button"
                onClick={handleModalClose}
                disabled={isSubmitting}
                className="px-3 py-2 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-800 hover:bg-gray-200/70 transition-colors cursor-pointer flex-shrink-0"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleCreateOrder('Pending', { printReceipt: false, printKOT: false })}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/90 transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer flex-shrink-0"
                title="Save delivery order as Pending"
              >
                {submittingAction === 'pending' ? <Loader2 size={13} className="animate-spin text-amber-700" /> : <Clock size={13} />}
                <span className="whitespace-nowrap">{submittingAction === 'pending' ? 'Saving...' : 'Save as Pending'}</span>
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleCreateOrder('Preparing', { printReceipt: false, printKOT: true })}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/90 transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer flex-shrink-0"
                title="Send to kitchen with KOT only (no customer receipt)"
              >
                {submittingAction === 'kitchen' ? <Loader2 size={14} className="animate-spin text-blue-700" /> : <ChefHat size={14} />}
                <span className="whitespace-nowrap">{submittingAction === 'kitchen' ? 'Sending...' : 'Send to Kitchen'}</span>
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleCreateOrder(initialStatus, { printReceipt: true, printKOT: printKOTOnConfirm })}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold active:scale-95 text-white transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer flex-shrink-0 ${
                  initialStatus === 'Delivered'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                    : initialStatus === 'Preparing'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                    : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
                }`}
                style={{ fontFamily: 'var(--font-heading)' }}
                title={
                  initialStatus === 'Delivered'
                    ? 'Confirm delivery order, mark Delivered & Paid into Sales Report, and print receipt'
                    : 'Confirm delivery order, dispatch to kitchen/rider and print receipt'
                }
              >
                {submittingAction === 'confirm' ? (
                  <Loader2 size={14} className="animate-spin text-white" />
                ) : initialStatus === 'Delivered' ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <Printer size={14} />
                )}
                <span className="whitespace-nowrap">
                  {submittingAction === 'confirm'
                    ? 'Confirming...'
                    : initialStatus === 'Delivered'
                    ? 'Confirm Delivered & Print'
                    : 'Confirm & Print Receipt'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
