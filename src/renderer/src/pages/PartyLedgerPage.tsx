import React, { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import type { Party, PartyLedgerEntry, PartyType } from '../types'
import { useStore } from '../store/useStore'
import { formatCurrencyWithSymbol } from '../utils/formatCurrency'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import { PageLoadingSkeleton, KPISkeleton, TableSkeleton } from '../components/ui/Skeleton'
import apiClient from '../lib/apiClient'
import { getApiError } from '../lib/apiError'
import { useQueryCache } from '../store/useQueryCache'

const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'NEFT', 'RTGS', 'Other']

const TYPE_COLORS: Record<PartyType, string> = {
  SUPPLIER: 'bg-orange-100 text-orange-700',
  TRANSPORT: 'bg-purple-100 text-purple-700',
  LABOUR: 'bg-yellow-100 text-yellow-700',
  OTHER: 'bg-gray-100 text-gray-600',
}

function fmtDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d}-${months[parseInt(m) - 1]}-${y}`
}

function fiscalYear(): { from: string; to: string } {
  const now = new Date()
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  return { from: `${year}-04-01`, to: `${year + 1}-03-31` }
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }): React.ReactElement {
  return (
    <div className="bg-bg-card rounded-lg border border-border px-4 py-2 min-w-[160px]">
      <div className="text-xs text-text-secondary mb-0.5">{label}</div>
      <div className={`text-sm tabular-nums font-mono font-semibold ${color}`}>{value}</div>
    </div>
  )
}

export default function PartyLedgerPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useStore()

  const invalidateKhataCache = (): void => {
    const { invalidate } = useQueryCache.getState()
    const keys = Object.keys(useQueryCache.getState().entries).filter((k) => k.startsWith('/invoice/khata/cashbook'))
    if (keys.length > 0) invalidate(...keys)
  }

  const fy = fiscalYear()
  const [fromDate, setFromDate] = useState(fy.from)
  const [toDate, setToDate] = useState(fy.to)

  const [party, setParty] = useState<Party | null>(null)
  const [entries, setEntries] = useState<PartyLedgerEntry[]>([])
  const [totalDebit, setTotalDebit] = useState(0)
  const [totalCredit, setTotalCredit] = useState(0)
  const [balance, setBalance] = useState(0)
  const [ledgerLoading, setLedgerLoading] = useState(true)

  const [entryModal, setEntryModal] = useState(false)
  const [entryForm, setEntryForm] = useState({
    entry_date: new Date().toISOString().slice(0, 10),
    amount: '',
    mode: 'Cash',
    reference: '',
    narration: '',
    entryType: 'debit' as 'debit' | 'credit',
  })
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<PartyLedgerEntry | null>(null)

  useEffect(() => {
    if (!id) return
    apiClient.get<Party>(`/invoice/parties/${id}`).then(({ data }) => setParty(data)).catch(() => {})
  }, [id])

  const loadLedger = useCallback(async () => {
    if (!id) return
    setLedgerLoading(true)
    try {
      const { data } = await apiClient.get<{
        party: Party
        entries: PartyLedgerEntry[]
        totalDebit: number
        totalCredit: number
        balance: number
      }>(`/invoice/parties/${id}/ledger?from=${fromDate}&to=${toDate}`)
      setParty(data.party)
      setEntries(data.entries)
      setTotalDebit(Number(data.totalDebit))
      setTotalCredit(Number(data.totalCredit))
      setBalance(Number(data.balance))
    } catch (err) {
      showToast('error', getApiError(err, 'Failed to load ledger'))
    } finally {
      setLedgerLoading(false)
    }
  }, [id, fromDate, toDate, showToast])

  useEffect(() => { loadLedger() }, [loadLedger])

  const handleAddEntry = async (): Promise<void> => {
    const amt = parseFloat(entryForm.amount)
    if (!amt || amt <= 0) { showToast('error', 'Enter a valid positive amount'); return }
    const finalAmt = entryForm.entryType === 'debit' ? amt : -amt
    setSaving(true)
    try {
      await apiClient.post(`/invoice/parties/${id}/ledger`, {
        entry_date: entryForm.entry_date,
        amount: finalAmt,
        mode: entryForm.mode,
        reference: entryForm.reference,
        narration: entryForm.narration,
      })
      showToast('success', entryForm.entryType === 'debit' ? 'Debit entry recorded' : 'Credit entry recorded')
      setEntryModal(false)
      setEntryForm({ entry_date: new Date().toISOString().slice(0, 10), amount: '', mode: 'Cash', reference: '', narration: '', entryType: 'debit' })
      invalidateKhataCache()
      loadLedger()
    } catch (err) {
      showToast('error', getApiError(err, 'Failed to add entry'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEntry = async (): Promise<void> => {
    if (!deleteConfirm) return
    try {
      await apiClient.delete(`/invoice/parties/${id}/ledger/${deleteConfirm.id}`)
      showToast('success', 'Entry deleted')
      setDeleteConfirm(null)
      invalidateKhataCache()
      loadLedger()
    } catch (err) {
      showToast('error', getApiError(err, 'Delete failed'))
    }
  }

  if (!party) return <PageLoadingSkeleton />

  const typeColor = TYPE_COLORS[party.type as PartyType] ?? 'bg-gray-100 text-gray-600'
  const typeLabel = party.type.charAt(0) + party.type.slice(1).toLowerCase()

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-border flex-shrink-0 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate('/khata')}><ArrowLeft size={14} /> Back</Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-text-primary leading-tight">{party.name}</h1>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColor}`}>{typeLabel}</span>
          </div>
          <p className="text-xs text-text-secondary">Party Ledger{party.phone ? ` · ${party.phone}` : ''}</p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-text-secondary text-xs">From</span>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-accent" />
          <span className="text-text-secondary text-xs">To</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-accent" />
        </div>
        <Button variant="secondary" size="sm" onClick={() => setEntryModal(true)}><Plus size={14} /> Add Entry</Button>
      </div>

      {/* KPI Strip */}
      <div className="flex gap-4 px-6 py-3 bg-bg-base border-b border-border flex-shrink-0">
        {ledgerLoading ? (
          <><KPISkeleton /><KPISkeleton /><KPISkeleton /><KPISkeleton /></>
        ) : (
          <>
            <SummaryCard label="Total Debit (Dr)" value={formatCurrencyWithSymbol(totalDebit)} color="text-red-600" />
            <SummaryCard label="Total Credit (Cr)" value={formatCurrencyWithSymbol(totalCredit)} color="text-green-600" />
            <SummaryCard
              label={balance > 0 ? 'Balance (they owe you)' : balance < 0 ? 'Balance (you owe them)' : 'Settled'}
              value={balance === 0 ? 'Settled' : formatCurrencyWithSymbol(Math.abs(balance))}
              color={balance > 0 ? 'text-red-700 font-bold' : balance < 0 ? 'text-green-700 font-bold' : 'text-text-secondary'}
            />
            <SummaryCard label="Transactions" value={String(entries.length)} color="text-text-primary" />
          </>
        )}
      </div>

      {/* Ledger Table */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b-2 border-border">
              <tr>
                <th className="text-xs font-semibold uppercase tracking-wide text-text-secondary px-3 py-2.5 text-left w-28">Date</th>
                <th className="text-xs font-semibold uppercase tracking-wide text-text-secondary px-3 py-2.5 text-left">Mode</th>
                <th className="text-xs font-semibold uppercase tracking-wide text-text-secondary px-3 py-2.5 text-left">Narration / Ref</th>
                <th className="text-xs font-semibold uppercase tracking-wide text-text-secondary px-3 py-2.5 text-right w-28">Debit (Dr)</th>
                <th className="text-xs font-semibold uppercase tracking-wide text-text-secondary px-3 py-2.5 text-right w-28">Credit (Cr)</th>
                <th className="text-xs font-semibold uppercase tracking-wide text-text-secondary px-3 py-2.5 text-right w-32">Balance</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {ledgerLoading && <TableSkeleton rows={8} cols={7} />}
              {!ledgerLoading && entries.length === 0 && (
                <tr><td colSpan={7} className="text-center text-text-secondary py-10">No entries in this period. Click "Add Entry" to record a transaction.</td></tr>
              )}
              {!ledgerLoading && (() => {
                let runBal = Number(party.opening_balance ?? 0)
                return entries.map((e, i) => {
                  const amt = Number(e.amount)
                  const isDebit = amt > 0
                  runBal += amt
                  return (
                    <tr key={i} className={`border-b border-border hover:bg-gray-50 ${isDebit ? '' : 'bg-green-50/40'}`}>
                      <td className="px-3 py-2 text-text-secondary text-xs whitespace-nowrap">{fmtDate(e.entry_date)}</td>
                      <td className="px-3 py-2">
                        <span className={`font-medium ${isDebit ? 'text-text-primary' : 'text-green-700'}`}>{e.mode}</span>
                      </td>
                      <td className="px-3 py-2 text-text-secondary text-xs">
                        {[e.narration, e.reference].filter(Boolean).join(' · ') || '—'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-mono text-red-600 text-sm">
                        {isDebit ? formatCurrencyWithSymbol(amt) : ''}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-mono text-green-600 text-sm">
                        {!isDebit ? formatCurrencyWithSymbol(Math.abs(amt)) : ''}
                      </td>
                      <td className={`px-3 py-2 text-right tabular-nums font-mono font-medium text-sm ${runBal > 0 ? 'text-red-700' : runBal < 0 ? 'text-green-700' : 'text-text-secondary'}`}>
                        {runBal === 0 ? '—' : formatCurrencyWithSymbol(Math.abs(runBal))}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button onClick={() => setDeleteConfirm(e)} className="text-danger hover:text-red-700" title="Delete entry">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              })()}
            </tbody>
            {!ledgerLoading && entries.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-border font-semibold">
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-sm">Total</td>
                  <td className="px-3 py-2 text-right tabular-nums font-mono text-red-700">{formatCurrencyWithSymbol(totalDebit)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-mono text-green-700">{formatCurrencyWithSymbol(totalCredit)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums font-mono ${balance > 0 ? 'text-red-700' : balance < 0 ? 'text-green-700' : 'text-text-secondary'}`}>
                    {balance === 0 ? 'Settled' : formatCurrencyWithSymbol(Math.abs(balance))}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {party.notes && (
          <p className="mt-3 text-xs text-text-secondary bg-white border border-border rounded px-3 py-2">
            <strong>Notes:</strong> {party.notes}
          </p>
        )}
      </div>

      {/* Add Entry Modal */}
      <Modal
        open={entryModal}
        title={entryForm.entryType === 'debit' ? 'Add Debit Entry' : 'Add Credit Entry'}
        onClose={() => setEntryModal(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEntryModal(false)}>Cancel</Button>
            <Button
              variant={entryForm.entryType === 'debit' ? undefined : 'secondary'}
              onClick={handleAddEntry}
              loading={saving}
            >
              {entryForm.entryType === 'debit' ? 'Save Debit' : 'Save Credit'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex rounded-lg overflow-hidden border border-border">
            <button
              type="button"
              onClick={() => setEntryForm((f) => ({ ...f, entryType: 'debit' }))}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${entryForm.entryType === 'debit' ? 'bg-red-600 text-white' : 'bg-white text-text-secondary hover:bg-gray-50'}`}
            >
              ↑ Debit (they owe you)
            </button>
            <button
              type="button"
              onClick={() => setEntryForm((f) => ({ ...f, entryType: 'credit' }))}
              className={`flex-1 py-2.5 text-sm font-medium border-l border-border transition-colors ${entryForm.entryType === 'credit' ? 'bg-green-600 text-white' : 'bg-white text-text-secondary hover:bg-gray-50'}`}
            >
              ↓ Credit (you pay them)
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date *" type="date" value={entryForm.entry_date} onChange={(e) => setEntryForm((f) => ({ ...f, entry_date: e.target.value }))} />
            <Input label="Amount (₹) *" type="number" value={entryForm.amount} onChange={(e) => setEntryForm((f) => ({ ...f, amount: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Mode</label>
            <select
              value={entryForm.mode}
              onChange={(e) => setEntryForm((f) => ({ ...f, mode: e.target.value }))}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <Input label="Reference" value={entryForm.reference} onChange={(e) => setEntryForm((f) => ({ ...f, reference: e.target.value }))} placeholder="e.g. CHQ-001, UTR No." />
          <Input label="Narration" value={entryForm.narration} onChange={(e) => setEntryForm((f) => ({ ...f, narration: e.target.value }))} placeholder="e.g. Transport charges for March" />
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteConfirm} title="Delete Entry" onClose={() => setDeleteConfirm(null)}
        footer={<><Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button><Button variant="danger" onClick={handleDeleteEntry}>Delete</Button></>}>
        <p className="text-sm">Delete this entry of <strong>{deleteConfirm && formatCurrencyWithSymbol(Math.abs(Number(deleteConfirm.amount)))}</strong> on <strong>{deleteConfirm && fmtDate(deleteConfirm.entry_date)}</strong>? This cannot be undone.</p>
      </Modal>
    </div>
  )
}
