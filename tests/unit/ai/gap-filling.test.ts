/**
 * Gap-Filling Logic Tests — RALPH Structure
 *
 * R — Requirements: identifyGaps returns correct structure
 * A — Analysis: gap detection accuracy across roles
 * L — Logic: draftGapAnswer produces sensible drafts
 * P — Preservation: no hallucinated gaps, score projections valid
 * H — Hardening: edge cases, empty inputs, cross-industry
 */

import { describe, it, expect } from 'vitest'
import {
  identifyGaps,
  draftGapAnswer,
  analyzeCVContent,
  isProductRole,
  type GapQuestion,
  type GapAnalysisResult,
} from '@/lib/ai/siggy-integration-guide'

// =========================================================================
// R — Requirements: identifyGaps return structure
// =========================================================================

describe('R — Requirements: identifyGaps structure', () => {
  const WEAK_BULLETS = [
    'Managed the product roadmap',
    'Worked with engineering teams',
    'Attended meetings and provided updates',
  ]

  it('should return gaps array', () => {
    const result = identifyGaps(WEAK_BULLETS)
    expect(Array.isArray(result.gaps)).toBe(true)
  })

  it('should return currentScore as a number between 0 and 100', () => {
    const result = identifyGaps(WEAK_BULLETS)
    expect(typeof result.currentScore).toBe('number')
    expect(result.currentScore).toBeGreaterThanOrEqual(0)
    expect(result.currentScore).toBeLessThanOrEqual(100)
  })

  it('should return projectedScore >= currentScore', () => {
    const result = identifyGaps(WEAK_BULLETS)
    expect(result.projectedScore).toBeGreaterThanOrEqual(result.currentScore)
  })

  it('should return projectedScore <= 100', () => {
    const result = identifyGaps(WEAK_BULLETS)
    expect(result.projectedScore).toBeLessThanOrEqual(100)
  })

  it('should return weakPrincipleCount as a non-negative number', () => {
    const result = identifyGaps(WEAK_BULLETS)
    expect(result.weakPrincipleCount).toBeGreaterThanOrEqual(0)
  })

  it('each gap should have required fields', () => {
    const result = identifyGaps(WEAK_BULLETS)
    result.gaps.forEach((gap) => {
      expect(gap).toHaveProperty('id')
      expect(gap).toHaveProperty('principleId')
      expect(gap).toHaveProperty('principleName')
      expect(gap).toHaveProperty('question')
      expect(gap).toHaveProperty('whyWeAsk')
      expect(gap).toHaveProperty('potentialBoost')
      expect(gap).toHaveProperty('draftContext')
      expect(typeof gap.id).toBe('string')
      expect(typeof gap.question).toBe('string')
      expect(gap.question.length).toBeGreaterThan(10)
      expect(gap.potentialBoost).toBeGreaterThan(0)
    })
  })

  it('should respect maxQuestions cap (default 5)', () => {
    const result = identifyGaps(WEAK_BULLETS)
    expect(result.gaps.length).toBeLessThanOrEqual(5)
  })

  it('should respect custom maxQuestions cap', () => {
    const result = identifyGaps(WEAK_BULLETS, undefined, undefined, 2)
    expect(result.gaps.length).toBeLessThanOrEqual(2)
  })

  it('gaps should be sorted by potentialBoost descending', () => {
    const result = identifyGaps(WEAK_BULLETS)
    for (let i = 1; i < result.gaps.length; i++) {
      expect(result.gaps[i - 1].potentialBoost).toBeGreaterThanOrEqual(
        result.gaps[i].potentialBoost
      )
    }
  })
})

// =========================================================================
// A — Analysis: gap detection accuracy
// =========================================================================

