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
        const netThisPage = res.data.entries.reduce((s, e) => s + e.credit - e.debit, 0)
        setPageStartBalances(prev => {
          const next = [...prev]
          if (next[p - 1] === undefined) next[p - 1] = startBal
          next[p] = startBal + netThisPage
          return next
        })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const prev = prevFilters.current
    if (prev.from !== from || prev.to !== to || prev.category !== category) {
      prevFilters.current = { from, to, category }
      setPage(1)
      setPageStartBalances([0])
      fetchPage(1, from, to, category, 0)
    }
  }, [from, to, category])

  useEffect(() => {
    const startBal = pageStartBalances[page - 1] ?? 0
    fetchPage(page, from, to, category, startBal)
  }, [page])

  useEffect(() => {
    fetchPage(1, from, to, category, 0)
  }, [])

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const startBal = pageStartBalances[page - 1] ?? 0

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Fixed top: KPIs + Filters */}
      <div className="flex-shrink-0 px-6 pt-4 pb-3 flex flex-col gap-3 bg-bg-base border-b border-border">
        <CashBookKPIStrip kpis={data?.kpis ?? null} loading={loading} />
        <CashBookFilters
          from={from}
          to={to}
          category={category}
          onFromChange={setFrom}
          onToChange={setTo}
          onCategoryChange={setCategory}
        />
      </div>

      {/* Scrollable table area */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {loading
          ? <div className="bg-bg-card border border-border rounded-lg flex items-center justify-center py-16 text-text-secondary text-sm">Loading…</div>
          : <CashBookTable entries={data?.entries ?? []} pageStartBalance={startBal} />
        }
      </div>

      {/* Pinned pagination footer */}
      <div className="flex-shrink-0 border-t border-border bg-white px-6 py-2 flex items-center justify-between text-sm text-text-secondary">
        <span>
          {loading ? 'Loading…' : total === 0
            ? 'No transactions found'
            : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total} transactions`
          }
        </span>
        {totalPages > 1 && (
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
        )}
      </div>
    </div>
  )
}
