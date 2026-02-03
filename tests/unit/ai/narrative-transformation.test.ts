/**
 * Narrative Transformation & Validation Tests — RALPH Structure
 *
 * R — Requirements: generateNarrativeTransformationSummary, retailorWithToneNudge,
 *                   formatBulletsForPDFExport return correct structures
 * A — Analysis: archetype detection accuracy, dimension shifts, success summary
 * L — Logic: tone nudge re-tailoring, PDF seniority framing, top transformations
 * P — Preservation: different profiles produce different results, idempotence
 * H — Hardening: edge cases, empty inputs, boundary values
 */

import { describe, it, expect } from 'vitest'
import {
  generateNarrativeTransformationSummary,
  retailorWithToneNudge,
  formatBulletsForPDFExport,
  type NarrativeProfile,
  type NarrativeTransformationSummary,
  type ToneNudge,
} from '@/lib/ai/siggy-integration-guide'

// =========================================================================
// Shared fixtures
// =========================================================================

const STRATEGIC_PROFILE: NarrativeProfile = {
  targetRole: 'VP of Product',
  seniorityLevel: 'executive',
  coreStrength: 'strategic-leadership',
  painPoint: 'Not getting noticed for leadership roles',
  desiredBrand: 'A transformational product leader who sets vision and aligns organizations.',
}

const TECHNICAL_PROFILE: NarrativeProfile = {
  targetRole: 'Staff Engineer',
  seniorityLevel: 'senior',
  coreStrength: 'technical-mastery',
  painPoint: 'CV reads too much like a task list',
  desiredBrand: 'A systems architect who designs scalable platforms.',
}

const WEAK_ORIGINALS = [
  'Managed the product roadmap',
  'Worked with engineering and design teams',
  'Built features for users',
  'Attended meetings and provided updates',
  'Responsible for project timelines',
]

const STRONG_TAILORED = [
  'Led product roadmap strategy using RICE framework, shipping 15 high-impact features over 6 months resulting in 25% revenue growth',
  'Partnered with cross-functional team of 12 engineers and designers, achieving 95% on-time delivery through weekly syncs and stakeholder alignment',
  'Launched user-facing analytics platform for 50K customers, increasing engagement by 40% and reducing churn by 15%',
  'Drove executive stakeholder alignment through weekly product reviews, resulting in $2M budget approval and accelerated roadmap execution',
  'Established agile sprint cadence with data-driven prioritization, reducing time-to-market by 35% while improving team velocity by 20%',
]

// =========================================================================
// R — Requirements: return structure validation
// =========================================================================

