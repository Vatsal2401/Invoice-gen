import React, { useEffect, useState } from 'react'
import { CashbookCategoryFilter, CashbookResponse } from '../../types'
import apiClient from '../../lib/apiClient'
import { useQueryCache } from '../../store/useQueryCache'
import CashBookKPIStrip from './CashBookKPIStrip'
import CashBookFilters from './CashBookFilters'
import CashBookTable from './CashBookTable'

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
  const [data, setData] = useState<CashbookResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const { get, set } = useQueryCache()

  useEffect(() => {
    if (!from || !to) return
    const key = `/invoice/khata/cashbook?from=${from}&to=${to}&category=${category}`
    const cached = get<CashbookResponse>(key)
    if (cached) {
      setData(cached)
      setLoading(false)
      return
    }
    setLoading(true)
    const params = new URLSearchParams({ from, to })
    if (category !== 'ALL') params.set('category', category)
    apiClient
      .get<CashbookResponse>(`/invoice/khata/cashbook?${params}`)
      .then(res => {
        setData(res.data)
        set(key, res.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [from, to, category])

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
      <CashBookKPIStrip kpis={data?.kpis ?? null} loading={loading} />
      <CashBookFilters
        from={from}
        to={to}
        category={category}
        onFromChange={setFrom}
        onToChange={setTo}
        onCategoryChange={setCategory}
      />
      <CashBookTable entries={loading ? [] : (data?.entries ?? [])} />
      {loading && (
        <div className="text-center py-8 text-text-secondary text-sm">Loading…</div>
      )}
    </div>
  )
}
