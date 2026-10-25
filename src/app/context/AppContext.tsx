/// <reference types="vite/client" />
import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { MenuItem, menuItems as defaultMenuItems, galleryImages as defaultGalleryImages, GalleryImage, Chef, chefs as defaultChefs } from '../data/restaurantData';
import { pickActivePresentItem, normalizeProductKey } from '../utils/inventoryIntelligence';
import { PixelSettings, DEFAULT_PIXEL_SETTINGS, pixelService } from '../utils/pixelService';
import { getSafeModeDataset, SafeModeDataset } from '../utils/safeModeHelper';
export type { MenuItem, GalleryImage, Chef, PixelSettings, SafeModeDataset };

// ─── Existing Types ────────────────────────────────────────────────────────────

export interface CartItem {
  item: MenuItem;
  quantity: number;
  specialRequest?: string;
  size?: string;
  variant?: string;
  crust?: string;
  spiceLevel?: string;
  specialInstructions?: string;
  isAutoBox?: boolean;
  forPizzaSize?: '8' | '10' | '12';
}

export type OrderStatus = 'Pending' | 'Preparing' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
export type PaymentMethod = 'bKash' | 'Nagad' | 'Cash on Delivery' | 'Cash' | 'Card' | 'Split' | 'Complimentary' | 'Staff Tab';

export interface SplitPaymentItem {
  method: 'Cash' | 'bKash' | 'Nagad' | 'Card';
  amount: number;
}

export interface CompDetails {
  guestName?: string;
  reason: 'Owner / Partner Guest' | 'VIP / Influencer' | 'Customer Compensation' | 'Food Tasting / Quality Check' | 'Staff Perk' | 'Other' | string;
  authorizedBy: string;
  notes?: string;
}

export interface StaffTabDetails {
  staffId: string;
  staffName: string;
  isSettled: boolean;
  settledAt?: string;
  settledMethod?: 'Cash' | 'bKash' | 'Nagad' | 'Salary Deduction' | 'Waived';
  settledBy?: string;
  notes?: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  subtotal?: number;
  discount?: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  splitPayments?: SplitPaymentItem[];
  compDetails?: CompDetails;
  staffTabDetails?: StaffTabDetails;
  customerName: string;
  phone: string;
  address: string;
  createdAt: string;
  estimatedTime: string;
  orderNumber: string;
  invoiceNumber?: string;
  isOnlineOrder?: boolean;
  source?: 'website' | 'pos' | 'table' | string;
  orderType?: string;
  deliveryFee?: number;
  notes?: string;
}

export type ReservationStatus = 'Pending' | 'Confirmed' | 'Rejected' | 'Cancelled';

export interface Reservation {
  id: string;
  name: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  guests: number;
  specialRequest: string;
  status: ReservationStatus;
  createdAt: string;
}

export interface Message {
  id: string;
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  reply?: string;
}

export interface CateringRequest {
  id: string;
  name: string;
  phone: string;
  email: string;
  eventType: string;
  guests: number;
  date: string;
  location: string;
  package: string;
  message: string;
  status: 'Pending' | 'Confirmed' | 'Rejected';
  createdAt: string;
}

// ← CarouselSlide defined before AppState so it can be safely referenced
export interface CarouselSlide {
  id: string;
  url: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  link?: string;
}

// ─── NEW: QR Table Ordering Types ─────────────────────────────────────────────

export type TableStatus = 'Available' | 'Ordering' | 'Cooking' | 'Ready' | 'Served' | 'Paid';
export type TableArea = 'Dining' | 'VIP' | 'Outdoor';

export interface RestaurantTable {
  id: string;
  tableNumber: string;
  seats: number;
  area: TableArea;
  status: TableStatus;
  currentOrderId?: string;
  occupiedSince?: number;
  customerName?: string;
  customerPhone?: string;
  guestCount?: number;
  serverName?: string;
}

export type TableOrderStatus = 'Pending' | 'Confirmed' | 'Cooking' | 'Ready' | 'Served' | 'Paid';

export interface TableOrderItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  note: string;
  image: string;
}

export interface TableOrder {
  id: string;
  tableId: string;
  tableNumber: string;
  items: TableOrderItem[];
  subtotal?: number;
  discount?: number;
  total: number;
  status: TableOrderStatus;
  createdAt: number;
  customerNote: string;
  customerName?: string;
  customerPhone?: string;
  guestCount?: number;
  invoiceNumber?: string;
  orderNumber?: string;
  paymentMethod?: string;
  splitPayments?: SplitPaymentItem[];
  compDetails?: CompDetails;
  staffTabDetails?: StaffTabDetails;
}

export interface WasteRecord {
  id: string;
  product: string;
  reason: string;
  costLoss: number;
  quantity: number;
  date: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  basicSalary: number;
  joinDate: string;
  shift: string;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  month: string;
  year: number;
  bonus: number;
  overtime: number;
  deduction: number;
  fine: number;
  netSalary: number;
  datePaid: string;
}

export interface ExpenseEntry {
  id: string;
  section?: string;
  category: string;
  subcategory: string;
  amount: number;
  date: string;
  time?: string;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'bKash' | 'Nagad' | 'Card' | string;
  description: string;
  invoiceNo: string;
  recordedBy?: string;
}

export interface CashRegisterEntry {
  id: string;
  date: string;
  openedAt: string;
  closedAt: string | null;
  openingBalance: number;
  totalCashSales: number; // legacy/total
  salesBreakdown?: {
    cash: number;
    bkash: number;
    nagad: number;
    card: number;
    other: number;
    total: number;
    staffTabDue?: number;
    staffTabCashCollected?: number;
    complimentary?: number;
  };
  bankDeposit: number;
  shoppingCash: number;
  cost?: number;
  status: 'Open' | 'Closed' | string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  supplier: string;
  costPrice: number; // Purchase price / কেনা মূল্য
  sellingPrice?: number; // Selling price / বিক্রয় মূল্য
  currentStock: number;
  minStock: number;
  maxStock: number;
  addedDate?: string;
  initialStock?: number; // প্রাথমিক পরিমাণ
  menuItemId?: string; // Optional link to MenuItem for automatic sales deduction
  lastPurchasePrice?: number;
  lastPurchasedDate?: string;
  lastPurchasedQty?: number;
  updatedAt?: string;
}

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: 'Purchase IN' | 'Sale OUT' | 'Waste OUT' | 'Return IN' | 'Adjustment' | 'Initial Stock' | string;
  quantity: number;
  date: string;
  note: string;
  unitPrice?: number;
  totalCost?: number;
  systemStock?: number; // For reconciliation
  physicalStock?: number; // For reconciliation
  difference?: number; // For reconciliation (physicalStock - systemStock)
  performedBy?: string; // Auditor or user
  orderNumber?: string;
  supplier?: string;
  category?: string;
  unit?: string;
  stockAfter?: number;
}

export interface ItemReview {
  id: string;
  slug: string;
  name: string;
  rating: number;
  comment: string;
  date: string;
  helpful: number;
}

export interface UserAccount {
  id: string;
  username: string;
  password?: string;
  role: string;
  createdAt?: string;
}

// ─── 30-Day Deleted Order Archive ─────────────────────────────────────────────
export interface DeletedOrder {
  id: string;
  originalOrderId: string;
  orderNumber: string;
  invoiceNumber?: string;
  orderType: string;
  customerName: string;
  customerPhone?: string;
  deliveryAddress?: string;
  tableNumber?: string;
  tableId?: string;
  items: Array<{
    item?: any;
    menuItemId?: string;
    id?: string;
    name?: string;
    quantity: number;
    price: number;
    variant?: string;
    note?: string;
    specialRequest?: string;
  }>;
  subtotal: number;
  discount: number;
  deliveryFee?: number;
  total: number;
  paymentMethod: string;
  splitPayments?: Array<{ method: string; amount: number }>;
  compDetails?: any;
  staffTabDetails?: any;
  orderCreatedAt?: string;
  deletedAt: string;
  deletedBy?: string;
  deletionReason?: string;
  restocked: boolean;
  restockedItemsCount: number;
  expiresAt?: string;
  rawOrderData?: any;
}

// ─── Delivery Settings ────────────────────────────────────────────────────────

export interface CustomDeliveryArea {
  id: string;
  name: string;
  fee: number;
  distKm?: number;
}

export const DEFAULT_SYLHET_CUSTOM_AREAS: CustomDeliveryArea[] = [
  { id: 'area-1', name: 'Subidbazar / Mitali Complex (Restaurant Area)', fee: 40, distKm: 0.5 },
  { id: 'area-2', name: 'Amberkhana Point', fee: 40, distKm: 1.2 },
  { id: 'area-3', name: 'Pathantula / Modina Market', fee: 40, distKm: 1.8 },
  { id: 'area-4', name: 'Chowhatta / Rikabibazar', fee: 50, distKm: 2.3 },
  { id: 'area-5', name: 'Zindabazar', fee: 50, distKm: 2.8 },
  { id: 'area-6', name: 'Kumarpara / Mira Bazar', fee: 60, distKm: 3.5 },
  { id: 'area-7', name: 'Lamabazar', fee: 50, distKm: 2.5 },
  { id: 'area-8', name: 'Shibganj', fee: 70, distKm: 4.8 },
  { id: 'area-9', name: 'Upashohor', fee: 80, distKm: 5.2 },
  { id: 'area-10', name: 'Akhalia / SUST Campus', fee: 70, distKm: 5.0 },
  { id: 'area-11', name: 'Tilagarh / MC College', fee: 90, distKm: 6.1 },
  { id: 'area-12', name: 'South Surma / Kadamtoli', fee: 90, distKm: 6.5 },
  { id: 'area-13', name: 'Airport Road / Osmani Airport', fee: 100, distKm: 7.5 },
];

export interface DeliverySettings {
  baseFee: number;    // ৳ charge for first baseKm
  baseKm: number;     // km covered by baseFee (default: 2)
  extraPerKm: number; // ৳ per additional km beyond baseKm
  restaurantLat: number;  // Restaurant GPS latitude
  restaurantLng: number;  // Restaurant GPS longitude
  locationName?: string;  // Restaurant location name / Plus code
  customAreas?: CustomDeliveryArea[]; // Customizable Sylhet delivery areas & amounts
}

/**
 * Calculate dynamic delivery fee:
 * - Flat baseFee for distances within baseKm
 * - For extra distance beyond baseKm, rounded up to the nearest km and multiplied by extraPerKm
 */
export function calcDeliveryFee(distanceKm: number, settings?: DeliverySettings): number {
  if (distanceKm <= 0) return 0;
  const baseFee = Number(settings?.baseFee ?? 40);
  const baseKm = Number(settings?.baseKm ?? 2);
  const extraPerKm = Number(settings?.extraPerKm ?? 10);
  if (distanceKm <= baseKm) return baseFee;
  const extraKm = Math.ceil(distanceKm - baseKm);
  return baseFee + (extraKm * extraPerKm);
}

/**
 * Haversine formula — calculates straight-line distance (km) between two
 * GPS coordinates. Accurate enough for city-scale delivery radius.
 */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // rounded to 1 decimal place
}

// Pizzora Sylhet Fixed Location: Subidbazar Point (Google Map Plus Code: WV46+W8 Sylhet)
export const FIXED_RESTAURANT_LOCATION = {
  lat: 24.90725,
  lng: 91.8608,
  plusCode: 'WV46+W8',
  address: 'Subidbazar Point, Mitali Complex, Sylhet',
};

