import sqlite3, random, math
from datetime import date, timedelta

DB = "/home/vatsal2401/.config/electron-invoice-app/invoices.db"
conn = sqlite3.connect(DB)
conn.execute("PRAGMA foreign_keys = ON")
c = conn.cursor()

def r2(v): return round(v * 100) / 100

# ── 50 Customers ─────────────────────────────────────────────────
CUSTOMER_DATA = [
    ("Rajesh Constructions Pvt. Ltd.",     "45, Gandhi Nagar, Ring Road",         "Ahmedabad",  "Gujarat",         "24", "380009", "24AABCR1234A1Z5", "AABCR1234A", "9876543001"),
    ("Mehta Infrastructure Ltd.",          "Survey No. 78, Satellite Area",       "Ahmedabad",  "Gujarat",         "24", "380015", "24AACCM2345B1Z6", "AACCM2345B", "9876543002"),
    ("Patel Builders & Developers",        "Plot 22, GIDC Phase-2",               "Vadodara",   "Gujarat",         "24", "390010", "24AADCP3456C1Z7", "AADCP3456C", "9876543003"),
    ("Shah Stone Works Pvt. Ltd.",         "12-A, Industrial Estate",             "Surat",      "Gujarat",         "24", "395003", "24AAEBS4567D1Z8", "AAEBS4567D", "9876543004"),
    ("Desai Interior Designers",           "Opp. Railway Station, MG Road",       "Rajkot",     "Gujarat",         "24", "360001", "24AAFBD5678E1Z9", "AAFBD5678E", "9876543005"),
    ("Joshi Tiles & Marbles",              "15, Station Road",                    "Surat",      "Gujarat",         "24", "395001", "24AAGBJ6789F1ZA", "AAGBJ6789F", "9876543006"),
    ("Kumar Real Estate Pvt. Ltd.",        "Tower B, 3rd Floor, SG Highway",      "Ahmedabad",  "Gujarat",         "24", "380054", "24AAHBK7890G1ZB", "AAHBK7890G", "9876543007"),
    ("Sharma Flooring Solutions",          "Plot 5, Phase-1 Industrial Area",     "Gandhinagar","Gujarat",         "24", "382010", "24AAIBSH8901H1ZC","AAIBSH8901H","9876543008"),
    ("Verma Constructions",                "Near Bus Stand, Kalupur",             "Ahmedabad",  "Gujarat",         "24", "380002", "24AAJBV9012I1ZD", "AAJBV9012I", "9876543009"),
    ("Agrawal Tiles Depot",                "Main Market, Sadar Bazaar",           "Vadodara",   "Gujarat",         "24", "390001", "24AAKBA0123J1ZE", "AAKBA0123J", "9876543010"),
    ("Nair Interiors Pvt. Ltd.",           "MG Road, Vyttila",                    "Kochi",      "Kerala",          "32", "682019", "32AALBN1234K1ZF", "AALBN1234K", "9876543011"),
    ("Iyer & Sons Construction",           "Anna Nagar, 2nd Street",              "Chennai",    "Tamil Nadu",      "33", "600040", "33AAMBNI2345L1ZG","AAMBNI2345L","9876543012"),
    ("Pillai Marble House",                "Near Temple, Chembur",                "Mumbai",     "Maharashtra",     "27", "400071", "27AANB0P3456M1ZH","AANB0P3456M","9876543013"),
    ("Gupta Stone Palace",                 "Sarojini Nagar Market",               "Lucknow",    "Uttar Pradesh",   "09", "226001", "09AAOBG4567N1ZI", "AAOBG4567N", "9876543014"),
    ("Rao Infrastructure Ltd.",            "Jubilee Hills, Road No. 45",          "Hyderabad",  "Telangana",       "36", "500033", "36AAPBR5678O1ZJ", "AAPBR5678O", "9876543015"),
    ("Mishra Tiles & Granites",            "Civil Lines, Near Collector Office",  "Bhopal",     "Madhya Pradesh",  "23", "462001", "23AAQBM6789P1ZK", "AAQBM6789P", "9876543016"),
    ("Pandey Building Materials",          "GT Road, Kanpur Bypass",              "Kanpur",     "Uttar Pradesh",   "09", "208001", "09AARBP7890Q1ZL", "AARBP7890Q", "9876543017"),
    ("Singh Granite Exports",              "Sector 14, Gurgaon",                  "Gurugram",   "Haryana",         "06", "122001", "06AASBSG8901R1ZM","AASBSG8901R","9876543018"),
    ("Reddy Constructions Pvt. Ltd.",      "Banjara Hills, Road No. 12",          "Hyderabad",  "Telangana",       "36", "500034", "36AATBR9012S1ZN", "AATBR9012S", "9876543019"),
    ("Choudhary Marble Traders",           "Sindhi Camp, Station Road",           "Jaipur",     "Rajasthan",       "08", "302001", "08AAUBC0123T1ZO", "AAUBC0123T", "9876543020"),
    ("Trivedi Stone Industries",           "GIDC, Naroda",                        "Ahmedabad",  "Gujarat",         "24", "382330", "24AAVBT1234U1ZP", "AAVBT1234U", "9876543021"),
    ("Modi Developers Pvt. Ltd.",          "Prahlad Nagar, Corporate Road",       "Ahmedabad",  "Gujarat",         "24", "380015", "24AAWBM2345V1ZQ", "AAWBM2345V", "9876543022"),
    ("Thakkar Flooring & Tiles",           "Opp. Lal Bungalow, C.G. Road",        "Ahmedabad",  "Gujarat",         "24", "380006", "24AAXBT3456W1ZR", "AAXBT3456W", "9876543023"),
    ("Bhatt Construction Co.",             "Nr. Swaminarayan Temple, Kalupur",    "Ahmedabad",  "Gujarat",         "24", "380001", "24AAYBBC4567X1ZS","AAYBBC4567X","9876543024"),
    ("Parikh Infrastructure",              "Navrangpura, Pritam Nagar",           "Ahmedabad",  "Gujarat",         "24", "380009", "24AAZBBP5678Y1ZT","AAZBBP5678Y","9876543025"),
    ("Kapoor Stone Pvt. Ltd.",             "Rohini Sector 11",                    "Delhi",      "Delhi",           "07", "110085", "07AAABK6789Z1ZU", "AAABK6789Z", "9876543026"),
    ("Tiwari Tiles Emporium",              "Hazratganj, Near GPO",                "Lucknow",    "Uttar Pradesh",   "09", "226001", "09AAABBT7890A2ZV","AAABBT7890A","9876543027"),
    ("Malhotra Granites",                  "Industrial Area Phase 2, Panchkula",  "Panchkula",  "Haryana",         "06", "134112", "06AAABM8901B2ZW", "AAABM8901B", "9876543028"),
    ("Oberoi Interior Solutions",          "Connaught Place, Block B",            "Delhi",      "Delhi",           "07", "110001", "07AAABO9012C2ZX", "AAABO9012C", "9876543029"),
    ("Naik Stone Exports",                 "MIDC, Turbhe",                        "Navi Mumbai","Maharashtra",     "27", "400705", "27AAABN0123D2ZY", "AAABN0123D", "9876543030"),
    ("Suresh Granite & Marble House",      "Peeragarhi Chowk, Outer Ring Road",   "Delhi",      "Delhi",           "07", "110087", "07AAABSG1234E2ZZ","AAABSG1234E","9876543031"),
    ("Ghosh Flooring Pvt. Ltd.",           "Salt Lake Sector V",                  "Kolkata",    "West Bengal",     "19", "700091", "19AAABG2345F2ZA", "AAABG2345F", "9876543032"),
    ("Chatterjee Constructions",           "Ballygunge Circular Road",            "Kolkata",    "West Bengal",     "19", "700019", "19AAABC3456G2ZB", "AAABC3456G", "9876543033"),
    ("Banerjee Stone Works",               "Park Street, 3rd Lane",               "Kolkata",    "West Bengal",     "19", "700016", "19AAABB4567H2ZC", "AAABB4567H", "9876543034"),
    ("Das Interior & Décor",               "Camac Street, Block A",               "Kolkata",    "West Bengal",     "19", "700017", "19AAABD5678I2ZD", "AAABD5678I", "9876543035"),
    ("Jain Marble Depot",                  "Sumel Business Park, Dudheshwar",     "Ahmedabad",  "Gujarat",         "24", "380004", "24AAABJ6789J2ZE", "AAABJ6789J", "9876543036"),
    ("Solanki Tiles World",                "Near Sola Bridge, SG Road",           "Ahmedabad",  "Gujarat",         "24", "380061", "24AAABS7890K2ZF", "AAABS7890K", "9876543037"),
    ("Gohil Stone Centre",                 "Morbi Road, GIDC",                    "Rajkot",     "Gujarat",         "24", "360002", "24AAABG8901L2ZG", "AAABG8901L", "9876543038"),
    ("Makwana Infrastructure Pvt. Ltd.",   "Vastral, Naroda Road",                "Ahmedabad",  "Gujarat",         "24", "382418", "24AAABM9012M2ZH","AAABM9012M","9876543039"),
    ("Barot Builders",                     "Sola, Science City Road",             "Ahmedabad",  "Gujarat",         "24", "380060", "24AAABB0123N2ZI", "AAABB0123N", "9876543040"),
    ("Chauhan Stone Pvt. Ltd.",            "Chandkheda, Sabarmati",               "Ahmedabad",  "Gujarat",         "24", "382424", "24AAABC1234O2ZJ", "AAABC1234O", "9876543041"),
    ("Raval Constructions",                "Nikol, Naroda Road",                  "Ahmedabad",  "Gujarat",         "24", "382350", "24AAABR2345P2ZK", "AAABR2345P", "9876543042"),
    ("Dixit Flooring Solutions",           "Maninagar, Rambaug",                  "Ahmedabad",  "Gujarat",         "24", "380008", "24AAABD3456Q2ZL", "AAABD3456Q", "9876543043"),
    ("Hasmukh Tiles & Stone",              "Paldi, Ellisbridge",                  "Ahmedabad",  "Gujarat",         "24", "380007", "24AAABH4567R2ZM", "AAABH4567R", "9876543044"),
    ("Amreli Marble & Granite",            "Station Road, Near Bus Stand",        "Amreli",     "Gujarat",         "24", "365601", "24AAABA5678S2ZN", "AAABA5678S", "9876543045"),
    ("Kapadiya Flooring",                  "GIDC, Bhavnagar Road",                "Bhavnagar",  "Gujarat",         "24", "364001", "24AAABK6789T2ZO", "AAABK6789T", "9876543046"),
    ("Rathod Stone Exports Pvt. Ltd.",     "Industrial Zone, Sector 28",          "Gandhinagar","Gujarat",         "24", "382028", "24AAABR7890U2ZP", "AAABR7890U", "9876543047"),
    ("Jadeja Infrastructure Ltd.",         "Airport Road, Near Civil Hospital",   "Rajkot",     "Gujarat",         "24", "360005", "24AAABJ8901V2ZQ", "AAABJ8901V", "9876543048"),
    ("Pandya Construction Co.",            "Kalawad Road, Opp. Stadium",          "Rajkot",     "Gujarat",         "24", "360001", "24AAABP9012W2ZR", "AAABP9012W", "9876543049"),
    ("Vora Stone Palace",                  "Ravapar Road, Near Highway",          "Morbi",      "Gujarat",         "24", "363641", "24AAABV0123X2ZS", "AAABV0123X", "9876543050"),
]

