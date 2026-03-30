import React from 'react'
import { TrendingUp, TrendingDown, Wallet, Hash } from 'lucide-react'
import { CashbookKPIs } from '../../types'
import { formatCurrencyWithSymbol } from '../../utils/formatCurrency'
import { KPISkeleton } from '../ui/Skeleton'

interface Props {
  kpis: CashbookKPIs | null
  loading: boolean
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

export default function CashBookKPIStrip({ kpis, loading }: Props): React.ReactElement {
  if (loading || !kpis) {
    return (
      <div className="flex gap-3">
        {[0, 1, 2, 3].map(i => <KPISkeleton key={i} />)}
      </div>
    )
  }

  const netPositive = kpis.net_balance >= 0

  return (
    <div className="flex gap-3">
      <KPICard
        label="Total Income"
        value={formatCurrencyWithSymbol(kpis.total_income)}
        icon={TrendingUp}
        accent="border-l-green-500"
      />
      <KPICard
        label="Total Expenses"
        value={formatCurrencyWithSymbol(kpis.total_expense)}
        icon={TrendingDown}
        accent="border-l-red-500"
      />
      <KPICard
        label="Net Balance"
        value={formatCurrencyWithSymbol(Math.abs(kpis.net_balance))}
        sub={netPositive ? 'Surplus' : 'Deficit'}
        icon={Wallet}
        accent={netPositive ? 'border-l-blue-500' : 'border-l-amber-500'}
      />
      <KPICard
        label="Transactions"
        value={String(kpis.tx_count)}
        icon={Hash}
        accent="border-l-purple-500"
      />
    </div>
  )
}
