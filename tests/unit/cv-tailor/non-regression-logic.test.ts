/**
 * CV Tailor - Non-Regression Logic Tests
 *
 * Tests for the "Best of Both Worlds" non-regression principle:
 * - For each indicator, final score = MAX(base, tailored)
 * - The tailored CV can only improve, never regress
 */

import { describe, it, expect } from 'vitest'

// ============================================================================
// TYPES (mirrored from src/lib/cv/tailor.ts)
// ============================================================================

interface IndicatorScoreEntry {
  indicator_number: number
  indicator_name: string
  score: number
  evidence?: string
  suggestion?: string
}

// ============================================================================
// NON-REGRESSION FUNCTION (extracted from src/lib/cv/tailor.ts)
// ============================================================================

/**
 * Apply "Best of Both Worlds" non-regression logic
 * For each indicator: final = MAX(base, tailored)
 */
function applyNonRegressionLogic(
  baseEntries: IndicatorScoreEntry[],
  tailoredEntries: IndicatorScoreEntry[]
): IndicatorScoreEntry[] {
  const result: IndicatorScoreEntry[] = []

  // Create map for quick lookup
  const tailoredMap = new Map<number, IndicatorScoreEntry>()
  tailoredEntries.forEach(e => tailoredMap.set(e.indicator_number, e))

  // For each base indicator, take the max score
  for (const baseEntry of baseEntries) {
    const tailoredEntry = tailoredMap.get(baseEntry.indicator_number)

    if (tailoredEntry && tailoredEntry.score > baseEntry.score) {
      // Tailored is better - use it
      result.push({
        ...tailoredEntry,
        evidence: tailoredEntry.evidence || baseEntry.evidence,
        suggestion: tailoredEntry.suggestion || baseEntry.suggestion,
      })
    } else {
      // Base is same or better - keep it
      result.push(baseEntry)
    }
  }

  // Add any new indicators from tailored that weren't in base
  for (const tailoredEntry of tailoredEntries) {
    if (!baseEntries.some(b => b.indicator_number === tailoredEntry.indicator_number)) {
      result.push(tailoredEntry)
    }
  }

  return result.sort((a, b) => a.indicator_number - b.indicator_number)
}

/**
 * Calculate core average from indicator entries
 */
function calculateCoreAverage(entries: IndicatorScoreEntry[]): number {
  if (entries.length === 0) return 5
  const sum = entries.reduce((acc, e) => acc + e.score, 0)
  return Math.round((sum / entries.length) * 10) / 10
}

// ============================================================================
// SAMPLE DATA
// ============================================================================

const sampleBaseEntries: IndicatorScoreEntry[] = [
  { indicator_number: 1, indicator_name: 'Job Knowledge', score: 7, evidence: 'Base evidence 1' },
  { indicator_number: 2, indicator_name: 'Problem-Solving', score: 6, evidence: 'Base evidence 2' },
  { indicator_number: 3, indicator_name: 'Communication', score: 8, evidence: 'Base evidence 3' },
  { indicator_number: 4, indicator_name: 'Social Skills', score: 5, evidence: 'Base evidence 4' },
  { indicator_number: 5, indicator_name: 'Integrity', score: 7, evidence: 'Base evidence 5' },
  { indicator_number: 6, indicator_name: 'Adaptability', score: 6, evidence: 'Base evidence 6' },
  { indicator_number: 7, indicator_name: 'Learning Agility', score: 7, evidence: 'Base evidence 7' },
  { indicator_number: 8, indicator_name: 'Leadership', score: 5, evidence: 'Base evidence 8' },
  { indicator_number: 9, indicator_name: 'Creativity', score: 6, evidence: 'Base evidence 9' },
  { indicator_number: 10, indicator_name: 'Motivation', score: 7, evidence: 'Base evidence 10' },
]

const sampleTailoredEntries: IndicatorScoreEntry[] = [
  { indicator_number: 1, indicator_name: 'Job Knowledge', score: 8, evidence: 'Tailored evidence 1' }, // Improved
  { indicator_number: 2, indicator_name: 'Problem-Solving', score: 5, evidence: 'Tailored evidence 2' }, // Worse
  { indicator_number: 3, indicator_name: 'Communication', score: 8, evidence: 'Tailored evidence 3' }, // Same
  { indicator_number: 4, indicator_name: 'Social Skills', score: 7, evidence: 'Tailored evidence 4' }, // Improved
  { indicator_number: 5, indicator_name: 'Integrity', score: 6, evidence: 'Tailored evidence 5' }, // Worse
  { indicator_number: 6, indicator_name: 'Adaptability', score: 8, evidence: 'Tailored evidence 6' }, // Improved
  { indicator_number: 7, indicator_name: 'Learning Agility', score: 7, evidence: 'Tailored evidence 7' }, // Same
  { indicator_number: 8, indicator_name: 'Leadership', score: 7, evidence: 'Tailored evidence 8' }, // Improved
  { indicator_number: 9, indicator_name: 'Creativity', score: 4, evidence: 'Tailored evidence 9' }, // Worse
  { indicator_number: 10, indicator_name: 'Motivation', score: 8, evidence: 'Tailored evidence 10' }, // Improved
]

