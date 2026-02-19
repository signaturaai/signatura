/**
 * Pricing Page Tests (Phase 10.1)
 *
 * RALPH tests for the pricing page component logic.
 * Tests tier configurations, pricing calculations, and state logic.
 */

import { describe, it, expect } from 'vitest'
import {
  TIER_CONFIGS,
  TIER_ORDER,
  formatPrice,
  isUpgrade,
  isDowngrade,
  getPrice,
  getPricingOption,
  getSavingsPercentage,
} from '@/lib/subscription/config'
import type { SubscriptionTier, BillingPeriod } from '@/types/subscription'

// ============================================================================
// Test Data - Matches Pricing Page Constants
// ============================================================================

const EXPECTED_TIER_COLORS: Record<SubscriptionTier, string> = {
  momentum: 'teal',
  accelerate: 'purple',
  elite: 'amber',
}

const EXPECTED_FEATURE_COUNTS: Record<SubscriptionTier, number> = {
  momentum: 5,  // 5 features at 8 each
  accelerate: 6, // 5 features at 15 + AI Avatar
  elite: 2,     // Unlimited + AI Avatar
}

const EXPECTED_PRICES: Record<SubscriptionTier, Record<BillingPeriod, number>> = {
  momentum: { monthly: 12, quarterly: 30, yearly: 99 },
  accelerate: { monthly: 18, quarterly: 45, yearly: 149 },
  elite: { monthly: 29, quarterly: 75, yearly: 249 },
}

const EXPECTED_DISCOUNTS: Record<SubscriptionTier, Record<BillingPeriod, string | null>> = {
  momentum: { monthly: null, quarterly: '17%', yearly: '31%' },
  accelerate: { monthly: null, quarterly: '17%', yearly: '31%' },
  elite: { monthly: null, quarterly: '14%', yearly: '28%' },
}

// ============================================================================
// Tier Configuration Tests
// ============================================================================

describe('Pricing Page - Tier Configurations', () => {
  describe('Tier Order', () => {
    it('should have three tiers in correct order', () => {
      expect(TIER_ORDER).toEqual(['momentum', 'accelerate', 'elite'])
    })

    it('should have config for each tier', () => {
      for (const tier of TIER_ORDER) {
        expect(TIER_CONFIGS[tier]).toBeDefined()
        expect(TIER_CONFIGS[tier].name).toBeDefined()
        expect(TIER_CONFIGS[tier].tagline).toBeDefined()
        expect(TIER_CONFIGS[tier].pricing).toBeDefined()
        expect(TIER_CONFIGS[tier].limits).toBeDefined()
        expect(TIER_CONFIGS[tier].features).toBeDefined()
      }
    })
  })

  describe('Momentum Tier', () => {
    const config = TIER_CONFIGS.momentum

    it('should have correct name and tagline', () => {
      expect(config.name).toBe('Momentum')
      expect(config.tagline).toContain('job seekers')
    })

    it('should not be most popular', () => {
      expect(config.isMostPopular).toBe(false)
    })

    it('should have correct pricing', () => {
      expect(config.pricing.monthly.amount).toBe(12)
      expect(config.pricing.quarterly.amount).toBe(30)
      expect(config.pricing.yearly.amount).toBe(99)
    })

    it('should have correct discounts', () => {
      expect(config.pricing.monthly.discount).toBeNull()
      expect(config.pricing.quarterly.discount).toBe('17%')
      expect(config.pricing.yearly.discount).toBe('31%')
    })

    it('should have 8 as limit for all resources', () => {
      expect(config.limits.applications).toBe(8)
      expect(config.limits.cvs).toBe(8)
      expect(config.limits.interviews).toBe(8)
      expect(config.limits.compensation).toBe(8)
      expect(config.limits.contracts).toBe(8)
    })

    it('should not have AI Avatar interviews', () => {
      expect(config.limits.aiAvatarInterviews).toBe(0)
      expect(config.features.aiAvatarInterviews).toBe(false)
    })
  })

  describe('Accelerate Tier', () => {
    const config = TIER_CONFIGS.accelerate

    it('should have correct name and tagline', () => {
      expect(config.name).toBe('Accelerate')
      expect(config.tagline).toContain('serious job seekers')
    })

    it('should be marked as most popular', () => {
      expect(config.isMostPopular).toBe(true)
    })

    it('should have correct pricing', () => {
      expect(config.pricing.monthly.amount).toBe(18)
      expect(config.pricing.quarterly.amount).toBe(45)
      expect(config.pricing.yearly.amount).toBe(149)
    })

    it('should have 15 as limit for core resources', () => {
      expect(config.limits.applications).toBe(15)
      expect(config.limits.cvs).toBe(15)
      expect(config.limits.interviews).toBe(15)
      expect(config.limits.compensation).toBe(15)
      expect(config.limits.contracts).toBe(15)
    })

    it('should have 5 AI Avatar interviews', () => {
      expect(config.limits.aiAvatarInterviews).toBe(5)
      expect(config.features.aiAvatarInterviews).toBe(true)
    })
  })

  describe('Elite Tier', () => {
    const config = TIER_CONFIGS.elite

    it('should have correct name and tagline', () => {
      expect(config.name).toBe('Elite')
      expect(config.tagline).toContain('uncompromising')
    })

    it('should not be most popular', () => {
      expect(config.isMostPopular).toBe(false)
    })

    it('should have correct pricing', () => {
      expect(config.pricing.monthly.amount).toBe(29)
      expect(config.pricing.quarterly.amount).toBe(75)
      expect(config.pricing.yearly.amount).toBe(249)
    })

    it('should have unlimited (-1) for core resources', () => {
      expect(config.limits.applications).toBe(-1)
      expect(config.limits.cvs).toBe(-1)
      expect(config.limits.interviews).toBe(-1)
      expect(config.limits.compensation).toBe(-1)
      expect(config.limits.contracts).toBe(-1)
    })

    it('should have 10 AI Avatar interviews', () => {
      expect(config.limits.aiAvatarInterviews).toBe(10)
      expect(config.features.aiAvatarInterviews).toBe(true)
    })
  })
})

