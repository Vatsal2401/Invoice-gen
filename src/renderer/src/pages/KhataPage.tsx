import React, { useRef, useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { KhataTab } from '../types'
import KhataTabBar from '../components/khata/KhataTabBar'
import CashBookView, { CashBookViewHandle } from '../components/khata/CashBookView'
import AccountsView, { AccountsViewHandle } from '../components/khata/AccountsView'
import Button from '../components/ui/Button'

export default function KhataPage(): React.ReactElement {
  const [tab, setTab] = useState<KhataTab>('cashbook')
  const [spinning, setSpinning] = useState(false)
  const accountsRef = useRef<AccountsViewHandle>(null)
  const cashbookRef = useRef<CashBookViewHandle>(null)

  const handleRefresh = () => {
    setSpinning(true)
    if (tab === 'cashbook') cashbookRef.current?.refresh()
    else accountsRef.current?.refresh()
    setTimeout(() => setSpinning(false), 900)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-border flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Khata</h1>
          <p className="text-xs text-text-secondary">Cash book &amp; account ledgers</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={spinning}
            className="p-1.5 rounded-lg border border-border text-text-secondary hover:text-primary hover:border-primary transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={15} className={spinning ? 'animate-spin' : ''} />
          </button>
          {tab === 'accounts' && (
            <Button onClick={() => accountsRef.current?.openAdd()} size="sm">
              <Plus size={14} /> Add Account
            </Button>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <KhataTabBar active={tab} onChange={setTab} />

      {/* Content */}
      {tab === 'cashbook' && <CashBookView ref={cashbookRef} />}
      {tab === 'accounts' && <AccountsView ref={accountsRef} />}
    </div>
  )
}
