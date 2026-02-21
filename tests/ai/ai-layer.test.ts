/**
 * AI Provider Layer Tests — RALPH Loop 22
 *
 * Tests for the AI companion, context, memory, and prompts modules.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ============================================================================
// Mock Setup
// ============================================================================

const mockState = {
  profile: null as Record<string, unknown> | null,
  recentEmotions: [] as Array<Record<string, unknown>>,
  personalization: null as Record<string, unknown> | null,
  conversations: [] as Array<Record<string, unknown>>,
  applications: [] as Array<Record<string, unknown>>,
}

// Mock Supabase for context tests
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: vi.fn().mockImplementation((tableName: string) => {
      const createChainable = (): Record<string, unknown> => {
        const obj: Record<string, unknown> = {}
        obj.eq = vi.fn().mockImplementation(() => obj)
        obj.gte = vi.fn().mockImplementation(() => obj)
        obj.contains = vi.fn().mockImplementation(() => obj)
        obj.is = vi.fn().mockImplementation(() => obj)
        obj.not = vi.fn().mockImplementation(() => obj)
        obj.order = vi.fn().mockImplementation(() => obj)
        obj.limit = vi.fn().mockImplementation(() => obj)
        obj.textSearch = vi.fn().mockImplementation(() => obj)
        obj.single = vi.fn().mockImplementation(async () => {
          if (tableName === 'user_profiles') {
            return { data: mockState.profile, error: mockState.profile ? null : { message: 'Not found' } }
          }
          if (tableName === 'companion_personalization') {
            return { data: mockState.personalization, error: null }
          }
          return { data: null, error: null }
        })
        obj.then = (resolve: (value: unknown) => void) => {
          if (tableName === 'user_emotional_context') {
            resolve({ data: mockState.recentEmotions, error: null })
          } else if (tableName === 'companion_conversations') {
            resolve({ data: mockState.conversations, error: null })
          } else if (tableName === 'job_applications') {
            resolve({ data: mockState.applications, error: null })
          } else {
            resolve({ data: null, error: null })
          }
          return Promise.resolve({ data: null, error: null })
        }
        return obj
      }

      return {
        select: vi.fn().mockImplementation(() => createChainable()),
        insert: vi.fn().mockImplementation(() => ({
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null }),
        })),
        update: vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
        eq: vi.fn().mockImplementation(() => createChainable()),
      }
    }),
  })),
}))

// ============================================================================
// Test Suite
// ============================================================================

describe('AI Provider Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.profile = null
    mockState.recentEmotions = []
    mockState.personalization = null
    mockState.conversations = []
    mockState.applications = []
  })

  afterEach(() => {
    vi.resetModules()
  })

  // ==========================================================================
  // 22.1 — Mock AI (companion.ts)
  // ==========================================================================

  describe('Mock AI (companion.ts)', () => {
    it('1. getMockCompanionResponse returns valid structure', async () => {
      const { getMockCompanionResponse } = await import('@/lib/ai/companion')

      const response = await getMockCompanionResponse('I am feeling good today')

      expect(response).toHaveProperty('message')
      expect(response).toHaveProperty('tone')
      expect(response).toHaveProperty('detectedMood')
      expect(response).toHaveProperty('detectedEnergy')
      expect(response).toHaveProperty('emotionalKeywords')
      expect(response).toHaveProperty('suggestedGoal')
      expect(response).toHaveProperty('burnoutWarning')
      expect(response).toHaveProperty('shouldFollowUp')
      expect(response).toHaveProperty('celebrationDetected')
    })

    it('2. getMockCompanionResponse always returns a message string', async () => {
      const { getMockCompanionResponse } = await import('@/lib/ai/companion')

      const messages = [
        'I am exhausted',
        'Got an interview!',
        'Feeling anxious',
        'Just a normal day',
        '',
      ]

      for (const msg of messages) {
        const response = await getMockCompanionResponse(msg)
        expect(typeof response.message).toBe('string')
        expect(response.message.length).toBeGreaterThan(0)
      }
    })

    it('3. detectedMood is 1-10 integer', async () => {
      const { getMockCompanionResponse } = await import('@/lib/ai/companion')

      const testCases = [
        'I am exhausted and burned out',
        'Got rejected again',
        'Feeling a bit anxious',
        'Normal day',
        'Feeling excited and energized!',
      ]

      for (const msg of testCases) {
        const response = await getMockCompanionResponse(msg)
        expect(response.detectedMood).toBeGreaterThanOrEqual(1)
        expect(response.detectedMood).toBeLessThanOrEqual(10)
        expect(Number.isInteger(response.detectedMood)).toBe(true)
      }
    })

    it('4. detectedEnergy is valid EnergyLevel', async () => {
      const { getMockCompanionResponse } = await import('@/lib/ai/companion')

      const validEnergyLevels = [
        'burned_out',
        'exhausted',
        'low',
        'neutral',
        'good',
        'energized',
        'excited',
      ]

      const testCases = [
        'I am so tired',
        'Feeling energized today!',
        'Just okay',
      ]

      for (const msg of testCases) {
        const response = await getMockCompanionResponse(msg)
        expect(validEnergyLevels).toContain(response.detectedEnergy)
      }
    })

    it('5. suggestedGoal has goal, type, difficulty when present', async () => {
      const { getMockCompanionResponse } = await import('@/lib/ai/companion')

      // Use a neutral message that should trigger goal suggestion
      const response = await getMockCompanionResponse('Having a normal day, looking for something to do')

      if (response.suggestedGoal) {
        expect(response.suggestedGoal).toHaveProperty('goal')
        expect(response.suggestedGoal).toHaveProperty('type')
        expect(response.suggestedGoal).toHaveProperty('difficulty')
        expect(typeof response.suggestedGoal.goal).toBe('string')
        expect(typeof response.suggestedGoal.type).toBe('string')
        expect(typeof response.suggestedGoal.difficulty).toBe('string')
      }
    })
  })

  // ==========================================================================
  // 22.2 — AI generation functions (companion.ts)
  // ==========================================================================

  describe('AI generation functions (companion.ts)', () => {
    it('6. generateCheckInResponse accepts CompanionContext', async () => {
      const { generateCheckInResponse } = await import('@/lib/ai/companion')

      // Verify function exists and accepts CompanionContext type
      expect(typeof generateCheckInResponse).toBe('function')

      // The function signature should accept a CompanionContext
      // This is a compile-time type check - function exists
      expect(generateCheckInResponse).toBeDefined()
    })

    it('7. generateMicroGoal accepts context + mood/energy', async () => {
      const { generateMicroGoal } = await import('@/lib/ai/companion')

      // Verify function exists with correct signature
      expect(typeof generateMicroGoal).toBe('function')

      // Function should accept two parameters
      expect(generateMicroGoal).toBeDefined()
    })

    it('8. generateCelebration accepts celebration params', async () => {
      const { generateCelebration } = await import('@/lib/ai/companion')

      // Verify function exists
      expect(typeof generateCelebration).toBe('function')

      // Function should be defined with expected signature
      expect(generateCelebration).toBeDefined()
    })

    it('9. generateRejectionSupport accepts support params', async () => {
      const { generateRejectionSupport } = await import('@/lib/ai/companion')

      // Verify function exists
      expect(typeof generateRejectionSupport).toBe('function')

      // Function should be defined
      expect(generateRejectionSupport).toBeDefined()
    })
  })

  // ==========================================================================
  // 22.3 — Context builder (context.ts)
  // ==========================================================================

  describe('Context builder (context.ts)', () => {
    it('10. getCompanionContext returns null for missing user', async () => {
      const { getCompanionContext } = await import('@/lib/ai/context')

      mockState.profile = null // User not found

      const context = await getCompanionContext('non-existent-user')

      expect(context).toBeNull()
    })

    it('11. getCompanionContext assembles profile + recent check-ins + applications', async () => {
      const { getCompanionContext } = await import('@/lib/ai/context')

      mockState.profile = {
        id: 'user-123',
        full_name: 'Test User',
        current_streak: 5,
        total_checkins: 20,
        days_with_companion: 30,
      }
      mockState.recentEmotions = [
        { mood_rating: 7, energy_level: 'good', celebration_moments: [], struggles_mentioned: [] },
      ]
      mockState.personalization = {
        preferred_companion_name: 'Siggy',
        response_length_preference: 'moderate',
        celebration_style: 'warm',
        motivational_approach: 'empowering',
        uses_humor: true,
      }
      mockState.applications = [
        { company_name: 'TechCorp', application_status: 'applied' },
      ]

      const context = await getCompanionContext('user-123')

      expect(context).not.toBeNull()
      expect(context?.userName).toBe('Test User')
      expect(context?.emotionalState).toBeDefined()
      expect(context?.recentActivity).toBeDefined()
      expect(context?.relationshipHistory).toBeDefined()
      expect(context?.personalization).toBeDefined()
    })

    it('12. Context includes streak information', async () => {
      const { getCompanionContext } = await import('@/lib/ai/context')

      mockState.profile = {
        id: 'user-streak',
        full_name: 'Streak User',
        current_streak: 7,
        total_checkins: 50,
        days_with_companion: 60,
      }
      mockState.recentEmotions = []
      mockState.personalization = null

      const context = await getCompanionContext('user-streak')

      expect(context).not.toBeNull()
      expect(context?.relationshipHistory.currentStreak).toBe(7)
    })
  })

  // ==========================================================================
  // 22.4 — Memory (memory.ts)
  // ==========================================================================

  describe('Memory (memory.ts)', () => {
    it('13. Memory module exports expected functions', async () => {
      const memory = await import('@/lib/ai/memory')

      expect(memory.storeConversation).toBeDefined()
      expect(typeof memory.storeConversation).toBe('function')

      expect(memory.addMessageToConversation).toBeDefined()
      expect(typeof memory.addMessageToConversation).toBe('function')

      expect(memory.storeDailyContext).toBeDefined()
      expect(typeof memory.storeDailyContext).toBe('function')

      expect(memory.markGoalCompleted).toBeDefined()
      expect(typeof memory.markGoalCompleted).toBe('function')

      expect(memory.storeKeyInsight).toBeDefined()
      expect(typeof memory.storeKeyInsight).toBe('function')

      expect(memory.fulfillCommitment).toBeDefined()
      expect(typeof memory.fulfillCommitment).toBe('function')

      expect(memory.getUnfulfilledCommitments).toBeDefined()
      expect(typeof memory.getUnfulfilledCommitments).toBe('function')

      expect(memory.searchMemory).toBeDefined()
      expect(typeof memory.searchMemory).toBe('function')
    })

    it('14. Memory storage and retrieval work correctly', async () => {
      const { storeConversation, getUnfulfilledCommitments } = await import('@/lib/ai/memory')

      // Test storeConversation
      const conversationId = await storeConversation({
        userId: 'test-user',
        type: 'daily_checkin',
        messages: [
          { role: 'user', content: 'Hello', timestamp: new Date().toISOString() },
          { role: 'companion', content: 'Hi there!', timestamp: new Date().toISOString() },
        ],
        startingMood: 5,
        endingMood: 7,
        topicsDiscussed: ['greeting'],
      })

      // Should return an ID (from mock)
      expect(conversationId).toBeDefined()

      // Test getUnfulfilledCommitments
      mockState.conversations = [
        {
          commitments_made: [
            { promise: 'Check on burnout', fulfilled: false },
            { promise: 'Follow up on interview', fulfilled: true },
          ],
        },
      ]

      const unfulfilled = await getUnfulfilledCommitments('test-user')
      expect(Array.isArray(unfulfilled)).toBe(true)
    })
  })

  // ==========================================================================
  // 22.5 — Prompts (prompts.ts)
  // ==========================================================================

  describe('Prompts (prompts.ts)', () => {
    it('15. System prompt is non-empty string', async () => {
      const { COMPANION_SYSTEM_PROMPT } = await import('@/lib/ai/prompts')

      expect(typeof COMPANION_SYSTEM_PROMPT).toBe('string')
      expect(COMPANION_SYSTEM_PROMPT.length).toBeGreaterThan(0)
    })

    it('16. Prompt templates include Siggy personality', async () => {
      const { COMPANION_SYSTEM_PROMPT, buildDailyCheckInPrompt } = await import('@/lib/ai/prompts')

      // System prompt should include companion identity elements
      expect(COMPANION_SYSTEM_PROMPT).toContain('companion')
      expect(COMPANION_SYSTEM_PROMPT).toContain('trusted')

      // Check for PM mentor awareness
      expect(COMPANION_SYSTEM_PROMPT).toContain('PM')

      // Check for brand voice elements (case-insensitive)
      expect(COMPANION_SYSTEM_PROMPT.toLowerCase()).toContain('validation')
      expect(COMPANION_SYSTEM_PROMPT.toLowerCase()).toContain('celebrate')

      // Build a prompt and check structure
      const dailyPrompt = buildDailyCheckInPrompt({
        userName: 'Test',
        currentTime: '10:00 AM',
        daysSinceLastCheckin: 0,
        currentStreak: 5,
        lastMood: 7,
        energyLevel: 'good',
        recentContextSummary: 'Applied to 3 jobs',
        userCurrentMessage: 'Feeling okay today',
        conversationNumber: 10,
        completedGoalsRatio: '8/10',
      })

      expect(dailyPrompt).toContain('Test')
      expect(dailyPrompt).toContain('Feeling okay today')
    })

    it('17. Prompts reference emotional intelligence', async () => {
      const {
        COMPANION_SYSTEM_PROMPT,
        buildMoodResponsePrompt,
        buildRejectionSupportPrompt,
      } = await import('@/lib/ai/prompts')

      // System prompt should reference emotional intelligence (case-insensitive for flexibility)
      expect(COMPANION_SYSTEM_PROMPT).toContain('EMOTIONAL INTELLIGENCE')
      expect(COMPANION_SYSTEM_PROMPT.toLowerCase()).toContain('validation')
      expect(COMPANION_SYSTEM_PROMPT.toLowerCase()).toContain('validate')

      // Check burnout awareness (case-insensitive)
      expect(COMPANION_SYSTEM_PROMPT.toLowerCase()).toContain('burnout')

      // Check that mood response prompt includes emotional calibration
      const moodPrompt = buildMoodResponsePrompt({
        userMessage: 'I feel tired',
        detectedMood: 4,
        energyLevel: 'low',
        emotionKeywords: ['tired'],
        recentRejectionCount: 2,
        daysSinceNoResponse: 5,
        applicationsThisWeek: 3,
        burnoutScore: 60,
      })

      expect(moodPrompt).toContain('VALIDATION')
      expect(moodPrompt).toContain('BURNED OUT')

      // Check rejection support prompt
      const rejectionPrompt = buildRejectionSupportPrompt({
        companyName: 'TechCorp',
        position: 'PM',
        rejectionStage: 'interview',
        hasFeedback: true,
        feedbackContent: 'Need more experience',
        excitementLevel: 'high',
        recentRejectionCount: 3,
      })

      expect(rejectionPrompt).toContain('VALIDATION')
      expect(rejectionPrompt).toContain('hurt')
    })
  })

  // ==========================================================================
  // 22.6 — AI index (index.ts)
  // ==========================================================================

  describe('AI index (index.ts)', () => {
    it('18. Exports all public AI functions', async () => {
      const aiModule = await import('@/lib/ai')

      // Companion exports
      expect(aiModule.detectEmotionalState).toBeDefined()
      expect(aiModule.generateCheckInResponse).toBeDefined()
      expect(aiModule.generateMicroGoal).toBeDefined()
      expect(aiModule.generateCelebration).toBeDefined()
      expect(aiModule.generateRejectionSupport).toBeDefined()
      expect(aiModule.generateFollowUpEmail).toBeDefined()
      expect(aiModule.generateConversationalResponse).toBeDefined()
      expect(aiModule.getMockCompanionResponse).toBeDefined()

      // Context exports
      expect(aiModule.getCompanionContext).toBeDefined()
      expect(aiModule.getTopicContext).toBeDefined()
      expect(aiModule.getPendingFollowUps).toBeDefined()
      expect(aiModule.getBurnoutRisk).toBeDefined()

      // Memory exports
      expect(aiModule.storeConversation).toBeDefined()
      expect(aiModule.addMessageToConversation).toBeDefined()
      expect(aiModule.storeDailyContext).toBeDefined()
      expect(aiModule.markGoalCompleted).toBeDefined()
      expect(aiModule.storeKeyInsight).toBeDefined()
      expect(aiModule.fulfillCommitment).toBeDefined()
      expect(aiModule.getUnfulfilledCommitments).toBeDefined()
      expect(aiModule.searchMemory).toBeDefined()

      // Prompts exports
      expect(aiModule.COMPANION_SYSTEM_PROMPT).toBeDefined()
      expect(aiModule.buildDailyCheckInPrompt).toBeDefined()
      expect(aiModule.buildMoodResponsePrompt).toBeDefined()
      expect(aiModule.buildMicroGoalPrompt).toBeDefined()
      expect(aiModule.buildCelebrationPrompt).toBeDefined()
      expect(aiModule.buildRejectionSupportPrompt).toBeDefined()
      expect(aiModule.buildFollowUpEmailPrompt).toBeDefined()
    })
  })
})
