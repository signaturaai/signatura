/**
 * Compensation Generate Strategy API Subscription Integration Tests
 *
 * Tests for the SPLIT PATTERN implementation in POST /api/compensation/generate-strategy.
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

vi.mock('@/lib/compensation', () => ({
  generateNegotiationStrategy: vi.fn(() =>
    Promise.resolve({
      id: 'strategy-123',
      userId: 'test-user-123',
      overallRating: 'strong',
      targetSalary: 150000,
      negotiationRoom: 15,
      strategies: [
        {
          category: 'base_salary',
          priority: 'high',
          approach: 'Lead with market data',
          talkingPoints: ['Point 1', 'Point 2'],
          risks: ['Risk 1'],
        },
      ],
      timeline: {
        phase1: 'Initial response',
        phase2: 'Counter offer',
        phase3: 'Final negotiation',
      },
      createdAt: new Date().toISOString(),
    })
  ),
}))

// Helper to create a mock request
function createMockRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/compensation/generate-strategy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/compensation/generate-strategy - Subscription Integration', () => {
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
    offerDetails: {
      baseSalary: 120000,
      currency: 'USD',
      roleTitle: 'Senior Software Engineer',
      roleLevel: 'senior',
      location: 'San Francisco, CA',
      companyName: 'Tech Corp',
    },
    userPriorities: {
      primaryFocus: 'base_salary',
      willingToWalkAway: true,
      otherOffers: false,
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
      const { POST } = await import('@/app/api/compensation/generate-strategy/route')

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
        current: 2,
        limit: 2,
      } as any
      const { POST } = await import('@/app/api/compensation/generate-strategy/route')

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
        current: 2,
        limit: 2,
      } as any
      const { POST } = await import('@/app/api/compensation/generate-strategy/route')

      const request = createMockRequest(validRequestBody)

      await POST(request)

      expect(incrementUsageCalled).toBe(false)
    })
  })

  describe('SPLIT PATTERN: Usage Increment on Success', () => {
    it('should increment usage after successful strategy generation', async () => {
      checkUsageLimitResult = { allowed: true, current: 1, limit: 10 }
      const { POST } = await import('@/app/api/compensation/generate-strategy/route')

      const request = createMockRequest(validRequestBody)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(incrementUsageCalled).toBe(true)
    })

    it('should include strategy data in successful response', async () => {
      checkUsageLimitResult = { allowed: true, current: 0, limit: 10 }
      const { POST } = await import('@/app/api/compensation/generate-strategy/route')

      const request = createMockRequest(validRequestBody)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.strategy).toBeDefined()
      expect(data.strategy.overallRating).toBe('strong')
    })
  })

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUser = null
      const { POST } = await import('@/app/api/compensation/generate-strategy/route')

      const request = createMockRequest(validRequestBody)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })
})
