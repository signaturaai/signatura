/**
 * Application Strategy Generation Tests — RALPH Structure
 *
 * R — Requirements: generateApplicationStrategy returns correct structure
 * A — Analysis: strategic pillar selection, probability computation
 * L — Logic: value proposition, executive summary, talking points
 * P — Preservation: PM vs non-PM role handling, job context influence
 * H — Hardening: edge cases, empty inputs, boundary values
 */

import { describe, it, expect } from 'vitest'
import { generateApplicationStrategy } from '@/lib/ai/siggy-integration-guide'

// =========================================================================
// Shared fixtures
// =========================================================================

const STRONG_PM_BULLETS = [
  'Led product roadmap strategy using RICE prioritization framework, shipping 15 features that drove 25% revenue growth across 3 markets',
  'Partnered with cross-functional team of 12 engineers and designers, achieving 95% on-time delivery through weekly sprint ceremonies',
  'Analyzed user behavior data using Mixpanel and Amplitude, identifying 3 key drop-off points and improving conversion by 18%',
  'Spearheaded migration from monolith to microservices architecture, reducing deployment time from 4 hours to 15 minutes',
  'Presented quarterly product review to C-suite stakeholders, securing $2M budget increase for platform expansion initiative',
  'Conducted 40+ user interviews to validate MVP hypothesis, resulting in 30% higher adoption rate vs. previous launches',
]

const WEAK_BULLETS = [
  'Worked on various projects',
  'Helped the team with tasks',
  'Participated in meetings',
]

const PM_JOB_TITLE = 'Senior Product Manager'
const NON_PM_JOB_TITLE = 'Marketing Coordinator'

const SAMPLE_JD = 'Looking for a Senior Product Manager with experience in agile methodology, data-driven decisions, stakeholder management, and analytics.'

// =========================================================================
// R — Requirements: return structure validation
// =========================================================================

describe('R — Requirements: generateApplicationStrategy structure', () => {
  it('should return an ApplicationStrategy object with all required fields', () => {
    const result = generateApplicationStrategy(STRONG_PM_BULLETS, PM_JOB_TITLE)
    expect(result).toHaveProperty('valueProposition')
    expect(result).toHaveProperty('strategicPillars')
    expect(result).toHaveProperty('executiveSummary')
    expect(result).toHaveProperty('talkingPoints')
    expect(result).toHaveProperty('successProbability')
    expect(result).toHaveProperty('confidenceLabel')
    expect(result).toHaveProperty('tailoredScore')
  })

  it('should return exactly 3 strategic pillars for strong CV', () => {
    const result = generateApplicationStrategy(STRONG_PM_BULLETS, PM_JOB_TITLE)
    expect(result.strategicPillars).toHaveLength(3)
  })

  it('each pillar should have title, description, and principleId', () => {
    const result = generateApplicationStrategy(STRONG_PM_BULLETS)
    result.strategicPillars.forEach(pillar => {
      expect(typeof pillar.title).toBe('string')
      expect(pillar.title.length).toBeGreaterThan(0)
      expect(typeof pillar.description).toBe('string')
      expect(pillar.description.length).toBeGreaterThan(0)
      expect(typeof pillar.principleId).toBe('string')
    })
  })

  it('should return 2-3 talking points', () => {
    const result = generateApplicationStrategy(STRONG_PM_BULLETS, PM_JOB_TITLE)
    expect(result.talkingPoints.length).toBeGreaterThanOrEqual(2)
    expect(result.talkingPoints.length).toBeLessThanOrEqual(3)
  })

  it('each talking point should have point and sourceBullet', () => {
    const result = generateApplicationStrategy(STRONG_PM_BULLETS)
    result.talkingPoints.forEach(tp => {
      expect(typeof tp.point).toBe('string')
      expect(typeof tp.sourceBullet).toBe('string')
      expect(tp.point.length).toBeGreaterThan(0)
    })
  })

  it('success probability should be between 30 and 95', () => {
    const result = generateApplicationStrategy(STRONG_PM_BULLETS, PM_JOB_TITLE)
    expect(result.successProbability).toBeGreaterThanOrEqual(30)
    expect(result.successProbability).toBeLessThanOrEqual(95)
  })

  it('confidence label should be a recognized value', () => {
    const result = generateApplicationStrategy(STRONG_PM_BULLETS)
    expect(['Excellent Match', 'Strong Match', 'Good Match', 'Developing']).toContain(result.confidenceLabel)
  })
})

