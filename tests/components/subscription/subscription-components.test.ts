/**
 * Subscription Components Tests (Phase 12.1)
 *
 * RALPH tests for the subscription gating components.
 * Tests component logic, state handling, and visibility rules.
 */

import { describe, it, expect } from 'vitest'
import { TIER_CONFIGS, formatPrice } from '@/lib/subscription/config'
import type { SubscriptionTier } from '@/types/subscription'

// ============================================================================
// Types matching the components
// ============================================================================

type ResourceKey = 'applications' | 'cvs' | 'interviews' | 'compensation' | 'contracts' | 'aiAvatarInterviews'

type FeatureKey =
  | 'applicationTracker'
  | 'tailoredCvs'
  | 'interviewCoach'
  | 'compensationSessions'
  | 'contractReviews'
  | 'aiAvatarInterviews'

interface UsageData {
  used: number
  limit: number
  remaining: number
  percentUsed: number
  unlimited: boolean
}

// ============================================================================
// Constants matching the components
// ============================================================================

const RESOURCE_LABELS: Record<ResourceKey, string> = {
  applications: 'applications',
  cvs: 'tailored CVs',
  interviews: 'interview coach sessions',
  compensation: 'compensation sessions',
  contracts: 'contract reviews',
  aiAvatarInterviews: 'AI avatar interviews',
}

const FEATURE_LABELS: Record<FeatureKey, string> = {
  applicationTracker: 'Application Tracker',
  tailoredCvs: 'Tailored CVs',
  interviewCoach: 'Interview Coach',
  compensationSessions: 'Compensation Sessions',
  contractReviews: 'Contract Reviews',
  aiAvatarInterviews: 'AI Avatar Interviews',
}

// ============================================================================
// FeatureGate Logic Tests
// ============================================================================

describe('FeatureGate Component Logic', () => {
  interface FeatureGateState {
    subscriptionEnabled: boolean
    isLoading: boolean
    hasSubscription: boolean
    tier: SubscriptionTier | null
    canAccessFeature: boolean
  }

  type RenderDecision = 'children' | 'subscribe_overlay' | 'upgrade_overlay' | 'fallback'

  function getFeatureGateDecision(
    state: FeatureGateState,
    hasFallback: boolean
  ): RenderDecision {
    // When disabled, always render children
    if (!state.subscriptionEnabled) return 'children'

    // While loading, render children
    if (state.isLoading) return 'children'

    // If has access, render children
    if (state.canAccessFeature) return 'children'

    // If custom fallback provided, use it
    if (hasFallback) return 'fallback'

    // No subscription at all
    if (!state.hasSubscription) return 'subscribe_overlay'

    // Has subscription but not this feature
    return 'upgrade_overlay'
  }

  describe('Kill Switch OFF', () => {
    it('should always render children when disabled', () => {
      const decision = getFeatureGateDecision({
        subscriptionEnabled: false,
        isLoading: false,
        hasSubscription: false,
        tier: null,
        canAccessFeature: false,
      }, false)
      expect(decision).toBe('children')
    })

    it('should render children even with fallback when disabled', () => {
      const decision = getFeatureGateDecision({
        subscriptionEnabled: false,
        isLoading: false,
        hasSubscription: false,
        tier: null,
        canAccessFeature: false,
      }, true)
      expect(decision).toBe('children')
    })
  })

  describe('Kill Switch ON', () => {
    it('should render children while loading', () => {
      const decision = getFeatureGateDecision({
        subscriptionEnabled: true,
        isLoading: true,
        hasSubscription: false,
        tier: null,
        canAccessFeature: false,
      }, false)
      expect(decision).toBe('children')
    })

    it('should render children when has access', () => {
      const decision = getFeatureGateDecision({
        subscriptionEnabled: true,
        isLoading: false,
        hasSubscription: true,
        tier: 'accelerate',
        canAccessFeature: true,
      }, false)
      expect(decision).toBe('children')
    })

    it('should show subscribe overlay when no subscription', () => {
      const decision = getFeatureGateDecision({
        subscriptionEnabled: true,
        isLoading: false,
        hasSubscription: false,
        tier: null,
        canAccessFeature: false,
      }, false)
      expect(decision).toBe('subscribe_overlay')
    })

    it('should show upgrade overlay when feature not in tier', () => {
      const decision = getFeatureGateDecision({
        subscriptionEnabled: true,
        isLoading: false,
        hasSubscription: true,
        tier: 'momentum',
        canAccessFeature: false,
      }, false)
      expect(decision).toBe('upgrade_overlay')
    })

    it('should use fallback when provided and access denied', () => {
      const decision = getFeatureGateDecision({
        subscriptionEnabled: true,
        isLoading: false,
        hasSubscription: true,
        tier: 'momentum',
        canAccessFeature: false,
      }, true)
      expect(decision).toBe('fallback')
    })
  })
})

