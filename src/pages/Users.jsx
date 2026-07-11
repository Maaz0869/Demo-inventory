// Company management — platform admin only. Each company is its own account
// with fully isolated data. Admin can add companies, block / unblock (open)
// them, and remove them. A blocked company cannot sign in.
import { useState } from 'react'
import { Plus, Building2, Lock, Unlock, Trash2, PencilRuler, Pencil } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Modal, PageHeader, EmptyState, ConfirmDialog } from '../components/ui'

function CompanyForm({ initial, isEdit, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    username: initial?.username || '',
    password: '',
  })
  const [error, setError] = useState('')
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        const res = await onSubmit(form)
        if (res && !res.ok) setError(res.error)
      }}
      className="space-y-4"
    >
      {error && (
        <div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}
      <div>
        <label className="label">Company Name</label>
        <input
          className="input"
          required
          placeholder="e.g. Al-Madina Motors"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
        />
      </div>
      <div>
        <label className="label">Login Username</label>
        <input
          className="input"
          required
          value={form.username}
          onChange={(e) => {
            set('username', e.target.value)
            setError('')
          }}
        />
      </div>
      <div>
        <label className="label">
          Password {isEdit && <span className="normal-case text-gray-400">(leave blank to keep current)</span>}
        </label>
        <input
          className="input"
          required={!isEdit}
          placeholder={isEdit ? '••••••••' : ''}
          value={form.password}
          onChange={(e) => set('password', e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          {isEdit ? 'Save Changes' : 'Create Company'}
        </button>
      </div>
    </form>
  )
}

export default function Users({ onNavigate }) {
  const { users, addUser, updateUser, toggleBlock, deleteUser, setViewingCompany } = useAuth()
  // form = null (closed) | { mode:'add' } | { mode:'edit', company }
  const [form, setForm] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  // Open a company's workspace: load its data and jump to its dashboard.
  const manage = (company) => {
    setViewingCompany(company)
    onNavigate?.('dashboard')
  }

  // Only company accounts appear here (not the platform admin itself).
  const companies = users.filter((u) => u.role !== 'admin')

  const handleSubmit = async (values) => {
    const res =
      form?.mode === 'edit'
        ? await updateUser({ id: form.company.id, ...values })
        : await addUser(values)
    if (res.ok) setForm(null)
    return res
  }

  return (
    <div>
      <PageHeader title="Companies" subtitle="Each company gets its own private inventory">
        <button onClick={() => setForm({ mode: 'add' })} className="btn-primary">
          <Plus size={18} />
          Add Company
        </button>
      </PageHeader>

      <div className="card overflow-hidden">
        {companies.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No companies yet"
            subtitle="Add a company to give it its own login and inventory"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400 dark:border-gray-800">
                  <th className="px-5 py-3 font-semibold">Company</th>
                  <th className="px-5 py-3 font-semibold">Username</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {companies.map((u) => {
                  const blocked = u.status === 'blocked'
                  return (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                            <Building2 size={16} />
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {u.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{u.username}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`badge ${
                            blocked
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                              : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                          }`}
                        >
                          {blocked ? 'Blocked' : 'Active'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => manage(u)}
                            disabled={blocked}
                            title={blocked ? 'Unblock to manage' : 'View & edit this company'}
                            className="btn-primary !py-1.5"
                          >
                            <PencilRuler size={15} />
                            Manage
                          </button>
                          <button
                            onClick={() => toggleBlock(u.id)}
                            title={blocked ? 'Unblock' : 'Block'}
                            className={blocked ? 'btn-secondary !py-1.5' : 'btn-danger !py-1.5'}
                          >
                            {blocked ? <Unlock size={15} /> : <Lock size={15} />}
                            {blocked ? 'Unblock' : 'Block'}
                          </button>
                          <button
                            onClick={() => setForm({ mode: 'edit', company: u })}
                            title="Edit / reset password"
                            className="btn-ghost !p-2"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(u)}
                            title="Delete"
                            className="btn-ghost !p-2"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.mode === 'edit' ? 'Edit Company' : 'Add Company'}
      >
        {form && (
          <CompanyForm
            initial={form.mode === 'edit' ? form.company : null}
            isEdit={form.mode === 'edit'}
            onSubmit={handleSubmit}
            onCancel={() => setForm(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        danger
        title={`Delete "${confirmDelete?.name}"?`}
        message="The company's login will be removed. This cannot be undone."
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          deleteUser(confirmDelete.id)
          setConfirmDelete(null)
        }}
      />
    </div>
  )
}
