/**
 * Subscription Manager
 *
 * Server-only module for managing subscription lifecycle operations.
 * Uses date-fns for date math and requires a Supabase service-role client.
 *
 * CRITICAL BUSINESS RULES:
 * - Upgrades are IMMEDIATE (counters NOT reset, period dates NOT changed)
 * - Downgrades are SCHEDULED for end of billing cycle
 * - Double-reset prevention: check last_reset_at >= current_period_start
 *
 * @module subscription-manager
 * @server-only
 */

import { differenceInCalendarDays, addMonths, parseISO, isBefore } from 'date-fns'
import { getPrice, getPeriodEndDate, isUpgrade, isDowngrade, GRACE_PERIOD_DAYS } from './config'
import type { SubscriptionTier, BillingPeriod, SubscriptionStatus } from '@/types/subscription'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// ============================================================================
// Types
// ============================================================================

type ServiceClient = SupabaseClient<Database>

export interface UserSubscription {
  id: string
  userId: string
  tier: SubscriptionTier | null
  billingPeriod: BillingPeriod | null
  status: SubscriptionStatus
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelledAt: string | null
  cancellationEffectiveAt: string | null
  scheduledTierChange: SubscriptionTier | null
  scheduledBillingPeriodChange: BillingPeriod | null
  growTransactionToken: string | null
  growRecurringId: string | null
  growLastTransactionCode: string | null
  morningCustomerId: string | null
  usageApplications: number
  usageCvs: number
  usageInterviews: number
  usageCompensation: number
  usageContracts: number
  usageAiAvatarInterviews: number
  lastResetAt: string | null
  createdAt: string
  updatedAt: string
}

export interface GrowPaymentData {
  transactionToken?: string
  recurringId?: string
  transactionCode?: string
}

export interface UpgradeResult {
  proratedAmount: number
}

export interface DowngradeResult {
  effectiveDate: string
}

export interface CancelResult {
  cancellationEffectiveAt: string
}

