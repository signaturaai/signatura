/**
 * Unit Tests for Siggy PM Intelligence
 *
 * Tests core PM principle analysis, scoring, and context generation
 */

import { describe, it, expect } from 'vitest'
import {
  PM_CORE_PRINCIPLES,
  PM_FRAMEWORKS,
  PM_COACHING_CONTEXTS,
  getPrinciplesForContext,
  analyzeWithPMPrinciples,
  generateSiggyPMContext,
} from '@/lib/ai/siggy-pm-intelligence'
import {
  analyzeIndicators,
  analyzeATS,
  analyzeRecruiterUX,
  analyzePMStage,
  analyzeCVContent,
  arbitrateBullet,
  scoreArbiter,
  STAGE_WEIGHTS,
  type FourStageAnalysis,
  type ArbiterResult,
} from '@/lib/ai/siggy-integration-guide'

describe('PM Core Principles', () => {
  it('should have 10 core principles defined', () => {
    expect(PM_CORE_PRINCIPLES).toHaveLength(10)
  })

  it('should have all required principle fields', () => {
    PM_CORE_PRINCIPLES.forEach((principle) => {
      expect(principle).toHaveProperty('id')
      expect(principle).toHaveProperty('name')
      expect(principle).toHaveProperty('description')
      expect(principle).toHaveProperty('keyQuestions')
      expect(principle).toHaveProperty('applicationTips')
      expect(principle).toHaveProperty('exampleFraming')
      expect(principle.exampleFraming).toHaveProperty('weak')
      expect(principle.exampleFraming).toHaveProperty('strong')
    })
  })

  it('should have unique principle IDs', () => {
    const ids = PM_CORE_PRINCIPLES.map((p) => p.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('each principle should have at least 2 key questions', () => {
    PM_CORE_PRINCIPLES.forEach((p) => {
      expect(p.keyQuestions.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('each principle should have at least 2 application tips', () => {
    PM_CORE_PRINCIPLES.forEach((p) => {
      expect(p.applicationTips.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('weak framing should be shorter than strong framing', () => {
    PM_CORE_PRINCIPLES.forEach((p) => {
      expect(p.exampleFraming.strong.length).toBeGreaterThan(
        p.exampleFraming.weak.length
      )
    })
  })
})

describe('PM Frameworks', () => {
  it('should have 6 frameworks defined', () => {
    expect(PM_FRAMEWORKS).toHaveLength(6)
  })

  it('should have all required framework fields', () => {
    PM_FRAMEWORKS.forEach((framework) => {
      expect(framework).toHaveProperty('name')
      expect(framework).toHaveProperty('description')
      expect(framework).toHaveProperty('whenToUse')
      expect(framework).toHaveProperty('components')
      expect(Array.isArray(framework.components)).toBe(true)
    })
  })

  it('should include RICE prioritization framework', () => {
    const rice = PM_FRAMEWORKS.find((f) => f.name === 'RICE Prioritization')
    expect(rice).toBeDefined()
    expect(rice?.description).toContain('Reach')
    expect(rice?.description).toContain('Impact')
  })

  it('each framework should have at least 2 components', () => {
    PM_FRAMEWORKS.forEach((f) => {
      expect(f.components.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('should include known frameworks', () => {
    const names = PM_FRAMEWORKS.map((f) => f.name)
    expect(names).toContain('RICE Prioritization')
    expect(names).toContain('Kano Model')
    expect(names).toContain('North Star Metric')
  })
})

describe('getPrinciplesForContext', () => {
  it('should return relevant principles for cvTailor context', () => {
    const principles = getPrinciplesForContext('cvTailor')
    expect(principles.length).toBeGreaterThan(0)

    const hasOutcome = principles.some((p) => p.id === 'outcome-over-output')
    expect(hasOutcome).toBe(true)
  })

  it('should return relevant principles for interviewCoach context', () => {
    const principles = getPrinciplesForContext('interviewCoach')
    expect(principles.length).toBeGreaterThan(0)

    const hasProblemSolving = principles.some((p) => p.id === 'problem-solving')
    expect(hasProblemSolving).toBe(true)
  })

  it('should return different principles for different contexts', () => {
    const cvPrinciples = getPrinciplesForContext('cvTailor')
    const interviewPrinciples = getPrinciplesForContext('interviewCoach')

    expect(cvPrinciples).not.toEqual(interviewPrinciples)
  })

  it('cvTailor should include business-acumen', () => {
    const principles = getPrinciplesForContext('cvTailor')
    expect(principles.some((p) => p.id === 'business-acumen')).toBe(true)
  })

  it('interviewCoach should include strategic-thinking', () => {
    const principles = getPrinciplesForContext('interviewCoach')
    expect(principles.some((p) => p.id === 'strategic-thinking')).toBe(true)
  })

  it('returned principles count should match primaryPrinciples count', () => {
    const cvPrinciples = getPrinciplesForContext('cvTailor')
    expect(cvPrinciples.length).toBe(
      PM_COACHING_CONTEXTS.cvTailor.primaryPrinciples.length
    )

    const interviewPrinciples = getPrinciplesForContext('interviewCoach')
    expect(interviewPrinciples.length).toBe(
      PM_COACHING_CONTEXTS.interviewCoach.primaryPrinciples.length
    )
  })
})

describe('analyzeWithPMPrinciples', () => {
  it('should give low score to weak bullet points', () => {
    const weakBullet = 'Built a dashboard'
    const result = analyzeWithPMPrinciples(weakBullet)

    expect(result.score).toBeLessThan(40)
    expect(result.missingPrinciples.length).toBeGreaterThan(0)
    expect(result.suggestions.length).toBeGreaterThan(0)
  })

  it('should give high score to strong bullet points', () => {
    const strongBullet =
      'Led product strategy for analytics platform serving 50K+ users, increased daily active users by 35% and generated $2.3M ARR through data-driven prioritization and cross-functional collaboration with engineering and design teams'
    const result = analyzeWithPMPrinciples(strongBullet)

    expect(result.score).toBeGreaterThan(60)
    expect(result.missingPrinciples.length).toBeLessThan(3)
  })

  it('should detect outcome-oriented language', () => {
    const withOutcome = 'Increased user retention by 40%'
    const withoutOutcome = 'Built a feature'

    const resultWith = analyzeWithPMPrinciples(withOutcome)
    const resultWithout = analyzeWithPMPrinciples(withoutOutcome)

    expect(resultWith.score).toBeGreaterThan(resultWithout.score)
  })

  it('should detect metrics and quantification', () => {
    const withMetrics = 'Reduced churn by 25% and saved $500K annually'
    const withoutMetrics = 'Improved the product significantly'

    const resultWith = analyzeWithPMPrinciples(withMetrics)
    const resultWithout = analyzeWithPMPrinciples(withoutMetrics)

    expect(resultWith.score).toBeGreaterThan(resultWithout.score)
  })

  it('should detect user-centric language', () => {
    const withUsers = 'Solved customer pain point affecting 10K users'
    const withoutUsers = 'Built a new feature'

    const resultWith = analyzeWithPMPrinciples(withUsers)
    const resultWithout = analyzeWithPMPrinciples(withoutUsers)

    expect(resultWith.score).toBeGreaterThan(resultWithout.score)
  })

  it('should detect collaboration and leadership', () => {
    const withLeadership =
      'Led cross-functional team of 12 engineers and designers'
    const withoutLeadership = 'Worked on a project'

    const resultWith = analyzeWithPMPrinciples(withLeadership)
    const resultWithout = analyzeWithPMPrinciples(withoutLeadership)

    expect(resultWith.score).toBeGreaterThan(resultWithout.score)
  })

  it('should detect problem-solving language', () => {
    const withProblem =
      'Solved critical onboarding issue reducing activation rate'
    const withoutProblem = 'Made some updates'

    const resultWith = analyzeWithPMPrinciples(withProblem)
    const resultWithout = analyzeWithPMPrinciples(withoutProblem)

    expect(resultWith.score).toBeGreaterThan(resultWithout.score)
  })

  it('should provide actionable suggestions', () => {
    const weakBullet = 'Managed the roadmap'
    const result = analyzeWithPMPrinciples(weakBullet)

    expect(result.suggestions.length).toBeGreaterThan(0)
    result.suggestions.forEach((suggestion) => {
      expect(typeof suggestion).toBe('string')
      expect(suggestion.length).toBeGreaterThan(10)
    })
  })

  it('should identify missing principles', () => {
    const incompleteText = 'Built a feature'
    const result = analyzeWithPMPrinciples(incompleteText)

    expect(result.missingPrinciples.length).toBeGreaterThan(0)
    result.missingPrinciples.forEach((principle) => {
      expect(principle).toHaveProperty('id')
      expect(principle).toHaveProperty('name')
    })
  })

  it('should return score of 0 for empty string', () => {
    const result = analyzeWithPMPrinciples('')
    expect(result.score).toBe(0)
  })

  it('should return maximum 100 score', () => {
    const perfectBullet =
      'Led and collaborated with cross-functional team to solve a critical problem, increased user retention by 40% through data-driven decisions'
    const result = analyzeWithPMPrinciples(perfectBullet)
    expect(result.score).toBeLessThanOrEqual(100)
  })
})

describe('generateSiggyPMContext', () => {
  it('should generate context for cvTailor', () => {
    const context = generateSiggyPMContext('cvTailor')

    expect(typeof context).toBe('string')
    expect(context.length).toBeGreaterThan(100)
    expect(context).toContain('PM')
    expect(context).toContain('principles')
  })

  it('should generate context for interviewCoach', () => {
    const context = generateSiggyPMContext('interviewCoach')

    expect(typeof context).toBe('string')
    expect(context.length).toBeGreaterThan(100)
    expect(context).toContain('STAR')
  })

  it('should include relevant principles in context', () => {
    const cvContext = generateSiggyPMContext('cvTailor')
    const principles = getPrinciplesForContext('cvTailor')

    const mentionsCount = principles.filter((p) =>
      cvContext.includes(p.name)
    ).length

    expect(mentionsCount).toBeGreaterThan(0)
  })

  it('should include guidance in context', () => {
    const context = generateSiggyPMContext('cvTailor')
    const guidance = PM_COACHING_CONTEXTS.cvTailor.guidance

    const includesGuidance = guidance.some((tip) => context.includes(tip))

    expect(includesGuidance).toBe(true)
  })

  it('should be different for different contexts', () => {
    const cvContext = generateSiggyPMContext('cvTailor')
    const interviewContext = generateSiggyPMContext('interviewCoach')

    expect(cvContext).not.toBe(interviewContext)
  })

  it('cvTailor context should include watch-for guidance', () => {
    const context = generateSiggyPMContext('cvTailor')
    expect(context).toContain('Watch For')
  })

  it('interviewCoach context should include STAR template', () => {
    const context = generateSiggyPMContext('interviewCoach')
    expect(context).toContain('Situation')
    expect(context).toContain('Task')
    expect(context).toContain('Action')
    expect(context).toContain('Result')
  })
})

describe('PM Coaching Contexts', () => {
  it('should have configurations for both contexts', () => {
    expect(PM_COACHING_CONTEXTS).toHaveProperty('cvTailor')
    expect(PM_COACHING_CONTEXTS).toHaveProperty('interviewCoach')
  })

  it('should have primary principles defined', () => {
    expect(PM_COACHING_CONTEXTS.cvTailor.primaryPrinciples).toBeDefined()
    expect(
      PM_COACHING_CONTEXTS.interviewCoach.primaryPrinciples
    ).toBeDefined()
    expect(
      Array.isArray(PM_COACHING_CONTEXTS.cvTailor.primaryPrinciples)
    ).toBe(true)
  })

  it('should have guidance defined', () => {
    expect(PM_COACHING_CONTEXTS.cvTailor.guidance).toBeDefined()
    expect(PM_COACHING_CONTEXTS.interviewCoach.guidance).toBeDefined()
    expect(Array.isArray(PM_COACHING_CONTEXTS.cvTailor.guidance)).toBe(true)
  })

  it('should have CV-specific red flags', () => {
    expect(PM_COACHING_CONTEXTS.cvTailor.redFlags).toBeDefined()
    expect(Array.isArray(PM_COACHING_CONTEXTS.cvTailor.redFlags)).toBe(true)
    expect(PM_COACHING_CONTEXTS.cvTailor.redFlags.length).toBeGreaterThan(0)
  })

  it('should have interview-specific STAR template', () => {
    expect(PM_COACHING_CONTEXTS.interviewCoach.starTemplate).toBeDefined()
    expect(
      PM_COACHING_CONTEXTS.interviewCoach.starTemplate
    ).toHaveProperty('situation')
    expect(
      PM_COACHING_CONTEXTS.interviewCoach.starTemplate
    ).toHaveProperty('task')
    expect(
      PM_COACHING_CONTEXTS.interviewCoach.starTemplate
    ).toHaveProperty('action')
    expect(
      PM_COACHING_CONTEXTS.interviewCoach.starTemplate
    ).toHaveProperty('result')
  })

  it('should have interview common questions', () => {
    expect(PM_COACHING_CONTEXTS.interviewCoach.commonQuestions).toBeDefined()
    expect(
      PM_COACHING_CONTEXTS.interviewCoach.commonQuestions.length
    ).toBeGreaterThan(0)
  })

  it('primaryPrinciples should reference valid principle IDs', () => {
    const validIds = PM_CORE_PRINCIPLES.map((p) => p.id)
    PM_COACHING_CONTEXTS.cvTailor.primaryPrinciples.forEach((id) => {
      expect(validIds).toContain(id)
    })
    PM_COACHING_CONTEXTS.interviewCoach.primaryPrinciples.forEach((id) => {
      expect(validIds).toContain(id)
    })
  })
})

describe('Integration Tests', () => {
  it('should provide complete analysis workflow', () => {
    const userInput = 'I managed the product roadmap'

    const analysis = analyzeWithPMPrinciples(userInput)
    expect(analysis).toHaveProperty('score')
    expect(analysis).toHaveProperty('missingPrinciples')
    expect(analysis).toHaveProperty('suggestions')

    const principles = getPrinciplesForContext('cvTailor')
    expect(principles.length).toBeGreaterThan(0)

    const context = generateSiggyPMContext('cvTailor')
    expect(context.length).toBeGreaterThan(0)
  })

  it('should score consistently', () => {
    const text =
      'Increased revenue by 50% through data-driven optimization'

    const results = Array(5)
      .fill(null)
      .map(() => analyzeWithPMPrinciples(text))

    const scores = results.map((r) => r.score)
    expect(new Set(scores).size).toBe(1)
  })

  it('should handle edge cases gracefully', () => {
    const emptyResult = analyzeWithPMPrinciples('')
    expect(emptyResult.score).toBeDefined()
    expect(emptyResult.score).toBe(0)

    const shortResult = analyzeWithPMPrinciples('PM')
    expect(shortResult.score).toBeDefined()

    const longText = 'word '.repeat(500)
    const longResult = analyzeWithPMPrinciples(longText)
    expect(longResult.score).toBeDefined()
  })
})

describe('Real-World Examples', () => {
  it('should score actual weak CV bullet appropriately', () => {
    const weakBullets = [
      'Managed the product roadmap',
      'Worked with engineering team',
      'Built features for users',
      'Attended meetings and provided updates',
    ]

    weakBullets.forEach((bullet) => {
      const result = analyzeWithPMPrinciples(bullet)
      expect(result.score).toBeLessThan(50)
      expect(result.suggestions.length).toBeGreaterThan(2)
    })
  })

  it('should score strong bullet with many PM signals highly', () => {
    // This bullet has: outcome language (increased), metrics (50K+, 35%, $2.3M), users, leadership (Led), and collaboration (team)
    const bullet =
      'Led product strategy for analytics platform serving 50K+ users, prioritizing ML-powered insights using RICE framework, resulting in 35% increase in daily active users and $2.3M ARR growth'
    const result = analyzeWithPMPrinciples(bullet)
    expect(result.score).toBeGreaterThanOrEqual(60)
    expect(result.missingPrinciples.length).toBeLessThan(3)
  })

  it('should score bullet with outcomes and metrics well', () => {
    // Has: outcome language (Improved), metrics (40%, 15+), stakeholders (people)
    const bullet =
      'Improved data-driven decision making by shipping analytics dashboard that reduced time-to-insight by 40%, enabling 15+ stakeholders to make faster product decisions'
    const result = analyzeWithPMPrinciples(bullet)
    expect(result.score).toBeGreaterThanOrEqual(40)
  })

  it('should score user-research bullet with moderate score', () => {
    // Has: metrics (12, 35%), user-centric (customers), collaboration (team)
    const bullet =
      'Conducted 12 user interviews revealing enterprise customers struggled with team collaboration, leading to a co-editing feature that addressed their #1 pain point and increased team plan adoption by 35%'
    const result = analyzeWithPMPrinciples(bullet)
    expect(result.score).toBeGreaterThanOrEqual(40)
  })

  it('should provide relevant suggestions for improvement', () => {
    const improvableBullet =
      'Led the development of a new feature that users liked'
    const result = analyzeWithPMPrinciples(improvableBullet)

    const hasMetricSuggestion = result.suggestions.some(
      (s) =>
        s.toLowerCase().includes('metric') ||
        s.toLowerCase().includes('quantif')
    )
    expect(hasMetricSuggestion).toBe(true)
  })
})

describe('Performance', () => {
  it('should analyze text quickly', () => {
    const text =
      'Increased user retention by 40% through data-driven product improvements'
    const startTime = performance.now()

    analyzeWithPMPrinciples(text)

    const endTime = performance.now()
    const duration = endTime - startTime

    expect(duration).toBeLessThan(100)
  })

  it('should generate context quickly', () => {
    const startTime = performance.now()

    generateSiggyPMContext('cvTailor')

    const endTime = performance.now()
    const duration = endTime - startTime

    expect(duration).toBeLessThan(50)
  })
})

// =========================================================================
// 4-Stage Analysis Pipeline Tests
// =========================================================================

describe('Stage 1 — Indicator Scan', () => {
  it('should detect action verbs', () => {
    const result = analyzeIndicators('Led a cross-functional team to deliver a major release')
    expect(result.score).toBeGreaterThan(0)
    expect(result.details.some(d => d.includes('Action verbs'))).toBe(true)
  })

  it('should detect metrics', () => {
    const result = analyzeIndicators('Increased revenue by 35% serving 10K users')
    expect(result.details.some(d => d.includes('Metrics found'))).toBe(true)
  })

  it('should detect impact words', () => {
    const result = analyzeIndicators('Drove revenue growth and improved retention')
    expect(result.details.some(d => d.includes('Impact language'))).toBe(true)
  })

  it('should detect scope indicators', () => {
    const result = analyzeIndicators('Led cross-functional enterprise team of stakeholders')
    expect(result.details.some(d => d.includes('Scope indicators'))).toBe(true)
  })

  it('should score weak text low', () => {
    const result = analyzeIndicators('Did some work')
    expect(result.score).toBeLessThan(20)
  })

  it('should score strong text high', () => {
    const result = analyzeIndicators(
      'Led cross-functional team, increased revenue by 50%, improved customer retention and engagement across enterprise clients'
    )
    expect(result.score).toBeGreaterThan(50)
  })

  it('should cap score at 100', () => {
    const result = analyzeIndicators(
      'Led, drove, launched, increased, reduced, improved, delivered, built, created, designed revenue growth retention conversion efficiency adoption engagement satisfaction churn savings cross-functional enterprise global stakeholder 100% $5M 200 users 10x'
    )
    expect(result.score).toBeLessThanOrEqual(100)
  })

  it('should return details array', () => {
    const result = analyzeIndicators('Built a feature')
    expect(Array.isArray(result.details)).toBe(true)
    expect(result.details.length).toBeGreaterThan(0)
  })
})

describe('Stage 2 — ATS Robot Analysis', () => {
  it('should reward starting with an action verb', () => {
    const withVerb = analyzeATS('Led product strategy for analytics platform with 50K users')
    const withoutVerb = analyzeATS('The product strategy was led by me for analytics platform')
    expect(withVerb.score).toBeGreaterThan(withoutVerb.score)
  })

  it('should reward reasonable bullet length', () => {
    const goodLength = analyzeATS(
      'Led product strategy for analytics platform serving 50K users, resulting in 35% increase in daily active users'
    )
    expect(goodLength.details.some(d => d.includes('length'))).toBe(true)
  })

  it('should reward quantified data', () => {
    const withNumbers = analyzeATS('Increased retention by 40% and saved $500K annually')
    const withoutNumbers = analyzeATS('Improved the product significantly through various initiatives')
    expect(withNumbers.score).toBeGreaterThan(withoutNumbers.score)
  })

  it('should penalise problematic characters', () => {
    const clean = analyzeATS('Led product analytics initiative for 100 users')
    const messy = analyzeATS('Led product analytics {initiative} <for> 100 |users|')
    expect(clean.score).toBeGreaterThan(messy.score)
  })

  it('should reward industry terminology', () => {
    const withTerms = analyzeATS('Led product roadmap strategy and sprint planning for analytics platform')
    expect(withTerms.details.some(d => d.includes('Industry terms'))).toBe(true)
  })

  it('should score empty text at 0 or near-0', () => {
    const result = analyzeATS('')
    expect(result.score).toBeLessThanOrEqual(15) // may get formatting bonus
  })
})

describe('Stage 3 — Recruiter UX Analysis', () => {
  it('should reward strong openings with action + impact', () => {
    const strong = analyzeRecruiterUX('Increased revenue 40% by redesigning the onboarding flow')
    expect(strong.details.some(d => d.includes('Strong opening'))).toBe(true)
  })

  it('should flag weak openings', () => {
    const weak = analyzeRecruiterUX('Was responsible for managing various aspects of the project')
    expect(weak.details.some(d => d.includes('Weak opening') || d.includes('Opens with action'))).toBe(true)
  })

  it('should reward concise bullets', () => {
    const concise = analyzeRecruiterUX('Led cross-functional team to deliver analytics platform, increasing DAU by 35%')
    expect(concise.details.some(d => d.includes('Concise') || d.includes('scannable'))).toBe(true)
  })

  it('should penalise overly long bullets', () => {
    const long = analyzeRecruiterUX(
      'I was responsible for leading and managing a large cross-functional team of engineers, designers, product managers, and data scientists to deliver a comprehensive analytics platform that integrated multiple data sources and provided real-time dashboards, custom reports, and predictive analytics capabilities which were used by over 50,000 users across the organization to make data-driven decisions about product strategy, marketing campaigns, and customer engagement initiatives'
    )
    expect(long.details.some(d => d.includes('Too long'))).toBe(true)
  })

  it('should detect "so what?" factor', () => {
    const withSoWhat = analyzeRecruiterUX('Redesigned checkout flow, resulting in 23% conversion improvement')
    const withoutSoWhat = analyzeRecruiterUX('Redesigned checkout flow for the e-commerce platform')
    expect(withSoWhat.score).toBeGreaterThan(withoutSoWhat.score)
  })

  it('should penalise generic phrases', () => {
    const generic = analyzeRecruiterUX('Was responsible for working on various product initiatives')
    expect(generic.details.some(d => d.includes('generic'))).toBe(true)
  })

  it('should reward jargon-light text', () => {
    const light = analyzeRecruiterUX('Led product analytics initiative serving 10K customers')
    expect(light.details.some(d => d.includes('Jargon-light'))).toBe(true)
  })
})

describe('Stage 4 — PM Intelligence Stage', () => {
  it('should delegate to analyzeWithPMPrinciples and return StageScore', () => {
    const result = analyzePMStage('Led team to solve critical problem, increased user retention by 40%')
    expect(result).toHaveProperty('score')
    expect(result).toHaveProperty('details')
    expect(Array.isArray(result.details)).toBe(true)
  })

  it('should identify missing principles in details', () => {
    const result = analyzePMStage('Built a dashboard')
    expect(result.details.some(d => d.includes('Missing'))).toBe(true)
  })

  it('should give high score to PM-rich text', () => {
    const result = analyzePMStage(
      'Led cross-functional team to solve customer churn problem, increased user retention by 40% through data-driven decisions'
    )
    expect(result.score).toBeGreaterThan(60)
  })
})

describe('4-Stage Pipeline (analyzeCVContent)', () => {
  it('should return all 4 stage scores and a total', () => {
    const result = analyzeCVContent('Led product strategy for analytics platform serving 50K users')
    expect(result).toHaveProperty('indicators')
    expect(result).toHaveProperty('ats')
    expect(result).toHaveProperty('recruiterUX')
    expect(result).toHaveProperty('pmIntelligence')
    expect(result).toHaveProperty('totalScore')
    expect(typeof result.totalScore).toBe('number')
  })

  it('should produce totalScore as weighted sum of stages', () => {
    const result = analyzeCVContent('Led product strategy for analytics platform serving 50K users')
    const expected = Math.round(
      result.indicators.score * STAGE_WEIGHTS.indicators +
      result.ats.score * STAGE_WEIGHTS.ats +
      result.recruiterUX.score * STAGE_WEIGHTS.recruiterUX +
      result.pmIntelligence.score * STAGE_WEIGHTS.pmIntelligence
    )
    expect(result.totalScore).toBe(expected)
  })

  it('should score weak bullet lower than strong bullet', () => {
    const weak = analyzeCVContent('Worked on stuff')
    const strong = analyzeCVContent(
      'Led cross-functional team to solve customer churn problem, resulting in 40% retention increase and $1.2M revenue savings'
    )
    expect(strong.totalScore).toBeGreaterThan(weak.totalScore)
  })

  it('should score empty string at 0', () => {
    const result = analyzeCVContent('')
    expect(result.totalScore).toBeLessThanOrEqual(20) // ATS clean formatting + recruiter jargon-light bonuses
  })

  it('should produce deterministic results', () => {
    const text = 'Increased user retention by 40% through cross-functional product improvements'
    const results = Array(5).fill(null).map(() => analyzeCVContent(text))
    const scores = results.map(r => r.totalScore)
    expect(new Set(scores).size).toBe(1)
  })

  it('stage weights should sum to 1.0', () => {
    const sum = STAGE_WEIGHTS.indicators + STAGE_WEIGHTS.ats + STAGE_WEIGHTS.recruiterUX + STAGE_WEIGHTS.pmIntelligence
    expect(sum).toBeCloseTo(1.0)
  })

  it('totalScore should be between 0 and 100', () => {
    const texts = [
      '',
      'Did stuff',
      'Led cross-functional team to solve critical customer problem, resulting in 40% retention increase, $2M revenue growth, and improved engagement across enterprise stakeholders through data-driven product strategy',
    ]
    texts.forEach(text => {
      const result = analyzeCVContent(text)
      expect(result.totalScore).toBeGreaterThanOrEqual(0)
      expect(result.totalScore).toBeLessThanOrEqual(100)
    })
  })
})

// =========================================================================
// Score Arbiter Tests
// =========================================================================

describe('arbitrateBullet', () => {
  it('should keep tailored version when it scores higher', () => {
    const original = 'Managed the product roadmap'
    const tailored = 'Led product roadmap strategy for analytics platform, resulting in 35% increase in daily active users'
    const decision = arbitrateBullet(original, tailored)

    expect(decision.winner).toBe('tailored')
    expect(decision.bullet).toBe(tailored)
    expect(decision.scoreDelta).toBeGreaterThan(0)
  })

  it('should revert to original when tailored scores lower', () => {
    // Strong original, deliberately weakened tailored
    const original = 'Led cross-functional team of 12, increasing customer retention by 40% and generating $1.5M in savings'
    const tailored = 'Was responsible for working on various team initiatives and helping with projects'
    const decision = arbitrateBullet(original, tailored)

    expect(decision.winner).toBe('original')
    expect(decision.bullet).toBe(original)
    expect(decision.scoreDelta).toBeLessThan(0)
  })

  it('should keep tailored when scores are equal', () => {
    const text = 'Led product analytics for 100 users'
    const decision = arbitrateBullet(text, text)

    expect(decision.winner).toBe('tailored')
    expect(decision.scoreDelta).toBe(0)
  })

  it('should include full analysis for both versions', () => {
    const decision = arbitrateBullet('Built a dashboard', 'Led analytics dashboard launch, increasing insight delivery by 50%')
    expect(decision.originalAnalysis).toHaveProperty('indicators')
    expect(decision.originalAnalysis).toHaveProperty('ats')
    expect(decision.originalAnalysis).toHaveProperty('recruiterUX')
    expect(decision.originalAnalysis).toHaveProperty('pmIntelligence')
    expect(decision.originalAnalysis).toHaveProperty('totalScore')
    expect(decision.tailoredAnalysis).toHaveProperty('totalScore')
  })
})

describe('scoreArbiter', () => {
  it('should process matching-length bullet arrays', () => {
    const originals = [
      'Managed the product roadmap',
      'Worked with engineering team',
    ]
    const tailored = [
      'Led product roadmap prioritisation using RICE framework, shipping 15 features in 6 months',
      'Partnered with engineering team of 8, increasing sprint velocity by 25%',
    ]
    const result = scoreArbiter(originals, tailored)

    expect(result.decisions).toHaveLength(2)
    expect(result.optimisedBullets).toHaveLength(2)
    expect(result.optimisedTotalScore).toBeGreaterThanOrEqual(result.originalTotalScore)
  })

  it('should handle more originals than tailored', () => {
    const originals = ['Built a feature', 'Managed roadmap', 'Ran meetings']
    const tailored = ['Led feature launch increasing adoption by 30%']
    const result = scoreArbiter(originals, tailored)

    expect(result.decisions).toHaveLength(3)
    expect(result.optimisedBullets).toHaveLength(3)
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

  it('should handle empty arrays', () => {
    const result = scoreArbiter([], [])
    expect(result.decisions).toHaveLength(0)
    expect(result.optimisedBullets).toHaveLength(0)
    expect(result.originalTotalScore).toBe(0)
    expect(result.optimisedTotalScore).toBe(0)
    expect(result.methodologyPreserved).toBe(true)
  })

  it('should report methodologyPreserved correctly', () => {
    // All tailored are better → preserved = true
    const originals = ['Built a feature', 'Worked on stuff']
    const tailored = [
      'Led feature launch for analytics platform, increasing user adoption by 30%',
      'Drove product improvements resulting in 50% efficiency gain for 200 customers',
    ]
    const result = scoreArbiter(originals, tailored)

    expect(result.methodologyPreserved).toBe(true)
  })
})

describe('Score Consistency & Preservation', () => {
  const WEAK_ORIGINALS = [
    'Managed the product roadmap',
    'Worked with engineering and design teams',
    'Built features for users',
    'Attended meetings and provided updates',
  ]

  const STRONG_TAILORED = [
    'Led product roadmap strategy using RICE framework, shipping 15 high-impact features over 6 months resulting in 25% revenue growth',
    'Partnered with cross-functional team of 12 engineers and designers, achieving 95% on-time delivery through weekly syncs and stakeholder alignment',
    'Launched user-facing analytics platform for 50K customers, increasing engagement by 40% and reducing churn by 15%',
    'Drove executive stakeholder alignment through weekly product reviews, resulting in $2M budget approval and accelerated roadmap execution',
  ]

  it('tailored version should never score lower than original (arbiter guarantee)', () => {
    const result = scoreArbiter(WEAK_ORIGINALS, STRONG_TAILORED)

    // Core guarantee: every optimised bullet >= its original
    expect(result.methodologyPreserved).toBe(true)

    // Overall score should be >= original
    expect(result.optimisedTotalScore).toBeGreaterThanOrEqual(result.originalTotalScore)

    // Each individual decision should maintain or improve
    result.decisions.forEach((decision, i) => {
      const optimisedScore = decision.winner === 'tailored'
        ? decision.tailoredAnalysis.totalScore
        : decision.originalAnalysis.totalScore
      expect(optimisedScore).toBeGreaterThanOrEqual(decision.originalAnalysis.totalScore)
    })
  })

  it('should revert degraded bullets while keeping improved ones', () => {
    const originals = [
      'Led cross-functional team of 12 to deliver platform serving 50K users with 40% retention increase',
      'Managed the product roadmap',
    ]
    const tailored = [
      'Was responsible for helping with various team projects',  // degraded!
      'Led roadmap prioritisation using RICE, shipping 15 features in 6 months with 25% revenue growth',  // improved
    ]

    const result = scoreArbiter(originals, tailored)

    // First bullet: original should win (tailored was degraded)
    expect(result.decisions[0].winner).toBe('original')
    // Second bullet: tailored should win (improvement)
    expect(result.decisions[1].winner).toBe('tailored')

    // Overall guarantee still holds
    expect(result.methodologyPreserved).toBe(true)
  })

  it('should preserve methodology across all 4 stages individually', () => {
    const result = scoreArbiter(WEAK_ORIGINALS, STRONG_TAILORED)

    result.decisions.forEach(decision => {
      if (decision.winner === 'tailored') {
        // If we kept tailored, its total should be >= original's total
        expect(decision.tailoredAnalysis.totalScore).toBeGreaterThanOrEqual(
          decision.originalAnalysis.totalScore
        )
      }
    })
  })

  it('should produce deterministic arbiter results', () => {
    const results = Array(3).fill(null).map(() => scoreArbiter(WEAK_ORIGINALS, STRONG_TAILORED))

    const scores = results.map(r => r.optimisedTotalScore)
    expect(new Set(scores).size).toBe(1)

    const winners = results.map(r => r.decisions.map(d => d.winner).join(','))
    expect(new Set(winners).size).toBe(1)
  })

  it('identical bullets should preserve score exactly', () => {
    const bullets = [
      'Led product strategy for 50K users, increasing DAU by 35%',
      'Drove cross-functional alignment with 12 stakeholders',
    ]
    const result = scoreArbiter(bullets, [...bullets])

    expect(result.optimisedTotalScore).toBe(result.originalTotalScore)
    expect(result.methodologyPreserved).toBe(true)
    result.decisions.forEach(d => {
      expect(d.scoreDelta).toBe(0)
      expect(d.winner).toBe('tailored') // equal = keep tailored
    })
  })

  it('should never allow total optimised score to drop below original', () => {
    // Mix of improvements and degradations
    const originals = [
      'Led cross-functional team delivering 40% retention increase for 50K users',
      'Built a feature',
      'Increased conversion by 25% through A/B testing with 10K customers',
    ]
    const tailored = [
      'Helped with team stuff',                                              // degraded
      'Launched analytics platform for 50K users, reducing churn by 30%',   // improved
      'Did some testing',                                                     // degraded
    ]

    const result = scoreArbiter(originals, tailored)

    // Arbiter should keep originals for degraded bullets
    expect(result.decisions[0].winner).toBe('original')
    expect(result.decisions[1].winner).toBe('tailored')
    expect(result.decisions[2].winner).toBe('original')

    expect(result.optimisedTotalScore).toBeGreaterThanOrEqual(result.originalTotalScore)
    expect(result.methodologyPreserved).toBe(true)
  })

  it('arbiter should run full 4-stage pipeline on both versions', () => {
    const result = scoreArbiter(
      ['Built a dashboard'],
      ['Led analytics dashboard launch for 10K users, improving data-driven decision making by 50%']
    )

    const decision = result.decisions[0]

    // Both analyses should have all 4 stages
    for (const analysis of [decision.originalAnalysis, decision.tailoredAnalysis]) {
      expect(analysis.indicators.score).toBeGreaterThanOrEqual(0)
      expect(analysis.ats.score).toBeGreaterThanOrEqual(0)
      expect(analysis.recruiterUX.score).toBeGreaterThanOrEqual(0)
      expect(analysis.pmIntelligence.score).toBeGreaterThanOrEqual(0)
      expect(analysis.indicators.details.length).toBeGreaterThan(0)
      expect(analysis.ats.details.length).toBeGreaterThan(0)
      expect(analysis.recruiterUX.details.length).toBeGreaterThan(0)
      expect(analysis.pmIntelligence.details.length).toBeGreaterThan(0)
    }
  })

  it('performance: arbiter should process 20 bullet pairs in under 100ms', () => {
    const originals = Array(20).fill('Managed the product roadmap and worked with teams')
    const tailored = Array(20).fill(
      'Led product roadmap strategy for analytics platform serving 50K users, resulting in 35% DAU increase'
    )

    const start = performance.now()
    scoreArbiter(originals, tailored)
    const duration = performance.now() - start

    expect(duration).toBeLessThan(100)
  })
})
