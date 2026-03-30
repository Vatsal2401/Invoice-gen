import React, { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { CashbookCategoryFilter, CashbookResponse } from '../../types'
import apiClient from '../../lib/apiClient'
import { useQueryCache } from '../../store/useQueryCache'
import CashBookKPIStrip from './CashBookKPIStrip'
import CashBookFilters from './CashBookFilters'
import CashBookTable from './CashBookTable'

const PAGE_SIZE = 15

function currentMonth(): { from: string; to: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate()
  return { from: `${y}-${m}-01`, to: `${y}-${m}-${String(lastDay).padStart(2, '0')}` }
}

export default function CashBookView(): React.ReactElement {
  const { from: defFrom, to: defTo } = currentMonth()
  const [from, setFrom] = useState(defFrom)
  const [to, setTo] = useState(defTo)
  const [category, setCategory] = useState<CashbookCategoryFilter>('ALL')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<CashbookResponse | null>(null)
  const [loading, setLoading] = useState(true)
  // pageStartBalance[n] = running balance before page n (0-indexed)
  const [pageStartBalances, setPageStartBalances] = useState<number[]>([0])
  const { get, set } = useQueryCache()
  const prevFilters = useRef({ from: defFrom, to: defTo, category: 'ALL' as CashbookCategoryFilter })

  const fetchPage = (p: number, f: string, t: string, cat: CashbookCategoryFilter, startBal: number) => {
    if (!f || !t) return
    const key = `/invoice/khata/cashbook?from=${f}&to=${t}&category=${cat}&page=${p}&limit=${PAGE_SIZE}`
    const cached = get<CashbookResponse>(key)
    if (cached) {
      setData(cached)
      setLoading(false)
      // ensure startBalances array is long enough
      setPageStartBalances(prev => {
        const next = [...prev]
        if (next[p - 1] === undefined) next[p - 1] = startBal
        return next
      })
      return
    }
    setLoading(true)
    const params = new URLSearchParams({ from: f, to: t, page: String(p), limit: String(PAGE_SIZE) })
    if (cat !== 'ALL') params.set('category', cat)
    apiClient
      .get<CashbookResponse>(`/invoice/khata/cashbook?${params}`)
      .then(res => {
        set(key, res.data)
        setData(res.data)
        // compute next page start balance from this page's entries
        const netThisPage = res.data.entries.reduce((s, e) => s + e.credit - e.debit, 0)
        setPageStartBalances(prev => {
          const next = [...prev]
          if (next[p - 1] === undefined) next[p - 1] = startBal
          next[p] = startBal + netThisPage  // balance before next page
          return next
        })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  // Reset page + balances when filters change
  useEffect(() => {
    const prev = prevFilters.current
    if (prev.from !== from || prev.to !== to || prev.category !== category) {
      prevFilters.current = { from, to, category }
      setPage(1)
      setPageStartBalances([0])
      fetchPage(1, from, to, category, 0)
    }
  }, [from, to, category])

  // Fetch when page changes (filters haven't changed)
  useEffect(() => {
    const startBal = pageStartBalances[page - 1] ?? 0
    fetchPage(page, from, to, category, startBal)
  }, [page])

  // Initial load
  useEffect(() => {
    fetchPage(1, from, to, category, 0)
  }, [])

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const startBal = pageStartBalances[page - 1] ?? 0

  const handleFromChange = (v: string) => setFrom(v)
  const handleToChange = (v: string) => setTo(v)
  const handleCategoryChange = (v: CashbookCategoryFilter) => setCategory(v)

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
      <CashBookKPIStrip kpis={data?.kpis ?? null} loading={loading} />

      <CashBookFilters
        from={from}
        to={to}
        category={category}
        onFromChange={handleFromChange}
        onToChange={handleToChange}
        onCategoryChange={handleCategoryChange}
      />

      {loading
        ? <div className="bg-bg-card border border-border rounded-lg flex items-center justify-center py-16 text-text-secondary text-sm">Loading…</div>
        : <CashBookTable entries={data?.entries ?? []} pageStartBalance={startBal} />
      }

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-text-secondary">
          <span>
            {total === 0 ? 'No transactions' : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total} transactions`}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded hover:bg-bg-muted disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const pg = totalPages <= 7 ? i + 1
                : page <= 4 ? i + 1
                : page >= totalPages - 3 ? totalPages - 6 + i
                : page - 3 + i
              return (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  className={`w-7 h-7 rounded text-xs font-medium ${pg === page ? 'bg-accent text-white' : 'hover:bg-bg-muted'}`}
                >
                  {pg}
                </button>
              )
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded hover:bg-bg-muted disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
      {!loading && total > 0 && totalPages === 1 && (
        <div className="text-sm text-text-secondary text-right">{total} transaction{total !== 1 ? 's' : ''}</div>
      )}
    </div>
  )
}
