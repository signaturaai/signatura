/**
 * Job Discovery API
 *
 * POST /api/job-search/discover - Trigger on-demand job search for current user
 *
 * This is the "Search Now" button handler that:
 * 1. Authenticates user and fetches their profile/preferences
 * 2. Calls the job discovery service (Gemini with web search)
 * 3. Scores each job against user profile
 * 4. Stores qualifying jobs (score >= 65) in job_postings table
 * 5. Updates search tracking stats
 *
 * Rate limit: 1 search per 5 minutes per user
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { discoverJobs, calculateMatchScore } from '@/lib/job-search'
import { checkUsageLimit, incrementUsage, isAdmin } from '@/lib/subscription/access-control'
import type {
  JobSearchPreferencesRow,
  ProfileJobSearchFields,
  DiscoveredJob,
  MatchBreakdown,
} from '@/types/job-search'

// ============================================================================
// Types
// ============================================================================

interface CandidateProfile extends ProfileJobSearchFields {
  id: string
  full_name?: string | null
  skills?: string[]
}

interface DiscoverResponse {
  success: boolean
  newMatches: number
  topScore: number
  borderlineCount?: number
  error?: string
}

// ============================================================================
// Constants
// ============================================================================

const RATE_LIMIT_MINUTES = 5
const PASS_THRESHOLD = 75
const BORDERLINE_MIN = 65

// ============================================================================
// Default Preferences
// ============================================================================

function getDefaultPreferences(userId: string): Omit<JobSearchPreferencesRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    user_id: userId,
    is_active: true,
    preferred_job_titles: [],
    preferred_locations: [],
    experience_years: null,
    required_skills: [],
    company_size_preferences: [],
    remote_policy_preferences: [],
    required_benefits: [],
    salary_min_override: null,
    salary_currency_override: null,
    avoid_companies: [],
    avoid_keywords: [],
    ai_keywords: [],
    ai_recommended_boards: [],
    ai_market_insights: null,
    ai_personalized_strategy: null,
    ai_last_analysis_at: null,
    implicit_preferences: {},
    feedback_stats: { total_likes: 0, total_dislikes: 0, total_hides: 0, reasons: {} },
    email_notification_frequency: 'weekly',
    last_email_sent_at: null,
    last_search_at: null,
    consecutive_zero_match_days: 0,
  }
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<DiscoverResponse>> {
  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, newMatches: 0, topScore: 0, error: 'Unauthorized' }, { status: 401 })
    }

    // Use service client for database operations (bypasses RLS for inserts)
    const serviceSupabase = createServiceClient()

    // 2a. Check subscription usage limit (unless admin)
    const userIsAdmin = await isAdmin(serviceSupabase, user.id)

    if (!userIsAdmin) {
      const usageCheck = await checkUsageLimit(serviceSupabase, user.id, 'applications')

      // If subscription is enforced and not allowed, block the request
      if (usageCheck.enforced && !usageCheck.allowed) {
        const reason = usageCheck.reason || 'LIMIT_REACHED'
        const statusCode = reason === 'NO_SUBSCRIPTION' ? 402 : 403

        return NextResponse.json(
          {
            success: false,
            newMatches: 0,
            topScore: 0,
            error: reason === 'NO_SUBSCRIPTION' ? 'Subscription required' : 'Usage limit reached',
            reason,
            used: usageCheck.used,
            limit: usageCheck.limit,
          },
          { status: statusCode }
        )
      }
    }

    // 2. Fetch user's profile
    const { data: profileData, error: profileError } = await serviceSupabase
      .from('profiles')
      .select(
        'id, full_name, preferred_job_titles, preferred_industries, minimum_salary_expectation, salary_currency, location_preferences, company_size_preferences, career_goals, general_cv_analysis'
      )
      .eq('id', user.id)
      .single()

    if (profileError || !profileData) {
      console.error('[JobSearch] Profile fetch error:', profileError)
      return NextResponse.json(
        { success: false, newMatches: 0, topScore: 0, error: 'Profile not found' },
        { status: 404 }
      )
    }

    const profile: CandidateProfile = {
      id: profileData.id,
      full_name: profileData.full_name,
      preferred_job_titles: profileData.preferred_job_titles || [],
      preferred_industries: profileData.preferred_industries || [],
      minimum_salary_expectation: profileData.minimum_salary_expectation,
      salary_currency: profileData.salary_currency || 'USD',
      location_preferences: profileData.location_preferences || {},
      company_size_preferences: profileData.company_size_preferences || [],
      career_goals: profileData.career_goals,
      general_cv_analysis: profileData.general_cv_analysis,
    }

    // 3. Fetch or create job search preferences
    let { data: prefsData, error: prefsError } = await serviceSupabase
      .from('job_search_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (prefsError && prefsError.code === 'PGRST116') {
      // No preferences found, create default
      const defaultPrefs = getDefaultPreferences(user.id)
      const { data: newPrefs, error: insertError } = await serviceSupabase
        .from('job_search_preferences')
        .insert(defaultPrefs)
        .select()
        .single()

      if (insertError) {
        console.error('[JobSearch] Failed to create default preferences:', insertError)
        return NextResponse.json(
          { success: false, newMatches: 0, topScore: 0, error: 'Failed to initialize preferences' },
          { status: 500 }
        )
      }

      prefsData = newPrefs
    } else if (prefsError) {
      console.error('[JobSearch] Preferences fetch error:', prefsError)
      return NextResponse.json(
        { success: false, newMatches: 0, topScore: 0, error: 'Failed to fetch preferences' },
        { status: 500 }
      )
    }

    const prefs = prefsData as JobSearchPreferencesRow

    // 4. Check rate limit (5 minutes between searches)
    if (prefs.last_search_at) {
      const lastSearch = new Date(prefs.last_search_at)
      const now = new Date()
      const minutesSinceLastSearch = (now.getTime() - lastSearch.getTime()) / (1000 * 60)

      if (minutesSinceLastSearch < RATE_LIMIT_MINUTES) {
        const waitMinutes = Math.ceil(RATE_LIMIT_MINUTES - minutesSinceLastSearch)
        return NextResponse.json(
          {
            success: false,
            newMatches: 0,
            topScore: 0,
            error: `Rate limited. Please wait ${waitMinutes} minute${waitMinutes > 1 ? 's' : ''} before searching again.`,
          },
          { status: 429 }
        )
      }
    }

    // 5. Discover jobs using Gemini with web search
    console.log(`[JobSearch] Starting discovery for user ${user.id}`)
    const discoveryResult = await discoverJobs(profile, prefs)
    console.log(`[JobSearch] Discovered ${discoveryResult.jobs.length} jobs`)

    // 6. Score each job and filter by threshold
    const scoredJobs: Array<{
      job: DiscoveredJob
      score: number
      breakdown: MatchBreakdown
      reasons: string[]
      isBorderline: boolean
    }> = []

    for (const job of discoveryResult.jobs) {
      const matchResult = calculateMatchScore(job, profile, prefs)

      if (matchResult.totalScore >= BORDERLINE_MIN) {
        scoredJobs.push({
          job,
          score: matchResult.totalScore,
          breakdown: matchResult.breakdown,
          reasons: matchResult.matchReasons,
          isBorderline: matchResult.isBorderline,
        })
      }
    }

    console.log(`[JobSearch] ${scoredJobs.length} jobs passed threshold (>= ${BORDERLINE_MIN})`)

    // 7. Insert qualifying jobs into job_postings table
    let newMatchCount = 0
    let borderlineCount = 0
    let topScore = 0

    for (const { job, score, breakdown, reasons, isBorderline } of scoredJobs) {
      // Track top score
      if (score > topScore) {
        topScore = score
      }

      // Add borderline flag to breakdown if applicable
      const finalBreakdown = isBorderline
        ? { ...breakdown, borderline: true }
        : breakdown

      // Insert job posting
      const { error: insertError } = await serviceSupabase.from('job_postings').insert({
        user_id: user.id,
        title: job.title,
        company_name: job.company_name,
        company_logo_url: job.company_logo_url || null,
        description: job.description || null,
        location: job.location || null,
        work_type: job.work_type || null,
        experience_level: job.experience_level || null,
        salary_min: job.salary_min || null,
        salary_max: job.salary_max || null,
        salary_currency: job.salary_currency || 'USD',
        required_skills: job.required_skills || [],
        benefits: job.benefits || [],
        company_size: job.company_size || null,
        source_url: job.source_url,
        source_platform: job.source_platform || null,
        posted_date: job.posted_date || null,
        discovered_at: new Date().toISOString(),
        match_score: score,
        match_breakdown: finalBreakdown,
        match_reasons: reasons,
        status: 'new',
        content_hash: job.content_hash || null,
      })

      if (insertError) {
        // Skip duplicates (content_hash constraint)
        if (insertError.code === '23505') {
          console.log(`[JobSearch] Skipping duplicate: ${job.title} at ${job.company_name}`)
          continue
        }
        console.error('[JobSearch] Insert error:', insertError)
        continue
      }

      if (isBorderline) {
        borderlineCount++
      } else {
        newMatchCount++
      }
    }

    // 8. Update search preferences
    const now = new Date().toISOString()
    const totalMatches = newMatchCount + borderlineCount

    const updateData: Partial<JobSearchPreferencesRow> = {
      last_search_at: now,
      consecutive_zero_match_days: totalMatches > 0 ? 0 : (prefs.consecutive_zero_match_days || 0) + 1,
    }

    const { error: updateError } = await serviceSupabase
      .from('job_search_preferences')
      .update(updateData)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('[JobSearch] Failed to update preferences:', updateError)
      // Don't fail the request, just log
    }

    console.log(`[JobSearch] Complete: ${newMatchCount} matches, ${borderlineCount} borderline, top score: ${topScore}`)

    // 9. Increment usage counter (always track, even if admin or kill switch off)
    try {
      await incrementUsage(serviceSupabase, user.id, 'applications')
    } catch (usageError) {
      // Silent fail - usage tracking shouldn't break the app
      console.error('[JobSearch] Failed to increment usage:', usageError)
    }

    return NextResponse.json({
      success: true,
      newMatches: newMatchCount,
      topScore,
      borderlineCount,
    })
  } catch (error) {
    console.error('[JobSearch] Error in POST /api/job-search/discover:', error)
    return NextResponse.json(
      {
        success: false,
        newMatches: 0,
        topScore: 0,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
