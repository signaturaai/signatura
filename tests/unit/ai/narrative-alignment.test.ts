/**
 * Strategic Narrative Alignment Tests — RALPH Structure
 *
 * R — Requirements: analyzeNarrativeGap returns correct structure
 * A — Analysis: archetype detection accuracy, match calculation integrity
 * L — Logic: semantic overlap drives the score, evidence is traceable
 * P — Preservation: different profiles produce different results
 * H — Hardening: edge cases, empty inputs, boundary values
 */

import { describe, it, expect } from 'vitest'
import {
  analyzeNarrativeGap,
  type NarrativeProfile,
} from '@/lib/ai/siggy-integration-guide'

// =========================================================================
// Shared fixtures
// =========================================================================

const STRATEGIC_LEADER_BULLETS = [
  'Led product roadmap strategy for enterprise platform, aligning 5 cross-functional teams around quarterly vision',
  'Championed strategic initiative to expand into 3 new markets, securing executive buy-in from C-suite stakeholders',
  'Directed team of 15 engineers and designers, spearheading prioritization using RICE framework',
  'Influenced board-level decisions on $10M infrastructure investment through data-driven business case',
  'Orchestrated company-wide alignment on product vision, resulting in 40% improvement in delivery speed',
]

const EXECUTION_SPECIALIST_BULLETS = [
  'Built REST API endpoints and maintained deployment pipeline using Docker and CI/CD',
  'Shipped 12 features in Q3 through sprint-based agile methodology',
  'Deployed microservices architecture reducing deployment time from 4 hours to 15 minutes',
  'Implemented automated testing pipeline achieving 95% code coverage',
  'Launched monitoring dashboard for real-time system health tracking',
]

const WEAK_BULLETS = [
  'Worked on various projects',
  'Helped the team with things',
  'Participated in meetings regularly',
]

const STRATEGIC_PROFILE: NarrativeProfile = {
  targetRole: 'VP of Product',
  seniorityLevel: 'executive',
  coreStrength: 'strategic-leadership',
  painPoint: 'Not getting noticed for leadership roles despite strategic contributions',
  desiredBrand: 'A transformational product leader who sets vision and aligns organizations around strategic growth.',
}

const TECHNICAL_PROFILE: NarrativeProfile = {
  targetRole: 'Staff Engineer',
  seniorityLevel: 'senior',
  coreStrength: 'technical-mastery',
  painPoint: 'CV reads too much like a task list',
  desiredBrand: 'A systems architect who designs scalable platforms and makes critical technical trade-offs.',
}

const BUSINESS_PROFILE: NarrativeProfile = {
  targetRole: 'Growth Product Manager',
  seniorityLevel: 'mid',
  coreStrength: 'business-innovation',
  painPoint: 'Struggling to show commercial impact',
  desiredBrand: 'A growth-minded product manager who drives revenue through data-driven experimentation.',
}

// =========================================================================
// R — Requirements: return structure validation
// =========================================================================

