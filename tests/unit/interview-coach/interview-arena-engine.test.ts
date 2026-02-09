/**
 * Interview Arena & Interaction Engine Tests — RALPH Structure
 *
 * R — Requirements: extractVoiceMetadata, computeDeliveryMetrics,
 *                   detectResponseSeniority, analyzeResponseWithHunterLogic,
 *                   generateHunterFollowUp, buildCharacterGuardrails,
 *                   generateArenaQuestions return correct structures
 * A — Analysis: keyword matching, seniority detection, gap identification,
 *               delivery scoring, tone detection, follow-up generation
 * L — Logic: Hunter Logic cross-referencing, drill-down vs challenge vs pivot,
 *            guardrail enforcement, question distribution
 * P — Preservation: different inputs produce different outputs, consistency
 * H — Hardening: edge cases, empty inputs, boundary values
 */

import { describe, it, expect } from 'vitest'
import {
  extractVoiceMetadata,
  computeDeliveryMetrics,
  detectResponseSeniority,
  analyzeResponseWithHunterLogic,
  generateHunterFollowUp,
  buildCharacterGuardrails,
  generateArenaQuestions,
  prepareInterviewSession,
  type NarrativeProfile,
} from '@/lib/ai/siggy-integration-guide'
import {
  DEFAULT_PERSONALITY,
  FILLER_WORDS,
  HEDGING_PHRASES,
  POWER_WORDS,
  SENIORITY_SIGNALS,
  PERSONA_GUARDRAILS,
  type StrategicWizardConfig,
  type InterviewerPersonality,
  type HunterAnalysis,
  type CharacterGuardrails,
} from '@/types/interview'

// =========================================================================
// Shared fixtures
// =========================================================================

const STRONG_RESPONSE = `I led a cross-functional team of 15 engineers and designers to deliver our platform redesign,
which drove a 40% increase in user engagement. I architected the new feature prioritization framework
and spearheaded the migration from legacy systems, resulting in $2.5 million in cost savings.
I mentored 5 junior PMs and established our product analytics practice.`

const WEAK_RESPONSE = `Um, I'm not sure exactly what my role was, possibly I sort of helped with the project.
I would say I participated in some meetings and contributed to the discussions. It was kind of a team effort,
you know, basically we all worked together.`

const MEDIUM_RESPONSE = `I managed the product roadmap for our B2B platform, implementing several key features
that improved customer retention by 15%. I coordinated with engineering and design teams to deliver
on time and developed the analytics dashboard used by our sales team.`

const SAMPLE_PROFILE: NarrativeProfile = {
  targetRole: 'Senior Product Manager',
  seniorityLevel: 'senior',
  coreStrength: 'strategic-leadership',
  desiredBrand: 'Data-driven product leader who scales teams',
  industry: 'technology',
}

const SAMPLE_CONFIG: StrategicWizardConfig = {
  interviewType: 'product_sense',
  difficultyLevel: 'senior',
  personality: { ...DEFAULT_PERSONALITY, intensity: 60, directness: 65 },
  interviewMode: 'conversational',
  answerFormat: 'text',
  userEmphases: 'product strategy, cross-functional leadership',
  interviewerLinkedIn: '',
  extractedValues: null,
}

const TARGET_KEYWORDS = ['led', 'strategy', 'cross-functional', 'data-driven', 'roadmap', 'engagement']
const NARRATIVE_ANCHORS = ['product leadership', 'strategic thinking', 'team scaling']

// =========================================================================
// R — Requirements: Structure validation
// =========================================================================

