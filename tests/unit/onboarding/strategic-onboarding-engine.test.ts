/**
 * Strategic Onboarding Engine Tests — RALPH Structure
 *
 * R — Requirements: verifyNarrativeAlignment returns correct structure,
 *                   inferCoreStrength maps brands correctly
 * A — Analysis: archetype detection, alignment scoring, dimension mapping,
 *               gap/strength identification, recommendation generation
 * L — Logic: current vs target message building, dimension status thresholds,
 *            score-based recommendation tiers, strength inference
 * P — Preservation: different inputs produce different outputs
 * H — Hardening: edge cases, empty inputs, boundary values
 */

import { describe, it, expect } from 'vitest'
import {
  verifyNarrativeAlignment,
  type NarrativeVerificationResult,
} from '@/lib/ai/siggy-integration-guide'

// =========================================================================
// Shared fixtures
// =========================================================================

const STRONG_CV_BULLETS = [
  'Led cross-functional team of 15 to deliver platform redesign driving 40% engagement increase',
  'Spearheaded data-driven product strategy resulting in $2.5M ARR growth',
  'Architected and launched new analytics framework used by 200+ stakeholders',
  'Mentored 5 junior PMs and established product management best practices',
  'Drove quarterly OKR alignment across 4 engineering teams',
]

const WEAK_CV_BULLETS = [
  'Helped with team tasks and participated in meetings',
  'Assisted in writing documentation for the project',
  'Supported manager with daily activities',
  'Contributed to team discussions about product direction',
]

const MEDIUM_CV_BULLETS = [
  'Managed product roadmap for B2B SaaS platform with $5M ARR',
  'Coordinated with engineering and design to deliver features on time',
  'Improved customer retention by 15% through feature prioritization',
  'Developed analytics dashboard tracking key business metrics',
]

const STRATEGIC_AMBITION = {
  targetRole: 'VP of Product',
  experienceLevel: 'executive',
  desiredBrand: 'A transformational product leader who sets vision and scales organizations',
}

const MID_LEVEL_AMBITION = {
  targetRole: 'Product Manager',
  experienceLevel: 'mid_level',
  desiredBrand: 'A data-driven product builder who ships quality features',
}

const TECHNICAL_AMBITION = {
  targetRole: 'Staff Engineer',
  experienceLevel: 'senior',
  desiredBrand: 'A technical architect who builds scalable systems',
}

// =========================================================================
// R — Requirements: Structure validation
// =========================================================================

describe('Strategic Onboarding Engine — Requirements', () => {
  it('should return complete NarrativeVerificationResult structure', () => {
    const result = verifyNarrativeAlignment(STRONG_CV_BULLETS, STRATEGIC_AMBITION)
    expect(result).toHaveProperty('currentArchetype')
    expect(result).toHaveProperty('targetArchetype')
    expect(result).toHaveProperty('currentMessage')
    expect(result).toHaveProperty('targetMessage')
    expect(result).toHaveProperty('alignmentScore')
    expect(result).toHaveProperty('dimensions')
    expect(result).toHaveProperty('gaps')
    expect(result).toHaveProperty('strengths')
    expect(result).toHaveProperty('recommendation')
  })

  it('should return alignmentScore as a number 0-100', () => {
    const result = verifyNarrativeAlignment(STRONG_CV_BULLETS, STRATEGIC_AMBITION)
    expect(typeof result.alignmentScore).toBe('number')
    expect(result.alignmentScore).toBeGreaterThanOrEqual(0)
    expect(result.alignmentScore).toBeLessThanOrEqual(100)
  })

  it('should return dimensions as an array of objects', () => {
    const result = verifyNarrativeAlignment(STRONG_CV_BULLETS, STRATEGIC_AMBITION)
    expect(Array.isArray(result.dimensions)).toBe(true)
    for (const dim of result.dimensions) {
      expect(dim).toHaveProperty('name')
      expect(dim).toHaveProperty('currentScore')
      expect(dim).toHaveProperty('targetScore')
      expect(dim).toHaveProperty('status')
      expect(['aligned', 'partial', 'gap']).toContain(dim.status)
    }
  })

  it('should return gaps and strengths as string arrays', () => {
    const result = verifyNarrativeAlignment(STRONG_CV_BULLETS, STRATEGIC_AMBITION)
    expect(Array.isArray(result.gaps)).toBe(true)
    expect(Array.isArray(result.strengths)).toBe(true)
    for (const g of result.gaps) expect(typeof g).toBe('string')
    for (const s of result.strengths) expect(typeof s).toBe('string')
  })

  it('should return non-empty currentMessage and targetMessage', () => {
    const result = verifyNarrativeAlignment(MEDIUM_CV_BULLETS, MID_LEVEL_AMBITION)
    expect(result.currentMessage.length).toBeGreaterThan(0)
    expect(result.targetMessage.length).toBeGreaterThan(0)
  })

  it('should return non-empty recommendation', () => {
    const result = verifyNarrativeAlignment(MEDIUM_CV_BULLETS, MID_LEVEL_AMBITION)
    expect(result.recommendation.length).toBeGreaterThan(0)
  })
})

