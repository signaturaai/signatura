/**
 * Subscription Configuration Tests (Phase 3.1)
 *
 * Comprehensive RALPH tests for the subscription configuration module.
 * Tests tier configs, pricing, features, upgrade/downgrade logic,
 * proration calculations, and kill switch behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  // Constants
  TIER_ORDER,
  BILLING_PERIODS,
  GRACE_PERIOD_DAYS,
  TIER_CONFIGS,
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
  // Types
  type SubscriptionTier,
  type BillingPeriod,
  type TierConfig,
  type TierFeatures,
  type PricingOption,
} from '@/lib/subscription/config'

// ============================================================================
// Constants Tests
// ============================================================================

describe('Constants', () => {
  describe('TIER_ORDER', () => {
    it('should contain exactly 3 tiers', () => {
      expect(TIER_ORDER).toHaveLength(3)
    })

    it('should be ordered: momentum, accelerate, elite', () => {
      expect(TIER_ORDER).toEqual(['momentum', 'accelerate', 'elite'])
    })

    it('should be exportable for external use', () => {
      expect(Array.isArray(TIER_ORDER)).toBe(true)
    })
  })

  describe('BILLING_PERIODS', () => {
    it('should contain exactly 3 periods', () => {
      expect(BILLING_PERIODS).toHaveLength(3)
    })

    it('should be ordered: monthly, quarterly, yearly', () => {
      expect(BILLING_PERIODS).toEqual(['monthly', 'quarterly', 'yearly'])
    })
  })

  describe('GRACE_PERIOD_DAYS', () => {
    it('should be 3 days', () => {
      expect(GRACE_PERIOD_DAYS).toBe(3)
    })
  })
})

// ============================================================================
// Kill Switch Tests
// ============================================================================

describe('isSubscriptionEnabled (Kill Switch)', () => {
  const originalWindow = global.window
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    // @ts-expect-error - resetting window
    global.window = originalWindow
  })

  describe('server-side (typeof window === "undefined")', () => {
    beforeEach(() => {
      // @ts-expect-error - simulating server environment
      delete global.window
    })

    it('should return false when SUBSCRIPTION_ENABLED is unset', () => {
      delete process.env.SUBSCRIPTION_ENABLED
      expect(isSubscriptionEnabled()).toBe(false)
    })

    it('should return false when SUBSCRIPTION_ENABLED is empty', () => {
      process.env.SUBSCRIPTION_ENABLED = ''
      expect(isSubscriptionEnabled()).toBe(false)
    })

    it('should return false when SUBSCRIPTION_ENABLED is "false"', () => {
      process.env.SUBSCRIPTION_ENABLED = 'false'
      expect(isSubscriptionEnabled()).toBe(false)
    })

    it('should return true when SUBSCRIPTION_ENABLED is "true"', () => {
      process.env.SUBSCRIPTION_ENABLED = 'true'
      expect(isSubscriptionEnabled()).toBe(true)
    })

    it('should NOT return true for "TRUE" (case-sensitive)', () => {
      process.env.SUBSCRIPTION_ENABLED = 'TRUE'
      expect(isSubscriptionEnabled()).toBe(false)
    })

    it('should NOT return true for "yes"', () => {
      process.env.SUBSCRIPTION_ENABLED = 'yes'
      expect(isSubscriptionEnabled()).toBe(false)
    })

    it('should NOT return true for "1"', () => {
      process.env.SUBSCRIPTION_ENABLED = '1'
      expect(isSubscriptionEnabled()).toBe(false)
    })

    it('should NOT return true for "True" (mixed case)', () => {
      process.env.SUBSCRIPTION_ENABLED = 'True'
      expect(isSubscriptionEnabled()).toBe(false)
    })

    it('should NOT return true for "enabled"', () => {
      process.env.SUBSCRIPTION_ENABLED = 'enabled'
      expect(isSubscriptionEnabled()).toBe(false)
    })
  })

  describe('client-side (typeof window !== "undefined")', () => {
    beforeEach(() => {
      // @ts-expect-error - simulating browser environment
      global.window = {}
    })

    it('should check NEXT_PUBLIC_SUBSCRIPTION_ENABLED on client', () => {
      process.env.NEXT_PUBLIC_SUBSCRIPTION_ENABLED = 'true'
      expect(isSubscriptionEnabled()).toBe(true)
    })

    it('should return false when NEXT_PUBLIC_SUBSCRIPTION_ENABLED is not "true"', () => {
      process.env.NEXT_PUBLIC_SUBSCRIPTION_ENABLED = 'false'
      expect(isSubscriptionEnabled()).toBe(false)
    })
  })
})

// ============================================================================
// Tier Configuration Tests
// ============================================================================

describe('TIER_CONFIGS', () => {
  it('should have exactly 3 tiers', () => {
    expect(Object.keys(TIER_CONFIGS)).toHaveLength(3)
  })

  it('should have momentum, accelerate, elite keys', () => {
    expect(TIER_CONFIGS).toHaveProperty('momentum')
    expect(TIER_CONFIGS).toHaveProperty('accelerate')
    expect(TIER_CONFIGS).toHaveProperty('elite')
  })

  describe('required properties', () => {
    const requiredProps: (keyof TierConfig)[] = ['name', 'tagline', 'isMostPopular', 'limits', 'features', 'pricing']

    requiredProps.forEach(prop => {
      it(`each tier should have ${prop}`, () => {
        Object.values(TIER_CONFIGS).forEach(config => {
          expect(config).toHaveProperty(prop)
        })
      })
    })
  })
})

describe('Momentum Tier', () => {
  const momentum = TIER_CONFIGS.momentum

  it('should have name "Momentum"', () => {
    expect(momentum.name).toBe('Momentum')
  })

  it('should have correct tagline', () => {
    expect(momentum.tagline).toBe('Best for job seekers actively applying and exploring multiple opportunities')
  })

  it('should NOT be most popular', () => {
    expect(momentum.isMostPopular).toBe(false)
  })

  describe('limits', () => {
    it('applications = 8', () => expect(momentum.limits.applications).toBe(8))
    it('cvs = 8', () => expect(momentum.limits.cvs).toBe(8))
    it('interviews = 8', () => expect(momentum.limits.interviews).toBe(8))
    it('compensation = 8', () => expect(momentum.limits.compensation).toBe(8))
    it('contracts = 8', () => expect(momentum.limits.contracts).toBe(8))
    it('aiAvatarInterviews = 0', () => expect(momentum.limits.aiAvatarInterviews).toBe(0))
  })

  describe('features', () => {
    it('applicationTracker = true', () => expect(momentum.features.applicationTracker).toBe(true))
    it('tailoredCvs = true', () => expect(momentum.features.tailoredCvs).toBe(true))
    it('interviewCoach = true', () => expect(momentum.features.interviewCoach).toBe(true))
    it('compensationSessions = true', () => expect(momentum.features.compensationSessions).toBe(true))
    it('contractReviews = true', () => expect(momentum.features.contractReviews).toBe(true))
    it('aiAvatarInterviews = false', () => expect(momentum.features.aiAvatarInterviews).toBe(false))
  })

  describe('pricing', () => {
    it('monthly = $12 USD, no discount', () => {
      expect(momentum.pricing.monthly).toEqual({ amount: 12, currency: 'USD', discount: null })
    })
    it('quarterly = $30 USD, 17% discount', () => {
      expect(momentum.pricing.quarterly).toEqual({ amount: 30, currency: 'USD', discount: '17%' })
    })
    it('yearly = $99 USD, 31% discount', () => {
      expect(momentum.pricing.yearly).toEqual({ amount: 99, currency: 'USD', discount: '31%' })
    })
  })
})

describe('Accelerate Tier', () => {
  const accelerate = TIER_CONFIGS.accelerate

  it('should have name "Accelerate"', () => {
    expect(accelerate.name).toBe('Accelerate')
  })

  it('should have correct tagline', () => {
    expect(accelerate.tagline).toBe('Best for serious job seekers who want to run a full, structured job search')
  })

  it('should be most popular', () => {
    expect(accelerate.isMostPopular).toBe(true)
  })

  describe('limits', () => {
    it('applications = 15', () => expect(accelerate.limits.applications).toBe(15))
    it('cvs = 15', () => expect(accelerate.limits.cvs).toBe(15))
    it('interviews = 15', () => expect(accelerate.limits.interviews).toBe(15))
    it('compensation = 15', () => expect(accelerate.limits.compensation).toBe(15))
    it('contracts = 15', () => expect(accelerate.limits.contracts).toBe(15))
    it('aiAvatarInterviews = 5', () => expect(accelerate.limits.aiAvatarInterviews).toBe(5))
  })

  describe('features (all true)', () => {
    it('applicationTracker = true', () => expect(accelerate.features.applicationTracker).toBe(true))
    it('tailoredCvs = true', () => expect(accelerate.features.tailoredCvs).toBe(true))
    it('interviewCoach = true', () => expect(accelerate.features.interviewCoach).toBe(true))
    it('compensationSessions = true', () => expect(accelerate.features.compensationSessions).toBe(true))
    it('contractReviews = true', () => expect(accelerate.features.contractReviews).toBe(true))
    it('aiAvatarInterviews = true', () => expect(accelerate.features.aiAvatarInterviews).toBe(true))
  })

  describe('pricing', () => {
    it('monthly = $18 USD, no discount', () => {
      expect(accelerate.pricing.monthly).toEqual({ amount: 18, currency: 'USD', discount: null })
    })
    it('quarterly = $45 USD, 17% discount', () => {
      expect(accelerate.pricing.quarterly).toEqual({ amount: 45, currency: 'USD', discount: '17%' })
    })
    it('yearly = $149 USD, 31% discount', () => {
      expect(accelerate.pricing.yearly).toEqual({ amount: 149, currency: 'USD', discount: '31%' })
    })
  })
})

describe('Elite Tier', () => {
  const elite = TIER_CONFIGS.elite

  it('should have name "Elite"', () => {
    expect(elite.name).toBe('Elite')
  })

  it('should have correct tagline', () => {
    expect(elite.tagline).toBe('Best for uncompromising job seekers who want to experience quick wins before committing')
  })

  it('should NOT be most popular', () => {
    expect(elite.isMostPopular).toBe(false)
  })

  describe('limits (-1 = unlimited)', () => {
    it('applications = -1 (unlimited)', () => expect(elite.limits.applications).toBe(-1))
    it('cvs = -1 (unlimited)', () => expect(elite.limits.cvs).toBe(-1))
    it('interviews = -1 (unlimited)', () => expect(elite.limits.interviews).toBe(-1))
    it('compensation = -1 (unlimited)', () => expect(elite.limits.compensation).toBe(-1))
    it('contracts = -1 (unlimited)', () => expect(elite.limits.contracts).toBe(-1))
    it('aiAvatarInterviews = 10 (capped)', () => expect(elite.limits.aiAvatarInterviews).toBe(10))
  })

  describe('features (all true)', () => {
    it('applicationTracker = true', () => expect(elite.features.applicationTracker).toBe(true))
    it('tailoredCvs = true', () => expect(elite.features.tailoredCvs).toBe(true))
    it('interviewCoach = true', () => expect(elite.features.interviewCoach).toBe(true))
    it('compensationSessions = true', () => expect(elite.features.compensationSessions).toBe(true))
    it('contractReviews = true', () => expect(elite.features.contractReviews).toBe(true))
    it('aiAvatarInterviews = true', () => expect(elite.features.aiAvatarInterviews).toBe(true))
  })

  describe('pricing', () => {
    it('monthly = $29 USD, no discount', () => {
      expect(elite.pricing.monthly).toEqual({ amount: 29, currency: 'USD', discount: null })
    })
    it('quarterly = $75 USD, 14% discount', () => {
      expect(elite.pricing.quarterly).toEqual({ amount: 75, currency: 'USD', discount: '14%' })
    })
    it('yearly = $249 USD, 28% discount', () => {
      expect(elite.pricing.yearly).toEqual({ amount: 249, currency: 'USD', discount: '28%' })
    })
  })
})

// ============================================================================
// Helper Function Tests
// ============================================================================

describe('getTierConfig', () => {
  it('should return correct config for momentum', () => {
    const config = getTierConfig('momentum')
    expect(config.name).toBe('Momentum')
    expect(config.limits.applications).toBe(8)
  })

  it('should return correct config for accelerate', () => {
    const config = getTierConfig('accelerate')
    expect(config.name).toBe('Accelerate')
    expect(config.isMostPopular).toBe(true)
  })

  it('should return correct config for elite', () => {
    const config = getTierConfig('elite')
    expect(config.name).toBe('Elite')
    expect(config.limits.applications).toBe(-1)
  })
})

describe('getTierLimits', () => {
  it('should return momentum limits', () => {
    const limits = getTierLimits('momentum')
    expect(limits.applications).toBe(8)
    expect(limits.aiAvatarInterviews).toBe(0)
  })

  it('should return accelerate limits', () => {
    const limits = getTierLimits('accelerate')
    expect(limits.applications).toBe(15)
    expect(limits.aiAvatarInterviews).toBe(5)
  })

  it('should return elite limits with -1 for unlimited', () => {
    const limits = getTierLimits('elite')
    expect(limits.applications).toBe(-1)
    expect(limits.aiAvatarInterviews).toBe(10)
  })
})

describe('getPrice', () => {
  describe('all 9 tier × period combinations', () => {
    const expectedPrices: Record<SubscriptionTier, Record<BillingPeriod, number>> = {
      momentum: { monthly: 12, quarterly: 30, yearly: 99 },
      accelerate: { monthly: 18, quarterly: 45, yearly: 149 },
      elite: { monthly: 29, quarterly: 75, yearly: 249 },
    }

    TIER_ORDER.forEach(tier => {
      BILLING_PERIODS.forEach(period => {
        it(`${tier} ${period} = $${expectedPrices[tier][period]}`, () => {
          expect(getPrice(tier, period)).toBe(expectedPrices[tier][period])
        })
      })
    })
  })

  describe('invalid tier handling', () => {
    it('getPrice throws for invalid tier "premium"', () => {
      // TypeScript prevents this at compile time, but at runtime it would throw
      expect(() => getPrice('premium' as SubscriptionTier, 'monthly')).toThrow()
    })

    it('getPrice throws for invalid tier "basic"', () => {
      expect(() => getPrice('basic' as SubscriptionTier, 'monthly')).toThrow()
    })
  })

  describe('invalid billing period handling', () => {
    it('getPrice throws for invalid period "biweekly"', () => {
      expect(() => getPrice('momentum', 'biweekly' as BillingPeriod)).toThrow()
    })

    it('getPrice throws for invalid period "weekly"', () => {
      expect(() => getPrice('momentum', 'weekly' as BillingPeriod)).toThrow()
    })
  })
})

describe('getPricingOption', () => {
  it('should return full pricing object for momentum monthly', () => {
    const option = getPricingOption('momentum', 'monthly')
    expect(option.amount).toBe(12)
    expect(option.currency).toBe('USD')
    expect(option.discount).toBeNull()
  })

  it('should return full pricing object for accelerate quarterly', () => {
    const option = getPricingOption('accelerate', 'quarterly')
    expect(option.amount).toBe(45)
    expect(option.currency).toBe('USD')
    expect(option.discount).toBe('17%')
  })

  it('should return full pricing object for elite yearly', () => {
    const option = getPricingOption('elite', 'yearly')
    expect(option.amount).toBe(249)
    expect(option.currency).toBe('USD')
    expect(option.discount).toBe('28%')
  })
})

describe('isUpgrade', () => {
  describe('should return true for upgrades', () => {
    it('momentum → accelerate', () => expect(isUpgrade('momentum', 'accelerate')).toBe(true))
    it('momentum → elite', () => expect(isUpgrade('momentum', 'elite')).toBe(true))
    it('accelerate → elite', () => expect(isUpgrade('accelerate', 'elite')).toBe(true))
  })

  describe('should return false for downgrades', () => {
    it('elite → accelerate', () => expect(isUpgrade('elite', 'accelerate')).toBe(false))
    it('elite → momentum', () => expect(isUpgrade('elite', 'momentum')).toBe(false))
    it('accelerate → momentum', () => expect(isUpgrade('accelerate', 'momentum')).toBe(false))
  })

  describe('should return false for same tier', () => {
    it('momentum → momentum', () => expect(isUpgrade('momentum', 'momentum')).toBe(false))
    it('accelerate → accelerate', () => expect(isUpgrade('accelerate', 'accelerate')).toBe(false))
    it('elite → elite', () => expect(isUpgrade('elite', 'elite')).toBe(false))
  })
})

describe('isDowngrade', () => {
  describe('should return true for downgrades', () => {
    it('elite → accelerate', () => expect(isDowngrade('elite', 'accelerate')).toBe(true))
    it('elite → momentum', () => expect(isDowngrade('elite', 'momentum')).toBe(true))
    it('accelerate → momentum', () => expect(isDowngrade('accelerate', 'momentum')).toBe(true))
  })

  describe('should return false for upgrades', () => {
    it('momentum → accelerate', () => expect(isDowngrade('momentum', 'accelerate')).toBe(false))
    it('momentum → elite', () => expect(isDowngrade('momentum', 'elite')).toBe(false))
    it('accelerate → elite', () => expect(isDowngrade('accelerate', 'elite')).toBe(false))
  })

  describe('should return false for same tier', () => {
    it('momentum → momentum', () => expect(isDowngrade('momentum', 'momentum')).toBe(false))
    it('accelerate → accelerate', () => expect(isDowngrade('accelerate', 'accelerate')).toBe(false))
    it('elite → elite', () => expect(isDowngrade('elite', 'elite')).toBe(false))
  })
})

describe('getPeriodEndDate', () => {
  it('monthly adds 1 month', () => {
    const start = new Date('2026-01-15T10:00:00Z')
    const end = getPeriodEndDate(start, 'monthly')
    expect(end.getMonth()).toBe(1) // February
    expect(end.getDate()).toBe(15)
  })

  it('quarterly adds 3 months', () => {
    const start = new Date('2026-01-15T10:00:00Z')
    const end = getPeriodEndDate(start, 'quarterly')
    expect(end.getMonth()).toBe(3) // April
    expect(end.getDate()).toBe(15)
  })

  it('yearly adds 12 months', () => {
    const start = new Date('2026-01-15T10:00:00Z')
    const end = getPeriodEndDate(start, 'yearly')
    expect(end.getFullYear()).toBe(2027)
    expect(end.getMonth()).toBe(0) // January
  })

  it('should handle year boundary for monthly', () => {
    const start = new Date('2026-12-15T10:00:00Z')
    const end = getPeriodEndDate(start, 'monthly')
    expect(end.getFullYear()).toBe(2027)
    expect(end.getMonth()).toBe(0) // January
  })

  it('should handle year boundary for quarterly', () => {
    const start = new Date('2026-11-15T10:00:00Z')
    const end = getPeriodEndDate(start, 'quarterly')
    expect(end.getFullYear()).toBe(2027)
    expect(end.getMonth()).toBe(1) // February
  })

  it('should preserve time of day', () => {
    const start = new Date('2026-01-15T14:30:45Z')
    const end = getPeriodEndDate(start, 'monthly')
    expect(end.getHours()).toBe(start.getHours())
    expect(end.getMinutes()).toBe(start.getMinutes())
    expect(end.getSeconds()).toBe(start.getSeconds())
  })

  it('should not mutate the original date', () => {
    const start = new Date('2026-01-15T10:00:00Z')
    const originalTime = start.getTime()
    getPeriodEndDate(start, 'monthly')
    expect(start.getTime()).toBe(originalTime)
  })

  describe('month-end edge cases', () => {
    // Note: JavaScript Date.setMonth() rolls over when day exceeds target month's days
    // This documents the actual behavior of getPeriodEndDate

    it('monthly from Jan 31 rolls over to March (non-leap year)', () => {
      // 2027 is not a leap year - Feb has 28 days
      // Jan 31 + 1 month = Feb 31 which rolls to March 3
      const start = new Date('2027-01-31T10:00:00Z')
      const end = getPeriodEndDate(start, 'monthly')
      expect(end.getMonth()).toBe(2) // March (rolled over from Feb)
      expect(end.getDate()).toBe(3) // Feb 31 → March 3 (31-28=3)
    })

    it('monthly from Jan 31 rolls over to March (leap year)', () => {
      // 2028 is a leap year - Feb has 29 days
      // Jan 31 + 1 month = Feb 31 which rolls to March 2
      const start = new Date('2028-01-31T10:00:00Z')
      const end = getPeriodEndDate(start, 'monthly')
      expect(end.getMonth()).toBe(2) // March (rolled over from Feb)
      expect(end.getDate()).toBe(2) // Feb 31 → March 2 (31-29=2)
    })

    it('monthly from March 31 rolls over to May', () => {
      // March 31 + 1 month = April 31 which rolls to May 1
      const start = new Date('2026-03-31T10:00:00Z')
      const end = getPeriodEndDate(start, 'monthly')
      expect(end.getMonth()).toBe(4) // May (rolled over from April)
      expect(end.getDate()).toBe(1) // April 31 → May 1
    })

    it('quarterly from Nov 30 rolls over to March', () => {
      // Nov 30 + 3 months = Feb 30 which rolls to March
      const start = new Date('2026-11-30T10:00:00Z')
      const end = getPeriodEndDate(start, 'quarterly')
      expect(end.getFullYear()).toBe(2027)
      expect(end.getMonth()).toBe(2) // March (rolled over from Feb)
      expect(end.getDate()).toBe(2) // Feb 30 → March 2 (30-28=2)
    })

    it('monthly from standard date (15th) works correctly', () => {
      // Standard dates that don't cause rollover
      const start = new Date('2026-01-15T10:00:00Z')
      const end = getPeriodEndDate(start, 'monthly')
      expect(end.getMonth()).toBe(1) // February
      expect(end.getDate()).toBe(15) // Same day
    })
  })
})

describe('calculateProratedCharge', () => {
  // Use fixed dates for predictable tests
  const periodStart = new Date('2026-01-01T00:00:00Z')
  const periodEnd = new Date('2026-02-01T00:00:00Z') // 31 days

  describe('upgrade scenarios', () => {
    it('momentum → accelerate monthly with 15 days remaining', () => {
      // Mock "now" to be Jan 16 (15 days remaining)
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-17T00:00:00Z')) // 15 days remaining

      const charge = calculateProratedCharge('momentum', 'accelerate', 'monthly', periodStart, periodEnd)

      // Price diff: $18 - $12 = $6
      // Daily rate: $6 / 31 ≈ $0.1935
      // Prorated: $0.1935 × 15 ≈ $2.90
      expect(charge).toBeGreaterThan(0)
      expect(charge).toBeLessThan(6) // Less than full price difference

      vi.useRealTimers()
    })

    it('momentum → elite monthly at start of period', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z')) // Full 31 days remaining

      const charge = calculateProratedCharge('momentum', 'elite', 'monthly', periodStart, periodEnd)

      // Price diff: $29 - $12 = $17
      // Should be close to full difference
      expect(charge).toBeCloseTo(17, 0)

      vi.useRealTimers()
    })

    it('accelerate → elite monthly halfway through', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-16T00:00:00Z')) // ~16 days remaining

      const charge = calculateProratedCharge('accelerate', 'elite', 'monthly', periodStart, periodEnd)

      // Price diff: $29 - $18 = $11
      // Should be roughly half
      expect(charge).toBeGreaterThan(4)
      expect(charge).toBeLessThan(7)

      vi.useRealTimers()
    })
  })

  describe('downgrade scenarios (should return 0)', () => {
    it('elite → accelerate should return 0', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-15T00:00:00Z'))

      const charge = calculateProratedCharge('elite', 'accelerate', 'monthly', periodStart, periodEnd)
      expect(charge).toBe(0)

      vi.useRealTimers()
    })

    it('accelerate → momentum should return 0', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-15T00:00:00Z'))

      const charge = calculateProratedCharge('accelerate', 'momentum', 'monthly', periodStart, periodEnd)
      expect(charge).toBe(0)

      vi.useRealTimers()
    })
  })

  describe('same tier (should return 0)', () => {
    it('momentum → momentum should return 0', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-15T00:00:00Z'))

      const charge = calculateProratedCharge('momentum', 'momentum', 'monthly', periodStart, periodEnd)
      expect(charge).toBe(0)

      vi.useRealTimers()
    })
  })

  describe('edge cases', () => {
    it('should return 0 when period has ended', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-02-05T00:00:00Z')) // After period end

      const charge = calculateProratedCharge('momentum', 'accelerate', 'monthly', periodStart, periodEnd)
      expect(charge).toBe(0)

      vi.useRealTimers()
    })

    it('should round to 2 decimal places', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-10T00:00:00Z'))

      const charge = calculateProratedCharge('momentum', 'accelerate', 'monthly', periodStart, periodEnd)

      // Check it has at most 2 decimal places
      const decimalPlaces = (charge.toString().split('.')[1] || '').length
      expect(decimalPlaces).toBeLessThanOrEqual(2)

      vi.useRealTimers()
    })
  })
})

// ============================================================================
// Validation Function Tests
// ============================================================================

describe('isValidTier', () => {
  describe('valid tiers', () => {
    it('momentum', () => expect(isValidTier('momentum')).toBe(true))
    it('accelerate', () => expect(isValidTier('accelerate')).toBe(true))
    it('elite', () => expect(isValidTier('elite')).toBe(true))
  })

  describe('invalid tiers', () => {
    it('free', () => expect(isValidTier('free')).toBe(false))
    it('basic', () => expect(isValidTier('basic')).toBe(false))
    it('premium', () => expect(isValidTier('premium')).toBe(false))
    it('empty string', () => expect(isValidTier('')).toBe(false))
    it('null', () => expect(isValidTier(null)).toBe(false))
    it('undefined', () => expect(isValidTier(undefined)).toBe(false))
  })
})

describe('isValidBillingPeriod', () => {
  describe('valid periods', () => {
    it('monthly', () => expect(isValidBillingPeriod('monthly')).toBe(true))
    it('quarterly', () => expect(isValidBillingPeriod('quarterly')).toBe(true))
    it('yearly', () => expect(isValidBillingPeriod('yearly')).toBe(true))
  })

  describe('invalid periods', () => {
    it('weekly', () => expect(isValidBillingPeriod('weekly')).toBe(false))
    it('annual', () => expect(isValidBillingPeriod('annual')).toBe(false))
    it('empty string', () => expect(isValidBillingPeriod('')).toBe(false))
    it('null', () => expect(isValidBillingPeriod(null)).toBe(false))
    it('undefined', () => expect(isValidBillingPeriod(undefined)).toBe(false))
  })
})

describe('isValidStatus', () => {
  describe('valid statuses', () => {
    it('active', () => expect(isValidStatus('active')).toBe(true))
    it('cancelled', () => expect(isValidStatus('cancelled')).toBe(true))
    it('past_due', () => expect(isValidStatus('past_due')).toBe(true))
    it('expired', () => expect(isValidStatus('expired')).toBe(true))
  })

  describe('invalid statuses', () => {
    it('inactive', () => expect(isValidStatus('inactive')).toBe(false))
    it('pending', () => expect(isValidStatus('pending')).toBe(false))
    it('empty string', () => expect(isValidStatus('')).toBe(false))
    it('null', () => expect(isValidStatus(null)).toBe(false))
    it('undefined', () => expect(isValidStatus(undefined)).toBe(false))
  })
})

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('getAllTiers', () => {
  it('should return all 3 tiers', () => {
    const tiers = getAllTiers()
    expect(tiers).toHaveLength(3)
  })

  it('should return tiers in order', () => {
    const tiers = getAllTiers()
    expect(tiers).toEqual(['momentum', 'accelerate', 'elite'])
  })

  it('should return a copy (not mutate TIER_ORDER)', () => {
    const tiers = getAllTiers()
    tiers.push('test' as SubscriptionTier)
    expect(TIER_ORDER).toHaveLength(3)
  })
})

describe('getMostPopularTier', () => {
  it('should return accelerate', () => {
    expect(getMostPopularTier()).toBe('accelerate')
  })
})

describe('getSavingsPercentage', () => {
  describe('monthly (no savings)', () => {
    it('momentum monthly = 0%', () => expect(getSavingsPercentage('momentum', 'monthly')).toBe(0))
    it('accelerate monthly = 0%', () => expect(getSavingsPercentage('accelerate', 'monthly')).toBe(0))
    it('elite monthly = 0%', () => expect(getSavingsPercentage('elite', 'monthly')).toBe(0))
  })

  describe('quarterly', () => {
    it('momentum quarterly = 17%', () => {
      // $12 × 3 = $36, actual $30, savings = (36-30)/36 = 17%
      expect(getSavingsPercentage('momentum', 'quarterly')).toBe(17)
    })
    it('accelerate quarterly = 17%', () => {
      // $18 × 3 = $54, actual $45, savings = (54-45)/54 = 17%
      expect(getSavingsPercentage('accelerate', 'quarterly')).toBe(17)
    })
    it('elite quarterly = 14%', () => {
      // $29 × 3 = $87, actual $75, savings = (87-75)/87 = 14%
      expect(getSavingsPercentage('elite', 'quarterly')).toBe(14)
    })
  })

  describe('yearly', () => {
    it('momentum yearly = 31%', () => {
      // $12 × 12 = $144, actual $99, savings = (144-99)/144 = 31%
      expect(getSavingsPercentage('momentum', 'yearly')).toBe(31)
    })
    it('accelerate yearly = 31%', () => {
      // $18 × 12 = $216, actual $149, savings = (216-149)/216 = 31%
      expect(getSavingsPercentage('accelerate', 'yearly')).toBe(31)
    })
    it('elite yearly = 28%', () => {
      // $29 × 12 = $348, actual $249, savings = (348-249)/348 = 28%
      expect(getSavingsPercentage('elite', 'yearly')).toBe(28)
    })
  })
})

describe('formatPrice', () => {
  it('should format whole numbers without decimals', () => {
    expect(formatPrice(12)).toBe('$12')
    expect(formatPrice(99)).toBe('$99')
    expect(formatPrice(249)).toBe('$249')
  })

  it('should format decimals up to 2 places', () => {
    expect(formatPrice(12.50)).toBe('$12.5')
    expect(formatPrice(12.99)).toBe('$12.99')
  })

  it('should use default USD currency', () => {
    expect(formatPrice(100)).toBe('$100')
  })

  it('should support other currencies', () => {
    expect(formatPrice(100, 'EUR')).toContain('100')
  })
})

describe('hasFeature', () => {
  describe('momentum tier', () => {
    it('applicationTracker = true', () => expect(hasFeature('momentum', 'applicationTracker')).toBe(true))
    it('aiAvatarInterviews = false', () => expect(hasFeature('momentum', 'aiAvatarInterviews')).toBe(false))
  })

  describe('accelerate tier', () => {
    it('applicationTracker = true', () => expect(hasFeature('accelerate', 'applicationTracker')).toBe(true))
    it('aiAvatarInterviews = true', () => expect(hasFeature('accelerate', 'aiAvatarInterviews')).toBe(true))
  })

  describe('elite tier', () => {
    it('applicationTracker = true', () => expect(hasFeature('elite', 'applicationTracker')).toBe(true))
    it('aiAvatarInterviews = true', () => expect(hasFeature('elite', 'aiAvatarInterviews')).toBe(true))
  })
})

describe('getResourceLimit', () => {
  it('momentum applications = 8', () => {
    expect(getResourceLimit('momentum', 'applications')).toBe(8)
  })

  it('accelerate applications = 15', () => {
    expect(getResourceLimit('accelerate', 'applications')).toBe(15)
  })

  it('elite applications = -1 (unlimited)', () => {
    expect(getResourceLimit('elite', 'applications')).toBe(-1)
  })

  it('elite aiAvatarInterviews = 10 (capped)', () => {
    expect(getResourceLimit('elite', 'aiAvatarInterviews')).toBe(10)
  })
})

describe('isResourceUnlimited', () => {
  describe('momentum (none unlimited)', () => {
    it('applications is not unlimited', () => expect(isResourceUnlimited('momentum', 'applications')).toBe(false))
    it('aiAvatarInterviews is not unlimited', () => expect(isResourceUnlimited('momentum', 'aiAvatarInterviews')).toBe(false))
  })

  describe('accelerate (none unlimited)', () => {
    it('applications is not unlimited', () => expect(isResourceUnlimited('accelerate', 'applications')).toBe(false))
    it('aiAvatarInterviews is not unlimited', () => expect(isResourceUnlimited('accelerate', 'aiAvatarInterviews')).toBe(false))
  })

  describe('elite (core features unlimited)', () => {
    it('applications is unlimited', () => expect(isResourceUnlimited('elite', 'applications')).toBe(true))
    it('cvs is unlimited', () => expect(isResourceUnlimited('elite', 'cvs')).toBe(true))
    it('interviews is unlimited', () => expect(isResourceUnlimited('elite', 'interviews')).toBe(true))
    it('compensation is unlimited', () => expect(isResourceUnlimited('elite', 'compensation')).toBe(true))
    it('contracts is unlimited', () => expect(isResourceUnlimited('elite', 'contracts')).toBe(true))
    it('aiAvatarInterviews is NOT unlimited (capped at 10)', () => expect(isResourceUnlimited('elite', 'aiAvatarInterviews')).toBe(false))
  })
})

// ============================================================================
// Cross-Validation Tests
// ============================================================================

describe('Cross-Validation', () => {
  it('all TIER_ORDER values should have configs', () => {
    TIER_ORDER.forEach(tier => {
      expect(TIER_CONFIGS[tier]).toBeDefined()
    })
  })

  it('all BILLING_PERIODS should be in pricing', () => {
    Object.values(TIER_CONFIGS).forEach(config => {
      BILLING_PERIODS.forEach(period => {
        expect(config.pricing[period]).toBeDefined()
        expect(config.pricing[period].amount).toBeGreaterThan(0)
        expect(config.pricing[period].currency).toBe('USD')
      })
    })
  })

  it('tier pricing should increase with tier level', () => {
    BILLING_PERIODS.forEach(period => {
      const momentumPrice = getPrice('momentum', period)
      const acceleratePrice = getPrice('accelerate', period)
      const elitePrice = getPrice('elite', period)

      expect(acceleratePrice).toBeGreaterThan(momentumPrice)
      expect(elitePrice).toBeGreaterThan(acceleratePrice)
    })
  })

  it('tier limits should increase with tier level (except aiAvatarInterviews)', () => {
    const resources: (keyof TierLimits)[] = ['applications', 'cvs', 'interviews', 'compensation', 'contracts']

    resources.forEach(resource => {
      const momentumLimit = TIER_CONFIGS.momentum.limits[resource]
      const accelerateLimit = TIER_CONFIGS.accelerate.limits[resource]
      const eliteLimit = TIER_CONFIGS.elite.limits[resource]

      expect(accelerateLimit).toBeGreaterThan(momentumLimit)
      // Elite has -1 (unlimited), which is conceptually > any positive number
      expect(eliteLimit).toBe(-1)
    })
  })

  it('only one tier should be marked as most popular', () => {
    const popularTiers = Object.values(TIER_CONFIGS).filter(c => c.isMostPopular)
    expect(popularTiers).toHaveLength(1)
    expect(popularTiers[0].name).toBe('Accelerate')
  })

  it('discount percentages in pricing should match calculated savings', () => {
    // Quarterly
    expect(TIER_CONFIGS.momentum.pricing.quarterly.discount).toBe('17%')
    expect(getSavingsPercentage('momentum', 'quarterly')).toBe(17)

    expect(TIER_CONFIGS.accelerate.pricing.quarterly.discount).toBe('17%')
    expect(getSavingsPercentage('accelerate', 'quarterly')).toBe(17)

    expect(TIER_CONFIGS.elite.pricing.quarterly.discount).toBe('14%')
    expect(getSavingsPercentage('elite', 'quarterly')).toBe(14)

    // Yearly
    expect(TIER_CONFIGS.momentum.pricing.yearly.discount).toBe('31%')
    expect(getSavingsPercentage('momentum', 'yearly')).toBe(31)

    expect(TIER_CONFIGS.accelerate.pricing.yearly.discount).toBe('31%')
    expect(getSavingsPercentage('accelerate', 'yearly')).toBe(31)

    expect(TIER_CONFIGS.elite.pricing.yearly.discount).toBe('28%')
    expect(getSavingsPercentage('elite', 'yearly')).toBe(28)
  })
})
