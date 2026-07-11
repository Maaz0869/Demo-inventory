// -----------------------------------------------------------------------------
// Excel (.xlsx) export helpers using SheetJS (xlsx).
// Used for customer statements and the various reports.
// -----------------------------------------------------------------------------
import * as XLSX from 'xlsx'
import {
  invoiceSubtotal,
  invoiceTotal,
  invoiceBalance,
  customerBalance,
} from './calc'
import { formatDate } from './format'

/** Turn an array of row-objects into a worksheet and trigger a download. */
function download(sheets, fileName) {
  const wb = XLSX.utils.book_new()
  sheets.forEach(({ name, rows }) => {
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31))
  })
  XLSX.writeFile(wb, fileName)
}

// ---------------------------------------------------------------------------
// Customer statement — every invoice + payment with a running balance.
// ---------------------------------------------------------------------------
export function exportCustomerStatement(customer, invoices, payments, currency = 'ZAR') {
  const custInvoices = invoices.filter((i) => i.customerId === customer.id)
  const custPayments = payments.filter((p) => p.customerId === customer.id)

  // Merge into a single chronological ledger of debits (invoices) and credits (payments).
  const entries = [
    ...custInvoices.map((inv) => ({
      date: inv.date,
      type: 'Invoice',
      ref: inv.id,
      debit: invoiceTotal(inv),
      credit: 0,
    })),
    ...custPayments.map((p) => ({
      date: p.date,
      type: 'Payment',
      ref: p.invoiceId || p.id,
      debit: 0,
      credit: Number(p.amount) || 0,
    })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date))

  let running = 0
  const rows = entries.map((e) => {
    running += e.debit - e.credit
    return {
      Date: formatDate(e.date),
      Type: e.type,
      Reference: e.ref,
      [`Debit (${currency})`]: e.debit || '',
      [`Credit (${currency})`]: e.credit || '',
      [`Balance (${currency})`]: running,
    }
  })

  rows.push({
    Date: '',
    Type: '',
    Reference: 'OUTSTANDING BALANCE',
    [`Debit (${currency})`]: '',
    [`Credit (${currency})`]: '',
    [`Balance (${currency})`]: customerBalance(customer.id, invoices, payments),
  })

  download(
    [{ name: 'Statement', rows: rows.length ? rows : [{ Note: 'No transactions' }] }],
    `Statement-${customer.name.replace(/\s+/g, '_')}.xlsx`,
  )
}

// A short suffix like "_2026-07-01_to_2026-07-12" for filenames, or '' for all-time.
function rangeSuffix(range) {
  if (!range || (!range.from && !range.to)) return ''
  return `_${range.from || 'start'}_to_${range.to || 'today'}`
}

// ---------------------------------------------------------------------------
// Sheet builders — each returns { name, rows } so they can be downloaded on
// their own or bundled together in one workbook.
// ---------------------------------------------------------------------------
function salesSheet(invoices, customers, currency) {
  const nameOf = (id) => customers.find((c) => c.id === id)?.name || '—'
  const rows = invoices
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((inv) => ({
      Invoice: inv.id,
      Date: formatDate(inv.date),
      Customer: nameOf(inv.customerId),
      Salesperson: inv.salesperson || '—',
      Items: inv.items.reduce((s, it) => s + Number(it.qty), 0),
      [`Subtotal (${currency})`]: invoiceSubtotal(inv),
      [`Discount (${currency})`]: Number(inv.discount) || 0,
      [`Total (${currency})`]: invoiceTotal(inv),
      [`Paid (${currency})`]: Number(inv.amountPaid) || 0,
      [`Balance (${currency})`]: invoiceBalance(inv),
      Status: inv.status,
    }))
  return { name: 'Sales', rows: rows.length ? rows : [{ Note: 'No sales in range' }] }
}

function expenseSheet(expenses, currency) {
  const rows = expenses
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((e) => ({
      Date: formatDate(e.date),
      Category: e.category,
      Description: e.description,
      [`Amount (${currency})`]: Number(e.amount) || 0,
    }))
  return { name: 'Expenses', rows: rows.length ? rows : [{ Note: 'No expenses in range' }] }
}

