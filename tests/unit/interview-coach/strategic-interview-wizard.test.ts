/**
 * Strategic Interview Wizard Tests — RALPH Structure
 *
 * R — Requirements: extractInterviewerValues, prepareInterviewSession,
 *                   calculatePersonalityDifficulty return correct structures
 * A — Analysis: values extraction accuracy, question theme prioritization,
 *               gap hunting targeting, scoring mode determination
 * L — Logic: LinkedIn analysis, narrative anchor derivation, personality
 *            difficulty multiplier, session brief generation
 * P — Preservation: different inputs produce different outputs, consistency
 * H — Hardening: edge cases, empty inputs, boundary values
 */

import { describe, it, expect } from 'vitest'
import {
  extractInterviewerValues,
  prepareInterviewSession,
  calculatePersonalityDifficulty,
  type NarrativeProfile,
} from '@/lib/ai/siggy-integration-guide'
import {
  DEFAULT_PERSONALITY,
  type StrategicWizardConfig,
  type InterviewerPersonality,
} from '@/types/interview'

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

const SAMPLE_LINKEDIN = `
Product leader with 12 years of experience driving data-driven decisions and scaling
engineering teams. Passionate about building customer-centric products and fostering
inclusive, diverse teams. Previously led growth strategy at fast-paced startups,
focused on metrics, experimentation, and revenue growth. I believe in collaborative
leadership and mentoring the next generation of product managers.
`

const MINIMAL_LINKEDIN = 'Engineering manager at a startup focused on growth and data'

const SAMPLE_CV_BULLETS = [
  'Led product roadmap strategy for enterprise platform',
  'Partnered with cross-functional team of 12 engineers',
  'Launched analytics platform for 50K customers',
  'Drove executive stakeholder alignment through product reviews',
]

const SAMPLE_JD = 'Looking for a Senior PM with roadmap planning, cross-functional leadership, and data-driven decisions'

function makeConfig(overrides: Partial<StrategicWizardConfig> = {}): StrategicWizardConfig {
  return {
    interviewType: 'hiring_manager',
    difficultyLevel: 'standard',
    personality: { ...DEFAULT_PERSONALITY },
    interviewMode: 'traditional',
    answerFormat: 'text',
    userEmphases: '',
    interviewerLinkedIn: '',
    extractedValues: null,
    ...overrides,
  }
}

// =========================================================================
// R — Requirements: return structure validation
// =========================================================================

describe('R — Requirements: extractInterviewerValues structure', () => {
  it('should return all required fields', () => {
    const result = extractInterviewerValues(SAMPLE_LINKEDIN)
    expect(result).toHaveProperty('inferredPriorities')
    expect(result).toHaveProperty('communicationStyle')
    expect(result).toHaveProperty('likelyQuestionThemes')
    expect(result).toHaveProperty('culturalSignals')
    expect(result).toHaveProperty('rawText')
  })

  it('inferredPriorities should be an array of strings', () => {
    const result = extractInterviewerValues(SAMPLE_LINKEDIN)
    expect(Array.isArray(result.inferredPriorities)).toBe(true)
    result.inferredPriorities.forEach(p => expect(typeof p).toBe('string'))
  })

  it('communicationStyle should be a non-empty string', () => {
    const result = extractInterviewerValues(SAMPLE_LINKEDIN)
    expect(typeof result.communicationStyle).toBe('string')
    expect(result.communicationStyle.length).toBeGreaterThan(0)
  })

  it('likelyQuestionThemes should be an array of strings', () => {
    const result = extractInterviewerValues(SAMPLE_LINKEDIN)
    expect(Array.isArray(result.likelyQuestionThemes)).toBe(true)
    result.likelyQuestionThemes.forEach(t => expect(typeof t).toBe('string'))
  })

  it('rawText should be the trimmed input', () => {
    const result = extractInterviewerValues(SAMPLE_LINKEDIN)
    expect(result.rawText).toBe(SAMPLE_LINKEDIN.trim())
  })
})

