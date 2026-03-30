import React from 'react'
import { CashbookCategoryFilter } from '../../types'

const CATEGORIES: { id: CashbookCategoryFilter; label: string }[] = [
  { id: 'ALL',          label: 'All' },
  { id: 'SALES_INCOME', label: 'Sales Income' },
  { id: 'SUPPLIER',     label: 'Supplier' },
  { id: 'TRANSPORT',    label: 'Transport' },
  { id: 'LABOUR',       label: 'Labour' },
  { id: 'OTHER',        label: 'Other' },
]

interface Props {
  from: string
  to: string
  category: CashbookCategoryFilter
  onFromChange: (v: string) => void
  onToChange: (v: string) => void
  onCategoryChange: (v: CashbookCategoryFilter) => void
}

export default function CashBookFilters({
  from, to, category, onFromChange, onToChange, onCategoryChange,
}: Props): React.ReactElement {
  return (
    <div className="bg-bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-text-secondary">From</label>
        <input
          type="date"
          value={from}
          onChange={e => onFromChange(e.target.value)}
          className="border border-border rounded-md px-2.5 py-1 text-xs text-text-primary bg-bg-base focus:outline-none focus:border-primary"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-text-secondary">To</label>
        <input
          type="date"
          value={to}
          onChange={e => onToChange(e.target.value)}
          className="border border-border rounded-md px-2.5 py-1 text-xs text-text-primary bg-bg-base focus:outline-none focus:border-primary"
        />
      </div>
      <div className="w-px h-6 bg-border" />
      <div className="flex items-center gap-1.5 flex-wrap">
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => onCategoryChange(c.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              category === c.id
                ? 'bg-primary text-white border-primary'
                : 'bg-bg-base text-text-secondary border-border hover:border-primary hover:text-primary'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  )
}
