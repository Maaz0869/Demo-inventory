// Reports: sales, expenses and receivables summaries with Excel export.
import { useMemo } from 'react'
import {
  TrendingUp,
  Wallet,
  HandCoins,
  FileSpreadsheet,
  Package,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatMoney } from '../utils/format'
import { invoiceTotal, invoiceBalance, customerBalance, totalReceivables } from '../utils/calc'
import {
  exportSalesReport,
  exportExpenseReport,
  exportReceivablesReport,
} from '../utils/excel'
import { PageHeader } from '../components/ui'

function ReportCard({ icon: Icon, accent, title, subtitle, stats, onExport, children }) {
  return (
    <div className="card p-6">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}>
            <Icon size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">{title}</h2>
            <p className="text-xs text-gray-400">{subtitle}</p>
          </div>
        </div>
        <button onClick={onExport} className="btn-secondary !py-1.5 text-sm">
          <FileSpreadsheet size={15} /> Excel
        </button>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60">
            <p className="text-xs font-semibold uppercase text-gray-400">{s.label}</p>
            <p className="mt-1 text-lg font-extrabold text-gray-900 dark:text-white">{s.value}</p>
          </div>
        ))}
      </div>
      {children}
    </div>
  )
}

export default function Reports() {
  const { state, currency } = useApp()
  const { invoices, customers, expenses, products } = state

  const salesStats = useMemo(() => {
    const total = invoices.reduce((s, i) => s + invoiceTotal(i), 0)
    const collected = invoices.reduce((s, i) => s + Number(i.amountPaid || 0), 0)
    return { total, collected, count: invoices.length }
  }, [invoices])

  const expenseTotal = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses])
  const receivables = useMemo(() => totalReceivables(invoices), [invoices])
  const debtors = useMemo(
    () => customers.filter((c) => customerBalance(c.id, invoices, state.payments) > 0),
    [customers, invoices, state.payments],
  )

  const netProfit = salesStats.total - expenseTotal

  // Simple top-selling breakdown for the sales report card.
  const topProducts = useMemo(() => {
    const tally = {}
    invoices.forEach((inv) =>
      inv.items.forEach((it) => {
        tally[it.name] = (tally[it.name] || 0) + Number(it.qty)
      }),
    )
    return Object.entries(tally)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }, [invoices])

  return (
    <div>
      <PageHeader title="Reports" subtitle="Business summaries & exports" />

      {/* Headline KPIs */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="Total Sales" value={formatMoney(salesStats.total, currency)} accent="text-brand-600" />
        <MiniStat label="Total Expenses" value={formatMoney(expenseTotal, currency)} accent="text-amber-600" />
        <MiniStat label="Receivables" value={formatMoney(receivables, currency)} accent="text-emerald-600" />
        <MiniStat
          label="Net (Sales − Expenses)"
          value={formatMoney(netProfit, currency)}
          accent={netProfit >= 0 ? 'text-emerald-600' : 'text-brand-600'}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sales report */}
        <ReportCard
          icon={TrendingUp}
          accent="bg-brand-600"
          title="Sales Report"
          subtitle="All invoices"
          stats={[
            { label: 'Invoices', value: salesStats.count },
            { label: 'Total', value: formatMoney(salesStats.total, currency) },
            { label: 'Collected', value: formatMoney(salesStats.collected, currency) },
            { label: 'Outstanding', value: formatMoney(receivables, currency) },
          ]}
          onExport={() => exportSalesReport(invoices, customers, currency)}
        >
          <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Top Selling</p>
          <div className="space-y-1.5">
            {topProducts.length === 0 && <p className="text-sm text-gray-400">No sales yet.</p>}
            {topProducts.map(([name, qty]) => (
              <div key={name} className="flex items-center justify-between text-sm">
                <span className="truncate text-gray-700 dark:text-gray-200">{name}</span>
                <span className="font-semibold text-gray-900 dark:text-white">{qty} sold</span>
              </div>
            ))}
          </div>
        </ReportCard>

        {/* Expense report */}
        <ReportCard
          icon={Wallet}
          accent="bg-amber-500"
          title="Expense Report"
          subtitle="All expenses"
          stats={[
            { label: 'Entries', value: expenses.length },
            { label: 'Total', value: formatMoney(expenseTotal, currency) },
          ]}
          onExport={() => exportExpenseReport(expenses, currency)}
        >
          <p className="mb-2 text-xs font-semibold uppercase text-gray-400">By Category</p>
          <div className="space-y-1.5">
            {Object.entries(
              expenses.reduce((acc, e) => {
                acc[e.category] = (acc[e.category] || 0) + Number(e.amount)
                return acc
              }, {}),
            )
              .sort((a, b) => b[1] - a[1])
              .map(([cat, amt]) => (
                <div key={cat} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-200">{cat}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatMoney(amt, currency)}
                  </span>
                </div>
              ))}
          </div>
        </ReportCard>

        {/* Receivables report */}
        <ReportCard
          icon={HandCoins}
          accent="bg-emerald-600"
          title="Receivables Report"
          subtitle="Outstanding udhaar"
          stats={[
            { label: 'Debtors', value: debtors.length },
            { label: 'Total Due', value: formatMoney(receivables, currency) },
          ]}
          onExport={() => exportReceivablesReport(customers, invoices, state.payments, currency)}
        >
          <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Top Debtors</p>
          <div className="space-y-1.5">
            {debtors.length === 0 && <p className="text-sm text-gray-400">No outstanding balances.</p>}
            {debtors
              .map((c) => ({ c, bal: customerBalance(c.id, invoices, state.payments) }))
              .sort((a, b) => b.bal - a.bal)
              .slice(0, 5)
              .map(({ c, bal }) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <span className="truncate text-gray-700 dark:text-gray-200">{c.name}</span>
                  <span className="font-semibold text-brand-600">{formatMoney(bal, currency)}</span>
                </div>
              ))}
          </div>
        </ReportCard>
      </div>

      {/* Inventory valuation */}
      <div className="card mt-6 p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-900 dark:bg-gray-700">
            <Package size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">Inventory Valuation</h2>
            <p className="text-xs text-gray-400">Stock value at cost vs. potential selling value</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Products" value={products.length} />
          <MiniStat label="Units in Stock" value={products.reduce((s, p) => s + p.quantity, 0)} />
          <MiniStat
            label="Value at Cost"
            value={formatMoney(
              products.reduce((s, p) => s + p.costPrice * p.quantity, 0),
              currency,
            )}
          />
          <MiniStat
            label="Value at Selling"
            value={formatMoney(
              products.reduce((s, p) => s + p.sellingPrice * p.quantity, 0),
              currency,
            )}
            accent="text-emerald-600"
          />
        </div>
      </div>
    </div>
  )
}

function MiniStat({ label, value, accent = 'text-gray-900 dark:text-white' }) {
  return (
    <div className="card p-5">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-1 text-xl font-extrabold ${accent}`}>{value}</p>
    </div>
  )
}