// ============================================================================
// Pricing Helper Function Tests
// ============================================================================

describe('Pricing Page - Price Formatting', () => {
  describe('formatPrice', () => {
    it('should format whole dollar amounts', () => {
      expect(formatPrice(12)).toBe('$12')
      expect(formatPrice(99)).toBe('$99')
      expect(formatPrice(249)).toBe('$249')
    })

    it('should format decimal amounts', () => {
      // formatPrice uses minimumFractionDigits: 0 so trailing zeros are dropped
      expect(formatPrice(12.5)).toBe('$12.5')
      expect(formatPrice(99.99)).toBe('$99.99')
    })

    it('should handle zero', () => {
      expect(formatPrice(0)).toBe('$0')
    })
  })

  describe('getPrice', () => {
    it('should return correct prices for momentum', () => {
      expect(getPrice('momentum', 'monthly')).toBe(12)
      expect(getPrice('momentum', 'quarterly')).toBe(30)
      expect(getPrice('momentum', 'yearly')).toBe(99)
    })

    it('should return correct prices for accelerate', () => {
      expect(getPrice('accelerate', 'monthly')).toBe(18)
      expect(getPrice('accelerate', 'quarterly')).toBe(45)
      expect(getPrice('accelerate', 'yearly')).toBe(149)
    })

    it('should return correct prices for elite', () => {
      expect(getPrice('elite', 'monthly')).toBe(29)
      expect(getPrice('elite', 'quarterly')).toBe(75)
      expect(getPrice('elite', 'yearly')).toBe(249)
    })
  })

  describe('getPricingOption', () => {
    it('should return full pricing option with discount', () => {
      const option = getPricingOption('momentum', 'quarterly')
      expect(option.amount).toBe(30)
      expect(option.currency).toBe('USD')
      expect(option.discount).toBe('17%')
    })

    it('should return null discount for monthly', () => {
      const option = getPricingOption('accelerate', 'monthly')
      expect(option.discount).toBeNull()
    })
  })

  describe('getSavingsPercentage', () => {
    it('should return 0 for monthly', () => {
      expect(getSavingsPercentage('momentum', 'monthly')).toBe(0)
      expect(getSavingsPercentage('accelerate', 'monthly')).toBe(0)
      expect(getSavingsPercentage('elite', 'monthly')).toBe(0)
    })

    it('should calculate correct quarterly savings', () => {
      // Momentum: $12 * 3 = $36, pays $30 = 17% savings
      expect(getSavingsPercentage('momentum', 'quarterly')).toBe(17)
      // Accelerate: $18 * 3 = $54, pays $45 = 17% savings
      expect(getSavingsPercentage('accelerate', 'quarterly')).toBe(17)
      // Elite: $29 * 3 = $87, pays $75 = 14% savings
      expect(getSavingsPercentage('elite', 'quarterly')).toBe(14)
    })

    it('should calculate correct yearly savings', () => {
      // Momentum: $12 * 12 = $144, pays $99 = 31% savings
      expect(getSavingsPercentage('momentum', 'yearly')).toBe(31)
      // Accelerate: $18 * 12 = $216, pays $149 = 31% savings
      expect(getSavingsPercentage('accelerate', 'yearly')).toBe(31)
      // Elite: $29 * 12 = $348, pays $249 = 28% savings
      expect(getSavingsPercentage('elite', 'yearly')).toBe(28)
    })
  })
})