describe('Interview Arena Engine — Requirements', () => {
  describe('extractVoiceMetadata', () => {
    it('should return complete metadata structure', () => {
      const meta = extractVoiceMetadata(STRONG_RESPONSE)
      expect(meta).toHaveProperty('rawText')
      expect(meta).toHaveProperty('wordCount')
      expect(meta).toHaveProperty('sentenceCount')
      expect(meta).toHaveProperty('avgWordsPerSentence')
      expect(meta).toHaveProperty('fillerWords')
      expect(meta).toHaveProperty('hedgingPhrases')
      expect(meta).toHaveProperty('powerWords')
      expect(meta).toHaveProperty('quantifiedResults')
    })

    it('should count words correctly', () => {
      const meta = extractVoiceMetadata('one two three four five')
      expect(meta.wordCount).toBe(5)
    })

    it('should count sentences correctly', () => {
      const meta = extractVoiceMetadata('First sentence. Second sentence! Third?')
      expect(meta.sentenceCount).toBe(3)
    })
  })

  describe('computeDeliveryMetrics', () => {
    it('should return complete delivery metrics structure', () => {
      const metrics = computeDeliveryMetrics(STRONG_RESPONSE)
      expect(metrics).toHaveProperty('wordsPerMinute')
      expect(metrics).toHaveProperty('confidenceScore')
      expect(metrics).toHaveProperty('detectedTone')
      expect(metrics).toHaveProperty('durationSeconds')
      expect(metrics).toHaveProperty('fillerWordCount')
    })

    it('should keep confidence score in 0-100 range', () => {
      const strong = computeDeliveryMetrics(STRONG_RESPONSE)
      const weak = computeDeliveryMetrics(WEAK_RESPONSE)
      expect(strong.confidenceScore).toBeGreaterThanOrEqual(0)
      expect(strong.confidenceScore).toBeLessThanOrEqual(100)
      expect(weak.confidenceScore).toBeGreaterThanOrEqual(0)
      expect(weak.confidenceScore).toBeLessThanOrEqual(100)
    })
  })

  describe('analyzeResponseWithHunterLogic', () => {
    it('should return complete HunterAnalysis structure', () => {
      const analysis = analyzeResponseWithHunterLogic(
        STRONG_RESPONSE, TARGET_KEYWORDS, NARRATIVE_ANCHORS, 'senior', 0, 3
      )
      expect(analysis).toHaveProperty('matchedKeywords')
      expect(analysis).toHaveProperty('missingKeywords')
      expect(analysis).toHaveProperty('detectedSeniority')
      expect(analysis).toHaveProperty('requiredSeniority')
      expect(analysis).toHaveProperty('gapDetected')
      expect(analysis).toHaveProperty('gapDescription')
      expect(analysis).toHaveProperty('action')
      expect(analysis).toHaveProperty('actionReason')
      expect(analysis).toHaveProperty('responseScore')
    })

    it('should keep responseScore in 0-100 range', () => {
      const analysis = analyzeResponseWithHunterLogic(
        STRONG_RESPONSE, TARGET_KEYWORDS, NARRATIVE_ANCHORS, 'senior', 0, 3
      )
      expect(analysis.responseScore).toBeGreaterThanOrEqual(0)
      expect(analysis.responseScore).toBeLessThanOrEqual(100)
    })
  })

  describe('generateArenaQuestions', () => {
    it('should return requested number of questions', () => {
      const session = prepareInterviewSession(SAMPLE_CONFIG, SAMPLE_PROFILE, ['Led team'], 'PM role')
      const questions = generateArenaQuestions(session, 6)
      expect(questions.length).toBeLessThanOrEqual(6)
      expect(questions.length).toBeGreaterThan(0)
    })

    it('should return questions with required structure', () => {
      const session = prepareInterviewSession(SAMPLE_CONFIG, SAMPLE_PROFILE, ['Led team'], 'PM role')
      const questions = generateArenaQuestions(session, 4)
      for (const q of questions) {
        expect(q).toHaveProperty('id')
        expect(q).toHaveProperty('question')
        expect(q).toHaveProperty('category')
        expect(q).toHaveProperty('targetKeywords')
        expect(q).toHaveProperty('expectedSeniority')
        expect(q).toHaveProperty('difficulty')
        expect(q).toHaveProperty('maxFollowUps')
      }
    })
  })
})

// =========================================================================
// A — Analysis: Detection accuracy
// =========================================================================

