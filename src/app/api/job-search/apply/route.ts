/**
 * Job Apply API
 *
 * POST /api/job-search/apply - Initiates application process from a matched job
 *
 * Creates a new JobApplication entity pre-populated from the job posting,
 * updates the job posting status, and returns a redirect URL to the CV tailor.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { JobPostingRow } from '@/types/job-search'

// ============================================================================
// Types
// ============================================================================

interface ApplyResponse {
  success: boolean
  applicationId?: string
  redirectUrl?: string
  error?: string
}

// ============================================================================
// Validation Schema
// ============================================================================

const ApplyRequestSchema = z.object({
  jobPostingId: z.string().uuid(),
})

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<ApplyResponse>> {
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

    const parseResult = ApplyRequestSchema.safeParse(body)
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
      return NextResponse.json({ success: false, error: `Validation error: ${errors}` }, { status: 400 })
    }

    const { jobPostingId } = parseResult.data
    const serviceSupabase = createServiceClient()

    // 3. Fetch the job_posting record (verify ownership)
    const { data: jobData, error: jobError } = await serviceSupabase
      .from('job_postings')
      .select('*')
      .eq('id', jobPostingId)
      .single()

    if (jobError || !jobData) {
      return NextResponse.json({ success: false, error: 'Job posting not found' }, { status: 404 })
    }

    const job = jobData as JobPostingRow

    if (job.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    // Check if already applied
    if (job.status === 'applied' && job.job_application_id) {
      return NextResponse.json({
        success: true,
        applicationId: job.job_application_id,
        redirectUrl: `/cv-tailor?applicationId=${job.job_application_id}`,
      })
    }

    // 4. Create a new JobApplication entity pre-populated from the job posting
    const today = new Date().toISOString().split('T')[0]

    const applicationData = {
      user_id: user.id,
      company_name: job.company_name,
      position_title: job.title,
      job_url: job.source_url,
      job_description: job.description || null,
      location: job.location || null,
      application_date: today,
      application_url: job.source_url,
      application_method: job.source_platform || null,
      application_status: 'prepared' as const,
      salary_min: job.salary_min || null,
      salary_max: job.salary_max || null,
      salary_currency: job.salary_currency || 'USD',
      notes: job.match_reasons?.join('\n') || null,
      user_excitement_level: null,
      priority_level: job.match_score && job.match_score >= 90 ? 'high' as const :
                      job.match_score && job.match_score >= 80 ? 'medium' as const : 'low' as const,
      session_connections: {},
      interview_schedule: {},
      follow_up: { actions: [], last_contact: null },
    }

    const { data: applicationResult, error: insertError } = await serviceSupabase
      .from('job_applications')
      .insert(applicationData)
      .select('id')
      .single()

    if (insertError || !applicationResult) {
      console.error('[Apply] Failed to create application:', insertError)
      return NextResponse.json({ success: false, error: 'Failed to create application' }, { status: 500 })
    }

    const applicationId = applicationResult.id

    // 5. Update job_posting: status = "applied", job_application_id = new application ID
    const { error: updateError } = await serviceSupabase
      .from('job_postings')
      .update({
        status: 'applied',
        job_application_id: applicationId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobPostingId)

    if (updateError) {
      console.error('[Apply] Failed to update job posting:', updateError)
      // Don't fail the request - application was created
    }

    console.log(`[Apply] Created application ${applicationId} for job ${jobPostingId}`)

    // 6. Return success with redirect URL
    return NextResponse.json({
      success: true,
      applicationId,
      redirectUrl: `/cv-tailor?applicationId=${applicationId}`,
    })
  } catch (error) {
    console.error('[Apply] Error in POST:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
