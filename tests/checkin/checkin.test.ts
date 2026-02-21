/**
 * Daily Check-in Tests — RALPH Loop 17
 *
 * Tests for the daily check-in API endpoints.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// ============================================================================
// Mock Setup
// ============================================================================

// Mock state stored in a module-level object to avoid hoisting issues
const mockState = {
  user: null as { id: string; email: string } | null,
  todayCheckin: null as Record<string, unknown> | null,
  recentCheckins: [] as Array<Record<string, unknown>>,
  profile: null as Record<string, unknown> | null,
  existingCheckin: null as { id: string } | null,
  yesterdayCheckin: null as { id: string } | null,
  insertCalls: [] as Array<{ table: string; data: unknown }>,
  updateCalls: [] as Array<{ table: string; data: unknown; filter: unknown }>,
  companionResponse: {
    message: 'I hear you. How are you feeling today?',
    tone: 'supportive',
    detectedMood: 7,
    detectedEnergy: 'medium',
    burnoutWarning: false,
    celebrationDetected: false,
    shouldFollowUp: false,
    followUpTopic: null,
    emotionalKeywords: ['hopeful', 'calm'],
    suggestedGoal: { goal: 'Take a 10-minute walk', type: 'wellness', difficulty: 'easy' },
  },
}

// Mock AI companion
vi.mock('@/lib/ai/companion', () => ({
  generateCheckInResponse: vi.fn().mockImplementation(async () => mockState.companionResponse),
  getMockCompanionResponse: vi.fn().mockImplementation(async () => mockState.companionResponse),
}))

vi.mock('@/lib/ai/context', () => ({
  getCompanionContext: vi.fn().mockImplementation(async () => ({
    userId: mockState.user?.id,
    currentMessage: '',
  })),
}))

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    auth: {
      getUser: vi.fn().mockImplementation(async () => ({
        data: { user: mockState.user },
        error: mockState.user ? null : { message: 'Not authenticated' },
      })),
    },
    from: vi.fn().mockImplementation((tableName: string) => {
      // Track the current query context
      const queryContext = { isDateQuery: false, dateValue: '' }

      // Factory function to create chainable object
      const createChainable = (): Record<string, unknown> => {
        const obj: Record<string, unknown> = {}
        obj.eq = vi.fn().mockImplementation((col2: string, val2: string) => {
          if (col2 === 'date') {
            queryContext.isDateQuery = true
            queryContext.dateValue = val2
          }
          return obj
        })
        obj.gte = vi.fn().mockImplementation(() => obj)
        obj.order = vi.fn().mockImplementation(() => obj)
        obj.limit = vi.fn().mockImplementation(() => obj)
        obj.single = vi.fn().mockImplementation(async () => {
          if (tableName === 'user_profiles') {
            return { data: mockState.profile, error: null }
          }
          return { data: null, error: null }
        })
        obj.maybeSingle = vi.fn().mockImplementation(async () => {
          if (tableName === 'user_emotional_context') {
            // Determine if this is a yesterday check-in query
            const today = new Date().toISOString().split('T')[0]
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

            if (queryContext.isDateQuery && queryContext.dateValue === yesterday) {
              return { data: mockState.yesterdayCheckin, error: null }
            }
            if (queryContext.isDateQuery && queryContext.dateValue === today) {
              if (mockState.existingCheckin) {
                return { data: mockState.existingCheckin, error: null }
              }
              return { data: mockState.todayCheckin, error: null }
            }
            // Default to existing/today checkin
            if (mockState.existingCheckin) {
              return { data: mockState.existingCheckin, error: null }
            }
            return { data: mockState.todayCheckin, error: null }
          }
          return { data: null, error: null }
        })
        obj.then = (resolve: (value: { data: unknown; error: unknown }) => void) => {
          if (tableName === 'user_emotional_context') {
            resolve({ data: mockState.recentCheckins, error: null })
          } else {
            resolve({ data: null, error: null })
          }
          return Promise.resolve({ data: mockState.recentCheckins, error: null })
        }
        return obj
      }

      return {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockImplementation((data) => {
          mockState.insertCalls.push({ table: tableName, data })
          return {
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'new-checkin-123', ...data },
              error: null,
            }),
          }
        }),
        update: vi.fn().mockImplementation((data) => {
          return {
            eq: vi.fn().mockImplementation((field, value) => {
              mockState.updateCalls.push({ table: tableName, data, filter: { [field]: value } })
              return {
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                  data: { id: mockState.existingCheckin?.id, ...data },
                  error: null,
                }),
              }
            }),
          }
        }),
        eq: vi.fn().mockImplementation((column: string, value: string) => {
          // Track if this is a date query
          if (column === 'date') {
            queryContext.isDateQuery = true
            queryContext.dateValue = value
          }
          return createChainable()
        }),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      }
    }),
  })),
}))

// Import after mocking
import { GET, POST } from '@/app/api/checkin/route'

// ============================================================================
// Helper Functions
// ============================================================================

function createMockRequest(method: string, body?: Record<string, unknown>): NextRequest {
  const url = 'http://localhost:3000/api/checkin'
  const init: RequestInit = { method }

  if (body) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }

  return new NextRequest(url, init)
}

function setAuthenticatedUser(userId: string = 'user-123', email: string = 'test@example.com') {
  mockState.user = { id: userId, email }
}

function setUnauthenticated() {
  mockState.user = null
}

function setProfile(profile: Record<string, unknown>) {
  mockState.profile = profile
}

function setTodayCheckin(checkin: Record<string, unknown> | null) {
  mockState.todayCheckin = checkin
}

function setExistingCheckin(checkin: { id: string } | null) {
  mockState.existingCheckin = checkin
}

function setYesterdayCheckin(checkin: { id: string } | null) {
  mockState.yesterdayCheckin = checkin
}

function setRecentCheckins(checkins: Array<Record<string, unknown>>) {
  mockState.recentCheckins = checkins
}

function setCompanionResponse(response: Partial<typeof mockState.companionResponse>) {
  mockState.companionResponse = { ...mockState.companionResponse, ...response }
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Daily Check-in API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.user = null
    mockState.todayCheckin = null
    mockState.recentCheckins = []
    mockState.profile = null
    mockState.existingCheckin = null
    mockState.yesterdayCheckin = null
    mockState.insertCalls = []
    mockState.updateCalls = []
    mockState.companionResponse = {
      message: 'I hear you. How are you feeling today?',
      tone: 'supportive',
      detectedMood: 7,
      detectedEnergy: 'medium',
      burnoutWarning: false,
      celebrationDetected: false,
      shouldFollowUp: false,
      followUpTopic: null,
      emotionalKeywords: ['hopeful', 'calm'],
      suggestedGoal: { goal: 'Take a 10-minute walk', type: 'wellness', difficulty: 'easy' },
    }
  })

  afterEach(() => {
    vi.resetModules()
  })

  // ==========================================================================
  // 17.1 — GET /api/checkin
  // ==========================================================================

  describe('GET /api/checkin', () => {
    it('1. Returns 401 when unauthenticated', async () => {
      setUnauthenticated()
      const request = createMockRequest('GET')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('2. Returns hasCheckedInToday: true when check-in exists', async () => {
      setAuthenticatedUser()
      setTodayCheckin({ id: 'checkin-today', mood_rating: 8 })
      const request = createMockRequest('GET')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.hasCheckedInToday).toBe(true)
      expect(data.todayCheckin).toBeDefined()
    })

    it('3. Returns hasCheckedInToday: false when no check-in', async () => {
      setAuthenticatedUser()
      setTodayCheckin(null)
      const request = createMockRequest('GET')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.hasCheckedInToday).toBe(false)
      expect(data.todayCheckin).toBeNull()
    })

    it('4. Returns recentCheckins array (last 7 days)', async () => {
      setAuthenticatedUser()
      setRecentCheckins([
        { id: 'checkin-1', date: '2026-02-21', mood_rating: 7 },
        { id: 'checkin-2', date: '2026-02-20', mood_rating: 6 },
        { id: 'checkin-3', date: '2026-02-19', mood_rating: 8 },
      ])
      const request = createMockRequest('GET')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.recentCheckins).toHaveLength(3)
      expect(data.recentCheckins[0].id).toBe('checkin-1')
    })

    it('5. Returns streak info from profile', async () => {
      setAuthenticatedUser()
      setProfile({
        current_streak: 5,
        longest_streak: 12,
        total_checkins: 45,
        full_name: 'Test User',
      })
      const request = createMockRequest('GET')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.streak).toBe(5)
      expect(data.longestStreak).toBe(12)
      expect(data.totalCheckins).toBe(45)
      expect(data.userName).toBe('Test User')
    })

    it('6. Returns default values when profile is missing', async () => {
      setAuthenticatedUser()
      setProfile(null)
      const request = createMockRequest('GET')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.streak).toBe(0)
      expect(data.longestStreak).toBe(0)
      expect(data.totalCheckins).toBe(0)
      expect(data.userName).toBe('Friend')
    })
  })

  // ==========================================================================
  // 17.2 — POST /api/checkin
  // ==========================================================================

  describe('POST /api/checkin', () => {
    it('7. Returns 401 when unauthenticated', async () => {
      setUnauthenticated()
      const request = createMockRequest('POST', { message: 'Hello' })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('8. Returns 400 when message is missing', async () => {
      setAuthenticatedUser()
      const request = createMockRequest('POST', {})

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Message is required')
    })

    it('9. Returns 400 when message is not a string', async () => {
      setAuthenticatedUser()
      const request = createMockRequest('POST', { message: 123 })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Message is required')
    })

    it('10. Creates new check-in when none exists today', async () => {
      setAuthenticatedUser('user-new-checkin')
      setExistingCheckin(null)
      setProfile({ current_streak: 1, longest_streak: 5, total_checkins: 10 })
      const request = createMockRequest('POST', { message: 'Feeling great today!' })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.checkin).toBeDefined()

      // Verify insert was called
      const insertCall = mockState.insertCalls.find(
        (call) => call.table === 'user_emotional_context'
      )
      expect(insertCall).toBeDefined()
      expect((insertCall?.data as Record<string, unknown>).user_id).toBe('user-new-checkin')
      expect((insertCall?.data as Record<string, unknown>).user_message).toBe('Feeling great today!')
    })

    it('11. Updates existing check-in when one exists today', async () => {
      setAuthenticatedUser()
      setExistingCheckin({ id: 'existing-checkin-123' })
      const request = createMockRequest('POST', { message: 'Updated message' })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify update was called (not insert)
      const updateCall = mockState.updateCalls.find(
        (call) => call.table === 'user_emotional_context'
      )
      expect(updateCall).toBeDefined()
    })

    it('12. Returns companion response with message and tone', async () => {
      setAuthenticatedUser()
      setExistingCheckin(null)
      setProfile({ current_streak: 1, longest_streak: 5, total_checkins: 10 })
      setCompanionResponse({
        message: 'That sounds wonderful!',
        tone: 'encouraging',
      })
      const request = createMockRequest('POST', { message: 'I got a new job!' })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.response.message).toBe('That sounds wonderful!')
      expect(data.response.tone).toBe('encouraging')
    })

    it('13. Returns detectedMood and detectedEnergy', async () => {
      setAuthenticatedUser()
      setExistingCheckin(null)
      setProfile({ current_streak: 1, longest_streak: 5, total_checkins: 10 })
      setCompanionResponse({
        detectedMood: 9,
        detectedEnergy: 'high',
      })
      const request = createMockRequest('POST', { message: 'Feeling energized!' })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.response.detectedMood).toBe(9)
      expect(data.response.detectedEnergy).toBe('high')
    })

    it('14. Returns suggestedGoal from companion', async () => {
      setAuthenticatedUser()
      setExistingCheckin(null)
      setProfile({ current_streak: 1, longest_streak: 5, total_checkins: 10 })
      setCompanionResponse({
        suggestedGoal: { goal: 'Meditate for 5 minutes', type: 'wellness', difficulty: 'easy' },
      })
      const request = createMockRequest('POST', { message: 'Need some calm' })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.response.suggestedGoal).toBeDefined()
      expect(data.response.suggestedGoal.goal).toBe('Meditate for 5 minutes')
      expect(data.response.suggestedGoal.type).toBe('wellness')
    })

    it('15. Returns burnoutWarning when detected', async () => {
      setAuthenticatedUser()
      setExistingCheckin(null)
      setProfile({ current_streak: 1, longest_streak: 5, total_checkins: 10 })
      setCompanionResponse({
        burnoutWarning: true,
        detectedMood: 2,
      })
      const request = createMockRequest('POST', { message: 'So exhausted, cant keep going' })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.response.burnoutWarning).toBe(true)
    })

    it('16. Returns celebrationDetected when detected', async () => {
      setAuthenticatedUser()
      setExistingCheckin(null)
      setProfile({ current_streak: 1, longest_streak: 5, total_checkins: 10 })
      setCompanionResponse({
        celebrationDetected: true,
        detectedMood: 10,
      })
      const request = createMockRequest('POST', { message: 'I got the job offer!' })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.response.celebrationDetected).toBe(true)
    })

    it('17. Calculates burnout_risk_level: high when burnoutWarning', async () => {
      setAuthenticatedUser()
      setExistingCheckin(null)
      setProfile({ current_streak: 1, longest_streak: 5, total_checkins: 10 })
      setCompanionResponse({
        burnoutWarning: true,
        detectedMood: 2,
      })
      const request = createMockRequest('POST', { message: 'Burned out' })

      await POST(request)

      const insertCall = mockState.insertCalls.find(
        (call) => call.table === 'user_emotional_context'
      )
      expect((insertCall?.data as Record<string, unknown>).burnout_risk_level).toBe('high')
      expect((insertCall?.data as Record<string, unknown>).burnout_risk_score).toBe(80)
    })

    it('18. Calculates burnout_risk_level: moderate when mood <= 3', async () => {
      setAuthenticatedUser()
      setExistingCheckin(null)
      setProfile({ current_streak: 1, longest_streak: 5, total_checkins: 10 })
      setCompanionResponse({
        burnoutWarning: false,
        detectedMood: 3,
      })
      const request = createMockRequest('POST', { message: 'Not feeling well' })

      await POST(request)

      const insertCall = mockState.insertCalls.find(
        (call) => call.table === 'user_emotional_context'
      )
      expect((insertCall?.data as Record<string, unknown>).burnout_risk_level).toBe('moderate')
      expect((insertCall?.data as Record<string, unknown>).burnout_risk_score).toBe(50)
    })

    it('19. Calculates burnout_risk_level: low when mood > 3 and no warning', async () => {
      setAuthenticatedUser()
      setExistingCheckin(null)
      setProfile({ current_streak: 1, longest_streak: 5, total_checkins: 10 })
      setCompanionResponse({
        burnoutWarning: false,
        detectedMood: 8,
      })
      const request = createMockRequest('POST', { message: 'Feeling good' })

      await POST(request)

      const insertCall = mockState.insertCalls.find(
        (call) => call.table === 'user_emotional_context'
      )
      expect((insertCall?.data as Record<string, unknown>).burnout_risk_level).toBe('low')
      expect((insertCall?.data as Record<string, unknown>).burnout_risk_score).toBe(20)
    })

    it('20. Stores emotional_keywords from companion response', async () => {
      setAuthenticatedUser()
      setExistingCheckin(null)
      setProfile({ current_streak: 1, longest_streak: 5, total_checkins: 10 })
      setCompanionResponse({
        emotionalKeywords: ['anxious', 'hopeful', 'determined'],
      })
      const request = createMockRequest('POST', { message: 'Mixed feelings' })

      await POST(request)

      const insertCall = mockState.insertCalls.find(
        (call) => call.table === 'user_emotional_context'
      )
      expect((insertCall?.data as Record<string, unknown>).emotional_keywords).toEqual([
        'anxious',
        'hopeful',
        'determined',
      ])
    })
  })

  // ==========================================================================
  // 17.3 — updateStreak helper (tested via POST behavior)
  // ==========================================================================

  describe('updateStreak helper', () => {
    it('21. Increments streak when yesterday has check-in', async () => {
      setAuthenticatedUser('user-streak')
      setExistingCheckin(null)
      setYesterdayCheckin({ id: 'yesterday-checkin' })
      setProfile({
        current_streak: 3,
        longest_streak: 10,
        total_checkins: 25,
      })
      const request = createMockRequest('POST', { message: 'Continuing streak' })

      await POST(request)

      // Verify profile update was called with incremented streak
      const updateCall = mockState.updateCalls.find((call) => call.table === 'user_profiles')
      expect(updateCall).toBeDefined()
      const updateData = updateCall?.data as Record<string, unknown>
      expect(updateData.current_streak).toBe(4)
      expect(updateData.total_checkins).toBe(26)
    })

    it('22. Resets streak to 1 when no yesterday check-in', async () => {
      setAuthenticatedUser('user-reset-streak')
      setExistingCheckin(null)
      setYesterdayCheckin(null)
      setProfile({
        current_streak: 5,
        longest_streak: 10,
        total_checkins: 30,
      })
      const request = createMockRequest('POST', { message: 'Starting fresh' })

      await POST(request)

      // Verify profile update was called with reset streak
      const updateCall = mockState.updateCalls.find((call) => call.table === 'user_profiles')
      expect(updateCall).toBeDefined()
      const updateData = updateCall?.data as Record<string, unknown>
      expect(updateData.current_streak).toBe(1)
      expect(updateData.total_checkins).toBe(31)
    })

    it('23. Updates longest_streak when new streak exceeds it', async () => {
      setAuthenticatedUser('user-new-record')
      setExistingCheckin(null)
      setYesterdayCheckin({ id: 'yesterday-checkin' })
      setProfile({
        current_streak: 10,
        longest_streak: 10,
        total_checkins: 50,
      })
      const request = createMockRequest('POST', { message: 'New record!' })

      await POST(request)

      // Verify profile update was called with new longest streak
      const updateCall = mockState.updateCalls.find((call) => call.table === 'user_profiles')
      expect(updateCall).toBeDefined()
      const updateData = updateCall?.data as Record<string, unknown>
      expect(updateData.current_streak).toBe(11)
      expect(updateData.longest_streak).toBe(11)
    })

    it('24. Does not update streak when updating existing check-in', async () => {
      setAuthenticatedUser()
      setExistingCheckin({ id: 'existing-checkin-id' })
      setProfile({
        current_streak: 5,
        longest_streak: 10,
        total_checkins: 25,
      })
      const request = createMockRequest('POST', { message: 'Updating existing' })

      await POST(request)

      // Verify no profile update was called (streak only updates on new check-in)
      const profileUpdateCall = mockState.updateCalls.find(
        (call) => call.table === 'user_profiles'
      )
      expect(profileUpdateCall).toBeUndefined()
    })
  })
})