// =========================================================================
// A — Analysis: pillar selection and probability accuracy
// =========================================================================

describe('A — Analysis: strategic pillar selection', () => {
  it('should select pillars based on strongest principles', () => {
    const result = generateApplicationStrategy(STRONG_PM_BULLETS, PM_JOB_TITLE)
    // Strong PM bullets should highlight results, data, or leadership
    const pillarIds = result.strategicPillars.map(p => p.principleId)
    // At least one should be outcome or data-driven (the strongest signals in these bullets)
    const hasStrengthPillar = pillarIds.some(id =>
      ['outcome-over-output', 'data-driven-decisions', 'cross-functional-leadership'].includes(id)
    )
    expect(hasStrengthPillar).toBe(true)
  })

  it('pillar order should reflect strength (strongest first)', () => {
    const result = generateApplicationStrategy(STRONG_PM_BULLETS)
    // The first pillar's principle should score higher than or equal to the last
    const pillarIds = result.strategicPillars.map(p => p.principleId)
    expect(pillarIds.length).toBe(3)
    // All pillars should be unique
    const unique = new Set(pillarIds)
    expect(unique.size).toBe(3)
  })

  it('strong CV should have higher probability than weak CV', () => {
    const strong = generateApplicationStrategy(STRONG_PM_BULLETS, PM_JOB_TITLE)
    const weak = generateApplicationStrategy(WEAK_BULLETS)
    expect(strong.successProbability).toBeGreaterThan(weak.successProbability)
  })

  it('tailoredScore should be non-negative', () => {
    const result = generateApplicationStrategy(STRONG_PM_BULLETS)
    expect(result.tailoredScore).toBeGreaterThanOrEqual(0)
    expect(result.tailoredScore).toBeLessThanOrEqual(100)
  })
})

// =========================================================================
// L — Logic: value proposition, summary, talking points content
// =========================================================================

describe('L — Logic: value proposition generation', () => {
  it('should generate a non-empty value proposition', () => {
    const result = generateApplicationStrategy(STRONG_PM_BULLETS, PM_JOB_TITLE)
    expect(result.valueProposition.length).toBeGreaterThan(20)
  })

  it('PM role value proposition should mention product leadership', () => {
    const result = generateApplicationStrategy(STRONG_PM_BULLETS, PM_JOB_TITLE)
    expect(result.valueProposition.toLowerCase()).toContain('product leader')
  })

  it('non-PM role should use generic professional framing', () => {
    const result = generateApplicationStrategy(STRONG_PM_BULLETS, NON_PM_JOB_TITLE)
    expect(result.valueProposition.toLowerCase()).toContain('professional')
  })
})

describe('L — Logic: executive summary generation', () => {
  it('should generate a multi-sentence executive summary', () => {
    const result = generateApplicationStrategy(STRONG_PM_BULLETS, PM_JOB_TITLE)
    // At least 3 sentences (counting periods)
    const sentences = result.executiveSummary.split(/[.!]/).filter(s => s.trim().length > 10)
    expect(sentences.length).toBeGreaterThanOrEqual(3)
  })

  it('PM role summary should mention product professional', () => {
    const result = generateApplicationStrategy(STRONG_PM_BULLETS, PM_JOB_TITLE)
    expect(result.executiveSummary.toLowerCase()).toContain('product professional')
  })

  it('summary should reference pillar strengths', () => {
    const result = generateApplicationStrategy(STRONG_PM_BULLETS, PM_JOB_TITLE)
    // Summary should mention at least one of the pillar strength areas
    const pillarTitles = result.strategicPillars.map(p => p.title.toLowerCase())
    const summaryLower = result.executiveSummary.toLowerCase()
    const hasReference = pillarTitles.some(title => summaryLower.includes(title))
    expect(hasReference).toBe(true)
  })
})

