import { ipcMain } from 'electron'
import Store from 'electron-store'

interface TokenStore {
  access_token: string
  refresh_token: string
}

const store = new Store<{ tokens: TokenStore | null }>({
  name: 'auth',
  encryptionKey: 'invoice-app-secret-key-change-in-prod'
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
