/**
 * Access Control Module
 *
 * Server-only module for checking feature access and usage limits.
 * EVERY function checks isSubscriptionEnabled() FIRST.
 *
 * When kill switch is OFF (SUBSCRIPTION_ENABLED=false):
 * - All features are allowed
 * - All usage is unlimited
 * - Usage tracking still happens silently
 *
 * @module access-control
 * @server-only
 */

import { differenceInCalendarDays, parseISO, startOfMonth, format } from 'date-fns'
import {
  isSubscriptionEnabled,
  getTierConfig,
  GRACE_PERIOD_DAYS,
  type TierFeatures,
} from './config'
import type { SubscriptionTier, BillingPeriod, SubscriptionStatus, TierLimits } from '@/types/subscription'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// ============================================================================
// Types
// ============================================================================

type ServiceClient = SupabaseClient<Database>

/**
 * Feature keys that map to TierFeatures
 */
export type FeatureKey = keyof TierFeatures

/**
 * Resource keys that map to usage counters
 */
export type ResourceKey = keyof TierLimits

/**
 * Result of checking feature access
 */
export interface FeatureAccessCheck {
  allowed: boolean
  enforced: boolean
  reason?: 'NO_SUBSCRIPTION' | 'FEATURE_NOT_INCLUDED' | 'SUBSCRIPTION_EXPIRED' | 'PAST_DUE_GRACE_EXCEEDED'
  tier?: SubscriptionTier | null
}

/**
 * Result of checking usage limits
 */
export interface UsageLimitCheck {
  allowed: boolean
  enforced: boolean
  unlimited: boolean
  reason?: 'NO_SUBSCRIPTION' | 'LIMIT_EXCEEDED' | 'SUBSCRIPTION_EXPIRED' | 'PAST_DUE_GRACE_EXCEEDED'
  used?: number
  limit?: number
  remaining?: number
  tier?: SubscriptionTier | null
}

/**
 * Result of incrementing usage
 */
export interface IncrementResult {
  newCount: number
}

/**
 * Usage summary for a single resource
 */
export interface UsageSummary {
  used: number
  limit: number
  remaining: number
  percentUsed: number
  unlimited: boolean
}

/**
 * Full subscription status response
 */
export interface SubscriptionStatusResponse {
  subscriptionEnabled: boolean
  hasSubscription: boolean
  tier: SubscriptionTier | null
  billingPeriod: BillingPeriod | null
  status: SubscriptionStatus | null
  usage: Record<ResourceKey, UsageSummary>
  features: TierFeatures | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelledAt: string | null
  cancellationEffectiveAt: string | null
  scheduledTierChange: SubscriptionTier | null
  scheduledBillingPeriodChange: BillingPeriod | null
  isCancelled: boolean
  isPastDue: boolean
  isExpired: boolean
  canUpgrade: boolean
  canDowngrade: boolean
}

// ============================================================================
// Resource Mapping
// ============================================================================

/**
 * Maps resource keys to database column names
 */
const RESOURCE_TO_COLUMN: Record<ResourceKey, string> = {
  applications: 'usage_applications',
  cvs: 'usage_cvs',
  interviews: 'usage_interviews',
  compensation: 'usage_compensation',
  contracts: 'usage_contracts',
  aiAvatarInterviews: 'usage_ai_avatar_interviews',
}

/**
 * Maps feature keys to resource keys (for usage-based features)
 */
