import React from 'react'
import { BookOpen, Users2 } from 'lucide-react'
import { KhataTab } from '../../types'

interface Props {
  active: KhataTab
  onChange: (tab: KhataTab) => void
}

export default function KhataTabBar({ active, onChange }: Props): React.ReactElement {
  const tabs: { id: KhataTab; label: string; Icon: React.ElementType }[] = [
    { id: 'cashbook', label: 'Cash Book', Icon: BookOpen },
    { id: 'accounts', label: 'Accounts',  Icon: Users2 },
  ]

  return (
    <div className="bg-white border-b border-border px-6 flex items-center gap-1 flex-shrink-0">
      {tabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium rounded-t transition-colors border-b-2 -mb-px ${
            active === id
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-muted'
          }`}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  )
}
