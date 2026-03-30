import React, { useEffect, useState } from 'react'
import { HashRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import SetupPage from './pages/SetupPage'
import CustomersPage from './pages/CustomersPage'
import CreateInvoicePage from './pages/CreateInvoicePage'
import PreviewPage from './pages/PreviewPage'
import HistoryPage from './pages/HistoryPage'
import DashboardPage from './pages/DashboardPage'
import PrintPage from './pages/PrintPage'
import PrintLedgerPage from './pages/PrintLedgerPage'
import CustomerLedgerPage from './pages/CustomerLedgerPage'
import PartiesPage from './pages/PartiesPage'
import PartyLedgerPage from './pages/PartyLedgerPage'
import LoginPage from './pages/LoginPage'
import MigrationPage from './pages/MigrationPage'
import { useAuthStore } from './store/useAuthStore'
import apiClient from './lib/apiClient'

function AppRoutes(): React.ReactElement {
  const { isAuthenticated, setAuth, clearAuth } = useAuthStore()
  const [ready, setReady] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Listen for forced logout (token refresh failed)
    const onLogout = (): void => {
      clearAuth()
      navigate('/login')
    }
    window.addEventListener('auth:logout', onLogout)
    return () => window.removeEventListener('auth:logout', onLogout)
  }, [clearAuth, navigate])

  useEffect(() => {
    async function bootstrap(): Promise<void> {
      const tokens = await window.api.getTokens()
      if (!tokens?.access_token) {
        setReady(true)
        return
      }

      try {
        const { data } = await apiClient.get('/auth/me')
        setAuth(data.id, data.email)
      } catch {
        await window.api.clearTokens()
        clearAuth()
      } finally {
        setReady(true)
      }
    }
    bootstrap()
  }, [setAuth, clearAuth])

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg-base">
        <div className="text-text-secondary text-sm">Loading…</div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Print routes: no AppLayout */}
      <Route path="/print/:id" element={<PrintPage />} />
      <Route path="/ledger/:id/print" element={<PrintLedgerPage />} />

      {/* Auth + migration (no AppLayout) */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/migrate" element={isAuthenticated ? <MigrationPage /> : <Navigate to="/login" replace />} />

      {/* Protected app routes */}
      <Route element={isAuthenticated ? <AppLayout /> : <Navigate to="/login" replace />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/invoices/new" element={<CreateInvoicePage />} />
        <Route path="/invoices/:id/preview" element={<PreviewPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/customers/:id/ledger" element={<CustomerLedgerPage />} />
        <Route path="/parties" element={<PartiesPage />} />
        <Route path="/parties/:id/ledger" element={<PartyLedgerPage />} />
      </Route>
    </Routes>
  )
}

export default function App(): React.ReactElement {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  )
}