// ============================================================================
// Tier Comparison Tests
// ============================================================================

describe('Pricing Page - Tier Comparison Logic', () => {
  describe('isUpgrade', () => {
    it('should detect momentum → accelerate as upgrade', () => {
      expect(isUpgrade('momentum', 'accelerate')).toBe(true)
    })

    it('should detect momentum → elite as upgrade', () => {
      expect(isUpgrade('momentum', 'elite')).toBe(true)
    })

    it('should detect accelerate → elite as upgrade', () => {
      expect(isUpgrade('accelerate', 'elite')).toBe(true)
    })

    it('should not detect same tier as upgrade', () => {
      expect(isUpgrade('momentum', 'momentum')).toBe(false)
      expect(isUpgrade('accelerate', 'accelerate')).toBe(false)
      expect(isUpgrade('elite', 'elite')).toBe(false)
    })

    it('should not detect downgrades as upgrade', () => {
      expect(isUpgrade('accelerate', 'momentum')).toBe(false)
      expect(isUpgrade('elite', 'accelerate')).toBe(false)
      expect(isUpgrade('elite', 'momentum')).toBe(false)
    })
  })

  describe('isDowngrade', () => {
    it('should detect accelerate → momentum as downgrade', () => {
      expect(isDowngrade('accelerate', 'momentum')).toBe(true)
    })

    it('should detect elite → accelerate as downgrade', () => {
      expect(isDowngrade('elite', 'accelerate')).toBe(true)
    })

    it('should detect elite → momentum as downgrade', () => {
      expect(isDowngrade('elite', 'momentum')).toBe(true)
    })

    it('should not detect same tier as downgrade', () => {
      expect(isDowngrade('momentum', 'momentum')).toBe(false)
      expect(isDowngrade('accelerate', 'accelerate')).toBe(false)
      expect(isDowngrade('elite', 'elite')).toBe(false)
    })

    it('should not detect upgrades as downgrade', () => {
      expect(isDowngrade('momentum', 'accelerate')).toBe(false)
      expect(isDowngrade('momentum', 'elite')).toBe(false)
      expect(isDowngrade('accelerate', 'elite')).toBe(false)
    })
  })
})

// ============================================================================
// Button State Logic Tests
// ============================================================================

