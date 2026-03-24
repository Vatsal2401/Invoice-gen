import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, FileDown, XCircle, Search } from 'lucide-react'
import type { InvoiceSummary } from '../types'
import { useStore } from '../store/useStore'
import { formatCurrencyWithSymbol } from '../utils/formatCurrency'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import apiClient from '../lib/apiClient'
import { useQuery } from '../lib/useQuery'
import { useQueryCache } from '../store/useQueryCache'

const INVOICES_KEY = '/invoice/invoices'

export default function HistoryPage(): React.ReactElement {
  const navigate = useNavigate()
  const { showToast } = useStore()
  const { invalidate } = useQueryCache()
  const { data: invoices = [], refetch } = useQuery<InvoiceSummary[]>(INVOICES_KEY)
  const [search, setSearch] = useState('')
  const [cancelTarget, setCancelTarget] = useState<InvoiceSummary | null>(null)
  const [exportLoading, setExportLoading] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.ctrlKey && e.key === 'f') { e.preventDefault(); searchRef.current?.focus() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const filtered = invoices.filter((inv) => {
    const q = search.toLowerCase()
    return inv.invoice_number.toLowerCase().includes(q) || inv.buyer_name.toLowerCase().includes(q)
  })

  const handleExport = async (inv: InvoiceSummary): Promise<void> => {
    setExportLoading(inv.id)
    const res = await window.api.exportPDF(inv.id)
    setExportLoading(null)
    if (res.success) showToast('success', 'PDF exported')
    else if (res.message !== 'Export cancelled') showToast('error', res.message || 'Export failed')
  }

  const handleCancel = async (): Promise<void> => {
    if (!cancelTarget) return
    try {
      await apiClient.delete(`/invoice/invoices/${cancelTarget.id}`)
      showToast('success', 'Invoice deleted')
      setCancelTarget(null)
      invalidate(INVOICES_KEY)
      refetch()
    } catch {
      showToast('error', 'Delete failed')
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between h-14 mb-4">
        <h1 className="text-2xl font-bold text-text-primary">Invoice History</h1>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search invoice or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-border rounded-md pl-8 pr-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      <div className="bg-bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b-2 border-border">
            <tr>
              {['Invoice No.', 'Date', 'Customer', 'Amount', 'Status', 'Actions'].map((h) => (
                <th key={h} scope="col" className="text-xs font-semibold uppercase tracking-wide text-text-secondary px-3 py-2 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center text-text-secondary py-8">{search ? 'No invoices match your search.' : 'No invoices yet.'}</td></tr>
            )}
            {filtered.map((inv) => (
              <tr key={inv.id} className={`border-b border-border hover:bg-gray-50 ${inv.cancelled ? 'opacity-60' : ''}`}>
                <td className="px-3 py-2 font-medium">
                  <span className="flex items-center gap-2">
                    {inv.invoice_number}
                    {inv.cancelled && (
                      <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded">CANCELLED</span>
                    )}
                  </span>
                </td>
                <td className="px-3 py-2 text-text-secondary">{inv.invoice_date}</td>
                <td className="px-3 py-2">{inv.buyer_name}</td>
                <td className="px-3 py-2 tabular-nums font-mono text-right">{formatCurrencyWithSymbol(inv.grand_total)}</td>
                <td className="px-3 py-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${inv.cancelled ? 'bg-red-100 text-red-800' : inv.status === 'FINAL' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {inv.cancelled ? 'CANCELLED' : inv.status}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/invoices/${inv.id}/preview`)}><Eye size={13} /> View</Button>
                    <Button variant="ghost" size="sm" loading={exportLoading === inv.id} onClick={() => handleExport(inv)}><FileDown size={13} /> PDF</Button>
                    {!inv.cancelled && inv.status !== 'FINAL' && (
                      <Button variant="ghost" size="sm" className="text-danger hover:bg-red-50" onClick={() => setCancelTarget(inv)}>
                        <XCircle size={13} /> Delete
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!cancelTarget} title="Delete Invoice" onClose={() => setCancelTarget(null)}
        footer={<><Button variant="secondary" onClick={() => setCancelTarget(null)}>No, Keep It</Button><Button variant="danger" onClick={handleCancel}>Yes, Delete</Button></>}>
        <p className="text-sm">Are you sure you want to permanently delete invoice <strong>{cancelTarget?.invoice_number}</strong>? This cannot be undone.</p>
      </Modal>
    </div>
  )
}
