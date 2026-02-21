'use client'

/**
 * Job Search Page
 *
 * AI-powered job discovery and intelligent matching interface with:
 * - AI Insights & Recommendations section
 * - Job Match Email Notifications configuration
 * - Auto-import from Emails feature
 * - Advanced Filters panel
 * - AI-Powered Job Matches list
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@/components/ui'
import { ToastProvider, useToast } from '@/components/ui'
import { JobMatchCard } from '@/components/job-search'
import {
  Search,
  Settings2,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
  Target,
  Clipboard,
  TrendingUp,
  Lightbulb,
  X,
  Plus,
  Bell,
  Inbox,
  Filter,
  Briefcase,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type {
  JobSearchPreferencesRow,
  JobPostingRow,
  FeedbackReason,
  UserFeedback,
} from '@/types/job-search'

// ============================================================================
// Types
// ============================================================================

interface JobMatch extends JobPostingRow {
  isNew: boolean
  matchTier: 'excellent' | 'great' | 'good'
}

// ============================================================================
// Helper Functions
// ============================================================================

function getMatchTier(score: number): 'excellent' | 'great' | 'good' {
  if (score >= 90) return 'excellent'
  if (score >= 80) return 'great'
  return 'good'
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffHours < 24) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatSalary(min: number | null, max: number | null, currency: string | null): string {
  if (!min && !max) return 'Not specified'

  const curr = currency || 'USD'
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: curr,
    maximumFractionDigits: 0,
  })

  if (min && max) {
    return `${formatter.format(min)} - ${formatter.format(max)}`
  } else if (min) {
    return `${formatter.format(min)}+`
  } else if (max) {
    return `Up to ${formatter.format(max)}`
  }

  return 'Not specified'
}

// ============================================================================
// Sub-Components
// ============================================================================

interface KeywordChipProps {
  keyword: string
  onRemove: (keyword: string) => void
  isRemoving?: boolean
}

function KeywordChip({ keyword, onRemove, isRemoving }: KeywordChipProps) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-lavender-light text-lavender-dark rounded-full text-sm font-medium">
      {keyword}
      <button
        onClick={() => onRemove(keyword)}
        disabled={isRemoving}
        className="hover:bg-lavender/30 rounded-full p-0.5 transition-colors disabled:opacity-50"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

// ============================================================================
// Main Component
// ============================================================================

function JobSearchPageContent() {
  const router = useRouter()
  const { showToast } = useToast()
  const supabase = createClient()

  // Data state
  const [preferences, setPreferences] = useState<JobSearchPreferencesRow | null>(null)
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [isRefreshingInsights, setIsRefreshingInsights] = useState(false)
  const [actioningJobId, setActioningJobId] = useState<string | null>(null)

  // UI state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [showPreferencesModal, setShowPreferencesModal] = useState(false)
  const [newKeyword, setNewKeyword] = useState('')

  // Fetch data on mount
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)

      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        // Fetch preferences
        const prefsResponse = await fetch('/api/job-search/preferences')
        if (prefsResponse.ok) {
          const prefsData = await prefsResponse.json()
          setPreferences(prefsData.preferences)
        }

        // Fetch job matches
        const matchesResponse = await fetch('/api/job-search/matches?limit=20')
        if (matchesResponse.ok) {
          const matchesData = await matchesResponse.json()
          const enrichedMatches: JobMatch[] = (matchesData.matches || []).map((job: JobPostingRow) => ({
            ...job,
            isNew: new Date(job.discovered_at).getTime() > Date.now() - 24 * 60 * 60 * 1000,
            matchTier: getMatchTier(job.match_score),
          }))
          setJobMatches(enrichedMatches)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        showToast('Failed to load job search data', 'error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [supabase, router, showToast])

  // Handle Search Now
  const handleSearchNow = useCallback(async () => {
    setIsSearching(true)
    try {
      const response = await fetch('/api/job-search/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          showToast(data.error || 'Please wait before searching again', 'error')
        } else {
          throw new Error(data.error || 'Search failed')
        }
        return
      }

      showToast(`Found ${data.matched} new matches from ${data.discovered} jobs`, 'success')

      // Refresh matches list
      const matchesResponse = await fetch('/api/job-search/matches?limit=20')
      if (matchesResponse.ok) {
        const matchesData = await matchesResponse.json()
        const enrichedMatches: JobMatch[] = (matchesData.matches || []).map((job: JobPostingRow) => ({
          ...job,
          isNew: new Date(job.discovered_at).getTime() > Date.now() - 24 * 60 * 60 * 1000,
          matchTier: getMatchTier(job.match_score),
        }))
        setJobMatches(enrichedMatches)
      }
    } catch (error) {
      console.error('Search error:', error)
      showToast(error instanceof Error ? error.message : 'Search failed', 'error')
    } finally {
      setIsSearching(false)
    }
  }, [showToast])

  // Handle Refresh Insights
  const handleRefreshInsights = useCallback(async () => {
    setIsRefreshingInsights(true)
    try {
      const response = await fetch('/api/job-search/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRefresh: true }),
      })

      if (!response.ok) {
        throw new Error('Failed to refresh insights')
      }

      // Refresh preferences to get new insights
      const prefsResponse = await fetch('/api/job-search/preferences')
      if (prefsResponse.ok) {
        const prefsData = await prefsResponse.json()
        setPreferences(prefsData.preferences)
      }

      showToast('AI analysis has been updated', 'success')
    } catch (error) {
      console.error('Refresh insights error:', error)
      showToast('Could not refresh AI insights', 'error')
    } finally {
      setIsRefreshingInsights(false)
    }
  }, [showToast])

  // Handle keyword operations
  const handleRemoveKeyword = useCallback(async (keyword: string) => {
    if (!preferences) return

    try {
      const response = await fetch('/api/job-search/keywords', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', keywords: [keyword] }),
      })

      if (!response.ok) {
        throw new Error('Failed to remove keyword')
      }

      setPreferences(prev => prev ? {
        ...prev,
        ai_keywords: prev.ai_keywords.filter(k => k !== keyword),
      } : null)
    } catch (error) {
      console.error('Remove keyword error:', error)
      showToast('Failed to remove keyword', 'error')
    }
  }, [preferences, showToast])

  const handleAddKeyword = useCallback(async () => {
    if (!newKeyword.trim() || !preferences) return

    try {
      const response = await fetch('/api/job-search/keywords', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', keywords: [newKeyword.trim()] }),
      })

      if (!response.ok) {
        throw new Error('Failed to add keyword')
      }

      setPreferences(prev => prev ? {
        ...prev,
        ai_keywords: [...prev.ai_keywords, newKeyword.trim()],
      } : null)
      setNewKeyword('')
    } catch (error) {
      console.error('Add keyword error:', error)
      showToast('Failed to add keyword', 'error')
    }
  }, [newKeyword, preferences, showToast])

  // Handle job feedback
  const handleJobFeedback = useCallback(async (jobId: string, action: UserFeedback, reason?: FeedbackReason) => {
    setActioningJobId(jobId)
    try {
      const response = await fetch('/api/job-search/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, action, reason }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit feedback')
      }

      if (action === 'hide') {
        setJobMatches(prev => prev.filter(job => job.id !== jobId))
      } else {
        setJobMatches(prev => prev.map(job =>
          job.id === jobId
            ? { ...job, user_feedback: action }
            : job
        ))
      }
    } catch (error) {
      console.error('Feedback error:', error)
      showToast('Failed to submit feedback', 'error')
    } finally {
      setActioningJobId(null)
    }
  }, [showToast])

  // Handle apply
  const handleApply = useCallback(async (jobId: string) => {
    setActioningJobId(jobId)
    try {
      const response = await fetch('/api/job-search/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to apply')
      }

      // Navigate to CV tailor page
      if (data.redirectUrl) {
        router.push(data.redirectUrl)
      }
    } catch (error) {
      console.error('Apply error:', error)
      showToast(error instanceof Error ? error.message : 'Failed to start application', 'error')
    } finally {
      setActioningJobId(null)
    }
  }, [router, showToast])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-rose" />
          <p className="text-text-secondary">Loading job search...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary flex items-center gap-2">
            🔍 Job Search
          </h1>
          <p className="text-text-secondary mt-1">
            AI-powered job discovery and intelligent matching
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowPreferencesModal(true)}
          className="flex items-center gap-2"
        >
          <Settings2 className="h-4 w-4" />
          Edit Preferences
        </Button>
      </div>

      {/* AI Insights Section */}
      <Card className="border-2 border-transparent bg-gradient-to-r from-lavender-light/50 via-white to-rose-light/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-lavender/20 via-transparent to-rose/20 pointer-events-none" />
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-lavender-dark" />
                AI Insights & Recommendations
              </CardTitle>
              <span className="px-2 py-0.5 bg-success-light text-success-dark text-xs font-medium rounded-full">
                POWERED BY AI
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefreshInsights}
              disabled={isRefreshingInsights}
              className="flex items-center gap-2"
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshingInsights && 'animate-spin')} />
              Refresh Analysis
            </Button>
          </div>
        </CardHeader>
        <CardContent className="relative space-y-6">
          {/* Keywords */}
          <div>
            <h4 className="text-sm font-medium text-text-primary flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-lavender-dark" />
              Job Search Keywords
            </h4>
            <div className="flex flex-wrap gap-2">
              {preferences?.ai_keywords?.map((keyword) => (
                <KeywordChip
                  key={keyword}
                  keyword={keyword}
                  onRemove={handleRemoveKeyword}
                />
              ))}
              <div className="flex items-center gap-1">
                <Input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                  placeholder="Add keyword..."
                  className="h-8 w-32 text-sm"
                />
                <Button size="sm" variant="ghost" onClick={handleAddKeyword} className="h-8 px-2">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Recommended Job Boards */}
          {preferences?.ai_recommended_boards && preferences.ai_recommended_boards.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-text-primary flex items-center gap-2 mb-3">
                <Clipboard className="h-4 w-4 text-lavender-dark" />
                Recommended Job Boards
              </h4>
              <div className="flex flex-wrap gap-2">
                {preferences.ai_recommended_boards.map((board) => (
                  <a
                    key={board}
                    href={`https://${board.toLowerCase().replace(/\s+/g, '')}.com`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-light rounded-lg text-sm text-text-primary hover:bg-rose-light/30 transition-colors"
                  >
                    {board}
                    <ExternalLink className="h-3 w-3 text-text-tertiary" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Market Insights */}
          {preferences?.ai_market_insights && (
            <div className="bg-warning-light/30 border border-warning/30 rounded-lg p-4">
              <h4 className="text-sm font-medium text-text-primary flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-warning-dark" />
                Market Insights
              </h4>
              <p className="text-sm text-text-secondary">{preferences.ai_market_insights}</p>
            </div>
          )}

          {/* Personalized Strategy */}
          {preferences?.ai_personalized_strategy && (
            <div className="bg-success-light/30 border border-success/30 rounded-lg p-4">
              <h4 className="text-sm font-medium text-text-primary flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-success-dark" />
                Your Personalized Strategy
              </h4>
              <p className="text-sm text-text-secondary">{preferences.ai_personalized_strategy}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Notifications Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-lavender-light rounded-lg flex items-center justify-center">
                <Bell className="h-5 w-5 text-lavender-dark" />
              </div>
              <div>
                <h3 className="font-medium text-text-primary">Job Match Email Notifications</h3>
                <p className="text-sm text-text-secondary">
                  {preferences?.email_notification_frequency === 'disabled'
                    ? 'Notifications are disabled'
                    : `Receiving ${preferences?.email_notification_frequency} digest emails`}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Configure
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Import from Emails Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-sky-light rounded-lg flex items-center justify-center">
                <Inbox className="h-5 w-5 text-sky-dark" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-text-primary">Auto-Import from Emails</h3>
                  <span className="px-2 py-0.5 bg-rose-light text-rose-dark text-xs font-medium rounded-full">
                    NEW
                  </span>
                </div>
                <p className="text-sm text-text-secondary">
                  Forward job alerts to automatically import them into your dashboard
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              Set Up Email Forwarding
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters (Collapsible) */}
      <Card>
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-lg"
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-text-secondary" />
            <span className="font-medium text-text-primary">Advanced Filters</span>
          </div>
          {showAdvancedFilters ? (
            <ChevronUp className="h-4 w-4 text-text-secondary" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-secondary" />
          )}
        </button>
        {showAdvancedFilters && (
          <CardContent className="border-t pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-text-primary mb-1.5 block">
                  Location
                </label>
                <Input placeholder="e.g., San Francisco, Remote" />
              </div>
              <div>
                <label className="text-sm font-medium text-text-primary mb-1.5 block">
                  Minimum Salary
                </label>
                <Input type="number" placeholder="e.g., 100000" />
              </div>
              <div>
                <label className="text-sm font-medium text-text-primary mb-1.5 block">
                  Work Type
                </label>
                <Input placeholder="e.g., Remote, Hybrid" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" size="sm">Reset</Button>
              <Button size="sm">Apply Filters</Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* AI-Powered Job Matches */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-rose" />
            AI-Powered Job Matches
            {jobMatches.length > 0 && (
              <span className="text-sm font-normal text-text-secondary">
                ({jobMatches.length} matches)
              </span>
            )}
          </h2>
          <Button
            onClick={handleSearchNow}
            disabled={isSearching}
            className="flex items-center gap-2"
          >
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Search Now
              </>
            )}
          </Button>
        </div>

        {/* Job Cards */}
        {jobMatches.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
                  <Search className="h-8 w-8 text-text-tertiary" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-text-primary mb-1">
                    No job matches yet
                  </h3>
                  <p className="text-text-secondary max-w-md">
                    Click "Search Now" to discover AI-matched jobs based on your profile and preferences.
                  </p>
                </div>
                <Button onClick={handleSearchNow} disabled={isSearching} className="mt-2">
                  {isSearching ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Start Searching
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {jobMatches.map((job) => (
                <JobMatchCard
                  key={job.id}
                  job={job}
                  onApply={handleApply}
                  onFeedback={handleJobFeedback}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Page Export
// ============================================================================

export default function JobSearchPage() {
  return (
    <ToastProvider>
      <JobSearchPageContent />
    </ToastProvider>
  )
}