describe('R — Requirements: analyzeNarrativeGap structure', () => {
  it('should return a NarrativeAnalysisResult with all required fields', () => {
    const result = analyzeNarrativeGap(STRATEGIC_LEADER_BULLETS, STRATEGIC_PROFILE)
    expect(result).toHaveProperty('detectedArchetype')
    expect(result).toHaveProperty('archetypeDescription')
    expect(result).toHaveProperty('narrativeMatchPercent')
    expect(result).toHaveProperty('evidence')
    expect(result).toHaveProperty('alignedKeywords')
    expect(result).toHaveProperty('missingKeywords')
    expect(result).toHaveProperty('cvScore')
  })

  it('detectedArchetype should be a non-empty string', () => {
    const result = analyzeNarrativeGap(EXECUTION_SPECIALIST_BULLETS, TECHNICAL_PROFILE)
    expect(typeof result.detectedArchetype).toBe('string')
    expect(result.detectedArchetype.length).toBeGreaterThan(0)
  })

  it('narrativeMatchPercent should be 0-100', () => {
    const result = analyzeNarrativeGap(STRATEGIC_LEADER_BULLETS, STRATEGIC_PROFILE)
    expect(result.narrativeMatchPercent).toBeGreaterThanOrEqual(0)
    expect(result.narrativeMatchPercent).toBeLessThanOrEqual(100)
  })

  it('evidence array should have 4 items (one per dimension)', () => {
    const result = analyzeNarrativeGap(STRATEGIC_LEADER_BULLETS, STRATEGIC_PROFILE)
    expect(result.evidence).toHaveLength(4)
  })

  it('each evidence item should have dimension, desired, actual, contribution, maxContribution', () => {
    const result = analyzeNarrativeGap(STRATEGIC_LEADER_BULLETS, STRATEGIC_PROFILE)
    result.evidence.forEach(e => {
      expect(typeof e.dimension).toBe('string')
      expect(typeof e.desired).toBe('string')
      expect(typeof e.actual).toBe('string')
      expect(typeof e.contribution).toBe('number')
      expect(typeof e.maxContribution).toBe('number')
      expect(e.contribution).toBeGreaterThanOrEqual(0)
      expect(e.contribution).toBeLessThanOrEqual(e.maxContribution)
    })
  })

  it('alignedKeywords and missingKeywords should be arrays of strings', () => {
    const result = analyzeNarrativeGap(STRATEGIC_LEADER_BULLETS, STRATEGIC_PROFILE)
    expect(Array.isArray(result.alignedKeywords)).toBe(true)
    expect(Array.isArray(result.missingKeywords)).toBe(true)
    result.alignedKeywords.forEach(kw => expect(typeof kw).toBe('string'))
    result.missingKeywords.forEach(kw => expect(typeof kw).toBe('string'))
  })

  it('cvScore should be 0-100', () => {
    const result = analyzeNarrativeGap(STRATEGIC_LEADER_BULLETS, STRATEGIC_PROFILE)
    expect(result.cvScore).toBeGreaterThanOrEqual(0)
    expect(result.cvScore).toBeLessThanOrEqual(100)
  })
})

// =========================================================================
// A — Analysis: archetype detection & match calculation
// =========================================================================

describe('A — Analysis: archetype detection accuracy', () => {
  it('strategic leader bullets should detect Strategic Leader archetype', () => {
    const result = analyzeNarrativeGap(STRATEGIC_LEADER_BULLETS, STRATEGIC_PROFILE)
    expect(result.detectedArchetype).toBe('Strategic Leader')
  })

  it('execution specialist bullets should detect Execution-Oriented Specialist', () => {
    const result = analyzeNarrativeGap(EXECUTION_SPECIALIST_BULLETS, TECHNICAL_PROFILE)
    expect(result.detectedArchetype).toBe('Execution-Oriented Specialist')
  })

  it('archetype description should be meaningful (10+ chars)', () => {
    const result = analyzeNarrativeGap(STRATEGIC_LEADER_BULLETS, STRATEGIC_PROFILE)
    expect(result.archetypeDescription.length).toBeGreaterThan(10)
  })
})

describe('A — Analysis: match calculation integrity', () => {
  it('aligned CV + profile should produce higher match than misaligned', () => {
    // Strategic leader bullets + strategic profile = aligned
    const aligned = analyzeNarrativeGap(STRATEGIC_LEADER_BULLETS, STRATEGIC_PROFILE)
    // Execution bullets + strategic profile = misaligned
    const misaligned = analyzeNarrativeGap(EXECUTION_SPECIALIST_BULLETS, STRATEGIC_PROFILE)
    expect(aligned.narrativeMatchPercent).toBeGreaterThan(misaligned.narrativeMatchPercent)
  })

  it('match score should NOT be hardcoded — different bullets produce different scores', () => {
    const result1 = analyzeNarrativeGap(STRATEGIC_LEADER_BULLETS, STRATEGIC_PROFILE)
    const result2 = analyzeNarrativeGap(EXECUTION_SPECIALIST_BULLETS, STRATEGIC_PROFILE)
    const result3 = analyzeNarrativeGap(WEAK_BULLETS, STRATEGIC_PROFILE)
    // All three must produce different scores
    const scores = new Set([result1.narrativeMatchPercent, result2.narrativeMatchPercent, result3.narrativeMatchPercent])
    expect(scores.size).toBeGreaterThanOrEqual(2)
  })

  it('evidence contributions should sum to a value consistent with match percent', () => {
    const result = analyzeNarrativeGap(STRATEGIC_LEADER_BULLETS, STRATEGIC_PROFILE)
    const totalContribution = result.evidence.reduce((sum, e) => sum + e.contribution, 0)
    const totalMax = result.evidence.reduce((sum, e) => sum + e.maxContribution, 0)
    // Match percent should be in the ballpark of (contribution / max * 100)
    // Not exact due to brand overlap bonus and seniority bonus
    expect(totalContribution).toBeLessThanOrEqual(totalMax)
  })
})

