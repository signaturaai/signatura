/**
 * Increment Usage API
 *
 * Increments usage counter for a resource.
 * ALWAYS runs regardless of kill switch (silent tracking).
 *
 * This is the second part of the SPLIT PATTERN:
 * 1. Client calls check-limit first
 * 2. If allowed and action succeeds, client calls this to increment
 *
 * @route POST /api/subscription/increment-usage
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { incrementUsage, type ResourceKey } from '@/lib/subscription/access-control'

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
const incrementSchema = z.object({
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
    const parseResult = incrementSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.errors },
        { status: 400 }
      )
    }

    const { resource } = parseResult.data

    // Increment usage using service client
    // This ALWAYS runs regardless of kill switch
    const serviceClient = createServiceClient()
    const result = await incrementUsage(serviceClient, user.id, resource as ResourceKey)

    return NextResponse.json({
      success: true,
      newCount: result.newCount,
    })
  } catch (error) {
    console.error('[Increment Usage] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
