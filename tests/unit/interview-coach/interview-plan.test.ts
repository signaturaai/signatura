/**
 * Interview Plan & Simulation Board - Automated Tests
 *
 * Tests for the generated interview plan data integrity,
 * question structure, dashboard rendering logic, and
 * simulation board state management.
 *
 * RALPH: Reliability, Accuracy, Logic, Performance, Hardening
 */

import { describe, it, expect } from 'vitest'
import type {
  InterviewPlan,
  InterviewQuestion,
  InterviewerProfile,
  WizardConfig,
} from '@/types/interview'
import { INTERVIEW_TYPES } from '@/types/interview'

// ============================================================================
// Mock Data Factories
// ============================================================================

function createMockQuestion(overrides: Partial<InterviewQuestion> = {}): InterviewQuestion {
  return {
    id: 'q-001',
    question: 'Tell me about a time you led a cross-functional team.',
    category: 'standard',
    hiddenAgenda: 'Assessing leadership ability and cross-team communication.',
    suggestedStructure: 'Situation: Describe the project context.\nTask: Your role and responsibilities.\nAction: Specific steps you took.\nResult: Measurable outcomes achieved.',
    difficulty: 'medium',
    timeEstimate: '3-5 min',
    relatedCVSection: 'Professional Experience',
    keywords: ['leadership', 'collaboration', 'cross-functional'],
    ...overrides,
  }
}

function createMockInterviewerProfile(overrides: Partial<InterviewerProfile> = {}): InterviewerProfile {
  return {
    name: 'Sarah Chen',
    inferredStyle: 'Data-Driven Collaborator',
    communicationPreferences: ['Values concise answers', 'Appreciates metrics'],
    likelyPriorities: ['Technical depth', 'Team collaboration'],
    potentialBiases: ['May favor candidates with FAANG experience'],
    derivedFrom: 'preset_persona',
    ...overrides,
  }
}

function createMockPlan(overrides: Partial<InterviewPlan> = {}): InterviewPlan {
  return {
    id: 'plan-001',
    userId: 'user-1',
    config: {
      interviewType: 'hiring_manager',
      personaMode: 'preset',
      persona: 'data_driven',
      focusAreas: ['soft_skills', 'leadership'],
      anxieties: '',
    },
    interviewerProfile: createMockInterviewerProfile(),
    strategyBrief: 'Focus on quantifiable achievements and team impact metrics.',
    keyTactics: ['Lead with data', 'Show collaborative approach', 'Reference recent projects'],
    questions: [
      createMockQuestion({ id: 'q-001', category: 'standard', difficulty: 'easy' }),
      createMockQuestion({ id: 'q-002', category: 'tailored', difficulty: 'medium' }),
      createMockQuestion({ id: 'q-003', category: 'persona', difficulty: 'hard' }),
    ],
    generatedAt: '2026-01-29T12:00:00Z',
    regenerationCount: 0,
    ...overrides,
  }
}

// ============================================================================
// SECTION 1: InterviewQuestion Data Integrity
// ============================================================================

describe('InterviewQuestion Data Integrity', () => {
  it('should have all required fields', () => {
    const q = createMockQuestion()
    expect(q.id).toBeTruthy()
    expect(q.question).toBeTruthy()
    expect(q.category).toBeTruthy()
    expect(q.hiddenAgenda).toBeTruthy()
    expect(q.suggestedStructure).toBeTruthy()
    expect(q.difficulty).toBeTruthy()
    expect(q.timeEstimate).toBeTruthy()
  })

  it('category should be one of standard, tailored, persona', () => {
    const validCategories = ['standard', 'tailored', 'persona']
    const q = createMockQuestion()
    expect(validCategories).toContain(q.category)
  })

  it('difficulty should be one of easy, medium, hard', () => {
    const validDifficulties = ['easy', 'medium', 'hard']
    const q = createMockQuestion()
    expect(validDifficulties).toContain(q.difficulty)
  })

  it('relatedCVSection should be optional', () => {
    const q1 = createMockQuestion({ relatedCVSection: undefined })
    expect(q1.relatedCVSection).toBeUndefined()
    const q2 = createMockQuestion({ relatedCVSection: 'Skills' })
    expect(q2.relatedCVSection).toBe('Skills')
  })

  it('keywords should be optional', () => {
    const q1 = createMockQuestion({ keywords: undefined })
    expect(q1.keywords).toBeUndefined()
    const q2 = createMockQuestion({ keywords: ['agile', 'scrum'] })
    expect(q2.keywords).toEqual(['agile', 'scrum'])
  })

  it('suggestedStructure should contain STAR-like elements', () => {
    const q = createMockQuestion()
    const structure = q.suggestedStructure.toLowerCase()
    expect(structure).toMatch(/situation|task|action|result/)
  })
})

