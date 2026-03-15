import { ipcMain } from 'electron'
import {
  createPayment,
  listPayments,
  deletePayment,
  getCustomerLedger
} from '../services/paymentService'

export function registerPaymentHandlers(): void {
  ipcMain.handle('payments:create', async (_event, data) => {
    try {
      const id = createPayment(data)
      return { success: true, data: id }
    } catch (error) {
      console.error('[IPC payments:create]', error)
      return { success: false, message: (error as Error).message }
    }
  })

  ipcMain.handle('payments:list', async (_event, customerId: number) => {
    try {
      const data = listPayments(customerId)
      return { success: true, data }
    } catch (error) {
      console.error('[IPC payments:list]', error)
      return { success: false, message: (error as Error).message }
    }
  })

  ipcMain.handle('payments:delete', async (_event, id: number) => {
    try {
      deletePayment(id)
      return { success: true }
    } catch (error) {
      console.error('[IPC payments:delete]', error)
      return { success: false, message: (error as Error).message }
    }
  })

  ipcMain.handle(
    'payments:ledger',
    async (_event, customerId: number, fromDate: string, toDate: string) => {
      try {
        const data = getCustomerLedger(customerId, fromDate, toDate)
        return { success: true, data }
      } catch (error) {
        console.error('[IPC payments:ledger]', error)
        return { success: false, message: (error as Error).message }
      }
    }
  )
}