inserted_ids = []
for row in CUSTOMER_DATA:
    name = row[0]
    c.execute("SELECT id FROM customers WHERE name=?", (name,))
    existing = c.fetchone()
    if existing:
        inserted_ids.append(existing[0])
    else:
        c.execute("""
            INSERT INTO customers (name,address,city,state,state_code,pincode,gstin,pan,phone)
            VALUES (?,?,?,?,?,?,?,?,?)
        """, row)
        inserted_ids.append(c.lastrowid)

print(f"✓ {len(inserted_ids)} customers ready")

# ── Item catalogue ────────────────────────────────────────────────
ITEMS_POOL = [
    ("Granite Slabs (Black Galaxy) 18mm",        "68022310", 60.0,  9.0),
    ("Marble Tiles (Statuario White) 20mm",       "68022190", 85.0,  9.0),
    ("Kota Stone Flooring 30mm",                  "68022390", 35.0,  9.0),
    ("Sandstone Pavers (Yellow) 25mm",            "68029990", 45.0,  9.0),
    ("Granite Tiles (Absolute Black) 20mm",       "68022310", 75.0,  9.0),
    ("Italian Marble (Carrara White) 18mm",       "68022100", 220.0, 9.0),
    ("Granite Slabs (Kashmir White) 20mm",        "68022310", 90.0,  9.0),
    ("Marble (Makrana White) 20mm",               "68022190", 110.0, 9.0),
    ("Granite Counter Top (Tan Brown) 30mm",      "68022310", 130.0, 9.0),
    ("Slate Tiles (Black) 10mm",                  "68029190", 55.0,  9.0),
    ("Travertine Tiles (Noce) 15mm",              "68022190", 95.0,  9.0),
    ("Limestone Flooring (Jaisalmer) 25mm",       "68022390", 40.0,  9.0),
    ("Granite Slabs (Steel Grey) 20mm",           "68022310", 70.0,  9.0),
    ("Quartzite Tiles (Pink) 15mm",               "68022390", 65.0,  9.0),
    ("Onyx Slab (Green) 18mm",                    "68022190", 350.0, 9.0),
]

