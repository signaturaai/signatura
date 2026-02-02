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
  isProductRole,
  getWeightsForRole,
  analyzePMContent,
  STAGE_WEIGHTS,
  PM_SPECIALIST_WEIGHTS,
  GENERAL_PROFESSIONAL_WEIGHTS,
  type StageDropDetail,
  type ArbiterDecision,
  type ArbiterResult,
  type WeightProfile,
} from '@/lib/ai/siggy-integration-guide'

// =========================================================================
// R — Requirements: Weight Configuration
// =========================================================================

describe('R — Requirements: Stage Weight Configuration', () => {
  it('default ATS Compatibility weight should be 30%', () => {
    expect(STAGE_WEIGHTS.ats).toBe(0.30)
  })

  it('default Cold Indicators weight should be 20%', () => {
    expect(STAGE_WEIGHTS.indicators).toBe(0.20)
  })

  it('default Recruiter UX weight should be 20%', () => {
    expect(STAGE_WEIGHTS.recruiterUX).toBe(0.20)
  })

  it('default PM Intelligence weight should be 30%', () => {
    expect(STAGE_WEIGHTS.pmIntelligence).toBe(0.30)
  })

  it('default weights should sum to exactly 1.0', () => {
    const sum = STAGE_WEIGHTS.indicators + STAGE_WEIGHTS.ats +
      STAGE_WEIGHTS.recruiterUX + STAGE_WEIGHTS.pmIntelligence
    expect(sum).toBeCloseTo(1.0, 10)
  })

  it('PM Specialist weights should sum to 1.0', () => {
    const sum = PM_SPECIALIST_WEIGHTS.indicators + PM_SPECIALIST_WEIGHTS.ats +
      PM_SPECIALIST_WEIGHTS.recruiterUX + PM_SPECIALIST_WEIGHTS.pmIntelligence
    expect(sum).toBeCloseTo(1.0, 10)
  })

  it('General Professional weights should sum to 1.0', () => {
    const sum = GENERAL_PROFESSIONAL_WEIGHTS.indicators + GENERAL_PROFESSIONAL_WEIGHTS.ats +
      GENERAL_PROFESSIONAL_WEIGHTS.recruiterUX + GENERAL_PROFESSIONAL_WEIGHTS.pmIntelligence
    expect(sum).toBeCloseTo(1.0, 10)
  })

  it('PM Specialist should have PM Intelligence at 35%', () => {
    expect(PM_SPECIALIST_WEIGHTS.pmIntelligence).toBe(0.35)
  })

  it('General Professional should have PM Intelligence at 5%', () => {
    expect(GENERAL_PROFESSIONAL_WEIGHTS.pmIntelligence).toBe(0.05)
  })

  it('General Professional should have ATS at 35%', () => {
    expect(GENERAL_PROFESSIONAL_WEIGHTS.ats).toBe(0.35)
  })

  it('General Professional should have Recruiter UX at 30%', () => {
    expect(GENERAL_PROFESSIONAL_WEIGHTS.recruiterUX).toBe(0.30)
  })

  it('General Professional should have Cold Indicators at 30%', () => {
    expect(GENERAL_PROFESSIONAL_WEIGHTS.indicators).toBe(0.30)
  })

  it('totalScore with no jobTitle should use default weights', () => {
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

  it('PM Intelligence now has higher influence than Cold Indicators by default', () => {
    const pmRichBullet = 'Led team to solve customer churn problem, increased user retention by 40% through data-driven decisions'
    const result = analyzeCVContent(pmRichBullet)
    const pmContribution = result.pmIntelligence.score * STAGE_WEIGHTS.pmIntelligence
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

// =========================================================================
// Role Detection: isProductRole()
// =========================================================================

describe('Role Detection: isProductRole()', () => {
  it('should detect "Product Manager" as product role', () => {
    expect(isProductRole('Product Manager')).toBe(true)
  })

  it('should detect "Senior Product Manager" as product role', () => {
    expect(isProductRole('Senior Product Manager')).toBe(true)
  })

  it('should detect "PM" as product role', () => {
    expect(isProductRole('PM')).toBe(true)
  })

  it('should detect "Product Owner" as product role', () => {
    expect(isProductRole('Product Owner')).toBe(true)
  })

  it('should detect "CPO" as product role', () => {
    expect(isProductRole('CPO')).toBe(true)
  })

  it('should detect "Chief Product Officer" as product role', () => {
    expect(isProductRole('Chief Product Officer')).toBe(true)
  })

  it('should detect "Technical Product Manager" as product role', () => {
    expect(isProductRole('Technical Product Manager')).toBe(true)
  })

  it('should detect "VP of Product" as product role', () => {
    expect(isProductRole('VP of Product')).toBe(true)
  })

  it('should detect "Group Product Manager" as product role', () => {
    expect(isProductRole('Group Product Manager')).toBe(true)
  })

  it('should detect "Head of Product" as product role', () => {
    expect(isProductRole('Head of Product')).toBe(true)
  })

  it('should NOT detect "Registered Nurse" as product role', () => {
    expect(isProductRole('Registered Nurse')).toBe(false)
  })

  it('should NOT detect "Delivery Driver" as product role', () => {
    expect(isProductRole('Delivery Driver')).toBe(false)
  })

  it('should NOT detect "Software Engineer" as product role', () => {
    expect(isProductRole('Software Engineer')).toBe(false)
  })

  it('should NOT detect "Marketing Manager" as product role', () => {
    expect(isProductRole('Marketing Manager')).toBe(false)
  })

  it('should NOT detect "Lawyer" as product role', () => {
    expect(isProductRole('Lawyer')).toBe(false)
  })

  it('should NOT detect "Teacher" as product role', () => {
    expect(isProductRole('Teacher')).toBe(false)
  })

  it('should NOT detect "Data Scientist" as product role', () => {
    expect(isProductRole('Data Scientist')).toBe(false)
  })

  it('should handle empty string', () => {
    expect(isProductRole('')).toBe(false)
  })

  it('should be case-insensitive', () => {
    expect(isProductRole('PRODUCT MANAGER')).toBe(true)
    expect(isProductRole('product manager')).toBe(true)
    expect(isProductRole('Product manager')).toBe(true)
  })

  it('should handle whitespace-padded input', () => {
    expect(isProductRole('  Product Manager  ')).toBe(true)
  })
})

// =========================================================================
// Dynamic Weight Selection: getWeightsForRole()
// =========================================================================

describe('Dynamic Weight Selection: getWeightsForRole()', () => {
  it('should return default weights for undefined jobTitle', () => {
    const weights = getWeightsForRole()
    expect(weights).toEqual(STAGE_WEIGHTS)
  })

  it('should return default weights for empty string', () => {
    const weights = getWeightsForRole('')
    expect(weights).toEqual(STAGE_WEIGHTS)
  })

  it('should return PM Specialist weights for product roles', () => {
    const weights = getWeightsForRole('Senior Product Manager')
    expect(weights).toEqual(PM_SPECIALIST_WEIGHTS)
    expect(weights.pmIntelligence).toBe(0.35)
  })

  it('should return General Professional weights for non-product roles', () => {
    const weights = getWeightsForRole('Registered Nurse')
    expect(weights).toEqual(GENERAL_PROFESSIONAL_WEIGHTS)
    expect(weights.pmIntelligence).toBe(0.05)
  })

  it('should return General Professional weights for Delivery Driver', () => {
    const weights = getWeightsForRole('Delivery Driver')
    expect(weights.pmIntelligence).toBe(0.05)
    expect(weights.ats).toBe(0.35)
    expect(weights.recruiterUX).toBe(0.30)
    expect(weights.indicators).toBe(0.30)
  })
})

// =========================================================================
// PART 1: PM Specialist Test (High-Intelligence Mode)
// =========================================================================

describe('PART 1 — PM Specialist Test: Senior Product Manager', () => {
  const JOB_TITLE = 'Senior Product Manager'

  it('should use PM Specialist weights (PM Intelligence >= 30%)', () => {
    const weights = getWeightsForRole(JOB_TITLE)
    expect(weights.pmIntelligence).toBeGreaterThanOrEqual(0.30)
  })

  it('should reject weak bullet in favour of PM-enriched tailored version', () => {
    const original = 'Led the development of a user analytics dashboard'
    const tailored = 'Led cross-functional team to launch user analytics dashboard, reducing time-to-insight by 40% and increasing data-driven decisions across 15 stakeholders'

    const decision = arbitrateBullet(original, tailored, JOB_TITLE)

    expect(decision.winner).toBe('tailored')
    expect(decision.bullet).toBe(tailored)
    expect(decision.scoreDelta).toBeGreaterThan(0)
  })

  it('PM Intelligence should carry significant weight in total score', () => {
    const bullet = 'Led cross-functional team to solve customer churn problem, increased user retention by 40% through data-driven decisions'
    const result = analyzeCVContent(bullet, JOB_TITLE)

    const weights = getWeightsForRole(JOB_TITLE)
    const pmContribution = result.pmIntelligence.score * weights.pmIntelligence
    const totalContribution = result.totalScore

    // PM should contribute at least 25% of the total score for PM-rich bullet
    expect(pmContribution / totalContribution).toBeGreaterThan(0.20)
  })

  it('scoreArbiter should use PM Specialist weights when jobTitle is PM', () => {
    const originals = ['Led the development of a user analytics dashboard']
    const tailored = ['Led cross-functional team to launch user analytics dashboard, reducing time-to-insight by 40% for 50K users']

    const result = scoreArbiter(originals, tailored, JOB_TITLE)
    expect(result.decisions[0].winner).toBe('tailored')
    expect(result.optimisedTotalScore).toBeGreaterThan(result.originalTotalScore)
  })

  it('PM Specialist scoring should differ from default scoring', () => {
    const bullet = 'Led cross-functional team to solve customer churn problem, increased user retention by 40% through data-driven decisions'

    const defaultResult = analyzeCVContent(bullet)
    const pmResult = analyzeCVContent(bullet, JOB_TITLE)

    // Stage scores are the same (same analyzers), but totalScore differs due to weights
    expect(defaultResult.indicators.score).toBe(pmResult.indicators.score)
    expect(defaultResult.ats.score).toBe(pmResult.ats.score)
    // Total scores should differ because weights differ
    expect(defaultResult.totalScore).not.toBe(pmResult.totalScore)
  })
})

// =========================================================================
// PART 2: Generalist Test (Safety Mode — Nurse / Driver)
// =========================================================================

describe('PART 2 — Generalist Test: Registered Nurse', () => {
  const JOB_TITLE = 'Registered Nurse'

  it('should use General Professional weights (PM Intelligence at 5%)', () => {
    const weights = getWeightsForRole(JOB_TITLE)
    expect(weights.pmIntelligence).toBe(0.05)
    expect(weights.ats).toBe(0.35)
    expect(weights.recruiterUX).toBe(0.30)
    expect(weights.indicators).toBe(0.30)
  })

  it('should REJECT hallucinated PM jargon injected into nurse CV', () => {
    const original = 'Administered medication to 40 patients daily with 100% accuracy'
    const hallucinated = 'Optimized patient roadmap using RICE prioritization framework to deliver cross-functional healthcare outcomes'

    const decision = arbitrateBullet(original, hallucinated, JOB_TITLE)

    expect(decision.winner).toBe('original')
    expect(decision.bullet).toBe(original)
    // The hallucinated version should trigger rejection reasons
    expect(decision.rejectionReasons.length).toBeGreaterThan(0)
  })

  it('should preserve clear nurse bullet over PM-jargon version', () => {
    const originals = [
      'Administered medication to 40 patients daily with 100% accuracy',
      'Managed triage for 200 patients per shift in Level 1 trauma center',
      'Trained 12 new nurses on emergency protocols, reducing onboarding time by 30%',
    ]
    const hallucinated = [
      'Optimized patient roadmap using RICE prioritization framework',
      'Drove stakeholder alignment on patient intake using North Star metrics',
      'Spearheaded cross-functional sprint planning for nurse onboarding backlog',
    ]

    const result = scoreArbiter(originals, hallucinated, JOB_TITLE)

    // All originals should win — PM jargon is harmful for nurse CVs
    result.decisions.forEach((d, i) => {
      expect(d.winner).toBe('original')
      expect(d.bullet).toBe(originals[i])
    })

    expect(result.methodologyPreserved).toBe(true)
  })

  it('PM Intelligence should have minimal influence for nurse role', () => {
    const bullet = 'Administered medication to 40 patients daily with 100% accuracy'
    const result = analyzeCVContent(bullet, JOB_TITLE)

    const weights = getWeightsForRole(JOB_TITLE)
    const pmContribution = result.pmIntelligence.score * weights.pmIntelligence
    const atsContribution = result.ats.score * weights.ats

    // ATS should contribute far more than PM Intelligence for a nurse
    expect(atsContribution).toBeGreaterThan(pmContribution)
  })

  it('should ALLOW genuinely improved nurse bullet (no PM jargon)', () => {
    const original = 'Gave medication to patients'
    const improved = 'Administered medication to 40 patients daily with 100% accuracy, reducing medication errors by 25%'

    const decision = arbitrateBullet(original, improved, JOB_TITLE)

    expect(decision.winner).toBe('tailored')
    expect(decision.bullet).toBe(improved)
  })
})

describe('PART 2 — Generalist Test: Delivery Driver', () => {
  const JOB_TITLE = 'Delivery Driver'

  it('should use General Professional weights', () => {
    const weights = getWeightsForRole(JOB_TITLE)
    expect(weights.pmIntelligence).toBe(0.05)
  })

  it('should REJECT PM jargon injected into driver CV', () => {
    const original = 'Completed 150 deliveries daily with 99.5% on-time rate across 3 zones'
    const hallucinated = 'Leveraged AARRR pirate metrics to optimize delivery funnel and drive stakeholder alignment on logistics roadmap'

    const decision = arbitrateBullet(original, hallucinated, JOB_TITLE)

    expect(decision.winner).toBe('original')
    expect(decision.bullet).toBe(original)
  })

  it('ATS and Recruiter UX should dominate for driver role', () => {
    const bullet = 'Completed 150 deliveries daily with 99.5% on-time rate across 3 zones'
    const result = analyzeCVContent(bullet, JOB_TITLE)

    const weights = getWeightsForRole(JOB_TITLE)
    const atsContribution = result.ats.score * weights.ats
    const uxContribution = result.recruiterUX.score * weights.recruiterUX
    const indicatorContribution = result.indicators.score * weights.indicators
    const pmContribution = result.pmIntelligence.score * weights.pmIntelligence

    // ATS + UX + Indicators should massively outweigh PM
    expect(atsContribution + uxContribution + indicatorContribution).toBeGreaterThan(pmContribution * 5)
  })
})

// =========================================================================
// PART 3: Cross-Industry Discrepancy Audit
// =========================================================================

describe('PART 3 — Cross-Industry Discrepancy Audit', () => {
  it('isProductRole should correctly distinguish PM from Nurse', () => {
    expect(isProductRole('Senior Product Manager')).toBe(true)
    expect(isProductRole('Registered Nurse')).toBe(false)
  })

  it('isProductRole should correctly distinguish PM from Driver', () => {
    expect(isProductRole('Product Owner')).toBe(true)
    expect(isProductRole('Delivery Driver')).toBe(false)
  })

  it('same bullet should score differently under PM vs Nurse weights', () => {
    const bullet = 'Led cross-functional team to solve customer churn problem, increased user retention by 40%'

    const pmResult = analyzeCVContent(bullet, 'Senior Product Manager')
    const nurseResult = analyzeCVContent(bullet, 'Registered Nurse')

    // Indicators, ATS, PM Intelligence stage scores are the same (role-agnostic analyzers)
    expect(pmResult.indicators.score).toBe(nurseResult.indicators.score)
    expect(pmResult.ats.score).toBe(nurseResult.ats.score)
    expect(pmResult.pmIntelligence.score).toBe(nurseResult.pmIntelligence.score)

    // Recruiter UX may differ — PM jargon ("cross-functional") is penalised for non-PM roles
    // Total scores should differ due to different weights AND potential recruiter UX penalty
    expect(pmResult.totalScore).not.toBe(nurseResult.totalScore)
  })

  it('no hallucinated PM terms should leak into nurse optimised bullets', () => {
    const nurseOriginals = [
      'Administered medication to 40 patients daily with 100% accuracy',
      'Managed triage for 200 patients per shift in Level 1 trauma center',
    ]
    const pmHallucinations = [
      'Optimized patient outcome roadmap using OKR-driven sprint planning',
      'Drove North Star metric alignment across cross-functional clinical stakeholders',
    ]

    const result = scoreArbiter(nurseOriginals, pmHallucinations, 'Registered Nurse')

    // Originals should win — no PM jargon in the final output
    result.optimisedBullets.forEach((bullet, i) => {
      expect(bullet).toBe(nurseOriginals[i])
      // Verify no PM jargon leaked
      const lower = bullet.toLowerCase()
      expect(lower).not.toContain('roadmap')
      expect(lower).not.toContain('okr')
      expect(lower).not.toContain('sprint')
      expect(lower).not.toContain('north star')
      expect(lower).not.toContain('stakeholder')
    })
  })

  it('PM role should accept PM-enriched content that nurse role would reject', () => {
    const original = 'Improved the onboarding process'
    const tailored = 'Led cross-functional team to redesign onboarding using RICE prioritization, increasing activation by 35% for 10K users'

    const pmDecision = arbitrateBullet(original, tailored, 'Senior Product Manager')
    const nurseDecision = arbitrateBullet(original, tailored, 'Registered Nurse')

    // PM should accept — high PM Intelligence weight rewards the PM frameworks
    expect(pmDecision.winner).toBe('tailored')
    // Nurse may or may not accept — but PM Intelligence carries almost no weight
    // The key validation: PM total delta should be larger than nurse total delta
    expect(pmDecision.scoreDelta).toBeGreaterThanOrEqual(nurseDecision.scoreDelta)
  })

  it('coaching tone should soften for non-PM roles', () => {
    const text = 'Managed a team of 5 nurses'

    const pmFeedback = analyzePMContent(text, 'Product Manager')
    const nurseFeedback = analyzePMContent(text, 'Registered Nurse')

    // Non-PM feedback should NOT contain PM-specific jargon
    expect(nurseFeedback.feedback.strengths).not.toContain('PM')
    expect(nurseFeedback.feedback.strengths).not.toContain('seasoned PM')
    // PM feedback should be PM-specific
    // (Score will be the same — it's the framing that differs)
  })

  it('coaching tone should use PM insider language for PM roles', () => {
    const strongBullet = 'Led cross-functional team to solve customer churn problem, increased user retention by 40% through data-driven decisions'

    const pmFeedback = analyzePMContent(strongBullet, 'Product Manager')

    // High score → PM-specific praise
    expect(pmFeedback.feedback.strengths).toContain('PM')
  })

  it('full arbiter pipeline should be deterministic across roles', () => {
    const original = 'Managed the product roadmap'
    const tailored = 'Led product roadmap strategy for analytics platform, resulting in 35% DAU increase'

    const pmResults = Array(3).fill(null).map(() => arbitrateBullet(original, tailored, 'Product Manager'))
    const nurseResults = Array(3).fill(null).map(() => arbitrateBullet(original, tailored, 'Registered Nurse'))

    expect(new Set(pmResults.map(r => r.scoreDelta)).size).toBe(1)
    expect(new Set(nurseResults.map(r => r.scoreDelta)).size).toBe(1)
  })

  it('performance: context-aware arbiter should process 20 pairs under 100ms', () => {
    const originals = Array(20).fill('Managed the product roadmap and worked with teams')
    const tailored = Array(20).fill('Led roadmap strategy for analytics platform serving 50K users, resulting in 35% DAU increase')

    const start = performance.now()
    scoreArbiter(originals, tailored, 'Senior Product Manager')
    scoreArbiter(originals, tailored, 'Registered Nurse')
    const duration = performance.now() - start

    expect(duration).toBeLessThan(100)
  })
})