describe('R — Requirements: prepareInterviewSession structure', () => {
  it('should return all required fields', () => {
    const config = makeConfig()
    const result = prepareInterviewSession(config, null, [], '')
    expect(result).toHaveProperty('config')
    expect(result).toHaveProperty('narrativeAnchors')
    expect(result).toHaveProperty('prioritizedQuestionThemes')
    expect(result).toHaveProperty('gapHuntingTargets')
    expect(result).toHaveProperty('scoringMode')
    expect(result).toHaveProperty('sessionBrief')
  })

  it('config should be the same object passed in', () => {
    const config = makeConfig()
    const result = prepareInterviewSession(config, null, [], '')
    expect(result.config).toBe(config)
  })

  it('sessionBrief should be a non-empty string ending with period', () => {
    const config = makeConfig()
    const result = prepareInterviewSession(config, null, [], '')
    expect(result.sessionBrief.length).toBeGreaterThan(10)
    expect(result.sessionBrief.endsWith('.')).toBe(true)
  })
})

describe('R — Requirements: calculatePersonalityDifficulty structure', () => {
  it('should return a number', () => {
    const result = calculatePersonalityDifficulty(DEFAULT_PERSONALITY)
    expect(typeof result).toBe('number')
  })

  it('should return a value between 0.7 and 1.5', () => {
    const result = calculatePersonalityDifficulty(DEFAULT_PERSONALITY)
    expect(result).toBeGreaterThanOrEqual(0.7)
    expect(result).toBeLessThanOrEqual(1.5)
  })
})

// =========================================================================
// A — Analysis: extraction accuracy and prioritization
// =========================================================================

describe('A — Analysis: LinkedIn values extraction accuracy', () => {
  it('should detect data-driven priority from metrics/data keywords', () => {
    const result = extractInterviewerValues(SAMPLE_LINKEDIN)
    const priorities = result.inferredPriorities.map(p => p.toLowerCase())
    expect(priorities.some(p => p.includes('data'))).toBe(true)
  })

  it('should detect people-first priority from team/mentoring keywords', () => {
    const result = extractInterviewerValues(SAMPLE_LINKEDIN)
    const priorities = result.inferredPriorities.map(p => p.toLowerCase())
    expect(priorities.some(p => p.includes('people'))).toBe(true)
  })

  it('should detect growth priority from growth/revenue keywords', () => {
    const result = extractInterviewerValues(SAMPLE_LINKEDIN)
    const priorities = result.inferredPriorities.map(p => p.toLowerCase())
    expect(priorities.some(p => p.includes('growth'))).toBe(true)
  })

  it('should detect passionate communication style', () => {
    const result = extractInterviewerValues(SAMPLE_LINKEDIN)
    expect(result.communicationStyle.toLowerCase()).toContain('enthusiastic')
  })

  it('should detect diversity cultural signal', () => {
    const result = extractInterviewerValues(SAMPLE_LINKEDIN)
    expect(result.culturalSignals.some(s => s.toLowerCase().includes('diversity'))).toBe(true)
  })

  it('should detect fast-paced cultural signal', () => {
    const result = extractInterviewerValues(SAMPLE_LINKEDIN)
    expect(result.culturalSignals.some(s => s.toLowerCase().includes('fast-paced'))).toBe(true)
  })

  it('should generate question themes from top dimensions', () => {
    const result = extractInterviewerValues(SAMPLE_LINKEDIN)
    expect(result.likelyQuestionThemes.length).toBeGreaterThan(0)
    result.likelyQuestionThemes.forEach(q => {
      expect(q.length).toBeGreaterThan(5)
    })
  })

  it('should limit priorities to at most 4', () => {
    const result = extractInterviewerValues(SAMPLE_LINKEDIN)
    expect(result.inferredPriorities.length).toBeLessThanOrEqual(4)
  })
})

