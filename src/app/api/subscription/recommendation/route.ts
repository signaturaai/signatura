/**
 * Subscription Recommendation API
 *
 * Returns a tier recommendation based on the user's usage history.
 *
 * @route GET /api/subscription/recommendation
 */

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUsageAverages, getRecommendation } from '@/lib/subscription/recommendation-engine'
import { getSubscription } from '@/lib/subscription/subscription-manager'
import { isUpgrade, isDowngrade } from '@/lib/subscription/config'

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

    const serviceClient = createServiceClient()

    // Get usage averages and recommendation
    const averages = await getUsageAverages(serviceClient, user.id)
    const recommendation = getRecommendation(averages)

    // Get current subscription
    const subscription = await getSubscription(serviceClient, user.id)
    const currentTier = subscription?.tier || null

    // Determine relationship to current plan
    const isCurrentPlan = currentTier === recommendation.recommendedTier
    const isUpgradeRecommendation = currentTier ? isUpgrade(currentTier, recommendation.recommendedTier) : false
    const isDowngradeRecommendation = currentTier ? isDowngrade(currentTier, recommendation.recommendedTier) : false

    return NextResponse.json({
      recommendation,
      currentTier,
      isCurrentPlan,
      isUpgrade: isUpgradeRecommendation,
      isDowngrade: isDowngradeRecommendation,
    })
  } catch (error) {
    console.error('[Recommendation] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
