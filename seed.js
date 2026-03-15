// seed.js — populates business profile, one customer, and one complete invoice
const Database = require('better-sqlite3')
const path = require('path')
const os = require('os')

const DB_PATH = path.join(os.homedir(), '.config', 'electron-invoice-app', 'invoices.db')
const db = new Database(DB_PATH)
db.pragma('foreign_keys = ON')

// ── 1. Business Profile ──────────────────────────────────────────
db.prepare(`
  UPDATE business_profile SET
    business_name   = 'Siddhnath Marble & Granite',
    address1        = 'Plot No. 12, GIDC Industrial Area',
    address2        = 'Near NH-48, Rajkot Highway',
    city            = 'Morbi',
    state           = 'Gujarat',
    pincode         = '363641',
    gstin           = '24AABCS1429B1ZS',
    pan             = 'AABCS1429B',
    phone           = '+91 98765 43210',
    email           = 'accounts@siddhnathmarble.com',
    bank_name       = 'State Bank of India',
    account_number  = '32109876543210',
    ifsc_code       = 'SBIN0001234',
    branch          = 'Morbi Main Branch',
    swift_code      = 'SBININBB',
    signatory_name  = 'Rajesh Patel',
    invoice_prefix  = 'SMG',
    last_invoice_number = 80
  WHERE id = 1
`).run()
console.log('✓ Business profile updated')

// ── 2. Customer ──────────────────────────────────────────────────
const existingCustomer = db.prepare("SELECT id FROM customers WHERE name = 'Aadhya Developers Pvt. Ltd.'").get()
let customerId
if (!existingCustomer) {
  const res = db.prepare(`
    INSERT INTO customers (name, address, city, state, state_code, pincode, gstin, pan, phone)
    VALUES (
      'Aadhya Developers Pvt. Ltd.',
      'Survey No. 204, Opp. Civil Hospital, Ring Road',
      'Surat',
      'Gujarat',
      '24',
      '395002',
      '24ACBFA5053A1ZQ',
      'ACBFA5053A',
      '9876501234'
    )
  `).run()
  customerId = res.lastInsertRowid
  console.log('✓ Customer created (id:', customerId, ')')
} else {
  customerId = existingCustomer.id
  console.log('✓ Customer already exists (id:', customerId, ')')
}

// ── 3. Invoice ───────────────────────────────────────────────────
const existingInv = db.prepare("SELECT id FROM invoices WHERE invoice_number = 'SMG-081'").get()
if (existingInv) {
  console.log('✓ Invoice SMG-081 already exists — skipping')
  db.close()
  process.exit(0)
}

// Item calculations (roundToTwo)
const round2 = (v) => Math.round(v * 100) / 100

const items = [
  {
    sl_no: 1,
    description: 'Granite Slabs (Black Galaxy) 18mm',
    hsn_sac: '68022310',
    quantity: 642.5,
    unit: 'SQF',
    rate: 60,
    per: 'SQF',
    cgst_rate: 9,
    sgst_rate: 9,
  },
  {
    sl_no: 2,
    description: 'Marble Tiles (Statuario White) 20mm',
    hsn_sac: '68022190',
    quantity: 320.0,
    unit: 'SQF',
    rate: 85,
    per: 'SQF',
    cgst_rate: 9,
    sgst_rate: 9,
  },
]

// Calculate amounts
items.forEach((item) => {
  item.amount      = round2(item.quantity * item.rate)
  item.cgst_amount = round2(item.amount * item.cgst_rate / 100)
  item.sgst_amount = round2(item.amount * item.sgst_rate / 100)
})

const taxable_value = round2(items.reduce((s, i) => s + i.amount, 0))
const cgst_total    = round2(items.reduce((s, i) => s + i.cgst_amount, 0))
const sgst_total    = round2(items.reduce((s, i) => s + i.sgst_amount, 0))
const grand_total   = round2(taxable_value + cgst_total + sgst_total)
const total_quantity = items.reduce((s, i) => s + i.quantity, 0)

const invoiceId = db.transaction(() => {
  const res = db.prepare(`
    INSERT INTO invoices (
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
      'SMG-081', '2026-03-15',
      'Aadhya Developers Pvt. Ltd.', 'Survey No. 204, Opp. Civil Hospital, Ring Road, Surat', '24ACBFA5053A1ZQ', 'Gujarat',
      ${customerId}, 'Aadhya Developers Pvt. Ltd.', 'Survey No. 204, Opp. Civil Hospital, Ring Road, Surat', '24ACBFA5053A1ZQ', 'ACBFA5053A',
      'Gujarat', '24',
      'DN-2026/81', 'PO-2026/0312', '2026-03-12',
      'DD-2026/81', '2026-03-14', 'VRL Logistics',
      'Surat', 'Against Delivery', '30 Days Credit',
      ${total_quantity}, ${taxable_value}, ${cgst_total}, ${sgst_total}, ${grand_total},
      'DRAFT', 0
    )
  `).run()

  const id = res.lastInsertRowid

  const insertItem = db.prepare(`
    INSERT INTO invoice_items
      (invoice_id, sl_no, description, hsn_sac, quantity, unit, rate, per,
       amount, cgst_rate, sgst_rate, cgst_amount, sgst_amount)
    VALUES
      (@invoice_id, @sl_no, @description, @hsn_sac, @quantity, @unit, @rate, @per,
       @amount, @cgst_rate, @sgst_rate, @cgst_amount, @sgst_amount)
  `)

  for (const item of items) {
    insertItem.run({ ...item, invoice_id: id })
  }

  db.prepare('UPDATE business_profile SET last_invoice_number = 81 WHERE id = 1').run()

  return id
})()

console.log('✓ Invoice SMG-081 created (id:', invoiceId, ')')
console.log()
console.log('Invoice Summary:')
console.log('  Taxable Value :', taxable_value.toLocaleString('en-IN'))
console.log('  CGST (9%)     :', cgst_total.toLocaleString('en-IN'))
console.log('  SGST (9%)     :', sgst_total.toLocaleString('en-IN'))
console.log('  Grand Total   :', grand_total.toLocaleString('en-IN'))

db.close()
console.log()
console.log('Done! Restart the app or navigate away and back to see changes.')