describe('A — Analysis: question theme prioritization', () => {
  it('user emphases should appear first in prioritized themes', () => {
    const config = makeConfig({
      userEmphases: 'My leadership experience, Revenue growth project',
    })
    const result = prepareInterviewSession(config, null, [], '')
    expect(result.prioritizedQuestionThemes[0]).toBe('My leadership experience')
    expect(result.prioritizedQuestionThemes[1]).toBe('Revenue growth project')
  })

  it('extracted values themes should appear after user emphases', () => {
    const values = extractInterviewerValues(SAMPLE_LINKEDIN)
    const config = makeConfig({
      userEmphases: 'My leadership',
      extractedValues: values,
    })
    const result = prepareInterviewSession(config, null, [], '')
    // First theme is user emphasis
    expect(result.prioritizedQuestionThemes[0]).toBe('My leadership')
    // Later themes should include extracted question themes
    expect(result.prioritizedQuestionThemes.length).toBeGreaterThan(1)
  })

  it('interview type fallback themes should be included', () => {
    const config = makeConfig({ interviewType: 'executive' })
    const result = prepareInterviewSession(config, null, [], '')
    const themes = result.prioritizedQuestionThemes.map(t => t.toLowerCase())
    expect(themes.some(t => t.includes('strategic') || t.includes('vision') || t.includes('business'))).toBe(true)
  })
})

describe('A — Analysis: scoring mode determination', () => {
  it('text answers should use content_only scoring', () => {
    const config = makeConfig({ answerFormat: 'text', interviewMode: 'traditional' })
    const result = prepareInterviewSession(config, null, [], '')
    expect(result.scoringMode).toBe('content_only')
  })

  it('voice answers should use content_and_delivery scoring', () => {
    const config = makeConfig({ answerFormat: 'voice', interviewMode: 'traditional' })
    const result = prepareInterviewSession(config, null, [], '')
    expect(result.scoringMode).toBe('content_and_delivery')
  })
})

// =========================================================================
// L — Logic: narrative anchors, gap hunting, personality
// =========================================================================

describe('L — Logic: narrative anchor derivation', () => {
  it('should derive anchors from narrative profile', () => {
    const config = makeConfig()
    const result = prepareInterviewSession(config, STRATEGIC_PROFILE, SAMPLE_CV_BULLETS, SAMPLE_JD)
    expect(result.narrativeAnchors.length).toBeGreaterThan(0)
  })

  it('anchors should include target role', () => {
    const config = makeConfig()
    const result = prepareInterviewSession(config, STRATEGIC_PROFILE, SAMPLE_CV_BULLETS, SAMPLE_JD)
    expect(result.narrativeAnchors.some(a => a.includes('VP of Product'))).toBe(true)
  })

  it('anchors should include core strength', () => {
    const config = makeConfig()
    const result = prepareInterviewSession(config, STRATEGIC_PROFILE, SAMPLE_CV_BULLETS, SAMPLE_JD)
    expect(result.narrativeAnchors.some(a => a.toLowerCase().includes('strategic'))).toBe(true)
  })

  it('anchors should include desired brand when set', () => {
    const config = makeConfig()
    const result = prepareInterviewSession(config, STRATEGIC_PROFILE, SAMPLE_CV_BULLETS, SAMPLE_JD)
    expect(result.narrativeAnchors.some(a => a.includes('Brand:'))).toBe(true)
  })

  it('should have no anchors when narrative profile is null', () => {
    const config = makeConfig()
    const result = prepareInterviewSession(config, null, SAMPLE_CV_BULLETS, SAMPLE_JD)
    expect(result.narrativeAnchors).toHaveLength(0)
  })
})

describe('L — Logic: gap hunting targets', () => {
  it('should identify gap targets from narrative analysis', () => {
    const config = makeConfig()
    const result = prepareInterviewSession(config, STRATEGIC_PROFILE, SAMPLE_CV_BULLETS, SAMPLE_JD)
    expect(result.gapHuntingTargets.length).toBeGreaterThan(0)
  })

  it('should have no gap targets without narrative profile', () => {
    const config = makeConfig()
    const result = prepareInterviewSession(config, null, SAMPLE_CV_BULLETS, SAMPLE_JD)
    expect(result.gapHuntingTargets).toHaveLength(0)
  })

  it('should have no gap targets without CV bullets', () => {
    const config = makeConfig()
    const result = prepareInterviewSession(config, STRATEGIC_PROFILE, [], SAMPLE_JD)
    expect(result.gapHuntingTargets).toHaveLength(0)
  })
})

