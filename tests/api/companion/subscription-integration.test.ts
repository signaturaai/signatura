/**
 * Companion Chat API Subscription Integration Tests
 *
 * Tests for the SPLIT PATTERN implementation in POST /api/companion/chat.
 * Validates 402/403 responses for both feature access and usage limits.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Test configuration state
let mockUser: { id: string } | null = { id: 'test-user-123' }
let checkFeatureAccessResult = { hasAccess: true }
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
    })
  ),
  createServiceClient: vi.fn(() => ({})),
}))

vi.mock('@/lib/subscription/access-control', () => ({
  checkFeatureAccess: vi.fn(() => Promise.resolve(checkFeatureAccessResult)),
  checkUsageLimit: vi.fn(() => Promise.resolve(checkUsageLimitResult)),
  incrementUsage: vi.fn(() => {
    incrementUsageCalled = true
    return Promise.resolve()
  }),
}))

vi.mock('@/lib/ai', () => ({
  getMockCompanionResponse: vi.fn(() =>
    Promise.resolve({
      message: 'Hello! How can I help you today?',
      tone: 'supportive',
      detectedMood: 'neutral',
      detectedEnergy: 'medium',
      burnoutWarning: false,
      emotionalKeywords: ['greeting'],
      suggestedGoal: null,
    })
  ),
  generateCheckInResponse: vi.fn(() =>
    Promise.resolve({
      message: 'Thanks for checking in!',
      tone: 'supportive',
      detectedMood: 'positive',
      detectedEnergy: 'high',
      burnoutWarning: false,
    })
  ),
  generateConversationalResponse: vi.fn(() => Promise.resolve('Conversational response')),
  getCompanionContext: vi.fn(() =>
    Promise.resolve({
      emotionalState: { mood: 'neutral', energy: 'medium' },
    })
  ),
  storeDailyContext: vi.fn(() => Promise.resolve()),
  storeConversation: vi.fn(() => Promise.resolve()),
}))

// Helper to create a mock request
function createMockRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/companion/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/companion/chat - Subscription Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset test state
    mockUser = { id: 'test-user-123' }
    checkFeatureAccessResult = { hasAccess: true }
    checkUsageLimitResult = { allowed: true, current: 0, limit: 10 }
    incrementUsageCalled = false
    // Force mock mode
    process.env.USE_MOCK_AI = 'true'
  })

  afterEach(() => {
    vi.resetModules()
    delete process.env.USE_MOCK_AI
  })

  describe('SPLIT PATTERN: Feature Access Check', () => {
    it('should return 402 when user has no_subscription for feature', async () => {
      checkFeatureAccessResult = {
        hasAccess: false,
        reason: 'no_subscription',
      } as any
      const { POST } = await import('@/app/api/companion/chat/route')

      const request = createMockRequest({ message: 'Hello!' })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(402)
      expect(data.error).toBe('Subscription required')
      expect(data.reason).toBe('no_subscription')
    })

    it('should return 403 when feature is not available in plan', async () => {
      checkFeatureAccessResult = {
        hasAccess: false,
        reason: 'feature_not_included',
      } as any
      const { POST } = await import('@/app/api/companion/chat/route')

      const request = createMockRequest({ message: 'Hello!' })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Feature not available in your plan')
    })
  })

  describe('SPLIT PATTERN: Usage Limit Check', () => {
    it('should return 402 when user has NO_SUBSCRIPTION for usage', async () => {
      checkFeatureAccessResult = { hasAccess: true }
      checkUsageLimitResult = {
        allowed: false,
        reason: 'NO_SUBSCRIPTION',
        current: 0,
        limit: 0,
      } as any
      const { POST } = await import('@/app/api/companion/chat/route')

      const request = createMockRequest({ message: 'Hello!' })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(402)
      expect(data.error).toBe('Subscription required')
      expect(data.reason).toBe('NO_SUBSCRIPTION')
    })

    it('should return 403 when usage limit is reached', async () => {
      checkFeatureAccessResult = { hasAccess: true }
      checkUsageLimitResult = {
        allowed: false,
        reason: 'LIMIT_REACHED',
        current: 10,
        limit: 10,
      } as any
      const { POST } = await import('@/app/api/companion/chat/route')

      const request = createMockRequest({ message: 'Hello!' })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Usage limit reached')
      expect(data.reason).toBe('LIMIT_REACHED')
    })

    it('should not increment usage when limit check fails', async () => {
      checkFeatureAccessResult = { hasAccess: true }
      checkUsageLimitResult = {
        allowed: false,
        reason: 'LIMIT_REACHED',
        current: 10,
        limit: 10,
      } as any
      const { POST } = await import('@/app/api/companion/chat/route')

      const request = createMockRequest({ message: 'Hello!' })

      await POST(request)

      expect(incrementUsageCalled).toBe(false)
    })
  })

  describe('SPLIT PATTERN: Usage Increment on Success', () => {
    it('should increment usage after successful chat response', async () => {
      checkFeatureAccessResult = { hasAccess: true }
      checkUsageLimitResult = { allowed: true, current: 5, limit: 10 }
      const { POST } = await import('@/app/api/companion/chat/route')

      const request = createMockRequest({ message: 'Hello!' })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBeDefined()
      expect(incrementUsageCalled).toBe(true)
    })

    it('should include response data in successful response', async () => {
      checkFeatureAccessResult = { hasAccess: true }
      checkUsageLimitResult = { allowed: true, current: 0, limit: 10 }
      const { POST } = await import('@/app/api/companion/chat/route')

      const request = createMockRequest({ message: 'Hello!' })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBeDefined()
      expect(data.tone).toBeDefined()
      expect(data.detectedMood).toBeDefined()
    })
  })

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUser = null
      const { POST } = await import('@/app/api/companion/chat/route')

      const request = createMockRequest({ message: 'Hello!' })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })
})
