/**
 * Job Search Cron Job
 *
 * GET /api/cron/job-search - Daily automated job discovery
 *
 * Runs at 2:00 AM UTC daily via Vercel Cron.
 * Discovers jobs for all active users, scores them, and sends email notifications.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { discoverJobs, calculateMatchScore, sendJobMatchDigest } from '@/lib/job-search'
import { shouldSearchToday, isEmailDue } from '@/lib/job-search/cron-helpers'
import type {
  JobSearchPreferencesRow,
  ProfileJobSearchFields,
  EmailNotificationFrequency,
  CompanySize,
} from '@/types/job-search'

// ============================================================================
// Types
// ============================================================================

interface CronResponse {
  success: boolean
  usersProcessed: number
  totalJobsDiscovered: number
  totalMatchesCreated: number
  emailsSent: number
  cleanedUp: {
    borderlineDeleted: number
    dismissedDeleted: number
  }
  error?: string
}

interface CandidateProfile extends ProfileJobSearchFields {
  id: string
  full_name?: string | null
  skills?: string[]
}

interface CleanupResult {
  borderlineDeleted: number
  dismissedDeleted: number
}

// ============================================================================
// Constants
// ============================================================================

const MAX_JOBS_PER_USER = 50
const BORDERLINE_EXPIRY_DAYS = 7
const DISMISSED_EXPIRY_DAYS = 30

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Cleans up expired borderline and dismissed jobs.
 */
