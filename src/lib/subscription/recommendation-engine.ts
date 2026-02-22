/**
 * Recommendation Engine
 *
 * Analyzes user's historical usage patterns and recommends the optimal
 * subscription tier based on their needs.
 *
 * @module recommendation-engine
 * @server-only
 */

import {
  TIER_ORDER,
  TIER_CONFIGS,
  getPrice,
  type TierConfig,
} from './config'
import type { SubscriptionTier, BillingPeriod, TierLimits } from '@/types/subscription'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// ============================================================================
// Types
// ============================================================================

type ServiceClient = SupabaseClient<Database>

/**
 * Resource keys for usage tracking
 */
export type ResourceKey = keyof TierLimits

/**
 * Average usage across all tracked months
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
 * Comparison data for a single resource
 */
export interface ResourceComparison {
  average: number
  momentumLimit: number
  accelerateLimit: number
  eliteLimit: number
  fitsIn: SubscriptionTier
}

/**
 * Savings data for different billing periods
 */
export interface SavingsComparison {
  monthly: number
  quarterly: number
  yearly: number
  monthlySavings: number
  quarterlySavings: number
  yearlySavings: number
}

/**
 * Full tier recommendation with supporting data
 */
export interface TierRecommendation {
  recommendedTier: SubscriptionTier
  recommendedBillingPeriod: BillingPeriod
  comparison: Record<ResourceKey, ResourceComparison>
  savings: SavingsComparison
  reason: string
  monthsTracked: number
}

// ============================================================================
// Resource Mapping
// ============================================================================

/**
 * Maps resource keys to snapshot column names
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
 * Human-readable resource names
 */
