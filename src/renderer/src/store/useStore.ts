import { create } from 'zustand'
import type { BusinessProfile } from '../types'

interface Toast {
  type: 'success' | 'error'
  message: string
}

interface Store {
  business: BusinessProfile | null
  setBusiness: (b: BusinessProfile) => void

  toast: Toast | null
  showToast: (type: Toast['type'], message: string) => void
  clearToast: () => void
}

export const useStore = create<Store>((set) => ({
  business: null,
  setBusiness: (business) => set({ business }),

  toast: null,
  showToast: (type, message) => set({ toast: { type, message } }),
  clearToast: () => set({ toast: null })
}))
