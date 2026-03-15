import Database from 'better-sqlite3'

export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS business_profile (
      id                  INTEGER PRIMARY KEY DEFAULT 1,
      business_name       TEXT NOT NULL DEFAULT '',
      address1            TEXT DEFAULT '',
      address2            TEXT DEFAULT '',
      city                TEXT DEFAULT '',
      state               TEXT DEFAULT '',
      pincode             TEXT DEFAULT '',
      gstin               TEXT DEFAULT '',
      pan                 TEXT DEFAULT '',
      phone               TEXT DEFAULT '',
      email               TEXT DEFAULT '',
      bank_name           TEXT DEFAULT '',
      account_number      TEXT DEFAULT '',
      ifsc_code           TEXT DEFAULT '',
      branch              TEXT DEFAULT '',
      swift_code          TEXT DEFAULT '',
      signatory_name      TEXT DEFAULT '',
      invoice_prefix      TEXT DEFAULT 'INV',
      last_invoice_number INTEGER DEFAULT 0,
      logo_path           TEXT DEFAULT ''
    );
    INSERT OR IGNORE INTO business_profile (id) VALUES (1);

    CREATE TABLE IF NOT EXISTS customers (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      address     TEXT DEFAULT '',
      city        TEXT DEFAULT '',
      state       TEXT DEFAULT '',
      state_code  TEXT DEFAULT '',
      pincode     TEXT DEFAULT '',
      gstin       TEXT DEFAULT '',
      pan         TEXT DEFAULT '',
      phone       TEXT DEFAULT '',
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number       TEXT NOT NULL UNIQUE,
      invoice_date         TEXT NOT NULL,
      ship_to_name         TEXT DEFAULT '',
      ship_to_address      TEXT DEFAULT '',
      ship_to_gstin        TEXT DEFAULT '',
      ship_to_state        TEXT DEFAULT '',
      customer_id          INTEGER,
      buyer_name           TEXT NOT NULL DEFAULT '',
      buyer_address        TEXT DEFAULT '',
      buyer_gstin          TEXT DEFAULT '',
      buyer_pan            TEXT DEFAULT '',
      buyer_state          TEXT DEFAULT '',
      buyer_state_code     TEXT DEFAULT '',
      delivery_note        TEXT DEFAULT '',
      buyer_order_number   TEXT DEFAULT '',
      buyer_order_date     TEXT DEFAULT '',
      dispatch_doc_number  TEXT DEFAULT '',
      dispatch_doc_date    TEXT DEFAULT '',
      dispatched_through   TEXT DEFAULT '',
      destination          TEXT DEFAULT '',
      payment_terms        TEXT DEFAULT '',
      delivery_terms       TEXT DEFAULT '',
      total_quantity       REAL DEFAULT 0,
      taxable_value        REAL DEFAULT 0,
      cgst_total           REAL DEFAULT 0,
      sgst_total           REAL DEFAULT 0,
      grand_total          REAL DEFAULT 0,
      status               TEXT DEFAULT 'DRAFT',
      cancelled            INTEGER DEFAULT 0,
      created_at           TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id  INTEGER NOT NULL,
      sl_no       INTEGER NOT NULL,
      description TEXT NOT NULL,
      hsn_sac     TEXT DEFAULT '',
      quantity    REAL DEFAULT 0,
      unit        TEXT DEFAULT '',
      rate        REAL DEFAULT 0,
      per         TEXT DEFAULT '',
      amount      REAL DEFAULT 0,
      cgst_rate   REAL DEFAULT 9,
      sgst_rate   REAL DEFAULT 9,
      cgst_amount REAL DEFAULT 0,
      sgst_amount REAL DEFAULT 0,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id  INTEGER NOT NULL,
      payment_date TEXT NOT NULL,
      amount       REAL NOT NULL,
      mode         TEXT DEFAULT 'Cash',
      reference    TEXT DEFAULT '',
      narration    TEXT DEFAULT '',
      created_at   TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );
  `)
}