function receivablesSheet(customers, invoices, payments, currency) {
  const rows = customers
    .map((c) => ({
      Customer: c.name,
      Phone: c.phone,
      [`Outstanding (${currency})`]: customerBalance(c.id, invoices, payments),
    }))
    .filter((r) => r[`Outstanding (${currency})`] > 0)
    .sort((a, b) => b[`Outstanding (${currency})`] - a[`Outstanding (${currency})`])
  return { name: 'Receivables', rows: rows.length ? rows : [{ Note: 'No outstanding balances' }] }
}

function inventorySheet(products, currency) {
  const rows = products.map((p) => ({
    'Part Name': p.name,
    'Part Number': p.partNumber,
    Category: p.category,
    Brand: p.brand,
    [`Cost (${currency})`]: p.costPrice,
    [`Actual (${currency})`]: p.sellingPrice,
    [`Medium (${currency})`]: p.priceMedium ?? p.sellingPrice,
    [`High (${currency})`]: p.priceHigh ?? p.sellingPrice,
    'In Stock': p.quantity,
    'Low Stock At': p.lowStockThreshold,
    Status: p.quantity <= p.lowStockThreshold ? 'LOW STOCK' : 'OK',
  }))
  return { name: 'Inventory', rows: rows.length ? rows : [{ Note: 'No products' }] }
}

function summarySheet({ invoices, expenses, products }, currency, range) {
  const sales = invoices.reduce((s, i) => s + invoiceTotal(i), 0)
  const collected = invoices.reduce((s, i) => s + (Number(i.amountPaid) || 0), 0)
  const expenseTotal = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const receivable = invoices.reduce((s, i) => s + invoiceBalance(i), 0)
  const stockValue = products.reduce((s, p) => s + (p.sellingPrice || 0) * (p.quantity || 0), 0)
  const rows = [
    { Metric: 'Period', Value: range?.from || range?.to ? `${range.from || 'start'} → ${range.to || 'today'}` : 'All time' },
    { Metric: 'Invoices', Value: invoices.length },
    { Metric: `Total Sales (${currency})`, Value: sales },
    { Metric: `Collected (${currency})`, Value: collected },
    { Metric: `Outstanding (${currency})`, Value: receivable },
    { Metric: `Total Expenses (${currency})`, Value: expenseTotal },
    { Metric: `Net (Sales − Expenses) (${currency})`, Value: sales - expenseTotal },
    { Metric: `Stock Value at Selling (${currency})`, Value: stockValue },
  ]
  return { name: 'Summary', rows }
}

// ---------------------------------------------------------------------------
// Individual report exports (each its own file).
// ---------------------------------------------------------------------------
export function exportSalesReport(invoices, customers, currency = 'ZAR', range) {
  download([salesSheet(invoices, customers, currency)], `Sales-Report${rangeSuffix(range)}.xlsx`)
}

export function exportExpenseReport(expenses, currency = 'ZAR', range) {
  download([expenseSheet(expenses, currency)], `Expense-Report${rangeSuffix(range)}.xlsx`)
}

export function exportReceivablesReport(customers, invoices, payments, currency = 'ZAR') {
  download([receivablesSheet(customers, invoices, payments, currency)], 'Receivables-Report.xlsx')
}

export function exportInventory(products, currency = 'ZAR') {
  download([inventorySheet(products, currency)], 'Inventory.xlsx')
}

// ---------------------------------------------------------------------------
// Combined report — one workbook, every report on its own sheet.
// ---------------------------------------------------------------------------
export function exportAllReports({ invoices, customers, expenses, payments, products }, currency = 'ZAR', range) {
  download(
    [
      summarySheet({ invoices, expenses, products }, currency, range),
      salesSheet(invoices, customers, currency),
      expenseSheet(expenses, currency),
      receivablesSheet(customers, invoices, payments, currency),
      inventorySheet(products, currency),
    ],
    `Business-Report${rangeSuffix(range)}.xlsx`,
  )
}
