/**
 * Check Feature Access API
 *
 * Checks if the current user has access to a specific feature.
 *
 * @route POST /api/subscription/check-access
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { checkFeatureAccess, type FeatureKey } from '@/lib/subscription/access-control'

// Valid feature keys
const FEATURE_KEYS = [
  'applicationTracker',
  'tailoredCvs',
  'interviewCoach',
  'compensationSessions',
  'contractReviews',
  'aiAvatarInterviews',
] as const

// Request body schema
const checkAccessSchema = z.object({
  feature: z.enum(FEATURE_KEYS),
})

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate body
    const body = await request.json()
    const parseResult = checkAccessSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.issues },
        { status: 400 }
      )
    }

    const { feature } = parseResult.data

    // Check feature access using service client
    const serviceClient = createServiceClient()
    const result = await checkFeatureAccess(serviceClient, user.id, feature as FeatureKey)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Check Access] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