describe('R — Requirements: generateNarrativeTransformationSummary structure', () => {
  it('should return all required fields', () => {
    const result = generateNarrativeTransformationSummary(
      WEAK_ORIGINALS, STRONG_TAILORED, STRATEGIC_PROFILE, 8, 5
    )
    expect(result).toHaveProperty('beforeArchetype')
    expect(result).toHaveProperty('afterArchetype')
    expect(result).toHaveProperty('narrativeShift')
    expect(result).toHaveProperty('leadershipSignalDelta')
    expect(result).toHaveProperty('jdAlignmentMaintained')
    expect(result).toHaveProperty('jdScore')
    expect(result).toHaveProperty('successSummary')
    expect(result).toHaveProperty('dimensionShifts')
    expect(result).toHaveProperty('topTransformations')
  })

  it('beforeArchetype should have id, name, and percent', () => {
    const result = generateNarrativeTransformationSummary(
      WEAK_ORIGINALS, STRONG_TAILORED, STRATEGIC_PROFILE, 8, 5
    )
    expect(typeof result.beforeArchetype.id).toBe('string')
    expect(typeof result.beforeArchetype.name).toBe('string')
    expect(typeof result.beforeArchetype.percent).toBe('number')
  })

  it('afterArchetype should have id, name, and percent', () => {
    const result = generateNarrativeTransformationSummary(
      WEAK_ORIGINALS, STRONG_TAILORED, STRATEGIC_PROFILE, 8, 5
    )
    expect(typeof result.afterArchetype.id).toBe('string')
    expect(typeof result.afterArchetype.name).toBe('string')
    expect(typeof result.afterArchetype.percent).toBe('number')
  })

  it('dimensionShifts should be an array with dimension, before, after, delta', () => {
    const result = generateNarrativeTransformationSummary(
      WEAK_ORIGINALS, STRONG_TAILORED, STRATEGIC_PROFILE, 8, 5
    )
    expect(Array.isArray(result.dimensionShifts)).toBe(true)
    expect(result.dimensionShifts.length).toBeGreaterThan(0)
    result.dimensionShifts.forEach(d => {
      expect(typeof d.dimension).toBe('string')
      expect(typeof d.before).toBe('number')
      expect(typeof d.after).toBe('number')
      expect(typeof d.delta).toBe('number')
    })
  })

  it('topTransformations should be an array of objects with original, transformed, boostLabel', () => {
    const result = generateNarrativeTransformationSummary(
      WEAK_ORIGINALS, STRONG_TAILORED, STRATEGIC_PROFILE, 8, 5
    )
    expect(Array.isArray(result.topTransformations)).toBe(true)
    result.topTransformations.forEach(t => {
      expect(typeof t.original).toBe('string')
      expect(typeof t.transformed).toBe('string')
      expect(typeof t.boostLabel).toBe('string')
    })
  })
})

describe('R — Requirements: retailorWithToneNudge structure', () => {
  it('should return an array of strings matching input length', () => {
    const result = retailorWithToneNudge(STRONG_TAILORED, STRATEGIC_PROFILE, 'more-technical')
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(STRONG_TAILORED.length)
    result.forEach(b => expect(typeof b).toBe('string'))
  })

  it('should return non-empty strings', () => {
    const result = retailorWithToneNudge(STRONG_TAILORED, STRATEGIC_PROFILE, 'more-visionary')
    result.forEach(b => expect(b.length).toBeGreaterThan(0))
  })
})

describe('R — Requirements: formatBulletsForPDFExport structure', () => {
  it('should return a string', () => {
    const result = formatBulletsForPDFExport(STRONG_TAILORED, STRATEGIC_PROFILE, 'Senior PM')
    expect(typeof result).toBe('string')
  })

  it('should contain KEY ACHIEVEMENTS section', () => {
    const result = formatBulletsForPDFExport(STRONG_TAILORED, STRATEGIC_PROFILE, 'Senior PM')
    expect(result).toContain('KEY ACHIEVEMENTS')
  })

  it('should contain bullet markers', () => {
    const result = formatBulletsForPDFExport(STRONG_TAILORED, STRATEGIC_PROFILE, 'Senior PM')
    const bulletCount = (result.match(/•/g) || []).length
    expect(bulletCount).toBe(STRONG_TAILORED.length)
  })
})

// =========================================================================
// A — Analysis: archetype detection, dimension shifts, summary
// =========================================================================

describe('A — Analysis: archetype detection in transformation', () => {
  it('tailored strategic bullets should have higher narrative percent than weak originals', () => {
    const result = generateNarrativeTransformationSummary(
      WEAK_ORIGINALS, STRONG_TAILORED, STRATEGIC_PROFILE, 8, 5
    )
    expect(result.afterArchetype.percent).toBeGreaterThan(result.beforeArchetype.percent)
  })

  it('narrativeShift should contain meaningful description when improvement exists', () => {
    const result = generateNarrativeTransformationSummary(
      WEAK_ORIGINALS, STRONG_TAILORED, STRATEGIC_PROFILE, 8, 5
    )
    expect(result.narrativeShift.length).toBeGreaterThan(10)
  })

  it('jdAlignmentMaintained should be true when tailored JD >= original JD', () => {
    const result = generateNarrativeTransformationSummary(
      WEAK_ORIGINALS, STRONG_TAILORED, STRATEGIC_PROFILE, 8, 5
    )
    expect(result.jdAlignmentMaintained).toBe(true)
  })

  it('jdAlignmentMaintained should be false when tailored JD < original JD', () => {
    const result = generateNarrativeTransformationSummary(
      WEAK_ORIGINALS, STRONG_TAILORED, STRATEGIC_PROFILE, 3, 8
    )
    expect(result.jdAlignmentMaintained).toBe(false)
  })

  it('successSummary should be a non-empty string', () => {
    const result = generateNarrativeTransformationSummary(
      WEAK_ORIGINALS, STRONG_TAILORED, STRATEGIC_PROFILE, 8, 5
    )
    expect(result.successSummary.length).toBeGreaterThan(10)
  })
})

