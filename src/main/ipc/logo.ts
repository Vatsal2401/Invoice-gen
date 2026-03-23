import { ipcMain, dialog } from 'electron'
import fs from 'fs'
import path from 'path'

export function registerLogoHandlers(): void {
  ipcMain.handle('logo:pick', async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Select Logo Image',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] }],
      properties: ['openFile']
    })

    if (canceled || filePaths.length === 0) return { canceled: true }

    const filePath = filePaths[0]
    const buffer = fs.readFileSync(filePath)
    const ext = path.extname(filePath).toLowerCase().replace('.', '')
    const mimeMap: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml'
    }
    const mimeType = mimeMap[ext] || 'image/png'
    const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`
    const fileName = path.basename(filePath)

    return { canceled: false, dataUrl, fileName, mimeType }
  })
}
