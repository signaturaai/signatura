/**
 * Indicator Detail Analysis Tests — RALPH Structure
 *
 * R — Requirements: analyzeIndicatorDetail returns correct structure
 * A — Analysis: sub-indicator scoring accuracy
 * L — Logic: evidence extraction and sentiment classification
 * P — Preservation: action items appropriate per score tier
 * H — Hardening: edge cases, all 10 principles, performance
 */

import { describe, it, expect } from 'vitest'
import { analyzeIndicatorDetail } from '@/lib/ai/siggy-integration-guide'

// =========================================================================
// R — Requirements: return structure validation
// =========================================================================

describe('R — Requirements: analyzeIndicatorDetail structure', () => {
  const SAMPLE_BULLETS = [
    'Led product roadmap strategy using RICE framework, shipping 15 features resulting in 25% revenue growth',
    'Partnered with cross-functional team of 12 engineers, achieving 95% on-time delivery',
  ]

  it('should return an IndicatorDetail object', () => {
    const result = analyzeIndicatorDetail('outcome-over-output', SAMPLE_BULLETS, 7)
    expect(result).toBeDefined()
    expect(result.principleId).toBe('outcome-over-output')
  })

  it('should return subIndicators array with 3-5 items', () => {
    const result = analyzeIndicatorDetail('data-driven-decisions', SAMPLE_BULLETS, 5)
    expect(Array.isArray(result.subIndicators)).toBe(true)
    expect(result.subIndicators.length).toBeGreaterThanOrEqual(3)
    expect(result.subIndicators.length).toBeLessThanOrEqual(5)
  })

  it('each sub-indicator should have name, score, and maxScore', () => {
    const result = analyzeIndicatorDetail('user-centricity', SAMPLE_BULLETS, 4)
    result.subIndicators.forEach(sub => {
      expect(typeof sub.name).toBe('string')
      expect(sub.name.length).toBeGreaterThan(0)
      expect(typeof sub.score).toBe('number')
      expect(sub.score).toBeGreaterThanOrEqual(0)
      expect(sub.score).toBeLessThanOrEqual(sub.maxScore)
      expect(sub.maxScore).toBe(10)
    })
  })

  it('should return evidence array', () => {
    const result = analyzeIndicatorDetail('strategic-thinking', SAMPLE_BULLETS, 6)
    expect(Array.isArray(result.evidence)).toBe(true)
  })

  it('each evidence item should have text and sentiment', () => {
    const result = analyzeIndicatorDetail('outcome-over-output', SAMPLE_BULLETS, 7)
    result.evidence.forEach(ev => {
      expect(typeof ev.text).toBe('string')
      expect(ev.text.length).toBeGreaterThan(0)
      expect(['positive', 'needs-work']).toContain(ev.sentiment)
    })
  })

  it('should return a non-empty actionItem string', () => {
    const result = analyzeIndicatorDetail('business-acumen', SAMPLE_BULLETS, 3)
    expect(typeof result.actionItem).toBe('string')
    expect(result.actionItem.length).toBeGreaterThan(10)
  })

  it('evidence should be capped at 3 items', () => {
    const manyBullets = Array(10).fill(
      'Led cross-functional team of 12 engineers and designers to ship product'
    )
    const result = analyzeIndicatorDetail('cross-functional-leadership', manyBullets, 8)
    expect(result.evidence.length).toBeLessThanOrEqual(3)
  })
})

// =========================================================================
// A — Analysis: sub-indicator scoring accuracy
// =========================================================================

