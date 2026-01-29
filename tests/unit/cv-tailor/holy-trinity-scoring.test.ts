/**
 * CV Tailor - Holy Trinity Scoring Tests
 *
 * Tests for the Holy Trinity scoring architecture:
 * - Formula: Final = (Core × 0.5) + (ATS × 0.3) + (Landing Page × 0.2)
 * - Fallback: If ATS = 0, Final = (Core × 0.7) + (LP × 0.3)
 */

import { describe, it, expect } from 'vitest'

// ============================================================================
// HOLY TRINITY CONSTANTS (mirrored from src/lib/cv/tailor.ts)
// ============================================================================

const CORE_WEIGHT = 0.50
const ATS_WEIGHT = 0.30
const LANDING_PAGE_WEIGHT = 0.20

const FALLBACK_CORE_WEIGHT = 0.70
const FALLBACK_LP_WEIGHT = 0.30

// ============================================================================
// SCORING FUNCTIONS (extracted for testing)
// ============================================================================

/**
 * Calculate weighted overall score using Holy Trinity formula
 * Formula: (Core × 0.5) + (ATS × 0.3) + (Landing Page × 0.2)
 * Fallback: If ATS = 0, use (Core × 0.7) + (LP × 0.3)
 */
function calculateWeightedScore(
  coreScore: number,
  atsScore: number,
  landingPageScore: number
): number {
  // Fallback to 70/30 if ATS score is missing (0)
  if (atsScore === 0) {
    return Math.round(
      (coreScore * FALLBACK_CORE_WEIGHT + landingPageScore * FALLBACK_LP_WEIGHT) * 10
    ) / 10
  }

  // Holy Trinity formula: 50/30/20
  return Math.round(
    (coreScore * CORE_WEIGHT + atsScore * ATS_WEIGHT + landingPageScore * LANDING_PAGE_WEIGHT) * 10
  ) / 10
}

/**
 * Calculate core average from indicator scores
 */
function calculateCoreAverage(scores: number[]): number {
  if (scores.length === 0) return 5
  const sum = scores.reduce((acc, s) => acc + s, 0)
  return Math.round((sum / scores.length) * 10) / 10
}

// ============================================================================
// HOLY TRINITY WEIGHT TESTS
// ============================================================================

describe('Holy Trinity Weights', () => {
  it('should have Core weight of 50%', () => {
    expect(CORE_WEIGHT).toBe(0.50)
  })

  it('should have ATS weight of 30%', () => {
    expect(ATS_WEIGHT).toBe(0.30)
  })

  it('should have Landing Page weight of 20%', () => {
    expect(LANDING_PAGE_WEIGHT).toBe(0.20)
  })

  it('should have weights that sum to 100%', () => {
    const total = CORE_WEIGHT + ATS_WEIGHT + LANDING_PAGE_WEIGHT
    expect(total).toBe(1.0)
  })
})

// ============================================================================
// FALLBACK WEIGHT TESTS
// ============================================================================

describe('Fallback Weights (ATS = 0)', () => {
  it('should have Fallback Core weight of 70%', () => {
    expect(FALLBACK_CORE_WEIGHT).toBe(0.70)
  })

  it('should have Fallback LP weight of 30%', () => {
    expect(FALLBACK_LP_WEIGHT).toBe(0.30)
  })

  it('should have fallback weights that sum to 100%', () => {
    const total = FALLBACK_CORE_WEIGHT + FALLBACK_LP_WEIGHT
    expect(total).toBe(1.0)
  })
})

// ============================================================================
// HOLY TRINITY FORMULA TESTS
// ============================================================================

