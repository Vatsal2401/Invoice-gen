import React, { useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { KhataTab } from '../types'
import KhataTabBar from '../components/khata/KhataTabBar'
import CashBookView from '../components/khata/CashBookView'
import AccountsView, { AccountsViewHandle } from '../components/khata/AccountsView'
import Button from '../components/ui/Button'

export default function KhataPage(): React.ReactElement {
  const [tab, setTab] = useState<KhataTab>('cashbook')
  const accountsRef = useRef<AccountsViewHandle>(null)

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-border flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Khata</h1>
          <p className="text-xs text-text-secondary">Cash book &amp; account ledgers</p>
        </div>
        {tab === 'accounts' && (
          <Button onClick={() => accountsRef.current?.openAdd()} size="sm">
            <Plus size={14} /> Add Account
          </Button>
        )}
      </div>

      {/* Tab Bar */}
      <KhataTabBar active={tab} onChange={setTab} />

      {/* Content */}
      {tab === 'cashbook' && <CashBookView />}
      {tab === 'accounts' && <AccountsView ref={accountsRef} />}
    </div>
  )
}
