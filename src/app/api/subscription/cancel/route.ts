/**
 * Subscription Cancel API
 *
 * Cancels the current user's subscription.
 * Subscription remains active until the end of the current billing period.
 *
 * @route POST /api/subscription/cancel
 */

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { cancelSubscription, getSubscription } from '@/lib/subscription/subscription-manager'
import { TIER_CONFIGS } from '@/lib/subscription/config'

export async function POST() {
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

    // Get service client for subscription operations
    const serviceClient = createServiceClient()

    // Get current subscription for tier name
    const subscription = await getSubscription(serviceClient, user.id)
    const tierName = subscription?.tier ? TIER_CONFIGS[subscription.tier].name : 'Unknown'

    // Cancel subscription
    const result = await cancelSubscription(serviceClient, user.id)

    // Format the effective date for display
    const effectiveDate = new Date(result.cancellationEffectiveAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    return NextResponse.json({
      success: true,
      cancellationEffectiveAt: result.cancellationEffectiveAt,
      message: `Your ${tierName} subscription will remain active until ${effectiveDate}.`,
    })
  } catch (error) {
    console.error('[Subscription Cancel] Error:', error)

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('No subscription found')) {
        return NextResponse.json(
          { error: 'No active subscription found' },
          { status: 404 }
        )
      }
      if (error.message.includes('already cancelled')) {
        return NextResponse.json(
          { error: 'Subscription is already cancelled' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