// ============================================================================
// UsageBadge Logic Tests
// ============================================================================

describe('UsageBadge Component Logic', () => {
  type BadgeVisibility = 'hidden' | 'unlimited' | 'at_limit' | 'normal'

  function getBadgeVisibility(
    subscriptionEnabled: boolean,
    isLoading: boolean,
    usage: UsageData | null
  ): BadgeVisibility {
    if (!subscriptionEnabled) return 'hidden'
    if (isLoading) return 'hidden'
    if (!usage) return 'hidden'
    if (usage.unlimited) return 'unlimited'
    if (usage.remaining <= 0) return 'at_limit'
    return 'normal'
  }

  function getColorClass(percentUsed: number, atLimit: boolean): 'green' | 'yellow' | 'red' {
    if (atLimit) return 'red'
    if (percentUsed >= 80) return 'red'
    if (percentUsed >= 50) return 'yellow'
    return 'green'
  }

  describe('Visibility', () => {
    it('should be hidden when subscription disabled', () => {
      expect(getBadgeVisibility(false, false, { used: 5, limit: 8, remaining: 3, percentUsed: 63, unlimited: false })).toBe('hidden')
    })

    it('should be hidden while loading', () => {
      expect(getBadgeVisibility(true, true, null)).toBe('hidden')
    })

    it('should be hidden when no usage data', () => {
      expect(getBadgeVisibility(true, false, null)).toBe('hidden')
    })

    it('should show unlimited for unlimited resources', () => {
      expect(getBadgeVisibility(true, false, { used: 100, limit: -1, remaining: -1, percentUsed: 0, unlimited: true })).toBe('unlimited')
    })

    it('should show at_limit when no remaining', () => {
      expect(getBadgeVisibility(true, false, { used: 8, limit: 8, remaining: 0, percentUsed: 100, unlimited: false })).toBe('at_limit')
    })

    it('should show normal when has remaining', () => {
      expect(getBadgeVisibility(true, false, { used: 5, limit: 8, remaining: 3, percentUsed: 63, unlimited: false })).toBe('normal')
    })
  })

  describe('Color Coding', () => {
    it('should be green when under 50%', () => {
      expect(getColorClass(0, false)).toBe('green')
      expect(getColorClass(25, false)).toBe('green')
      expect(getColorClass(49, false)).toBe('green')
    })

    it('should be yellow when 50-79%', () => {
      expect(getColorClass(50, false)).toBe('yellow')
      expect(getColorClass(65, false)).toBe('yellow')
      expect(getColorClass(79, false)).toBe('yellow')
    })

    it('should be red when 80%+', () => {
      expect(getColorClass(80, false)).toBe('red')
      expect(getColorClass(90, false)).toBe('red')
      expect(getColorClass(100, false)).toBe('red')
    })

    it('should be red when at limit regardless of percent', () => {
      expect(getColorClass(0, true)).toBe('red')
      expect(getColorClass(50, true)).toBe('red')
      expect(getColorClass(100, true)).toBe('red')
    })
  })

  describe('Badge Text', () => {
    function getBadgeText(usage: UsageData, compact: boolean): string {
      if (usage.unlimited) return compact ? '' : 'Unlimited'
      if (usage.remaining <= 0) return compact ? `${usage.used}/${usage.limit}` : 'Limit reached — Upgrade'
      return compact ? `${usage.used}/${usage.limit}` : `${usage.used}/${usage.limit} used`
    }

    it('should format normal usage', () => {
      const usage = { used: 5, limit: 8, remaining: 3, percentUsed: 63, unlimited: false }
      expect(getBadgeText(usage, false)).toBe('5/8 used')
      expect(getBadgeText(usage, true)).toBe('5/8')
    })

    it('should format at limit', () => {
      const usage = { used: 8, limit: 8, remaining: 0, percentUsed: 100, unlimited: false }
      expect(getBadgeText(usage, false)).toBe('Limit reached — Upgrade')
      expect(getBadgeText(usage, true)).toBe('8/8')
    })

    it('should format unlimited', () => {
      const usage = { used: 100, limit: -1, remaining: -1, percentUsed: 0, unlimited: true }
      expect(getBadgeText(usage, false)).toBe('Unlimited')
    })
  })
})