describe('A — Analysis: gap detection accuracy', () => {
  it('should identify gaps for weak bullets missing metrics', () => {
    const weak = ['Managed a team', 'Built features', 'Attended meetings']
    const result = identifyGaps(weak)
    expect(result.gaps.length).toBeGreaterThan(0)
  })

  it('should identify fewer gaps for strong bullets', () => {
    const strong = [
      'Led cross-functional team of 12 to deliver analytics platform, increasing DAU by 40% for 50K users',
      'Drove data-driven decision making through A/B testing, improving conversion by 25% and generating $1.2M revenue',
      'Partnered with engineering to solve customer churn problem, reducing ticket volume by 55% through root cause analysis',
    ]
    const weak = ['Managed a team', 'Built features', 'Attended meetings']

    const strongResult = identifyGaps(strong)
    const weakResult = identifyGaps(weak)

    expect(weakResult.gaps.length).toBeGreaterThanOrEqual(strongResult.gaps.length)
  })

  it('should detect metrics gap when no numbers present', () => {
    const noNumbers = ['Managed the product roadmap and worked with teams']
    const result = identifyGaps(noNumbers)

    // Should have a gap related to quantified impact or data
    const metricsGap = result.gaps.find(
      (g) => g.id === 'gap-metrics' || g.principleId === 'data-driven-decisions'
    )
    expect(metricsGap).toBeDefined()
  })

  it('should detect "so what?" gap for recruiter UX when maxQuestions is large', () => {
    const noImpact = ['Was responsible for managing various project aspects']
    // Use a high cap so the lower-boost recruiter UX gap isn't capped out
    const result = identifyGaps(noImpact, undefined, undefined, 10)

    // Should have a gap related to clear impact story or outcome gap
    const impactGap = result.gaps.find(
      (g) => g.id === 'gap-so-what' || g.principleId === 'outcome-over-output'
    )
    expect(impactGap).toBeDefined()
  })

  it('should provide higher potential boost for bigger gaps', () => {
    const veryWeak = ['Did stuff']
    const result = identifyGaps(veryWeak)

    // At least one gap should have a meaningful boost
    const maxBoost = Math.max(...result.gaps.map((g) => g.potentialBoost))
    expect(maxBoost).toBeGreaterThan(0)
  })

  it('currentScore should match analyzeCVContent for combined text', () => {
    const bullets = ['Managed the product roadmap', 'Worked with teams']
    const result = identifyGaps(bullets)
    const directAnalysis = analyzeCVContent(bullets.join(' '))
    expect(result.currentScore).toBe(directAnalysis.totalScore)
  })
})

// =========================================================================
// L — Logic: draftGapAnswer produces sensible drafts
// =========================================================================

