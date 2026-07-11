// Customer accounts (Khata / Ledger): customer list + per-customer statement.
import { useMemo, useState } from 'react'
import {
  Plus,
  Search,
  Users,
  FileSpreadsheet,
  HandCoins,
  ArrowLeft,
  Phone,
  MapPin,
  Pencil,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatMoney, formatDate, todayISO } from '../utils/format'
import { invoiceTotal, customerBalance } from '../utils/calc'
import { exportCustomerStatement } from '../utils/excel'
import { Modal, PageHeader, StatusBadge, EmptyState } from '../components/ui'

const blankCustomer = { name: '', phone: '', address: '' }

function CustomerForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(initial)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(form)
      }}
      className="space-y-4"
    >
      <div>
        <label className="label">Name</label>
        <input className="input" required value={form.name} onChange={(e) => set('name', e.target.value)} />
      </div>
      <div>
        <label className="label">Phone</label>
        <input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
      </div>
      <div>
        <label className="label">Address</label>
        <textarea
          className="input"
          rows={2}
          value={form.address}
          onChange={(e) => set('address', e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          Save Customer
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Per-customer statement view (invoices + payments with running balance)
// ---------------------------------------------------------------------------
function CustomerStatement({ customer, onBack }) {
  const { state, dispatch, currency } = useApp()
  const { invoices, payments } = state
  const [payOpen, setPayOpen] = useState(false)

  const balance = customerBalance(customer.id, invoices, payments)

  // Merge invoices (debit) + payments (credit) into a running ledger.
  const ledger = useMemo(() => {
    const entries = [
      ...invoices
        .filter((i) => i.customerId === customer.id)
        .map((inv) => ({ date: inv.date, type: 'Invoice', ref: inv.id, debit: invoiceTotal(inv), credit: 0, status: inv.status })),
      ...payments
        .filter((p) => p.customerId === customer.id)
        .map((p) => ({ date: p.date, type: 'Payment', ref: p.invoiceId || p.id, debit: 0, credit: Number(p.amount) || 0, note: p.note })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date))

    let running = 0
    return entries.map((e) => {
      running += e.debit - e.credit
      return { ...e, running }
    })
  }, [invoices, payments, customer.id])

  return (
    <div>
      <button onClick={onBack} className="btn-ghost mb-4 !px-2">
        <ArrowLeft size={16} /> Back to customers
      </button>

      {/* Customer header */}
      <div className="card mb-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">{customer.name}</h2>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
              {customer.phone && customer.phone !== '—' && (
                <span className="flex items-center gap-1.5">
                  <Phone size={14} /> {customer.phone}
                </span>
              )}
              {customer.address && customer.address !== '—' && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} /> {customer.address}
                </span>
              )}
            </div>
          </div>
          <div className="rounded-xl bg-gray-50 px-5 py-3 text-right dark:bg-gray-800/60">
            <p className="text-xs font-semibold uppercase text-gray-400">Outstanding Balance</p>
            <p className={`text-2xl font-extrabold ${balance > 0 ? 'text-brand-600' : 'text-emerald-600'}`}>
              {formatMoney(balance, currency)}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => setPayOpen(true)} disabled={balance <= 0} className="btn-primary">
            <HandCoins size={16} /> Record Payment
          </button>
          <button
            onClick={() => exportCustomerStatement(customer, invoices, payments, currency)}
            className="btn-secondary"
          >
            <FileSpreadsheet size={16} /> Export Statement (.xlsx)
          </button>
        </div>
      </div>

      {/* Ledger */}
      <div className="card overflow-hidden">
        <h3 className="border-b border-gray-100 px-5 py-4 font-bold text-gray-900 dark:border-gray-800 dark:text-white">
          Account Ledger
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Reference</th>
                <th className="px-4 py-3 text-right font-semibold">Debit</th>
                <th className="px-4 py-3 text-right font-semibold">Credit</th>
                <th className="px-4 py-3 text-right font-semibold">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {ledger.map((e, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatDate(e.date)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`badge ${
                        e.type === 'Invoice'
                          ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      }`}
                    >
                      {e.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">{e.ref}</td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">
                    {e.debit ? formatMoney(e.debit, currency) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-600">
                    {e.credit ? formatMoney(e.credit, currency) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                    {formatMoney(e.running, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {ledger.length === 0 && (
          <EmptyState icon={Users} title="No transactions" subtitle="Invoices and payments will appear here" />
        )}
      </div>

      {/* Record payment modal */}
      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Record Payment" size="sm">
        <PaymentForm
          maxAmount={balance}
          currency={currency}
          onSubmit={(amount, note) => {
            dispatch({
              type: 'ADD_PAYMENT',
              payment: { customerId: customer.id, date: todayISO(), amount, note },
            })
            setPayOpen(false)
          }}
          onCancel={() => setPayOpen(false)}
        />
      </Modal>
    </div>
  )
}

function PaymentForm({ maxAmount, currency, onSubmit, onCancel }) {
  const [amount, setAmount] = useState(maxAmount)
  const [note, setNote] = useState('')
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Outstanding: <span className="font-bold text-brand-600">{formatMoney(maxAmount, currency)}</span>.
        Payment is applied to the oldest invoices first.
      </p>
      <div>
        <label className="label">Amount Received</label>
        <input
          type="number"
          min="0"
          max={maxAmount}
          className="input"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Note (optional)</label>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Cash / bank transfer…" />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button
          onClick={() => onSubmit(Math.min(Number(amount) || 0, maxAmount), note || 'Payment received')}
          className="btn-primary"
        >
          Save Payment
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Customers page (list ⇄ statement)
// ---------------------------------------------------------------------------
export default function Customers() {
  const { state, dispatch, currency } = useApp()
  const { customers, invoices, payments } = state

  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null) // customer id
  const [modal, setModal] = useState(null) // { mode, customer }

  const selectedCustomer = customers.find((c) => c.id === selected)

  const filtered = customers.filter((c) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return c.name.toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q)
  })

  const save = (customer) => {
    if (modal.mode === 'add') dispatch({ type: 'ADD_CUSTOMER', customer })
    else dispatch({ type: 'UPDATE_CUSTOMER', customer: { ...customer, id: modal.customer.id } })
    setModal(null)
  }

  if (selectedCustomer) {
    return <CustomerStatement customer={selectedCustomer} onBack={() => setSelected(null)} />
  }

  return (
    <div>
      <PageHeader title="Customer Accounts" subtitle="Khata / ledger management">
        <button onClick={() => setModal({ mode: 'add', customer: blankCustomer })} className="btn-primary">
          <Plus size={16} /> Add Customer
        </button>
      </PageHeader>

      <div className="card mb-4 p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search customers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((c) => {
          const balance = customerBalance(c.id, invoices, payments)
          const invCount = invoices.filter((i) => i.customerId === c.id).length
          return (
            <div key={c.id} className="card p-5 transition-shadow hover:shadow-lg">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold text-gray-900 dark:text-white">{c.name}</p>
                  {c.phone && c.phone !== '—' && (
                    <p className="flex items-center gap-1.5 text-sm text-gray-400">
                      <Phone size={13} /> {c.phone}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setModal({ mode: 'edit', customer: c })}
                  className="btn-ghost !p-2"
                  title="Edit"
                >
                  <Pencil size={15} />
                </button>
              </div>

              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-400">Balance</p>
                  <p className={`text-xl font-extrabold ${balance > 0 ? 'text-brand-600' : 'text-emerald-600'}`}>
                    {formatMoney(balance, currency)}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">{invCount} invoice(s)</p>
                </div>
                <button onClick={() => setSelected(c.id)} className="btn-secondary !py-1.5 text-sm">
                  View Ledger
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="card">
          <EmptyState icon={Users} title="No customers found" />
        </div>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === 'edit' ? 'Edit Customer' : 'Add Customer'}
        size="sm"
      >
        {modal && <CustomerForm initial={modal.customer} onSubmit={save} onCancel={() => setModal(null)} />}
      </Modal>
    </div>
  )
}
