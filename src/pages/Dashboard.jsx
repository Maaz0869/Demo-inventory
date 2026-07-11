// Dashboard: KPI cards, recent transactions and low-stock alerts.
import {
  Package,
  AlertTriangle,
  TrendingUp,
  HandCoins,
  ArrowRight,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatMoney, formatDate, todayISO } from '../utils/format'
import { invoiceTotal, totalReceivables } from '../utils/calc'
import { PageHeader, StatusBadge, EmptyState } from '../components/ui'

function KpiCard({ icon: Icon, label, value, accent, hint }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-2 text-2xl font-extrabold text-gray-900 dark:text-white">{value}</p>
          {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  )
}

export default function Dashboard({ onNavigate }) {
  const { state, currency } = useApp()
  const { products, invoices, customers } = state
  const today = todayISO()

  const lowStock = products.filter((p) => p.quantity <= p.lowStockThreshold)
  const todaysSales = invoices
    .filter((i) => i.date === today)
    .reduce((sum, i) => sum + invoiceTotal(i), 0)
  const receivables = totalReceivables(invoices)

  const recent = invoices.slice(0, 6)
  const customerName = (id) => customers.find((c) => c.id === id)?.name || '—'

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Shop overview at a glance" />

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Package}
          label="Total Products"
          value={products.length}
          accent="bg-gray-900 dark:bg-gray-700"
          hint={`${products.reduce((s, p) => s + p.quantity, 0)} units in stock`}
        />
        <KpiCard
          icon={AlertTriangle}
          label="Low Stock Items"
          value={lowStock.length}
          accent="bg-amber-500"
          hint="Need reordering"
        />
        <KpiCard
          icon={TrendingUp}
          label="Today's Sales"
          value={formatMoney(todaysSales, currency)}
          accent="bg-brand-600"
          hint={formatDate(today)}
        />
        <KpiCard
          icon={HandCoins}
          label="Total Receivables"
          value={formatMoney(receivables, currency)}
          accent="bg-emerald-600"
          hint="Outstanding udhaar"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent transactions */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="font-bold text-gray-900 dark:text-white">Recent Transactions</h2>
            <button
              onClick={() => onNavigate('billing')}
              className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              View all <ArrowRight size={14} />
            </button>
          </div>
          {recent.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No transactions yet" />
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {recent.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900 dark:text-white">
                      {customerName(inv.customerId)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {inv.id} • {formatDate(inv.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={inv.status} />
                    <p className="w-28 text-right font-bold text-gray-900 dark:text-white">
                      {formatMoney(invoiceTotal(inv), currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low stock alerts */}
        <div className="card">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="font-bold text-gray-900 dark:text-white">Low Stock Alerts</h2>
            <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              {lowStock.length}
            </span>
          </div>
          {lowStock.length === 0 ? (
            <EmptyState icon={Package} title="All stocked up" subtitle="No items below threshold" />
          ) : (
            <div className="max-h-[360px] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
              {lowStock.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900 dark:text-white">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.partNumber}</p>
                  </div>
                  <span className="badge bg-brand-100 font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                    {p.quantity} left
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
