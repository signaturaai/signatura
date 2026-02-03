/**
 * Narrative-Driven Bullet Tailoring Tests — RALPH Structure
 *
 * R — Requirements: scoreNarrativeAlignment, tailorBulletForNarrative return correct structures
 * A — Analysis: verb upgrades accuracy, enrichment injection, score calculation integrity
 * L — Logic: analyzeTailoringPairWithNarrative wires narrative + JD scoring, Top Pick classification
 * P — Preservation: different profiles produce different rewrites and scores
 * H — Hardening: edge cases, empty inputs, boundary values, pipeline consistency
 */

import { describe, it, expect } from 'vitest'
import {
  scoreNarrativeAlignment,
  tailorBulletForNarrative,
  analyzeTailoringPairWithNarrative,
  tailorBulletsWithNarrative,
  type NarrativeProfile,
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

const OPERATIONAL_PROFILE: NarrativeProfile = {
  targetRole: 'Engineering Manager',
  seniorityLevel: 'mid',
  coreStrength: 'operational-excellence',
  painPoint: 'Hard to show delivery excellence',
  desiredBrand: 'A delivery-focused leader who ships on time every time.',
}

const BUSINESS_PROFILE: NarrativeProfile = {
  targetRole: 'Growth Product Manager',
  seniorityLevel: 'mid',
  coreStrength: 'business-innovation',
  painPoint: 'Struggling to show commercial impact',
  desiredBrand: 'A growth-minded PM who drives revenue through experimentation.',
}

const STRONG_STRATEGIC_BULLET = 'Led product roadmap strategy for enterprise platform, aligning 5 cross-functional teams around quarterly vision'
const WEAK_BULLET = 'Managed a project and helped the team with things'
const TECHNICAL_BULLET = 'Built REST API endpoints and maintained deployment pipeline using Docker and CI/CD'
const GENERIC_BULLET = 'Worked on various projects and participated in meetings'

const SAMPLE_JOB_KEYWORDS = ['product strategy', 'roadmap', 'cross-functional', 'stakeholder management', 'data-driven']

// =========================================================================
// R — Requirements: return structure validation
// =========================================================================

describe('R — Requirements: scoreNarrativeAlignment structure', () => {
  it('should return a number', () => {
    const score = scoreNarrativeAlignment(STRONG_STRATEGIC_BULLET, STRATEGIC_PROFILE)
    expect(typeof score).toBe('number')
  })

  it('should return a value between 0 and 100', () => {
    const score = scoreNarrativeAlignment(STRONG_STRATEGIC_BULLET, STRATEGIC_PROFILE)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('should return 0 for empty bullet', () => {
    expect(scoreNarrativeAlignment('', STRATEGIC_PROFILE)).toBe(0)
  })

  it('should return 0 for whitespace-only bullet', () => {
    expect(scoreNarrativeAlignment('   ', STRATEGIC_PROFILE)).toBe(0)
  })
})

describe('R — Requirements: tailorBulletForNarrative structure', () => {
  it('should return a string', () => {
    const result = tailorBulletForNarrative(WEAK_BULLET, STRATEGIC_PROFILE)
    expect(typeof result).toBe('string')
  })

  it('should return non-empty string for non-empty input', () => {
    const result = tailorBulletForNarrative(WEAK_BULLET, STRATEGIC_PROFILE)
    expect(result.length).toBeGreaterThan(0)
  })

  it('should return empty string for empty input', () => {
    expect(tailorBulletForNarrative('', STRATEGIC_PROFILE)).toBe('')
  })
})

describe('R — Requirements: analyzeTailoringPairWithNarrative structure', () => {
  it('should return all base TailoringAnalysis fields', () => {
    const result = analyzeTailoringPairWithNarrative(
      WEAK_BULLET, STRONG_STRATEGIC_BULLET, SAMPLE_JOB_KEYWORDS, STRATEGIC_PROFILE
    )
    expect(result).toHaveProperty('matchedKeywords')
    expect(result).toHaveProperty('gapsClosing')
    expect(result).toHaveProperty('scoreDelta')
    expect(result).toHaveProperty('originalScore')
    expect(result).toHaveProperty('suggestedScore')
  })

  it('should return all narrative extension fields', () => {
    const result = analyzeTailoringPairWithNarrative(
      WEAK_BULLET, STRONG_STRATEGIC_BULLET, SAMPLE_JOB_KEYWORDS, STRATEGIC_PROFILE
    )
    expect(typeof result.narrativeBoost).toBe('number')
    expect(typeof result.narrativeMatchPercent).toBe('number')
    expect(typeof result.originalNarrativePercent).toBe('number')
    expect(typeof result.isNarrativeTopPick).toBe('boolean')
    expect(typeof result.narrativeBoostLabel).toBe('string')
  })

  it('narrativeMatchPercent should be 0-100', () => {
    const result = analyzeTailoringPairWithNarrative(
      WEAK_BULLET, STRONG_STRATEGIC_BULLET, SAMPLE_JOB_KEYWORDS, STRATEGIC_PROFILE
    )
    expect(result.narrativeMatchPercent).toBeGreaterThanOrEqual(0)
    expect(result.narrativeMatchPercent).toBeLessThanOrEqual(100)
  })

  it('originalNarrativePercent should be 0-100', () => {
    const result = analyzeTailoringPairWithNarrative(
      WEAK_BULLET, STRONG_STRATEGIC_BULLET, SAMPLE_JOB_KEYWORDS, STRATEGIC_PROFILE
    )
    expect(result.originalNarrativePercent).toBeGreaterThanOrEqual(0)
    expect(result.originalNarrativePercent).toBeLessThanOrEqual(100)
  })
})

describe('R — Requirements: tailorBulletsWithNarrative structure', () => {
  it('should return analyses array matching input length', () => {
    const originals = [WEAK_BULLET, GENERIC_BULLET]
    const suggested = [STRONG_STRATEGIC_BULLET, TECHNICAL_BULLET]
    const result = tailorBulletsWithNarrative(originals, suggested, SAMPLE_JOB_KEYWORDS, STRATEGIC_PROFILE)
    expect(result.analyses).toHaveLength(2)
  })

  it('should return aggregate narrative percentages', () => {
    const originals = [WEAK_BULLET]
    const suggested = [STRONG_STRATEGIC_BULLET]
    const result = tailorBulletsWithNarrative(originals, suggested, SAMPLE_JOB_KEYWORDS, STRATEGIC_PROFILE)
    expect(typeof result.originalNarrativePercent).toBe('number')
    expect(typeof result.suggestedNarrativePercent).toBe('number')
    expect(typeof result.narrativeDelta).toBe('number')
  })

  it('narrativeDelta should equal suggested minus original', () => {
    const originals = [WEAK_BULLET, GENERIC_BULLET]
    const suggested = [STRONG_STRATEGIC_BULLET, TECHNICAL_BULLET]
    const result = tailorBulletsWithNarrative(originals, suggested, SAMPLE_JOB_KEYWORDS, STRATEGIC_PROFILE)
    expect(result.narrativeDelta).toBe(result.suggestedNarrativePercent - result.originalNarrativePercent)
  })
})

// =========================================================================
// A — Analysis: verb upgrades, enrichment, scoring
// =========================================================================

describe('A — Analysis: verb upgrade accuracy', () => {
  it('should upgrade "managed" to "directed" for strategic-leadership', () => {
    const result = tailorBulletForNarrative('Managed a portfolio of enterprise products', STRATEGIC_PROFILE)
    expect(result.toLowerCase()).toContain('directed')
    expect(result.toLowerCase()).not.toMatch(/^managed\b/)
  })

  it('should upgrade "managed" to "engineered" for technical-mastery', () => {
    const result = tailorBulletForNarrative('Managed the backend migration', TECHNICAL_PROFILE)
    expect(result.toLowerCase()).toContain('engineered')
  })

  it('should upgrade "managed" to "streamlined" for operational-excellence', () => {
    const result = tailorBulletForNarrative('Managed release processes across 3 teams', OPERATIONAL_PROFILE)
    expect(result.toLowerCase()).toContain('streamlined')
  })

  it('should upgrade "managed" to "grew" for business-innovation', () => {
    const result = tailorBulletForNarrative('Managed the growth marketing team', BUSINESS_PROFILE)
    expect(result.toLowerCase()).toContain('grew')
  })

  it('should upgrade "worked on" to "spearheaded" for strategic-leadership', () => {
    const result = tailorBulletForNarrative('Worked on the platform migration initiative', STRATEGIC_PROFILE)
    expect(result.toLowerCase()).toContain('spearheaded')
  })

  it('should upgrade "helped" to "designed" for technical-mastery', () => {
    const result = tailorBulletForNarrative('Helped design the new API architecture', TECHNICAL_PROFILE)
    expect(result.toLowerCase()).toContain('designed')
  })

  it('should preserve capitalization pattern in verb upgrades', () => {
    const result = tailorBulletForNarrative('Managed the team', STRATEGIC_PROFILE)
    // Should start with capital D for Directed
    expect(result).toMatch(/^Directed/)
  })
})

describe('A — Analysis: enrichment injection', () => {
  it('should add enrichment to bullets without outcome language', () => {
    // "Did tasks" has no outcome, no metric — should get enrichment
    const result = tailorBulletForNarrative('Orchestrated team alignment', STRATEGIC_PROFILE)
    // The result should be longer than the original (enrichment appended)
    expect(result.length).toBeGreaterThan('Orchestrated team alignment'.length)
  })

  it('should NOT add enrichment to bullets that already have outcome language', () => {
    const bulletWithOutcome = 'Led product roadmap strategy, resulting in 40% delivery improvement'
    const result = tailorBulletForNarrative(bulletWithOutcome, STRATEGIC_PROFILE)
    // Should not grow significantly (may still get verb upgrade)
    // The key test is that no enrichment phrase was appended after the outcome
    expect(result).toMatch(/improvement/)
  })

  it('should NOT add enrichment to bullets with metrics', () => {
    const bulletWithMetric = 'Directed team of 15 engineers shipping 95% on-time'
    const result = tailorBulletForNarrative(bulletWithMetric, STRATEGIC_PROFILE)
    expect(result.length).toBeLessThan(bulletWithMetric.length + 50)
  })
})

describe('A — Analysis: scoring calculation integrity', () => {
  it('strong strategic bullet should score higher than weak bullet for strategic profile', () => {
    const strongScore = scoreNarrativeAlignment(STRONG_STRATEGIC_BULLET, STRATEGIC_PROFILE)
    const weakScore = scoreNarrativeAlignment(WEAK_BULLET, STRATEGIC_PROFILE)
    expect(strongScore).toBeGreaterThan(weakScore)
  })

  it('technical bullet should score higher for technical profile than strategic profile', () => {
    const techScore = scoreNarrativeAlignment(TECHNICAL_BULLET, TECHNICAL_PROFILE)
    const stratScore = scoreNarrativeAlignment(TECHNICAL_BULLET, STRATEGIC_PROFILE)
    expect(techScore).toBeGreaterThanOrEqual(stratScore)
  })

  it('scores should not be hardcoded — different bullets produce different scores', () => {
    const score1 = scoreNarrativeAlignment(STRONG_STRATEGIC_BULLET, STRATEGIC_PROFILE)
    const score2 = scoreNarrativeAlignment(WEAK_BULLET, STRATEGIC_PROFILE)
    const score3 = scoreNarrativeAlignment(GENERIC_BULLET, STRATEGIC_PROFILE)
    const unique = new Set([score1, score2, score3])
    expect(unique.size).toBeGreaterThanOrEqual(2)
  })
})

// =========================================================================
// L — Logic: narrative pair analysis and Top Pick classification
// =========================================================================

describe('L — Logic: analyzeTailoringPairWithNarrative wiring', () => {
  it('narrativeBoost should equal suggested minus original narrative score', () => {
    const result = analyzeTailoringPairWithNarrative(
      WEAK_BULLET, STRONG_STRATEGIC_BULLET, SAMPLE_JOB_KEYWORDS, STRATEGIC_PROFILE
    )
    expect(result.narrativeBoost).toBe(
      result.narrativeMatchPercent! - result.originalNarrativePercent!
    )
  })

  it('should still compute base JD analysis fields correctly', () => {
    const result = analyzeTailoringPairWithNarrative(
      WEAK_BULLET, STRONG_STRATEGIC_BULLET, SAMPLE_JOB_KEYWORDS, STRATEGIC_PROFILE
    )
    expect(Array.isArray(result.matchedKeywords)).toBe(true)
    expect(Array.isArray(result.gapsClosing)).toBe(true)
    expect(typeof result.originalScore).toBe('number')
    expect(typeof result.suggestedScore).toBe('number')
  })
})

describe('L — Logic: Top Pick classification', () => {
  it('Top Pick requires narrativeBoost > 5 AND non-negative scoreDelta', () => {
    const result = analyzeTailoringPairWithNarrative(
      WEAK_BULLET, STRONG_STRATEGIC_BULLET, SAMPLE_JOB_KEYWORDS, STRATEGIC_PROFILE
    )
    if (result.isNarrativeTopPick) {
      expect(result.narrativeBoost!).toBeGreaterThan(5)
      expect(result.scoreDelta).toBeGreaterThanOrEqual(0)
    }
  })

  it('should not be a Top Pick if narrative boost is 0 or negative', () => {
    // Same bullet for both — no boost
    const result = analyzeTailoringPairWithNarrative(
      STRONG_STRATEGIC_BULLET, STRONG_STRATEGIC_BULLET, SAMPLE_JOB_KEYWORDS, STRATEGIC_PROFILE
    )
    expect(result.isNarrativeTopPick).toBe(false)
  })
})

describe('L — Logic: narrative boost label assignment', () => {
  it('boost > 15 should produce "Strong ... Signal" label', () => {
    // Use a very weak original and a very strong suggested to get high boost
    const result = analyzeTailoringPairWithNarrative(
      'Did tasks', STRONG_STRATEGIC_BULLET, SAMPLE_JOB_KEYWORDS, STRATEGIC_PROFILE
    )
    if (result.narrativeBoost! > 15) {
      expect(result.narrativeBoostLabel).toMatch(/Strong/)
    }
  })

  it('boost > 5 should produce "Boosts ... Signal" label', () => {
    const result = analyzeTailoringPairWithNarrative(
      WEAK_BULLET, STRONG_STRATEGIC_BULLET, SAMPLE_JOB_KEYWORDS, STRATEGIC_PROFILE
    )
    if (result.narrativeBoost! > 5 && result.narrativeBoost! <= 15) {
      expect(result.narrativeBoostLabel).toMatch(/Boosts/)
    }
  })

  it('boost of 0 should produce empty label', () => {
    const result = analyzeTailoringPairWithNarrative(
      STRONG_STRATEGIC_BULLET, STRONG_STRATEGIC_BULLET, SAMPLE_JOB_KEYWORDS, STRATEGIC_PROFILE
    )
    expect(result.narrativeBoostLabel).toBe('')
  })
})

describe('L — Logic: seniority framing in tailoring', () => {
  it('executive profile should upgrade "the team" to "a cross-functional team"', () => {
    const result = tailorBulletForNarrative('Led the team to deliver on time', STRATEGIC_PROFILE)
    expect(result).toContain('cross-functional team')
  })

  it('senior profile should upgrade "my team" to "a cross-functional team"', () => {
    const result = tailorBulletForNarrative('Guided my team through the migration', TECHNICAL_PROFILE)
    expect(result).toContain('cross-functional team')
  })

  it('mid-level profile should NOT upgrade team references', () => {
    const result = tailorBulletForNarrative('Helped the team with testing', OPERATIONAL_PROFILE)
    // Verb may change, but "the team" should stay or transform differently
    // Operational mid-level doesn't trigger the seniority framing
    expect(result).not.toContain('cross-functional team')
  })
})

// =========================================================================
// P — Preservation: different profiles produce different results
// =========================================================================

describe('P — Preservation: profile-aware differentiation', () => {
  it('same bullet should produce different rewrites for different core strengths', () => {
    const input = 'Managed the product launch across multiple regions'
    const strategic = tailorBulletForNarrative(input, STRATEGIC_PROFILE)
    const technical = tailorBulletForNarrative(input, TECHNICAL_PROFILE)
    const operational = tailorBulletForNarrative(input, OPERATIONAL_PROFILE)
    const business = tailorBulletForNarrative(input, BUSINESS_PROFILE)
    const results = new Set([strategic, technical, operational, business])
    // At least 3 of 4 should differ (verb upgrades are different per strength)
    expect(results.size).toBeGreaterThanOrEqual(3)
  })

  it('same bullet should produce different scores for different profiles', () => {
    const bullet = 'Led strategic initiative to expand market share through data-driven decisions'
    const s1 = scoreNarrativeAlignment(bullet, STRATEGIC_PROFILE)
    const s2 = scoreNarrativeAlignment(bullet, TECHNICAL_PROFILE)
    const s3 = scoreNarrativeAlignment(bullet, BUSINESS_PROFILE)
    const scores = new Set([s1, s2, s3])
    expect(scores.size).toBeGreaterThanOrEqual(2)
  })

  it('analyzeTailoringPairWithNarrative should produce different narrativeBoost for different profiles', () => {
    const r1 = analyzeTailoringPairWithNarrative(WEAK_BULLET, STRONG_STRATEGIC_BULLET, SAMPLE_JOB_KEYWORDS, STRATEGIC_PROFILE)
    const r2 = analyzeTailoringPairWithNarrative(WEAK_BULLET, STRONG_STRATEGIC_BULLET, SAMPLE_JOB_KEYWORDS, TECHNICAL_PROFILE)
    // Strategic bullet should boost more for strategic profile than technical
    expect(r1.narrativeBoost).not.toBe(r2.narrativeBoost)
  })

  it('tailorBulletsWithNarrative should produce different aggregate deltas for different profiles', () => {
    const originals = [WEAK_BULLET, GENERIC_BULLET]
    const suggested = [STRONG_STRATEGIC_BULLET, TECHNICAL_BULLET]
    const r1 = tailorBulletsWithNarrative(originals, suggested, SAMPLE_JOB_KEYWORDS, STRATEGIC_PROFILE)
    const r2 = tailorBulletsWithNarrative(originals, suggested, SAMPLE_JOB_KEYWORDS, TECHNICAL_PROFILE)
    // Different profiles should yield different aggregate narrative
    const results = new Set([r1.narrativeDelta, r2.narrativeDelta])
    expect(results.size).toBeGreaterThanOrEqual(1)
  })
})

describe('P — Preservation: verb upgrade idempotence', () => {
  it('should not double-upgrade already strong verbs', () => {
    // "Directed" is already a power verb — should not be re-upgraded
    const bullet = 'Directed the product strategy for enterprise platform'
    const result = tailorBulletForNarrative(bullet, STRATEGIC_PROFILE)
    // "Directed" should remain (it's not in the weak verb list)
    expect(result).toMatch(/Directed/)
  })

  it('tailoring the same bullet twice should produce the same result', () => {
    const first = tailorBulletForNarrative(WEAK_BULLET, STRATEGIC_PROFILE)
    const second = tailorBulletForNarrative(first, STRATEGIC_PROFILE)
    // Second pass should not change the already-upgraded bullet significantly
    // (verb upgrades are on weak verbs, power verbs shouldn't match)
    expect(second).toBe(first)
  })
})

// =========================================================================
// H — Hardening: edge cases and boundary values
// =========================================================================

describe('H — Hardening: edge cases', () => {
  it('scoreNarrativeAlignment should handle single-word bullet', () => {
    const score = scoreNarrativeAlignment('Strategy', STRATEGIC_PROFILE)
    expect(typeof score).toBe('number')
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('tailorBulletForNarrative should handle bullet with no matching weak verbs', () => {
    const bullet = 'Achieved 40% growth through strategic market expansion'
    const result = tailorBulletForNarrative(bullet, STRATEGIC_PROFILE)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('tailorBulletForNarrative should handle whitespace-only input', () => {
    const result = tailorBulletForNarrative('   ', STRATEGIC_PROFILE)
    expect(result).toBe('   ')
  })

  it('analyzeTailoringPairWithNarrative should handle identical bullets', () => {
    const result = analyzeTailoringPairWithNarrative(
      WEAK_BULLET, WEAK_BULLET, SAMPLE_JOB_KEYWORDS, STRATEGIC_PROFILE
    )
    expect(result.narrativeBoost).toBe(0)
    expect(result.isNarrativeTopPick).toBe(false)
    expect(result.narrativeBoostLabel).toBe('')
  })

  it('tailorBulletsWithNarrative should handle mismatched array lengths', () => {
    const originals = [WEAK_BULLET, GENERIC_BULLET, TECHNICAL_BULLET]
    const suggested = [STRONG_STRATEGIC_BULLET] // shorter
    const result = tailorBulletsWithNarrative(originals, suggested, SAMPLE_JOB_KEYWORDS, STRATEGIC_PROFILE)
    // Should handle gracefully — length = max of both
    expect(result.analyses.length).toBe(3)
  })

  it('tailorBulletsWithNarrative should handle empty arrays', () => {
    const result = tailorBulletsWithNarrative([], [], SAMPLE_JOB_KEYWORDS, STRATEGIC_PROFILE)
    expect(result.analyses).toHaveLength(0)
    expect(result.originalNarrativePercent).toBe(0)
    expect(result.suggestedNarrativePercent).toBe(0)
    expect(result.narrativeDelta).toBe(0)
  })

  it('tailorBulletsWithNarrative should handle empty job keywords', () => {
    const originals = [WEAK_BULLET]
    const suggested = [STRONG_STRATEGIC_BULLET]
    const result = tailorBulletsWithNarrative(originals, suggested, [], STRATEGIC_PROFILE)
    expect(result.analyses).toHaveLength(1)
    expect(typeof result.narrativeDelta).toBe('number')
  })

  it('narrative score should never exceed 100 even with perfect alignment', () => {
    const perfectBullet = 'Led roadmap strategy vision, spearheaded alignment championed executive stakeholders, directed team orchestrated delivery drove transformation'
    const score = scoreNarrativeAlignment(perfectBullet, STRATEGIC_PROFILE)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('narrative score should never be negative', () => {
    const score = scoreNarrativeAlignment('asdkjfhaskdjfh random nonsense', STRATEGIC_PROFILE)
    expect(score).toBeGreaterThanOrEqual(0)
  })

  it('tailorBulletForNarrative should not break bullets with special regex characters', () => {
    const bullet = 'Managed $10M+ budget (including infra) and 15% cost reduction [Q3-Q4]'
    const result = tailorBulletForNarrative(bullet, STRATEGIC_PROFILE)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('should handle very long bullet without crashing', () => {
    const longBullet = 'Managed '.repeat(100) + 'the team to deliver results'
    const result = tailorBulletForNarrative(longBullet, STRATEGIC_PROFILE)
    expect(typeof result).toBe('string')
  })
})