UNITS = ["SQF", "SQM", "RFT", "NOS"]

def random_date(start_days_ago=365, end_days_ago=1):
    delta = random.randint(end_days_ago, start_days_ago)
    return (date.today() - timedelta(days=delta)).isoformat()

# ── Get current last invoice number ──────────────────────────────
c.execute("SELECT last_invoice_number, invoice_prefix FROM business_profile WHERE id=1")
bp = c.fetchone()
last_no, prefix = bp[0], bp[1]

# ── 10 Invoices ───────────────────────────────────────────────────
statuses   = ["FINAL", "FINAL", "FINAL", "FINAL", "DRAFT", "DRAFT", "FINAL", "DRAFT", "FINAL", "DRAFT"]
cancelled  = [0,       0,       0,       0,       0,       0,       0,       0,       1,       0      ]
# invoices 0,1,2 → 13 items each; rest → 2–5 items
item_counts = [13, 13, 13, 4, 3, 5, 2, 4, 3, 5]

for i in range(10):
    last_no += 1
    inv_num = f"{prefix}-{str(last_no).zfill(3)}"
    inv_date = random_date()
    cust = customers_pool = inserted_ids[i * 5 % len(inserted_ids)]  # spread across customers
    c.execute("SELECT name,address,city,state,state_code,pincode,gstin,pan FROM customers WHERE id=?", (cust,))
    cr = c.fetchone()
    cust_name    = cr[0]
    cust_address = ", ".join(filter(None, [cr[1], cr[2], cr[5]]))
    cust_gstin   = cr[6] or ""
    cust_pan     = cr[7] or ""
    cust_state   = cr[3] or ""
    cust_sc      = cr[4] or ""

    n_items = item_counts[i]
    pool = random.sample(ITEMS_POOL, min(n_items, len(ITEMS_POOL)))

    inv_items = []
    for sl, (desc, hsn, base_rate, tax) in enumerate(pool, 1):
        unit = random.choice(UNITS)
        qty  = round(random.uniform(50, 800), 2)
        rate = round(base_rate * random.uniform(0.9, 1.15), 2)
        amt  = r2(qty * rate)
        cgst = r2(amt * tax / 100)
        sgst = r2(amt * tax / 100)
        inv_items.append({
            "sl_no": sl, "description": desc, "hsn_sac": hsn,
            "quantity": qty, "unit": unit, "rate": rate, "per": unit,
            "amount": amt, "cgst_rate": tax, "sgst_rate": tax,
            "cgst_amount": cgst, "sgst_amount": sgst
        })

    taxable   = r2(sum(x["amount"] for x in inv_items))
    cgst_tot  = r2(sum(x["cgst_amount"] for x in inv_items))
    sgst_tot  = r2(sum(x["sgst_amount"] for x in inv_items))
    grand     = r2(taxable + cgst_tot + sgst_tot)
    total_qty = sum(x["quantity"] for x in inv_items)

    # Check if this invoice number already exists
    c.execute("SELECT id FROM invoices WHERE invoice_number=?", (inv_num,))
    if c.fetchone():
        print(f"  skip {inv_num} (exists)")
        continue

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
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (
        inv_num, inv_date,
        cust_name, cust_address, cust_gstin, cust_state,
        cust, cust_name, cust_address, cust_gstin, cust_pan,
        cust_state, cust_sc,
        f"DN-{inv_num}", f"PO-{inv_num}", random_date(30, 1),
        f"DD-{inv_num}", random_date(15, 1), random.choice(["VRL Logistics", "DTDC", "Blue Dart", "FedEx", "Self"]),
        random.choice(["Ahmedabad", "Surat", "Mumbai", "Delhi", "Rajkot"]),
        random.choice(["Against Delivery", "30 Days Credit", "15 Days Credit", "Advance"]),
        random.choice(["As per PO", "F.O.R. Destination", "Ex-Works"]),
        total_qty, taxable, cgst_tot, sgst_tot, grand,
        statuses[i], cancelled[i]
    ))
    inv_id = c.lastrowid

    for it in inv_items:
        c.execute("""
            INSERT INTO invoice_items
              (invoice_id,sl_no,description,hsn_sac,quantity,unit,rate,per,
               amount,cgst_rate,sgst_rate,cgst_amount,sgst_amount)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            inv_id, it["sl_no"], it["description"], it["hsn_sac"],
            it["quantity"], it["unit"], it["rate"], it["per"],
            it["amount"], it["cgst_rate"], it["sgst_rate"],
            it["cgst_amount"], it["sgst_amount"]
        ))

    flag = "★ 13-item" if n_items == 13 else f"{n_items}-item"
    canc = " [CANCELLED]" if cancelled[i] else ""
    print(f"  ✓ {inv_num}  {statuses[i]}{canc}  {flag}  Grand: ₹{grand:,.2f}")

# Update last_invoice_number
c.execute("UPDATE business_profile SET last_invoice_number=? WHERE id=1", (last_no,))
conn.commit()
conn.close()

print()
print("═" * 50)
print("  Seed complete")
print("═" * 50)