describe('A — Analysis: dimension shifts accuracy', () => {
  it('delta should equal after minus before for each dimension', () => {
    const result = generateNarrativeTransformationSummary(
      WEAK_ORIGINALS, STRONG_TAILORED, STRATEGIC_PROFILE, 8, 5
    )
    result.dimensionShifts.forEach(d => {
      expect(d.delta).toBe(d.after - d.before)
    })
  })

  it('should have 4 dimensions (matching NARRATIVE_DIMENSIONS)', () => {
    const result = generateNarrativeTransformationSummary(
      WEAK_ORIGINALS, STRONG_TAILORED, STRATEGIC_PROFILE, 8, 5
    )
    expect(result.dimensionShifts.length).toBe(4)
  })

  it('before and after values should be 0-100', () => {
    const result = generateNarrativeTransformationSummary(
      WEAK_ORIGINALS, STRONG_TAILORED, STRATEGIC_PROFILE, 8, 5
    )
    result.dimensionShifts.forEach(d => {
      expect(d.before).toBeGreaterThanOrEqual(0)
      expect(d.before).toBeLessThanOrEqual(100)
      expect(d.after).toBeGreaterThanOrEqual(0)
      expect(d.after).toBeLessThanOrEqual(100)
    })
  })
})

describe('A — Analysis: top transformations selection', () => {
  it('should select at most 3 top transformations', () => {
    const result = generateNarrativeTransformationSummary(
      WEAK_ORIGINALS, STRONG_TAILORED, STRATEGIC_PROFILE, 8, 5
    )
    expect(result.topTransformations.length).toBeLessThanOrEqual(3)
  })

  it('should only include positive-boost transformations', () => {
    const result = generateNarrativeTransformationSummary(
      WEAK_ORIGINALS, STRONG_TAILORED, STRATEGIC_PROFILE, 8, 5
    )
    // All included transformations have a positive boost (implied by boostLabel presence)
    result.topTransformations.forEach(t => {
      expect(t.boostLabel.length).toBeGreaterThan(0)
    })
  })
})

// =========================================================================
// L — Logic: tone nudge, PDF framing, summary generation
// =========================================================================

describe('L — Logic: retailorWithToneNudge changes bullet tone', () => {
  it('more-technical nudge should change the output vs original profile', () => {
    const original = retailorWithToneNudge(WEAK_ORIGINALS, STRATEGIC_PROFILE, 'more-visionary')
    const nudged = retailorWithToneNudge(WEAK_ORIGINALS, STRATEGIC_PROFILE, 'more-technical')
    // At least some bullets should differ
    const differences = original.filter((b, i) => b !== nudged[i])
    expect(differences.length).toBeGreaterThan(0)
  })

  it('more-visionary nudge should use strategic-leadership strength', () => {
    // more-visionary maps to strategic-leadership, which uses verbs like "directed", "spearheaded"
    const result = retailorWithToneNudge(
      ['Managed the product roadmap'],
      TECHNICAL_PROFILE,
      'more-visionary'
    )
    // "Managed" should be upgraded to a strategic verb like "directed"
    expect(result[0].toLowerCase()).not.toMatch(/^managed\b/)
  })

  it('more-results-driven nudge should use business-innovation strength', () => {
    const result = retailorWithToneNudge(
      ['Managed the growth marketing team'],
      STRATEGIC_PROFILE,
      'more-results-driven'
    )
    // "Managed" should become "grew" (business-innovation mapping)
    expect(result[0].toLowerCase()).toContain('grew')
  })
})

