import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Archive, Search, FilePlus, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Customer, CustomerInput } from '../types'
import { useStore } from '../store/useStore'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import { TableSkeleton } from '../components/ui/Skeleton'
import apiClient from '../lib/apiClient'
import { getApiError } from '../lib/apiError'
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
  phone: '',
  ship_to_name: '',
  ship_to_address: '',
  ship_to_city: '',
  ship_to_state: '',
  ship_to_state_code: '',
  ship_to_pincode: '',
  ship_to_gstin: '',
}

const PAGE_SIZE = 17

interface PagedResult { data: Customer[]; total: number; page: number; limit: number }

export default function CustomersPage(): React.ReactElement {
  const navigate = useNavigate()
  const { showToast } = useStore()
  const { get, set } = useQueryCache()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)
  const [form, setForm] = useState<CustomerInput>(EMPTY_FORM)
  const [shipSame, setShipSame] = useState(true)
  const [saving, setSaving] = useState(false)
  const [archiveConfirm, setArchiveConfirm] = useState<Customer | null>(null)
  const firstRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.ctrlKey && e.key === 'f') { e.preventDefault(); searchRef.current?.focus() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const fetchPage = useCallback(async (p: number, q: string) => {
    const cacheKey = `/invoice/customers?page=${p}&limit=${PAGE_SIZE}&search=${q}`
    const cached = get<PagedResult>(cacheKey)
    if (cached) { setCustomers(cached.data); setTotal(cached.total); setLoading(false); return }
    setLoading(true)
    try {
      const { data } = await apiClient.get<PagedResult>(`/invoice/customers?page=${p}&limit=${PAGE_SIZE}&search=${encodeURIComponent(q)}`)
      set(cacheKey, data)
      setCustomers(data.data)
      setTotal(data.total)
    } catch (err) {
      showToast('error', getApiError(err, 'Failed to load customers'))
    } finally {
      setLoading(false)
    }
  }, [get, set, showToast])

  useEffect(() => { fetchPage(page, search) }, [page])

  // Debounce search — reset to page 1
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      fetchPage(1, search)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const paginated = customers

  const openAdd = (): void => {
    setEditCustomer(null)
    setForm(EMPTY_FORM)
    setShipSame(true)
    setModalOpen(true)
    setTimeout(() => firstRef.current?.focus(), 50)
  }

  const openEdit = (c: Customer): void => {
    setEditCustomer(c)
    const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = c
    setForm(rest)
    setShipSame(!c.ship_to_name)
    setModalOpen(true)
    setTimeout(() => firstRef.current?.focus(), 50)
  }

  const handleChange = (field: keyof CustomerInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  const invalidateAndRefetch = (): void => {
    // Clear all customer page caches and refetch current page
    const { invalidate } = useQueryCache.getState()
    const keys = Object.keys(useQueryCache.getState().entries).filter((k) => k.startsWith('/invoice/customers?'))
    invalidate(...keys)
    fetchPage(page, search)
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
      invalidateAndRefetch()
    } catch (err) {
      showToast('error', getApiError(err, 'Save failed'))
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
      invalidateAndRefetch()
    } catch (err) {
      showToast('error', getApiError(err, 'Archive failed'))
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
              {loading && <TableSkeleton rows={PAGE_SIZE} cols={5} />}
              {!loading && paginated.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-text-secondary py-10">
                    {search ? `No customers match "${search}"` : 'No customers yet. Click "Add Customer" to add one.'}
                  </td>
                </tr>
              )}
              {!loading && paginated.map((c) => (
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
          {loading ? 'Loading...' : total === 0
            ? 'No customers'
            : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`}
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
          {/* Bill To */}
          <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide pt-1">Bill To (Buyer)</div>
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
          {/* Ship To */}
          <div className="flex items-center justify-between border-t border-border pt-3 mt-1">
            <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Ship To (Consignee)</div>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer text-text-secondary">
              <input
                type="checkbox"
                checked={shipSame}
                onChange={(e) => {
                  setShipSame(e.target.checked)
                  if (e.target.checked) {
                    setForm((f) => ({ ...f, ship_to_name: '', ship_to_address: '', ship_to_city: '', ship_to_state: '', ship_to_state_code: '', ship_to_pincode: '', ship_to_gstin: '' }))
                  }
                }}
                className="w-3 h-3"
              />
              Same as Bill To
            </label>
          </div>
          {shipSame ? (
            <p className="text-xs text-text-secondary -mt-2">Ship To will mirror Bill To on invoices.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              <Input label="Ship To Name" value={form.ship_to_name} onChange={handleChange('ship_to_name')} placeholder="Delivery location name" />
              <Input label="Ship To Address" value={form.ship_to_address} onChange={handleChange('ship_to_address')} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="City" value={form.ship_to_city} onChange={handleChange('ship_to_city')} />
                <Input label="State" value={form.ship_to_state} onChange={handleChange('ship_to_state')} />
                <Input label="State Code" value={form.ship_to_state_code} onChange={handleChange('ship_to_state_code')} />
                <Input label="Pincode" value={form.ship_to_pincode} onChange={handleChange('ship_to_pincode')} />
                <Input label="GSTIN" value={form.ship_to_gstin} onChange={handleChange('ship_to_gstin')} />
              </div>
            </div>
          )}
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
