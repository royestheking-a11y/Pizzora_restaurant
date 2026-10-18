import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  LayoutDashboard, ShoppingBag, Calendar, MessageSquare, Image, UtensilsCrossed,
  LogOut, Eye, Check, X, Trash2, Plus, Star, Users, DollarSign, ChevronRight,
  AlertCircle, Edit2, Save, Package, ExternalLink, Phone, Mail, MapPin,
  Clock, ChevronDown, ChevronUp, Menu as MenuIcon, PlaySquare, Layers,
  RefreshCw, Send, CheckCircle2, XCircle, LayoutGrid, CreditCard,
  TrendingUp, Wallet, Smartphone, Banknote, Trash, BarChart2, Tag, ChefHat,
  ShieldCheck, Lock, User, KeyRound, Fingerprint, Activity, BadgeCheck, EyeOff, Loader2, Search, Download, BarChart3
} from 'lucide-react';
import { useApp, OrderStatus, TableOrderStatus, CarouselSlide } from '../context/AppContext';
import { generatePremiumPDF } from '../utils/pdfGenerator';
import { optimizeCloudinaryUrl } from '../utils/image';
import { MenuItem } from '../data/restaurantData';
import { TableManagement } from '../components/admin/TableManagement';
import { InventoryManagement } from '../components/admin/InventoryManagement';
import { ExpenseManagement } from '../components/admin/ExpenseManagement';
import { ChefManagement } from '../components/admin/ChefManagement';

import { PayrollManagement } from '../components/admin/PayrollManagement';
import { CashRegisterManagement } from '../components/admin/CashRegisterManagement';
import { compressImage } from '../utils/imageUpload';
import { ManualInvoice } from '../components/admin/ManualInvoice';
import { PrinterSettings } from '../components/admin/PrinterSettings';
import { ReprintSystem } from '../components/admin/ReprintSystem';
import { RoleManagement } from '../components/admin/RoleManagement';
import { DeliverySettingsPanel } from '../components/admin/DeliverySettingsPanel';
import { ProductOrderAnalytics } from '../components/admin/ProductOrderAnalytics';
import { OnlineOrderManagement, isWebsiteOnlineOrder } from '../components/admin/OnlineOrderManagement';
import { DeleteOrderConfirmModal } from '../components/admin/DeleteOrderConfirmModal';
import { DeletedOrdersManagement } from '../components/admin/DeletedOrdersManagement';
import { Printer, RotateCcw, Truck, Globe } from 'lucide-react';
import { printerService, loadPrinterSettings, logPrintJob, type InvoiceData } from '../utils/printerService';
import { AdminStatSkeleton, AdminListSkeleton, TableRowSkeleton, POSCardSkeleton, ChartSkeleton } from '../components/Skeletons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Mock auth - replaced by real auth
// ─────────────────────────────────────────────────────────────────────────────

type AdminTab = 'dashboard' | 'sales' | 'online-orders' | 'orders' | 'product-analytics' | 'deleted-orders' | 'reservations' | 'menu' | 'chefs' | 'gallery' | 'messages' | 'tables' | 'payments' | 'inventory' | 'expense' | 'payroll' | 'cash-register' | 'manual-invoice' | 'printer-settings' | 'reprint' | 'roles' | 'delivery-settings';

// ─── Input Style Helper ────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '10px',
  border: '1.5px solid rgba(249,0,43,0.18)',
  fontSize: '13px',
  fontFamily: 'var(--font-body)',
  outline: 'none',
  color: '#111',
  backgroundColor: '#fff',
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-heading)',
  fontSize: '12px',
  fontWeight: 600,
  color: '#374151',
  display: 'block',
  marginBottom: '5px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

// ─── Status Badge Helper ───────────────────────────────────────────────────

function getDhakaTimeBounds() {
  const dhakaStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
  const utcMidnight = new Date(dhakaStr + 'T00:00:00Z').getTime();
  const startOfDay = utcMidnight - (6 * 60 * 60 * 1000); // UTC+6
  const rawDayOfWeek = new Date(dhakaStr).getUTCDay(); // 0 is Sunday
  const diffToMonday = rawDayOfWeek === 0 ? -6 : 1 - rawDayOfWeek;
  const startOfWeek = startOfDay + (diffToMonday * 86400000);
  const [year, month] = dhakaStr.split('-').map(Number);
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1)).getTime() - (6 * 60 * 60 * 1000);
  const startOfYear = new Date(Date.UTC(year, 0, 1)).getTime() - (6 * 60 * 60 * 1000);
  const dayOfWeek = rawDayOfWeek === 0 ? 6 : rawDayOfWeek - 1; // 0=Mon
  return { startOfDay, startOfWeek, startOfMonth, startOfYear, dhakaStr, dayOfWeek };
}
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    Pending: { bg: '#FEF3C7', color: '#92400E' },
    Confirmed: { bg: '#D1FAE5', color: '#065F46' },
    Preparing: { bg: '#DBEAFE', color: '#1E40AF' },
    'Out for Delivery': { bg: '#EDE9FE', color: '#5B21B6' },
    Delivered: { bg: '#D1FAE5', color: '#065F46' },
    Cancelled: { bg: '#FEE2E2', color: '#991B1B' },
    Rejected: { bg: '#FEE2E2', color: '#991B1B' },
  };
  const s = map[status] || { bg: '#F3F4F6', color: '#374151' };
  return (
    <span
      className="px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.color, fontFamily: 'var(--font-heading)' }}
    >
      {status}
    </span>
  );
}

// ─── Modal Overlay ─────────────────────────────────────────────────────────
function ModalOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 print-hidden"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {children}
    </div>
  );
}

// ─── Menu Item Form (Add / Edit) ───────────────────────────────────────────
interface MenuFormState {
  name: string;
  category: string;
  price: string;
  description: string;
  spiceLevel: MenuItem['spiceLevel'];
  image: string;
  images: string[];
  isVeg: boolean;
  isSpicy: boolean;
  isPopular: boolean;
  prepTime: string;
  serves: string;
  showOnWebsite: boolean;
}

const blankMenuForm: MenuFormState = {
  name: '', category: 'Pizza', price: '', description: '',
  spiceLevel: 'Medium', image: '', images: [], isVeg: false, isSpicy: false,
  isPopular: false, prepTime: '20 min', serves: '1 Person', showOnWebsite: true,
};

function menuItemToForm(item: MenuItem): MenuFormState {
  return {
    name: item.name,
    category: item.category,
    price: String(item.price),
    description: item.description,
    spiceLevel: item.spiceLevel,
    image: item.image,
    images: item.images || [],
    isVeg: item.isVeg,
    isSpicy: item.isSpicy,
    isPopular: item.isPopular,
    prepTime: item.prepTime,
    serves: item.serves,
    showOnWebsite: item.showOnWebsite ?? true,
  };
}