// ============================================================================
// NON-REGRESSION PRINCIPLE TESTS
// ============================================================================

describe('Non-Regression Principle', () => {
  it('should never have final score worse than base', () => {
    const result = applyNonRegressionLogic(sampleBaseEntries, sampleTailoredEntries)

    for (const entry of result) {
      const baseEntry = sampleBaseEntries.find(b => b.indicator_number === entry.indicator_number)
      if (baseEntry) {
        expect(entry.score).toBeGreaterThanOrEqual(baseEntry.score)
      }
    }
  })

  it('should use tailored score when it is higher', () => {
    const result = applyNonRegressionLogic(sampleBaseEntries, sampleTailoredEntries)

    // Indicator 1: Base=7, Tailored=8 → Should be 8
    const ind1 = result.find(e => e.indicator_number === 1)
    expect(ind1?.score).toBe(8)

    // Indicator 4: Base=5, Tailored=7 → Should be 7
    const ind4 = result.find(e => e.indicator_number === 4)
    expect(ind4?.score).toBe(7)

    // Indicator 6: Base=6, Tailored=8 → Should be 8
    const ind6 = result.find(e => e.indicator_number === 6)
    expect(ind6?.score).toBe(8)
  })

  it('should use base score when tailored is worse', () => {
    const result = applyNonRegressionLogic(sampleBaseEntries, sampleTailoredEntries)

    // Indicator 2: Base=6, Tailored=5 → Should be 6
    const ind2 = result.find(e => e.indicator_number === 2)
    expect(ind2?.score).toBe(6)

    // Indicator 5: Base=7, Tailored=6 → Should be 7
    const ind5 = result.find(e => e.indicator_number === 5)
    expect(ind5?.score).toBe(7)

    // Indicator 9: Base=6, Tailored=4 → Should be 6
    const ind9 = result.find(e => e.indicator_number === 9)
    expect(ind9?.score).toBe(6)
  })

  it('should use base score when scores are equal', () => {
    const result = applyNonRegressionLogic(sampleBaseEntries, sampleTailoredEntries)

    // Indicator 3: Base=8, Tailored=8 → Should be 8 (from base)
    const ind3 = result.find(e => e.indicator_number === 3)
    expect(ind3?.score).toBe(8)

    // Indicator 7: Base=7, Tailored=7 → Should be 7 (from base)
    const ind7 = result.find(e => e.indicator_number === 7)
    expect(ind7?.score).toBe(7)
  })
})

// ============================================================================
// SCORE IMPROVEMENT TESTS
// ============================================================================

describe('Score Improvement', () => {
  it('should result in higher or equal average than base', () => {
    const result = applyNonRegressionLogic(sampleBaseEntries, sampleTailoredEntries)

    const baseAverage = calculateCoreAverage(sampleBaseEntries)
    const finalAverage = calculateCoreAverage(result)

    expect(finalAverage).toBeGreaterThanOrEqual(baseAverage)
  })

  it('should never result in lower average than base', () => {
    // Even with all tailored scores worse
    const worseBaseEntries: IndicatorScoreEntry[] = [
      { indicator_number: 1, indicator_name: 'Test', score: 8 },
      { indicator_number: 2, indicator_name: 'Test', score: 8 },
    ]
    const worseTailoredEntries: IndicatorScoreEntry[] = [
      { indicator_number: 1, indicator_name: 'Test', score: 3 },
      { indicator_number: 2, indicator_name: 'Test', score: 4 },
    ]

    const result = applyNonRegressionLogic(worseBaseEntries, worseTailoredEntries)

    const baseAverage = calculateCoreAverage(worseBaseEntries)
    const finalAverage = calculateCoreAverage(result)

    expect(finalAverage).toBeGreaterThanOrEqual(baseAverage)
    expect(finalAverage).toBe(8) // Should keep base scores
  })

  it('should capture all improvements', () => {
    const result = applyNonRegressionLogic(sampleBaseEntries, sampleTailoredEntries)

    // Count improvements (tailored > base)
    let improvements = 0
    for (const entry of result) {
      const baseEntry = sampleBaseEntries.find(b => b.indicator_number === entry.indicator_number)
      if (baseEntry && entry.score > baseEntry.score) {
        improvements++
      }
    }

    // Indicators 1, 4, 6, 8, 10 improved
    expect(improvements).toBe(5)
  })
})

