// -----------------------------------------------------------------------------
// Pure calculation helpers shared across billing, ledger and reports.
// Keeping the money math in one place avoids drift between screens.
// -----------------------------------------------------------------------------

/** Line item total = qty × price. */
export const lineTotal = (item) => (Number(item.qty) || 0) * (Number(item.price) || 0)

/** Sum of all line items before discount/tax. */
export const invoiceSubtotal = (invoice) =>
  (invoice.items || []).reduce((sum, it) => sum + lineTotal(it), 0)

/** Tax amount, applied on the discounted subtotal. */
export const invoiceTax = (invoice) => {
  const taxable = Math.max(0, invoiceSubtotal(invoice) - (Number(invoice.discount) || 0))
  return (taxable * (Number(invoice.taxPercent) || 0)) / 100
}

/** Grand total = subtotal − discount + tax (never below zero). */
export const invoiceTotal = (invoice) => {
  const base = invoiceSubtotal(invoice) - (Number(invoice.discount) || 0)
  return Math.max(0, base) + invoiceTax(invoice)
}

/** Outstanding (unpaid) amount on an invoice. */
export const invoiceBalance = (invoice) =>
  Math.max(0, invoiceTotal(invoice) - (Number(invoice.amountPaid) || 0))

/** Total receivables across a set of invoices. */
export const totalReceivables = (invoices) =>
  invoices.reduce((sum, inv) => sum + invoiceBalance(inv), 0)

/**
 * Outstanding balance for a single customer.
 * Sum of invoice balances minus any standalone payments not tied to an invoice.
 * (Payments tied to an invoice are already reflected in invoice.amountPaid,
 * so we only subtract "loose" account payments here.)
 */
export const customerBalance = (customerId, invoices, payments) => {
  const invBalance = invoices
    .filter((inv) => inv.customerId === customerId)
    .reduce((sum, inv) => sum + invoiceBalance(inv), 0)
  const loosePayments = payments
    .filter((p) => p.customerId === customerId && !p.invoiceId)
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  return Math.max(0, invBalance - loosePayments)
}
