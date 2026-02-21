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

    it('1 month of data → exact values, monthsTracked=1', async () => {
      const supabase = createMockSupabase([
        createSnapshot({
          month: '2026-01-01',
          usage_applications: 5,
          usage_cvs: 3,
          usage_interviews: 2,
          usage_compensation: 1,
          usage_contracts: 0,
          usage_ai_avatar_interviews: 1,
        }),
      ])

      const result = await getUsageAverages(
        supabase as unknown as Parameters<typeof getUsageAverages>[0],
        'user-123'
      )

      expect(result.monthsTracked).toBe(1)
      expect(result.applications).toBe(5)
      expect(result.cvs).toBe(3)
      expect(result.interviews).toBe(2)
      expect(result.compensation).toBe(1)
      expect(result.contracts).toBe(0)
      expect(result.aiAvatarInterviews).toBe(1)
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

    it('3 months with specific values → correct averages per spec', async () => {
      // As per RALPH Loop 5 spec:
      // Month 1: apps=10, cvs=8, interviews=4
      // Month 2: apps=12, cvs=6, interviews=5
      // Month 3: apps=11, cvs=7, interviews=6
      const supabase = createMockSupabase([
        createSnapshot({
          month: '2026-01-01',
          usage_applications: 10,
          usage_cvs: 8,
          usage_interviews: 4,
        }),
        createSnapshot({
          month: '2026-02-01',
          usage_applications: 12,
          usage_cvs: 6,
          usage_interviews: 5,
        }),
        createSnapshot({
          month: '2026-03-01',
          usage_applications: 11,
          usage_cvs: 7,
          usage_interviews: 6,
        }),
      ])

      const result = await getUsageAverages(
        supabase as unknown as Parameters<typeof getUsageAverages>[0],
        'user-123'
      )

      expect(result.monthsTracked).toBe(3)
      expect(result.applications).toBe(11) // (10+12+11)/3 = 11.0
      expect(result.cvs).toBe(7)            // (8+6+7)/3 = 7.0
      expect(result.interviews).toBe(5)     // (4+5+6)/3 = 5.0
    })

    it('rounds to 1 decimal place: 7,8,6 → 7.0 and 3,4 → 3.5', async () => {
      // Test 7,8,6 → Average = 7.0 (not 7.000000)
      const supabase1 = createMockSupabase([
        createSnapshot({ month: '2026-01-01', usage_applications: 7 }),
        createSnapshot({ month: '2026-02-01', usage_applications: 8 }),
        createSnapshot({ month: '2026-03-01', usage_applications: 6 }),
      ])

      const result1 = await getUsageAverages(
        supabase1 as unknown as Parameters<typeof getUsageAverages>[0],
        'user-123'
      )
      expect(result1.applications).toBe(7) // (7+8+6)/3 = 7.0

      // Test 3,4 → Average = 3.5
      const supabase2 = createMockSupabase([
        createSnapshot({ month: '2026-01-01', usage_applications: 3 }),
        createSnapshot({ month: '2026-02-01', usage_applications: 4 }),
      ])

      const result2 = await getUsageAverages(
        supabase2 as unknown as Parameters<typeof getUsageAverages>[0],
        'user-123'
      )
      expect(result2.applications).toBe(3.5) // (3+4)/2 = 3.5
    })

    it('includes AI avatar interviews: 2,3 → Average: 2.5', async () => {
      const supabase = createMockSupabase([
        createSnapshot({ month: '2026-01-01', usage_ai_avatar_interviews: 2 }),
        createSnapshot({ month: '2026-02-01', usage_ai_avatar_interviews: 3 }),
      ])

      const result = await getUsageAverages(
        supabase as unknown as Parameters<typeof getUsageAverages>[0],
        'user-123'
      )

      expect(result.aiAvatarInterviews).toBe(2.5) // (2+3)/2 = 2.5
    })

    it('handles months with zero usage: 10,0,5 → Average: 5.0', async () => {
      const supabase = createMockSupabase([
        createSnapshot({ month: '2026-01-01', usage_applications: 10 }),
        createSnapshot({ month: '2026-02-01', usage_applications: 0 }),
        createSnapshot({ month: '2026-03-01', usage_applications: 5 }),
      ])

      const result = await getUsageAverages(
        supabase as unknown as Parameters<typeof getUsageAverages>[0],
        'user-123'
      )

      expect(result.applications).toBe(5) // (10+0+5)/3 = 5.0
    })
  })

  // ==========================================================================
  // getRecommendation Tests
  // ==========================================================================

  describe('getRecommendation', () => {
    it('zero usage → Momentum (lowest tier, good starting point)', () => {
      const averages = createAverages({
        applications: 0,
        cvs: 0,
        interviews: 0,
        compensation: 0,
        contracts: 0,
        aiAvatarInterviews: 0,
        monthsTracked: 0,
      })
      const result = getRecommendation(averages)

      expect(result.recommendedTier).toBe('momentum')
    })

    it('low usage fitting Momentum limits → Momentum', () => {
      const averages = createAverages({
        applications: 5,
        cvs: 4,
        interviews: 3,
        monthsTracked: 3,
      })
      const result = getRecommendation(averages)

      expect(result.recommendedTier).toBe('momentum')
    })

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

    it('mixed resources — highest needed tier wins', () => {
      // apps=5 (fits Momentum), cvs=5 (fits Momentum), ai_avatar=3 (needs Accelerate)
      const averages = createAverages({
        applications: 5,
        cvs: 5,
        aiAvatarInterviews: 3, // Momentum has 0, Accelerate has 5
        monthsTracked: 3,
      })
      const result = getRecommendation(averages)

      // Recommended: 'accelerate' (driven by AI avatar need)
      expect(result.recommendedTier).toBe('accelerate')
    })

    it('recommended billing period is always yearly (best value)', () => {
      // Any input → recommendedBillingPeriod = 'yearly'
      const r1 = getRecommendation(createAverages({ monthsTracked: 0 }))
      expect(r1.recommendedBillingPeriod).toBe('yearly')

      const r2 = getRecommendation(createAverages({ applications: 10, monthsTracked: 3 }))
      expect(r2.recommendedBillingPeriod).toBe('yearly')

      const r3 = getRecommendation(createAverages({ applications: 20, monthsTracked: 6 }))
      expect(r3.recommendedBillingPeriod).toBe('yearly')
    })

    it('comparison object has all 6 resources', () => {
      const averages = createAverages({
        applications: 5,
        cvs: 3,
        interviews: 2,
        compensation: 1,
        contracts: 1,
        aiAvatarInterviews: 0,
        monthsTracked: 3,
      })
      const result = getRecommendation(averages)

      // Should have comparison for all 6 resources
      expect(result.comparison).toHaveProperty('applications')
      expect(result.comparison).toHaveProperty('cvs')
      expect(result.comparison).toHaveProperty('interviews')
      expect(result.comparison).toHaveProperty('compensation')
      expect(result.comparison).toHaveProperty('contracts')
      expect(result.comparison).toHaveProperty('aiAvatarInterviews')

      // Check structure of applications comparison
      expect(result.comparison.applications).toHaveProperty('average')
      expect(result.comparison.applications).toHaveProperty('momentumLimit')
      expect(result.comparison.applications).toHaveProperty('accelerateLimit')
      expect(result.comparison.applications).toHaveProperty('eliteLimit')
      expect(result.comparison.applications).toHaveProperty('fitsIn')

      // Check limits (using actual property names)
      expect(result.comparison.applications.momentumLimit).toBe(8)
      expect(result.comparison.applications.accelerateLimit).toBe(15)
      expect(result.comparison.applications.eliteLimit).toBe(-1)

      // Check AI avatar limits
      expect(result.comparison.aiAvatarInterviews.momentumLimit).toBe(0)
      expect(result.comparison.aiAvatarInterviews.accelerateLimit).toBe(5)
      expect(result.comparison.aiAvatarInterviews.eliteLimit).toBe(10)
    })

    it('fitsIn shows lowest tier that covers each resource', () => {
      // apps avg=5 → fitsIn='momentum'
      const r1 = getRecommendation(createAverages({ applications: 5, monthsTracked: 1 }))
      expect(r1.comparison.applications.fitsIn).toBe('momentum')

      // apps avg=10 → fitsIn='accelerate'
      const r2 = getRecommendation(createAverages({ applications: 10, monthsTracked: 1 }))
      expect(r2.comparison.applications.fitsIn).toBe('accelerate')

      // apps avg=20 → fitsIn='elite'
      const r3 = getRecommendation(createAverages({ applications: 20, monthsTracked: 1 }))
      expect(r3.comparison.applications.fitsIn).toBe('elite')

      // ai_avatar avg=0 → fitsIn='momentum'
      const r4 = getRecommendation(createAverages({ aiAvatarInterviews: 0, monthsTracked: 1 }))
      expect(r4.comparison.aiAvatarInterviews.fitsIn).toBe('momentum')

      // ai_avatar avg=3 → fitsIn='accelerate'
      const r5 = getRecommendation(createAverages({ aiAvatarInterviews: 3, monthsTracked: 1 }))
      expect(r5.comparison.aiAvatarInterviews.fitsIn).toBe('accelerate')
    })

    it('reason text is non-empty string with length > 10', () => {
      const r1 = getRecommendation(createAverages({ monthsTracked: 0 }))
      expect(typeof r1.reason).toBe('string')
      expect(r1.reason.length).toBeGreaterThan(10)

      const r2 = getRecommendation(createAverages({ applications: 12, monthsTracked: 3 }))
      expect(r2.reason.length).toBeGreaterThan(10)
    })

    it('0 months data → reason is introductory (starting point)', () => {
      const result = getRecommendation(createAverages({ monthsTracked: 0 }))
      const reasonLower = result.reason.toLowerCase()
      expect(
        reasonLower.includes('start') ||
        reasonLower.includes('recommend') ||
        reasonLower.includes('begin') ||
        reasonLower.includes('new')
      ).toBe(true)
    })

    it('1 month data → reason references first month', () => {
      const result = getRecommendation(createAverages({ applications: 5, monthsTracked: 1 }))
      const reasonLower = result.reason.toLowerCase()
      expect(
        reasonLower.includes('first') ||
        reasonLower.includes('month') ||
        reasonLower.includes('1')
      ).toBe(true)
    })

    it('multiple months → reason references the count', () => {
      const result = getRecommendation(createAverages({ applications: 10, monthsTracked: 6 }))
      const reasonLower = result.reason.toLowerCase()
      expect(
        reasonLower.includes('6') ||
        reasonLower.includes('months') ||
        reasonLower.includes('average')
      ).toBe(true)
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
      it('savings object has correct structure for recommended tier', () => {
        const result = getRecommendation(createAverages({ applications: 10, monthsTracked: 1 }))
        // Recommended tier is accelerate, verify correct prices
        expect(result.recommendedTier).toBe('accelerate')
        expect(result.savings.monthly).toBe(18)
        expect(result.savings.quarterly).toBe(45)
        expect(result.savings.yearly).toBe(149)
        // Best value is always yearly (reflected in recommendedBillingPeriod)
        expect(result.recommendedBillingPeriod).toBe('yearly')
      })

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