// ============================================================================
// EVIDENCE PRESERVATION TESTS
// ============================================================================

describe('Evidence Preservation', () => {
  it('should use tailored evidence when tailored is chosen', () => {
    const result = applyNonRegressionLogic(sampleBaseEntries, sampleTailoredEntries)

    // Indicator 1: Tailored chosen (8 > 7)
    const ind1 = result.find(e => e.indicator_number === 1)
    expect(ind1?.evidence).toBe('Tailored evidence 1')
  })

  it('should use base evidence when base is chosen', () => {
    const result = applyNonRegressionLogic(sampleBaseEntries, sampleTailoredEntries)

    // Indicator 2: Base chosen (6 > 5)
    const ind2 = result.find(e => e.indicator_number === 2)
    expect(ind2?.evidence).toBe('Base evidence 2')
  })

  it('should fallback to base evidence when tailored evidence is empty', () => {
    const baseWithEvidence: IndicatorScoreEntry[] = [
      { indicator_number: 1, indicator_name: 'Test', score: 5, evidence: 'Has evidence' },
    ]
    const tailoredNoEvidence: IndicatorScoreEntry[] = [
      { indicator_number: 1, indicator_name: 'Test', score: 8, evidence: '' },
    ]

    const result = applyNonRegressionLogic(baseWithEvidence, tailoredNoEvidence)

    expect(result[0].score).toBe(8) // Tailored score
    expect(result[0].evidence).toBe('Has evidence') // Base evidence fallback
  })
})

// ============================================================================
// NEW INDICATOR HANDLING TESTS
// ============================================================================

describe('New Indicator Handling', () => {
  it('should include new indicators from tailored', () => {
    const base: IndicatorScoreEntry[] = [
      { indicator_number: 1, indicator_name: 'Test 1', score: 7 },
      { indicator_number: 2, indicator_name: 'Test 2', score: 6 },
    ]
    const tailored: IndicatorScoreEntry[] = [
      { indicator_number: 1, indicator_name: 'Test 1', score: 8 },
      { indicator_number: 2, indicator_name: 'Test 2', score: 5 },
      { indicator_number: 3, indicator_name: 'Test 3', score: 7 }, // New
      { indicator_number: 4, indicator_name: 'Test 4', score: 6 }, // New
    ]

    const result = applyNonRegressionLogic(base, tailored)

    expect(result.length).toBe(4)
    expect(result.find(e => e.indicator_number === 3)).toBeDefined()
    expect(result.find(e => e.indicator_number === 4)).toBeDefined()
  })

  it('should sort results by indicator number', () => {
    const base: IndicatorScoreEntry[] = [
      { indicator_number: 3, indicator_name: 'Test 3', score: 6 },
      { indicator_number: 1, indicator_name: 'Test 1', score: 7 },
    ]
    const tailored: IndicatorScoreEntry[] = [
      { indicator_number: 2, indicator_name: 'Test 2', score: 8 },
      { indicator_number: 1, indicator_name: 'Test 1', score: 6 },
    ]

    const result = applyNonRegressionLogic(base, tailored)

    for (let i = 1; i < result.length; i++) {
      expect(result[i].indicator_number).toBeGreaterThan(result[i - 1].indicator_number)
    }
  })
})

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

describe('Edge Cases', () => {
  it('should handle empty base entries', () => {
    const base: IndicatorScoreEntry[] = []
    const tailored: IndicatorScoreEntry[] = [
      { indicator_number: 1, indicator_name: 'Test', score: 7 },
    ]

    const result = applyNonRegressionLogic(base, tailored)

    expect(result.length).toBe(1)
    expect(result[0].score).toBe(7)
  })

  it('should handle empty tailored entries', () => {
    const base: IndicatorScoreEntry[] = [
      { indicator_number: 1, indicator_name: 'Test', score: 7 },
    ]
    const tailored: IndicatorScoreEntry[] = []

    const result = applyNonRegressionLogic(base, tailored)

    expect(result.length).toBe(1)
    expect(result[0].score).toBe(7)
  })

  it('should handle both empty', () => {
    const result = applyNonRegressionLogic([], [])
    expect(result.length).toBe(0)
  })

  it('should handle identical entries', () => {
    const entries: IndicatorScoreEntry[] = [
      { indicator_number: 1, indicator_name: 'Test', score: 7 },
    ]

    const result = applyNonRegressionLogic(entries, [...entries])

    expect(result.length).toBe(1)
    expect(result[0].score).toBe(7)
  })

  it('should handle decimal scores', () => {
    const base: IndicatorScoreEntry[] = [
      { indicator_number: 1, indicator_name: 'Test', score: 7.3 },
    ]
    const tailored: IndicatorScoreEntry[] = [
      { indicator_number: 1, indicator_name: 'Test', score: 7.5 },
    ]

    const result = applyNonRegressionLogic(base, tailored)

    expect(result[0].score).toBe(7.5)
  })

  it('should handle very small score difference', () => {
    const base: IndicatorScoreEntry[] = [
      { indicator_number: 1, indicator_name: 'Test', score: 7.01 },
    ]
    const tailored: IndicatorScoreEntry[] = [
      { indicator_number: 1, indicator_name: 'Test', score: 7.02 },
    ]

    const result = applyNonRegressionLogic(base, tailored)

    // 7.02 > 7.01, so tailored should be chosen
    expect(result[0].score).toBe(7.02)
  })
})

