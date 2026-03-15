import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import type { BusinessProfile, Customer, LedgerEntry } from '../types'
import LedgerTemplate from '../components/invoice/LedgerTemplate'

export default function PrintLedgerPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const fromDate = searchParams.get('from') || ''
  const toDate = searchParams.get('to') || ''

  const [business, setBusiness] = useState<BusinessProfile | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [logoDataUrl, setLogoDataUrl] = useState('')

  useEffect(() => {
    if (!id) return
    Promise.all([
      window.api.getBusinessProfile(),
      window.api.getCustomer(Number(id)),
      window.api.getCustomerLedger(Number(id), fromDate, toDate)
    ]).then(async ([bizRes, custRes, ledgerRes]) => {
      if (bizRes.success && bizRes.data) {
        setBusiness(bizRes.data as BusinessProfile)
        const bp = bizRes.data as BusinessProfile
        if (bp.logo_path) {
          const lr = await window.api.readLogo(bp.logo_path)
          if (lr.success && lr.data) setLogoDataUrl(lr.data as string)
        }
      }
      if (custRes.success && custRes.data) setCustomer(custRes.data as Customer)
      if (ledgerRes.success && ledgerRes.data) {
        const data = ledgerRes.data as {
          invoices: Array<{ id: number; invoice_number: string; invoice_date: string; grand_total: number; cancelled: number }>
          payments: Array<{ id: number; payment_date: string; amount: number; mode: string; reference: string; narration: string }>
        }
        const all: LedgerEntry[] = []
        for (const inv of data.invoices) {
          if (inv.cancelled) continue
          all.push({
            date: inv.invoice_date,
            particulars: 'GST Sales',
            narration: inv.invoice_number,
            vch_type: 'Sales',
            vch_no: inv.invoice_number.split('-').pop() || String(inv.id),
            debit: inv.grand_total,
            credit: 0,
            ref_type: 'invoice',
            ref_id: inv.id
          })
        }
        for (const pay of data.payments) {
          const isDebit = pay.amount < 0
          all.push({
            date: pay.payment_date,
            particulars: isDebit ? `Debit Note (${pay.mode})` : pay.mode,
            narration: pay.reference || pay.narration || '',
            vch_type: isDebit ? 'Debit Note' : 'Receipt',
            vch_no: String(pay.id),
            debit: isDebit ? Math.abs(pay.amount) : 0,
            credit: isDebit ? 0 : pay.amount,
            ref_type: 'payment',
            ref_id: pay.id
          })
        }
        all.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
        setEntries(all)
      }
    })
  }, [id, fromDate, toDate])

  if (!business || !customer) return <div style={{ padding: 24 }}>Loading...</div>

  return (
    <>
      <style>{`
        @page { size: 210mm 297mm; margin: 0; }
        html, body { margin: 0; padding: 0; background: white; }
      `}</style>
      <LedgerTemplate
        business={business}
        customer={customer}
        entries={entries}
        fromDate={fromDate}
        toDate={toDate}
        logoDataUrl={logoDataUrl}
      />
    </>
  )
}
