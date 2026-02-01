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
