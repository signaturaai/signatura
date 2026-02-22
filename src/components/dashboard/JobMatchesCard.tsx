'use client'

/**
 * Job Matches Summary Card for Dashboard
 *
 * Displays:
 * - Count of unviewed matches (status='new')
 * - Top 3 mini-cards (title, company, score)
 * - "View All Matches" link to /job-search
 * - "Last searched: {relative time}"
 * - Empty state if no matches
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { Search, ArrowRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface JobMatch {
  id: string
  job_title: string
  company_name: string
  match_score: number
}

interface JobMatchesData {
  newMatchCount: number
  topMatches: JobMatch[]
  lastSearchedAt: string | null
}

// Format relative time
function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Never'

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Score color based on match percentage
function getScoreColor(score: number): string {
  if (score >= 85) return 'text-success-dark bg-success-light'
  if (score >= 75) return 'text-sky-dark bg-sky-light'
  if (score >= 60) return 'text-peach-dark bg-peach-light'
  return 'text-text-secondary bg-muted'
}

export function JobMatchesCard() {
  const [data, setData] = useState<JobMatchesData>({
    newMatchCount: 0,
    topMatches: [],
    lastSearchedAt: null,
  })
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setData({ newMatchCount: 0, topMatches: [], lastSearchedAt: null })
        setIsLoading(false)
        return
      }

      // Fetch new match count
      const { count: newMatchCount } = await supabase
        .from('job_matches')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'new')

      // Fetch top 3 matches (highest scores, status='new')
      const { data: topMatches } = await supabase
        .from('job_matches')
        .select('id, job_title, company_name, match_score')
        .eq('user_id', user.id)
        .eq('status', 'new')
        .gte('match_score', 75)
        .order('match_score', { ascending: false })
        .limit(3)

      // Fetch last search time from preferences
      const { data: prefs } = await supabase
        .from('job_search_preferences')
        .select('last_search_at')
        .eq('user_id', user.id)
        .single()

      // Type assertions for Supabase query results
      const typedTopMatches = (topMatches as unknown) as JobMatch[] | null
      const typedPrefs = (prefs as unknown) as { last_search_at: string | null } | null

      setData({
        newMatchCount: newMatchCount || 0,
        topMatches: typedTopMatches || [],
        lastSearchedAt: typedPrefs?.last_search_at || null,
      })
    } catch (error) {
      console.error('[JobMatchesCard] Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh every minute
  useEffect(() => {
    const intervalId = setInterval(fetchData, 60000)
    return () => clearInterval(intervalId)
  }, [fetchData])

  const { newMatchCount, topMatches, lastSearchedAt } = data

  return (
    <Card className="shadow-soft border-sky-light/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-text-primary flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-sky-light flex items-center justify-center">
              <Search className="h-4 w-4 text-sky-dark" />
            </div>
            New Job Matches
          </CardTitle>
          {newMatchCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-sky text-white">
              {newMatchCount}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-16 bg-muted rounded-lg" />
            <div className="h-16 bg-muted rounded-lg" />
            <div className="h-16 bg-muted rounded-lg" />
          </div>
        ) : newMatchCount === 0 ? (
          <div className="text-center py-6">
            <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-text-secondary">No new matches yet</p>
            <Link href="/job-search" className="text-xs text-sky-dark hover:underline mt-2 block">
              Start searching for jobs
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Top 3 Mini-Cards */}
            {topMatches.map((match) => (
              <Link
                key={match.id}
                href={`/job-search?match=${match.id}`}
                className="flex items-center gap-3 p-3 rounded-lg bg-sky-light/20 hover:bg-sky-light/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {match.job_title}
                  </p>
                  <p className="text-xs text-text-secondary truncate">
                    {match.company_name}
                  </p>
                </div>
                <div
                  className={cn(
                    'px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1',
                    getScoreColor(match.match_score)
                  )}
                >
                  {match.match_score >= 85 && <Sparkles className="h-3 w-3" />}
                  {match.match_score}%
                </div>
              </Link>
            ))}

            {/* View All Link */}
            <Link href="/job-search" className="block">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-sky-dark hover:bg-sky-light/30 mt-2"
              >
                View All Matches
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>

            {/* Last Searched */}
            {lastSearchedAt && (
              <p className="text-xs text-text-tertiary text-center mt-2">
                Last searched: {formatRelativeTime(lastSearchedAt)}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
