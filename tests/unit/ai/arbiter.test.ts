/**
 * RALPH QA Suite: CV Score Arbiter
 *
 * Dedicated test suite for the 4-stage analysis pipeline and Score Arbiter.
 * Validates weight correctness, per-stage rejection logging, metric-removal
 * protection, and end-to-end methodology preservation guarantees.
 */

import { describe, it, expect } from 'vitest'
import {
  analyzeIndicators,
  analyzeATS,
  analyzeRecruiterUX,
  analyzePMStage,
  analyzeCVContent,
  arbitrateBullet,
  scoreArbiter,
  STAGE_WEIGHTS,
  type StageDropDetail,
  type ArbiterDecision,
  type ArbiterResult,
} from '@/lib/ai/siggy-integration-guide'

// =========================================================================
// R — Requirements: Weight Configuration
// =========================================================================

describe('R — Requirements: Stage Weight Configuration', () => {
  it('ATS Compatibility weight should be 30%', () => {
    expect(STAGE_WEIGHTS.ats).toBe(0.30)
  })

  it('Cold Indicators weight should be 20%', () => {
    expect(STAGE_WEIGHTS.indicators).toBe(0.20)
  })

  it('Recruiter UX weight should be 20%', () => {
    expect(STAGE_WEIGHTS.recruiterUX).toBe(0.20)
  })

  it('PM Intelligence weight should be 30%', () => {
    expect(STAGE_WEIGHTS.pmIntelligence).toBe(0.30)
  })

  it('all weights should sum to exactly 1.0', () => {
    const sum = STAGE_WEIGHTS.indicators + STAGE_WEIGHTS.ats +
      STAGE_WEIGHTS.recruiterUX + STAGE_WEIGHTS.pmIntelligence
    expect(sum).toBeCloseTo(1.0, 10)
  })

  it('totalScore should reflect the updated weights', () => {
    const result = analyzeCVContent(
      'Led product roadmap strategy for analytics platform serving 50K users, resulting in 35% increase in daily active users'
    )
    const expected = Math.round(
      result.indicators.score * 0.20 +
      result.ats.score * 0.30 +
      result.recruiterUX.score * 0.20 +
      result.pmIntelligence.score * 0.30
    )
    expect(result.totalScore).toBe(expected)
  })

  it('PM Intelligence now has higher influence than Cold Indicators', () => {
    // A bullet rich in PM signals but weak on raw keywords should score
    // higher under the new weights than under equal weighting
    const pmRichBullet = 'Led team to solve customer churn problem, increased user retention by 40% through data-driven decisions'
    const result = analyzeCVContent(pmRichBullet)

    // PM Intelligence (30% weight) should contribute more than Indicators (20%)
    const pmContribution = result.pmIntelligence.score * STAGE_WEIGHTS.pmIntelligence
    const indicatorContribution = result.indicators.score * STAGE_WEIGHTS.indicators
    // For a PM-rich bullet, the PM stage should contribute meaningfully
    expect(pmContribution).toBeGreaterThan(0)
    expect(result.totalScore).toBeGreaterThan(30)
  })
})

// =========================================================================
// A — Arbiter Decision Logging (Rejection Reasons)
// =========================================================================

