import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { getBusinessProfile, saveBusinessProfile } from '../services/businessService'

export function registerBusinessHandlers(): void {
  ipcMain.handle('business:get', async () => {
    try {
      const data = getBusinessProfile()
      return { success: true, data }
    } catch (error) {
      console.error('[IPC business:get]', error)
      return { success: false, message: (error as Error).message }
    }
  })

  ipcMain.handle('business:save', async (_event, profileData) => {
    try {
      saveBusinessProfile(profileData)
      return { success: true }
    } catch (error) {
      console.error('[IPC business:save]', error)
      return { success: false, message: (error as Error).message }
    }
  })

  ipcMain.handle('business:readLogo', async (_event, filePath: string) => {
    try {
      if (!filePath) return { success: false }
      const data = fs.readFileSync(filePath)
      const ext = path.extname(filePath).slice(1).toLowerCase()
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`
      return { success: true, data: `data:${mime};base64,${data.toString('base64')}` }
    } catch (error) {
      console.error('[IPC business:readLogo]', error)
      return { success: false, message: (error as Error).message }
    }
  })
}
