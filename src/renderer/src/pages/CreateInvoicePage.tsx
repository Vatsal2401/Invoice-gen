import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Trash2, Search, ChevronDown, X } from 'lucide-react'
import type { Customer, InvoiceItem, InvoiceWithItems } from '../types'
import { useStore } from '../store/useStore'
import { calcItemAmounts, calcInvoiceTotals } from '../utils/taxCalculator'
import { formatCurrencyINR, formatCurrencyWithSymbol } from '../utils/formatCurrency'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import apiClient from '../lib/apiClient'
import { getApiError } from '../lib/apiError'

type FormItem = InvoiceItem & { _key: string }

function newItem(sl_no: number): FormItem {
  return {
    _key: Math.random().toString(36).slice(2),
    sl_no,
    description: '',
    hsn_sac: '',
    quantity: 0,
    unit: 'SQF',
    rate: 0,
    per: 'SQF',
    amount: 0,
    cgst_rate: 9,
    sgst_rate: 9,
    cgst_amount: 0,
    sgst_amount: 0
  }
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wide">{label}</span>
      {children}
    </div>
  )
}

const inputCls = 'w-full border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-accent disabled:bg-gray-100 disabled:text-text-secondary'

export default function CreateInvoicePage(): React.ReactElement {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editId = params.get('id')
  const preselectedCustomerId = params.get('customerId')
  const { showToast } = useStore()

  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10))
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerDropOpen, setCustomerDropOpen] = useState(false)
  const customerDropRef = useRef<HTMLDivElement>(null)
  const [isLocked, setIsLocked] = useState(false)

  const [deliveryNote, setDeliveryNote] = useState('')
  const [buyerOrderNumber, setBuyerOrderNumber] = useState('')
  const [buyerOrderDate, setBuyerOrderDate] = useState('')
  const [dispatchDocNumber, setDispatchDocNumber] = useState('')
  const [dispatchDocDate, setDispatchDocDate] = useState('')
  const [dispatchedThrough, setDispatchedThrough] = useState('')
  const [destination, setDestination] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [deliveryTerms, setDeliveryTerms] = useState('')

  const [buyerName, setBuyerName] = useState('')
  const [buyerAddress, setBuyerAddress] = useState('')
  const [buyerGstin, setBuyerGstin] = useState('')
  const [buyerPan, setBuyerPan] = useState('')
  const [buyerState, setBuyerState] = useState('')
  const [buyerStateCode, setBuyerStateCode] = useState('')

  const [shipSame, setShipSame] = useState(true)
  const [shipName, setShipName] = useState('')
  const [shipAddress, setShipAddress] = useState('')
  const [shipGstin, setShipGstin] = useState('')
  const [shipState, setShipState] = useState('')

  const [items, setItems] = useState<FormItem[]>([newItem(1)])
  const [saving, setSaving] = useState(false)
  const firstRef = useRef<HTMLInputElement>(null)

  useEffect(() => { firstRef.current?.focus() }, [])

  useEffect(() => {
    apiClient.get<Customer[]>('/invoice/customers').then(({ data }) => {
      setCustomers(data)
      // Auto-select if navigated from Customers page
      if (preselectedCustomerId && !editId) {
        const c = data.find((x) => x.id === preselectedCustomerId)
        if (c) applyCustomer(c)
      }
    }).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent): void => {
      if (customerDropRef.current && !customerDropRef.current.contains(e.target as Node)) {
        setCustomerDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (editId) {
      apiClient.get<InvoiceWithItems>(`/invoice/invoices/${editId}`).then(({ data: inv }) => {
        setIsLocked(inv.status === 'FINAL')
        setInvoiceNumber(inv.invoice_number)
        setInvoiceDate(inv.invoice_date)
        setDeliveryNote(inv.delivery_note)
        setBuyerOrderNumber(inv.buyer_order_number)
        setBuyerOrderDate(inv.buyer_order_date)
        setDispatchDocNumber(inv.dispatch_doc_number)
        setDispatchDocDate(inv.dispatch_doc_date)
        setDispatchedThrough(inv.dispatched_through)
        setDestination(inv.destination)
        setPaymentTerms(inv.payment_terms)
        setDeliveryTerms(inv.delivery_terms)
        setBuyerName(inv.buyer_name)
        setBuyerAddress(inv.buyer_address)
        setBuyerGstin(inv.buyer_gstin)
        setBuyerPan(inv.buyer_pan)
        setBuyerState(inv.buyer_state)
        setBuyerStateCode(inv.buyer_state_code)
        setShipName(inv.ship_to_name)
        setShipAddress(inv.ship_to_address)
        setShipGstin(inv.ship_to_gstin)
        setShipState(inv.ship_to_state)
        setShipSame(!inv.ship_to_name || inv.ship_to_name === inv.buyer_name)
        if (inv.customer_id) setSelectedCustomerId(inv.customer_id)
        setItems(inv.items.map((i) => ({
          _key: Math.random().toString(36).slice(2),
          sl_no: Number(i.sl_no),
          description: i.description ?? '',
          hsn_sac: i.hsn_sac ?? '',
          quantity: Number(i.quantity),
          unit: i.unit ?? '',
          rate: Number(i.rate),
          per: i.per ?? '',
          amount: Number(i.amount),
          cgst_rate: Number(i.cgst_rate),
          sgst_rate: Number(i.sgst_rate),
          cgst_amount: Number(i.cgst_amount),
          sgst_amount: Number(i.sgst_amount),
        })))
      }).catch(() => {})
    } else {
      apiClient.get<{ next_number: string }>('/invoice/invoices/next-number').then(({ data }) => {
        setInvoiceNumber(data.next_number)
      }).catch(() => {})
    }
  }, [editId])

  const applyCustomer = (c: Customer): void => {
    setSelectedCustomerId(String(c.id))
    setBuyerName(c.name)
    setBuyerAddress([c.address, c.city, c.pincode].filter(Boolean).join(', '))
    setBuyerGstin(c.gstin)
    setBuyerPan(c.pan)
    setBuyerState(c.state)
    setBuyerStateCode(c.state_code)
    setCustomerSearch('')
    setCustomerDropOpen(false)
  }

  const clearCustomer = (): void => {
    setSelectedCustomerId('')
    setCustomerSearch('')
    setBuyerName('')
    setBuyerAddress('')
    setBuyerGstin('')
    setBuyerPan('')
    setBuyerState('')
    setBuyerStateCode('')
  }

  const updateItem = useCallback((key: string, field: string, value: string | number): void => {
    setItems((prev) =>
      prev.map((item) => {
        if (item._key !== key) return item
        const updated = { ...item, [field]: value }
        const calculated = calcItemAmounts(updated) as FormItem
        return { ...calculated, _key: key }
      })
    )
  }, [])

  const addItem = (): void => {
    setItems((prev) => [...prev, newItem(prev.length + 1)])
  }

  const removeItem = (key: string): void => {
    setItems((prev) => {
      const filtered = prev.filter((i) => i._key !== key)
      return filtered.map((i, idx) => ({ ...i, sl_no: idx + 1 }))
    })
  }

  const totals = calcInvoiceTotals(items)

  const buildInvoiceData = () => ({
    invoice_number: invoiceNumber || undefined,
    invoice_date: invoiceDate,
    ship_to_name: shipSame ? buyerName : shipName,
    ship_to_address: shipSame ? buyerAddress : shipAddress,
    ship_to_gstin: shipSame ? buyerGstin : shipGstin,
    ship_to_state: shipSame ? buyerState : shipState,
    customer_id: selectedCustomerId || null,
    buyer_name: buyerName,
    buyer_address: buyerAddress,
    buyer_gstin: buyerGstin,
    buyer_pan: buyerPan,
    buyer_state: buyerState,
    buyer_state_code: buyerStateCode,
    delivery_note: deliveryNote,
    buyer_order_number: buyerOrderNumber,
    buyer_order_date: buyerOrderDate,
    dispatch_doc_number: dispatchDocNumber,
    dispatch_doc_date: dispatchDocDate,
    dispatched_through: dispatchedThrough,
    destination,
    payment_terms: paymentTerms,
    delivery_terms: deliveryTerms,
    ...totals,
  })

  const handleSave = async (): Promise<void> => {
    if (!buyerName.trim()) { showToast('error', 'Buyer name is required'); return }
    setSaving(true)
    try {
      const invoiceData = buildInvoiceData()
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const cleanItems = items.map(({ _key, ...rest }) => rest)
      const payload = { ...invoiceData, items: cleanItems }
      if (editId) {
        await apiClient.patch(`/invoice/invoices/${editId}`, payload)
        showToast('success', 'Invoice updated')
        navigate(`/invoices/${editId}/preview`)
      } else {
        const { data } = await apiClient.post<{ id: string }>('/invoice/invoices', payload)
        showToast('success', 'Invoice saved as draft')
        navigate(`/invoices/${data.id}/preview`)
      }
    } catch (err) {
      showToast('error', getApiError(err, editId ? 'Update failed' : 'Save failed'))
    } finally {
      setSaving(false)
    }
  }

  const disabled = isLocked

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-border flex-shrink-0">
        <h1 className="text-xl font-bold text-text-primary">
          {editId ? 'Edit Invoice' : 'New Invoice'}
        </h1>
        {!isLocked && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" loading={saving} onClick={handleSave}>Save Draft</Button>
            <Button size="sm" loading={saving} onClick={handleSave}>Preview Invoice</Button>
          </div>
        )}
      </div>

      {isLocked && (
        <div className="mx-4 mt-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded px-4 py-2 text-xs font-medium flex-shrink-0">
          This invoice is finalized and cannot be edited.
        </div>
      )}

      {/* ── Two-panel body ── */}
      <div className="flex-1 flex gap-0 overflow-hidden">

        {/* ── LEFT PANEL: Meta + Buyer + Ship To ── */}
        <div className="w-[420px] flex-shrink-0 flex flex-col overflow-y-auto border-r border-border bg-bg-base">
          <div className="p-3 space-y-3">

            {/* Invoice Details */}
            <Panel title="Invoice Details">
              <div className="grid grid-cols-2 gap-2">
                <FieldRow label="Invoice No.">
                  <input
                    ref={firstRef}
                    className={inputCls}
                    value={invoiceNumber}
                    onChange={(e) => !disabled && setInvoiceNumber(e.target.value)}
                    disabled={disabled}
                    placeholder="e.g. INV-001"
                  />
                </FieldRow>
                <FieldRow label="Date">
                  <input type="date" className={inputCls} value={invoiceDate}
                    onChange={(e) => !disabled && setInvoiceDate(e.target.value)} disabled={disabled} />
                </FieldRow>
                <FieldRow label="PO No.">
                  <input className={inputCls} value={deliveryNote}
                    onChange={(e) => !disabled && setDeliveryNote(e.target.value)} disabled={disabled} />
                </FieldRow>
                <FieldRow label="Payment Terms">
                  <input className={inputCls} value={paymentTerms}
                    onChange={(e) => !disabled && setPaymentTerms(e.target.value)} disabled={disabled} />
                </FieldRow>
                <FieldRow label="Vehicle Number">
                  <input className={inputCls} value={buyerOrderNumber}
                    onChange={(e) => !disabled && setBuyerOrderNumber(e.target.value)} disabled={disabled} />
                </FieldRow>
                <FieldRow label="Order Date">
                  <input type="date" className={inputCls} value={buyerOrderDate}
                    onChange={(e) => !disabled && setBuyerOrderDate(e.target.value)} disabled={disabled} />
                </FieldRow>
                <FieldRow label="Dispatch Doc No.">
                  <input className={inputCls} value={dispatchDocNumber}
                    onChange={(e) => !disabled && setDispatchDocNumber(e.target.value)} disabled={disabled} />
                </FieldRow>
                <FieldRow label="Doc Date">
                  <input type="date" className={inputCls} value={dispatchDocDate}
                    onChange={(e) => !disabled && setDispatchDocDate(e.target.value)} disabled={disabled} />
                </FieldRow>
                <FieldRow label="Dispatched Via">
                  <input className={inputCls} value={dispatchedThrough}
                    onChange={(e) => !disabled && setDispatchedThrough(e.target.value)} disabled={disabled} />
                </FieldRow>
                <FieldRow label="Destination">
                  <input className={inputCls} value={destination}
                    onChange={(e) => !disabled && setDestination(e.target.value)} disabled={disabled} />
                </FieldRow>
              </div>
              <div className="mt-2">
                <FieldRow label="Delivery Terms">
                  <input className={inputCls} value={deliveryTerms}
                    onChange={(e) => !disabled && setDeliveryTerms(e.target.value)} disabled={disabled} />
                </FieldRow>
              </div>
            </Panel>

            {/* Buyer (Bill To) */}
            <Panel title="Buyer (Bill To)">
              <div className="space-y-2">
                <FieldRow label="Select Customer">
                  <div ref={customerDropRef} className="relative">
                    {/* Trigger button */}
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => !disabled && setCustomerDropOpen((o) => !o)}
                      className={`${inputCls} flex items-center justify-between bg-white text-left`}
                    >
                      <span className={selectedCustomerId ? 'text-text-primary' : 'text-text-secondary'}>
                        {selectedCustomerId
                          ? customers.find((c) => String(c.id) === selectedCustomerId)?.name || '— Select customer —'
                          : '— Select customer —'}
                      </span>
                      <div className="flex items-center gap-1 ml-1 flex-shrink-0">
                        {selectedCustomerId && !disabled && (
                          <X
                            size={11}
                            className="text-text-secondary hover:text-danger"
                            onClick={(e) => { e.stopPropagation(); clearCustomer() }}
                          />
                        )}
                        <ChevronDown size={11} className="text-text-secondary" />
                      </div>
                    </button>
                    {/* Dropdown */}
                    {customerDropOpen && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-white border border-border rounded shadow-lg">
                        {/* Search input */}
                        <div className="p-1.5 border-b border-border flex items-center gap-1">
                          <Search size={11} className="text-text-secondary flex-shrink-0" />
                          <input
                            autoFocus
                            type="text"
                            placeholder="Search..."
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                            className="flex-1 text-xs outline-none"
                          />
                        </div>
                        {/* Options */}
                        <div className="max-h-48 overflow-y-auto">
                          {customers
                            .filter((c) => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
                            .map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => applyCustomer(c)}
                                className={`w-full text-left px-2.5 py-1.5 text-xs hover:bg-blue-50 flex flex-col
                                  ${String(c.id) === selectedCustomerId ? 'bg-blue-50 font-medium' : ''}`}
                              >
                                <span>{c.name}</span>
                                {c.gstin && <span className="text-text-secondary font-normal">{c.gstin}</span>}
                              </button>
                            ))}
                          {customers.filter((c) => c.name.toLowerCase().includes(customerSearch.toLowerCase())).length === 0 && (
                            <p className="text-center text-text-secondary text-xs py-3">No match</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </FieldRow>
                <FieldRow label="Name *">
                  <input className={inputCls} value={buyerName}
                    onChange={(e) => !disabled && setBuyerName(e.target.value)} disabled={disabled} />
                </FieldRow>
                <FieldRow label="Address">
                  <input className={inputCls} value={buyerAddress}
                    onChange={(e) => !disabled && setBuyerAddress(e.target.value)} disabled={disabled} />
                </FieldRow>
                <div className="grid grid-cols-2 gap-2">
                  <FieldRow label="GSTIN">
                    <input className={inputCls} value={buyerGstin}
                      onChange={(e) => !disabled && setBuyerGstin(e.target.value)} disabled={disabled} />
                  </FieldRow>
                  <FieldRow label="PAN">
                    <input className={inputCls} value={buyerPan}
                      onChange={(e) => !disabled && setBuyerPan(e.target.value)} disabled={disabled} />
                  </FieldRow>
                  <FieldRow label="State">
                    <input className={inputCls} value={buyerState}
                      onChange={(e) => !disabled && setBuyerState(e.target.value)} disabled={disabled} />
                  </FieldRow>
                  <FieldRow label="State Code">
                    <input className={inputCls} value={buyerStateCode}
                      onChange={(e) => !disabled && setBuyerStateCode(e.target.value)} disabled={disabled} />
                  </FieldRow>
                </div>
              </div>
            </Panel>

            {/* Ship To (Consignee) */}
            <Panel
              title="Ship To (Consignee)"
              action={
                <label className="flex items-center gap-1.5 text-xs cursor-pointer text-text-secondary">
                  <input
                    type="checkbox"
                    checked={shipSame}
                    onChange={(e) => !disabled && setShipSame(e.target.checked)}
                    disabled={disabled}
                    className="w-3 h-3"
                  />
                  Same as Buyer
                </label>
              }
            >
              {shipSame ? (
                <p className="text-xs text-text-secondary">Mirrors Buyer details.</p>
              ) : (
                <div className="space-y-2">
                  <FieldRow label="Name">
                    <input className={inputCls} value={shipName}
                      onChange={(e) => !disabled && setShipName(e.target.value)} disabled={disabled} />
                  </FieldRow>
                  <FieldRow label="Address">
                    <input className={inputCls} value={shipAddress}
                      onChange={(e) => !disabled && setShipAddress(e.target.value)} disabled={disabled} />
                  </FieldRow>
                  <div className="grid grid-cols-2 gap-2">
                    <FieldRow label="GSTIN">
                      <input className={inputCls} value={shipGstin}
                        onChange={(e) => !disabled && setShipGstin(e.target.value)} disabled={disabled} />
                    </FieldRow>
                    <FieldRow label="State">
                      <input className={inputCls} value={shipState}
                        onChange={(e) => !disabled && setShipState(e.target.value)} disabled={disabled} />
                    </FieldRow>
                  </div>
                </div>
              )}
            </Panel>

          </div>
        </div>

        {/* ── RIGHT PANEL: Items table + Totals ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-bg-base">

          {/* Items table — scrollable */}
          <div className="flex-1 overflow-auto p-3">
            <div className="bg-bg-card rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-gray-50">
                <span className="text-sm font-semibold text-text-primary">Items</span>
                {!disabled && (
                  <Button variant="ghost" size="sm" onClick={addItem}>
                    <Plus size={13} /> Add Item
                  </Button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-gray-50 border-b border-border">
                    <tr>
                      {[
                        { label: 'Sl', cls: 'w-8 text-center' },
                        { label: 'Description', cls: 'min-w-[150px]' },
                        { label: 'HSN/SAC', cls: 'w-24' },
                        { label: 'Qty', cls: 'w-20 text-right' },
                        { label: 'Unit', cls: 'w-14' },
                        { label: 'Rate', cls: 'w-24 text-right' },
                        { label: 'Per', cls: 'w-12' },
                        { label: 'CGST%', cls: 'w-14 text-right' },
                        { label: 'SGST%', cls: 'w-14 text-right' },
                        { label: 'Amount', cls: 'w-28 text-right' },
                        { label: '', cls: 'w-8' }
                      ].map(({ label, cls }) => (
                        <th
                          key={label}
                          scope="col"
                          className={`text-[10px] font-semibold uppercase tracking-wide text-text-secondary px-2 py-1.5 ${cls}`}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item._key} className="border-b border-border hover:bg-gray-50">
                        <td className="px-2 py-1 text-center text-text-secondary">{item.sl_no}</td>
                        <td className="px-1 py-1">
                          <input
                            className={inputCls}
                            value={item.description}
                            onChange={(e) => updateItem(item._key, 'description', e.target.value)}
                            disabled={disabled}
                            placeholder="Description"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            className={inputCls}
                            value={item.hsn_sac}
                            onChange={(e) => updateItem(item._key, 'hsn_sac', e.target.value)}
                            disabled={disabled}
                            placeholder="HSN"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            className={`${inputCls} text-right`}
                            value={item.quantity || ''}
                            onChange={(e) => updateItem(item._key, 'quantity', parseFloat(e.target.value) || 0)}
                            disabled={disabled}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            className={inputCls}
                            value={item.unit}
                            onChange={(e) => updateItem(item._key, 'unit', e.target.value)}
                            disabled={disabled}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            className={`${inputCls} text-right`}
                            value={item.rate || ''}
                            onChange={(e) => updateItem(item._key, 'rate', parseFloat(e.target.value) || 0)}
                            disabled={disabled}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            className={inputCls}
                            value={item.per}
                            onChange={(e) => updateItem(item._key, 'per', e.target.value)}
                            disabled={disabled}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            className={`${inputCls} text-right`}
                            value={item.cgst_rate}
                            onChange={(e) => updateItem(item._key, 'cgst_rate', parseFloat(e.target.value) || 0)}
                            disabled={disabled}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            className={`${inputCls} text-right`}
                            value={item.sgst_rate}
                            onChange={(e) => updateItem(item._key, 'sgst_rate', parseFloat(e.target.value) || 0)}
                            disabled={disabled}
                          />
                        </td>
                        <td className="px-2 py-1 text-right tabular-nums font-mono">
                          {formatCurrencyINR(item.amount)}
                        </td>
                        <td className="px-1 py-1 text-center">
                          {!disabled && items.length > 1 && (
                            <button
                              onClick={() => removeItem(item._key)}
                              className="text-danger hover:text-red-700 p-0.5"
                              title="Remove item"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Totals bar — fixed at bottom of right panel */}
          <div className="flex-shrink-0 border-t border-border bg-white px-6 py-3">
            <div className="flex items-center justify-end gap-8 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-text-secondary">Taxable Value</span>
                <span className="tabular-nums font-mono font-medium">{formatCurrencyINR(totals.taxable_value)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-secondary">CGST</span>
                <span className="tabular-nums font-mono font-medium">{formatCurrencyINR(totals.cgst_total)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-secondary">SGST</span>
                <span className="tabular-nums font-mono font-medium">{formatCurrencyINR(totals.sgst_total)}</span>
              </div>
              <div className="flex items-center gap-3 pl-6 border-l border-border">
                <span className="text-sm font-semibold">Grand Total</span>
                <span className="text-lg font-bold tabular-nums font-mono text-primary">
                  {formatCurrencyWithSymbol(totals.grand_total)}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

function Panel({
  title,
  action,
  children
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}): React.ReactElement {
  return (
    <div className="bg-bg-card rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-border">
        <span className="text-xs font-semibold text-text-primary uppercase tracking-wide">{title}</span>
        {action}
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}
