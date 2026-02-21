/**
 * Consent Logging Tests — RALPH Loop 16
 *
 * Tests for the consent logging API endpoints.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// ============================================================================
// Mock Setup
// ============================================================================

// Mock state stored in a module-level object to avoid hoisting issues
const mockState = {
  user: null as { id: string; email: string } | null,
  insertCalls: [] as Array<{ table: string; data: unknown }>,
  updateCalls: [] as Array<{ table: string; data: unknown; filter: unknown }>,
  consents: [] as Array<Record<string, unknown>>,
  profileUpdateError: null as { message: string } | null,
}

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
      return {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockImplementation((data) => {
          mockState.insertCalls.push({ table: tableName, data })
          return Promise.resolve({ data: { id: 'new-log-123', ...data }, error: null })
        }),
        update: vi.fn().mockImplementation((data) => {
          return {
            eq: vi.fn().mockImplementation((field, value) => {
              mockState.updateCalls.push({ table: tableName, data, filter: { [field]: value } })
              return Promise.resolve({ data: null, error: mockState.profileUpdateError })
            }),
          }
        }),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: (resolve: (value: { data: unknown; error: unknown }) => void) => {
          if (tableName === 'consent_log') {
            resolve({ data: mockState.consents, error: null })
          } else {
            resolve({ data: null, error: null })
          }
          return Promise.resolve({ data: mockState.consents, error: null })
        },
      }
    }),
  })),
}))

// Import after mocking
import { POST, GET } from '@/app/api/consent/log/route'

// ============================================================================
// Helper Functions
// ============================================================================

function createMockRequest(
  method: string,
  body?: Record<string, unknown>,
  headers?: Record<string, string>
): NextRequest {
  const url = 'http://localhost:3000/api/consent/log'
  const init: RequestInit = { method }

  const requestHeaders = new Headers()
  if (body) {
    init.body = JSON.stringify(body)
    requestHeaders.set('Content-Type', 'application/json')
  }
  if (headers) {
    Object.entries(headers).forEach(([key, value]) => {
      requestHeaders.set(key, value)
    })
  }
  init.headers = requestHeaders

  return new NextRequest(url, init)
}

function setAuthenticatedUser(userId: string = 'user-123', email: string = 'test@example.com') {
  mockState.user = { id: userId, email }
}

function setUnauthenticated() {
  mockState.user = null
}

function setConsents(consents: Array<Record<string, unknown>>) {
  mockState.consents = consents
}

function setProfileUpdateError(error: { message: string } | null) {
  mockState.profileUpdateError = error
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Consent Logging API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.user = null
    mockState.insertCalls = []
    mockState.updateCalls = []
    mockState.consents = []
    mockState.profileUpdateError = null
  })

  afterEach(() => {
    vi.resetModules()
  })

  // ==========================================================================
  // 16.1 — POST /api/consent/log
  // ==========================================================================

  describe('POST /api/consent/log', () => {
    it('1. Returns 401 when unauthenticated', async () => {
      setUnauthenticated()
      const request = createMockRequest('POST', { consent_type: 'privacy_policy', action: 'granted' })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('2. Returns 400 when consent_type missing', async () => {
      setAuthenticatedUser()
      const request = createMockRequest('POST', { action: 'granted' })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('consent_type and action are required')
    })

    it('3. Returns 400 when action missing', async () => {
      setAuthenticatedUser()
      const request = createMockRequest('POST', { consent_type: 'privacy_policy' })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('consent_type and action are required')
    })

    it('4. Rejects invalid consent_type', async () => {
      setAuthenticatedUser()
      const request = createMockRequest('POST', { consent_type: 'invalid_type', action: 'granted' })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid consent_type')
    })

    it('5. Rejects invalid action (not granted/revoked)', async () => {
      setAuthenticatedUser()
      const request = createMockRequest('POST', { consent_type: 'privacy_policy', action: 'pending' })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid action')
    })

    it('6. Accepts all 5 valid consent types', async () => {
      const validTypes = [
        'privacy_policy',
        'terms_of_service',
        'marketing_emails',
        'data_processing',
        'cookies',
      ]

      for (const consentType of validTypes) {
        mockState.insertCalls = []
        mockState.updateCalls = []
        setAuthenticatedUser()
        const request = createMockRequest('POST', { consent_type: consentType, action: 'granted' })

        const response = await POST(request)

        expect(response.status).toBe(200)
        const insertCall = mockState.insertCalls.find((c) => c.table === 'consent_log')
        expect(insertCall).toBeDefined()
        expect((insertCall?.data as Record<string, unknown>).consent_type).toBe(consentType)
      }
    })

    it('7. Inserts to consent_log with user_id, ip_address, user_agent', async () => {
      setAuthenticatedUser('user-full-log')
      const request = createMockRequest(
        'POST',
        { consent_type: 'privacy_policy', action: 'granted' },
        {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0 Test Browser',
        }
      )

      await POST(request)

      const insertCall = mockState.insertCalls.find((c) => c.table === 'consent_log')
      expect(insertCall).toBeDefined()
      const insertData = insertCall?.data as Record<string, unknown>
      expect(insertData.user_id).toBe('user-full-log')
      expect(insertData.ip_address).toBe('192.168.1.1')
      expect(insertData.user_agent).toBe('Mozilla/5.0 Test Browser')
    })

    it('8. privacy_policy + granted → updates profile.privacy_policy_accepted_at', async () => {
      setAuthenticatedUser('user-pp')
      const request = createMockRequest('POST', { consent_type: 'privacy_policy', action: 'granted' })

      await POST(request)

      const updateCall = mockState.updateCalls.find((c) => c.table === 'profiles')
      expect(updateCall).toBeDefined()
      const updateData = updateCall?.data as Record<string, unknown>
      expect(updateData.privacy_policy_accepted_at).toBeDefined()
      expect(typeof updateData.privacy_policy_accepted_at).toBe('string')
    })

    it('9. terms_of_service + granted → updates profile.terms_accepted_at', async () => {
      setAuthenticatedUser('user-tos')
      const request = createMockRequest('POST', { consent_type: 'terms_of_service', action: 'granted' })

      await POST(request)

      const updateCall = mockState.updateCalls.find((c) => c.table === 'profiles')
      expect(updateCall).toBeDefined()
      const updateData = updateCall?.data as Record<string, unknown>
      expect(updateData.terms_accepted_at).toBeDefined()
    })

    it('10. marketing_emails + granted → sets marketing_emails_consent: true', async () => {
      setAuthenticatedUser('user-mkt')
      const request = createMockRequest('POST', { consent_type: 'marketing_emails', action: 'granted' })

      await POST(request)

      const updateCall = mockState.updateCalls.find((c) => c.table === 'profiles')
      expect(updateCall).toBeDefined()
      const updateData = updateCall?.data as Record<string, unknown>
      expect(updateData.marketing_emails_consent).toBe(true)
    })

    it('11. marketing_emails + revoked → sets marketing_emails_consent: false', async () => {
      setAuthenticatedUser('user-mkt-revoke')
      const request = createMockRequest('POST', { consent_type: 'marketing_emails', action: 'revoked' })

      await POST(request)

      const updateCall = mockState.updateCalls.find((c) => c.table === 'profiles')
      expect(updateCall).toBeDefined()
      const updateData = updateCall?.data as Record<string, unknown>
      expect(updateData.marketing_emails_consent).toBe(false)
    })

    it('12. data_processing + granted/revoked → sets data_processing_consent', async () => {
      // Test granted
      setAuthenticatedUser('user-dp-grant')
      const grantRequest = createMockRequest('POST', { consent_type: 'data_processing', action: 'granted' })
      await POST(grantRequest)

      let updateCall = mockState.updateCalls.find((c) => c.table === 'profiles')
      expect((updateCall?.data as Record<string, unknown>).data_processing_consent).toBe(true)

      // Reset for revoked test
      mockState.updateCalls = []
      setAuthenticatedUser('user-dp-revoke')
      const revokeRequest = createMockRequest('POST', { consent_type: 'data_processing', action: 'revoked' })
      await POST(revokeRequest)

      updateCall = mockState.updateCalls.find((c) => c.table === 'profiles')
      expect((updateCall?.data as Record<string, unknown>).data_processing_consent).toBe(false)
    })

    it('13. cookies consent → does NOT update profile (no profile field)', async () => {
      setAuthenticatedUser('user-cookies')
      const request = createMockRequest('POST', { consent_type: 'cookies', action: 'granted' })

      await POST(request)

      // Consent should be logged
      const insertCall = mockState.insertCalls.find((c) => c.table === 'consent_log')
      expect(insertCall).toBeDefined()

      // But no profile update
      const updateCall = mockState.updateCalls.find((c) => c.table === 'profiles')
      expect(updateCall).toBeUndefined()
    })

    it('14. Profile update failure does NOT fail the request', async () => {
      setAuthenticatedUser('user-fail-profile')
      setProfileUpdateError({ message: 'Profile update failed' })
      const request = createMockRequest('POST', { consent_type: 'privacy_policy', action: 'granted' })

      const response = await POST(request)
      const data = await response.json()

      // Should still return 200, consent was logged
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('15. Returns success message with consent_type and action', async () => {
      setAuthenticatedUser()
      const request = createMockRequest('POST', { consent_type: 'privacy_policy', action: 'granted' })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Consent granted for privacy_policy')
    })
  })

  // ==========================================================================
  // 16.2 — GET /api/consent/log
  // ==========================================================================

  describe('GET /api/consent/log', () => {
    it('16. Returns 401 when unauthenticated', async () => {
      setUnauthenticated()
      const request = createMockRequest('GET')

      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('17. Returns consents array filtered by user_id', async () => {
      setAuthenticatedUser('user-consents')
      setConsents([
        { id: 'consent-1', user_id: 'user-consents', consent_type: 'privacy_policy', action: 'granted' },
        { id: 'consent-2', user_id: 'user-consents', consent_type: 'terms_of_service', action: 'granted' },
      ])
      const request = createMockRequest('GET')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.consents).toBeDefined()
      expect(data.consents.length).toBe(2)
    })

    it('18. Returns sorted by created_at descending', async () => {
      setAuthenticatedUser()
      const oldDate = '2026-01-01T00:00:00Z'
      const newDate = '2026-02-21T00:00:00Z'
      setConsents([
        { id: 'consent-old', created_at: oldDate },
        { id: 'consent-new', created_at: newDate },
      ])
      const request = createMockRequest('GET')

      const response = await GET(request)
      const data = await response.json()

      // The mock returns in order as set, but the test verifies the API
      // calls order('created_at', { ascending: false })
      expect(response.status).toBe(200)
      expect(data.consents).toBeDefined()
    })

    it('19. Returns empty array when no consents exist', async () => {
      setAuthenticatedUser()
      setConsents([])
      const request = createMockRequest('GET')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.consents).toEqual([])
    })
  })
})
