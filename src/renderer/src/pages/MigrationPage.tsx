import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import apiClient from '../lib/apiClient'

type Step = 'reading' | 'uploading' | 'done' | 'error'

export default function MigrationPage(): React.ReactElement {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('reading')
  const [counts, setCounts] = useState({ customers: 0, invoices: 0, payments: 0 })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    runMigration()
  }, [])

  async function runMigration(): Promise<void> {
    try {
      setStep('reading')
      const local = await window.api.exportLocalData()

      if (!local.exists) {
        await window.api.markMigrationDone()
        navigate('/history')
        return
      }

      setCounts({
        customers: (local.customers?.length ?? 0),
        invoices: (local.invoices?.length ?? 0),
        payments: (local.payments?.length ?? 0)
      })

      setStep('uploading')

      // Upload logo first if present
      let logo_url: string | undefined
      const profile = local.business_profile as Record<string, unknown>
      if (profile?.logo_url && typeof profile.logo_url === 'string') {
        try {
          // Convert base64 data URL to Blob and upload
          const dataUrl = profile.logo_url as string
          const arr = dataUrl.split(',')
          const mimeMatch = arr[0].match(/:(.*?);/)
          const mime = mimeMatch ? mimeMatch[1] : 'image/png'
          const bstr = atob(arr[1])
          const n = bstr.length
          const u8arr = new Uint8Array(n)
          for (let i = 0; i < n; i++) u8arr[i] = bstr.charCodeAt(i)
          const blob = new Blob([u8arr], { type: mime })
          const formData = new FormData()
          formData.append('file', blob, 'logo.png')
          const { data } = await apiClient.post('/invoice/profile/logo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
          logo_url = data.logo_url
        } catch {
          // Logo upload failed — continue without it
        }
      }

      // Build import payload (only send fields the backend DTO expects)
      const payload = {
        business_profile: {
          business_name: String(profile.business_name ?? ''),
          address1: String(profile.address1 ?? ''),
          address2: String(profile.address2 ?? ''),
          city: String(profile.city ?? ''),
          state: String(profile.state ?? ''),
          pincode: String(profile.pincode ?? ''),
          gstin: String(profile.gstin ?? ''),
          pan: String(profile.pan ?? ''),
          phone: String(profile.phone ?? ''),
          email: String(profile.email ?? ''),
          bank_name: String(profile.bank_name ?? ''),
          account_number: String(profile.account_number ?? ''),
          ifsc_code: String(profile.ifsc_code ?? ''),
          branch: String(profile.branch ?? ''),
          swift_code: String(profile.swift_code ?? ''),
          signatory_name: String(profile.signatory_name ?? ''),
          invoice_prefix: String(profile.invoice_prefix ?? 'INV'),
          last_invoice_number: Number(profile.last_invoice_number) || 0,
          ...(logo_url ? { logo_url } : {}),
        },
        customers: (local.customers ?? []).map((c: Record<string, unknown>) => ({
          sqlite_id: Number(c.id),
          name: c.name,
          address: c.address ?? '',
          city: c.city ?? '',
          state: c.state ?? '',
          state_code: c.state_code ?? '',
          pincode: c.pincode ?? '',
          gstin: c.gstin ?? '',
          pan: c.pan ?? '',
          phone: c.phone ?? ''
        })),
        invoices: (local.invoices ?? []).map((inv: Record<string, unknown>) => ({
          sqlite_id: Number(inv.id),
          sqlite_customer_id: inv.customer_id != null ? Number(inv.customer_id) : undefined,
          invoice_number: String(inv.invoice_number ?? ''),
          invoice_date: String(inv.invoice_date ?? ''),
          ship_to_name: inv.ship_to_name ?? '',
          ship_to_address: inv.ship_to_address ?? '',
          ship_to_gstin: inv.ship_to_gstin ?? '',
          ship_to_state: inv.ship_to_state ?? '',
          buyer_name: String(inv.buyer_name ?? ''),
          buyer_address: inv.buyer_address ?? '',
          buyer_gstin: inv.buyer_gstin ?? '',
          buyer_pan: inv.buyer_pan ?? '',
          buyer_state: inv.buyer_state ?? '',
          buyer_state_code: inv.buyer_state_code ?? '',
          delivery_note: inv.delivery_note ?? '',
          buyer_order_number: inv.buyer_order_number ?? '',
          buyer_order_date: inv.buyer_order_date ?? '',
          dispatch_doc_number: inv.dispatch_doc_number ?? '',
          dispatch_doc_date: inv.dispatch_doc_date ?? '',
          dispatched_through: inv.dispatched_through ?? '',
          destination: inv.destination ?? '',
          payment_terms: inv.payment_terms ?? '',
          delivery_terms: inv.delivery_terms ?? '',
          total_quantity: inv.total_quantity ?? 0,
          taxable_value: inv.taxable_value ?? 0,
          cgst_total: inv.cgst_total ?? 0,
          sgst_total: inv.sgst_total ?? 0,
          grand_total: inv.grand_total ?? 0,
          status: inv.status ?? 'DRAFT',
          cancelled: inv.cancelled ?? 0,
          items: ((inv.items as unknown[]) ?? []).map((item: Record<string, unknown>) => ({
            sl_no: Number(item.sl_no) || 1,
            description: String(item.description ?? ''),
            hsn_sac: String(item.hsn_sac ?? ''),
            quantity: Number(item.quantity) || 0,
            unit: String(item.unit ?? ''),
            rate: Number(item.rate) || 0,
            per: String(item.per ?? ''),
            amount: Number(item.amount) || 0,
            cgst_rate: Number(item.cgst_rate) || 0,
            sgst_rate: Number(item.sgst_rate) || 0,
            cgst_amount: Number(item.cgst_amount) || 0,
            sgst_amount: Number(item.sgst_amount) || 0
          }))
        })),
        payments: (local.payments ?? []).map((p: Record<string, unknown>) => ({
          sqlite_customer_id: Number(p.customer_id),
          payment_date: String(p.payment_date ?? ''),
          amount: Number(p.amount) || 0,
          mode: p.mode ?? 'Cash',
          reference: p.reference ?? '',
          narration: p.narration ?? ''
        }))
      }

      await apiClient.post('/invoice/migrate/import', payload)

      await window.api.markMigrationDone()
      setStep('done')

      setTimeout(() => navigate('/history'), 1500)
    } catch (err: unknown) {
      console.error('Migration failed:', err)
      setError(err instanceof Error ? err.message : 'Migration failed')
      setStep('error')
    }
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-bg-card rounded-xl border border-border shadow-lg p-8">
        <h1 className="text-xl font-bold text-text-primary mb-2">Data Migration</h1>
        <p className="text-sm text-text-secondary mb-6">
          We found local invoice data. Moving it to the cloud…
        </p>

        <div className="space-y-4">
          <StepRow
            active={step === 'reading'}
            done={step === 'uploading' || step === 'done'}
            label="Reading local database"
            detail={
              step !== 'reading'
                ? `${counts.customers} customers · ${counts.invoices} invoices · ${counts.payments} payments`
                : undefined
            }
          />
          <StepRow
            active={step === 'uploading'}
            done={step === 'done'}
            label="Uploading to cloud"
          />
          <StepRow active={false} done={step === 'done'} label="Complete" />
        </div>

        {step === 'error' && (
          <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle size={16} className="text-danger mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-danger">Migration failed</p>
              <p className="text-xs text-text-secondary mt-1">{error}</p>
              <button
                onClick={() => { setStep('reading'); setError(null); runMigration() }}
                className="text-xs text-accent underline mt-2"
              >
                Retry
              </button>
              <button
                onClick={async () => { await window.api.markMigrationDone(); navigate('/history') }}
                className="text-xs text-text-secondary underline mt-2 ml-3"
              >
                Skip migration
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StepRow({
  active,
  done,
  label,
  detail
}: {
  active: boolean
  done: boolean
  label: string
  detail?: string
}): React.ReactElement {
  return (
    <div className="flex items-center gap-3">
      <div className="w-5 h-5 flex-shrink-0">
        {done ? (
          <CheckCircle size={20} className="text-green-500" />
        ) : active ? (
          <Loader2 size={20} className="text-accent animate-spin" />
        ) : (
          <div className="w-5 h-5 rounded-full border-2 border-border" />
        )}
      </div>
      <div>
        <p className={`text-sm font-medium ${done ? 'text-text-primary' : active ? 'text-accent' : 'text-text-secondary'}`}>
          {label}
        </p>
        {detail && <p className="text-xs text-text-secondary">{detail}</p>}
      </div>
    </div>
  )
}
