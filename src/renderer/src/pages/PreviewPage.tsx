import React, { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, FileDown, CheckCircle, Pencil } from 'lucide-react'
import type { InvoiceWithItems, BusinessProfile } from '../types'
import { useStore } from '../store/useStore'
import InvoiceTemplate from '../components/invoice/InvoiceTemplate'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import apiClient from '../lib/apiClient'

export default function PreviewPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useStore()
  const [invoice, setInvoice] = useState<InvoiceWithItems | null>(null)
  const [business, setBusiness] = useState<BusinessProfile | null>(null)
  const [logoDataUrl, setLogoDataUrl] = useState<string>('')
  const [exportLoading, setExportLoading] = useState(false)
  const [finalizeModal, setFinalizeModal] = useState(false)
  const [finalizing, setFinalizing] = useState(false)

  useEffect(() => {
    if (!id) return
    apiClient.get<InvoiceWithItems>(`/invoice/invoices/${id}`).then(({ data }) => {
      setInvoice(data)
    }).catch(() => showToast('error', 'Invoice not found'))

    apiClient.get<BusinessProfile>('/invoice/profile').then(({ data }) => {
      setBusiness(data)
      if (data.logo_url) setLogoDataUrl(data.logo_url)
    })
  }, [id, showToast])

  const handlePrint = useCallback((): void => window.print(), [])

  const handleExport = useCallback(async (): Promise<void> => {
    if (!id) return
    setExportLoading(true)
    const res = await window.api.exportPDF(id)
    setExportLoading(false)
    if (res.success) showToast('success', 'PDF exported')
    else if (res.message !== 'Export cancelled') showToast('error', res.message || 'Export failed')
  }, [id, showToast])

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.ctrlKey && e.key === 'p') { e.preventDefault(); handlePrint() }
      if (e.ctrlKey && e.key === 'e') { e.preventDefault(); handleExport() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handlePrint, handleExport])

  const handleFinalize = async (): Promise<void> => {
    if (!id) return
    setFinalizing(true)
    try {
      await apiClient.patch(`/invoice/invoices/${id}/finalize`)
      setFinalizing(false)
      setFinalizeModal(false)
      showToast('success', 'Invoice finalized')
      setInvoice((inv) => inv ? { ...inv, status: 'FINAL' } : inv)
    } catch {
      setFinalizing(false)
      showToast('error', 'Finalize failed')
    }
  }

  if (!invoice || !business) {
    return <div className="p-6 text-text-secondary">Loading...</div>
  }

  const isDraft = invoice.status === 'DRAFT' && !invoice.cancelled

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div id="toolbar" className="flex items-center gap-3 px-6 py-3 bg-white border-b border-border flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft size={14} /> Back</Button>
        <div className="flex-1" />
        {isDraft && (
          <Button variant="ghost" size="sm" onClick={() => navigate(`/invoices/new?id=${id}`)}><Pencil size={14} /> Edit</Button>
        )}
        {isDraft && (
          <Button variant="secondary" size="sm" onClick={() => setFinalizeModal(true)}><CheckCircle size={14} /> Finalize Invoice</Button>
        )}
        <Button variant="ghost" size="sm" onClick={handlePrint}><Printer size={14} /> Print</Button>
        <Button size="sm" loading={exportLoading} onClick={handleExport}><FileDown size={14} /> Export PDF</Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 pt-4 flex items-center gap-3">
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${invoice.cancelled ? 'bg-red-100 text-red-800' : invoice.status === 'FINAL' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {invoice.cancelled ? 'CANCELLED' : invoice.status}
          </span>
        </div>
        <div className="p-6 flex justify-center">
          <div className="shadow-lg">
            <InvoiceTemplate invoice={invoice} business={business} logoDataUrl={logoDataUrl} />
          </div>
        </div>
      </div>

      <Modal open={finalizeModal} title="Finalize Invoice" onClose={() => setFinalizeModal(false)}
        footer={<><Button variant="secondary" onClick={() => setFinalizeModal(false)}>Cancel</Button><Button onClick={handleFinalize} loading={finalizing}>Finalize</Button></>}>
        <p className="text-sm">Finalizing invoice <strong>{invoice.invoice_number}</strong> will lock it permanently. It cannot be edited after finalization. Continue?</p>
      </Modal>
    </div>
  )
}