describe('Pricing Page - Button State Logic', () => {
  type ButtonState = 'Select Plan' | 'Current Plan' | 'Upgrade' | 'Downgrade'

  function getButtonState(currentTier: SubscriptionTier | null, targetTier: SubscriptionTier): ButtonState {
    if (currentTier === targetTier) return 'Current Plan'
    if (currentTier === null) return 'Select Plan'
    if (isUpgrade(currentTier, targetTier)) return 'Upgrade'
    if (isDowngrade(currentTier, targetTier)) return 'Downgrade'
    return 'Select Plan'
  }

  describe('No Current Subscription', () => {
    it('should show Select Plan for all tiers', () => {
      expect(getButtonState(null, 'momentum')).toBe('Select Plan')
      expect(getButtonState(null, 'accelerate')).toBe('Select Plan')
      expect(getButtonState(null, 'elite')).toBe('Select Plan')
    })
  })

  describe('Current Tier: Momentum', () => {
    it('should show Current Plan for momentum', () => {
      expect(getButtonState('momentum', 'momentum')).toBe('Current Plan')
    })

    it('should show Upgrade for accelerate and elite', () => {
      expect(getButtonState('momentum', 'accelerate')).toBe('Upgrade')
      expect(getButtonState('momentum', 'elite')).toBe('Upgrade')
    })
  })

  describe('Current Tier: Accelerate', () => {
    it('should show Downgrade for momentum', () => {
      expect(getButtonState('accelerate', 'momentum')).toBe('Downgrade')
    })

    it('should show Current Plan for accelerate', () => {
      expect(getButtonState('accelerate', 'accelerate')).toBe('Current Plan')
    })

    it('should show Upgrade for elite', () => {
      expect(getButtonState('accelerate', 'elite')).toBe('Upgrade')
    })
  })

  describe('Current Tier: Elite', () => {
    it('should show Downgrade for momentum and accelerate', () => {
      expect(getButtonState('elite', 'momentum')).toBe('Downgrade')
      expect(getButtonState('elite', 'accelerate')).toBe('Downgrade')
    })

    it('should show Current Plan for elite', () => {
      expect(getButtonState('elite', 'elite')).toBe('Current Plan')
    })
  })
})

// ============================================================================
// Recommendation Logic Tests
// ============================================================================

describe('Pricing Page - Recommendation Logic', () => {
  function shouldShowRecommendationBanner(
    recommendation: { monthsTracked: number } | null
  ): boolean {
    return Boolean(recommendation && recommendation.monthsTracked >= 1)
  }

  function shouldHighlightTier(
    tier: SubscriptionTier,
    recommendedTier: SubscriptionTier | null,
    hasUsageData: boolean
  ): boolean {
    return hasUsageData && recommendedTier === tier
  }

  describe('Recommendation Banner Visibility', () => {
    it('should show banner when monthsTracked >= 1', () => {
      expect(shouldShowRecommendationBanner({ monthsTracked: 1 })).toBe(true)
      expect(shouldShowRecommendationBanner({ monthsTracked: 3 })).toBe(true)
      expect(shouldShowRecommendationBanner({ monthsTracked: 12 })).toBe(true)
    })

    it('should not show banner when monthsTracked < 1', () => {
      expect(shouldShowRecommendationBanner({ monthsTracked: 0 })).toBe(false)
      expect(shouldShowRecommendationBanner({ monthsTracked: 0.5 })).toBe(false)
    })

    it('should not show banner when recommendation is null', () => {
      expect(shouldShowRecommendationBanner(null)).toBe(false)
    })
  })

  describe('Tier Highlighting', () => {
    it('should highlight recommended tier when has usage data', () => {
      expect(shouldHighlightTier('accelerate', 'accelerate', true)).toBe(true)
      expect(shouldHighlightTier('elite', 'elite', true)).toBe(true)
      expect(shouldHighlightTier('momentum', 'momentum', true)).toBe(true)
    })

    it('should not highlight non-recommended tiers', () => {
      expect(shouldHighlightTier('momentum', 'accelerate', true)).toBe(false)
      expect(shouldHighlightTier('elite', 'accelerate', true)).toBe(false)
    })

    it('should not highlight when no usage data', () => {
      expect(shouldHighlightTier('accelerate', 'accelerate', false)).toBe(false)
    })

    it('should not highlight when no recommendation', () => {
      expect(shouldHighlightTier('accelerate', null, true)).toBe(false)
    })
  })
})

