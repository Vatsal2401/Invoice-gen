import React from 'react'
import { List, Users } from 'lucide-react'

interface Props {
  active: 'all' | 'customer'
  onChange: (v: 'all' | 'customer') => void
}

export default function ViewToggleTabs({ active, onChange }: Props): React.ReactElement {
  return (
    <div className="flex items-center gap-0 border border-border rounded-lg overflow-hidden">
      {([
        { value: 'all', label: 'All Invoices', Icon: List },
        { value: 'customer', label: 'By Customer', Icon: Users },
      ] as const).map(({ value, label, Icon }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium transition-colors ${
            active === value
              ? 'bg-accent text-white'
              : 'bg-white text-text-secondary hover:bg-gray-50'
          }`}
        >
          <Icon size={13} />
          {label}
        </button>
      ))}
    </div>
  )
}
