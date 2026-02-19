/**
 * Subscription Module
 *
 * Barrel file re-exporting all subscription-related functionality.
 *
 * Usage:
 *   import { isSubscriptionEnabled, checkUsageLimit, getRecommendation } from '@/lib/subscription'
 *
 * @module subscription
 */

// Configuration and constants
export {
  // Constants
  TIER_ORDER,
  BILLING_PERIODS,
  GRACE_PERIOD_DAYS,
  TIER_CONFIGS,
  // Types
  type TierFeatures,
  type PricingOption,
  type TierPricing,
  type TierConfig,
  // Functions
  isSubscriptionEnabled,
  getTierConfig,
  getTierLimits,
  getPrice,
  getPricingOption,
  isUpgrade,
  isDowngrade,
  getPeriodEndDate,
  calculateProratedCharge,
  isValidTier,
  isValidBillingPeriod,
  isValidStatus,
  getAllTiers,
  getMostPopularTier,
  getSavingsPercentage,
  formatPrice,
  hasFeature,
  getResourceLimit,
  isResourceUnlimited,
} from './config'

// Re-export types from config (they come from @/types/subscription)
export type { SubscriptionTier, BillingPeriod, SubscriptionStatus, TierLimits } from './config'

// Payment gateway adapters
export {
  growApiCall,
  createRecurringPayment,
  createOneTimeCharge,
  approveTransaction,
  parseWebhookPayload,
  verifyWebhook,
  type GrowApiResponse,
  type GrowPageCode,
  type GrowRecurringPaymentParams,
  type GrowOneTimeChargeParams,
  type GrowWebhookPayload,
} from './grow-adapter'

export {
  morningAuthenticate,
  createOrFindCustomer,
  createInvoiceReceipt,
  createCreditInvoice,
  type MorningCustomer,
  type MorningInvoice,
} from './morning-adapter'

// Core subscription management
export {
  getSubscription,
  activateSubscription,
  renewSubscription,
  upgradeSubscription,
  scheduleDowngrade,
  cancelScheduledChange,
  cancelSubscription,
  handlePaymentFailure,
  processExpirations,
  type UserSubscription,
  type GrowPaymentData,
  type UpgradeResult,
  type DowngradeResult,
  type CancelResult,
  type ExpirationResult,
} from './subscription-manager'

// Access control and usage tracking
export {
  checkFeatureAccess,
  checkUsageLimit,
  incrementUsage,
  getSubscriptionStatus,
  isAdmin,
  type FeatureKey,
  type FeatureAccessCheck,
  type UsageLimitCheck,
  type IncrementResult,
  type UsageSummary,
  type SubscriptionStatusResponse,
} from './access-control'

// Usage analysis and recommendations
export {
  getUsageAverages,
  getRecommendation,
  type UsageAverages,
  type ResourceComparison,
  type SavingsComparison,
  type TierRecommendation,
} from './recommendation-engine'

// ResourceKey type - export from access-control (canonical source)
// recommendation-engine also has ResourceKey but they're identical
export type { ResourceKey } from './access-control'
