import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, BookOpen, FilePlus, ChevronRight, ChevronLeft } from 'lucide-react'
import type { CustomerInvoiceSummary } from '../../types'
import { useStore } from '../../store/useStore'
import { formatCurrencyWithSymbol } from '../../utils/formatCurrency'
import Button from '../ui/Button'
import { KPISkeleton } from '../ui/Skeleton'
import CustomerAvatarBadge from './CustomerAvatarBadge'
import apiClient from '../../lib/apiClient'
import { getApiError } from '../../lib/apiError'
import { useQueryCache } from '../../store/useQueryCache'

const PAGE_SIZE = 10

type SortKey = 'revenue' | 'name' | 'recent'

function fmtDate(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${d} ${months[parseInt(m) - 1]} ${y}`
}

interface Props {
  onSelectCustomer: (c: CustomerInvoiceSummary) => void
}

export default function CustomerSummaryView({ onSelectCustomer }: Props): React.ReactElement {
  const navigate = useNavigate()
  const { showToast } = useStore()
  const { get, set } = useQueryCache()
  const [customers, setCustomers] = useState<CustomerInvoiceSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('recent')
  const [page, setPage] = useState(1)

  const fetch = useCallback(async () => {
    const cacheKey = '/invoice/invoices/customer-summary'
    const cached = get<CustomerInvoiceSummary[]>(cacheKey)
    if (cached) { setCustomers(cached); setLoading(false); return }
    setLoading(true)
    try {
      const { data } = await apiClient.get<CustomerInvoiceSummary[]>(cacheKey)
      set(cacheKey, data)
      setCustomers(data)
    } catch (err) {
      showToast('error', getApiError(err, 'Failed to load customers'))
    } finally {
      setLoading(false)
    }
  }, [get, set, showToast])

  useEffect(() => { fetch() }, [fetch])
  useEffect(() => { setPage(1) }, [search, sort])

  const filtered = customers
    .filter((c) => c.customer_name.toLowerCase().includes(search.toLowerCase()) || c.gstin?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'revenue') return Number(b.total_revenue) - Number(a.total_revenue)
      if (sort === 'name') return a.customer_name.localeCompare(b.customer_name)
      return (b.last_invoice_date || '').localeCompare(a.last_invoice_date || '')
    })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-2.5 bg-white border-b border-border flex-shrink-0">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Search customers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-border rounded-md pl-8 pr-3 py-1.5 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 text-sm text-text-secondary">
          <span className="text-xs">Sort:</span>
          {([['revenue', 'Revenue'], ['name', 'Name'], ['recent', 'Recent']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setSort(key)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${sort === key ? 'bg-accent text-white' : 'bg-gray-100 hover:bg-gray-200 text-text-secondary'}`}>
              {label}
            </button>
          ))}
        </div>
        {!loading && (
          <span className="text-xs text-text-secondary">
            {filtered.length} customer{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <KPISkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-text-secondary gap-2">
            <span className="text-2xl">👥</span>
            <span className="font-medium text-text-primary">No customers found</span>
            {search && <span className="text-xs">No results for "{search}"</span>}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {paginated.map((c, i) => (
              <CustomerCard key={`${c.customer_id ?? 'unlinked'}-${i}`} customer={c}
                onView={() => onSelectCustomer(c)}
                onLedger={() => c.customer_id ? navigate(`/customers/${c.customer_id}/ledger`) : undefined}
                onNewInvoice={() => c.customer_id ? navigate(`/invoices/new?customerId=${c.customer_id}`) : navigate('/invoices/new')}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination footer */}
      {!loading && totalPages > 1 && (
        <div className="flex-shrink-0 border-t border-border bg-white px-6 py-2 flex items-center justify-between text-sm text-text-secondary">
          <span className="text-xs">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-7 h-7 rounded text-xs font-medium ${p === page ? 'bg-accent text-white' : 'hover:bg-gray-100'}`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CustomerCard({ customer: c, onView, onLedger, onNewInvoice }: {
  customer: CustomerInvoiceSummary
  onView: () => void
  onLedger: () => void
  onNewInvoice: () => void
}): React.ReactElement {
  const hasLinkedLedger = !!c.customer_id

  return (
    <div className="bg-bg-card rounded-xl border border-border p-4 hover:border-accent/40 hover:shadow-md transition-all duration-200 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <CustomerAvatarBadge name={c.customer_name} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-text-primary truncate leading-tight">{c.customer_name}</div>
          {c.gstin ? (
            <div className="text-xs font-mono text-text-secondary mt-0.5">{c.gstin}</div>
          ) : (
            <div className="text-xs text-text-secondary mt-0.5 italic">No GSTIN</div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <div className="text-xs text-text-secondary">Revenue</div>
          <div className="text-sm font-semibold text-text-primary tabular-nums">{formatCurrencyWithSymbol(Number(c.total_revenue))}</div>
        </div>
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <div className="text-xs text-text-secondary">Invoices</div>
          <div className="text-sm font-semibold text-text-primary">{c.invoice_count}</div>
        </div>
      </div>

      {/* Status row */}
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>Last: {fmtDate(c.last_invoice_date)}</span>
        <div className="flex items-center gap-1.5">
          {c.draft_count > 0 && (
            <span className="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-medium">{c.draft_count} draft</span>
          )}
          {c.final_count > 0 && (
            <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-medium">{c.final_count} final</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-border">
        <Button variant="ghost" size="sm" className="flex-1 justify-center" onClick={onView}>
          View Invoices <ChevronRight size={12} />
        </Button>
        {hasLinkedLedger && (
          <Button variant="ghost" size="sm" title="View Ledger" onClick={onLedger}><BookOpen size={13} /></Button>
        )}
        <Button variant="ghost" size="sm" title="New Invoice" onClick={onNewInvoice}><FilePlus size={13} /></Button>
      </div>
    </div>
  )
}