describe('L — Logic: personality difficulty multiplier', () => {
  it('high intensity + directness should increase difficulty', () => {
    const intense: InterviewerPersonality = { warmth: 20, directness: 90, intensity: 90, technicalDepth: 70, paceSpeed: 85 }
    const result = calculatePersonalityDifficulty(intense)
    expect(result).toBeGreaterThan(1.0)
  })

  it('high warmth should decrease difficulty', () => {
    const warm: InterviewerPersonality = { warmth: 95, directness: 20, intensity: 20, technicalDepth: 30, paceSpeed: 25 }
    const result = calculatePersonalityDifficulty(warm)
    expect(result).toBeLessThan(1.0)
  })

  it('default personality should be near 1.0', () => {
    const result = calculatePersonalityDifficulty(DEFAULT_PERSONALITY)
    expect(result).toBeGreaterThanOrEqual(0.85)
    expect(result).toBeLessThanOrEqual(1.15)
  })

  it('extreme aggression should be capped at 1.5', () => {
    const maxAggro: InterviewerPersonality = { warmth: 0, directness: 100, intensity: 100, technicalDepth: 100, paceSpeed: 100 }
    const result = calculatePersonalityDifficulty(maxAggro)
    expect(result).toBeLessThanOrEqual(1.5)
  })

  it('extreme warmth should be floored at 0.7', () => {
    const maxWarm: InterviewerPersonality = { warmth: 100, directness: 0, intensity: 0, technicalDepth: 0, paceSpeed: 0 }
    const result = calculatePersonalityDifficulty(maxWarm)
    expect(result).toBeGreaterThanOrEqual(0.7)
  })
})

describe('L — Logic: session brief content', () => {
  it('should mention interview type in brief', () => {
    const config = makeConfig({ interviewType: 'executive' })
    const result = prepareInterviewSession(config, null, [], '')
    expect(result.sessionBrief.toLowerCase()).toContain('executive')
  })

  it('should mention difficulty level in brief', () => {
    const config = makeConfig({ difficultyLevel: 'senior' })
    const result = prepareInterviewSession(config, null, [], '')
    expect(result.sessionBrief.toLowerCase()).toContain('senior')
  })

  it('should mention conversational mode when selected', () => {
    const config = makeConfig({ interviewMode: 'conversational' })
    const result = prepareInterviewSession(config, null, [], '')
    expect(result.sessionBrief.toLowerCase()).toContain('conversational')
  })

  it('should mention interviewer values when extracted', () => {
    const values = extractInterviewerValues(SAMPLE_LINKEDIN)
    const config = makeConfig({ extractedValues: values })
    const result = prepareInterviewSession(config, null, [], '')
    expect(result.sessionBrief.toLowerCase()).toContain('interviewer values')
  })

  it('high intensity personality should mention pressure in brief', () => {
    const config = makeConfig({
      personality: { warmth: 20, directness: 80, intensity: 85, technicalDepth: 60, paceSpeed: 70 },
    })
    const result = prepareInterviewSession(config, null, [], '')
    expect(result.sessionBrief.toLowerCase()).toContain('high-pressure')
  })
})

// =========================================================================
// P — Preservation: different inputs produce different outputs
// =========================================================================

