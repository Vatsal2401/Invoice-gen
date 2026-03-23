import { ipcMain, app } from 'electron'
import path from 'path'
import fs from 'fs'
import Store from 'electron-store'

const flagStore = new Store<{ migrationDone: boolean }>({ name: 'migration-flags' })

export function registerMigrateHandlers(): void {
  ipcMain.handle('migrate:isDone', () => {
    return flagStore.get('migrationDone', false)
  })

  ipcMain.handle('migrate:markDone', () => {
    flagStore.set('migrationDone', true)
  })

  ipcMain.handle('migrate:exportLocalData', async () => {
    const dbPath = path.join(app.getPath('userData'), 'invoices.db')

    if (!fs.existsSync(dbPath)) {
      return { exists: false }
    }

    try {
      // Dynamic import to avoid issues when better-sqlite3 is not installed
      const Database = require('better-sqlite3')
      const db = new Database(dbPath, { readonly: true })

      // Business profile
      const profile = db.prepare('SELECT * FROM business_profile WHERE id = 1').get() || {}

      // Logo as base64 data URL
      let logo_url: string | null = null
      if (profile.logo_path && fs.existsSync(profile.logo_path)) {
        try {
          const buf = fs.readFileSync(profile.logo_path)
          const ext = path.extname(profile.logo_path).toLowerCase().replace('.', '')
          const mime = ext === 'png' ? 'image/png' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg'
          logo_url = `data:${mime};base64,${buf.toString('base64')}`
        } catch {
          // logo unreadable — skip
        }
      }

      // Customers
      const customers = db.prepare('SELECT * FROM customers').all()

      // Invoices with items
      const invoiceRows = db.prepare('SELECT * FROM invoices').all()
      const invoices = invoiceRows.map((inv: Record<string, unknown>) => ({
        ...inv,
        items: db
          .prepare('SELECT * FROM invoice_items WHERE invoice_id = ?')
          .all(inv.id as number)
      }))

      // Payments
      const payments = db.prepare('SELECT * FROM payments').all()

      db.close()

      return {
        exists: true,
        business_profile: { ...profile, logo_url },
        customers,
        invoices,
        payments
      }
    } catch (err) {
      return { exists: false, error: (err as Error).message }
    }
  })
}
