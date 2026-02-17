/**
 * Subscription Configuration Module
 *
 * Central source of truth for all subscription tiers, limits, and pricing.
 * This module is used by both client and server code.
 *
 * CRITICAL: The subscription system ships DORMANT by default.
 * Set SUBSCRIPTION_ENABLED=true to activate enforcement.
 */

import type {
  SubscriptionTier,
  BillingPeriod,
  SubscriptionStatus,
  TierLimits,
} from '@/types/subscription'

// Re-export types for convenience
export type { SubscriptionTier, BillingPeriod, SubscriptionStatus, TierLimits }

// ============================================================================
// Constants
// ============================================================================

/**
 * Tier order from lowest to highest (for upgrade/downgrade logic)
 */
export const TIER_ORDER: SubscriptionTier[] = ['momentum', 'accelerate', 'elite']

/**
 * Available billing periods
 */
export const BILLING_PERIODS: BillingPeriod[] = ['monthly', 'quarterly', 'yearly']

/**
 * Grace period days for past_due subscriptions before expiration
 */
export const GRACE_PERIOD_DAYS = 3

// ============================================================================
// Types
// ============================================================================

export interface TierFeatures {
  applicationTracker: boolean
  tailoredCvs: boolean
  interviewCoach: boolean
  compensationSessions: boolean
  contractReviews: boolean
  aiAvatarInterviews: boolean
}

export interface PricingOption {
  amount: number
  currency: string
  discount: string | null
}

export interface TierPricing {
  monthly: PricingOption
  quarterly: PricingOption
  yearly: PricingOption
}

export interface TierConfig {
  name: string
  tagline: string
  isMostPopular: boolean
  limits: TierLimits
  features: TierFeatures
  pricing: TierPricing
}

// ============================================================================
// Tier Configurations
// ============================================================================

export const TIER_CONFIGS: Record<SubscriptionTier, TierConfig> = {
  momentum: {
    name: 'Momentum',
    tagline: 'Best for job seekers actively applying and exploring multiple opportunities',
    isMostPopular: false,
    limits: {
      applications: 8,
      cvs: 8,
      interviews: 8,
      compensation: 8,
      contracts: 8,
      aiAvatarInterviews: 0,
    },
    features: {
      applicationTracker: true,
      tailoredCvs: true,
      interviewCoach: true,
      compensationSessions: true,
      contractReviews: true,
      aiAvatarInterviews: false,
    },
    pricing: {
      monthly: { amount: 12, currency: 'USD', discount: null },
      quarterly: { amount: 30, currency: 'USD', discount: '17%' },
      yearly: { amount: 99, currency: 'USD', discount: '31%' },
    },
  },
  accelerate: {
    name: 'Accelerate',
    tagline: 'Best for serious job seekers who want to run a full, structured job search',
    isMostPopular: true,
    limits: {
      applications: 15,
      cvs: 15,
      interviews: 15,
      compensation: 15,
      contracts: 15,
      aiAvatarInterviews: 5,
    },
    features: {
      applicationTracker: true,
      tailoredCvs: true,
      interviewCoach: true,
      compensationSessions: true,
      contractReviews: true,
      aiAvatarInterviews: true,
    },
    pricing: {
      monthly: { amount: 18, currency: 'USD', discount: null },
      quarterly: { amount: 45, currency: 'USD', discount: '17%' },
      yearly: { amount: 149, currency: 'USD', discount: '31%' },
    },
  },
  elite: {
    name: 'Elite',
    tagline: 'Best for uncompromising job seekers who want to experience quick wins before committing',
    isMostPopular: false,
    limits: {
      applications: -1, // unlimited
      cvs: -1,
      interviews: -1,
      compensation: -1,
      contracts: -1,
      aiAvatarInterviews: 10,
    },
    features: {
      applicationTracker: true,
      tailoredCvs: true,
      interviewCoach: true,
      compensationSessions: true,
      contractReviews: true,
      aiAvatarInterviews: true,
    },
    pricing: {
      monthly: { amount: 29, currency: 'USD', discount: null },
      quarterly: { amount: 75, currency: 'USD', discount: '14%' },
      yearly: { amount: 249, currency: 'USD', discount: '28%' },
    },
  },
}

// ============================================================================
// Kill Switch
// ============================================================================

/**
 * Check if subscription system is enabled
 *
 * CRITICAL: Returns false by default (DORMANT mode).
 * When false:
 * - All users have unlimited access
 * - Usage is still tracked silently
 * - No limit enforcement
 *
 * Set SUBSCRIPTION_ENABLED=true (server) or
 * NEXT_PUBLIC_SUBSCRIPTION_ENABLED=true (client) to activate.
 */
