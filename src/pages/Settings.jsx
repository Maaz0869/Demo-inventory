// Company invoice settings — the details that print on this company's invoices:
// address, phone, email, bank details and terms & conditions. Saved per company.
import { useEffect, useState } from 'react'
import { Save, Building2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { PageHeader } from '../components/ui'

const FIELDS = {
  address: '',
  phone: '',
  email: '',
  bankDetails: '',
  terms: '',
}

export default function Settings() {
  const { settings, saveSettings, companyName } = useApp()
  const [form, setForm] = useState(FIELDS)
  const [saving, setSaving] = useState(false)

  // Fill the form once settings load (or change company).
  useEffect(() => {
    if (settings) setForm({ ...FIELDS, ...settings })
  }, [settings])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    await saveSettings({
      address: form.address,
      phone: form.phone,
      email: form.email,
      bankDetails: form.bankDetails,
      terms: form.terms,
    })
    setSaving(false)
  }

  return (
    <div>
      <PageHeader title="Invoice Settings" subtitle="These details appear on your invoices" />

      <form onSubmit={submit} className="max-w-2xl space-y-6">
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
            <Building2 size={18} className="text-brand-600" />
            <h2 className="font-bold">{companyName || 'Your Company'}</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Business Address</label>
              <textarea
                className="input"
                rows={2}
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="Shop 12, Auto Market, Johannesburg"
              />
            </div>
            <div>
              <label className="label">Mobile / Phone</label>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+27 ..."
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="billing@company.co.za"
              />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="mb-4 font-bold text-gray-900 dark:text-white">Bank Details</h2>
          <textarea
            className="input"
            rows={3}
            value={form.bankDetails}
            onChange={(e) => set('bankDetails', e.target.value)}
            placeholder={'Bank: FNB\nAccount: 1234567890\nBranch: 250655'}
          />
        </div>

        <div className="card p-6">
          <h2 className="mb-4 font-bold text-gray-900 dark:text-white">Terms &amp; Conditions</h2>
          <textarea
            className="input"
            rows={3}
            value={form.terms}
            onChange={(e) => set('terms', e.target.value)}
            placeholder="Goods once sold are not returnable. Payment due within 30 days."
          />
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={16} />
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