export interface ExpirationResult {
  expired: number
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert database row to UserSubscription interface
 */
function toUserSubscription(row: Database['public']['Tables']['user_subscriptions']['Row']): UserSubscription {
  return {
    id: row.id,
    userId: row.user_id,
    tier: row.tier as SubscriptionTier | null,
    billingPeriod: row.billing_period as BillingPeriod | null,
    status: row.status as SubscriptionStatus,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    cancelledAt: row.cancelled_at,
    cancellationEffectiveAt: (row as Record<string, unknown>).cancellation_effective_at as string | null,
    scheduledTierChange: (row as Record<string, unknown>).scheduled_tier_change as SubscriptionTier | null,
    scheduledBillingPeriodChange: (row as Record<string, unknown>).scheduled_billing_period_change as BillingPeriod | null,
    growTransactionToken: (row as Record<string, unknown>).grow_transaction_token as string | null,
    growRecurringId: (row as Record<string, unknown>).grow_recurring_id as string | null,
    growLastTransactionCode: (row as Record<string, unknown>).grow_last_transaction_code as string | null,
    morningCustomerId: (row as Record<string, unknown>).morning_customer_id as string | null,
    usageApplications: row.usage_applications,
    usageCvs: row.usage_cvs,
    usageInterviews: row.usage_interviews,
    usageCompensation: row.usage_compensation,
    usageContracts: row.usage_contracts,
    usageAiAvatarInterviews: row.usage_ai_avatar_interviews,
    lastResetAt: row.last_reset_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Log a subscription event to the audit trail
 */
async function logSubscriptionEvent(
  supabase: ServiceClient,
  userId: string,
  eventType: string,
  metadata: Record<string, unknown> = {},
  previousTier?: SubscriptionTier | null,
  newTier?: SubscriptionTier | null,
  previousBillingPeriod?: BillingPeriod | null,
  newBillingPeriod?: BillingPeriod | null,
  amountPaid?: number
): Promise<void> {
  const { error } = await supabase.from('subscription_events').insert({
    user_id: userId,
    event_type: eventType,
    event_data: metadata,
    previous_tier: previousTier,
    new_tier: newTier,
    previous_billing_period: previousBillingPeriod,
    new_billing_period: newBillingPeriod,
    amount_paid: amountPaid,
    currency: amountPaid ? 'USD' : null,
  })

  if (error) {
    console.error('Failed to log subscription event:', error)
  }
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get a user's subscription
 *
 * @returns UserSubscription or null if no row exists
 */
export async function getSubscription(
  supabase: ServiceClient,
  userId: string
): Promise<UserSubscription | null> {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No row found
      return null
    }
    throw new Error(`Failed to get subscription: ${error.message}`)
  }

  return toUserSubscription(data)
}

/**
 * Activate a subscription (new subscription or payment confirmation)
 *
 * - Sets tier, billingPeriod, status='active'
 * - Sets period dates
 * - Resets ALL 6 usage counters to 0
 * - Clears scheduled changes and cancellation
 */
export async function activateSubscription(
  supabase: ServiceClient,
  userId: string,
  tier: SubscriptionTier,
  billingPeriod: BillingPeriod,
  growData: GrowPaymentData = {}
): Promise<void> {
  const now = new Date()
  const periodEnd = getPeriodEndDate(now, billingPeriod)

  const updateData: Record<string, unknown> = {
    tier,
    billing_period: billingPeriod,
    status: 'active',
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    // Reset all usage counters
    usage_applications: 0,
    usage_cvs: 0,
    usage_interviews: 0,
    usage_compensation: 0,
    usage_contracts: 0,
    usage_ai_avatar_interviews: 0,
    last_reset_at: now.toISOString(),
    // Clear pending/scheduled/cancellation state
    pending_tier: null,
    pending_billing_period: null,
    scheduled_tier_change: null,
    scheduled_billing_period_change: null,
    cancelled_at: null,
    cancellation_effective_at: null,
  }

  // Add Grow payment data if provided
  if (growData.transactionToken) {
    updateData.grow_transaction_token = growData.transactionToken
  }
  if (growData.recurringId) {
    updateData.grow_recurring_id = growData.recurringId
  }
  if (growData.transactionCode) {
    updateData.grow_last_transaction_code = growData.transactionCode
  }

  const { error } = await supabase
    .from('user_subscriptions')
    .upsert({
      user_id: userId,
      ...updateData,
    }, {
      onConflict: 'user_id',
    })

  if (error) {
    throw new Error(`Failed to activate subscription: ${error.message}`)
  }

  await logSubscriptionEvent(
    supabase,
    userId,
    'payment_success',
    { tier, billingPeriod, ...growData },
    null,
    tier,
    null,
    billingPeriod
  )
}

/**
 * Renew a subscription at end of billing period
 *
 * - Applies scheduled tier/period changes (downgrades take effect here)
 * - DOUBLE-RESET PREVENTION: only reset counters if last_reset_at < current_period_start
 * - Updates period dates
 */
export async function renewSubscription(
  supabase: ServiceClient,
  userId: string,
  transactionCode: string
): Promise<void> {
  const subscription = await getSubscription(supabase, userId)
  if (!subscription) {
    throw new Error('No subscription found for user')
  }

  if (!subscription.tier || !subscription.billingPeriod) {
    throw new Error('Subscription has no tier or billing period')
  }

  const now = new Date()

  // Determine new tier and billing period (apply scheduled changes)
  const newTier = subscription.scheduledTierChange || subscription.tier
  const newBillingPeriod = subscription.scheduledBillingPeriodChange || subscription.billingPeriod
  const periodEnd = getPeriodEndDate(now, newBillingPeriod)

  // DOUBLE-RESET PREVENTION
  // Only reset counters if we haven't already reset for this period
  const shouldResetCounters =
    !subscription.lastResetAt ||
    !subscription.currentPeriodStart ||
    isBefore(parseISO(subscription.lastResetAt), parseISO(subscription.currentPeriodStart))

  const updateData: Record<string, unknown> = {
    tier: newTier,
    billing_period: newBillingPeriod,
    status: 'active',
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    grow_last_transaction_code: transactionCode,
    // Clear scheduled changes
    scheduled_tier_change: null,
    scheduled_billing_period_change: null,
  }

  if (shouldResetCounters) {
    updateData.usage_applications = 0
    updateData.usage_cvs = 0
    updateData.usage_interviews = 0
    updateData.usage_compensation = 0
    updateData.usage_contracts = 0
    updateData.usage_ai_avatar_interviews = 0
    updateData.last_reset_at = now.toISOString()
  }

  const { error } = await supabase
    .from('user_subscriptions')
    .update(updateData)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to renew subscription: ${error.message}`)
  }

  await logSubscriptionEvent(
    supabase,
    userId,
    'renewed',
    {
      transactionCode,
      scheduledTierApplied: subscription.scheduledTierChange,
      scheduledPeriodApplied: subscription.scheduledBillingPeriodChange,
      countersReset: shouldResetCounters,
    },
    subscription.tier,
    newTier,
    subscription.billingPeriod,
    newBillingPeriod
  )
}

/**
 * Upgrade a subscription to a higher tier
 *
 * UPGRADE RULES:
 * - Validates it's actually an upgrade
 * - Calculates prorated charge
 * - Updates tier IMMEDIATELY
 * - Does NOT change: period dates, billing period
 * - Does NOT reset usage counters or last_reset_at
 *
 * @returns { proratedAmount } - caller handles Grow charge
 */
export async function upgradeSubscription(
  supabase: ServiceClient,
  userId: string,
  newTier: SubscriptionTier
): Promise<UpgradeResult> {
  const subscription = await getSubscription(supabase, userId)
  if (!subscription) {
    throw new Error('No subscription found for user')
  }

  if (!subscription.tier || !subscription.billingPeriod) {
    throw new Error('Subscription has no tier or billing period')
  }

  if (!subscription.currentPeriodStart || !subscription.currentPeriodEnd) {
    throw new Error('Subscription has no period dates')
  }

  // Validate it's actually an upgrade
  if (!isUpgrade(subscription.tier, newTier)) {
    throw new Error(`${newTier} is not an upgrade from ${subscription.tier}`)
  }

  // Calculate prorated charge
  const periodStart = parseISO(subscription.currentPeriodStart)
  const periodEnd = parseISO(subscription.currentPeriodEnd)
  const today = new Date()

  const remainingDays = differenceInCalendarDays(periodEnd, today)
  const totalDays = differenceInCalendarDays(periodEnd, periodStart)

  const oldPrice = getPrice(subscription.tier, subscription.billingPeriod)
  const newPrice = getPrice(newTier, subscription.billingPeriod)

  let proratedAmount = 0
  if (totalDays > 0 && remainingDays > 0) {
    proratedAmount = Math.round(((newPrice - oldPrice) / totalDays) * remainingDays * 100) / 100
  }

  // Update tier IMMEDIATELY - no other changes
  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      tier: newTier,
      // Clear any scheduled tier change since we're upgrading now
      scheduled_tier_change: null,
    })
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to upgrade subscription: ${error.message}`)
  }

