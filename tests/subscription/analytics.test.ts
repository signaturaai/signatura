/**
 * Analytics Tests (Phase 14.1 — Prompt 14.1, Item 4)
 *
 * RALPH tests for usage averages and tier recommendation logic.
 * Covers:
 *   - getUsageAverages: 0 months → all zeros, monthsTracked=0
 *   - getUsageAverages: 3 months → correct averages rounded to 1 decimal
 *   - getRecommendation: avg 5 apps/mo → Momentum
 *   - getRecommendation: avg 10 apps/mo → Accelerate (exceeds Momentum's 8)
 *   - getRecommendation: avg 1 AI avatar/mo → Accelerate (Momentum has 0)
 *   - getRecommendation: avg 20 apps/mo → Elite (exceeds Accelerate's 15)
 *   - getRecommendation: avg 8 AI avatar/mo → Elite (exceeds Accelerate's 5)
 *   - Recommendation reason text is non-empty
 *   - Savings object has correct prices
 */

import { describe, it, expect, vi } from 'vitest'
import {
  getUsageAverages,
  getRecommendation,
  type UsageAverages,
} from '@/lib/subscription/recommendation-engine'

// ============================================================================
// Mock Supabase Client Factory
// ============================================================================

function createMockSupabase(snapshots: Record<string, unknown>[] = []) {
  const mockBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({
      data: snapshots,
      error: null,
    }),
  }

  return {
    from: vi.fn().mockReturnValue(mockBuilder),
  }
}

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

