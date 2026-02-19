/**
 * Contract Analyze API Subscription Integration Tests
 *
 * Tests for the SPLIT PATTERN implementation in POST /api/contract/analyze.
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
        insert: vi.fn(() => Promise.resolve({ error: null })),
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

vi.mock('@/lib/contract', () => ({
  analyzeContract: vi.fn(() =>
    Promise.resolve({
      id: 'analysis-123',
      user_id: 'test-user-123',
      job_application_id: null,
      file_url: 'https://example.com/contract.pdf',
      file_name: 'contract.pdf',
      file_type: 'pdf',
      extracted_text: 'Contract text here...',
      analysis: {
        summary: 'Employment contract for Software Engineer position',
        overallRiskScore: 3,
        clauses: [
          {
            title: 'Non-compete',
            text: 'Employee agrees not to...',
            riskLevel: 'yellow',
            explanation: 'Standard non-compete clause',
            suggestions: ['Consider negotiating duration'],
          },
        ],
        recommendations: ['Review benefits section'],
      },
      red_flag_count: 1,
      yellow_flag_count: 2,
      green_clause_count: 5,
      user_reviewed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  ),
}))

// Helper to create a mock request
function createMockRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/contract/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/contract/analyze - Subscription Integration', () => {
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
    fileUrl: 'https://example.com/contracts/employment-contract.pdf',
    fileName: 'employment-contract.pdf',
    userRole: 'employee',
  }

  describe('SPLIT PATTERN: Usage Limit Check', () => {
    it('should return 402 when user has NO_SUBSCRIPTION', async () => {
      checkUsageLimitResult = {
        allowed: false,
        reason: 'NO_SUBSCRIPTION',
        current: 0,
        limit: 0,
      } as any
      const { POST } = await import('@/app/api/contract/analyze/route')

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
        current: 5,
        limit: 5,
      } as any
      const { POST } = await import('@/app/api/contract/analyze/route')

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
        current: 5,
        limit: 5,
      } as any
      const { POST } = await import('@/app/api/contract/analyze/route')

      const request = createMockRequest(validRequestBody)

      await POST(request)

      expect(incrementUsageCalled).toBe(false)
    })
  })

  describe('SPLIT PATTERN: Usage Increment on Success', () => {
    it('should increment usage after successful contract analysis', async () => {
      checkUsageLimitResult = { allowed: true, current: 2, limit: 10 }
      const { POST } = await import('@/app/api/contract/analyze/route')

      const request = createMockRequest(validRequestBody)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(incrementUsageCalled).toBe(true)
    })

    it('should include analysis data in successful response', async () => {
      checkUsageLimitResult = { allowed: true, current: 0, limit: 10 }
      const { POST } = await import('@/app/api/contract/analyze/route')

      const request = createMockRequest(validRequestBody)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.analysis).toBeDefined()
      expect(data.analysis.clauses).toBeDefined()
      expect(data.analysis.overallRiskScore).toBeDefined()
    })
  })

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUser = null
      const { POST } = await import('@/app/api/contract/analyze/route')

      const request = createMockRequest(validRequestBody)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })
})