const RESOURCE_NAMES: Record<ResourceKey, string> = {
  applications: 'applications',
  cvs: 'CVs',
  interviews: 'interview sessions',
  compensation: 'compensation analyses',
  contracts: 'contract reviews',
  aiAvatarInterviews: 'AI avatar interviews',
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Get average usage across all tracked months
 *
 * Fetches all usage_monthly_snapshots for the user, sums each resource,
 * and divides by month count. Returns averages rounded to 1 decimal place.
 */
export async function getUsageAverages(
  supabase: ServiceClient,
  userId: string
): Promise<UsageAverages> {
  const { data: snapshots, error } = await supabase
    .from('usage_monthly_snapshots')
    .select('*')
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to fetch usage snapshots: ${error.message}`)
  }

  // Type assertion for Supabase query result
  const typedSnapshots = (snapshots as unknown) as Record<string, unknown>[] | null

  // No data - return zeros
  if (!typedSnapshots || typedSnapshots.length === 0) {
    return {
      applications: 0,
      cvs: 0,
      interviews: 0,
      compensation: 0,
      contracts: 0,
      aiAvatarInterviews: 0,
      monthsTracked: 0,
    }
  }

  const monthCount = typedSnapshots.length

  // Sum all resources across all months
  const totals: Record<ResourceKey, number> = {
    applications: 0,
    cvs: 0,
    interviews: 0,
    compensation: 0,
    contracts: 0,
    aiAvatarInterviews: 0,
  }

  for (const snapshot of typedSnapshots) {
    const row = snapshot
    totals.applications += (row[RESOURCE_TO_COLUMN.applications] as number) || 0
    totals.cvs += (row[RESOURCE_TO_COLUMN.cvs] as number) || 0
    totals.interviews += (row[RESOURCE_TO_COLUMN.interviews] as number) || 0
    totals.compensation += (row[RESOURCE_TO_COLUMN.compensation] as number) || 0
    totals.contracts += (row[RESOURCE_TO_COLUMN.contracts] as number) || 0
    totals.aiAvatarInterviews += (row[RESOURCE_TO_COLUMN.aiAvatarInterviews] as number) || 0
  }

  // Calculate averages rounded to 1 decimal place
  return {
    applications: roundToOneDecimal(totals.applications / monthCount),
    cvs: roundToOneDecimal(totals.cvs / monthCount),
    interviews: roundToOneDecimal(totals.interviews / monthCount),
    compensation: roundToOneDecimal(totals.compensation / monthCount),
    contracts: roundToOneDecimal(totals.contracts / monthCount),
    aiAvatarInterviews: roundToOneDecimal(totals.aiAvatarInterviews / monthCount),
    monthsTracked: monthCount,
  }
}

/**
 * Get tier recommendation based on usage averages
 *
 * Algorithm:
 * a. For each resource, find the LOWEST tier whose limit covers the average
 * b. Recommended tier = the HIGHEST required tier across all resources
 * c. Recommended billing period = yearly (always best value)
 * d. Build comparison, savings, and reason objects
 */
export function getRecommendation(averages: UsageAverages): TierRecommendation {
  const resources: ResourceKey[] = [
    'applications',
    'cvs',
    'interviews',
    'compensation',
    'contracts',
    'aiAvatarInterviews',
  ]

  // Step a & b: Find required tier for each resource, track highest
  const comparison: Record<ResourceKey, ResourceComparison> = {} as Record<ResourceKey, ResourceComparison>
  let highestRequiredTier: SubscriptionTier = 'momentum'

  for (const resource of resources) {
    const average = averages[resource]
    const fitsIn = findLowestTierThatFits(resource, average)

    comparison[resource] = {
      average,
      momentumLimit: TIER_CONFIGS.momentum.limits[resource],
      accelerateLimit: TIER_CONFIGS.accelerate.limits[resource],
      eliteLimit: TIER_CONFIGS.elite.limits[resource],
      fitsIn,
    }

    // Track the highest tier needed
    if (TIER_ORDER.indexOf(fitsIn) > TIER_ORDER.indexOf(highestRequiredTier)) {
      highestRequiredTier = fitsIn
    }
  }

  // Step c: Always recommend yearly (best value)
  const recommendedBillingPeriod: BillingPeriod = 'yearly'

  // Step d: Build savings comparison
  const savings = buildSavingsComparison(highestRequiredTier)

  // Step e: Build reason string
  const reason = buildReasonString(averages, highestRequiredTier, comparison)

  return {
    recommendedTier: highestRequiredTier,
    recommendedBillingPeriod,
    comparison,
    savings,
    reason,
    monthsTracked: averages.monthsTracked,
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Round a number to 1 decimal place
 */
function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10
}

/**
 * Find the lowest tier whose limit covers the given average
 */
function findLowestTierThatFits(resource: ResourceKey, average: number): SubscriptionTier {
  // If average is 0, any tier works - return momentum
  if (average === 0) {
    return 'momentum'
  }

  // Check each tier in order (lowest to highest)
  for (const tier of TIER_ORDER) {
    const limit = TIER_CONFIGS[tier].limits[resource]

    // Unlimited (-1) always fits
    if (limit === -1) {
      return tier
    }

    // Limit of 0 means tier doesn't support this resource
    if (limit === 0) {
      continue
    }

    // Check if average fits within limit
    if (average <= limit) {
      return tier
    }
  }

  // If no tier fits (shouldn't happen with elite's unlimited), return elite
  return 'elite'
}

/**
 * Build savings comparison for a tier
 */
function buildSavingsComparison(tier: SubscriptionTier): SavingsComparison {
  const monthly = getPrice(tier, 'monthly')
  const quarterly = getPrice(tier, 'quarterly')
  const yearly = getPrice(tier, 'yearly')

  // Calculate savings vs monthly rate
  const monthlyAnnualCost = monthly * 12
  const quarterlyAnnualCost = quarterly * 4

  return {
    monthly,
    quarterly,
    yearly,
    monthlySavings: 0, // No savings on monthly
    quarterlySavings: monthlyAnnualCost - quarterlyAnnualCost,
    yearlySavings: monthlyAnnualCost - yearly,
  }
}

/**
 * Build human-readable reason string
 */
function buildReasonString(
  averages: UsageAverages,
  recommendedTier: SubscriptionTier,
  comparison: Record<ResourceKey, ResourceComparison>
): string {
  const tierName = TIER_CONFIGS[recommendedTier].name

  // 0 months data
  if (averages.monthsTracked === 0) {
    return `We recommend ${tierName} as a great starting point.`
  }

  // Find the top 2 resources by average usage
  const sortedResources = Object.entries(comparison)
    .filter(([_, data]) => data.average > 0)
    .sort((a, b) => b[1].average - a[1].average)
    .slice(0, 2)

  // 1 month data
  if (averages.monthsTracked === 1) {
    if (sortedResources.length === 0) {
      return `Based on your first month, ${tierName} is a good fit for your needs.`
    }

    const [topResource, topData] = sortedResources[0]
    const resourceName = RESOURCE_NAMES[topResource as ResourceKey]
    return `Based on your first month, you're using about ${topData.average} ${resourceName}. The ${tierName} plan covers your needs.`
  }

  // Multiple months data
  if (sortedResources.length === 0) {
    return `Based on ${averages.monthsTracked} months of activity, ${tierName} is a great fit for your usage pattern.`
  }

  if (sortedResources.length === 1) {
    const [topResource, topData] = sortedResources[0]
    const resourceName = RESOURCE_NAMES[topResource as ResourceKey]
    return `Based on ${averages.monthsTracked} months of activity, you average ${topData.average} ${resourceName}. The ${tierName} plan covers all your needs.`
  }

  // Two or more resources
  const [resource1, data1] = sortedResources[0]
  const [resource2, data2] = sortedResources[1]
  const name1 = RESOURCE_NAMES[resource1 as ResourceKey]
  const name2 = RESOURCE_NAMES[resource2 as ResourceKey]

  return `Based on ${averages.monthsTracked} months of activity, you average ${data1.average} ${name1} and ${data2.average} ${name2}. The ${tierName} plan covers all your needs.`
}