describe('Analytics (Phase 14.1)', () => {
  // ==========================================================================
  // getUsageAverages Tests
  // ==========================================================================

  describe('getUsageAverages', () => {
    it('0 months → all zeros, monthsTracked=0', async () => {
      const supabase = createMockSupabase([])

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

    it('3 months → correct averages rounded to 1 decimal', async () => {
      const supabase = createMockSupabase([
        createSnapshot({
          month: '2026-01-01',
          usage_applications: 4,
          usage_cvs: 3,
          usage_interviews: 1,
          usage_compensation: 2,
          usage_contracts: 0,
          usage_ai_avatar_interviews: 3,
        }),
        createSnapshot({
          month: '2026-02-01',
          usage_applications: 7,
          usage_cvs: 5,
          usage_interviews: 3,
          usage_compensation: 1,
          usage_contracts: 2,
          usage_ai_avatar_interviews: 4,
        }),
        createSnapshot({
          month: '2026-03-01',
          usage_applications: 10,
          usage_cvs: 4,
          usage_interviews: 5,
          usage_compensation: 3,
          usage_contracts: 1,
          usage_ai_avatar_interviews: 2,
        }),
      ])

      const result = await getUsageAverages(
        supabase as unknown as Parameters<typeof getUsageAverages>[0],
        'user-123'
      )

      expect(result.monthsTracked).toBe(3)
      expect(result.applications).toBe(7)    // (4+7+10)/3 = 7
      expect(result.cvs).toBe(4)             // (3+5+4)/3 = 4
      expect(result.interviews).toBe(3)      // (1+3+5)/3 = 3
      expect(result.compensation).toBe(2)    // (2+1+3)/3 = 2
      expect(result.contracts).toBe(1)       // (0+2+1)/3 = 1
      expect(result.aiAvatarInterviews).toBe(3) // (3+4+2)/3 = 3
    })

    it('should round 2.33... to 2.3 (1 decimal)', async () => {
      const supabase = createMockSupabase([
        createSnapshot({ month: '2026-01-01', usage_applications: 1 }),
        createSnapshot({ month: '2026-02-01', usage_applications: 2 }),
        createSnapshot({ month: '2026-03-01', usage_applications: 4 }),
      ])

      const result = await getUsageAverages(
        supabase as unknown as Parameters<typeof getUsageAverages>[0],
        'user-123'
      )

      // (1+2+4)/3 = 2.333...
      expect(result.applications).toBe(2.3)
    })
  })

  // ==========================================================================
  // getRecommendation Tests
  // ==========================================================================

  describe('getRecommendation', () => {
    it('avg 5 apps/mo → Momentum', () => {
      const averages = createAverages({
        applications: 5,
        monthsTracked: 3,
      })
      const result = getRecommendation(averages)

      expect(result.recommendedTier).toBe('momentum')
    })

    it('avg 10 apps/mo → Accelerate (exceeds Momentum 8 limit)', () => {
      const averages = createAverages({
        applications: 10, // Momentum limit is 8
        monthsTracked: 3,
      })
      const result = getRecommendation(averages)

      expect(result.recommendedTier).toBe('accelerate')
    })

    it('avg 1 AI avatar/mo → Accelerate (Momentum has 0)', () => {
      const averages = createAverages({
        aiAvatarInterviews: 1, // Momentum limit is 0
        monthsTracked: 3,
      })
      const result = getRecommendation(averages)

      expect(result.recommendedTier).toBe('accelerate')
    })

    it('avg 20 apps/mo → Elite (exceeds Accelerate 15 limit)', () => {
      const averages = createAverages({
        applications: 20, // Accelerate limit is 15
        monthsTracked: 3,
      })
      const result = getRecommendation(averages)

      expect(result.recommendedTier).toBe('elite')
    })

    it('avg 8 AI avatar/mo → Elite (exceeds Accelerate 5 limit)', () => {
      const averages = createAverages({
        aiAvatarInterviews: 8, // Accelerate limit is 5
        monthsTracked: 3,
      })
      const result = getRecommendation(averages)

      expect(result.recommendedTier).toBe('elite')
    })

    it('reason text is non-empty for all scenarios', () => {
      // Zero months
      const r1 = getRecommendation(createAverages({ monthsTracked: 0 }))
      expect(r1.reason.length).toBeGreaterThan(0)

      // 1 month
      const r2 = getRecommendation(createAverages({ applications: 5, monthsTracked: 1 }))
      expect(r2.reason.length).toBeGreaterThan(0)

      // Multiple months
      const r3 = getRecommendation(createAverages({ applications: 12, monthsTracked: 3 }))
      expect(r3.reason.length).toBeGreaterThan(0)

      // Elite-level usage
      const r4 = getRecommendation(createAverages({ applications: 25, monthsTracked: 6 }))
      expect(r4.reason.length).toBeGreaterThan(0)
    })

    describe('Savings object has correct prices', () => {
      it('Momentum: $12/mo, $30/qtr, $99/yr', () => {
        const averages = createAverages({ applications: 5, monthsTracked: 1 })
        const result = getRecommendation(averages)

        expect(result.recommendedTier).toBe('momentum')
        expect(result.savings.monthly).toBe(12)
        expect(result.savings.quarterly).toBe(30)
        expect(result.savings.yearly).toBe(99)
      })

      it('Accelerate: $18/mo, $45/qtr, $149/yr', () => {
        const averages = createAverages({ applications: 10, monthsTracked: 1 })
        const result = getRecommendation(averages)

        expect(result.recommendedTier).toBe('accelerate')
        expect(result.savings.monthly).toBe(18)
        expect(result.savings.quarterly).toBe(45)
        expect(result.savings.yearly).toBe(149)
      })

      it('Elite: $29/mo, $75/qtr, $249/yr', () => {
        const averages = createAverages({ applications: 20, monthsTracked: 1 })
        const result = getRecommendation(averages)

        expect(result.recommendedTier).toBe('elite')
        expect(result.savings.monthly).toBe(29)
        expect(result.savings.quarterly).toBe(75)
        expect(result.savings.yearly).toBe(249)
      })

      it('yearly savings = (monthly * 12) - yearly', () => {
        // Momentum: $12 * 12 = $144 - $99 = $45
        const r1 = getRecommendation(createAverages({ applications: 5, monthsTracked: 1 }))
        expect(r1.savings.yearlySavings).toBe(45)

        // Accelerate: $18 * 12 = $216 - $149 = $67
        const r2 = getRecommendation(createAverages({ applications: 10, monthsTracked: 1 }))
        expect(r2.savings.yearlySavings).toBe(67)

        // Elite: $29 * 12 = $348 - $249 = $99
        const r3 = getRecommendation(createAverages({ applications: 20, monthsTracked: 1 }))
        expect(r3.savings.yearlySavings).toBe(99)
      })

      it('quarterly savings = (monthly * 12) - (quarterly * 4)', () => {
        // Momentum: $12 * 12 = $144 - ($30 * 4 = $120) = $24
        const r1 = getRecommendation(createAverages({ applications: 5, monthsTracked: 1 }))
        expect(r1.savings.quarterlySavings).toBe(24)
      })

      it('monthly savings = 0', () => {
        const result = getRecommendation(createAverages({ monthsTracked: 1 }))
        expect(result.savings.monthlySavings).toBe(0)
      })
    })
  })

  // ==========================================================================
  // Edge cases from Phase 14 spec
  // ==========================================================================

  describe('Edge Cases', () => {
    it('avg 8 apps/mo → Momentum (exactly at limit)', () => {
      const averages = createAverages({
        applications: 8, // Momentum limit is 8
        monthsTracked: 3,
      })
      const result = getRecommendation(averages)

      expect(result.recommendedTier).toBe('momentum')
    })

    it('avg 8.1 apps/mo → Accelerate (just over Momentum limit)', () => {
      const averages = createAverages({
        applications: 8.1,
        monthsTracked: 3,
      })
      const result = getRecommendation(averages)

      expect(result.recommendedTier).toBe('accelerate')
    })

    it('avg 15 apps/mo → Accelerate (exactly at Accelerate limit)', () => {
      const averages = createAverages({
        applications: 15,
        monthsTracked: 3,
      })
      const result = getRecommendation(averages)

      expect(result.recommendedTier).toBe('accelerate')
    })

    it('avg 15.1 apps/mo → Elite (just over Accelerate limit)', () => {
      const averages = createAverages({
        applications: 15.1,
        monthsTracked: 3,
      })
      const result = getRecommendation(averages)

      expect(result.recommendedTier).toBe('elite')
    })

    it('avg 5 AI avatar/mo → Accelerate (exactly at Accelerate limit)', () => {
      const averages = createAverages({
        aiAvatarInterviews: 5,
        monthsTracked: 3,
      })
      const result = getRecommendation(averages)

      expect(result.recommendedTier).toBe('accelerate')
    })

    it('avg 5.1 AI avatar/mo → Elite (just over Accelerate limit)', () => {
      const averages = createAverages({
        aiAvatarInterviews: 5.1,
        monthsTracked: 3,
      })
      const result = getRecommendation(averages)

      expect(result.recommendedTier).toBe('elite')
    })
  })
})
