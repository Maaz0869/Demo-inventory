// Platform admin home. Bird's-eye view across ALL companies, plus a place for
// the admin to manage its own account. The admin has no company of its own, so
// these figures are aggregated directly from Supabase across every tenant.
import { useEffect, useState } from 'react'
import {
  Building2,
  CheckCircle2,
  Ban,
  Package,
  ReceiptText,
  TrendingUp,
  KeyRound,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { invoiceTotal } from '../utils/calc'
import { formatMoney } from '../utils/format'
import { Modal, PageHeader } from '../components/ui'

function KpiCard({ icon: Icon, label, value, accent, hint }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-white ${accent}`}>
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
          <p className="truncate text-xl font-extrabold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
      {hint && <p className="mt-3 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

function ChangePasswordForm({ onSubmit, onCancel }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (password !== confirm) return setError('Passwords do not match.')
        const res = await onSubmit(password)
        if (res && !res.ok) setError(res.error)
      }}
      className="space-y-4"
    >
      {error && (
        <div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}
      <div>
        <label className="label">New Password</label>
        <input
          className="input"
          required
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setError('')
          }}
        />
      </div>
      <div>
        <label className="label">Confirm Password</label>
        <input
          className="input"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          Update Password
        </button>
      </div>
    </form>
  )
}

export default function Overview({ onNavigate }) {
  const { users, currentUser, updateUser } = useAuth()
  const { currency } = useApp()
  const [stats, setStats] = useState(null)
  const [showPw, setShowPw] = useState(false)

  const companies = users.filter((u) => u.role !== 'admin')
  const active = companies.filter((u) => u.status !== 'blocked').length
  const blocked = companies.length - active

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [products, invoicesRes] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('invoices').select('items, discount, taxPercent'),
      ])
      if (cancelled) return
      const invoices = invoicesRes.data || []
      const sales = invoices.reduce((sum, inv) => sum + invoiceTotal(inv), 0)
      setStats({
        products: products.count || 0,
        invoices: invoices.length,
        sales,
      })
    })()
    return () => {
      cancelled = true
    }
  }, [users])

  const changeOwnPassword = (password) =>
    updateUser({
      id: currentUser.id,
      username: currentUser.username,
      name: currentUser.name,
      password,
    }).then((res) => {
      if (res.ok) setShowPw(false)
      return res
    })

  return (
    <div>
      <PageHeader title="Platform Overview" subtitle="All companies at a glance" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          icon={Building2}
          label="Companies"
          value={companies.length}
          accent="bg-brand-600"
          hint="Total accounts on the platform"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Active"
          value={active}
          accent="bg-emerald-600"
          hint="Can sign in"
        />
        <KpiCard
          icon={Ban}
          label="Blocked"
          value={blocked}
          accent="bg-red-600"
          hint="Sign-in disabled"
        />
        <KpiCard
          icon={Package}
          label="Products (all)"
          value={stats ? stats.products : '…'}
          accent="bg-gray-900 dark:bg-gray-700"
          hint="Across every company"
        />
        <KpiCard
          icon={ReceiptText}
          label="Invoices (all)"
          value={stats ? stats.invoices : '…'}
          accent="bg-indigo-600"
          hint="Across every company"
        />
        <KpiCard
          icon={TrendingUp}
          label="Total Sales (all)"
          value={stats ? formatMoney(stats.sales, currency) : '…'}
          accent="bg-amber-600"
          hint="Combined invoice value"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Companies shortcut */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="font-bold text-gray-900 dark:text-white">Companies</h2>
            <button
              onClick={() => onNavigate?.('users')}
              className="text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              Manage all
            </button>
          </div>
          {companies.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-gray-400">
              No companies yet. Add one from the Companies page.
            </div>
          ) : (
            <div className="max-h-[320px] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
              {companies.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Building2 size={16} className="shrink-0 text-gray-400" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900 dark:text-white">
                        {c.name}
                      </p>
                      <p className="text-xs text-gray-400">{c.username}</p>
                    </div>
                  </div>
                  <span
                    className={`badge ${
                      c.status === 'blocked'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                    }`}
                  >
                    {c.status === 'blocked' ? 'Blocked' : 'Active'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Admin account */}
        <div className="card">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="font-bold text-gray-900 dark:text-white">Your Admin Account</h2>
          </div>
          <div className="space-y-3 p-5 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Name</p>
              <p className="font-semibold text-gray-900 dark:text-white">{currentUser.name}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Username</p>
              <p className="font-semibold text-gray-900 dark:text-white">{currentUser.username}</p>
            </div>
            <button onClick={() => setShowPw(true)} className="btn-secondary w-full">
              <KeyRound size={16} />
              Change Password
            </button>
          </div>
        </div>
      </div>

      <Modal open={showPw} onClose={() => setShowPw(false)} title="Change Admin Password">
        <ChangePasswordForm onSubmit={changeOwnPassword} onCancel={() => setShowPw(false)} />
      </Modal>
    </div>
  )
}
