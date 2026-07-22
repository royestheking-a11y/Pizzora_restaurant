/// <reference types="vite/client" />
import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { MenuItem, menuItems as defaultMenuItems, galleryImages as defaultGalleryImages, GalleryImage, Chef, chefs as defaultChefs } from '../data/restaurantData';

// ─── Existing Types ────────────────────────────────────────────────────────────

export interface CartItem {
  item: MenuItem;
  quantity: number;
  specialRequest?: string;
}

export type OrderStatus = 'Pending' | 'Preparing' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
export type PaymentMethod = 'bKash' | 'Nagad' | 'Cash on Delivery' | 'Cash' | 'Card';

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  customerName: string;
  phone: string;
  address: string;
  createdAt: string;
  estimatedTime: string;
  orderNumber: string;
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
  total: number;
  status: TableOrderStatus;
  createdAt: number;
  customerNote: string;
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
  category: string;
  subcategory: string;
  amount: number;
  date: string;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'bKash' | 'Card' | string;
  description: string;
  invoiceNo: string;
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
  };
  bankDeposit: number;
  shoppingCash: number;
  status: 'Open' | 'Closed' | string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  supplier: string;
  costPrice: number;
  currentStock: number;
  minStock: number;
  maxStock: number;
  addedDate?: string;
}

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: 'Purchase IN' | 'Sale OUT' | 'Waste OUT' | 'Return IN' | 'Adjustment' | string;
  quantity: number;
  date: string;
  note: string;
  totalCost?: number;
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
  isAdminLoggedIn: boolean;
  cartOpen: boolean;
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;
  isSocketConnected: boolean;
  isInitialLoading: boolean;
  analytics: {
    totalRevenue: number;
    totalCustomers: number;
  } | null;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'ADD_TO_CART'; payload: { item: MenuItem; quantity: number; specialRequest?: string } }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'PLACE_ORDER'; payload: Order }
  | { type: 'UPDATE_ORDER_STATUS'; payload: { id: string; status: OrderStatus } }
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
  | { type: 'SET_ANALYTICS'; payload: { totalRevenue: number; totalCustomers: number } }
  // Table actions
  | { type: 'ADD_TABLE'; payload: RestaurantTable }
  | { type: 'UPDATE_TABLE'; payload: RestaurantTable }
  | { type: 'DELETE_TABLE'; payload: string }
  | { type: 'SET_TABLE_STATUS'; payload: { id: string; status: TableStatus; currentOrderId?: string; occupiedSince?: number } }
  // Table order actions
  | { type: 'PLACE_TABLE_ORDER'; payload: TableOrder }
  | { type: 'UPDATE_TABLE_ORDER_STATUS'; payload: { id: string; status: TableOrderStatus } }
  | { type: 'DELETE_TABLE_ORDER'; payload: string }
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
  | { type: 'DELETE_USER'; payload: string };

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

// ─── Default Tables (10 tables) ───────────────────────────────────────────────

const defaultTables: RestaurantTable[] = [
  { id: 'T01', tableNumber: 'T01', seats: 4, area: 'Dining', status: 'Available' },
  { id: 'T02', tableNumber: 'T02', seats: 4, area: 'Dining', status: 'Available' },
  { id: 'T03', tableNumber: 'T03', seats: 6, area: 'Dining', status: 'Available' },
  { id: 'T04', tableNumber: 'T04', seats: 4, area: 'Dining', status: 'Available' },
  { id: 'T05', tableNumber: 'T05', seats: 2, area: 'Dining', status: 'Available' },
  { id: 'T06', tableNumber: 'T06', seats: 4, area: 'Dining', status: 'Available' },
  { id: 'V01', tableNumber: 'V01', seats: 8, area: 'VIP', status: 'Available' },
  { id: 'V02', tableNumber: 'V02', seats: 6, area: 'VIP', status: 'Available' },
  { id: 'O01', tableNumber: 'O01', seats: 4, area: 'Outdoor', status: 'Available' },
  { id: 'O02', tableNumber: 'O02', seats: 4, area: 'Outdoor', status: 'Available' },
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
  isAdminLoggedIn: savedAdminLogin,
  cartOpen: false,
  notification: null,
  isSocketConnected: true,
  isInitialLoading: true,
  analytics: null,
};

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
        cart: state.cart, // Preserve the local cart, do not overwrite from DB
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
      };

    case 'ADD_TO_CART': {
      const existing = state.cart.find(c => c.item.id === action.payload.item.id);
      if (existing) {
        return {
          ...state,
          cart: state.cart.map(c =>
            c.item.id === action.payload.item.id
              ? { ...c, quantity: c.quantity + action.payload.quantity }
              : c
          ),
        };
      }
      return {
        ...state,
        cart: [...state.cart, {
          item: action.payload.item,
          quantity: action.payload.quantity,
          specialRequest: action.payload.specialRequest,
        }],
      };
    }

    case 'REMOVE_FROM_CART':
      return { ...state, cart: state.cart.filter(c => c.item.id !== action.payload) };

    case 'UPDATE_QUANTITY':
      return {
        ...state,
        cart: state.cart.map(c =>
          c.item.id === action.payload.id
            ? { ...c, quantity: Math.max(1, action.payload.quantity) }
            : c
        ),
      };

    case 'CLEAR_CART':
      return { ...state, cart: [] };

    case 'PLACE_ORDER':
      return { ...state, orders: [action.payload, ...state.orders], cart: [] };

    case 'BATCH_PLACE_ORDERS': {
      // Merge offline-queued orders — skip any already in state (dedup by id)
      const existingIds = new Set(state.orders.map(o => o.id));
      const newOrders = action.payload.filter(o => !existingIds.has(o.id));
      return { ...state, orders: [...newOrders, ...state.orders] };
    }

    case 'UPDATE_ORDER_STATUS':
      return {
        ...state,
        orders: state.orders.map(o =>
          o.id === action.payload.id ? { ...o, status: action.payload.status } : o
        ),
      };

    case 'DELETE_ORDER':
      return {
        ...state,
        orders: state.orders.filter(o => o.id !== action.payload)
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
            }
            : t
        ),
      };

    // ── Table Order Actions ────────────────────────────────────────────────────

    case 'PLACE_TABLE_ORDER':
      return { ...state, tableOrders: [action.payload, ...state.tableOrders] };

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

    case 'DELETE_TABLE_ORDER':
      return { ...state, tableOrders: state.tableOrders.filter(o => o.id !== action.payload) };

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
      return { ...state, cashRegister: [action.payload, ...state.cashRegister] };
    case 'UPDATE_CASH_ENTRY':
      return { ...state, cashRegister: state.cashRegister.map(c => c.id === action.payload.id ? action.payload : c) };
    case 'DELETE_CASH_ENTRY':
      return { ...state, cashRegister: state.cashRegister.filter(c => c.id !== action.payload) };

    // ── Inventory ────────────────────────────────────────────────────────────
    case 'ADD_INVENTORY_ITEM':
      return { ...state, inventory: [action.payload, ...state.inventory] };
    case 'UPDATE_INVENTORY_ITEM':
      return { ...state, inventory: state.inventory.map(i => i.id === action.payload.id ? action.payload : i) };
    case 'DELETE_INVENTORY_ITEM':
      return { ...state, inventory: state.inventory.filter(i => i.id !== action.payload) };
    case 'ADD_STOCK_MOVEMENT':
      return { ...state, stockMovements: [action.payload, ...state.stockMovements] };

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

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  addToCart: (item: MenuItem, quantity?: number, specialRequest?: string) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  placeTableOrder: (order: TableOrder) => void;
  updateTableOrderStatus: (id: string, status: TableOrderStatus) => void;
  setTableStatus: (id: string, status: TableStatus, orderId?: string) => void;
  addWasteRecord: (record: WasteRecord) => void;
  deleteWasteRecord: (id: string) => void;
  addEmployee: (emp: Employee) => void;
  updateEmployee: (emp: Employee) => void;
  deleteEmployee: (id: string) => void;
  addPayrollRecord: (record: PayrollRecord) => void;
}

