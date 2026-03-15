import { ipcMain } from 'electron'
import {
  getNextInvoiceNumber,
  createInvoice,
  updateInvoice,
  listInvoices,
  getInvoice,
  finalizeInvoice,
  cancelInvoice
} from '../services/invoiceService'

export function registerInvoiceHandlers(): void {
  ipcMain.handle('invoices:next-number', async () => {
    try {
      return { success: true, data: getNextInvoiceNumber() }
    } catch (error) {
      console.error('[IPC invoices:next-number]', error)
      return { success: false, message: (error as Error).message }
    }
  })

  ipcMain.handle('invoices:create', async (_event, invoiceData, items) => {
    try {
      const id = createInvoice(invoiceData, items)
      return { success: true, data: id }
    } catch (error) {
      console.error('[IPC invoices:create]', error)
      return { success: false, message: (error as Error).message }
    }
  })

  ipcMain.handle('invoices:update', async (_event, id: number, invoiceData, items) => {
    try {
      updateInvoice(id, invoiceData, items)
      return { success: true }
    } catch (error) {
      console.error('[IPC invoices:update]', error)
      return { success: false, message: (error as Error).message }
    }
  })

  ipcMain.handle('invoices:list', async () => {
    try {
      return { success: true, data: listInvoices() }
    } catch (error) {
      console.error('[IPC invoices:list]', error)
      return { success: false, message: (error as Error).message }
    }
  })

  ipcMain.handle('invoices:get', async (_event, id: number) => {
    try {
      const invoice = getInvoice(id)
      if (!invoice) return { success: false, message: 'Invoice not found' }
      return { success: true, data: invoice }
    } catch (error) {
      console.error('[IPC invoices:get]', error)
      return { success: false, message: (error as Error).message }
    }
  })

  ipcMain.handle('invoices:finalize', async (_event, id: number) => {
    try {
      finalizeInvoice(id)
      return { success: true }
    } catch (error) {
      console.error('[IPC invoices:finalize]', error)
      return { success: false, message: (error as Error).message }
    }
  })

  ipcMain.handle('invoices:cancel', async (_event, id: number) => {
    try {
      cancelInvoice(id)
      return { success: true }
    } catch (error) {
      console.error('[IPC invoices:cancel]', error)
      return { success: false, message: (error as Error).message }
    }
  })
}
