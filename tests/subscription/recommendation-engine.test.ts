/**
 * Recommendation Engine Tests (Phase 7.3)
 *
 * RALPH tests for usage analysis and tier recommendations.
 * Tests averaging logic, tier fitting algorithm, and reason generation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getUsageAverages,
  getRecommendation,
  type UsageAverages,
  type ResourceKey,
} from '@/lib/subscription/recommendation-engine'

// ============================================================================
// Mock Supabase Client Factory
// ============================================================================

interface MockOptions {
  snapshots?: Record<string, unknown>[]
  snapshotError?: { message: string } | null
}

function createMockSupabase(options: MockOptions = {}) {
  const { snapshots = [], snapshotError = null } = options

  const mockBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({
      data: snapshots,
      error: snapshotError,
    }),
  }

  return {
    from: vi.fn().mockReturnValue(mockBuilder),
  }
}

// ============================================================================
// Test Data Factories
// ============================================================================

function createSnapshot(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'snap-123',
    user_id: 'user-abc',
    month: '2026-01-01',
    usage_applications: 0,
    usage_cvs: 0,
    usage_interviews: 0,
    usage_compensation: 0,
    usage_contracts: 0,
    usage_ai_avatar_interviews: 0,
    tier_at_snapshot: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function createAverages(overrides: Partial<UsageAverages> = {}): UsageAverages {
  return {
    applications: 0,
    cvs: 0,
    interviews: 0,
    compensation: 0,
    contracts: 0,
    aiAvatarInterviews: 0,
    monthsTracked: 0,
    ...overrides,
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('Recommendation Engine', () => {
  // ==========================================================================
  // getUsageAverages Tests
  // ==========================================================================

  describe('getUsageAverages', () => {
    describe('No data', () => {
      it('should return all zeros when no snapshots exist', async () => {
        const supabase = createMockSupabase({ snapshots: [] })

        const result = await getUsageAverages(
          supabase as unknown as Parameters<typeof getUsageAverages>[0],
          'user-123'
        )

        expect(result.applications).toBe(0)
        expect(result.cvs).toBe(0)
        expect(result.interviews).toBe(0)
        expect(result.compensation).toBe(0)
        expect(result.contracts).toBe(0)
        expect(result.aiAvatarInterviews).toBe(0)
        expect(result.monthsTracked).toBe(0)
      })

      it('should return monthsTracked=0 when no data', async () => {
        const supabase = createMockSupabase({ snapshots: [] })

        const result = await getUsageAverages(
          supabase as unknown as Parameters<typeof getUsageAverages>[0],
          'user-123'
        )

        expect(result.monthsTracked).toBe(0)
      })
    })

    describe('Single month data', () => {
      it('should return exact values for single month', async () => {
        const supabase = createMockSupabase({
          snapshots: [
            createSnapshot({
              usage_applications: 5,
              usage_cvs: 3,
              usage_interviews: 2,
            }),
          ],
        })

        const result = await getUsageAverages(
          supabase as unknown as Parameters<typeof getUsageAverages>[0],
          'user-123'
        )

        expect(result.applications).toBe(5)
        expect(result.cvs).toBe(3)
        expect(result.interviews).toBe(2)
        expect(result.monthsTracked).toBe(1)
      })
    })

    describe('Multiple months averaging', () => {
      it('should calculate correct averages for 2 months', async () => {
        const supabase = createMockSupabase({
          snapshots: [
            createSnapshot({ month: '2026-01-01', usage_applications: 4 }),
            createSnapshot({ month: '2026-02-01', usage_applications: 6 }),
          ],
        })

        const result = await getUsageAverages(
          supabase as unknown as Parameters<typeof getUsageAverages>[0],
          'user-123'
        )

        expect(result.applications).toBe(5) // (4+6)/2
        expect(result.monthsTracked).toBe(2)
      })

      it('should calculate correct averages for 3 months', async () => {
        const supabase = createMockSupabase({
          snapshots: [
            createSnapshot({ month: '2026-01-01', usage_applications: 3 }),
            createSnapshot({ month: '2026-02-01', usage_applications: 6 }),
            createSnapshot({ month: '2026-03-01', usage_applications: 9 }),
          ],
        })

        const result = await getUsageAverages(
          supabase as unknown as Parameters<typeof getUsageAverages>[0],
          'user-123'
        )

        expect(result.applications).toBe(6) // (3+6+9)/3
        expect(result.monthsTracked).toBe(3)
      })

      it('should average all 6 resources correctly', async () => {
        const supabase = createMockSupabase({
          snapshots: [
            createSnapshot({
              month: '2026-01-01',
              usage_applications: 10,
              usage_cvs: 8,
              usage_interviews: 6,
              usage_compensation: 4,
              usage_contracts: 2,
              usage_ai_avatar_interviews: 1,
            }),
            createSnapshot({
              month: '2026-02-01',
              usage_applications: 6,
              usage_cvs: 4,
              usage_interviews: 2,
              usage_compensation: 2,
              usage_contracts: 0,
              usage_ai_avatar_interviews: 3,
            }),
          ],
        })

        const result = await getUsageAverages(
          supabase as unknown as Parameters<typeof getUsageAverages>[0],
          'user-123'
        )

        expect(result.applications).toBe(8) // (10+6)/2
        expect(result.cvs).toBe(6) // (8+4)/2
        expect(result.interviews).toBe(4) // (6+2)/2
        expect(result.compensation).toBe(3) // (4+2)/2
        expect(result.contracts).toBe(1) // (2+0)/2
        expect(result.aiAvatarInterviews).toBe(2) // (1+3)/2
      })
    })

    describe('Decimal rounding', () => {
      it('should round to 1 decimal place', async () => {
        const supabase = createMockSupabase({
          snapshots: [
            createSnapshot({ month: '2026-01-01', usage_applications: 1 }),
            createSnapshot({ month: '2026-02-01', usage_applications: 2 }),
            createSnapshot({ month: '2026-03-01', usage_applications: 3 }),
          ],
        })

        const result = await getUsageAverages(
          supabase as unknown as Parameters<typeof getUsageAverages>[0],
          'user-123'
        )

        expect(result.applications).toBe(2) // (1+2+3)/3 = 2
      })

      it('should round 2.33... to 2.3', async () => {
        const supabase = createMockSupabase({
          snapshots: [
            createSnapshot({ month: '2026-01-01', usage_applications: 1 }),
            createSnapshot({ month: '2026-02-01', usage_applications: 2 }),
            createSnapshot({ month: '2026-03-01', usage_applications: 4 }),
          ],
        })

        const result = await getUsageAverages(
          supabase as unknown as Parameters<typeof getUsageAverages>[0],
          'user-123'
        )

        expect(result.applications).toBe(2.3) // (1+2+4)/3 = 2.333...
      })

      it('should round 2.67... to 2.7', async () => {
        const supabase = createMockSupabase({
          snapshots: [
            createSnapshot({ month: '2026-01-01', usage_applications: 2 }),
            createSnapshot({ month: '2026-02-01', usage_applications: 3 }),
            createSnapshot({ month: '2026-03-01', usage_applications: 3 }),
          ],
        })

        const result = await getUsageAverages(
          supabase as unknown as Parameters<typeof getUsageAverages>[0],
          'user-123'
        )

        expect(result.applications).toBe(2.7) // (2+3+3)/3 = 2.666...
      })
    })

    describe('Error handling', () => {
      it('should throw on database error', async () => {
        const supabase = createMockSupabase({
          snapshotError: { message: 'Connection failed' },
        })

        await expect(
          getUsageAverages(
            supabase as unknown as Parameters<typeof getUsageAverages>[0],
            'user-123'
          )
        ).rejects.toThrow('Failed to fetch usage snapshots: Connection failed')
      })
    })

    describe('Handles null values', () => {
      it('should treat null as 0', async () => {
        const supabase = createMockSupabase({
          snapshots: [
            createSnapshot({
              usage_applications: null,
              usage_cvs: 5,
            }),
          ],
        })

        const result = await getUsageAverages(
          supabase as unknown as Parameters<typeof getUsageAverages>[0],
          'user-123'
        )

        expect(result.applications).toBe(0)
        expect(result.cvs).toBe(5)
      })
    })
  })

  // ==========================================================================
  // getRecommendation Tests
  // ==========================================================================

  describe('getRecommendation', () => {
    describe('Zero usage', () => {
      it('should recommend momentum for zero usage', () => {
        const averages = createAverages({ monthsTracked: 0 })
        const result = getRecommendation(averages)

        expect(result.recommendedTier).toBe('momentum')
      })

      it('should always recommend yearly billing period', () => {
        const averages = createAverages()
        const result = getRecommendation(averages)

        expect(result.recommendedBillingPeriod).toBe('yearly')
      })
    })

    describe('Tier fitting - momentum limits (8 each)', () => {
      it('should recommend momentum when all usage fits in limits', () => {
        const averages = createAverages({
          applications: 5,
          cvs: 4,
          interviews: 3,
          compensation: 2,
          contracts: 1,
          aiAvatarInterviews: 0,
          monthsTracked: 3,
        })
        const result = getRecommendation(averages)

        expect(result.recommendedTier).toBe('momentum')
      })

      it('should recommend momentum when usage equals limit', () => {
        const averages = createAverages({
          applications: 8,
          monthsTracked: 1,
        })
        const result = getRecommendation(averages)

        expect(result.recommendedTier).toBe('momentum')
      })
    })

    describe('Tier fitting - accelerate required', () => {
      it('should recommend accelerate when usage exceeds momentum limits', () => {
        const averages = createAverages({
          applications: 10, // exceeds momentum (8) but fits accelerate (15)
          monthsTracked: 2,
        })
        const result = getRecommendation(averages)

        expect(result.recommendedTier).toBe('accelerate')
      })

      it('should recommend accelerate when AI avatar interviews are used', () => {
        const averages = createAverages({
          applications: 5,
          aiAvatarInterviews: 2, // momentum limit is 0
          monthsTracked: 2,
        })
        const result = getRecommendation(averages)

        expect(result.recommendedTier).toBe('accelerate')
      })

      it('should recommend accelerate when usage equals accelerate limit', () => {
        const averages = createAverages({
          applications: 15, // accelerate limit
          monthsTracked: 1,
        })
        const result = getRecommendation(averages)

        expect(result.recommendedTier).toBe('accelerate')
      })
    })

    describe('Tier fitting - elite required', () => {
      it('should recommend elite when usage exceeds accelerate limits', () => {
        const averages = createAverages({
          applications: 20, // exceeds accelerate (15)
          monthsTracked: 2,
        })
        const result = getRecommendation(averages)

        expect(result.recommendedTier).toBe('elite')
      })

      it('should recommend elite when AI avatar exceeds accelerate limit', () => {
        const averages = createAverages({
          aiAvatarInterviews: 7, // exceeds accelerate limit (5)
          monthsTracked: 2,
        })
        const result = getRecommendation(averages)

        expect(result.recommendedTier).toBe('elite')
      })

      it('should recommend elite for very high usage', () => {
        const averages = createAverages({
          applications: 50,
          cvs: 40,
          interviews: 30,
          monthsTracked: 6,
        })
        const result = getRecommendation(averages)

        expect(result.recommendedTier).toBe('elite')
      })
    })

    describe('Highest tier wins', () => {
      it('should pick highest required tier across all resources', () => {
        const averages = createAverages({
          applications: 5, // fits momentum
          cvs: 3, // fits momentum
          interviews: 2, // fits momentum
          aiAvatarInterviews: 1, // requires accelerate (momentum limit is 0)
          monthsTracked: 3,
        })
        const result = getRecommendation(averages)

        expect(result.recommendedTier).toBe('accelerate')
      })

      it('should pick elite if any resource requires elite', () => {
        const averages = createAverages({
          applications: 5, // fits momentum
          cvs: 3, // fits momentum
          aiAvatarInterviews: 8, // requires elite (accelerate limit is 5)
          monthsTracked: 3,
        })
        const result = getRecommendation(averages)

        expect(result.recommendedTier).toBe('elite')
      })
    })

    describe('Comparison object', () => {
      it('should include all 6 resources in comparison', () => {
        const averages = createAverages({ monthsTracked: 1 })
        const result = getRecommendation(averages)

        expect(result.comparison.applications).toBeDefined()
        expect(result.comparison.cvs).toBeDefined()
        expect(result.comparison.interviews).toBeDefined()
        expect(result.comparison.compensation).toBeDefined()
        expect(result.comparison.contracts).toBeDefined()
        expect(result.comparison.aiAvatarInterviews).toBeDefined()
      })

      it('should include correct tier limits in comparison', () => {
        const averages = createAverages({ applications: 5, monthsTracked: 1 })
        const result = getRecommendation(averages)

        expect(result.comparison.applications.momentumLimit).toBe(8)
        expect(result.comparison.applications.accelerateLimit).toBe(15)
        expect(result.comparison.applications.eliteLimit).toBe(-1) // unlimited
      })

      it('should include average in comparison', () => {
        const averages = createAverages({ applications: 7.5, monthsTracked: 2 })
        const result = getRecommendation(averages)

        expect(result.comparison.applications.average).toBe(7.5)
      })

      it('should include fitsIn tier for each resource', () => {
        const averages = createAverages({
          applications: 10, // fits accelerate
          aiAvatarInterviews: 3, // fits accelerate
          monthsTracked: 2,
        })
        const result = getRecommendation(averages)

        expect(result.comparison.applications.fitsIn).toBe('accelerate')
        expect(result.comparison.aiAvatarInterviews.fitsIn).toBe('accelerate')
      })
    })

    describe('Savings object', () => {
      it('should include prices for recommended tier', () => {
        const averages = createAverages({ monthsTracked: 1 })
        const result = getRecommendation(averages)

        // Momentum prices: $12/mo, $30/qtr, $99/yr
        expect(result.savings.monthly).toBe(12)
        expect(result.savings.quarterly).toBe(30)
        expect(result.savings.yearly).toBe(99)
      })

      it('should calculate yearly savings vs monthly', () => {
        const averages = createAverages({ monthsTracked: 1 })
        const result = getRecommendation(averages)

        // Momentum: $12/mo * 12 = $144/yr, yearly price = $99
        expect(result.savings.yearlySavings).toBe(45) // 144 - 99
      })

      it('should calculate quarterly savings vs monthly', () => {
        const averages = createAverages({ monthsTracked: 1 })
        const result = getRecommendation(averages)

        // Momentum: $12/mo * 12 = $144/yr, quarterly price = $30 * 4 = $120
        expect(result.savings.quarterlySavings).toBe(24) // 144 - 120
      })

      it('should have zero monthly savings', () => {
        const averages = createAverages({ monthsTracked: 1 })
        const result = getRecommendation(averages)

        expect(result.savings.monthlySavings).toBe(0)
      })

      it('should include correct prices for accelerate tier', () => {
        const averages = createAverages({
          applications: 10,
          monthsTracked: 1,
        })
        const result = getRecommendation(averages)

        // Accelerate prices: $18/mo, $45/qtr, $149/yr
        expect(result.savings.monthly).toBe(18)
        expect(result.savings.quarterly).toBe(45)
        expect(result.savings.yearly).toBe(149)
      })

      it('should include correct prices for elite tier', () => {
        const averages = createAverages({
          applications: 20,
          monthsTracked: 1,
        })
        const result = getRecommendation(averages)

        // Elite prices: $29/mo, $75/qtr, $249/yr
        expect(result.savings.monthly).toBe(29)
        expect(result.savings.quarterly).toBe(75)
        expect(result.savings.yearly).toBe(249)
      })
    })

    describe('Reason string - 0 months', () => {
      it('should generate starting point message', () => {
        const averages = createAverages({ monthsTracked: 0 })
        const result = getRecommendation(averages)

        expect(result.reason).toBe('We recommend Momentum as a great starting point.')
      })

      it('should use correct tier name in starting point message', () => {
        const averages = createAverages({
          aiAvatarInterviews: 1,
          monthsTracked: 0,
        })
        // aiAvatarInterviews: 1 requires accelerate (momentum limit is 0)
        const result = getRecommendation(averages)

        expect(result.reason).toContain('Accelerate')
      })
    })

    describe('Reason string - 1 month', () => {
      it('should mention first month in message', () => {
        const averages = createAverages({
          applications: 5,
          monthsTracked: 1,
        })
        const result = getRecommendation(averages)

        expect(result.reason).toContain('first month')
      })

      it('should include usage amount', () => {
        const averages = createAverages({
          applications: 7,
          monthsTracked: 1,
        })
        const result = getRecommendation(averages)

        expect(result.reason).toContain('7')
        expect(result.reason).toContain('applications')
      })

      it('should handle zero usage in first month', () => {
        const averages = createAverages({ monthsTracked: 1 })
        const result = getRecommendation(averages)

        expect(result.reason).toContain('first month')
        expect(result.reason).toContain('Momentum')
      })
    })

    describe('Reason string - multiple months', () => {
      it('should include month count', () => {
        const averages = createAverages({
          applications: 5,
          monthsTracked: 3,
        })
        const result = getRecommendation(averages)

        expect(result.reason).toContain('3 months')
      })

      it('should mention top resource', () => {
        const averages = createAverages({
          applications: 8,
          cvs: 3,
          monthsTracked: 4,
        })
        const result = getRecommendation(averages)

        expect(result.reason).toContain('8')
        expect(result.reason).toContain('applications')
      })

      it('should mention top 2 resources', () => {
        const averages = createAverages({
          applications: 8,
          cvs: 5,
          interviews: 2,
          monthsTracked: 4,
        })
        const result = getRecommendation(averages)

        expect(result.reason).toContain('8')
        expect(result.reason).toContain('applications')
        expect(result.reason).toContain('5')
        expect(result.reason).toContain('CVs')
      })

      it('should include tier name', () => {
        const averages = createAverages({
          applications: 12, // requires accelerate
          monthsTracked: 3,
        })
        const result = getRecommendation(averages)

        expect(result.reason).toContain('Accelerate')
      })

      it('should handle zero usage in multiple months', () => {
        const averages = createAverages({ monthsTracked: 5 })
        const result = getRecommendation(averages)

        expect(result.reason).toContain('5 months')
        expect(result.reason).toContain('Momentum')
      })
    })

    describe('monthsTracked passthrough', () => {
      it('should include monthsTracked in result', () => {
        const averages = createAverages({ monthsTracked: 7 })
        const result = getRecommendation(averages)

        expect(result.monthsTracked).toBe(7)
      })
    })
  })

  // ==========================================================================
  // Tier Limits Reference Tests
  // ==========================================================================

  describe('Tier Limits Reference', () => {
    it('momentum limits: 8/8/8/8/8/0', () => {
      const averages = createAverages({
        applications: 8,
        cvs: 8,
        interviews: 8,
        compensation: 8,
        contracts: 8,
        aiAvatarInterviews: 0,
        monthsTracked: 1,
      })
      const result = getRecommendation(averages)

      expect(result.recommendedTier).toBe('momentum')
    })

    it('accelerate limits: 15/15/15/15/15/5', () => {
      const averages = createAverages({
        applications: 15,
        cvs: 15,
        interviews: 15,
        compensation: 15,
        contracts: 15,
        aiAvatarInterviews: 5,
        monthsTracked: 1,
      })
      const result = getRecommendation(averages)

      expect(result.recommendedTier).toBe('accelerate')
    })

    it('elite has unlimited for most resources', () => {
      const averages = createAverages({
        applications: 100,
        cvs: 100,
        interviews: 100,
        compensation: 100,
        contracts: 100,
        aiAvatarInterviews: 10, // elite limit
        monthsTracked: 1,
      })
      const result = getRecommendation(averages)

      expect(result.recommendedTier).toBe('elite')
      expect(result.comparison.applications.eliteLimit).toBe(-1)
    })
  })

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle decimal averages correctly', () => {
      const averages = createAverages({
        applications: 7.9,
        monthsTracked: 3,
      })
      const result = getRecommendation(averages)

      expect(result.recommendedTier).toBe('momentum') // 7.9 < 8
    })

    it('should handle exactly-at-limit edge case', () => {
      const averages = createAverages({
        applications: 8.0,
        monthsTracked: 3,
      })
      const result = getRecommendation(averages)

      expect(result.recommendedTier).toBe('momentum') // 8 <= 8
    })

    it('should handle just-over-limit edge case', () => {
      const averages = createAverages({
        applications: 8.1,
        monthsTracked: 3,
      })
      const result = getRecommendation(averages)

      expect(result.recommendedTier).toBe('accelerate') // 8.1 > 8
    })

    it('should handle AI avatar at exactly accelerate limit', () => {
      const averages = createAverages({
        aiAvatarInterviews: 5,
        monthsTracked: 2,
      })
      const result = getRecommendation(averages)

      expect(result.recommendedTier).toBe('accelerate') // 5 <= 5
    })

    it('should handle AI avatar just over accelerate limit', () => {
      const averages = createAverages({
        aiAvatarInterviews: 5.1,
        monthsTracked: 2,
      })
      const result = getRecommendation(averages)

      expect(result.recommendedTier).toBe('elite') // 5.1 > 5
    })
  })

  // ==========================================================================
  // Type exports
  // ==========================================================================

  describe('Type exports', () => {
    it('UsageAverages should have all resource fields', () => {
      const averages: UsageAverages = {
        applications: 1,
        cvs: 2,
        interviews: 3,
        compensation: 4,
        contracts: 5,
        aiAvatarInterviews: 6,
        monthsTracked: 7,
      }
      expect(averages).toBeDefined()
    })

    it('ResourceKey should cover all usage counters', () => {
      const resources: ResourceKey[] = [
        'applications',
        'cvs',
        'interviews',
        'compensation',
        'contracts',
        'aiAvatarInterviews',
      ]
      expect(resources).toHaveLength(6)
    })
  })
})