export function isSubscriptionEnabled(): boolean {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_SUBSCRIPTION_ENABLED === 'true'
  }
  return process.env.SUBSCRIPTION_ENABLED === 'true'
}

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
 * Get price amount for a tier and billing period
 */
export function getPrice(tier: SubscriptionTier, period: BillingPeriod): number {
  return TIER_CONFIGS[tier].pricing[period].amount
}

/**
 * Get full pricing option for a tier and billing period
 */
export function getPricingOption(tier: SubscriptionTier, period: BillingPeriod): PricingOption {
  return TIER_CONFIGS[tier].pricing[period]
}

/**
 * Check if moving from oldTier to newTier is an upgrade
 */
export function isUpgrade(from: SubscriptionTier, to: SubscriptionTier): boolean {
  const fromIndex = TIER_ORDER.indexOf(from)
  const toIndex = TIER_ORDER.indexOf(to)
  return toIndex > fromIndex
}

/**
 * Check if moving from oldTier to newTier is a downgrade
 */
export function isDowngrade(from: SubscriptionTier, to: SubscriptionTier): boolean {
  const fromIndex = TIER_ORDER.indexOf(from)
  const toIndex = TIER_ORDER.indexOf(to)
  return toIndex < fromIndex
}

/**
 * Calculate the end date for a billing period
 * Adds 1/3/12 months to the start date
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
 * Calculate prorated charge for a tier upgrade
 *
 * Formula: ((newPrice - oldPrice) / totalDays) × remainingDays
 * Rounded to 2 decimal places
 *
 * @param currentTier - The user's current tier
 * @param newTier - The tier being upgraded to
 * @param billingPeriod - The billing period for price calculation
 * @param periodStart - Start date of the current billing period
 * @param periodEnd - End date of the current billing period
 * @returns Prorated charge amount (0 or negative if not an upgrade)
 */
export function calculateProratedCharge(
  currentTier: SubscriptionTier,
  newTier: SubscriptionTier,
  billingPeriod: BillingPeriod,
  periodStart: Date,
  periodEnd: Date
): number {
  const oldPrice = getPrice(currentTier, billingPeriod)
  const newPrice = getPrice(newTier, billingPeriod)

  // No proration needed if prices are the same or it's a downgrade
  if (newPrice <= oldPrice) {
    return 0
  }

  const totalDays = Math.ceil(
    (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
  )

  const now = new Date()
  const remainingDays = Math.ceil(
    (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )

  // If no remaining days, no proration needed
  if (remainingDays <= 0 || totalDays <= 0) {
    return 0
  }

  const priceDifference = newPrice - oldPrice
  const dailyRate = priceDifference / totalDays
  const proratedAmount = dailyRate * remainingDays

  // Round to 2 decimal places
  return Math.round(proratedAmount * 100) / 100
}

// ============================================================================
// Validation Functions
// ============================================================================

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
  return BILLING_PERIODS.includes(period as BillingPeriod)
}

/**
 * Check if a value is a valid subscription status
 */
export function isValidStatus(status: string | null | undefined): status is SubscriptionStatus {
  if (!status) return false
  return ['active', 'cancelled', 'past_due', 'expired'].includes(status)
}

// ============================================================================
// Additional Utility Functions
// ============================================================================

/**
 * Get all tiers in order (lowest to highest)
 */
export function getAllTiers(): SubscriptionTier[] {
  return [...TIER_ORDER]
}

/**
 * Get the most popular tier
 */
export function getMostPopularTier(): SubscriptionTier {
  const tier = TIER_ORDER.find((t) => TIER_CONFIGS[t].isMostPopular)
  return tier || 'accelerate' // fallback
}

/**
 * Calculate savings percentage for non-monthly periods
 */
export function getSavingsPercentage(tier: SubscriptionTier, period: BillingPeriod): number {
  if (period === 'monthly') return 0

  const monthlyPrice = getPrice(tier, 'monthly')
  const periodPrice = getPrice(tier, period)
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
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Check if a feature is available for a tier
 */
export function hasFeature(tier: SubscriptionTier, feature: keyof TierFeatures): boolean {
  return TIER_CONFIGS[tier].features[feature]
}

/**
 * Get the limit for a resource in a tier
 * Returns -1 for unlimited
 */
export function getResourceLimit(tier: SubscriptionTier, resource: keyof TierLimits): number {
  return TIER_CONFIGS[tier].limits[resource]
}

/**
 * Check if a resource is unlimited for a tier
 */
export function isResourceUnlimited(tier: SubscriptionTier, resource: keyof TierLimits): boolean {
  return TIER_CONFIGS[tier].limits[resource] === -1
}
