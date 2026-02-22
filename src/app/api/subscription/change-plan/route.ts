/**
 * Subscription Change Plan API
 *
 * Handles upgrades, downgrades, and billing period changes.
 *
 * Scenarios:
 * A. UPGRADE - Immediate tier change with prorated charge
 * B. DOWNGRADE - Scheduled for end of billing period
 * C. CANCEL SCHEDULED CHANGE - When targetTier equals currentTier
 * D. BILLING PERIOD CHANGE - Scheduled for next renewal
 *
 * @route POST /api/subscription/change-plan
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  getSubscription,
  upgradeSubscription,
  scheduleDowngrade,
  cancelScheduledChange,
} from '@/lib/subscription/subscription-manager'
import { createOneTimeCharge } from '@/lib/subscription/grow-adapter'
import { isUpgrade, isDowngrade, TIER_CONFIGS } from '@/lib/subscription/config'
import type { SubscriptionTier, BillingPeriod } from '@/types/subscription'

// Request body schema
const changePlanSchema = z.object({
  targetTier: z.enum(['momentum', 'accelerate', 'elite'] as const),
  targetBillingPeriod: z.enum(['monthly', 'quarterly', 'yearly'] as const).optional(),
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
    const parseResult = changePlanSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.issues },
        { status: 400 }
      )
    }

    const { targetTier, targetBillingPeriod } = parseResult.data
    const serviceClient = createServiceClient()

    // Get current subscription
    const subscription = await getSubscription(serviceClient, user.id)

    if (!subscription || !subscription.tier) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      )
    }

    const currentTier = subscription.tier
    const currentBillingPeriod = subscription.billingPeriod

    // Scenario C: Cancel scheduled change
    if (targetTier === currentTier && subscription.scheduledTierChange) {
      await cancelScheduledChange(serviceClient, user.id)
      return NextResponse.json({
        success: true,
        message: 'Scheduled change cancelled.',
      })
    }

    // Scenario A: Upgrade
    if (isUpgrade(currentTier, targetTier)) {
      const result = await upgradeSubscription(serviceClient, user.id, targetTier)

      // If prorated amount > 0, charge stored card
      if (result.proratedAmount > 0 && subscription.growTransactionToken) {
        const chargeResult = await createOneTimeCharge({
          amount: result.proratedAmount,
          description: `Upgrade to ${TIER_CONFIGS[targetTier].name}`,
          userId: user.id,
          transactionToken: subscription.growTransactionToken,
        })

        if (!chargeResult.success) {
          console.error('[Change Plan] Failed to charge prorated amount:', chargeResult.error)
          // Note: Upgrade already happened, log error but don't fail
        }
      } else if (result.proratedAmount > 0 && !subscription.growTransactionToken) {
        // No stored token - would need one-time payment page
        // For now, we've already upgraded, just note the amount
        console.warn('[Change Plan] Prorated charge needed but no token stored')
      }

      return NextResponse.json({
        success: true,
        immediate: true,
        proratedAmount: result.proratedAmount,
        newTier: targetTier,
      })
    }

    // Scenario B: Downgrade
    if (isDowngrade(currentTier, targetTier)) {
      const result = await scheduleDowngrade(serviceClient, user.id, targetTier)
      const effectiveDate = new Date(result.effectiveDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      return NextResponse.json({
        success: true,
        immediate: false,
        effectiveDate: result.effectiveDate,
        message: `Your downgrade to ${TIER_CONFIGS[targetTier].name} will take effect on ${effectiveDate}.`,
      })
    }

    // Scenario D: Billing period change (same tier, different period)
    if (targetTier === currentTier && targetBillingPeriod && targetBillingPeriod !== currentBillingPeriod) {
      await serviceClient
        .from('user_subscriptions')
        .update({
          scheduled_billing_period: targetBillingPeriod,
        })
        .eq('user_id', user.id)

      return NextResponse.json({
        success: true,
        immediate: false,
        effectiveDate: subscription.currentPeriodEnd,
        message: `Your billing period will change to ${targetBillingPeriod} at your next renewal.`,
      })
    }

    // No change needed
    return NextResponse.json({
      success: true,
      message: 'No changes needed. You are already on this plan.',
    })
  } catch (error) {
    console.error('[Change Plan] Error:', error)

    if (error instanceof Error) {
      if (error.message.includes('not an upgrade')) {
        return NextResponse.json(
          { error: 'Invalid upgrade path' },
          { status: 400 }
        )
      }
      if (error.message.includes('not a downgrade')) {
        return NextResponse.json(
          { error: 'Invalid downgrade path' },
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