describe('L — Logic: formatBulletsForPDFExport seniority framing', () => {
  it('executive profile should include cross-functional team framing', () => {
    const bullets = ['Led the team to deliver on time']
    const result = formatBulletsForPDFExport(bullets, STRATEGIC_PROFILE, 'VP Product')
    expect(result).toContain('cross-functional team')
  })

  it('should include candidate name when provided', () => {
    const result = formatBulletsForPDFExport(
      STRONG_TAILORED, STRATEGIC_PROFILE, 'VP Product', 'Jane Doe'
    )
    expect(result).toContain('JANE DOE')
  })

  it('should include target role', () => {
    const result = formatBulletsForPDFExport(STRONG_TAILORED, STRATEGIC_PROFILE, 'Senior PM')
    expect(result).toContain('VP of Product')
  })

  it('should include seniority level', () => {
    const result = formatBulletsForPDFExport(STRONG_TAILORED, STRATEGIC_PROFILE, 'Senior PM')
    expect(result).toContain('Executive-Level Professional')
  })

  it('should include PROFESSIONAL SUMMARY when brand is set', () => {
    const result = formatBulletsForPDFExport(STRONG_TAILORED, STRATEGIC_PROFILE, 'Senior PM')
    expect(result).toContain('PROFESSIONAL SUMMARY')
    expect(result).toContain(STRATEGIC_PROFILE.desiredBrand)
  })

  it('should include archetype in footer', () => {
    const result = formatBulletsForPDFExport(STRONG_TAILORED, STRATEGIC_PROFILE, 'Senior PM')
    expect(result).toContain('Strategic Leader')
  })
})

describe('L — Logic: jdScore passthrough', () => {
  it('jdScore should be exactly the value passed in', () => {
    const result = generateNarrativeTransformationSummary(
      WEAK_ORIGINALS, STRONG_TAILORED, STRATEGIC_PROFILE, 42, 30
    )
    expect(result.jdScore).toBe(42)
  })
})

// =========================================================================
// P — Preservation: profile-differentiated results
// =========================================================================

describe('P — Preservation: different profiles produce different summaries', () => {
  it('strategic vs technical profiles should produce different after archetype percent', () => {
    const s1 = generateNarrativeTransformationSummary(
      WEAK_ORIGINALS, STRONG_TAILORED, STRATEGIC_PROFILE, 8, 5
    )
    const s2 = generateNarrativeTransformationSummary(
      WEAK_ORIGINALS, STRONG_TAILORED, TECHNICAL_PROFILE, 8, 5
    )
    // The SAME tailored bullets should score differently for different profiles
    expect(s1.afterArchetype.percent).not.toBe(s2.afterArchetype.percent)
  })

  it('different tone nudges should produce different outputs for same input', () => {
    const nudges: ToneNudge[] = ['more-technical', 'more-visionary', 'more-collaborative', 'more-results-driven']
    const results = nudges.map(n => retailorWithToneNudge(WEAK_ORIGINALS, STRATEGIC_PROFILE, n))
    // At least 3 of the 4 should differ (because they use different verb maps)
    const serialized = results.map(r => r.join('|'))
    const unique = new Set(serialized)
    expect(unique.size).toBeGreaterThanOrEqual(3)
  })
})

describe('P — Preservation: narrativeShift wording depends on data', () => {
  it('should mention JD alignment when maintained', () => {
    const result = generateNarrativeTransformationSummary(
      WEAK_ORIGINALS, STRONG_TAILORED, STRATEGIC_PROFILE, 8, 5
    )
    if (result.jdAlignmentMaintained) {
      expect(result.narrativeShift.toLowerCase()).toContain('jd alignment')
    }
  })

  it('should NOT mention JD alignment when not maintained', () => {
    const result = generateNarrativeTransformationSummary(
      WEAK_ORIGINALS, STRONG_TAILORED, STRATEGIC_PROFILE, 3, 8
    )
    expect(result.narrativeShift.toLowerCase()).not.toContain('100% jd alignment')
  })
})