describe('Interview Arena Engine — Analysis', () => {
  describe('Filler word detection', () => {
    it('should detect filler words in weak response', () => {
      const meta = extractVoiceMetadata(WEAK_RESPONSE)
      expect(meta.fillerWords.length).toBeGreaterThan(0)
      expect(meta.fillerWords).toContain('um')
    })

    it('should detect no fillers in strong response', () => {
      const meta = extractVoiceMetadata(STRONG_RESPONSE)
      expect(meta.fillerWords.length).toBe(0)
    })
  })

  describe('Hedging phrase detection', () => {
    it('should detect hedging in weak response', () => {
      const meta = extractVoiceMetadata(WEAK_RESPONSE)
      expect(meta.hedgingPhrases.length).toBeGreaterThan(0)
    })

    it('should detect no hedging in strong response', () => {
      const meta = extractVoiceMetadata(STRONG_RESPONSE)
      expect(meta.hedgingPhrases.length).toBe(0)
    })
  })

  describe('Power word detection', () => {
    it('should detect power words in strong response', () => {
      const meta = extractVoiceMetadata(STRONG_RESPONSE)
      expect(meta.powerWords.length).toBeGreaterThan(3)
      expect(meta.powerWords).toContain('led')
      expect(meta.powerWords).toContain('architected')
      expect(meta.powerWords).toContain('spearheaded')
    })

    it('should detect no power words in weak response', () => {
      const meta = extractVoiceMetadata(WEAK_RESPONSE)
      expect(meta.powerWords.length).toBe(0)
    })
  })

  describe('Quantified results detection', () => {
    it('should detect numbers with context', () => {
      const meta = extractVoiceMetadata(STRONG_RESPONSE)
      expect(meta.quantifiedResults.length).toBeGreaterThan(0)
    })

    it('should detect percentage patterns', () => {
      const meta = extractVoiceMetadata('Improved conversion by 40% and grew team to 15 people')
      expect(meta.quantifiedResults.length).toBeGreaterThan(0)
    })
  })

  describe('Seniority detection', () => {
    it('should detect senior level from strong response', () => {
      const seniority = detectResponseSeniority(STRONG_RESPONSE)
      expect(['senior', 'executive']).toContain(seniority)
    })

    it('should detect entry-level signals', () => {
      const text = 'I learned a lot and assisted my manager. I helped with the project and supported the team.'
      const seniority = detectResponseSeniority(text)
      expect(seniority).toBe('junior')
    })

    it('should detect mid-level signals', () => {
      const seniority = detectResponseSeniority(MEDIUM_RESPONSE)
      expect(seniority).toBe('mid')
    })

    it('should return unknown for ambiguous text', () => {
      const seniority = detectResponseSeniority('The weather was nice that day.')
      expect(seniority).toBe('unknown')
    })
  })

  describe('Confidence scoring', () => {
    it('should give higher confidence to strong responses', () => {
      const strong = computeDeliveryMetrics(STRONG_RESPONSE)
      const weak = computeDeliveryMetrics(WEAK_RESPONSE)
      expect(strong.confidenceScore).toBeGreaterThan(weak.confidenceScore)
    })

    it('should detect tentative tone for weak responses', () => {
      const weak = computeDeliveryMetrics(WEAK_RESPONSE)
      expect(weak.detectedTone).toBe('tentative')
    })

    it('should detect assertive tone for strong responses', () => {
      const strong = computeDeliveryMetrics(STRONG_RESPONSE)
      expect(strong.detectedTone).toBe('assertive')
    })
  })
})

// =========================================================================
// L — Logic: Hunter Logic cross-referencing
// =========================================================================

