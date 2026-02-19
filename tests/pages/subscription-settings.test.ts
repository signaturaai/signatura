/**
 * Subscription Settings Page Tests (Phase 10.2)
 *
 * RALPH tests for the subscription settings page component logic.
 * Tests progress bars, trend calculations, and action states.
 */

import { describe, it, expect } from 'vitest'
import {
  TIER_CONFIGS,
  formatPrice,
} from '@/lib/subscription/config'
import type { SubscriptionTier, BillingPeriod } from '@/types/subscription'

// ============================================================================
// Types matching the page
// ============================================================================

type ResourceKey = 'applications' | 'cvs' | 'interviews' | 'compensation' | 'contracts' | 'aiAvatarInterviews'

interface UsageTrendData {
  month: string
  applications: number
  cvs: number
  interviews: number
  compensation: number
  contracts: number
  aiAvatarInterviews: number
}

// ============================================================================
// Helper Functions (matching page logic)
// ============================================================================

function getProgressColor(percentUsed: number): 'green' | 'yellow' | 'red' {
  if (percentUsed >= 80) return 'red'
  if (percentUsed >= 50) return 'yellow'
  return 'green'
}

function calculatePercentUsed(used: number, limit: number): number {
  if (limit <= 0) return 0
  return Math.min((used / limit) * 100, 100)
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatMonth(monthString: string): string {
  const [year, month] = monthString.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function calculateAverages(trends: UsageTrendData[]): Record<ResourceKey, number> {
  const monthsTracked = trends.length
  const averages: Record<ResourceKey, number> = {
    applications: 0,
    cvs: 0,
    interviews: 0,
    compensation: 0,
    contracts: 0,
    aiAvatarInterviews: 0,
  }

  if (monthsTracked === 0) return averages

  const totals = trends.reduce(
    (acc, trend) => ({
      applications: acc.applications + trend.applications,
      cvs: acc.cvs + trend.cvs,
      interviews: acc.interviews + trend.interviews,
      compensation: acc.compensation + trend.compensation,
      contracts: acc.contracts + trend.contracts,
      aiAvatarInterviews: acc.aiAvatarInterviews + trend.aiAvatarInterviews,
    }),
    { applications: 0, cvs: 0, interviews: 0, compensation: 0, contracts: 0, aiAvatarInterviews: 0 }
  )

  averages.applications = totals.applications / monthsTracked
  averages.cvs = totals.cvs / monthsTracked
  averages.interviews = totals.interviews / monthsTracked
  averages.compensation = totals.compensation / monthsTracked
  averages.contracts = totals.contracts / monthsTracked
  averages.aiAvatarInterviews = totals.aiAvatarInterviews / monthsTracked

  return averages
}

// ============================================================================
// Progress Bar Tests
// ============================================================================

describe('Subscription Settings - Progress Bar Logic', () => {
  describe('calculatePercentUsed', () => {
    it('should calculate correct percentage', () => {
      expect(calculatePercentUsed(5, 10)).toBe(50)
      expect(calculatePercentUsed(8, 8)).toBe(100)
      expect(calculatePercentUsed(0, 8)).toBe(0)
    })

    it('should cap at 100%', () => {
      expect(calculatePercentUsed(12, 8)).toBe(100)
      expect(calculatePercentUsed(100, 10)).toBe(100)
    })

    it('should return 0 for zero or negative limit', () => {
      expect(calculatePercentUsed(5, 0)).toBe(0)
      expect(calculatePercentUsed(5, -1)).toBe(0)
    })
  })

  describe('getProgressColor', () => {
    it('should return green for < 50%', () => {
      expect(getProgressColor(0)).toBe('green')
      expect(getProgressColor(25)).toBe('green')
      expect(getProgressColor(49)).toBe('green')
    })

    it('should return yellow for 50-79%', () => {
      expect(getProgressColor(50)).toBe('yellow')
      expect(getProgressColor(65)).toBe('yellow')
      expect(getProgressColor(79)).toBe('yellow')
    })

    it('should return red for >= 80%', () => {
      expect(getProgressColor(80)).toBe('red')
      expect(getProgressColor(90)).toBe('red')
      expect(getProgressColor(100)).toBe('red')
    })
  })

  describe('Progress bar states by tier', () => {
    const tiers: SubscriptionTier[] = ['momentum', 'accelerate', 'elite']

    it('should have correct limits per tier', () => {
      expect(TIER_CONFIGS.momentum.limits.applications).toBe(8)
      expect(TIER_CONFIGS.accelerate.limits.applications).toBe(15)
      expect(TIER_CONFIGS.elite.limits.applications).toBe(-1) // unlimited
    })

    it('should mark elite resources as unlimited', () => {
      const eliteLimits = TIER_CONFIGS.elite.limits
      expect(eliteLimits.applications).toBe(-1)
      expect(eliteLimits.cvs).toBe(-1)
      expect(eliteLimits.interviews).toBe(-1)
      expect(eliteLimits.compensation).toBe(-1)
      expect(eliteLimits.contracts).toBe(-1)
      // AI Avatar is not unlimited
      expect(eliteLimits.aiAvatarInterviews).toBe(10)
    })
  })
})

// ============================================================================
// Date Formatting Tests
// ============================================================================

describe('Subscription Settings - Date Formatting', () => {
  describe('formatDate', () => {
    it('should format valid ISO date', () => {
      const result = formatDate('2026-02-15T10:00:00Z')
      expect(result).toContain('Feb')
      expect(result).toContain('15')
      expect(result).toContain('2026')
    })

    it('should return dash for null', () => {
      expect(formatDate(null)).toBe('—')
    })
  })

  describe('formatMonth', () => {
    it('should format YYYY-MM to readable month', () => {
      expect(formatMonth('2026-01')).toContain('Jan')
      expect(formatMonth('2026-02')).toContain('Feb')
      expect(formatMonth('2026-12')).toContain('Dec')
    })

    it('should include year', () => {
      expect(formatMonth('2026-06')).toContain('2026')
      expect(formatMonth('2025-06')).toContain('2025')
    })
  })
})

// ============================================================================
// Usage Trends Tests
// ============================================================================

describe('Subscription Settings - Usage Trends', () => {
  describe('calculateAverages', () => {
    it('should return zeros for empty trends', () => {
      const averages = calculateAverages([])
      expect(averages.applications).toBe(0)
      expect(averages.cvs).toBe(0)
      expect(averages.interviews).toBe(0)
    })

    it('should calculate correct averages for single month', () => {
      const trends: UsageTrendData[] = [
        {
          month: '2026-01',
          applications: 10,
          cvs: 5,
          interviews: 3,
          compensation: 2,
          contracts: 1,
          aiAvatarInterviews: 0,
        },
      ]

      const averages = calculateAverages(trends)
      expect(averages.applications).toBe(10)
      expect(averages.cvs).toBe(5)
      expect(averages.interviews).toBe(3)
    })

    it('should calculate correct averages for multiple months', () => {
      const trends: UsageTrendData[] = [
        { month: '2026-01', applications: 10, cvs: 4, interviews: 2, compensation: 1, contracts: 0, aiAvatarInterviews: 0 },
        { month: '2026-02', applications: 8, cvs: 6, interviews: 4, compensation: 3, contracts: 2, aiAvatarInterviews: 1 },
        { month: '2026-03', applications: 12, cvs: 8, interviews: 6, compensation: 2, contracts: 4, aiAvatarInterviews: 2 },
      ]

      const averages = calculateAverages(trends)
      expect(averages.applications).toBe(10) // (10 + 8 + 12) / 3
      expect(averages.cvs).toBe(6) // (4 + 6 + 8) / 3
      expect(averages.interviews).toBe(4) // (2 + 4 + 6) / 3
      expect(averages.compensation).toBe(2) // (1 + 3 + 2) / 3
      expect(averages.contracts).toBe(2) // (0 + 2 + 4) / 3
      expect(averages.aiAvatarInterviews).toBe(1) // (0 + 1 + 2) / 3
    })
  })

  describe('Trend data structure', () => {
    it('should have all required resource fields', () => {
      const trend: UsageTrendData = {
        month: '2026-01',
        applications: 5,
        cvs: 3,
        interviews: 2,
        compensation: 1,
        contracts: 1,
        aiAvatarInterviews: 0,
      }

      expect(trend.month).toBeDefined()
      expect(trend.applications).toBeDefined()
      expect(trend.cvs).toBeDefined()
      expect(trend.interviews).toBeDefined()
      expect(trend.compensation).toBeDefined()
      expect(trend.contracts).toBeDefined()
      expect(trend.aiAvatarInterviews).toBeDefined()
    })
  })
})

// ============================================================================
// Current Plan Section Tests
// ============================================================================

describe('Subscription Settings - Current Plan Section', () => {
  describe('Price display', () => {
    it('should format monthly prices correctly', () => {
      expect(formatPrice(TIER_CONFIGS.momentum.pricing.monthly.amount)).toBe('$12')
      expect(formatPrice(TIER_CONFIGS.accelerate.pricing.monthly.amount)).toBe('$18')
      expect(formatPrice(TIER_CONFIGS.elite.pricing.monthly.amount)).toBe('$29')
    })

    it('should format quarterly prices correctly', () => {
      expect(formatPrice(TIER_CONFIGS.momentum.pricing.quarterly.amount)).toBe('$30')
      expect(formatPrice(TIER_CONFIGS.accelerate.pricing.quarterly.amount)).toBe('$45')
      expect(formatPrice(TIER_CONFIGS.elite.pricing.quarterly.amount)).toBe('$75')
    })

    it('should format yearly prices correctly', () => {
      expect(formatPrice(TIER_CONFIGS.momentum.pricing.yearly.amount)).toBe('$99')
      expect(formatPrice(TIER_CONFIGS.accelerate.pricing.yearly.amount)).toBe('$149')
      expect(formatPrice(TIER_CONFIGS.elite.pricing.yearly.amount)).toBe('$249')
    })
  })

  describe('Period label logic', () => {
    function getPeriodLabel(billingPeriod: BillingPeriod): string {
      return billingPeriod === 'monthly' ? '/mo' : billingPeriod === 'quarterly' ? '/qtr' : '/yr'
    }

    it('should return correct period labels', () => {
      expect(getPeriodLabel('monthly')).toBe('/mo')
      expect(getPeriodLabel('quarterly')).toBe('/qtr')
      expect(getPeriodLabel('yearly')).toBe('/yr')
    })
  })

  describe('Alert conditions', () => {
    interface PlanState {
      isPastDue: boolean
      isCancelled: boolean
      cancellationEffectiveAt: string | null
      scheduledTierChange: SubscriptionTier | null
    }

    function getActiveAlerts(state: PlanState): string[] {
      const alerts: string[] = []
      if (state.isPastDue) alerts.push('past_due')
      if (state.isCancelled && state.cancellationEffectiveAt) alerts.push('cancelled')
      if (state.scheduledTierChange) alerts.push('scheduled_downgrade')
      return alerts
    }

    it('should show past due alert', () => {
      const alerts = getActiveAlerts({
        isPastDue: true,
        isCancelled: false,
        cancellationEffectiveAt: null,
        scheduledTierChange: null,
      })
      expect(alerts).toContain('past_due')
    })

    it('should show cancelled alert', () => {
      const alerts = getActiveAlerts({
        isPastDue: false,
        isCancelled: true,
        cancellationEffectiveAt: '2026-03-15T00:00:00Z',
        scheduledTierChange: null,
      })
      expect(alerts).toContain('cancelled')
    })

    it('should show scheduled downgrade alert', () => {
      const alerts = getActiveAlerts({
        isPastDue: false,
        isCancelled: false,
        cancellationEffectiveAt: null,
        scheduledTierChange: 'momentum',
      })
      expect(alerts).toContain('scheduled_downgrade')
    })

    it('should show multiple alerts when applicable', () => {
      const alerts = getActiveAlerts({
        isPastDue: true,
        isCancelled: true,
        cancellationEffectiveAt: '2026-03-15T00:00:00Z',
        scheduledTierChange: null,
      })
      expect(alerts).toHaveLength(2)
      expect(alerts).toContain('past_due')
      expect(alerts).toContain('cancelled')
    })

    it('should show no alerts for active subscription', () => {
      const alerts = getActiveAlerts({
        isPastDue: false,
        isCancelled: false,
        cancellationEffectiveAt: null,
        scheduledTierChange: null,
      })
      expect(alerts).toHaveLength(0)
    })
  })
})

// ============================================================================
// Actions Section Tests
// ============================================================================

describe('Subscription Settings - Actions Section', () => {
  interface ActionState {
    hasSubscription: boolean
    isCancelled: boolean
  }

  function getAvailableActions(state: ActionState): string[] {
    const actions: string[] = []

    if (state.hasSubscription && !state.isCancelled) {
      actions.push('change_plan')
      actions.push('cancel')
    }

    if (state.isCancelled) {
      actions.push('resubscribe')
    }

    if (!state.hasSubscription) {
      actions.push('choose_plan')
    }

    return actions
  }

  describe('Active subscription actions', () => {
    it('should show change plan and cancel', () => {
      const actions = getAvailableActions({
        hasSubscription: true,
        isCancelled: false,
      })
      expect(actions).toContain('change_plan')
      expect(actions).toContain('cancel')
      expect(actions).not.toContain('resubscribe')
    })
  })

  describe('Cancelled subscription actions', () => {
    it('should show resubscribe', () => {
      const actions = getAvailableActions({
        hasSubscription: true,
        isCancelled: true,
      })
      expect(actions).toContain('resubscribe')
      expect(actions).not.toContain('cancel')
    })
  })

  describe('No subscription actions', () => {
    it('should show choose plan', () => {
      const actions = getAvailableActions({
        hasSubscription: false,
        isCancelled: false,
      })
      expect(actions).toContain('choose_plan')
      expect(actions).not.toContain('change_plan')
      expect(actions).not.toContain('cancel')
    })
  })
})

// ============================================================================
// Recommendation Message Tests
// ============================================================================

describe('Subscription Settings - Recommendation Messages', () => {
  function getRecommendationState(
    currentTier: SubscriptionTier | null,
    recommendedTier: SubscriptionTier | null
  ): 'on_right_plan' | 'should_upgrade' | 'could_downgrade' | 'no_recommendation' {
    if (!recommendedTier) return 'no_recommendation'
    if (currentTier === recommendedTier) return 'on_right_plan'

    const tierOrder = ['momentum', 'accelerate', 'elite']
    const currentIndex = currentTier ? tierOrder.indexOf(currentTier) : -1
    const recommendedIndex = tierOrder.indexOf(recommendedTier)

    if (recommendedIndex > currentIndex) return 'should_upgrade'
    return 'could_downgrade'
  }

  it('should identify when on the right plan', () => {
    expect(getRecommendationState('accelerate', 'accelerate')).toBe('on_right_plan')
    expect(getRecommendationState('elite', 'elite')).toBe('on_right_plan')
    expect(getRecommendationState('momentum', 'momentum')).toBe('on_right_plan')
  })

  it('should identify when should upgrade', () => {
    expect(getRecommendationState('momentum', 'accelerate')).toBe('should_upgrade')
    expect(getRecommendationState('momentum', 'elite')).toBe('should_upgrade')
    expect(getRecommendationState('accelerate', 'elite')).toBe('should_upgrade')
  })

  it('should identify when could downgrade', () => {
    expect(getRecommendationState('elite', 'accelerate')).toBe('could_downgrade')
    expect(getRecommendationState('elite', 'momentum')).toBe('could_downgrade')
    expect(getRecommendationState('accelerate', 'momentum')).toBe('could_downgrade')
  })

  it('should handle no recommendation', () => {
    expect(getRecommendationState('momentum', null)).toBe('no_recommendation')
    expect(getRecommendationState(null, null)).toBe('no_recommendation')
  })

  it('should handle null current tier with recommendation', () => {
    // No current tier but has recommendation means should upgrade
    expect(getRecommendationState(null, 'momentum')).toBe('should_upgrade')
    expect(getRecommendationState(null, 'accelerate')).toBe('should_upgrade')
  })
})

// ============================================================================
// Kill Switch Tests
// ============================================================================

describe('Subscription Settings - Kill Switch Behavior', () => {
  function getViewMode(
    subscriptionEnabled: boolean,
    hasSubscription: boolean
  ): 'coming_soon' | 'no_subscription' | 'settings' {
    if (!subscriptionEnabled) return 'coming_soon'
    if (!hasSubscription) return 'no_subscription'
    return 'settings'
  }

  it('should show coming soon when subscription disabled', () => {
    expect(getViewMode(false, false)).toBe('coming_soon')
    expect(getViewMode(false, true)).toBe('coming_soon')
  })

  it('should show no subscription view when enabled but no subscription', () => {
    expect(getViewMode(true, false)).toBe('no_subscription')
  })

  it('should show settings when enabled with subscription', () => {
    expect(getViewMode(true, true)).toBe('settings')
  })
})

// ============================================================================
// Resource Labels Tests
// ============================================================================

describe('Subscription Settings - Resource Labels', () => {
  const RESOURCE_LABELS: Record<ResourceKey, string> = {
    applications: 'Applications',
    cvs: 'Tailored CVs',
    interviews: 'Interview Coach',
    compensation: 'Compensation',
    contracts: 'Contract Reviews',
    aiAvatarInterviews: 'AI Avatar Interviews',
  }

  const RESOURCE_ORDER: ResourceKey[] = [
    'applications',
    'cvs',
    'interviews',
    'compensation',
    'contracts',
    'aiAvatarInterviews',
  ]

  it('should have labels for all 6 resources', () => {
    expect(Object.keys(RESOURCE_LABELS)).toHaveLength(6)
  })

  it('should have all resources in order array', () => {
    expect(RESOURCE_ORDER).toHaveLength(6)
  })

  it('should have matching keys between labels and order', () => {
    for (const resource of RESOURCE_ORDER) {
      expect(RESOURCE_LABELS[resource]).toBeDefined()
    }
  })

  it('should have readable labels', () => {
    expect(RESOURCE_LABELS.applications).toBe('Applications')
    expect(RESOURCE_LABELS.cvs).toBe('Tailored CVs')
    expect(RESOURCE_LABELS.aiAvatarInterviews).toBe('AI Avatar Interviews')
  })
})

// ============================================================================
// Cancel Downgrade Tests
// ============================================================================

describe('Subscription Settings - Cancel Downgrade Logic', () => {
  function canCancelDowngrade(scheduledTierChange: SubscriptionTier | null): boolean {
    return scheduledTierChange !== null
  }

  it('should allow cancel when downgrade is scheduled', () => {
    expect(canCancelDowngrade('momentum')).toBe(true)
    expect(canCancelDowngrade('accelerate')).toBe(true)
  })

  it('should not allow cancel when no downgrade scheduled', () => {
    expect(canCancelDowngrade(null)).toBe(false)
  })
})

// ============================================================================
// Trends API Response Tests
// ============================================================================

describe('Subscription Settings - Trends API Response', () => {
  interface UsageTrendsResponse {
    trends: UsageTrendData[]
    averages: Record<ResourceKey, number>
    monthsTracked: number
  }

  function validateTrendsResponse(response: UsageTrendsResponse): boolean {
    // Check required fields
    if (!Array.isArray(response.trends)) return false
    if (typeof response.averages !== 'object') return false
    if (typeof response.monthsTracked !== 'number') return false

    // Check averages has all resources
    const requiredResources: ResourceKey[] = [
      'applications', 'cvs', 'interviews', 'compensation', 'contracts', 'aiAvatarInterviews'
    ]
    for (const resource of requiredResources) {
      if (typeof response.averages[resource] !== 'number') return false
    }

    return true
  }

  it('should validate valid response', () => {
    const response: UsageTrendsResponse = {
      trends: [],
      averages: { applications: 0, cvs: 0, interviews: 0, compensation: 0, contracts: 0, aiAvatarInterviews: 0 },
      monthsTracked: 0,
    }
    expect(validateTrendsResponse(response)).toBe(true)
  })

  it('should validate response with data', () => {
    const response: UsageTrendsResponse = {
      trends: [
        { month: '2026-01', applications: 5, cvs: 3, interviews: 2, compensation: 1, contracts: 1, aiAvatarInterviews: 0 },
      ],
      averages: { applications: 5, cvs: 3, interviews: 2, compensation: 1, contracts: 1, aiAvatarInterviews: 0 },
      monthsTracked: 1,
    }
    expect(validateTrendsResponse(response)).toBe(true)
  })
})
