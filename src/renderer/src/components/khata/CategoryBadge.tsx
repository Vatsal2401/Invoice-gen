import React from 'react'
import { CashbookCategory } from '../../types'

const MAP: Record<CashbookCategory, { label: string; className: string }> = {
  SALES_INCOME: { label: 'Sales Income', className: 'bg-blue-100 text-blue-700' },
  SUPPLIER:     { label: 'Supplier',     className: 'bg-orange-100 text-orange-700' },
  TRANSPORT:    { label: 'Transport',    className: 'bg-purple-100 text-purple-700' },
  LABOUR:       { label: 'Labour',       className: 'bg-yellow-100 text-yellow-700' },
  OTHER:        { label: 'Other',        className: 'bg-gray-100 text-gray-600' },
}

export default function CategoryBadge({ category }: { category: string }): React.ReactElement {
  const cfg = MAP[category as CashbookCategory] ?? { label: category, className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}