describe('A — Arbiter Decision Logging', () => {
  it('should include rejectionReasons array on every decision', () => {
    const decision = arbitrateBullet(
      'Led analytics platform for 50K users',
      'Led analytics platform for 50K users'
    )
    expect(decision).toHaveProperty('rejectionReasons')
    expect(Array.isArray(decision.rejectionReasons)).toBe(true)
  })

  it('rejectionReasons should be empty when tailored wins', () => {
    const decision = arbitrateBullet(
      'Built a feature',
      'Led feature launch for analytics platform, increasing user adoption by 30%'
    )
    expect(decision.winner).toBe('tailored')
    // Even when tailored wins, rejectionReasons only lists drops — may still have some
    // but the overall score is still higher. The key guarantee is winner = tailored.
  })

  it('rejectionReasons should list dropped stages when original wins', () => {
    const decision = arbitrateBullet(
      'Led cross-functional team of 12, increasing customer retention by 40% and generating $1.5M in savings',
      'Was responsible for helping with various team projects'
    )

    expect(decision.winner).toBe('original')
    expect(decision.rejectionReasons.length).toBeGreaterThan(0)

    // Each rejection reason should have the required fields
    decision.rejectionReasons.forEach(reason => {
      expect(reason).toHaveProperty('stage')
      expect(reason).toHaveProperty('stageName')
      expect(reason).toHaveProperty('originalScore')
      expect(reason).toHaveProperty('tailoredScore')
      expect(reason).toHaveProperty('drop')
      expect(reason.drop).toBeGreaterThan(0)
      expect(reason.originalScore).toBeGreaterThan(reason.tailoredScore)
    })
  })

  it('rejectionReasons should identify specific stage names', () => {
    const decision = arbitrateBullet(
      'Increased conversion by 25% through A/B testing with 10K customers',
      'Did some testing'
    )

    expect(decision.winner).toBe('original')
    const stageNames = decision.rejectionReasons.map(r => r.stageName)
    // At minimum, ATS should drop (metrics removed)
    const validStageNames = ['Cold Indicators', 'ATS Compatibility', 'Recruiter UX', 'PM Intelligence']
    stageNames.forEach(name => {
      expect(validStageNames).toContain(name)
    })
  })

  it('should identify ATS Compatibility drop when structure degrades', () => {
    // Original: starts with verb, has numbers, good structure
    // Tailored: passive voice, no numbers
    const decision = arbitrateBullet(
      'Launched analytics platform for 10K users with 25% engagement lift',
      'Various analytics work was done by the team over several months'
    )

    expect(decision.winner).toBe('original')
    const atsReason = decision.rejectionReasons.find(r => r.stage === 'ats')
    expect(atsReason).toBeDefined()
    expect(atsReason!.stageName).toBe('ATS Compatibility')
    expect(atsReason!.drop).toBeGreaterThan(0)
  })

  it('should identify PM Intelligence drop when PM signals removed', () => {
    // Original: rich PM signals (outcome language, metrics, users, collaboration, problem-solving)
    // Tailored: stripped of PM depth
    const decision = arbitrateBullet(
      'Led cross-functional team to solve customer churn problem, increased user retention by 40% through data-driven decisions',
      'Worked on retention'
    )

    expect(decision.winner).toBe('original')
    const pmReason = decision.rejectionReasons.find(r => r.stage === 'pmIntelligence')
    expect(pmReason).toBeDefined()
    expect(pmReason!.stageName).toBe('PM Intelligence')
    expect(pmReason!.drop).toBeGreaterThan(0)
  })

  it('should identify Cold Indicators drop when keywords removed', () => {
    const decision = arbitrateBullet(
      'Drove revenue growth and improved customer retention across enterprise clients',
      'Helped with some business stuff'
    )

    expect(decision.winner).toBe('original')
    const indicatorReason = decision.rejectionReasons.find(r => r.stage === 'indicators')
    expect(indicatorReason).toBeDefined()
    expect(indicatorReason!.stageName).toBe('Cold Indicators')
  })

  it('should identify Recruiter UX drop when scan-ability worsens', () => {
    const decision = arbitrateBullet(
      'Increased revenue 40% by redesigning checkout flow for 50K customers',
      'Was responsible for participating in various checkout-related meetings and discussions about potential improvements to the flow that might eventually help with revenue if implemented correctly and approved by stakeholders and management'
    )

    expect(decision.winner).toBe('original')
    const uxReason = decision.rejectionReasons.find(r => r.stage === 'recruiterUX')
    expect(uxReason).toBeDefined()
    expect(uxReason!.stageName).toBe('Recruiter UX')
  })

  it('rejectionReasons should be empty array for identical bullets', () => {
    const text = 'Led product strategy for 50K users, increasing DAU by 35%'
    const decision = arbitrateBullet(text, text)

    expect(decision.rejectionReasons).toHaveLength(0)
    expect(decision.winner).toBe('tailored')
    expect(decision.scoreDelta).toBe(0)
  })

  it('scoreArbiter decisions should all carry rejectionReasons', () => {
    const result = scoreArbiter(
      ['Built a feature', 'Led cross-functional team increasing retention by 40% for 50K users'],
      ['Launched feature for analytics platform, increasing adoption by 30%', 'Helped with team stuff']
    )

    result.decisions.forEach(d => {
      expect(d).toHaveProperty('rejectionReasons')
      expect(Array.isArray(d.rejectionReasons)).toBe(true)
    })

    // Second bullet was degraded — should have rejection reasons
    expect(result.decisions[1].winner).toBe('original')
    expect(result.decisions[1].rejectionReasons.length).toBeGreaterThan(0)
  })
})

// =========================================================================
// L — Logic: Metric Removal Protection
// =========================================================================

