import React from 'react'
import type { InvoiceWithItems, BusinessProfile, HSNSummaryRow } from '../../types'
import { formatCurrencyINR, formatCurrencyWithSymbol } from '../../utils/formatCurrency'
import { numberToWords } from '../../utils/numberToWords'
import { buildHSNSummary } from '../../utils/taxCalculator'

interface Props {
  invoice: InvoiceWithItems
  business: BusinessProfile
  logoDataUrl?: string
}

// All borders 1px solid black for print clarity
const S = {
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    border: '1px solid #000'
  },
  cell: {
    border: '1px solid #000',
    padding: '5px 7px',
    fontSize: '11px',
    verticalAlign: 'top' as const
  },
  cellR: {
    border: '1px solid #000',
    padding: '5px 7px',
    fontSize: '11px',
    textAlign: 'right' as const,
    verticalAlign: 'top' as const
  },
  cellC: {
    border: '1px solid #000',
    padding: '5px 7px',
    fontSize: '11px',
    textAlign: 'center' as const,
    verticalAlign: 'top' as const
  },
  th: {
    border: '1px solid #000',
    padding: '6px 7px',
    fontSize: '11px',
    fontWeight: 'bold' as const,
    backgroundColor: '#f5f5f5',
    textAlign: 'left' as const,
    verticalAlign: 'middle' as const
  },
  thR: {
    border: '1px solid #000',
    padding: '6px 7px',
    fontSize: '11px',
    fontWeight: 'bold' as const,
    backgroundColor: '#f5f5f5',
    textAlign: 'right' as const,
    verticalAlign: 'middle' as const
  }
}