describe('A — Analysis: sub-indicator scoring accuracy', () => {
  it('should score high on "Metric Usage" when bullet has numbers', () => {
    const bullets = ['Improved conversion rate by 25%, generating $1.2M ARR from 50K users']
    const result = analyzeIndicatorDetail('data-driven-decisions', bullets, 8)
    const metricSub = result.subIndicators.find(s => s.name === 'Metric Usage')
    expect(metricSub).toBeDefined()
    expect(metricSub!.score).toBeGreaterThanOrEqual(5)
  })

  it('should score low on "Metric Usage" when bullet has no numbers', () => {
    const bullets = ['Managed the product roadmap and worked with teams']
    const result = analyzeIndicatorDetail('data-driven-decisions', bullets, 2)
    const metricSub = result.subIndicators.find(s => s.name === 'Metric Usage')
    expect(metricSub).toBeDefined()
    expect(metricSub!.score).toBeLessThanOrEqual(5)
  })

  it('should score high on "Leadership Signal" for leadership keywords', () => {
    const bullets = ['Led and spearheaded a cross-functional initiative across engineering and design']
    const result = analyzeIndicatorDetail('cross-functional-leadership', bullets, 7)
    const leaderSub = result.subIndicators.find(s => s.name === 'Leadership Signal')
    expect(leaderSub).toBeDefined()
    expect(leaderSub!.score).toBeGreaterThanOrEqual(5)
  })

  it('should score low on "User Mention" when no user keywords', () => {
    const bullets = ['Built a dashboard for internal analytics']
    const result = analyzeIndicatorDetail('user-centricity', bullets, 2)
    const userSub = result.subIndicators.find(s => s.name === 'User Mention')
    expect(userSub).toBeDefined()
    expect(userSub!.score).toBeLessThanOrEqual(3)
  })

  it('should score high on "Revenue Impact" for business bullets', () => {
    const bullets = ['Launched pricing tier generating $450K ARR with 25% LTV improvement']
    const result = analyzeIndicatorDetail('business-acumen', bullets, 9)
    const revSub = result.subIndicators.find(s => s.name === 'Revenue Impact')
    expect(revSub).toBeDefined()
    expect(revSub!.score).toBeGreaterThanOrEqual(5)
  })
})

// =========================================================================
// L — Logic: evidence extraction and sentiment classification
// =========================================================================

describe('L — Logic: evidence extraction', () => {
  it('should classify bullet with matching keywords as "positive"', () => {
    const bullets = [
      'Increased revenue by 30% through data-driven A/B testing of pricing tiers',
    ]
    const result = analyzeIndicatorDetail('data-driven-decisions', bullets, 8)
    const positive = result.evidence.filter(e => e.sentiment === 'positive')
    expect(positive.length).toBeGreaterThan(0)
  })

  it('should classify bullet with no matching keywords as "needs-work"', () => {
    const bullets = [
      'Attended meetings and provided updates',
    ]
    const result = analyzeIndicatorDetail('data-driven-decisions', bullets, 2)
    const needsWork = result.evidence.filter(e => e.sentiment === 'needs-work')
    expect(needsWork.length).toBeGreaterThan(0)
  })

  it('should extract actual bullet text as evidence', () => {
    const specific = 'Led cross-functional team of 12 engineers achieving 95% delivery rate'
    const bullets = [specific]
    const result = analyzeIndicatorDetail('cross-functional-leadership', bullets, 7)
    const match = result.evidence.find(e => e.text === specific)
    expect(match).toBeDefined()
  })

  it('should skip very short bullets', () => {
    const bullets = ['Hi', 'Led team of 12 engineers to deliver analytics platform with 40% growth']
    const result = analyzeIndicatorDetail('cross-functional-leadership', bullets, 6)
    // "Hi" is too short, should not appear in evidence
    const hiEvidence = result.evidence.find(e => e.text === 'Hi')
    expect(hiEvidence).toBeUndefined()
  })

  it('should provide at least one evidence item when bullets exist', () => {
    const bullets = ['Managed the product roadmap for internal tools team']
    const result = analyzeIndicatorDetail('outcome-over-output', bullets, 3)
    expect(result.evidence.length).toBeGreaterThanOrEqual(1)
  })
})

// =========================================================================
// P — Preservation: action items per score tier
// =========================================================================