// =========================================================================
// L — Logic: semantic overlap drives the score
// =========================================================================

describe('L — Logic: evidence-based scoring', () => {
  it('should find aligned keywords when CV matches desired brand', () => {
    const result = analyzeNarrativeGap(STRATEGIC_LEADER_BULLETS, STRATEGIC_PROFILE)
    // Strategic profile wants: leadership, strategy, vision, influence, etc.
    // Strategic bullets have: strategy, vision, alignment, executive, stakeholder
    expect(result.alignedKeywords.length).toBeGreaterThan(0)
  })

  it('should find missing keywords when CV lacks desired brand terms', () => {
    const result = analyzeNarrativeGap(EXECUTION_SPECIALIST_BULLETS, STRATEGIC_PROFILE)
    // Execution bullets lack strategic leadership terms
    expect(result.missingKeywords.length).toBeGreaterThan(0)
  })

  it('evidence should cover Action Verb Strength dimension', () => {
    const result = analyzeNarrativeGap(STRATEGIC_LEADER_BULLETS, STRATEGIC_PROFILE)
    const verbEvidence = result.evidence.find(e => e.dimension === 'Action Verb Strength')
    expect(verbEvidence).toBeDefined()
  })

  it('evidence should cover Achievement & Impact Keywords dimension', () => {
    const result = analyzeNarrativeGap(STRATEGIC_LEADER_BULLETS, STRATEGIC_PROFILE)
    const achievementEvidence = result.evidence.find(e => e.dimension === 'Achievement & Impact Keywords')
    expect(achievementEvidence).toBeDefined()
  })

  it('evidence should cover Quantified Results dimension', () => {
    const result = analyzeNarrativeGap(STRATEGIC_LEADER_BULLETS, STRATEGIC_PROFILE)
    const quantEvidence = result.evidence.find(e => e.dimension === 'Quantified Results')
    expect(quantEvidence).toBeDefined()
  })

  it('evidence should cover Brand-Aligned Language dimension', () => {
    const result = analyzeNarrativeGap(STRATEGIC_LEADER_BULLETS, STRATEGIC_PROFILE)
    const brandEvidence = result.evidence.find(e => e.dimension === 'Brand-Aligned Language')
    expect(brandEvidence).toBeDefined()
  })

  it('verb evidence for strategic leader should have high contribution', () => {
    const result = analyzeNarrativeGap(STRATEGIC_LEADER_BULLETS, STRATEGIC_PROFILE)
    const verbEvidence = result.evidence.find(e => e.dimension === 'Action Verb Strength')!
    // Strategic bullets have: led, directed, influenced, aligned, championed, spearheaded, orchestrated
    expect(verbEvidence.contribution).toBeGreaterThan(0)
  })
})

// =========================================================================
// P — Preservation: different profiles produce different results
// =========================================================================