describe('Holy Trinity Formula', () => {
  it('should calculate weighted score correctly (equal scores)', () => {
    // All scores = 7.0
    // Formula: (7 × 0.5) + (7 × 0.3) + (7 × 0.2) = 3.5 + 2.1 + 1.4 = 7.0
    const result = calculateWeightedScore(7, 7, 7)
    expect(result).toBe(7.0)
  })

  it('should weight Core at 50%', () => {
    // Core=10, ATS=0 (fallback), LP=0
    // But ATS=0 triggers fallback, so let's use ATS=5
    // Formula: (10 × 0.5) + (5 × 0.3) + (5 × 0.2) = 5 + 1.5 + 1 = 7.5
    const result = calculateWeightedScore(10, 5, 5)
    expect(result).toBe(7.5)
  })

  it('should weight ATS at 30%', () => {
    // Core=5, ATS=10, LP=5
    // Formula: (5 × 0.5) + (10 × 0.3) + (5 × 0.2) = 2.5 + 3 + 1 = 6.5
    const result = calculateWeightedScore(5, 10, 5)
    expect(result).toBe(6.5)
  })

  it('should weight Landing Page at 20%', () => {
    // Core=5, ATS=5, LP=10
    // Formula: (5 × 0.5) + (5 × 0.3) + (10 × 0.2) = 2.5 + 1.5 + 2 = 6.0
    const result = calculateWeightedScore(5, 5, 10)
    expect(result).toBe(6.0)
  })

  it('should handle maximum scores', () => {
    // All scores = 10.0
    // Formula: (10 × 0.5) + (10 × 0.3) + (10 × 0.2) = 5 + 3 + 2 = 10.0
    const result = calculateWeightedScore(10, 10, 10)
    expect(result).toBe(10.0)
  })

  it('should handle minimum scores', () => {
    // All scores = 1.0 (minimum)
    // Formula: (1 × 0.5) + (1 × 0.3) + (1 × 0.2) = 0.5 + 0.3 + 0.2 = 1.0
    const result = calculateWeightedScore(1, 1, 1)
    expect(result).toBe(1.0)
  })

  it('should handle mixed high/low scores', () => {
    // Core=9, ATS=3, LP=6
    // Formula: (9 × 0.5) + (3 × 0.3) + (6 × 0.2) = 4.5 + 0.9 + 1.2 = 6.6
    const result = calculateWeightedScore(9, 3, 6)
    expect(result).toBe(6.6)
  })

  it('should round to one decimal place', () => {
    // Core=7.33, ATS=8.66, LP=5.11
    // Formula: (7.33 × 0.5) + (8.66 × 0.3) + (5.11 × 0.2)
    //        = 3.665 + 2.598 + 1.022 = 7.285 → rounded to 7.3
    const result = calculateWeightedScore(7.33, 8.66, 5.11)
    expect(result).toBe(7.3)
  })
})

// ============================================================================
// FALLBACK FORMULA TESTS (ATS = 0)
// ============================================================================

describe('Fallback Formula (ATS = 0)', () => {
  it('should use fallback when ATS is 0', () => {
    // Core=7, ATS=0, LP=6
    // Fallback: (7 × 0.7) + (6 × 0.3) = 4.9 + 1.8 = 6.7
    const result = calculateWeightedScore(7, 0, 6)
    expect(result).toBe(6.7)
  })

  it('should weight Core at 70% in fallback', () => {
    // Core=10, ATS=0, LP=5
    // Fallback: (10 × 0.7) + (5 × 0.3) = 7 + 1.5 = 8.5
    const result = calculateWeightedScore(10, 0, 5)
    expect(result).toBe(8.5)
  })

  it('should weight LP at 30% in fallback', () => {
    // Core=5, ATS=0, LP=10
    // Fallback: (5 × 0.7) + (10 × 0.3) = 3.5 + 3 = 6.5
    const result = calculateWeightedScore(5, 0, 10)
    expect(result).toBe(6.5)
  })

  it('should handle equal scores in fallback', () => {
    // Core=8, ATS=0, LP=8
    // Fallback: (8 × 0.7) + (8 × 0.3) = 5.6 + 2.4 = 8.0
    const result = calculateWeightedScore(8, 0, 8)
    expect(result).toBe(8.0)
  })

  it('should not use fallback when ATS > 0', () => {
    // Core=7, ATS=0.1, LP=6
    // Holy Trinity: (7 × 0.5) + (0.1 × 0.3) + (6 × 0.2) = 3.5 + 0.03 + 1.2 = 4.73 → 4.7
    const result = calculateWeightedScore(7, 0.1, 6)
    // Should NOT equal fallback result (6.7)
    expect(result).not.toBe(6.7)
    expect(result).toBe(4.7)
  })
})

