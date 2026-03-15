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

  if (!invoice || !business) return <div style={{ padding: 24 }}>Loading...</div>

  return (
    <>
      {/* Force exact A4, no margins, single page */}
      <style>{`
        @page {
          size: 210mm 297mm;
          margin: 0;
        }
        html, body {
          margin: 0;
          padding: 0;
          width: 210mm;
          height: 297mm;
          overflow: hidden;
          background: white;
        }
      `}</style>
      <InvoiceTemplate invoice={invoice} business={business} logoDataUrl={logoDataUrl} />
    </>
  )
}
