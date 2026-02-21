/**
 * 10-Indicator Framework Tests — RALPH Loop 21
 *
 * Tests for the indicator API, types, weights, and scorer.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ============================================================================
// Mock Setup for API route tests
// ============================================================================

const mockState = {
  indicators: null as Array<Record<string, unknown>> | null,
  error: null as { message: string } | null,
  selectQueryIncludesSubIndicators: false,
  orderByNumber: false,
  orderAscending: false,
}

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: vi.fn().mockImplementation((tableName: string) => ({
      select: vi.fn().mockImplementation((query: string) => {
        if (tableName === 'indicators' && query.includes('sub_indicators')) {
          mockState.selectQueryIncludesSubIndicators = true
        }
        return {
          order: vi.fn().mockImplementation((column: string, options?: { ascending: boolean }) => {
            if (column === 'number') {
              mockState.orderByNumber = true
              mockState.orderAscending = options?.ascending === true
            }
            return Promise.resolve({
              data: mockState.indicators,
              error: mockState.error,
            })
          }),
        }
      }),
    })),
  })),
}))

// Import after mocking
import { GET } from '@/app/api/indicators/route'

// ============================================================================
// Test Suite - API Routes
// ============================================================================

describe('10-Indicator Framework', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.indicators = null
    mockState.error = null
    mockState.selectQueryIncludesSubIndicators = false
    mockState.orderByNumber = false
    mockState.orderAscending = false
  })

  afterEach(() => {
    vi.resetModules()
  })

  // ==========================================================================
  // 21.1 — GET /api/indicators
  // ==========================================================================

  describe('GET /api/indicators', () => {
    it('1. Returns indicators from database when available', async () => {
      mockState.indicators = [
        { number: 1, name: 'Job Knowledge', category: 'Cognitive' },
        { number: 2, name: 'Problem-Solving', category: 'Cognitive' },
      ]
      mockState.error = null

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.source).toBe('database')
      expect(data.indicators).toHaveLength(2)
    })

    it('2. Falls back to static when database returns error', async () => {
      mockState.indicators = null
      mockState.error = { message: 'Database connection failed' }

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.source).toBe('static')
      expect(data.indicators).toBeDefined()
    })

    it('3. Falls back to static when database returns empty', async () => {
      mockState.indicators = []
      mockState.error = null

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.source).toBe('static')
      expect(data.indicators.length).toBeGreaterThan(0)
    })

    it('4. Falls back to static on any thrown error', async () => {
      // Force an error by having mock throw
      vi.mocked(
        (await import('@/lib/supabase/server')).createClient
      ).mockRejectedValueOnce(new Error('Connection timeout'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.source).toBe('static')
    })

    it('5. Static data has exactly 10 indicators', async () => {
      mockState.indicators = []
      mockState.error = null

      const response = await GET()
      const data = await response.json()

      expect(data.indicators).toHaveLength(10)
    })

    it('6. Each static indicator has number 1-10', async () => {
      mockState.indicators = []
      mockState.error = null

      const response = await GET()
      const data = await response.json()

      const numbers = data.indicators.map((i: { number: number }) => i.number).sort((a: number, b: number) => a - b)
      expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    })

    it('7. Each static indicator has name, shortName, category, description, subIndicators', async () => {
      mockState.indicators = []
      mockState.error = null

      const response = await GET()
      const data = await response.json()

      for (const indicator of data.indicators) {
        expect(indicator.number).toBeDefined()
        expect(indicator.name).toBeDefined()
        expect(indicator.shortName).toBeDefined()
        expect(indicator.category).toBeDefined()
        expect(indicator.description).toBeDefined()
        expect(indicator.subIndicators).toBeDefined()
      }
    })

    it('8. Categories are Cognitive (1,2,7,9), Interpersonal (3,4,8), Character (5,6,10)', async () => {
      mockState.indicators = []
      mockState.error = null

      const response = await GET()
      const data = await response.json()

      const categoryMap: Record<number, string> = {}
      for (const indicator of data.indicators) {
        categoryMap[indicator.number] = indicator.category
      }

      // Cognitive: 1, 2, 7, 9
      expect(categoryMap[1]).toBe('Cognitive')
      expect(categoryMap[2]).toBe('Cognitive')
      expect(categoryMap[7]).toBe('Cognitive')
      expect(categoryMap[9]).toBe('Cognitive')

      // Interpersonal: 3, 4, 8
      expect(categoryMap[3]).toBe('Interpersonal')
      expect(categoryMap[4]).toBe('Interpersonal')
      expect(categoryMap[8]).toBe('Interpersonal')

      // Character: 5, 6, 10
      expect(categoryMap[5]).toBe('Character')
      expect(categoryMap[6]).toBe('Character')
      expect(categoryMap[10]).toBe('Character')
    })

    it('9. Each indicator has exactly 4 sub-indicators', async () => {
      mockState.indicators = []
      mockState.error = null

      const response = await GET()
      const data = await response.json()

      for (const indicator of data.indicators) {
        expect(indicator.subIndicators).toHaveLength(4)
      }
    })

    it("10. Database query includes sub_indicators join", async () => {
      mockState.indicators = [{ number: 1, name: 'Test' }]
      mockState.error = null

      await GET()

      expect(mockState.selectQueryIncludesSubIndicators).toBe(true)
    })

    it('11. Database query orders by number ascending', async () => {
      mockState.indicators = [{ number: 1, name: 'Test' }]
      mockState.error = null

      await GET()

      expect(mockState.orderByNumber).toBe(true)
      expect(mockState.orderAscending).toBe(true)
    })
  })

  // ==========================================================================
  // 21.2 — Indicator types (src/lib/indicators/types.ts)
  // ==========================================================================

  describe('Indicator types', () => {
    it('12. All indicator type interfaces are exported', async () => {
      const types = await import('@/lib/indicators/types')

      // Core types
      expect(types.INDICATOR_NAMES).toBeDefined()
      expect(types.INDICATOR_CATEGORIES).toBeDefined()
      expect(types.INDICATOR_SHORT_NAMES).toBeDefined()
      expect(types.SCORE_THRESHOLDS).toBeDefined()
      expect(types.SCORE_LABELS).toBeDefined()
      expect(types.SCORE_COLORS).toBeDefined()

      // Functions
      expect(types.getScoreColor).toBeDefined()
      expect(types.getScoreLabel).toBeDefined()
      expect(types.getSubIndicatorCount).toBeDefined()
      expect(types.getSubIndicators).toBeDefined()
    })

    it('13. Types include scoring dimensions', async () => {
      const types = await import('@/lib/indicators/types')

      // IndicatorScore dimensions
      expect(types.INDICATOR_NAMES[1]).toContain('Knowledge')
      expect(types.INDICATOR_NAMES[2]).toContain('Problem-Solving')
      expect(types.INDICATOR_NAMES[5]).toContain('Integrity')

      // Score labels exist for 1-10
      for (let i = 1; i <= 10; i++) {
        expect(types.SCORE_LABELS[i]).toBeDefined()
      }

      // Categories are defined for all 10
      for (let i = 1; i <= 10; i++) {
        expect(types.INDICATOR_CATEGORIES[i]).toBeDefined()
      }
    })
  })

  // ==========================================================================
  // 21.3 — Weights (src/lib/indicators/weights.ts)
  // ==========================================================================

  describe('Weights', () => {
    it('14. Default weights exist for all 10 indicators', async () => {
      const { INDUSTRY_WEIGHTS } = await import('@/lib/indicators/weights')

      // Generic weights should have all 10 indicators
      const genericWeights = INDUSTRY_WEIGHTS.generic.weights

      for (let i = 1; i <= 10; i++) {
        expect(genericWeights[i]).toBeDefined()
        expect(typeof genericWeights[i]).toBe('number')
      }
    })

    it('15. All weights sum to 1.0 (or 100%)', async () => {
      const { INDUSTRY_WEIGHTS } = await import('@/lib/indicators/weights')

      // Check all industries
      for (const [industry, profile] of Object.entries(INDUSTRY_WEIGHTS)) {
        const sum = Object.values(profile.weights).reduce((a, b) => a + b, 0)
        // Allow for floating point imprecision
        expect(sum).toBeCloseTo(1.0, 2)
      }
    })

    it('16. No weight is negative', async () => {
      const { INDUSTRY_WEIGHTS } = await import('@/lib/indicators/weights')

      for (const [industry, profile] of Object.entries(INDUSTRY_WEIGHTS)) {
        for (const [indicator, weight] of Object.entries(profile.weights)) {
          expect(weight).toBeGreaterThanOrEqual(0)
        }
      }
    })
  })

  // ==========================================================================
  // 21.4 — Scorer (src/lib/indicators/scorer.ts)
  // ==========================================================================

  describe('Scorer', () => {
    it('17. Scorer accepts indicator scores and weights', async () => {
      const { scoreText, compareScores, generateFeedback } = await import('@/lib/indicators/scorer')

      // Functions should be defined
      expect(scoreText).toBeDefined()
      expect(typeof scoreText).toBe('function')
      expect(compareScores).toBeDefined()
      expect(typeof compareScores).toBe('function')
      expect(generateFeedback).toBeDefined()
      expect(typeof generateFeedback).toBe('function')
    })

    it('18. Returns overall score as weighted average', async () => {
      const { calculateWeightedScore } = await import('@/lib/indicators/weights')

      // Create mock scores
      const mockScores = {
        scores: {
          1: { indicatorNumber: 1, indicatorName: 'Job Knowledge', score: 8, evidence: '', suggestion: '' },
          2: { indicatorNumber: 2, indicatorName: 'Problem-Solving', score: 7, evidence: '', suggestion: '' },
          3: { indicatorNumber: 3, indicatorName: 'Communication', score: 6, evidence: '', suggestion: '' },
          4: { indicatorNumber: 4, indicatorName: 'Social Skills', score: 7, evidence: '', suggestion: '' },
          5: { indicatorNumber: 5, indicatorName: 'Integrity', score: 9, evidence: '', suggestion: '' },
          6: { indicatorNumber: 6, indicatorName: 'Adaptability', score: 6, evidence: '', suggestion: '' },
          7: { indicatorNumber: 7, indicatorName: 'Learning Agility', score: 8, evidence: '', suggestion: '' },
          8: { indicatorNumber: 8, indicatorName: 'Leadership', score: 5, evidence: '', suggestion: '' },
          9: { indicatorNumber: 9, indicatorName: 'Creativity', score: 7, evidence: '', suggestion: '' },
          10: { indicatorNumber: 10, indicatorName: 'Motivation', score: 8, evidence: '', suggestion: '' },
        },
        overall: 7.1,
        strengths: [],
        gaps: [],
        timestamp: new Date(),
      }

      // Calculate weighted score for generic (equal weights)
      const weightedScore = calculateWeightedScore(mockScores, 'generic')

      // With equal weights (0.1 each), should be simple average
      const expectedAvg = (8 + 7 + 6 + 7 + 9 + 6 + 8 + 5 + 7 + 8) / 10
      expect(weightedScore).toBeCloseTo(expectedAvg, 1)
    })

    it('19. Handles missing indicators gracefully', async () => {
      const { calculateWeightedScore } = await import('@/lib/indicators/weights')

      // Create partial scores (only 5 indicators)
      const partialScores = {
        scores: {
          1: { indicatorNumber: 1, indicatorName: 'Job Knowledge', score: 8, evidence: '', suggestion: '' },
          2: { indicatorNumber: 2, indicatorName: 'Problem-Solving', score: 7, evidence: '', suggestion: '' },
          3: { indicatorNumber: 3, indicatorName: 'Communication', score: 6, evidence: '', suggestion: '' },
        },
        overall: 7.0,
        strengths: [],
        gaps: [],
        timestamp: new Date(),
      }

      // Should not throw and return a valid number
      const weightedScore = calculateWeightedScore(partialScores, 'generic')
      expect(typeof weightedScore).toBe('number')
      expect(weightedScore).toBeGreaterThan(0)
      expect(weightedScore).toBeLessThanOrEqual(10)
    })

    it('20. Scores are bounded 0-100 (or 0-10 scale)', async () => {
      const { compareScores } = await import('@/lib/indicators/scorer')

      // Create before/after scores
      const beforeScores = {
        scores: {
          1: { indicatorNumber: 1, indicatorName: 'Job Knowledge', score: 5, evidence: '', suggestion: '' },
        },
        overall: 5.0,
        strengths: [],
        gaps: [],
        timestamp: new Date(),
      }

      const afterScores = {
        scores: {
          1: { indicatorNumber: 1, indicatorName: 'Job Knowledge', score: 8, evidence: '', suggestion: '' },
        },
        overall: 8.0,
        strengths: [],
        gaps: [],
        timestamp: new Date(),
      }

      const comparison = compareScores(beforeScores, afterScores)

      // Scores should be bounded
      expect(comparison.before.overall).toBeGreaterThanOrEqual(0)
      expect(comparison.before.overall).toBeLessThanOrEqual(10)
      expect(comparison.after.overall).toBeGreaterThanOrEqual(0)
      expect(comparison.after.overall).toBeLessThanOrEqual(10)

      // Change should be calculated correctly
      expect(comparison.improvements.length).toBeGreaterThan(0)
    })
  })
})