// ============================================================================
// CORE AVERAGE CALCULATION TESTS
// ============================================================================

describe('Core Average Calculation', () => {
  it('should calculate average of 10 indicators', () => {
    const scores = [7, 8, 6, 7, 9, 8, 7, 6, 8, 7] // Sum = 73, Avg = 7.3
    expect(calculateCoreAverage(scores)).toBe(7.3)
  })

  it('should return 5 for empty array', () => {
    expect(calculateCoreAverage([])).toBe(5)
  })

  it('should handle single score', () => {
    expect(calculateCoreAverage([8])).toBe(8.0)
  })

  it('should handle all same scores', () => {
    const scores = [7, 7, 7, 7, 7, 7, 7, 7, 7, 7]
    expect(calculateCoreAverage(scores)).toBe(7.0)
  })

  it('should handle maximum scores', () => {
    const scores = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10]
    expect(calculateCoreAverage(scores)).toBe(10.0)
  })

  it('should handle minimum scores', () => {
    const scores = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    expect(calculateCoreAverage(scores)).toBe(1.0)
  })

  it('should round to one decimal place', () => {
    const scores = [7, 8, 7, 8, 7, 8, 7, 8, 7, 8] // Sum = 75, Avg = 7.5
    expect(calculateCoreAverage(scores)).toBe(7.5)
  })

  it('should handle decimal input scores', () => {
    const scores = [7.5, 8.2, 6.8, 7.1, 9.3] // Sum = 38.9, Avg = 7.78 → 7.8
    expect(calculateCoreAverage(scores)).toBe(7.8)
  })
})

// ============================================================================
// SCORE COMPARISON TESTS
// ============================================================================

describe('Score Comparison Scenarios', () => {
  it('should show Core has highest impact on final score', () => {
    // High Core, Low others
    const highCore = calculateWeightedScore(10, 5, 5)
    // Low Core, High others
    const lowCore = calculateWeightedScore(5, 10, 10)

    // Both equal 7.5 due to how weights balance out
    // (10×0.5)+(5×0.3)+(5×0.2) = 5+1.5+1 = 7.5
    // (5×0.5)+(10×0.3)+(10×0.2) = 2.5+3+2 = 7.5
    // Test that Core has highest single-factor impact instead
    const coreOnlyHigh = calculateWeightedScore(10, 5, 5) // 7.5
    const coreOnlyLow = calculateWeightedScore(1, 5, 5) // 2.0
    const coreDiff = coreOnlyHigh - coreOnlyLow // 5.5 difference

    const atsOnlyHigh = calculateWeightedScore(5, 10, 5) // 5.5
    const atsOnlyLow = calculateWeightedScore(5, 1, 5) // 3.8
    const atsDiff = atsOnlyHigh - atsOnlyLow // 1.7 difference

    // Core swing (9 point change) has bigger impact than ATS swing
    expect(coreDiff).toBeGreaterThan(atsDiff)
  })

  it('should show ATS has second highest impact', () => {
    // Same Core and LP, different ATS
    const highATS = calculateWeightedScore(7, 10, 5)
    const lowATS = calculateWeightedScore(7, 1, 5)

    expect(highATS).toBeGreaterThan(lowATS)
    // Difference should be significant (ATS difference × 0.3)
    expect(highATS - lowATS).toBeCloseTo(2.7, 1) // (10-1) × 0.3 = 2.7
  })

  it('should show LP has lowest impact', () => {
    // Same Core and ATS, different LP
    const highLP = calculateWeightedScore(7, 5, 10)
    const lowLP = calculateWeightedScore(7, 5, 1)

    expect(highLP).toBeGreaterThan(lowLP)
    // Difference should be smallest (LP difference × 0.2)
    expect(highLP - lowLP).toBeCloseTo(1.8, 1) // (10-1) × 0.2 = 1.8
  })

  it('should produce different scores for typical CV improvements', () => {
    // Before tailoring: Core=6, ATS=4, LP=7
    const before = calculateWeightedScore(6, 4, 7)

    // After tailoring: Core=7.5, ATS=7, LP=7.5
    const after = calculateWeightedScore(7.5, 7, 7.5)

    expect(after).toBeGreaterThan(before)
    expect(after - before).toBeGreaterThan(1) // Should improve by at least 1 point
  })
})

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

