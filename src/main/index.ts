import { app, BrowserWindow, Menu, shell, nativeImage } from 'electron'
import path from 'path'
import { is } from '@electron-toolkit/utils'
import { registerPdfHandlers } from './ipc/pdf'
import { registerAuthHandlers } from './ipc/auth'
import { registerLogoHandlers } from './ipc/logo'
import { registerMigrateHandlers } from './ipc/migrate'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  const iconPath = path.join(__dirname, '../../resources/icon.png')
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: 'GST Invoice Generator',
    icon: nativeImage.createFromPath(iconPath),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.on('context-menu', (_e, params) => {
    mainWindow?.webContents.inspectElement(params.x, params.y)
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  buildMenu()
  registerPdfHandlers(mainWindow)
}

function buildMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Invoice',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu:new-invoice')
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ]

  ;(template[2].submenu as Electron.MenuItemConstructorOptions[]).push(
    { type: 'separator' },
    { role: 'toggleDevTools' }
  )

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// Keep Railway service warm — ping every 4 minutes to prevent cold starts
let keepAliveTimer: ReturnType<typeof setInterval> | null = null

function startKeepAlive(): void {
  const url = 'https://invoice-backend.autoreels.in/health'
  keepAliveTimer = setInterval(() => {
    fetch(url).catch(() => {/* ignore errors */})
  }, 4 * 60 * 1000)
}

app.whenReady().then(() => {
  registerAuthHandlers()
  registerLogoHandlers()
  registerMigrateHandlers()
  createWindow()
  startKeepAlive()
})

app.on('will-quit', () => {
  if (keepAliveTimer) clearInterval(keepAliveTimer)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
