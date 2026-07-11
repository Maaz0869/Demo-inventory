// -----------------------------------------------------------------------------
// Central in-memory store for the whole app.
// Uses useReducer so every mutation (products, invoices, payments, expenses)
// flows through a single, predictable place. Data lives only for the session.
// -----------------------------------------------------------------------------
import { createContext, useContext, useReducer, useEffect, useState } from 'react'
import {
  seedProducts,
  seedCustomers,
  seedInvoices,
  seedPayments,
  seedExpenses,
  nextId,
} from '../data/mockData'
import { invoiceTotal } from '../utils/calc'

const AppContext = createContext(null)

const initialState = {
  products: seedProducts,
  customers: seedCustomers,
  invoices: seedInvoices,
  payments: seedPayments,
  expenses: seedExpenses,
}

function reducer(state, action) {
  switch (action.type) {
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
      const custInvoices = state.invoices
        .filter((inv) => inv.customerId === action.payment.customerId)
        .sort((a, b) => new Date(a.date) - new Date(b.date))

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

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

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

  const value = { state, dispatch, currency, setCurrency, theme, toggleTheme }
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// Convenience hook used by every screen.
export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}
