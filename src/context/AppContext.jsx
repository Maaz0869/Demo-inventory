// -----------------------------------------------------------------------------
// Central store for the whole app, backed by Supabase.
//
// The reducer still runs locally and holds ALL business logic (stock decrements,
// FIFO payment allocation, etc.) exactly as before. On top of it, every dispatch
// is diffed against the previous state and the changed/removed rows are synced to
// Supabase. Because the reducer is immutable (only changed rows get a new object
// reference), the diff is a cheap reference comparison per table.
// -----------------------------------------------------------------------------
import { createContext, useContext, useReducer, useEffect, useState, useRef } from 'react'
import { nextId } from '../data/mockData'
import { invoiceTotal } from '../utils/calc'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'

const AppContext = createContext(null)

// Tables that mirror slices of state. Order matters for nothing except iteration.
const TABLES = ['products', 'customers', 'invoices', 'payments', 'expenses']

const initialState = {
  products: [],
  customers: [],
  invoices: [],
  payments: [],
  expenses: [],
}

function reducer(state, action) {
  switch (action.type) {
    // Load everything fetched from Supabase in one shot.
    case 'HYDRATE':
      return { ...state, ...action.data }

    // ---------------- Products ----------------
    case 'ADD_PRODUCT':
      return { ...state, products: [{ ...action.product, id: nextId('P') }, ...state.products] }

    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map((p) => (p.id === action.product.id ? action.product : p)),
      }

    case 'DELETE_PRODUCT':
      return { ...state, products: state.products.filter((p) => p.id !== action.id) }

    // ---------------- Customers ----------------
    case 'ADD_CUSTOMER':
      return { ...state, customers: [{ ...action.customer, id: nextId('C') }, ...state.customers] }

    case 'UPDATE_CUSTOMER':
      return {
        ...state,
        customers: state.customers.map((c) => (c.id === action.customer.id ? action.customer : c)),
      }

    case 'DELETE_CUSTOMER':
      return { ...state, customers: state.customers.filter((c) => c.id !== action.id) }

    // ---------------- Invoices ----------------
    // Creating an invoice also decrements stock for each line item.
    case 'ADD_INVOICE': {
      const invoice = action.invoice
      const products = state.products.map((p) => {
        const line = invoice.items.find((it) => it.productId === p.id)
        if (!line) return p
        return { ...p, quantity: Math.max(0, p.quantity - Number(line.qty || 0)) }
      })
      return { ...state, invoices: [invoice, ...state.invoices], products }
    }

    // Record a payment against an invoice: bumps amountPaid and re-derives status.
    case 'PAY_INVOICE': {
      const invoices = state.invoices.map((inv) => {
        if (inv.id !== action.invoiceId) return inv
        const newPaid = (Number(inv.amountPaid) || 0) + Number(action.amount || 0)
        const total = invoiceTotal(inv)
        const status = newPaid >= total ? 'Paid' : newPaid > 0 ? 'Partial' : inv.status
        return { ...inv, amountPaid: Math.min(newPaid, total), status }
      })
      const payment = {
        id: nextId('PAY'),
        customerId: action.customerId,
        invoiceId: action.invoiceId,
        date: action.date,
        amount: Number(action.amount),
        note: action.note || 'Invoice payment',
      }
      return { ...state, invoices, payments: [payment, ...state.payments] }
    }

    // ---------------- Payments (account-level) ----------------
    // A general payment received into a customer's account. Applied to their
    // oldest outstanding invoices first (FIFO) so balances stay consistent.
    case 'ADD_PAYMENT': {
      let remaining = Number(action.payment.amount) || 0

      const invoices = state.invoices.map((inv) => {
        if (inv.customerId !== action.payment.customerId || remaining <= 0) return inv
        const bal = invoiceTotal(inv) - (Number(inv.amountPaid) || 0)
        if (bal <= 0) return inv
        const applied = Math.min(bal, remaining)
        remaining -= applied
        const newPaid = (Number(inv.amountPaid) || 0) + applied
        const total = invoiceTotal(inv)
        const status = newPaid >= total ? 'Paid' : newPaid > 0 ? 'Partial' : inv.status
        return { ...inv, amountPaid: newPaid, status }
      })

      const payment = { ...action.payment, id: nextId('PAY') }
      return { ...state, invoices, payments: [payment, ...state.payments] }
    }

    // ---------------- Expenses ----------------
    case 'ADD_EXPENSE':
      return { ...state, expenses: [{ ...action.expense, id: nextId('EXP') }, ...state.expenses] }

    case 'DELETE_EXPENSE':
      return { ...state, expenses: state.expenses.filter((e) => e.id !== action.id) }

    default:
      return state
  }
}

