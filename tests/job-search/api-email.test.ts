/**
 * Email Notification API Route Tests (Phase 4.7)
 *
 * RALPH tests for:
 * - POST /api/job-search/notify endpoint
 * - GET /api/job-search/unsubscribe endpoint
 * - Email notification service functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import type { EmailNotificationFrequency } from '@/types/job-search'

// ============================================================================
// Mocks
// ============================================================================

const mockCreateServiceClient = vi.fn()
const mockSupabaseFrom = vi.fn()
const mockGetSupabaseAdmin = vi.fn()
const mockSendBatchDigests = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ auth: { getUser: vi.fn() } }),
  createServiceClient: () => mockCreateServiceClient(),
}))

vi.mock('@/lib/job-search', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>
  return {
    ...actual,
    sendBatchDigests: (...args: unknown[]) => mockSendBatchDigests(...args),
  }
})

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockProfile(overrides: Partial<{
  id: string
  email: string
  full_name: string | null
}> = {}) {
  return {
    id: overrides.id || 'user-123',
    email: overrides.email || 'test@example.com',
    full_name: overrides.full_name !== undefined ? overrides.full_name : 'Test User',
  }
}

function createMockJobPosting(overrides: Partial<{
  id: string
  title: string
  company_name: string
  match_score: number
  location: string | null
  work_type: string | null
  salary_min: number | null
  salary_max: number | null
  salary_currency: string | null
  source_url: string
}> = {}) {
  return {
    id: overrides.id || 'job-123',
    title: overrides.title || 'Senior Engineer',
    company_name: overrides.company_name || 'TechCorp',
    match_score: overrides.match_score ?? 85,
    location: overrides.location !== undefined ? overrides.location : 'San Francisco, CA',
    work_type: overrides.work_type !== undefined ? overrides.work_type : 'remote',
    salary_min: overrides.salary_min !== undefined ? overrides.salary_min : 150000,
    salary_max: overrides.salary_max !== undefined ? overrides.salary_max : 200000,
    salary_currency: overrides.salary_currency !== undefined ? overrides.salary_currency : 'USD',
    source_url: overrides.source_url || 'https://example.com/job',
  }
}

function createMockPreferences(overrides: Partial<{
  user_id: string
  email_notification_frequency: EmailNotificationFrequency
  last_email_sent_at: string | null
  is_active: boolean
}> = {}) {
  return {
    user_id: overrides.user_id || 'user-123',
    email_notification_frequency: overrides.email_notification_frequency || 'daily',
    last_email_sent_at: overrides.last_email_sent_at !== undefined ? overrides.last_email_sent_at : null,
    is_active: overrides.is_active !== undefined ? overrides.is_active : true,
  }
}

// ============================================================================
// Test Helpers
// ============================================================================

function setupServiceClient(options: {
  profile?: ReturnType<typeof createMockProfile> | null
  profileError?: { code: string; message: string } | null
  prefs?: ReturnType<typeof createMockPreferences> | null
  prefsError?: { code: string; message: string } | null
  updateError?: { code: string; message: string } | null
  captureUpdate?: (data: Record<string, unknown>) => void
} = {}) {
  const {
    profile = createMockProfile(),
    profileError = null,
    prefs = createMockPreferences(),
    prefsError = null,
    updateError = null,
    captureUpdate,
  } = options

  const mockChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    update: vi.fn().mockReturnThis(),
  }

  mockSupabaseFrom.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        ...mockChain,
        single: vi.fn().mockResolvedValue({
          data: profile,
          error: profileError,
        }),
      }
    }
    if (table === 'job_search_preferences') {
      const chain = {
        ...mockChain,
        single: vi.fn().mockResolvedValue({
          data: prefs,
          error: prefsError,
        }),
        update: vi.fn((data: Record<string, unknown>) => {
          if (captureUpdate) captureUpdate(data)
          return {
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: updateError,
            }),
          }
        }),
      }
      return chain
    }
    return mockChain
  })

  mockCreateServiceClient.mockReturnValue({
    from: mockSupabaseFrom,
  })
}

function createNotifyRequest(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost:3000/api/job-search/notify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

function createUnsubscribeRequest(token: string | null) {
  const url = token
    ? `http://localhost:3000/api/job-search/unsubscribe?token=${token}`
    : 'http://localhost:3000/api/job-search/unsubscribe'
  return new NextRequest(url, { method: 'GET' })
}

function encodeToken(data: { userId: string; action: string }): string {
  return Buffer.from(JSON.stringify(data)).toString('base64url')
}

// ============================================================================
// Notify API Tests
// ============================================================================

describe('POST /api/job-search/notify', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('CRON_SECRET', 'test-cron-secret')
  })

  // --------------------------------------------------------------------------
  // Returns - What the endpoint returns
  // --------------------------------------------------------------------------

  describe('Returns', () => {
    it('returns success with sent/failed counts on valid request', async () => {
      mockSendBatchDigests.mockResolvedValue({ success: true, sent: 5, failed: 1 })

      const { POST } = await import('@/app/api/job-search/notify/route')
      const request = createNotifyRequest({ frequency: 'daily' }, { 'x-cron-secret': 'test-cron-secret' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.sent).toBe(5)
      expect(data.failed).toBe(1)
    })

    it('returns 401 when authorization header is missing', async () => {
      const { POST } = await import('@/app/api/job-search/notify/route')
      const request = createNotifyRequest({ frequency: 'daily' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Missing authorization')
    })

    it('returns 403 when cron secret is invalid', async () => {
      const { POST } = await import('@/app/api/job-search/notify/route')
      const request = createNotifyRequest({ frequency: 'daily' }, { 'x-cron-secret': 'wrong-secret' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid authorization')
    })

    it('returns 400 on invalid JSON body', async () => {
      const { POST } = await import('@/app/api/job-search/notify/route')
      const request = new NextRequest('http://localhost:3000/api/job-search/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': 'test-cron-secret',
        },
        body: 'not-json',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid JSON body')
    })

    it('returns 400 on invalid frequency value', async () => {
      const { POST } = await import('@/app/api/job-search/notify/route')
      const request = createNotifyRequest({ frequency: 'invalid' }, { 'x-cron-secret': 'test-cron-secret' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Validation error')
    })

    it('returns 500 when CRON_SECRET is not configured', async () => {
      vi.stubEnv('CRON_SECRET', '')

      const { POST } = await import('@/app/api/job-search/notify/route')
      const request = createNotifyRequest({ frequency: 'daily' }, { 'x-cron-secret': 'test-cron-secret' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Server configuration error')
    })

    it('returns 500 when batch digest fails', async () => {
      mockSendBatchDigests.mockResolvedValue({ success: false, sent: 0, failed: 0 })

      const { POST } = await import('@/app/api/job-search/notify/route')
      const request = createNotifyRequest({ frequency: 'daily' }, { 'x-cron-secret': 'test-cron-secret' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to send digests')
    })
  })

  // --------------------------------------------------------------------------
  // Asserts - Input validation
  // --------------------------------------------------------------------------

  describe('Asserts', () => {
    it('accepts daily frequency', async () => {
      mockSendBatchDigests.mockResolvedValue({ success: true, sent: 0, failed: 0 })

      const { POST } = await import('@/app/api/job-search/notify/route')
      const request = createNotifyRequest({ frequency: 'daily' }, { 'x-cron-secret': 'test-cron-secret' })
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockSendBatchDigests).toHaveBeenCalledWith('daily')
    })

    it('accepts weekly frequency', async () => {
      mockSendBatchDigests.mockResolvedValue({ success: true, sent: 0, failed: 0 })

      const { POST } = await import('@/app/api/job-search/notify/route')
      const request = createNotifyRequest({ frequency: 'weekly' }, { 'x-cron-secret': 'test-cron-secret' })
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockSendBatchDigests).toHaveBeenCalledWith('weekly')
    })

    it('accepts monthly frequency', async () => {
      mockSendBatchDigests.mockResolvedValue({ success: true, sent: 0, failed: 0 })

      const { POST } = await import('@/app/api/job-search/notify/route')
      const request = createNotifyRequest({ frequency: 'monthly' }, { 'x-cron-secret': 'test-cron-secret' })
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockSendBatchDigests).toHaveBeenCalledWith('monthly')
    })

    it('rejects missing frequency field', async () => {
      const { POST } = await import('@/app/api/job-search/notify/route')
      const request = createNotifyRequest({}, { 'x-cron-secret': 'test-cron-secret' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Validation error')
    })

    it('accepts Bearer token authorization header', async () => {
      mockSendBatchDigests.mockResolvedValue({ success: true, sent: 0, failed: 0 })

      const { POST } = await import('@/app/api/job-search/notify/route')
      const request = createNotifyRequest({ frequency: 'daily' }, { authorization: 'Bearer test-cron-secret' })
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('accepts x-cron-secret header', async () => {
      mockSendBatchDigests.mockResolvedValue({ success: true, sent: 0, failed: 0 })

      const { POST } = await import('@/app/api/job-search/notify/route')
      const request = createNotifyRequest({ frequency: 'daily' }, { 'x-cron-secret': 'test-cron-secret' })
      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  // --------------------------------------------------------------------------
  // Logic - Business logic
  // --------------------------------------------------------------------------

  describe('Logic', () => {
    it('calls sendBatchDigests with correct frequency', async () => {
      mockSendBatchDigests.mockResolvedValue({ success: true, sent: 3, failed: 0 })

      const { POST } = await import('@/app/api/job-search/notify/route')
      const request = createNotifyRequest({ frequency: 'weekly' }, { 'x-cron-secret': 'test-cron-secret' })
      await POST(request)

      expect(mockSendBatchDigests).toHaveBeenCalledTimes(1)
      expect(mockSendBatchDigests).toHaveBeenCalledWith('weekly')
    })

    it('returns actual sent and failed counts from batch operation', async () => {
      mockSendBatchDigests.mockResolvedValue({ success: true, sent: 10, failed: 2 })

      const { POST } = await import('@/app/api/job-search/notify/route')
      const request = createNotifyRequest({ frequency: 'daily' }, { 'x-cron-secret': 'test-cron-secret' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.sent).toBe(10)
      expect(data.failed).toBe(2)
    })
  })

  // --------------------------------------------------------------------------
  // Handling - Error handling
  // --------------------------------------------------------------------------

  describe('Handling', () => {
    it('handles sendBatchDigests throwing an error', async () => {
      mockSendBatchDigests.mockRejectedValue(new Error('Database connection failed'))

      const { POST } = await import('@/app/api/job-search/notify/route')
      const request = createNotifyRequest({ frequency: 'daily' }, { 'x-cron-secret': 'test-cron-secret' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Database connection failed')
    })

    it('handles non-Error exceptions gracefully', async () => {
      mockSendBatchDigests.mockRejectedValue('Unknown error')

      const { POST } = await import('@/app/api/job-search/notify/route')
      const request = createNotifyRequest({ frequency: 'daily' }, { 'x-cron-secret': 'test-cron-secret' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Internal server error')
    })
  })
})

// ============================================================================
// Unsubscribe API Tests
// ============================================================================

describe('GET /api/job-search/unsubscribe', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setupServiceClient()
  })

  // --------------------------------------------------------------------------
  // Returns - What the endpoint returns
  // --------------------------------------------------------------------------

  describe('Returns', () => {
    it('returns HTML success page on valid unsubscribe', async () => {
      const token = encodeToken({ userId: 'user-123', action: 'unsubscribe' })
      setupServiceClient({ profile: createMockProfile() })

      const { GET } = await import('@/app/api/job-search/unsubscribe/route')
      const request = createUnsubscribeRequest(token)
      const response = await GET(request)
      const html = await response.text()

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
      expect(html).toContain("You've been unsubscribed")
      expect(html).toContain('Manage Preferences')
    })

    it('returns HTML error page when token is missing', async () => {
      const { GET } = await import('@/app/api/job-search/unsubscribe/route')
      const request = createUnsubscribeRequest(null)
      const response = await GET(request)
      const html = await response.text()

      expect(response.status).toBe(400)
      expect(html).toContain('Unable to Unsubscribe')
      expect(html).toContain('Missing unsubscribe token')
    })

    it('returns HTML error page when token is invalid', async () => {
      const { GET } = await import('@/app/api/job-search/unsubscribe/route')
      const request = createUnsubscribeRequest('invalid-token')
      const response = await GET(request)
      const html = await response.text()

      expect(response.status).toBe(400)
      expect(html).toContain('Unable to Unsubscribe')
      expect(html).toContain('Invalid unsubscribe token')
    })

    it('returns HTML error page when user not found', async () => {
      const token = encodeToken({ userId: 'nonexistent-user', action: 'unsubscribe' })
      setupServiceClient({
        profile: null,
        profileError: { code: 'PGRST116', message: 'No rows found' },
      })

      const { GET } = await import('@/app/api/job-search/unsubscribe/route')
      const request = createUnsubscribeRequest(token)
      const response = await GET(request)
      const html = await response.text()

      expect(response.status).toBe(400)
      expect(html).toContain('User not found')
    })
  })

  // --------------------------------------------------------------------------
  // Asserts - Input validation
  // --------------------------------------------------------------------------

  describe('Asserts', () => {
    it('validates token has userId field', async () => {
      const token = encodeToken({ userId: '', action: 'unsubscribe' })

      const { GET } = await import('@/app/api/job-search/unsubscribe/route')
      const request = createUnsubscribeRequest(token)
      const response = await GET(request)
      const html = await response.text()

      expect(response.status).toBe(400)
      expect(html).toContain('Invalid unsubscribe token')
    })

    it('validates token has correct action field', async () => {
      const token = Buffer.from(JSON.stringify({ userId: 'user-123', action: 'wrong-action' })).toString('base64url')

      const { GET } = await import('@/app/api/job-search/unsubscribe/route')
      const request = createUnsubscribeRequest(token)
      const response = await GET(request)
      const html = await response.text()

      expect(response.status).toBe(400)
      expect(html).toContain('Invalid unsubscribe token')
    })

    it('rejects malformed base64 tokens', async () => {
      const { GET } = await import('@/app/api/job-search/unsubscribe/route')
      const request = createUnsubscribeRequest('!!!invalid-base64!!!')
      const response = await GET(request)
      const html = await response.text()

      expect(response.status).toBe(400)
      expect(html).toContain('Invalid unsubscribe token')
    })

    it('rejects non-JSON tokens', async () => {
      const token = Buffer.from('not-json').toString('base64url')

      const { GET } = await import('@/app/api/job-search/unsubscribe/route')
      const request = createUnsubscribeRequest(token)
      const response = await GET(request)
      const html = await response.text()

      expect(response.status).toBe(400)
      expect(html).toContain('Invalid unsubscribe token')
    })
  })

  // --------------------------------------------------------------------------
  // Logic - Business logic
  // --------------------------------------------------------------------------

  describe('Logic', () => {
    it('updates email_notification_frequency to disabled', async () => {
      const token = encodeToken({ userId: 'user-123', action: 'unsubscribe' })
      let capturedUpdate: Record<string, unknown> | undefined

      setupServiceClient({
        profile: createMockProfile(),
        captureUpdate: (data) => {
          capturedUpdate = data
        },
      })

      const { GET } = await import('@/app/api/job-search/unsubscribe/route')
      const request = createUnsubscribeRequest(token)
      await GET(request)

      expect(capturedUpdate).toBeDefined()
      expect(capturedUpdate?.email_notification_frequency).toBe('disabled')
    })

    it('sets updated_at timestamp', async () => {
      const token = encodeToken({ userId: 'user-123', action: 'unsubscribe' })
      let capturedUpdate: Record<string, unknown> | undefined

      setupServiceClient({
        profile: createMockProfile(),
        captureUpdate: (data) => {
          capturedUpdate = data
        },
      })

      const { GET } = await import('@/app/api/job-search/unsubscribe/route')
      const request = createUnsubscribeRequest(token)
      await GET(request)

      expect(capturedUpdate?.updated_at).toBeDefined()
      expect(typeof capturedUpdate?.updated_at).toBe('string')
    })

    it('verifies user exists before updating', async () => {
      const token = encodeToken({ userId: 'user-123', action: 'unsubscribe' })
      setupServiceClient({
        profile: null,
        profileError: { code: 'PGRST116', message: 'No rows found' },
      })

      const { GET } = await import('@/app/api/job-search/unsubscribe/route')
      const request = createUnsubscribeRequest(token)
      const response = await GET(request)

      expect(response.status).toBe(400)
    })
  })

  // --------------------------------------------------------------------------
  // Handling - Error handling
  // --------------------------------------------------------------------------

  describe('Handling', () => {
    it('handles database update failure gracefully', async () => {
      const token = encodeToken({ userId: 'user-123', action: 'unsubscribe' })
      setupServiceClient({
        profile: createMockProfile(),
        updateError: { code: 'DB_ERROR', message: 'Database unavailable' },
      })

      const { GET } = await import('@/app/api/job-search/unsubscribe/route')
      const request = createUnsubscribeRequest(token)
      const response = await GET(request)
      const html = await response.text()

      expect(response.status).toBe(400)
      expect(html).toContain('Failed to update preferences')
    })
  })
})

// ============================================================================
// Email HTML Builder Tests
// ============================================================================

describe('buildEmailHtml', () => {
  // --------------------------------------------------------------------------
  // Returns - What the function returns
  // --------------------------------------------------------------------------

  describe('Returns', () => {
    it('returns valid HTML document', async () => {
      const { buildEmailHtml } = await import('@/lib/job-search/email-notifications')
      const jobs = [createMockJobPosting()]
      const html = buildEmailHtml('Test User', jobs, 'daily', 'https://example.com/unsubscribe')

      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('<html>')
      expect(html).toContain('</html>')
    })

    it('includes user greeting', async () => {
      const { buildEmailHtml } = await import('@/lib/job-search/email-notifications')
      const jobs = [createMockJobPosting()]
      const html = buildEmailHtml('John Doe', jobs, 'daily', 'https://example.com/unsubscribe')

      expect(html).toContain('Hi John Doe,')
    })

    it('uses fallback greeting when no name provided', async () => {
      const { buildEmailHtml } = await import('@/lib/job-search/email-notifications')
      const jobs = [createMockJobPosting()]
      const html = buildEmailHtml(null, jobs, 'daily', 'https://example.com/unsubscribe')

      expect(html).toContain('Hi there,')
    })

    it('includes unsubscribe link', async () => {
      const { buildEmailHtml } = await import('@/lib/job-search/email-notifications')
      const jobs = [createMockJobPosting()]
      const unsubscribeUrl = 'https://app.signatura.ai/api/job-search/unsubscribe?token=abc123'
      const html = buildEmailHtml('Test User', jobs, 'daily', unsubscribeUrl)

      expect(html).toContain(unsubscribeUrl)
      expect(html).toContain('Unsubscribe')
    })

    it('includes job cards for each job', async () => {
      const { buildEmailHtml } = await import('@/lib/job-search/email-notifications')
      const jobs = [
        createMockJobPosting({ id: 'job-1', title: 'Frontend Developer', company_name: 'TechCorp' }),
        createMockJobPosting({ id: 'job-2', title: 'Backend Engineer', company_name: 'DataInc' }),
      ]
      const html = buildEmailHtml('Test User', jobs, 'daily', 'https://example.com/unsubscribe')

      expect(html).toContain('Frontend Developer')
      expect(html).toContain('TechCorp')
      expect(html).toContain('Backend Engineer')
      expect(html).toContain('DataInc')
    })

    it('limits job cards to 5', async () => {
      const { buildEmailHtml } = await import('@/lib/job-search/email-notifications')
      const jobs = Array.from({ length: 10 }, (_, i) => createMockJobPosting({
        id: `job-${i}`,
        title: `Job ${i + 1}`,
      }))
      const html = buildEmailHtml('Test User', jobs, 'daily', 'https://example.com/unsubscribe')

      expect(html).toContain('Job 1')
      expect(html).toContain('Job 5')
      expect(html).not.toContain('Job 6')
      expect(html).toContain('View 5 more matches')
    })
  })

  // --------------------------------------------------------------------------
  // Logic - Business logic
  // --------------------------------------------------------------------------

  describe('Logic', () => {
    it('uses daily intro text for daily frequency', async () => {
      const { buildEmailHtml } = await import('@/lib/job-search/email-notifications')
      const jobs = [createMockJobPosting()]
      const html = buildEmailHtml('Test User', jobs, 'daily', 'https://example.com/unsubscribe')

      expect(html).toContain('1 new job match for you today')
    })

    it('uses weekly intro text for weekly frequency', async () => {
      const { buildEmailHtml } = await import('@/lib/job-search/email-notifications')
      const jobs = [createMockJobPosting(), createMockJobPosting()]
      const html = buildEmailHtml('Test User', jobs, 'weekly', 'https://example.com/unsubscribe')

      expect(html).toContain('weekly roundup')
      expect(html).toContain('2 new job matches')
    })

    it('uses monthly intro text for monthly frequency', async () => {
      const { buildEmailHtml } = await import('@/lib/job-search/email-notifications')
      const jobs = [createMockJobPosting()]
      const html = buildEmailHtml('Test User', jobs, 'monthly', 'https://example.com/unsubscribe')

      expect(html).toContain('monthly job market summary')
    })

    it('formats salary range correctly', async () => {
      const { buildEmailHtml } = await import('@/lib/job-search/email-notifications')
      const jobs = [createMockJobPosting({
        salary_min: 120000,
        salary_max: 180000,
        salary_currency: 'USD',
      })]
      const html = buildEmailHtml('Test User', jobs, 'daily', 'https://example.com/unsubscribe')

      expect(html).toContain('$120,000')
      expect(html).toContain('$180,000')
    })

    it('handles jobs with only min salary', async () => {
      const { buildEmailHtml } = await import('@/lib/job-search/email-notifications')
      const jobs = [createMockJobPosting({
        salary_min: 100000,
        salary_max: null,
        salary_currency: 'USD',
      })]
      const html = buildEmailHtml('Test User', jobs, 'daily', 'https://example.com/unsubscribe')

      expect(html).toContain('$100,000+')
    })

    it('handles jobs with only max salary', async () => {
      const { buildEmailHtml } = await import('@/lib/job-search/email-notifications')
      const jobs = [createMockJobPosting({
        salary_min: null,
        salary_max: 150000,
        salary_currency: 'USD',
      })]
      const html = buildEmailHtml('Test User', jobs, 'daily', 'https://example.com/unsubscribe')

      expect(html).toContain('Up to $150,000')
    })

    it('handles jobs without salary information', async () => {
      const { buildEmailHtml } = await import('@/lib/job-search/email-notifications')
      const jobs = [createMockJobPosting({
        salary_min: null,
        salary_max: null,
        salary_currency: null,
      })]
      const html = buildEmailHtml('Test User', jobs, 'daily', 'https://example.com/unsubscribe')

      expect(html).toContain('Not specified')
    })

    it('includes match score badge', async () => {
      const { buildEmailHtml } = await import('@/lib/job-search/email-notifications')
      const jobs = [createMockJobPosting({ match_score: 92 })]
      const html = buildEmailHtml('Test User', jobs, 'daily', 'https://example.com/unsubscribe')

      expect(html).toContain('92% Match')
    })

    it('includes location in job card', async () => {
      const { buildEmailHtml } = await import('@/lib/job-search/email-notifications')
      const jobs = [createMockJobPosting({ location: 'New York, NY' })]
      const html = buildEmailHtml('Test User', jobs, 'daily', 'https://example.com/unsubscribe')

      expect(html).toContain('New York, NY')
    })

    it('handles null location', async () => {
      const { buildEmailHtml } = await import('@/lib/job-search/email-notifications')
      const jobs = [createMockJobPosting({ location: null })]
      const html = buildEmailHtml('Test User', jobs, 'daily', 'https://example.com/unsubscribe')

      expect(html).toContain('Location not specified')
    })

    it('includes work type when available', async () => {
      const { buildEmailHtml } = await import('@/lib/job-search/email-notifications')
      const jobs = [createMockJobPosting({ work_type: 'hybrid' })]
      const html = buildEmailHtml('Test User', jobs, 'daily', 'https://example.com/unsubscribe')

      expect(html).toContain('Hybrid')
    })

    it('includes view links for each job', async () => {
      const { buildEmailHtml } = await import('@/lib/job-search/email-notifications')
      const jobs = [createMockJobPosting({
        id: 'job-abc123',
        source_url: 'https://linkedin.com/jobs/123',
      })]
      const html = buildEmailHtml('Test User', jobs, 'daily', 'https://example.com/unsubscribe')

      expect(html).toContain('/jobs/job-abc123')
      expect(html).toContain('View in App')
      expect(html).toContain('https://linkedin.com/jobs/123')
      expect(html).toContain('View Original')
    })

    it('uses singular form for single job', async () => {
      const { buildEmailHtml } = await import('@/lib/job-search/email-notifications')
      const jobs = [createMockJobPosting()]
      const html = buildEmailHtml('Test User', jobs, 'daily', 'https://example.com/unsubscribe')

      expect(html).toContain('1 new job match')
      expect(html).not.toContain('1 new job matches')
    })

    it('uses plural form for multiple jobs', async () => {
      const { buildEmailHtml } = await import('@/lib/job-search/email-notifications')
      const jobs = [createMockJobPosting(), createMockJobPosting()]
      const html = buildEmailHtml('Test User', jobs, 'daily', 'https://example.com/unsubscribe')

      expect(html).toContain('2 new job matches')
    })
  })
})

// ============================================================================
// Email Job Type Tests
// ============================================================================

describe('EmailJob type', () => {
  describe('Returns', () => {
    it('exports EmailJob type correctly', async () => {
      const { buildEmailHtml } = await import('@/lib/job-search/email-notifications')

      // This tests that the function accepts our job structure
      const job = {
        id: 'test-id',
        title: 'Test Title',
        company_name: 'Test Company',
        match_score: 85,
        location: 'Test Location',
        work_type: 'remote',
        salary_min: 100000,
        salary_max: 150000,
        salary_currency: 'USD',
        source_url: 'https://example.com',
      }

      const html = buildEmailHtml('Test', [job], 'daily', 'https://example.com/unsub')
      expect(html).toContain('Test Title')
    })
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('Email Notification Integration', () => {
  describe('Returns', () => {
    it('exports all necessary functions from index', async () => {
      const jobSearch = await import('@/lib/job-search')

      expect(typeof jobSearch.sendJobMatchDigest).toBe('function')
      expect(typeof jobSearch.sendBatchDigests).toBe('function')
      expect(typeof jobSearch.buildEmailHtml).toBe('function')
    })
  })
})