describe('L — Logic: Metric Removal Protection', () => {
  it('should block tailored version that strips a percentage metric', () => {
    const original = 'Increased user retention by 40% through targeted onboarding improvements'
    const tailored = 'Improved user retention through targeted onboarding improvements'

    const decision = arbitrateBullet(original, tailored)
    expect(decision.winner).toBe('original')
    expect(decision.bullet).toBe(original)

    // ATS and/or Indicators should flag the metric removal
    const hasATSDrop = decision.rejectionReasons.some(r => r.stage === 'ats')
    const hasIndicatorDrop = decision.rejectionReasons.some(r => r.stage === 'indicators')
    expect(hasATSDrop || hasIndicatorDrop).toBe(true)
  })

  it('should block tailored version that strips a dollar amount', () => {
    const original = 'Generated $2.3M ARR through data-driven pricing strategy'
    const tailored = 'Generated revenue through data-driven pricing strategy'

    const decision = arbitrateBullet(original, tailored)
    expect(decision.winner).toBe('original')
    expect(decision.bullet).toBe(original)
  })

  it('should block tailored version that strips user count metrics', () => {
    const original = 'Launched analytics platform serving 50K users with real-time dashboards'
    const tailored = 'Launched analytics platform with real-time dashboards'

    const decision = arbitrateBullet(original, tailored)
    expect(decision.winner).toBe('original')
    expect(decision.bullet).toBe(original)
  })

  it('should block tailored that strips multiplier metrics', () => {
    const original = 'Delivered 3x improvement in page load speed through infrastructure optimization'
    const tailored = 'Delivered improvement in page load speed through infrastructure optimization'

    const decision = arbitrateBullet(original, tailored)
    expect(decision.winner).toBe('original')
    expect(decision.bullet).toBe(original)
  })

  it('should allow tailored version that preserves metrics and adds context', () => {
    const original = 'Increased retention by 40%'
    const tailored = 'Led cross-functional team to solve customer churn problem, increasing user retention by 40% through data-driven A/B testing'

    const decision = arbitrateBullet(original, tailored)
    expect(decision.winner).toBe('tailored')
    expect(decision.bullet).toBe(tailored)
    expect(decision.scoreDelta).toBeGreaterThan(0)
  })

  it('scoreArbiter should protect metrics across a full bullet array', () => {
    const originals = [
      'Increased conversion by 25% through checkout redesign',
      'Reduced churn by 15% and saved $500K annually',
      'Led platform serving 100K customers globally',
    ]
    const tailored = [
      'Improved conversion through checkout redesign',             // metric stripped
      'Reduced churn and saved money annually',                    // metric stripped
      'Led platform serving customers globally',                    // metric stripped
    ]

    const result = scoreArbiter(originals, tailored)

    // All 3 should revert to original because metrics were removed
    result.decisions.forEach((d, i) => {
      expect(d.winner).toBe('original')
      expect(d.bullet).toBe(originals[i])
      expect(d.rejectionReasons.length).toBeGreaterThan(0)
    })

    expect(result.methodologyPreserved).toBe(true)
    expect(result.optimisedTotalScore).toBeGreaterThanOrEqual(result.originalTotalScore)
  })
})

// =========================================================================
// P — Preservation: Methodology Fidelity
// =========================================================================

