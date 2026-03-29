import { useCallback, useEffect, useRef, useState } from 'react'
import apiClient from './apiClient'
import { useQueryCache } from '../store/useQueryCache'

interface UseQueryOptions {
  ttl?: number  // cache TTL in ms (default 5 min)
}

interface UseQueryResult<T> {
  data: T | undefined
  loading: boolean
  refetch: () => Promise<void>
}

/**
 * Fetches `url` via apiClient with TTL-based caching.
 * - Fresh cache (within TTL): returns immediately, skips network call.
 * - Stale/no cache: fetches from network, shows loading on first fetch.
 */
export function useQuery<T>(url: string, options: UseQueryOptions = {}): UseQueryResult<T> {
  const { get, set, isFresh } = useQueryCache()
  const cached = get<T>(url, options.ttl)

  const [data, setData] = useState<T | undefined>(cached)
  const [loading, setLoading] = useState(!cached)
  const mountedRef = useRef(true)

  const fetch = useCallback(async () => {
    try {
      const { data: fresh } = await apiClient.get<T>(url)
      if (!mountedRef.current) return
      set(url, fresh)
      setData(fresh)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [url, set])

  useEffect(() => {
    mountedRef.current = true
    if (cached !== undefined) {
      setData(cached)
      setLoading(false)
      // Skip network call if cache is still fresh
      if (isFresh(url, options.ttl)) return
    }
    fetch()
    return () => { mountedRef.current = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  // Sync if cache was externally updated (e.g. after mutation + invalidate + refetch)
  useEffect(() => {
    const fresh = get<T>(url, options.ttl)
    if (fresh !== undefined) setData(fresh)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useQueryCache.getState().entries[url]])

  return { data, loading, refetch: fetch }
}