export const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  baseFee: 40,
  baseKm: 2,
  extraPerKm: 10,
  restaurantLat: FIXED_RESTAURANT_LOCATION.lat,   // Fixed GPS: 24.90725 (WV46+W8 Sylhet)
  restaurantLng: FIXED_RESTAURANT_LOCATION.lng,   // Fixed GPS: 91.8608  (WV46+W8 Sylhet)
  locationName: 'WV46+W8, Sylhet (Subidbazar Point)',
  customAreas: DEFAULT_SYLHET_CUSTOM_AREAS,
};

// ─── Pizza Box Auto-Packaging Engine ──────────────────────────────────────────

export const PIZZA_BOX_CONFIG = {
  '8': {
    id: '1792147264111',
    name: 'Pizza Box 8″',
    size: '8' as const,
    price: 10,
    image: 'https://res.cloudinary.com/b1ehiqmk/image/upload/v1792147234/pizzora/colcdxb33pb5qxusfk76.jpg',
    description: 'Food-grade heat-retaining packaging box for 8" pizza',
  },
  '10': {
    id: '1792147205313',
    name: 'Pizza Box 10″',
    size: '10' as const,
    price: 15,
    image: 'https://res.cloudinary.com/b1ehiqmk/image/upload/v1792147188/pizzora/jzcqsnudrrhmeybg8u6i.jpg',
    description: 'Food-grade heat-retaining packaging box for 10" pizza',
  },
  '12': {
    id: '1792146985188',
    name: 'Pizza Box 12″',
    size: '12' as const,
    price: 20,
    image: 'https://res.cloudinary.com/b1ehiqmk/image/upload/v1792146909/pizzora/kq7hvviqwefr0ttrjbvz.jpg',
    description: 'Food-grade heat-retaining packaging box for 12" pizza',
  },
} as const;

export function isPizzaBox(item?: { id?: string; name?: string; category?: string } | null): boolean {
  if (!item) return false;
  if (item.id === '1792147264111' || item.id === '1792147205313' || item.id === '1792146985188') return true;
  return /pizza\s*box/i.test(item.name || '');
}

export function getPizzaBoxSize(item?: { id?: string; name?: string } | null): '8' | '10' | '12' | null {
  if (!isPizzaBox(item)) return null;
  const str = `${item?.id || ''} ${item?.name || ''}`;
  if (item?.id === '1792146985188' || /(?:^|\D)12(?:\D|$)/.test(str)) return '12';
  if (item?.id === '1792147205313' || /(?:^|\D)10(?:\D|$)/.test(str)) return '10';
  if (item?.id === '1792147264111' || /(?:^|\D)8(?:\D|$)/.test(str)) return '8';
  return '8';
}

