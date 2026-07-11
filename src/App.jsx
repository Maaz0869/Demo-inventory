// Root application shell: sidebar + topbar + active page.
import { useState } from 'react'
import { Menu, Moon, Sun, LogOut, Building2, ArrowLeft } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Billing from './pages/Billing'
import Customers from './pages/Customers'
import Expenses from './pages/Expenses'
import Reports from './pages/Reports'
import Users from './pages/Users'
import Overview from './pages/Overview'
import Settings from './pages/Settings'
import Login from './pages/Login'
import { useApp } from './context/AppContext'
import { useAuth } from './context/AuthContext'

const PAGES = {
  dashboard: Dashboard,
  inventory: Inventory,
  billing: Billing,
  customers: Customers,
  expenses: Expenses,
  reports: Reports,
  users: Users,
  overview: Overview,
  settings: Settings,
}

export default function App() {
  const [active, setActive] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, toggleTheme, currency, loading, error } = useApp()
  const { currentUser, isAdmin, logout, viewingCompany, setViewingCompany, authLoading } = useAuth()

  // Restoring an existing session → brief splash (avoids flashing the login).
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-950">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-600" />
      </div>
    )
  }

  // No session → show the login screen.
  if (!currentUser) return <Login />

  const OPERATIONAL = ['dashboard', 'inventory', 'billing', 'customers', 'expenses', 'reports', 'settings']

  // A company sees its own operational screens. The admin lands on the platform
  // Overview + Companies; while managing a company it also gets that company's
  // operational screens (view + edit).
  const allowed = isAdmin
    ? viewingCompany
      ? ['overview', 'users', ...OPERATIONAL]
      : ['overview', 'users']
    : OPERATIONAL
  const activeKey = allowed.includes(active) ? active : allowed[0]
  const Page = PAGES[activeKey]

  const exitCompany = () => {
    setViewingCompany(null)
    setActive('users')
  }

  const navigate = (key) => {
    setActive(key)
    setSidebarOpen(false)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-950">
      <Sidebar
        active={activeKey}
        onNavigate={navigate}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isAdmin={isAdmin}
        viewing={!!viewingCompany}
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
            {/* Currency (fixed to South African Rand) */}
            <span
              className="rounded-lg bg-gray-100 px-2.5 py-1.5 text-sm font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300"
              title="Currency: South African Rand"
            >
              R {currency}
            </span>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="btn-secondary !p-2"
              aria-label="Toggle theme"
              title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Current user + logout */}
            <div className="ml-1 flex items-center gap-2 border-l border-gray-200 pl-2 dark:border-gray-800 sm:gap-3 sm:pl-3">
              <div className="hidden text-right leading-tight sm:block">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {currentUser.name}
                </p>
                <p className="text-[11px] capitalize text-gray-400">{currentUser.role}</p>
              </div>
              <button
                onClick={logout}
                className="btn-secondary !p-2"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Admin "managing a company" banner */}
        {isAdmin && viewingCompany && (
          <div className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm dark:border-amber-900/50 dark:bg-amber-950/30 sm:px-6">
            <div className="flex min-w-0 items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
              <Building2 size={16} className="shrink-0" />
              <span className="truncate">
                Managing: {viewingCompany.name}
                <span className="ml-1 font-normal text-amber-700/70 dark:text-amber-400/70">
                  (viewing &amp; editing their data)
                </span>
              </span>
            </div>
            <button onClick={exitCompany} className="btn-secondary !py-1.5 shrink-0">
              <ArrowLeft size={15} />
              Back to Companies
            </button>
          </div>
        )}

        {/* Active page */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-7xl">
            {error ? (
              <div className="rounded-2xl bg-red-50 p-6 text-center text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center gap-3 py-24 text-gray-400">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-600" />
                Loading data…
              </div>
            ) : (
              <Page onNavigate={navigate} />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
