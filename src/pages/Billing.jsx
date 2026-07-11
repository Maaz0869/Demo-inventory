// Billing: list existing invoices + create a new invoice with line items.
import { useMemo, useState } from 'react'
import {
  Plus,
  Search,
  Trash2,
  FileDown,
  ReceiptText,
  X,
  HandCoins,
  Pencil,
  Ban,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatMoney, formatDate, todayISO } from '../utils/format'
import {
  lineTotal,
  invoiceSubtotal,
  invoiceTax,
  invoiceTotal,
  invoiceBalance,
} from '../utils/calc'
import { generateInvoicePDF } from '../utils/pdf'
import { Modal, PageHeader, StatusBadge, EmptyState, ConfirmDialog } from '../components/ui'
import { nextId } from '../data/mockData'

// ---------------------------------------------------------------------------
// New-invoice builder
// ---------------------------------------------------------------------------
function InvoiceBuilder({ onClose, editInvoice }) {
  const { state, dispatch, currency } = useApp()
  const { products, customers, invoices } = state
  const isEdit = !!editInvoice

  // In edit mode, "available stock" for a line = current stock + what this line
  // already holds (since it would be restored on save).
  const initialItems = isEdit
    ? editInvoice.items.map((it) => {
        const p = products.find((pp) => pp.id === it.productId)
        return {
          productId: it.productId,
          name: it.name,
          qty: Number(it.qty),
          price: Number(it.price),
          prices: p
            ? { actual: p.sellingPrice, medium: p.priceMedium ?? p.sellingPrice, high: p.priceHigh ?? p.sellingPrice }
            : { actual: Number(it.price), medium: Number(it.price), high: Number(it.price) },
          tier: 'actual',
          stock: (p ? p.quantity : 0) + Number(it.qty),
        }
      })
    : []

  const [customerId, setCustomerId] = useState(editInvoice?.customerId || customers[0]?.id || '')
  const [date, setDate] = useState(editInvoice?.date || todayISO())
  const [salesperson, setSalesperson] = useState(editInvoice?.salesperson || '')
  const [items, setItems] = useState(initialItems)
  const [discount, setDiscount] = useState(editInvoice?.discount || 0)
  const [taxPercent, setTaxPercent] = useState(editInvoice?.taxPercent || 0)
  const [status, setStatus] = useState(editInvoice?.status || 'Paid')
  const [productSearch, setProductSearch] = useState('')

  // Suggest previously-used salesperson names.
  const salespeople = [...new Set(invoices.map((i) => i.salesperson).filter(Boolean))]

  // Products matching the search box, excluding ones already added.
  const matches = useMemo(() => {
    const q = productSearch.trim().toLowerCase()
    if (!q) return []
    return products
      .filter((p) => !items.some((it) => it.productId === p.id))
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) || p.partNumber.toLowerCase().includes(q),
      )
      .slice(0, 6)
  }, [productSearch, products, items])

  const addItem = (p) => {
    setItems((cur) => [
      ...cur,
      {
        productId: p.id,
        name: p.name,
        qty: 1,
        price: p.sellingPrice,
        prices: {
          actual: p.sellingPrice,
          medium: p.priceMedium ?? p.sellingPrice,
          high: p.priceHigh ?? p.sellingPrice,
        },
        tier: 'actual',
        stock: p.quantity,
      },
    ])
    setProductSearch('')
  }

  const updateItem = (idx, patch) =>
    setItems((cur) => cur.map((it, i) => (i === idx ? { ...it, ...patch } : it)))

  // Switching tier sets the price to that tier's value (still editable after).
  const changeTier = (idx, tier) =>
    setItems((cur) =>
      cur.map((it, i) => (i === idx ? { ...it, tier, price: it.prices?.[tier] ?? it.price } : it)),
    )
  const removeItem = (idx) => setItems((cur) => cur.filter((_, i) => i !== idx))

  // Draft invoice object used for live totals.
  const draft = { items, discount, taxPercent }
  const subtotal = invoiceSubtotal(draft)
  const tax = invoiceTax(draft)
  const total = invoiceTotal(draft)

  const canSave = items.length > 0 && customerId && items.every((it) => Number(it.qty) > 0)

  const save = () => {
    if (!canSave) return
    // Amount paid depends on chosen status. On edit, keep any existing payment.
    const amountPaid = isEdit
      ? status === 'Paid'
        ? total
        : Math.min(Number(editInvoice.amountPaid) || 0, total)
      : status === 'Paid'
        ? total
        : status === 'Partial'
          ? total / 2
          : 0
    const invoice = {
      id: isEdit ? editInvoice.id : nextId('INV'),
      customerId,
      date,
      salesperson: salesperson.trim(),
      items: items.map(({ productId, name, qty, price }) => ({
        productId,
        name,
        qty: Number(qty),
        price: Number(price),
      })),
      discount: Number(discount) || 0,
      taxPercent: Number(taxPercent) || 0,
      status,
      amountPaid: Math.round(amountPaid),
    }
    if (isEdit) dispatch({ type: 'UPDATE_INVOICE', invoice, prev: editInvoice })
    else dispatch({ type: 'ADD_INVOICE', invoice })
    onClose(isEdit ? null : invoice) // auto-download PDF only for new invoices
  }

  return (
    <div className="space-y-5">
      {/* Customer + date */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Customer</label>
          <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Salesperson</label>
          <input
            className="input"
            list="salespeople"
            value={salesperson}
            onChange={(e) => setSalesperson(e.target.value)}
            placeholder="Who is making this invoice?"
          />
          <datalist id="salespeople">
            {salespeople.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
      </div>

      {/* Product search */}
      <div>
        <label className="label">Add Products</label>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search part name or number to add…"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
          />
          {matches.length > 0 && (
            <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
              {matches.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addItem(p)}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{p.name}</p>
                    <p className="text-xs text-gray-400">
                      {p.partNumber} • {p.quantity} in stock
                    </p>
                  </div>
                  <span className="font-semibold text-brand-600">
                    {formatMoney(p.sellingPrice, currency)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Line items */}
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <tr>
              <th className="px-3 py-2 font-semibold">Item</th>
              <th className="px-3 py-2 text-center font-semibold">Qty</th>
              <th className="px-3 py-2 text-center font-semibold">Tier</th>
              <th className="px-3 py-2 text-right font-semibold">Price</th>
              <th className="px-3 py-2 text-right font-semibold">Total</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-400">
                  No items yet — search above to add parts.
                </td>
              </tr>
            ) : (
              items.map((it, idx) => {
                const over = Number(it.qty) > it.stock
                return (
                  <tr key={it.productId}>
                    <td className="px-3 py-2">
                      <p className="font-semibold text-gray-900 dark:text-white">{it.name}</p>
                      {over && (
                        <p className="text-xs font-semibold text-brand-600">
                          Only {it.stock} in stock
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number"
                        min="1"
                        className={`input !w-20 !py-1 text-center ${over ? '!border-brand-500' : ''}`}
                        value={it.qty}
                        onChange={(e) => updateItem(idx, { qty: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <select
                        className="input !w-24 !py-1"
                        value={it.tier || 'actual'}
                        onChange={(e) => changeTier(idx, e.target.value)}
                        title="Price tier"
                      >
                        <option value="actual">Actual</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        className="input !w-24 !py-1 text-right"
                        value={it.price}
                        onChange={(e) => updateItem(idx, { price: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-white">
                      {formatMoney(lineTotal(it), currency)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => removeItem(idx)}
                        className="btn-ghost !p-1.5 text-brand-600"
                        title="Remove"
                      >
                        <X size={16} />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Totals + settings */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-3">
          <div>
            <label className="label">Payment Status</label>
            <div className="flex gap-2">
              {['Paid', 'Partial', 'Credit'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                    status === s
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  {s === 'Credit' ? 'Credit (Udhaar)' : s}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Discount</label>
              <input
                type="number"
                min="0"
                className="input"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Tax %</label>
              <input
                type="number"
                min="0"
                className="input"
                value={taxPercent}
                onChange={(e) => setTaxPercent(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/60">
          <Row label="Subtotal" value={formatMoney(subtotal, currency)} />
          <Row label="Discount" value={`- ${formatMoney(Number(discount) || 0, currency)}`} />
          <Row label={`Tax (${Number(taxPercent) || 0}%)`} value={formatMoney(tax, currency)} />
          <div className="my-2 border-t border-gray-200 dark:border-gray-700" />
          <Row label="Grand Total" value={formatMoney(total, currency)} bold />
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
        <button onClick={() => onClose(null)} className="btn-secondary">
          Cancel
        </button>
        <button onClick={save} disabled={!canSave} className="btn-primary">
          <ReceiptText size={16} /> {isEdit ? 'Save Changes' : 'Create Invoice'}
        </button>
      </div>
    </div>
  )
}

function Row({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={`text-sm ${bold ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
        {label}
      </span>
      <span className={`${bold ? 'text-lg font-extrabold text-gray-900 dark:text-white' : 'text-sm font-semibold text-gray-700 dark:text-gray-200'}`}>
        {value}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Record-payment modal (for partial / credit invoices)
// ---------------------------------------------------------------------------
function PaymentModal({ invoice, onClose }) {
  const { dispatch, currency } = useApp()
  const balance = invoiceBalance(invoice)
  const [amount, setAmount] = useState(balance)

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Outstanding on <span className="font-bold">{invoice.id}</span>:{' '}
        <span className="font-bold text-brand-600">{formatMoney(balance, currency)}</span>
      </p>
      <div>
        <label className="label">Payment Amount</label>
        <input
          type="number"
          min="0"
          max={balance}
          className="input"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button
          onClick={() => {
            dispatch({
              type: 'PAY_INVOICE',
              invoiceId: invoice.id,
              customerId: invoice.customerId,
              amount: Math.min(Number(amount) || 0, balance),
              date: todayISO(),
              note: `Payment for ${invoice.id}`,
            })
            onClose()
          }}
          className="btn-primary"
        >
          <HandCoins size={16} /> Record Payment
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Billing page
// ---------------------------------------------------------------------------
export default function Billing() {
  const { state, dispatch, currency, companyName, settings } = useApp()
  const { invoices, customers } = state

  const [showBuilder, setShowBuilder] = useState(false)
  const [editInv, setEditInv] = useState(null)
  const [voidInv, setVoidInv] = useState(null)
  const [payFor, setPayFor] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const customerName = (id) => customers.find((c) => c.id === id)?.name || '—'
  const customerById = (id) => customers.find((c) => c.id === id)

  const filtered = invoices.filter((inv) => {
    if (statusFilter !== 'All' && inv.status !== statusFilter) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    return inv.id.toLowerCase().includes(q) || customerName(inv.customerId).toLowerCase().includes(q)
  })

  return (
    <div>
      <PageHeader title="Billing & Invoices" subtitle={`${invoices.length} invoices`}>
        <button onClick={() => setShowBuilder(true)} className="btn-primary">
          <Plus size={16} /> New Invoice
        </button>
      </PageHeader>

      {/* Filters */}
      <div className="card mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search invoice # or customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input sm:!w-48"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option>All</option>
          <option>Paid</option>
          <option>Partial</option>
          <option>Credit</option>
        </select>
      </div>

      {/* Invoice table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <th className="px-4 py-3 font-semibold">Invoice</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
                <th className="px-4 py-3 text-right font-semibold">Balance</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((inv) => {
                const balance = invoiceBalance(inv)
                return (
                  <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{inv.id}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {customerName(inv.customerId)}
                      {inv.salesperson && (
                        <p className="text-xs text-gray-400">By: {inv.salesperson}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatDate(inv.date)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                      {formatMoney(invoiceTotal(inv), currency)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {balance > 0 ? (
                        <span className="font-semibold text-brand-600">
                          {formatMoney(balance, currency)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {balance > 0 && (
                          <button
                            onClick={() => setPayFor(inv)}
                            className="btn-ghost !p-2 text-emerald-600"
                            title="Record payment"
                          >
                            <HandCoins size={16} />
                          </button>
                        )}
                        <button
                          onClick={() =>
                            generateInvoicePDF(inv, customerById(inv.customerId), currency, companyName, settings || {})
                          }
                          className="btn-ghost !p-2"
                          title="Download PDF"
                        >
                          <FileDown size={16} />
                        </button>
                        <button
                          onClick={() => setEditInv(inv)}
                          className="btn-ghost !p-2"
                          title="Edit invoice"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setVoidInv(inv)}
                          className="btn-ghost !p-2 text-brand-600"
                          title="Void / cancel invoice"
                        >
                          <Ban size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <EmptyState icon={ReceiptText} title="No invoices found" subtitle="Create one to get started" />
        )}
      </div>

      {/* New / edit invoice modal */}
      <Modal
        open={showBuilder || !!editInv}
        onClose={() => {
          setShowBuilder(false)
          setEditInv(null)
        }}
        title={editInv ? `Edit Invoice ${editInv.id}` : 'New Invoice'}
        size="xl"
      >
        {(showBuilder || editInv) && (
          <InvoiceBuilder
            editInvoice={editInv}
            onClose={(inv) => {
              setShowBuilder(false)
              setEditInv(null)
              // Offer immediate PDF download of the freshly created invoice.
              if (inv) generateInvoicePDF(inv, customerById(inv.customerId), currency, companyName, settings || {})
            }}
          />
        )}
      </Modal>

      {/* Payment modal */}
      <Modal open={!!payFor} onClose={() => setPayFor(null)} title="Record Payment" size="sm">
        {payFor && <PaymentModal invoice={payFor} onClose={() => setPayFor(null)} />}
      </Modal>

      {/* Void confirm */}
      <ConfirmDialog
        open={!!voidInv}
        danger
        title={`Void invoice ${voidInv?.id}?`}
        message="The invoice will be removed and its items returned to stock. This cannot be undone."
        confirmLabel="Void Invoice"
        onCancel={() => setVoidInv(null)}
        onConfirm={() => {
          dispatch({ type: 'VOID_INVOICE', id: voidInv.id })
          setVoidInv(null)
        }}
      />
    </div>
  )
}