// ============================================================================
// COMPREHENSIVE 10-INDICATOR TESTS
// ============================================================================

describe('Full 10-Indicator Non-Regression', () => {
  it('should handle all 10 indicators correctly', () => {
    const result = applyNonRegressionLogic(sampleBaseEntries, sampleTailoredEntries)

    expect(result.length).toBe(10)

    // Verify each indicator
    const expected = [
      { num: 1, expectedScore: 8 }, // Tailored better
      { num: 2, expectedScore: 6 }, // Base better
      { num: 3, expectedScore: 8 }, // Same (base)
      { num: 4, expectedScore: 7 }, // Tailored better
      { num: 5, expectedScore: 7 }, // Base better
      { num: 6, expectedScore: 8 }, // Tailored better
      { num: 7, expectedScore: 7 }, // Same (base)
      { num: 8, expectedScore: 7 }, // Tailored better
      { num: 9, expectedScore: 6 }, // Base better
      { num: 10, expectedScore: 8 }, // Tailored better
    ]

    expected.forEach(({ num, expectedScore }) => {
      const entry = result.find(e => e.indicator_number === num)
      expect(entry?.score).toBe(expectedScore)
    })
  })

  it('should improve overall average from tailoring', () => {
    const result = applyNonRegressionLogic(sampleBaseEntries, sampleTailoredEntries)

    // Base average: (7+6+8+5+7+6+7+5+6+7) / 10 = 64/10 = 6.4
    const baseAverage = calculateCoreAverage(sampleBaseEntries)
    expect(baseAverage).toBe(6.4)

    // Best of both: (8+6+8+7+7+8+7+7+6+8) / 10 = 72/10 = 7.2
    const finalAverage = calculateCoreAverage(result)
    expect(finalAverage).toBe(7.2)

    // Improvement
    const improvement = finalAverage - baseAverage
    expect(improvement).toBeCloseTo(0.8, 1)
  })
})

// ============================================================================
// REALISTIC SCENARIO TESTS
// ============================================================================

describe('Realistic Tailoring Scenarios', () => {
  it('should handle keyword-optimized tailoring (ATS focus)', () => {
    // ATS optimization might improve some indicators, hurt others
    const base: IndicatorScoreEntry[] = [
      { indicator_number: 1, indicator_name: 'Job Knowledge', score: 7 },
      { indicator_number: 3, indicator_name: 'Communication', score: 8 },
      { indicator_number: 9, indicator_name: 'Creativity', score: 7 },
    ]
    const tailored: IndicatorScoreEntry[] = [
      { indicator_number: 1, indicator_name: 'Job Knowledge', score: 9 }, // Keywords improved
      { indicator_number: 3, indicator_name: 'Communication', score: 6 }, // Readability hurt
      { indicator_number: 9, indicator_name: 'Creativity', score: 5 }, // Originality hurt
    ]

    const result = applyNonRegressionLogic(base, tailored)

    // Should keep best of each
    expect(result.find(e => e.indicator_number === 1)?.score).toBe(9)
    expect(result.find(e => e.indicator_number === 3)?.score).toBe(8)
    expect(result.find(e => e.indicator_number === 9)?.score).toBe(7)
  })

  it('should handle comprehensive improvement', () => {
    const base: IndicatorScoreEntry[] = [
      { indicator_number: 1, indicator_name: 'Job Knowledge', score: 5 },
      { indicator_number: 2, indicator_name: 'Problem-Solving', score: 5 },
      { indicator_number: 3, indicator_name: 'Communication', score: 5 },
    ]
    const tailored: IndicatorScoreEntry[] = [
      { indicator_number: 1, indicator_name: 'Job Knowledge', score: 8 },
      { indicator_number: 2, indicator_name: 'Problem-Solving', score: 7 },
      { indicator_number: 3, indicator_name: 'Communication', score: 8 },
    ]

    const result = applyNonRegressionLogic(base, tailored)

    // All should improve
    expect(result[0].score).toBe(8)
    expect(result[1].score).toBe(7)
    expect(result[2].score).toBe(8)

    // Average should significantly improve
    expect(calculateCoreAverage(result)).toBeGreaterThan(calculateCoreAverage(base) + 2)
  })
})
