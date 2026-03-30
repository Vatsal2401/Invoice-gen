import React from 'react'
import { useNavigate } from 'react-router-dom'
import { CashbookEntry } from '../../types'
import { formatCurrencyWithSymbol } from '../../utils/formatCurrency'
import CategoryBadge from './CategoryBadge'

function fmtDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d} ${months[parseInt(m) - 1]} ${y}`
}

interface Props {
  entries: CashbookEntry[]
  /** Running balance at start of this page (sum of all prior pages' net) */
  pageStartBalance: number
}

export default function CashBookTable({ entries, pageStartBalance }: Props): React.ReactElement {
  const navigate = useNavigate()

  if (entries.length === 0) {
    return (
      <div className="bg-bg-card border border-border rounded-lg flex items-center justify-center py-16">
        <p className="text-text-secondary text-sm">No transactions found for this period.</p>
      </div>
    )
  }

  let runBal = pageStartBalance

  return (
    <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-bg-muted border-b border-border">
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Date</th>
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Type</th>
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Description</th>
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Mode</th>
            <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-red-500 uppercase tracking-wide">Debit (Out)</th>
            <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-green-600 uppercase tracking-wide">Credit (In)</th>
            <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Balance</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(entry => {
            runBal += entry.credit - entry.debit
            const balPositive = runBal >= 0
            return (
              <tr
                key={entry.id}
                className="border-b border-border/50 hover:bg-bg-muted/50 cursor-pointer transition-colors"
                onClick={() => {
                  if (entry.type === 'invoice') {
                    navigate(`/invoices/${entry.ref_id}/preview`)
                  } else if (entry.party_id) {
                    navigate(`/khata/${entry.party_id}/ledger`)
                  }
                }}
              >
                <td className="px-4 py-3 text-text-secondary whitespace-nowrap">{fmtDate(entry.date)}</td>
                <td className="px-4 py-3"><CategoryBadge category={entry.category} /></td>
                <td className="px-4 py-3">
                  <div className="font-medium text-text-primary">{entry.description}</div>
                  <div className="text-[11px] text-text-secondary">{entry.sub_description}</div>
                </td>
                <td className="px-4 py-3 text-text-secondary">{entry.mode || '—'}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                  {entry.debit > 0
                    ? <span className="text-red-600">{formatCurrencyWithSymbol(entry.debit)}</span>
                    : <span className="text-text-secondary">—</span>}
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                  {entry.credit > 0
                    ? <span className="text-green-600">{formatCurrencyWithSymbol(entry.credit)}</span>
                    : <span className="text-text-secondary">—</span>}
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-[12px]">
                  <span className={balPositive ? 'text-green-700' : 'text-red-700'}>
                    {balPositive ? '' : '−'}{formatCurrencyWithSymbol(Math.abs(runBal))}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
