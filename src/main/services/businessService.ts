import { getDb } from '../db/database'

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

export function getBusinessProfile(): BusinessProfile {
  const db = getDb()
  return db.prepare('SELECT * FROM business_profile WHERE id = 1').get() as BusinessProfile
}

export function saveBusinessProfile(data: Partial<BusinessProfile>): void {
  const db = getDb()
  const fields = Object.keys(data)
    .filter((k) => k !== 'id' && k !== 'last_invoice_number')
    .map((k) => `${k} = @${k}`)
    .join(', ')
  if (!fields) return
  db.prepare(`UPDATE business_profile SET ${fields} WHERE id = 1`).run(data)
}