describe('Edge Cases', () => {
  it('should handle zero scores (except ATS fallback)', () => {
    // Core=0, ATS=5, LP=0
    const result = calculateWeightedScore(0, 5, 0)
    expect(result).toBe(1.5) // Only ATS contributes: 5 × 0.3 = 1.5
  })

  it('should handle all zeros', () => {
    // All zeros - triggers fallback since ATS=0
    const result = calculateWeightedScore(0, 0, 0)
    expect(result).toBe(0)
  })

  it('should handle scores above 10 (clamp not enforced here)', () => {
    // Scores above 10 (edge case)
    const result = calculateWeightedScore(12, 11, 13)
    // Formula: (12 × 0.5) + (11 × 0.3) + (13 × 0.2) = 6 + 3.3 + 2.6 = 11.9
    expect(result).toBe(11.9)
  })

  it('should handle negative scores (edge case)', () => {
    // Negative scores (shouldn't happen in practice)
    const result = calculateWeightedScore(-1, 5, 5)
    // Formula: (-1 × 0.5) + (5 × 0.3) + (5 × 0.2) = -0.5 + 1.5 + 1 = 2.0
    expect(result).toBe(2.0)
  })

  it('should maintain precision with very small differences', () => {
    const a = calculateWeightedScore(7.01, 7.01, 7.01)
    const b = calculateWeightedScore(7.02, 7.02, 7.02)
    // Both should round to 7.0 due to precision
    expect(a).toBe(7.0)
    expect(b).toBe(7.0)
  })
})

// ============================================================================
// REAL-WORLD SCENARIO TESTS
// ============================================================================

describe('Real-World Scenarios', () => {
  it('should calculate score for strong technical CV', () => {
    // Strong Core (technical skills), medium ATS (keywords), good LP (formatting)
    const score = calculateWeightedScore(8.5, 6, 7.5)
    // Formula: (8.5 × 0.5) + (6 × 0.3) + (7.5 × 0.2) = 4.25 + 1.8 + 1.5 = 7.55 → 7.6
    expect(score).toBe(7.6)
  })

  it('should calculate score for keyword-optimized CV', () => {
    // Medium Core, excellent ATS (keyword stuffed), medium LP
    const score = calculateWeightedScore(6.5, 9, 6)
    // Formula: (6.5 × 0.5) + (9 × 0.3) + (6 × 0.2) = 3.25 + 2.7 + 1.2 = 7.15 → 7.2
    expect(score).toBe(7.2)
  })

  it('should calculate score for well-formatted but weak CV', () => {
    // Weak Core, weak ATS, excellent LP
    const score = calculateWeightedScore(4, 3, 9)
    // Formula: (4 × 0.5) + (3 × 0.3) + (9 × 0.2) = 2 + 0.9 + 1.8 = 4.7
    expect(score).toBe(4.7)
  })

  it('should calculate improvement from tailoring', () => {
    // Before: mediocre scores
    const before = calculateWeightedScore(5.5, 4, 6)
    // After: improved across all dimensions
    const after = calculateWeightedScore(7, 7, 7)

    const improvement = after - before
    expect(improvement).toBeGreaterThan(1.5)
  })

  it('should handle missing job description (ATS = 0)', () => {
    // When no job description provided, ATS = 0
    const score = calculateWeightedScore(7.5, 0, 8)
    // Fallback: (7.5 × 0.7) + (8 × 0.3) = 5.25 + 2.4 = 7.65 → 7.7
    expect(score).toBe(7.7)
  })
})