describe('P — Preservation: differentiation', () => {
  it('different LinkedIn texts should produce different priorities', () => {
    const r1 = extractInterviewerValues('Focused on engineering scalability and system architecture')
    const r2 = extractInterviewerValues('Passionate about user research and customer experience')
    expect(r1.inferredPriorities).not.toEqual(r2.inferredPriorities)
  })

  it('different interview types should produce different fallback themes', () => {
    const config1 = makeConfig({ interviewType: 'technical' })
    const config2 = makeConfig({ interviewType: 'hr_screening' })
    const r1 = prepareInterviewSession(config1, null, [], '')
    const r2 = prepareInterviewSession(config2, null, [], '')
    expect(r1.prioritizedQuestionThemes).not.toEqual(r2.prioritizedQuestionThemes)
  })

  it('with vs without narrative profile should produce different anchor counts', () => {
    const config = makeConfig()
    const r1 = prepareInterviewSession(config, STRATEGIC_PROFILE, SAMPLE_CV_BULLETS, SAMPLE_JD)
    const r2 = prepareInterviewSession(config, null, SAMPLE_CV_BULLETS, SAMPLE_JD)
    expect(r1.narrativeAnchors.length).toBeGreaterThan(r2.narrativeAnchors.length)
  })
})

// =========================================================================
// H — Hardening: edge cases
// =========================================================================

describe('H — Hardening: edge cases', () => {
  it('extractInterviewerValues should handle empty string', () => {
    const result = extractInterviewerValues('')
    expect(result.inferredPriorities).toHaveLength(0)
    expect(result.communicationStyle).toBe('Unknown')
    expect(result.likelyQuestionThemes).toHaveLength(0)
    expect(result.rawText).toBe('')
  })

  it('extractInterviewerValues should handle whitespace-only input', () => {
    const result = extractInterviewerValues('   ')
    expect(result.inferredPriorities).toHaveLength(0)
  })

  it('extractInterviewerValues should handle very short text', () => {
    const result = extractInterviewerValues('PM at startup')
    expect(typeof result.communicationStyle).toBe('string')
  })

  it('prepareInterviewSession should handle empty CV and JD', () => {
    const config = makeConfig()
    const result = prepareInterviewSession(config, STRATEGIC_PROFILE, [], '')
    expect(typeof result.sessionBrief).toBe('string')
    expect(result.gapHuntingTargets).toHaveLength(0)
  })

  it('prepareInterviewSession should handle empty user emphases', () => {
    const config = makeConfig({ userEmphases: '' })
    const result = prepareInterviewSession(config, null, [], '')
    // Should still have fallback themes from interview type
    expect(result.prioritizedQuestionThemes.length).toBeGreaterThan(0)
  })

  it('calculatePersonalityDifficulty should handle all-zero personality', () => {
    const allZero: InterviewerPersonality = { warmth: 0, directness: 0, intensity: 0, technicalDepth: 0, paceSpeed: 0 }
    const result = calculatePersonalityDifficulty(allZero)
    expect(result).toBeGreaterThanOrEqual(0.7)
    expect(result).toBeLessThanOrEqual(1.5)
  })

  it('calculatePersonalityDifficulty should handle all-100 personality', () => {
    const allMax: InterviewerPersonality = { warmth: 100, directness: 100, intensity: 100, technicalDepth: 100, paceSpeed: 100 }
    const result = calculatePersonalityDifficulty(allMax)
    expect(result).toBeGreaterThanOrEqual(0.7)
    expect(result).toBeLessThanOrEqual(1.5)
  })

  it('user emphases with separators should be split correctly', () => {
    const config = makeConfig({
      userEmphases: 'Leadership; Revenue growth, Technical depth\nTeam building',
    })
    const result = prepareInterviewSession(config, null, [], '')
    expect(result.prioritizedQuestionThemes.includes('Leadership')).toBe(true)
    expect(result.prioritizedQuestionThemes.includes('Revenue growth')).toBe(true)
  })

  it('extractInterviewerValues should detect no cultural signals for generic text', () => {
    const result = extractInterviewerValues('A product manager who works with teams on features and projects')
    // Should have a fallback signal
    expect(result.culturalSignals.length).toBeGreaterThan(0)
    expect(result.culturalSignals[0]).toBe('Professional and balanced')
  })

  it('should handle all 5 interview types without error', () => {
    const types = ['hr_screening', 'hiring_manager', 'technical', 'executive', 'peer'] as const
    types.forEach(type => {
      const config = makeConfig({ interviewType: type })
      const result = prepareInterviewSession(config, null, [], '')
      expect(result.prioritizedQuestionThemes.length).toBeGreaterThan(0)
    })
  })
})