  await logSubscriptionEvent(
    supabase,
    userId,
    'upgraded',
    {
      previousTier: subscription.tier,
      newTier,
      proratedAmount,
      remainingDays,
      totalDays,
    },
    subscription.tier,
    newTier
  )

  return { proratedAmount }
}

/**
 * Schedule a downgrade for end of billing period
 *
 * DOWNGRADE RULES:
 * - Validates it's actually a downgrade
 * - Sets scheduledTierChange - does NOT change current tier
 * - Does NOT change limits, features, or counters
 *
 * @returns { effectiveDate } - when downgrade will take effect
 */
export async function scheduleDowngrade(
  supabase: ServiceClient,
  userId: string,
  targetTier: SubscriptionTier
): Promise<DowngradeResult> {
  const subscription = await getSubscription(supabase, userId)
  if (!subscription) {
    throw new Error('No subscription found for user')
  }

  if (!subscription.tier) {
    throw new Error('Subscription has no tier')
  }

  if (!subscription.currentPeriodEnd) {
    throw new Error('Subscription has no period end date')
  }

  // Validate it's actually a downgrade
  if (!isDowngrade(subscription.tier, targetTier)) {
    throw new Error(`${targetTier} is not a downgrade from ${subscription.tier}`)
  }

  // Schedule the downgrade
  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      scheduled_tier_change: targetTier,
    })
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to schedule downgrade: ${error.message}`)
  }

  await logSubscriptionEvent(
    supabase,
    userId,
    'downgrade_scheduled',
    {
      currentTier: subscription.tier,
      scheduledTier: targetTier,
      effectiveDate: subscription.currentPeriodEnd,
    },
    subscription.tier,
    targetTier
  )

  return { effectiveDate: subscription.currentPeriodEnd }
}

/**
 * Cancel a scheduled tier or billing period change
 */
export async function cancelScheduledChange(
  supabase: ServiceClient,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      scheduled_tier_change: null,
      scheduled_billing_period_change: null,
    })
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to cancel scheduled change: ${error.message}`)
  }

  await logSubscriptionEvent(supabase, userId, 'scheduled_change_cancelled')
}

