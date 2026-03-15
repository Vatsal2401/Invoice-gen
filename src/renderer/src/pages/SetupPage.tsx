import React, { useEffect, useRef, useState } from 'react'
import type { BusinessProfile } from '../types'
import { useStore } from '../store/useStore'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

const EMPTY: Omit<BusinessProfile, 'id' | 'last_invoice_number'> = {
  business_name: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  pincode: '',
  gstin: '',
  pan: '',
  phone: '',
  email: '',
  bank_name: '',
  account_number: '',
  ifsc_code: '',
  branch: '',
  swift_code: '',
  signatory_name: '',
  invoice_prefix: 'INV',
  logo_path: ''
}

export default function SetupPage(): React.ReactElement {
  const { showToast, setBusiness } = useStore()
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const fileRef = useRef<HTMLInputElement>(null)
  const firstRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    firstRef.current?.focus()
    window.api.getBusinessProfile().then(async (res) => {
      if (res.success && res.data) {
        const { id: _id, last_invoice_number: _lno, ...rest } = res.data
        setForm(rest)
        if (rest.logo_path) {
          const logoRes = await window.api.readLogo(rest.logo_path)
          if (logoRes.success && logoRes.data) setLogoPreview(logoRes.data as string)
        }
        setBusiness(res.data)
      }
    })
  }, [setBusiness])

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const filePath = (file as File & { path?: string }).path || ''
    setForm((f) => ({ ...f, logo_path: filePath }))
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    try {
      const res = await window.api.saveBusinessProfile(form as Record<string, unknown>)
      if (res.success) {
        showToast('success', 'Business profile saved')
        const refreshed = await window.api.getBusinessProfile()
        if (refreshed.success && refreshed.data) setBusiness(refreshed.data)
      } else {
        showToast('error', res.message || 'Save failed')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-border flex-shrink-0">
        <h1 className="text-xl font-bold text-text-primary">Business Setup</h1>
        <Button onClick={handleSave} loading={saving} size="sm">
          Save Business Profile
        </Button>
      </div>

      {/* Two-column grid — fills remaining height */}
      <div className="flex-1 overflow-hidden p-4">
        <div className="grid grid-cols-2 gap-4 h-full max-w-6xl mx-auto">

          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-4 overflow-y-auto pr-1">

            {/* Company Information */}
            <Card title="Company Information">
              <div className="space-y-3">
                <Input
                  ref={firstRef}
                  label="Business Name *"
                  value={form.business_name}
                  onChange={handleChange('business_name')}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Phone" value={form.phone} onChange={handleChange('phone')} />
                  <Input label="Email" type="email" value={form.email} onChange={handleChange('email')} />
                </div>
              </div>
            </Card>

            {/* GST & Tax Info */}
            <Card title="GST & Tax Info">
              <div className="grid grid-cols-2 gap-3">
                <Input label="GSTIN" value={form.gstin} onChange={handleChange('gstin')} />
                <Input label="PAN" value={form.pan} onChange={handleChange('pan')} />
              </div>
            </Card>

            {/* Invoice Settings */}
            <Card title="Invoice Settings">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Invoice Prefix" value={form.invoice_prefix} onChange={handleChange('invoice_prefix')} />
                <Input label="Signatory Name" value={form.signatory_name} onChange={handleChange('signatory_name')} />
              </div>
            </Card>

            {/* Company Logo */}
            <Card title="Company Logo">
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="h-14 object-contain border border-border rounded" />
                ) : (
                  <div className="h-14 w-20 border border-dashed border-border rounded flex items-center justify-center text-xs text-text-secondary">
                    No logo
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                  Upload Logo
                </Button>
                {form.logo_path && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setForm((f) => ({ ...f, logo_path: '' })); setLogoPreview('') }}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-4 overflow-y-auto pl-1">

            {/* Address */}
            <Card title="Address">
              <div className="space-y-3">
                <Input label="Address Line 1" value={form.address1} onChange={handleChange('address1')} />
                <Input label="Address Line 2" value={form.address2} onChange={handleChange('address2')} />
                <div className="grid grid-cols-3 gap-3">
                  <Input label="City" value={form.city} onChange={handleChange('city')} />
                  <Input label="State" value={form.state} onChange={handleChange('state')} />
                  <Input label="Pincode" value={form.pincode} onChange={handleChange('pincode')} />
                </div>
              </div>
            </Card>

            {/* Bank Details */}
            <Card title="Bank Details">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Bank Name" value={form.bank_name} onChange={handleChange('bank_name')} />
                <Input label="Account Number" value={form.account_number} onChange={handleChange('account_number')} />
                <Input label="IFSC Code" value={form.ifsc_code} onChange={handleChange('ifsc_code')} />
                <Input label="Branch" value={form.branch} onChange={handleChange('branch')} />
                <Input label="SWIFT Code" value={form.swift_code} onChange={handleChange('swift_code')} />
              </div>
            </Card>
          </div>

        </div>
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="bg-bg-card rounded-lg border border-border p-4 flex-shrink-0">
      <h2 className="text-sm font-semibold text-text-primary mb-3 pb-2 border-b border-border">{title}</h2>
      {children}
    </div>
  )
}
