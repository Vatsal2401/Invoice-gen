import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Pencil, Archive, Search, ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Users } from 'lucide-react'
import type { Party, PartyInput, PartyStats, PartyType } from '../../types'
import { useStore } from '../../store/useStore'
import { formatCurrencyWithSymbol } from '../../utils/formatCurrency'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Modal from '../ui/Modal'
import { TableSkeleton, KPISkeleton } from '../ui/Skeleton'
import apiClient from '../../lib/apiClient'
import { getApiError } from '../../lib/apiError'
import { useQueryCache } from '../../store/useQueryCache'

const PAGE_SIZE = 17
const PARTY_TYPES: { value: PartyType; label: string; color: string }[] = [
  { value: 'SUPPLIER',  label: 'Supplier',  color: 'bg-orange-100 text-orange-700' },
  { value: 'TRANSPORT', label: 'Transport', color: 'bg-purple-100 text-purple-700' },
  { value: 'LABOUR',    label: 'Labour',    color: 'bg-yellow-100 text-yellow-700' },
  { value: 'OTHER',     label: 'Other',     color: 'bg-gray-100 text-gray-600' },
]

const EMPTY_FORM: PartyInput = {
  name: '', type: 'SUPPLIER', phone: '', address: '', gstin: '', notes: '', opening_balance: 0,
}

interface PagedResult {
  data: (Party & { current_balance: number; last_entry_date: string | null })[]
  total: number; page: number; limit: number
}

function TypeBadge({ type }: { type: PartyType }): React.ReactElement {
  const t = PARTY_TYPES.find((p) => p.value === type)
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${t?.color ?? 'bg-gray-100 text-gray-600'}`}>{t?.label ?? type}</span>
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d} ${months[parseInt(m) - 1]} ${y}`
}

export interface AccountsViewHandle {
  openAdd: () => void
  refresh: () => void
}

