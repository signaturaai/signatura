/**
 * CV Tailoring API - "Best of Both Worlds"
 *
 * POST /api/cv/tailor
 * Tailors a CV for a specific job description, guaranteeing
 * the result is at least as good as the original.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateBestOfBothWorldsCV, TailoringResult } from '@/lib/cv'

export const maxDuration = 60 // Allow up to 60 seconds for AI processing

interface TailorRequest {
  baseCVText: string
  jobDescription: string
  industry?: string
  applicationId?: string
  saveToDatabase?: boolean
}

interface TailorResponse {
  success: boolean
  result?: TailoringResult
  sessionId?: string
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<TailorResponse>> {
  const startTime = Date.now()

  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse request body
    const body: TailorRequest = await request.json()
    const {
      baseCVText,
      jobDescription,
      industry = 'generic',
      applicationId,
      saveToDatabase = true,
    } = body

    // Validate inputs
    if (!baseCVText || typeof baseCVText !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Base CV text is required' },
        { status: 400 }
      )
    }

    if (!jobDescription || typeof jobDescription !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Job description is required' },
        { status: 400 }
      )
    }

    if (baseCVText.length < 100) {
      return NextResponse.json(
        { success: false, error: 'Base CV text is too short (minimum 100 characters)' },
        { status: 400 }
      )
    }

    if (jobDescription.length < 50) {
      return NextResponse.json(
        { success: false, error: 'Job description is too short (minimum 50 characters)' },
        { status: 400 }
      )
    }

    if (baseCVText.length > 50000) {
      return NextResponse.json(
        { success: false, error: 'Base CV text is too long (maximum 50,000 characters)' },
        { status: 400 }
      )
    }

    // Create a tailoring session record if saving to database
    let sessionId: string | undefined

    if (saveToDatabase) {
      const { data: session, error: sessionError } = await supabase
        .from('cv_tailoring_sessions')
        .insert({
          user_id: user.id,
          application_id: applicationId || null,
          base_cv_text: baseCVText,
          job_description: jobDescription,
          industry,
          status: 'processing',
        })
        .select('id')
        .single()

      if (sessionError) {
        console.error('Failed to create tailoring session:', sessionError)
        // Continue without saving - don't fail the request
      } else if (session) {
        // Type assertion for untyped table response
        sessionId = (session as unknown as { id: string }).id
      }
    }

    // Generate the tailored CV
    console.log(`Starting CV tailoring for user ${user.id}...`)
    const result = await generateBestOfBothWorldsCV(baseCVText, jobDescription, industry)

    // Update session with results if we created one
    if (sessionId && saveToDatabase) {
      const { error: updateError } = await supabase
        .from('cv_tailoring_sessions')
        .update({
          base_overall_score: result.baseOverallScore,
          tailored_overall_score: result.tailoredOverallScore,
          final_overall_score: result.finalOverallScore,
          improvement: result.overallImprovement,
          section_comparisons: result.sectionComparisons,
          sections_improved: result.sectionsImproved,
          sections_kept_original: result.sectionsKeptOriginal,
          final_cv_text: result.finalCVText,
          status: result.success ? 'completed' : 'failed',
          error_message: result.error || null,
          processing_time_ms: result.processingTimeMs,
          tokens_used: result.tokensUsed || null,
        })
        .eq('id', sessionId)

      if (updateError) {
        console.error('Failed to update tailoring session:', updateError)
      }
    }

    // Log success
    const totalTime = Date.now() - startTime
    console.log(
      `CV tailoring completed in ${totalTime}ms. ` +
        `Improvement: +${result.overallImprovement.toFixed(1)} points. ` +
        `Sections improved: ${result.sectionsImproved}/${result.totalSections}`
    )

    return NextResponse.json({
      success: true,
      result,
      sessionId,
    })
  } catch (error) {
    console.error('CV tailoring API error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to tailor CV',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/cv/tailor?sessionId=xxx
 * Retrieve a previous tailoring session
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get session ID from query params
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      // Return list of recent sessions
      const { data: sessions, error } = await supabase
        .from('cv_tailoring_sessions')
        .select(
          `
          id,
          application_id,
          industry,
          base_overall_score,
          final_overall_score,
          improvement,
          sections_improved,
          sections_kept_original,
          status,
          created_at
        `
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        return NextResponse.json(
          { success: false, error: 'Failed to fetch sessions' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        sessions,
      })
    }

    // Fetch specific session
    const { data: session, error } = await supabase
      .from('cv_tailoring_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (error || !session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      session,
    })
  } catch (error) {
    console.error('CV tailoring GET error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch session',
      },
      { status: 500 }
    )
  }
}
