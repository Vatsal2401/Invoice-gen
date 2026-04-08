import { ipcMain, BrowserWindow, dialog, shell, IpcMainEvent } from 'electron'
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
      height: 6000,   // tall enough for many items; printToPDF handles pagination
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

    // Wait for PrintPage to send its rendered height via IPC
    let heightPx = 0
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Print page load timeout')), 30000)

      const onHeight = (_e: IpcMainEvent, h: number) => {
        console.log('[PDF] received print height:', h, 'px')
        heightPx = h > 100 ? h : 1200 // fallback ~318mm
        clearTimeout(timeout)
        resolve()
      }
      ipcMain.once('pdf:height-ready', onHeight)

      hiddenWin!.webContents.once('render-process-gone', (_e, details) => {
        ipcMain.removeListener('pdf:height-ready', onHeight)
        clearTimeout(timeout)
        reject(new Error(`Print renderer crashed: ${details.reason}`))
      })
    })

    // Convert px → mm (96dpi: 1px = 25.4/96 mm)
    const heightMm = Math.ceil((heightPx * 25.4) / 96)

    // Inject @page CSS so the browser itself sets the exact page dimensions
    await hiddenWin.webContents.insertCSS(
      `@page { size: 210mm ${heightMm}mm !important; margin: 0 !important; }
       html, body { margin: 0 !important; padding: 0 !important; }`
    )

    const pdfBuffer = await hiddenWin.webContents.printToPDF({
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
  ipcMain.handle('pdf:export', async (_event, invoiceId: string) => {
    const today = new Date().toISOString().slice(0, 10)
    return printHiddenWindow(
      mainWindow,
      `/print/${invoiceId}`,
      `invoice-${invoiceId.slice(0, 8)}-${today}.pdf`
    )
  })

  ipcMain.handle(
    'pdf:exportLedger',
    async (_event, customerId: string, customerName: string, fromDate: string, toDate: string) => {
      const safeName = customerName.replace(/[^a-z0-9]/gi, '-').toLowerCase()
      const fileName = `ledger-${safeName}-${fromDate}-to-${toDate}.pdf`
      const hash = `/ledger/${customerId}/print?from=${fromDate}&to=${toDate}`
      return printHiddenWindow(mainWindow, hash, fileName)
    }
  )
}
