/**
 * Job Feedback API
 *
 * POST /api/job-search/feedback - Handle user feedback on job matches
 *
 * Processes like, dislike, and hide actions with adaptive preference learning.
 * Updates job_posting status and learns from feedback patterns to improve
 * future job matching.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  FeedbackRequestSchema,
  type FeedbackReason,
  type ImplicitPreferences,
  type PreferencesFeedbackStats,
  type JobSearchPreferencesRow,
} from '@/types/job-search'

// ============================================================================
// Types
// ============================================================================

interface FeedbackResponse {
  success: boolean
  error?: string
}

interface JobPostingData {
  id: string
  user_id: string
  company_name: string
  location: string | null
}

// ============================================================================
// Constants
// ============================================================================

const DISCARD_DAYS = 30
const SALARY_ADJUSTMENT_INCREMENT = 10
const SALARY_ADJUSTMENT_CAP = 50
const LOCATION_FEEDBACK_THRESHOLD = 3

// ============================================================================
// Helpers
// ============================================================================

/**
 * Updates implicit preferences based on feedback reason
 */
function updateImplicitPreferences(
  current: ImplicitPreferences,
  reason: FeedbackReason | null | undefined,
  jobData: JobPostingData,
  feedbackStats: PreferencesFeedbackStats
): ImplicitPreferences {
  const updated = { ...current }

  if (!reason) {
    return updated
  }

  switch (reason) {
    case 'Salary too low':
      // Increase salary expectation by 10%, cap at 50%
      const currentAdjustment = updated.salary_adjustment || 0
      updated.salary_adjustment = Math.min(currentAdjustment + SALARY_ADJUSTMENT_INCREMENT, SALARY_ADJUSTMENT_CAP)
      break

    case 'Wrong location':
      // Track location dislikes - after 3+, we could tighten location filter
      // For now, just track the count in reasons (handled elsewhere)
      // The calling code can check feedbackStats.reasons['Wrong location'] >= 3
      break

    case 'Not interested in company':
      // Add company to avoidance list (stored separately in avoid_companies)
      // We'll return this info so the caller can update avoid_companies
      break

    case 'Skills mismatch':
      // Could track preferred vs avoided skills in future
      break

    case 'Other':
      // No automatic learning for generic feedback
      break
  }

  return updated
}

/**
 * Updates feedback statistics
 */