const AppContext = createContext<AppContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

let socket: Socket | null = null;
export const getBackendUrl = () => {
  if (import.meta.env.VITE_BACKEND_URL) return import.meta.env.VITE_BACKEND_URL;
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // Localhost development
    if (host === 'localhost') return 'http://localhost:3001';
    // Local network development (testing on mobile devices)
    if (host.match(/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/)) {
      return `http://${host}:3001`;
    }
  }
  return window.location.origin;
};
export const SOCKET_URL = getBackendUrl();

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatchLocal] = useReducer(reducer, initialState);

  // Custom dispatch that broadcasts actions to the server
  const dispatch = async (action: Action) => {
    dispatchLocal(action);

    // Actions that shouldn't be broadcasted (purely local UI state or user-specific session state)
    const localOnly = ['SET_CART_OPEN', 'TOGGLE_CART', 'SET_NOTIFICATION', 'LOAD_FROM_STORAGE', 'SET_SOCKET_CONNECTED', 'SET_INITIAL_LOADING', 'ADD_TO_CART', 'REMOVE_FROM_CART', 'UPDATE_QUANTITY', 'CLEAR_CART', 'ADMIN_LOGIN', 'ADMIN_LOGOUT', 'SYNC_ORDER_STATUSES', 'SYNC_TABLE_ORDER_STATUSES'];

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

    // Fetch absolute state from MongoDB on mount
    fetch(`${SOCKET_URL}/api/state/public`)
      .then(res => res.json())
      .then(publicData => {
        if (token) {
          return fetch(`${SOCKET_URL}/api/state/admin`, {
            headers: { 'Authorization': `Bearer ${token}` }
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
              localStorage.setItem('pizzora_state_cache', JSON.stringify(fullData));
              dispatchLocal({ type: 'LOAD_FROM_STORAGE', payload: fullData });

              // Fetch analytics
              fetch(`${SOCKET_URL}/api/analytics`, {
                headers: { 'Authorization': `Bearer ${token}` }
              })
                .then(res => res.json())
                .then(analyticsData => {
                  if (analyticsData.success) {
                    dispatchLocal({ type: 'SET_ANALYTICS', payload: {
                      totalRevenue: analyticsData.totalRevenue,
                      totalCustomers: analyticsData.totalCustomers
                    }});
                  }
                })
                .catch(err => console.error("Failed to load analytics", err));
            });
        } else {
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

  const addToCart = (item: MenuItem, quantity = 1, specialRequest?: string) => {
    dispatch({ type: 'ADD_TO_CART', payload: { item, quantity, specialRequest } });
  };

  const removeFromCart = (id: string) => {
    dispatch({ type: 'REMOVE_FROM_CART', payload: id });
  };

  const updateQuantity = (id: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  };

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

  const setTableStatus = (id: string, status: TableStatus, orderId?: string) => {
    dispatch({ type: 'SET_TABLE_STATUS', payload: { id, status, currentOrderId: orderId } });
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

  const cartTotal = state.cart.reduce((sum, c) => sum + c.item.price * c.quantity, 0);
  const cartCount = state.cart.reduce((sum, c) => sum + c.quantity, 0);

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartCount,
        showNotification,
        placeTableOrder,
        updateTableOrderStatus,
        setTableStatus,
        addWasteRecord,
        deleteWasteRecord,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        addPayrollRecord,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}