// Dashboard: KPI cards, charts, recent transactions and low-stock alerts.
import { useMemo } from 'react'
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

// Vertical bar chart (last-N-days sales). Pure CSS bars — theme-aware, no deps.
function SalesTrend({ data, currency }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="flex h-44 items-end gap-2 px-1">
      {data.map((d) => (
        <div key={d.iso} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="flex h-full w-full items-end justify-center rounded-t bg-gray-100/60 dark:bg-gray-800/50">
            <div
              className="w-full rounded-t bg-brand-500/85 transition-all hover:bg-brand-600"
              style={{ height: `${Math.max(d.value ? 4 : 0, (d.value / max) * 100)}%` }}
              title={`${d.label}: ${formatMoney(d.value, currency)}`}
            />
          </div>
          <span className="text-[10px] font-medium text-gray-400">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// Horizontal bars for a ranked list (e.g. top products by revenue).
function RankedBars({ rows, currency }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  if (rows.length === 0) return <p className="py-8 text-center text-sm text-gray-400">No sales yet.</p>
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.name}>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-gray-700 dark:text-gray-200">{r.name}</span>
            <span className="shrink-0 font-semibold text-gray-900 dark:text-white">
              {formatMoney(r.value, currency)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

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

  // Sales for the last 7 days (for the trend chart).
  const salesByDay = useMemo(() => {
    const base = new Date(today + 'T00:00:00')
    const out = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base)
      d.setDate(base.getDate() - i)
      const iso = d.toISOString().slice(0, 10)
      const value = invoices
        .filter((inv) => inv.date === iso)
        .reduce((s, inv) => s + invoiceTotal(inv), 0)
      out.push({ iso, value, label: d.toLocaleDateString('en-GB', { weekday: 'short' }) })
    }
    return out
  }, [invoices, today])
  const weekSales = salesByDay.reduce((s, d) => s + d.value, 0)

  // Top products by revenue.
  const topProducts = useMemo(() => {
    const tally = {}
    invoices.forEach((inv) =>
      inv.items.forEach((it) => {
        tally[it.name] = (tally[it.name] || 0) + (Number(it.qty) || 0) * (Number(it.price) || 0)
      }),
    )
    return Object.entries(tally)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [invoices])

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

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 dark:text-white">Sales — last 7 days</h2>
            <span className="text-sm font-bold text-brand-600">{formatMoney(weekSales, currency)}</span>
          </div>
          <SalesTrend data={salesByDay} currency={currency} />
        </div>
        <div className="card p-5">
          <h2 className="mb-4 font-bold text-gray-900 dark:text-white">Top Products (by revenue)</h2>
          <RankedBars rows={topProducts} currency={currency} />
        </div>
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
