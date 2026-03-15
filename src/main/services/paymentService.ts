import { getDb } from '../db/database'

export interface PaymentInput {
  customer_id: number
  payment_date: string
  amount: number
  mode: string
  reference: string
  narration: string
}

export function createPayment(data: PaymentInput): number {
  const db = getDb()
  const result = db
    .prepare(
      `INSERT INTO payments (customer_id, payment_date, amount, mode, reference, narration)
       VALUES (@customer_id, @payment_date, @amount, @mode, @reference, @narration)`
    )
    .run(data)
  return result.lastInsertRowid as number
}

export function listPayments(customerId: number): unknown[] {
  const db = getDb()
  return db
    .prepare(`SELECT * FROM payments WHERE customer_id = ? ORDER BY payment_date ASC, id ASC`)
    .all(customerId)
}

export function deletePayment(id: number): void {
  const db = getDb()
  db.prepare(`DELETE FROM payments WHERE id = ?`).run(id)
}

export function getCustomerLedger(
  customerId: number,
  fromDate: string,
  toDate: string
): { invoices: unknown[]; payments: unknown[] } {
  const db = getDb()
  const invoices = db
    .prepare(
      `SELECT id, invoice_number, invoice_date, grand_total, cancelled
       FROM invoices
       WHERE customer_id = ? AND invoice_date >= ? AND invoice_date <= ?
       ORDER BY invoice_date ASC, id ASC`
    )
    .all(customerId, fromDate, toDate)

  const payments = db
    .prepare(
      `SELECT * FROM payments
       WHERE customer_id = ? AND payment_date >= ? AND payment_date <= ?
       ORDER BY payment_date ASC, id ASC`
    )
    .all(customerId, fromDate, toDate)

  return { invoices, payments }
}