export default function InvoiceTemplate({ invoice, business, logoDataUrl }: Props): React.ReactElement {
  const hsnSummary: HSNSummaryRow[] = buildHSNSummary(invoice.items)
  const hsnTotals = hsnSummary.reduce(
    (acc, r) => ({
      taxable_value: acc.taxable_value + r.taxable_value,
      cgst_amount: acc.cgst_amount + r.cgst_amount,
      sgst_amount: acc.sgst_amount + r.sgst_amount,
      total_tax: acc.total_tax + r.total_tax
    }),
    { taxable_value: 0, cgst_amount: 0, sgst_amount: 0, total_tax: 0 }
  )

  return (
    <div
      id="invoice-template"
      style={{
        width: '210mm',
        minHeight: '297mm',
        margin: '0',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '11px',
        backgroundColor: '#fff',
        padding: '10mm 14mm',
        boxSizing: 'border-box'
      }}
    >
      {/* CANCELLED BANNER */}
      {invoice.cancelled && (
        <div style={{
          background: '#DC2626', color: '#fff', textAlign: 'center',
          fontWeight: 'bold', fontSize: '14px', padding: '6px',
          marginBottom: '6px', letterSpacing: '2px'
        }}>
          *** CANCELLED INVOICE ***
        </div>
      )}

      {/* Company Logo */}
      {logoDataUrl && (
        <div style={{ textAlign: 'center', marginBottom: '6px' }}>
          <img
            src={logoDataUrl}
            style={{ maxHeight: '60px', objectFit: 'contain', display: 'block', margin: '0 auto' }}
            alt="Logo"
          />
        </div>
      )}

      {/* ── Title ── */}
      <div style={{
        textAlign: 'center', fontWeight: 'bold', fontSize: '15px',
        border: '1px solid #000', padding: '7px 4px',
        marginBottom: '0', letterSpacing: '2px'
      }}>
        Tax Invoice
      </div>

      {/* ── Row 1: Seller | Invoice Meta ── */}
      <table style={{ ...S.table, borderTop: 'none' }}>
        <tbody>
          <tr>
            {/* Seller */}
            <td style={{ ...S.cell, width: '50%', borderRight: '1px solid #000', padding: '8px 10px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '4px' }}>
                {business.business_name}
              </div>
              {business.address1 && <div style={{ marginBottom: '2px' }}>{business.address1}</div>}
              {business.address2 && <div style={{ marginBottom: '2px' }}>{business.address2}</div>}
              <div style={{ marginBottom: '2px' }}>{[business.city, business.state, business.pincode].filter(Boolean).join(', ')}</div>
              {business.gstin && <div style={{ marginTop: '4px' }}><strong>GSTIN/UIN:</strong> {business.gstin}</div>}
              {business.pan    && <div><strong>PAN:</strong> {business.pan}</div>}
              {business.phone  && <div><strong>Ph:</strong> {business.phone}</div>}
              {business.email  && <div><strong>Email:</strong> {business.email}</div>}
            </td>

            {/* Invoice meta grid */}
            <td style={{ width: '50%', padding: 0, verticalAlign: 'top' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <MetaRow l="Invoice No." v={invoice.invoice_number} l2="Dated" v2={invoice.invoice_date} />
                  <MetaRow l="PO No." v={invoice.delivery_note} l2="Payment Terms" v2={invoice.payment_terms} />
                  <MetaRow l="Vehicle No." v={invoice.buyer_order_number} l2="Dated" v2={invoice.buyer_order_date} />
                  <MetaRow l="Dispatch Doc No." v={invoice.dispatch_doc_number} l2="Doc Date" v2={invoice.dispatch_doc_date} />
                  <MetaRow l="Dispatched through" v={invoice.dispatched_through} l2="Destination" v2={invoice.destination} />
                  <tr>
                    <td colSpan={4} style={{ ...S.cell, borderTop: 'none' }}>
                      <strong>Terms of Delivery: </strong>{invoice.delivery_terms}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Row 2: Consignee | Buyer ── */}
      <table style={{ ...S.table, borderTop: 'none' }}>
        <tbody>
          <tr>
            <td style={{ ...S.cell, width: '50%', borderRight: '1px solid #000', padding: '8px 10px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '4px', textDecoration: 'underline' }}>Consignee (Ship to)</div>
              <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{invoice.ship_to_name || invoice.buyer_name}</div>
              <div style={{ marginBottom: '2px' }}>{invoice.ship_to_address || invoice.buyer_address}</div>
              {invoice.ship_to_gstin && <div><strong>GSTIN:</strong> {invoice.ship_to_gstin}</div>}
              {invoice.ship_to_state && <div><strong>State:</strong> {invoice.ship_to_state}</div>}
            </td>
            <td style={{ ...S.cell, width: '50%', padding: '8px 10px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '4px', textDecoration: 'underline' }}>Buyer (Bill to)</div>
              <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{invoice.buyer_name}</div>
              <div style={{ marginBottom: '2px' }}>{invoice.buyer_address}</div>
              {invoice.buyer_gstin    && <div><strong>GSTIN:</strong> {invoice.buyer_gstin}</div>}
              {invoice.buyer_pan      && <div><strong>PAN:</strong> {invoice.buyer_pan}</div>}
              {invoice.buyer_state    && (
                <div><strong>State:</strong> {invoice.buyer_state}{invoice.buyer_state_code ? `, Code: ${invoice.buyer_state_code}` : ''}</div>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Items Table ── */}
      <table style={{ ...S.table, borderTop: 'none' }}>
        <thead>
          <tr>
            <th style={{ ...S.th, ...S.cellC, width: '4%' }}>Sl</th>
            <th style={{ ...S.th, width: '32%' }}>Description of Goods</th>
            <th style={{ ...S.th, ...S.cellC, width: '10%' }}>HSN/SAC</th>
            <th style={{ ...S.thR, width: '10%' }}>Quantity</th>
            <th style={{ ...S.thR, width: '9%' }}>Rate</th>
            <th style={{ ...S.thR, width: '6%' }}>Per</th>
            <th style={{ ...S.thR, width: '14%' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => (
            <React.Fragment key={item.sl_no}>
              <tr>
                <td style={{ ...S.cellC }}>{item.sl_no}</td>
                <td style={{ ...S.cell }}>{item.description}</td>
                <td style={{ ...S.cellC }}>{item.hsn_sac}</td>
                <td style={{ ...S.cellR }}>{item.quantity}</td>
                <td style={{ ...S.cellR }}>{formatCurrencyINR(item.rate)}</td>
                <td style={{ ...S.cellC }}>{item.per}</td>
                <td style={{ ...S.cellR }}>{formatCurrencyINR(item.amount)}</td>
              </tr>
              <tr>
                <td style={S.cell}></td>
                <td style={{ ...S.cell, textAlign: 'right', fontStyle: 'italic', paddingRight: '8px' }}>CGST</td>
                <td style={S.cell}></td>
                <td style={S.cell}></td>
                <td style={{ ...S.cellR }}>{item.cgst_rate}%</td>
                <td style={S.cell}></td>
                <td style={{ ...S.cellR }}>{formatCurrencyINR(item.cgst_amount)}</td>
              </tr>
              <tr>
                <td style={S.cell}></td>
                <td style={{ ...S.cell, textAlign: 'right', fontStyle: 'italic', paddingRight: '8px' }}>SGST</td>
                <td style={S.cell}></td>
                <td style={S.cell}></td>
                <td style={{ ...S.cellR }}>{item.sgst_rate}%</td>
                <td style={S.cell}></td>
                <td style={{ ...S.cellR }}>{formatCurrencyINR(item.sgst_amount)}</td>
              </tr>
            </React.Fragment>
          ))}
          {/* Total row */}
          <tr style={{ fontWeight: 'bold' }}>
            <td style={S.cell}></td>
            <td style={S.cell}>Total</td>
            <td style={S.cell}></td>
            <td style={{ ...S.cellR }}>{invoice.total_quantity} {invoice.items[0]?.unit || ''}</td>
            <td style={S.cell}></td>
            <td style={S.cell}></td>
            <td style={{ ...S.cellR, fontSize: '11px' }}>{formatCurrencyWithSymbol(invoice.grand_total)}</td>
          </tr>
        </tbody>
      </table>

      {/* ── Amount in words ── */}
      <table style={{ ...S.table, borderTop: 'none' }}>
        <tbody>
          <tr>
            <td style={{ ...S.cell, width: '85%' }}>
              <strong>Amount Chargeable (in words): </strong>
              {numberToWords(invoice.grand_total)}
            </td>
            <td style={{ ...S.cell, textAlign: 'right', fontSize: '9px', width: '15%' }}>E. &amp; O.E</td>
          </tr>
        </tbody>
      </table>

      {/* ── HSN Summary ── */}
      <table style={{ ...S.table, borderTop: 'none' }}>
        <thead>
          <tr>
            <th style={S.th}>HSN/SAC</th>
            <th style={S.thR}>Taxable Value</th>
            <th style={S.thR}>CGST Rate</th>
            <th style={S.thR}>CGST Amt</th>
            <th style={S.thR}>SGST Rate</th>
            <th style={S.thR}>SGST Amt</th>
            <th style={S.thR}>Total Tax</th>
          </tr>
        </thead>
        <tbody>
          {hsnSummary.map((row) => (
            <tr key={row.hsn_sac}>
              <td style={S.cell}>{row.hsn_sac}</td>
              <td style={S.cellR}>{formatCurrencyINR(row.taxable_value)}</td>
              <td style={S.cellR}>{row.cgst_rate}%</td>
              <td style={S.cellR}>{formatCurrencyINR(row.cgst_amount)}</td>
              <td style={S.cellR}>{row.sgst_rate}%</td>
              <td style={S.cellR}>{formatCurrencyINR(row.sgst_amount)}</td>
              <td style={S.cellR}>{formatCurrencyINR(row.total_tax)}</td>
            </tr>
          ))}
          <tr style={{ fontWeight: 'bold' }}>
            <td style={S.cell}>Total</td>
            <td style={S.cellR}>{formatCurrencyINR(hsnTotals.taxable_value)}</td>
            <td style={S.cell}></td>
            <td style={S.cellR}>{formatCurrencyINR(hsnTotals.cgst_amount)}</td>
            <td style={S.cell}></td>
            <td style={S.cellR}>{formatCurrencyINR(hsnTotals.sgst_amount)}</td>
            <td style={S.cellR}>{formatCurrencyINR(hsnTotals.total_tax)}</td>
          </tr>
        </tbody>
      </table>

      {/* ── Tax amount in words ── */}
      <table style={{ ...S.table, borderTop: 'none' }}>
        <tbody>
          <tr>
            <td style={S.cell}>
              <strong>Tax Amount (in words): </strong>
              {numberToWords(hsnTotals.total_tax)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Bank Details | Signature ── */}
      <table style={{ ...S.table, borderTop: 'none' }}>
        <tbody>
          <tr>
            <td style={{ ...S.cell, width: '55%', borderRight: '1px solid #000', padding: '8px 10px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Company's Bank Details</div>
              {business.bank_name      && <div style={{ marginBottom: '2px' }}>Bank Name: {business.bank_name}</div>}
              {business.account_number && <div style={{ marginBottom: '2px' }}>A/c No.: {business.account_number}</div>}
              {business.ifsc_code      && <div style={{ marginBottom: '2px' }}>Branch &amp; IFS Code: {business.branch} / {business.ifsc_code}</div>}
              {business.swift_code     && <div>SWIFT Code: {business.swift_code}</div>}
            </td>
            <td style={{ ...S.cell, width: '45%', textAlign: 'right', verticalAlign: 'bottom', padding: '8px 12px', height: '80px' }}>
              <div style={{ marginBottom: '32px' }}>for {business.business_name}</div>
              <div style={{ borderTop: '1px solid #000', display: 'inline-block', paddingTop: '3px', minWidth: '140px' }}>
                Authorised Signatory
              </div>
              {business.signatory_name && (
                <div style={{ fontSize: '10px', marginTop: '2px' }}>{business.signatory_name}</div>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Declaration ── */}
      <table style={{ ...S.table, borderTop: 'none' }}>
        <tbody>
          <tr>
            <td style={{ ...S.cell, fontStyle: 'italic', fontSize: '10px', padding: '6px 10px' }}>
              Declaration: We declare that this invoice shows the actual price of the goods described
              and that all particulars are true and correct.
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Footer ── */}
      <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '10px', color: '#555' }}>
        This is a Computer Generated Invoice
      </div>
    </div>
  )
}

// ── Helper: 2-col meta row ──
function MetaRow({ l, v, l2, v2 }: { l: string; v: string; l2: string; v2: string }): React.ReactElement {
  const cellStyle = { border: '1px solid #000', padding: '5px 7px', fontSize: '11px' }
  return (
    <tr>
      <td style={{ ...cellStyle, fontWeight: 'bold', width: '25%', whiteSpace: 'nowrap' as const, backgroundColor: '#fafafa' }}>{l}</td>
      <td style={{ ...cellStyle, width: '25%' }}>{v}</td>
      <td style={{ ...cellStyle, fontWeight: 'bold', width: '25%', whiteSpace: 'nowrap' as const, backgroundColor: '#fafafa' }}>{l2}</td>
      <td style={{ ...cellStyle, width: '25%' }}>{v2}</td>
    </tr>
  )
}