// =========================================================================
// A — Analysis: Detection accuracy
// =========================================================================

describe('Strategic Onboarding Engine — Analysis', () => {
  it('should detect higher alignment for strong CVs targeting matching roles', () => {
    const strong = verifyNarrativeAlignment(STRONG_CV_BULLETS, STRATEGIC_AMBITION)
    const weak = verifyNarrativeAlignment(WEAK_CV_BULLETS, STRATEGIC_AMBITION)
    expect(strong.alignmentScore).toBeGreaterThan(weak.alignmentScore)
  })

  it('should detect gaps when CV is weak and ambition is high', () => {
    const result = verifyNarrativeAlignment(WEAK_CV_BULLETS, STRATEGIC_AMBITION)
    expect(result.gaps.length).toBeGreaterThan(0)
  })

  it('should detect strengths when CV keywords match the brand', () => {
    const result = verifyNarrativeAlignment(STRONG_CV_BULLETS, STRATEGIC_AMBITION)
    expect(result.strengths.length).toBeGreaterThan(0)
  })

  it('should include dimension scores between 0 and 100', () => {
    const result = verifyNarrativeAlignment(MEDIUM_CV_BULLETS, MID_LEVEL_AMBITION)
    for (const dim of result.dimensions) {
      expect(dim.currentScore).toBeGreaterThanOrEqual(0)
      expect(dim.currentScore).toBeLessThanOrEqual(100)
      expect(dim.targetScore).toBeGreaterThanOrEqual(0)
      expect(dim.targetScore).toBeLessThanOrEqual(100)
    }
  })

  it('should include target role in targetMessage', () => {
    const result = verifyNarrativeAlignment(MEDIUM_CV_BULLETS, STRATEGIC_AMBITION)
    expect(result.targetMessage).toContain('VP of Product')
  })

  it('should include detected archetype in currentMessage', () => {
    const result = verifyNarrativeAlignment(STRONG_CV_BULLETS, STRATEGIC_AMBITION)
    expect(result.currentMessage).toContain(result.currentArchetype)
  })
})

// =========================================================================
// L — Logic: Core strength inference and recommendation tiers
// =========================================================================

