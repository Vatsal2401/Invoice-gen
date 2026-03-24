import React, { useEffect, useRef, useState } from 'react'
import type { BusinessProfile } from '../types'
import { useStore } from '../store/useStore'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import apiClient from '../lib/apiClient'
import { useQuery } from '../lib/useQuery'
import { useQueryCache } from '../store/useQueryCache'

type ProfileForm = Omit<BusinessProfile, 'id' | 'user_id' | 'last_invoice_number'>

const EMPTY: ProfileForm = {
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
  logo_url: ''
}

const PROFILE_KEY = '/invoice/profile'

export default function SetupPage(): React.ReactElement {
  const { showToast, setBusiness } = useStore()
  const { invalidate } = useQueryCache()
  const { data: profile } = useQuery<BusinessProfile>(PROFILE_KEY)
  const [form, setForm] = useState<ProfileForm>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const firstRef = useRef<HTMLInputElement>(null)

  useEffect(() => { firstRef.current?.focus() }, [])

  // Populate form when profile loads (cached or fresh)
  useEffect(() => {
    if (!profile) return
    const { id: _id, user_id: _uid, last_invoice_number: _lno, created_at: _ca, updated_at: _ua, ...rest } = profile
    setForm({ ...EMPTY, ...rest })
    if (profile.logo_url) setLogoPreview(profile.logo_url)
    setBusiness(profile)
  }, [profile, setBusiness])

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  const handlePickLogo = async (): Promise<void> => {
    const result = await window.api.pickLogoFile()
    if (result.canceled || !result.dataUrl) return

    setLogoPreview(result.dataUrl)
    setUploadingLogo(true)
    try {
      // Convert data URL to Blob and upload
      const arr = result.dataUrl.split(',')
      const mime = result.mimeType || 'image/png'
      const bstr = atob(arr[1])
      const u8arr = new Uint8Array(bstr.length)
      for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i)
      const blob = new Blob([u8arr], { type: mime })
      const formData = new FormData()
      formData.append('file', blob, result.fileName || 'logo.png')

      const { data } = await apiClient.post<{ logo_url: string }>('/invoice/profile/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setForm((f) => ({ ...f, logo_url: data.logo_url }))
      invalidate(PROFILE_KEY)
      showToast('success', 'Logo uploaded')
    } catch {
      showToast('error', 'Logo upload failed. Check S3 configuration.')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { logo_url: _logo, ...profilePayload } = form
      const { data } = await apiClient.put<BusinessProfile>('/invoice/profile', profilePayload)
      invalidate(PROFILE_KEY)
      showToast('success', 'Business profile saved')
      setBusiness(data)
    } catch {
      showToast('error', 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-border flex-shrink-0">
        <h1 className="text-xl font-bold text-text-primary">Business Setup</h1>
        <Button onClick={handleSave} loading={saving} size="sm">Save Business Profile</Button>
      </div>

      <div className="flex-1 overflow-hidden p-4">
        <div className="grid grid-cols-2 gap-4 h-full max-w-6xl mx-auto">

          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-4 overflow-y-auto pr-1">
            <Card title="Company Information">
              <div className="space-y-3">
                <Input ref={firstRef} label="Business Name *" value={form.business_name} onChange={handleChange('business_name')} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Phone" value={form.phone} onChange={handleChange('phone')} />
                  <Input label="Email" type="email" value={form.email} onChange={handleChange('email')} />
                </div>
              </div>
            </Card>

            <Card title="GST & Tax Info">
              <div className="grid grid-cols-2 gap-3">
                <Input label="GSTIN" value={form.gstin} onChange={handleChange('gstin')} />
                <Input label="PAN" value={form.pan} onChange={handleChange('pan')} />
              </div>
            </Card>

            <Card title="Invoice Settings">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Invoice Prefix" value={form.invoice_prefix} onChange={handleChange('invoice_prefix')} />
                <Input label="Signatory Name" value={form.signatory_name} onChange={handleChange('signatory_name')} />
              </div>
            </Card>

            <Card title="Company Logo">
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="h-14 object-contain border border-border rounded" />
                ) : (
                  <div className="h-14 w-20 border border-dashed border-border rounded flex items-center justify-center text-xs text-text-secondary">
                    No logo
                  </div>
                )}
                <Button variant="secondary" size="sm" onClick={handlePickLogo} loading={uploadingLogo}>
                  {uploadingLogo ? 'Uploading…' : 'Upload Logo'}
                </Button>
                {form.logo_url && (
                  <Button variant="ghost" size="sm" onClick={() => { setForm((f) => ({ ...f, logo_url: '' })); setLogoPreview('') }}>
                    Remove
                  </Button>
                )}
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-4 overflow-y-auto pl-1">
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