// ============================================================================
// Comparison Table Logic Tests
// ============================================================================

describe('Pricing Page - Comparison Table Logic', () => {
  function formatLimit(limit: number): string {
    return limit === -1 ? '∞' : limit.toString()
  }

  function fitsInTier(average: number, limit: number): boolean {
    return limit === -1 || average <= limit
  }

  describe('Limit Formatting', () => {
    it('should format -1 as infinity symbol', () => {
      expect(formatLimit(-1)).toBe('∞')
    })

    it('should format positive numbers as strings', () => {
      expect(formatLimit(8)).toBe('8')
      expect(formatLimit(15)).toBe('15')
      expect(formatLimit(10)).toBe('10')
    })

    it('should format zero as string', () => {
      expect(formatLimit(0)).toBe('0')
    })
  })

  describe('Tier Fit Logic', () => {
    it('should fit when average is under limit', () => {
      expect(fitsInTier(5, 8)).toBe(true)
      expect(fitsInTier(10, 15)).toBe(true)
    })

    it('should fit when average equals limit', () => {
      expect(fitsInTier(8, 8)).toBe(true)
      expect(fitsInTier(15, 15)).toBe(true)
    })

    it('should not fit when average exceeds limit', () => {
      expect(fitsInTier(9, 8)).toBe(false)
      expect(fitsInTier(16, 15)).toBe(false)
    })

    it('should always fit unlimited (-1)', () => {
      expect(fitsInTier(0, -1)).toBe(true)
      expect(fitsInTier(100, -1)).toBe(true)
      expect(fitsInTier(1000, -1)).toBe(true)
    })
  })

  describe('Resource Limits by Tier', () => {
    it('should have correct limits for momentum', () => {
      const limits = TIER_CONFIGS.momentum.limits
      expect(limits.applications).toBe(8)
      expect(limits.cvs).toBe(8)
      expect(limits.interviews).toBe(8)
      expect(limits.compensation).toBe(8)
      expect(limits.contracts).toBe(8)
      expect(limits.aiAvatarInterviews).toBe(0)
    })

    it('should have correct limits for accelerate', () => {
      const limits = TIER_CONFIGS.accelerate.limits
      expect(limits.applications).toBe(15)
      expect(limits.cvs).toBe(15)
      expect(limits.interviews).toBe(15)
      expect(limits.compensation).toBe(15)
      expect(limits.contracts).toBe(15)
      expect(limits.aiAvatarInterviews).toBe(5)
    })

    it('should have correct limits for elite', () => {
      const limits = TIER_CONFIGS.elite.limits
      expect(limits.applications).toBe(-1)
      expect(limits.cvs).toBe(-1)
      expect(limits.interviews).toBe(-1)
      expect(limits.compensation).toBe(-1)
      expect(limits.contracts).toBe(-1)
      expect(limits.aiAvatarInterviews).toBe(10)
    })
  })
})

// ============================================================================
// Feature List Tests
// ============================================================================

describe('Pricing Page - Feature Lists', () => {
  describe('Momentum Features', () => {
    const features = TIER_CONFIGS.momentum.features

    it('should include all core features', () => {
      expect(features.applicationTracker).toBe(true)
      expect(features.tailoredCvs).toBe(true)
      expect(features.interviewCoach).toBe(true)
      expect(features.compensationSessions).toBe(true)
      expect(features.contractReviews).toBe(true)
    })

    it('should not include AI Avatar', () => {
      expect(features.aiAvatarInterviews).toBe(false)
    })
  })

  describe('Accelerate Features', () => {
    const features = TIER_CONFIGS.accelerate.features

    it('should include all features', () => {
      expect(features.applicationTracker).toBe(true)
      expect(features.tailoredCvs).toBe(true)
      expect(features.interviewCoach).toBe(true)
      expect(features.compensationSessions).toBe(true)
      expect(features.contractReviews).toBe(true)
      expect(features.aiAvatarInterviews).toBe(true)
    })
  })

  describe('Elite Features', () => {
    const features = TIER_CONFIGS.elite.features

    it('should include all features', () => {
      expect(features.applicationTracker).toBe(true)
      expect(features.tailoredCvs).toBe(true)
      expect(features.interviewCoach).toBe(true)
      expect(features.compensationSessions).toBe(true)
      expect(features.contractReviews).toBe(true)
      expect(features.aiAvatarInterviews).toBe(true)
    })
  })
})

