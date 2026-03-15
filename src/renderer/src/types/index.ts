export interface IpcResult<T = undefined> {
  success: boolean
  data?: T
  message?: string
}

export interface BusinessProfile {
  id: number
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
  logo_path: string
}

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
  status: 'DRAFT' | 'FINAL'
  cancelled: number
  created_at: string
}

export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[]
}

export interface Payment {
  id: number
  customer_id: number
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
  narration: string
  vch_type: string
  vch_no: string
  debit: number
  credit: number
  ref_type: 'invoice' | 'payment'
  ref_id: number
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