describe('Strategic Onboarding Engine — Logic', () => {
  describe('Core strength inference from brand', () => {
    it('should infer strategic-leadership for strategy/leader brands', () => {
      const result = verifyNarrativeAlignment(STRONG_CV_BULLETS, {
        targetRole: 'VP Product',
        experienceLevel: 'executive',
        desiredBrand: 'A strategic leader who transforms organizations',
      })
      expect(result.targetArchetype).toBe('Strategic Leader')
    })

    it('should infer technical-mastery for technical/architect brands', () => {
      const result = verifyNarrativeAlignment(STRONG_CV_BULLETS, TECHNICAL_AMBITION)
      expect(result.targetArchetype).toBe('Technical Architect')
    })

    it('should infer operational-excellence for operations/efficiency brands', () => {
      const result = verifyNarrativeAlignment(MEDIUM_CV_BULLETS, {
        targetRole: 'Operations Manager',
        experienceLevel: 'senior',
        desiredBrand: 'An operational excellence expert who delivers efficient processes',
      })
      expect(result.targetArchetype).toBe('Execution-Oriented Specialist')
    })

    it('should infer business-innovation for innovation/growth brands', () => {
      const result = verifyNarrativeAlignment(MEDIUM_CV_BULLETS, {
        targetRole: 'Growth Lead',
        experienceLevel: 'senior',
        desiredBrand: 'A business innovator who drives market disruption and growth',
      })
      expect(result.targetArchetype).toBe('Growth & Business Driver')
    })
  })

  describe('Recommendation tiers', () => {
    it('should give positive recommendation for high alignment', () => {
      // Use bullets that closely match the ambition
      const matchedBullets = [
        'Led product strategy, drove cross-functional alignment, scaled teams',
        'Spearheaded vision for new product line generating $10M revenue',
        'Architected roadmap transformation, mentored 10 PMs, established culture',
        'Drove strategic partnership resulting in 50% market expansion',
        'Delivered measurable outcomes: 3x team growth, 200% revenue increase',
      ]
      const result = verifyNarrativeAlignment(matchedBullets, STRATEGIC_AMBITION)
      // High alignment should mention "excellent" or "fine-tuning"
      if (result.alignmentScore >= 80) {
        expect(result.recommendation.toLowerCase()).toMatch(/excellent|fine-tun/)
      }
    })

    it('should give transformation recommendation for low alignment', () => {
      const result = verifyNarrativeAlignment(WEAK_CV_BULLETS, STRATEGIC_AMBITION)
      expect(result.recommendation.toLowerCase()).toMatch(/transform|opportunity|reshape|doesn't align/)
    })

    it('should mention target role in recommendation', () => {
      const result = verifyNarrativeAlignment(MEDIUM_CV_BULLETS, STRATEGIC_AMBITION)
      expect(result.recommendation).toContain('VP of Product')
    })
  })

  describe('Dimension status thresholds', () => {
    it('should mark dimensions with score >= 70 as aligned', () => {
      const result = verifyNarrativeAlignment(STRONG_CV_BULLETS, STRATEGIC_AMBITION)
      const highDims = result.dimensions.filter(d => d.currentScore >= 70)
      for (const dim of highDims) {
        expect(dim.status).toBe('aligned')
      }
    })

    it('should mark dimensions with score < 40 as gap', () => {
      const result = verifyNarrativeAlignment(WEAK_CV_BULLETS, STRATEGIC_AMBITION)
      const lowDims = result.dimensions.filter(d => d.currentScore < 40)
      for (const dim of lowDims) {
        expect(dim.status).toBe('gap')
      }
    })

    it('should mark dimensions with score 40-69 as partial', () => {
      const result = verifyNarrativeAlignment(MEDIUM_CV_BULLETS, MID_LEVEL_AMBITION)
      const partialDims = result.dimensions.filter(d => d.currentScore >= 40 && d.currentScore < 70)
      for (const dim of partialDims) {
        expect(dim.status).toBe('partial')
      }
    })
  })

  describe('Experience level mapping', () => {
    it('should handle entry_level experience level', () => {
      const result = verifyNarrativeAlignment(WEAK_CV_BULLETS, {
        targetRole: 'Junior Developer',
        experienceLevel: 'entry_level',
        desiredBrand: 'An eager learner who builds clean code',
      })
      expect(result.targetMessage).toContain('entry-level')
    })

    it('should handle career_change experience level', () => {
      const result = verifyNarrativeAlignment(MEDIUM_CV_BULLETS, {
        targetRole: 'Product Designer',
        experienceLevel: 'career_change',
        desiredBrand: 'A creative problem solver transitioning into design',
      })
      expect(result).toBeDefined()
      expect(result.targetMessage).toContain('mid-level') // career_change maps to mid-level
    })

    it('should handle executive experience level', () => {
      const result = verifyNarrativeAlignment(STRONG_CV_BULLETS, STRATEGIC_AMBITION)
      expect(result.targetMessage).toContain('executive')
    })
  })
})

// =========================================================================
// P — Preservation: Differentiation
// =========================================================================

describe('Strategic Onboarding Engine — Preservation', () => {
  it('should produce different results for different CV quality', () => {
    const strong = verifyNarrativeAlignment(STRONG_CV_BULLETS, STRATEGIC_AMBITION)
    const weak = verifyNarrativeAlignment(WEAK_CV_BULLETS, STRATEGIC_AMBITION)
    expect(strong.alignmentScore).not.toBe(weak.alignmentScore)
    expect(strong.currentArchetype).not.toBe(weak.currentArchetype)
  })

  it('should produce different target archetypes for different brands', () => {
    const strategic = verifyNarrativeAlignment(STRONG_CV_BULLETS, STRATEGIC_AMBITION)
    const technical = verifyNarrativeAlignment(STRONG_CV_BULLETS, TECHNICAL_AMBITION)
    expect(strategic.targetArchetype).not.toBe(technical.targetArchetype)
  })

  it('should produce different recommendations for different alignment levels', () => {
    const strong = verifyNarrativeAlignment(STRONG_CV_BULLETS, STRATEGIC_AMBITION)
    const weak = verifyNarrativeAlignment(WEAK_CV_BULLETS, STRATEGIC_AMBITION)
    expect(strong.recommendation).not.toBe(weak.recommendation)
  })

  it('should produce different current messages for different CVs', () => {
    const a = verifyNarrativeAlignment(STRONG_CV_BULLETS, STRATEGIC_AMBITION)
    const b = verifyNarrativeAlignment(WEAK_CV_BULLETS, STRATEGIC_AMBITION)
    expect(a.currentMessage).not.toBe(b.currentMessage)
  })
})

// =========================================================================
// H — Hardening: Edge cases
// =========================================================================

describe('Strategic Onboarding Engine — Hardening', () => {
  it('should handle empty CV bullets', () => {
    const result = verifyNarrativeAlignment([], STRATEGIC_AMBITION)
    expect(result.alignmentScore).toBe(0)
    expect(result.currentMessage).toContain('No CV content')
  })

  it('should handle empty target role', () => {
    const result = verifyNarrativeAlignment(MEDIUM_CV_BULLETS, {
      targetRole: '',
      experienceLevel: 'mid_level',
      desiredBrand: 'A great professional',
    })
    expect(result).toBeDefined()
    expect(result.alignmentScore).toBeGreaterThanOrEqual(0)
  })

  it('should handle empty desired brand', () => {
    const result = verifyNarrativeAlignment(MEDIUM_CV_BULLETS, {
      targetRole: 'Product Manager',
      experienceLevel: 'mid_level',
      desiredBrand: '',
    })
    expect(result).toBeDefined()
    expect(result.targetArchetype).toBeDefined()
  })

  it('should handle unknown experience level', () => {
    const result = verifyNarrativeAlignment(MEDIUM_CV_BULLETS, {
      targetRole: 'PM',
      experienceLevel: 'unknown_level',
      desiredBrand: 'A leader',
    })
    expect(result).toBeDefined()
    // Falls back to mid-level
    expect(result.targetMessage).toContain('mid-level')
  })

  it('should handle single bullet CV', () => {
    const result = verifyNarrativeAlignment(
      ['Led a product team'],
      MID_LEVEL_AMBITION
    )
    expect(result).toBeDefined()
    expect(result.alignmentScore).toBeGreaterThanOrEqual(0)
  })

  it('should handle very long CV bullets', () => {
    const longBullets = Array(50).fill(
      'Managed cross-functional team to deliver strategic product initiatives driving measurable business outcomes and revenue growth through data-driven decision making'
    )
    const result = verifyNarrativeAlignment(longBullets, STRATEGIC_AMBITION)
    expect(result.alignmentScore).toBeGreaterThanOrEqual(0)
    expect(result.alignmentScore).toBeLessThanOrEqual(100)
  })

  it('should cap gaps at 5 items', () => {
    const result = verifyNarrativeAlignment(WEAK_CV_BULLETS, STRATEGIC_AMBITION)
    expect(result.gaps.length).toBeLessThanOrEqual(5)
  })

  it('should cap strengths at 5 items', () => {
    const result = verifyNarrativeAlignment(STRONG_CV_BULLETS, STRATEGIC_AMBITION)
    expect(result.strengths.length).toBeLessThanOrEqual(5)
  })
})
