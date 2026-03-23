import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { InvoiceWithItems, BusinessProfile } from '../types'
import InvoiceTemplate from '../components/invoice/InvoiceTemplate'
import apiClient from '../lib/apiClient'

export default function PrintPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const [invoice, setInvoice] = useState<InvoiceWithItems | null>(null)
  const [business, setBusiness] = useState<BusinessProfile | null>(null)
  const [logoDataUrl, setLogoDataUrl] = useState<string>('')

  useEffect(() => {
    if (!id) return
    Promise.all([
      apiClient.get<InvoiceWithItems>(`/invoice/invoices/${id}`),
      apiClient.get<BusinessProfile>('/invoice/profile')
    ]).then(([invRes, bizRes]) => {
      setInvoice(invRes.data)
      setBusiness(bizRes.data)
      if (bizRes.data.logo_url) setLogoDataUrl(bizRes.data.logo_url)
    })
  }, [id])

  // Send height to main process once template is fully painted
  useEffect(() => {
    if (!invoice || !business) return
    const raf = requestAnimationFrame(() => {
      setTimeout(() => {
        const el = document.getElementById('invoice-template')
        const h = el ? el.scrollHeight : document.body.scrollHeight
        window.api.reportPrintHeight(h)
      }, 200)
    })
    return () => cancelAnimationFrame(raf)
  }, [invoice, business])

  if (!invoice || !business) return <div style={{ padding: 24 }}>Loading...</div>

  return (
    <>
      <style>{`
        @page { size: 210mm auto; margin: 0; }
        html, body { margin: 0; padding: 0; background: white; }
      `}</style>
      <InvoiceTemplate invoice={invoice} business={business} logoDataUrl={logoDataUrl} />
    </>
  )
}
