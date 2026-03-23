import React, { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useStore } from '../../store/useStore'

export default function AppLayout(): React.ReactElement {
  const navigate = useNavigate()
  const { toast, clearToast } = useStore()

  // Handle menu events from main process
  useEffect(() => {
    const unsubs = [
      window.api.onMenuNewInvoice(() => navigate('/invoices/new'))
    ]
    return () => unsubs.forEach((fn) => fn())
  }, [navigate])

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(clearToast, 3000)
      return () => clearTimeout(t)
    }
  }, [toast, clearToast])

  return (
    <div className="flex h-screen overflow-hidden bg-bg-base">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-hidden h-full">
          <Outlet />
        </main>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium max-w-xs
            ${toast.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
            }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}