describe('Interview Arena Engine — Logic', () => {
  describe('Hunter Logic keyword matching', () => {
    it('should find matched keywords in strong response', () => {
      const analysis = analyzeResponseWithHunterLogic(
        STRONG_RESPONSE, TARGET_KEYWORDS, NARRATIVE_ANCHORS, 'senior', 0, 3
      )
      expect(analysis.matchedKeywords.length).toBeGreaterThan(0)
      expect(analysis.matchedKeywords).toContain('led')
    })

    it('should identify missing keywords', () => {
      const analysis = analyzeResponseWithHunterLogic(
        'I did some work on the project.', TARGET_KEYWORDS, NARRATIVE_ANCHORS, 'senior', 0, 3
      )
      expect(analysis.missingKeywords.length).toBeGreaterThan(0)
    })
  })

  describe('Hunter Logic action selection', () => {
    it('should acknowledge strong responses', () => {
      const analysis = analyzeResponseWithHunterLogic(
        STRONG_RESPONSE, ['led', 'team'], NARRATIVE_ANCHORS, 'senior', 0, 3
      )
      expect(analysis.action).toBe('acknowledge')
    })

    it('should drill down on low keyword coverage', () => {
      const analysis = analyzeResponseWithHunterLogic(
        'I worked on things.', TARGET_KEYWORDS, NARRATIVE_ANCHORS, 'mid', 0, 3
      )
      expect(['drill_down', 'challenge']).toContain(analysis.action)
    })

    it('should challenge on seniority mismatch', () => {
      // Response with entry-level language, required executive
      const text = 'I learned a lot and assisted my manager. I helped with tasks and supported the team in their work.'
      const analysis = analyzeResponseWithHunterLogic(
        text, TARGET_KEYWORDS, NARRATIVE_ANCHORS, 'executive', 0, 3
      )
      expect(analysis.gapDetected).toBe(true)
    })

    it('should pivot after max drill-downs reached', () => {
      const analysis = analyzeResponseWithHunterLogic(
        'I did some work.',
        TARGET_KEYWORDS, NARRATIVE_ANCHORS, 'senior', 3, 3 // at max
      )
      expect(analysis.action).toBe('pivot')
    })
  })

  describe('Hunter follow-up generation', () => {
    it('should generate drill-down question with missing keywords', () => {
      const analysis: HunterAnalysis = {
        matchedKeywords: ['led'],
        missingKeywords: ['strategy', 'data-driven'],
        detectedSeniority: 'mid',
        requiredSeniority: 'senior',
        gapDetected: true,
        gapDescription: 'Low keyword coverage',
        action: 'drill_down',
        actionReason: 'Need more specifics',
        responseScore: 35,
      }
      const guardrails = buildCharacterGuardrails(DEFAULT_PERSONALITY)
      const followUp = generateHunterFollowUp(analysis, 'Tell me about your experience.', guardrails)
      expect(followUp.action).toBe('drill_down')
      expect(followUp.question.length).toBeGreaterThan(0)
      expect(followUp.targetGap).toContain('strategy')
    })

    it('should generate challenge question for seniority gaps', () => {
      const analysis: HunterAnalysis = {
        matchedKeywords: [],
        missingKeywords: ['led', 'strategy'],
        detectedSeniority: 'junior',
        requiredSeniority: 'executive',
        gapDetected: true,
        gapDescription: 'Seniority mismatch',
        action: 'challenge',
        actionReason: 'Seniority mismatch detected',
        responseScore: 20,
      }
      const guardrails = buildCharacterGuardrails(DEFAULT_PERSONALITY)
      const followUp = generateHunterFollowUp(analysis, 'Original question', guardrails)
      expect(followUp.action).toBe('challenge')
      expect(followUp.question.toLowerCase()).toContain('leadership')
    })

    it('should generate acknowledge for strong answers', () => {
      const analysis: HunterAnalysis = {
        matchedKeywords: ['led', 'strategy', 'data-driven'],
        missingKeywords: [],
        detectedSeniority: 'senior',
        requiredSeniority: 'senior',
        gapDetected: false,
        gapDescription: '',
        action: 'acknowledge',
        actionReason: 'Strong response',
        responseScore: 85,
      }
      const guardrails = buildCharacterGuardrails(DEFAULT_PERSONALITY)
      const followUp = generateHunterFollowUp(analysis, 'Original question', guardrails)
      expect(followUp.action).toBe('acknowledge')
    })

    it('should generate pivot when max drill-downs reached', () => {
      const analysis: HunterAnalysis = {
        matchedKeywords: [],
        missingKeywords: ['strategy'],
        detectedSeniority: 'unknown',
        requiredSeniority: 'senior',
        gapDetected: true,
        gapDescription: 'Gap detected',
        action: 'pivot',
        actionReason: 'Max drill-downs reached',
        responseScore: 30,
      }
      const guardrails = buildCharacterGuardrails(DEFAULT_PERSONALITY)
      const followUp = generateHunterFollowUp(analysis, 'Original question', guardrails)
      expect(followUp.action).toBe('pivot')
    })
  })

  describe('Character guardrails', () => {
    it('should build guardrails from personality', () => {
      const guardrails = buildCharacterGuardrails(DEFAULT_PERSONALITY)
      expect(guardrails).toHaveProperty('toneKeywords')
      expect(guardrails).toHaveProperty('maxDrillDowns')
      expect(guardrails).toHaveProperty('showEmpathy')
      expect(guardrails).toHaveProperty('challengeIntensity')
      expect(guardrails).toHaveProperty('questionPrefixes')
    })

    it('should use strict persona guardrails correctly', () => {
      const guardrails = buildCharacterGuardrails(DEFAULT_PERSONALITY, 'strict')
      expect(guardrails.showEmpathy).toBe(false)
      expect(guardrails.maxDrillDowns).toBeGreaterThanOrEqual(3)
    })

    it('should use friendly persona guardrails correctly', () => {
      const guardrails = buildCharacterGuardrails(DEFAULT_PERSONALITY, 'friendly')
      expect(guardrails.showEmpathy).toBe(true)
    })

    it('should increase max drill-downs for high intensity', () => {
      const highIntensity: InterviewerPersonality = {
        ...DEFAULT_PERSONALITY,
        intensity: 85,
      }
      const lowIntensity: InterviewerPersonality = {
        ...DEFAULT_PERSONALITY,
        intensity: 20,
      }
      const highGuardrails = buildCharacterGuardrails(highIntensity, 'friendly')
      const lowGuardrails = buildCharacterGuardrails(lowIntensity, 'friendly')
      expect(highGuardrails.maxDrillDowns).toBeGreaterThanOrEqual(lowGuardrails.maxDrillDowns)
    })

    it('should keep challengeIntensity in 0-100 range', () => {
      const extreme: InterviewerPersonality = {
        warmth: 0, directness: 100, intensity: 100, technicalDepth: 100, paceSpeed: 100,
      }
      const guardrails = buildCharacterGuardrails(extreme, 'strict')
      expect(guardrails.challengeIntensity).toBeLessThanOrEqual(100)
      expect(guardrails.challengeIntensity).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Arena question generation', () => {
    it('should include opening and closing categories', () => {
      const session = prepareInterviewSession(SAMPLE_CONFIG, SAMPLE_PROFILE, ['Led team'], 'PM role')
      const questions = generateArenaQuestions(session, 8)
      const categories = questions.map(q => q.category)
      expect(categories[0]).toBe('opening')
      expect(categories[categories.length - 1]).toBe('closing')
    })

    it('should assign target keywords to each question', () => {
      const session = prepareInterviewSession(SAMPLE_CONFIG, SAMPLE_PROFILE, ['Led team'], 'PM role')
      const questions = generateArenaQuestions(session, 6)
      for (const q of questions) {
        expect(Array.isArray(q.targetKeywords)).toBe(true)
      }
    })

    it('should set expected seniority based on difficulty', () => {
      const seniorConfig = { ...SAMPLE_CONFIG, difficultyLevel: 'senior' as const }
      const session = prepareInterviewSession(seniorConfig, SAMPLE_PROFILE, ['Led team'], 'PM role')
      const questions = generateArenaQuestions(session, 4)
      for (const q of questions) {
        expect(q.expectedSeniority).toBe('senior')
      }
    })

    it('should set lower max follow-ups for opening/closing', () => {
      const session = prepareInterviewSession(SAMPLE_CONFIG, SAMPLE_PROFILE, ['Led team'], 'PM role')
      const questions = generateArenaQuestions(session, 8)
      const opening = questions.find(q => q.category === 'opening')
      const technical = questions.find(q => q.category === 'technical')
      if (opening) expect(opening.maxFollowUps).toBeLessThanOrEqual(1)
      if (technical) expect(technical.maxFollowUps).toBeGreaterThan(1)
    })
  })

  describe('Delivery metrics computation', () => {
    it('should use provided duration over estimate', () => {
      const withDuration = computeDeliveryMetrics(STRONG_RESPONSE, 30)
      expect(withDuration.durationSeconds).toBe(30)
    })

    it('should estimate duration when not provided', () => {
      const metrics = computeDeliveryMetrics(STRONG_RESPONSE)
      expect(metrics.durationSeconds).toBeGreaterThan(0)
    })

    it('should count filler words', () => {
      const metrics = computeDeliveryMetrics(WEAK_RESPONSE)
      expect(metrics.fillerWordCount).toBeGreaterThan(0)
    })

    it('should calculate words per minute', () => {
      const metrics = computeDeliveryMetrics('One two three four five six seven eight nine ten', 6)
      expect(metrics.wordsPerMinute).toBe(100)
    })
  })
})

// =========================================================================
// P — Preservation: Differentiation
// =========================================================================

describe('Interview Arena Engine — Preservation', () => {
  it('should produce different scores for strong vs weak responses', () => {
    const strong = analyzeResponseWithHunterLogic(
      STRONG_RESPONSE, TARGET_KEYWORDS, NARRATIVE_ANCHORS, 'senior', 0, 3
    )
    const weak = analyzeResponseWithHunterLogic(
      WEAK_RESPONSE, TARGET_KEYWORDS, NARRATIVE_ANCHORS, 'senior', 0, 3
    )
    expect(strong.responseScore).toBeGreaterThan(weak.responseScore)
  })

  it('should produce different actions for different response qualities', () => {
    const strong = analyzeResponseWithHunterLogic(
      STRONG_RESPONSE, ['led', 'team'], NARRATIVE_ANCHORS, 'senior', 0, 3
    )
    const weak = analyzeResponseWithHunterLogic(
      WEAK_RESPONSE, TARGET_KEYWORDS, NARRATIVE_ANCHORS, 'senior', 0, 3
    )
    expect(strong.action).not.toBe(weak.action)
  })

  it('should produce different delivery metrics for different responses', () => {
    const strong = computeDeliveryMetrics(STRONG_RESPONSE)
    const weak = computeDeliveryMetrics(WEAK_RESPONSE)
    expect(strong.confidenceScore).not.toBe(weak.confidenceScore)
    expect(strong.detectedTone).not.toBe(weak.detectedTone)
  })

  it('should produce different guardrails for different personas', () => {
    const friendly = buildCharacterGuardrails(DEFAULT_PERSONALITY, 'friendly')
    const strict = buildCharacterGuardrails(DEFAULT_PERSONALITY, 'strict')
    expect(friendly.showEmpathy).not.toBe(strict.showEmpathy)
    expect(friendly.toneKeywords).not.toEqual(strict.toneKeywords)
  })

  it('should produce different questions for different session configs', () => {
    const config1 = { ...SAMPLE_CONFIG, userEmphases: 'product strategy' }
    const config2 = { ...SAMPLE_CONFIG, userEmphases: 'data analytics' }
    const session1 = prepareInterviewSession(config1, SAMPLE_PROFILE, ['Led team'], 'PM role')
    const session2 = prepareInterviewSession(config2, SAMPLE_PROFILE, ['Led team'], 'Data role')
    const q1 = generateArenaQuestions(session1, 4)
    const q2 = generateArenaQuestions(session2, 4)
    // At least the questions should differ
    const q1Text = q1.map(q => q.question).join('')
    const q2Text = q2.map(q => q.question).join('')
    expect(q1Text).not.toBe(q2Text)
  })
})

// =========================================================================
// H — Hardening: Edge cases
// =========================================================================

describe('Interview Arena Engine — Hardening', () => {
  it('should handle empty response text', () => {
    const meta = extractVoiceMetadata('')
    expect(meta.wordCount).toBe(0)
    expect(meta.fillerWords).toHaveLength(0)
  })

  it('should handle empty response in delivery metrics', () => {
    const metrics = computeDeliveryMetrics('')
    expect(metrics.confidenceScore).toBeGreaterThanOrEqual(0)
    expect(metrics.durationSeconds).toBeGreaterThanOrEqual(0)
  })

  it('should handle empty response in Hunter Logic', () => {
    const analysis = analyzeResponseWithHunterLogic('', TARGET_KEYWORDS, NARRATIVE_ANCHORS, 'senior', 0, 3)
    expect(analysis.matchedKeywords).toHaveLength(0)
    expect(analysis.responseScore).toBeGreaterThanOrEqual(0)
  })

  it('should handle empty target keywords', () => {
    const analysis = analyzeResponseWithHunterLogic(STRONG_RESPONSE, [], [], 'senior', 0, 3)
    expect(analysis.responseScore).toBeGreaterThanOrEqual(0)
    expect(analysis.action).toBeDefined()
  })

  it('should handle seniority detection on empty text', () => {
    expect(detectResponseSeniority('')).toBe('unknown')
  })

  it('should handle zero max drill-downs', () => {
    const analysis = analyzeResponseWithHunterLogic(
      'Vague answer.', TARGET_KEYWORDS, NARRATIVE_ANCHORS, 'senior', 0, 0
    )
    // Should pivot since max=0 and drill-down count=0
    expect(analysis.action).toBe('pivot')
  })

  it('should handle very long response text', () => {
    const longText = STRONG_RESPONSE.repeat(20)
    const meta = extractVoiceMetadata(longText)
    expect(meta.wordCount).toBeGreaterThan(100)
    const metrics = computeDeliveryMetrics(longText)
    expect(metrics.confidenceScore).toBeLessThanOrEqual(100)
  })

  it('should handle unknown persona in guardrails', () => {
    const guardrails = buildCharacterGuardrails(DEFAULT_PERSONALITY, 'nonexistent')
    expect(guardrails.toneKeywords.length).toBeGreaterThan(0)
  })

  it('should handle minimal session for question generation', () => {
    const minConfig: StrategicWizardConfig = {
      interviewType: 'behavioral',
      difficultyLevel: 'entry',
      personality: DEFAULT_PERSONALITY,
      interviewMode: 'traditional',
      answerFormat: 'text',
      userEmphases: '',
      interviewerLinkedIn: '',
      extractedValues: null,
    }
    const session = prepareInterviewSession(minConfig, SAMPLE_PROFILE, [], '')
    const questions = generateArenaQuestions(session, 4)
    expect(questions.length).toBeGreaterThan(0)
    expect(questions[0].category).toBe('opening')
  })
})