// Sync the difference between two states to Supabase, table by table.
// Changed/new rows (new object reference) are upserted; removed ids are deleted.
// Every written row is stamped with the current companyId so data stays isolated.
async function persistDiff(prev, next, companyId, onError) {
  for (const table of TABLES) {
    const prevRows = prev[table] || []
    const nextRows = next[table] || []

    // New or modified rows: reducer only creates fresh references for changes.
    const changed = nextRows
      .filter((row) => !prevRows.includes(row))
      .map((row) => ({ ...row, companyId }))
    // Rows that no longer exist.
    const nextIds = new Set(nextRows.map((r) => r.id))
    const removedIds = prevRows.filter((r) => !nextIds.has(r.id)).map((r) => r.id)

    try {
      if (changed.length) {
        const { error } = await supabase.from(table).upsert(changed, { onConflict: 'id' })
        if (error) throw error
      }
      if (removedIds.length) {
        const { error } = await supabase.from(table).delete().in('id', removedIds)
        if (error) throw error
      }
    } catch (err) {
      console.error(`Supabase sync failed for "${table}":`, err.message || err)
      onError?.()
    }
  }
}

export function AppProvider({ children }) {
  const { currentUser, viewingCompany } = useAuth()
  const toast = useToast()
  // A company account works on its own data; the admin works on whichever
  // company it is currently managing (viewingCompany).
  const companyId =
    currentUser?.role === 'admin' ? viewingCompany?.id || null : currentUser?.companyId || null
  // Display name of the company whose data is active (for invoice branding etc.)
  const companyName =
    currentUser?.role === 'admin' ? viewingCompany?.name || '' : currentUser?.name || ''

  const [state, baseDispatch] = useReducer(reducer, initialState)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Always read the freshest state / company inside the dispatch wrapper.
  const stateRef = useRef(state)
  stateRef.current = state
  const companyRef = useRef(companyId)
  companyRef.current = companyId

  // Load this company's data. Re-runs whenever the active company changes
  // (login / logout / switching accounts). The admin has no company → no data.
  useEffect(() => {
    let cancelled = false

    if (!companyId) {
      baseDispatch({ type: 'HYDRATE', data: initialState })
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    ;(async () => {
      try {
        const byCompany = (t, order, asc = true) =>
          supabase.from(t).select('*').eq('companyId', companyId).order(order, { ascending: asc })
        const [products, customers, invoices, payments, expenses] = await Promise.all([
          byCompany('products', 'id'),
          byCompany('customers', 'id'),
          byCompany('invoices', 'date', false),
          byCompany('payments', 'date', false),
          byCompany('expenses', 'date', false),
        ])
        const first = [products, customers, invoices, payments, expenses].find((r) => r.error)
        if (first?.error) throw first.error
        if (cancelled) return
        baseDispatch({
          type: 'HYDRATE',
          data: {
            products: products.data || [],
            customers: customers.data || [],
            invoices: invoices.data || [],
            payments: payments.data || [],
            expenses: expenses.data || [],
          },
        })
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load data from Supabase')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [companyId])

  // Wrapped dispatch: apply locally (optimistic) then persist the diff.
  const dispatch = (action) => {
    const prev = stateRef.current
    const next = reducer(prev, action)
    baseDispatch(action)
    if (action.type !== 'HYDRATE') {
      persistDiff(prev, next, companyRef.current, () =>
        toast('Could not save to server — check your connection', 'error'),
      )
    }
  }

  // Currency (PKR / SAR) — persisted so a reload keeps the shop's choice.
  const [currency, setCurrency] = useState(() => localStorage.getItem('currency') || 'PKR')
  useEffect(() => {
    localStorage.setItem('currency', currency)
  }, [currency])

  // Theme (light / dark) — toggles the `dark` class on <html>.
  const [theme, setTheme] = useState(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  )
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    localStorage.setItem('theme', theme)
  }, [theme])
  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  const value = {
    state,
    dispatch,
    loading,
    error,
    currency,
    setCurrency,
    companyName,
    theme,
    toggleTheme,
  }
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// Convenience hook used by every screen.
export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}
