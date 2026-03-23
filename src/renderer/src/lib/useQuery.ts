import { useCallback, useEffect, useRef, useState } from 'react'
import apiClient from './apiClient'
import { useQueryCache } from '../store/useQueryCache'

interface UseQueryResult<T> {
  data: T | undefined
  loading: boolean   // true only on first fetch (no cache yet)
  refetch: () => Promise<void>
}

/**
 * Fetches `url` via apiClient with in-memory caching.
 * - If cache exists: returns it immediately (loading = false), then refetches silently.
 * - If no cache: shows loading = true until first response.
 */
export function useQuery<T>(url: string): UseQueryResult<T> {
  const { get, set } = useQueryCache()
  const cached = get<T>(url)

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
    // If we have cached data, show it immediately but still refetch in background
    if (cached !== undefined) setData(cached)
    fetch()
    return () => { mountedRef.current = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  // Also sync if cache was externally updated (e.g. after mutation refetch)
  useEffect(() => {
    const fresh = get<T>(url)
    if (fresh !== undefined) setData(fresh)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useQueryCache.getState().entries[url]])

  return { data, loading, refetch: fetch }
}
