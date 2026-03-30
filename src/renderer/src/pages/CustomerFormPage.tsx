import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { Customer, CustomerInput } from '../types'
import { useStore } from '../store/useStore'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { PageLoadingSkeleton } from '../components/ui/Skeleton'
import apiClient from '../lib/apiClient'
import { getApiError } from '../lib/apiError'
import { useQueryCache } from '../store/useQueryCache'

const EMPTY_FORM: CustomerInput = {
  name: '',
  address: '',
  city: '',
  state: '',
  state_code: '',
  pincode: '',
  gstin: '',
  pan: '',
  phone: '',
  ship_to_name: '',
  ship_to_address: '',
  ship_to_city: '',
  ship_to_state: '',
  ship_to_state_code: '',
  ship_to_pincode: '',
  ship_to_gstin: '',
}

function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xs font-bold text-text-secondary uppercase tracking-widest">{title}</h2>
      {right}
    </div>
  )
}

export default function CustomerFormPage(): React.ReactElement {
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const { showToast } = useStore()
  const firstRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<CustomerInput>(EMPTY_FORM)
  const [shipSame, setShipSame] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingCustomer, setLoadingCustomer] = useState(isEdit)

  // Load existing customer for edit
  useEffect(() => {
    if (!isEdit) {
      setTimeout(() => firstRef.current?.focus(), 50)
      return
    }
    setLoadingCustomer(true)
    apiClient.get<Customer>(`/invoice/customers/${id}`)
      .then(({ data }) => {
        const { id: _id, created_at: _ca, updated_at: _ua, user_id: _uid, deleted_at: _da, ...rest } = data as any
        setForm(rest as CustomerInput)
        setShipSame(!data.ship_to_name)
      })
      .catch((err) => {
        showToast('error', getApiError(err, 'Failed to load customer'))
        navigate('/customers')
      })
      .finally(() => {
        setLoadingCustomer(false)
        setTimeout(() => firstRef.current?.focus(), 50)
      })
  }, [id])

  const handleChange = (field: keyof CustomerInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  const handleShipSameChange = (checked: boolean): void => {
    setShipSame(checked)
    if (checked) {
      setForm((f) => ({
        ...f,
        ship_to_name: '',
        ship_to_address: '',
        ship_to_city: '',
        ship_to_state: '',
        ship_to_state_code: '',
        ship_to_pincode: '',
        ship_to_gstin: '',
      }))
    }
  }

  const invalidateCustomersCache = (): void => {
    const { invalidate } = useQueryCache.getState()
    const keys = Object.keys(useQueryCache.getState().entries).filter((k) => k.startsWith('/invoice/customers'))
    if (keys.length > 0) invalidate(...keys)
  }

  const handleSave = async (): Promise<void> => {
    if (!form.name.trim()) { showToast('error', 'Customer name is required'); return }
    setSaving(true)
    try {
      if (isEdit) {
        await apiClient.patch(`/invoice/customers/${id}`, form)
        showToast('success', 'Customer updated')
      } else {
        await apiClient.post('/invoice/customers', form)
        showToast('success', 'Customer added')
      }
      invalidateCustomersCache()
      navigate('/customers')
    } catch (err) {
      showToast('error', getApiError(err, 'Save failed'))
    } finally {
      setSaving(false)
    }
  }

  if (loadingCustomer) return <PageLoadingSkeleton />

  return (
    <div className="h-full flex flex-col overflow-hidden bg-bg-base">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/customers')}
            className="p-1.5 rounded-lg hover:bg-bg-muted transition-colors text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-text-primary">
              {isEdit ? 'Edit Customer' : 'New Customer'}
            </h1>
            <p className="text-xs text-text-secondary">
              {isEdit ? 'Update customer details' : 'Add a new customer to your directory'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => navigate('/customers')}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>
            {isEdit ? 'Save Changes' : 'Add Customer'}
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Bill To Card */}
          <div className="bg-white rounded-xl border border-border p-6">
            <SectionHeader title="Bill To (Buyer)" />
            <div className="space-y-4">
              <Input ref={firstRef} label="Name *" value={form.name} onChange={handleChange('name')} placeholder="Customer or company name" />
              <Input label="Address" value={form.address} onChange={handleChange('address')} placeholder="Street address" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="City" value={form.city} onChange={handleChange('city')} />
                <Input label="State" value={form.state} onChange={handleChange('state')} placeholder="e.g. Uttar Pradesh" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="State Code" value={form.state_code} onChange={handleChange('state_code')} placeholder="e.g. 09" />
                <Input label="Pincode" value={form.pincode} onChange={handleChange('pincode')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="GSTIN" value={form.gstin} onChange={handleChange('gstin')} placeholder="22AAAAA0000A1Z5" className="font-mono" />
                <Input label="PAN" value={form.pan} onChange={handleChange('pan')} placeholder="AAAAA0000A" className="font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Phone" value={form.phone} onChange={handleChange('phone')} placeholder="10-digit mobile" />
              </div>
            </div>
          </div>

          {/* Ship To Card */}
          <div className="bg-white rounded-xl border border-border p-6">
            <SectionHeader
              title="Ship To (Consignee)"
              right={
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none text-text-secondary">
                  <input
                    type="checkbox"
                    checked={shipSame}
                    onChange={(e) => handleShipSameChange(e.target.checked)}
                    className="w-4 h-4 accent-accent rounded"
                  />
                  Same as Bill To
                </label>
              }
            />
            {shipSame ? (
              <p className="text-sm text-text-secondary">
                Ship To address will mirror Bill To on generated invoices.
              </p>
            ) : (
              <div className="space-y-4">
                <Input label="Ship To Name" value={form.ship_to_name} onChange={handleChange('ship_to_name')} placeholder="Delivery location name" />
                <Input label="Ship To Address" value={form.ship_to_address} onChange={handleChange('ship_to_address')} placeholder="Delivery street address" />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="City" value={form.ship_to_city} onChange={handleChange('ship_to_city')} />
                  <Input label="State" value={form.ship_to_state} onChange={handleChange('ship_to_state')} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="State Code" value={form.ship_to_state_code} onChange={handleChange('ship_to_state_code')} />
                  <Input label="Pincode" value={form.ship_to_pincode} onChange={handleChange('ship_to_pincode')} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="GSTIN" value={form.ship_to_gstin} onChange={handleChange('ship_to_gstin')} placeholder="22AAAAA0000A1Z5" className="font-mono" />
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Sticky footer save bar */}
      <div className="flex-shrink-0 border-t border-border bg-white px-6 py-3 flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate('/customers')}>Cancel</Button>
        <Button onClick={handleSave} loading={saving}>
          {isEdit ? 'Save Changes' : 'Add Customer'}
        </Button>
      </div>
    </div>
  )
}
