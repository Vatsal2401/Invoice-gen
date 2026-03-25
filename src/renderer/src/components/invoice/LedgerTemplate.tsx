import React from 'react'
import type { BusinessProfile, Customer, LedgerEntry } from '../../types'
import { formatCurrencyINR } from '../../utils/formatCurrency'

interface Props {
  business: BusinessProfile
  customer: Customer
  entries: LedgerEntry[]
  fromDate: string
  toDate: string
  logoDataUrl?: string
}

function fmt(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}-${m}-${y}`
}

const border = '1px solid #000'
const S = {
  cell: { border, padding: '3px 6px', fontSize: '10px', verticalAlign: 'top' as const },
  cellR: { border, padding: '3px 6px', fontSize: '10px', textAlign: 'right' as const, verticalAlign: 'top' as const },
  th: { border, padding: '4px 6px', fontSize: '10px', fontWeight: 'bold' as const, backgroundColor: '#f0f0f0', textAlign: 'left' as const },
  thR: { border, padding: '4px 6px', fontSize: '10px', fontWeight: 'bold' as const, backgroundColor: '#f0f0f0', textAlign: 'right' as const },
}

export default function LedgerTemplate({ business, customer, entries, fromDate, toDate, logoDataUrl }: Props): React.ReactElement {
  const totalDebit  = entries.reduce((s, e) => s + e.debit, 0)
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0)
  const closing     = totalDebit - totalCredit  // positive = customer owes, negative = overpaid

  const businessAddr = [
    business.address1, business.address2,
    [business.city, business.state, business.pincode].filter(Boolean).join(', ')
  ].filter(Boolean)

  const customerAddr = [
    customer.address,
    [customer.city, customer.state].filter(Boolean).join(', ')
  ].filter(Boolean)

  return (
    <div
      id="ledger-template"
      style={{
        width: '210mm',
        minHeight: '297mm',
        margin: '0',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '10px',
        backgroundColor: '#fff',
        padding: '10mm 12mm',
        boxSizing: 'border-box' as const
      }}
    >
      {/* ── Business Header ── */}
      <div style={{ textAlign: 'center', marginBottom: '4px' }}>
        {logoDataUrl && (
          <img src={logoDataUrl} style={{ maxHeight: '44px', objectFit: 'contain', display: 'block', margin: '0 auto 4px' }} alt="Logo" />
        )}
        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{business.business_name}</div>
        {businessAddr.map((line, i) => (
          <div key={i} style={{ fontSize: '10px' }}>{line}</div>
        ))}
      </div>

      <div style={{ textAlign: 'center', borderBottom: '1px solid #000', marginBottom: '6px', paddingBottom: '4px' }} />

      {/* ── Customer Header ── */}
      <div style={{ textAlign: 'center', marginBottom: '6px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{customer.name}</div>
        <div style={{ fontSize: '10px', color: '#444' }}>Ledger Account</div>
        {customerAddr.map((line, i) => (
          <div key={i} style={{ fontSize: '10px' }}>{line}</div>
        ))}
        {customer.gstin && <div style={{ fontSize: '10px' }}>GSTIN: {customer.gstin}</div>}
      </div>

      {/* ── Date Range ── */}
      <div style={{ textAlign: 'center', fontSize: '10px', marginBottom: '8px' }}>
        {fmt(fromDate)} to {fmt(toDate)}
      </div>

      {/* ── Ledger Table ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border }}>
        <thead>
          <tr>
            <th style={{ ...S.th, width: '14%' }}>Date</th>
            <th style={{ ...S.th, width: '24%' }}>Particulars</th>
            <th style={{ ...S.th, width: '18%' }}>Narration</th>
            <th style={{ ...S.th, width: '12%' }}>Vch Type</th>
            <th style={{ ...S.thR, width: '10%' }}>Vch No.</th>
            <th style={{ ...S.thR, width: '11%' }}>Debit</th>
            <th style={{ ...S.thR, width: '11%' }}>Credit</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 && (
            <tr>
              <td colSpan={7} style={{ ...S.cell, textAlign: 'center', padding: '12px', color: '#888' }}>
                No transactions in this period
              </td>
            </tr>
          )}
          {entries.map((e, i) => (
            <tr key={i}>
              <td style={S.cell}>{fmt(e.date)}</td>
              <td style={{ ...S.cell, fontWeight: e.vch_type === 'Debit Note' ? 'bold' : 'normal' }}>
                <span style={{ fontStyle: 'normal' }}>
                  {e.vch_type === 'Receipt' ? <span>By <strong>{e.particulars}</strong></span>
                    : <span>To <strong>{e.particulars}</strong></span>}
                </span>
              </td>
              <td style={S.cell}>{e.narration}</td>
              <td style={{ ...S.cell, fontWeight: 'bold' }}>{e.vch_type}</td>
              <td style={S.cellR}>{e.vch_no}</td>
              <td style={S.cellR}>{e.debit > 0 ? formatCurrencyINR(e.debit) : ''}</td>
              <td style={S.cellR}>{e.credit > 0 ? formatCurrencyINR(e.credit) : ''}</td>
            </tr>
          ))}

          {/* ── Totals + Closing Balance ── */}
          <tr>
            <td style={S.cell}></td>
            <td colSpan={4} style={{ ...S.cell }}></td>
            <td style={{ ...S.cellR, fontWeight: 'bold' }}>{formatCurrencyINR(totalDebit)}</td>
            <td style={{ ...S.cellR, fontWeight: 'bold' }}>{formatCurrencyINR(totalCredit)}</td>
          </tr>
          <tr>
            <td style={S.cell}>{closing >= 0 ? 'By' : 'To'}</td>
            <td colSpan={4} style={{ ...S.cell, fontWeight: 'bold' }}>
              {closing >= 0 ? 'Closing Balance' : 'Closing Balance (Advance)'}
            </td>
            <td style={S.cellR}>{closing < 0 ? formatCurrencyINR(Math.abs(closing)) : ''}</td>
            <td style={{ ...S.cellR }}>{closing >= 0 ? formatCurrencyINR(closing) : ''}</td>
          </tr>
          <tr style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
            <td style={S.cell}></td>
            <td colSpan={4} style={S.cell}></td>
            <td style={S.cellR}>{formatCurrencyINR(totalDebit + (closing < 0 ? Math.abs(closing) : 0))}</td>
            <td style={S.cellR}>{formatCurrencyINR(totalCredit + (closing >= 0 ? closing : 0))}</td>
          </tr>
        </tbody>
      </table>

      {/* ── Outstanding Summary ── */}
      <div style={{ marginTop: '8px', fontSize: '10px', display: 'flex', justifyContent: 'flex-end', gap: '24px' }}>
        <span><strong>Total Sales:</strong> {formatCurrencyINR(totalDebit)}</span>
        <span><strong>Total Received:</strong> {formatCurrencyINR(totalCredit)}</span>
        <span style={{ color: closing > 0 ? '#DC2626' : '#16A34A', fontWeight: 'bold' }}>
          {closing > 0 ? `Outstanding: ${formatCurrencyINR(closing)}` : closing < 0 ? `Advance: ${formatCurrencyINR(Math.abs(closing))}` : 'Fully Settled'}
        </span>
      </div>

      {/* ── Footer ── */}
      <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '9px', color: '#888' }}>
        This is a Computer Generated Ledger Statement
      </div>
    </div>
  )
}
