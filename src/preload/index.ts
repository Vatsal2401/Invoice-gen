import { contextBridge, ipcRenderer } from 'electron'

export type IpcResult<T = undefined> = {
  success: boolean
  data?: T
  message?: string
}

const api = {
  // Business
  getBusinessProfile: () => ipcRenderer.invoke('business:get'),
  saveBusinessProfile: (data: Record<string, unknown>) => ipcRenderer.invoke('business:save', data),
  readLogo: (filePath: string) => ipcRenderer.invoke('business:readLogo', filePath),

  // Customers
  listCustomers: () => ipcRenderer.invoke('customers:list'),
  getCustomer: (id: number) => ipcRenderer.invoke('customers:get', id),
  createCustomer: (data: Record<string, unknown>) => ipcRenderer.invoke('customers:create', data),
  updateCustomer: (id: number, data: Record<string, unknown>) =>
    ipcRenderer.invoke('customers:update', id, data),
  deleteCustomer: (id: number) => ipcRenderer.invoke('customers:delete', id),

  // Invoices
  getNextInvoiceNumber: () => ipcRenderer.invoke('invoices:next-number'),
  createInvoice: (invoiceData: Record<string, unknown>, items: Record<string, unknown>[]) =>
    ipcRenderer.invoke('invoices:create', invoiceData, items),
  updateInvoice: (id: number, invoiceData: Record<string, unknown>, items: Record<string, unknown>[]) =>
    ipcRenderer.invoke('invoices:update', id, invoiceData, items),
  listInvoices: () => ipcRenderer.invoke('invoices:list'),
  getInvoice: (id: number) => ipcRenderer.invoke('invoices:get', id),
  finalizeInvoice: (id: number) => ipcRenderer.invoke('invoices:finalize', id),
  cancelInvoice: (id: number) => ipcRenderer.invoke('invoices:cancel', id),

  // Payments / Ledger
  createPayment: (data: Record<string, unknown>) => ipcRenderer.invoke('payments:create', data),
  listPayments: (customerId: number) => ipcRenderer.invoke('payments:list', customerId),
  deletePayment: (id: number) => ipcRenderer.invoke('payments:delete', id),
  getCustomerLedger: (customerId: number, fromDate: string, toDate: string) =>
    ipcRenderer.invoke('payments:ledger', customerId, fromDate, toDate),

  // PDF
  exportPDF: (invoiceId: number) => ipcRenderer.invoke('pdf:export', invoiceId),
  exportLedgerPDF: (customerId: number, customerName: string, fromDate: string, toDate: string) =>
    ipcRenderer.invoke('pdf:exportLedger', customerId, customerName, fromDate, toDate),

  // Backup
  backupDatabase: () => ipcRenderer.invoke('backup:database'),
  restoreDatabase: () => ipcRenderer.invoke('backup:restore'),

  // Menu events
  onMenuNewInvoice: (callback: () => void) => {
    ipcRenderer.on('menu:new-invoice', callback)
    return () => ipcRenderer.removeListener('menu:new-invoice', callback)
  },
  onMenuBackup: (callback: () => void) => {
    ipcRenderer.on('menu:backup', callback)
    return () => ipcRenderer.removeListener('menu:backup', callback)
  },
  onMenuRestore: (callback: () => void) => {
    ipcRenderer.on('menu:restore', callback)
    return () => ipcRenderer.removeListener('menu:restore', callback)
  }
}

contextBridge.exposeInMainWorld('api', api)

declare global {
  interface Window {
    api: typeof api
  }
}