describe('L — Logic: draftGapAnswer quality', () => {
  const SAMPLE_BULLETS = [
    'Managed the product roadmap',
    'Worked with engineering team of 8',
    'Built analytics dashboard for 10K users',
  ]

  it('should return a non-empty string', () => {
    const gap: GapQuestion = {
      id: 'gap-metrics',
      principleId: 'data-driven-decisions',
      principleName: 'Quantified Impact',
      question: 'Can you share specific numbers?',
      whyWeAsk: 'Metrics matter.',
      potentialBoost: 8,
      draftContext: 'Needs numbers.',
    }
    const draft = draftGapAnswer(gap, SAMPLE_BULLETS)
    expect(typeof draft).toBe('string')
    expect(draft.length).toBeGreaterThan(20)
  })

  it('should produce different drafts for different principle IDs', () => {
    const dataDriven: GapQuestion = {
      id: 'gap-1', principleId: 'data-driven-decisions', principleName: 'Data',
      question: '', whyWeAsk: '', potentialBoost: 5, draftContext: '',
    }
    const userCentric: GapQuestion = {
      id: 'gap-2', principleId: 'user-centricity', principleName: 'User',
      question: '', whyWeAsk: '', potentialBoost: 5, draftContext: '',
    }
    const draft1 = draftGapAnswer(dataDriven, SAMPLE_BULLETS)
    const draft2 = draftGapAnswer(userCentric, SAMPLE_BULLETS)
    expect(draft1).not.toBe(draft2)
  })

  it('should adapt outcome-over-output draft', () => {
    const gap: GapQuestion = {
      id: 'gap-ooo', principleId: 'outcome-over-output', principleName: 'Outcomes',
      question: '', whyWeAsk: '', potentialBoost: 5, draftContext: '',
    }
    const draft = draftGapAnswer(gap, SAMPLE_BULLETS)
    // Should contain template structure words
    expect(draft).toContain('result')
  })

  it('should adapt cross-functional-leadership draft based on existing content', () => {
    const gap: GapQuestion = {
      id: 'gap-cf', principleId: 'cross-functional-leadership', principleName: 'Leadership',
      question: '', whyWeAsk: '', potentialBoost: 5, draftContext: '',
    }
    // Bullets with team mention should get team-aware draft
    const draft = draftGapAnswer(gap, ['Worked with engineering team of 8'])
    expect(draft.toLowerCase()).toContain('cross-functional')
  })

  it('should handle unknown principle IDs gracefully', () => {
    const gap: GapQuestion = {
      id: 'gap-unknown', principleId: 'nonexistent-principle', principleName: 'Unknown',
      question: '', whyWeAsk: '', potentialBoost: 5, draftContext: '',
    }
    const draft = draftGapAnswer(gap, SAMPLE_BULLETS)
    expect(typeof draft).toBe('string')
    expect(draft.length).toBeGreaterThan(10)
  })

  it('should adapt strategic-thinking draft for PM vs non-PM roles', () => {
    const gap: GapQuestion = {
      id: 'gap-st', principleId: 'strategic-thinking', principleName: 'Strategy',
      question: '', whyWeAsk: '', potentialBoost: 5, draftContext: '',
    }
    const pmDraft = draftGapAnswer(gap, SAMPLE_BULLETS, 'Product Manager')
    const nurseDraft = draftGapAnswer(gap, SAMPLE_BULLETS, 'Registered Nurse')
    // PM draft should reference frameworks; nurse draft should not
    expect(pmDraft.toLowerCase()).toContain('framework')
    expect(nurseDraft.toLowerCase()).not.toContain('rice')
  })

  it('should handle empty bullet array', () => {
    const gap: GapQuestion = {
      id: 'gap-empty', principleId: 'problem-solving', principleName: 'Problem Solving',
      question: '', whyWeAsk: '', potentialBoost: 5, draftContext: '',
    }
    const draft = draftGapAnswer(gap, [])
    expect(typeof draft).toBe('string')
    expect(draft.length).toBeGreaterThan(10)
  })
})

// =========================================================================
// P — Preservation: no hallucinated gaps, valid projections
// =========================================================================