const FEATURE_TO_RESOURCE: Record<FeatureKey, ResourceKey> = {
  applicationTracker: 'applications',
  tailoredCvs: 'cvs',
  interviewCoach: 'interviews',
  compensationSessions: 'compensation',
  contractReviews: 'contracts',
  aiAvatarInterviews: 'aiAvatarInterviews',
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get subscription row from database
 */
async function getSubscriptionRow(
  supabase: ServiceClient,
  userId: string
): Promise<Database['public']['Tables']['user_subscriptions']['Row'] | null> {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Database error: ${error.message}`)
  }

  return data
}

/**
 * Check if subscription is in grace period or beyond
 */
function checkGracePeriod(
  status: SubscriptionStatus,
  currentPeriodEnd: string | null,
  cancellationEffectiveAt: string | null
): { inGrace: boolean; beyondGrace: boolean } {
  const now = new Date()

  if (status === 'past_due' && currentPeriodEnd) {
    const periodEnd = parseISO(currentPeriodEnd)
    const daysPastDue = differenceInCalendarDays(now, periodEnd)
    return {
      inGrace: daysPastDue >= 0 && daysPastDue <= GRACE_PERIOD_DAYS,
      beyondGrace: daysPastDue > GRACE_PERIOD_DAYS,
    }
  }

  if (status === 'cancelled' && cancellationEffectiveAt) {
    const effectiveAt = parseISO(cancellationEffectiveAt)
    return {
      inGrace: false,
      beyondGrace: now >= effectiveAt,
    }
  }

  if (status === 'expired') {
    return { inGrace: false, beyondGrace: true }
  }

  return { inGrace: false, beyondGrace: false }
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Check if a user has access to a specific feature
 *
 * Decision tree:
 * a. Kill switch OFF → { allowed: true, enforced: false }
 * b. Kill switch ON + tier is NULL → { allowed: false, enforced: true, reason: 'NO_SUBSCRIPTION' }
 * c. Kill switch ON + status expired/past_due beyond grace → denied with reason
 * d. Kill switch ON + has tier → check tier features from config → allowed/denied
 */
export async function checkFeatureAccess(
  supabase: ServiceClient,
  userId: string,
  featureKey: FeatureKey
): Promise<FeatureAccessCheck> {
  // a. Kill switch OFF → unlimited access
  if (!isSubscriptionEnabled()) {
    return { allowed: true, enforced: false }
  }

  // Get subscription
  const row = await getSubscriptionRow(supabase, userId)

  // b. No subscription or no tier → denied
  if (!row || !row.tier) {
    return {
      allowed: false,
      enforced: true,
      reason: 'NO_SUBSCRIPTION',
      tier: null,
    }
  }

  const tier = row.tier as SubscriptionTier
  const status = row.status as SubscriptionStatus
  const cancellationEffectiveAt = (row as Record<string, unknown>).cancellation_effective_at as string | null

  // c. Check status - expired or past_due beyond grace
  const { beyondGrace } = checkGracePeriod(status, row.current_period_end, cancellationEffectiveAt)

  if (status === 'expired') {
    return {
      allowed: false,
      enforced: true,
      reason: 'SUBSCRIPTION_EXPIRED',
      tier,
    }
  }

  if (status === 'past_due' && beyondGrace) {
    return {
      allowed: false,
      enforced: true,
      reason: 'PAST_DUE_GRACE_EXCEEDED',
      tier,
    }
  }

  // d. Check feature availability for tier
  const config = getTierConfig(tier)
  const hasFeature = config.features[featureKey]

  if (!hasFeature) {
    return {
      allowed: false,
      enforced: true,
      reason: 'FEATURE_NOT_INCLUDED',
      tier,
    }
  }

  return {
    allowed: true,
    enforced: true,
    tier,
  }
}

/**
 * Check if a user is within usage limits for a resource
 *
 * Decision tree:
 * a. Kill switch OFF → { allowed: true, enforced: false, unlimited: true }
 * b. Kill switch ON + tier is NULL → { allowed: false, enforced: true, reason: 'NO_SUBSCRIPTION' }
 * c. Kill switch ON + has tier → compare usage counter vs tier limit (-1=unlimited)
 */
export async function checkUsageLimit(
  supabase: ServiceClient,
  userId: string,
  resource: ResourceKey
): Promise<UsageLimitCheck> {
  // a. Kill switch OFF → unlimited access
  if (!isSubscriptionEnabled()) {
    return {
      allowed: true,
      enforced: false,
      unlimited: true,
    }
  }

  // Get subscription
  const row = await getSubscriptionRow(supabase, userId)

  // b. No subscription or no tier → denied
  if (!row || !row.tier) {
    return {
      allowed: false,
      enforced: true,
      unlimited: false,
      reason: 'NO_SUBSCRIPTION',
      tier: null,
    }
  }

  const tier = row.tier as SubscriptionTier
  const status = row.status as SubscriptionStatus
  const cancellationEffectiveAt = (row as Record<string, unknown>).cancellation_effective_at as string | null

  // Check status - expired or past_due beyond grace
  const { beyondGrace } = checkGracePeriod(status, row.current_period_end, cancellationEffectiveAt)

  if (status === 'expired') {
    return {
      allowed: false,
      enforced: true,
      unlimited: false,
      reason: 'SUBSCRIPTION_EXPIRED',
      tier,
    }
  }

  if (status === 'past_due' && beyondGrace) {
    return {
      allowed: false,
      enforced: true,
      unlimited: false,
      reason: 'PAST_DUE_GRACE_EXCEEDED',
      tier,
    }
  }

  // c. Get tier limits and current usage
  const config = getTierConfig(tier)
  const limit = config.limits[resource]
  const columnName = RESOURCE_TO_COLUMN[resource]
  const used = (row as Record<string, unknown>)[columnName] as number

  // -1 means unlimited
  if (limit === -1) {
    return {
      allowed: true,
      enforced: true,
      unlimited: true,
      used,
      limit: -1,
      remaining: -1,
      tier,
    }
  }

  const remaining = Math.max(0, limit - used)
  const allowed = used < limit

  return {
    allowed,
    enforced: true,
    unlimited: false,
    reason: allowed ? undefined : 'LIMIT_EXCEEDED',
    used,
    limit,
    remaining,
    tier,
  }
}

/**
 * Increment usage counter for a resource
 *
 * This function ALWAYS runs — regardless of kill switch or tier.
 * It does TWO things:
 * a. Increment the counter on user_subscriptions
 * b. Upsert the monthly snapshot
 *
 * Returns { newCount }
 */
export async function incrementUsage(
  supabase: ServiceClient,
  userId: string,
  resource: ResourceKey
): Promise<IncrementResult> {
  const columnName = RESOURCE_TO_COLUMN[resource]

  // Get current subscription data (or create tracking row)
  const { data: currentRow, error: fetchError } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()

  let currentCount: number
  let currentTier: SubscriptionTier | null = null

  if (fetchError && fetchError.code === 'PGRST116') {
    // No subscription row exists - create one for tracking
    const { error: insertError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        tier: null,
        billing_period: null,
        status: 'active',
        [columnName]: 1,
      })

    if (insertError) {
      throw new Error(`Failed to create subscription row: ${insertError.message}`)
    }

    currentCount = 1
  } else if (fetchError) {
    throw new Error(`Database error: ${fetchError.message}`)
  } else {
    // Update existing row
    currentTier = currentRow.tier as SubscriptionTier | null
    const oldCount = (currentRow as Record<string, unknown>)[columnName] as number
    currentCount = oldCount + 1

    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({ [columnName]: currentCount })
      .eq('user_id', userId)

    if (updateError) {
      throw new Error(`Failed to update usage: ${updateError.message}`)
    }
  }

  // Upsert monthly snapshot
  const month = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const snapshotColumn = columnName // Same column name in snapshots table

  const { error: snapshotError } = await supabase.rpc('upsert_usage_snapshot', {
    p_user_id: userId,
    p_month: month,
    p_column: snapshotColumn,
    p_tier: currentTier,
  })

  // If RPC doesn't exist, fall back to manual upsert
  if (snapshotError && snapshotError.code === 'PGRST202') {
    // RPC doesn't exist, use manual upsert
    const { data: existingSnapshot } = await supabase
      .from('usage_monthly_snapshots')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month)
      .single()

    if (existingSnapshot) {
      const currentSnapshotCount = (existingSnapshot as Record<string, unknown>)[snapshotColumn] as number || 0
      await supabase
        .from('usage_monthly_snapshots')
        .update({
          [snapshotColumn]: currentSnapshotCount + 1,
          tier_at_snapshot: currentTier || (existingSnapshot as Record<string, unknown>).tier_at_snapshot,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('month', month)
    } else {
      await supabase
        .from('usage_monthly_snapshots')
        .insert({
          user_id: userId,
          month,
          [snapshotColumn]: 1,
          tier_at_snapshot: currentTier,
        })
    }
  }

  return { newCount: currentCount }
}

/**
 * Get full subscription status for a user
 *
 * Returns real data regardless of kill switch.
 * Includes:
 * - subscriptionEnabled flag
 * - hasSubscription (tier !== null)
 * - tier, billingPeriod, status
 * - Usage summary for all 6 resources
 * - Features map
 * - Billing dates
 * - UI flags (isCancelled, canUpgrade, etc.)
 * - scheduledTierChange if any
 */
export async function getSubscriptionStatus(
  supabase: ServiceClient,
  userId: string
): Promise<SubscriptionStatusResponse> {
  const subscriptionEnabled = isSubscriptionEnabled()
  const row = await getSubscriptionRow(supabase, userId)

  // Default response for no subscription
  if (!row) {
    return {
      subscriptionEnabled,
      hasSubscription: false,
      tier: null,
      billingPeriod: null,
      status: null,
      usage: createEmptyUsage(),
      features: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelledAt: null,
      cancellationEffectiveAt: null,
      scheduledTierChange: null,
      scheduledBillingPeriodChange: null,
      isCancelled: false,
      isPastDue: false,
      isExpired: false,
      canUpgrade: true,
      canDowngrade: false,
    }
  }

  const tier = row.tier as SubscriptionTier | null
  const billingPeriod = row.billing_period as BillingPeriod | null
  const status = row.status as SubscriptionStatus
  const hasSubscription = tier !== null
  const cancellationEffectiveAt = (row as Record<string, unknown>).cancellation_effective_at as string | null
  const scheduledTierChange = (row as Record<string, unknown>).scheduled_tier_change as SubscriptionTier | null
  const scheduledBillingPeriodChange = (row as Record<string, unknown>).scheduled_billing_period_change as BillingPeriod | null

  // Build usage summary
  const usage = createUsageSummary(row, tier)

  // Build features map
  const features = tier ? getTierConfig(tier).features : null

  // UI flags
  const isCancelled = status === 'cancelled' || row.cancelled_at !== null
  const isPastDue = status === 'past_due'
  const isExpired = status === 'expired'
  const canUpgrade = hasSubscription && tier !== 'elite' && status === 'active'
  const canDowngrade = hasSubscription && tier !== 'momentum' && status === 'active'

  return {
    subscriptionEnabled,
    hasSubscription,
    tier,
    billingPeriod,
    status,
    usage,
    features,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    cancelledAt: row.cancelled_at,
    cancellationEffectiveAt,
    scheduledTierChange,
    scheduledBillingPeriodChange,
    isCancelled,
    isPastDue,
    isExpired,
    canUpgrade,
    canDowngrade,
  }
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Create empty usage summary (all zeros, unlimited)
 */
function createEmptyUsage(): Record<ResourceKey, UsageSummary> {
  const resources: ResourceKey[] = [
    'applications',
    'cvs',
    'interviews',
    'compensation',
    'contracts',
    'aiAvatarInterviews',
  ]

  return resources.reduce((acc, resource) => {
    acc[resource] = {
      used: 0,
      limit: -1,
      remaining: -1,
      percentUsed: 0,
      unlimited: true,
    }
    return acc
  }, {} as Record<ResourceKey, UsageSummary>)
}

/**
 * Create usage summary from subscription row
 */
function createUsageSummary(
  row: Database['public']['Tables']['user_subscriptions']['Row'],
  tier: SubscriptionTier | null
): Record<ResourceKey, UsageSummary> {
  const resources: ResourceKey[] = [
    'applications',
    'cvs',
    'interviews',
    'compensation',
    'contracts',
    'aiAvatarInterviews',
  ]

  const config = tier ? getTierConfig(tier) : null

  return resources.reduce((acc, resource) => {
    const columnName = RESOURCE_TO_COLUMN[resource]
    const used = (row as Record<string, unknown>)[columnName] as number
    const limit = config ? config.limits[resource] : -1
    const unlimited = limit === -1

    let remaining: number
    let percentUsed: number

    if (unlimited) {
      remaining = -1
      percentUsed = 0
    } else {
      remaining = Math.max(0, limit - used)
      percentUsed = limit > 0 ? Math.round((used / limit) * 100) : 0
    }

    acc[resource] = {
      used,
      limit,
      remaining,
      percentUsed,
      unlimited,
    }
    return acc
  }, {} as Record<ResourceKey, UsageSummary>)
}
