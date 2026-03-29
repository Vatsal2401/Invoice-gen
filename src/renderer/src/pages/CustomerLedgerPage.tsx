import React, { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, FileDown } from 'lucide-react'
import type { Customer, LedgerEntry, Payment, BusinessProfile } from '../types'
import { useStore } from '../store/useStore'
import { formatCurrencyWithSymbol } from '../utils/formatCurrency'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import LedgerTemplate from '../components/invoice/LedgerTemplate'
import { PageLoadingSkeleton, KPISkeleton, TableSkeleton } from '../components/ui/Skeleton'
import apiClient from '../lib/apiClient'
import { getApiError } from '../lib/apiError'

const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'NEFT', 'RTGS', 'Other']

function fmtDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}-${m}-${y}`
}

function fiscalYear(): { from: string; to: string } {
  const now = new Date()
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  return { from: `${year}-04-01`, to: `${year + 1}-03-31` }
}

export default function CustomerLedgerPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useStore()

  const fy = fiscalYear()
  const [fromDate, setFromDate] = useState(fy.from)
  const [toDate, setToDate] = useState(fy.to)

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [business, setBusiness] = useState<BusinessProfile | null>(null)
  const [logoDataUrl, setLogoDataUrl] = useState('')
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [payments, setPayments] = useState<Payment[]>([])

  const [ledgerLoading, setLedgerLoading] = useState(true)
  const [payModal, setPayModal] = useState(false)
  const [payForm, setPayForm] = useState({ payment_date: new Date().toISOString().slice(0, 10), amount: '', mode: 'Cash', reference: '', narration: '', entryType: 'credit' })
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Payment | null>(null)
  const [exportLoading, setExportLoading] = useState(false)
  const [showPrint, setShowPrint] = useState(false)

  useEffect(() => {
    if (!id) return
    apiClient.get<Customer>(`/invoice/customers/${id}`).then(({ data }) => setCustomer(data)).catch(() => {})
    apiClient.get<BusinessProfile>('/invoice/profile').then(({ data }) => {
      setBusiness(data)
      if (data.logo_url) setLogoDataUrl(data.logo_url)
    }).catch(() => {})
  }, [id])

  const loadLedger = useCallback(async () => {
    if (!id) return
    try {
      const [ledgerRes, payRes] = await Promise.all([
        apiClient.get(`/invoice/payments/ledger?customerId=${id}&from=${fromDate}&to=${toDate}`),
        apiClient.get<Payment[]>(`/invoice/payments?customerId=${id}`)
      ])
      const data = ledgerRes.data as { invoices: Array<{ id: string; invoice_number: string; invoice_date: string; grand_total: number; cancelled: boolean; item_descriptions: string[] }>; payments: Array<{ id: string; payment_date: string; amount: number; mode: string; reference: string; narration: string }> }

      setPayments(payRes.data)

      const allEntries: LedgerEntry[] = []
      for (const inv of data.invoices) {
        if (inv.cancelled) continue
        allEntries.push({
          date: inv.invoice_date,
          particulars: inv.item_descriptions?.length ? inv.item_descriptions[0] : 'GST Sales',
          item_descriptions: inv.item_descriptions ?? [],
          narration: inv.invoice_number,
          vch_type: 'Sales',
          vch_no: inv.invoice_number.split('-').pop() || inv.id,
          debit: Number(inv.grand_total) || 0,
          credit: 0,
          ref_type: 'invoice',
          ref_id: inv.id
        })
      }
      for (const pay of data.payments) {
        const payAmt = Number(pay.amount) || 0
        const isDebit = payAmt < 0
        allEntries.push({
          date: pay.payment_date,
          particulars: isDebit ? `Debit Note (${pay.mode})` : pay.mode,
          item_descriptions: [],
          narration: pay.reference || pay.narration || '',
          vch_type: isDebit ? 'Debit Note' : 'Receipt',
          vch_no: pay.id,
          debit: isDebit ? Math.abs(payAmt) : 0,
          credit: isDebit ? 0 : payAmt,
          ref_type: 'payment',
          ref_id: pay.id
        })
      }
      allEntries.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0)
      setEntries(allEntries)
    } catch (err) {
      showToast('error', getApiError(err, 'Failed to load ledger'))
    } finally {
      setLedgerLoading(false)
    }
  }, [id, fromDate, toDate, showToast])

  useEffect(() => { loadLedger() }, [loadLedger])

  const totalDebit = entries.reduce((s, e) => s + e.debit, 0)
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0)
  const closing = totalDebit - totalCredit

  const handleAddPayment = async (): Promise<void> => {
    const amt = parseFloat(payForm.amount)
    if (!amt || amt <= 0) { showToast('error', 'Enter a valid positive amount'); return }
    const finalAmt = payForm.entryType === 'debit' ? -amt : amt
    setSaving(true)
    try {
      await apiClient.post('/invoice/payments', {
        customer_id: id,
        payment_date: payForm.payment_date,
        amount: finalAmt,
        mode: payForm.mode,
        reference: payForm.reference,
        narration: payForm.narration
      })
      showToast('success', payForm.entryType === 'debit' ? 'Debit entry recorded' : 'Payment recorded')
      setPayModal(false)
      setPayForm({ payment_date: new Date().toISOString().slice(0, 10), amount: '', mode: 'Cash', reference: '', narration: '', entryType: 'credit' })
      loadLedger()
    } catch (err) {
      showToast('error', getApiError(err, 'Failed to record payment'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePayment = async (): Promise<void> => {
    if (!deleteConfirm) return
    try {
      await apiClient.delete(`/invoice/payments/${deleteConfirm.id}`)
      showToast('success', 'Payment deleted')
      setDeleteConfirm(null)
      loadLedger()
    } catch (err) {
      showToast('error', getApiError(err, 'Delete failed'))
    }
  }

  const handleExportPDF = async (): Promise<void> => {
    if (!customer || !id) return
    setExportLoading(true)
    const res = await window.api.exportLedgerPDF(id, customer.name, fromDate, toDate)
    setExportLoading(false)
    if (res.success) showToast('success', 'Ledger PDF exported')
    else if (res.message !== 'Export cancelled') showToast('error', res.message || 'Export failed')
  }

  if (!customer || !business) return <PageLoadingSkeleton />

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-border flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate('/customers')}><ArrowLeft size={14} /> Back</Button>
        <div>
          <h1 className="text-base font-bold text-text-primary leading-tight">{customer.name}</h1>
          <p className="text-xs text-text-secondary">Ledger Account</p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-text-secondary text-xs">From</span>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-accent" />
          <span className="text-text-secondary text-xs">To</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-accent" />
        </div>
        <Button variant="secondary" size="sm" onClick={() => setPayModal(true)}><Plus size={14} /> Add Payment</Button>
        <Button size="sm" loading={exportLoading} onClick={handleExportPDF}><FileDown size={14} /> Export PDF</Button>
        <Button variant="ghost" size="sm" onClick={() => setShowPrint(!showPrint)}>{showPrint ? 'Hide Preview' : 'Print Preview'}</Button>
      </div>

      <div className="flex gap-4 px-6 py-3 bg-bg-base border-b border-border flex-shrink-0">
        {ledgerLoading ? (
          <><KPISkeleton /><KPISkeleton /><KPISkeleton /><KPISkeleton /></>
        ) : (
          <>
            <SummaryCard label="Total Sales (Debit)" value={formatCurrencyWithSymbol(totalDebit)} color="text-red-600" />
            <SummaryCard label="Total Received (Credit)" value={formatCurrencyWithSymbol(totalCredit)} color="text-green-600" />
            <SummaryCard label={closing >= 0 ? 'Outstanding Balance' : 'Advance / Overpaid'} value={formatCurrencyWithSymbol(Math.abs(closing))} color={closing > 0 ? 'text-red-700 font-bold' : 'text-green-700 font-bold'} />
            <SummaryCard label="Transactions" value={String(entries.length)} color="text-text-primary" />
          </>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {showPrint && business && (
          <div className="p-6 flex justify-center bg-gray-200 border-b border-border">
            <div className="shadow-lg">
              <LedgerTemplate business={business} customer={customer} entries={entries} fromDate={fromDate} toDate={toDate} logoDataUrl={logoDataUrl} />
            </div>
          </div>
        )}

        <div className="p-6">
          <div className="bg-bg-card rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b-2 border-border">
                <tr>
                  <th className="text-xs font-semibold uppercase tracking-wide text-text-secondary px-3 py-2 text-left w-28">Date</th>
                  <th className="text-xs font-semibold uppercase tracking-wide text-text-secondary px-3 py-2 text-left">Description of Goods</th>
                  <th className="text-xs font-semibold uppercase tracking-wide text-text-secondary px-3 py-2 text-left">Narration</th>
                  <th className="text-xs font-semibold uppercase tracking-wide text-text-secondary px-3 py-2 text-left w-20">Vch Type</th>
                  <th className="text-xs font-semibold uppercase tracking-wide text-text-secondary px-3 py-2 text-right w-24">Debit</th>
                  <th className="text-xs font-semibold uppercase tracking-wide text-text-secondary px-3 py-2 text-right w-24">Credit</th>
                  <th className="text-xs font-semibold uppercase tracking-wide text-text-secondary px-3 py-2 text-right w-28">Balance</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {ledgerLoading && <TableSkeleton rows={8} cols={8} />}
                {!ledgerLoading && entries.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-text-secondary py-10">No transactions in this period</td></tr>
                )}
                {!ledgerLoading && (() => {
                  let runBal = 0
                  return entries.map((e, i) => {
                    runBal += e.debit - e.credit
                    const bal = runBal
                    const payment = e.ref_type === 'payment' ? payments.find((p) => p.id === e.ref_id) ?? null : null
                    return (
                      <tr key={i} className={`border-b border-border hover:bg-gray-50 ${e.vch_type === 'Receipt' ? 'bg-green-50' : e.vch_type === 'Debit Note' ? 'bg-red-50' : ''}`}>
                        <td className="px-3 py-2 text-text-secondary text-xs">{fmtDate(e.date)}</td>
                        <td className="px-3 py-2 font-medium">
                          {e.ref_type === 'payment' ? (
                            <span className="text-green-700">By {e.particulars}</span>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              <span>{e.particulars}</span>
                              {e.item_descriptions.length > 1 && (
                                <ItemsPopover items={e.item_descriptions} />
                              )}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-text-secondary text-xs">{e.narration}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${e.vch_type === 'Receipt' ? 'bg-green-100 text-green-800' : e.vch_type === 'Debit Note' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{e.vch_type}</span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-mono text-red-600">{e.debit > 0 ? formatCurrencyWithSymbol(e.debit) : ''}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-mono text-green-600">{e.credit > 0 ? formatCurrencyWithSymbol(e.credit) : ''}</td>
                        <td className={`px-3 py-2 text-right tabular-nums font-mono font-medium ${bal > 0 ? 'text-red-700' : bal < 0 ? 'text-green-700' : 'text-text-secondary'}`}>
                          {bal === 0 ? '—' : formatCurrencyWithSymbol(Math.abs(bal))}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {payment && (
                            <button onClick={() => setDeleteConfirm(payment)} className="text-danger hover:text-red-700" title="Delete payment">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                })()}
              </tbody>
              {!ledgerLoading && entries.length > 0 && (
                <tfoot className="bg-gray-50 border-t-2 border-border font-semibold">
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-sm">Total</td>
                    <td className="px-3 py-2 text-right tabular-nums font-mono text-red-700">{formatCurrencyWithSymbol(totalDebit)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-mono text-green-700">{formatCurrencyWithSymbol(totalCredit)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums font-mono ${closing > 0 ? 'text-red-700' : closing < 0 ? 'text-green-700' : 'text-text-secondary'}`}>
                      {closing === 0 ? 'Settled' : formatCurrencyWithSymbol(Math.abs(closing))}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      <Modal open={payModal} title={payForm.entryType === 'debit' ? 'Add Debit Entry' : 'Record Payment Received'} onClose={() => setPayModal(false)}
        footer={<><Button variant="secondary" onClick={() => setPayModal(false)}>Cancel</Button><Button variant={payForm.entryType === 'debit' ? 'danger' : undefined} onClick={handleAddPayment} loading={saving}>{payForm.entryType === 'debit' ? 'Save Debit Entry' : 'Save Payment'}</Button></>}>
        <div className="space-y-4">
          <div className="flex rounded-lg overflow-hidden border border-border">
            <button type="button" onClick={() => setPayForm((f) => ({ ...f, entryType: 'credit' }))} className={`flex-1 py-2 text-sm font-medium transition-colors ${payForm.entryType === 'credit' ? 'bg-green-600 text-white' : 'bg-white text-text-secondary hover:bg-gray-50'}`}>↓ Receipt (Credit)</button>
            <button type="button" onClick={() => setPayForm((f) => ({ ...f, entryType: 'debit' }))} className={`flex-1 py-2 text-sm font-medium transition-colors border-l border-border ${payForm.entryType === 'debit' ? 'bg-red-600 text-white' : 'bg-white text-text-secondary hover:bg-gray-50'}`}>↑ Debit Note</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date" type="date" value={payForm.payment_date} onChange={(e) => setPayForm((f) => ({ ...f, payment_date: e.target.value }))} />
            <Input label="Amount (₹) *" type="number" value={payForm.amount} onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Payment Mode</label>
            <select value={payForm.mode} onChange={(e) => setPayForm((f) => ({ ...f, mode: e.target.value }))} className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent">
              {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <Input label="Reference / Cheque No." value={payForm.reference} onChange={(e) => setPayForm((f) => ({ ...f, reference: e.target.value }))} placeholder="e.g. CHQ-001, UTR No." />
          <Input label="Narration" value={payForm.narration} onChange={(e) => setPayForm((f) => ({ ...f, narration: e.target.value }))} placeholder="Optional note" />
        </div>
      </Modal>

      <Modal open={!!deleteConfirm} title="Delete Payment" onClose={() => setDeleteConfirm(null)}
        footer={<><Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button><Button variant="danger" onClick={handleDeletePayment}>Delete</Button></>}>
        <p>Delete this payment of <strong>{deleteConfirm && formatCurrencyWithSymbol(deleteConfirm.amount)}</strong> received on <strong>{deleteConfirm && fmtDate(deleteConfirm.payment_date)}</strong>?</p>
      </Modal>
    </div>
  )
}

