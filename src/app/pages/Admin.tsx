import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  LayoutDashboard, ShoppingBag, Calendar, MessageSquare, Image, UtensilsCrossed,
  LogOut, Eye, Check, X, Trash2, Plus, Star, Users, DollarSign, ChevronRight,
  AlertCircle, Edit2, Save, Package, ExternalLink, Phone, Mail, MapPin,
  Clock, ChevronDown, ChevronUp, Menu as MenuIcon, PlaySquare, Layers,
  RefreshCw, Send, CheckCircle2, XCircle, LayoutGrid, CreditCard,
  TrendingUp, Wallet, Smartphone, Banknote, Trash, BarChart2, Tag, ChefHat,
  ShieldCheck, Lock, User, KeyRound, Fingerprint, Activity, BadgeCheck, EyeOff, Loader2
} from 'lucide-react';
import { useApp, OrderStatus, TableOrderStatus, CarouselSlide } from '../context/AppContext';
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
import { Printer, RotateCcw } from 'lucide-react';
import { AdminStatSkeleton, AdminListSkeleton, TableRowSkeleton, POSCardSkeleton } from '../components/Skeletons';

// Mock auth - replaced by real auth
// ─────────────────────────────────────────────────────────────────────────────

type AdminTab = 'dashboard' | 'orders' | 'reservations' | 'menu' | 'chefs' | 'gallery' | 'messages' | 'tables' | 'payments' | 'inventory' | 'expense' | 'payroll' | 'cash-register' | 'manual-invoice' | 'printer-settings' | 'reprint' | 'roles';

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
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    Pending:           { bg: '#FEF3C7', color: '#92400E' },
    Confirmed:         { bg: '#D1FAE5', color: '#065F46' },
    Preparing:         { bg: '#DBEAFE', color: '#1E40AF' },
    'Out for Delivery':{ bg: '#EDE9FE', color: '#5B21B6' },
    Delivered:         { bg: '#D1FAE5', color: '#065F46' },
    Cancelled:         { bg: '#FEE2E2', color: '#991B1B' },
    Rejected:          { bg: '#FEE2E2', color: '#991B1B' },
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
}: {
  title: string;
  form: MenuFormState;
  setForm: React.Dispatch<React.SetStateAction<MenuFormState>>;
  onSave: () => void;
  onClose: () => void;
}) {
  const categories: string[] = ['Pizza','Fried Corner','Wings','Meatbox','Burger','Sub','Shawarma','Momo','Combo','Chawomen','Seafood','Pasta','Rich Bowl','Curry','Sizzling','Platter','Ramen','Naan','Cold Coffee','Hot Coffee','Lassi','Dessert','Biryani','Couple','Soup','Wonton','Salad'];
  const spiceLevels: MenuItem['spiceLevel'][] = ['Mild','Medium','Hot','Extra Hot'];

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
              {['Restaurant','Food','Events','Kitchen'].map(c => <option key={c} value={c}>{c}</option>)}
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

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const todaysOrders = orders.filter(o => new Date(o.createdAt).getTime() >= startOfToday.getTime());
  const totalSell = todaysOrders.reduce((sum, o) => sum + o.total, 0);

  React.useEffect(() => {
    const todayStr = startOfToday.toISOString().split('T')[0];
    const todaysExpenses = expenses.filter(e => e.date === todayStr).reduce((s, e) => s + e.amount, 0);
    setTotalEarn(totalSell - todaysExpenses);
  }, [totalSell, expenses, now.getMinutes()]); // Update every minute to catch new expenses

  return (
    <div className="hidden lg:flex items-center gap-3">
      {/* Premium Clock Pill */}
      <div className="flex items-center gap-3 ml-2 px-4 py-2 rounded-xl shadow-sm" style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', border: '1px solid rgba(249,0,43,0.2)' }}>
        <div className="flex flex-col text-right">
          <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '14px', color: '#fff', lineHeight: 1.1 }}>
            {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
            {now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Component ──────────────────────────────────────────────────
export function Admin() {
  const navigate = useNavigate();
  const { state, dispatch, showNotification } = useApp();

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewOrderDetails, setViewOrderDetails] = useState<any>(null);

  // Menu Modals
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [menuForm, setMenuForm] = useState<MenuFormState>(blankMenuForm);

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

  // Print Order State
  const [printOrder, setPrintOrder] = useState<any | null>(null);

  // Generic Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const adminRole = sessionStorage.getItem('pizzora_admin_role') || 'admin';

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
      
      if (res.ok) {
        const { token, role } = await res.json();
        sessionStorage.setItem('pizzora_token', token);
        sessionStorage.setItem('pizzora_admin_logged_in', 'true');
        sessionStorage.setItem('pizzora_admin_role', role || 'admin');
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
      ...(state.tableOrders || []).map(o => ({
        ...o,
        isTableOrder: true,
        timestamp: o.createdAt,
        displayTitle: `Table ${o.tableNumber}`,
        displayPhone: 'Dine-In',
        paymentMethod: 'At Table',
        orderNumber: o.id.split('-')[1] || o.id.slice(-6)
      }))
    ];
    return unified.sort((a, b) => b.timestamp - a.timestamp);
  }, [state.orders, state.tableOrders]);

  const completedUnifiedOrders = allUnifiedOrders.filter(o => 
    o.isTableOrder ? o.status === 'Paid' : o.status === 'Delivered'
  );

  const totalRevenue = completedUnifiedOrders.reduce((sum, o) => sum + o.total, 0);
  const pendingOrders = allUnifiedOrders.filter(o => o.status === 'Pending').length;
  const pendingReservations = state.reservations.filter(r => r.status === 'Pending').length;
  const unreadMessages = state.messages.filter(m => !m.isRead).length;
  const pendingTableOrders = (state.tableOrders ?? []).filter(o => o.status === 'Pending').length;

  // ── Payment Analytics ─────────────────────────────────────────────────
  const now = new Date();
  const startOfToday   = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayOfWeek      = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0=Mon
  const startOfWeek    = startOfToday - dayOfWeek * 86400000;
  const startOfMonth   = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const todayRevenue   = completedUnifiedOrders.filter(o => o.timestamp >= startOfToday).reduce((s, o) => s + o.total, 0);
  const weeklyRevenue  = completedUnifiedOrders.filter(o => o.timestamp >= startOfWeek).reduce((s, o) => s + o.total, 0);
  const monthlyRevenue = completedUnifiedOrders.filter(o => o.timestamp >= startOfMonth).reduce((s, o) => s + o.total, 0);

  const bkashOrders  = completedUnifiedOrders.filter(o => o.paymentMethod === 'bKash');
  const nagadOrders  = completedUnifiedOrders.filter(o => o.paymentMethod === 'Nagad');
  const codOrders    = completedUnifiedOrders.filter(o => o.paymentMethod === 'Cash on Delivery' || o.paymentMethod === 'At Table');
  const bkashTotal   = bkashOrders.reduce((s, o) => s + o.total, 0);
  const nagadTotal   = nagadOrders.reduce((s, o) => s + o.total, 0);
  const codTotal     = codOrders.reduce((s, o) => s + o.total, 0);

  const weekDays = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const weeklyBreakdown = weekDays.map((day, i) => {
    const dayStart = startOfWeek + i * 86400000;
    const dayEnd   = dayStart + 86400000;
    const rev = completedUnifiedOrders
      .filter(o => { const t = o.timestamp; return t >= dayStart && t < dayEnd; })
      .reduce((s, o) => s + o.total, 0);
    return { day, rev };
  });
  const maxDayRev = Math.max(...weeklyBreakdown.map(d => d.rev), 1);

  const sidebarItems: { id: AdminTab; icon: typeof LayoutDashboard; label: string; badge?: number }[] = [
    { id: 'dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'orders',       icon: ShoppingBag,     label: 'Orders',           badge: pendingOrders },
    { id: 'reservations', icon: Calendar,        label: 'Reservations',     badge: pendingReservations },
    { id: 'tables',       icon: LayoutGrid,      label: 'Table Management', badge: pendingTableOrders },
    { id: 'payments',     icon: CreditCard,      label: 'Payments' },
    { id: 'inventory',    icon: Package,         label: 'Inventory' },
    { id: 'expense',      icon: Wallet,          label: 'Expense' },
    { id: 'cash-register',icon: Banknote,        label: 'Cash Register' },
    { id: 'payroll',      icon: Users,           label: 'Payroll' },
    { id: 'menu',         icon: UtensilsCrossed, label: 'Menu Management' },
    { id: 'chefs',        icon: Users,           label: 'Chefs' },
    { id: 'gallery',      icon: Image,           label: 'Gallery' },
    { id: 'messages',     icon: MessageSquare,   label: 'Messages', badge: unreadMessages },
    { id: 'manual-invoice',    icon: Printer,       label: 'Invoice System' },
    { id: 'printer-settings',  icon: Printer,       label: 'Printer Settings' },
    { id: 'reprint',           icon: RotateCcw,     label: 'Reprint System' },
    ...(adminRole === 'admin' ? [{ id: 'roles' as AdminTab, icon: ShieldCheck, label: 'Role Management' }] : []),
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
          <div className="absolute bottom-[-20%] left-[-10%] w-[55vw] h-[55vw] rounded-full" style={{ background: 'radial-gradient(circle, rgba(248,239,220,0.4) 0%, transparent 70%)' }} />
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-[0.4]" style={{ backgroundImage: 'linear-gradient(rgba(139,92,26,0.03) 1px, transparent 1px), linear-gradient(to right, rgba(139,92,26,0.03) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
        </div>

        {/* Main Card */}
        <div className="w-full max-w-[1100px] mx-4 relative z-10 flex flex-col-reverse lg:flex-row min-h-[640px]"
          style={{ borderRadius: '2.5rem', overflow: 'hidden', backgroundColor: '#ffffff', boxShadow: '0 40px 80px -20px rgba(92,60,16,0.12), 0 0 0 1px rgba(92,60,16,0.04)' }}>

          {/* ── LEFT: Admin Identity Panel (Light Warm Slate) ─────────────────────────────── */}
          <div className="w-full lg:w-[45%] flex flex-col justify-between relative overflow-hidden p-10 lg:p-14"
            style={{ backgroundColor: '#FDFCF9', borderRight: '1px solid rgba(139,92,26,0.06)' }}>
            {/* Grid overlay */}
            <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(to right, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

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
          backgroundColor: '#0A0A0A',
          borderRight: '1px solid rgba(255,255,255,0.05)'
        }}
      >
        {/* Sidebar Header */}
        <div className="px-5 pt-6 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center h-8"> {/* Fixed small height container to cut off whitespace */}
              <img 
                src="/pizzoralogo.png" 
                alt="Pizzora" 
                className="h-12 object-contain scale-[1.7] origin-left" 
                style={{ filter: 'brightness(0) invert(1)', opacity: 0.95 }} 
              />
            </div>
            {/* Close button — mobile only */}
            <button
              className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.05)' }}
              onClick={() => setSidebarOpen(false)}
            >
              <X size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
            </button>
          </div>
          
          <div className="mt-8 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg flex-shrink-0" style={{ background: 'linear-gradient(135deg, #F9002B, #9f001c)', boxShadow: '0 4px 14px rgba(249,0,43,0.3)' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '13px', letterSpacing: '0.5px' }}>AD</span>
            </div>
            <div className="flex flex-col">
              <span style={{ color: '#fff', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '14px', letterSpacing: '0.3px', lineHeight: 1.2 }}>Administrator</span>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]"></div>
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', letterSpacing: '0.5px' }}>System Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {sidebarItems.map(({ id, icon: Icon, label, badge }) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium transition-all"
              style={{
                background: activeTab === id ? 'rgba(249,0,43,0.18)' : 'transparent',
                color: activeTab === id ? '#F9002B' : 'rgba(255,255,255,0.6)',
                border: activeTab === id ? '1px solid rgba(249,0,43,0.25)' : '1px solid transparent',
                fontFamily: 'var(--font-heading)',
              }}
            >
              <div className="flex items-center gap-3">
                <Icon size={16} />
                <span>{label}</span>
              </div>
              {badge !== undefined && badge > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: '#DC2626', minWidth: '20px', textAlign: 'center' }}
                >
                  {badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t space-y-1" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <button
            onClick={() => navigate('/pos')}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-white"
            style={{ background: 'linear-gradient(135deg,#F9002B,#C8001F)', fontFamily: 'var(--font-heading)' }}
          >
            <CreditCard size={14} />
            <span>Open POS</span>
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all hover:bg-white/8"
            style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-heading)' }}
          >
            <ExternalLink size={14} />
            <span>View Website</span>
          </button>
          <button
            onClick={() => {
              dispatch({ type: 'ADMIN_LOGOUT' });
              navigate('/admin');
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all hover:bg-red-900/20"
            style={{ color: 'rgba(255,100,100,0.7)', fontFamily: 'var(--font-heading)' }}
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen w-full md:ml-[260px]">

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
          <div className="flex items-center gap-2 flex-shrink-0">
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
        <div className="flex-1 p-4 md:p-6 overflow-auto">

          {/* ══ DASHBOARD ══════════════════════════════════ */}
          {activeTab === 'dashboard' && (
            <div>
              {/* Stats Cards — Row 1 */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                {state.isInitialLoading ? (
                  Array.from({ length: 4 }).map((_, i) => <AdminStatSkeleton key={i} />)
                ) : [
                  { label: 'Total Revenue', value: `৳${(state.analytics?.totalRevenue || totalRevenue).toLocaleString()}`, icon: DollarSign, color: '#16A34A', bg: '#DCFCE7', sub: `${state.analytics?.totalCustomers || allUnifiedOrders.length} all-time orders` },
                  { label: 'Active Orders', value: pendingOrders, icon: ShoppingBag, color: '#F9002B', bg: '#FEE2E2', sub: `${allUnifiedOrders.length} recent` },
                  { label: 'Reservations', value: state.reservations.length, icon: Calendar, color: '#2563EB', bg: '#DBEAFE', sub: `${pendingReservations} pending` },
                  { label: 'Messages', value: state.messages.length, icon: MessageSquare, color: '#7C3AED', bg: '#EDE9FE', sub: `${unreadMessages} unread` },
                ].map(({ label, value, icon: Icon, color, bg, sub }) => (
                  <div key={label} className="bg-white p-5 rounded-2xl shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: bg }}>
                        <Icon size={20} style={{ color }} />
                      </div>
                    </div>
                    <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '26px', color, lineHeight: 1 }}>{value}</p>
                    <p style={{ fontSize: '12px', color: '#6B7280', fontFamily: 'var(--font-heading)', fontWeight: 600, marginTop: '4px' }}>{label}</p>
                    <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>{sub}</p>
                  </div>
                ))}
              </div>

              {/* Stats Cards — Row 2 */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                {state.isInitialLoading ? (
                  Array.from({ length: 4 }).map((_, i) => <AdminStatSkeleton key={i} />)
                ) : [
                  { label: 'Inventory Items', value: (state.inventory ?? []).length, icon: Package, color: '#EA580C', bg: '#FEF3C7', sub: 'Active stock' },
                  { label: 'Menu Items', value: state.menuItems.length, icon: UtensilsCrossed, color: '#0891B2', bg: '#CFFAFE', sub: 'Active items' },
                  { label: 'Gallery Images', value: state.galleryImages.length, icon: Image, color: '#7C3AED', bg: '#EDE9FE', sub: `${state.carouselSlides.length} carousel slides` },
                  { label: 'Customers', value: (state.analytics?.totalCustomers || allUnifiedOrders.length) + state.reservations.length, icon: Users, color: '#16A34A', bg: '#DCFCE7', sub: 'Total interactions' },
                ].map(({ label, value, icon: Icon, color, bg, sub }) => (
                  <div key={label} className="bg-white p-5 rounded-2xl shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: bg }}>
                        <Icon size={20} style={{ color }} />
                      </div>
                    </div>
                    <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '26px', color, lineHeight: 1 }}>{value}</p>
                    <p style={{ fontSize: '12px', color: '#6B7280', fontFamily: 'var(--font-heading)', fontWeight: 600, marginTop: '4px' }}>{label}</p>
                    <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>{sub}</p>
                  </div>
                ))}
              </div>

              {/* Recent Activity */}
              <div className="grid lg:grid-cols-2 gap-5">
                {/* Recent Orders */}
                <div className="bg-white rounded-2xl shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px', color: '#111' }}>Recent Orders</h3>
                    <button onClick={() => setActiveTab('orders')} style={{ fontSize: '12px', color: '#F9002B', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                      View All <ChevronRight size={13} className="inline" />
                    </button>
                  </div>
                  <div>
                    {state.isInitialLoading ? (
                      Array.from({ length: 5 }).map((_, i) => <AdminListSkeleton key={i} />)
                    ) : (
                      <>
                        {allUnifiedOrders.slice(0, 5).map(order => (
                          <div key={order.id} className="px-5 py-3.5 flex items-center justify-between border-b last:border-0" style={{ borderColor: 'rgba(0,0,0,0.04)' }}>
                            <div>
                              <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '13px', color: '#F9002B' }}>#{order.orderNumber}</p>
                              <p style={{ fontSize: '12px', color: '#6B7280' }}>{order.customerName} • {order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span style={{ fontWeight: 700, fontSize: '13px', color: '#111', fontFamily: 'var(--font-heading)' }}>৳{order.total}</span>
                              <StatusBadge status={order.status} />
                            </div>
                          </div>
                        ))}
                        {allUnifiedOrders.length === 0 && <p className="py-10 text-center" style={{ color: '#9CA3AF', fontSize: '14px' }}>No orders yet</p>}
                      </>
                    )}
                  </div>
                </div>

                {/* Recent Reservations */}
                <div className="bg-white rounded-2xl shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px', color: '#111' }}>Recent Reservations</h3>
                    <button onClick={() => setActiveTab('reservations')} style={{ fontSize: '12px', color: '#F9002B', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                      View All <ChevronRight size={13} className="inline" />
                    </button>
                  </div>
                  <div>
                    {state.isInitialLoading ? (
                      Array.from({ length: 5 }).map((_, i) => <AdminListSkeleton key={i} />)
                    ) : (
                      <>
                        {state.reservations.slice(0, 5).map(res => (
                          <div key={res.id} className="px-5 py-3.5 flex items-center justify-between border-b last:border-0" style={{ borderColor: 'rgba(0,0,0,0.04)' }}>
                            <div>
                              <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '13px', color: '#111' }}>{res.name}</p>
                              <p style={{ fontSize: '12px', color: '#6B7280' }}>{res.date} at {res.time} • {res.guests} guests</p>
                            </div>
                            <StatusBadge status={res.status} />
                          </div>
                        ))}
                        {state.reservations.length === 0 && <p className="py-10 text-center" style={{ color: '#9CA3AF', fontSize: '14px' }}>No reservations yet</p>}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ ORDERS ═════════════════════════════════════ */}
          {activeTab === 'orders' && (
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
                          <p style={{ fontSize: '11px', color: '#9CA3AF' }}>{new Date(order.timestamp).toLocaleDateString()}</p>
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
                              {(['Pending','Confirmed','Cooking','Ready','Served','Paid'] as TableOrderStatus[]).map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          ) : (
                            <select
                              value={order.status}
                              onChange={e => {
                                dispatch({ type: 'UPDATE_ORDER_STATUS', payload: { id: order.id, status: e.target.value as OrderStatus } });
                                showNotification('Order status updated!', 'success');
                              }}
                              className="px-2 py-1.5 rounded-lg border text-xs font-semibold"
                              style={{ borderColor: 'rgba(249,0,43,0.2)', color: '#111', fontFamily: 'var(--font-heading)', cursor: 'pointer' }}
                            >
                              {(['Pending','Preparing','Out for Delivery','Delivered','Cancelled'] as OrderStatus[]).map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          )}
                          <button
                            onClick={() => {
                              setPrintOrder(order);
                              setTimeout(() => {
                                document.body.classList.add('print-thermal');
                                window.print();
                                document.body.classList.remove('print-thermal');
                                setPrintOrder(null);
                              }, 500);
                            }}
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
                              onClick={() => setDeleteConfirm({
                                isOpen: true,
                                title: 'Delete Order?',
                                message: `Are you sure you want to permanently delete order ${order.orderNumber || order.id.slice(-6)}? This action cannot be undone and will remove it from all revenue calculations immediately.`,
                                onConfirm: () => {
                                  if (order.isTableOrder) {
                                    dispatch({ type: 'DELETE_TABLE_ORDER', payload: order.id });
                                  } else {
                                    dispatch({ type: 'DELETE_ORDER', payload: order.id });
                                  }
                                  setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
                                  showNotification('Order permanently deleted', 'success');
                                }
                              })}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                              title="Delete Order Permanently"
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
                {allUnifiedOrders.length === 0 && (
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

          {/* ══ INVENTORY ══════════════════════════════════ */}
          {activeTab === 'inventory' && <InventoryManagement />}
          {activeTab === 'expense' && <ExpenseManagement />}
          {activeTab === 'cash-register' && <CashRegisterManagement />}

          {activeTab === 'payroll' && <PayrollManagement />}
          {activeTab === 'manual-invoice' && <ManualInvoice />}
          {activeTab === 'printer-settings' && <PrinterSettings />}
          {activeTab === 'reprint' && <ReprintSystem />}
          {activeTab === 'roles' && adminRole === 'admin' && <RoleManagement />}
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
                <button
                  onClick={() => { setMenuForm(blankMenuForm); setShowAddMenu(true); }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)' }}
                >
                  <Plus size={15} /> Add New Item
                </button>
              </div>

              {/* Menu Items Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {state.menuItems.map(item => (
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
                ))}
              </div>

              {state.menuItems.length === 0 && (
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
                  { label: 'Today', value: todayRevenue, icon: DollarSign, color: '#16A34A', bg: '#DCFCE7', sub: `${allUnifiedOrders.filter(o => o.timestamp >= startOfToday).length} orders` },
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
                              {rev >= 1000 ? `${(rev/1000).toFixed(1)}k` : rev}
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
                      { label: 'Nagad', orders: nagadOrders.length, total: nagadTotal, color: '#F7941D', bg: '#FFF4E8', iconBg: 'rgba(247,148,29,0.12)', Icon: CreditCard },
                      { label: 'Cash on Delivery', orders: codOrders.length, total: codTotal, color: '#16A34A', bg: '#F0FDF4', iconBg: 'rgba(22,163,74,0.12)', Icon: Banknote },
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
                          'bKash':             { color: '#E2136E', bg: '#FDF0F6' },
                          'Nagad':             { color: '#F7941D', bg: '#FFF4E8' },
                          'Cash on Delivery':  { color: '#16A34A', bg: '#F0FDF4' },
                          'At Table':          { color: '#2563EB', bg: '#DBEAFE' },
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
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: mc.bg, color: mc.color, fontFamily: 'var(--font-heading)' }}>
                                {order.paymentMethod}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={order.status} />
                            </td>
                            <td className="px-4 py-3" style={{ fontSize: '12px', color: '#6B7280' }}>
                              {new Date(order.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {allUnifiedOrders.length === 0 && (
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
                      <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{new Date(msg.createdAt).toLocaleDateString()}</span>
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
          
          <div className="mb-6">
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '24px', color: '#111' }}>
              Order #{viewOrderDetails.orderNumber || viewOrderDetails.id?.substring(0,6)}
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
              <p style={{ fontSize: '14px', color: '#4B5563' }}>{viewOrderDetails.paymentMethod}</p>
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

            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '16px', color: '#111' }}>Total Amount</span>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '20px', color: '#F9002B' }}>
                ৳{viewOrderDetails.total?.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </ModalOverlay>
    )}


    {/* ── PRINT ONLY: THERMAL RECEIPT ─────────────────────────────────────── */}
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
        const isTable = printOrder.isTableOrder;
        const subtotal = printOrder.items.reduce((sum: number, ci: any) => {
          const price = isTable ? ci.price : ci.item?.price;
          return sum + (price || 0) * ci.quantity;
        }, 0);
        const deliveryFee = printOrder.total - subtotal;
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
                {isTable ? '🍽️  DINE-IN ORDER' : '🛵  DELIVERY ORDER'}
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
                <span>{new Date(printOrder.isTableOrder ? printOrder.createdAt : printOrder.createdAt).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'2-digit', hour:'2-digit', minute:'2-digit' })}</span>
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
                    <span>{printOrder.displayTitle}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Phone</span>
                    <span>{printOrder.displayPhone}</span>
                  </div>
                  {printOrder.address && (
                    <div>
                      <span>Address: </span>
                      <span>{printOrder.address}</span>
                    </div>
                  )}
                </>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Payment</span>
                <span>{printOrder.paymentMethod}</span>
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
              const itemName = isTable ? ci.name : ci.item?.name;
              const itemPrice = isTable ? ci.price : ci.item?.price;
              const note = isTable ? ci.note : ci.specialRequest;
              return (
                <div key={idx} style={{ marginBottom: '4px', paddingBottom: '4px', borderBottom: '1px dotted #ccc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ flex: 3, wordBreak: 'break-word', paddingRight: '4px' }}>{itemName}</span>
                    <span style={{ flex: 1, textAlign: 'center' }}>x{ci.quantity}</span>
                    <span style={{ flex: 1, textAlign: 'right' }}>৳{itemPrice}</span>
                    <span style={{ flex: 1, textAlign: 'right', fontWeight: 'bold' }}>৳{(itemPrice || 0) * ci.quantity}</span>
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
                  <span>Delivery Fee</span>
                  <span>৳{deliveryFee.toFixed(0)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '15px', borderTop: '1px solid #000', marginTop: '4px', paddingTop: '4px' }}>
                <span>TOTAL</span>
                <span>৳{printOrder.total}</span>
              </div>
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