describe('P — Preservation: action item tiering', () => {
  const BULLETS = ['Managed product roadmap']

  it('should provide "high" action item for scores >= 7', () => {
    const result = analyzeIndicatorDetail('outcome-over-output', BULLETS, 8)
    // High action items are refinement-focused, not basics
    expect(result.actionItem.length).toBeGreaterThan(10)
  })

  it('should provide "mid" action item for scores 4-6', () => {
    const result = analyzeIndicatorDetail('outcome-over-output', BULLETS, 5)
    expect(result.actionItem.length).toBeGreaterThan(10)
  })

  it('should provide "low" action item for scores < 4', () => {
    const result = analyzeIndicatorDetail('outcome-over-output', BULLETS, 2)
    expect(result.actionItem.length).toBeGreaterThan(10)
  })

  it('action items should differ between score tiers', () => {
    const high = analyzeIndicatorDetail('data-driven-decisions', BULLETS, 8)
    const mid = analyzeIndicatorDetail('data-driven-decisions', BULLETS, 5)
    const low = analyzeIndicatorDetail('data-driven-decisions', BULLETS, 2)
    expect(high.actionItem).not.toBe(mid.actionItem)
    expect(mid.actionItem).not.toBe(low.actionItem)
    expect(high.actionItem).not.toBe(low.actionItem)
  })

  it('every principle should have action items defined', () => {
    const principles = [
      'outcome-over-output', 'data-driven-decisions', 'user-centricity',
      'strategic-thinking', 'cross-functional-leadership', 'problem-solving',
      'iterative-development', 'communication-storytelling', 'technical-aptitude',
      'business-acumen',
    ]
    principles.forEach(pid => {
      const result = analyzeIndicatorDetail(pid, BULLETS, 5)
      expect(result.actionItem.length).toBeGreaterThan(10)
    })
  })
})

// =========================================================================
// H — Hardening: edge cases and all 10 principles
// =========================================================================

describe('H — Hardening: edge cases', () => {
  it('should handle empty bullets array', () => {
    const result = analyzeIndicatorDetail('outcome-over-output', [], 0)
    expect(result.subIndicators.length).toBeGreaterThan(0)
    expect(typeof result.actionItem).toBe('string')
  })

  it('should handle unknown principle ID gracefully', () => {
    const result = analyzeIndicatorDetail('nonexistent-principle', ['Some bullet'], 5)
    expect(result.subIndicators.length).toBe(0)
    expect(typeof result.actionItem).toBe('string')
  })

  it('should produce valid results for all 10 principles', () => {
    const principles = [
      'outcome-over-output', 'data-driven-decisions', 'user-centricity',
      'strategic-thinking', 'cross-functional-leadership', 'problem-solving',
      'iterative-development', 'communication-storytelling', 'technical-aptitude',
      'business-acumen',
    ]
    const bullets = [
      'Led cross-functional team of 12 to deliver analytics platform',
      'Improved conversion by 25% through A/B testing and data analysis',
    ]

    principles.forEach(pid => {
      const result = analyzeIndicatorDetail(pid, bullets, 6)
      expect(result.principleId).toBe(pid)
      expect(result.subIndicators.length).toBeGreaterThanOrEqual(3)
      expect(result.subIndicators.every(s => s.score >= 0 && s.score <= 10)).toBe(true)
      expect(result.actionItem.length).toBeGreaterThan(0)
    })
  })

  it('sub-indicator scores should be deterministic', () => {
    const bullets = ['Increased revenue by 30% through strategic roadmap execution']
    const r1 = analyzeIndicatorDetail('strategic-thinking', bullets, 7)
    const r2 = analyzeIndicatorDetail('strategic-thinking', bullets, 7)

    expect(r1.subIndicators.map(s => s.score)).toEqual(r2.subIndicators.map(s => s.score))
  })

  it('performance: should process 10 principles x 5 bullets in under 50ms', () => {
    const principles = [
      'outcome-over-output', 'data-driven-decisions', 'user-centricity',
      'strategic-thinking', 'cross-functional-leadership', 'problem-solving',
      'iterative-development', 'communication-storytelling', 'technical-aptitude',
      'business-acumen',
    ]
    const bullets = Array(5).fill(
      'Led cross-functional team of 12 engineers to deliver analytics platform increasing DAU by 40%'
    )

    const start = performance.now()
    principles.forEach(pid => analyzeIndicatorDetail(pid, bullets, 6))
    const duration = performance.now() - start

    expect(duration).toBeLessThan(50)
  })
})
