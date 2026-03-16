import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { InvoiceWithItems, BusinessProfile } from '../types'
import InvoiceTemplate from '../components/invoice/InvoiceTemplate'

export default function PrintPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const [invoice, setInvoice] = useState<InvoiceWithItems | null>(null)
  const [business, setBusiness] = useState<BusinessProfile | null>(null)
  const [logoDataUrl, setLogoDataUrl] = useState<string>('')

  useEffect(() => {
    if (!id) return
    Promise.all([
      window.api.getInvoice(Number(id)),
      window.api.getBusinessProfile()
    ]).then(async ([invRes, bizRes]) => {
      if (invRes.success && invRes.data) setInvoice(invRes.data)
      if (bizRes.success && bizRes.data) {
        setBusiness(bizRes.data)
        if (bizRes.data.logo_path) {
          const logoRes = await window.api.readLogo(bizRes.data.logo_path)
          if (logoRes.success && logoRes.data) setLogoDataUrl(logoRes.data as string)
        }
      }
    })
  }, [id])

  // Send height to main process once template is fully painted
  useEffect(() => {
    if (!invoice || !business) return
    // rAF ensures DOM is painted, then 200ms for any font/image layout
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
