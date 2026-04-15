import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import type { CustomerInvoiceSummary, InvoiceStats } from '../types'
import Button from '../components/ui/Button'
import HistoryKPIStrip from '../components/history/HistoryKPIStrip'
import ViewToggleTabs from '../components/history/ViewToggleTabs'
import AllInvoicesView from '../components/history/AllInvoicesView'
import CustomerSummaryView from '../components/history/CustomerSummaryView'
import CustomerDetailPanel from '../components/history/CustomerDetailPanel'
import apiClient from '../lib/apiClient'
import { useQueryCache } from '../store/useQueryCache'

function fiscalYear(): { from: string; to: string } {
  const now = new Date()
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  return { from: `${year}-04-01`, to: `${year + 1}-03-31` }
}

export default function HistoryPage(): React.ReactElement {
  const navigate = useNavigate()
  const { get, set } = useQueryCache()
  const [activeView, setActiveView] = useState<'all' | 'customer'>('all')
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerInvoiceSummary | null>(null)
  const fy = fiscalYear()
  const [from, setFrom] = useState(fy.from)
  const [to, setTo] = useState(fy.to)
  const [stats, setStats] = useState<InvoiceStats | undefined>()
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    const cacheKey = `/invoice/invoices/stats?from=${from}&to=${to}`
    const cached = get<InvoiceStats>(cacheKey)
    if (cached) { setStats(cached); setStatsLoading(false); return }
    setStatsLoading(true)
    apiClient.get<InvoiceStats>(cacheKey)
      .then(({ data }) => { set(cacheKey, data); setStats(data) })
      .catch(() => {})
      .finally(() => setStatsLoading(false))
  }, [get, set, from, to])

  const isInDrillDown = selectedCustomer !== null

  const handleSelectCustomer = (c: CustomerInvoiceSummary): void => {
    setSelectedCustomer(c)
  }

  const handleBack = (): void => {
    setSelectedCustomer(null)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-border flex-shrink-0">
        <h1 className="text-xl font-bold text-text-primary">Invoice History</h1>
        <Button size="sm" onClick={() => navigate('/invoices/new')}><Plus size={14} /> New Invoice</Button>
      </div>

      {/* KPI strip */}
      <HistoryKPIStrip stats={stats} loading={statsLoading} />

      {/* View toggle bar — hidden during drill-down */}
      {!isInDrillDown && (
        <div className="flex items-center gap-4 px-6 py-2 bg-white border-b border-border flex-shrink-0">
          <ViewToggleTabs active={activeView} onChange={(v) => { setActiveView(v); setSelectedCustomer(null) }} />
        </div>
      )}

      {/* Slide container */}
      <div className="flex-1 relative overflow-hidden">
        {/* Main panel (All Invoices or By Customer) */}
        <div className={`absolute inset-0 transition-transform duration-300 ease-in-out ${isInDrillDown ? '-translate-x-full' : 'translate-x-0'}`}>
          {activeView === 'all'
            ? <AllInvoicesView from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
            : <CustomerSummaryView onSelectCustomer={handleSelectCustomer} />
          }
        </div>

        {/* Drill-down detail panel */}
        <div className={`absolute inset-0 transition-transform duration-300 ease-in-out ${isInDrillDown ? 'translate-x-0' : 'translate-x-full'}`}>
          {selectedCustomer && (
            <CustomerDetailPanel customer={selectedCustomer} onBack={handleBack} />
          )}
        </div>
      </div>
    </div>
  )
}
