import { ipcMain } from 'electron'
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer
} from '../services/customerService'

export function registerCustomerHandlers(): void {
  ipcMain.handle('customers:list', async () => {
    try {
      return { success: true, data: listCustomers() }
    } catch (error) {
      console.error('[IPC customers:list]', error)
      return { success: false, message: (error as Error).message }
    }
  })

  ipcMain.handle('customers:get', async (_event, id: number) => {
    try {
      const customer = getCustomer(id)
      if (!customer) return { success: false, message: 'Customer not found' }
      return { success: true, data: customer }
    } catch (error) {
      console.error('[IPC customers:get]', error)
      return { success: false, message: (error as Error).message }
    }
  })

  ipcMain.handle('customers:create', async (_event, data) => {
    try {
      const customer = createCustomer(data)
      return { success: true, data: customer }
    } catch (error) {
      console.error('[IPC customers:create]', error)
      return { success: false, message: (error as Error).message }
    }
  })

  ipcMain.handle('customers:update', async (_event, id: number, data) => {
    try {
      updateCustomer(id, data)
      return { success: true }
    } catch (error) {
      console.error('[IPC customers:update]', error)
      return { success: false, message: (error as Error).message }
    }
  })

  ipcMain.handle('customers:delete', async (_event, id: number) => {
    try {
      deleteCustomer(id)
      return { success: true }
    } catch (error) {
      console.error('[IPC customers:delete]', error)
      return { success: false, message: (error as Error).message }
    }
  })
}
