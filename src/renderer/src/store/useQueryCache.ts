import { create } from 'zustand'

const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

interface CacheEntry {
  data: unknown
  ts: number
}

interface QueryCacheState {
  entries: Record<string, CacheEntry>
  set: (key: string, data: unknown) => void
  get: <T>(key: string, ttl?: number) => T | undefined
  isFresh: (key: string, ttl?: number) => boolean
  invalidate: (...keys: string[]) => void
}

export const useQueryCache = create<QueryCacheState>((set, get) => ({
  entries: {},

  set: (key, data) =>
    set((s) => ({ entries: { ...s.entries, [key]: { data, ts: Date.now() } } })),

  get: <T>(key: string, ttl = DEFAULT_TTL) => {
    const entry = get().entries[key]
    if (!entry) return undefined
    if (Date.now() - entry.ts > ttl) return undefined
    return entry.data as T
  },

  isFresh: (key: string, ttl = DEFAULT_TTL) => {
    const entry = get().entries[key]
    return !!entry && Date.now() - entry.ts <= ttl
  },

  invalidate: (...keys: string[]) =>
    set((s) => {
      const next = { ...s.entries }
      keys.forEach((k) => delete next[k])
      return { entries: next }
    }),
}))