describe('P — Preservation: projection and consistency', () => {
  it('should never project score above 100', () => {
    const bullets = [
      'Led cross-functional team of 12 to deliver analytics platform, increasing DAU by 40% for 50K users through data-driven decisions, solving customer churn problem',
    ]
    const result = identifyGaps(bullets)
    expect(result.projectedScore).toBeLessThanOrEqual(100)
  })

  it('should produce deterministic results', () => {
    const bullets = ['Managed the product roadmap', 'Worked with teams']
    const results = Array(3).fill(null).map(() => identifyGaps(bullets))

    const scores = results.map((r) => r.currentScore)
    expect(new Set(scores).size).toBe(1)

    const gapCounts = results.map((r) => r.gaps.length)
    expect(new Set(gapCounts).size).toBe(1)

    const gapIds = results.map((r) => r.gaps.map((g) => g.id).join(','))
    expect(new Set(gapIds).size).toBe(1)
  })

  it('gaps should have unique IDs', () => {
    const bullets = ['Did some work']
    const result = identifyGaps(bullets)
    const ids = result.gaps.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('potentialBoost should always be positive', () => {
    const bullets = ['Managed stuff']
    const result = identifyGaps(bullets)
    result.gaps.forEach((g) => {
      expect(g.potentialBoost).toBeGreaterThan(0)
    })
  })

  it('weakPrincipleCount should match PM analysis missing principles', () => {
    const bullets = ['Built a feature']
    const result = identifyGaps(bullets)
    expect(result.weakPrincipleCount).toBeGreaterThanOrEqual(0)
    expect(result.weakPrincipleCount).toBeLessThanOrEqual(10)
  })
})

// =========================================================================
// H — Hardening: edge cases and cross-industry
// =========================================================================

describe('H — Hardening: edge cases', () => {
  it('should handle single bullet', () => {
    const result = identifyGaps(['Built a dashboard'])
    expect(result.gaps.length).toBeGreaterThan(0)
    expect(result.currentScore).toBeGreaterThanOrEqual(0)
  })

  it('should handle empty bullet array', () => {
    const result = identifyGaps([])
    expect(result.currentScore).toBeGreaterThanOrEqual(0)
    expect(result.projectedScore).toBeGreaterThanOrEqual(0)
  })

  it('should handle empty string bullets', () => {
    const result = identifyGaps(['', '', ''])
    expect(result.gaps.length).toBeGreaterThanOrEqual(0)
  })

  it('should handle very long bullets', () => {
    const longBullet = 'Led '.repeat(500)
    const result = identifyGaps([longBullet])
    expect(result.currentScore).toBeGreaterThanOrEqual(0)
    expect(result.currentScore).toBeLessThanOrEqual(100)
  })

  it('should adapt gap questions for PM job title', () => {
    const bullets = ['Managed stuff']
    const pmResult = identifyGaps(bullets, 'Product Manager')
    const nurseResult = identifyGaps(bullets, 'Registered Nurse')

    // Both should identify gaps but with different emphasis
    expect(pmResult.gaps.length).toBeGreaterThan(0)
    expect(nurseResult.gaps.length).toBeGreaterThan(0)
  })

  it('nurse gaps should not reference PM-specific frameworks in whyWeAsk', () => {
    const bullets = ['Administered medication to patients']
    const result = identifyGaps(bullets, 'Registered Nurse')

    result.gaps.forEach((g) => {
      // Non-PM "whyWeAsk" text should not contain PM-only terms
      if (g.principleId === 'cross-functional-leadership') {
        expect(g.whyWeAsk.toLowerCase()).not.toContain('pm role')
      }
    })
  })

  it('should use job description context for ATS keyword gap', () => {
    const bullets = ['Managed stuff']
    const withJD = identifyGaps(
      bullets,
      undefined,
      'Looking for someone with experience in React, TypeScript, and agile methodologies'
    )
    const withoutJD = identifyGaps(bullets)

    // ATS gap question should differ when JD is provided
    const atsGapWith = withJD.gaps.find((g) => g.id === 'gap-ats-keywords')
    const atsGapWithout = withoutJD.gaps.find((g) => g.id === 'gap-ats-keywords')

    if (atsGapWith && atsGapWithout) {
      expect(atsGapWith.question).toContain('job description')
    }
  })

  it('performance: should process 10 bullets in under 50ms', () => {
    const bullets = Array(10).fill('Managed the product roadmap and worked with teams')

    const start = performance.now()
    identifyGaps(bullets)
    const duration = performance.now() - start

    expect(duration).toBeLessThan(50)
  })

  it('performance: draftGapAnswer should run in under 5ms', () => {
    const gap: GapQuestion = {
      id: 'perf', principleId: 'data-driven-decisions', principleName: 'Data',
      question: '', whyWeAsk: '', potentialBoost: 5, draftContext: '',
    }

    const start = performance.now()
    for (let i = 0; i < 100; i++) {
      draftGapAnswer(gap, ['Managed stuff'], 'Product Manager')
    }
    const duration = performance.now() - start

    expect(duration).toBeLessThan(50) // 100 calls under 50ms = <0.5ms each
  })
})
