import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Archive, Search, FilePlus, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Customer, CustomerInput } from '../types'
import { useStore } from '../store/useStore'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import apiClient from '../lib/apiClient'
import { useQuery } from '../lib/useQuery'
import { useQueryCache } from '../store/useQueryCache'

const EMPTY_FORM: CustomerInput = {
  name: '',
  address: '',
  city: '',
  state: '',
  state_code: '',
  pincode: '',
  gstin: '',
  pan: '',
  phone: ''
}

const PAGE_SIZE = 17
const CUSTOMERS_KEY = '/invoice/customers'

export default function CustomersPage(): React.ReactElement {
  const navigate = useNavigate()
  const { showToast } = useStore()
  const { invalidate } = useQueryCache()
  const { data: customers = [], refetch } = useQuery<Customer[]>(CUSTOMERS_KEY)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)
  const [form, setForm] = useState<CustomerInput>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [archiveConfirm, setArchiveConfirm] = useState<Customer | null>(null)
  const firstRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.ctrlKey && e.key === 'f') { e.preventDefault(); searchRef.current?.focus() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.gstin || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search)
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const openAdd = (): void => {
    setEditCustomer(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
    setTimeout(() => firstRef.current?.focus(), 50)
  }

  const openEdit = (c: Customer): void => {
    setEditCustomer(c)
    const { id: _id, created_at: _ca, ...rest } = c
    setForm(rest)
    setModalOpen(true)
    setTimeout(() => firstRef.current?.focus(), 50)
  }

  const handleChange = (field: keyof CustomerInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  const handleSave = async (): Promise<void> => {
    if (!form.name.trim()) { showToast('error', 'Customer name is required'); return }
    setSaving(true)
    try {
      if (editCustomer) {
        await apiClient.patch(`/invoice/customers/${editCustomer.id}`, form)
        showToast('success', 'Customer updated')
      } else {
        await apiClient.post('/invoice/customers', form)
        showToast('success', 'Customer added')
      }
      setModalOpen(false)
      invalidate(CUSTOMERS_KEY)
      refetch()
    } catch {
      showToast('error', 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleArchive = async (): Promise<void> => {
    if (!archiveConfirm) return
    try {
      await apiClient.delete(`/invoice/customers/${archiveConfirm.id}`)
      showToast('success', 'Customer archived')
      setArchiveConfirm(null)
      invalidate(CUSTOMERS_KEY)
      refetch()
    } catch {
      showToast('error', 'Archive failed')
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-border flex-shrink-0">
        <h1 className="text-xl font-bold text-text-primary">Customers</h1>
        <Button onClick={openAdd} size="sm"><Plus size={14} /> Add Customer</Button>
      </div>

      <div className="flex-1 overflow-auto p-6 pb-0">
        <div className="mb-4 flex items-center gap-2 max-w-sm">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search by name, GSTIN or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-border rounded-md pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          {search && (
            <button onClick={() => setSearch('')} className="text-xs text-text-secondary hover:text-text-primary">
              Clear
            </button>
          )}
        </div>

        <div className="bg-bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b-2 border-border">
              <tr>
                {['Customer Name', 'GSTIN', 'Phone', 'City / State', 'Actions'].map((h) => (
                  <th key={h} scope="col" className="text-xs font-semibold uppercase tracking-wide text-text-secondary px-3 py-2 text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-text-secondary py-10">
                    {search ? `No customers match "${search}"` : 'No customers yet. Click "Add Customer" to add one.'}
                  </td>
                </tr>
              )}
              {paginated.map((c) => (
                <tr key={c.id} className="border-b border-border hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{c.name}</td>
                  <td className="px-3 py-2 text-text-secondary font-mono text-xs">{c.gstin || '—'}</td>
                  <td className="px-3 py-2 text-text-secondary">{c.phone || '—'}</td>
                  <td className="px-3 py-2 text-text-secondary">
                    {[c.city, c.state].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" title="View Ledger" onClick={() => navigate(`/customers/${c.id}/ledger`)}>
                        <BookOpen size={13} /> Ledger
                      </Button>
                      <Button variant="ghost" size="sm" title="New Invoice for this customer" onClick={() => navigate(`/invoices/new?customerId=${c.id}`)}>
                        <FilePlus size={13} /> Invoice
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                        <Pencil size={13} /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-danger hover:bg-red-50" onClick={() => setArchiveConfirm(c)}>
                        <Archive size={13} /> Archive
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-border bg-white px-6 py-2 flex items-center justify-between text-sm text-text-secondary">
        <span>
          {filtered.length === 0
            ? 'No customers'
            : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-40">
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)} className={`w-7 h-7 rounded text-xs font-medium ${p === page ? 'bg-accent text-white' : 'hover:bg-gray-100'}`}>{p}</button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 rounded hover:bg-gray-100 disabled:opacity-40">
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} title={editCustomer ? 'Edit Customer' : 'Add Customer'} onClose={() => setModalOpen(false)}
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSave} loading={saving}>Save</Button></>}>
        <div className="grid grid-cols-1 gap-4">
          <Input ref={firstRef} label="Name *" value={form.name} onChange={handleChange('name')} />
          <Input label="Address" value={form.address} onChange={handleChange('address')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="City" value={form.city} onChange={handleChange('city')} />
            <Input label="State" value={form.state} onChange={handleChange('state')} />
            <Input label="State Code" value={form.state_code} onChange={handleChange('state_code')} />
            <Input label="Pincode" value={form.pincode} onChange={handleChange('pincode')} />
            <Input label="GSTIN" value={form.gstin} onChange={handleChange('gstin')} />
            <Input label="PAN" value={form.pan} onChange={handleChange('pan')} />
            <Input label="Phone" value={form.phone} onChange={handleChange('phone')} />
          </div>
        </div>
      </Modal>

      {/* Archive Confirm Modal */}
      <Modal open={!!archiveConfirm} title="Archive Customer" onClose={() => setArchiveConfirm(null)}
        footer={<><Button variant="secondary" onClick={() => setArchiveConfirm(null)}>Cancel</Button><Button variant="danger" onClick={handleArchive}>Archive</Button></>}>
        <p>Are you sure you want to archive <strong>{archiveConfirm?.name}</strong>? Their invoices and payment history will be preserved.</p>
      </Modal>
    </div>
  )
}
