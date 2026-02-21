/**
 * GDPR Account Deletion Tests — RALPH Loop 14
 *
 * Tests for the GDPR account deletion API endpoints.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// ============================================================================
// Mock Setup
// ============================================================================

// Mock state stored in a module-level object to avoid hoisting issues
const mockState = {
  insertCalls: [] as Array<{ table: string; data: unknown }>,
  updateCalls: [] as Array<{ table: string; data: unknown; filter: unknown }>,
  user: null as { id: string; email: string } | null,
  existingDeletionRequest: null as Record<string, unknown> | null,
  allDeletionRequests: [] as Array<Record<string, unknown>>,
}

// Mock Supabase - must be defined before vi.mock
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    auth: {
      getUser: vi.fn().mockImplementation(async () => ({
        data: { user: mockState.user },
        error: mockState.user ? null : { message: 'Not authenticated' },
      })),
    },
    from: vi.fn().mockImplementation((tableName: string) => {
      return {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockImplementation((data) => {
          mockState.insertCalls.push({ table: tableName, data })
          return {
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'new-request-123', ...data },
              error: null,
            }),
          }
        }),
        update: vi.fn().mockImplementation((data) => {
          return {
            eq: vi.fn().mockImplementation((field, value) => {
              mockState.updateCalls.push({ table: tableName, data, filter: { [field]: value } })
              return Promise.resolve({ data: null, error: null })
            }),
          }
        }),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(async () => {
          if (tableName === 'account_deletion_requests') {
            return {
              data: mockState.existingDeletionRequest,
              error: mockState.existingDeletionRequest ? null : { code: 'PGRST116' },
            }
          }
          return { data: null, error: null }
        }),
        then: (resolve: (value: { data: unknown; error: unknown }) => void) => {
          if (tableName === 'account_deletion_requests') {
            resolve({ data: mockState.allDeletionRequests, error: null })
          } else {
            resolve({ data: null, error: null })
          }
          return Promise.resolve({ data: mockState.allDeletionRequests, error: null })
        },
      }
    }),
  })),
}))

// Import after mocking
import { POST, DELETE, GET } from '@/app/api/gdpr/delete-account/route'

// ============================================================================
// Helper Functions
// ============================================================================

function createMockRequest(
  method: string,
  body?: Record<string, unknown>
): NextRequest {
  const url = 'http://localhost:3000/api/gdpr/delete-account'
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

function setExistingPendingRequest(request: Record<string, unknown> | null) {
  mockState.existingDeletionRequest = request
}

function setAllDeletionRequests(requests: Array<Record<string, unknown>>) {
  mockState.allDeletionRequests = requests
}

// ============================================================================
// Test Suite
// ============================================================================

describe('GDPR Account Deletion API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.insertCalls = []
    mockState.updateCalls = []
    mockState.user = null
    mockState.existingDeletionRequest = null
    mockState.allDeletionRequests = []
  })

  afterEach(() => {
    vi.resetModules()
  })

  // ==========================================================================
  // 14.1 — POST /api/gdpr/delete-account (request deletion)
  // ==========================================================================

  describe('POST /api/gdpr/delete-account (request deletion)', () => {
    it('1. Returns 401 when unauthenticated', async () => {
      setUnauthenticated()
      const request = createMockRequest('POST', { confirm: 'DELETE_MY_ACCOUNT' })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('2. Returns 400 when confirm !== "DELETE_MY_ACCOUNT"', async () => {
      setAuthenticatedUser()
      const request = createMockRequest('POST', { confirm: 'wrong' })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Confirmation required')
    })

    it('3. Returns 409 when pending request already exists', async () => {
      setAuthenticatedUser()
      setExistingPendingRequest({
        id: 'existing-123',
        scheduled_deletion_date: '2026-03-23T00:00:00Z',
        requested_at: '2026-02-21T00:00:00Z',
        status: 'pending',
      })
      const request = createMockRequest('POST', { confirm: 'DELETE_MY_ACCOUNT' })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('A deletion request is already pending')
      expect(data.existing_request).toBeDefined()
      expect(data.existing_request.id).toBe('existing-123')
    })

    it('4. Creates deletion request with 30-day grace period', async () => {
      setAuthenticatedUser()
      setExistingPendingRequest(null)
      const request = createMockRequest('POST', { confirm: 'DELETE_MY_ACCOUNT' })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.deletion_request.grace_period_days).toBe(30)

      // Verify scheduled date is ~30 days from now
      const scheduledDate = new Date(data.deletion_request.scheduled_date)
      const now = new Date()
      const diffDays = Math.round((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      expect(diffDays).toBeGreaterThanOrEqual(29)
      expect(diffDays).toBeLessThanOrEqual(31)
    })

    it("5. Inserts into account_deletion_requests with status='pending'", async () => {
      setAuthenticatedUser('user-456')
      setExistingPendingRequest(null)
      const request = createMockRequest('POST', { confirm: 'DELETE_MY_ACCOUNT' })

      await POST(request)

      // Find the insert call to account_deletion_requests
      const deletionInsert = mockState.insertCalls.find(
        (call) => call.table === 'account_deletion_requests'
      )
      expect(deletionInsert).toBeDefined()
      expect((deletionInsert?.data as Record<string, unknown>).user_id).toBe('user-456')
      expect((deletionInsert?.data as Record<string, unknown>).status).toBe('pending')
    })

    it('6. Logs consent revocation to consent_log', async () => {
      setAuthenticatedUser('user-789')
      setExistingPendingRequest(null)
      const request = createMockRequest('POST', { confirm: 'DELETE_MY_ACCOUNT' })

      await POST(request)

      // Find the insert call to consent_log
      const consentInsert = mockState.insertCalls.find((call) => call.table === 'consent_log')
      expect(consentInsert).toBeDefined()
      const consentData = consentInsert?.data as Record<string, unknown>
      expect(consentData.consent_type).toBe('data_processing')
      expect(consentData.action).toBe('revoked')
      expect(consentData.version).toBe('account_deletion_requested')
    })

    it('7. Returns success with deletion_request details', async () => {
      setAuthenticatedUser()
      setExistingPendingRequest(null)
      const request = createMockRequest('POST', { confirm: 'DELETE_MY_ACCOUNT' })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.deletion_request).toBeDefined()
      expect(data.deletion_request.grace_period_days).toBe(30)
      expect(data.deletion_request.can_cancel_until).toBeDefined()
      expect(data.deletion_request.scheduled_date).toBeDefined()
    })

    it('8. Returns important_notice text', async () => {
      setAuthenticatedUser()
      setExistingPendingRequest(null)
      const request = createMockRequest('POST', { confirm: 'DELETE_MY_ACCOUNT' })

      const response = await POST(request)
      const data = await response.json()

      expect(data.important_notice).toBeDefined()
      expect(data.important_notice).toContain('permanently deleted')
    })

    it('9. Accepts optional reason field', async () => {
      setAuthenticatedUser()
      setExistingPendingRequest(null)
      const request = createMockRequest('POST', {
        confirm: 'DELETE_MY_ACCOUNT',
        reason: 'No longer using the service',
      })

      await POST(request)

      const deletionInsert = mockState.insertCalls.find(
        (call) => call.table === 'account_deletion_requests'
      )
      expect((deletionInsert?.data as Record<string, unknown>).reason).toBe(
        'No longer using the service'
      )
    })
  })

  // ==========================================================================
  // 14.2 — DELETE /api/gdpr/delete-account (cancel deletion)
  // ==========================================================================

  describe('DELETE /api/gdpr/delete-account (cancel deletion)', () => {
    it('10. Returns 401 when unauthenticated', async () => {
      setUnauthenticated()
      const request = createMockRequest('DELETE')

      const response = await DELETE(request)

      expect(response.status).toBe(401)
    })

    it('11. Returns 404 when no pending request exists', async () => {
      setAuthenticatedUser()
      setExistingPendingRequest(null)
      const request = createMockRequest('DELETE')

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('No pending deletion request found')
    })

    it("12. Updates status to 'cancelled'", async () => {
      setAuthenticatedUser()
      setExistingPendingRequest({
        id: 'pending-123',
        status: 'pending',
        scheduled_deletion_date: '2026-03-23T00:00:00Z',
      })
      const request = createMockRequest('DELETE')

      await DELETE(request)

      const updateCall = mockState.updateCalls.find(
        (call) => call.table === 'account_deletion_requests'
      )
      expect(updateCall).toBeDefined()
      expect((updateCall?.data as Record<string, unknown>).status).toBe('cancelled')
    })

    it('13. Logs consent re-grant to consent_log', async () => {
      setAuthenticatedUser('user-cancel-123')
      setExistingPendingRequest({
        id: 'pending-456',
        status: 'pending',
      })
      const request = createMockRequest('DELETE')

      await DELETE(request)

      const consentInsert = mockState.insertCalls.find((call) => call.table === 'consent_log')
      expect(consentInsert).toBeDefined()
      const consentData = consentInsert?.data as Record<string, unknown>
      expect(consentData.action).toBe('granted')
      expect(consentData.version).toBe('account_deletion_cancelled')
    })

    it('14. Returns success with cancelled_request_id', async () => {
      setAuthenticatedUser()
      setExistingPendingRequest({
        id: 'pending-789',
        status: 'pending',
      })
      const request = createMockRequest('DELETE')

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.cancelled_request_id).toBe('pending-789')
    })
  })

  // ==========================================================================
  // 14.3 — GET /api/gdpr/delete-account (check status)
  // ==========================================================================

  describe('GET /api/gdpr/delete-account (check status)', () => {
    it('15. Returns 401 when unauthenticated', async () => {
      setUnauthenticated()
      const request = createMockRequest('GET')

      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('16. Returns has_pending_request: false when none', async () => {
      setAuthenticatedUser()
      setAllDeletionRequests([])
      const request = createMockRequest('GET')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.has_pending_request).toBe(false)
      expect(data.pending_request).toBeNull()
    })

    it('17. Returns has_pending_request: true with details', async () => {
      setAuthenticatedUser()
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 15) // 15 days from now

      setAllDeletionRequests([
        {
          id: 'pending-status-123',
          status: 'pending',
          scheduled_deletion_date: futureDate.toISOString(),
          requested_at: new Date().toISOString(),
        },
      ])
      const request = createMockRequest('GET')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.has_pending_request).toBe(true)
      expect(data.pending_request).toBeDefined()
      expect(data.pending_request.id).toBe('pending-status-123')
      expect(data.pending_request.days_remaining).toBeGreaterThanOrEqual(14)
      expect(data.pending_request.days_remaining).toBeLessThanOrEqual(16)
    })

    it('18. Returns all_requests array (history)', async () => {
      setAuthenticatedUser()
      setAllDeletionRequests([
        { id: 'req-1', status: 'cancelled', scheduled_deletion_date: '2026-01-15T00:00:00Z' },
        { id: 'req-2', status: 'pending', scheduled_deletion_date: '2026-03-23T00:00:00Z' },
      ])
      const request = createMockRequest('GET')

      const response = await GET(request)
      const data = await response.json()

      expect(data.all_requests).toBeDefined()
      expect(data.all_requests.length).toBe(2)
      expect(data.all_requests[0].id).toBe('req-1')
      expect(data.all_requests[1].id).toBe('req-2')
    })

    it('19. days_remaining calculation is correct', async () => {
      setAuthenticatedUser()
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 20) // Exactly 20 days from now

      setAllDeletionRequests([
        {
          id: 'calc-test',
          status: 'pending',
          scheduled_deletion_date: futureDate.toISOString(),
          requested_at: new Date().toISOString(),
        },
      ])
      const request = createMockRequest('GET')

      const response = await GET(request)
      const data = await response.json()

      // days_remaining should be approximately 20 (Math.ceil handles partial days)
      expect(data.pending_request.days_remaining).toBeGreaterThanOrEqual(19)
      expect(data.pending_request.days_remaining).toBeLessThanOrEqual(21)
    })
  })
})
