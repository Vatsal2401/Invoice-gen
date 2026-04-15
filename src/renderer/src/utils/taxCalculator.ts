import type { InvoiceItem, HSNSummaryRow } from '../types'

export function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100
}

export function calcItemAmounts(item: Partial<InvoiceItem>): Partial<InvoiceItem> {
  const qty = item.quantity ?? 0
  const rate = item.rate ?? 0
  const cgstRate = item.cgst_rate ?? 9
  const sgstRate = item.sgst_rate ?? 9

  const amount = roundToTwo(qty * rate)
  const cgst_amount = roundToTwo(amount * cgstRate / 100)
  const sgst_amount = roundToTwo(amount * sgstRate / 100)

  return { ...item, amount, cgst_amount, sgst_amount }
}

export interface InvoiceTotals {
  taxable_value: number
  cgst_total: number
  sgst_total: number
  round_off: number      // signed; usually in [-0.5, 0.5]
  grand_total: number    // rounded to nearest rupee
  total_quantity: number
}

export function calcInvoiceTotals(items: InvoiceItem[]): InvoiceTotals {
  const taxable_value = roundToTwo(items.reduce((sum, i) => sum + i.amount, 0))
  const cgst_total = roundToTwo(items.reduce((sum, i) => sum + i.cgst_amount, 0))
  const sgst_total = roundToTwo(items.reduce((sum, i) => sum + i.sgst_amount, 0))
  const arithmetic = roundToTwo(taxable_value + cgst_total + sgst_total)
  const grand_total = Math.round(arithmetic)
  const round_off = roundToTwo(grand_total - arithmetic)
  const total_quantity = items.reduce((sum, i) => sum + i.quantity, 0)

  return { taxable_value, cgst_total, sgst_total, round_off, grand_total, total_quantity }
}

export function buildHSNSummary(items: InvoiceItem[]): HSNSummaryRow[] {
  const map = new Map<string, HSNSummaryRow>()

  for (const item of items) {
    const hsn = (item.hsn_sac || '').trim()
    // Skip items with no HSN — they'd pollute the summary under an 'N/A' bucket.
    if (!hsn) continue

    const amount = Number(item.amount) || 0
    const cgst = Number(item.cgst_amount) || 0
    const sgst = Number(item.sgst_amount) || 0

    // Skip zero-value rows — they contribute nothing to the summary.
    if (amount === 0 && cgst === 0 && sgst === 0) continue

    if (!map.has(hsn)) {
      map.set(hsn, {
        hsn_sac: hsn,
        taxable_value: 0,
        cgst_rate: Number(item.cgst_rate) || 0,
        cgst_amount: 0,
        sgst_rate: Number(item.sgst_rate) || 0,
        sgst_amount: 0,
        total_tax: 0
      })
    }
    const row = map.get(hsn)!
    row.taxable_value = roundToTwo(row.taxable_value + amount)
    row.cgst_amount = roundToTwo(row.cgst_amount + cgst)
    row.sgst_amount = roundToTwo(row.sgst_amount + sgst)
    row.total_tax = roundToTwo(row.cgst_amount + row.sgst_amount)
  }

  return Array.from(map.values())
}
