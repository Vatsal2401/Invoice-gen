import { ipcMain, dialog, app, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import { closeDb, getDbPath } from '../db/database'

export function registerBackupHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle('backup:database', async () => {
    try {
      const dbPath = getDbPath()
      const today = new Date().toISOString().slice(0, 10)
      const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
        defaultPath: `invoices-backup-${today}.db`,
        filters: [{ name: 'SQLite Database', extensions: ['db'] }]
      })

      if (canceled || !filePath) return { success: false, message: 'Backup cancelled' }

      fs.copyFileSync(dbPath, filePath)
      return { success: true, data: filePath }
    } catch (error) {
      console.error('[IPC backup:database]', error)
      return { success: false, message: (error as Error).message }
    }
  })

  ipcMain.handle('backup:restore', async () => {
    try {
      const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
        filters: [{ name: 'SQLite Database', extensions: ['db'] }],
        properties: ['openFile']
      })

      if (canceled || !filePaths.length) return { success: false, message: 'Restore cancelled' }

      const dbPath = getDbPath()
      closeDb()
      fs.copyFileSync(filePaths[0], dbPath)
      app.relaunch()
      app.exit()
      return { success: true }
    } catch (error) {
      console.error('[IPC backup:restore]', error)
      return { success: false, message: (error as Error).message }
    }
  })
}
