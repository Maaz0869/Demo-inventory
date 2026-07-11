// -----------------------------------------------------------------------------
// Mock / seed data for the Car Parts Inventory & Billing system.
// Everything lives in-memory (React state) — no backend involved.
// -----------------------------------------------------------------------------

// Product categories used across inventory + billing filters.
export const CATEGORIES = [
  'Engine',
  'Brakes',
  'Suspension',
  'Electrical',
  'Body Parts',
  'Filters',
  'Transmission',
  'Cooling',
]

export const EXPENSE_CATEGORIES = [
  'Rent',
  'Utilities',
  'Salaries',
  'Purchases',
  'Transport',
  'Maintenance',
  'Miscellaneous',
]

// Simple id helper (session-unique).
let _id = 1000
export const nextId = (prefix) => `${prefix}-${++_id}`

// ---------------------------------------------------------------------------
// Products (car parts)
// ---------------------------------------------------------------------------
export const seedProducts = [
  { id: 'P-1', name: 'Brake Pad Set (Front)', partNumber: 'BP-FR-2045', category: 'Brakes', brand: 'Bosch', costPrice: 2200, sellingPrice: 3200, quantity: 34, lowStockThreshold: 10 },
  { id: 'P-2', name: 'Oil Filter', partNumber: 'OF-1120', category: 'Filters', brand: 'Denso', costPrice: 350, sellingPrice: 650, quantity: 8, lowStockThreshold: 15 },
  { id: 'P-3', name: 'Spark Plug (Iridium)', partNumber: 'SP-IR-090', category: 'Engine', brand: 'NGK', costPrice: 480, sellingPrice: 820, quantity: 120, lowStockThreshold: 25 },
  { id: 'P-4', name: 'Shock Absorber (Rear)', partNumber: 'SA-RR-778', category: 'Suspension', brand: 'KYB', costPrice: 4200, sellingPrice: 6100, quantity: 6, lowStockThreshold: 8 },
  { id: 'P-5', name: 'Headlight Assembly', partNumber: 'HL-ASM-330', category: 'Electrical', brand: 'Philips', costPrice: 5600, sellingPrice: 8300, quantity: 14, lowStockThreshold: 5 },
  { id: 'P-6', name: 'Radiator', partNumber: 'RAD-4500', category: 'Cooling', brand: 'Valeo', costPrice: 7800, sellingPrice: 11200, quantity: 4, lowStockThreshold: 5 },
  { id: 'P-7', name: 'Front Bumper', partNumber: 'BMP-FR-101', category: 'Body Parts', brand: 'OEM', costPrice: 6500, sellingPrice: 9400, quantity: 9, lowStockThreshold: 4 },
  { id: 'P-8', name: 'Air Filter', partNumber: 'AF-2210', category: 'Filters', brand: 'Mann', costPrice: 420, sellingPrice: 780, quantity: 52, lowStockThreshold: 20 },
  { id: 'P-9', name: 'Timing Belt Kit', partNumber: 'TB-KIT-560', category: 'Engine', brand: 'Gates', costPrice: 3900, sellingPrice: 5600, quantity: 11, lowStockThreshold: 6 },
  { id: 'P-10', name: 'Alternator', partNumber: 'ALT-8890', category: 'Electrical', brand: 'Bosch', costPrice: 8900, sellingPrice: 12800, quantity: 3, lowStockThreshold: 4 },
  { id: 'P-11', name: 'Clutch Plate', partNumber: 'CL-PL-340', category: 'Transmission', brand: 'Exedy', costPrice: 5100, sellingPrice: 7400, quantity: 17, lowStockThreshold: 6 },
  { id: 'P-12', name: 'Brake Disc Rotor', partNumber: 'BD-ROT-611', category: 'Brakes', brand: 'Brembo', costPrice: 3400, sellingPrice: 4900, quantity: 22, lowStockThreshold: 8 },
  { id: 'P-13', name: 'Control Arm', partNumber: 'CA-LOW-455', category: 'Suspension', brand: 'Moog', costPrice: 3100, sellingPrice: 4600, quantity: 13, lowStockThreshold: 6 },
  { id: 'P-14', name: 'Fuel Pump', partNumber: 'FP-7720', category: 'Engine', brand: 'Denso', costPrice: 4700, sellingPrice: 6900, quantity: 7, lowStockThreshold: 5 },
  { id: 'P-15', name: 'Side Mirror (Right)', partNumber: 'SM-R-208', category: 'Body Parts', brand: 'OEM', costPrice: 1800, sellingPrice: 2900, quantity: 19, lowStockThreshold: 6 },
]

