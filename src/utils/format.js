// Currency + date formatting helpers.

const SYMBOLS = { PKR: 'Rs', SAR: 'SAR' }

/** Format a number as money in the active currency, e.g. "Rs 3,200". */
export const formatMoney = (amount, currency = 'PKR') => {
  const symbol = SYMBOLS[currency] || currency
  const value = Number(amount) || 0
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })
  return `${symbol} ${formatted}`
}

/** Just the currency symbol. */
export const currencySymbol = (currency = 'PKR') => SYMBOLS[currency] || currency

/** Human-friendly date, e.g. "11 Jul 2026". */
export const formatDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''))
  if (isNaN(d)) return iso
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Today's date as YYYY-MM-DD for date inputs. */
export const todayISO = () => new Date().toISOString().slice(0, 10)
