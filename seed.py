import sqlite3, os, math

DB = os.path.expanduser("~/.config/electron-invoice-app/invoices.db")
conn = sqlite3.connect(DB)
conn.execute("PRAGMA foreign_keys = ON")
c = conn.cursor()

# ── 1. Business Profile ──────────────────────────────────────────
c.execute("""
  UPDATE business_profile SET
    business_name        = 'Siddhnath Marble & Granite',
    address1             = 'Plot No. 12, GIDC Industrial Area',
    address2             = 'Near NH-48, Rajkot Highway',
    city                 = 'Morbi',
    state                = 'Gujarat',
    pincode              = '363641',
    gstin                = '24AABCS1429B1ZS',
    pan                  = 'AABCS1429B',
    phone                = '+91 98765 43210',
    email                = 'accounts@siddhnathmarble.com',
    bank_name            = 'State Bank of India',
    account_number       = '32109876543210',
    ifsc_code            = 'SBIN0001234',
    branch               = 'Morbi Main Branch',
    swift_code           = 'SBININBB',
    signatory_name       = 'Rajesh Patel',
    invoice_prefix       = 'SMG',
    last_invoice_number  = 81
  WHERE id = 1
""")
print("✓ Business profile: Siddhnath Marble & Granite")

# ── 2. Customer ──────────────────────────────────────────────────
c.execute("SELECT id FROM customers WHERE name = 'Aadhya Developers Pvt. Ltd.'")
row = c.fetchone()
if row:
    customer_id = row[0]
    print(f"✓ Customer already exists (id={customer_id})")
else:
    c.execute("""
      INSERT INTO customers (name, address, city, state, state_code, pincode, gstin, pan, phone)
      VALUES (
        'Aadhya Developers Pvt. Ltd.',
        'Survey No. 204, Opp. Civil Hospital, Ring Road',
        'Surat', 'Gujarat', '24', '395002',
        '24ACBFA5053A1ZQ', 'ACBFA5053A', '9876501234'
      )
    """)
    customer_id = c.lastrowid
    print(f"✓ Customer created (id={customer_id})")

# ── 3. Invoice items & totals ────────────────────────────────────
def r2(v): return round(v * 100) / 100

items = [
    {
        "sl_no": 1,
        "description": "Granite Slabs (Black Galaxy) 18mm",
        "hsn_sac": "68022310",
        "quantity": 642.5, "unit": "SQF",
        "rate": 60.0, "per": "SQF",
        "cgst_rate": 9.0, "sgst_rate": 9.0,
    },
    {
        "sl_no": 2,
        "description": "Marble Tiles (Statuario White) 20mm",
        "hsn_sac": "68022190",
        "quantity": 320.0, "unit": "SQF",
        "rate": 85.0, "per": "SQF",
        "cgst_rate": 9.0, "sgst_rate": 9.0,
    },
]
for it in items:
    it["amount"]      = r2(it["quantity"] * it["rate"])
    it["cgst_amount"] = r2(it["amount"] * it["cgst_rate"] / 100)
    it["sgst_amount"] = r2(it["amount"] * it["sgst_rate"] / 100)

taxable = r2(sum(i["amount"] for i in items))
cgst    = r2(sum(i["cgst_amount"] for i in items))
sgst    = r2(sum(i["sgst_amount"] for i in items))
grand   = r2(taxable + cgst + sgst)
qty_tot = sum(i["quantity"] for i in items)

# ── 4. Insert invoice ────────────────────────────────────────────
c.execute("SELECT id FROM invoices WHERE invoice_number = 'SMG-081'")
if c.fetchone():
    print("✓ Invoice SMG-081 already exists — updating amounts")
    c.execute("""
      UPDATE invoices SET
        taxable_value=?, cgst_total=?, sgst_total=?, grand_total=?, total_quantity=?
      WHERE invoice_number='SMG-081'
    """, (taxable, cgst, sgst, grand, qty_tot))
else:
    c.execute("""
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
        'SMG-081','2026-03-15',
        'Aadhya Developers Pvt. Ltd.','Survey No. 204, Opp. Civil Hospital, Ring Road, Surat 395002','24ACBFA5053A1ZQ','Gujarat',
        ?,
        'Aadhya Developers Pvt. Ltd.','Survey No. 204, Opp. Civil Hospital, Ring Road, Surat 395002','24ACBFA5053A1ZQ','ACBFA5053A',
        'Gujarat','24',
        'DN-2026/81','PO-2026/0312','2026-03-12',
        'DD-2026/81','2026-03-14','VRL Logistics',
        'Surat','Against Delivery','30 Days Credit',
        ?,?,?,?,?,
        'DRAFT',0
      )
    """, (customer_id, qty_tot, taxable, cgst, sgst, grand))
    invoice_id = c.lastrowid

    for it in items:
        c.execute("""
          INSERT INTO invoice_items
            (invoice_id,sl_no,description,hsn_sac,quantity,unit,rate,per,
             amount,cgst_rate,sgst_rate,cgst_amount,sgst_amount)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            invoice_id, it["sl_no"], it["description"], it["hsn_sac"],
            it["quantity"], it["unit"], it["rate"], it["per"],
            it["amount"], it["cgst_rate"], it["sgst_rate"],
            it["cgst_amount"], it["sgst_amount"]
        ))
    print(f"✓ Invoice SMG-081 created (id={invoice_id})")

conn.commit()
conn.close()

print()
print("═" * 44)
print("  INVOICE SMG-081 — Summary")
print("═" * 44)
print(f"  Item 1: Granite Slabs    642.5 SQF × ₹60")
print(f"          Amount: ₹{items[0]['amount']:,.2f}")
print(f"  Item 2: Marble Tiles     320.0 SQF × ₹85")
print(f"          Amount: ₹{items[1]['amount']:,.2f}")
print(f"  {'─'*40}")
print(f"  Taxable Value : ₹{taxable:>10,.2f}")
print(f"  CGST  (9%)    : ₹{cgst:>10,.2f}")
print(f"  SGST  (9%)    : ₹{sgst:>10,.2f}")
print(f"  {'─'*40}")
print(f"  Grand Total   : ₹{grand:>10,.2f}")
print("═" * 44)
print()
print("Restart the Electron app to load the new data.")
