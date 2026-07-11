// Left navigation sidebar. Collapses to an overlay drawer on mobile.
import {
  LayoutDashboard,
  Package,
  ReceiptText,
  Users,
  Wallet,
  BarChart3,
  UserCog,
  Gauge,
  Wrench,
  X,
} from 'lucide-react'

const NAV = [
  // Platform admin home.
  { key: 'overview', label: 'Overview', icon: Gauge, adminOnly: true },
  // Company (tenant) screens — hidden from the platform admin.
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, companyOnly: true },
  { key: 'inventory', label: 'Inventory', icon: Package, companyOnly: true },
  { key: 'billing', label: 'Billing', icon: ReceiptText, companyOnly: true },
  { key: 'customers', label: 'Customers', icon: Users, companyOnly: true },
  { key: 'expenses', label: 'Expenses', icon: Wallet, companyOnly: true },
  { key: 'reports', label: 'Reports', icon: BarChart3, companyOnly: true },
  // Platform admin only.
  { key: 'users', label: 'Companies', icon: UserCog, adminOnly: true },
]

export default function Sidebar({ active, onNavigate, open, onClose, isAdmin, viewing }) {
  const nav = NAV.filter((item) => {
    // Companies link: admin only. Operational screens: company users always,
    // and the admin too while it is managing a company.
    if (item.adminOnly) return isAdmin
    if (item.companyOnly) return !isAdmin || viewing
    return true
  })
  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-gray-900 text-gray-300 transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
              <Wrench size={20} className="text-white" />
            </div>
            <div>
              <p className="text-base font-extrabold leading-tight text-white">AutoParts Pro</p>
              <p className="text-[11px] text-gray-400">Inventory & Billing</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white lg:hidden">
            <X size={20} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {nav.map(({ key, label, icon: Icon }) => {
            const isActive = active === key
            return (
              <button
                key={key}
                onClick={() => onNavigate(key)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            )
          })}
        </nav>

        <div className="border-t border-white/10 p-4 text-[11px] leading-relaxed text-gray-500">
          <p className="font-semibold text-gray-400">Demo build</p>
          <p>Data is in-memory for this session only.</p>
        </div>
      </aside>
    </>
  )
}
