// -----------------------------------------------------------------------------
// Invoice PDF generation using jsPDF + autotable.
// Produces a clean, printable A4 invoice with shop header, meta, line items
// and totals.
// -----------------------------------------------------------------------------
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { invoiceSubtotal, invoiceTax, invoiceTotal, invoiceBalance } from './calc'
import { formatMoney, formatDate } from './format'

const SHOP = {
  tagline: 'Genuine Car Parts • Sales & Service',
  address: 'Auto Market, Lahore / Riyadh',
  phone: '+92 300 1234567',
}

// `shopName` is the company the invoice belongs to (each tenant brands its own
// invoices). Falls back to the product name if not provided.
export function generateInvoicePDF(invoice, customer, currency = 'PKR', shopName = 'AutoParts Pro') {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const marginX = 40

  // ---- Header band ----
  doc.setFillColor(17, 24, 39) // near-black
  doc.rect(0, 0, pageW, 90, 'F')
  doc.setFillColor(220, 38, 38) // brand red accent bar
  doc.rect(0, 90, pageW, 5, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text(shopName || 'AutoParts Pro', marginX, 44)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(220, 220, 220)
  doc.text(SHOP.tagline, marginX, 60)
  doc.text(`${SHOP.address}  •  ${SHOP.phone}`, marginX, 74)

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('INVOICE', pageW - marginX, 44, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(invoice.id, pageW - marginX, 62, { align: 'right' })

  // ---- Bill-to + meta ----
  let y = 125
  doc.setTextColor(107, 114, 128)
  doc.setFontSize(9)
  doc.text('BILL TO', marginX, y)
  doc.text('DETAILS', pageW - 220, y)

  doc.setTextColor(17, 24, 39)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(customer?.name || 'Walk-in Customer', marginX, y + 18)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(75, 85, 99)
  if (customer?.phone && customer.phone !== '—') doc.text(customer.phone, marginX, y + 32)
  if (customer?.address && customer.address !== '—')
    doc.text(doc.splitTextToSize(customer.address, 220), marginX, y + 45)

  doc.setTextColor(75, 85, 99)
  doc.text(`Date:`, pageW - 220, y + 18)
  doc.text(formatDate(invoice.date), pageW - 40, y + 18, { align: 'right' })
  doc.text(`Status:`, pageW - 220, y + 33)
  doc.text(invoice.status, pageW - 40, y + 33, { align: 'right' })

  // ---- Line items table ----
  const rows = invoice.items.map((it, i) => [
    i + 1,
    it.name,
    it.qty,
    formatMoney(it.price, currency),
    formatMoney((Number(it.qty) || 0) * (Number(it.price) || 0), currency),
  ])

  autoTable(doc, {
    startY: y + 70,
    head: [['#', 'Item', 'Qty', 'Unit Price', 'Amount']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [17, 24, 39], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 6 },
    columnStyles: {
      0: { cellWidth: 30, halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
    margin: { left: marginX, right: marginX },
  })

  // ---- Totals block ----
  const subtotal = invoiceSubtotal(invoice)
  const tax = invoiceTax(invoice)
  const total = invoiceTotal(invoice)
  const balance = invoiceBalance(invoice)

  let ty = doc.lastAutoTable.finalY + 20
  const labelX = pageW - 200
  const valX = pageW - marginX
  const line = (label, value, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(bold ? 11 : 10)
    doc.setTextColor(bold ? 17 : 75, bold ? 24 : 85, bold ? 39 : 99)
    doc.text(label, labelX, ty)
    doc.text(value, valX, ty, { align: 'right' })
    ty += bold ? 20 : 16
  }

  line('Subtotal', formatMoney(subtotal, currency))
  if (invoice.discount) line('Discount', `- ${formatMoney(invoice.discount, currency)}`)
  if (invoice.taxPercent) line(`Tax (${invoice.taxPercent}%)`, formatMoney(tax, currency))

  doc.setDrawColor(220, 38, 38)
  doc.setLineWidth(1)
  doc.line(labelX, ty - 6, valX, ty - 6)
  line('Grand Total', formatMoney(total, currency), true)
  line('Paid', formatMoney(invoice.amountPaid || 0, currency))
  if (balance > 0) line('Balance Due', formatMoney(balance, currency), true)

  // ---- Footer ----
  const pageH = doc.internal.pageSize.getHeight()
  doc.setDrawColor(229, 231, 235)
  doc.line(marginX, pageH - 60, pageW - marginX, pageH - 60)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(156, 163, 175)
  doc.text('Thank you for your business!  Goods once sold are subject to shop policy.', marginX, pageH - 42)
  doc.text('Computer generated invoice — no signature required.', marginX, pageH - 30)

  doc.save(`${invoice.id}.pdf`)
}
