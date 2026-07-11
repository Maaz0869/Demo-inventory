// -----------------------------------------------------------------------------
// Invoice PDF — a clean, modern A4 invoice built with jsPDF + autotable.
// Branded per company (name + saved invoice settings), currency-aware.
// -----------------------------------------------------------------------------
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { invoiceSubtotal, invoiceTax, invoiceTotal, invoiceBalance } from './calc'
import { formatMoney, formatDate } from './format'

// Palette
const INK = [17, 24, 39] // near-black
const BRAND = [220, 38, 38] // red accent
const MUTED = [107, 114, 128]
const LIGHT = [243, 244, 246]

const STATUS_COLORS = {
  Paid: [16, 185, 129],
  Partial: [245, 158, 11],
  Credit: [220, 38, 38],
}

export function generateInvoicePDF(
  invoice,
  customer,
  currency = 'ZAR',
  shopName = 'AutoParts Pro',
  shop = {},
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const mX = 44
  const money = (n) => formatMoney(n, currency)

  // ---- Header band ----
  doc.setFillColor(...INK)
  doc.rect(0, 0, pageW, 120, 'F')
  doc.setFillColor(...BRAND)
  doc.rect(0, 120, pageW, 4, 'F')

  // Company name + contact (left)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(21)
  doc.text(shopName || 'AutoParts Pro', mX, 52)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(200, 202, 208)
  const contact = [shop.phone, shop.email].filter(Boolean).join('   •   ')
  let hy = 70
  if (contact) {
    doc.text(contact, mX, hy)
    hy += 13
  }
  if (shop.address) {
    doc.text(doc.splitTextToSize(String(shop.address).replace(/\n/g, ', '), 300), mX, hy)
  }

  // INVOICE title + number (right)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(26)
  doc.text('INVOICE', pageW - mX, 50, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(200, 202, 208)
  doc.text(`# ${invoice.id}`, pageW - mX, 68, { align: 'right' })
  doc.text(formatDate(invoice.date), pageW - mX, 82, { align: 'right' })

  // ---- Bill-to + status ----
  let y = 158
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text('BILLED TO', mX, y)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...INK)
  doc.text(customer?.name || 'Walk-in Customer', mX, y + 18)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  let by = y + 34
  if (customer?.phone && customer.phone !== '—') {
    doc.text(customer.phone, mX, by)
    by += 13
  }
  if (customer?.address && customer.address !== '—') {
    doc.text(doc.splitTextToSize(customer.address, 240), mX, by)
  }

  // Status pill (right)
  const sc = STATUS_COLORS[invoice.status] || BRAND
  const pillW = 96
  const pillX = pageW - mX - pillW
  doc.setFillColor(sc[0], sc[1], sc[2])
  doc.roundedRect(pillX, y - 2, pillW, 24, 12, 12, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(String(invoice.status).toUpperCase(), pillX + pillW / 2, y + 13.5, { align: 'center' })

  // ---- Line items ----
  const rows = invoice.items.map((it, i) => [
    i + 1,
    it.name,
    it.qty,
    money(it.price),
    money((Number(it.qty) || 0) * (Number(it.price) || 0)),
  ])

  autoTable(doc, {
    startY: y + 66,
    head: [['#', 'Item', 'Qty', 'Unit Price', 'Amount']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: INK, textColor: 255, fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    styles: { fontSize: 9, cellPadding: 7, lineColor: [229, 231, 235] },
    columnStyles: {
      0: { cellWidth: 28, halign: 'center', textColor: MUTED },
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: mX, right: mX },
  })

  // ---- Totals card (right) ----
  const subtotal = invoiceSubtotal(invoice)
  const tax = invoiceTax(invoice)
  const total = invoiceTotal(invoice)
  const balance = invoiceBalance(invoice)

  const cardW = 250
  const cardX = pageW - mX - cardW
  let cy = doc.lastAutoTable.finalY + 20
  const lines = []
  lines.push(['Subtotal', money(subtotal)])
  if (invoice.discount) lines.push(['Discount', `- ${money(invoice.discount)}`])
  if (invoice.taxPercent) lines.push([`Tax (${invoice.taxPercent}%)`, money(tax)])
  const cardH = 24 + lines.length * 16 + 34 + (balance > 0 ? 20 : 0) + 16

  doc.setFillColor(...LIGHT)
  doc.roundedRect(cardX, cy, cardW, cardH, 8, 8, 'F')
  doc.setFillColor(...BRAND)
  doc.roundedRect(cardX, cy, 4, cardH, 2, 2, 'F') // accent bar

  let ly = cy + 22
  const pad = 16
  doc.setFontSize(10)
  lines.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MUTED)
    doc.text(label, cardX + pad, ly)
    doc.setTextColor(...INK)
    doc.text(val, cardX + cardW - pad, ly, { align: 'right' })
    ly += 16
  })

  // Grand total
  doc.setDrawColor(209, 213, 219)
  doc.line(cardX + pad, ly - 4, cardX + cardW - pad, ly - 4)
  ly += 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...BRAND)
  doc.text('Grand Total', cardX + pad, ly)
  doc.text(money(total), cardX + cardW - pad, ly, { align: 'right' })
  ly += 18

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  doc.text('Paid', cardX + pad, ly)
  doc.text(money(invoice.amountPaid || 0), cardX + cardW - pad, ly, { align: 'right' })
  if (balance > 0) {
    ly += 16
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...INK)
    doc.text('Balance Due', cardX + pad, ly)
    doc.text(money(balance), cardX + cardW - pad, ly, { align: 'right' })
  }

  // ---- Footer: bank details + terms ----
  let fy = pageH - 104
  doc.setDrawColor(...LIGHT)
  doc.setLineWidth(1)
  doc.line(mX, fy, pageW - mX, fy)
  fy += 15
  const colW = (pageW - mX * 2) / 2 - 12

  const block = (title, text, x) => {
    if (!text) return
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...INK)
    doc.text(title, x, fy)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MUTED)
    doc.text(doc.splitTextToSize(String(text), colW), x, fy + 12)
  }
  block('BANK DETAILS', shop.bankDetails, mX)
  block('TERMS & CONDITIONS', shop.terms, mX + colW + 24)

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7.5)
  doc.setTextColor(...MUTED)
  doc.text(
    `Thank you for your business  •  ${shopName || 'AutoParts Pro'}  •  Computer generated invoice`,
    pageW / 2,
    pageH - 22,
    { align: 'center' },
  )

  doc.save(`${invoice.id}.pdf`)
}
