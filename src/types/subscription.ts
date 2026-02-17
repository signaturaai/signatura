/**
 * Subscription System Types
 *
 * Central TypeScript definitions for the subscription system.
 * These types map to the database schema in 010_subscription_system.sql
 * and the configuration in src/lib/subscription/config.ts
 */

// ============================================================================
// Core Types (matching database enums)
// ============================================================================

/**
 * Subscription tier levels
 * - momentum: Entry tier with 8 uses per feature
 * - accelerate: Mid tier with 15 uses per feature + AI avatar interviews
 * - elite: Top tier with unlimited core features + 10 AI avatar interviews
 */
export type SubscriptionTier = 'momentum' | 'accelerate' | 'elite'

/**
 * Billing period options
 * - monthly: Standard monthly billing
 * - quarterly: 3-month billing (17% discount)
 * - yearly: Annual billing (28-31% discount)
 */
export type BillingPeriod = 'monthly' | 'quarterly' | 'yearly'

/**
 * Subscription status states
 * - active: Subscription is current and paid
 * - cancelled: User cancelled, access until period_end
 * - past_due: Payment failed, in grace period
 * - expired: Subscription ended, no access
 */
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'expired'

/**
 * Trackable resource types for usage limits
 * Maps to the usage counter columns in user_subscriptions
 */
export type SubscriptionResource =
  | 'applications'
  | 'cvs'
  | 'interviews'
  | 'compensation'
  | 'contracts'
  | 'aiAvatarInterviews'

/**
 * Event types for subscription lifecycle tracking
 */
export type SubscriptionEventType =
  | 'subscription_created'
  | 'subscription_activated'
  | 'tier_upgraded'
  | 'tier_downgraded'
  | 'period_changed'
  | 'payment_received'
  | 'payment_failed'
  | 'subscription_cancelled'
  | 'subscription_expired'
  | 'counters_reset'
  | 'usage_limit_reached'
  | 'admin_adjustment'

// ============================================================================
// Database Row Types (matching database schema)
// ============================================================================

/**
 * User subscription record from user_subscriptions table
 * tier=NULL indicates tracking-only user (no active subscription)
 */
export interface UserSubscription {
  id: string
  userId: string

  // Subscription details (NULL = tracking-only)
  tier: SubscriptionTier | null
  billingPeriod: BillingPeriod | null
  status: SubscriptionStatus

  // Period dates
  currentPeriodStart: string | null
  currentPeriodEnd: string | null

  // Cancellation tracking
  cancelAtPeriodEnd: boolean
  cancelledAt: string | null
  cancelReason: string | null

  // Scheduled changes (for downgrades)
  scheduledTier: SubscriptionTier | null
  scheduledBillingPeriod: BillingPeriod | null
  scheduledChangeAt: string | null

  // Payment integration
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null

  // Usage counters (always tracked regardless of kill switch)
  usageApplications: number
  usageCvs: number
  usageInterviews: number
  usageCompensation: number
  usageContracts: number
  usageAiAvatarInterviews: number
  lastResetAt: string | null

  // Timestamps
  createdAt: string
  updatedAt: string
}

/**
 * Raw database row for user_subscriptions (snake_case)
 */
