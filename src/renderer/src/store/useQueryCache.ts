import { create } from 'zustand'

interface CacheEntry {
  data: unknown
  ts: number
}

interface QueryCacheState {
  entries: Record<string, CacheEntry>
  set: (key: string, data: unknown) => void
  get: <T>(key: string) => T | undefined
  invalidate: (...keys: string[]) => void
}

export const useQueryCache = create<QueryCacheState>((set, get) => ({
  entries: {},

  set: (key, data) =>
    set((s) => ({ entries: { ...s.entries, [key]: { data, ts: Date.now() } } })),

  get: <T>(key: string) => {
    const entry = get().entries[key]
    return entry ? (entry.data as T) : undefined
  },

  invalidate: (...keys: string[]) =>
    set((s) => {
      const next = { ...s.entries }
      keys.forEach((k) => delete next[k])
      return { entries: next }
    }),
}))
