/**
 * Compensation Strategy Generation API
 *
 * POST /api/compensation/generate-strategy
 * Generates a personalized negotiation strategy based on offer details and user priorities.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateNegotiationStrategy } from '@/lib/compensation'
import { checkUsageLimit, incrementUsage } from '@/lib/subscription/access-control'
import type { GenerateStrategyRequest, CompensationStrategy } from '@/types/compensation'

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

    // SPLIT PATTERN: Check usage limit first
    const serviceSupabase = createServiceClient()
    const limitCheck = await checkUsageLimit(serviceSupabase, user.id, 'compensation')
    if (!limitCheck.allowed) {
      if (limitCheck.reason === 'NO_SUBSCRIPTION') {
        return NextResponse.json({ error: 'Subscription required', ...limitCheck }, { status: 402 })
      }
      return NextResponse.json({ error: 'Usage limit reached', ...limitCheck }, { status: 403 })
    }

    // Parse request body
    const body: GenerateStrategyRequest = await request.json()

    // Validate required fields
    if (!body.offerDetails || !body.userPriorities) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: 'offerDetails and userPriorities are required',
        },
        { status: 400 }
      )
    }

    // Validate offer details
    const { offerDetails } = body
    if (!offerDetails.baseSalary || offerDetails.baseSalary <= 0) {
      return NextResponse.json(
        { error: 'Invalid offer', details: 'baseSalary must be a positive number' },
        { status: 400 }
      )
    }

    if (!offerDetails.currency) {
      return NextResponse.json(
        { error: 'Invalid offer', details: 'currency is required' },
        { status: 400 }
      )
    }

    if (!offerDetails.roleTitle || !offerDetails.roleLevel) {
      return NextResponse.json(
        { error: 'Invalid offer', details: 'roleTitle and roleLevel are required' },
        { status: 400 }
      )
    }

    if (!offerDetails.location) {
      return NextResponse.json(
        { error: 'Invalid offer', details: 'location is required' },
        { status: 400 }
      )
    }

    if (!offerDetails.companyName) {
      return NextResponse.json(
        { error: 'Invalid offer', details: 'companyName is required' },
        { status: 400 }
      )
    }

    // Validate user priorities
    const { userPriorities } = body
    if (!userPriorities.primaryFocus) {
      return NextResponse.json(
        { error: 'Invalid priorities', details: 'primaryFocus is required' },
        { status: 400 }
      )
    }

    if (typeof userPriorities.willingToWalkAway !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid priorities', details: 'willingToWalkAway must be a boolean' },
        { status: 400 }
      )
    }

    // Generate the compensation strategy
    const strategy: CompensationStrategy = await generateNegotiationStrategy(
      user.id,
      offerDetails,
      userPriorities,
      body.jobApplicationId
    )

    // Store the strategy in the database if applicationId is provided
    if (body.jobApplicationId) {
      // Use type assertion to bypass strict typing for extended fields
      const { error: updateError } = await supabase
        .from('job_applications')
        .update({
          compensation_strategy: JSON.stringify(strategy),
          updated_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq('id', body.jobApplicationId)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Error storing compensation strategy:', updateError)
        // Don't fail the request, just log the error
      }
    }

    // SPLIT PATTERN: Increment usage after successful creation
    await incrementUsage(serviceSupabase, user.id, 'compensation')

    return NextResponse.json({
      success: true,
      strategy,
    })
  } catch (error) {
    console.error('Error generating compensation strategy:', error)

    // Check for specific error types
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON', details: 'Request body is not valid JSON' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to generate compensation strategy',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/compensation/generate-strategy
 * Retrieve the stored compensation strategy for an application
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
      .select('compensation_strategy')
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .single() as { data: { compensation_strategy?: string } | null; error: unknown }

    if (error) {
      return NextResponse.json(
        { error: 'Application not found', details: String(error) },
        { status: 404 }
      )
    }

    if (!application?.compensation_strategy) {
      return NextResponse.json({
        success: true,
        strategy: null,
      })
    }

    // Parse the stored strategy
    let strategy: CompensationStrategy
    try {
      strategy =
        typeof application.compensation_strategy === 'string'
          ? JSON.parse(application.compensation_strategy)
          : application.compensation_strategy
    } catch {
      return NextResponse.json({
        success: true,
        strategy: null,
      })
    }

    return NextResponse.json({
      success: true,
      strategy,
    })
  } catch (error) {
    console.error('Error fetching compensation strategy:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch compensation strategy',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