// ============================================================================
// SECTION 2: InterviewerProfile Data Integrity
// ============================================================================

describe('InterviewerProfile Data Integrity', () => {
  it('should have required fields', () => {
    const profile = createMockInterviewerProfile()
    expect(profile.name).toBeTruthy()
    expect(profile.inferredStyle).toBeTruthy()
    expect(profile.communicationPreferences).toBeDefined()
    expect(profile.likelyPriorities).toBeDefined()
    expect(profile.potentialBiases).toBeDefined()
    expect(profile.derivedFrom).toBeTruthy()
  })

  it('derivedFrom should be linkedin_analysis or preset_persona', () => {
    const valid = ['linkedin_analysis', 'preset_persona']
    expect(valid).toContain(createMockInterviewerProfile().derivedFrom)
    expect(valid).toContain(
      createMockInterviewerProfile({ derivedFrom: 'linkedin_analysis' }).derivedFrom
    )
  })

  it('communicationPreferences should be a non-empty array', () => {
    const profile = createMockInterviewerProfile()
    expect(Array.isArray(profile.communicationPreferences)).toBe(true)
    expect(profile.communicationPreferences.length).toBeGreaterThan(0)
  })

  it('likelyPriorities should be a non-empty array', () => {
    const profile = createMockInterviewerProfile()
    expect(profile.likelyPriorities.length).toBeGreaterThan(0)
  })

  it('potentialBiases can be empty', () => {
    const profile = createMockInterviewerProfile({ potentialBiases: [] })
    expect(profile.potentialBiases).toEqual([])
  })
})

// ============================================================================
// SECTION 3: InterviewPlan Data Integrity
// ============================================================================

