import { contextBridge, ipcRenderer } from 'electron'

export type IpcResult<T = undefined> = {
  success: boolean
  data?: T
  message?: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
}

const api = {
  // ─── Auth token storage (electron-store in main) ──────────────────────────
  getTokens: (): Promise<AuthTokens | null> => ipcRenderer.invoke('auth:getTokens'),
  setTokens: (tokens: AuthTokens): Promise<void> => ipcRenderer.invoke('auth:setTokens', tokens),
  clearTokens: (): Promise<void> => ipcRenderer.invoke('auth:clearTokens'),

  // ─── PDF (stays in main — BrowserWindow + printToPDF) ────────────────────
  reportPrintHeight: (height: number): void => ipcRenderer.send('pdf:height-ready', height),
  exportPDF: (invoiceId: string): Promise<IpcResult<void>> =>
    ipcRenderer.invoke('pdf:export', invoiceId),
  exportLedgerPDF: (
    customerId: string,
    customerName: string,
    fromDate: string,
    toDate: string
  ): Promise<IpcResult<void>> =>
    ipcRenderer.invoke('pdf:exportLedger', customerId, customerName, fromDate, toDate),

  // ─── Logo file picker ─────────────────────────────────────────────────────
  pickLogoFile: (): Promise<{
    canceled: boolean
    dataUrl?: string
    fileName?: string
    mimeType?: string
  }> => ipcRenderer.invoke('logo:pick'),

  // ─── Migration: read local SQLite → JSON ─────────────────────────────────
  exportLocalData: (): Promise<{
    exists: boolean
    business_profile?: Record<string, unknown>
    customers?: unknown[]
    invoices?: unknown[]
    payments?: unknown[]
    error?: string
  }> => ipcRenderer.invoke('migrate:exportLocalData'),
  isMigrationDone: (): Promise<boolean> => ipcRenderer.invoke('migrate:isDone'),
  markMigrationDone: (): Promise<void> => ipcRenderer.invoke('migrate:markDone'),

  // ─── Menu events ──────────────────────────────────────────────────────────
  onMenuNewInvoice: (callback: () => void): (() => void) => {
    ipcRenderer.on('menu:new-invoice', callback)
    return () => ipcRenderer.removeListener('menu:new-invoice', callback)
  }
}

contextBridge.exposeInMainWorld('api', api)

declare global {
  interface Window {
    api: typeof api
  }
}
