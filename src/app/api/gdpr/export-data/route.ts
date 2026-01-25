/**
 * GDPR Data Export API (Right to Access)
 *
 * GET /api/gdpr/export-data - Export all user data as JSON
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Gather all user data from all tables
    const [
      profileResult,
      applicationsResult,
      cvVersionsResult,
      tailoringSessionsResult,
      checkInsResult,
      interviewSessionsResult,
      compensationResult,
      contractReviewsResult,
      consentLogResult,
      deletionRequestsResult,
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('job_applications').select('*').eq('user_id', user.id),
      supabase.from('cv_versions').select('*').eq('user_id', user.id),
      supabase.from('cv_tailoring_sessions').select('*').eq('user_id', user.id),
      supabase.from('daily_check_ins').select('*').eq('user_id', user.id),
      supabase.from('interview_sessions').select('*').eq('user_id', user.id),
      supabase.from('compensation_negotiations').select('*').eq('user_id', user.id),
      supabase.from('contract_reviews').select('*').eq('user_id', user.id),
      supabase.from('consent_log').select('*').eq('user_id', user.id),
      supabase.from('account_deletion_requests').select('*').eq('user_id', user.id),
    ])

    // Compile export data
    const exportData = {
      export_info: {
        export_date: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        format_version: '1.0',
        gdpr_article: 'Article 15 - Right of Access',
      },
      profile: profileResult.data || null,
      job_applications: applicationsResult.data || [],
      cv_versions: cvVersionsResult.data || [],
      cv_tailoring_sessions: tailoringSessionsResult.data || [],
      daily_check_ins: checkInsResult.data || [],
      interview_sessions: interviewSessionsResult.data || [],
      compensation_negotiations: compensationResult.data || [],
      contract_reviews: contractReviewsResult.data || [],
      consent_history: consentLogResult.data || [],
      account_deletion_requests: deletionRequestsResult.data || [],
      data_summary: {
        total_applications: applicationsResult.data?.length || 0,
        total_cv_versions: cvVersionsResult.data?.length || 0,
        total_tailoring_sessions: tailoringSessionsResult.data?.length || 0,
        total_check_ins: checkInsResult.data?.length || 0,
        total_interviews: interviewSessionsResult.data?.length || 0,
        total_consent_records: consentLogResult.data?.length || 0,
      },
    }

    // Return as downloadable JSON file
    const filename = `signatura-data-export-${user.id.slice(0, 8)}-${Date.now()}.json`

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Error exporting data:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export data' },
      { status: 500 }
    )
  }
}