function updateFeedbackStats(
  current: PreferencesFeedbackStats,
  feedback: 'like' | 'dislike' | 'hide',
  reason: FeedbackReason | null | undefined
): PreferencesFeedbackStats {
  const updated = {
    total_likes: current.total_likes || 0,
    total_dislikes: current.total_dislikes || 0,
    total_hides: current.total_hides || 0,
    reasons: { ...current.reasons } || {},
  }

  switch (feedback) {
    case 'like':
      updated.total_likes++
      break
    case 'dislike':
      updated.total_dislikes++
      break
    case 'hide':
      updated.total_hides++
      break
  }

  // Track reason frequency
  if (reason) {
    updated.reasons[reason] = (updated.reasons[reason] || 0) + 1
  }

  return updated
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<FeedbackResponse>> {
  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse and validate request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
    }

    const parseResult = FeedbackRequestSchema.safeParse(body)
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
      return NextResponse.json({ success: false, error: `Validation error: ${errors}` }, { status: 400 })
    }

    const { jobPostingId, feedback, reason } = parseResult.data

    // Use service client for database operations
    const serviceSupabase = createServiceClient()

    // 3. Verify job_posting belongs to this user
    const { data: jobData, error: jobError } = await serviceSupabase
      .from('job_postings')
      .select('id, user_id, company_name, location')
      .eq('id', jobPostingId)
      .single()

    if (jobError || !jobData) {
      return NextResponse.json({ success: false, error: 'Job posting not found' }, { status: 404 })
    }

    if (jobData.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    // 4. Build job_posting update based on feedback type
    const now = new Date()
    const discardedUntil = new Date(now.getTime() + DISCARD_DAYS * 24 * 60 * 60 * 1000)

    interface JobPostingUpdate {
      user_feedback: 'like' | 'dislike' | 'hide'
      status: 'liked' | 'dismissed'
      feedback_reason?: FeedbackReason | null
      discarded_until?: string | null
      updated_at: string
    }

    let jobUpdate: JobPostingUpdate

    switch (feedback) {
      case 'like':
        jobUpdate = {
          user_feedback: 'like',
          status: 'liked',
          feedback_reason: null,
          discarded_until: null,
          updated_at: now.toISOString(),
        }
        break

      case 'dislike':
        jobUpdate = {
          user_feedback: 'dislike',
          status: 'dismissed',
          feedback_reason: reason || null,
          discarded_until: discardedUntil.toISOString(),
          updated_at: now.toISOString(),
        }
        break

      case 'hide':
        jobUpdate = {
          user_feedback: 'hide',
          status: 'dismissed',
          feedback_reason: null,
          discarded_until: discardedUntil.toISOString(),
          updated_at: now.toISOString(),
        }
        break
    }

    // Update job_posting
    const { error: updateJobError } = await serviceSupabase
      .from('job_postings')
      .update(jobUpdate)
      .eq('id', jobPostingId)

    if (updateJobError) {
      console.error('[JobFeedback] Failed to update job posting:', updateJobError)
      return NextResponse.json({ success: false, error: 'Failed to update job posting' }, { status: 500 })
    }

    // 5. Update learned preferences (adaptive matching)
    const { data: prefsData, error: prefsError } = await serviceSupabase
      .from('job_search_preferences')
      .select('implicit_preferences, feedback_stats, avoid_companies')
      .eq('user_id', user.id)
      .single()

    if (prefsError) {
      // Preferences don't exist yet - this is not a critical error
      console.warn('[JobFeedback] No preferences found for user, skipping adaptive learning')
      return NextResponse.json({ success: true })
    }

    const currentImplicit: ImplicitPreferences = prefsData.implicit_preferences || {}
    const currentStats: PreferencesFeedbackStats = prefsData.feedback_stats || {
      total_likes: 0,
      total_dislikes: 0,
      total_hides: 0,
      reasons: {},
    }
    const currentAvoidCompanies: string[] = prefsData.avoid_companies || []

    // Update feedback stats
    const updatedStats = updateFeedbackStats(currentStats, feedback, reason)

    // Update implicit preferences based on reason
    const updatedImplicit = updateImplicitPreferences(
      currentImplicit,
      reason,
      jobData as JobPostingData,
      updatedStats
    )

    // Build preferences update
    interface PrefsUpdate {
      feedback_stats: PreferencesFeedbackStats
      implicit_preferences: ImplicitPreferences
      avoid_companies?: string[]
      updated_at: string
    }

    const prefsUpdate: PrefsUpdate = {
      feedback_stats: updatedStats,
      implicit_preferences: updatedImplicit,
      updated_at: now.toISOString(),
    }

    // Add company to avoidance list if reason is "Not interested in company"
    if (reason === 'Not interested in company' && jobData.company_name) {
      const companyName = jobData.company_name.trim()
      if (companyName && !currentAvoidCompanies.includes(companyName)) {
        prefsUpdate.avoid_companies = [...currentAvoidCompanies, companyName]
      }
    }

    // Update preferences
    const { error: updatePrefsError } = await serviceSupabase
      .from('job_search_preferences')
      .update(prefsUpdate)
      .eq('user_id', user.id)

    if (updatePrefsError) {
      console.error('[JobFeedback] Failed to update preferences:', updatePrefsError)
      // Don't fail the request - the job feedback was recorded successfully
    }

    console.log(
      `[JobFeedback] Recorded ${feedback} for job ${jobPostingId}${reason ? ` (reason: ${reason})` : ''}`
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[JobFeedback] Error in POST /api/job-search/feedback:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