// ---------------------------------------------------------------------------
// Customers (khata / ledger holders)
// ---------------------------------------------------------------------------
export const seedCustomers = [
  { id: 'C-1', name: 'Al-Madina Motors', phone: '+92 300 1234567', address: 'Shop 12, Auto Market, Lahore' },
  { id: 'C-2', name: 'Bilal Auto Works', phone: '+92 321 9876543', address: 'Ravi Road, Lahore' },
  { id: 'C-3', name: 'Gulf Car Service', phone: '+966 55 1122334', address: 'Al Olaya, Riyadh' },
  { id: 'C-4', name: 'Walk-in Customer', phone: '—', address: '—' },
  { id: 'C-5', name: 'Speedline Garage', phone: '+92 333 4455667', address: 'Bund Road, Lahore' },
]

// ---------------------------------------------------------------------------
// Invoices — a couple pre-loaded so the dashboard/reports have history.
// Line items carry a snapshot of price so past invoices stay accurate.
// ---------------------------------------------------------------------------
export const seedInvoices = [
  {
    id: 'INV-1001',
    customerId: 'C-1',
    date: '2026-07-11',
    items: [
      { productId: 'P-1', name: 'Brake Pad Set (Front)', qty: 4, price: 3200 },
      { productId: 'P-2', name: 'Oil Filter', qty: 6, price: 650 },
    ],
    discount: 500,
    taxPercent: 0,
    status: 'Paid',
    amountPaid: 16200,
  },
  {
    id: 'INV-1002',
    customerId: 'C-2',
    date: '2026-07-10',
    items: [
      { productId: 'P-10', name: 'Alternator', qty: 1, price: 12800 },
      { productId: 'P-3', name: 'Spark Plug (Iridium)', qty: 8, price: 820 },
    ],
    discount: 0,
    taxPercent: 5,
    status: 'Credit',
    amountPaid: 0,
  },
  {
    id: 'INV-1003',
    customerId: 'C-5',
    date: '2026-07-09',
    items: [{ productId: 'P-6', name: 'Radiator', qty: 1, price: 11200 }],
    discount: 200,
    taxPercent: 0,
    status: 'Partial',
    amountPaid: 6000,
  },
  {
    id: 'INV-1004',
    customerId: 'C-3',
    date: '2026-07-08',
    items: [
      { productId: 'P-12', name: 'Brake Disc Rotor', qty: 2, price: 4900 },
      { productId: 'P-8', name: 'Air Filter', qty: 3, price: 780 },
    ],
    discount: 0,
    taxPercent: 15,
    status: 'Paid',
    amountPaid: 12857,
  },
]

// ---------------------------------------------------------------------------
// Payments received against credit/partial invoices.
// ---------------------------------------------------------------------------
export const seedPayments = [
  { id: 'PAY-1', customerId: 'C-5', date: '2026-07-09', amount: 6000, note: 'Cash — partial for INV-1003', invoiceId: 'INV-1003' },
]

// ---------------------------------------------------------------------------
// Daily expenses
// ---------------------------------------------------------------------------
export const seedExpenses = [
  { id: 'EXP-1', date: '2026-07-11', category: 'Purchases', description: 'Bulk brake pads restock', amount: 22000 },
  { id: 'EXP-2', date: '2026-07-11', category: 'Utilities', description: 'Electricity bill', amount: 4800 },
  { id: 'EXP-3', date: '2026-07-10', category: 'Salaries', description: 'Mechanic wages', amount: 15000 },
  { id: 'EXP-4', date: '2026-07-09', category: 'Transport', description: 'Delivery fuel', amount: 2200 },
  { id: 'EXP-5', date: '2026-07-08', category: 'Rent', description: 'Shop rent (partial)', amount: 18000 },
]

export const CURRENCIES = [
  { code: 'PKR', label: 'PKR — Pakistani Rupee', symbol: 'Rs' },
  { code: 'SAR', label: 'SAR — Saudi Riyal', symbol: 'SAR' },
]
