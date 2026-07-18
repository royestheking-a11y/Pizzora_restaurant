import mongoose from 'mongoose';

const MenuItemSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  slug: String,
  category: { type: String, required: true },
  price: { type: Number, required: true },
  cost: Number,
  description: { type: String, required: true },
  image: { type: String, required: true },
  images: [String],
  ingredients: [String],
  nutrition: {
    calories: Number,
    protein: String,
    carbs: String,
    fat: String
  },
  spiceLevel: String,
  rating: Number,
  reviewCount: Number,
  isVeg: { type: Boolean, default: false },
  isSpicy: { type: Boolean, default: false },
  isPopular: { type: Boolean, default: false },
  popular: { type: Boolean, default: false }, // Keeping popular for backward compatibility
  prepTime: String,
  serves: String,
  variants: Array,
  badge: String,
}, { strict: true });

const OrderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  items: Array,
  total: Number,
  status: String,
  paymentMethod: String,
  customerName: String,
  phone: String,
  address: String,
  createdAt: String,
  estimatedTime: String,
  orderNumber: String,
}, { strict: true });

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ status: 1 });

const ReservationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  phone: String,
  email: String,
  date: String,
  time: String,
  guests: Number,
  specialRequest: String,
  status: String,
  createdAt: String,
}, { strict: true });

const MessageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  phone: String,
  email: String,
  subject: String,
  message: String,
  createdAt: String,
  isRead: Boolean,
  reply: String,
}, { strict: true });

const CateringRequestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  phone: String,
  email: String,
  eventType: String,
  guests: Number,
  date: String,
  location: String,
  package: String,
  message: String,
  status: String,
  createdAt: String,
}, { strict: true });

const CarouselSlideSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  url: String,
  title: String,
  subtitle: String,
  description: String,
  badge: String,
  link: { type: String, default: '' },
  order: { type: Number, default: 0 },
}, { strict: true });

const RestaurantTableSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  tableNumber: String,
  seats: Number,
  area: String,
  status: String,
  currentOrderId: String,
  occupiedSince: Number,
}, { strict: true });

const TableOrderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  tableId: String,
  tableNumber: String,
  items: Array,
  total: Number,
  status: String,
  createdAt: Number,
  customerNote: String,
}, { strict: true });

TableOrderSchema.index({ tableId: 1, status: 1 });

const WasteRecordSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  product: String,
  reason: String,
  costLoss: Number,
  quantity: Number,
  date: String,
}, { strict: true });

const EmployeeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  role: String,
  basicSalary: Number,
  joinDate: String,
  shift: String,
}, { strict: true });

const PayrollRecordSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  employeeId: String,
  month: String,
  year: Number,
  bonus: Number,
  overtime: Number,
  deduction: Number,
  fine: Number,
  netSalary: Number,
  datePaid: String,
}, { strict: true });

const GalleryImageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  url: String,
  title: String,
  category: String,
}, { strict: true });

const ChefSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  role: String,
  image: String,
  bio: String,
}, { strict: true });

const ExpenseEntrySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  category: String,
  subcategory: String,
  amount: Number,
  date: String,
  paymentMethod: String,
  description: String,
  invoiceNo: String,
}, { strict: true });

const CashRegisterEntrySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  date: String,
  openedAt: String,
  closedAt: String,
  openingBalance: Number,
  totalCashSales: Number,
  bankDeposit: Number,
  shoppingCash: Number,
  status: String,
}, { strict: true });

const InventoryItemSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  sku: String,
  category: String,
  unit: String,
  supplier: String,
  costPrice: Number,
  currentStock: Number,
  minStock: Number,
  maxStock: Number,
  expiryDate: String,
}, { strict: true });

const StockMovementSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  itemId: String,
  itemName: String,
  type: String, // 'Purchase IN' | 'Sale OUT' | 'Waste OUT' | 'Return IN' | 'Adjustment'
  quantity: Number,
  date: String,
  note: String,
}, { strict: true });

const ItemReviewSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  slug: { type: String, required: true }, // Which product this review belongs to
  name: String,
  rating: Number,
  comment: String,
  date: String,
  helpful: Number,
}, { strict: true });

ItemReviewSchema.index({ date: -1 });
ItemReviewSchema.index({ slug: 1 });

const UserAccountSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, default: 'manager' }, // 'manager' | 'admin'
  createdAt: { type: String },
}, { strict: true });

export const MenuItem = mongoose.model('MenuItem', MenuItemSchema);
export const Order = mongoose.model('Order', OrderSchema);
export const Reservation = mongoose.model('Reservation', ReservationSchema);
export const Message = mongoose.model('Message', MessageSchema);
export const CateringRequest = mongoose.model('CateringRequest', CateringRequestSchema);
export const CarouselSlide = mongoose.model('CarouselSlide', CarouselSlideSchema);
export const RestaurantTable = mongoose.model('RestaurantTable', RestaurantTableSchema);
export const TableOrder = mongoose.model('TableOrder', TableOrderSchema);
export const WasteRecord = mongoose.model('WasteRecord', WasteRecordSchema);
export const Employee = mongoose.model('Employee', EmployeeSchema);
export const PayrollRecord = mongoose.model('PayrollRecord', PayrollRecordSchema);
export const GalleryImage = mongoose.model('GalleryImage', GalleryImageSchema);
export const Chef = mongoose.model('Chef', ChefSchema);

// New exports
export const ExpenseEntry = mongoose.model('ExpenseEntry', ExpenseEntrySchema);
export const CashRegisterEntry = mongoose.model('CashRegisterEntry', CashRegisterEntrySchema);
export const InventoryItem = mongoose.model('InventoryItem', InventoryItemSchema);
export const StockMovement = mongoose.model('StockMovement', StockMovementSchema);
export const ItemReview = mongoose.model('ItemReview', ItemReviewSchema);
export const UserAccount = mongoose.model('UserAccount', UserAccountSchema);

// ── Invoice Counter (sequential invoice numbers: PIZ-2026-000001) ──────────
const InvoiceCounterSchema = new mongoose.Schema({
  year: { type: Number, required: true, unique: true },
  counter: { type: Number, default: 0 },
});
export const InvoiceCounter = mongoose.model('InvoiceCounter', InvoiceCounterSchema);

// ── Print Job Audit Log ────────────────────────────────────────────────────
const PrintJobSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  invoiceNumber: { type: String, required: true },
  orderId: { type: String, required: true },
  printedBy: { type: String, default: 'Cashier' },
  printedAt: { type: String, required: true },
  isReprint: { type: Boolean, default: false },
  reprintReason: { type: String, default: '' },
  status: { type: String, default: 'success' }, // 'success' | 'failed'
  paymentMethod: { type: String, default: '' },
  total: { type: Number, default: 0 },
}, { strict: true });

PrintJobSchema.index({ printedAt: -1 });
PrintJobSchema.index({ orderId: 1 });
export const PrintJob = mongoose.model('PrintJob', PrintJobSchema);
