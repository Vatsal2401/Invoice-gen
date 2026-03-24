import { getDb } from '../db/database'

export interface InvoiceItem {
  id?: number
  invoice_id?: number
  sl_no: number
  description: string
  hsn_sac: string
  quantity: number
  unit: string
  rate: number
  per: string
  amount: number
  cgst_rate: number
  sgst_rate: number
  cgst_amount: number
  sgst_amount: number
}

export interface Invoice {
  id?: number
  invoice_number: string
  invoice_date: string
  ship_to_name: string
  ship_to_address: string
  ship_to_gstin: string
  ship_to_state: string
  customer_id?: number
  buyer_name: string
  buyer_address: string
  buyer_gstin: string
  buyer_pan: string
  buyer_state: string
  buyer_state_code: string
  delivery_note: string
  buyer_order_number: string
  buyer_order_date: string
  dispatch_doc_number: string
  dispatch_doc_date: string
  dispatched_through: string
  destination: string
  payment_terms: string
  delivery_terms: string
  total_quantity: number
  taxable_value: number
  cgst_total: number
  sgst_total: number
  grand_total: number
  status: 'DRAFT' | 'FINAL'
  cancelled: number
  created_at?: string
}

export interface InvoiceSummary {
  id: number
  invoice_number: string
  invoice_date: string
  buyer_name: string
  grand_total: number
  status: string
  cancelled: number
  created_at: string
}

export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[]
}

export function getNextInvoiceNumber(): string {
  const db = getDb()
  const profile = db
    .prepare('SELECT invoice_prefix, last_invoice_number FROM business_profile WHERE id = 1')
    .get() as { invoice_prefix: string; last_invoice_number: number }
  const next = (profile.last_invoice_number || 0) + 1
  return `${profile.invoice_prefix}-${String(next).padStart(4, '0')}`
}

export function createInvoice(invoiceData: Omit<Invoice, 'id' | 'created_at'>, items: InvoiceItem[]): number {
  const db = getDb()

  const invoiceId = db
    .transaction(() => {
      const result = db
        .prepare(
          `INSERT INTO invoices (
            invoice_number, invoice_date,
            ship_to_name, ship_to_address, ship_to_gstin, ship_to_state,
            customer_id, buyer_name, buyer_address, buyer_gstin, buyer_pan,
            buyer_state, buyer_state_code,
            delivery_note, buyer_order_number, buyer_order_date,
            dispatch_doc_number, dispatch_doc_date, dispatched_through,
            destination, payment_terms, delivery_terms,
            total_quantity, taxable_value, cgst_total, sgst_total, grand_total,
            status, cancelled
          ) VALUES (
            @invoice_number, @invoice_date,
            @ship_to_name, @ship_to_address, @ship_to_gstin, @ship_to_state,
            @customer_id, @buyer_name, @buyer_address, @buyer_gstin, @buyer_pan,
            @buyer_state, @buyer_state_code,
            @delivery_note, @buyer_order_number, @buyer_order_date,
            @dispatch_doc_number, @dispatch_doc_date, @dispatched_through,
            @destination, @payment_terms, @delivery_terms,
            @total_quantity, @taxable_value, @cgst_total, @sgst_total, @grand_total,
            @status, @cancelled
          )`
        )
        .run(invoiceData)

      const id = result.lastInsertRowid as number

      const insertItem = db.prepare(
        `INSERT INTO invoice_items (invoice_id, sl_no, description, hsn_sac, quantity, unit, rate, per, amount, cgst_rate, sgst_rate, cgst_amount, sgst_amount)
         VALUES (@invoice_id, @sl_no, @description, @hsn_sac, @quantity, @unit, @rate, @per, @amount, @cgst_rate, @sgst_rate, @cgst_amount, @sgst_amount)`
      )

      for (const item of items) {
        insertItem.run({ ...item, invoice_id: id })
      }

      db.prepare(
        'UPDATE business_profile SET last_invoice_number = last_invoice_number + 1 WHERE id = 1'
      ).run()

      return id
    })()

  return invoiceId
}

export function listInvoices(): InvoiceSummary[] {
  const db = getDb()
  return db
    .prepare(
      'SELECT id, invoice_number, invoice_date, buyer_name, grand_total, status, cancelled, created_at FROM invoices ORDER BY id DESC'
    )
    .all() as InvoiceSummary[]
}

export function getInvoice(id: number): InvoiceWithItems | undefined {
  const db = getDb()
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as Invoice | undefined
  if (!invoice) return undefined
  const items = db
    .prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sl_no')
    .all(id) as InvoiceItem[]
  return { ...invoice, items }
}

export function finalizeInvoice(id: number): void {
  const db = getDb()
  db.prepare("UPDATE invoices SET status = 'FINAL' WHERE id = ?").run(id)
}

export function cancelInvoice(id: number): void {
  const db = getDb()
  db.prepare('UPDATE invoices SET cancelled = 1 WHERE id = ?').run(id)
}

export function updateInvoice(id: number, invoiceData: Omit<Invoice, 'id' | 'created_at' | 'invoice_number'>, items: InvoiceItem[]): void {
  const db = getDb()

  db.transaction(() => {
    db.prepare(
      `UPDATE invoices SET
        invoice_date = @invoice_date,
        ship_to_name = @ship_to_name, ship_to_address = @ship_to_address,
        ship_to_gstin = @ship_to_gstin, ship_to_state = @ship_to_state,
        customer_id = @customer_id, buyer_name = @buyer_name,
        buyer_address = @buyer_address, buyer_gstin = @buyer_gstin,
        buyer_pan = @buyer_pan, buyer_state = @buyer_state,
        buyer_state_code = @buyer_state_code,
        delivery_note = @delivery_note, buyer_order_number = @buyer_order_number,
        buyer_order_date = @buyer_order_date, dispatch_doc_number = @dispatch_doc_number,
        dispatch_doc_date = @dispatch_doc_date, dispatched_through = @dispatched_through,
        destination = @destination, payment_terms = @payment_terms,
        delivery_terms = @delivery_terms, total_quantity = @total_quantity,
        taxable_value = @taxable_value, cgst_total = @cgst_total,
        sgst_total = @sgst_total, grand_total = @grand_total
      WHERE id = @id`
    ).run({ ...invoiceData, id })

    db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(id)

    const insertItem = db.prepare(
      `INSERT INTO invoice_items (invoice_id, sl_no, description, hsn_sac, quantity, unit, rate, per, amount, cgst_rate, sgst_rate, cgst_amount, sgst_amount)
       VALUES (@invoice_id, @sl_no, @description, @hsn_sac, @quantity, @unit, @rate, @per, @amount, @cgst_rate, @sgst_rate, @cgst_amount, @sgst_amount)`
    )

    for (const item of items) {
      insertItem.run({ ...item, invoice_id: id })
    }
  })()
}