async function cleanupExpiredJobs(
  supabase: ReturnType<typeof createServiceClient>
): Promise<CleanupResult> {
  const now = new Date()

  // Delete borderline jobs (65-74% match score) older than 7 days
  const borderlineCutoff = new Date(now.getTime() - BORDERLINE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  const { data: borderlineDeleted, error: borderlineError } = await supabase
    .from('job_postings')
    .delete()
    .gte('match_score', 65)
    .lt('match_score', 75)
    .lt('discovered_at', borderlineCutoff.toISOString())
    .select('id')

  if (borderlineError) {
    console.error('[Cron] Failed to delete borderline jobs:', borderlineError)
  }

  // Delete dismissed jobs past discarded_until + 30 days
  const dismissedCutoff = new Date(now.getTime() - DISMISSED_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  const { data: dismissedDeleted, error: dismissedError } = await supabase
    .from('job_postings')
    .delete()
    .eq('status', 'dismissed')
    .not('discarded_until', 'is', null)
    .lt('discarded_until', dismissedCutoff.toISOString())
    .select('id')

  if (dismissedError) {
    console.error('[Cron] Failed to delete dismissed jobs:', dismissedError)
  }

  return {
    borderlineDeleted: borderlineDeleted?.length || 0,
    dismissedDeleted: dismissedDeleted?.length || 0,
  }
}

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse<CronResponse>> {
  try {
    // 1. Validate CRON_SECRET header
    const cronSecret =
      request.headers.get('x-cron-secret') ||
      request.headers.get('authorization')?.replace('Bearer ', '')

    if (!cronSecret) {
      return NextResponse.json(
        {
          success: false,
          usersProcessed: 0,
          totalJobsDiscovered: 0,
          totalMatchesCreated: 0,
          emailsSent: 0,
          cleanedUp: { borderlineDeleted: 0, dismissedDeleted: 0 },
          error: 'Missing authorization',
        },
        { status: 401 }
      )
    }

    const expectedSecret = process.env.CRON_SECRET
    if (!expectedSecret) {
      console.error('[Cron] CRON_SECRET not configured')
      return NextResponse.json(
        {
          success: false,
          usersProcessed: 0,
          totalJobsDiscovered: 0,
          totalMatchesCreated: 0,
          emailsSent: 0,
          cleanedUp: { borderlineDeleted: 0, dismissedDeleted: 0 },
          error: 'Server configuration error',
        },
        { status: 500 }
      )
    }

    if (cronSecret !== expectedSecret) {
      return NextResponse.json(
        {
          success: false,
          usersProcessed: 0,
          totalJobsDiscovered: 0,
          totalMatchesCreated: 0,
          emailsSent: 0,
          cleanedUp: { borderlineDeleted: 0, dismissedDeleted: 0 },
          error: 'Invalid authorization',
        },
        { status: 403 }
      )
    }

    const supabase = createServiceClient()
    const now = new Date()

    // 2. Query all active job search preferences
    const { data: activePrefs, error: prefsError } = await supabase
      .from('job_search_preferences')
      .select('*')
      .eq('is_active', true)

    if (prefsError) {
      console.error('[Cron] Failed to fetch active preferences:', prefsError)
      return NextResponse.json(
        {
          success: false,
          usersProcessed: 0,
          totalJobsDiscovered: 0,
          totalMatchesCreated: 0,
          emailsSent: 0,
          cleanedUp: { borderlineDeleted: 0, dismissedDeleted: 0 },
          error: 'Failed to fetch preferences',
        },
        { status: 500 }
      )
    }

    let usersProcessed = 0
    let totalJobsDiscovered = 0
    let totalMatchesCreated = 0
    let emailsSent = 0

    // 3. Process each active user sequentially
    for (const prefs of (activePrefs as unknown) as JobSearchPreferencesRow[]) {
      // Check if we should search today for this user
      if (!shouldSearchToday(prefs)) {
        console.log(`[Cron] Skipping user ${prefs.user_id} - not due for search`)
        continue
      }

      try {
        // Fetch user's profile
        const { data: rawProfileData, error: profileError } = await supabase
          .from('profiles')
          .select(
            'id, full_name, preferred_job_titles, preferred_industries, minimum_salary_expectation, salary_currency, location_preferences, company_size_preferences, career_goals, general_cv_analysis'
          )
          .eq('id', prefs.user_id)
          .single()

        if (profileError || !rawProfileData) {
          console.error(`[Cron] Failed to fetch profile for user ${prefs.user_id}:`, profileError)
          continue
        }

        // Type assertion for profile data
        const profileData = (rawProfileData as unknown) as {
          id: string
          full_name: string
          preferred_job_titles: string[] | null
          preferred_industries: string[] | null
          minimum_salary_expectation: number | null
          salary_currency: string | null
          location_preferences: Record<string, unknown> | null
          company_size_preferences: string[] | null
          career_goals: string | null
          general_cv_analysis: string | null
        }

        // Parse general_cv_analysis if it's a string (JSON stored in DB)
        let generalCvAnalysis = null
        if (profileData.general_cv_analysis) {
          try {
            generalCvAnalysis = typeof profileData.general_cv_analysis === 'string'
              ? JSON.parse(profileData.general_cv_analysis)
              : profileData.general_cv_analysis
          } catch {
            generalCvAnalysis = null
          }
        }

        const profile: CandidateProfile = {
          id: profileData.id,
          full_name: profileData.full_name,
          preferred_job_titles: profileData.preferred_job_titles || [],
          preferred_industries: profileData.preferred_industries || [],
          minimum_salary_expectation: profileData.minimum_salary_expectation,
          salary_currency: profileData.salary_currency || 'USD',
          location_preferences: profileData.location_preferences || {},
          company_size_preferences: (profileData.company_size_preferences || []) as CompanySize[],
          career_goals: profileData.career_goals,
          general_cv_analysis: generalCvAnalysis,
        }

        // Discover jobs
        console.log(`[Cron] Discovering jobs for user ${prefs.user_id}`)
        const discoveryResult = await discoverJobs(profile, prefs)
        totalJobsDiscovered += discoveryResult.jobs.length

        // Score and store jobs
        let matchesCreated = 0
        let borderlineStored = 0

        for (const job of discoveryResult.jobs.slice(0, MAX_JOBS_PER_USER)) {
          const matchResult = calculateMatchScore(job, profile, prefs)

          // Skip jobs below 65%
          if (matchResult.totalScore < 65) {
            continue
          }

          // Insert job posting
          const jobData = {
            user_id: prefs.user_id,
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
            content_hash: job.content_hash || null,
            match_score: matchResult.totalScore,
            match_breakdown: matchResult.breakdown,
            match_reasons: matchResult.matchReasons,
            status: 'new' as const,
          }

          const { error: insertError } = await supabase.from('job_postings').insert(jobData)

          if (insertError) {
            // Skip duplicates (content_hash conflict)
            if (insertError.code !== '23505') {
              console.error(`[Cron] Failed to insert job for user ${prefs.user_id}:`, insertError)
            }
            continue
          }

          if (matchResult.totalScore >= 75) {
            matchesCreated++
          } else {
            borderlineStored++
          }
        }

        totalMatchesCreated += matchesCreated

        // Update preferences
        const newConsecutiveZeroDays =
          matchesCreated === 0 ? prefs.consecutive_zero_match_days + 1 : 0

        await supabase
          .from('job_search_preferences')
          .update({
            last_search_at: now.toISOString(),
            consecutive_zero_match_days: newConsecutiveZeroDays,
            updated_at: now.toISOString(),
          })
          .eq('user_id', prefs.user_id)

        usersProcessed++

        console.log(
          `[Cron] User ${prefs.user_id}: ${discoveryResult.jobs.length} discovered, ${matchesCreated} matches, ${borderlineStored} borderline`
        )

        // Check if email notification is due
        if (isEmailDue(prefs, now) && matchesCreated > 0) {
          try {
            const emailResult = await sendJobMatchDigest(
              prefs.user_id,
              prefs.email_notification_frequency as EmailNotificationFrequency
            )
            if (emailResult.emailsSent > 0) {
              emailsSent++
            }
          } catch (emailError) {
            console.error(`[Cron] Failed to send email for user ${prefs.user_id}:`, emailError)
          }
        }
      } catch (userError) {
        console.error(`[Cron] Error processing user ${prefs.user_id}:`, userError)
        continue
      }
    }

    // 4. Cleanup expired jobs
    console.log('[Cron] Running cleanup...')
    const cleanedUp = await cleanupExpiredJobs(supabase)

    console.log(
      `[Cron] Complete: ${usersProcessed} users, ${totalJobsDiscovered} discovered, ${totalMatchesCreated} matches, ${emailsSent} emails, cleaned ${cleanedUp.borderlineDeleted + cleanedUp.dismissedDeleted} jobs`
    )

    return NextResponse.json({
      success: true,
      usersProcessed,
      totalJobsDiscovered,
      totalMatchesCreated,
      emailsSent,
      cleanedUp,
    })
  } catch (error) {
    console.error('[Cron] Error in GET:', error)
    return NextResponse.json(
      {
        success: false,
        usersProcessed: 0,
        totalJobsDiscovered: 0,
        totalMatchesCreated: 0,
        emailsSent: 0,
        cleanedUp: { borderlineDeleted: 0, dismissedDeleted: 0 },
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
