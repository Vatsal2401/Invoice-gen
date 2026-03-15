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
  grand_total: number
  total_quantity: number
}

export function calcInvoiceTotals(items: InvoiceItem[]): InvoiceTotals {
  const taxable_value = roundToTwo(items.reduce((sum, i) => sum + i.amount, 0))
  const cgst_total = roundToTwo(items.reduce((sum, i) => sum + i.cgst_amount, 0))
  const sgst_total = roundToTwo(items.reduce((sum, i) => sum + i.sgst_amount, 0))
  const grand_total = roundToTwo(taxable_value + cgst_total + sgst_total)
  const total_quantity = items.reduce((sum, i) => sum + i.quantity, 0)

  return { taxable_value, cgst_total, sgst_total, grand_total, total_quantity }
}

export function buildHSNSummary(items: InvoiceItem[]): HSNSummaryRow[] {
  const map = new Map<string, HSNSummaryRow>()

  for (const item of items) {
    const key = item.hsn_sac || 'N/A'
    if (!map.has(key)) {
      map.set(key, {
        hsn_sac: key,
        taxable_value: 0,
        cgst_rate: item.cgst_rate,
        cgst_amount: 0,
        sgst_rate: item.sgst_rate,
        sgst_amount: 0,
        total_tax: 0
      })
    }
    const row = map.get(key)!
    row.taxable_value = roundToTwo(row.taxable_value + item.amount)
    row.cgst_amount = roundToTwo(row.cgst_amount + item.cgst_amount)
    row.sgst_amount = roundToTwo(row.sgst_amount + item.sgst_amount)
    row.total_tax = roundToTwo(row.cgst_amount + row.sgst_amount)
  }

  return Array.from(map.values())
}
