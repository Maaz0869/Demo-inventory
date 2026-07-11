// Lightweight toast notifications. Call `toast(message, type)` from anywhere;
// toasts stack bottom-right and auto-dismiss. type: 'success' | 'error' | 'info'.
import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)
let seq = 0

const STYLES = {
  success: {
    icon: CheckCircle2,
    ring: 'ring-emerald-200 dark:ring-emerald-900/50',
    accent: 'text-emerald-600 dark:text-emerald-400',
  },
  error: {
    icon: AlertCircle,
    ring: 'ring-red-200 dark:ring-red-900/50',
    accent: 'text-red-600 dark:text-red-400',
  },
  info: {
    icon: Info,
    ring: 'ring-brand-200 dark:ring-brand-900/50',
    accent: 'text-brand-600 dark:text-brand-400',
  },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const toast = useCallback(
    (message, type = 'success') => {
      const id = ++seq
      setToasts((t) => [...t, { id, message, type }])
      setTimeout(() => dismiss(id), 3500)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((t) => {
          const s = STYLES[t.type] || STYLES.info
          const Icon = s.icon
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl bg-white px-4 py-3 shadow-lg ring-1 ${s.ring} animate-[fadeIn_.15s_ease-out] dark:bg-gray-900`}
            >
              <Icon size={18} className={`mt-0.5 shrink-0 ${s.accent}`} />
              <p className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-100">
                {t.message}
              </p>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label="Dismiss"
              >
                <X size={15} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

// Returns the toast(message, type) function (no-op if no provider mounted).
export function useToast() {
  return useContext(ToastContext) || (() => {})
}
