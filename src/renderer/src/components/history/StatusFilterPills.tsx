import React from 'react'
import type { StatusFilter } from '../../types'

const PILLS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'FINAL', label: 'Final' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

interface Props {
  value: StatusFilter
  onChange: (v: StatusFilter) => void
}

export default function StatusFilterPills({ value, onChange }: Props): React.ReactElement {
  return (
    <div className="flex items-center gap-1">
      {PILLS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            value === p.value
              ? 'bg-accent text-white shadow-sm'
              : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
