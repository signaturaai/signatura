/**
 * Subscription Initiate API
 *
 * Initiates a new subscription payment via Grow.
 *
 * @route POST /api/subscription/initiate
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createRecurringPayment } from '@/lib/subscription/grow-adapter'
import { TIER_ORDER, BILLING_PERIODS } from '@/lib/subscription/config'
import type { SubscriptionTier, BillingPeriod } from '@/types/subscription'

// Request body schema
const initiateSchema = z.object({
  tier: z.enum(['momentum', 'accelerate', 'elite'] as const),
  billingPeriod: z.enum(['monthly', 'quarterly', 'yearly'] as const),
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
    const parseResult = initiateSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.errors },
        { status: 400 }
      )
    }

    const { tier, billingPeriod } = parseResult.data

    // Get base URL for callbacks
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''

    // Create recurring payment with Grow
    const result = await createRecurringPayment({
      tier,
      billingPeriod,
      userId: user.id,
      email: user.email,
      notifyUrl: `${origin}/api/webhooks/grow`,
      successUrl: `${origin}/dashboard/subscription?success=true`,
      cancelUrl: `${origin}/dashboard/subscription?cancelled=true`,
    })

    if (!result.success) {
      console.error('[Subscription Initiate] Grow error:', result.error)
      return NextResponse.json(
        { error: 'Failed to create payment', details: result.error },
        { status: 500 }
      )
    }

    // Set pending tier and billing period on subscription record
    const serviceClient = createServiceClient()
    await serviceClient
      .from('user_subscriptions')
      .upsert({
        user_id: user.id,
        pending_tier: tier,
        pending_billing_period: billingPeriod,
      }, {
        onConflict: 'user_id',
      })

    return NextResponse.json({
      success: true,
      paymentUrl: result.paymentUrl,
    })
  } catch (error) {
    console.error('[Subscription Initiate] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
