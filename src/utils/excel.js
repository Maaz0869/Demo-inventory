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

// ---------------------------------------------------------------------------
// Sales report
// ---------------------------------------------------------------------------
export function exportSalesReport(invoices, customers, currency = 'ZAR') {
  const nameOf = (id) => customers.find((c) => c.id === id)?.name || '—'
  const rows = invoices
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((inv) => ({
      Invoice: inv.id,
      Date: formatDate(inv.date),
      Customer: nameOf(inv.customerId),
      Items: inv.items.reduce((s, it) => s + Number(it.qty), 0),
      [`Subtotal (${currency})`]: invoiceSubtotal(inv),
      [`Discount (${currency})`]: Number(inv.discount) || 0,
      [`Total (${currency})`]: invoiceTotal(inv),
      [`Paid (${currency})`]: Number(inv.amountPaid) || 0,
      [`Balance (${currency})`]: invoiceBalance(inv),
      Status: inv.status,
    }))
  download([{ name: 'Sales', rows: rows.length ? rows : [{ Note: 'No sales' }] }], 'Sales-Report.xlsx')
}

// ---------------------------------------------------------------------------
// Expense report
// ---------------------------------------------------------------------------
export function exportExpenseReport(expenses, currency = 'ZAR') {
  const rows = expenses
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((e) => ({
      Date: formatDate(e.date),
      Category: e.category,
      Description: e.description,
      [`Amount (${currency})`]: Number(e.amount) || 0,
    }))
  download(
    [{ name: 'Expenses', rows: rows.length ? rows : [{ Note: 'No expenses' }] }],
    'Expense-Report.xlsx',
  )
}

// ---------------------------------------------------------------------------
// Receivables report — outstanding per customer.
// ---------------------------------------------------------------------------
export function exportReceivablesReport(customers, invoices, payments, currency = 'ZAR') {
  const rows = customers
    .map((c) => ({
      Customer: c.name,
      Phone: c.phone,
      [`Outstanding (${currency})`]: customerBalance(c.id, invoices, payments),
    }))
    .filter((r) => r[`Outstanding (${currency})`] > 0)
    .sort((a, b) => b[`Outstanding (${currency})`] - a[`Outstanding (${currency})`])
  download(
    [{ name: 'Receivables', rows: rows.length ? rows : [{ Note: 'No outstanding balances' }] }],
    'Receivables-Report.xlsx',
  )
}

// ---------------------------------------------------------------------------
// Inventory export
// ---------------------------------------------------------------------------
export function exportInventory(products, currency = 'ZAR') {
  const rows = products.map((p) => ({
    'Part Name': p.name,
    'Part Number': p.partNumber,
    Category: p.category,
    Brand: p.brand,
    [`Cost (${currency})`]: p.costPrice,
    [`Selling (${currency})`]: p.sellingPrice,
    'In Stock': p.quantity,
    'Low Stock At': p.lowStockThreshold,
    Status: p.quantity <= p.lowStockThreshold ? 'LOW STOCK' : 'OK',
  }))
  download([{ name: 'Inventory', rows }], 'Inventory.xlsx')
}
