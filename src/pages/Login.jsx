// Login screen. Shown whenever there is no active session.
// Split layout: branded showcase panel (left) + sign-in form (right).
import { useState } from 'react'
import { Wrench, LogIn, AlertCircle, Boxes, ReceiptText, BarChart3, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const FEATURES = [
  { icon: Boxes, title: 'Smart Inventory', text: 'Track parts, stock levels & low-stock alerts' },
  { icon: ReceiptText, title: 'Billing & Ledger', text: 'Invoices, payments and customer khata' },
  { icon: BarChart3, title: 'Live Reports', text: 'Sales, expenses & receivables at a glance' },
  { icon: ShieldCheck, title: 'Private & Secure', text: 'Each company gets its own isolated space' },
]

export default function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    const res = await login(username, password)
    setBusy(false)
    if (!res.ok) setError(res.error)
  }

  return (
    <div className="grid min-h-screen bg-gray-100 dark:bg-gray-950 lg:grid-cols-2">
      {/* Brand / showcase panel */}
      <div className="relative hidden overflow-hidden bg-gray-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        {/* Decorative gradient blobs */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 shadow-lg shadow-brand-600/30">
            <Wrench size={22} className="text-white" />
          </div>
          <div>
            <p className="text-lg font-extrabold leading-tight">AutoParts Pro</p>
            <p className="text-xs text-gray-400">Inventory &amp; Billing Cloud</p>
          </div>
        </div>

        <div className="relative">
          <h2 className="max-w-md text-3xl font-extrabold leading-tight">
            Run your parts business, <span className="text-brand-400">the smart way.</span>
          </h2>
          <p className="mt-3 max-w-md text-sm text-gray-400">
            One platform for inventory, billing, customers and reports — built for every workshop
            and auto-parts company.
          </p>

          <div className="mt-8 grid max-w-md grid-cols-1 gap-4 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                <Icon size={20} className="text-brand-400" />
                <p className="mt-2 text-sm font-bold">{title}</p>
                <p className="mt-0.5 text-xs text-gray-400">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-gray-500">© 2026 AutoParts Pro. All rights reserved.</p>
      </div>

      {/* Sign-in form */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600">
              <Wrench size={24} className="text-white" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-gray-900 dark:text-white">AutoParts Pro</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Inventory &amp; Billing Cloud</p>
            </div>
          </div>

          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Welcome back</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Sign in to continue to your workspace.
          </p>

          {error && (
            <div className="mt-6 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="label">Username</label>
              <input
                className="input"
                autoFocus
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  setError('')
                }}
                placeholder="Enter your username"
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                placeholder="••••••••"
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              <LogIn size={18} />
              {busy ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
