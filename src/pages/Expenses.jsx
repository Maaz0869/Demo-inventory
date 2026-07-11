// Daily expenses: add expenses, filter by date range, view totals.
import { useMemo, useState } from 'react'
import { Plus, Trash2, Wallet, Download, Filter } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { EXPENSE_CATEGORIES } from '../data/mockData'
import { formatMoney, formatDate, todayISO } from '../utils/format'
import { exportExpenseReport } from '../utils/excel'
import { Modal, PageHeader, EmptyState } from '../components/ui'

const blankExpense = { date: todayISO(), category: EXPENSE_CATEGORIES[0], description: '', amount: '' }

function ExpenseForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState(blankExpense)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ ...form, amount: Number(form.amount) || 0 })
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" required value={form.date} onChange={(e) => set('date', e.target.value)} />
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input" value={form.category} onChange={(e) => set('category', e.target.value)}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <input
          className="input"
          required
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="e.g. Electricity bill"
        />
      </div>
      <div>
        <label className="label">Amount</label>
        <input
          type="number"
          min="0"
          className="input"
          required
          value={form.amount}
          onChange={(e) => set('amount', e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          Save Expense
        </button>
      </div>
    </form>
  )
}

export default function Expenses() {
  const { state, dispatch, currency } = useApp()
  const { expenses } = state

  const [modalOpen, setModalOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [category, setCategory] = useState('All')

  const filtered = useMemo(() => {
    return expenses
      .filter((e) => {
        if (from && e.date < from) return false
        if (to && e.date > to) return false
        if (category !== 'All' && e.category !== category) return false
        return true
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [expenses, from, to, category])

  const total = filtered.reduce((s, e) => s + Number(e.amount), 0)

  return (
    <div>
      <PageHeader title="Daily Expenses" subtitle="Track shop running costs">
        <button onClick={() => exportExpenseReport(filtered, currency)} className="btn-secondary">
          <Download size={16} /> Export
        </button>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus size={16} /> Add Expense
        </button>
      </PageHeader>

      {/* Summary + filters */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card flex items-center justify-between p-5">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total (filtered)</p>
            <p className="mt-1 text-2xl font-extrabold text-brand-600">{formatMoney(total, currency)}</p>
            <p className="mt-0.5 text-xs text-gray-400">{filtered.length} expense(s)</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600">
            <Wallet size={22} className="text-white" />
          </div>
        </div>

        <div className="card p-4 lg:col-span-2">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
            <Filter size={15} /> Filter
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="label">From</label>
              <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">To</label>
              <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option>All</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Expense table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatDate(e.date)}</td>
                  <td className="px-4 py-3">
                    <span className="badge bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {e.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{e.description}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                    {formatMoney(e.amount, currency)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setConfirmDelete(e)}
                      className="btn-ghost !p-2 text-brand-600"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <EmptyState icon={Wallet} title="No expenses" subtitle="Add one or adjust the filters" />
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Expense" size="md">
        <ExpenseForm
          onSubmit={(expense) => {
            dispatch({ type: 'ADD_EXPENSE', expense })
            setModalOpen(false)
          }}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Expense" size="sm">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Delete this expense of{' '}
          <span className="font-bold">{formatMoney(confirmDelete?.amount || 0, currency)}</span>?
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={() => setConfirmDelete(null)} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={() => {
              dispatch({ type: 'DELETE_EXPENSE', id: confirmDelete.id })
              setConfirmDelete(null)
            }}
            className="btn-primary"
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  )
}
