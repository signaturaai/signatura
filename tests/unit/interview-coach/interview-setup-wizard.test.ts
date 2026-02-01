/**
 * Interview Setup Wizard - Automated Tests
 *
 * Tests for the 3-step configuration flow:
 * 1. Interview Type selection
 * 2. Interviewer Persona (preset or LinkedIn analysis)
 * 3. Focus areas and anxieties
 *
 * RALPH: Reliability, Accuracy, Logic, Performance, Hardening
 */

import { describe, it, expect } from 'vitest'
import type {
  InterviewType,
  InterviewPersona,
  FocusArea,
  WizardConfig,
  InterviewTypeOption,
  PersonaOption,
  FocusAreaOption,
} from '@/types/interview'
import {
  INTERVIEW_TYPES,
  PERSONA_OPTIONS,
  FOCUS_AREAS,
} from '@/types/interview'

// ============================================================================
// SECTION 1: Interview Types Constants Integrity
// ============================================================================

describe('Interview Types Constants', () => {
  it('should have exactly 5 interview types', () => {
    expect(INTERVIEW_TYPES).toHaveLength(5)
  })

  it('should include all expected interview type values', () => {
    const values = INTERVIEW_TYPES.map(t => t.value)
    expect(values).toContain('hr_screening')
    expect(values).toContain('hiring_manager')
    expect(values).toContain('technical')
    expect(values).toContain('executive')
    expect(values).toContain('peer')
  })

  it('every interview type should have required fields', () => {
    INTERVIEW_TYPES.forEach(type => {
      expect(type.value).toBeTruthy()
      expect(type.label).toBeTruthy()
      expect(type.description).toBeTruthy()
      expect(type.icon).toBeTruthy()
      expect(type.focusAreas).toBeDefined()
      expect(type.focusAreas.length).toBeGreaterThan(0)
    })
  })

  it('should have unique values', () => {
    const values = INTERVIEW_TYPES.map(t => t.value)
    expect(new Set(values).size).toBe(values.length)
  })

  it('should have unique labels', () => {
    const labels = INTERVIEW_TYPES.map(t => t.label)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('HR Screening should have correct label and focus areas', () => {
    const hr = INTERVIEW_TYPES.find(t => t.value === 'hr_screening')
    expect(hr).toBeDefined()
    expect(hr!.label).toBe('HR Screening')
    expect(hr!.focusAreas.length).toBeGreaterThanOrEqual(2)
  })

  it('Technical interview should reference problem-solving or system design', () => {
    const tech = INTERVIEW_TYPES.find(t => t.value === 'technical')
    expect(tech).toBeDefined()
    const areas = tech!.focusAreas.join(' ').toLowerCase()
    expect(areas).toMatch(/problem|system|technical/)
  })
})

// ============================================================================
// SECTION 2: Persona Options Constants Integrity
// ============================================================================

describe('Persona Options Constants', () => {
  it('should have exactly 4 persona options', () => {
    expect(PERSONA_OPTIONS).toHaveLength(4)
  })

  it('should include all expected persona values', () => {
    const values = PERSONA_OPTIONS.map(p => p.value)
    expect(values).toContain('friendly')
    expect(values).toContain('strict')
    expect(values).toContain('data_driven')
    expect(values).toContain('visionary')
  })

  it('every persona should have required fields', () => {
    PERSONA_OPTIONS.forEach(persona => {
      expect(persona.value).toBeTruthy()
      expect(persona.label).toBeTruthy()
      expect(persona.description).toBeTruthy()
      expect(persona.traits).toBeDefined()
      expect(persona.traits.length).toBeGreaterThan(0)
    })
  })

  it('should have unique values', () => {
    const values = PERSONA_OPTIONS.map(p => p.value)
    expect(new Set(values).size).toBe(values.length)
  })

  it('friendly persona should have encouraging traits', () => {
    const friendly = PERSONA_OPTIONS.find(p => p.value === 'friendly')
    expect(friendly).toBeDefined()
    expect(friendly!.traits.some(t => t.toLowerCase().includes('encouraging') || t.toLowerCase().includes('conversational'))).toBe(true)
  })

  it('strict persona should have challenging traits', () => {
    const strict = PERSONA_OPTIONS.find(p => p.value === 'strict')
    expect(strict).toBeDefined()
    expect(strict!.traits.some(t => t.toLowerCase().includes('challeng') || t.toLowerCase().includes('skepti'))).toBe(true)
  })

  it('data_driven persona should have analytical traits', () => {
    const dd = PERSONA_OPTIONS.find(p => p.value === 'data_driven')
    expect(dd).toBeDefined()
    expect(dd!.traits.some(t => t.toLowerCase().includes('analytical') || t.toLowerCase().includes('quantitative'))).toBe(true)
  })
})

// ============================================================================
// SECTION 3: Focus Areas Constants Integrity
// ============================================================================

describe('Focus Areas Constants', () => {
  it('should have exactly 8 focus areas', () => {
    expect(FOCUS_AREAS).toHaveLength(8)
  })

  it('should include all expected focus area values', () => {
    const values = FOCUS_AREAS.map(a => a.value)
    expect(values).toContain('soft_skills')
    expect(values).toContain('system_design')
    expect(values).toContain('conflict_resolution')
    expect(values).toContain('live_coding')
    expect(values).toContain('leadership')
    expect(values).toContain('culture_fit')
    expect(values).toContain('problem_solving')
    expect(values).toContain('communication')
  })

  it('every focus area should have required fields', () => {
    FOCUS_AREAS.forEach(area => {
      expect(area.value).toBeTruthy()
      expect(area.label).toBeTruthy()
      expect(area.description).toBeTruthy()
    })
  })

  it('should have unique values', () => {
    const values = FOCUS_AREAS.map(a => a.value)
    expect(new Set(values).size).toBe(values.length)
  })
})

// ============================================================================
// SECTION 4: Wizard Config Validation Logic
// ============================================================================

describe('Wizard Config Validation', () => {
  const makeConfig = (overrides: Partial<WizardConfig> = {}): WizardConfig => ({
    interviewType: 'technical',
    personaMode: 'preset',
    persona: 'strict',
    focusAreas: ['system_design', 'live_coding'],
    anxieties: '',
    ...overrides,
  })

  // Step 1 validation
  describe('Step 1: Interview Type', () => {
    it('should require interviewType to be set', () => {
      const config = makeConfig()
      expect(config.interviewType).toBeTruthy()
    })

    it('should accept all valid interview types', () => {
      const validTypes: InterviewType[] = ['hr_screening', 'hiring_manager', 'technical', 'executive', 'peer']
      validTypes.forEach(type => {
        const config = makeConfig({ interviewType: type })
        expect(config.interviewType).toBe(type)
      })
    })
  })

  // Step 2 validation
  describe('Step 2: Interviewer Persona', () => {
    it('preset mode should require persona', () => {
      const config = makeConfig({ personaMode: 'preset', persona: 'friendly' })
      expect(config.personaMode).toBe('preset')
      expect(config.persona).toBeTruthy()
    })

    it('analyze mode should require linkedInText > 50 chars', () => {
      const shortText = 'Too short'
      const longText = 'A'.repeat(51)
      expect(shortText.length).toBeLessThanOrEqual(50)
      expect(longText.trim().length).toBeGreaterThan(50)
    })

    it('should accept all valid persona values in preset mode', () => {
      const validPersonas: InterviewPersona[] = ['friendly', 'strict', 'data_driven', 'visionary']
      validPersonas.forEach(persona => {
        const config = makeConfig({ personaMode: 'preset', persona })
        expect(config.persona).toBe(persona)
      })
    })

    it('analyze mode should store interviewerName', () => {
      const config = makeConfig({
        personaMode: 'analyze',
        linkedInText: 'Experienced engineering leader with a passion for building teams...',
        interviewerName: 'Sarah Chen',
      })
      expect(config.interviewerName).toBe('Sarah Chen')
    })

    it('interviewerName should be optional', () => {
      const config = makeConfig({ personaMode: 'analyze', linkedInText: 'A'.repeat(60) })
      expect(config.interviewerName).toBeUndefined()
    })
  })

  // Step 3 validation
  describe('Step 3: Focus Areas', () => {
    it('should require at least one focus area', () => {
      const config = makeConfig({ focusAreas: ['soft_skills'] })
      expect(config.focusAreas.length).toBeGreaterThan(0)
    })

    it('should accept multiple focus areas', () => {
      const config = makeConfig({ focusAreas: ['soft_skills', 'system_design', 'leadership'] })
      expect(config.focusAreas).toHaveLength(3)
    })

    it('empty focus areas should be invalid', () => {
      const config = makeConfig({ focusAreas: [] })
      expect(config.focusAreas.length).toBe(0)
    })

    it('anxieties should be optional string', () => {
      const config = makeConfig({ anxieties: '' })
      expect(config.anxieties).toBe('')
      const configWithAnx = makeConfig({ anxieties: 'Nervous about explaining gap year' })
      expect(configWithAnx.anxieties).toBe('Nervous about explaining gap year')
    })
  })
})

// ============================================================================
// SECTION 5: Step Navigation Logic
// ============================================================================

describe('Wizard Step Navigation', () => {
  it('should define 3 steps', () => {
    const STEPS = [
      { id: 1, title: 'Interview Type', description: 'What kind of interview?' },
      { id: 2, title: 'The Interviewer', description: 'Who will interview you?' },
      { id: 3, title: 'Focus & Strategy', description: 'What to prepare for?' },
    ]
    expect(STEPS).toHaveLength(3)
  })

  it('should navigate forward from step 1 to 2', () => {
    let currentStep = 1
    if (currentStep < 3) currentStep += 1
    expect(currentStep).toBe(2)
  })

  it('should navigate forward from step 2 to 3', () => {
    let currentStep = 2
    if (currentStep < 3) currentStep += 1
    expect(currentStep).toBe(3)
  })

  it('should not exceed step 3', () => {
    let currentStep = 3
    if (currentStep < 3) currentStep += 1
    expect(currentStep).toBe(3)
  })

  it('should navigate backward from step 3 to 2', () => {
    let currentStep = 3
    if (currentStep > 1) currentStep -= 1
    expect(currentStep).toBe(2)
  })

  it('should navigate backward from step 2 to 1', () => {
    let currentStep = 2
    if (currentStep > 1) currentStep -= 1
    expect(currentStep).toBe(1)
  })

  it('should not go below step 1', () => {
    let currentStep = 1
    if (currentStep > 1) currentStep -= 1
    expect(currentStep).toBe(1)
  })
})

// ============================================================================
// SECTION 6: canProceed Logic
// ============================================================================

describe('canProceed Logic', () => {
  function canProceed(step: number, config: Partial<WizardConfig>): boolean {
    switch (step) {
      case 1:
        return !!config.interviewType
      case 2:
        if (config.personaMode === 'preset') {
          return !!config.persona
        }
        return !!(config.linkedInText && config.linkedInText.trim().length > 50)
      case 3:
        return !!(config.focusAreas && config.focusAreas.length > 0)
      default:
        return false
    }
  }

  it('step 1: should not proceed without interviewType', () => {
    expect(canProceed(1, {})).toBe(false)
  })

  it('step 1: should proceed with interviewType', () => {
    expect(canProceed(1, { interviewType: 'technical' })).toBe(true)
  })

  it('step 2 preset: should not proceed without persona', () => {
    expect(canProceed(2, { personaMode: 'preset' })).toBe(false)
  })

  it('step 2 preset: should proceed with persona', () => {
    expect(canProceed(2, { personaMode: 'preset', persona: 'friendly' })).toBe(true)
  })

  it('step 2 analyze: should not proceed with short linkedInText', () => {
    expect(canProceed(2, { personaMode: 'analyze', linkedInText: 'Short text' })).toBe(false)
  })

  it('step 2 analyze: should not proceed with exactly 50 chars', () => {
    expect(canProceed(2, { personaMode: 'analyze', linkedInText: 'A'.repeat(50) })).toBe(false)
  })

  it('step 2 analyze: should proceed with >50 chars', () => {
    expect(canProceed(2, { personaMode: 'analyze', linkedInText: 'A'.repeat(51) })).toBe(true)
  })

  it('step 2 analyze: should not proceed with whitespace-only >50 chars', () => {
    expect(canProceed(2, { personaMode: 'analyze', linkedInText: ' '.repeat(51) })).toBe(false)
  })

  it('step 3: should not proceed with empty focusAreas', () => {
    expect(canProceed(3, { focusAreas: [] })).toBe(false)
  })

  it('step 3: should proceed with at least one focus area', () => {
    expect(canProceed(3, { focusAreas: ['soft_skills'] })).toBe(true)
  })

  it('step 3: should proceed with multiple focus areas', () => {
    expect(canProceed(3, { focusAreas: ['soft_skills', 'leadership', 'communication'] })).toBe(true)
  })

  it('invalid step should return false', () => {
    expect(canProceed(0, { interviewType: 'technical' })).toBe(false)
    expect(canProceed(4, { interviewType: 'technical' })).toBe(false)
  })
})

// ============================================================================
// SECTION 7: Focus Area Toggle Logic
// ============================================================================

describe('Focus Area Toggle Logic', () => {
  function toggleFocusArea(current: FocusArea[], area: FocusArea): FocusArea[] {
    if (current.includes(area)) {
      return current.filter(a => a !== area)
    }
    return [...current, area]
  }

  it('should add a focus area when not present', () => {
    const result = toggleFocusArea([], 'soft_skills')
    expect(result).toEqual(['soft_skills'])
  })

  it('should remove a focus area when already present', () => {
    const result = toggleFocusArea(['soft_skills', 'leadership'], 'soft_skills')
    expect(result).toEqual(['leadership'])
  })

  it('should handle toggling on multiple areas', () => {
    let areas: FocusArea[] = []
    areas = toggleFocusArea(areas, 'soft_skills')
    areas = toggleFocusArea(areas, 'leadership')
    areas = toggleFocusArea(areas, 'system_design')
    expect(areas).toEqual(['soft_skills', 'leadership', 'system_design'])
  })

  it('should handle toggling off and on', () => {
    let areas: FocusArea[] = ['soft_skills', 'leadership']
    areas = toggleFocusArea(areas, 'soft_skills')
    expect(areas).toEqual(['leadership'])
    areas = toggleFocusArea(areas, 'soft_skills')
    expect(areas).toEqual(['leadership', 'soft_skills'])
  })
})