const AccountsView = forwardRef<AccountsViewHandle>((_, ref) => {
  const navigate = useNavigate()
  const { showToast } = useStore()
  const { get, set } = useQueryCache()

  const [parties, setParties] = useState<(Party & { current_balance: number; last_entry_date: string | null })[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<PartyStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [editParty, setEditParty] = useState<Party | null>(null)
  const [form, setForm] = useState<PartyInput>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [archiveConfirm, setArchiveConfirm] = useState<Party | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firstRef = useRef<HTMLInputElement>(null)
  const searchFetchedRef = useRef(false)

  useEffect(() => {
    apiClient.get<PartyStats>('/invoice/parties/stats')
      .then(({ data }) => setStats(data))
      .catch(() => {})
      .finally(() => setStatsLoading(false))
  }, [])

  const fetchPage = useCallback(async (p: number, q: string, t: string) => {
    const cacheKey = `/invoice/parties?page=${p}&limit=${PAGE_SIZE}&search=${q}&type=${t}`
    const cached = get<PagedResult>(cacheKey)
    if (cached) { setParties(cached.data); setTotal(cached.total); setLoading(false); return }
    setLoading(true)
    try {
      const { data } = await apiClient.get<PagedResult>(
        `/invoice/parties?page=${p}&limit=${PAGE_SIZE}&search=${encodeURIComponent(q)}&type=${t}`
      )
      set(cacheKey, data)
      setParties(data.data)
      setTotal(data.total)
    } catch (err) {
      showToast('error', getApiError(err, 'Failed to load accounts'))
    } finally {
      setLoading(false)
    }
  }, [get, set, showToast])

  useEffect(() => {
    if (searchFetchedRef.current) { searchFetchedRef.current = false; return }
    fetchPage(page, search, typeFilter)
  }, [page, typeFilter])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      searchFetchedRef.current = true
      setPage(1)
      fetchPage(1, search, typeFilter)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  const invalidateAndRefetch = (): void => {
    const { invalidate } = useQueryCache.getState()
    const keys = Object.keys(useQueryCache.getState().entries).filter((k) => k.startsWith('/invoice/parties?'))
    invalidate(...keys)
    fetchPage(page, search, typeFilter)
  }

  const openAdd = (): void => {
    setEditParty(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
    setTimeout(() => firstRef.current?.focus(), 50)
  }

  const refresh = (): void => {
    const { invalidate } = useQueryCache.getState()
    const keys = Object.keys(useQueryCache.getState().entries).filter(k => k.startsWith('/invoice/parties'))
    invalidate(...keys)
    setStatsLoading(true)
    apiClient.get<PartyStats>('/invoice/parties/stats')
      .then(({ data }) => setStats(data))
      .catch(() => {})
      .finally(() => setStatsLoading(false))
    fetchPage(page, search, typeFilter)
  }

  useImperativeHandle(ref, () => ({ openAdd, refresh }))

  const openEdit = (p: Party): void => {
    setEditParty(p)
    const { id: _id, user_id: _uid, current_balance: _cb, last_entry_date: _led, created_at: _ca, updated_at: _ua, ...rest } = p as any
    setForm({ ...EMPTY_FORM, ...rest })
    setModalOpen(true)
    setTimeout(() => firstRef.current?.focus(), 50)
  }

  const handleSave = async (): Promise<void> => {
    if (!form.name.trim()) { showToast('error', 'Account name is required'); return }
    setSaving(true)
    try {
      if (editParty) {
        await apiClient.patch(`/invoice/parties/${editParty.id}`, form)
        showToast('success', 'Account updated')
      } else {
        await apiClient.post('/invoice/parties', form)
        showToast('success', 'Account added')
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
      await apiClient.delete(`/invoice/parties/${archiveConfirm.id}`)
      showToast('success', 'Account archived')
      setArchiveConfirm(null)
      invalidateAndRefetch()
    } catch (err) {
      showToast('error', getApiError(err, 'Archive failed'))
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* KPI Strip */}
      <div className="flex gap-4 px-6 py-3 bg-bg-base border-b border-border flex-shrink-0">
        {statsLoading ? (
          <><KPISkeleton /><KPISkeleton /><KPISkeleton /></>
        ) : stats ? (
          <>
            <div className="bg-bg-card rounded-lg border border-border border-l-4 border-l-red-500 px-4 py-2.5 flex items-center gap-3 flex-1">
              <TrendingDown size={18} className="text-text-secondary flex-shrink-0" />
              <div>
                <div className="text-xs text-text-secondary">Receivable (they owe you)</div>
                <div className="text-base font-bold text-red-700 tabular-nums">{formatCurrencyWithSymbol(stats.total_receivable)}</div>
              </div>
            </div>
            <div className="bg-bg-card rounded-lg border border-border border-l-4 border-l-green-500 px-4 py-2.5 flex items-center gap-3 flex-1">
              <TrendingUp size={18} className="text-text-secondary flex-shrink-0" />
              <div>
                <div className="text-xs text-text-secondary">Payable (you owe them)</div>
                <div className="text-base font-bold text-green-700 tabular-nums">{formatCurrencyWithSymbol(stats.total_payable)}</div>
              </div>
            </div>
            <div className="bg-bg-card rounded-lg border border-border border-l-4 border-l-accent px-4 py-2.5 flex items-center gap-3 flex-1">
              <Users size={18} className="text-text-secondary flex-shrink-0" />
              <div>
                <div className="text-xs text-text-secondary">Total Accounts</div>
                <div className="text-base font-bold text-text-primary">{stats.total_parties}</div>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-2.5 bg-white border-b border-border flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-1 flex-wrap">
          {[{ value: '', label: `All (${total})` }, ...PARTY_TYPES.map((t) => ({ value: t.value, label: t.label }))].map((f) => (
            <button
              key={f.value}
              onClick={() => { setTypeFilter(f.value); setPage(1) }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${typeFilter === f.value ? 'bg-accent text-white' : 'bg-gray-100 text-text-secondary hover:bg-gray-200'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Search accounts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-border rounded-md pl-8 pr-3 py-1.5 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        {search && <button onClick={() => setSearch('')} className="text-xs text-text-secondary hover:text-text-primary">Clear</button>}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6 pb-0">
        <div className="bg-bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b-2 border-border">
              <tr>
                {['Account Name', 'Type', 'Phone', 'Balance', 'Last Entry', 'Actions'].map((h) => (
                  <th key={h} scope="col" className="text-xs font-semibold uppercase tracking-wide text-text-secondary px-3 py-2.5 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <TableSkeleton rows={PAGE_SIZE} cols={6} />}
              {!loading && parties.length === 0 && (
                <tr><td colSpan={6} className="text-center text-text-secondary py-10">
                  {search ? `No accounts match "${search}"` : 'No accounts yet. Click "Add Account" to add one.'}
                </td></tr>
              )}
              {!loading && parties.map((p) => {
                const bal = Number(p.current_balance ?? p.opening_balance)
                const isReceivable = bal > 0
                return (
                  <tr key={p.id} className="border-b border-border hover:bg-gray-50">
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-text-primary">{p.name}</div>
                      {p.address && <div className="text-xs text-text-secondary truncate max-w-[200px]">{p.address}</div>}
                    </td>
                    <td className="px-3 py-2.5"><TypeBadge type={p.type} /></td>
                    <td className="px-3 py-2.5 text-text-secondary">{p.phone || '—'}</td>
                    <td className="px-3 py-2.5">
                      {bal === 0
                        ? <span className="text-xs text-green-700 font-medium">Settled</span>
                        : <span className={`tabular-nums font-semibold ${isReceivable ? 'text-red-700' : 'text-green-700'}`}>
                            {formatCurrencyWithSymbol(Math.abs(bal))}
                            <span className="text-xs font-normal text-text-secondary ml-1">{isReceivable ? 'Dr' : 'Cr'}</span>
                          </span>
                      }
                    </td>
                    <td className="px-3 py-2.5 text-text-secondary text-xs">{fmtDate(p.last_entry_date)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/khata/${p.id}/ledger`)}><BookOpen size={13} /> Ledger</Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Pencil size={13} /> Edit</Button>
                        <Button variant="ghost" size="sm" className="text-danger hover:bg-red-50" onClick={() => setArchiveConfirm(p)}><Archive size={13} /> Archive</Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex-shrink-0 border-t border-border bg-white px-6 py-2 flex items-center justify-between text-sm text-text-secondary">
        <span>{loading ? 'Loading…' : total === 0 ? 'No accounts' : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`}</span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronLeft size={16} /></button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const pg = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i
              return <button key={pg} onClick={() => setPage(pg)} className={`w-7 h-7 rounded text-xs font-medium ${pg === page ? 'bg-accent text-white' : 'hover:bg-gray-100'}`}>{pg}</button>
            })}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronRight size={16} /></button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} title={editParty ? 'Edit Account' : 'Add Account'} onClose={() => setModalOpen(false)}
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSave} loading={saving}>Save</Button></>}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Account Type *</label>
            <div className="grid grid-cols-4 gap-2">
              {PARTY_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: t.value }))}
                  className={`py-2 px-3 rounded-lg border-2 text-xs font-medium transition-colors ${form.type === t.value ? 'border-accent bg-blue-50 text-accent' : 'border-border text-text-secondary hover:border-gray-400'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <Input ref={firstRef} label="Name *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            <Input label="Opening Balance (₹)" type="number" value={String(form.opening_balance || '')} onChange={(e) => setForm((f) => ({ ...f, opening_balance: parseFloat(e.target.value) || 0 }))} />
          </div>
          <Input label="Address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          {form.type === 'SUPPLIER' && (
            <Input label="GSTIN (optional)" value={form.gstin} onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value }))} />
          )}
          <Input label="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="e.g. Primary marble supplier from Rajasthan" />
        </div>
      </Modal>

      {/* Archive Confirm */}
      <Modal open={!!archiveConfirm} title="Archive Account" onClose={() => setArchiveConfirm(null)}
        footer={<><Button variant="secondary" onClick={() => setArchiveConfirm(null)}>Cancel</Button><Button variant="danger" onClick={handleArchive}>Archive</Button></>}>
        <p>Archive <strong>{archiveConfirm?.name}</strong>? Their ledger entries will be preserved.</p>
      </Modal>
    </div>
  )
})

AccountsView.displayName = 'AccountsView'
export default AccountsView
