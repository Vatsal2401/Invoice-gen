import React, { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, FileDown } from 'lucide-react'
import type { Customer, LedgerEntry, Payment, BusinessProfile } from '../types'
import { useStore } from '../store/useStore'
import { formatCurrencyINR, formatCurrencyWithSymbol } from '../utils/formatCurrency'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import LedgerTemplate from '../components/invoice/LedgerTemplate'

const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'NEFT', 'RTGS', 'Other']

function fmtDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${parseInt(d)}-${months[parseInt(m)-1]}-${y}`
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

  const [payModal, setPayModal] = useState(false)
  const [payForm, setPayForm] = useState({ payment_date: new Date().toISOString().slice(0, 10), amount: '', mode: 'Cash', reference: '', narration: '', entryType: 'credit' })
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Payment | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [exportLoading, setExportLoading] = useState(false)
  const [showPrint, setShowPrint] = useState(false)

  // Load customer + business
  useEffect(() => {
    if (!id) return
    window.api.getCustomer(Number(id)).then((res) => {
      if (res.success && res.data) setCustomer(res.data as Customer)
    })
    window.api.getBusinessProfile().then(async (res) => {
      if (res.success && res.data) {
        setBusiness(res.data as BusinessProfile)
        if ((res.data as BusinessProfile).logo_path) {
          const lr = await window.api.readLogo((res.data as BusinessProfile).logo_path)
          if (lr.success && lr.data) setLogoDataUrl(lr.data as string)
        }
      }
    })
  }, [id])

  const loadLedger = useCallback(async () => {
    if (!id) return
    try {
      const [ledgerRes, payRes] = await Promise.all([
        window.api.getCustomerLedger(Number(id), fromDate, toDate),
        window.api.listPayments(Number(id))
      ])
      if (payRes.success && payRes.data) setPayments(payRes.data as Payment[])
      if (!ledgerRes.success || !ledgerRes.data) return

      const data = ledgerRes.data as { invoices: Array<{ id: number; invoice_number: string; invoice_date: string; grand_total: number; cancelled: number }>; payments: Array<{ id: number; payment_date: string; amount: number; mode: string; reference: string; narration: string }> }

      const allEntries: LedgerEntry[] = []

      for (const inv of data.invoices) {
        if (inv.cancelled) continue  // skip cancelled in ledger
        allEntries.push({
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
        allEntries.push({
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

      allEntries.sort((a, b) => {
        if (a.date < b.date) return -1
        if (a.date > b.date) return 1
        return 0
      })

      setEntries(allEntries)
    } catch (err) {
      showToast('error', (err as Error).message || 'Failed to load ledger')
    }
  }, [id, fromDate, toDate, showToast])

  useEffect(() => { loadLedger() }, [loadLedger])

  const totalDebit = entries.reduce((s, e) => s + e.debit, 0)
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0)
  const closing = totalDebit - totalCredit

  const handleAddPayment = async (): Promise<void> => {
    const amt = parseFloat(payForm.amount)
    if (!amt || amt <= 0) { showToast('error', 'Enter a valid positive amount'); return }
    // Store as negative for debit entries
    const finalAmt = payForm.entryType === 'debit' ? -amt : amt
    setSaving(true)
    try {
      const res = await window.api.createPayment({
        customer_id: Number(id),
        payment_date: payForm.payment_date,
        amount: finalAmt,
        mode: payForm.mode,
        reference: payForm.reference,
        narration: payForm.narration
      })
      if (res.success) {
        showToast('success', payForm.entryType === 'debit' ? 'Debit entry recorded' : 'Payment recorded')
        setPayModal(false)
        setPayForm({ payment_date: new Date().toISOString().slice(0, 10), amount: '', mode: 'Cash', reference: '', narration: '', entryType: 'credit' })
        loadLedger()
      } else {
        showToast('error', res.message || 'Failed')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePayment = async (): Promise<void> => {
    if (!deleteConfirm) return
    const res = await window.api.deletePayment(deleteConfirm.id)
    if (res.success) {
      showToast('success', 'Payment deleted')
      setDeleteConfirm(null)
      loadLedger()
    } else {
      showToast('error', res.message || 'Failed')
    }
  }

  const handleExportPDF = async (): Promise<void> => {
    if (!customer) return
    setExportLoading(true)
    const res = await window.api.exportLedgerPDF(Number(id), customer.name, fromDate, toDate)
    setExportLoading(false)
    if (res.success) showToast('success', 'Ledger PDF exported')
    else if (res.message !== 'Export cancelled') showToast('error', res.message || 'Export failed')
  }

  if (!customer || !business) {
    return <div className="p-6 text-text-secondary">Loading...</div>
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-border flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate('/customers')}>
          <ArrowLeft size={14} /> Back
        </Button>
        <div>
          <h1 className="text-base font-bold text-text-primary leading-tight">{customer.name}</h1>
          <p className="text-xs text-text-secondary">Ledger Account</p>
        </div>
        <div className="flex-1" />
        {/* Date range */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-text-secondary text-xs">From</span>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            className="border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-accent" />
          <span className="text-text-secondary text-xs">To</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
            className="border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-accent" />
        </div>
        <Button variant="secondary" size="sm" onClick={() => setPayModal(true)}>
          <Plus size={14} /> Add Payment
        </Button>
        <Button size="sm" loading={exportLoading} onClick={handleExportPDF}>
          <FileDown size={14} /> Export PDF
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowPrint(!showPrint)}>
          {showPrint ? 'Hide Preview' : 'Print Preview'}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="flex gap-4 px-6 py-3 bg-bg-base border-b border-border flex-shrink-0">
        <SummaryCard label="Total Sales (Debit)" value={formatCurrencyWithSymbol(totalDebit)} color="text-red-600" />
        <SummaryCard label="Total Received (Credit)" value={formatCurrencyWithSymbol(totalCredit)} color="text-green-600" />
        <SummaryCard
          label={closing >= 0 ? 'Outstanding Balance' : 'Advance / Overpaid'}
          value={formatCurrencyWithSymbol(Math.abs(closing))}
          color={closing > 0 ? 'text-red-700 font-bold' : 'text-green-700 font-bold'}
        />
        <SummaryCard label="Transactions" value={String(entries.length)} color="text-text-primary" />
      </div>

      <div className="flex-1 overflow-auto">
        {showPrint && business && (
          <div className="p-6 flex justify-center bg-gray-200 border-b border-border">
            <div className="shadow-lg">
              <LedgerTemplate
                business={business}
                customer={customer}
                entries={entries}
                fromDate={fromDate}
                toDate={toDate}
                logoDataUrl={logoDataUrl}
              />
            </div>
          </div>
        )}

        {/* Ledger Table */}
        <div className="p-6">
          <div className="bg-bg-card rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b-2 border-border">
                <tr>
                  <th className="text-xs font-semibold uppercase tracking-wide text-text-secondary px-3 py-2 text-left w-28">Date</th>
                  <th className="text-xs font-semibold uppercase tracking-wide text-text-secondary px-3 py-2 text-left">Particulars</th>
                  <th className="text-xs font-semibold uppercase tracking-wide text-text-secondary px-3 py-2 text-left">Narration</th>
                  <th className="text-xs font-semibold uppercase tracking-wide text-text-secondary px-3 py-2 text-left w-20">Vch Type</th>
                  <th className="text-xs font-semibold uppercase tracking-wide text-text-secondary px-3 py-2 text-right w-24">Debit</th>
                  <th className="text-xs font-semibold uppercase tracking-wide text-text-secondary px-3 py-2 text-right w-24">Credit</th>
                  <th className="text-xs font-semibold uppercase tracking-wide text-text-secondary px-3 py-2 text-right w-28">Balance</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center text-text-secondary py-10">
                      No transactions in this period
                    </td>
                  </tr>
                )}
                {(() => {
                  let runBal = 0
                  return entries.map((e, i) => {
                    runBal += e.debit - e.credit
                    const bal = runBal
                    const payment = e.ref_type === 'payment'
                      ? payments.find((p) => p.id === e.ref_id) ?? null
                      : null
                    return (
                      <tr key={i} className={`border-b border-border hover:bg-gray-50
                        ${e.vch_type === 'Receipt' ? 'bg-green-50' : e.vch_type === 'Debit Note' ? 'bg-red-50' : ''}`}>
                        <td className="px-3 py-2 text-text-secondary text-xs">{fmtDate(e.date)}</td>
                        <td className="px-3 py-2 font-medium">
                          {e.ref_type === 'payment' ? (
                            <span className="text-green-700">By {e.particulars}</span>
                          ) : (
                            <span>To {e.particulars}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-text-secondary text-xs">{e.narration}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded
                            ${e.vch_type === 'Receipt' ? 'bg-green-100 text-green-800'
                              : e.vch_type === 'Debit Note' ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'}`}>
                            {e.vch_type}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-mono text-red-600">
                          {e.debit > 0 ? formatCurrencyWithSymbol(e.debit) : ''}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-mono text-green-600">
                          {e.credit > 0 ? formatCurrencyWithSymbol(e.credit) : ''}
                        </td>
                        <td className={`px-3 py-2 text-right tabular-nums font-mono font-medium
                          ${bal > 0 ? 'text-red-700' : bal < 0 ? 'text-green-700' : 'text-text-secondary'}`}>
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
              {entries.length > 0 && (
                <tfoot className="bg-gray-50 border-t-2 border-border font-semibold">
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-sm">Total</td>
                    <td className="px-3 py-2 text-right tabular-nums font-mono text-red-700">{formatCurrencyWithSymbol(totalDebit)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-mono text-green-700">{formatCurrencyWithSymbol(totalCredit)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums font-mono
                      ${closing > 0 ? 'text-red-700' : closing < 0 ? 'text-green-700' : 'text-text-secondary'}`}>
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

      {/* Add Payment Modal */}
      <Modal
        open={payModal}
        title={payForm.entryType === 'debit' ? 'Add Debit Entry' : 'Record Payment Received'}
        onClose={() => setPayModal(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPayModal(false)}>Cancel</Button>
            <Button
              variant={payForm.entryType === 'debit' ? 'danger' : undefined}
              onClick={handleAddPayment}
              loading={saving}
            >
              {payForm.entryType === 'debit' ? 'Save Debit Entry' : 'Save Payment'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Entry type toggle */}
          <div className="flex rounded-lg overflow-hidden border border-border">
            <button
              type="button"
              onClick={() => setPayForm((f) => ({ ...f, entryType: 'credit' }))}
              className={`flex-1 py-2 text-sm font-medium transition-colors
                ${payForm.entryType === 'credit' ? 'bg-green-600 text-white' : 'bg-white text-text-secondary hover:bg-gray-50'}`}
            >
              ↓ Receipt (Credit)
            </button>
            <button
              type="button"
              onClick={() => setPayForm((f) => ({ ...f, entryType: 'debit' }))}
              className={`flex-1 py-2 text-sm font-medium transition-colors border-l border-border
                ${payForm.entryType === 'debit' ? 'bg-red-600 text-white' : 'bg-white text-text-secondary hover:bg-gray-50'}`}
            >
              ↑ Debit Note
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date"
              type="date"
              value={payForm.payment_date}
              onChange={(e) => setPayForm((f) => ({ ...f, payment_date: e.target.value }))}
            />
            <Input
              label="Amount (₹) *"
              type="number"
              value={payForm.amount}
              onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Payment Mode</label>
            <select
              value={payForm.mode}
              onChange={(e) => setPayForm((f) => ({ ...f, mode: e.target.value }))}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <Input
            label="Reference / Cheque No."
            value={payForm.reference}
            onChange={(e) => setPayForm((f) => ({ ...f, reference: e.target.value }))}
            placeholder="e.g. CHQ-001, UTR No."
          />
          <Input
            label="Narration"
            value={payForm.narration}
            onChange={(e) => setPayForm((f) => ({ ...f, narration: e.target.value }))}
            placeholder="Optional note"
          />
        </div>
      </Modal>

      {/* Delete Payment Confirm */}
      <Modal
        open={!!deleteConfirm}
        title="Delete Payment"
        onClose={() => setDeleteConfirm(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeletePayment}>Delete</Button>
          </>
        }
      >
        <p>Delete this payment of <strong>{deleteConfirm && formatCurrencyWithSymbol(deleteConfirm.amount)}</strong> received on <strong>{deleteConfirm && fmtDate(deleteConfirm.payment_date)}</strong>?</p>
      </Modal>
    </div>
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
