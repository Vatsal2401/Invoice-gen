import { getDb } from '../db/database'

export interface Customer {
  id: number
  name: string
  address: string
  city: string
  state: string
  state_code: string
  pincode: string
  gstin: string
  pan: string
  phone: string
  created_at: string
}

export type CustomerInput = Omit<Customer, 'id' | 'created_at'>

export function listCustomers(): Customer[] {
  const db = getDb()
  return db.prepare('SELECT * FROM customers ORDER BY name').all() as Customer[]
}

export function getCustomer(id: number): Customer | undefined {
  const db = getDb()
  return db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as Customer | undefined
}

export function createCustomer(data: CustomerInput): Customer {
  const db = getDb()
  const result = db
    .prepare(
      `INSERT INTO customers (name, address, city, state, state_code, pincode, gstin, pan, phone)
       VALUES (@name, @address, @city, @state, @state_code, @pincode, @gstin, @pan, @phone)`
    )
    .run(data)
  return getCustomer(result.lastInsertRowid as number) as Customer
}

export function updateCustomer(id: number, data: Partial<CustomerInput>): void {
  const db = getDb()
  const fields = Object.keys(data)
    .map((k) => `${k} = @${k}`)
    .join(', ')
  if (!fields) return
  db.prepare(`UPDATE customers SET ${fields} WHERE id = @id`).run({ ...data, id })
}

export function deleteCustomer(id: number): void {
  const db = getDb()
  const invoiceCount = (db.prepare('SELECT COUNT(*) as cnt FROM invoices WHERE customer_id = ?').get(id) as { cnt: number }).cnt
  const paymentCount = (db.prepare('SELECT COUNT(*) as cnt FROM payments WHERE customer_id = ?').get(id) as { cnt: number }).cnt
  if (invoiceCount + paymentCount > 0) {
    throw new Error('Cannot delete: customer has existing invoices or payments')
  }
  db.prepare('DELETE FROM customers WHERE id = ?').run(id)
}