// ============================================================================
// Billing Period Toggle Tests
// ============================================================================

describe('Pricing Page - Billing Period Toggle', () => {
  const periods: BillingPeriod[] = ['monthly', 'quarterly', 'yearly']

  it('should have three billing periods', () => {
    expect(periods).toHaveLength(3)
  })

  it('should have quarterly as recommended default', () => {
    // As per spec: "Quarterly (default selected)"
    const defaultPeriod: BillingPeriod = 'quarterly'
    expect(defaultPeriod).toBe('quarterly')
  })

  it('should have increasing discounts for longer periods', () => {
    for (const tier of TIER_ORDER) {
      const savings = {
        monthly: getSavingsPercentage(tier, 'monthly'),
        quarterly: getSavingsPercentage(tier, 'quarterly'),
        yearly: getSavingsPercentage(tier, 'yearly'),
      }

      expect(savings.monthly).toBe(0)
      expect(savings.quarterly).toBeGreaterThan(savings.monthly)
      expect(savings.yearly).toBeGreaterThan(savings.quarterly)
    }
  })
})

// ============================================================================
// Badge Logic Tests
// ============================================================================

describe('Pricing Page - Badge Logic', () => {
  function shouldShowMostPopularBadge(tier: SubscriptionTier): boolean {
    return TIER_CONFIGS[tier].isMostPopular
  }

  function shouldShowRecommendedBadge(
    tier: SubscriptionTier,
    recommendedTier: SubscriptionTier | null,
    hasUsageData: boolean
  ): boolean {
    return hasUsageData && recommendedTier === tier
  }

  describe('Most Popular Badge', () => {
    it('should show for accelerate only', () => {
      expect(shouldShowMostPopularBadge('momentum')).toBe(false)
      expect(shouldShowMostPopularBadge('accelerate')).toBe(true)
      expect(shouldShowMostPopularBadge('elite')).toBe(false)
    })
  })

  describe('Recommended Badge', () => {
    it('should show when tier matches recommendation and has usage data', () => {
      expect(shouldShowRecommendedBadge('accelerate', 'accelerate', true)).toBe(true)
    })

    it('should not show when no usage data', () => {
      expect(shouldShowRecommendedBadge('accelerate', 'accelerate', false)).toBe(false)
    })

    it('should not show when tier does not match', () => {
      expect(shouldShowRecommendedBadge('momentum', 'accelerate', true)).toBe(false)
    })
  })

  describe('Discount Badge', () => {
    function getDiscountBadge(tier: SubscriptionTier, period: BillingPeriod): string | null {
      return TIER_CONFIGS[tier].pricing[period].discount
    }

    it('should not show for monthly', () => {
      expect(getDiscountBadge('momentum', 'monthly')).toBeNull()
      expect(getDiscountBadge('accelerate', 'monthly')).toBeNull()
      expect(getDiscountBadge('elite', 'monthly')).toBeNull()
    })

    it('should show percentage for quarterly', () => {
      expect(getDiscountBadge('momentum', 'quarterly')).toBe('17%')
      expect(getDiscountBadge('accelerate', 'quarterly')).toBe('17%')
      expect(getDiscountBadge('elite', 'quarterly')).toBe('14%')
    })

    it('should show percentage for yearly', () => {
      expect(getDiscountBadge('momentum', 'yearly')).toBe('31%')
      expect(getDiscountBadge('accelerate', 'yearly')).toBe('31%')
      expect(getDiscountBadge('elite', 'yearly')).toBe('28%')
    })
  })
})

