import { ipcMain, BrowserWindow, dialog, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import { is } from '@electron-toolkit/utils'

async function printHiddenWindow(
  mainWindow: BrowserWindow,
  hash: string,
  defaultFileName: string
): Promise<{ success: boolean; message?: string }> {
  let hiddenWin: BrowserWindow | null = null
  try {
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultFileName,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    })
    if (canceled || !filePath) return { success: false, message: 'Export cancelled' }

    hiddenWin = new BrowserWindow({
      show: false,
      width: 794,
      height: 1123,
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      hiddenWin.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/#${hash}`)
    } else {
      hiddenWin.loadFile(path.join(__dirname, '../renderer/index.html'), { hash })
    }

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Print page load timeout')), 20000)
      hiddenWin!.webContents.once('did-finish-load', () => {
        setTimeout(() => { clearTimeout(timeout); resolve() }, 2500)
      })
      hiddenWin!.webContents.once('render-process-gone', (_e, details) => {
        clearTimeout(timeout)
        reject(new Error(`Print renderer crashed: ${details.reason}`))
      })
    })

    const pdfBuffer = await hiddenWin.webContents.printToPDF({
      format: 'A4',
      printBackground: true,
      margins: { marginType: 'none' }
    })
    fs.writeFileSync(filePath, pdfBuffer)
    shell.showItemInFolder(filePath)
    return { success: true }
  } catch (error) {
    console.error('[printHiddenWindow]', error)
    return { success: false, message: (error as Error).message }
  } finally {
    if (hiddenWin && !hiddenWin.isDestroyed()) hiddenWin.destroy()
  }
}

export function registerPdfHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle('pdf:export', async (_event, invoiceId: number) => {
    const today = new Date().toISOString().slice(0, 10)
    return printHiddenWindow(
      mainWindow,
      `/print/${invoiceId}`,
      `invoice-${invoiceId}-${today}.pdf`
    )
  })

  ipcMain.handle(
    'pdf:exportLedger',
    async (_event, customerId: number, customerName: string, fromDate: string, toDate: string) => {
      const safeName = customerName.replace(/[^a-z0-9]/gi, '-').toLowerCase()
      const fileName = `ledger-${safeName}-${fromDate}-to-${toDate}.pdf`
      const hash = `/ledger/${customerId}/print?from=${fromDate}&to=${toDate}`
      return printHiddenWindow(mainWindow, hash, fileName)
    }
  )
}
