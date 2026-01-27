/**
 * Interview Plan Generation API
 *
 * POST /api/interview/generate-plan
 * Generates a personalized interview plan based on wizard configuration.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateInterviewPlan, getMockInterviewPlan } from '@/lib/interview'
import type { GeneratePlanRequest, InterviewPlan } from '@/types/interview'

const USE_MOCK = process.env.NODE_ENV === 'development' && process.env.USE_MOCK_AI === 'true'

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body: GeneratePlanRequest = await request.json()

    // Validate required fields
    if (!body.jobDescription || !body.tailoredCV || !body.config) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: 'jobDescription, tailoredCV, and config are required',
        },
        { status: 400 }
      )
    }

    // Validate config
    if (!body.config.interviewType) {
      return NextResponse.json(
        { error: 'Invalid config', details: 'interviewType is required' },
        { status: 400 }
      )
    }

    if (body.config.personaMode === 'preset' && !body.config.persona) {
      return NextResponse.json(
        { error: 'Invalid config', details: 'persona is required for preset mode' },
        { status: 400 }
      )
    }

    if (
      body.config.personaMode === 'analyze' &&
      (!body.config.linkedInText || body.config.linkedInText.trim().length < 50)
    ) {
      return NextResponse.json(
        {
          error: 'Invalid config',
          details: 'linkedInText with at least 50 characters is required for analyze mode',
        },
        { status: 400 }
      )
    }

    if (!body.config.focusAreas || body.config.focusAreas.length === 0) {
      return NextResponse.json(
        { error: 'Invalid config', details: 'At least one focus area is required' },
        { status: 400 }
      )
    }

    // Generate the interview plan
    let plan: InterviewPlan

    if (USE_MOCK) {
      plan = await getMockInterviewPlan(body)
    } else {
      plan = await generateInterviewPlan(body)
    }

    // Set user ID
    plan.userId = user.id

    // Store the plan in the database if applicationId is provided
    if (body.applicationId) {
      // Use type assertion to bypass strict typing for extended fields
      // The actual database schema supports these fields
      const { error: updateError } = await supabase
        .from('job_applications')
        .update({
          interview_prep_notes: JSON.stringify(plan),
          updated_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq('id', body.applicationId)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Error storing interview plan:', updateError)
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({
      success: true,
      plan,
    })
  } catch (error) {
    console.error('Error generating interview plan:', error)

    // Check for specific error types
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON', details: 'Request body is not valid JSON' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to generate interview plan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/interview/generate-plan
 * Retrieve the stored interview plan for an application
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const applicationId = searchParams.get('applicationId')

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Missing applicationId parameter' },
        { status: 400 }
      )
    }

    // Use type assertion for extended fields not in strict types
    const { data: application, error } = await supabase
      .from('job_applications')
      .select('interview_prep_notes')
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .single() as { data: { interview_prep_notes?: string } | null; error: unknown }

    if (error) {
      return NextResponse.json(
        { error: 'Application not found', details: String(error) },
        { status: 404 }
      )
    }

    if (!application?.interview_prep_notes) {
      return NextResponse.json({
        success: true,
        plan: null,
      })
    }

    // Parse the stored plan
    let plan: InterviewPlan
    try {
      plan =
        typeof application.interview_prep_notes === 'string'
          ? JSON.parse(application.interview_prep_notes)
          : application.interview_prep_notes
    } catch {
      return NextResponse.json({
        success: true,
        plan: null,
      })
    }

    return NextResponse.json({
      success: true,
      plan,
    })
  } catch (error) {
    console.error('Error fetching interview plan:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch interview plan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
