import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import { initSchema } from './schema'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), 'invoices.db')
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initSchema(db)
  }
  return db
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}

export function getDbPath(): string {
  return path.join(app.getPath('userData'), 'invoices.db')
}