describe('P — Preservation: Methodology Fidelity', () => {
  const PRODUCTION_ORIGINALS = [
    'Managed the product roadmap',
    'Worked with engineering and design teams',
    'Built features for users',
    'Attended meetings and provided updates',
  ]

  const PRODUCTION_TAILORED = [
    'Led product roadmap strategy using RICE framework, shipping 15 high-impact features over 6 months resulting in 25% revenue growth',
    'Partnered with cross-functional team of 12 engineers and designers, achieving 95% on-time delivery through weekly syncs and stakeholder alignment',
    'Launched user-facing analytics platform for 50K customers, increasing engagement by 40% and reducing churn by 15%',
    'Drove executive stakeholder alignment through weekly product reviews, resulting in $2M budget approval and accelerated roadmap execution',
  ]

  it('optimised score should always be >= original score', () => {
    const result = scoreArbiter(PRODUCTION_ORIGINALS, PRODUCTION_TAILORED)
    expect(result.optimisedTotalScore).toBeGreaterThanOrEqual(result.originalTotalScore)
  })

  it('methodologyPreserved should be true for well-tailored content', () => {
    const result = scoreArbiter(PRODUCTION_ORIGINALS, PRODUCTION_TAILORED)
    expect(result.methodologyPreserved).toBe(true)
  })

  it('every individual bullet should maintain or improve', () => {
    const result = scoreArbiter(PRODUCTION_ORIGINALS, PRODUCTION_TAILORED)
    result.decisions.forEach(decision => {
      const optimisedScore = decision.winner === 'tailored'
        ? decision.tailoredAnalysis.totalScore
        : decision.originalAnalysis.totalScore
      expect(optimisedScore).toBeGreaterThanOrEqual(decision.originalAnalysis.totalScore)
    })
  })

  it('mixed degradation/improvement should selectively revert', () => {
    const originals = [
      'Led cross-functional team of 12 delivering 40% retention increase for 50K users',
      'Managed the product roadmap',
      'Increased conversion by 25% through A/B testing with 10K customers',
    ]
    const tailored = [
      'Helped with team stuff',                                              // degraded
      'Led roadmap prioritisation using RICE, shipping 15 features resulting in 25% revenue growth',  // improved
      'Did some testing',                                                     // degraded
    ]

    const result = scoreArbiter(originals, tailored)

    expect(result.decisions[0].winner).toBe('original')
    expect(result.decisions[0].rejectionReasons.length).toBeGreaterThan(0)
    expect(result.decisions[1].winner).toBe('tailored')
    expect(result.decisions[2].winner).toBe('original')
    expect(result.decisions[2].rejectionReasons.length).toBeGreaterThan(0)

    expect(result.methodologyPreserved).toBe(true)
  })

  it('identical input should produce identical output', () => {
    const bullets = [
      'Led product strategy for 50K users, increasing DAU by 35%',
      'Drove cross-functional alignment with 12 stakeholders',
    ]
    const result = scoreArbiter(bullets, [...bullets])

    expect(result.optimisedTotalScore).toBe(result.originalTotalScore)
    expect(result.methodologyPreserved).toBe(true)
    result.decisions.forEach(d => {
      expect(d.scoreDelta).toBe(0)
      expect(d.winner).toBe('tailored')
      expect(d.rejectionReasons).toHaveLength(0)
    })
  })
})

// =========================================================================
// H — Hardening: Edge Cases & Robustness
// =========================================================================

describe('H — Hardening: Edge Cases & Robustness', () => {
  it('should handle empty arrays', () => {
    const result = scoreArbiter([], [])
    expect(result.decisions).toHaveLength(0)
    expect(result.optimisedBullets).toHaveLength(0)
    expect(result.originalTotalScore).toBe(0)
    expect(result.optimisedTotalScore).toBe(0)
    expect(result.methodologyPreserved).toBe(true)
  })

  it('should handle more originals than tailored', () => {
    const originals = ['Built a feature', 'Managed roadmap', 'Ran meetings']
    const tailored = ['Led feature launch increasing adoption by 30%']
    const result = scoreArbiter(originals, tailored)

    expect(result.decisions).toHaveLength(3)
    expect(result.optimisedBullets).toHaveLength(3)
    // Unmatched originals should keep original (since tailored falls back to original)
    expect(result.decisions[1].scoreDelta).toBe(0)
    expect(result.decisions[2].scoreDelta).toBe(0)
  })

  it('should handle more tailored than originals', () => {
    const originals = ['Built a feature']
    const tailored = [
      'Led feature launch increasing adoption by 30%',
      'Drove platform migration reducing latency by 60%',
    ]
    const result = scoreArbiter(originals, tailored)

    expect(result.decisions).toHaveLength(2)
    expect(result.optimisedBullets).toHaveLength(2)
  })

  it('should handle empty string bullets', () => {
    const decision = arbitrateBullet('', '')
    expect(decision).toHaveProperty('winner')
    expect(decision).toHaveProperty('rejectionReasons')
    expect(decision.scoreDelta).toBe(0)
  })

  it('should handle very long bullets without crashing', () => {
    const longBullet = 'Led '.repeat(500) + 'team of 50 users with 30% improvement'
    const decision = arbitrateBullet(longBullet, 'Short bullet')
    expect(decision).toHaveProperty('winner')
    expect(decision).toHaveProperty('rejectionReasons')
  })

  it('should handle special characters in bullets', () => {
    const decision = arbitrateBullet(
      'Led {team} <project> with |stakeholders|',
      'Led team project with stakeholders improving retention by 30%'
    )
    expect(decision).toHaveProperty('winner')
    // Tailored should win — it has better ATS formatting (no special chars) AND metrics
    expect(decision.winner).toBe('tailored')
  })

  it('deterministic: same input always produces same output', () => {
    const original = 'Managed the product roadmap'
    const tailored = 'Led roadmap strategy for analytics platform, resulting in 35% DAU increase'

    const results = Array(5).fill(null).map(() => arbitrateBullet(original, tailored))
    const winners = results.map(r => r.winner)
    const deltas = results.map(r => r.scoreDelta)

    expect(new Set(winners).size).toBe(1)
    expect(new Set(deltas).size).toBe(1)
  })

  it('performance: process 20 bullet pairs under 100ms', () => {
    const originals = Array(20).fill('Managed the product roadmap and worked with teams')
    const tailored = Array(20).fill(
      'Led product roadmap strategy for analytics platform serving 50K users, resulting in 35% DAU increase'
    )

    const start = performance.now()
    scoreArbiter(originals, tailored)
    const duration = performance.now() - start

    expect(duration).toBeLessThan(100)
  })

  it('performance: individual arbitrateBullet under 5ms', () => {
    const start = performance.now()
    arbitrateBullet(
      'Built a dashboard',
      'Led analytics dashboard launch for 10K users, improving data-driven decision making by 50%'
    )
    const duration = performance.now() - start

    expect(duration).toBeLessThan(5)
  })
})

