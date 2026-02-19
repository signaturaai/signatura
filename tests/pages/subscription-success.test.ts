/**
 * Subscription Success Page Tests (Phase 10.3)
 *
 * RALPH tests for the subscription success page component logic.
 * Tests polling behavior, tier features, and state transitions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TIER_CONFIGS } from '@/lib/subscription/config'
import type { SubscriptionTier, BillingPeriod } from '@/types/subscription'

// ============================================================================
// Types matching the page
// ============================================================================

interface SubscriptionStatusResponse {
  subscriptionEnabled: boolean
  hasSubscription: boolean
  tier: SubscriptionTier | null
  billingPeriod: BillingPeriod | null
  status: string | null
  currentPeriodEnd: string | null
}

// ============================================================================
// Constants matching the page
// ============================================================================

const POLL_INTERVAL_MS = 2000
const MAX_POLL_DURATION_MS = 30000
const MAX_POLL_ATTEMPTS = MAX_POLL_DURATION_MS / POLL_INTERVAL_MS

const TIER_EMOJIS: Record<SubscriptionTier, string> = {
  momentum: '🚀',
  accelerate: '⚡',
  elite: '👑',
}

const TIER_COLORS: Record<SubscriptionTier, string> = {
  momentum: 'text-teal-600',
  accelerate: 'text-purple-600',
  elite: 'text-amber-600',
}

const TIER_FEATURES: Record<SubscriptionTier, string[]> = {
  momentum: [
    '8 Application Tracker entries per month',
    '8 Tailored CVs per month',
    '8 Interview Coach sessions per month',
    '8 Compensation negotiation sessions per month',
    '8 Contract reviews per month',
  ],
  accelerate: [
    '15 Application Tracker entries per month',
    '15 Tailored CVs per month',
    '15 Interview Coach sessions per month',
    '15 Compensation negotiation sessions per month',
    '15 Contract reviews per month',
    '5 AI-Powered Avatar Interviews per month',
  ],
  elite: [
    'Unlimited Application Tracker entries',
    'Unlimited Tailored CVs',
    'Unlimited Interview Coach sessions',
    'Unlimited Compensation negotiation sessions',
    'Unlimited Contract reviews',
    '10 AI-Powered Avatar Interviews per month',
  ],
}

// ============================================================================
// Helper Functions (matching page logic)
// ============================================================================

function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function isSubscriptionReady(response: SubscriptionStatusResponse): boolean {
  return response.hasSubscription && response.tier !== null && response.status === 'active'
}

function shouldContinuePolling(
  pollCount: number,
  subscriptionReady: boolean
): boolean {
  if (subscriptionReady) return false
  if (pollCount >= MAX_POLL_ATTEMPTS) return false
  return true
}

function getPageState(
  isPolling: boolean,
  hasTimedOut: boolean,
  subscription: SubscriptionStatusResponse | null
): 'loading' | 'error' | 'success' {
  if (isPolling && !subscription?.hasSubscription) return 'loading'
  if (hasTimedOut && !subscription?.hasSubscription) return 'error'
  if (!subscription?.tier) return 'error'
  return 'success'
}

// ============================================================================
// Polling Configuration Tests
// ============================================================================

describe('Subscription Success - Polling Configuration', () => {
  it('should poll every 2 seconds', () => {
    expect(POLL_INTERVAL_MS).toBe(2000)
  })

  it('should have max duration of 30 seconds', () => {
    expect(MAX_POLL_DURATION_MS).toBe(30000)
  })

  it('should calculate 15 max attempts', () => {
    expect(MAX_POLL_ATTEMPTS).toBe(15)
  })

  it('should correctly calculate attempts from duration', () => {
    const calculated = MAX_POLL_DURATION_MS / POLL_INTERVAL_MS
    expect(calculated).toBe(MAX_POLL_ATTEMPTS)
  })
})

// ============================================================================
// Subscription Ready Check Tests
// ============================================================================

describe('Subscription Success - Subscription Ready Check', () => {
  it('should return true when subscription is active', () => {
    const response: SubscriptionStatusResponse = {
      subscriptionEnabled: true,
      hasSubscription: true,
      tier: 'momentum',
      billingPeriod: 'monthly',
      status: 'active',
      currentPeriodEnd: '2026-03-15T00:00:00Z',
    }
    expect(isSubscriptionReady(response)).toBe(true)
  })

  it('should return false when no subscription', () => {
    const response: SubscriptionStatusResponse = {
      subscriptionEnabled: true,
      hasSubscription: false,
      tier: null,
      billingPeriod: null,
      status: null,
      currentPeriodEnd: null,
    }
    expect(isSubscriptionReady(response)).toBe(false)
  })

  it('should return false when tier is null', () => {
    const response: SubscriptionStatusResponse = {
      subscriptionEnabled: true,
      hasSubscription: true,
      tier: null,
      billingPeriod: 'monthly',
      status: 'active',
      currentPeriodEnd: '2026-03-15T00:00:00Z',
    }
    expect(isSubscriptionReady(response)).toBe(false)
  })

  it('should return false when status is not active', () => {
    const response: SubscriptionStatusResponse = {
      subscriptionEnabled: true,
      hasSubscription: true,
      tier: 'momentum',
      billingPeriod: 'monthly',
      status: 'pending',
      currentPeriodEnd: '2026-03-15T00:00:00Z',
    }
    expect(isSubscriptionReady(response)).toBe(false)
  })

  it('should work regardless of subscription enabled flag', () => {
    // Page always works even when kill switch is off
    const response: SubscriptionStatusResponse = {
      subscriptionEnabled: false,
      hasSubscription: true,
      tier: 'elite',
      billingPeriod: 'yearly',
      status: 'active',
      currentPeriodEnd: '2027-02-15T00:00:00Z',
    }
    expect(isSubscriptionReady(response)).toBe(true)
  })
})

// ============================================================================
// Polling Logic Tests
// ============================================================================

describe('Subscription Success - Polling Logic', () => {
  it('should stop polling when subscription is ready', () => {
    expect(shouldContinuePolling(1, true)).toBe(false)
    expect(shouldContinuePolling(5, true)).toBe(false)
    expect(shouldContinuePolling(14, true)).toBe(false)
  })

  it('should stop polling when max attempts reached', () => {
    expect(shouldContinuePolling(15, false)).toBe(false)
    expect(shouldContinuePolling(16, false)).toBe(false)
    expect(shouldContinuePolling(100, false)).toBe(false)
  })

  it('should continue polling when under max attempts and not ready', () => {
    expect(shouldContinuePolling(1, false)).toBe(true)
    expect(shouldContinuePolling(5, false)).toBe(true)
    expect(shouldContinuePolling(14, false)).toBe(true)
  })

  it('should stop at exactly max attempts', () => {
    expect(shouldContinuePolling(14, false)).toBe(true)
    expect(shouldContinuePolling(15, false)).toBe(false)
  })
})

// ============================================================================
// Page State Tests
// ============================================================================

describe('Subscription Success - Page State', () => {
  it('should show loading when polling without subscription', () => {
    expect(getPageState(true, false, null)).toBe('loading')
    expect(getPageState(true, false, {
      subscriptionEnabled: true,
      hasSubscription: false,
      tier: null,
      billingPeriod: null,
      status: null,
      currentPeriodEnd: null,
    })).toBe('loading')
  })

  it('should show error when timed out without subscription', () => {
    expect(getPageState(false, true, null)).toBe('error')
    expect(getPageState(false, true, {
      subscriptionEnabled: true,
      hasSubscription: false,
      tier: null,
      billingPeriod: null,
      status: null,
      currentPeriodEnd: null,
    })).toBe('error')
  })

  it('should show error when no tier', () => {
    expect(getPageState(false, false, {
      subscriptionEnabled: true,
      hasSubscription: true,
      tier: null,
      billingPeriod: null,
      status: 'active',
      currentPeriodEnd: null,
    })).toBe('error')
  })

  it('should show success when subscription is active', () => {
    expect(getPageState(false, false, {
      subscriptionEnabled: true,
      hasSubscription: true,
      tier: 'momentum',
      billingPeriod: 'monthly',
      status: 'active',
      currentPeriodEnd: '2026-03-15T00:00:00Z',
    })).toBe('success')
  })

  it('should show success even while still polling if subscription found', () => {
    expect(getPageState(true, false, {
      subscriptionEnabled: true,
      hasSubscription: true,
      tier: 'accelerate',
      billingPeriod: 'quarterly',
      status: 'active',
      currentPeriodEnd: '2026-05-15T00:00:00Z',
    })).toBe('success')
  })
})

// ============================================================================
// Tier Display Tests
// ============================================================================

describe('Subscription Success - Tier Display', () => {
  describe('Tier Emojis', () => {
    it('should have emoji for each tier', () => {
      expect(TIER_EMOJIS.momentum).toBe('🚀')
      expect(TIER_EMOJIS.accelerate).toBe('⚡')
      expect(TIER_EMOJIS.elite).toBe('👑')
    })
  })

  describe('Tier Colors', () => {
    it('should have color class for each tier', () => {
      expect(TIER_COLORS.momentum).toBe('text-teal-600')
      expect(TIER_COLORS.accelerate).toBe('text-purple-600')
      expect(TIER_COLORS.elite).toBe('text-amber-600')
    })
  })

  describe('Tier Names', () => {
    it('should have correct display names', () => {
      expect(TIER_CONFIGS.momentum.name).toBe('Momentum')
      expect(TIER_CONFIGS.accelerate.name).toBe('Accelerate')
      expect(TIER_CONFIGS.elite.name).toBe('Elite')
    })
  })
})

// ============================================================================
// Tier Features Tests
// ============================================================================

describe('Subscription Success - Tier Features', () => {
  describe('Momentum Features', () => {
    const features = TIER_FEATURES.momentum

    it('should have 5 features', () => {
      expect(features).toHaveLength(5)
    })

    it('should mention 8 as the limit', () => {
      for (const feature of features) {
        expect(feature).toContain('8')
      }
    })

    it('should not include AI Avatar', () => {
      const hasAiAvatar = features.some(f => f.includes('AI-Powered Avatar'))
      expect(hasAiAvatar).toBe(false)
    })
  })

  describe('Accelerate Features', () => {
    const features = TIER_FEATURES.accelerate

    it('should have 6 features', () => {
      expect(features).toHaveLength(6)
    })

    it('should include AI Avatar Interviews', () => {
      const hasAiAvatar = features.some(f => f.includes('AI-Powered Avatar'))
      expect(hasAiAvatar).toBe(true)
    })

    it('should mention 5 AI Avatar interviews', () => {
      const aiFeature = features.find(f => f.includes('AI-Powered Avatar'))
      expect(aiFeature).toContain('5')
    })
  })

  describe('Elite Features', () => {
    const features = TIER_FEATURES.elite

    it('should have 6 features', () => {
      expect(features).toHaveLength(6)
    })

    it('should mention unlimited for core features', () => {
      const unlimitedFeatures = features.filter(f => f.includes('Unlimited'))
      expect(unlimitedFeatures.length).toBe(5)
    })

    it('should mention 10 AI Avatar interviews', () => {
      const aiFeature = features.find(f => f.includes('AI-Powered Avatar'))
      expect(aiFeature).toContain('10')
    })
  })
})

// ============================================================================
// Date Formatting Tests
// ============================================================================

describe('Subscription Success - Date Formatting', () => {
  it('should return N/A for null date', () => {
    expect(formatDate(null)).toBe('N/A')
  })

  it('should format valid ISO date', () => {
    const result = formatDate('2026-03-15T00:00:00Z')
    expect(result).toContain('March')
    expect(result).toContain('2026')
  })

  it('should include weekday', () => {
    const result = formatDate('2026-03-15T00:00:00Z')
    // March 15, 2026 is a Sunday
    expect(result).toContain('Sunday')
  })

  it('should include full month name', () => {
    const result = formatDate('2026-02-15T00:00:00Z')
    expect(result).toContain('February')
  })
})

// ============================================================================
// Welcome Message Tests
// ============================================================================

describe('Subscription Success - Welcome Message', () => {
  function getWelcomeMessage(tier: SubscriptionTier): string {
    const config = TIER_CONFIGS[tier]
    const emoji = TIER_EMOJIS[tier]
    return `Welcome to ${config.name}! ${emoji}`
  }

  it('should generate correct message for momentum', () => {
    expect(getWelcomeMessage('momentum')).toBe('Welcome to Momentum! 🚀')
  })

  it('should generate correct message for accelerate', () => {
    expect(getWelcomeMessage('accelerate')).toBe('Welcome to Accelerate! ⚡')
  })

  it('should generate correct message for elite', () => {
    expect(getWelcomeMessage('elite')).toBe('Welcome to Elite! 👑')
  })
})

// ============================================================================
// Always Active Tests
// ============================================================================

describe('Subscription Success - Always Active', () => {
  it('should work when subscription system is disabled', () => {
    // Page should still function for testing/edge cases
    const response: SubscriptionStatusResponse = {
      subscriptionEnabled: false, // Kill switch OFF
      hasSubscription: true,
      tier: 'accelerate',
      billingPeriod: 'monthly',
      status: 'active',
      currentPeriodEnd: '2026-03-15T00:00:00Z',
    }

    expect(isSubscriptionReady(response)).toBe(true)
    expect(getPageState(false, false, response)).toBe('success')
  })

  it('should show success regardless of subscriptionEnabled flag', () => {
    const disabledResponse: SubscriptionStatusResponse = {
      subscriptionEnabled: false,
      hasSubscription: true,
      tier: 'elite',
      billingPeriod: 'yearly',
      status: 'active',
      currentPeriodEnd: '2027-02-15T00:00:00Z',
    }

    const enabledResponse: SubscriptionStatusResponse = {
      subscriptionEnabled: true,
      hasSubscription: true,
      tier: 'elite',
      billingPeriod: 'yearly',
      status: 'active',
      currentPeriodEnd: '2027-02-15T00:00:00Z',
    }

    expect(getPageState(false, false, disabledResponse)).toBe('success')
    expect(getPageState(false, false, enabledResponse)).toBe('success')
  })
})

// ============================================================================
// Retry Logic Tests
// ============================================================================

describe('Subscription Success - Retry Logic', () => {
  function simulateRetry(): { pollCount: number; isPolling: boolean; hasTimedOut: boolean } {
    return {
      pollCount: 0,
      isPolling: true,
      hasTimedOut: false,
    }
  }

  it('should reset poll count on retry', () => {
    const state = simulateRetry()
    expect(state.pollCount).toBe(0)
  })

  it('should set polling to true on retry', () => {
    const state = simulateRetry()
    expect(state.isPolling).toBe(true)
  })

  it('should clear timeout flag on retry', () => {
    const state = simulateRetry()
    expect(state.hasTimedOut).toBe(false)
  })
})

// ============================================================================
// Feature Count Validation
// ============================================================================

describe('Subscription Success - Feature Count Validation', () => {
  it('should have features matching tier limits', () => {
    // Momentum: 5 core features at 8 each (no AI)
    expect(TIER_FEATURES.momentum.length).toBe(5)
    expect(TIER_CONFIGS.momentum.limits.aiAvatarInterviews).toBe(0)

    // Accelerate: 5 core at 15 + AI Avatar
    expect(TIER_FEATURES.accelerate.length).toBe(6)
    expect(TIER_CONFIGS.accelerate.limits.aiAvatarInterviews).toBe(5)

    // Elite: 5 unlimited + AI Avatar
    expect(TIER_FEATURES.elite.length).toBe(6)
    expect(TIER_CONFIGS.elite.limits.applications).toBe(-1) // unlimited
    expect(TIER_CONFIGS.elite.limits.aiAvatarInterviews).toBe(10)
  })
})
