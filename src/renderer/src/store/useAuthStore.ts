import { create } from 'zustand'

interface AuthState {
  isAuthenticated: boolean
  userId: string | null
  email: string | null
  setAuth: (userId: string, email: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  userId: null,
  email: null,
  setAuth: (userId, email) => set({ isAuthenticated: true, userId, email }),
  clearAuth: () => set({ isAuthenticated: false, userId: null, email: null })
}))
