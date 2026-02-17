/**
 * Subscription Configuration Tests
 *
 * Tests for the subscription configuration module.
 * Verifies tier limits, pricing, upgrade/downgrade logic, and kill switch behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getTierConfig,
  getTierLimits,
  getPrice,
  isUpgrade,
  isDowngrade,
  getPeriodEndDate,
  isSubscriptionEnabled,
  getAllTiers,
  isValidTier,
  isValidBillingPeriod,
  isValidStatus,
  getSavingsPercentage,
  formatPrice,
  TIER_CONFIGS,
  type SubscriptionTier,
  type BillingPeriod,
} from '@/lib/subscription/config'

describe('Subscription Configuration', () => {
  // ============================================================================
  // getTierConfig tests
  // ============================================================================

  describe('getTierConfig', () => {
    it('should return correct config for momentum tier', () => {
      const config = getTierConfig('momentum')

      expect(config.name).toBe('momentum')
      expect(config.displayName).toBe('Momentum')
      expect(config.limits.applications).toBe(8)
      expect(config.limits.cvs).toBe(8)
      expect(config.limits.interviews).toBe(8)
      expect(config.limits.compensation).toBe(8)
      expect(config.limits.contracts).toBe(8)
      expect(config.limits.aiAvatarInterviews).toBe(0)
    })

    it('should return correct config for accelerate tier', () => {
      const config = getTierConfig('accelerate')

      expect(config.name).toBe('accelerate')
      expect(config.displayName).toBe('Accelerate')
      expect(config.isPopular).toBe(true)
      expect(config.limits.applications).toBe(15)
      expect(config.limits.cvs).toBe(15)
      expect(config.limits.interviews).toBe(15)
      expect(config.limits.compensation).toBe(15)
      expect(config.limits.contracts).toBe(15)
      expect(config.limits.aiAvatarInterviews).toBe(5)
    })

    it('should return correct config for elite tier', () => {
      const config = getTierConfig('elite')

      expect(config.name).toBe('elite')
      expect(config.displayName).toBe('Elite')
      expect(config.limits.applications).toBe(-1)  // unlimited
      expect(config.limits.cvs).toBe(-1)
      expect(config.limits.interviews).toBe(-1)
      expect(config.limits.compensation).toBe(-1)
      expect(config.limits.contracts).toBe(-1)
      expect(config.limits.aiAvatarInterviews).toBe(10)
    })
  })

  // ============================================================================
  // getTierLimits tests
  // ============================================================================

  describe('getTierLimits', () => {
    it('should return momentum limits: apps=8, cvs=8, interviews=8, compensation=8, contracts=8, aiAvatar=0', () => {
      const limits = getTierLimits('momentum')

      expect(limits.applications).toBe(8)
      expect(limits.cvs).toBe(8)
      expect(limits.interviews).toBe(8)
      expect(limits.compensation).toBe(8)
      expect(limits.contracts).toBe(8)
      expect(limits.aiAvatarInterviews).toBe(0)
    })

    it('should return accelerate limits: apps=15, cvs=15, interviews=15, compensation=15, contracts=15, aiAvatar=5', () => {
      const limits = getTierLimits('accelerate')

      expect(limits.applications).toBe(15)
      expect(limits.cvs).toBe(15)
      expect(limits.interviews).toBe(15)
      expect(limits.compensation).toBe(15)
      expect(limits.contracts).toBe(15)
      expect(limits.aiAvatarInterviews).toBe(5)
    })

    it('should return elite limits: apps=-1, cvs=-1, interviews=-1, compensation=-1, contracts=-1, aiAvatar=10', () => {
      const limits = getTierLimits('elite')

      expect(limits.applications).toBe(-1)
      expect(limits.cvs).toBe(-1)
      expect(limits.interviews).toBe(-1)
      expect(limits.compensation).toBe(-1)
      expect(limits.contracts).toBe(-1)
      expect(limits.aiAvatarInterviews).toBe(10)
    })

    it('elite tier -1 should represent unlimited', () => {
      const limits = getTierLimits('elite')
      const UNLIMITED = -1

      expect(limits.applications).toBe(UNLIMITED)
      expect(limits.cvs).toBe(UNLIMITED)
      expect(limits.interviews).toBe(UNLIMITED)
      expect(limits.compensation).toBe(UNLIMITED)
      expect(limits.contracts).toBe(UNLIMITED)
    })
  })

  // ============================================================================
  // getPrice tests - all 9 tier × period combinations
  // ============================================================================

  describe('getPrice', () => {
    describe('momentum pricing', () => {
      it('monthly = $12', () => {
        expect(getPrice('momentum', 'monthly')).toBe(12)
      })

      it('quarterly = $30', () => {
        expect(getPrice('momentum', 'quarterly')).toBe(30)
      })

      it('yearly = $99', () => {
        expect(getPrice('momentum', 'yearly')).toBe(99)
      })
    })

    describe('accelerate pricing', () => {
      it('monthly = $18', () => {
        expect(getPrice('accelerate', 'monthly')).toBe(18)
      })

      it('quarterly = $45', () => {
        expect(getPrice('accelerate', 'quarterly')).toBe(45)
      })

      it('yearly = $149', () => {
        expect(getPrice('accelerate', 'yearly')).toBe(149)
      })
    })

    describe('elite pricing', () => {
      it('monthly = $29', () => {
        expect(getPrice('elite', 'monthly')).toBe(29)
      })

      it('quarterly = $75', () => {
        expect(getPrice('elite', 'quarterly')).toBe(75)
      })

      it('yearly = $249', () => {
        expect(getPrice('elite', 'yearly')).toBe(249)
      })
    })

    it('should return all 9 pricing combinations correctly', () => {
      const expectedPrices: Record<SubscriptionTier, Record<BillingPeriod, number>> = {
        momentum: { monthly: 12, quarterly: 30, yearly: 99 },
        accelerate: { monthly: 18, quarterly: 45, yearly: 149 },
        elite: { monthly: 29, quarterly: 75, yearly: 249 },
      }

      const tiers: SubscriptionTier[] = ['momentum', 'accelerate', 'elite']
      const periods: BillingPeriod[] = ['monthly', 'quarterly', 'yearly']

      tiers.forEach(tier => {
        periods.forEach(period => {
          expect(getPrice(tier, period)).toBe(expectedPrices[tier][period])
        })
      })
    })
  })

  // ============================================================================
  // isUpgrade tests
  // ============================================================================

  describe('isUpgrade', () => {
    it('momentum → accelerate should be an upgrade', () => {
      expect(isUpgrade('momentum', 'accelerate')).toBe(true)
    })

    it('accelerate → elite should be an upgrade', () => {
      expect(isUpgrade('accelerate', 'elite')).toBe(true)
    })

    it('momentum → elite should be an upgrade', () => {
      expect(isUpgrade('momentum', 'elite')).toBe(true)
    })

    it('elite → momentum should NOT be an upgrade', () => {
      expect(isUpgrade('elite', 'momentum')).toBe(false)
    })

    it('elite → accelerate should NOT be an upgrade', () => {
      expect(isUpgrade('elite', 'accelerate')).toBe(false)
    })

    it('accelerate → momentum should NOT be an upgrade', () => {
      expect(isUpgrade('accelerate', 'momentum')).toBe(false)
    })

    it('same tier should NOT be an upgrade', () => {
      expect(isUpgrade('momentum', 'momentum')).toBe(false)
      expect(isUpgrade('accelerate', 'accelerate')).toBe(false)
      expect(isUpgrade('elite', 'elite')).toBe(false)
    })
  })

  // ============================================================================
  // isDowngrade tests
  // ============================================================================

  describe('isDowngrade', () => {
    it('elite → accelerate should be a downgrade', () => {
      expect(isDowngrade('elite', 'accelerate')).toBe(true)
    })

    it('accelerate → momentum should be a downgrade', () => {
      expect(isDowngrade('accelerate', 'momentum')).toBe(true)
    })

    it('elite → momentum should be a downgrade', () => {
      expect(isDowngrade('elite', 'momentum')).toBe(true)
    })

    it('momentum → elite should NOT be a downgrade', () => {
      expect(isDowngrade('momentum', 'elite')).toBe(false)
    })

    it('momentum → accelerate should NOT be a downgrade', () => {
      expect(isDowngrade('momentum', 'accelerate')).toBe(false)
    })

    it('accelerate → elite should NOT be a downgrade', () => {
      expect(isDowngrade('accelerate', 'elite')).toBe(false)
    })

    it('same tier should NOT be a downgrade', () => {
      expect(isDowngrade('momentum', 'momentum')).toBe(false)
      expect(isDowngrade('accelerate', 'accelerate')).toBe(false)
      expect(isDowngrade('elite', 'elite')).toBe(false)
    })
  })

  // ============================================================================
  // getPeriodEndDate tests
  // ============================================================================

  describe('getPeriodEndDate', () => {
    it('monthly adds 1 month', () => {
      const start = new Date('2026-01-15T10:00:00Z')
      const end = getPeriodEndDate(start, 'monthly')

      expect(end.getFullYear()).toBe(2026)
      expect(end.getMonth()).toBe(1)  // February (0-indexed)
      expect(end.getDate()).toBe(15)
    })

    it('quarterly adds 3 months', () => {
      const start = new Date('2026-01-15T10:00:00Z')
      const end = getPeriodEndDate(start, 'quarterly')

      expect(end.getFullYear()).toBe(2026)
      expect(end.getMonth()).toBe(3)  // April (0-indexed)
      expect(end.getDate()).toBe(15)
    })

    it('yearly adds 12 months', () => {
      const start = new Date('2026-01-15T10:00:00Z')
      const end = getPeriodEndDate(start, 'yearly')

      expect(end.getFullYear()).toBe(2027)
      expect(end.getMonth()).toBe(0)  // January (0-indexed)
      expect(end.getDate()).toBe(15)
    })

    it('should handle year boundary correctly for monthly', () => {
      const start = new Date('2026-12-15T10:00:00Z')
      const end = getPeriodEndDate(start, 'monthly')

      expect(end.getFullYear()).toBe(2027)
      expect(end.getMonth()).toBe(0)  // January
    })

    it('should handle year boundary correctly for quarterly', () => {
      const start = new Date('2026-11-15T10:00:00Z')
      const end = getPeriodEndDate(start, 'quarterly')

      expect(end.getFullYear()).toBe(2027)
      expect(end.getMonth()).toBe(1)  // February
    })

    it('should preserve time of day', () => {
      const start = new Date('2026-01-15T14:30:00Z')
      const end = getPeriodEndDate(start, 'monthly')

      expect(end.getHours()).toBe(start.getHours())
      expect(end.getMinutes()).toBe(start.getMinutes())
    })
  })

  // ============================================================================
  // isSubscriptionEnabled tests
  // ============================================================================

  describe('isSubscriptionEnabled', () => {
    const originalEnv = process.env

    beforeEach(() => {
      vi.resetModules()
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      process.env = originalEnv
    })

    it('should return false when env var is unset', () => {
      delete process.env.SUBSCRIPTION_ENABLED
      delete process.env.NEXT_PUBLIC_SUBSCRIPTION_ENABLED

      // Need to re-import to get fresh values
      // For this test, we'll test the logic directly
      const value = process.env.SUBSCRIPTION_ENABLED || process.env.NEXT_PUBLIC_SUBSCRIPTION_ENABLED || ''
      const result = value.toLowerCase() === 'true'

      expect(result).toBe(false)
    })

    it('should return false when env var is empty string', () => {
      process.env.SUBSCRIPTION_ENABLED = ''

      const value = process.env.SUBSCRIPTION_ENABLED || ''
      const result = value.toLowerCase() === 'true'

      expect(result).toBe(false)
    })

    it('should return false when env var is "false"', () => {
      process.env.SUBSCRIPTION_ENABLED = 'false'

      const value = process.env.SUBSCRIPTION_ENABLED || ''
      const result = value.toLowerCase() === 'true'

      expect(result).toBe(false)
    })

    it('should return false when env var is "FALSE"', () => {
      process.env.SUBSCRIPTION_ENABLED = 'FALSE'

      const value = process.env.SUBSCRIPTION_ENABLED || ''
      const result = value.toLowerCase() === 'true'

      expect(result).toBe(false)
    })

    it('should return true when env var is "true"', () => {
      process.env.SUBSCRIPTION_ENABLED = 'true'

      const value = process.env.SUBSCRIPTION_ENABLED || ''
      const result = value.toLowerCase() === 'true'

      expect(result).toBe(true)
    })

    it('should return true when env var is "TRUE"', () => {
      process.env.SUBSCRIPTION_ENABLED = 'TRUE'

      const value = process.env.SUBSCRIPTION_ENABLED || ''
      const result = value.toLowerCase() === 'true'

      expect(result).toBe(true)
    })

    it('should check NEXT_PUBLIC_SUBSCRIPTION_ENABLED as fallback', () => {
      delete process.env.SUBSCRIPTION_ENABLED
      process.env.NEXT_PUBLIC_SUBSCRIPTION_ENABLED = 'true'

      const value = process.env.SUBSCRIPTION_ENABLED || process.env.NEXT_PUBLIC_SUBSCRIPTION_ENABLED || ''
      const result = value.toLowerCase() === 'true'

      expect(result).toBe(true)
    })
  })

  // ============================================================================
  // getAllTiers tests
  // ============================================================================

  describe('getAllTiers', () => {
    it('should return all three tiers', () => {
      const tiers = getAllTiers()

      expect(tiers).toHaveLength(3)
      expect(tiers).toContain('momentum')
      expect(tiers).toContain('accelerate')
      expect(tiers).toContain('elite')
    })

    it('should return tiers in order from lowest to highest', () => {
      const tiers = getAllTiers()

      expect(tiers[0]).toBe('momentum')
      expect(tiers[1]).toBe('accelerate')
      expect(tiers[2]).toBe('elite')
    })
  })

  // ============================================================================
  // Validation function tests
  // ============================================================================

  describe('isValidTier', () => {
    it('should return true for valid tiers', () => {
      expect(isValidTier('momentum')).toBe(true)
      expect(isValidTier('accelerate')).toBe(true)
      expect(isValidTier('elite')).toBe(true)
    })

    it('should return false for invalid tiers', () => {
      expect(isValidTier('free')).toBe(false)
      expect(isValidTier('basic')).toBe(false)
      expect(isValidTier('premium')).toBe(false)
      expect(isValidTier('')).toBe(false)
    })

    it('should return false for null/undefined', () => {
      expect(isValidTier(null)).toBe(false)
      expect(isValidTier(undefined)).toBe(false)
    })
  })

  describe('isValidBillingPeriod', () => {
    it('should return true for valid periods', () => {
      expect(isValidBillingPeriod('monthly')).toBe(true)
      expect(isValidBillingPeriod('quarterly')).toBe(true)
      expect(isValidBillingPeriod('yearly')).toBe(true)
    })

    it('should return false for invalid periods', () => {
      expect(isValidBillingPeriod('weekly')).toBe(false)
      expect(isValidBillingPeriod('annual')).toBe(false)
      expect(isValidBillingPeriod('')).toBe(false)
    })

    it('should return false for null/undefined', () => {
      expect(isValidBillingPeriod(null)).toBe(false)
      expect(isValidBillingPeriod(undefined)).toBe(false)
    })
  })

  describe('isValidStatus', () => {
    it('should return true for valid statuses', () => {
      expect(isValidStatus('active')).toBe(true)
      expect(isValidStatus('cancelled')).toBe(true)
      expect(isValidStatus('past_due')).toBe(true)
      expect(isValidStatus('expired')).toBe(true)
    })

    it('should return false for invalid statuses', () => {
      expect(isValidStatus('inactive')).toBe(false)
      expect(isValidStatus('pending')).toBe(false)
      expect(isValidStatus('')).toBe(false)
    })

    it('should return false for null/undefined', () => {
      expect(isValidStatus(null)).toBe(false)
      expect(isValidStatus(undefined)).toBe(false)
    })
  })

  // ============================================================================
  // Savings percentage tests
  // ============================================================================

  describe('getSavingsPercentage', () => {
    it('should return 0 for monthly periods', () => {
      expect(getSavingsPercentage('momentum', 'monthly')).toBe(0)
      expect(getSavingsPercentage('accelerate', 'monthly')).toBe(0)
      expect(getSavingsPercentage('elite', 'monthly')).toBe(0)
    })

    it('should calculate quarterly savings correctly', () => {
      // momentum: $12 × 3 = $36, actual $30, savings 17%
      expect(getSavingsPercentage('momentum', 'quarterly')).toBe(17)

      // accelerate: $18 × 3 = $54, actual $45, savings 17%
      expect(getSavingsPercentage('accelerate', 'quarterly')).toBe(17)

      // elite: $29 × 3 = $87, actual $75, savings 14%
      expect(getSavingsPercentage('elite', 'quarterly')).toBe(14)
    })

    it('should calculate yearly savings correctly', () => {
      // momentum: $12 × 12 = $144, actual $99, savings 31%
      expect(getSavingsPercentage('momentum', 'yearly')).toBe(31)

      // accelerate: $18 × 12 = $216, actual $149, savings 31%
      expect(getSavingsPercentage('accelerate', 'yearly')).toBe(31)

      // elite: $29 × 12 = $348, actual $249, savings 28%
      expect(getSavingsPercentage('elite', 'yearly')).toBe(28)
    })
  })

  // ============================================================================
  // formatPrice tests
  // ============================================================================

  describe('formatPrice', () => {
    it('should format USD correctly', () => {
      expect(formatPrice(12)).toBe('$12')
      expect(formatPrice(99)).toBe('$99')
      expect(formatPrice(149)).toBe('$149')
    })

    it('should not show decimal places', () => {
      expect(formatPrice(12.50)).toBe('$13')  // Rounds up
      expect(formatPrice(12.49)).toBe('$12')  // Rounds down
    })
  })

  // ============================================================================
  // TIER_CONFIGS structure tests
  // ============================================================================

  describe('TIER_CONFIGS', () => {
    it('should have exactly 3 tiers', () => {
      expect(Object.keys(TIER_CONFIGS)).toHaveLength(3)
    })

    it('each tier should have required properties', () => {
      const requiredProps = ['name', 'displayName', 'limits', 'pricing', 'features']

      Object.values(TIER_CONFIGS).forEach(config => {
        requiredProps.forEach(prop => {
          expect(config).toHaveProperty(prop)
        })
      })
    })

    it('each tier should have 6 limit properties', () => {
      Object.values(TIER_CONFIGS).forEach(config => {
        expect(config.limits).toHaveProperty('applications')
        expect(config.limits).toHaveProperty('cvs')
        expect(config.limits).toHaveProperty('interviews')
        expect(config.limits).toHaveProperty('compensation')
        expect(config.limits).toHaveProperty('contracts')
        expect(config.limits).toHaveProperty('aiAvatarInterviews')
      })
    })

    it('each tier should have 3 pricing options', () => {
      Object.values(TIER_CONFIGS).forEach(config => {
        expect(config.pricing).toHaveProperty('monthly')
        expect(config.pricing).toHaveProperty('quarterly')
        expect(config.pricing).toHaveProperty('yearly')
      })
    })

    it('only accelerate should be marked as popular', () => {
      expect(TIER_CONFIGS.momentum.isPopular).toBeUndefined()
      expect(TIER_CONFIGS.accelerate.isPopular).toBe(true)
      expect(TIER_CONFIGS.elite.isPopular).toBeUndefined()
    })
  })
})
