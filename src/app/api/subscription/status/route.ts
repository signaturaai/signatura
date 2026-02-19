/**
 * Subscription Status API
 *
 * Returns the current user's subscription status.
 *
 * @route GET /api/subscription/status
 */

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getSubscriptionStatus } from '@/lib/subscription/access-control'

export async function GET() {
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

    // Get subscription status using service client
    const serviceClient = createServiceClient()
    const status = await getSubscriptionStatus(serviceClient, user.id)

    return NextResponse.json(status)
  } catch (error) {
    console.error('[Subscription Status] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