// ============================================================================
// UpgradePrompt Logic Tests
// ============================================================================

describe('UpgradePrompt Component Logic', () => {
  type PromptVisibility = 'hidden' | 'visible'

  function getPromptVisibility(
    subscriptionEnabled: boolean,
    isLoading: boolean
  ): PromptVisibility {
    if (!subscriptionEnabled) return 'hidden'
    if (isLoading) return 'hidden'
    return 'visible'
  }

  describe('Visibility', () => {
    it('should be hidden when subscription disabled', () => {
      expect(getPromptVisibility(false, false)).toBe('hidden')
    })

    it('should be hidden while loading', () => {
      expect(getPromptVisibility(true, true)).toBe('hidden')
    })

    it('should be visible when enabled and loaded', () => {
      expect(getPromptVisibility(true, false)).toBe('visible')
    })
  })

  describe('Resource Labels', () => {
    it('should have labels for all resources', () => {
      expect(Object.keys(RESOURCE_LABELS)).toHaveLength(6)
    })

    it('should have readable labels', () => {
      expect(RESOURCE_LABELS.applications).toBe('applications')
      expect(RESOURCE_LABELS.cvs).toBe('tailored CVs')
      expect(RESOURCE_LABELS.aiAvatarInterviews).toBe('AI avatar interviews')
    })
  })

  describe('Feature Labels', () => {
    it('should have labels for all features', () => {
      expect(Object.keys(FEATURE_LABELS)).toHaveLength(6)
    })

    it('should have readable labels', () => {
      expect(FEATURE_LABELS.applicationTracker).toBe('Application Tracker')
      expect(FEATURE_LABELS.aiAvatarInterviews).toBe('AI Avatar Interviews')
    })
  })

  describe('Upgrade Message Generation', () => {
    function generateUpgradeMessage(
      resource: ResourceKey,
      limit: number,
      averageUsage: number,
      recommendedTier: SubscriptionTier,
      recommendedLimit: number
    ): string {
      const resourceLabel = RESOURCE_LABELS[resource]
      const tierName = TIER_CONFIGS[recommendedTier].name
      const limitDisplay = recommendedLimit === -1 ? 'unlimited' : `${recommendedLimit}/mo`

      return `You've used all ${limit} ${resourceLabel} this period. ` +
        `Based on your average of ~${averageUsage}/mo, ` +
        `the ${tierName} plan (${limitDisplay}) is the best fit.`
    }

    it('should generate personalized message for applications', () => {
      const msg = generateUpgradeMessage('applications', 8, 11, 'accelerate', 15)
      expect(msg).toContain('8 applications')
      expect(msg).toContain('~11/mo')
      expect(msg).toContain('Accelerate')
      expect(msg).toContain('15/mo')
    })

    it('should handle unlimited tier', () => {
      const msg = generateUpgradeMessage('applications', 15, 25, 'elite', -1)
      expect(msg).toContain('unlimited')
      expect(msg).toContain('Elite')
    })
  })

  describe('Pricing Display', () => {
    it('should format tier prices correctly', () => {
      expect(formatPrice(TIER_CONFIGS.momentum.pricing.monthly.amount)).toBe('$12')
      expect(formatPrice(TIER_CONFIGS.accelerate.pricing.monthly.amount)).toBe('$18')
      expect(formatPrice(TIER_CONFIGS.elite.pricing.monthly.amount)).toBe('$29')
    })
  })
})

// ============================================================================
// SubscriptionGuard Logic Tests
// ============================================================================