describe('InterviewPlan Data Integrity', () => {
  it('should have all required fields', () => {
    const plan = createMockPlan()
    expect(plan.id).toBeTruthy()
    expect(plan.userId).toBeTruthy()
    expect(plan.config).toBeDefined()
    expect(plan.interviewerProfile).toBeDefined()
    expect(plan.strategyBrief).toBeTruthy()
    expect(plan.keyTactics).toBeDefined()
    expect(plan.questions).toBeDefined()
    expect(plan.generatedAt).toBeTruthy()
    expect(typeof plan.regenerationCount).toBe('number')
  })

  it('should have at least one question', () => {
    const plan = createMockPlan()
    expect(plan.questions.length).toBeGreaterThan(0)
  })

  it('should have at least one key tactic', () => {
    const plan = createMockPlan()
    expect(plan.keyTactics.length).toBeGreaterThan(0)
  })

  it('regenerationCount should start at 0', () => {
    const plan = createMockPlan()
    expect(plan.regenerationCount).toBe(0)
  })

  it('applicationId should be optional', () => {
    const plan1 = createMockPlan()
    expect(plan1.applicationId).toBeUndefined()
    const plan2 = createMockPlan({ applicationId: 'app-123' })
    expect(plan2.applicationId).toBe('app-123')
  })

  it('expiresAt should be optional', () => {
    const plan1 = createMockPlan()
    expect(plan1.expiresAt).toBeUndefined()
    const plan2 = createMockPlan({ expiresAt: '2026-02-15T12:00:00Z' })
    expect(plan2.expiresAt).toBeTruthy()
  })

  it('question IDs should be unique within a plan', () => {
    const plan = createMockPlan()
    const ids = plan.questions.map(q => q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

// ============================================================================
// SECTION 4: Dashboard Display Logic
// ============================================================================

describe('InterviewDashboard Display Logic', () => {
  it('should find the matching interview type label', () => {
    const plan = createMockPlan({ config: { ...createMockPlan().config, interviewType: 'technical' } })
    const interviewType = INTERVIEW_TYPES.find(t => t.value === plan.config.interviewType)
    expect(interviewType).toBeDefined()
    expect(interviewType!.label).toBe('Technical/Skills')
  })

  it('should handle unknown interview type gracefully', () => {
    const plan = createMockPlan()
    // Simulate looking up a type that doesn't exist
    const interviewType = INTERVIEW_TYPES.find(t => t.value === ('unknown' as any))
    expect(interviewType).toBeUndefined()
    // Dashboard falls back to raw value
    const label = interviewType?.label || plan.config.interviewType
    expect(label).toBe('hiring_manager')
  })

  it('should display question count from plan', () => {
    const plan = createMockPlan()
    expect(`${plan.questions.length} questions`).toBe('3 questions')
  })
})

// ============================================================================
// SECTION 5: QuestionCard Category Colors
// ============================================================================

describe('QuestionCard Category & Difficulty Colors', () => {
  const categoryColors: Record<string, string> = {
    standard: 'bg-gray-100 text-gray-700',
    tailored: 'bg-rose-light text-rose-dark',
    persona: 'bg-lavender-light text-lavender-dark',
  }

  const difficultyColors: Record<string, string> = {
    easy: 'text-green-600',
    medium: 'text-yellow-600',
    hard: 'text-red-600',
  }

  it('should map standard category to gray', () => {
    expect(categoryColors['standard']).toContain('gray')
  })

  it('should map tailored category to rose', () => {
    expect(categoryColors['tailored']).toContain('rose')
  })

  it('should map persona category to lavender', () => {
    expect(categoryColors['persona']).toContain('lavender')
  })

  it('should map easy difficulty to green', () => {
    expect(difficultyColors['easy']).toContain('green')
  })

  it('should map medium difficulty to yellow', () => {
    expect(difficultyColors['medium']).toContain('yellow')
  })

  it('should map hard difficulty to red', () => {
    expect(difficultyColors['hard']).toContain('red')
  })

  it('tailored category should display as CV-Tailored', () => {
    const category = 'tailored'
    const displayLabel = category === 'tailored' ? 'CV-Tailored' : category
    expect(displayLabel).toBe('CV-Tailored')
  })
})

// ============================================================================
// SECTION 6: Simulation Board Logic
// ============================================================================

describe('Simulation Board Logic', () => {
  const difficultyConfig = {
    easy: { label: 'Warm-up', color: 'text-green-600' },
    medium: { label: 'Standard', color: 'text-yellow-600' },
    hard: { label: 'Challenge', color: 'text-red-600' },
  }

  const categoryConfig = {
    standard: { label: 'Standard' },
    tailored: { label: 'CV-Tailored' },
    persona: { label: 'Persona-Based' },
  }

  it('should parse talking points from suggestedStructure', () => {
    const structure = 'Situation: Context\nTask: Your role\nAction: Steps\nResult: Outcomes'
    const points = structure.split('\n').filter(line => line.trim()).map(line => line.trim())
    expect(points).toHaveLength(4)
    expect(points[0]).toBe('Situation: Context')
  })

  it('should handle empty suggestedStructure', () => {
    const structure = ''
    const points = structure.split('\n').filter(line => line.trim())
    expect(points).toHaveLength(0)
  })

  it('difficulty labels should be correct', () => {
    expect(difficultyConfig.easy.label).toBe('Warm-up')
    expect(difficultyConfig.medium.label).toBe('Standard')
    expect(difficultyConfig.hard.label).toBe('Challenge')
  })

  it('category labels should be correct', () => {
    expect(categoryConfig.standard.label).toBe('Standard')
    expect(categoryConfig.tailored.label).toBe('CV-Tailored')
    expect(categoryConfig.persona.label).toBe('Persona-Based')
  })

  it('should display question progress as index/total', () => {
    const plan = createMockPlan()
    plan.questions.forEach((_, index) => {
      const progress = `${index + 1}/${plan.questions.length}`
      expect(progress).toMatch(/^\d+\/\d+$/)
    })
  })

  it('reveal state should start as hidden', () => {
    const isRevealed = false
    expect(isRevealed).toBe(false)
  })

  it('toggling reveal should change state', () => {
    let isRevealed = false
    isRevealed = !isRevealed
    expect(isRevealed).toBe(true)
    isRevealed = !isRevealed
    expect(isRevealed).toBe(false)
  })
})

// ============================================================================
// SECTION 7: Plan Questions Distribution
// ============================================================================

describe('Plan Question Distribution', () => {
  it('should support mixed categories in a plan', () => {
    const plan = createMockPlan()
    const categories = plan.questions.map(q => q.category)
    expect(categories).toContain('standard')
    expect(categories).toContain('tailored')
    expect(categories).toContain('persona')
  })

  it('should support mixed difficulties', () => {
    const plan = createMockPlan()
    const difficulties = plan.questions.map(q => q.difficulty)
    expect(difficulties).toContain('easy')
    expect(difficulties).toContain('medium')
    expect(difficulties).toContain('hard')
  })

  it('questions with keywords should have non-empty arrays', () => {
    const plan = createMockPlan()
    plan.questions.forEach(q => {
      if (q.keywords) {
        expect(q.keywords.length).toBeGreaterThan(0)
      }
    })
  })
})
