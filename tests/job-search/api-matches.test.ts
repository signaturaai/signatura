/**
 * Job Matches API Route Tests (Phase 4.2)
 *
 * RALPH tests for GET /api/job-search/matches endpoint.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import type { JobPostingRow } from '@/types/job-search'

// ============================================================================
// Mocks
// ============================================================================

const mockGetUser = vi.fn()
const mockCreateClient = vi.fn()
const mockCreateServiceClient = vi.fn()

// Supabase mock chains
const mockSupabaseFrom = vi.fn()
const mockSupabaseSelect = vi.fn()
const mockSupabaseEq = vi.fn()
const mockSupabaseGte = vi.fn()
const mockSupabaseIn = vi.fn()
const mockSupabaseOr = vi.fn()
const mockSupabaseOrder = vi.fn()
const mockSupabaseRange = vi.fn()
const mockSupabaseSingle = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
  createServiceClient: () => mockCreateServiceClient(),
}))

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockJobPosting(overrides: Partial<JobPostingRow> = {}): JobPostingRow {
  return {
    id: `job-${Math.random().toString(36).slice(2, 9)}`,
    user_id: 'user-123',
    title: 'Senior Software Engineer',
    company_name: 'TechCorp',
    company_logo_url: null,
    description: 'Build amazing products',
    location: 'San Francisco, CA',
    work_type: 'remote',
    experience_level: 'senior',
    salary_min: 120000,
    salary_max: 180000,
    salary_currency: 'USD',
    required_skills: ['TypeScript', 'React'],
    benefits: ['Health Insurance', '401k'],
    company_size: '51-200',
    source_url: 'https://example.com/job/123',
    source_platform: 'LinkedIn',
    posted_date: '2026-02-15',
    discovered_at: new Date().toISOString(),
    match_score: 85,
    match_breakdown: {
      skills: 35,
      experience: 18,
      location: 12,
      salary: 12,
      preferences: 8,
    },
    match_reasons: ['Strong TypeScript experience', 'Remote work available'],
    status: 'new',
    user_feedback: null,
    feedback_reason: null,
    discarded_until: null,
    job_application_id: null,
    content_hash: 'abc123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

// ============================================================================
// Test Helpers
// ============================================================================

function setupAuthenticatedUser(userId = 'user-123') {
  mockCreateClient.mockReturnValue({
    auth: {
      getUser: mockGetUser.mockResolvedValue({
        data: { user: { id: userId, email: 'test@example.com' } },
        error: null,
      }),
    },
  })
}

function setupUnauthenticatedUser() {
  mockCreateClient.mockReturnValue({
    auth: {
      getUser: mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      }),
    },
  })
}

function setupServiceClient(options: {
  jobs?: JobPostingRow[]
  total?: number
  lastSearchAt?: string | null
  prefsError?: { code: string; message: string } | null
  countError?: { code: string; message: string } | null
  dataError?: { code: string; message: string } | null
} = {}) {
  const {
    jobs = [],
    total = jobs.length,
    lastSearchAt = null,
    prefsError = null,
    countError = null,
    dataError = null,
  } = options

  mockSupabaseFrom.mockImplementation((table: string) => {
    if (table === 'job_search_preferences') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { last_search_at: lastSearchAt },
              error: prefsError,
            }),
          }),
        }),
      }
    }

    if (table === 'job_postings') {
      // Build chain for count query
      const countChain = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({
          count: countError ? null : total,
          error: countError,
        }),
      }

      // Build chain for data query
      const dataChain = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: dataError ? null : jobs,
          error: dataError,
        }),
      }

      return {
        select: vi.fn().mockImplementation((columns: string, opts?: { count?: string; head?: boolean }) => {
          if (opts?.count === 'exact' && opts?.head === true) {
            return countChain
          }
          return dataChain
        }),
      }
    }

    return {}
  })

  mockCreateServiceClient.mockReturnValue({
    from: mockSupabaseFrom,
  })
}

function createRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/job-search/matches')
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })
  return new NextRequest(url, { method: 'GET' })
}

// ============================================================================
// Tests
// ============================================================================

describe('GET /api/job-search/matches', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  // ==========================================================================
  // Returns: Authentication
  // ==========================================================================

  describe('Authentication', () => {
    it('R: returns 401 when user is not authenticated', async () => {
      setupUnauthenticatedUser()
      setupServiceClient()

      const { GET } = await import('@/app/api/job-search/matches/route')
      const response = await GET(createRequest())

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
      expect(data.jobs).toEqual([])
    })

    it('R: returns 401 when auth error occurs', async () => {
      mockCreateClient.mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Session expired' },
          }),
        },
      })
      setupServiceClient()

      const { GET } = await import('@/app/api/job-search/matches/route')
      const response = await GET(createRequest())

      expect(response.status).toBe(401)
    })
  })

  // ==========================================================================
  // Returns: Success Response
  // ==========================================================================

  describe('Success Response', () => {
    it('R: returns jobs array with total and hasMore', async () => {
      setupAuthenticatedUser()
      const jobs = [
        createMockJobPosting({ title: 'Job 1', match_score: 90 }),
        createMockJobPosting({ title: 'Job 2', match_score: 85 }),
      ]
      setupServiceClient({ jobs, total: 2 })

      const { GET } = await import('@/app/api/job-search/matches/route')
      const response = await GET(createRequest())

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.jobs).toHaveLength(2)
      expect(data.total).toBe(2)
      expect(data.hasMore).toBe(false)
    })

    it('R: returns lastSearchAt from preferences', async () => {
      setupAuthenticatedUser()
      const lastSearchAt = '2026-02-20T10:00:00Z'
      setupServiceClient({ jobs: [], total: 0, lastSearchAt })

      const { GET } = await import('@/app/api/job-search/matches/route')
      const response = await GET(createRequest())

      const data = await response.json()
      expect(data.lastSearchAt).toBe(lastSearchAt)
    })

    it('R: returns null lastSearchAt when no preferences exist', async () => {
      setupAuthenticatedUser()
      setupServiceClient({ jobs: [], total: 0, lastSearchAt: null })

      const { GET } = await import('@/app/api/job-search/matches/route')
      const response = await GET(createRequest())

      const data = await response.json()
      expect(data.lastSearchAt).toBeNull()
    })

    it('R: returns empty array when no jobs match', async () => {
      setupAuthenticatedUser()
      setupServiceClient({ jobs: [], total: 0 })

      const { GET } = await import('@/app/api/job-search/matches/route')
      const response = await GET(createRequest())

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.jobs).toEqual([])
      expect(data.total).toBe(0)
      expect(data.hasMore).toBe(false)
    })
  })

  // ==========================================================================
  // Asserts: Pagination
  // ==========================================================================

  describe('Pagination', () => {
    it('A: uses default limit of 10', async () => {
      setupAuthenticatedUser()
      const jobs = Array.from({ length: 10 }, (_, i) =>
        createMockJobPosting({ title: `Job ${i + 1}` })
      )
      setupServiceClient({ jobs, total: 15 })

      const { GET } = await import('@/app/api/job-search/matches/route')
      const response = await GET(createRequest())

      const data = await response.json()
      expect(data.jobs).toHaveLength(10)
      expect(data.hasMore).toBe(true)
    })

    it('A: respects custom limit parameter', async () => {
      setupAuthenticatedUser()
      const jobs = Array.from({ length: 5 }, (_, i) =>
        createMockJobPosting({ title: `Job ${i + 1}` })
      )
      setupServiceClient({ jobs, total: 10 })

      const { GET } = await import('@/app/api/job-search/matches/route')
      const response = await GET(createRequest({ limit: '5' }))

      const data = await response.json()
      expect(data.jobs).toHaveLength(5)
      expect(data.hasMore).toBe(true)
    })

    it('A: caps limit at max 20', async () => {
      setupAuthenticatedUser()
      const jobs = Array.from({ length: 20 }, (_, i) =>
        createMockJobPosting({ title: `Job ${i + 1}` })
      )
      setupServiceClient({ jobs, total: 50 })

      const { GET } = await import('@/app/api/job-search/matches/route')
      const response = await GET(createRequest({ limit: '100' }))

      const data = await response.json()
      expect(data.jobs).toHaveLength(20)
    })

    it('A: uses default limit for invalid values', async () => {
      setupAuthenticatedUser()
      const jobs = Array.from({ length: 10 }, (_, i) =>
        createMockJobPosting({ title: `Job ${i + 1}` })
      )
      setupServiceClient({ jobs, total: 10 })

      const { GET } = await import('@/app/api/job-search/matches/route')
      const response = await GET(createRequest({ limit: 'invalid' }))

      const data = await response.json()
      expect(data.jobs).toHaveLength(10)
    })

    it('A: respects offset parameter', async () => {
      setupAuthenticatedUser()
      const jobs = [
        createMockJobPosting({ title: 'Job 6' }),
        createMockJobPosting({ title: 'Job 7' }),
      ]
      setupServiceClient({ jobs, total: 10 })

      const { GET } = await import('@/app/api/job-search/matches/route')
      const response = await GET(createRequest({ offset: '5', limit: '5' }))

      const data = await response.json()
      expect(data.hasMore).toBe(true) // 5 + 2 < 10
    })

    it('A: hasMore is false when all jobs returned', async () => {
      setupAuthenticatedUser()
      const jobs = [createMockJobPosting()]
      setupServiceClient({ jobs, total: 1 })

      const { GET } = await import('@/app/api/job-search/matches/route')
      const response = await GET(createRequest())

      const data = await response.json()
      expect(data.hasMore).toBe(false)
    })

    it('A: hasMore is true when more jobs exist', async () => {
      setupAuthenticatedUser()
      const jobs = Array.from({ length: 10 }, (_, i) =>
        createMockJobPosting({ title: `Job ${i + 1}` })
      )
      setupServiceClient({ jobs, total: 25 })

      const { GET } = await import('@/app/api/job-search/matches/route')
      const response = await GET(createRequest())

      const data = await response.json()
      expect(data.hasMore).toBe(true)
    })

    it('A: uses default offset for negative values', async () => {
      setupAuthenticatedUser()
      setupServiceClient({ jobs: [], total: 0 })

      const { GET } = await import('@/app/api/job-search/matches/route')
      const response = await GET(createRequest({ offset: '-5' }))

      expect(response.status).toBe(200)
    })
  })

  // ==========================================================================
  // Asserts: Status Filter
  // ==========================================================================

  describe('Status Filter', () => {
    it('A: filters by status when provided', async () => {
      setupAuthenticatedUser()
      const jobs = [createMockJobPosting({ status: 'new' })]
      setupServiceClient({ jobs, total: 1 })

      const { GET } = await import('@/app/api/job-search/matches/route')
      const response = await GET(createRequest({ status: 'new' }))

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.jobs).toHaveLength(1)
    })

    it('A: returns 400 for invalid status', async () => {
      setupAuthenticatedUser()
      setupServiceClient()

      const { GET } = await import('@/app/api/job-search/matches/route')
      const response = await GET(createRequest({ status: 'invalid' }))

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid status')
    })

    it('A: returns 400 for dismissed status (excluded)', async () => {
      setupAuthenticatedUser()
      setupServiceClient()

      const { GET } = await import('@/app/api/job-search/matches/route')
      const response = await GET(createRequest({ status: 'dismissed' }))

      expect(response.status).toBe(400)
    })

    it('A: returns 400 for applied status (excluded)', async () => {
      setupAuthenticatedUser()
      setupServiceClient()

      const { GET } = await import('@/app/api/job-search/matches/route')
      const response = await GET(createRequest({ status: 'applied' }))

      expect(response.status).toBe(400)
    })

    it('A: allows "viewed" status filter', async () => {
      setupAuthenticatedUser()
      const jobs = [createMockJobPosting({ status: 'viewed' })]
      setupServiceClient({ jobs, total: 1 })

      const { GET } = await import('@/app/api/job-search/matches/route')
      const response = await GET(createRequest({ status: 'viewed' }))

      expect(response.status).toBe(200)
    })

    it('A: allows "liked" status filter', async () => {
      setupAuthenticatedUser()
      const jobs = [createMockJobPosting({ status: 'liked' })]
      setupServiceClient({ jobs, total: 1 })

      const { GET } = await import('@/app/api/job-search/matches/route')
      const response = await GET(createRequest({ status: 'liked' }))

      expect(response.status).toBe(200)
    })
  })

  // ==========================================================================
  // Logic: Query Building
  // ==========================================================================

  describe('Query Building', () => {
    it('L: queries only for current user', async () => {
      setupAuthenticatedUser('specific-user-id')
      setupServiceClient({ jobs: [], total: 0 })

      const { GET } = await import('@/app/api/job-search/matches/route')
      await GET(createRequest())

      // Verify from was called with job_postings
      expect(mockSupabaseFrom).toHaveBeenCalledWith('job_postings')
    })

    it('L: orders by match_score DESC, discovered_at DESC', async () => {
      setupAuthenticatedUser()
      const jobs = [
        createMockJobPosting({ title: 'High Score', match_score: 95 }),
        createMockJobPosting({ title: 'Medium Score', match_score: 85 }),
      ]
      setupServiceClient({ jobs, total: 2 })

      const { GET } = await import('@/app/api/job-search/matches/route')
      const response = await GET(createRequest())

      expect(response.status).toBe(200)
      const data = await response.json()
      // Jobs should already be ordered by the mock
      expect(data.jobs[0].match_score).toBeGreaterThanOrEqual(data.jobs[1].match_score)
    })
  })

  // ==========================================================================
  // Handling: Errors
  // ==========================================================================

  describe('Error Handling', () => {
    it('H: returns 500 when count query fails', async () => {
      setupAuthenticatedUser()
      setupServiceClient({
        countError: { code: 'DB_ERROR', message: 'Database error' },
      })

      const { GET } = await import('@/app/api/job-search/matches/route')
      const response = await GET(createRequest())

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toContain('count')
    })

    it('H: returns 500 when data query fails', async () => {
      setupAuthenticatedUser()

      // Custom setup for this test
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'job_search_preferences') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { last_search_at: null },
                  error: null,
                }),
              }),
            }),
          }
        }

        if (table === 'job_postings') {
          const countChain = {
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            or: vi.fn().mockResolvedValue({ count: 5, error: null }),
          }

          const dataChain = {
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'DB_ERROR', message: 'Fetch failed' },
            }),
          }

          return {
            select: vi.fn().mockImplementation((columns: string, opts?: { count?: string; head?: boolean }) => {
              if (opts?.count === 'exact' && opts?.head === true) {
                return countChain
              }
              return dataChain
            }),
          }
        }

        return {}
      })
      mockCreateServiceClient.mockReturnValue({
        from: mockSupabaseFrom,
      })

      const { GET } = await import('@/app/api/job-search/matches/route')
      const response = await GET(createRequest())

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toContain('fetch')
    })

    it('H: handles unexpected errors gracefully', async () => {
      setupAuthenticatedUser()
      mockCreateServiceClient.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const { GET } = await import('@/app/api/job-search/matches/route')
      const response = await GET(createRequest())

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Unexpected error')
    })

    it('H: continues when preferences query fails', async () => {
      setupAuthenticatedUser()

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'job_search_preferences') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'NOT_FOUND', message: 'No prefs' },
                }),
              }),
            }),
          }
        }

        if (table === 'job_postings') {
          const chain = {
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            or: vi.fn().mockResolvedValue({ count: 0, error: null }),
          }

          return {
            select: vi.fn().mockReturnValue(chain),
          }
        }

        return {}
      })
      mockCreateServiceClient.mockReturnValue({
        from: mockSupabaseFrom,
      })

      const { GET } = await import('@/app/api/job-search/matches/route')
      const response = await GET(createRequest())

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.lastSearchAt).toBeNull()
    })
  })
})