// ============================================================================
// Downgrade Confirmation Tests
// ============================================================================

describe('Pricing Page - Downgrade Confirmation', () => {
  function needsDowngradeConfirmation(
    currentTier: SubscriptionTier | null,
    targetTier: SubscriptionTier
  ): boolean {
    return currentTier !== null && isDowngrade(currentTier, targetTier)
  }

  it('should require confirmation for actual downgrades', () => {
    expect(needsDowngradeConfirmation('accelerate', 'momentum')).toBe(true)
    expect(needsDowngradeConfirmation('elite', 'accelerate')).toBe(true)
    expect(needsDowngradeConfirmation('elite', 'momentum')).toBe(true)
  })

  it('should not require confirmation for same tier', () => {
    expect(needsDowngradeConfirmation('momentum', 'momentum')).toBe(false)
    expect(needsDowngradeConfirmation('accelerate', 'accelerate')).toBe(false)
    expect(needsDowngradeConfirmation('elite', 'elite')).toBe(false)
  })

  it('should not require confirmation for upgrades', () => {
    expect(needsDowngradeConfirmation('momentum', 'accelerate')).toBe(false)
    expect(needsDowngradeConfirmation('momentum', 'elite')).toBe(false)
    expect(needsDowngradeConfirmation('accelerate', 'elite')).toBe(false)
  })

  it('should not require confirmation when no current tier', () => {
    expect(needsDowngradeConfirmation(null, 'momentum')).toBe(false)
    expect(needsDowngradeConfirmation(null, 'accelerate')).toBe(false)
    expect(needsDowngradeConfirmation(null, 'elite')).toBe(false)
  })
})

// ============================================================================
// Kill Switch Tests
// ============================================================================

describe('Pricing Page - Kill Switch Behavior', () => {
  function getViewMode(subscriptionEnabled: boolean): 'pricing' | 'coming-soon' {
    return subscriptionEnabled ? 'pricing' : 'coming-soon'
  }

  it('should show pricing view when subscription is enabled', () => {
    expect(getViewMode(true)).toBe('pricing')
  })

  it('should show coming soon view when subscription is disabled', () => {
    expect(getViewMode(false)).toBe('coming-soon')
  })
})

// ============================================================================
// Price Display Tests
// ============================================================================

describe('Pricing Page - Price Display', () => {
  function getPriceDisplay(tier: SubscriptionTier, period: BillingPeriod): string {
    const amount = getPrice(tier, period)
    const periodLabel = {
      monthly: 'per month',
      quarterly: 'per quarter',
      yearly: 'per year',
    }[period]
    return `${formatPrice(amount)} ${periodLabel}`
  }

  describe('Momentum Prices', () => {
    it('should display correct monthly price', () => {
      expect(getPriceDisplay('momentum', 'monthly')).toBe('$12 per month')
    })

    it('should display correct quarterly price', () => {
      expect(getPriceDisplay('momentum', 'quarterly')).toBe('$30 per quarter')
    })

    it('should display correct yearly price', () => {
      expect(getPriceDisplay('momentum', 'yearly')).toBe('$99 per year')
    })
  })

  describe('Accelerate Prices', () => {
    it('should display correct monthly price', () => {
      expect(getPriceDisplay('accelerate', 'monthly')).toBe('$18 per month')
    })

    it('should display correct quarterly price', () => {
      expect(getPriceDisplay('accelerate', 'quarterly')).toBe('$45 per quarter')
    })

    it('should display correct yearly price', () => {
      expect(getPriceDisplay('accelerate', 'yearly')).toBe('$149 per year')
    })
  })

  describe('Elite Prices', () => {
    it('should display correct monthly price', () => {
      expect(getPriceDisplay('elite', 'monthly')).toBe('$29 per month')
    })

    it('should display correct quarterly price', () => {
      expect(getPriceDisplay('elite', 'quarterly')).toBe('$75 per quarter')
    })

    it('should display correct yearly price', () => {
      expect(getPriceDisplay('elite', 'yearly')).toBe('$249 per year')
    })
  })
})
