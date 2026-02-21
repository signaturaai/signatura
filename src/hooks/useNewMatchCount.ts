'use client'

/**
 * Hook for fetching new job match count for navigation badge
 *
 * Returns the count of matches with:
 * - status = 'new'
 * - match_score >= 75
 *
 * Auto-refreshes at specified interval.
 */

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UseNewMatchCountOptions {
  /** Refetch interval in ms (default: 60000 = 1 minute) */
  refetchInterval?: number
  /** Whether the hook is enabled (default: true) */
  enabled?: boolean
}

interface UseNewMatchCountReturn {
  data: number
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function useNewMatchCount(options: UseNewMatchCountOptions = {}): UseNewMatchCountReturn {
  const { refetchInterval = 60000, enabled = true } = options
  const [data, setData] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchCount = useCallback(async () => {
    if (!enabled) {
      setData(0)
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setData(0)
        setIsLoading(false)
        return
      }

      // Count matches with status='new' and score>=75
      const { count, error: queryError } = await supabase
        .from('job_matches')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'new')
        .gte('match_score', 75)

      if (queryError) {
        throw queryError
      }

      setData(count || 0)
      setError(null)
    } catch (err) {
      console.error('[useNewMatchCount] Error:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch match count'))
    } finally {
      setIsLoading(false)
    }
  }, [enabled])

  // Initial fetch
  useEffect(() => {
    fetchCount()
  }, [fetchCount])

  // Set up interval for auto-refresh
  useEffect(() => {
    if (!enabled || !refetchInterval) return

    const intervalId = setInterval(fetchCount, refetchInterval)

    return () => clearInterval(intervalId)
  }, [enabled, refetchInterval, fetchCount])

  return { data, isLoading, error, refetch: fetchCount }
}
