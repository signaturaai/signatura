/**
 * CV Tailor API Subscription Integration Tests
 *
 * Tests for the SPLIT PATTERN implementation in POST /api/cv/tailor.
 * Validates 402/403 responses and usage tracking.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Test configuration state
let mockUser: { id: string } | null = { id: 'test-user-123' }
let checkUsageLimitResult = { allowed: true, current: 0, limit: 10 }
let incrementUsageCalled = false
let generateCVResult = {
  success: true,
  baseOverallScore: 70,
  tailoredOverallScore: 85,
  finalOverallScore: 85,
  overallImprovement: 15,
  sectionComparisons: [],
  sectionsImproved: 3,
  sectionsKeptOriginal: 1,
  totalSections: 4,
  finalCVText: 'Tailored CV text',
  processingTimeMs: 1000,
}

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
                data: { id: 'session-123' },
                error: null,
              })
            ),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
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

vi.mock('@/lib/cv', () => ({
  generateBestOfBothWorldsCV: vi.fn(() => Promise.resolve(generateCVResult)),
}))

// Helper to create a mock request
function createMockRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/cv/tailor', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/cv/tailor - Subscription Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset test state
    mockUser = { id: 'test-user-123' }
    checkUsageLimitResult = { allowed: true, current: 0, limit: 10 }
    incrementUsageCalled = false
    generateCVResult = {
      success: true,
      baseOverallScore: 70,
      tailoredOverallScore: 85,
      finalOverallScore: 85,
      overallImprovement: 15,
      sectionComparisons: [],
      sectionsImproved: 3,
      sectionsKeptOriginal: 1,
      totalSections: 4,
      finalCVText: 'Tailored CV text',
      processingTimeMs: 1000,
    }
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
      const { POST } = await import('@/app/api/cv/tailor/route')

      const request = createMockRequest({
        baseCVText: 'A'.repeat(200), // Long enough CV text
        jobDescription: 'B'.repeat(100), // Long enough job description
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
        current: 5,
        limit: 5,
      } as any
      const { POST } = await import('@/app/api/cv/tailor/route')

      const request = createMockRequest({
        baseCVText: 'A'.repeat(200),
        jobDescription: 'B'.repeat(100),
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
        current: 5,
        limit: 5,
      } as any
      const { POST } = await import('@/app/api/cv/tailor/route')

      const request = createMockRequest({
        baseCVText: 'A'.repeat(200),
        jobDescription: 'B'.repeat(100),
      })

      await POST(request)

      expect(incrementUsageCalled).toBe(false)
    })
  })

  describe('SPLIT PATTERN: Usage Increment on Success', () => {
    it('should increment usage after successful CV tailoring', async () => {
      checkUsageLimitResult = { allowed: true, current: 2, limit: 10 }
      const { POST } = await import('@/app/api/cv/tailor/route')

      const request = createMockRequest({
        baseCVText: 'A'.repeat(200),
        jobDescription: 'B'.repeat(100),
        saveToDatabase: false,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(incrementUsageCalled).toBe(true)
    })

    it('should not increment usage if CV generation fails', async () => {
      checkUsageLimitResult = { allowed: true, current: 2, limit: 10 }
      generateCVResult = { ...generateCVResult, success: false }
      const { POST } = await import('@/app/api/cv/tailor/route')

      const request = createMockRequest({
        baseCVText: 'A'.repeat(200),
        jobDescription: 'B'.repeat(100),
        saveToDatabase: false,
      })

      await POST(request)

      // Usage should NOT be incremented when generation fails
      expect(incrementUsageCalled).toBe(false)
    })

    it('should include result data in successful response', async () => {
      checkUsageLimitResult = { allowed: true, current: 0, limit: 10 }
      const { POST } = await import('@/app/api/cv/tailor/route')

      const request = createMockRequest({
        baseCVText: 'A'.repeat(200),
        jobDescription: 'B'.repeat(100),
        saveToDatabase: false,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.result).toBeDefined()
      expect(data.result.overallImprovement).toBe(15)
    })
  })

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUser = null
      const { POST } = await import('@/app/api/cv/tailor/route')

      const request = createMockRequest({
        baseCVText: 'A'.repeat(200),
        jobDescription: 'B'.repeat(100),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })
  })
})