function ItemsPopover({ items }: { items: string[] }): React.ReactElement {
  const [open, setOpen] = React.useState(false)
  const [pos, setPos] = React.useState({ top: 0, left: 0, openUp: false })
  const btnRef = React.useRef<HTMLButtonElement>(null)

  const handleMouseEnter = (): void => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const openUp = spaceBelow < 160
      setPos({
        top: openUp ? rect.top - 8 : rect.bottom + 4,
        left: rect.left,
        openUp,
      })
    }
    setOpen(true)
  }

  return (
    <span className="relative inline-block">
      <button
        ref={btnRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setOpen(false)}
        className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium hover:bg-blue-200 transition-colors"
      >
        +{items.length - 1} more
      </button>
      {open && (
        <div
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          style={{
            position: 'fixed',
            top: pos.openUp ? undefined : pos.top,
            bottom: pos.openUp ? window.innerHeight - pos.top : undefined,
            left: pos.left,
            zIndex: 9999,
          }}
          className="bg-white border border-border rounded-lg shadow-xl p-2 min-w-[200px] max-w-[280px]"
        >
          <p className="text-xs font-semibold text-text-secondary mb-1 px-1">All items</p>
          {items.map((item, i) => (
            <div key={i} className="text-xs text-text-primary px-1 py-0.5 hover:bg-gray-50 rounded">{item}</div>
          ))}
        </div>
      )}
    </span>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }): React.ReactElement {
  return (
    <div className="bg-bg-card rounded-lg border border-border px-4 py-2 min-w-[160px]">
      <div className="text-xs text-text-secondary mb-0.5">{label}</div>
      <div className={`text-sm tabular-nums font-mono ${color}`}>{value}</div>
    </div>
  )
}