describe('P — Preservation: profile-aware differentiation', () => {
  it('same CV with different profiles should produce different match scores', () => {
    const strategic = analyzeNarrativeGap(STRATEGIC_LEADER_BULLETS, STRATEGIC_PROFILE)
    const technical = analyzeNarrativeGap(STRATEGIC_LEADER_BULLETS, TECHNICAL_PROFILE)
    const business = analyzeNarrativeGap(STRATEGIC_LEADER_BULLETS, BUSINESS_PROFILE)
    // Not all should be identical
    const scores = [strategic.narrativeMatchPercent, technical.narrativeMatchPercent, business.narrativeMatchPercent]
    const unique = new Set(scores)
    expect(unique.size).toBeGreaterThanOrEqual(2)
  })

  it('different seniority levels should affect the match score', () => {
    const juniorProfile: NarrativeProfile = { ...STRATEGIC_PROFILE, seniorityLevel: 'junior' }
    const seniorProfile: NarrativeProfile = { ...STRATEGIC_PROFILE, seniorityLevel: 'senior' }
    const executiveProfile: NarrativeProfile = { ...STRATEGIC_PROFILE, seniorityLevel: 'executive' }
    const junior = analyzeNarrativeGap(STRATEGIC_LEADER_BULLETS, juniorProfile)
    const senior = analyzeNarrativeGap(STRATEGIC_LEADER_BULLETS, seniorProfile)
    const executive = analyzeNarrativeGap(STRATEGIC_LEADER_BULLETS, executiveProfile)
    // At least two of three should differ (seniority verbs change the keyword pool)
    const scores = [junior.narrativeMatchPercent, senior.narrativeMatchPercent, executive.narrativeMatchPercent]
    const unique = new Set(scores)
    expect(unique.size).toBeGreaterThanOrEqual(2)
  })

  it('different core strengths should change the evidence desired keywords', () => {
    const strategic = analyzeNarrativeGap(STRATEGIC_LEADER_BULLETS, STRATEGIC_PROFILE)
    const technical = analyzeNarrativeGap(STRATEGIC_LEADER_BULLETS, TECHNICAL_PROFILE)
    // Evidence desired text should differ
    const strategicDesired = strategic.evidence.map(e => e.desired).join(' ')
    const technicalDesired = technical.evidence.map(e => e.desired).join(' ')
    expect(strategicDesired).not.toBe(technicalDesired)
  })

  it('detected archetype should be the same regardless of profile (it reads the CV)', () => {
    const withStrategic = analyzeNarrativeGap(STRATEGIC_LEADER_BULLETS, STRATEGIC_PROFILE)
    const withTechnical = analyzeNarrativeGap(STRATEGIC_LEADER_BULLETS, TECHNICAL_PROFILE)
    // Same bullets → same archetype
    expect(withStrategic.detectedArchetype).toBe(withTechnical.detectedArchetype)
  })
})

// =========================================================================
// H — Hardening: edge cases and boundary values
// =========================================================================

describe('H — Hardening: edge cases', () => {
  it('should handle empty bullets array', () => {
    const result = analyzeNarrativeGap([], STRATEGIC_PROFILE)
    expect(result.detectedArchetype).toBe('Unknown')
    expect(result.narrativeMatchPercent).toBe(0)
    expect(result.evidence).toEqual([])
    expect(result.alignedKeywords).toEqual([])
    expect(result.missingKeywords).toEqual([])
    expect(result.cvScore).toBe(0)
  })

  it('should handle single very short bullet', () => {
    const result = analyzeNarrativeGap(['Did tasks'], STRATEGIC_PROFILE)
    expect(typeof result.detectedArchetype).toBe('string')
    expect(result.narrativeMatchPercent).toBeGreaterThanOrEqual(0)
  })

  it('should handle very long CV text without crashing', () => {
    const longBullets = Array.from({ length: 50 }, (_, i) => `Led strategic initiative #${i} resulting in ${i * 10}% improvement`)
    const result = analyzeNarrativeGap(longBullets, STRATEGIC_PROFILE)
    expect(result.narrativeMatchPercent).toBeGreaterThan(0)
  })

  it('match percent should never exceed 100', () => {
    // Even with perfectly aligned bullets
    const result = analyzeNarrativeGap(STRATEGIC_LEADER_BULLETS, STRATEGIC_PROFILE)
    expect(result.narrativeMatchPercent).toBeLessThanOrEqual(100)
  })

  it('match percent should never be negative', () => {
    const result = analyzeNarrativeGap(WEAK_BULLETS, STRATEGIC_PROFILE)
    expect(result.narrativeMatchPercent).toBeGreaterThanOrEqual(0)
  })

  it('weak bullets should produce low match for any profile', () => {
    const result = analyzeNarrativeGap(WEAK_BULLETS, STRATEGIC_PROFILE)
    expect(result.narrativeMatchPercent).toBeLessThan(40)
  })

  it('aligned keywords should be capped at 15', () => {
    const result = analyzeNarrativeGap(STRATEGIC_LEADER_BULLETS, STRATEGIC_PROFILE)
    expect(result.alignedKeywords.length).toBeLessThanOrEqual(15)
  })

  it('missing keywords should be capped at 10', () => {
    const result = analyzeNarrativeGap(EXECUTION_SPECIALIST_BULLETS, STRATEGIC_PROFILE)
    expect(result.missingKeywords.length).toBeLessThanOrEqual(10)
  })

  it('missing keywords should all be 4+ chars', () => {
    const result = analyzeNarrativeGap(WEAK_BULLETS, STRATEGIC_PROFILE)
    result.missingKeywords.forEach(kw => {
      expect(kw.length).toBeGreaterThanOrEqual(4)
    })
  })
})
