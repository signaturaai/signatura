/**
 * Subscription Configuration Module
 *
 * Central source of truth for all subscription tiers, limits, and pricing.
 * This module is used by both client and server code.
 *
 * CRITICAL: The subscription system ships DORMANT by default.
 * Set SUBSCRIPTION_ENABLED=true to activate enforcement.
 */

// ============================================================================
// Types
// ============================================================================

export type SubscriptionTier = 'momentum' | 'accelerate' | 'elite'
export type BillingPeriod = 'monthly' | 'quarterly' | 'yearly'
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'expired'

export interface TierLimits {
  applications: number      // -1 means unlimited
  cvs: number
  interviews: number
  compensation: number
  contracts: number
  aiAvatarInterviews: number
}

export interface TierConfig {
  name: string
  displayName: string
  limits: TierLimits
  pricing: {
    monthly: number
    quarterly: number
    yearly: number
  }
  features: string[]
  isPopular?: boolean
}

// ============================================================================
// Tier Configurations
// ============================================================================

export const TIER_CONFIGS: Record<SubscriptionTier, TierConfig> = {
  momentum: {
    name: 'momentum',
    displayName: 'Momentum',
    limits: {
      applications: 8,
      cvs: 8,
      interviews: 8,
      compensation: 8,
      contracts: 8,
      aiAvatarInterviews: 0,
    },
    pricing: {
      monthly: 12,
      quarterly: 30,   // 17% off
      yearly: 99,      // 31% off
    },
    features: [
      '8 Application Tracking',
      '8 Tailored CVs',
      '8 Interview Coach Sessions',
      '8 Compensation Sessions',
      '8 Contract Reviews',
    ],
  },
  accelerate: {
    name: 'accelerate',
    displayName: 'Accelerate',
    isPopular: true,
    limits: {
      applications: 15,
      cvs: 15,
      interviews: 15,
      compensation: 15,
      contracts: 15,
      aiAvatarInterviews: 5,
    },
    pricing: {
      monthly: 18,
      quarterly: 45,   // 17% off
      yearly: 149,     // 31% off
    },
    features: [
      '15 Application Tracking',
      '15 Tailored CVs',
      '15 Interview Coach Sessions',
      '15 Compensation Sessions',
      '15 Contract Reviews',
      '5 AI Avatar Interviews',
    ],
  },
  elite: {
    name: 'elite',
    displayName: 'Elite',
    limits: {
      applications: -1,  // unlimited
      cvs: -1,
      interviews: -1,
      compensation: -1,
      contracts: -1,
      aiAvatarInterviews: 10,
    },
    pricing: {
      monthly: 29,
      quarterly: 75,   // 14% off
      yearly: 249,     // 28% off
    },
    features: [
      'Unlimited Application Tracking',
      'Unlimited Tailored CVs',
      'Unlimited Interview Coach Sessions',
      'Unlimited Compensation Sessions',
      'Unlimited Contract Reviews',
      '10 AI Avatar Interviews',
    ],
  },
}

// Tier order for upgrade/downgrade logic
const TIER_ORDER: SubscriptionTier[] = ['momentum', 'accelerate', 'elite']

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get configuration for a specific tier
 */
export function getTierConfig(tier: SubscriptionTier): TierConfig {
  return TIER_CONFIGS[tier]
}

/**
 * Get limits for a specific tier
 */
export function getTierLimits(tier: SubscriptionTier): TierLimits {
  return TIER_CONFIGS[tier].limits
}

/**
 * Get price for a tier and billing period
 */
export function getPrice(tier: SubscriptionTier, period: BillingPeriod): number {
  return TIER_CONFIGS[tier].pricing[period]
}

/**
 * Check if moving from oldTier to newTier is an upgrade
 */
export function isUpgrade(oldTier: SubscriptionTier, newTier: SubscriptionTier): boolean {
  const oldIndex = TIER_ORDER.indexOf(oldTier)
  const newIndex = TIER_ORDER.indexOf(newTier)
  return newIndex > oldIndex
}

/**
 * Check if moving from oldTier to newTier is a downgrade
 */
export function isDowngrade(oldTier: SubscriptionTier, newTier: SubscriptionTier): boolean {
  const oldIndex = TIER_ORDER.indexOf(oldTier)
  const newIndex = TIER_ORDER.indexOf(newTier)
  return newIndex < oldIndex
}

/**
 * Calculate the end date for a billing period
 */
export function getPeriodEndDate(startDate: Date, period: BillingPeriod): Date {
  const endDate = new Date(startDate)

  switch (period) {
    case 'monthly':
      endDate.setMonth(endDate.getMonth() + 1)
      break
    case 'quarterly':
      endDate.setMonth(endDate.getMonth() + 3)
      break
    case 'yearly':
      endDate.setMonth(endDate.getMonth() + 12)
      break
  }

  return endDate
}

/**
 * Check if subscription system is enabled
 * Returns false when SUBSCRIPTION_ENABLED is unset, empty, or "false"
 */
export function isSubscriptionEnabled(): boolean {
  // Check both server-side and client-side env vars
  const serverValue = process.env.SUBSCRIPTION_ENABLED
  const clientValue = process.env.NEXT_PUBLIC_SUBSCRIPTION_ENABLED

  const value = serverValue || clientValue || ''
  return value.toLowerCase() === 'true'
}

/**
 * Get all tiers in order (lowest to highest)
 */
export function getAllTiers(): SubscriptionTier[] {
  return [...TIER_ORDER]
}

/**
 * Check if a value is a valid tier
 */
export function isValidTier(tier: string | null | undefined): tier is SubscriptionTier {
  if (!tier) return false
  return TIER_ORDER.includes(tier as SubscriptionTier)
}

/**
 * Check if a value is a valid billing period
 */
export function isValidBillingPeriod(period: string | null | undefined): period is BillingPeriod {
  if (!period) return false
  return ['monthly', 'quarterly', 'yearly'].includes(period)
}

/**
 * Check if a value is a valid subscription status
 */
export function isValidStatus(status: string | null | undefined): status is SubscriptionStatus {
  if (!status) return false
  return ['active', 'cancelled', 'past_due', 'expired'].includes(status)
}

/**
 * Calculate savings percentage for non-monthly periods
 */
export function getSavingsPercentage(tier: SubscriptionTier, period: BillingPeriod): number {
  if (period === 'monthly') return 0

  const monthlyPrice = TIER_CONFIGS[tier].pricing.monthly
  const periodPrice = TIER_CONFIGS[tier].pricing[period]
  const months = period === 'quarterly' ? 3 : 12
  const fullPrice = monthlyPrice * months

  return Math.round(((fullPrice - periodPrice) / fullPrice) * 100)
}

/**
 * Format price for display
 */
export function formatPrice(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