function MenuItemModal({
  title,
  form,
  setForm,
  onSave,
  onClose,
  categories,
}: {
  title: string;
  form: MenuFormState;
  setForm: React.Dispatch<React.SetStateAction<MenuFormState>>;
  onSave: () => void;
  onClose: () => void;
  categories: string[];
}) {
  const spiceLevels: MenuItem['spiceLevel'][] = ['Mild', 'Medium', 'Hot', 'Extra Hot'];

  const [isUploading, setIsUploading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Add a slight premium processing delay
    await new Promise(r => setTimeout(r, 600));
    onSave();
    setIsSaving(false);
  };

  const removeImage = (idxToRemove: number) => {
    setForm(f => {
      const newImages = f.images.filter((_, idx) => idx !== idxToRemove);
      return {
        ...f,
        images: newImages,
        image: newImages.length > 0 ? newImages[0] : ''
      };
    });
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl relative"
        style={{ backgroundColor: '#fff' }}
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between p-6 border-b bg-white/80 backdrop-blur-md" style={{ borderColor: 'rgba(249,0,43,0.12)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)' }}>
              <UtensilsCrossed size={16} className="text-white" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '18px', color: '#111' }}>{title}</h2>
          </div>
          <button onClick={onClose} disabled={isUploading || isSaving} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-50">
            <X size={16} style={{ color: '#6B7280' }} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          {/* Image Upload + Preview */}
          <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <label style={labelStyle} className="!mb-0">Item Images (Up to 4)</label>
              {isUploading && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 animate-pulse bg-blue-50 px-2.5 py-1 rounded-full">
                  <Loader2 size={12} className="animate-spin" /> Processing...
                </div>
              )}
            </div>

            <div className="relative group">
              <input
                type="file"
                accept="image/*"
                multiple
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                disabled={isUploading || (form.images && form.images.length >= 4)}
                onChange={async (e) => {
                  const currentCount = form.images?.length || 0;
                  const allowedToUpload = 4 - currentCount;
                  if (allowedToUpload <= 0) {
                    alert("You can only upload up to 4 images per item.");
                    return;
                  }
                  const files = Array.from(e.target.files || []).slice(0, allowedToUpload);
                  if (files.length > 0) {
                    setIsUploading(true);
                    try {
                      const base64Promises = files.map(file => compressImage(file, 800));
                      const base64s = await Promise.all(base64Promises);
                      const updatedImages = [...(form.images || []), ...base64s];
                      setForm(f => ({ ...f, image: updatedImages[0] || f.image, images: updatedImages }));
                    } catch (error) {
                      console.error("Error compressing images:", error);
                      alert("Failed to process images.");
                    } finally {
                      setIsUploading(false);
                    }
                  }
                }}
              />
              <div
                className={`w-full p-5 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${isUploading ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-gray-200 hover:border-red-300 hover:bg-red-50/30'}`}
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                <Image size={24} className={isUploading ? 'text-blue-500 mb-2' : 'text-gray-400 mb-2'} />
                <span className="text-[13px] font-bold text-gray-700">
                  {isUploading ? 'Uploading & Compressing...' : 'Click or Drag Images Here'}
                </span>
                <span className="text-[11px] text-gray-400 mt-1 font-medium">{form.images?.length || 0}/4 Images Uploaded</span>
              </div>
            </div>

            {form.images && form.images.length > 0 && (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory pt-1 px-1" style={{ scrollbarWidth: 'thin' }}>
                {form.images.map((img, idx) => (
                  <div key={idx} className="relative rounded-xl overflow-hidden h-24 min-w-[6.5rem] w-26 bg-white border border-gray-200 snap-center group flex-shrink-0 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md">
                    <img src={img} alt={`preview ${idx}`} className="w-full h-full object-cover" />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md z-10 cursor-pointer"
                      title="Remove image"
                    >
                      <X size={12} strokeWidth={3} />
                    </button>
                    {idx === 0 && (
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur text-white text-[9px] font-black tracking-wider">PRIMARY</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Item Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Kacchi Biryani"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Price (৳) *</label>
              <input
                type="number"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                placeholder="350"
                style={inputStyle}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inputStyle}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Spice Level</label>
              <select value={form.spiceLevel} onChange={e => setForm(f => ({ ...f, spiceLevel: e.target.value as MenuItem['spiceLevel'] }))} style={inputStyle}>
                {spiceLevels.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Prep Time</label>
              <input type="text" value={form.prepTime} onChange={e => setForm(f => ({ ...f, prepTime: e.target.value }))} placeholder="25 min" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Serves</label>
              <input type="text" value={form.serves} onChange={e => setForm(f => ({ ...f, serves: e.target.value }))} placeholder="1 Person" style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe the dish..."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* Toggles */}
          <div className="flex gap-4 flex-wrap bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
            {([
              { key: 'isVeg', label: 'Vegetarian', color: '#16A34A' },
              { key: 'isSpicy', label: 'Spicy', color: '#DC2626' },
              { key: 'isPopular', label: 'Popular', color: '#F9002B' },
              { key: 'showOnWebsite', label: 'Show on Website', color: '#3B82F6' },
            ] as const).map(({ key, label, color }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  className="w-10 h-5 rounded-full relative transition-all"
                  style={{ backgroundColor: form[key] ? color : '#D1D5DB' }}
                  onClick={() => setForm(f => ({ ...f, [key]: !f[key] }))}
                >
                  <div
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                    style={{ left: form[key] ? '22px' : '2px' }}
                  />
                </div>
                <span style={{ fontSize: '13px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: form[key] ? color : '#6B7280' }}>
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-20 flex gap-3 p-6 border-t bg-white/95 backdrop-blur" style={{ borderColor: 'rgba(249,0,43,0.08)' }}>
          <button
            onClick={onClose}
            disabled={isUploading || isSaving}
            className="flex-1 py-3.5 rounded-xl text-[13px] font-bold transition-all hover:bg-gray-50 disabled:opacity-50"
            style={{ border: '1.5px solid rgba(249,0,43,0.15)', color: '#374151', fontFamily: 'var(--font-heading)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isUploading || isSaving}
            className="flex-1 py-3.5 rounded-xl text-[13px] font-bold text-white transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)' }}
          >
            {isSaving ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Saving Item...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Save size={16} /> Save Item
              </span>
            )}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Gallery Image Edit Modal ──────────────────────────────────────────────
interface GalleryForm {
  url: string;
  title: string;
  category: 'Restaurant' | 'Food' | 'Events' | 'Kitchen';
}

function GalleryEditModal({
  form,
  setForm,
  onSave,
  onClose,
  title,
}: {
  form: GalleryForm;
  setForm: React.Dispatch<React.SetStateAction<GalleryForm>>;
  onSave: () => void;
  onClose: () => void;
  title: string;
}) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 600));
    onSave();
    setIsSaving(false);
  };

  const removeImage = () => {
    setForm(f => ({ ...f, url: '' }));
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl relative" style={{ backgroundColor: '#fff' }}>
        <div className="sticky top-0 z-20 flex items-center justify-between p-6 border-b bg-white/80 backdrop-blur-md" style={{ borderColor: 'rgba(249,0,43,0.12)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)' }}>
              <Image size={16} className="text-white" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '18px', color: '#111' }}>{title}</h2>
          </div>
          <button onClick={onClose} disabled={isUploading || isSaving} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-50">
            <X size={16} style={{ color: '#6B7280' }} />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <label style={labelStyle} className="!mb-0">Image Upload *</label>
              {isUploading && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 animate-pulse bg-blue-50 px-2.5 py-1 rounded-full">
                  <Loader2 size={12} className="animate-spin" /> Processing...
                </div>
              )}
            </div>

            {!form.url ? (
              <div className="relative group">
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  disabled={isUploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setIsUploading(true);
                      try {
                        const base64 = await compressImage(file, 1200);
                        setForm(f => ({ ...f, url: base64 }));
                      } catch (error) {
                        console.error("Error compressing image:", error);
                        alert("Failed to process image.");
                      } finally {
                        setIsUploading(false);
                      }
                    }
                  }}
                />
                <div
                  className={`w-full p-6 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${isUploading ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-gray-200 hover:border-red-300 hover:bg-red-50/30'}`}
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  <Image size={24} className={isUploading ? 'text-blue-500 mb-2' : 'text-gray-400 mb-2'} />
                  <span className="text-[13px] font-bold text-gray-700">
                    {isUploading ? 'Uploading & Compressing...' : 'Click or Drag Image Here'}
                  </span>
                  <span className="text-[11px] text-gray-400 mt-1 font-medium">JPEG, PNG</span>
                </div>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden h-40 bg-white border border-gray-200 shadow-sm group">
                <img src={form.url} alt="preview" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                <button
                  onClick={removeImage}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md z-10 cursor-pointer"
                  title="Remove image"
                >
                  <X size={14} strokeWidth={3} />
                </button>
              </div>
            )}
          </div>
          <div>
            <label style={labelStyle}>Title *</label>
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Image title" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as GalleryForm['category'] }))} style={inputStyle}>
              {['Restaurant', 'Food', 'Events', 'Kitchen'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="sticky bottom-0 z-20 flex gap-3 p-6 border-t bg-white/95 backdrop-blur" style={{ borderColor: 'rgba(249,0,43,0.08)' }}>
          <button onClick={onClose} disabled={isUploading || isSaving} className="flex-1 py-3.5 rounded-xl text-[13px] font-bold transition-all hover:bg-gray-50 disabled:opacity-50" style={{ border: '1.5px solid rgba(249,0,43,0.15)', color: '#374151', fontFamily: 'var(--font-heading)' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={isUploading || isSaving || !form.url} className="flex-1 py-3.5 rounded-xl text-[13px] font-bold text-white transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)' }}>
            {isSaving ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Saving...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Save size={16} /> Save Image
              </span>
            )}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Carousel Slide Modal ──────────────────────────────────────────────────
interface CarouselForm {
  url: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  link: string;
}

function CarouselSlideModal({
  form,
  setForm,
  onSave,
  onClose,
  title,
}: {
  form: CarouselForm;
  setForm: React.Dispatch<React.SetStateAction<CarouselForm>>;
  onSave: () => void;
  onClose: () => void;
  title: string;
}) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 600));
    onSave();
    setIsSaving(false);
  };

  const removeImage = () => {
    setForm(f => ({ ...f, url: '' }));
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl relative" style={{ backgroundColor: '#fff' }}>
        <div className="sticky top-0 z-20 flex items-center justify-between p-6 border-b bg-white/80 backdrop-blur-md" style={{ borderColor: 'rgba(249,0,43,0.12)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)' }}>
              <PlaySquare size={16} className="text-white" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '18px', color: '#111' }}>{title}</h2>
          </div>
          <button onClick={onClose} disabled={isUploading || isSaving} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-50">
            <X size={16} style={{ color: '#6B7280' }} />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <label style={labelStyle} className="!mb-0">Slide Image Upload *</label>
              {isUploading && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 animate-pulse bg-blue-50 px-2.5 py-1 rounded-full">
                  <Loader2 size={12} className="animate-spin" /> Processing...
                </div>
              )}
            </div>

            {!form.url ? (
              <div className="relative group">
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  disabled={isUploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setIsUploading(true);
                      try {
                        const base64 = await compressImage(file, 1600);
                        setForm(f => ({ ...f, url: base64 }));
                      } catch (error) {
                        console.error("Error compressing image:", error);
                        alert("Failed to process image.");
                      } finally {
                        setIsUploading(false);
                      }
                    }
                  }}
                />
                <div
                  className={`w-full p-6 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${isUploading ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-gray-200 hover:border-red-300 hover:bg-red-50/30'}`}
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  <Image size={24} className={isUploading ? 'text-blue-500 mb-2' : 'text-gray-400 mb-2'} />
                  <span className="text-[13px] font-bold text-gray-700">
                    {isUploading ? 'Uploading & Compressing...' : 'Click or Drag Image Here'}
                  </span>
                  <span className="text-[11px] text-gray-400 mt-1 font-medium">JPEG, PNG (High Res)</span>
                </div>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden h-40 bg-white border border-gray-200 shadow-sm group">
                <img src={form.url} alt="preview" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to right, rgba(45,0,0,0.7), transparent)' }} />
                <button
                  onClick={removeImage}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md z-10 cursor-pointer"
                  title="Remove image"
                >
                  <X size={14} strokeWidth={3} />
                </button>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <label style={labelStyle}>Link URL (optional)</label>
              <input
                type="url"
                value={form.link}
                onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
                placeholder="https://example.com/page"
                style={{ ...inputStyle, marginBottom: '6px' }}
              />
              <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '0', marginBottom: '4px', fontFamily: 'var(--font-body)' }}>When set, clicking the carousel image navigates to this URL.</p>
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 z-20 flex gap-3 p-6 border-t bg-white/95 backdrop-blur" style={{ borderColor: 'rgba(249,0,43,0.08)' }}>
          <button onClick={onClose} disabled={isUploading || isSaving} className="flex-1 py-3.5 rounded-xl text-[13px] font-bold transition-all hover:bg-gray-50 disabled:opacity-50" style={{ border: '1.5px solid rgba(249,0,43,0.15)', color: '#374151', fontFamily: 'var(--font-heading)' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={isUploading || isSaving || !form.url} className="flex-1 py-3.5 rounded-xl text-[13px] font-bold text-white transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)' }}>
            {isSaving ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Saving...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Save size={16} /> Save Slide
              </span>
            )}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Reply Modal ───────────────────────────────────────────────────────────
function ReplyModal({ msgId, msgName, onSend, onClose }: { msgId: string; msgName: string; onSend: (id: string, reply: string) => void; onClose: () => void }) {
  const [replyText, setReplyText] = useState('');
  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl" style={{ backgroundColor: '#fff' }}>
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'rgba(249,0,43,0.12)' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '18px', color: '#111' }}>Reply to {msgName}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100"><X size={16} style={{ color: '#6B7280' }} /></button>
        </div>
        <div className="p-6">
          <label style={labelStyle}>Your Reply</label>
          <textarea
            rows={5}
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Type your reply here..."
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>
        <div className="flex gap-3 p-6 border-t" style={{ borderColor: 'rgba(249,0,43,0.08)' }}>
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-all" style={{ border: '1.5px solid rgba(249,0,43,0.15)', color: '#374151', fontFamily: 'var(--font-heading)' }}>Cancel</button>
          <button
            onClick={() => { if (replyText.trim()) { onSend(msgId, replyText.trim()); onClose(); } }}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg"
            style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)' }}
          >
            <Send size={14} className="inline mr-2" /> Send Reply
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Live Top Stats (Clock & Earnings) ──────────────────────────────────────
function LiveTopStats({ orders, expenses }: { orders: any[], expenses: any[] }) {
  const [now, setNow] = React.useState(new Date());
  const [totalEarn, setTotalEarn] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { startOfDay, dhakaStr } = React.useMemo(() => getDhakaTimeBounds(), [now.getMinutes()]);

  const todaysOrders = orders.filter(o => new Date(o.createdAt).getTime() >= startOfDay);
  const totalSell = todaysOrders.reduce((sum, o) => sum + o.total, 0);

  React.useEffect(() => {
    const todaysExpenses = expenses.filter(e => e.date === dhakaStr).reduce((s, e) => s + e.amount, 0);
    setTotalEarn(totalSell - todaysExpenses);
  }, [totalSell, expenses, dhakaStr]); // Update every minute to catch new expenses

  return (
    <div className="hidden lg:flex items-center gap-3">
      {/* Premium Clock Pill */}
      <div className="flex items-center gap-3 ml-2 px-4 py-2 rounded-xl shadow-sm" style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', border: '1px solid rgba(249,0,43,0.2)' }}>
        <div className="flex flex-col text-right">
          <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '14px', color: '#fff', lineHeight: 1.1 }}>
            {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Dhaka' })}
          </p>
          <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
            {now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Dhaka' })}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Component ──────────────────────────────────────────────────
export function Admin() {
  const navigate = useNavigate();
  const { state, dispatch, showNotification, refreshAnalytics } = useApp();

  const menuCategories = React.useMemo(() => {
    const defaultCats = ['Pizza', 'Fried Corner', 'Wings', 'Meatbox', 'Burger', 'Sub', 'Shawarma', 'Momo', 'Combo', 'Chawomen', 'Seafood', 'Pasta', 'Rich Bowl', 'Curry', 'Sizzling', 'Platter', 'Ramen', 'Naan', 'Cold Coffee', 'Hot Coffee', 'Lassi', 'Dessert', 'Biryani', 'Couple', 'Soup', 'Wonton', 'Salad', 'Soft Drink', 'Water', 'Juice'];
    const dynamicCats = Array.from(new Set(state.menuItems.map(item => item.category))).filter(Boolean);
    return Array.from(new Set([...defaultCats, ...dynamicCats])).sort();
  }, [state.menuItems]);

  // Login
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Tab
  const { tab } = useParams<{ tab: string }>();
  const activeTab = (tab as AdminTab) || 'dashboard';
  const setActiveTab = (newTab: AdminTab) => {
    navigate(`/admin/${newTab}`);
  };

  useEffect(() => {
    if (activeTab === 'sales' || activeTab === 'product-analytics') {
      refreshAnalytics?.();
    }
  }, [activeTab, refreshAnalytics]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewOrderDetails, setViewOrderDetails] = useState<any>(null);
  const [orderViewSubTab, setOrderViewSubTab] = useState<'list' | 'product-analytics'>('list');

  // Menu Modals
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [menuForm, setMenuForm] = useState<MenuFormState>(blankMenuForm);
  const [menuSearchTerm, setMenuSearchTerm] = useState('');

  // Gallery Modals
  const [showAddGallery, setShowAddGallery] = useState(false);
  const [editingGallery, setEditingGallery] = useState<{ id: string } & GalleryForm | null>(null);
  const [galleryForm, setGalleryForm] = useState<GalleryForm>({ url: '', title: '', category: 'Food' });

  // Carousel Modals
  const [showAddCarousel, setShowAddCarousel] = useState(false);
  const [editingCarousel, setEditingCarousel] = useState<CarouselSlide | null>(null);
  const [carouselForm, setCarouselForm] = useState<CarouselForm>({ url: '', title: '', subtitle: '', description: '', badge: '', link: '' });

  // Reply Modal
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);

  // Gallery sub-tab
  const [gallerySubTab, setGallerySubTab] = useState<'gallery' | 'carousel'>('gallery');

  // Sales filter state
  const [salesFilter, setSalesFilter] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');

  // Print Order State
  const [printOrder, setPrintOrder] = useState<any | null>(null);

  const handlePrintOrder = async (order: any) => {
    if (!order) return;
    const isTable = Boolean(order.isTableOrder || (order.address && order.address.toLowerCase().includes('table')) || order.tableNumber);
    const isOnline = Boolean(order.isOnlineOrder || order.source === 'website' || (order.orderNumber && order.orderNumber.startsWith('PIZO')) || order.orderType === 'Delivery');
    const source: 'pos' | 'table' | 'online' | 'admin' = isTable ? 'table' : (isOnline ? 'online' : 'pos');
    const tableMatch = (order.address || '').match(/table\s*(\d+)/i) || (order.orderType || '').match(/table\s*(\d+)/i);
    const tableNo = order.tableNumber ? String(order.tableNumber) : (tableMatch ? tableMatch[1] : '');
    const invoiceNumber = order.orderNumber || (isTable ? `TBL-${tableNo || '1'}-${order.id?.slice(-6)}` : `PIZ-${order.id?.slice(-8)}`);

    const items = (order.items || []).map((ci: any) => {
      let name = '';
      if (ci.item && typeof ci.item.name === 'string' && ci.item.name.trim() && ci.item.name.trim().toLowerCase() !== 'item') {
        name = ci.item.name.trim();
      } else if (typeof ci.name === 'string' && ci.name.trim() && ci.name.trim().toLowerCase() !== 'item') {
        name = ci.name.trim();
      } else if (ci.item && typeof ci.item.title === 'string' && ci.item.title.trim()) {
        name = ci.item.title.trim();
      } else if (typeof ci.title === 'string' && ci.title.trim()) {
        name = ci.title.trim();
      } else if (typeof ci.itemName === 'string' && ci.itemName.trim()) {
        name = ci.itemName.trim();
      } else if (typeof ci.productName === 'string' && ci.productName.trim()) {
        name = ci.productName.trim();
      } else {
        name = (ci.name || ci.item?.name || 'Item').trim();
      }

      const numOrZero = (v: any) => {
        const n = Number(v);
        return !isNaN(n) && isFinite(n) ? n : 0;
      };
      const p1 = numOrZero(ci.price);
      const p2 = ci.item ? numOrZero(ci.item.price) : 0;
      const p3 = numOrZero(ci.unitPrice || ci.item?.unitPrice || ci.sellingPrice || ci.item?.sellingPrice);
      const price = p1 > 0 ? p1 : (p2 > 0 ? p2 : (p3 > 0 ? p3 : 0));
      const quantity = Math.max(1, numOrZero(ci.quantity || ci.qty || 1));

      return {
        name,
        quantity,
        price,
        variant: ci.variant || ci.selectedVariant?.name || (ci.item && ci.item.variant),
        note: ci.note || ci.specialRequest || (ci.item && (ci.item.note || ci.item.specialRequest)),
      };
    });

    const itemsSubtotal = items.reduce((s: number, i: any) => s + (i.price * i.quantity), 0);
    const subtotal = order.subtotal !== undefined ? order.subtotal : itemsSubtotal;
    const deliveryFee = order.deliveryFee !== undefined
      ? Number(order.deliveryFee)
      : Math.max(0, (Number(order.total) || 0) - subtotal);
    const customerName = order.customerName || order.displayTitle || (isTable ? (tableNo ? `Table ${tableNo} Guest` : 'Table Guest') : 'Guest');
    const customerPhone = order.phone || order.displayPhone || '';
    const deliveryAddress = order.address || '';
    const riderNote = order.notes || order.specialInstructions || '';

    // Calculate customer slip total:
    // If order.total is already legacy combined (total >= subtotal - discount + deliveryFee), use order.total.
    // Otherwise customer slip total = order.total + deliveryFee so the slip displays 50 + 40 = 90.
    const orderTotalNum = Number(order.total) || 0;
    const discount = order.discount || 0;
    const isLegacyCombined = deliveryFee > 0 && orderTotalNum >= (subtotal - discount + deliveryFee - 0.5);
    const slipTotal = isLegacyCombined ? orderTotalNum : (orderTotalNum + deliveryFee);

    const invoiceData: InvoiceData = {
      invoiceNumber,
      orderId: order.id,
      orderType: isTable ? (tableNo ? `Dine In — Table ${tableNo}` : 'Dine In') : (order.orderType || (isOnline ? 'Home Delivery' : 'POS')),
      tableNo: tableNo || undefined,
      customerName,
      customerPhone: customerPhone || undefined,
      deliveryAddress: deliveryAddress || undefined,
      deliveryFee: deliveryFee > 0 ? deliveryFee : undefined,
      riderNote: riderNote || undefined,
      cashierName: sessionStorage.getItem('pizzora_admin_name') || 'Admin',
      dateTime: new Date(order.createdAt || Date.now()).toLocaleString(),
      items,
      subtotal,
      discount: order.discount || 0,
      total: slipTotal,
      paymentMethod: order.paymentMethod || 'Cash',
      splitPayments: order.splitPayments,
      amountPaid: slipTotal,
      change: 0,
    };

    // Log to Reprint System database immediately
    logPrintJob({
      invoiceNumber,
      orderId: order.id,
      printedBy: sessionStorage.getItem('pizzora_admin_name') || 'Admin',
      isReprint: false,
      status: 'success',
      paymentMethod: order.paymentMethod || 'Cash',
      total: slipTotal,
      orderType: isTable ? (tableNo ? `Dine In — Table ${tableNo}` : 'Dine In') : (order.orderType || (isOnline ? 'Home Delivery' : 'POS')),
      customerName,
      tableNo: tableNo || '',
      source,
      snapshot: invoiceData,
    }).catch(e => console.warn('[Admin] Failed to log print job:', e));

    // Try modern thermal printerService (direct browser iframe / QZ Tray)
    try {
      const settings = loadPrinterSettings();
      const res = await printerService.printReceipt(invoiceData, settings, { source });
      if (res.success) return;
    } catch (printErr) {
      console.warn('[Admin] printerService print error, falling back to window.print():', printErr);
    }

    setPrintOrder(order);
    setTimeout(() => {
      document.body.classList.add('print-thermal');
      window.print();
      document.body.classList.remove('print-thermal');
      setPrintOrder(null);
    }, 500);
  };

  // Generic Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

  // Dedicated Cascading Order Deletion Modal State
  const [orderToDelete, setOrderToDelete] = useState<any | null>(null);

  const adminRole = sessionStorage.getItem('pizzora_admin_role') || 'manager';
  const adminName = sessionStorage.getItem('pizzora_admin_name') || (adminRole === 'admin' ? 'Administrator' : 'Store Manager');
  const adminInitials = (sessionStorage.getItem('pizzora_admin_name')?.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2) || (adminRole === 'admin' ? 'AD' : 'MG')).toUpperCase();

  // Pagination for older orders
  const [isLoadingOlderOrders, setIsLoadingOlderOrders] = useState(false);

  const loadOlderOrders = async () => {
    setIsLoadingOlderOrders(true);
    try {
      const getBackendUrl = () => {
        if (import.meta.env.VITE_BACKEND_URL) return import.meta.env.VITE_BACKEND_URL;
        if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') return 'http://localhost:3001';
        return window.location.origin;
      };
      const token = sessionStorage.getItem('pizzora_token');
      const res = await fetch(`${getBackendUrl()}/api/orders/history?skip=${state.orders.length}&limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.orders.length > 0) {
        dispatch({ type: 'LOAD_FROM_STORAGE', payload: { orders: [...state.orders, ...data.orders] } });
        showNotification(`Loaded ${data.orders.length} older orders!`, 'success');
      } else {
        showNotification('No more older orders to load.', 'info');
      }
    } catch (e) {
      console.error(e);
      showNotification('Failed to load older orders.', 'error');
    } finally {
      setIsLoadingOlderOrders(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsAuthenticating(true);

    try {
      const getBackendUrl = () => {
        if (import.meta.env.VITE_BACKEND_URL) return import.meta.env.VITE_BACKEND_URL;
        if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') return 'http://localhost:3001';
        return window.location.origin;
      };
      const SOCKET_URL = getBackendUrl();
      const res = await fetch(`${SOCKET_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });

      const data = await res.json();
      if (res.ok && data.token) {
        const { token, role, username } = data;
        sessionStorage.setItem('pizzora_token', token);
        sessionStorage.setItem('pizzora_admin_logged_in', 'true');
        sessionStorage.setItem('pizzora_admin_role', role || 'manager');
        sessionStorage.setItem('pizzora_admin_name', username || 'Manager');
        dispatch({ type: 'ADMIN_LOGIN' });
        window.location.reload(); // Reload to initialize secure socket & fetch admin state
      } else {
        setLoginError('Invalid credentials. Please try again.');
        setIsAuthenticating(false);
      }
    } catch (err) {
      setLoginError('Network error. Please try again.');
      setIsAuthenticating(false);
    }
  };

  const allUnifiedOrders = useMemo(() => {
    const unified: any[] = [
      ...state.orders.map(o => ({
        ...o,
        isTableOrder: false,
        timestamp: new Date(o.createdAt).getTime(),
        displayTitle: o.customerName,
        displayPhone: o.phone,
        paymentMethod: o.paymentMethod,
        orderNumber: o.orderNumber
      })),
      ...(state.tableOrders || [])
        .filter(to => !state.orders.some(o => o.orderNumber === to.invoiceNumber || o.id === to.id))
        .map(o => ({
          ...o,
          isTableOrder: true,
          timestamp: typeof o.createdAt === 'number' ? o.createdAt : new Date(o.createdAt).getTime(),
          displayTitle: o.customerName ? `Table ${o.tableNumber} (${o.customerName})` : `Table ${o.tableNumber}`,
          displayPhone: o.customerPhone || 'Dine-In',
          paymentMethod: o.paymentMethod || 'At Table',
          splitPayments: o.splitPayments,
          orderNumber: o.invoiceNumber || o.id.split('-')[1] || o.id.slice(-6)
        }))
    ];
    return unified.sort((a, b) => b.timestamp - a.timestamp);
  }, [state.orders, state.tableOrders]);

  const completedUnifiedOrders = allUnifiedOrders.filter(o =>
    o.isTableOrder ? o.status === 'Paid' : o.status === 'Delivered'
  );

  const totalRevenue = completedUnifiedOrders.reduce((sum, o) => sum + o.total, 0);
  const pendingOrders = allUnifiedOrders.filter(o => o.status === 'Pending').length;
  const pendingOnlineOrders = state.orders.filter(o => isWebsiteOnlineOrder(o) && o.status === 'Pending').length;
  const pendingReservations = state.reservations.filter(r => r.status === 'Pending').length;
  const unreadMessages = state.messages.filter(m => !m.isRead).length;
  const pendingTableOrders = (state.tableOrders ?? []).filter(o => o.status === 'Pending').length;

  // ── Payment Analytics ─────────────────────────────────────────────────
  const { startOfDay, startOfWeek, startOfMonth, startOfYear, dhakaStr, dayOfWeek } = useMemo(() => getDhakaTimeBounds(), []);

  const todayRevenue = state.analytics?.todayRevenue ?? completedUnifiedOrders.filter(o => o.timestamp >= startOfDay).reduce((s, o) => s + o.total, 0);
  const weeklyRevenue = state.analytics?.weeklyRevenue ?? completedUnifiedOrders.filter(o => o.timestamp >= startOfWeek).reduce((s, o) => s + o.total, 0);
  const monthlyRevenue = state.analytics?.monthlyRevenue ?? completedUnifiedOrders.filter(o => o.timestamp >= startOfMonth).reduce((s, o) => s + o.total, 0);

  const bkashOrders = completedUnifiedOrders.filter(o => o.paymentMethod === 'bKash' || o.splitPayments?.some((p: any) => p.method === 'bKash' && p.amount > 0));
  const nagadOrders = completedUnifiedOrders.filter(o => o.paymentMethod === 'Nagad' || o.splitPayments?.some((p: any) => p.method === 'Nagad' && p.amount > 0));
  const cashOrders = completedUnifiedOrders.filter(o => o.paymentMethod === 'Cash on Delivery' || o.paymentMethod === 'At Table' || o.paymentMethod === 'Cash' || o.splitPayments?.some((p: any) => p.method === 'Cash' && p.amount > 0));
  const cardOrders = completedUnifiedOrders.filter(o => o.paymentMethod === 'Card' || o.splitPayments?.some((p: any) => p.method === 'Card' && p.amount > 0));

  const bkashTotal = completedUnifiedOrders.reduce((s, o) => {
    if (o.paymentMethod === 'bKash') return s + o.total;
    if (o.splitPayments) {
      const p = o.splitPayments.find((x: any) => x.method === 'bKash');
      return s + (p ? p.amount : 0);
    }
    return s;
  }, 0);

  const nagadTotal = completedUnifiedOrders.reduce((s, o) => {
    if (o.paymentMethod === 'Nagad') return s + o.total;
    if (o.splitPayments) {
      const p = o.splitPayments.find((x: any) => x.method === 'Nagad');
      return s + (p ? p.amount : 0);
    }
    return s;
  }, 0);

  const cashTotal = completedUnifiedOrders.reduce((s, o) => {
    if (o.paymentMethod === 'Cash on Delivery' || o.paymentMethod === 'At Table' || o.paymentMethod === 'Cash') return s + o.total;
    if (o.splitPayments) {
      const p = o.splitPayments.find((x: any) => x.method === 'Cash');
      return s + (p ? p.amount : 0);
    }
    return s;
  }, 0);

  const cardTotal = completedUnifiedOrders.reduce((s, o) => {
    if (o.paymentMethod === 'Card') return s + o.total;
    if (o.splitPayments) {
      const p = o.splitPayments.find((x: any) => x.method === 'Card');
      return s + (p ? p.amount : 0);
    }
    return s;
  }, 0);

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeklyBreakdown = weekDays.map((day, i) => {
    const dayStart = startOfWeek + i * 86400000;
    const dayEnd = dayStart + 86400000;
    const rev = completedUnifiedOrders
      .filter(o => { const t = o.timestamp; return t >= dayStart && t < dayEnd; })
      .reduce((s, o) => s + o.total, 0);
    return { day, rev };
  });
  const maxDayRev = Math.max(...weeklyBreakdown.map(d => d.rev), 1);

  // ── Executive Dashboard Helpers ─────────────────────────────────────────
  const [dashboardChannelFilter, setDashboardChannelFilter] = useState<'all' | 'table' | 'pos' | 'online'>('all');

  const occupiedTables = useMemo(() => {
    return (state.tables ?? []).filter(t => t.status !== 'Available');
  }, [state.tables]);

  const activeCashShift = useMemo(() => {
    return (state.cashRegister ?? []).find(s => s.status === 'Open');
  }, [state.cashRegister]);

  const todayExpensesTotal = useMemo(() => {
    return (state.expenses ?? [])
      .filter((e: any) => {
        const time = new Date(e.date || e.createdAt).getTime();
        return !isNaN(time) && time >= startOfDay;
      })
      .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
  }, [state.expenses, startOfDay]);

  const filteredDashboardOrders = useMemo(() => {
    if (dashboardChannelFilter === 'all') return allUnifiedOrders.slice(0, 6);
    if (dashboardChannelFilter === 'table') return allUnifiedOrders.filter(o => o.isTableOrder || o.tableNumber).slice(0, 6);
    if (dashboardChannelFilter === 'online') return allUnifiedOrders.filter(o => isWebsiteOnlineOrder(o)).slice(0, 6);
    if (dashboardChannelFilter === 'pos') return allUnifiedOrders.filter(o => !o.isTableOrder && !isWebsiteOnlineOrder(o)).slice(0, 6);
    return allUnifiedOrders.slice(0, 6);
  }, [allUnifiedOrders, dashboardChannelFilter]);

  const handleExportPayments = () => {
    const data = allUnifiedOrders.map((o, i) => [
      (i + 1).toString(),
      o.orderNumber || '-',
      o.customerName || 'Walk-in',
      `BDT ${o.total}`,
      o.splitPayments && o.splitPayments.length > 0
        ? `Split (${o.splitPayments.map((p: any) => `${p.method} Tk ${p.amount}`).join(' + ')})`
        : (o.paymentMethod || 'Cash'),
      o.status,
      new Date(o.timestamp).toLocaleDateString('en-US', { timeZone: 'Asia/Dhaka' })
    ]);
    generatePremiumPDF({
      title: 'All Payment Transactions',
      columns: ['#', 'Order No.', 'Customer', 'Amount', 'Method', 'Status', 'Date'],
      data,
      filename: 'Payment_Transactions'
    });
  };

  const sidebarItems: { id: AdminTab; icon: typeof LayoutDashboard; label: string; badge?: number; section: string }[] = [
    // Overview
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', section: 'Overview' },
    { id: 'sales', icon: TrendingUp, label: 'Sales Report', section: 'Overview' },
    { id: 'product-analytics', icon: BarChart3, label: 'Product Sales Analytics', section: 'Overview' },

    // Operations & POS
    { id: 'tables', icon: LayoutGrid, label: 'Table Management', badge: pendingTableOrders, section: 'Operations & POS' },
    { id: 'orders', icon: ShoppingBag, label: 'All Orders', badge: pendingOrders, section: 'Operations & POS' },
    { id: 'online-orders', icon: Truck, label: 'Home Delivery & Online', badge: pendingOnlineOrders, section: 'Operations & POS' },
    { id: 'deleted-orders', icon: Trash2, label: 'Deleted Orders', badge: (state.deletedOrders?.length || undefined), section: 'Operations & POS' },
    { id: 'reservations', icon: Calendar, label: 'Reservations', badge: pendingReservations, section: 'Operations & POS' },

    // Finance & Stock
    { id: 'cash-register', icon: Banknote, label: 'Cash Register', section: 'Finance & Stock' },
    { id: 'payments', icon: CreditCard, label: 'Payments', section: 'Finance & Stock' },
    { id: 'expense', icon: Wallet, label: 'Expense', section: 'Finance & Stock' },
    { id: 'inventory', icon: Package, label: 'Inventory', section: 'Finance & Stock' },
    { id: 'payroll', icon: Users, label: 'Payroll', section: 'Finance & Stock' },

    // Restaurant & System
    { id: 'menu', icon: UtensilsCrossed, label: 'Menu Management', section: 'Restaurant & System' },
    { id: 'chefs', icon: Users, label: 'Chefs', section: 'Restaurant & System' },
    { id: 'gallery', icon: Image, label: 'Gallery', section: 'Restaurant & System' },
    { id: 'messages', icon: MessageSquare, label: 'Messages', badge: unreadMessages, section: 'Restaurant & System' },
    { id: 'manual-invoice', icon: Printer, label: 'Invoice System', section: 'Restaurant & System' },
    { id: 'reprint', icon: RotateCcw, label: 'Reprint System', section: 'Restaurant & System' },
    { id: 'printer-settings', icon: Printer, label: 'Printer Settings', section: 'Restaurant & System' },
    { id: 'delivery-settings', icon: Truck, label: 'Delivery Charges', section: 'Restaurant & System' },
    ...(adminRole === 'admin' ? [{ id: 'roles' as AdminTab, icon: ShieldCheck, label: 'Role Management', section: 'Restaurant & System' }] : []),
  ];

  // ── Save Menu Item ──────────────────────────────────────────────────
  const handleSaveMenuItem = () => {
    if (!menuForm.name || !menuForm.price) {
      showNotification('Name and price are required.', 'error');
      return;
    }
    const slug = menuForm.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const payload: MenuItem = {
      id: editingMenuItem?.id || Date.now().toString(),
      slug: editingMenuItem?.slug || slug,
      name: menuForm.name,
      category: menuForm.category,
      price: Number(menuForm.price),
      description: menuForm.description,
      spiceLevel: menuForm.spiceLevel,
      image: menuForm.image || menuForm.images?.[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
      images: menuForm.images || [],
      isVeg: menuForm.isVeg,
      isSpicy: menuForm.isSpicy,
      isPopular: menuForm.isPopular,
      prepTime: menuForm.prepTime,
      serves: menuForm.serves,
      showOnWebsite: menuForm.showOnWebsite,
      rating: editingMenuItem?.rating || 4.5,
      reviewCount: editingMenuItem?.reviewCount || 0,
      ingredients: editingMenuItem?.ingredients || [],
      nutrition: editingMenuItem?.nutrition || { calories: 0, protein: '0g', carbs: '0g', fat: '0g' },
    };
    if (editingMenuItem) {
      dispatch({ type: 'UPDATE_MENU_ITEM', payload });
      showNotification(`${menuForm.name} updated!`, 'success');
      setEditingMenuItem(null);
    } else {
      dispatch({ type: 'ADD_MENU_ITEM', payload });
      showNotification(`${menuForm.name} added to menu!`, 'success');
      setShowAddMenu(false);
    }
    setMenuForm(blankMenuForm);
  };

  // ── Save Gallery Image ──────────────────────────────────────────────
  const handleSaveGallery = () => {
    if (!galleryForm.url || !galleryForm.title) {
      showNotification('URL and title are required.', 'error');
      return;
    }
    if (editingGallery) {
      dispatch({ type: 'UPDATE_GALLERY_IMAGE', payload: { id: editingGallery.id, ...galleryForm } });
      showNotification('Gallery image updated!', 'success');
      setEditingGallery(null);
    } else {
      dispatch({ type: 'ADD_GALLERY_IMAGE', payload: { id: Date.now().toString(), ...galleryForm } });
      showNotification('Image added to gallery!', 'success');
      setShowAddGallery(false);
    }
    setGalleryForm({ url: '', title: '', category: 'Food' });
  };

  // ── Save Carousel Slide ─────────────────────────────────────────────
  const handleSaveCarousel = () => {
    if (!carouselForm.url) {
      showNotification('An image is required.', 'error');
      return;
    }
    if (editingCarousel) {
      dispatch({ type: 'UPDATE_CAROUSEL_SLIDE', payload: { id: editingCarousel.id, ...carouselForm } });
      showNotification('Carousel slide updated!', 'success');
      setEditingCarousel(null);
    } else {
      dispatch({ type: 'ADD_CAROUSEL_SLIDE', payload: { id: Date.now().toString(), ...carouselForm } });
      showNotification('Carousel slide added!', 'success');
      setShowAddCarousel(false);
    }
    setCarouselForm({ url: '', title: '', subtitle: '', description: '', badge: '', link: '' });
  };

  // ──────────────────────────────────────────────────────────────────────
  // LOGIN SCREEN
  // ──────────────────────────────────────────────────────────────────────
  if (!state.isAdminLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#F8EFDC', backgroundImage: 'linear-gradient(135deg, #FDFBF7 0%, #F8EFDC 100%)' }}>
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Subtle warm red glow top-right */}
          <div className="absolute top-[-25%] right-[-10%] w-[70vw] h-[70vw] rounded-full" style={{ background: 'radial-gradient(circle, rgba(249,0,43,0.06) 0%, transparent 70%)' }} />
          {/* Warm cream glow bottom-left */}
          <div className="absolute bottom-[-20%] left-[-10%] w-[55vw] h-[55vw] rounded-full" style={{ background: 'radial-gradient(circle, rgba(248,239,220,0.5) 0%, transparent 70%)' }} />
        </div>

        {/* Main Card */}
        <div className="w-full max-w-[1100px] mx-4 relative z-10 flex flex-col-reverse lg:flex-row min-h-[640px]"
          style={{ borderRadius: '2.5rem', overflow: 'hidden', backgroundColor: '#ffffff', boxShadow: '0 40px 80px -20px rgba(92,60,16,0.12), 0 0 0 1px rgba(92,60,16,0.04)' }}>

          {/* ── LEFT: Admin Identity Panel (Light Warm Slate) ─────────────────────────────── */}
          <div className="w-full lg:w-[45%] flex flex-col justify-between relative overflow-hidden p-10 lg:p-14"
            style={{ backgroundColor: '#FDFCF9', borderRight: '1px solid rgba(139,92,26,0.06)' }}>

            {/* Top: Brand */}
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', boxShadow: '0 8px 28px rgba(249,0,43,0.25)' }}>
                  <LayoutDashboard size={26} style={{ color: '#fff' }} />
                </div>
                <div>
                  <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '22px', color: '#111827', letterSpacing: '-0.3px' }}>Pizzora</p>
                  <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#F9002B' }}>Admin Console</p>
                </div>
              </div>

              <div className="mb-8">
                {/* Live badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
                  style={{ background: 'rgba(249,0,43,0.06)', border: '1px solid rgba(249,0,43,0.12)' }}>
                  <div className="w-2 h-2 rounded-full bg-[#F9002B] animate-pulse" />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#F9002B', textTransform: 'uppercase', letterSpacing: '1px' }}>Secure Admin Gateway</span>
                </div>
                <p style={{ color: '#4B5563', fontSize: '15px', lineHeight: 1.75, fontFamily: 'var(--font-body)' }}>
                  Full-access control panel for restaurant operations, orders, menu, staff, and analytics.
                </p>
              </div>

              {/* Feature list */}
              <div className="space-y-3">
                {[
                  { icon: <BarChart2 size={15} />, label: 'Real-time Analytics', sub: 'Live sales, orders & revenue data' },
                  { icon: <ShieldCheck size={15} />, label: 'Role-based Access', sub: 'Encrypted, session-locked entry' },
                  { icon: <Users size={15} />, label: 'Full Operations', sub: 'Menu, staff, inventory & more' },
                ].map(({ icon, label, sub }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(249,0,43,0.06)', border: '1px solid rgba(249,0,43,0.12)' }}>
                      <span style={{ color: '#F9002B' }}>{icon}</span>
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '13px', color: '#111827' }}>{label}</p>
                      <p style={{ fontSize: '11px', color: '#6B7280' }}>{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom: Back link */}
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 mt-10 relative z-10 w-fit px-4 py-2.5 rounded-xl transition-all"
              style={{ color: '#4B5563', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, background: '#F3F4F6', border: '1px solid #E5E7EB', cursor: 'pointer' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#E5E7EB'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F3F4F6'; }}
            >
              <ChevronRight size={14} className="rotate-180" style={{ color: '#4B5563' }} />
              Return to public website
            </button>
          </div>

          {/* ── RIGHT: Login Form (Pure White) ──────────────────────────────────────── */}
          <div className="w-full lg:w-[55%] flex flex-col justify-center p-10 lg:p-14"
            style={{ backgroundColor: '#ffffff' }}>

            {/* Eyebrow divider */}
            <div className="flex items-center gap-3 mb-8">
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(249,0,43,0.15), transparent)' }} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#F9002B', textTransform: 'uppercase', letterSpacing: '2px', whiteSpace: 'nowrap' }}>Admin Authentication</span>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, rgba(249,0,43,0.15), transparent)' }} />
            </div>

            <div className="mb-8">
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '30px', color: '#111827', letterSpacing: '-0.5px', marginBottom: '8px' }}>
                Admin Login
              </h2>
              <p style={{ color: '#6B7280', fontSize: '14px', lineHeight: 1.6 }}>
                Enter your administrator credentials to access the control panel.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Error */}
              {loginError && (
                <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'rgba(249,0,43,0.05)', border: '1px solid rgba(249,0,43,0.15)' }}>
                  <AlertCircle size={16} style={{ color: '#F9002B', flexShrink: 0 }} />
                  <span style={{ color: '#F9002B', fontSize: '13px', fontWeight: 600 }}>{loginError}</span>
                </div>
              )}

              {/* Admin ID */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                  Admin ID
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }}>
                    <User size={17} />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Enter your admin credentials"
                    value={loginForm.username}
                    onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))}
                    className="w-full py-4 pl-11 pr-4 text-[15px] outline-none transition-all"
                    style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '14px', color: '#111827', fontFamily: 'var(--font-body)' }}
                    onFocus={e => { e.target.style.border = '1px solid #F9002B'; e.target.style.background = '#ffffff'; e.target.style.boxShadow = '0 0 0 4px rgba(249,0,43,0.08)'; }}
                    onBlur={e => { e.target.style.border = '1px solid #E5E7EB'; e.target.style.background = '#F9FAFB'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {/* Security Key */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                  Security Key
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }}>
                    <KeyRound size={17} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••"
                    value={loginForm.password}
                    onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full py-4 pl-11 pr-12 text-[15px] outline-none transition-all"
                    style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '14px', color: '#111827', fontFamily: 'var(--font-body)' }}
                    onFocus={e => { e.target.style.border = '1px solid #F9002B'; e.target.style.background = '#ffffff'; e.target.style.boxShadow = '0 0 0 4px rgba(249,0,43,0.08)'; }}
                    onBlur={e => { e.target.style.border = '1px solid #E5E7EB'; e.target.style.background = '#F9FAFB'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full py-4 rounded-2xl font-bold transition-all active:scale-[0.98] flex justify-center items-center gap-2 relative overflow-hidden mt-2 disabled:opacity-70 disabled:cursor-wait text-white"
                style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', boxShadow: '0 8px 28px rgba(249,0,43,0.2)', cursor: isAuthenticating ? 'wait' : 'pointer' }}
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Fingerprint size={18} />
                    Access Admin Panel
                  </>
                )}
              </button>

              {/* Security note */}
              <div className="flex items-center gap-2 mt-1 justify-center">
                <Lock size={11} style={{ color: '#9CA3AF' }} />
                <span style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '0.3px' }}>256-bit encrypted · Session monitored</span>
              </div>
            </form>

            {/* Status footer */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>System Online</span>
              </div>
              <span style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 500 }}>Admin v3.0</span>
            </div>
          </div>
        </div>
      </div>
    );
  }


  // ──────────────────────────────────────────────────────────────────────
  // MAIN ADMIN LAYOUT (standalone — no Navbar/Footer)
  // ──────────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex min-h-screen" style={{ backgroundColor: '#F0EDE8' }}>

        {/* ── Mobile Overlay ────────────────────────────────── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 md:hidden"
            style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Sidebar ──────────────────────────────────────── */}
        <div
          className={`print-hidden flex-shrink-0 flex flex-col shadow-2xl fixed top-0 bottom-0 left-0 z-40 transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
          style={{
            width: '260px',
            background: 'linear-gradient(180deg, #120E11 0%, #0A0809 50%, #050405 100%)',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '6px 0 32px rgba(0, 0, 0, 0.55)'
          }}
        >
          {/* Top Brand Bar */}
          <div className="px-4 pt-5 pb-3.5 border-b border-white/[0.08] relative overflow-hidden">
            {/* Ambient Red Glow in corner */}
            <div className="absolute -top-8 -left-8 w-28 h-28 bg-red-600/15 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <div className="flex items-center h-8">
                  <img
                    src="/pizzoralogo.png"
                    alt="Pizzora"
                    className="h-10 object-contain scale-[1.55] origin-left drop-shadow-md"
                    style={{ filter: 'brightness(0) invert(1)', opacity: 0.95 }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-red-600/30 to-rose-600/20 text-red-400 border border-red-500/30 shadow-[0_0_8px_rgba(249,0,43,0.2)]">
                  POS OS
                </span>
                {/* Close button — mobile only */}
                <button
                  className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors hover:bg-white/10 text-white/70"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                  onClick={() => setSidebarOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Premium Admin Profile Card */}
            <div className="mt-3.5 p-2.5 rounded-2xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/[0.09] backdrop-blur-md flex items-center gap-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.35)] relative group">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0 bg-gradient-to-br from-red-500 via-red-600 to-rose-700 ring-2 ring-red-500/30 shadow-[0_0_12px_rgba(249,0,43,0.35)]">
                {adminInitials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-white text-xs font-bold tracking-tight truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                    {adminName}
                  </span>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 shrink-0">
                    {adminRole === 'admin' ? 'Owner' : 'Staff'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                  <span className="text-[10px] text-zinc-400 font-medium tracking-tight">System Online</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation with categorized groups */}
          <nav className="flex-1 py-2 px-2.5 space-y-0.5 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-track]:bg-transparent">
            {sidebarItems.map(({ id, icon: Icon, label, badge, section }, index) => {
              const isActive = activeTab === id;
              const showSectionHeader = section && (index === 0 || sidebarItems[index - 1]?.section !== section);

              return (
                <div key={id}>
                  {showSectionHeader && (
                    <div className={`px-2.5 flex items-center justify-between ${index === 0 ? 'pt-1.5 pb-1' : 'pt-3.5 pb-1'}`}>
                      <span className="text-[9.5px] font-black uppercase tracking-wider text-zinc-500">
                        {section}
                      </span>
                      <div className="h-[1px] flex-1 bg-white/[0.06] ml-2" />
                    </div>
                  )}
                  <button
                    onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-all relative group ${
                      isActive
                        ? 'bg-gradient-to-r from-red-600/30 via-red-600/15 to-transparent text-white border border-red-500/40 shadow-sm shadow-red-950/40'
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.05] border border-transparent'
                    }`}
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-[0_2px_8px_rgba(249,0,43,0.5)] ring-1 ring-red-400/40'
                          : 'bg-white/[0.04] text-zinc-400 group-hover:text-white group-hover:bg-white/[0.09] border border-white/[0.06] group-hover:border-white/10 group-hover:scale-105'
                      }`}>
                        <Icon size={14} />
                      </div>
                      <span className={`truncate whitespace-nowrap text-[12.5px] tracking-tight ${isActive ? 'font-extrabold text-white' : 'font-medium group-hover:text-zinc-100'}`}>
                        {label}
                      </span>
                    </div>
                    {badge !== undefined && badge > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_2px_6px_rgba(249,0,43,0.4)] shrink-0 ml-1.5">
                        {badge}
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-gradient-to-b from-red-400 to-red-600 shadow-[0_0_10px_rgba(249,0,43,0.9)]" />
                    )}
                  </button>
                </div>
              );
            })}
          </nav>

          {/* Sidebar Footer — 3 Modern Premium Action Buttons */}
          <div className="p-3 border-t border-white/[0.08] bg-black/40 backdrop-blur-md space-y-2 relative">
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-red-950/20 to-transparent pointer-events-none" />

            {/* Big Red Button: Table Management (Dine-in POS) */}
            <button
              onClick={() => { setActiveTab('tables'); setSidebarOpen(false); }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-white shadow-lg shadow-red-950/50 hover:shadow-red-600/30 active:scale-[0.98] whitespace-nowrap overflow-hidden hover:brightness-110 relative z-10"
              style={{ background: 'linear-gradient(135deg,#F9002B,#C8001F)', fontFamily: 'var(--font-heading)' }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <LayoutGrid size={15} className="shrink-0" />
                <span className="whitespace-nowrap font-extrabold text-[13px] tracking-tight">Table Management</span>
              </div>
              {pendingTableOrders > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-white text-red-600 shrink-0 ml-1.5 shadow-xs">
                  {pendingTableOrders}
                </span>
              )}
            </button>

            {/* Colorful Counter POS Button (Vibrant Golden-Yellow) */}
            <button
              onClick={() => navigate('/pos')}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-950/40 active:scale-[0.98] whitespace-nowrap overflow-hidden hover:brightness-105 relative z-10"
              style={{
                background: 'linear-gradient(135deg, #FBBF24, #D97706)',
                color: '#1F1200',
                fontFamily: 'var(--font-heading)',
                border: '1px solid rgba(254, 240, 138, 0.4)'
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <CreditCard size={15} className="shrink-0 text-amber-950" />
                <span className="whitespace-nowrap font-black text-[12.5px] tracking-tight text-amber-950">Open Counter POS</span>
              </div>
              <ChevronRight size={14} className="text-amber-950/80 shrink-0 ml-1" />
            </button>

            {/* Highlighted Logout Button */}
            <button
              onClick={() => {
                sessionStorage.removeItem('pizzora_token');
                sessionStorage.removeItem('pizzora_admin_logged_in');
                sessionStorage.removeItem('pizzora_admin_role');
                sessionStorage.removeItem('pizzora_admin_name');
                dispatch({ type: 'ADMIN_LOGOUT' });
                navigate('/admin');
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all bg-red-950/30 hover:bg-red-900/50 text-red-200 hover:text-white border border-red-500/30 hover:border-red-500/60 shadow-sm shadow-red-950/40 active:scale-[0.98] relative z-10"
              style={{ fontFamily: 'var(--font-heading)' }}
              title="Sign out of Admin Dashboard"
            >
              <div className="flex items-center gap-2">
                <LogOut size={14} className="text-red-400 shrink-0" />
                <span className="font-extrabold tracking-wide">Sign Out / Logout</span>
              </div>
              <span className="text-[10px] uppercase font-bold text-red-300 bg-red-900/60 px-1.5 py-0.5 rounded border border-red-700/50">
                Exit
              </span>
            </button>
          </div>
        </div>

        {/* ── Main Content ─────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-screen min-w-0 w-full md:w-[calc(100vw-260px)] md:max-w-[calc(100vw-260px)] md:ml-[260px] overflow-x-hidden">

          {/* Top Bar */}
          <div
            className="flex items-center justify-between px-4 md:px-6 py-4 sticky top-0 z-30 shadow-sm"
            style={{ backgroundColor: '#fff', borderBottom: '1px solid rgba(249,0,43,0.08)' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* Hamburger — mobile only */}
              <button
                className="md:hidden flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                style={{ backgroundColor: '#FFF5F5', border: '1px solid rgba(249,0,43,0.12)' }}
                onClick={() => setSidebarOpen(true)}
              >
                <MenuIcon size={18} style={{ color: '#F9002B' }} />
              </button>
              <div className="min-w-0">
                <h2 className="truncate" style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '18px', color: '#111', lineHeight: 1 }}>
                  {sidebarItems.find(s => s.id === activeTab)?.label}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2.5 flex-shrink-0">
              {/* View Website (Upper header, placed right by the watch) */}
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:text-red-600 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 transition-all shadow-2xs active:scale-[0.98]"
                style={{ fontFamily: 'var(--font-heading)' }}
                title="View customer facing website"
              >
                <Globe size={14} className="text-red-600" />
                <span className="hidden sm:inline">View Website</span>
                <ExternalLink size={12} className="text-gray-400 hidden sm:inline" />
              </a>

              <LiveTopStats orders={state.orders} expenses={state.expenses} />
              {unreadMessages > 0 && (
                <div className="relative">
                  <button onClick={() => { setActiveTab('messages'); setSidebarOpen(false); }} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}>
                    <MessageSquare size={16} style={{ color: '#DC2626' }} />
                  </button>
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white flex items-center justify-center" style={{ backgroundColor: '#DC2626', fontSize: '9px' }}>{unreadMessages}</span>
                </div>
              )}
              {pendingTableOrders > 0 && (
                <div className="relative">
                  <button onClick={() => { setActiveTab('tables'); setSidebarOpen(false); }} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#EDE9FE' }}>
                    <LayoutGrid size={16} style={{ color: '#7C3AED' }} />
                  </button>
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white flex items-center justify-center" style={{ backgroundColor: '#7C3AED', fontSize: '9px' }}>{pendingTableOrders}</span>
                </div>
              )}
            </div>
          </div>

          {/* Page Content */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto overflow-x-hidden min-w-0 max-w-full">

            {/* ══ DASHBOARD ══════════════════════════════════ */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Stats Cards — Row 1 (Core Financial & Queue Metrics) */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                  {state.isInitialLoading ? (
                    Array.from({ length: 4 }).map((_, i) => <AdminStatSkeleton key={i} />)
                  ) : [
                    {
                      label: 'Total Revenue',
                      value: `৳${(state.analytics?.totalRevenue || totalRevenue).toLocaleString()}`,
                      icon: DollarSign,
                      color: '#16A34A',
                      bg: '#DCFCE7',
                      borderColor: 'rgba(22,163,74,0.18)',
                      sub: `${state.analytics?.totalCustomers || allUnifiedOrders.length} all-time orders`,
                      tab: 'sales' as AdminTab,
                    },
                    {
                      label: 'Active Orders',
                      value: pendingOrders,
                      icon: ShoppingBag,
                      color: '#F9002B',
                      bg: '#FEE2E2',
                      borderColor: 'rgba(249,0,43,0.18)',
                      sub: `${allUnifiedOrders.length} recent`,
                      tab: 'orders' as AdminTab,
                    },
                    {
                      label: 'Reservations',
                      value: state.reservations.length,
                      icon: Calendar,
                      color: '#2563EB',
                      bg: '#DBEAFE',
                      borderColor: 'rgba(37,99,235,0.18)',
                      sub: `${pendingReservations} pending`,
                      tab: 'reservations' as AdminTab,
                    },
                    {
                      label: 'Messages',
                      value: state.messages.length,
                      icon: MessageSquare,
                      color: '#7C3AED',
                      bg: '#EDE9FE',
                      borderColor: 'rgba(124,58,237,0.18)',
                      sub: `${unreadMessages} unread`,
                      tab: 'messages' as AdminTab,
                    },
                  ].map(({ label, value, icon: Icon, color, bg, borderColor, sub, tab }) => (
                    <div
                      key={label}
                      onClick={() => setActiveTab(tab)}
                      className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group"
                      style={{ border: `1.5px solid ${borderColor}` }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform"
                          style={{ backgroundColor: bg }}
                        >
                          <Icon size={20} style={{ color }} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 group-hover:text-red-600 transition-colors flex items-center gap-0.5">
                          Open <ChevronRight size={11} />
                        </span>
                      </div>
                      <p
                        className="font-black text-2xl leading-tight group-hover:scale-[1.01] transition-transform origin-left"
                        style={{ fontFamily: 'var(--font-heading)', color }}
                      >
                        {value}
                      </p>
                      <p
                        className="text-xs text-gray-800 font-bold mt-1.5"
                        style={{ fontFamily: 'var(--font-heading)' }}
                      >
                        {label}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate">{sub}</p>
                    </div>
                  ))}
                </div>

                {/* Stats Cards — Row 2 (Operational & Catalog Assets) */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                  {state.isInitialLoading ? (
                    Array.from({ length: 4 }).map((_, i) => <AdminStatSkeleton key={i} />)
                  ) : [
                    {
                      label: 'Inventory Items',
                      value: (state.inventory ?? []).length,
                      icon: Package,
                      color: '#EA580C',
                      bg: '#FEF3C7',
                      borderColor: 'rgba(234,88,12,0.18)',
                      sub: 'Active stock',
                      tab: 'inventory' as AdminTab,
                    },
                    {
                      label: 'Menu Items',
                      value: state.menuItems.length,
                      icon: UtensilsCrossed,
                      color: '#0891B2',
                      bg: '#CFFAFE',
                      borderColor: 'rgba(8,145,178,0.18)',
                      sub: 'Active items',
                      tab: 'menu' as AdminTab,
                    },
                    {
                      label: 'Gallery Images',
                      value: state.galleryImages.length,
                      icon: Image,
                      color: '#7C3AED',
                      bg: '#EDE9FE',
                      borderColor: 'rgba(124,58,237,0.18)',
                      sub: `${state.carouselSlides.length} carousel slides`,
                      tab: 'gallery' as AdminTab,
                    },
                    {
                      label: 'Customers',
                      value:
                        (state.analytics?.totalCustomers || allUnifiedOrders.length) +
                        state.reservations.length,
                      icon: Users,
                      color: '#16A34A',
                      bg: '#DCFCE7',
                      borderColor: 'rgba(22,163,74,0.18)',
                      sub: 'Total interactions',
                      tab: 'sales' as AdminTab,
                    },
                  ].map(({ label, value, icon: Icon, color, bg, borderColor, sub, tab }) => (
                    <div
                      key={label}
                      onClick={() => setActiveTab(tab)}
                      className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group"
                      style={{ border: `1.5px solid ${borderColor}` }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform"
                          style={{ backgroundColor: bg }}
                        >
                          <Icon size={20} style={{ color }} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 group-hover:text-red-600 transition-colors flex items-center gap-0.5">
                          Open <ChevronRight size={11} />
                        </span>
                      </div>
                      <p
                        className="font-black text-2xl leading-tight group-hover:scale-[1.01] transition-transform origin-left"
                        style={{ fontFamily: 'var(--font-heading)', color }}
                      >
                        {value}
                      </p>
                      <p
                        className="text-xs text-gray-800 font-bold mt-1.5"
                        style={{ fontFamily: 'var(--font-heading)' }}
                      >
                        {label}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate">{sub}</p>
                    </div>
                  ))}
                </div>

                {/* ── Main Operations Section (Orders Feed + Floor & Operations Hub) ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  {/* Left Column: Live Orders Feed (~58% width - 7 Cols) */}
                  <div
                    className="lg:col-span-7 bg-white rounded-2xl shadow-sm overflow-hidden"
                    style={{ border: '1px solid rgba(0,0,0,0.05)' }}
                  >
                    <div
                      className="p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      style={{ borderColor: 'rgba(0,0,0,0.05)' }}
                    >
                      <div>
                        <h3
                          className="font-bold text-base text-gray-900 flex items-center gap-2"
                          style={{ fontFamily: 'var(--font-heading)' }}
                        >
                          <ShoppingBag size={17} className="text-red-600" />
                          Recent Orders Stream
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Live tickets across Tables, POS Counter & Online
                        </p>
                      </div>

                      {/* Channel Filter Pills */}
                      <div className="flex bg-gray-100 p-1 rounded-xl gap-1 overflow-x-auto">
                        {[
                          { key: 'all', label: 'All Orders' },
                          { key: 'table', label: 'Tables' },
                          { key: 'pos', label: 'POS' },
                          { key: 'online', label: 'Online' },
                        ].map(pill => (
                          <button
                            key={pill.key}
                            onClick={() => setDashboardChannelFilter(pill.key as any)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
                            style={{
                              backgroundColor: dashboardChannelFilter === pill.key ? '#fff' : 'transparent',
                              color: dashboardChannelFilter === pill.key ? '#F9002B' : '#6B7280',
                              boxShadow: dashboardChannelFilter === pill.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                              fontFamily: 'var(--font-heading)',
                            }}
                          >
                            {pill.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Orders List */}
                    <div className="divide-y divide-gray-100">
                      {filteredDashboardOrders.length === 0 ? (
                        <div className="py-12 text-center text-gray-400">
                          <ShoppingBag size={32} className="mx-auto mb-2 opacity-40" />
                          <p className="text-xs font-semibold">No orders in this channel filter</p>
                        </div>
                      ) : (
                        filteredDashboardOrders.map(order => {
                          const isTable = Boolean(order.isTableOrder || order.tableNumber);
                          const isOnline = isWebsiteOnlineOrder(order);
                          return (
                            <div
                              key={order.id}
                              className="px-5 py-3.5 hover:bg-gray-50/80 transition-colors flex items-center justify-between gap-3"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className="font-bold text-xs text-red-600"
                                    style={{ fontFamily: 'var(--font-heading)' }}
                                  >
                                    #{order.orderNumber}
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                      isTable
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                        : isOnline
                                        ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                    }`}
                                  >
                                    {isTable
                                      ? `Table ${order.tableNumber || ''} • Dine-In`
                                      : isOnline
                                      ? 'Online Delivery'
                                      : 'POS Counter'}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-700 font-medium truncate mt-1">
                                  {order.customerName || 'Walk-in Guest'} •{' '}
                                  <span className="text-gray-500">
                                    {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
                                    {order.items?.[0]
                                      ? ` (${(order.items[0].item?.name || order.items[0].name || '').slice(0, 22)}...)`
                                      : ''}
                                  </span>
                                </p>
                              </div>

                              <div className="flex items-center gap-3 flex-shrink-0">
                                <div className="text-right">
                                  <span
                                    className="font-extrabold text-sm text-gray-900 block"
                                    style={{ fontFamily: 'var(--font-heading)' }}
                                  >
                                    ৳{order.total}
                                  </span>
                                  <span className="text-[10.5px] text-gray-400 font-medium">
                                    {order.paymentMethod || 'Cash'}
                                  </span>
                                </div>
                                <StatusBadge status={order.status} />
                                <button
                                  onClick={() => handlePrintOrder(order)}
                                  className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 transition-colors flex items-center justify-center flex-shrink-0"
                                  title="Print Receipt"
                                >
                                  <Printer size={13} />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* View All Footer */}
                    <div
                      className="p-3.5 bg-gray-50/70 border-t flex items-center justify-between text-xs"
                      style={{ borderColor: 'rgba(0,0,0,0.05)' }}
                    >
                      <span className="text-gray-500 font-medium">
                        Showing latest {filteredDashboardOrders.length} of {allUnifiedOrders.length} recorded orders
                      </span>
                      <button
                        onClick={() => setActiveTab('orders')}
                        className="font-bold text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors"
                        style={{ fontFamily: 'var(--font-heading)' }}
                      >
                        View All Orders in Orders Hub <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Live Floor + Daily Operations + Inquiries Hub (5 Cols) */}
                  <div className="lg:col-span-5 space-y-4">
                    {/* Widget 1: Live Table Floor Status */}
                    <div
                      className="bg-white rounded-2xl p-5 shadow-sm"
                      style={{ border: '1px solid rgba(0,0,0,0.05)' }}
                    >
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
                        <div>
                          <h3
                            className="font-bold text-sm text-gray-900 flex items-center gap-2"
                            style={{ fontFamily: 'var(--font-heading)' }}
                          >
                            <LayoutGrid size={16} className="text-sky-600" />
                            Live Table Floor
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {occupiedTables.length} Active •{' '}
                            {(state.tables?.length || 5) - occupiedTables.length} Free for seating
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveTab('tables')}
                          className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                          style={{ fontFamily: 'var(--font-heading)' }}
                        >
                          Floor Map <ChevronRight size={13} />
                        </button>
                      </div>

                      {/* Mini Table Grid */}
                      <div className="grid grid-cols-2 gap-2">
                        {(state.tables && state.tables.length > 0
                          ? state.tables
                          : [
                              { id: '1', tableNumber: '1', seats: 4, area: 'Dining', status: 'Cooking' },
                              { id: '2', tableNumber: '2', seats: 6, area: 'Dining', status: 'Available' },
                              { id: '3', tableNumber: '3', seats: 6, area: 'Dining', status: 'Cooking' },
                              { id: '4', tableNumber: '4', seats: 4, area: 'Dining', status: 'Available' },
                              { id: '5', tableNumber: '5', seats: 2, area: 'Outdoor', status: 'Available' },
                            ]
                        ).map((tbl: any) => {
                          const isAvailable = tbl.status === 'Available';
                          const isCooking = tbl.status === 'Cooking' || tbl.status === 'Ordering';
                          return (
                            <div
                              key={tbl.id || tbl.tableNumber}
                              onClick={() => setActiveTab('tables')}
                              className="p-2.5 rounded-xl border transition-all cursor-pointer hover:shadow-md"
                              style={{
                                backgroundColor: isAvailable ? '#F0FDF4' : isCooking ? '#FFF7ED' : '#FAF5FF',
                                borderColor: isAvailable ? '#BBF7D0' : isCooking ? '#FED7AA' : '#E9D5FF',
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <span
                                  className="font-extrabold text-xs text-gray-900"
                                  style={{ fontFamily: 'var(--font-heading)' }}
                                >
                                  Table {tbl.tableNumber}
                                </span>
                                <span
                                  className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor: isAvailable ? '#DCFCE7' : isCooking ? '#FFEDD5' : '#F3E8FF',
                                    color: isAvailable ? '#15803D' : isCooking ? '#C2410C' : '#7E22CE',
                                  }}
                                >
                                  {tbl.status}
                                </span>
                              </div>
                              <p className="text-[10.5px] text-gray-500 mt-1 flex items-center gap-1">
                                <Users size={10} /> {tbl.seats} Seats • {tbl.area}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Widget 2: Today's Financial & Shift Snapshot */}
                    <div
                      className="bg-white rounded-2xl p-5 shadow-sm"
                      style={{ border: '1px solid rgba(0,0,0,0.05)' }}
                    >
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <Wallet size={16} className="text-purple-600" />
                          <h3
                            className="font-bold text-sm text-gray-900"
                            style={{ fontFamily: 'var(--font-heading)' }}
                          >
                            Today's Cash Flow Glance
                          </h3>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            activeCashShift
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {activeCashShift ? '🟢 Register Open' : '⚪ Closed'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                          <span className="text-[10px] text-gray-500 font-bold block uppercase">
                            Today's Sales
                          </span>
                          <span className="font-extrabold text-sm text-emerald-700">
                            ৳{Math.round(todayRevenue).toLocaleString()}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-red-50 border border-red-100">
                          <span className="text-[10px] text-gray-500 font-bold block uppercase">
                            Expenses
                          </span>
                          <span className="font-extrabold text-sm text-red-600">
                            ৳{Math.round(todayExpensesTotal).toLocaleString()}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100">
                          <span className="text-[10px] text-gray-500 font-bold block uppercase">
                            Net Cashflow
                          </span>
                          <span className="font-extrabold text-sm text-purple-700">
                            ৳{Math.round(todayRevenue - todayExpensesTotal).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Widget 3: Compact Reservations & Customer Inquiries (NO wasted 50% blank screen!) */}
                    <div
                      className="bg-white rounded-2xl p-5 shadow-sm"
                      style={{ border: '1px solid rgba(0,0,0,0.05)' }}
                    >
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-blue-600" />
                          <h3
                            className="font-bold text-sm text-gray-900"
                            style={{ fontFamily: 'var(--font-heading)' }}
                          >
                            Reservations & Inquiries
                          </h3>
                        </div>
                        <button
                          onClick={() => setActiveTab('reservations')}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          style={{ fontFamily: 'var(--font-heading)' }}
                        >
                          View All <ChevronRight size={13} />
                        </button>
                      </div>

                      {state.reservations.length === 0 ? (
                        <div className="py-3 px-4 rounded-xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-semibold text-gray-700">No pending table reservations</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              {unreadMessages} unread customer message{unreadMessages !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <button
                            onClick={() => setActiveTab('reservations')}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                          >
                            Manage →
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {state.reservations.slice(0, 3).map(res => (
                            <div
                              key={res.id}
                              className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs"
                            >
                              <div>
                                <p className="font-bold text-gray-800">{res.name}</p>
                                <p className="text-[11px] text-gray-500">
                                  {res.date} at {res.time} • {res.guests} guests
                                </p>
                              </div>
                              <StatusBadge status={res.status} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══ SALES REPORT ═════════════════════════════════════ */}
            {activeTab === 'sales' && (
              <div className="bg-white p-6 rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
                <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                  <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '20px', color: '#111' }}>Sales Analytics</h2>
                  <div className="flex bg-gray-100/80 p-1 rounded-xl">
                    {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setSalesFilter(f)}
                        className="px-4 py-1.5 rounded-lg text-[13px] font-bold capitalize transition-all"
                        style={{
                          backgroundColor: salesFilter === f ? '#fff' : 'transparent',
                          color: salesFilter === f ? '#F9002B' : '#6B7280',
                          boxShadow: salesFilter === f ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                          fontFamily: 'var(--font-heading)'
                        }}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Data Calculation */}
                {state.isInitialLoading ? (
                  <div>
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <AdminStatSkeleton />
                      <AdminStatSkeleton />
                    </div>
                    <ChartSkeleton />
                  </div>
                ) : (() => {
                  let chartData: any[] = [];
                  let totalSales = 0;
                  let totalOrders = 0;

                  if (state.analytics) {
                    if (salesFilter === 'daily') {
                      chartData = state.analytics.dailyChart || [];
                      totalSales = state.analytics.todayRevenue || 0;
                    } else if (salesFilter === 'weekly') {
                      chartData = state.analytics.weeklyChart || [];
                      totalSales = state.analytics.weeklyRevenue || 0;
                    } else if (salesFilter === 'monthly') {
                      chartData = state.analytics.monthlyChart || [];
                      totalSales = state.analytics.monthlyRevenue || 0;
                    } else if (salesFilter === 'yearly') {
                      chartData = state.analytics.yearlyChart || [];
                      totalSales = state.analytics.yearlyRevenue || 0;
                    }
                    totalOrders = chartData.reduce((sum, item) => sum + (item.orders || 0), 0);
                  }

                  const renderCustomBarLabel = (props: any) => {
                    const { x, y, width, index } = props;
                    const orders = chartData[index]?.orders || 0;
                    if (!orders) return <g></g>;
                    return (
                      <text x={x + width / 2} y={y - 8} fill="#9CA3AF" fontSize={10} fontWeight={600} textAnchor="middle">
                        {orders} ord
                      </text>
                    );
                  };

                  return (
                    <div>
                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="p-4 rounded-xl" style={{ backgroundColor: '#FFF1F2', border: '1px solid rgba(249,0,43,0.1)' }}>
                          <p style={{ fontSize: '12px', color: '#F9002B', fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase' }}>Total Sales ({salesFilter})</p>
                          <p style={{ fontSize: '28px', fontWeight: 800, color: '#111', fontFamily: 'var(--font-heading)', marginTop: '4px' }}>৳{totalSales.toLocaleString()}</p>
                        </div>
                        <div className="p-4 rounded-xl" style={{ backgroundColor: '#F0FDF4', border: '1px solid rgba(22,163,74,0.1)' }}>
                          <p style={{ fontSize: '12px', color: '#16A34A', fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase' }}>Total Orders ({salesFilter})</p>
                          <p style={{ fontSize: '28px', fontWeight: 800, color: '#111', fontFamily: 'var(--font-heading)', marginTop: '4px' }}>{totalOrders}</p>
                        </div>
                      </div>

                      <div style={{ width: '100%', height: 350 }}>
                        <ResponsiveContainer>
                          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280', fontFamily: 'var(--font-body)' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280', fontFamily: 'var(--font-body)' }} tickFormatter={(val) => `৳${val}`} />
                            <Tooltip
                              cursor={{ fill: 'rgba(249,0,43,0.04)' }}
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                              labelStyle={{ fontWeight: 700, color: '#111', marginBottom: '4px' }}
                              formatter={(value: any, name: any, props: any) => [`৳${value} (${props.payload.orders} orders)`, 'Sales']}
                            />
                            <Bar dataKey="sales" name="Sales (৳)" fill="#F9002B" radius={[4, 4, 0, 0]} maxBarSize={40} label={renderCustomBarLabel} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ══ DEDICATED ONLINE ORDERS EXECUTION STATION ════════ */}
            {activeTab === 'online-orders' && (
              <OnlineOrderManagement
                onPrintOrder={handlePrintOrder}
              />
            )}

            {/* ══ ORDERS & PRODUCT SALES ANALYTICS ═════════════════ */}
            {(activeTab === 'orders' || activeTab === 'product-analytics') && (
              <div className="space-y-5 w-full max-w-full min-w-0 overflow-hidden">
                {/* Top Sub-navigation Switcher */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-gray-100 border border-gray-200 shadow-sm flex-wrap">
                    <button
                      onClick={() => {
                        if (activeTab === 'product-analytics') setActiveTab('orders');
                        setOrderViewSubTab('list');
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                      style={{
                        backgroundColor: (activeTab === 'orders' && orderViewSubTab === 'list') ? '#fff' : 'transparent',
                        color: (activeTab === 'orders' && orderViewSubTab === 'list') ? '#F9002B' : '#4B5563',
                        boxShadow: (activeTab === 'orders' && orderViewSubTab === 'list') ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                        fontFamily: 'var(--font-heading)',
                      }}
                    >
                      <ShoppingBag size={14} />
                      <span>All Orders ({allUnifiedOrders.length})</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('online-orders')}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all text-gray-600 hover:text-gray-900"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      <Globe size={14} className="text-red-500" />
                      <span>Online Orders Only ({state.orders.filter(isWebsiteOnlineOrder).length})</span>
                      {pendingOnlineOrders > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white animate-pulse">
                          {pendingOnlineOrders}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        if (activeTab === 'orders') setOrderViewSubTab('product-analytics');
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                      style={{
                        backgroundColor: (activeTab === 'product-analytics' || orderViewSubTab === 'product-analytics') ? '#F9002B' : 'transparent',
                        color: (activeTab === 'product-analytics' || orderViewSubTab === 'product-analytics') ? '#fff' : '#4B5563',
                        boxShadow: (activeTab === 'product-analytics' || orderViewSubTab === 'product-analytics') ? '0 2px 10px rgba(249,0,43,0.3)' : 'none',
                        fontFamily: 'var(--font-heading)',
                      }}
                    >
                      <BarChart3 size={14} />
                      <span>Product Sales & Order Analytics</span>
                      <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-white/20 text-white font-extrabold">NEW</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('deleted-orders')}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-red-50 border border-gray-200 ml-auto"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      <Trash2 size={13} className="text-red-500" />
                      <span>Deleted Orders Archive</span>
                      {(state.deletedOrders?.length || 0) > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-red-100 text-red-700">
                          {state.deletedOrders.length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {(activeTab === 'product-analytics' || orderViewSubTab === 'product-analytics') ? (
                  <ProductOrderAnalytics />
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr style={{ backgroundColor: '#FFF5F5', borderBottom: '1px solid rgba(249,0,43,0.08)' }}>
                            {['Order #', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Update'].map(h => (
                              <th key={h} className="px-4 py-3.5 text-left" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.7px' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {state.isInitialLoading ? (
                            Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={7} />)
                          ) : (
                            <>
                              {allUnifiedOrders.map(order => (
                                <tr key={order.id} className="border-b hover:bg-amber-50/30 transition-colors" style={{ borderColor: 'rgba(0,0,0,0.04)' }}>
                                  <td className="px-4 py-3.5">
                                    <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '13px', color: '#F9002B' }}>#{order.orderNumber}</p>
                                    <p style={{ fontSize: '11px', color: '#9CA3AF' }}>{new Date(order.timestamp).toLocaleDateString('en-US', { timeZone: 'Asia/Dhaka' })}</p>
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#111', fontFamily: 'var(--font-heading)' }}>{order.displayTitle}</p>
                                    <p style={{ fontSize: '11px', color: '#9CA3AF' }}>{order.displayPhone}</p>
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <p style={{ fontSize: '13px', color: '#374151' }}>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <p style={{ fontWeight: 800, fontSize: '14px', color: '#F9002B', fontFamily: 'var(--font-heading)' }}>৳{order.total}</p>
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <p style={{ fontSize: '12px', color: '#6B7280' }}>{order.paymentMethod}</p>
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <StatusBadge status={order.status} />
                                  </td>
                                  <td className="px-4 py-3.5 flex items-center gap-2">
                                    {order.isTableOrder ? (
                                      <select
                                        value={order.status}
                                        onChange={e => {
                                          dispatch({ type: 'UPDATE_TABLE_ORDER_STATUS', payload: { id: order.id, status: e.target.value as TableOrderStatus } });
                                          showNotification('Table Order status updated!', 'success');
                                        }}
                                        className="px-2 py-1.5 rounded-lg border text-xs font-semibold"
                                        style={{ borderColor: 'rgba(249,0,43,0.2)', color: '#111', fontFamily: 'var(--font-heading)', cursor: 'pointer' }}
                                      >
                                        {(['Pending', 'Confirmed', 'Cooking', 'Ready', 'Served', 'Paid'] as TableOrderStatus[]).map(s => (
                                          <option key={s} value={s}>{s}</option>
                                        ))}
                                      </select>
                                    ) : (
                                      <select
                                        value={order.status}
                                        onChange={e => {
                                          const newStatus = e.target.value as OrderStatus;
                                          dispatch({ type: 'UPDATE_ORDER_STATUS', payload: { id: order.id, status: newStatus } });
                                          if (newStatus === 'Delivered') {
                                            refreshAnalytics?.();
                                            showNotification('Order marked as Delivered & added to Sales Report!', 'success');
                                          } else {
                                            showNotification(`Order status updated to ${newStatus}`, 'success');
                                          }
                                        }}
                                        className="px-2 py-1.5 rounded-lg border text-xs font-semibold"
                                        style={{ borderColor: 'rgba(249,0,43,0.2)', color: '#111', fontFamily: 'var(--font-heading)', cursor: 'pointer' }}
                                      >
                                        {(['Pending', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'] as OrderStatus[]).map(s => (
                                          <option key={s} value={s}>{s}</option>
                                        ))}
                                      </select>
                                    )}
                                    <button
                                      onClick={() => handlePrintOrder(order)}
                                      className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                                      title="Print Invoice"
                                    >
                                      <Printer size={14} />
                                    </button>
                                    <button
                                      onClick={() => setViewOrderDetails(order)}
                                      className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                                      title="View Order Details"
                                    >
                                      <Eye size={14} />
                                    </button>
                                    {adminRole === 'admin' && (
                                      <button
                                        onClick={() => setOrderToDelete(order)}
                                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                                        title="Delete Order & Clear Payment"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </>
                          )}
                        </tbody>
                      </table>
                      {(!state.isInitialLoading && allUnifiedOrders.length === 0) && (
                        <div className="py-20 text-center">
                          <ShoppingBag size={40} className="mx-auto mb-3" style={{ color: '#D1D5DB' }} />
                          <p style={{ color: '#6B7280', fontSize: '15px' }}>No orders received yet.</p>
                        </div>
                      )}
                    </div>
                    {allUnifiedOrders.length > 0 && (
                      <div className="p-4 border-t" style={{ borderColor: 'rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'center' }}>
                        <button
                          onClick={loadOlderOrders}
                          disabled={isLoadingOlderOrders}
                          className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-gray-100 disabled:opacity-50"
                          style={{ border: '1px solid rgba(0,0,0,0.1)', color: '#374151', fontFamily: 'var(--font-heading)' }}
                        >
                          {isLoadingOlderOrders ? 'Loading...' : 'Load Older Orders'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ══ RESERVATIONS ═══════════════════════════════ */}
            {activeTab === 'reservations' && (
              <div className="space-y-4">
                {state.isInitialLoading ? (
                  Array.from({ length: 4 }).map((_, i) => <AdminStatSkeleton key={i} />)
                ) : (
                  <>
                    {state.reservations.map(res => (
                      <div key={res.id} className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div>
                              <p style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'var(--font-heading)', marginBottom: '3px' }}>Guest Name</p>
                              <p style={{ fontWeight: 700, fontSize: '14px', color: '#111', fontFamily: 'var(--font-heading)' }}>{res.name}</p>
                              <p style={{ fontSize: '11px', color: '#6B7280' }}>{res.email}</p>
                            </div>
                            <div>
                              <p style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'var(--font-heading)', marginBottom: '3px' }}>Date & Time</p>
                              <p style={{ fontSize: '13px', color: '#374151', fontWeight: 600 }}>{res.date}</p>
                              <p style={{ fontSize: '12px', color: '#6B7280' }}>{res.time}</p>
                            </div>
                            <div>
                              <p style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'var(--font-heading)', marginBottom: '3px' }}>Guests & Phone</p>
                              <p style={{ fontSize: '13px', color: '#374151', fontWeight: 600 }}>{res.guests} Guests</p>
                              <p style={{ fontSize: '12px', color: '#6B7280' }}>{res.phone}</p>
                            </div>
                            <div>
                              <p style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'var(--font-heading)', marginBottom: '3px' }}>Status</p>
                              <StatusBadge status={res.status} />
                              {res.specialRequest && <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }} className="line-clamp-1">{res.specialRequest}</p>}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => { dispatch({ type: 'UPDATE_RESERVATION', payload: { id: res.id, status: 'Confirmed' } }); showNotification('Reservation confirmed!', 'success'); }}
                              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all hover:shadow-md"
                              style={{ backgroundColor: '#D1FAE5', color: '#065F46', fontFamily: 'var(--font-heading)' }}
                            >
                              <Check size={12} /> Confirm
                            </button>
                            <button
                              onClick={() => { dispatch({ type: 'UPDATE_RESERVATION', payload: { id: res.id, status: 'Rejected' } }); showNotification('Reservation rejected.', 'info'); }}
                              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all hover:shadow-md"
                              style={{ backgroundColor: '#FEE2E2', color: '#991B1B', fontFamily: 'var(--font-heading)' }}
                            >
                              <X size={12} /> Reject
                            </button>
                            {adminRole === 'admin' && (
                              <button
                                onClick={() => setDeleteConfirm({
                                  isOpen: true,
                                  title: 'Delete Reservation?',
                                  message: `Are you sure you want to delete reservation for ${res.name}?`,
                                  onConfirm: () => {
                                    dispatch({ type: 'DELETE_RESERVATION', payload: res.id });
                                    setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
                                    showNotification('Reservation deleted.', 'info');
                                  }
                                })}
                                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                              >
                                <Trash2 size={14} style={{ color: '#9CA3AF' }} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {state.reservations.length === 0 && (
                      <div className="bg-white rounded-2xl py-20 text-center shadow-sm">
                        <Calendar size={44} className="mx-auto mb-3" style={{ color: '#D1D5DB' }} />
                        <p style={{ color: '#6B7280', fontSize: '15px' }}>No reservations yet.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ══ DELETED ORDERS ARCHIVE ═════════════════════ */}
            {activeTab === 'deleted-orders' && <DeletedOrdersManagement />}

            {/* ══ INVENTORY ══════════════════════════════════ */}
            {activeTab === 'inventory' && <InventoryManagement />}
            {activeTab === 'expense' && <ExpenseManagement />}
            {activeTab === 'cash-register' && <CashRegisterManagement />}

            {activeTab === 'payroll' && <PayrollManagement />}
            {activeTab === 'manual-invoice' && <ManualInvoice />}
            {activeTab === 'printer-settings' && <PrinterSettings />}
            {activeTab === 'reprint' && <ReprintSystem />}
            {activeTab === 'roles' && adminRole === 'admin' && <RoleManagement />}
            {activeTab === 'delivery-settings' && <DeliverySettingsPanel />}
            {/* ══ TABLE MANAGEMENT ════════════════════════════ */}
            {activeTab === 'tables' && <TableManagement />}

            {/* ══ MENU MANAGEMENT ════════════════════════════ */}
            {activeTab === 'menu' && (
              <div>
                {/* Toolbar */}
                <div className="flex items-center justify-between mb-5">
                  <p style={{ color: '#6B7280', fontSize: '14px', fontFamily: 'var(--font-body)' }}>
                    <span style={{ fontWeight: 700, color: '#111', fontFamily: 'var(--font-heading)' }}>{state.menuItems.length}</span> menu items
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="relative hidden sm:block">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
                      <input
                        type="text"
                        placeholder="Search menu items..."
                        value={menuSearchTerm}
                        onChange={(e) => setMenuSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 rounded-xl border text-sm"
                        style={{ borderColor: 'rgba(249,0,43,0.15)', outline: 'none', fontFamily: 'var(--font-body)' }}
                      />
                    </div>
                    <button
                      onClick={() => { setMenuForm(blankMenuForm); setShowAddMenu(true); }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg hover:-translate-y-0.5"
                      style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)' }}
                    >
                      <Plus size={15} /> Add New Item
                    </button>
                  </div>
                </div>

                {/* Menu Items Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {state.isInitialLoading ? (
                    Array.from({ length: 8 }).map((_, i) => <POSCardSkeleton key={i} />)
                  ) : (
                    state.menuItems
                      .filter(item =>
                        item.name.toLowerCase().includes(menuSearchTerm.toLowerCase()) ||
                        item.category.toLowerCase().includes(menuSearchTerm.toLowerCase())
                      )
                      .map(item => (
                        <div key={item.id} className="bg-white rounded-2xl overflow-hidden shadow-sm group" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
                          <div className="relative h-44 overflow-hidden">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />
                            <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                              {item.isPopular && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: '#F9002B', color: '#0A0A0A', fontFamily: 'var(--font-heading)' }}>Popular</span>
                              )}
                              {item.isVeg && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: '#16A34A', color: 'white', fontFamily: 'var(--font-heading)' }}>Veg</span>
                              )}
                            </div>
                            <div className="absolute bottom-2 right-2">
                              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '16px', color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>৳{item.price}</span>
                            </div>
                          </div>
                          <div className="p-3.5">
                            <div className="mb-1">
                              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '13px', color: '#111' }} className="line-clamp-1">{item.name}</h3>
                              <p style={{ fontSize: '11px', color: '#6B7280' }}>{item.category} • {item.spiceLevel}</p>
                            </div>
                            <div className="flex items-center gap-1 mb-3">
                              <Star size={10} fill="#F9002B" style={{ color: '#F9002B' }} />
                              <span style={{ fontSize: '11px', color: '#6B7280' }}>{item.rating} ({item.reviewCount})</span>
                            </div>
                            {/* Action Buttons */}
                            <div className="grid grid-cols-3 gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingMenuItem(item);
                                  setMenuForm(menuItemToForm(item));
                                }}
                                className="flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-semibold transition-all hover:shadow-sm"
                                style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', fontFamily: 'var(--font-heading)' }}
                              >
                                <Edit2 size={11} />
                                <span style={{ fontSize: '10px' }}>Edit</span>
                              </button>
                              <button
                                onClick={() => {
                                  dispatch({ type: 'UPDATE_MENU_ITEM', payload: { ...item, isPopular: !item.isPopular } });
                                  showNotification(`${item.name} ${item.isPopular ? 'unfeatured' : 'featured'}!`, 'success');
                                }}
                                className="flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-semibold transition-all hover:shadow-sm"
                                style={{ backgroundColor: item.isPopular ? 'rgba(249,0,43,0.2)' : '#F3F4F6', color: item.isPopular ? '#C8001F' : '#6B7280', fontFamily: 'var(--font-heading)' }}
                              >
                                <Star size={11} fill={item.isPopular ? '#F9002B' : 'none'} style={{ color: item.isPopular ? '#F9002B' : '#6B7280' }} />
                                <span style={{ fontSize: '10px' }}>{item.isPopular ? 'Unfeature' : 'Feature'}</span>
                              </button>
                              {adminRole === 'admin' && (
                                <button
                                  onClick={() => setDeleteConfirm({
                                    isOpen: true,
                                    title: 'Delete Menu Item?',
                                    message: `Are you sure you want to delete ${item.name}?`,
                                    onConfirm: () => {
                                      dispatch({ type: 'DELETE_MENU_ITEM', payload: item.id });
                                      setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
                                      showNotification(`${item.name} deleted.`, 'info');
                                    }
                                  })}
                                  className="flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-semibold transition-all hover:shadow-sm"
                                  style={{ backgroundColor: '#FEE2E2', color: '#DC2626', fontFamily: 'var(--font-heading)' }}
                                >
                                  <Trash2 size={11} />
                                  <span style={{ fontSize: '10px' }}>Delete</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>

                {(!state.isInitialLoading && state.menuItems.length === 0) && (
                  <div className="bg-white rounded-2xl py-20 text-center shadow-sm mt-4">
                    <UtensilsCrossed size={44} className="mx-auto mb-3" style={{ color: '#D1D5DB' }} />
                    <p style={{ color: '#6B7280', fontSize: '15px' }}>No menu items. Click "Add New Item" to get started.</p>
                  </div>
                )}
              </div>
            )}

            {/* ══ CHEF MANAGEMENT ════════════════════════════ */}
            {activeTab === 'chefs' && <ChefManagement />}

            {/* ══ GALLERY MANAGEMENT ═════════════════════════ */}
            {activeTab === 'gallery' && (
              <div>
                {/* Sub-Tabs */}
                <div className="flex gap-2 mb-6">
                  {([
                    { id: 'gallery', label: 'Gallery Images', icon: Image, count: state.galleryImages.length },
                    { id: 'carousel', label: 'Carousel Slides', icon: Layers, count: state.carouselSlides.length },
                  ] as const).map(({ id, label, icon: Icon, count }) => (
                    <button
                      key={id}
                      onClick={() => setGallerySubTab(id)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                      style={{
                        background: gallerySubTab === id ? 'linear-gradient(135deg, #F9002B, #C8001F)' : 'white',
                        color: gallerySubTab === id ? '#fff' : '#6B7280',
                        border: '1px solid',
                        borderColor: gallerySubTab === id ? 'transparent' : 'rgba(249,0,43,0.15)',
                        fontFamily: 'var(--font-heading)',
                        boxShadow: gallerySubTab === id ? '0 4px 12px rgba(249,0,43,0.3)' : 'none',
                      }}
                    >
                      <Icon size={14} />
                      {label}
                      <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: gallerySubTab === id ? 'rgba(255,255,255,0.2)' : 'rgba(249,0,43,0.08)', color: gallerySubTab === id ? '#fff' : '#F9002B', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                        {count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* ── Gallery Images Sub-Tab ── */}
                {gallerySubTab === 'gallery' && (
                  <div>
                    {/* Add Gallery Form */}
                    <div className="bg-white rounded-2xl p-5 mb-5 shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px', color: '#111' }}>Add New Gallery Image</h3>
                        <button
                          onClick={() => { setGalleryForm({ url: '', title: '', category: 'Food' }); setShowAddGallery(true); }}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg"
                          style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)' }}
                        >
                          <Plus size={14} /> Add Image
                        </button>
                      </div>
                      <p style={{ fontSize: '13px', color: '#6B7280' }}>
                        {state.galleryImages.length} images across {['Restaurant', 'Food', 'Events', 'Kitchen'].map(cat => `${cat}: ${state.galleryImages.filter(g => g.category === cat).length}`).join(' • ')}
                      </p>
                    </div>

                    {/* Gallery Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {state.isInitialLoading ? (
                        Array.from({ length: 5 }).map((_, i) => <AdminStatSkeleton key={i} />)
                      ) : (
                        <>
                          {state.galleryImages.map(img => (
                            <div key={img.id} className="relative bg-white rounded-2xl overflow-hidden shadow-sm group" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
                              <div className="relative h-32 overflow-hidden">
                                <img src={img.url} alt={img.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                {/* Hover overlay with actions */}
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                                  <button
                                    onClick={() => {
                                      setEditingGallery({ id: img.id, url: img.url, title: img.title, category: img.category });
                                      setGalleryForm({ url: img.url, title: img.title, category: img.category });
                                    }}
                                    className="w-8 h-8 rounded-full flex items-center justify-center bg-white/90 hover:bg-white transition-colors"
                                  >
                                    <Edit2 size={12} style={{ color: '#1E40AF' }} />
                                  </button>
                                  {adminRole === 'admin' && (
                                    <button
                                      onClick={() => setDeleteConfirm({
                                        isOpen: true,
                                        title: 'Delete Image?',
                                        message: `Are you sure you want to remove this gallery image?`,
                                        onConfirm: () => {
                                          dispatch({ type: 'DELETE_GALLERY_IMAGE', payload: img.id });
                                          setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
                                          showNotification('Image removed.', 'info');
                                        }
                                      })}
                                      className="w-8 h-8 rounded-full flex items-center justify-center bg-white/90 hover:bg-white transition-colors"
                                    >
                                      <Trash2 size={12} style={{ color: '#DC2626' }} />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="p-2.5">
                                <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '11px', color: '#111' }} className="line-clamp-1">{img.title}</p>
                                <span className="inline-block px-1.5 py-0.5 rounded-md text-xs mt-1" style={{ backgroundColor: '#F0EDE8', color: '#6B7280', fontSize: '10px', fontFamily: 'var(--font-heading)' }}>{img.category}</span>
                              </div>
                            </div>
                          ))}
                          {state.galleryImages.length === 0 && (
                            <div className="col-span-full bg-white rounded-2xl py-16 text-center shadow-sm">
                              <Image size={40} className="mx-auto mb-3" style={{ color: '#D1D5DB' }} />
                              <p style={{ color: '#6B7280', fontSize: '14px' }}>No gallery images yet.</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Carousel Slides Sub-Tab ── */}
                {gallerySubTab === 'carousel' && (
                  <div>
                    <div className="bg-white rounded-2xl p-5 mb-5 shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px', color: '#111' }}>Homepage Carousel Slides</h3>
                          <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>Manage the hero carousel displayed on the homepage</p>
                        </div>
                        <button
                          onClick={() => { setCarouselForm({ url: '', title: '', subtitle: '', description: '', badge: '', link: '' }); setShowAddCarousel(true); }}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:shadow-lg"
                          style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', color: '#0A0A0A', fontFamily: 'var(--font-heading)' }}
                        >
                          <Plus size={14} /> Add Slide
                        </button>
                      </div>
                    </div>

                    {/* Carousel Slides List */}
                    <div className="space-y-3">
                      {state.isInitialLoading ? (
                        Array.from({ length: 3 }).map((_, i) => <AdminStatSkeleton key={i} />)
                      ) : (
                        <>
                          {state.carouselSlides.map((slide, index) => (
                            <div key={slide.id} className="bg-white rounded-2xl overflow-hidden shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
                              <div className="flex items-stretch gap-0">
                                {/* Slide preview */}
                                <div className="relative w-48 h-28 flex-shrink-0">
                                  <img src={optimizeCloudinaryUrl(slide.url, 400)} alt={slide.title} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(26,0,0,0.6), transparent)' }} />
                                  <span className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: 'rgba(0,0,0,0.5)', fontFamily: 'var(--font-heading)' }}>
                                    {index + 1}
                                  </span>
                                </div>
                                {/* Slide info */}
                                <div className="flex-1 p-4 flex flex-col justify-center">
                                  <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '15px', color: '#111', marginBottom: '2px' }}>{slide.title}</p>
                                  {slide.subtitle && <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>{slide.subtitle}</p>}
                                  {slide.badge && (
                                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold self-start" style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', color: '#0A0A0A', fontFamily: 'var(--font-heading)' }}>
                                      {slide.badge}
                                    </span>
                                  )}
                                  {slide.description && <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }} className="line-clamp-1">{slide.description}</p>}
                                </div>
                                {/* Actions */}
                                <div className="flex flex-col justify-center gap-1.5 px-3 border-l" style={{ borderColor: 'rgba(0,0,0,0.05)', minWidth: '90px' }}>
                                  {/* Move Up / Down row */}
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => dispatch({ type: 'REORDER_CAROUSEL_SLIDE', payload: { fromIndex: index, toIndex: index - 1 } })}
                                      disabled={index === 0}
                                      className="flex-1 flex items-center justify-center h-7 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200"
                                      style={{ backgroundColor: '#F3F4F6', color: '#374151' }}
                                      title="Move Up"
                                    >
                                      <ChevronUp size={13} />
                                    </button>
                                    <button
                                      onClick={() => dispatch({ type: 'REORDER_CAROUSEL_SLIDE', payload: { fromIndex: index, toIndex: index + 1 } })}
                                      disabled={index === state.carouselSlides.length - 1}
                                      className="flex-1 flex items-center justify-center h-7 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200"
                                      style={{ backgroundColor: '#F3F4F6', color: '#374151' }}
                                      title="Move Down"
                                    >
                                      <ChevronDown size={13} />
                                    </button>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setEditingCarousel(slide);
                                      setCarouselForm({ url: slide.url, title: slide.title, subtitle: slide.subtitle, description: slide.description, badge: slide.badge, link: slide.link || '' });
                                    }}
                                    className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all hover:shadow-sm"
                                    style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', fontFamily: 'var(--font-heading)' }}
                                  >
                                    <Edit2 size={10} /> Edit
                                  </button>
                                  {adminRole === 'admin' && (
                                    <button
                                      onClick={() => setDeleteConfirm({
                                        isOpen: true,
                                        title: 'Delete Slide?',
                                        message: `Are you sure you want to remove this slide?`,
                                        onConfirm: () => {
                                          dispatch({ type: 'DELETE_CAROUSEL_SLIDE', payload: slide.id });
                                          setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
                                          showNotification('Slide removed.', 'info');
                                        }
                                      })}
                                      className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all hover:shadow-sm"
                                      style={{ backgroundColor: '#FEE2E2', color: '#DC2626', fontFamily: 'var(--font-heading)' }}
                                    >
                                      <Trash2 size={10} /> Remove
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                          {state.carouselSlides.length === 0 && (
                            <div className="bg-white rounded-2xl py-16 text-center shadow-sm">
                              <Layers size={40} className="mx-auto mb-3" style={{ color: '#D1D5DB' }} />
                              <p style={{ color: '#6B7280', fontSize: '14px' }}>No carousel slides yet. Click "Add Slide" to add one.</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══ PAYMENTS ═══════════════════════════════════ */}
            {activeTab === 'payments' && (
              <div className="space-y-5">
                {/* Revenue Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: 'Today', value: todayRevenue, icon: DollarSign, color: '#16A34A', bg: '#DCFCE7', sub: `${allUnifiedOrders.filter(o => o.timestamp >= startOfDay).length} orders` },
                    { label: 'This Week', value: weeklyRevenue, icon: TrendingUp, color: '#2563EB', bg: '#DBEAFE', sub: `${allUnifiedOrders.filter(o => o.timestamp >= startOfWeek).length} orders` },
                    { label: 'This Month', value: monthlyRevenue, icon: CreditCard, color: '#7C3AED', bg: '#EDE9FE', sub: `${allUnifiedOrders.filter(o => o.timestamp >= startOfMonth).length} orders` },
                    { label: 'All Time', value: state.analytics?.totalRevenue || totalRevenue, icon: Wallet, color: '#F9002B', bg: '#FEF9EC', sub: `${state.analytics?.totalCustomers || allUnifiedOrders.length} total orders` },
                  ].map(({ label, value, icon: Icon, color, bg, sub }) => (
                    <div key={label} className="bg-white p-4 rounded-xl shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: bg }}>
                          <Icon size={16} style={{ color }} />
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: bg, color, fontFamily: 'var(--font-heading)' }}>{label}</span>
                      </div>
                      <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '22px', color, lineHeight: 1 }}>৳{value.toLocaleString()}</p>
                      <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>{sub}</p>
                    </div>
                  ))}
                </div>

                {/* Weekly Bar Chart + Payment Methods */}
                <div className="grid lg:grid-cols-5 gap-5">
                  {/* Weekly Revenue Bar Chart */}
                  <div className="lg:col-span-3 bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px', color: '#111' }}>Weekly Revenue</h3>
                        <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>Mon–Sun breakdown</p>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl" style={{ backgroundColor: '#F0EDE8' }}>
                        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '13px', color: '#F9002B' }}>৳{weeklyRevenue.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex items-end gap-2 h-36">
                      {weeklyBreakdown.map(({ day, rev }, i) => {
                        const isToday = i === dayOfWeek;
                        const pct = maxDayRev > 0 ? (rev / maxDayRev) * 100 : 0;
                        return (
                          <div key={day} className="flex-1 flex flex-col items-center gap-1">
                            {rev > 0 && (
                              <span style={{ fontSize: '9px', color: '#6B7280', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                                {rev >= 1000 ? `${(rev / 1000).toFixed(1)}k` : rev}
                              </span>
                            )}
                            <div className="w-full rounded-t-lg transition-all" style={{
                              height: `${Math.max(pct, rev > 0 ? 8 : 3)}%`,
                              background: isToday
                                ? 'linear-gradient(to top, #F9002B, #F9002B)'
                                : rev > 0 ? 'linear-gradient(to top, #DBEAFE, #3B82F6)' : '#F3F4F6',
                              minHeight: '4px',
                            }} />
                            <span style={{ fontSize: '10px', color: isToday ? '#F9002B' : '#9CA3AF', fontFamily: 'var(--font-heading)', fontWeight: isToday ? 700 : 400 }}>{day}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Payment Method Breakdown */}
                  <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px', color: '#111', marginBottom: '16px' }}>Payment Methods</h3>
                    <div className="space-y-5">
                      {[
                        { label: 'bKash', orders: bkashOrders.length, total: bkashTotal, color: '#E2136E', bg: '#FDF0F6', iconBg: 'rgba(226,19,110,0.12)', Icon: Smartphone },
                        { label: 'Nagad', orders: nagadOrders.length, total: nagadTotal, color: '#F7941D', bg: '#FFF4E8', iconBg: 'rgba(247,148,29,0.12)', Icon: Smartphone },
                        { label: 'Cash / COD', orders: cashOrders.length, total: cashTotal, color: '#16A34A', bg: '#F0FDF4', iconBg: 'rgba(22,163,74,0.12)', Icon: Banknote },
                        { label: 'Card', orders: cardOrders.length, total: cardTotal, color: '#2563EB', bg: '#DBEAFE', iconBg: 'rgba(37,99,235,0.12)', Icon: CreditCard },
                      ].map(({ label, orders, total, color, bg, iconBg, Icon }) => {
                        const pct = totalRevenue > 0 ? Math.round((total / totalRevenue) * 100) : 0;
                        return (
                          <div key={label}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: iconBg }}>
                                  <Icon size={15} style={{ color }} />
                                </div>
                                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '13px', color: '#1F2937' }}>{label}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{orders} orders</span>
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: bg, color, fontFamily: 'var(--font-heading)' }}>{pct}%</span>
                              </div>
                            </div>
                            <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: bg }}>
                              <div className="h-2.5 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}99, ${color})` }} />
                            </div>
                            <div className="flex items-center justify-between mt-1.5">
                              <p style={{ fontSize: '12px', color, fontFamily: 'var(--font-heading)', fontWeight: 800 }}>৳{total.toLocaleString()}</p>
                              <p style={{ fontSize: '10px', color: '#9CA3AF' }}>of ৳{totalRevenue.toLocaleString()} total</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* All Payment Transactions */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px', color: '#111' }}>All Payment Transactions</h3>
                      <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>{allUnifiedOrders.length} total payments received</p>
                    </div>
                    <div className="flex gap-2">
                      {[
                        { label: 'Pending', count: allUnifiedOrders.filter(o => o.status === 'Pending').length, color: '#92400E', bg: '#FEF3C7' },
                        { label: 'Delivered', count: allUnifiedOrders.filter(o => o.status === 'Delivered' || o.status === 'Served' || o.status === 'Paid').length, color: '#065F46', bg: '#D1FAE5' },
                      ].map(({ label, count, color, bg }) => (
                        <span key={label} className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: bg, color, fontFamily: 'var(--font-heading)' }}>
                          {label}: {count}
                        </span>
                      ))}
                      <button
                        onClick={handleExportPayments}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 ml-2"
                        style={{ backgroundColor: '#F9002B', fontFamily: 'var(--font-heading)' }}
                      >
                        <Download size={16} />
                        Export PDF
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ backgroundColor: '#FFF5F5', borderBottom: '1px solid rgba(249,0,43,0.08)' }}>
                          {['#', 'Order No.', 'Customer', 'Amount', 'Method', 'Order Status', 'Date'].map(h => (
                            <th key={h} className="px-4 py-3 text-left" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '10px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.7px' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {allUnifiedOrders.map((order, idx) => {
                          const methodColors: Record<string, { color: string; bg: string }> = {
                            'bKash': { color: '#E2136E', bg: '#FDF0F6' },
                            'Nagad': { color: '#F7941D', bg: '#FFF4E8' },
                            'Cash on Delivery': { color: '#16A34A', bg: '#F0FDF4' },
                            'At Table': { color: '#2563EB', bg: '#DBEAFE' },
                            'Cash': { color: '#16A34A', bg: '#F0FDF4' },
                            'Card': { color: '#2563EB', bg: '#DBEAFE' },
                            'Split': { color: '#7C3AED', bg: '#F5F3FF' },
                          };
                          const mc = methodColors[order.paymentMethod] || { color: '#6B7280', bg: '#F3F4F6' };
                          return (
                            <tr key={order.id} className="border-b hover:bg-amber-50/20 transition-colors" style={{ borderColor: 'rgba(0,0,0,0.04)' }}>
                              <td className="px-4 py-3" style={{ fontSize: '12px', color: '#9CA3AF' }}>{allUnifiedOrders.length - idx}</td>
                              <td className="px-4 py-3">
                                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '13px', color: '#F9002B' }}>#{order.orderNumber}</span>
                              </td>
                              <td className="px-4 py-3">
                                <p style={{ fontSize: '13px', fontWeight: 600, color: '#111', fontFamily: 'var(--font-heading)' }}>{order.displayTitle}</p>
                                <p style={{ fontSize: '11px', color: '#9CA3AF' }}>{order.displayPhone}</p>
                              </td>
                              <td className="px-4 py-3">
                                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '14px', color: '#16A34A' }}>৳{order.total.toLocaleString()}</span>
                              </td>
                              <td className="px-4 py-3">
                                {order.splitPayments && order.splitPayments.length > 0 ? (
                                  <div className="flex flex-col gap-1 items-start">
                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700" style={{ fontFamily: 'var(--font-heading)' }}>
                                      Split Payment
                                    </span>
                                    <div className="flex flex-wrap gap-1 text-[10px]">
                                      {order.splitPayments.map((sp: any, i: number) => (
                                        <span key={i} className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-bold border border-gray-200">
                                          {sp.method}: ৳{sp.amount}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: mc.bg, color: mc.color, fontFamily: 'var(--font-heading)' }}>
                                    {order.paymentMethod}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <StatusBadge status={order.status} />
                              </td>
                              <td className="px-4 py-3" style={{ fontSize: '12px', color: '#6B7280' }}>
                                {new Date(order.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit', timeZone: 'Asia/Dhaka' })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {(!state.isInitialLoading && allUnifiedOrders.length === 0) && (
                      <div className="py-20 text-center">
                        <CreditCard size={40} className="mx-auto mb-3" style={{ color: '#D1D5DB' }} />
                        <p style={{ color: '#6B7280', fontSize: '15px' }}>No payment records yet.</p>
                        <p style={{ color: '#9CA3AF', fontSize: '13px', marginTop: '4px' }}>Payments will appear here once customers place orders.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ══ MESSAGES ═══════════════════════════════════ */}
            {activeTab === 'messages' && (
              <div className="space-y-4">
                {state.isInitialLoading ? (
                  Array.from({ length: 4 }).map((_, i) => <AdminStatSkeleton key={i} />)
                ) : (
                  <>
                    {state.messages.map(msg => (
                      <div
                        key={msg.id}
                        className="bg-white rounded-2xl p-5 shadow-sm"
                        style={{ border: `1px solid ${!msg.isRead ? 'rgba(249,0,43,0.2)' : 'rgba(0,0,0,0.04)'}`, backgroundColor: !msg.isRead ? '#FFFAF7' : 'white' }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow" style={{ background: 'linear-gradient(135deg, #F9002B, #F9002B)', fontFamily: 'var(--font-heading)', fontSize: '16px' }}>
                              {msg.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '14px', color: '#111' }}>{msg.name}</p>
                                {!msg.isRead && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#F9002B' }} />}
                              </div>
                              <p style={{ fontSize: '12px', color: '#6B7280' }}>{msg.email} • {msg.phone}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{new Date(msg.createdAt).toLocaleDateString('en-US', { timeZone: 'Asia/Dhaka' })}</span>
                            <button onClick={() => dispatch({ type: 'READ_MESSAGE', payload: msg.id })} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Mark as read">
                              <Eye size={14} style={{ color: '#6B7280' }} />
                            </button>
                            <button
                              onClick={() => setReplyingTo({ id: msg.id, name: msg.name })}
                              className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                              title="Reply"
                            >
                              <Send size={14} style={{ color: '#2563EB' }} />
                            </button>
                            {adminRole === 'admin' && (
                              <button onClick={() => setDeleteConfirm({
                                isOpen: true,
                                title: 'Delete Message?',
                                message: `Are you sure you want to delete this message?`,
                                onConfirm: () => {
                                  dispatch({ type: 'DELETE_MESSAGE', payload: msg.id });
                                  setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
                                  showNotification('Message deleted.', 'info');
                                }
                              })} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Delete">
                                <Trash2 size={14} style={{ color: '#DC2626' }} />
                              </button>
                            )}
                          </div>
                        </div>
                        {msg.subject && (
                          <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '13px', color: '#374151', marginBottom: '6px' }}>
                            Subject: {msg.subject}
                          </p>
                        )}
                        <div className="p-3.5 rounded-xl" style={{ backgroundColor: '#F9F5F0' }}>
                          <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>{msg.message}</p>
                        </div>
                        {msg.reply && (
                          <div className="mt-3 p-3.5 rounded-xl flex gap-3" style={{ backgroundColor: 'rgba(249,0,43,0.05)', border: '1px solid rgba(249,0,43,0.1)' }}>
                            <Send size={14} style={{ color: '#F9002B', marginTop: '2px', flexShrink: 0 }} />
                            <div>
                              <p style={{ fontSize: '11px', color: '#F9002B', fontWeight: 700, marginBottom: '3px', fontFamily: 'var(--font-heading)' }}>Your Reply</p>
                              <p style={{ fontSize: '13px', color: '#374151' }}>{msg.reply}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {state.messages.length === 0 && (
                      <div className="bg-white rounded-2xl py-20 text-center shadow-sm">
                        <MessageSquare size={44} className="mx-auto mb-3" style={{ color: '#D1D5DB' }} />
                        <p style={{ color: '#6B7280', fontSize: '15px' }}>No messages yet.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

          </div>
        </div>

        {/* ── Modals ─────────────────────────────────────── */}

        {/* Add Menu Item Modal */}
        {showAddMenu && (
          <MenuItemModal
            title="Add New Menu Item"
            form={menuForm}
            setForm={setMenuForm}
            onSave={handleSaveMenuItem}
            onClose={() => { setShowAddMenu(false); setMenuForm(blankMenuForm); }}
            categories={menuCategories}
          />
        )}

        {/* Edit Menu Item Modal */}
        {editingMenuItem && (
          <MenuItemModal
            title={`Edit: ${editingMenuItem.name}`}
            form={menuForm}
            setForm={setMenuForm}
            onSave={handleSaveMenuItem}
            onClose={() => { setEditingMenuItem(null); setMenuForm(blankMenuForm); }}
            categories={menuCategories}
          />
        )}

        {/* Add Gallery Image Modal */}
        {showAddGallery && (
          <GalleryEditModal
            title="Add Gallery Image"
            form={galleryForm}
            setForm={setGalleryForm}
            onSave={handleSaveGallery}
            onClose={() => { setShowAddGallery(false); setGalleryForm({ url: '', title: '', category: 'Food' }); }}
          />
        )}

        {/* Edit Gallery Image Modal */}
        {editingGallery && (
          <GalleryEditModal
            title="Edit Gallery Image"
            form={galleryForm}
            setForm={setGalleryForm}
            onSave={handleSaveGallery}
            onClose={() => { setEditingGallery(null); setGalleryForm({ url: '', title: '', category: 'Food' }); }}
          />
        )}

        {/* Add Carousel Slide Modal */}
        {showAddCarousel && (
          <CarouselSlideModal
            title="Add Carousel Slide"
            form={carouselForm}
            setForm={setCarouselForm}
            onSave={handleSaveCarousel}
            onClose={() => { setShowAddCarousel(false); setCarouselForm({ url: '', title: '', subtitle: '', description: '', badge: '', link: '' }); }}
          />
        )}

        {/* Edit Carousel Slide Modal */}
        {editingCarousel && (
          <CarouselSlideModal
            title="Edit Carousel Slide"
            form={carouselForm}
            setForm={setCarouselForm}
            onSave={handleSaveCarousel}
            onClose={() => { setEditingCarousel(null); setCarouselForm({ url: '', title: '', subtitle: '', description: '', badge: '', link: '' }); }}
          />
        )}

        {/* Reply Modal */}
        {replyingTo && (
          <ReplyModal
            msgId={replyingTo.id}
            msgName={replyingTo.name}
            onSend={(id, reply) => {
              dispatch({ type: 'REPLY_MESSAGE', payload: { id, reply } });
              showNotification('Reply saved!', 'success');
            }}
            onClose={() => setReplyingTo(null)}
          />
        )}
      </div>

      {/* ══ VIEW ORDER DETAILS MODAL ═════════════════════════════════════ */}
      {viewOrderDetails && (
        <ModalOverlay onClose={() => setViewOrderDetails(null)}>
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewOrderDetails(null)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </button>

            <div className="mb-6">
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '24px', color: '#111' }}>
                Order #{viewOrderDetails.orderNumber || viewOrderDetails.id?.substring(0, 6)}
              </h2>
              <div className="flex justify-between items-center mt-2">
                <p style={{ fontSize: '14px', color: '#6B7280' }}>{new Date(viewOrderDetails.timestamp || viewOrderDetails.createdAt).toLocaleString()}</p>
                <StatusBadge status={viewOrderDetails.status} />
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label style={labelStyle}>Customer Info</label>
                <p style={{ fontSize: '15px', color: '#111', fontWeight: 600 }}>{viewOrderDetails.displayTitle || viewOrderDetails.customerName}</p>
                <p style={{ fontSize: '14px', color: '#4B5563' }}>{viewOrderDetails.displayPhone || viewOrderDetails.phone}</p>
                {viewOrderDetails.address && <p style={{ fontSize: '14px', color: '#4B5563', marginTop: '2px' }}>{viewOrderDetails.address}</p>}
              </div>

              <div>
                <label style={labelStyle}>Payment Method</label>
                {viewOrderDetails.splitPayments && viewOrderDetails.splitPayments.length > 0 ? (
                  <div className="mt-1 p-3 rounded-2xl bg-purple-50/80 border border-purple-200 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-purple-900" style={{ fontFamily: 'var(--font-heading)' }}>
                      <span>Divide / Split Payment:</span>
                      <span className="text-purple-700">Total: ৳{viewOrderDetails.total?.toFixed(2)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {viewOrderDetails.splitPayments.map((sp: any, i: number) => {
                        const color =
                          sp.method === 'bKash' ? '#E2136E' :
                            sp.method === 'Nagad' ? '#F7941D' :
                              sp.method === 'Card' ? '#0284C7' : '#16A34A';
                        const bg =
                          sp.method === 'bKash' ? '#FDF2F8' :
                            sp.method === 'Nagad' ? '#FFF7ED' :
                              sp.method === 'Card' ? '#F0F9FF' : '#F0FDF4';

                        return (
                          <div
                            key={i}
                            className="flex items-center justify-between p-2 rounded-xl border text-xs font-bold"
                            style={{ backgroundColor: bg, borderColor: `${color}33` }}
                          >
                            <span style={{ color, fontFamily: 'var(--font-heading)' }}>{sp.method}</span>
                            <span className="text-gray-900 font-extrabold">৳{Number(sp.amount).toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: '14px', color: '#4B5563', fontWeight: 600 }}>{viewOrderDetails.paymentMethod}</p>
                )}
              </div>

              <div>
                <label style={labelStyle}>Order Items ({viewOrderDetails.items?.length || 0})</label>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3 mt-1 max-h-60 overflow-y-auto">
                  {viewOrderDetails.items?.map((cartItem: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: '#111', fontFamily: 'var(--font-heading)' }}>
                          {cartItem.quantity}x {cartItem.item?.name || cartItem.name}
                        </p>
                        {cartItem.specialRequest && (
                          <p style={{ fontSize: '12px', color: '#F9002B', marginTop: '2px', fontWeight: 600 }}>
                            Note: {cartItem.specialRequest}
                          </p>
                        )}
                      </div>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: '#111' }}>
                        ৳{((cartItem.item?.price || cartItem.price || 0) * cartItem.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-4 border-t border-gray-200">
                {(viewOrderDetails.discount || 0) > 0 && (
                  <>
                    <div className="flex justify-between items-center text-gray-500">
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>Subtotal</span>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>৳{(viewOrderDetails.subtotal || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-green-600 mb-2">
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>Discount</span>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>-৳{(viewOrderDetails.discount || 0).toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center">
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '16px', color: '#111' }}>Total Amount</span>
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '20px', color: '#F9002B' }}>
                    ৳{viewOrderDetails.total?.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}


      {/* ── PRINT ONLY: THERMAL RECEIPT ─────────────────────────────────────── */}
      {/* Dedicated Cascading Delete Order & Restock Modal */}
      <DeleteOrderConfirmModal
        order={orderToDelete}
        isOpen={Boolean(orderToDelete)}
        onClose={() => setOrderToDelete(null)}
      />

      {/* Generic Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print-hidden" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="text-red-600" size={24} />
            </div>
            <h3 className="text-xl font-bold text-center mb-2" style={{ fontFamily: 'var(--font-heading)' }}>{deleteConfirm.title}</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              {deleteConfirm.message}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2.5 rounded-xl font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteConfirm.onConfirm}
                className="flex-1 py-2.5 rounded-xl font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden print area for thermal printer */}
      <div id="thermal-print-area" style={{ display: 'none' }}>
        {printOrder && (() => {
          const isTable = Boolean(printOrder.isTableOrder || (printOrder.address && printOrder.address.toLowerCase().includes('table')) || printOrder.tableNumber);
          const subtotal = printOrder.items.reduce((sum: number, ci: any) => {
            const numOrZero = (v: any) => { const n = Number(v); return !isNaN(n) && isFinite(n) ? n : 0; };
            const p1 = numOrZero(ci.price);
            const p2 = ci.item ? numOrZero(ci.item.price) : 0;
            const p3 = numOrZero(ci.unitPrice || ci.item?.unitPrice || ci.sellingPrice || ci.item?.sellingPrice);
            const price = p1 > 0 ? p1 : (p2 > 0 ? p2 : (p3 > 0 ? p3 : 0));
            return sum + price * (ci.quantity || 1);
          }, 0);
          const deliveryFee = Number(printOrder.deliveryFee || 0);
          const isLegacyCombined = deliveryFee > 0 && Number(printOrder.total) >= (subtotal + deliveryFee - 0.5);
          const customerGrandTotal = isLegacyCombined ? Number(printOrder.total) : (Number(printOrder.total) + deliveryFee);
          return (
            <div style={{
              width: '80mm',
              margin: '0 auto',
              padding: '4mm 3mm',
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: '11px',
              color: '#000',
              background: '#fff',
              lineHeight: '1.4',
            }}>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                <div style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '3px', lineHeight: '1.1' }}>
                  PIZZORA
                </div>
                <div style={{ fontSize: '10px', marginTop: '2px', color: '#333' }}>Authentic Pizza & Dining Experience</div>
                <div style={{ fontSize: '10px', color: '#333' }}>📞 +8801620026649</div>
                <div style={{ fontSize: '10px', color: '#333' }}>🌐 pizzora.bd</div>
                <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }}></div>
              </div>

              {/* Order Type Badge */}
              <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                <span style={{
                  display: 'inline-block',
                  border: '1px solid #000',
                  padding: '1px 8px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                }}>
                  {isTable ? 'DINE-IN ORDER' : 'DELIVERY ORDER'}
                </span>
              </div>

              {/* Order Meta */}
              <div style={{ borderBottom: '1px dashed #000', paddingBottom: '4px', marginBottom: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Order #</span>
                  <span style={{ fontWeight: 'bold' }}>
                    {isTable ? printOrder.id?.slice(-8).toUpperCase() : printOrder.orderNumber}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Date</span>
                  <span>{new Date(printOrder.isTableOrder ? printOrder.createdAt : printOrder.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {isTable ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Table</span>
                    <span style={{ fontWeight: 'bold' }}>#{printOrder.tableNumber}</span>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Customer</span>
                      <span>{printOrder.displayTitle || printOrder.customerName || 'Guest'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Phone</span>
                      <span>{printOrder.displayPhone || printOrder.phone || '-'}</span>
                    </div>
                    {printOrder.address && (
                      <div>
                        <span>Address: </span>
                        <span>{printOrder.address}</span>
                      </div>
                    )}
                    {printOrder.notes && (
                      <div style={{ fontSize: '10px', fontStyle: 'italic', marginTop: '2px' }}>
                        <span>Note: </span>
                        <span>{printOrder.notes}</span>
                      </div>
                    )}
                  </>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Payment</span>
                  <span>
                    {printOrder.splitPayments && printOrder.splitPayments.length > 0
                      ? `Split (${printOrder.splitPayments.map((p: any) => `${p.method} ৳${p.amount}`).join(' + ')})`
                      : printOrder.paymentMethod}
                  </span>
                </div>
              </div>

              {/* Items Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px', marginBottom: '3px', fontSize: '10px' }}>
                <span style={{ flex: 3 }}>ITEM</span>
                <span style={{ flex: 1, textAlign: 'center' }}>QTY</span>
                <span style={{ flex: 1, textAlign: 'right' }}>PRICE</span>
                <span style={{ flex: 1, textAlign: 'right' }}>TOTAL</span>
              </div>

              {/* Items */}
              {printOrder.items.map((ci: any, idx: number) => {
                let itemName = '';
                if (ci.item && typeof ci.item.name === 'string' && ci.item.name.trim() && ci.item.name.trim().toLowerCase() !== 'item') {
                  itemName = ci.item.name.trim();
                } else if (typeof ci.name === 'string' && ci.name.trim() && ci.name.trim().toLowerCase() !== 'item') {
                  itemName = ci.name.trim();
                } else if (ci.item && typeof ci.item.title === 'string' && ci.item.title.trim()) {
                  itemName = ci.item.title.trim();
                } else if (typeof ci.title === 'string' && ci.title.trim()) {
                  itemName = ci.title.trim();
                } else {
                  itemName = (ci.name || ci.item?.name || 'Item').trim();
                }

                const numOrZero = (v: any) => { const n = Number(v); return !isNaN(n) && isFinite(n) ? n : 0; };
                const p1 = numOrZero(ci.price);
                const p2 = ci.item ? numOrZero(ci.item.price) : 0;
                const p3 = numOrZero(ci.unitPrice || ci.item?.unitPrice || ci.sellingPrice || ci.item?.sellingPrice);
                const itemPrice = p1 > 0 ? p1 : (p2 > 0 ? p2 : (p3 > 0 ? p3 : 0));
                const note = ci.note || ci.specialRequest || (ci.item && (ci.item.note || ci.item.specialRequest));
                return (
                  <div key={idx} style={{ marginBottom: '4px', paddingBottom: '4px', borderBottom: '1px dotted #ccc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ flex: 3, wordBreak: 'break-word', paddingRight: '4px' }}>{itemName}</span>
                      <span style={{ flex: 1, textAlign: 'center' }}>x{ci.quantity || 1}</span>
                      <span style={{ flex: 1, textAlign: 'right' }}>৳{itemPrice}</span>
                      <span style={{ flex: 1, textAlign: 'right', fontWeight: 'bold' }}>৳{itemPrice * (ci.quantity || 1)}</span>
                    </div>
                    {note && (
                      <div style={{ fontSize: '9px', color: '#555', paddingLeft: '4px' }}>↳ Note: {note}</div>
                    )}
                  </div>
                );
              })}

              {/* Totals */}
              <div style={{ borderTop: '1px dashed #000', marginTop: '4px', paddingTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal</span>
                  <span>৳{subtotal.toFixed(0)}</span>
                </div>
                {!isTable && deliveryFee > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Delivery Fee (Rider)</span>
                    <span>৳{deliveryFee.toFixed(0)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '15px', borderTop: '1px solid #000', marginTop: '4px', paddingTop: '4px' }}>
                  <span>TOTAL TO COLLECT</span>
                  <span>৳{customerGrandTotal.toFixed(0)}</span>
                </div>
                {!isTable && deliveryFee > 0 && (
                  <div style={{ fontSize: '9px', color: '#666', textAlign: 'right', marginTop: '2px' }}>
                    (Restaurant Order Balance: ৳{Number(printOrder.total || 0).toFixed(0)})
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ borderTop: '1px dashed #000', marginTop: '8px', paddingTop: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', marginBottom: '2px' }}>★★★ Thank you for choosing Pizzora! ★★★</div>
                <div style={{ fontSize: '9px', color: '#444' }}>Please come again!</div>
                <div style={{ fontSize: '8px', color: '#888', marginTop: '4px' }}>
                  Status: <strong>{printOrder.status}</strong>
                </div>
                <div style={{ fontSize: '8px', color: '#888' }}>pizzora.bd</div>
              </div>
            </div>
          );
        })()}
      </div>

      {printOrder && (
        <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body * { visibility: hidden !important; }
          .print-hidden { display: none !important; }
          #thermal-print-area { display: block !important; }
          #thermal-print-area, #thermal-print-area * { visibility: visible !important; }
          #thermal-print-area {
            position: fixed;
            left: 0;
            top: 0;
            width: 80mm;
            background: #fff;
            z-index: 99999;
          }
          #payroll-print-area { display: none !important; }
          #expense-print-area { display: none !important; }
        }
      `}</style>
      )}
    </>
  );
}