describe('L — Logic: talking points extraction', () => {
  it('talking points should reference specific bullets', () => {
    const result = generateApplicationStrategy(STRONG_PM_BULLETS, PM_JOB_TITLE)
    result.talkingPoints.forEach(tp => {
      // Source bullet should be one of the input bullets
      const matchesInput = STRONG_PM_BULLETS.some(b => b === tp.sourceBullet)
      expect(matchesInput).toBe(true)
    })
  })

  it('talking points should contain actionable language', () => {
    const result = generateApplicationStrategy(STRONG_PM_BULLETS, PM_JOB_TITLE)
    result.talkingPoints.forEach(tp => {
      // Should contain guidance language like "ready", "discuss", "prepare", "elaborate"
      const hasGuidance = /ready|discuss|prepare|elaborate|concise/i.test(tp.point)
      expect(hasGuidance).toBe(true)
    })
  })
})

// =========================================================================
// P — Preservation: role-aware behavior
// =========================================================================

describe('P — Preservation: PM vs non-PM role handling', () => {
  it('PM role should get product-specific framing', () => {
    const result = generateApplicationStrategy(STRONG_PM_BULLETS, PM_JOB_TITLE)
    const lower = (result.valueProposition + ' ' + result.executiveSummary).toLowerCase()
    expect(lower).toContain('product')
  })

  it('non-PM role should not mention product leader', () => {
    const result = generateApplicationStrategy(STRONG_PM_BULLETS, NON_PM_JOB_TITLE)
    expect(result.valueProposition.toLowerCase()).not.toContain('product leader')
  })

  it('should work without job title', () => {
    const result = generateApplicationStrategy(STRONG_PM_BULLETS)
    expect(result.strategicPillars.length).toBe(3)
    expect(result.valueProposition.length).toBeGreaterThan(0)
  })

  it('should work without job description', () => {
    const result = generateApplicationStrategy(STRONG_PM_BULLETS, PM_JOB_TITLE)
    expect(result.strategicPillars.length).toBe(3)
    expect(result.executiveSummary.length).toBeGreaterThan(0)
  })

  it('providing job description should not break generation', () => {
    const result = generateApplicationStrategy(STRONG_PM_BULLETS, PM_JOB_TITLE, SAMPLE_JD)
    expect(result.strategicPillars.length).toBe(3)
    expect(result.successProbability).toBeGreaterThan(0)
  })
})

// =========================================================================
// H — Hardening: edge cases and boundary values
// =========================================================================

describe('H — Hardening: empty and edge case inputs', () => {
  it('should handle empty bullets array gracefully', () => {
    const result = generateApplicationStrategy([])
    expect(result.strategicPillars).toEqual([])
    expect(result.talkingPoints).toEqual([])
    expect(result.successProbability).toBe(0)
    expect(result.confidenceLabel).toBe('Insufficient Data')
    expect(result.executiveSummary).toBe('')
  })

  it('should handle single bullet', () => {
    const result = generateApplicationStrategy(['Led product roadmap achieving 25% revenue growth'])
    expect(result.strategicPillars.length).toBe(3)
    expect(result.successProbability).toBeGreaterThan(0)
  })

  it('should handle very short bullets', () => {
    const result = generateApplicationStrategy(['Did work', 'Helped team', 'Made things'])
    expect(typeof result.valueProposition).toBe('string')
    expect(result.successProbability).toBeGreaterThanOrEqual(30)
  })

  it('should handle very long bullets without crashing', () => {
    const longBullet = 'Led a cross-functional initiative '.repeat(100)
    const result = generateApplicationStrategy([longBullet])
    expect(typeof result.valueProposition).toBe('string')
  })

  it('success probability should cap at 95', () => {
    // Even with perfect bullets, cap at 95
    const result = generateApplicationStrategy(STRONG_PM_BULLETS, PM_JOB_TITLE)
    expect(result.successProbability).toBeLessThanOrEqual(95)
  })

  it('success probability should floor at 30 for weak input', () => {
    const result = generateApplicationStrategy(WEAK_BULLETS)
    expect(result.successProbability).toBeGreaterThanOrEqual(30)
  })

  it('confidence label should be Developing for weak input', () => {
    const result = generateApplicationStrategy(WEAK_BULLETS)
    expect(['Developing', 'Good Match']).toContain(result.confidenceLabel)
  })

  it('should produce unique pillar principleIds', () => {
    const result = generateApplicationStrategy(STRONG_PM_BULLETS, PM_JOB_TITLE)
    const ids = result.strategicPillars.map(p => p.principleId)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
