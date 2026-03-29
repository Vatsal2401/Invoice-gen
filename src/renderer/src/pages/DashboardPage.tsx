import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, AlertCircle, Clock, Plus, ArrowRight, RefreshCw } from 'lucide-react'
import type { InvoiceSummary } from '../types'
import { formatCurrencyWithSymbol } from '../utils/formatCurrency'
import Button from '../components/ui/Button'
import { KPISkeleton, TableSkeleton } from '../components/ui/Skeleton'
import apiClient from '../lib/apiClient'
import { useQueryCache } from '../store/useQueryCache'

interface DashboardData {
  this_month_revenue: number
  outstanding_balance: number
  draft_count: number
  recent_invoices: InvoiceSummary[]
}

function fmtDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d} ${months[parseInt(m) - 1]} ${y}`
}

function KPICard({
  label, value, sub, icon: Icon, accent,
}: { label: string; value: string; sub?: string; icon: React.ElementType; accent: string }): React.ReactElement {
  return (
    <div className={`bg-bg-card rounded-lg border border-border px-5 py-4 flex items-center gap-4 flex-1 min-w-0 border-l-4 ${accent}`}>
      <Icon size={20} className="text-text-secondary flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-xs text-text-secondary truncate">{label}</div>
        <div className="text-lg font-bold text-text-primary tabular-nums leading-tight">{value}</div>
        {sub && <div className="text-xs text-text-secondary mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

function StatusBadge({ inv }: { inv: InvoiceSummary }): React.ReactElement {
  if (inv.cancelled) return <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Cancelled</span>
  if (inv.status === 'FINAL') return <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Final</span>
  return <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">Draft</span>
}

export default function DashboardPage(): React.ReactElement {
  const navigate = useNavigate()
  const { get, set, invalidate } = useQueryCache()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (forceRefresh = false) => {
    const cacheKey = '/invoice/invoices/dashboard'
    if (forceRefresh) invalidate(cacheKey)
    const cached = !forceRefresh ? get<DashboardData>(cacheKey) : null
    if (cached) { setData(cached); setLoading(false); return }
    if (!forceRefresh) setLoading(true)
    else setRefreshing(true)
    try {
      const { data: d } = await apiClient.get<DashboardData>(cacheKey)
      set(cacheKey, d)
      setData(d)
    } catch { /* ignore */ } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [get, set, invalidate])

  useEffect(() => { load() }, [load])

  const now = new Date()
  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-border flex-shrink-0">
        <h1 className="text-xl font-bold text-text-primary">Dashboard</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="p-1.5 rounded hover:bg-gray-100 text-text-secondary hover:text-text-primary transition-colors disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <Button size="sm" onClick={() => navigate('/invoices/new')}><Plus size={14} /> New Invoice</Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 flex flex-col gap-6">
        {/* KPI strip */}
        {loading ? (
          <div className="flex gap-4">
            <KPISkeleton /><KPISkeleton /><KPISkeleton />
          </div>
        ) : data ? (
          <div className="flex gap-4">
            <KPICard
              label={`Revenue — ${monthName}`}
              value={formatCurrencyWithSymbol(data.this_month_revenue)}
              sub="Finalized invoices this month"
              icon={TrendingUp}
              accent="border-l-green-500"
            />
            <KPICard
              label="Outstanding Balance"
              value={formatCurrencyWithSymbol(data.outstanding_balance)}
              sub="Total value of draft invoices"
              icon={AlertCircle}
              accent="border-l-amber-400"
            />
            <KPICard
              label="Draft Invoices"
              value={String(data.draft_count)}
              sub={data.draft_count === 1 ? '1 invoice pending' : `${data.draft_count} invoices pending`}
              icon={Clock}
              accent="border-l-warning"
            />
          </div>
        ) : null}

        {/* Recent Invoices */}
        <div className="bg-bg-card rounded-lg border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-text-primary">Recent Invoices</h2>
            <button
              onClick={() => navigate('/history')}
              className="flex items-center gap-1 text-xs text-accent hover:underline"
            >
              View All <ArrowRight size={12} />
            </button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-border">
              <tr>
                {['Invoice No.', 'Customer', 'Date', 'Amount', 'Status'].map((h) => (
                  <th key={h} scope="col" className="text-xs font-semibold uppercase tracking-wide text-text-secondary px-4 py-2 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <TableSkeleton rows={5} cols={5} />}
              {!loading && (!data || data.recent_invoices.length === 0) && (
                <tr>
                  <td colSpan={5} className="text-center text-text-secondary py-10">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-2xl">📄</span>
                      <span className="font-medium text-text-primary">No invoices yet</span>
                      <span className="text-xs">Create your first invoice to get started</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && data?.recent_invoices.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => navigate(`/invoices/${inv.id}/preview`)}
                  className={`border-b border-border hover:bg-blue-50/40 transition-colors cursor-pointer ${inv.cancelled ? 'opacity-60' : ''}`}
                >
                  <td className="px-4 py-2.5 font-mono text-xs font-medium text-accent">
                    {inv.cancelled ? <s>{inv.invoice_number}</s> : inv.invoice_number}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-text-primary truncate max-w-[160px]">{inv.buyer_name}</div>
                    {inv.buyer_gstin && <div className="text-xs font-mono text-text-secondary">{inv.buyer_gstin}</div>}
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary text-xs whitespace-nowrap">{fmtDate(inv.invoice_date)}</td>
                  <td className={`px-4 py-2.5 tabular-nums font-semibold ${inv.cancelled ? 'text-text-secondary' : inv.status === 'FINAL' ? 'text-green-700' : 'text-amber-700'}`}>
                    {formatCurrencyWithSymbol(Number(inv.grand_total))}
                  </td>
                  <td className="px-4 py-2.5"><StatusBadge inv={inv} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