export interface UserSubscriptionRow {
  id: string
  user_id: string
  tier: SubscriptionTier | null
  billing_period: BillingPeriod | null
  status: SubscriptionStatus
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  cancelled_at: string | null
  cancel_reason: string | null
  scheduled_tier: SubscriptionTier | null
  scheduled_billing_period: BillingPeriod | null
  scheduled_change_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  usage_applications: number
  usage_cvs: number
  usage_interviews: number
  usage_compensation: number
  usage_contracts: number
  usage_ai_avatar_interviews: number
  last_reset_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Subscription event record for audit trail
 */
export interface SubscriptionEvent {
  id: string
  userId: string
  eventType: SubscriptionEventType
  eventData: Record<string, unknown>
  previousTier: SubscriptionTier | null
  newTier: SubscriptionTier | null
  previousBillingPeriod: BillingPeriod | null
  newBillingPeriod: BillingPeriod | null
  amountPaid: number | null
  currency: string | null
  stripeEventId: string | null
  createdAt: string
}

/**
 * Raw database row for subscription_events (snake_case)
 */
export interface SubscriptionEventRow {
  id: string
  user_id: string
  event_type: SubscriptionEventType
  event_data: Record<string, unknown>
  previous_tier: SubscriptionTier | null
  new_tier: SubscriptionTier | null
  previous_billing_period: BillingPeriod | null
  new_billing_period: BillingPeriod | null
  amount_paid: number | null
  currency: string | null
  stripe_event_id: string | null
  created_at: string
}

/**
 * Monthly usage snapshot for analytics
 */
export interface UsageMonthlySnapshot {
  id: string
  userId: string
  snapshotMonth: string
  tier: SubscriptionTier | null
  billingPeriod: BillingPeriod | null
  applicationsUsed: number
  cvsUsed: number
  interviewsUsed: number
  compensationUsed: number
  contractsUsed: number
  aiAvatarInterviewsUsed: number
  daysActive: number
  peakUsageDay: string | null
  createdAt: string
}

/**
 * Raw database row for usage_monthly_snapshots (snake_case)
 */
export interface UsageMonthlySnapshotRow {
  id: string
  user_id: string
  snapshot_month: string
  tier: SubscriptionTier | null
  billing_period: BillingPeriod | null
  applications_used: number
  cvs_used: number
  interviews_used: number
  compensation_used: number
  contracts_used: number
  ai_avatar_interviews_used: number
  days_active: number
  peak_usage_day: string | null
  created_at: string
}

// ============================================================================
// Configuration Types (matching config.ts)
// ============================================================================

/**
 * Limits configuration for a subscription tier
 * -1 indicates unlimited
 */
export interface TierLimits {
  applications: number
  cvs: number
  interviews: number
  compensation: number
  contracts: number
  aiAvatarInterviews: number
}

/**
 * Pricing configuration for a tier
 */
export interface TierPricing {
  monthly: number
  quarterly: number
  yearly: number
}

/**
 * Full configuration for a subscription tier
 */
export interface TierConfig {
  name: string
  displayName: string
  limits: TierLimits
  pricing: TierPricing
  features: string[]
  isPopular?: boolean
}

// ============================================================================
// Runtime Check Types
// ============================================================================

/**
 * Result of checking if a user can use a feature
 */
export interface UsageLimitCheck {
  allowed: boolean
  currentUsage: number
  limit: number
  remaining: number
  isUnlimited: boolean
  tier: SubscriptionTier | null
  resource: SubscriptionResource
}

/**
 * Result of checking feature access
 * Includes subscription status and enforcement state
 */
export interface FeatureAccessCheck {
  hasAccess: boolean
  reason: FeatureAccessReason
  subscription: UserSubscription | null
  isEnforcementEnabled: boolean
}

/**
 * Reasons for feature access denial or grant
 */
export type FeatureAccessReason =
  | 'subscription_active'
  | 'enforcement_disabled'
  | 'within_limits'
  | 'no_subscription'
  | 'subscription_expired'
  | 'subscription_past_due'
  | 'limit_exceeded'
  | 'feature_not_in_tier'

// ============================================================================
// Analytics Types
// ============================================================================

/**
 * Usage averages across resources for tier recommendations
 */
export interface UsageAverages {
  applications: number
  cvs: number
  interviews: number
  compensation: number
  contracts: number
  aiAvatarInterviews: number
  monthsTracked: number
}

/**
 * Tier recommendation based on usage patterns
 */
export interface TierRecommendation {
  recommendedTier: SubscriptionTier
  currentTier: SubscriptionTier | null
  reason: string
  projectedMonthlyCost: number
  projectedYearlySavings: number
  usageAnalysis: {
    resource: SubscriptionResource
    averageUsage: number
    recommendedLimit: number
    wouldExceedMomentum: boolean
    wouldExceedAccelerate: boolean
  }[]
}

// ============================================================================
// API Types
// ============================================================================

/**
 * Request to create or update a subscription
 */
export interface SubscriptionUpdateRequest {
  tier: SubscriptionTier
  billingPeriod: BillingPeriod
}

/**
 * Request to cancel a subscription
 */
export interface SubscriptionCancelRequest {
  reason?: string
  immediate?: boolean
}

/**
 * Response from subscription operations
 */
export interface SubscriptionOperationResponse {
  success: boolean
  subscription?: UserSubscription
  error?: string
  scheduledChange?: {
    tier: SubscriptionTier
    billingPeriod: BillingPeriod
    effectiveAt: string
  }
}

/**
 * Request to increment usage for a resource
 */
export interface UsageIncrementRequest {
  userId: string
  resource: SubscriptionResource
  amount?: number
}

/**
 * Response from usage increment
 */
export interface UsageIncrementResponse {
  success: boolean
  newUsage: number
  limit: number
  remaining: number
  isUnlimited: boolean
  blocked: boolean
  error?: string
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Map resource names to their database column names
 */
export const RESOURCE_TO_COLUMN: Record<SubscriptionResource, keyof UserSubscriptionRow> = {
  applications: 'usage_applications',
  cvs: 'usage_cvs',
  interviews: 'usage_interviews',
  compensation: 'usage_compensation',
  contracts: 'usage_contracts',
  aiAvatarInterviews: 'usage_ai_avatar_interviews',
}

/**
 * Map resource names to their limit property names
 */
export const RESOURCE_TO_LIMIT: Record<SubscriptionResource, keyof TierLimits> = {
  applications: 'applications',
  cvs: 'cvs',
  interviews: 'interviews',
  compensation: 'compensation',
  contracts: 'contracts',
  aiAvatarInterviews: 'aiAvatarInterviews',
}

// ============================================================================
// Conversion Utilities
// ============================================================================

/**
 * Convert database row to camelCase interface
 */
export function toUserSubscription(row: UserSubscriptionRow): UserSubscription {
  return {
    id: row.id,
    userId: row.user_id,
    tier: row.tier,
    billingPeriod: row.billing_period,
    status: row.status,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    cancelledAt: row.cancelled_at,
    cancelReason: row.cancel_reason,
    scheduledTier: row.scheduled_tier,
    scheduledBillingPeriod: row.scheduled_billing_period,
    scheduledChangeAt: row.scheduled_change_at,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
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
 * Convert subscription event row to camelCase interface
 */
export function toSubscriptionEvent(row: SubscriptionEventRow): SubscriptionEvent {
  return {
    id: row.id,
    userId: row.user_id,
    eventType: row.event_type,
    eventData: row.event_data,
    previousTier: row.previous_tier,
    newTier: row.new_tier,
    previousBillingPeriod: row.previous_billing_period,
    newBillingPeriod: row.new_billing_period,
    amountPaid: row.amount_paid,
    currency: row.currency,
    stripeEventId: row.stripe_event_id,
    createdAt: row.created_at,
  }
}

/**
 * Convert usage snapshot row to camelCase interface
 */
export function toUsageMonthlySnapshot(row: UsageMonthlySnapshotRow): UsageMonthlySnapshot {
  return {
    id: row.id,
    userId: row.user_id,
    snapshotMonth: row.snapshot_month,
    tier: row.tier,
    billingPeriod: row.billing_period,
    applicationsUsed: row.applications_used,
    cvsUsed: row.cvs_used,
    interviewsUsed: row.interviews_used,
    compensationUsed: row.compensation_used,
    contractsUsed: row.contracts_used,
    aiAvatarInterviewsUsed: row.ai_avatar_interviews_used,
    daysActive: row.days_active,
    peakUsageDay: row.peak_usage_day,
    createdAt: row.created_at,
  }
}
