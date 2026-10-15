import React, { useState, useMemo } from 'react';
import {
  Truck, Phone, MapPin, X, Plus, Minus, Trash2, Search, User, ChefHat,
  Clock, CreditCard, Sparkles, AlertCircle
} from 'lucide-react';
import { useApp, Order, OrderStatus, MenuItem } from '../../context/AppContext';
import { generateInvoiceNumber, printerService, loadPrinterSettings } from '../../utils/printerService';

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
  const { state, dispatch, showNotification } = useApp();

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('Zindabazar');
  const [fee, setFee] = useState<number>(40);
  const [paymentMethod, setPaymentMethod] = useState<'Cash on Delivery' | 'bKash' | 'Nagad' | 'Card'>('Cash on Delivery');
  const [riderNote, setRiderNote] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ item: MenuItem; quantity: number; note?: string }[]>([]);
  const [menuSearch, setMenuSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectArea = (areaName: string) => {
    setArea(areaName);
    const found = SYLHET_AREAS.find(a => a.name === areaName);
    if (found) {
      setFee(found.fee);
    }
  };

  const menuCategories = useMemo(() => {
    return ['All', ...Array.from(new Set((state.menuItems || []).map(m => m.category)))];
  }, [state.menuItems]);

  const filteredItems = useMemo(() => {
    return (state.menuItems || []).filter(item => {
      const matchCat = category === 'All' || item.category === category;
      const matchSearch = !menuSearch.trim() || item.name.toLowerCase().includes(menuSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [state.menuItems, category, menuSearch]);

  const addItem = (item: MenuItem) => {
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

  const grandTotal = subtotal + Number(fee || 0);

  const handleCreateOrder = async (initialStatus: OrderStatus) => {
    if (!phone.trim()) {
      showNotification('Customer phone number is required for delivery.', 'error');
      return;
    }
    if (!address.trim()) {
      showNotification('Delivery address (house/street) is required.', 'error');
      return;
    }
    if (selectedItems.length === 0) {
      showNotification('Please add at least 1 food item to the delivery ticket.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      let invNo = '';
      try {
        invNo = await generateInvoiceNumber();
      } catch {
        invNo = `PIZD-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      }

      const fullAddress = `${address.trim()}${area ? ` [${area}]` : ''}`;

      const newOrder: Order = {
        id: `del-${Date.now()}`,
        orderNumber: invNo,
        customerName: customerName.trim() || 'Home Delivery Guest',
        phone: phone.trim(),
        address: fullAddress,
        items: selectedItems.map(c => ({
          item: c.item,
          quantity: c.quantity,
          specialRequest: c.note || '',
        })),
        subtotal: subtotal,
        deliveryFee: Number(fee || 0),
        discount: 0,
        total: grandTotal,
        status: initialStatus,
        paymentMethod: paymentMethod,
        createdAt: new Date().toISOString(),
        estimatedTime: '30-45 mins',
        isOnlineOrder: true,
        source: 'delivery-admin',
        orderType: 'Delivery',
        notes: riderNote.trim() || undefined,
      };

      dispatch({ type: 'PLACE_ORDER', payload: newOrder });
      showNotification(`Home Delivery Order #${invNo} created & ${initialStatus}!`, 'success');

      if (onOrderCreated) {
        onOrderCreated(newOrder);
      } else {
        // Attempt thermal print if settings enable autoPrint
        try {
          const settings = loadPrinterSettings();
          if (settings.autoPrint) {
            await printerService.printReceipt({
              invoiceNumber: invNo,
              orderId: newOrder.id,
              orderType: 'Delivery',
              customerName: newOrder.customerName,
              cashierName: sessionStorage.getItem('pizzora_admin_name') || 'Cashier',
              dateTime: new Date().toLocaleString(),
              items: selectedItems.map(c => ({
                name: c.item.name,
                quantity: c.quantity,
                price: c.item.price,
                specialRequest: c.note,
              })),
              subtotal,
              discount: 0,
              total: grandTotal,
              paymentMethod,
              amountPaid: grandTotal,
              change: 0,
            }, settings);
          }
        } catch (printErr) {
          console.warn('Auto print error:', printErr);
        }
      }

      // Reset form
      setCustomerName('');
      setPhone('');
      setAddress('');
      setRiderNote('');
      setSelectedItems([]);
      onClose();
    } catch (e: any) {
      showNotification('Failed to create delivery order: ' + (e?.message || ''), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="w-full max-w-4xl rounded-3xl shadow-2xl bg-white border border-gray-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
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
            onClick={onClose}
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
                    onChange={e => setPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs bg-white text-gray-900 focus:outline-none focus:border-emerald-500"
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
                  onChange={e => setAddress(e.target.value)}
                  placeholder="e.g. House 24, Road 5, Block C, 3rd Floor, near Amberkhana Point"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white text-gray-900 focus:outline-none focus:border-emerald-500 resize-none"
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

            {/* Menu Item Quick Picker (scrollable list) */}
            <div className="border border-gray-200 rounded-2xl p-2.5 bg-gray-50 max-h-[175px] overflow-y-auto scrollbar-thin">
              {filteredItems.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400">No menu items match your search.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredItems.slice(0, 24).map(item => (
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
            <div className="flex-1 flex flex-col rounded-2xl border border-gray-200 p-3 bg-white space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-700">
                  Delivery Basket ({selectedItems.reduce((s, i) => s + i.quantity, 0)} items)
                </span>
                {selectedItems.length > 0 && (
                  <button
                    onClick={() => setSelectedItems([])}
                    className="text-[11px] font-bold text-red-600 hover:underline"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="flex-1 max-h-[160px] overflow-y-auto space-y-2 divide-y divide-gray-50 scrollbar-thin">
                {selectedItems.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 text-xs">
                    No items selected yet. Tap any item above to add to this order.
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
              <div className="pt-2 border-t border-gray-100 space-y-1 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>Items Subtotal</span>
                  <span>৳{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Delivery Charge ({area})</span>
                  <span>৳{Number(fee || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-gray-900 pt-1 border-t border-gray-100">
                  <span>Grand Total to Collect</span>
                  <span className="text-emerald-700 text-base" style={{ fontFamily: 'var(--font-heading)' }}>
                    ৳{grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            {selectedItems.length} items • Total: <strong className="text-gray-900">৳{grandTotal.toLocaleString()}</strong> ({paymentMethod})
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleCreateOrder('Pending')}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Clock size={13} />
              Save as Pending
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleCreateOrder('Preparing')}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <ChefHat size={14} />
              Confirm & Send to Kitchen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
