/**
 * AI Insights API
 *
 * POST /api/job-search/insights - Triggers AI insights generation
 *
 * Generates AI-powered search intelligence:
 * - Recommended search keywords
 * - Recommended job boards
 * - Market insights
 * - Personalized strategy
 *
 * Results are cached to job_search_preferences for 7 days.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateSearchInsights, shouldRefreshInsights } from '@/lib/job-search'
import type {
  SearchInsights,
  JobSearchPreferencesRow,
  ProfileJobSearchFields,
  DiscoveredJob,
  JobPostingRow,
} from '@/types/job-search'

// ============================================================================
// Types
// ============================================================================

interface InsightsResponse {
  success: boolean
  insights?: SearchInsights
  cached?: boolean
  error?: string
}

interface CandidateProfile extends ProfileJobSearchFields {
  id: string
  full_name?: string | null
  skills?: string[]
}

// ============================================================================
// Constants
// ============================================================================

const RECENT_JOBS_LIMIT = 20

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

export async function POST(request: NextRequest): Promise<NextResponse<InsightsResponse>> {
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

    const serviceSupabase = createServiceClient()

    // 2. Fetch user's profile
    const { data: profileData, error: profileError } = await serviceSupabase
      .from('profiles')
      .select(
        'id, full_name, preferred_job_titles, preferred_industries, minimum_salary_expectation, salary_currency, location_preferences, company_size_preferences, career_goals, general_cv_analysis'
      )
      .eq('id', user.id)
      .single()

    if (profileError || !profileData) {
      console.error('[Insights] Profile fetch error:', profileError)
      return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 })
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
      // Create default preferences
      const defaultPrefs = getDefaultPreferences(user.id)
      const { data: newPrefs, error: insertError } = await serviceSupabase
        .from('job_search_preferences')
        .insert(defaultPrefs)
        .select()
        .single()

      if (insertError) {
        console.error('[Insights] Failed to create preferences:', insertError)
        return NextResponse.json({ success: false, error: 'Failed to initialize preferences' }, { status: 500 })
      }

      prefsData = newPrefs
    } else if (prefsError) {
      console.error('[Insights] Preferences fetch error:', prefsError)
      return NextResponse.json({ success: false, error: 'Failed to fetch preferences' }, { status: 500 })
    }

    const prefs = prefsData as JobSearchPreferencesRow

    // 4. Check if we should use cached insights
    // Parse forceRefresh from request body if provided
    let forceRefresh = false
    try {
      const body = await request.json()
      forceRefresh = body?.forceRefresh === true
    } catch {
      // No body or invalid JSON - that's fine, use defaults
    }

    if (!forceRefresh && !shouldRefreshInsights(prefs)) {
      // Return cached insights
      console.log(`[Insights] Returning cached insights for user ${user.id}`)
      return NextResponse.json({
        success: true,
        insights: {
          keywords: prefs.ai_keywords || [],
          recommendedBoards: prefs.ai_recommended_boards || [],
          marketInsights: prefs.ai_market_insights || null,
          personalizedStrategy: prefs.ai_personalized_strategy || null,
          generatedAt: prefs.ai_last_analysis_at || new Date().toISOString(),
        },
        cached: true,
      })
    }

    // 5. Fetch recent job matches for context
    const { data: recentJobsData, error: jobsError } = await serviceSupabase
      .from('job_postings')
      .select('*')
      .eq('user_id', user.id)
      .order('discovered_at', { ascending: false })
      .limit(RECENT_JOBS_LIMIT)

    if (jobsError) {
      console.warn('[Insights] Failed to fetch recent jobs:', jobsError)
      // Continue without recent jobs - not critical
    }

    // Convert JobPostingRow to DiscoveredJob for the insights generator
    const recentJobs: DiscoveredJob[] = (recentJobsData || []).map((job: JobPostingRow) => ({
      title: job.title,
      company_name: job.company_name,
      company_logo_url: job.company_logo_url || undefined,
      description: job.description || undefined,
      location: job.location || undefined,
      work_type: job.work_type || undefined,
      experience_level: job.experience_level || undefined,
      salary_min: job.salary_min || undefined,
      salary_max: job.salary_max || undefined,
      salary_currency: job.salary_currency || undefined,
      required_skills: job.required_skills || [],
      benefits: job.benefits || [],
      company_size: job.company_size || undefined,
      source_url: job.source_url,
      source_platform: job.source_platform || undefined,
      posted_date: job.posted_date || undefined,
      content_hash: job.content_hash || undefined,
    }))

    // 6. Generate AI insights
    console.log(`[Insights] Generating fresh insights for user ${user.id}`)
    const insights = await generateSearchInsights(profile, prefs, recentJobs)

    // 7. Save results to job_search_preferences
    const { error: updateError } = await serviceSupabase
      .from('job_search_preferences')
      .update({
        ai_keywords: insights.keywords,
        ai_recommended_boards: insights.recommendedBoards,
        ai_market_insights: insights.marketInsights,
        ai_personalized_strategy: insights.personalizedStrategy,
        ai_last_analysis_at: insights.generatedAt,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('[Insights] Failed to save insights:', updateError)
      // Still return insights even if save failed
    }

    console.log(`[Insights] Generated ${insights.keywords.length} keywords, ${insights.recommendedBoards.length} boards`)

    return NextResponse.json({
      success: true,
      insights,
      cached: false,
    })
  } catch (error) {
    console.error('[Insights] Error in POST:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
