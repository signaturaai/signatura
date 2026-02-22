/**
 * Job Search Preferences API
 *
 * GET /api/job-search/preferences - Returns current search preferences
 * PUT /api/job-search/preferences - Updates search preferences
 *
 * When significant preferences change, borderline jobs (65-74%) are re-scored
 * and may be promoted to full matches (75+).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { calculateMatchScore } from '@/lib/job-search'
import {
  JobSearchPreferencesUpdateRequestSchema,
  type JobSearchPreferencesRow,
  type ProfileJobSearchFields,
  type JobPostingRow,
  type CompanySize,
  type GeneralCvAnalysis,
} from '@/types/job-search'

// ============================================================================
// Types
// ============================================================================

interface PreferencesResponse {
  preferences?: JobSearchPreferencesRow
  error?: string
}

interface UpdateResponse {
  success: boolean
  preferences?: JobSearchPreferencesRow
  promotedJobs?: number
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

const BORDERLINE_MIN = 65
const BORDERLINE_MAX = 74
const PASS_THRESHOLD = 75
const RESCORE_DAYS = 7

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

/**
 * Checks if the update contains significant preference changes
 * that warrant re-scoring borderline jobs.
 */
function hasSignificantChanges(
  update: Record<string, unknown>
): boolean {
  const significantFields = [
    'preferred_job_titles',
    'preferred_locations',
    'required_skills',
    'salary_min_override',
    'remote_policy_preferences',
    'company_size_preferences',
    'avoid_companies',
  ]

  return significantFields.some((field) => field in update)
}

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(): Promise<NextResponse<PreferencesResponse>> {
  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceSupabase = createServiceClient()

    // 2. Fetch preferences
    const prefsResult = await serviceSupabase
      .from('job_search_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    let prefs = prefsResult.data
    const prefsError = prefsResult.error

    // 3. Create default if none exists
    if (prefsError && prefsError.code === 'PGRST116') {
      const defaultPrefs = getDefaultPreferences(user.id)
      const { data: newPrefs, error: insertError } = await serviceSupabase
        .from('job_search_preferences')
        .insert(defaultPrefs)
        .select()
        .single()

      if (insertError) {
        console.error('[Preferences] Failed to create default preferences:', insertError)
        return NextResponse.json({ error: 'Failed to create preferences' }, { status: 500 })
      }

      prefs = newPrefs
    } else if (prefsError) {
      console.error('[Preferences] Failed to fetch preferences:', prefsError)
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
    }

    return NextResponse.json({ preferences: (prefs as unknown) as JobSearchPreferencesRow })
  } catch (error) {
    console.error('[Preferences] Error in GET:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================================================
// PUT Handler
// ============================================================================

export async function PUT(request: NextRequest): Promise<NextResponse<UpdateResponse>> {
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

    const parseResult = JobSearchPreferencesUpdateRequestSchema.safeParse(body)
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
      return NextResponse.json({ success: false, error: `Validation error: ${errors}` }, { status: 400 })
    }

    const updateData = parseResult.data
    const serviceSupabase = createServiceClient()

    // 3. Ensure preferences exist (create if not)
    const existingPrefsResult = await serviceSupabase
      .from('job_search_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    let existingPrefs = existingPrefsResult.data
    const fetchError = existingPrefsResult.error

    if (fetchError && fetchError.code === 'PGRST116') {
      // Create default preferences first
      const defaultPrefs = getDefaultPreferences(user.id)
      const { data: newPrefs, error: insertError } = await serviceSupabase
        .from('job_search_preferences')
        .insert(defaultPrefs)
        .select()
        .single()

      if (insertError) {
        console.error('[Preferences] Failed to create preferences:', insertError)
        return NextResponse.json({ success: false, error: 'Failed to create preferences' }, { status: 500 })
      }

      existingPrefs = newPrefs
    } else if (fetchError) {
      console.error('[Preferences] Failed to fetch preferences:', fetchError)
      return NextResponse.json({ success: false, error: 'Failed to fetch preferences' }, { status: 500 })
    }

    // 4. Update preferences
    const { data: updatedPrefs, error: updateError } = await serviceSupabase
      .from('job_search_preferences')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('[Preferences] Failed to update preferences:', updateError)
      return NextResponse.json({ success: false, error: 'Failed to update preferences' }, { status: 500 })
    }

    // 5. Re-score borderline jobs if significant changes
    let promotedJobs = 0

    if (hasSignificantChanges(updateData)) {
      console.log('[Preferences] Significant changes detected, re-scoring borderline jobs')

      // Fetch user profile for scoring
      const { data: profileData, error: profileError } = await serviceSupabase
        .from('profiles')
        .select(
          'id, full_name, preferred_job_titles, preferred_industries, minimum_salary_expectation, salary_currency, location_preferences, company_size_preferences, career_goals, general_cv_analysis'
        )
        .eq('id', user.id)
        .single()

      if (profileError || !profileData) {
        console.warn('[Preferences] Could not fetch profile for re-scoring')
      } else {
        // Type assertion for profile data
        const typedProfileData = (profileData as unknown) as {
          id: string
          full_name: string
          preferred_job_titles: string[] | null
          preferred_industries: string[] | null
          minimum_salary_expectation: number | null
          salary_currency: string | null
          location_preferences: Record<string, unknown> | null
          company_size_preferences: string[] | null
          career_goals: string | null
          general_cv_analysis: unknown
        }

        const profile: CandidateProfile = {
          id: typedProfileData.id,
          full_name: typedProfileData.full_name,
          preferred_job_titles: typedProfileData.preferred_job_titles || [],
          preferred_industries: typedProfileData.preferred_industries || [],
          minimum_salary_expectation: typedProfileData.minimum_salary_expectation,
          salary_currency: typedProfileData.salary_currency || 'USD',
          location_preferences: typedProfileData.location_preferences || {},
          company_size_preferences: (typedProfileData.company_size_preferences || []) as CompanySize[],
          career_goals: typedProfileData.career_goals,
          general_cv_analysis: typedProfileData.general_cv_analysis as GeneralCvAnalysis | null,
        }

        // Fetch borderline jobs from last 7 days
        const sevenDaysAgo = new Date(Date.now() - RESCORE_DAYS * 24 * 60 * 60 * 1000).toISOString()

        const { data: borderlineJobs, error: jobsError } = await serviceSupabase
          .from('job_postings')
          .select('*')
          .eq('user_id', user.id)
          .gte('match_score', BORDERLINE_MIN)
          .lte('match_score', BORDERLINE_MAX)
          .gte('discovered_at', sevenDaysAgo)

        if (jobsError) {
          console.warn('[Preferences] Failed to fetch borderline jobs:', jobsError)
        } else if (borderlineJobs && borderlineJobs.length > 0) {
          console.log(`[Preferences] Re-scoring ${borderlineJobs.length} borderline jobs`)

          for (const job of (borderlineJobs as unknown) as JobPostingRow[]) {
            const matchResult = calculateMatchScore(
              {
                title: job.title,
                company_name: job.company_name,
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
                source_url: job.source_url || '',
                source_platform: job.source_platform || undefined,
                posted_date: job.posted_date || undefined,
                content_hash: job.content_hash || undefined,
              },
              profile,
              (updatedPrefs as unknown) as JobSearchPreferencesRow
            )

            // If score improved to 75+, promote the job
            if (matchResult.totalScore >= PASS_THRESHOLD) {
              const { error: promoteError } = await serviceSupabase
                .from('job_postings')
                .update({
                  match_score: matchResult.totalScore,
                  match_breakdown: matchResult.breakdown,
                  match_reasons: matchResult.matchReasons,
                  status: 'new',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', job.id)

              if (!promoteError) {
                promotedJobs++
                console.log(`[Preferences] Promoted job ${job.id}: ${job.title} (${job.match_score} -> ${matchResult.totalScore})`)
              }
            }
          }
        }
      }
    }

    console.log(`[Preferences] Updated preferences, promoted ${promotedJobs} jobs`)

    return NextResponse.json({
      success: true,
      preferences: (updatedPrefs as unknown) as JobSearchPreferencesRow,
      promotedJobs,
    })
  } catch (error) {
    console.error('[Preferences] Error in PUT:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