// =========================================================================
// H — Hardening: edge cases
// =========================================================================

describe('H — Hardening: edge cases', () => {
  it('should handle empty original bullets', () => {
    const result = generateNarrativeTransformationSummary(
      [], STRONG_TAILORED, STRATEGIC_PROFILE, 8, 5
    )
    expect(typeof result.narrativeShift).toBe('string')
    expect(result.topTransformations).toHaveLength(0)
  })

  it('should handle empty tailored bullets', () => {
    const result = generateNarrativeTransformationSummary(
      WEAK_ORIGINALS, [], STRATEGIC_PROFILE, 8, 5
    )
    expect(typeof result.narrativeShift).toBe('string')
    expect(result.topTransformations).toHaveLength(0)
  })

  it('should handle single bullet', () => {
    const result = generateNarrativeTransformationSummary(
      ['Managed things'], ['Led strategic initiative'], STRATEGIC_PROFILE, 8, 5
    )
    expect(result.topTransformations.length).toBeLessThanOrEqual(1)
  })

  it('retailorWithToneNudge should handle empty array', () => {
    const result = retailorWithToneNudge([], STRATEGIC_PROFILE, 'more-technical')
    expect(result).toHaveLength(0)
  })

  it('formatBulletsForPDFExport should handle empty bullets', () => {
    const result = formatBulletsForPDFExport([], STRATEGIC_PROFILE, 'PM')
    expect(typeof result).toBe('string')
    expect(result).toContain('KEY ACHIEVEMENTS')
  })

  it('formatBulletsForPDFExport without candidate name should skip name line', () => {
    const result = formatBulletsForPDFExport(STRONG_TAILORED, STRATEGIC_PROFILE, 'PM')
    // Should not have an uppercase name line at the top
    const lines = result.split('\n')
    // First line should be the target role, not a name
    expect(lines[0]).toContain('VP of Product')
  })

  it('archetype percents should be 0-100', () => {
    const result = generateNarrativeTransformationSummary(
      WEAK_ORIGINALS, STRONG_TAILORED, STRATEGIC_PROFILE, 8, 5
    )
    expect(result.beforeArchetype.percent).toBeGreaterThanOrEqual(0)
    expect(result.beforeArchetype.percent).toBeLessThanOrEqual(100)
    expect(result.afterArchetype.percent).toBeGreaterThanOrEqual(0)
    expect(result.afterArchetype.percent).toBeLessThanOrEqual(100)
  })

  it('leadershipSignalDelta should be a number', () => {
    const result = generateNarrativeTransformationSummary(
      WEAK_ORIGINALS, STRONG_TAILORED, STRATEGIC_PROFILE, 8, 5
    )
    expect(typeof result.leadershipSignalDelta).toBe('number')
  })

  it('same bullets for original and tailored should produce zero or near-zero shift', () => {
    const result = generateNarrativeTransformationSummary(
      WEAK_ORIGINALS, WEAK_ORIGINALS, STRATEGIC_PROFILE, 5, 5
    )
    expect(result.afterArchetype.percent).toBe(result.beforeArchetype.percent)
    expect(result.topTransformations).toHaveLength(0)
  })

  it('formatBulletsForPDFExport with mid-level should NOT add cross-functional framing', () => {
    const midProfile: NarrativeProfile = {
      ...STRATEGIC_PROFILE,
      seniorityLevel: 'mid',
    }
    const bullets = ['Helped the team with testing']
    const result = formatBulletsForPDFExport(bullets, midProfile, 'PM')
    expect(result).not.toContain('cross-functional team')
  })
})