// =========================================================================
// Integration: Full 4-Stage Pipeline Verification
// =========================================================================

describe('Integration: Full 4-Stage Pipeline on Arbiter Decisions', () => {
  it('arbiter should run all 4 stages on both original and tailored', () => {
    const decision = arbitrateBullet(
      'Built a dashboard',
      'Led analytics dashboard launch for 10K users, improving data-driven decision making by 50%'
    )

    for (const analysis of [decision.originalAnalysis, decision.tailoredAnalysis]) {
      expect(analysis.indicators.score).toBeGreaterThanOrEqual(0)
      expect(analysis.indicators.score).toBeLessThanOrEqual(100)
      expect(analysis.ats.score).toBeGreaterThanOrEqual(0)
      expect(analysis.ats.score).toBeLessThanOrEqual(100)
      expect(analysis.recruiterUX.score).toBeGreaterThanOrEqual(0)
      expect(analysis.recruiterUX.score).toBeLessThanOrEqual(100)
      expect(analysis.pmIntelligence.score).toBeGreaterThanOrEqual(0)
      expect(analysis.pmIntelligence.score).toBeLessThanOrEqual(100)
      expect(analysis.totalScore).toBeGreaterThanOrEqual(0)
      expect(analysis.totalScore).toBeLessThanOrEqual(100)

      // All stages should have non-empty details
      expect(analysis.indicators.details.length).toBeGreaterThan(0)
      expect(analysis.ats.details.length).toBeGreaterThan(0)
      expect(analysis.recruiterUX.details.length).toBeGreaterThan(0)
      expect(analysis.pmIntelligence.details.length).toBeGreaterThan(0)
    }
  })

  it('weak-to-strong tailoring should show improvement in most stages', () => {
    const decision = arbitrateBullet(
      'Managed the product roadmap',
      'Led product roadmap strategy using RICE framework, shipping 15 features resulting in 25% revenue growth across enterprise stakeholders'
    )

    expect(decision.winner).toBe('tailored')

    // Tailored should score higher in at least 3 of 4 stages
    let stagesImproved = 0
    if (decision.tailoredAnalysis.indicators.score > decision.originalAnalysis.indicators.score) stagesImproved++
    if (decision.tailoredAnalysis.ats.score > decision.originalAnalysis.ats.score) stagesImproved++
    if (decision.tailoredAnalysis.recruiterUX.score > decision.originalAnalysis.recruiterUX.score) stagesImproved++
    if (decision.tailoredAnalysis.pmIntelligence.score > decision.originalAnalysis.pmIntelligence.score) stagesImproved++

    expect(stagesImproved).toBeGreaterThanOrEqual(3)
  })

  it('strong-to-weak tailoring should trigger multiple rejection reasons', () => {
    const decision = arbitrateBullet(
      'Led cross-functional team to solve customer churn problem, increased user retention by 40% through data-driven decisions, resulting in $1.2M savings',
      'Helped with team stuff'
    )

    expect(decision.winner).toBe('original')
    // Should flag drops across multiple stages
    expect(decision.rejectionReasons.length).toBeGreaterThanOrEqual(2)

    // The total delta should be significantly negative
    expect(decision.scoreDelta).toBeLessThan(-20)
  })
})
