import { ipcMain, app } from 'electron'
import Store from 'electron-store'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { randomBytes } from 'crypto'

interface TokenStore {
  access_token: string
  refresh_token: string
}

function getMachineKey(): string {
  const dir = app.getPath('userData')
  const keyFile = join(dir, '.enc-key')
  if (!existsSync(keyFile)) {
    mkdirSync(dir, { recursive: true })
    writeFileSync(keyFile, randomBytes(32).toString('hex'), 'utf8')
  }
  return readFileSync(keyFile, 'utf8').trim()
}

const store = new Store<{ tokens: TokenStore | null }>({
  name: 'auth',
  encryptionKey: getMachineKey()
})

export function registerAuthHandlers(): void {
  ipcMain.handle('auth:getTokens', () => {
    return store.get('tokens', null)
  })

  ipcMain.handle('auth:setTokens', (_event, tokens: TokenStore) => {
    store.set('tokens', tokens)
  })

  ipcMain.handle('auth:clearTokens', () => {
    store.delete('tokens')
  })
}
