/**
 * Interview Generate Plan API Subscription Integration Tests
 *
 * Tests for the SPLIT PATTERN implementation in POST /api/interview/generate-plan.
 * Validates 402/403 responses and usage tracking.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Test configuration state
let mockUser: { id: string } | null = { id: 'test-user-123' }
let checkUsageLimitResult = { allowed: true, current: 0, limit: 10 }
let incrementUsageCalled = false

// Setup mocks before importing the route
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: vi.fn(() =>
          Promise.resolve({
            data: { user: mockUser },
            error: mockUser ? null : { message: 'Not authenticated' },
          })
        ),
      },
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        })),
      })),
    })
  ),
  createServiceClient: vi.fn(() => ({})),
}))

vi.mock('@/lib/subscription/access-control', () => ({
  checkUsageLimit: vi.fn(() => Promise.resolve(checkUsageLimitResult)),
  incrementUsage: vi.fn(() => {
    incrementUsageCalled = true
    return Promise.resolve()
  }),
}))

vi.mock('@/lib/interview', () => ({
  generateInterviewPlan: vi.fn(() =>
    Promise.resolve({
      id: 'plan-123',
      userId: 'test-user-123',
      interviewerProfile: {
        name: 'Test Interviewer',
        role: 'Engineering Manager',
        communicationStyle: 'direct',
        focusAreas: ['technical', 'behavioral'],
        keyQuestions: [],
      },
      questions: [
        {
          id: 'q1',
          type: 'behavioral',
          question: 'Tell me about yourself',
          notes: 'Common opener',
          difficulty: 'medium',
          timeEstimate: 5,
        },
      ],
      prepGuide: {
        keyTopics: ['System Design'],
        practiceAreas: ['Coding'],
        commonPitfalls: ['Rushing'],
      },
      createdAt: new Date().toISOString(),
    })
  ),
  getMockInterviewPlan: vi.fn(() =>
    Promise.resolve({
      id: 'mock-plan',
      userId: 'test-user',
      questions: [],
      interviewerProfile: {},
      prepGuide: {},
      createdAt: new Date().toISOString(),
    })
  ),
}))

// Helper to create a mock request
function createMockRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/interview/generate-plan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/interview/generate-plan - Subscription Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset test state
    mockUser = { id: 'test-user-123' }
    checkUsageLimitResult = { allowed: true, current: 0, limit: 10 }
    incrementUsageCalled = false
  })

  afterEach(() => {
    vi.resetModules()
  })

  const validRequestBody = {
    jobDescription: 'Software Engineer role at a tech company',
    tailoredCV: 'Experienced developer with 5 years...',
    config: {
      interviewType: 'technical',
      personaMode: 'preset',
      persona: 'friendly',
      focusAreas: ['system-design', 'coding'],
    },
  }

  describe('SPLIT PATTERN: Usage Limit Check', () => {
    it('should return 402 when user has NO_SUBSCRIPTION', async () => {
      checkUsageLimitResult = {
        allowed: false,
        reason: 'NO_SUBSCRIPTION',
        current: 0,
        limit: 0,
      } as any
      const { POST } = await import('@/app/api/interview/generate-plan/route')

      const request = createMockRequest(validRequestBody)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(402)
      expect(data.error).toBe('Subscription required')
      expect(data.reason).toBe('NO_SUBSCRIPTION')
    })

    it('should return 403 when usage limit is reached', async () => {
      checkUsageLimitResult = {
        allowed: false,
        reason: 'LIMIT_REACHED',
        current: 3,
        limit: 3,
      } as any
      const { POST } = await import('@/app/api/interview/generate-plan/route')

      const request = createMockRequest(validRequestBody)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Usage limit reached')
      expect(data.reason).toBe('LIMIT_REACHED')
    })

    it('should not increment usage when limit check fails', async () => {
      checkUsageLimitResult = {
        allowed: false,
        reason: 'LIMIT_REACHED',
        current: 3,
        limit: 3,
      } as any
      const { POST } = await import('@/app/api/interview/generate-plan/route')

      const request = createMockRequest(validRequestBody)

      await POST(request)

      expect(incrementUsageCalled).toBe(false)
    })
  })

  describe('SPLIT PATTERN: Usage Increment on Success', () => {
    it('should increment usage after successful plan generation', async () => {
      checkUsageLimitResult = { allowed: true, current: 1, limit: 10 }
      const { POST } = await import('@/app/api/interview/generate-plan/route')

      const request = createMockRequest(validRequestBody)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(incrementUsageCalled).toBe(true)
    })

    it('should include plan data in successful response', async () => {
      checkUsageLimitResult = { allowed: true, current: 0, limit: 10 }
      const { POST } = await import('@/app/api/interview/generate-plan/route')

      const request = createMockRequest(validRequestBody)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.plan).toBeDefined()
      expect(data.plan.questions).toBeDefined()
    })
  })

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUser = null
      const { POST } = await import('@/app/api/interview/generate-plan/route')

      const request = createMockRequest(validRequestBody)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })
})