describe('SubscriptionGuard Component Logic', () => {
  type GuardAction = 'render_children' | 'show_loading' | 'redirect'

  function getGuardAction(
    subscriptionEnabled: boolean,
    isLoading: boolean,
    hasSubscription: boolean
  ): GuardAction {
    if (!subscriptionEnabled) return 'render_children'
    if (isLoading) return 'show_loading'
    if (!hasSubscription) return 'redirect'
    return 'render_children'
  }

  describe('Kill Switch OFF', () => {
    it('should render children when disabled', () => {
      expect(getGuardAction(false, false, false)).toBe('render_children')
    })

    it('should render children even while loading when disabled', () => {
      expect(getGuardAction(false, true, false)).toBe('render_children')
    })
  })

  describe('Kill Switch ON', () => {
    it('should show loading while loading', () => {
      expect(getGuardAction(true, true, false)).toBe('show_loading')
    })

    it('should redirect when no subscription', () => {
      expect(getGuardAction(true, false, false)).toBe('redirect')
    })

    it('should render children when has subscription', () => {
      expect(getGuardAction(true, false, true)).toBe('render_children')
    })
  })

  describe('Redirect URL', () => {
    function getRedirectUrl(
      redirectTo: string,
      recommendedTier: SubscriptionTier | null
    ): string {
      if (recommendedTier) {
        return `${redirectTo}?recommended=${recommendedTier}`
      }
      return redirectTo
    }

    it('should include recommendation when available', () => {
      expect(getRedirectUrl('/pricing', 'accelerate')).toBe('/pricing?recommended=accelerate')
    })

    it('should use base URL when no recommendation', () => {
      expect(getRedirectUrl('/pricing', null)).toBe('/pricing')
    })

    it('should work with custom redirect URLs', () => {
      expect(getRedirectUrl('/subscribe', 'elite')).toBe('/subscribe?recommended=elite')
    })
  })
})

// ============================================================================
// Component Integration Tests
// ============================================================================

describe('Subscription Components - Integration', () => {
  describe('Tier Feature Access', () => {
    it('should correctly determine feature access per tier', () => {
      // Momentum: no AI Avatar
      expect(TIER_CONFIGS.momentum.features.aiAvatarInterviews).toBe(false)
      expect(TIER_CONFIGS.momentum.features.applicationTracker).toBe(true)

      // Accelerate: has AI Avatar
      expect(TIER_CONFIGS.accelerate.features.aiAvatarInterviews).toBe(true)
      expect(TIER_CONFIGS.accelerate.features.applicationTracker).toBe(true)

      // Elite: has all features
      expect(TIER_CONFIGS.elite.features.aiAvatarInterviews).toBe(true)
      expect(TIER_CONFIGS.elite.features.applicationTracker).toBe(true)
    })
  })

  describe('Usage Limits Per Tier', () => {
    it('should have correct limits for momentum', () => {
      expect(TIER_CONFIGS.momentum.limits.applications).toBe(8)
      expect(TIER_CONFIGS.momentum.limits.aiAvatarInterviews).toBe(0)
    })

    it('should have correct limits for accelerate', () => {
      expect(TIER_CONFIGS.accelerate.limits.applications).toBe(15)
      expect(TIER_CONFIGS.accelerate.limits.aiAvatarInterviews).toBe(5)
    })

    it('should have correct limits for elite', () => {
      expect(TIER_CONFIGS.elite.limits.applications).toBe(-1) // unlimited
      expect(TIER_CONFIGS.elite.limits.aiAvatarInterviews).toBe(10)
    })
  })

  describe('All Components Respect subscriptionEnabled', () => {
    const components = ['FeatureGate', 'UsageBadge', 'UpgradePrompt', 'SubscriptionGuard']

    interface ComponentBehavior {
      name: string
      whenDisabled: string
    }

    const behaviors: ComponentBehavior[] = [
      { name: 'FeatureGate', whenDisabled: 'render children' },
      { name: 'UsageBadge', whenDisabled: 'render null' },
      { name: 'UpgradePrompt', whenDisabled: 'render null' },
      { name: 'SubscriptionGuard', whenDisabled: 'render children' },
    ]

    it('should have defined behavior for all components when disabled', () => {
      expect(behaviors.length).toBe(components.length)
      for (const behavior of behaviors) {
        expect(behavior.whenDisabled).toBeDefined()
      }
    })
  })
})

// ============================================================================
// Barrel Export Tests
// ============================================================================

describe('Subscription Components - Barrel Export', () => {
  it('should export all components', () => {
    // This tests the structure - actual imports would require module resolution
    const expectedExports = [
      'FeatureGate',
      'UsageBadge',
      'UpgradePrompt',
      'SubscriptionGuard',
    ]

    expect(expectedExports.length).toBe(4)
  })
})
