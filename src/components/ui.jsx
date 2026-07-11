// Small reusable UI primitives shared across pages.
import { X } from 'lucide-react'
import { useEffect } from 'react'

/** Centered modal dialog with backdrop. */
export function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  const width = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`card relative z-10 w-full ${width} max-h-[90vh] overflow-y-auto p-6 animate-[fadeIn_.15s_ease-out]`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="btn-ghost !p-2" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Colored status pill for invoice payment status. */
export function StatusBadge({ status }) {
  const map = {
    Paid: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    Partial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    Credit: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
  }
  return <span className={`badge ${map[status] || map.Credit}`}>{status}</span>
}

/** Empty-state placeholder. */
export function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      {Icon && <Icon className="text-gray-300 dark:text-gray-700" size={40} />}
      <p className="font-semibold text-gray-500 dark:text-gray-400">{title}</p>
      {subtitle && <p className="text-sm text-gray-400 dark:text-gray-500">{subtitle}</p>}
    </div>
  )
}

/** Page header with title + optional action button on the right. */
export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          {title}
        </h1>
        {subtitle && <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}
