import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, FileDown, XCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import type { InvoiceSummary, StatusFilter } from '../../types'
import { useStore } from '../../store/useStore'
import { formatCurrencyWithSymbol } from '../../utils/formatCurrency'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import DateRangePicker from '../ui/DateRangePicker'
import { TableSkeleton } from '../ui/Skeleton'
import StatusFilterPills from './StatusFilterPills'
import apiClient from '../../lib/apiClient'
import { getApiError } from '../../lib/apiError'
import { useQueryCache } from '../../store/useQueryCache'

const PAGE_SIZE = 17

interface PagedResult { data: InvoiceSummary[]; total: number; page: number; limit: number }

function fmtDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${d}-${months[parseInt(m) - 1]}-${y}`
}

interface Props {
  customerId?: string
  buyerName?: string
  from?: string
  to?: string
  onFromChange?: (v: string) => void
  onToChange?: (v: string) => void
}

function fiscalYear(): { from: string; to: string } {
  const now = new Date()
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  return { from: `${year}-04-01`, to: `${year + 1}-03-31` }
}

export default function AllInvoicesView({
  customerId,
  buyerName,
  from: fromProp,
  to: toProp,
  onFromChange,
  onToChange,
}: Props): React.ReactElement {
  const navigate = useNavigate()
  const { showToast } = useStore()
  const { get, set } = useQueryCache()
  const fy = fiscalYear()
  // Controlled if parent provides; otherwise local state seeded from current FY.
  const [fromLocal, setFromLocal] = useState(fy.from)
  const [toLocal, setToLocal] = useState(fy.to)
  const from = fromProp ?? fromLocal
  const to = toProp ?? toLocal
  const setFrom = onFromChange ?? setFromLocal
  const setTo = onToChange ?? setToLocal

  const [invoices, setInvoices] = useState<InvoiceSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [loading, setLoading] = useState(true)
  const [cancelTarget, setCancelTarget] = useState<InvoiceSummary | null>(null)
  const [exportLoading, setExportLoading] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const buildUrl = useCallback((p: number, q: string, sf: StatusFilter, f: string, t: string) => {
    let url = `/invoice/invoices?page=${p}&limit=${PAGE_SIZE}&search=${encodeURIComponent(q)}`
    if (customerId) url += `&customerId=${customerId}`
    if (buyerName) url += `&buyerName=${encodeURIComponent(buyerName)}`
    if (sf !== 'ALL') url += `&status=${sf}`
    if (f) url += `&from=${f}`
    if (t) url += `&to=${t}`
    return url
  }, [customerId, buyerName])

  const fetchPage = useCallback(async (p: number, q: string, sf: StatusFilter, f: string, t: string) => {
    const url = buildUrl(p, q, sf, f, t)
    const cacheKey = url
    const cached = get<PagedResult>(cacheKey)
    if (cached) { setInvoices(cached.data); setTotal(cached.total); setLoading(false); return }
    setLoading(true)
    try {
      const { data } = await apiClient.get<PagedResult>(url)
      set(cacheKey, data)
      setInvoices(data.data)
      setTotal(data.total)
    } catch (err) {
      showToast('error', getApiError(err, 'Failed to load invoices'))
    } finally {
      setLoading(false)
    }
  }, [get, set, showToast, buildUrl])

  useEffect(() => { fetchPage(page, search, statusFilter, from, to) }, [page])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setPage(1); fetchPage(1, search, statusFilter, from, to) }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  useEffect(() => { setPage(1); fetchPage(1, search, statusFilter, from, to) }, [statusFilter])
  useEffect(() => { setPage(1); fetchPage(1, search, statusFilter, from, to) }, [from, to])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const handleExport = async (inv: InvoiceSummary): Promise<void> => {
    setExportLoading(inv.id)
    const res = await window.api.exportPDF(inv.id)
    setExportLoading(null)
    if (res.success) showToast('success', 'PDF exported')
    else if (res.message !== 'Export cancelled') showToast('error', res.message || 'Export failed')
  }

  const invalidateAndRefetch = (): void => {
    const { invalidate } = useQueryCache.getState()
    const keys = Object.keys(useQueryCache.getState().entries).filter(
      (k) => k.startsWith('/invoice/invoices?') || k.startsWith('/invoice/invoices/stats') || k === '/invoice/invoices/customer-summary' || k === '/invoice/invoices/dashboard'
    )
    invalidate(...keys)
    fetchPage(page, search, statusFilter, from, to)
  }

  const handleCancel = async (): Promise<void> => {
    if (!cancelTarget) return
    try {
      await apiClient.delete(`/invoice/invoices/${cancelTarget.id}`)
      showToast('success', 'Invoice deleted')
      setCancelTarget(null)
      invalidateAndRefetch()
    } catch (err) {
      showToast('error', getApiError(err, 'Delete failed'))
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-2.5 bg-white border-b border-border flex-shrink-0 flex-wrap">
        <StatusFilterPills value={statusFilter} onChange={(v) => { setStatusFilter(v) }} />
        <div className="w-px h-6 bg-border" />
        <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
        <div className="flex-1" />
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search invoice or customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-border rounded-md pl-8 pr-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        {search && (
          <button onClick={() => setSearch('')} className="text-xs text-text-secondary hover:text-text-primary">Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-4 pb-0">
        <div className="bg-bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b-2 border-border">
              <tr>
                {['Invoice No.', 'Date', 'Customer', 'Amount', 'Status', 'Actions'].map((h) => (
                  <th key={h} scope="col" className="text-xs font-semibold uppercase tracking-wide text-text-secondary px-3 py-2 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <TableSkeleton rows={PAGE_SIZE} cols={6} />}
              {!loading && invoices.length === 0 && (
                <tr><td colSpan={6} className="text-center text-text-secondary py-12">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-2xl">📄</span>
                    <span className="font-medium text-text-primary">No invoices found</span>
                    <span className="text-xs">{search ? `No results for "${search}"` : 'No invoices match the selected filter'}</span>
                  </div>
                </td></tr>
              )}
              {!loading && invoices.map((inv) => (
                <tr key={inv.id} className={`border-b border-border hover:bg-blue-50/40 transition-colors ${inv.cancelled ? 'opacity-60' : ''}`}>
                  <td className="px-3 py-2">
                    <span
                      className="font-medium cursor-pointer hover:text-accent hover:underline"
                      onClick={() => navigate(`/invoices/${inv.id}/preview`)}
                    >
                      <span className={inv.cancelled ? 'line-through' : ''}>{inv.invoice_number}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-text-secondary text-xs whitespace-nowrap">{fmtDate(inv.invoice_date)}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium leading-tight">{inv.buyer_name}</div>
                    {inv.buyer_gstin && <div className="text-xs text-text-secondary font-mono">{inv.buyer_gstin}</div>}
                  </td>
                  <td className={`px-3 py-2 tabular-nums font-mono text-right text-sm font-medium ${inv.cancelled ? 'text-text-secondary' : inv.status === 'FINAL' ? 'text-green-700' : 'text-warning'}`}>
                    {formatCurrencyWithSymbol(Number(inv.grand_total) || 0)}
                  </td>
                  <td className="px-3 py-2">
                    {inv.cancelled
                      ? <span className="text-xs font-medium px-2 py-0.5 rounded bg-red-100 text-red-700">CANCELLED</span>
                      : <span className={`text-xs font-medium px-2 py-0.5 rounded ${inv.status === 'FINAL' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{inv.status}</span>
                    }
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" title="View" onClick={() => navigate(`/invoices/${inv.id}/preview`)}><Eye size={13} /> View</Button>
                      <Button variant="ghost" size="sm" title="Export PDF" loading={exportLoading === inv.id} onClick={() => handleExport(inv)}><FileDown size={13} /> PDF</Button>
                      <Button variant="ghost" size="sm" className="text-danger hover:bg-red-50" title="Delete" onClick={() => setCancelTarget(inv)}>
                        <XCircle size={13} /> Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination footer */}
      <div className="flex-shrink-0 border-t border-border bg-white px-6 py-2 flex items-center justify-between text-sm text-text-secondary">
        <span>
          {loading ? 'Loading…' : total === 0
            ? 'No invoices'
            : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronLeft size={16} /></button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i
              return <button key={p} onClick={() => setPage(p)} className={`w-7 h-7 rounded text-xs font-medium ${p === page ? 'bg-accent text-white' : 'hover:bg-gray-100'}`}>{p}</button>
            })}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronRight size={16} /></button>
          </div>
        )}
      </div>

      <Modal open={!!cancelTarget} title="Delete Invoice" onClose={() => setCancelTarget(null)}
        footer={<><Button variant="secondary" onClick={() => setCancelTarget(null)}>No, Keep It</Button><Button variant="danger" onClick={handleCancel}>Yes, Delete</Button></>}>
        <p className="text-sm">Permanently delete invoice <strong>{cancelTarget?.invoice_number}</strong>? This cannot be undone.</p>
      </Modal>
    </div>
  )
}