/** Detects whether a cart item is a pizza and determines its size ('8', '10', '12') */
export function detectPizzaItemSize(cartItem: { item?: MenuItem; size?: string; variant?: string; specialRequest?: string; isAutoBox?: boolean }): '8' | '10' | '12' | null {
  const item = cartItem.item;
  if (!item) return null;
  if (cartItem.isAutoBox || isPizzaBox(item)) return null;

  const cat = (item.category || '').trim();
  const isPizzaCat = /pizza/i.test(cat);
  const isPizzaName = /pizza/i.test(item.name || '');
  if (!isPizzaCat && !isPizzaName) return null;

  // Ignore extra items
  if (/cheese\s*stick|extra\s*cheese|extra\s*sauce/i.test(item.name || '')) return null;

  const textToScan = `${cartItem.size || ''} ${cartItem.variant || ''} ${cartItem.specialRequest || ''} ${item.name || ''}`.toLowerCase();

  if (/(?:^|\D)12\s*(?:"|″|''|inch|inc|\b)/i.test(textToScan)) return '12';
  if (/(?:^|\D)10\s*(?:"|″|''|inch|inc|\b)/i.test(textToScan)) return '10';
  if (/(?:^|\D)8\s*(?:"|″|''|inch|inc|\b)/i.test(textToScan)) return '8';

  // Default baseline for any pizza item without explicit size
  return '8';
}

export function findBoxMenuItem(size: '8' | '10' | '12', allMenuItems: MenuItem[] = []): MenuItem {
  const cfg = PIZZA_BOX_CONFIG[size];
  const found = allMenuItems.find(m =>
    m.id === cfg.id ||
    (m.category === 'Pizza' && new RegExp(`pizza\\s*box.*${size}`, 'i').test(m.name))
  );
  if (found) return found;

  return {
    id: cfg.id,
    name: cfg.name,
    slug: `pizza-box-${size}`,
    category: 'Pizza',
    price: cfg.price,
    image: cfg.image,
    description: cfg.description,
    ingredients: [],
    nutrition: { calories: 0, protein: '0g', carbs: '0g', fat: '0g' },
    spiceLevel: 'Mild',
    rating: 5,
    reviewCount: 0,
    isVeg: true,
    isSpicy: false,
    isPopular: false,
    prepTime: '00',
    serves: '1 Box',
    showOnWebsite: false,
  };
}

/**
 * Ensures the cart always contains the exact matching Pizza Box for every ordered pizza.
 * Boxes cannot be removed while matching pizzas exist in the cart.
 */
export function syncCartBoxes(cart: CartItem[], allMenuItems: MenuItem[] = []): CartItem[] {
  // 1. Separate regular items from auto-boxes
  const regularItems = cart.filter(c => !isPizzaBox(c.item) && !c.isAutoBox);

  // 2. Count pizza quantities by size
  let count8 = 0;
  let count10 = 0;
  let count12 = 0;

  for (const c of regularItems) {
    const size = detectPizzaItemSize(c);
    if (size === '8') count8 += c.quantity;
    else if (size === '10') count10 += c.quantity;
    else if (size === '12') count12 += c.quantity;
  }

  const result: CartItem[] = [...regularItems];

  // 3. Add auto box for each size if count > 0
  if (count8 > 0) {
    result.push({
      item: findBoxMenuItem('8', allMenuItems),
      quantity: count8,
      isAutoBox: true,
      forPizzaSize: '8',
      specialRequest: 'Auto-added packaging box for 8" pizza',
    });
  }

  if (count10 > 0) {
    result.push({
      item: findBoxMenuItem('10', allMenuItems),
      quantity: count10,
      isAutoBox: true,
      forPizzaSize: '10',
      specialRequest: 'Auto-added packaging box for 10" pizza',
    });
  }

  if (count12 > 0) {
    result.push({
      item: findBoxMenuItem('12', allMenuItems),
      quantity: count12,
      isAutoBox: true,
      forPizzaSize: '12',
      specialRequest: 'Auto-added packaging box for 12" pizza',
    });
  }

  return result;
}

// ─── State ────────────────────────────────────────────────────────────────────

interface AppState {
  cart: CartItem[];
  orders: Order[];
  reservations: Reservation[];
  messages: Message[];
  cateringRequests: CateringRequest[];
  menuItems: MenuItem[];
  chefs: Chef[];
  galleryImages: GalleryImage[];
  carouselSlides: CarouselSlide[];
  tables: RestaurantTable[];
  tableOrders: TableOrder[];
  wasteRecords: WasteRecord[];
  employees: Employee[];
  payrollRecords: PayrollRecord[];
  expenses: ExpenseEntry[];
  cashRegister: CashRegisterEntry[];
  inventory: InventoryItem[];
  stockMovements: StockMovement[];
  reviews: ItemReview[];
  users: UserAccount[];
  deletedOrders: DeletedOrder[];
  deliverySettings: DeliverySettings;
  pixelSettings: PixelSettings;
  isAdminLoggedIn: boolean;
  cartOpen: boolean;
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;
  isSocketConnected: boolean;
  isInitialLoading: boolean;
  analytics: {
    totalRevenue: number;
    totalCustomers: number;
    todayRevenue?: number;
    weeklyRevenue?: number;
    monthlyRevenue?: number;
    yearlyRevenue?: number;
    dailyChart?: any[];
    weeklyChart?: any[];
    monthlyChart?: any[];
    yearlyChart?: any[];
  } | null;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'ADD_TO_CART'; payload: { item: MenuItem; quantity: number; specialRequest?: string; size?: string; variant?: string } }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'PLACE_ORDER'; payload: Order }
  | { type: 'UPDATE_ORDER'; payload: Order }
  | { type: 'UPDATE_ORDER_STATUS'; payload: { id: string; status: OrderStatus } }
  | { type: 'SETTLE_STAFF_TAB'; payload: { orderId: string; settledMethod: 'Cash' | 'bKash' | 'Nagad' | 'Salary Deduction' | 'Waived'; settledBy?: string; notes?: string } }
  | { type: 'DELETE_ORDER'; payload: string }
  | { type: 'ADD_RESERVATION'; payload: Reservation }
  | { type: 'UPDATE_RESERVATION'; payload: { id: string; status: ReservationStatus } }
  | { type: 'DELETE_RESERVATION'; payload: string }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'READ_MESSAGE'; payload: string }
  | { type: 'DELETE_MESSAGE'; payload: string }
  | { type: 'REPLY_MESSAGE'; payload: { id: string; reply: string } }
  | { type: 'ADD_CATERING'; payload: CateringRequest }
  | { type: 'UPDATE_CATERING'; payload: { id: string; status: 'Pending' | 'Confirmed' | 'Rejected' } }
  | { type: 'ADD_MENU_ITEM'; payload: MenuItem }
  | { type: 'UPDATE_MENU_ITEM'; payload: MenuItem }
  | { type: 'DELETE_MENU_ITEM'; payload: string }
  | { type: 'ADD_GALLERY_IMAGE'; payload: GalleryImage }
  | { type: 'UPDATE_GALLERY_IMAGE'; payload: GalleryImage }
  | { type: 'DELETE_GALLERY_IMAGE'; payload: string }
  | { type: 'ADD_CAROUSEL_SLIDE'; payload: CarouselSlide }
  | { type: 'UPDATE_CAROUSEL_SLIDE'; payload: CarouselSlide }
  | { type: 'DELETE_CAROUSEL_SLIDE'; payload: string }
  | { type: 'REORDER_CAROUSEL_SLIDE'; payload: { fromIndex: number; toIndex: number } }
  | { type: 'ADD_CHEF'; payload: Chef }
  | { type: 'UPDATE_CHEF'; payload: Chef }
  | { type: 'DELETE_CHEF'; payload: string }
  | { type: 'SET_ANALYTICS'; payload: { totalRevenue: number; totalCustomers: number; todayRevenue?: number; weeklyRevenue?: number; monthlyRevenue?: number; yearlyRevenue?: number; dailyChart?: any[]; weeklyChart?: any[]; monthlyChart?: any[]; yearlyChart?: any[]; } }
  // Table actions
  | { type: 'ADD_TABLE'; payload: RestaurantTable }
  | { type: 'UPDATE_TABLE'; payload: RestaurantTable }
  | { type: 'DELETE_TABLE'; payload: string }
  | { type: 'SET_TABLE_STATUS'; payload: { id: string; status: TableStatus; currentOrderId?: string; occupiedSince?: number; customerName?: string; customerPhone?: string; guestCount?: number } }
  // Table order actions
  | { type: 'PLACE_TABLE_ORDER'; payload: TableOrder }
  | { type: 'UPDATE_TABLE_ORDER'; payload: TableOrder }
  | { type: 'UPDATE_TABLE_ORDER_STATUS'; payload: { id: string; status: TableOrderStatus } }
  | { type: 'DELETE_TABLE_ORDER'; payload: string }
  | { type: 'DELETE_ORDER_WITH_CLEANUP'; payload: { orderId?: string; orderNumber?: string; invoiceNumber?: string; deletedOrder?: any; deletedBy?: string; reason?: string } }
  | { type: 'ADD_DELETED_ORDER'; payload: DeletedOrder }
  | { type: 'SET_DELETED_ORDERS'; payload: DeletedOrder[] }
  | { type: 'PURGE_DELETED_ORDER'; payload: string }
  | { type: 'RESTORE_DELETED_ORDER'; payload: string }
  | { type: 'SYNC_ORDER_STATUSES'; payload: { id: string; status: OrderStatus }[] }
  | { type: 'SYNC_TABLE_ORDER_STATUSES'; payload: { id: string; status: TableOrderStatus }[] }
  // Waste tracking
  | { type: 'ADD_WASTE_RECORD'; payload: WasteRecord }
  | { type: 'DELETE_WASTE_RECORD'; payload: string }
  // Payroll
  | { type: 'ADD_EMPLOYEE'; payload: Employee }
  | { type: 'UPDATE_EMPLOYEE'; payload: Employee }
  | { type: 'DELETE_EMPLOYEE'; payload: string }
  | { type: 'ADD_PAYROLL_RECORD'; payload: PayrollRecord }
  // Expenses
  | { type: 'ADD_EXPENSE'; payload: ExpenseEntry }
  | { type: 'UPDATE_EXPENSE'; payload: ExpenseEntry }
  | { type: 'DELETE_EXPENSE'; payload: string }
  // Cash Register
  | { type: 'ADD_CASH_ENTRY'; payload: CashRegisterEntry }
  | { type: 'UPDATE_CASH_ENTRY'; payload: CashRegisterEntry }
  | { type: 'DELETE_CASH_ENTRY'; payload: string }
  // Inventory
  | { type: 'ADD_INVENTORY_ITEM'; payload: InventoryItem }
  | { type: 'UPDATE_INVENTORY_ITEM'; payload: InventoryItem }
  | { type: 'DELETE_INVENTORY_ITEM'; payload: string }
  | { type: 'ADD_STOCK_MOVEMENT'; payload: StockMovement }
  | { type: 'DELETE_STOCK_MOVEMENT'; payload: string }
  // Reviews
  | { type: 'ADD_REVIEW'; payload: ItemReview }
  | { type: 'HELPFUL_REVIEW'; payload: string }
  // System
  | { type: 'ADMIN_LOGIN' }
  | { type: 'ADMIN_LOGOUT' }
  | { type: 'TOGGLE_CART' }
  | { type: 'SET_CART_OPEN'; payload: boolean }
  | { type: 'SET_NOTIFICATION'; payload: { message: string; type: 'success' | 'error' | 'info' } | null }
  | { type: 'LOAD_FROM_STORAGE'; payload: Partial<AppState> }
  | { type: 'SET_SOCKET_CONNECTED'; payload: boolean }
  | { type: 'BATCH_PLACE_ORDERS'; payload: Order[] }
  | { type: 'SET_INITIAL_LOADING'; payload: boolean }
  // User Accounts
  | { type: 'ADD_USER'; payload: UserAccount }
  | { type: 'UPDATE_USER'; payload: UserAccount }
  | { type: 'DELETE_USER'; payload: string }
  // Delivery Settings
  | { type: 'UPDATE_DELIVERY_SETTINGS'; payload: DeliverySettings }
  // Pixel Settings
  | { type: 'UPDATE_PIXEL_SETTINGS'; payload: PixelSettings }
  // Safe Mode Setting
  | { type: 'SET_SAFE_MODE'; payload: boolean };

// ─── Default Carousel Slides ──────────────────────────────────────────────────

const defaultCarouselSlides: CarouselSlide[] = [
  {
    id: 'cs1',
    url: '/images/pizzora_hero_1.png',
    title: 'PIZZORA RESTAURANT',
    subtitle: 'Premium Dining Experience',
    description: 'The favourite pizza & fast food in Sylhet — where extraordinary flavors meet unmatched elegance.',
    badge: '★ Best Restaurant in Sylhet',
  },
  {
    id: 'cs2',
    url: '/images/pizzora_hero_2.png',
    title: 'Authentic Taste',
    subtitle: "Nature's Best Ingredients",
    description: 'We source only the freshest, highest-quality ingredients to craft dishes that tell a story of passion.',
    badge: '✦ 100% Fresh & Natural',
  },
  {
    id: 'cs3',
    url: '/images/pizzora_hero_3.png',
    title: 'Perfect Place for Family',
    subtitle: 'For Every Occasion',
    description: 'Create unforgettable memories with the people you love, surrounded by warm hospitality.',
    badge: '❤ Family Friendly',
  },
];

const defaultEmployees: Employee[] = [
  { id: 'emp1', name: 'Md. Marjan Ahmed', role: 'Head Chef', basicSalary: 35000, joinDate: new Date().toISOString(), shift: 'Morning' },
  { id: 'emp2', name: 'Rabbi Hasan', role: 'Assistant Chef', basicSalary: 20000, joinDate: new Date().toISOString(), shift: 'Morning' },
  { id: 'emp3', name: 'Anisur Rahman', role: 'Manager', basicSalary: 25000, joinDate: new Date().toISOString(), shift: 'Morning' },
  { id: 'emp4', name: 'Suhel Ahmed', role: 'Waiter', basicSalary: 8000, joinDate: new Date().toISOString(), shift: 'Evening' },
  { id: 'emp5', name: 'Emon', role: 'Waiter', basicSalary: 8000, joinDate: new Date().toISOString(), shift: 'Evening' },
];

// ─── Default Tables (5 tables) ────────────────────────────────────────────────
const defaultTables: RestaurantTable[] = [
  { id: '1', tableNumber: '1', seats: 4, area: 'Dining', status: 'Available' },
  { id: '2', tableNumber: '2', seats: 6, area: 'Dining', status: 'Available' },
  { id: '3', tableNumber: '3', seats: 6, area: 'Dining', status: 'Available' },
  { id: '4', tableNumber: '4', seats: 4, area: 'Dining', status: 'Available' },
  { id: '5', tableNumber: '5', seats: 2, area: 'Dining', status: 'Available' },
];


// ─── Initial State ────────────────────────────────────────────────────────────

const savedCart = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('pizzora_cart') || '[]') : [];
const savedAdminLogin = typeof window !== 'undefined' ? sessionStorage.getItem('pizzora_admin_logged_in') === 'true' : false;

const initialState: AppState = {
  cart: savedCart,
  orders: [],
  reservations: [],
  messages: [],
  cateringRequests: [],
  menuItems: defaultMenuItems,
  chefs: defaultChefs,
  galleryImages: defaultGalleryImages,
  carouselSlides: defaultCarouselSlides,
  tables: defaultTables,
  tableOrders: [],
  wasteRecords: [],
  employees: defaultEmployees,
  payrollRecords: [],
  expenses: [],
  cashRegister: [],
  inventory: [],
  stockMovements: [],
  reviews: [],
  users: [],
  deletedOrders: [],
  deliverySettings: DEFAULT_DELIVERY_SETTINGS,
  pixelSettings: DEFAULT_PIXEL_SETTINGS,
  isAdminLoggedIn: savedAdminLogin,
  cartOpen: false,
  notification: null,
  isSocketConnected: true,
  isInitialLoading: true,
  analytics: null,
};

// ─── Inventory Deduction Helper ───────────────────────────────────────────────

function findRelatedInventoryDeductionsClient(
  lineItem: any,
  allInventory: InventoryItem[],
  allMenuItems: MenuItem[] = []
): Array<{ inventoryItem: InventoryItem; quantityToDeduct: number; reason: string }> {
  const deductions: Array<{ inventoryItem: InventoryItem; quantityToDeduct: number; reason: string }> = [];
  const qty = Number(lineItem.quantity) || 1;

  const menuItemId = lineItem.item?.id || lineItem.menuItemId || lineItem.id;
  const itemName = lineItem.item?.name || lineItem.name || '';
  const itemCategory = lineItem.item?.category || '';
  const itemIngredients = lineItem.item?.ingredients || [];
  const variantName = lineItem.item?.variant?.name || lineItem.variant?.name || lineItem.specialRequest || '';

  const fullMenuItem = allMenuItems.find(m =>
    (menuItemId && m.id === menuItemId) ||
    (itemName && m.name && m.name.trim().toLowerCase() === itemName.trim().toLowerCase())
  );

  const finalIngredients = (fullMenuItem?.ingredients && fullMenuItem.ingredients.length > 0)
    ? fullMenuItem.ingredients
    : itemIngredients;

  const finalCategory = fullMenuItem?.category || itemCategory;

  // 1. If explicit recipe configured on MenuItem:
  // 1. If explicit recipe configured on MenuItem:
  if ((fullMenuItem as any)?.recipe && Array.isArray((fullMenuItem as any).recipe) && (fullMenuItem as any).recipe.length > 0) {
    for (const r of (fullMenuItem as any).recipe) {
      const candidates = allInventory.filter(i => i.id === r.inventoryItemId || (i.name && i.name.toLowerCase() === r.inventoryItemName?.toLowerCase()));
      const inv = pickActivePresentItem(candidates);
      if (inv) {
        deductions.push({
          inventoryItem: inv,
          quantityToDeduct: (Number(r.quantity) || 1) * qty,
          reason: `Recipe: ${r.inventoryItemName || inv.name} for ${itemName}`
        });
      }
    }
    return deductions;
  }

  // 2. Intelligent Auto-Detection (Prioritizing Present Month Active Stock):
  const deductedInvIds = new Set<string>();

  // A. Direct Product Match (e.g. Water 500ml, Mojo, Drinks, etc.)
  const directCandidates = allInventory.filter(inv =>
    (menuItemId && (inv.menuItemId === menuItemId || inv.id === menuItemId)) ||
    (itemName && inv.name && inv.name.trim().toLowerCase() === itemName.trim().toLowerCase()) ||
    normalizeProductKey(inv.name, inv.category) === normalizeProductKey(itemName, itemCategory)
  );
  const directMatch = pickActivePresentItem(directCandidates);
  if (directMatch && !deductedInvIds.has(directMatch.id)) {
    deductions.push({
      inventoryItem: directMatch,
      quantityToDeduct: qty,
      reason: `Direct product sale (${itemName})`
    });
    deductedInvIds.add(directMatch.id);
  }

  // B. Packaging / Box Auto-Detection
  const isPizza = (finalCategory && finalCategory.toLowerCase().includes('pizza')) || itemName.toLowerCase().includes('pizza');
  const isBurger = (finalCategory && finalCategory.toLowerCase().includes('burger')) || itemName.toLowerCase().includes('burger');

  if (isPizza) {
    const textToSearch = `${variantName} ${itemName} ${lineItem.specialRequest || ''}`.toLowerCase();
    let size = '';
    if (textToSearch.includes('12') || textToSearch.includes('large')) size = '12';
    else if (textToSearch.includes('8') || textToSearch.includes('small')) size = '8';
    else size = '10'; // default 10-inch pizza

    const boxCandidates = allInventory.filter(inv => {
      const n = (inv.name || '').toLowerCase();
      const normKey = normalizeProductKey(inv.name, inv.category);
      if (normKey === `box:pizza_${size}`) return true;
      return (n.includes('box') || (inv.category || '').toLowerCase().includes('packaging') || (inv.category || '').toLowerCase().includes('food raw materials')) &&
             (n.includes(size) || n.includes(`${size}"`) || n.includes(`${size} inch`)) &&
             n.includes('pizza');
    });

    let boxItem = pickActivePresentItem(boxCandidates);

    if (!boxItem) {
      const fallbackCandidates = allInventory.filter(inv => {
        const n = (inv.name || '').toLowerCase();
        return n.includes('box') && (n.includes(size) || n.includes(`${size}"`));
      });
      boxItem = pickActivePresentItem(fallbackCandidates);
    }

    if (!boxItem) {
      const generalBoxCandidates = allInventory.filter(inv => {
        const n = (inv.name || '').toLowerCase();
        return n.includes('pizza') && n.includes('box');
      });
      boxItem = pickActivePresentItem(generalBoxCandidates);
    }

    if (boxItem && !deductedInvIds.has(boxItem.id)) {
      deductions.push({
        inventoryItem: boxItem,
        quantityToDeduct: qty,
        reason: `Packaging: ${boxItem.name} (${size}" Pizza)`
      });
      deductedInvIds.add(boxItem.id);
    }
  } else if (isBurger) {
    const burgerCandidates = allInventory.filter(inv => {
      const n = (inv.name || '').toLowerCase();
      const normKey = normalizeProductKey(inv.name, inv.category);
      if (normKey === 'box:burger') return true;
      return (n.includes('burger') && n.includes('box')) || (n.includes('burger') && (inv.category || '').toLowerCase().includes('packaging'));
    });
    const burgerBox = pickActivePresentItem(burgerCandidates);
    if (burgerBox && !deductedInvIds.has(burgerBox.id)) {
      deductions.push({
        inventoryItem: burgerBox,
        quantityToDeduct: qty,
        reason: `Packaging: ${burgerBox.name}`
      });
      deductedInvIds.add(burgerBox.id);
    }
  }

  // C. Ingredients Auto-Detection
  if (finalIngredients && finalIngredients.length > 0) {
    for (const ing of finalIngredients) {
      const ingLower = ing.trim().toLowerCase();
      const ingCandidates = allInventory.filter(inv => {
        if (deductedInvIds.has(inv.id)) return false;
        const invName = (inv.name || '').trim().toLowerCase();
        return (
          invName === ingLower ||
          invName.includes(ingLower) ||
          ingLower.includes(invName) ||
          (ingLower.includes('cheese') && invName.includes('cheese')) ||
          (ingLower.includes('mozzarella') && invName.includes('mozzarella')) ||
          (ingLower.includes('chicken') && invName.includes('chicken')) ||
          (ingLower.includes('beef') && invName.includes('beef')) ||
          (ingLower.includes('tomato') && invName.includes('tomato')) ||
          (ingLower.includes('mushroom') && invName.includes('mushroom')) ||
          (ingLower.includes('dough') && (invName.includes('dough') || invName.includes('flour')))
        );
      });

      const matchedInv = pickActivePresentItem(ingCandidates);

      if (matchedInv && !deductedInvIds.has(matchedInv.id)) {
        const unitPortion = (matchedInv.unit?.toLowerCase() === 'kg') ? 0.1 : 1;
        deductions.push({
          inventoryItem: matchedInv,
          quantityToDeduct: unitPortion * qty,
          reason: `Ingredient: ${matchedInv.name}`
        });
        deductedInvIds.add(matchedInv.id);
      }
    }
  }

  return deductions;
}

function deductInventoryForOrderClient(
  inventory: InventoryItem[],
  menuItems: MenuItem[],
  items: Array<{ item?: any; menuItemId?: string; id?: string; name?: string; quantity?: number }>,
  orderInfo: { orderNumber?: string; id?: string; isTable?: boolean; tableNumber?: string | number }
): { updatedInventory: InventoryItem[]; movements: StockMovement[] } {
  let updatedInventory = [...inventory];
  const movements: StockMovement[] = [];
  const today = new Date().toLocaleDateString('en-CA');

  for (const lineItem of items || []) {
    const deductions = findRelatedInventoryDeductionsClient(lineItem, updatedInventory, menuItems);
    for (const { inventoryItem: inv, quantityToDeduct, reason } of deductions) {
      const idx = updatedInventory.findIndex(i => i.id === inv.id);
      if (idx !== -1) {
        const currentInv = updatedInventory[idx];
        const newStock = Math.max(0, (currentInv.currentStock || 0) - quantityToDeduct);
        updatedInventory[idx] = { ...currentInv, currentStock: newStock };

        movements.push({
          id: `mv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          itemId: currentInv.id,
          itemName: currentInv.name,
          type: 'Sale OUT',
          quantity: quantityToDeduct,
          unitPrice: currentInv.costPrice || 0,
          totalCost: quantityToDeduct * (currentInv.costPrice || 0),
          date: today,
          note: `Order #${orderInfo.orderNumber || (orderInfo.id ? orderInfo.id.slice(-6) : 'POS')} - ${reason}${orderInfo.isTable ? ` (Table ${orderInfo.tableNumber || ''})` : ''}`,
          orderNumber: orderInfo.orderNumber || (orderInfo.id ? orderInfo.id.slice(-6) : '')
        });
      }
    }
  }

  return { updatedInventory, movements };
}

function restockInventoryForOrderClient(
  inventory: InventoryItem[],
  menuItems: MenuItem[],
  items: Array<{ item?: any; menuItemId?: string; id?: string; name?: string; quantity?: number }>,
  orderInfo: { orderNumber?: string; id?: string; isTable?: boolean; tableNumber?: string | number; reason?: string }
): { updatedInventory: InventoryItem[]; movements: StockMovement[] } {
  let updatedInventory = [...inventory];
  const movements: StockMovement[] = [];
  const today = new Date().toLocaleDateString('en-CA');

  for (const lineItem of items || []) {
    const deductions = findRelatedInventoryDeductionsClient(lineItem, updatedInventory, menuItems);
    for (const { inventoryItem: inv, quantityToDeduct, reason } of deductions) {
      const idx = updatedInventory.findIndex(i => i.id === inv.id);
      if (idx !== -1) {
        const currentInv = updatedInventory[idx];
        const newStock = (currentInv.currentStock || 0) + quantityToDeduct;
        updatedInventory[idx] = { ...currentInv, currentStock: newStock };

        movements.push({
          id: `mv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          itemId: currentInv.id,
          itemName: currentInv.name,
          type: 'Return IN',
          quantity: quantityToDeduct,
          unitPrice: currentInv.costPrice || 0,
          totalCost: quantityToDeduct * (currentInv.costPrice || 0),
          date: today,
          note: `Restocked from Deleted Order #${orderInfo.orderNumber || (orderInfo.id ? orderInfo.id.slice(-6) : 'POS')} - ${reason}${orderInfo.reason ? ` (${orderInfo.reason})` : ''}`,
          orderNumber: orderInfo.orderNumber || (orderInfo.id ? orderInfo.id.slice(-6) : '')
        });
      }
    }
  }

  return { updatedInventory, movements };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_SOCKET_CONNECTED':
      return { ...state, isSocketConnected: action.payload };
    case 'SET_ANALYTICS':
      return { ...state, analytics: action.payload };
    case 'LOAD_FROM_STORAGE':
      return {
        ...state,
        ...action.payload,
        isAdminLoggedIn: state.isAdminLoggedIn, // Preserve admin login state
        // Guarantee new fields always have safe defaults even if old localStorage had none
        tables: action.payload.tables ?? state.tables,
        tableOrders: action.payload.tableOrders ?? state.tableOrders ?? [],
        wasteRecords: action.payload.wasteRecords ?? state.wasteRecords ?? [],
        employees: action.payload.employees ?? state.employees ?? [],
        payrollRecords: action.payload.payrollRecords ?? state.payrollRecords ?? [],
        expenses: action.payload.expenses ?? state.expenses ?? [],
        cashRegister: action.payload.cashRegister ?? state.cashRegister ?? [],
        inventory: action.payload.inventory ?? state.inventory ?? [],
        stockMovements: action.payload.stockMovements ?? state.stockMovements ?? [],
        reviews: action.payload.reviews ?? state.reviews ?? [],
        users: action.payload.users ?? state.users ?? [],
        deletedOrders: action.payload.deletedOrders ?? state.deletedOrders ?? [],
        cart: syncCartBoxes(action.payload.cart ?? state.cart ?? [], action.payload.menuItems ?? state.menuItems ?? []),
        deliverySettings: action.payload.deliverySettings ? {
          ...DEFAULT_DELIVERY_SETTINGS,
          ...action.payload.deliverySettings,
          customAreas: Array.isArray(action.payload.deliverySettings.customAreas) && action.payload.deliverySettings.customAreas.length > 0
            ? action.payload.deliverySettings.customAreas
            : (state.deliverySettings?.customAreas && state.deliverySettings.customAreas.length > 0
                ? state.deliverySettings.customAreas
                : DEFAULT_SYLHET_CUSTOM_AREAS),
          restaurantLat: typeof action.payload.deliverySettings.restaurantLat === 'number' && action.payload.deliverySettings.restaurantLat !== 0
            ? action.payload.deliverySettings.restaurantLat
            : DEFAULT_DELIVERY_SETTINGS.restaurantLat,
          restaurantLng: typeof action.payload.deliverySettings.restaurantLng === 'number' && action.payload.deliverySettings.restaurantLng !== 0
            ? action.payload.deliverySettings.restaurantLng
            : DEFAULT_DELIVERY_SETTINGS.restaurantLng,
        } : (state.deliverySettings ?? DEFAULT_DELIVERY_SETTINGS),
        pixelSettings: action.payload.pixelSettings ?? state.pixelSettings ?? DEFAULT_PIXEL_SETTINGS,
      };

    case 'ADD_TO_CART': {
      const p = action.payload;
      const pizzaSize = p.size || p.variant || detectPizzaItemSize({ item: p.item });
      const itemKey = `${p.item.id}_${pizzaSize || ''}_${p.item.price}`;

      const existingIndex = state.cart.findIndex(c => {
        const cSize = c.size || c.variant || detectPizzaItemSize(c);
        const cKey = `${c.item.id}_${cSize || ''}_${c.item.price}`;
        return cKey === itemKey;
      });

      let updatedCart: CartItem[];
      if (existingIndex >= 0) {
        updatedCart = state.cart.map((c, idx) =>
          idx === existingIndex
            ? { ...c, quantity: c.quantity + p.quantity }
            : c
        );
      } else {
        updatedCart = [
          ...state.cart,
          {
            item: p.item,
            quantity: p.quantity,
            specialRequest: p.specialRequest,
            size: p.size,
            variant: p.variant,
          },
        ];
      }

      return {
        ...state,
        cart: syncCartBoxes(updatedCart, state.menuItems),
      };
    }

    case 'REMOVE_FROM_CART': {
      const targetId = action.payload;
      const target = state.cart.find(c => c.item.id === targetId);

      // If user tries to directly remove a pizza box while matching pizzas exist, prevent it
      if (target && (isPizzaBox(target.item) || target.isAutoBox)) {
        const boxSize = getPizzaBoxSize(target.item) || target.forPizzaSize;
        const matchingPizzasExist = state.cart.some(
          c => !isPizzaBox(c.item) && !c.isAutoBox && detectPizzaItemSize(c) === boxSize
        );
        if (matchingPizzasExist) {
          return state;
        }
      }

      const remaining = state.cart.filter(c => c.item.id !== targetId);
      return {
        ...state,
        cart: syncCartBoxes(remaining, state.menuItems),
      };
    }

    case 'UPDATE_QUANTITY': {
      const { id, quantity } = action.payload;
      const target = state.cart.find(c => c.item.id === id);

      // If user tries to decrease a pizza box below the required pizzas, lock it
      if (target && (isPizzaBox(target.item) || target.isAutoBox)) {
        const boxSize = getPizzaBoxSize(target.item) || target.forPizzaSize;
        const requiredCount = state.cart
          .filter(c => !isPizzaBox(c.item) && !c.isAutoBox && detectPizzaItemSize(c) === boxSize)
          .reduce((sum, c) => sum + c.quantity, 0);

        if (quantity < requiredCount) {
          return state;
        }
      }

      const updated = state.cart.map(c =>
        c.item.id === id
          ? { ...c, quantity: Math.max(1, quantity) }
          : c
      );
      return {
        ...state,
        cart: syncCartBoxes(updated, state.menuItems),
      };
    }

    case 'CLEAR_CART':
      return { ...state, cart: [] };

    case 'PLACE_ORDER': {
      const deduction = deductInventoryForOrderClient(state.inventory, state.menuItems, action.payload.items, {
        orderNumber: action.payload.orderNumber,
        id: action.payload.id,
        isTable: false
      });
      return {
        ...state,
        orders: [action.payload, ...state.orders],
        cart: [],
        inventory: deduction.updatedInventory,
        stockMovements: [...deduction.movements, ...state.stockMovements]
      };
    }

    case 'BATCH_PLACE_ORDERS': {
      // Merge offline-queued orders — skip any already in state (dedup by id)
      const existingIds = new Set(state.orders.map(o => o.id));
      const newOrders = action.payload.filter(o => !existingIds.has(o.id));
      let currentInv = [...state.inventory];
      const allMovements: StockMovement[] = [];
      newOrders.forEach(o => {
        const d = deductInventoryForOrderClient(currentInv, state.menuItems, o.items, {
          orderNumber: o.orderNumber,
          id: o.id,
          isTable: false
        });
        currentInv = d.updatedInventory;
        allMovements.push(...d.movements);
      });
      return {
        ...state,
        orders: [...newOrders, ...state.orders],
        inventory: currentInv,
        stockMovements: [...allMovements, ...state.stockMovements]
      };
    }

    case 'UPDATE_ORDER':
      return {
        ...state,
        orders: state.orders.map(o => o.id === action.payload.id ? action.payload : o)
      };

    case 'UPDATE_ORDER_STATUS':
      return {
        ...state,
        orders: state.orders.map(o =>
          o.id === action.payload.id ? { ...o, status: action.payload.status } : o
        ),
      };

    case 'SETTLE_STAFF_TAB': {
      const now = new Date().toISOString();
      return {
        ...state,
        orders: state.orders.map(o => {
          if (o.id !== action.payload.orderId && o.orderNumber !== action.payload.orderId) return o;
          return {
            ...o,
            staffTabDetails: {
              ...(o.staffTabDetails || { staffId: '', staffName: o.customerName || 'Staff', isSettled: false }),
              isSettled: true,
              settledAt: now,
              settledMethod: action.payload.settledMethod,
              settledBy: action.payload.settledBy || 'Admin',
              notes: action.payload.notes || o.staffTabDetails?.notes || ''
            }
          };
        }),
        tableOrders: (state.tableOrders || []).map(to => {
          if (to.id !== action.payload.orderId && to.invoiceNumber !== action.payload.orderId) return to;
          return {
            ...to,
            staffTabDetails: {
              ...(to.staffTabDetails || { staffId: '', staffName: to.customerName || 'Staff', isSettled: false }),
              isSettled: true,
              settledAt: now,
              settledMethod: action.payload.settledMethod,
              settledBy: action.payload.settledBy || 'Admin',
              notes: action.payload.notes || to.staffTabDetails?.notes || ''
            }
          };
        })
      };
    }

    case 'DELETE_ORDER': {
      const targetId = action.payload;
      return {
        ...state,
        orders: state.orders.filter(o => o.id !== targetId),
        tableOrders: state.tableOrders.filter(o => o.id !== targetId && o.invoiceNumber !== targetId && o.orderNumber !== targetId)
      };
    }

    case 'DELETE_TABLE_ORDER': {
      const targetId = action.payload;
      return {
        ...state,
        tableOrders: state.tableOrders.filter(o => o.id !== targetId),
        orders: state.orders.filter(o => o.id !== targetId && o.orderNumber !== targetId && o.invoiceNumber !== targetId)
      };
    }

    case 'DELETE_ORDER_WITH_CLEANUP': {
      const { orderId, orderNumber, invoiceNumber, deletedOrder, reason, deletedBy } = action.payload;
      const targetId = orderId || deletedOrder?.originalOrderId || deletedOrder?.id;
      const targetNum = orderNumber || deletedOrder?.orderNumber;
      const targetInv = invoiceNumber || deletedOrder?.invoiceNumber;

      const rawOrder = deletedOrder || 
        state.orders.find(o => o.id === targetId || (targetNum && o.orderNumber === targetNum) || (targetInv && o.invoiceNumber === targetInv)) ||
        state.tableOrders.find(o => o.id === targetId || (targetNum && o.orderNumber === targetNum) || (targetInv && o.invoiceNumber === targetInv));

      const items = rawOrder?.items || [];
      const restockResult = restockInventoryForOrderClient(
        state.inventory,
        state.menuItems,
        items,
        {
          orderNumber: targetNum || rawOrder?.orderNumber || (targetId ? targetId.slice(-6) : ''),
          id: targetId,
          reason: reason || 'Order Deleted'
        }
      );

      const newOrders = state.orders.filter(o => 
        o.id !== targetId && (!targetNum || o.orderNumber !== targetNum) && (!targetInv || o.invoiceNumber !== targetInv)
      );
      const newTableOrders = state.tableOrders.filter(o => 
        o.id !== targetId && (!targetNum || o.orderNumber !== targetNum) && (!targetInv || o.invoiceNumber !== targetInv)
      );

      const deletedRecord: DeletedOrder = deletedOrder || {
        id: `del-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        originalOrderId: targetId || '',
        orderNumber: targetNum || (targetId ? targetId.slice(-6) : ''),
        invoiceNumber: targetInv || '',
        orderType: rawOrder?.orderType || (rawOrder?.tableNumber ? 'Dine In' : 'POS'),
        customerName: rawOrder?.customerName || (rawOrder?.tableNumber ? `Table ${rawOrder.tableNumber}` : 'Customer'),
        customerPhone: rawOrder?.phone || rawOrder?.customerPhone || '',
        deliveryAddress: rawOrder?.address || '',
        tableNumber: rawOrder?.tableNumber || '',
        tableId: rawOrder?.tableId || '',
        items: items,
        subtotal: rawOrder?.subtotal || 0,
        discount: rawOrder?.discount || 0,
        deliveryFee: rawOrder?.deliveryFee || 0,
        total: rawOrder?.total || 0,
        paymentMethod: rawOrder?.paymentMethod || 'Cash',
        splitPayments: rawOrder?.splitPayments || [],
        compDetails: rawOrder?.compDetails,
        staffTabDetails: rawOrder?.staffTabDetails,
        orderCreatedAt: String(rawOrder?.createdAt || ''),
        deletedAt: new Date().toISOString(),
        deletedBy: deletedBy || 'Admin',
        deletionReason: reason || 'Admin Deletion',
        restocked: true,
        restockedItemsCount: restockResult.movements.length,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        rawOrderData: rawOrder
      };

      const newTables = state.tables.map(t => {
        if (t.currentOrderId === targetId || (rawOrder?.tableNumber && String(t.tableNumber) === String(rawOrder.tableNumber))) {
          return { ...t, status: 'Available' as const, currentOrderId: undefined };
        }
        return t;
      });

      return {
        ...state,
        orders: newOrders,
        tableOrders: newTableOrders,
        tables: newTables,
        inventory: restockResult.updatedInventory,
        stockMovements: [...restockResult.movements, ...state.stockMovements],
        deletedOrders: [deletedRecord, ...state.deletedOrders.filter(d => d.id !== deletedRecord.id && d.originalOrderId !== targetId)]
      };
    }

    case 'ADD_DELETED_ORDER':
      if (state.deletedOrders.some(d => d.id === action.payload.id)) return state;
      return { ...state, deletedOrders: [action.payload, ...state.deletedOrders] };

    case 'SET_DELETED_ORDERS':
      return { ...state, deletedOrders: action.payload };

    case 'PURGE_DELETED_ORDER':
      return {
        ...state,
        deletedOrders: state.deletedOrders.filter(d => 
          d.id !== action.payload && 
          (d as any)._id?.toString() !== action.payload?.toString() &&
          d.orderNumber !== action.payload
        )
      };

    case 'RESTORE_DELETED_ORDER':
      return {
        ...state,
        deletedOrders: state.deletedOrders.filter(d => 
          d.id !== action.payload && 
          (d as any)._id?.toString() !== action.payload?.toString() &&
          d.orderNumber !== action.payload
        )
      };

    case 'SYNC_ORDER_STATUSES': {
      const updates = action.payload.reduce((acc, curr) => { acc[curr.id] = curr.status; return acc; }, {} as Record<string, OrderStatus>);
      return {
        ...state,
        orders: state.orders.map(o => updates[o.id] ? { ...o, status: updates[o.id] } : o)
      };
    }

    case 'ADD_RESERVATION':
      return { ...state, reservations: [action.payload, ...state.reservations] };

    case 'UPDATE_RESERVATION':
      return {
        ...state,
        reservations: state.reservations.map(r =>
          r.id === action.payload.id ? { ...r, status: action.payload.status } : r
        ),
      };

    case 'DELETE_RESERVATION':
      return { ...state, reservations: state.reservations.filter(r => r.id !== action.payload) };

    case 'ADD_MESSAGE':
      return { ...state, messages: [action.payload, ...state.messages] };

    case 'READ_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(m =>
          m.id === action.payload ? { ...m, isRead: true } : m
        ),
      };

    case 'DELETE_MESSAGE':
      return { ...state, messages: state.messages.filter(m => m.id !== action.payload) };

    case 'REPLY_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(m =>
          m.id === action.payload.id
            ? { ...m, reply: action.payload.reply, isRead: true }
            : m
        ),
      };

    case 'ADD_CATERING':
      return { ...state, cateringRequests: [action.payload, ...state.cateringRequests] };

    case 'UPDATE_CATERING':
      return {
        ...state,
        cateringRequests: state.cateringRequests.map(c =>
          c.id === action.payload.id ? { ...c, status: action.payload.status } : c
        ),
      };

    case 'ADD_MENU_ITEM':
      return { ...state, menuItems: [action.payload, ...state.menuItems] };

    case 'UPDATE_MENU_ITEM':
      return {
        ...state,
        menuItems: state.menuItems.map(m =>
          m.id === action.payload.id ? action.payload : m
        ),
      };

    case 'DELETE_MENU_ITEM':
      return { ...state, menuItems: state.menuItems.filter(m => m.id !== action.payload) };
    case 'ADD_CHEF':
      return { ...state, chefs: [...state.chefs, action.payload] };
    case 'UPDATE_CHEF':
      return { ...state, chefs: state.chefs.map(c => c.id === action.payload.id ? action.payload : c) };
    case 'DELETE_CHEF':
      return { ...state, chefs: state.chefs.filter(c => c.id !== action.payload) };

    case 'ADD_GALLERY_IMAGE':
      return { ...state, galleryImages: [...state.galleryImages, action.payload] };

    case 'UPDATE_GALLERY_IMAGE':
      return {
        ...state,
        galleryImages: state.galleryImages.map(g =>
          g.id === action.payload.id ? action.payload : g
        ),
      };

    case 'DELETE_GALLERY_IMAGE':
      return { ...state, galleryImages: state.galleryImages.filter(g => g.id !== action.payload) };

    case 'ADD_USER':
      return { ...state, users: [action.payload, ...state.users] };
    case 'UPDATE_USER':
      return { ...state, users: state.users.map(u => u.id === action.payload.id ? action.payload : u) };
    case 'DELETE_USER':
      return { ...state, users: state.users.filter(u => u.id !== action.payload) };

    case 'ADD_CAROUSEL_SLIDE':
      return { ...state, carouselSlides: [...state.carouselSlides, action.payload] };

    case 'UPDATE_CAROUSEL_SLIDE':
      return {
        ...state,
        carouselSlides: state.carouselSlides.map(s =>
          s.id === action.payload.id ? action.payload : s
        ),
      };

    case 'DELETE_CAROUSEL_SLIDE':
      return { ...state, carouselSlides: state.carouselSlides.filter(s => s.id !== action.payload) };

    case 'REORDER_CAROUSEL_SLIDE': {
      const slides = [...state.carouselSlides];
      const { fromIndex, toIndex } = action.payload;
      if (toIndex < 0 || toIndex >= slides.length) return state;
      [slides[fromIndex], slides[toIndex]] = [slides[toIndex], slides[fromIndex]];
      return { ...state, carouselSlides: slides };
    }

    // ── Table Actions ──────────────────────────────────────────────────────────

    case 'ADD_TABLE':
      return { ...state, tables: [...state.tables, action.payload] };

    case 'UPDATE_TABLE':
      return {
        ...state,
        tables: state.tables.map(t => t.id === action.payload.id ? action.payload : t),
      };

    case 'DELETE_TABLE':
      return { ...state, tables: state.tables.filter(t => t.id !== action.payload) };

    case 'SET_TABLE_STATUS':
      return {
        ...state,
        tables: state.tables.map(t =>
          t.id === action.payload.id
            ? {
              ...t,
              status: action.payload.status,
              currentOrderId: action.payload.currentOrderId,
              occupiedSince: action.payload.occupiedSince,
              customerName: action.payload.customerName !== undefined ? action.payload.customerName : t.customerName,
              customerPhone: action.payload.customerPhone !== undefined ? action.payload.customerPhone : t.customerPhone,
              guestCount: action.payload.guestCount !== undefined ? action.payload.guestCount : t.guestCount,
            }
            : t
        ),
      };

    // ── Table Order Actions ────────────────────────────────────────────────────

    case 'PLACE_TABLE_ORDER': {
      const deduction = deductInventoryForOrderClient(state.inventory, state.menuItems, action.payload.items, {
        orderNumber: action.payload.invoiceNumber || (action.payload.id ? action.payload.id.slice(-6) : 'POS'),
        id: action.payload.id,
        isTable: true,
        tableNumber: action.payload.tableNumber
      });
      return {
        ...state,
        tableOrders: [action.payload, ...state.tableOrders],
        inventory: deduction.updatedInventory,
        stockMovements: [...deduction.movements, ...state.stockMovements]
      };
    }

    case 'UPDATE_TABLE_ORDER': {
      const exists = state.tableOrders.some(o => o.id === action.payload.id);
      return {
        ...state,
        tableOrders: exists
          ? state.tableOrders.map(o => o.id === action.payload.id ? action.payload : o)
          : [action.payload, ...state.tableOrders],
      };
    }

    case 'UPDATE_TABLE_ORDER_STATUS':
      return {
        ...state,
        tableOrders: state.tableOrders.map(o =>
          o.id === action.payload.id ? { ...o, status: action.payload.status } : o
        ),
      };

    case 'SYNC_TABLE_ORDER_STATUSES': {
      const updates = action.payload.reduce((acc, curr) => { acc[curr.id] = curr.status; return acc; }, {} as Record<string, TableOrderStatus>);
      return {
        ...state,
        tableOrders: state.tableOrders.map(o => updates[o.id] ? { ...o, status: updates[o.id] } : o)
      };
    }

    // ── Waste Records ────────────────────────────────────────────────────────
    case 'ADD_WASTE_RECORD':
      return { ...state, wasteRecords: [action.payload, ...state.wasteRecords] };
    case 'DELETE_WASTE_RECORD':
      return { ...state, wasteRecords: state.wasteRecords.filter(w => w.id !== action.payload) };

    // ── Payroll ──────────────────────────────────────────────────────────────
    case 'ADD_EMPLOYEE':
      return { ...state, employees: [action.payload, ...state.employees] };
    case 'UPDATE_EMPLOYEE':
      return { ...state, employees: state.employees.map(e => e.id === action.payload.id ? action.payload : e) };
    case 'DELETE_EMPLOYEE':
      return { ...state, employees: state.employees.filter(e => e.id !== action.payload) };
    case 'ADD_PAYROLL_RECORD':
      return { ...state, payrollRecords: [action.payload, ...state.payrollRecords] };

    // ── Expenses ─────────────────────────────────────────────────────────────
    case 'ADD_EXPENSE':
      return { ...state, expenses: [action.payload, ...state.expenses] };
    case 'UPDATE_EXPENSE':
      return { ...state, expenses: state.expenses.map(e => e.id === action.payload.id ? action.payload : e) };
    case 'DELETE_EXPENSE':
      return { ...state, expenses: state.expenses.filter(e => e.id !== action.payload) };

    // ── Cash Register ────────────────────────────────────────────────────────
    case 'ADD_CASH_ENTRY':
      // Close any existing open registers in state before adding the new one
      return {
        ...state,
        cashRegister: [
          action.payload,
          ...state.cashRegister.map(c =>
            c.status === 'Open' ? { ...c, status: 'Closed' as const, closedAt: new Date().toISOString() } : c
          )
        ]
      };
    case 'UPDATE_CASH_ENTRY':
      return { ...state, cashRegister: state.cashRegister.map(c => c.id === action.payload.id ? action.payload : c) };
    case 'DELETE_CASH_ENTRY':
      return { ...state, cashRegister: state.cashRegister.filter(c => c.id !== action.payload) };

    // ── Inventory ────────────────────────────────────────────────────────────
    case 'ADD_INVENTORY_ITEM':
      if (state.inventory.some(i => i.id === action.payload.id)) return state;
      return { ...state, inventory: [action.payload, ...state.inventory] };
    case 'UPDATE_INVENTORY_ITEM': {
      const remainingInventory = state.inventory.filter(i => i.id !== action.payload.id);
      return { ...state, inventory: [action.payload, ...remainingInventory] };
    }
    case 'DELETE_INVENTORY_ITEM':
      return { ...state, inventory: state.inventory.filter(i => i.id !== action.payload) };
    case 'ADD_STOCK_MOVEMENT':
      if (state.stockMovements.some(m => m.id === action.payload.id)) return state;
      return { ...state, stockMovements: [action.payload, ...state.stockMovements] };
    case 'DELETE_STOCK_MOVEMENT':
      return { ...state, stockMovements: state.stockMovements.filter(m => m.id !== action.payload) };

    // ── Reviews ──────────────────────────────────────────────────────────────
    case 'ADD_REVIEW':
      return { ...state, reviews: [action.payload, ...state.reviews] };
    case 'HELPFUL_REVIEW':
      return {
        ...state,
        reviews: state.reviews.map(r => r.id === action.payload ? { ...r, helpful: r.helpful + 1 } : r)
      };

    // ── System ────────────────────────────────────────────────────────────────

    case 'ADMIN_LOGIN':
      return { ...state, isAdminLoggedIn: true };

    case 'ADMIN_LOGOUT':
      return { ...state, isAdminLoggedIn: false };

    case 'TOGGLE_CART':
      return { ...state, cartOpen: !state.cartOpen };

    case 'SET_CART_OPEN':
      return { ...state, cartOpen: action.payload };

    case 'SET_NOTIFICATION':
      return { ...state, notification: action.payload };

    case 'SET_INITIAL_LOADING':
      return { ...state, isInitialLoading: action.payload };

    case 'UPDATE_DELIVERY_SETTINGS':
      return {
        ...state,
        deliverySettings: {
          ...state.deliverySettings,
          ...action.payload,
          customAreas: action.payload.customAreas ?? state.deliverySettings?.customAreas ?? DEFAULT_SYLHET_CUSTOM_AREAS,
        }
      };

    case 'UPDATE_PIXEL_SETTINGS':
      return { ...state, pixelSettings: action.payload };

    case 'SET_SAFE_MODE':
      return state;

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  addToCart: (item: MenuItem, quantity?: number, specialRequest?: string, sizeOrVariant?: string) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  placeTableOrder: (order: TableOrder) => void;
  updateTableOrder: (order: TableOrder) => void;
  updateTableOrderStatus: (id: string, status: TableOrderStatus) => void;
  setTableStatus: (id: string, status: TableStatus, orderId?: string, customerName?: string, customerPhone?: string, guestCount?: number) => void;
  clearAndFreeTable: (id: string) => void;
  addWasteRecord: (record: WasteRecord) => void;
  deleteWasteRecord: (id: string) => void;
  addEmployee: (emp: Employee) => void;
  updateEmployee: (emp: Employee) => void;
  deleteEmployee: (id: string) => void;
  addPayrollRecord: (record: PayrollRecord) => void;
  updateDeliverySettings: (settings: DeliverySettings) => void;
  updatePixelSettings: (settings: PixelSettings) => void;
  calcDeliveryFee: (distanceKm: number) => number;
  refreshAnalytics: () => Promise<void>;
  deleteOrderWithCleanup: (orderOrId: any, reason?: string) => Promise<{ success: boolean; error?: string }>;
  restoreDeletedOrder: (deletedOrderId: string) => Promise<{ success: boolean; error?: string }>;
  purgeDeletedOrder: (deletedOrderId: string) => Promise<{ success: boolean; error?: string }>;
  isSafeMode: boolean;
  setSafeMode: (enabled: boolean) => void;
  toggleSafeMode: () => void;
  rawState: AppState;
}

const AppContext = createContext<AppContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

let socket: Socket | null = null;
export const getBackendUrl = () => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      if (import.meta.env.VITE_BACKEND_URL) return import.meta.env.VITE_BACKEND_URL;
      if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    }
  } catch (e) {
    // ignore in environments without import.meta
  }
  
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // Localhost development
    if (host === 'localhost') return 'http://localhost:3001';
    // Local network development (testing on mobile devices)
    if (host.match(/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/)) {
      return `http://${host}:3001`;
    }
    return window.location.origin;
  }
  return 'http://localhost:3001';
};
export const SOCKET_URL = getBackendUrl();

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatchLocal] = useReducer(reducer, initialState);

  // Safe Mode: limits monthly visible sales to 10k Tk across orders, cash register, sales & analytics
  const [isSafeMode, setIsSafeMode] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem('pizzora_safe_mode') === 'true';
    } catch {
      return false;
    }
  });

  const setSafeMode = React.useCallback((val: boolean) => {
    setIsSafeMode(val);
    try {
      localStorage.setItem('pizzora_safe_mode', val ? 'true' : 'false');
    } catch (e) {}
    dispatch({ type: 'SET_SAFE_MODE', payload: val });
  }, []);

  const toggleSafeMode = React.useCallback(() => {
    setIsSafeMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem('pizzora_safe_mode', next ? 'true' : 'false');
      } catch (e) {}
      dispatch({ type: 'SET_SAFE_MODE', payload: next });
      return next;
    });
  }, []);

  const safeModeDataset = React.useMemo(() => {
    if (!isSafeMode) return null;
    return getSafeModeDataset(state.orders, state.tableOrders, state.cashRegister, state.expenses);
  }, [isSafeMode, state.orders, state.tableOrders, state.cashRegister, state.expenses]);

  const effectiveState = React.useMemo<AppState>(() => {
    if (!isSafeMode || !safeModeDataset) return state;
    return {
      ...state,
      orders: safeModeDataset.safeOrders,
      tableOrders: safeModeDataset.safeTableOrders,
      cashRegister: safeModeDataset.safeCashRegister,
      expenses: safeModeDataset.safeExpenses,
      analytics: safeModeDataset.safeAnalytics,
    };
  }, [state, isSafeMode, safeModeDataset]);

  // Custom dispatch that broadcasts actions to the server
  const dispatch = async (action: Action) => {
    dispatchLocal(action);

    // Actions that shouldn't be broadcasted (purely local UI state or user-specific session state or REST-handled actions)
    const localOnly = [
      'SET_CART_OPEN', 'TOGGLE_CART', 'SET_NOTIFICATION', 'LOAD_FROM_STORAGE', 'SET_SOCKET_CONNECTED',
      'SET_INITIAL_LOADING', 'ADD_TO_CART', 'REMOVE_FROM_CART', 'UPDATE_QUANTITY', 'CLEAR_CART',
      'ADMIN_LOGIN', 'ADMIN_LOGOUT', 'SYNC_ORDER_STATUSES', 'SYNC_TABLE_ORDER_STATUSES',
      'SET_DELETED_ORDERS', 'DELETE_ORDER_WITH_CLEANUP', 'RESTORE_DELETED_ORDER', 'PURGE_DELETED_ORDER', 'ADD_DELETED_ORDER'
    ];

    if (!localOnly.includes(action.type)) {
      let success = false;
      
      // If admin and socket is connected, use socket
      if (socket && socket.connected && state.isSocketConnected) {
        success = await new Promise((resolve) => {
          socket!.emit('DISPATCH_ACTION', action, (res: any) => resolve(res && res.success));
        });
      } else {
        // Fallback to HTTP for public users or disconnected admins
        try {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          const token = sessionStorage.getItem('pizzora_token');
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          const res = await fetch(`${SOCKET_URL}/api/dispatch`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ action })
          });
          const data = await res.json();
          success = data.success;
        } catch (err) {
          success = false;
        }
      }

      if (!success) {
        console.warn('Action failed to sync, adding to offline queue:', action.type);
        const queue = JSON.parse(localStorage.getItem('pizzora_offline_queue') || '[]');
        queue.push(action);
        localStorage.setItem('pizzora_offline_queue', JSON.stringify(queue));
        dispatchLocal({ type: 'SET_NOTIFICATION', payload: { message: 'Saved offline. Will sync when reconnected.', type: 'info' } });
      }
    }
  };

  const processOfflineQueue = async () => {
    const queueString = localStorage.getItem('pizzora_offline_queue');
    if (!queueString) return;
    
    try {
      const queue: Action[] = JSON.parse(queueString);
      if (queue.length === 0) return;
      
      console.log(`Processing ${queue.length} offline actions...`);
      
      let successCount = 0;
      let newQueue = [...queue];

      for (let i = 0; i < queue.length; i++) {
        const action = queue[i];
        let success = false;
        let discard = false;
        
        if (socket && socket.connected && state.isSocketConnected) {
          const res: any = await new Promise((resolve) => {
            // Include a timeout just in case the server never responds
            const timeoutId = setTimeout(() => resolve({ success: false, discard: false }), 5000);
            socket!.emit('DISPATCH_ACTION', action, (res: any) => {
              clearTimeout(timeoutId);
              resolve(res || { success: false });
            });
          });
          success = res.success;
          discard = res.discard;
        } else {
          try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            const token = sessionStorage.getItem('pizzora_token');
            if (token) headers['Authorization'] = `Bearer ${token}`;
            
            const res = await fetch(`${SOCKET_URL}/api/dispatch`, {
              method: 'POST',
              headers,
              body: JSON.stringify({ action })
            });
            const data = await res.json();
            success = data.success;
            discard = data.discard;
          } catch (err) {
            success = false;
            discard = false; // Network error, do not discard
          }
        }
        
        if (success || discard) {
          if (success) successCount++;
          if (discard) console.warn('Discarding permanently failed offline action:', action.type);
          newQueue = newQueue.filter(a => a !== action);
          localStorage.setItem('pizzora_offline_queue', JSON.stringify(newQueue));
        } else {
          console.error('Failed to sync offline action, stopping queue processing:', action.type);
          break; // stop processing if one fails due to network
        }
      }
      
      if (successCount > 0) {
        dispatchLocal({ type: 'SET_NOTIFICATION', payload: { message: 'Offline data successfully synchronized!', type: 'success' }});
      }
    } catch (e) {
      console.error('Error processing offline queue', e);
    }
  };

  // Socket.io initialization and API fetch
  useEffect(() => {
    const token = sessionStorage.getItem('pizzora_token');
    
    // Only connect Socket.io for logged-in admins to save server memory!
    if (token) {
      socket = io(SOCKET_URL, {
        auth: { token }
      });

      // Receive actions dispatched by other clients
      socket.on('REMOTE_ACTION', (action: Action) => {
        if (action.type === 'SET_SAFE_MODE') {
          const isSafe = Boolean(action.payload);
          setIsSafeMode(isSafe);
          try {
            localStorage.setItem('pizzora_safe_mode', isSafe ? 'true' : 'false');
          } catch (e) {}
        }
        dispatchLocal(action);
      });

      socket.on('connect', () => {
        dispatchLocal({ type: 'SET_SOCKET_CONNECTED', payload: true });
        processOfflineQueue();
      });
      socket.on('disconnect', () => dispatchLocal({ type: 'SET_SOCKET_CONNECTED', payload: false }));
      socket.on('connect_error', () => dispatchLocal({ type: 'SET_SOCKET_CONNECTED', payload: false }));
    } else {
      // For public customers, try to process offline queue via HTTP
      setTimeout(processOfflineQueue, 1500);
    }

    // Fetch absolute state from MongoDB on mount (with cache-busting)
    fetch(`${SOCKET_URL}/api/state/public?_t=${Date.now()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(publicData => {
        if (token) {
          return fetch(`${SOCKET_URL}/api/state/admin?_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${token}` },
            cache: 'no-store'
          })
            .then(res => {
              if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                  console.warn("Invalid admin token, logging out.");
                  sessionStorage.removeItem('pizzora_token');
                  sessionStorage.removeItem('pizzora_admin_logged_in');
                  sessionStorage.removeItem('pizzora_admin_name');
                  sessionStorage.removeItem('pizzora_admin_role');
                  dispatchLocal({ type: 'ADMIN_LOGOUT' });
                }
                return {};
              }
              return res.json();
            })
            .then(adminData => {
              const fullData = { ...publicData, ...adminData };
              if (typeof fullData.isSafeMode === 'boolean') {
                setIsSafeMode(fullData.isSafeMode);
                try {
                  localStorage.setItem('pizzora_safe_mode', fullData.isSafeMode ? 'true' : 'false');
                } catch (e) {}
              }
              localStorage.setItem('pizzora_state_cache', JSON.stringify(fullData));
              dispatchLocal({ type: 'LOAD_FROM_STORAGE', payload: fullData });

              // Fetch analytics
              refreshAnalytics();
            });
        } else {
          if (typeof publicData?.isSafeMode === 'boolean') {
            setIsSafeMode(publicData.isSafeMode);
            try {
              localStorage.setItem('pizzora_safe_mode', publicData.isSafeMode ? 'true' : 'false');
            } catch (e) {}
          }
          localStorage.setItem('pizzora_state_cache', JSON.stringify(publicData));
          dispatchLocal({ type: 'LOAD_FROM_STORAGE', payload: publicData });
        }
      })
      .catch(err => {
        console.warn("Failed to load initial state from DB, using defaults:", err);
        const cached = localStorage.getItem('pizzora_state_cache');
        if (cached) {
          dispatchLocal({ type: 'LOAD_FROM_STORAGE', payload: JSON.parse(cached) });
        }
      })
      .finally(() => {
        // Re-apply offline actions to local state so they aren't lost from view
        try {
          const queue = JSON.parse(localStorage.getItem('pizzora_offline_queue') || '[]');
          if (queue.length > 0) {
            console.log(`Re-applying ${queue.length} offline actions to local state...`);
            queue.forEach((action: Action) => dispatchLocal(action));
          }
        } catch (e) {
          console.error("Failed to re-apply offline queue on load", e);
        }
        dispatchLocal({ type: 'SET_INITIAL_LOADING', payload: false });
      });

    return () => {
      socket?.disconnect();
    };
  }, []);

  // Sync cart to local storage
  useEffect(() => {
    localStorage.setItem('pizzora_cart', JSON.stringify(state.cart));
  }, [state.cart]);

  // Sync admin login to session storage
  useEffect(() => {
    sessionStorage.setItem('pizzora_admin_logged_in', String(state.isAdminLoggedIn));
  }, [state.isAdminLoggedIn]);

  // Auto-dismiss notifications
  useEffect(() => {
    if (state.notification) {
      const timer = setTimeout(() => {
        dispatch({ type: 'SET_NOTIFICATION', payload: null });
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [state.notification]);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    dispatch({ type: 'SET_NOTIFICATION', payload: { message, type } });
  };

  const addToCart = (item: MenuItem, quantity = 1, specialRequest?: string, sizeOrVariant?: string) => {
    dispatch({ type: 'ADD_TO_CART', payload: { item, quantity, specialRequest, size: sizeOrVariant, variant: sizeOrVariant } });
    pixelService.trackAddToCart(item, quantity);
  };

  const removeFromCart = (id: string) => {
    const target = state.cart.find(c => c.item.id === id);
    if (target && (isPizzaBox(target.item) || target.isAutoBox)) {
      const boxSize = getPizzaBoxSize(target.item) || target.forPizzaSize;
      const matchingPizzas = state.cart.filter(c => !isPizzaBox(c.item) && !c.isAutoBox && detectPizzaItemSize(c) === boxSize);
      if (matchingPizzas.length > 0) {
        showNotification(`Pizza Box ${boxSize}″ is required for food-safe delivery and cannot be removed.`, 'info');
        return;
      }
    }
    dispatch({ type: 'REMOVE_FROM_CART', payload: id });
  };

  const updateQuantity = (id: string, quantity: number) => {
    const target = state.cart.find(c => c.item.id === id);
    if (target && (isPizzaBox(target.item) || target.isAutoBox)) {
      const boxSize = getPizzaBoxSize(target.item) || target.forPizzaSize;
      const requiredCount = state.cart
        .filter(c => !isPizzaBox(c.item) && !c.isAutoBox && detectPizzaItemSize(c) === boxSize)
        .reduce((sum, c) => sum + c.quantity, 0);

      if (quantity < requiredCount) {
        showNotification(`Pizza Box ${boxSize}″ quantity is automatically linked to your ${requiredCount} ordered pizza${requiredCount > 1 ? 's' : ''}.`, 'info');
        return;
      }
    }
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  };

  const refreshAnalytics = useCallback(async () => {
    const token = sessionStorage.getItem('pizzora_token');
    if (!token) return;
    try {
      const res = await fetch(`${SOCKET_URL}/api/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const analyticsData = await res.json();
      if (analyticsData.success) {
        dispatchLocal({
          type: 'SET_ANALYTICS',
          payload: {
            totalRevenue: analyticsData.totalRevenue,
            totalCustomers: analyticsData.totalCustomers,
            todayRevenue: analyticsData.todayRevenue,
            weeklyRevenue: analyticsData.weeklyRevenue,
            monthlyRevenue: analyticsData.monthlyRevenue,
            yearlyRevenue: analyticsData.yearlyRevenue,
            dailyChart: analyticsData.dailyChart,
            weeklyChart: analyticsData.weeklyChart,
            monthlyChart: analyticsData.monthlyChart,
            yearlyChart: analyticsData.yearlyChart,
          }
        });
      }
    } catch (err) {
      console.error("Failed to refresh analytics", err);
    }
  }, []);

  const clearCart = () => dispatch({ type: 'CLEAR_CART' });

  const placeTableOrder = (order: TableOrder) => {
    dispatch({ type: 'PLACE_TABLE_ORDER', payload: order });
    dispatch({
      type: 'SET_TABLE_STATUS',
      payload: { id: order.tableId, status: 'Ordering', currentOrderId: order.id, occupiedSince: order.createdAt },
    });
  };

  const updateTableOrderStatus = (id: string, status: TableOrderStatus) => {
    dispatch({ type: 'UPDATE_TABLE_ORDER_STATUS', payload: { id, status } });
    // Sync table status with order status
    const order = state.tableOrders.find(o => o.id === id);
    if (order) {
      const tableStatus: TableStatus =
        status === 'Pending' ? 'Ordering' :
          status === 'Confirmed' ? 'Ordering' :
            status === 'Cooking' ? 'Cooking' :
              status === 'Ready' ? 'Ready' :
                status === 'Served' ? 'Served' :
                  status === 'Paid' ? 'Paid' : 'Available';
      dispatch({ type: 'SET_TABLE_STATUS', payload: { id: order.tableId, status: tableStatus, currentOrderId: id } });
    }
  };

  const updateTableOrder = (order: TableOrder) => {
    dispatch({ type: 'UPDATE_TABLE_ORDER', payload: order });
  };

  const setTableStatus = (
    id: string,
    status: TableStatus,
    orderId?: string,
    customerName?: string,
    customerPhone?: string,
    guestCount?: number
  ) => {
    dispatch({
      type: 'SET_TABLE_STATUS',
      payload: {
        id,
        status,
        currentOrderId: orderId,
        customerName,
        customerPhone,
        guestCount,
      },
    });
  };

  const clearAndFreeTable = (id: string) => {
    dispatch({
      type: 'SET_TABLE_STATUS',
      payload: {
        id,
        status: 'Available',
        currentOrderId: undefined,
        occupiedSince: undefined,
        customerName: '',
        customerPhone: '',
        guestCount: undefined,
      },
    });
  };

  const addWasteRecord = (record: WasteRecord) => {
    dispatch({ type: 'ADD_WASTE_RECORD', payload: record });
    showNotification('Waste logged successfully', 'success');
  };

  const deleteWasteRecord = (id: string) => {
    dispatch({ type: 'DELETE_WASTE_RECORD', payload: id });
    showNotification('Waste record deleted', 'info');
  };

  const addEmployee = (emp: Employee) => {
    dispatch({ type: 'ADD_EMPLOYEE', payload: emp });
    showNotification('Employee added', 'success');
  };

  const updateEmployee = (emp: Employee) => {
    dispatch({ type: 'UPDATE_EMPLOYEE', payload: emp });
    showNotification('Employee updated', 'success');
  };

  const deleteEmployee = (id: string) => {
    dispatch({ type: 'DELETE_EMPLOYEE', payload: id });
    showNotification('Employee deleted', 'info');
  };

  const addPayrollRecord = (record: PayrollRecord) => {
    dispatch({ type: 'ADD_PAYROLL_RECORD', payload: record });
    showNotification('Salary slip generated', 'success');
  };

  const updateDeliverySettings = async (settings: DeliverySettings) => {
    dispatch({ type: 'UPDATE_DELIVERY_SETTINGS', payload: settings });

    // Fail-safe REST persistence directly to MongoDB
    try {
      const token = sessionStorage.getItem('pizzora_token') || localStorage.getItem('pizzora_token');
      await fetch(`${SOCKET_URL}/api/settings/delivery`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(settings),
      });
    } catch (e) {
      // socket dispatch already queued / handled
    }

    showNotification('Delivery settings saved successfully', 'success');
  };

  const updatePixelSettings = async (settings: PixelSettings) => {
    dispatch({ type: 'UPDATE_PIXEL_SETTINGS', payload: settings });
    pixelService.initFromSettings(settings);

    // Fail-safe REST persistence directly to MongoDB
    try {
      const token = sessionStorage.getItem('pizzora_token');
      await fetch(`${SOCKET_URL}/api/settings/pixel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(settings),
      });
    } catch (e) {
      // socket dispatch already queued / handled
    }

    showNotification('Pixel & analytics settings updated', 'success');
  };

  const calcDeliveryFeeCtx = (distanceKm: number) =>
    calcDeliveryFee(distanceKm, state.deliverySettings);

  const deleteOrderWithCleanup = async (orderOrId: any, reason?: string) => {
    try {
      const orderId = typeof orderOrId === 'string' ? orderOrId : (orderOrId?.id || '');
      const orderNumber = typeof orderOrId === 'object' ? (orderOrId.orderNumber || orderOrId.invoiceNumber) : '';
      const invoiceNumber = typeof orderOrId === 'object' ? orderOrId.invoiceNumber : '';
      const adminName = typeof window !== 'undefined' ? (sessionStorage.getItem('pizzora_admin_name') || 'Admin') : 'Admin';

      // Optimistic client-side cleanup and instant restock
      dispatch({
        type: 'DELETE_ORDER_WITH_CLEANUP',
        payload: {
          orderId,
          orderNumber,
          invoiceNumber,
          deletedOrder: typeof orderOrId === 'object' ? orderOrId : undefined,
          deletedBy: adminName,
          reason: reason || 'Admin Deletion'
        }
      });

      // Backend cascading delete across Order and TableOrder collections
      const token = typeof window !== 'undefined' ? (sessionStorage.getItem('pizzora_token') || localStorage.getItem('pizzora_token') || '') : '';
      const res = await fetch(`${getBackendUrl()}/api/orders/delete-cascade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          orderId,
          orderNumber,
          invoiceNumber,
          deletedBy: adminName,
          reason: reason || 'Admin Deletion'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        console.warn('[deleteOrderWithCleanup] Server response:', data);
      }
      return { success: true, ...data };
    } catch (err: any) {
      console.error('[deleteOrderWithCleanup] Exception:', err);
      return { success: false, error: err.message };
    }
  };

  const restoreDeletedOrder = async (deletedOrderId: string) => {
    try {
      if (!deletedOrderId || deletedOrderId === 'undefined') {
        showNotification('Invalid order ID', 'error');
        return { success: false, error: 'Invalid order ID' };
      }
      const token = typeof window !== 'undefined' ? (sessionStorage.getItem('pizzora_token') || localStorage.getItem('pizzora_token') || '') : '';
      const adminName = typeof window !== 'undefined' ? (sessionStorage.getItem('pizzora_admin_name') || 'Admin') : 'Admin';
      const res = await fetch(`${getBackendUrl()}/api/orders/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          deletedOrderId,
          restoredBy: adminName
        })
      });
      const data = await res.json();
      if (data.success && data.restoredOrder) {
        dispatch({ type: 'RESTORE_DELETED_ORDER', payload: deletedOrderId });
        const isTable = Boolean(data.restoredOrder.isTableOrder || data.restoredOrder.tableNumber || data.restoredOrder.tableId);
        if (isTable) {
          dispatch({ type: 'PLACE_TABLE_ORDER', payload: data.restoredOrder });
          if (data.restoredOrder.tableId) {
            dispatch({
              type: 'SET_TABLE_STATUS',
              payload: {
                id: data.restoredOrder.tableId,
                status: 'Ordering',
                currentOrderId: data.restoredOrder.id,
                occupiedSince: data.restoredOrder.createdAt || Date.now()
              }
            });
          }
        } else {
          dispatch({ type: 'PLACE_ORDER', payload: data.restoredOrder });
        }
        showNotification('Order restored successfully and stock adjusted', 'success');
        return { success: true };
      }
      showNotification(data.error || 'Failed to restore order', 'error');
      return { success: false, error: data.error };
    } catch (err: any) {
      showNotification(err.message || 'Network error', 'error');
      return { success: false, error: err.message };
    }
  };

  const purgeDeletedOrder = async (deletedOrderId: string) => {
    try {
      if (!deletedOrderId || deletedOrderId === 'undefined') {
        showNotification('Invalid order ID', 'error');
        return { success: false, error: 'Invalid order ID' };
      }
      const token = typeof window !== 'undefined' ? (sessionStorage.getItem('pizzora_token') || localStorage.getItem('pizzora_token') || '') : '';
      const res = await fetch(`${getBackendUrl()}/api/deleted-orders/${encodeURIComponent(deletedOrderId)}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.success) {
        dispatch({ type: 'PURGE_DELETED_ORDER', payload: deletedOrderId });
        showNotification('Record permanently purged from archive', 'info');
        return { success: true };
      }
      showNotification(data.error || 'Failed to purge record', 'error');
      return { success: false, error: data.error };
    } catch (err: any) {
      showNotification(err.message || 'Network error', 'error');
      return { success: false, error: err.message };
    }
  };

  const cartTotal = state.cart.reduce((sum, c) => sum + c.item.price * c.quantity, 0);
  const cartCount = state.cart.reduce((sum, c) => sum + c.quantity, 0);

  return (
    <AppContext.Provider
      value={{
        state: effectiveState,
        rawState: state,
        isSafeMode,
        setSafeMode,
        toggleSafeMode,
        dispatch,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartCount,
        showNotification,
        placeTableOrder,
        updateTableOrder,
        updateTableOrderStatus,
        setTableStatus,
        clearAndFreeTable,
        addWasteRecord,
        deleteWasteRecord,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        addPayrollRecord,
        updateDeliverySettings,
        updatePixelSettings,
        calcDeliveryFee: calcDeliveryFeeCtx,
        refreshAnalytics,
        deleteOrderWithCleanup,
        restoreDeletedOrder,
        purgeDeletedOrder,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// ─── Resilient Fallback & Hook ───────────────────────────────────────────────

const fallbackAppContext: AppContextType = {
  state: initialState,
  dispatch: () => {},
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  cartTotal: 0,
  cartCount: 0,
  showNotification: () => {},
  placeTableOrder: () => {},
  updateTableOrder: () => {},
  updateTableOrderStatus: () => {},
  setTableStatus: () => {},
  clearAndFreeTable: () => {},
  addWasteRecord: () => {},
  deleteWasteRecord: () => {},
  addEmployee: () => {},
  updateEmployee: () => {},
  deleteEmployee: () => {},
  addPayrollRecord: () => {},
  updateDeliverySettings: () => {},
  updatePixelSettings: () => {},
  calcDeliveryFee: () => 0,
  refreshAnalytics: async () => {},
  deleteOrderWithCleanup: async () => ({ success: false, error: 'Context unavailable' }),
  restoreDeletedOrder: async () => ({ success: false, error: 'Context unavailable' }),
  purgeDeletedOrder: async () => ({ success: false, error: 'Context unavailable' }),
  isSafeMode: false,
  setSafeMode: () => {},
  toggleSafeMode: () => {},
  rawState: initialState,
};

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) {
    console.warn('[AppContext] useApp was accessed outside of AppProvider; returning resilient fallback state.');
    return fallbackAppContext;
  }
  return ctx;
}