/**
 * Check Usage Limit API
 *
 * Checks if the current user is within usage limits for a resource.
 * Does NOT increment usage - use this for checking before action.
 *
 * @route POST /api/subscription/check-limit
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { checkUsageLimit, type ResourceKey } from '@/lib/subscription/access-control'

// Valid resource keys
const RESOURCE_KEYS = [
  'applications',
  'cvs',
  'interviews',
  'compensation',
  'contracts',
  'aiAvatarInterviews',
] as const

// Request body schema
const checkLimitSchema = z.object({
  resource: z.enum(RESOURCE_KEYS),
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
    const parseResult = checkLimitSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.errors },
        { status: 400 }
      )
    }

    const { resource } = parseResult.data

    // Check usage limit using service client
    const serviceClient = createServiceClient()
    const result = await checkUsageLimit(serviceClient, user.id, resource as ResourceKey)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Check Limit] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
