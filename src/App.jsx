// Root application shell: sidebar + topbar + active page.
import { useState } from 'react'
import { Menu, Moon, Sun } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Billing from './pages/Billing'
import Customers from './pages/Customers'
import Expenses from './pages/Expenses'
import Reports from './pages/Reports'
import { useApp } from './context/AppContext'
import { CURRENCIES } from './data/mockData'

const PAGES = {
  dashboard: Dashboard,
  inventory: Inventory,
  billing: Billing,
  customers: Customers,
  expenses: Expenses,
  reports: Reports,
}

export default function App() {
  const [active, setActive] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, toggleTheme, currency, setCurrency } = useApp()

  const Page = PAGES[active]

  const navigate = (key) => {
    setActive(key)
    setSidebarOpen(false)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-950">
      <Sidebar
        active={active}
        onNavigate={navigate}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900 sm:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="btn-ghost !p-2 lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
            {/* Currency selector */}
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="input !w-auto !py-1.5 text-sm font-semibold"
              title="Currency"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="btn-secondary !p-2"
              aria-label="Toggle theme"
              title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {/* Active page */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-7xl">
            <Page onNavigate={navigate} />
          </div>
        </main>
      </div>
    </div>
  )
}
