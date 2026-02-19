/**
 * Applications API Subscription Integration Tests
 *
 * Tests for the SPLIT PATTERN implementation in POST /api/applications.
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
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: {
                  id: 'app-123',
                  company_name: 'Test Company',
                  position_title: 'Software Engineer',
                  job_description: 'Test description',
                },
                error: null,
              })
            ),
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

// Helper to create a mock request
function createMockRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/applications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/applications - Subscription Integration', () => {
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

  describe('SPLIT PATTERN: Usage Limit Check', () => {
    it('should return 402 when user has NO_SUBSCRIPTION', async () => {
      checkUsageLimitResult = {
        allowed: false,
        reason: 'NO_SUBSCRIPTION',
        current: 0,
        limit: 0,
      } as any
      const { POST } = await import('@/app/api/applications/route')

      const request = createMockRequest({
        company_name: 'Test Company',
        position_title: 'Software Engineer',
        job_description: 'This is a test job description for the position.',
      })

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
        current: 10,
        limit: 10,
      } as any
      const { POST } = await import('@/app/api/applications/route')

      const request = createMockRequest({
        company_name: 'Test Company',
        position_title: 'Software Engineer',
        job_description: 'This is a test job description for the position.',
      })

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
        current: 10,
        limit: 10,
      } as any
      const { POST } = await import('@/app/api/applications/route')

      const request = createMockRequest({
        company_name: 'Test Company',
        position_title: 'Software Engineer',
        job_description: 'This is a test job description for the position.',
      })

      await POST(request)

      expect(incrementUsageCalled).toBe(false)
    })
  })

  describe('SPLIT PATTERN: Usage Increment on Success', () => {
    it('should increment usage after successful application creation', async () => {
      checkUsageLimitResult = { allowed: true, current: 5, limit: 10 }
      const { POST } = await import('@/app/api/applications/route')

      const request = createMockRequest({
        company_name: 'Test Company',
        position_title: 'Software Engineer',
        job_description: 'This is a test job description for the position.',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(incrementUsageCalled).toBe(true)
    })

    it('should include application data in successful response', async () => {
      checkUsageLimitResult = { allowed: true, current: 0, limit: 10 }
      const { POST } = await import('@/app/api/applications/route')

      const request = createMockRequest({
        company_name: 'Test Company',
        position_title: 'Software Engineer',
        job_description: 'This is a test job description for the position.',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.application).toBeDefined()
      expect(data.application.company_name).toBe('Test Company')
    })
  })

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUser = null
      const { POST } = await import('@/app/api/applications/route')

      const request = createMockRequest({
        company_name: 'Test Company',
        position_title: 'Software Engineer',
        job_description: 'Test description',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })
})
