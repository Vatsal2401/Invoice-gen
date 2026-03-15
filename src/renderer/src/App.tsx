import React, { useEffect, useState } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import SetupPage from './pages/SetupPage'
import CustomersPage from './pages/CustomersPage'
import CreateInvoicePage from './pages/CreateInvoicePage'
import PreviewPage from './pages/PreviewPage'
import HistoryPage from './pages/HistoryPage'
import PrintPage from './pages/PrintPage'
import PrintLedgerPage from './pages/PrintLedgerPage'
import CustomerLedgerPage from './pages/CustomerLedgerPage'
import { useStore } from './store/useStore'

export default function App(): React.ReactElement {
  const { setBusiness } = useStore()
  const [ready, setReady] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)

  useEffect(() => {
    window.api.getBusinessProfile().then((res) => {
      if (res.success && res.data) {
        setBusiness(res.data)
        setNeedsSetup(!res.data.business_name)
      } else {
        setNeedsSetup(true)
      }
      setReady(true)
    })
  }, [setBusiness])

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg-base">
        <div className="text-text-secondary">Loading...</div>
      </div>
    )
  }

  return (
    <HashRouter>
      <Routes>
        {/* Print routes: no AppLayout (used by hidden PDF window) */}
        <Route path="/print/:id" element={<PrintPage />} />
        <Route path="/ledger/:id/print" element={<PrintLedgerPage />} />

        {/* Main app routes with AppLayout */}
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to={needsSetup ? '/setup' : '/history'} replace />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/invoices/new" element={<CreateInvoicePage />} />
          <Route path="/invoices/:id/preview" element={<PreviewPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/customers/:id/ledger" element={<CustomerLedgerPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
