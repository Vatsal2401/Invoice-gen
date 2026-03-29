import React from 'react'
import { FileText, TrendingUp, CheckCircle, Clock } from 'lucide-react'
import type { InvoiceStats } from '../../types'
import { formatCurrencyWithSymbol } from '../../utils/formatCurrency'
import { KPISkeleton } from '../ui/Skeleton'

interface Props {
  stats: InvoiceStats | undefined
  loading: boolean
}

function KPICard({
  label, value, icon: Icon, accent,
}: { label: string; value: string; icon: React.ElementType; accent: string }): React.ReactElement {
  return (
    <div className={`bg-bg-card rounded-lg border border-border px-4 py-3 flex items-center gap-3 flex-1 min-w-0 border-l-4 ${accent}`}>
      <Icon size={18} className="text-text-secondary flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-xs text-text-secondary truncate">{label}</div>
        <div className="text-sm font-semibold text-text-primary tabular-nums">{value}</div>
      </div>
    </div>
  )
}

export default function HistoryKPIStrip({ stats, loading }: Props): React.ReactElement {
  if (loading) {
    return (
      <div className="flex gap-3 px-6 py-3 bg-bg-base border-b border-border flex-shrink-0">
        <KPISkeleton /><KPISkeleton /><KPISkeleton /><KPISkeleton />
      </div>
    )
  }
  if (!stats) return <></>

  return (
    <div className="flex gap-3 px-6 py-3 bg-bg-base border-b border-border flex-shrink-0">
      <KPICard label="Total Invoices" value={String(stats.total_invoices)} icon={FileText} accent="border-l-accent" />
      <KPICard label="Total Revenue" value={formatCurrencyWithSymbol(Number(stats.total_revenue))} icon={TrendingUp} accent="border-l-green-500" />
      <KPICard label="Finalized" value={String(stats.final_count)} icon={CheckCircle} accent="border-l-green-400" />
      <KPICard label="Drafts" value={`${stats.draft_count}${stats.cancelled_count > 0 ? ` · ${stats.cancelled_count} cancelled` : ''}`} icon={Clock} accent="border-l-warning" />
    </div>
  )
}