/**
 * Cancel a subscription
 *
 * CANCELLATION RULES:
 * - status → 'cancelled', cancelledAt → now
 * - cancellationEffectiveAt → currentPeriodEnd
 * - Subscription stays fully active until period end
 * - No partial refunds
 *
 * @returns { cancellationEffectiveAt }
 */
export async function cancelSubscription(
  supabase: ServiceClient,
  userId: string
): Promise<CancelResult> {
  const subscription = await getSubscription(supabase, userId)
  if (!subscription) {
    throw new Error('No subscription found for user')
  }

  if (!subscription.tier) {
    throw new Error('No active subscription to cancel')
  }

  if (subscription.status === 'cancelled') {
    throw new Error('Subscription is already cancelled')
  }

  if (!subscription.currentPeriodEnd) {
    throw new Error('Subscription has no period end date')
  }

  const now = new Date()
  const cancellationEffectiveAt = subscription.currentPeriodEnd

  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: now.toISOString(),
      cancellation_effective_at: cancellationEffectiveAt,
    })
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to cancel subscription: ${error.message}`)
  }

  await logSubscriptionEvent(
    supabase,
    userId,
    'cancelled',
    {
      cancellationEffectiveAt,
      // TODO: Cancel Grow recurring payment
    },
    subscription.tier,
    null
  )

  return { cancellationEffectiveAt }
}

/**
 * Handle payment failure
 *
 * Sets status to 'past_due'
 */
export async function handlePaymentFailure(
  supabase: ServiceClient,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      status: 'past_due',
    })
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to handle payment failure: ${error.message}`)
  }

  await logSubscriptionEvent(supabase, userId, 'payment_failed')
}

/**
 * Process expired subscriptions
 *
 * - Cancelled subs where cancellationEffectiveAt < now → expired
 * - Past_due subs where updated_at + GRACE_PERIOD_DAYS < now → expired
 *
 * @returns { expired } - count of subscriptions expired
 */
export async function processExpirations(
  supabase: ServiceClient
): Promise<ExpirationResult> {
  const now = new Date()
  let expiredCount = 0

  // 1. Find cancelled subscriptions past their effective date
  const { data: cancelledSubs, error: cancelledError } = await supabase
    .from('user_subscriptions')
    .select('user_id, cancellation_effective_at')
    .eq('status', 'cancelled')
    .not('cancellation_effective_at', 'is', null)

  if (cancelledError) {
    throw new Error(`Failed to fetch cancelled subscriptions: ${cancelledError.message}`)
  }

  if (cancelledSubs) {
    for (const sub of cancelledSubs) {
      const effectiveAt = (sub as Record<string, unknown>).cancellation_effective_at as string
      if (effectiveAt && isBefore(parseISO(effectiveAt), now)) {
        const { error } = await supabase
          .from('user_subscriptions')
          .update({ status: 'expired' })
          .eq('user_id', sub.user_id)

        if (!error) {
          expiredCount++
          await logSubscriptionEvent(supabase, sub.user_id, 'expired', {
            reason: 'cancellation_effective_date_passed',
          })
        }
      }
    }
  }

  // 2. Find past_due subscriptions past grace period
  const gracePeriodCutoff = new Date(now.getTime() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000)

  const { data: pastDueSubs, error: pastDueError } = await supabase
    .from('user_subscriptions')
    .select('user_id, updated_at')
    .eq('status', 'past_due')

  if (pastDueError) {
    throw new Error(`Failed to fetch past_due subscriptions: ${pastDueError.message}`)
  }

  if (pastDueSubs) {
    for (const sub of pastDueSubs) {
      if (isBefore(parseISO(sub.updated_at), gracePeriodCutoff)) {
        const { error } = await supabase
          .from('user_subscriptions')
          .update({ status: 'expired' })
          .eq('user_id', sub.user_id)

        if (!error) {
          expiredCount++
          await logSubscriptionEvent(supabase, sub.user_id, 'expired', {
            reason: 'grace_period_exceeded',
          })
        }
      }
    }
  }

  return { expired: expiredCount }
}
