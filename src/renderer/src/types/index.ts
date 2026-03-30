export interface BusinessProfile {
  id: string
  user_id?: string
  created_at?: string
  updated_at?: string
  business_name: string
  address1: string
  address2: string
  city: string
  state: string
  pincode: string
  gstin: string
  pan: string
  phone: string
  email: string
  bank_name: string
  account_number: string
  ifsc_code: string
  branch: string
  swift_code: string
  signatory_name: string
  invoice_prefix: string
  last_invoice_number: number
  /** S3 URL (cloud) or base64 data URL (local preview) */
  logo_url?: string
}

export interface Customer {
  id: string
  name: string
  address: string
  city: string
  state: string
  state_code: string
  pincode: string
  gstin: string
  pan: string
  phone: string
  ship_to_name: string
  ship_to_address: string
  ship_to_city: string
  ship_to_state: string
  ship_to_state_code: string
  ship_to_pincode: string
  ship_to_gstin: string
  created_at: string
  updated_at?: string
}

export type CustomerInput = Omit<Customer, 'id' | 'created_at' | 'updated_at'>

export type PartyType = 'SUPPLIER' | 'TRANSPORT' | 'LABOUR' | 'OTHER'

export interface Party {
  id: string
  user_id: string
  name: string
  type: PartyType
  phone: string
  address: string
  gstin: string
  notes: string
  opening_balance: number
  current_balance?: number
  last_entry_date?: string | null
  created_at: string
  updated_at?: string
}

export type PartyInput = Omit<Party, 'id' | 'user_id' | 'current_balance' | 'last_entry_date' | 'created_at' | 'updated_at'>

export interface PartyLedgerEntry {
  id: string
  party_id: string
  entry_date: string
  amount: number
  mode: string
  reference: string
  narration: string
  created_at: string
}

export interface PartyStats {
  total_parties: number
  total_receivable: number
  total_payable: number
}

export interface InvoiceItem {
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
  id?: string
  invoice_number: string
  invoice_date: string
  ship_to_name: string
  ship_to_address: string
  ship_to_gstin: string
  ship_to_state: string
  customer_id?: string
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
  cancelled: boolean
  created_at?: string
}

export interface InvoiceSummary {
  id: string
  invoice_number: string
  invoice_date: string
  buyer_name: string
  buyer_gstin: string
  customer_id: string | null
  grand_total: number
  status: 'DRAFT' | 'FINAL'
  cancelled: boolean
  created_at: string
}

export interface InvoiceStats {
  total_invoices: number
  total_revenue: number
  final_count: number
  draft_count: number
  cancelled_count: number
}

export interface CustomerInvoiceSummary {
  customer_id: string | null
  customer_name: string
  gstin: string
  invoice_count: number
  total_revenue: number
  last_invoice_date: string
  draft_count: number
  final_count: number
}

export type StatusFilter = 'ALL' | 'FINAL' | 'DRAFT' | 'CANCELLED'

export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[]
}

export interface Payment {
  id: string
  customer_id: string
  payment_date: string
  amount: number
  mode: string
  reference: string
  narration: string
  created_at: string
}

export type PaymentInput = Omit<Payment, 'id' | 'created_at'>

export interface LedgerEntry {
  date: string
  particulars: string
  item_descriptions: string[]
  narration: string
  vch_type: string
  vch_no: string
  debit: number
  credit: number
  ref_type: 'invoice' | 'payment'
  ref_id: string
}

// ── Khata / Cash Book ──────────────────────────────────────────────────────

export type CashbookEntryType = 'invoice' | 'party_entry'

export type CashbookCategory = 'SALES_INCOME' | 'SUPPLIER' | 'TRANSPORT' | 'LABOUR' | 'OTHER'

export type CashbookCategoryFilter = 'ALL' | CashbookCategory

export type KhataTab = 'cashbook' | 'accounts'

export interface CashbookEntry {
  id: string
  type: CashbookEntryType
  date: string
  description: string
  sub_description: string
  category: CashbookCategory
  mode?: string | null
  debit: number
  credit: number
  ref_id: string
  party_id?: string | null
}

export interface CashbookKPIs {
  total_income: number
  total_expense: number
  net_balance: number
  tx_count: number
}

export interface CashbookResponse {
  entries: CashbookEntry[]
  kpis: CashbookKPIs
}

export interface HSNSummaryRow {
  hsn_sac: string
  taxable_value: number
  cgst_rate: number
  cgst_amount: number
  sgst_rate: number
  sgst_amount: number
  total_tax: number
}
