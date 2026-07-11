// Inventory: searchable/filterable product table with add / edit / delete.
import { useMemo, useState } from 'react'
import { Plus, Search, Pencil, Trash2, Package, Download, AlertTriangle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { CATEGORIES } from '../data/mockData'
import { formatMoney } from '../utils/format'
import { exportInventory } from '../utils/excel'
import { Modal, PageHeader, EmptyState } from '../components/ui'

const blankProduct = {
  name: '',
  partNumber: '',
  category: CATEGORIES[0],
  brand: '',
  costPrice: '',
  sellingPrice: '',
  quantity: '',
  lowStockThreshold: '',
}

function ProductForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(initial)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const submit = (e) => {
    e.preventDefault()
    onSubmit({
      ...form,
      costPrice: Number(form.costPrice) || 0,
      sellingPrice: Number(form.sellingPrice) || 0,
      quantity: Number(form.quantity) || 0,
      lowStockThreshold: Number(form.lowStockThreshold) || 0,
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Part Name</label>
          <input
            className="input"
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Brake Pad Set (Front)"
          />
        </div>
        <div>
          <label className="label">Part Number</label>
          <input
            className="input"
            required
            value={form.partNumber}
            onChange={(e) => set('partNumber', e.target.value)}
            placeholder="BP-FR-2045"
          />
        </div>
        <div>
          <label className="label">Brand</label>
          <input
            className="input"
            value={form.brand}
            onChange={(e) => set('brand', e.target.value)}
            placeholder="Bosch"
          />
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input" value={form.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Quantity in Stock</label>
          <input
            type="number"
            min="0"
            className="input"
            required
            value={form.quantity}
            onChange={(e) => set('quantity', e.target.value)}
          />
        </div>
        <div>
          <label className="label">Cost Price</label>
          <input
            type="number"
            min="0"
            className="input"
            required
            value={form.costPrice}
            onChange={(e) => set('costPrice', e.target.value)}
          />
        </div>
        <div>
          <label className="label">Selling Price</label>
          <input
            type="number"
            min="0"
            className="input"
            required
            value={form.sellingPrice}
            onChange={(e) => set('sellingPrice', e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Low-stock Threshold</label>
          <input
            type="number"
            min="0"
            className="input"
            required
            value={form.lowStockThreshold}
            onChange={(e) => set('lowStockThreshold', e.target.value)}
            placeholder="Alert when stock drops to this level"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          Save Product
        </button>
      </div>
    </form>
  )
}

export default function Inventory() {
  const { state, dispatch, currency } = useApp()
  const { products } = state

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [lowOnly, setLowOnly] = useState(false)
  const [modal, setModal] = useState(null) // { mode: 'add' | 'edit', product }
  const [confirmDelete, setConfirmDelete] = useState(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      if (category !== 'All' && p.category !== category) return false
      if (lowOnly && p.quantity > p.lowStockThreshold) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        p.partNumber.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q)
      )
    })
  }, [products, search, category, lowOnly])

  const save = (product) => {
    if (modal.mode === 'add') dispatch({ type: 'ADD_PRODUCT', product })
    else dispatch({ type: 'UPDATE_PRODUCT', product: { ...product, id: modal.product.id } })
    setModal(null)
  }

  return (
    <div>
      <PageHeader title="Inventory" subtitle={`${products.length} parts in catalogue`}>
        <button onClick={() => exportInventory(products, currency)} className="btn-secondary">
          <Download size={16} /> Export
        </button>
        <button onClick={() => setModal({ mode: 'add', product: blankProduct })} className="btn-primary">
          <Plus size={16} /> Add Product
        </button>
      </PageHeader>

      {/* Filters */}
      <div className="card mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by name, part number or brand…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input sm:!w-48" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option>All</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-sm font-semibold text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            className="h-4 w-4 rounded accent-brand-600"
            checked={lowOnly}
            onChange={(e) => setLowOnly(e.target.checked)}
          />
          Low stock only
        </label>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <th className="px-4 py-3 font-semibold">Part</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Brand</th>
                <th className="px-4 py-3 text-right font-semibold">Cost</th>
                <th className="px-4 py-3 text-right font-semibold">Selling</th>
                <th className="px-4 py-3 text-center font-semibold">Stock</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((p) => {
                const low = p.quantity <= p.lowStockThreshold
                return (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 dark:text-white">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.partNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.category}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.brand || '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                      {formatMoney(p.costPrice, currency)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                      {formatMoney(p.sellingPrice, currency)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`badge ${
                          low
                            ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        }`}
                      >
                        {low && <AlertTriangle size={12} />}
                        {p.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setModal({ mode: 'edit', product: p })}
                          className="btn-ghost !p-2"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(p)}
                          className="btn-ghost !p-2 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40"
                          title="Delete"
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
        {filtered.length === 0 && (
          <EmptyState icon={Package} title="No products found" subtitle="Try adjusting your filters" />
        )}
      </div>

      {/* Add / Edit modal */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === 'edit' ? 'Edit Product' : 'Add Product'}
        size="lg"
      >
        {modal && (
          <ProductForm initial={modal.product} onSubmit={save} onCancel={() => setModal(null)} />
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Product" size="sm">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Delete <span className="font-bold">{confirmDelete?.name}</span>? This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={() => setConfirmDelete(null)} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={() => {
              dispatch({ type: 'DELETE_PRODUCT', id: confirmDelete.id })
              setConfirmDelete(null)
            }}
            className="btn-primary"
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  )
}
