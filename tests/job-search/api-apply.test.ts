/**
 * Job Apply API Route Tests (Phase 4.6)
 *
 * RALPH tests for POST /api/job-search/apply endpoint.
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

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
  createServiceClient: () => mockCreateServiceClient(),
}))

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockJobPosting(overrides: Partial<JobPostingRow> = {}): JobPostingRow {
  return {
    id: 'job-123',
    user_id: 'user-123',
    title: 'Senior Software Engineer',
    company_name: 'TechCorp',
    company_logo_url: null,
    description: 'Build amazing products with TypeScript and React.',
    location: 'San Francisco, CA',
    work_type: 'remote',
    experience_level: 'senior',
    salary_min: 150000,
    salary_max: 200000,
    salary_currency: 'USD',
    required_skills: ['TypeScript', 'React', 'Node.js'],
    benefits: ['Health Insurance', '401k'],
    company_size: '51-200',
    source_url: 'https://example.com/jobs/123',
    source_platform: 'LinkedIn',
    posted_date: '2026-02-15',
    discovered_at: new Date().toISOString(),
    match_score: 85,
    match_breakdown: { skills: 35, experience: 18, location: 12, salary: 12, preferences: 8 },
    match_reasons: ['Strong TypeScript skills', 'Remote work preferred', 'Salary matches expectations'],
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

interface ServiceClientOptions {
  job?: JobPostingRow | null
  jobError?: { code: string; message: string } | null
  applicationId?: string
  insertError?: { code: string; message: string } | null
  updateError?: { code: string; message: string } | null
  captureApplication?: (data: Record<string, unknown>) => void
  captureJobUpdate?: (data: Record<string, unknown>) => void
}

function setupServiceClient(options: ServiceClientOptions = {}) {
  const {
    job = createMockJobPosting(),
    jobError = null,
    applicationId = 'app-456',
    insertError = null,
    updateError = null,
    captureApplication,
    captureJobUpdate,
  } = options

  mockSupabaseFrom.mockImplementation((table: string) => {
    if (table === 'job_postings') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: job,
              error: jobError,
            }),
          }),
        }),
        update: vi.fn().mockImplementation((data: Record<string, unknown>) => {
          if (captureJobUpdate) captureJobUpdate(data)
          return {
            eq: vi.fn().mockResolvedValue({ error: updateError }),
          }
        }),
      }
    }

    if (table === 'job_applications') {
      return {
        insert: vi.fn().mockImplementation((data: Record<string, unknown>) => {
          if (captureApplication) captureApplication(data)
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: applicationId },
                error: insertError,
              }),
            }),
          }
        }),
      }
    }

    return {}
  })

  mockCreateServiceClient.mockReturnValue({
    from: mockSupabaseFrom,
  })
}

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/job-search/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ============================================================================
// Tests
// ============================================================================

describe('POST /api/job-search/apply', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  // ==========================================================================
  // Returns: Authentication
  // ==========================================================================

  describe('Authentication', () => {
    it('R: returns 401 when not authenticated', async () => {
      setupUnauthenticatedUser()
      setupServiceClient()

      const { POST } = await import('@/app/api/job-search/apply/route')
      const response = await POST(createRequest({ jobPostingId: 'job-123' }))

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
    })
  })

  // ==========================================================================
  // Asserts: Validation
  // ==========================================================================

  describe('Validation', () => {
    it('A: returns 400 for invalid JSON', async () => {
      setupAuthenticatedUser()
      setupServiceClient()

      const { POST } = await import('@/app/api/job-search/apply/route')
      const request = new NextRequest('http://localhost/api/job-search/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid JSON')
    })

    it('A: returns 400 for missing jobPostingId', async () => {
      setupAuthenticatedUser()
      setupServiceClient()

      const { POST } = await import('@/app/api/job-search/apply/route')
      const response = await POST(createRequest({}))

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Validation error')
    })

    it('A: returns 400 for invalid jobPostingId (not UUID)', async () => {
      setupAuthenticatedUser()
      setupServiceClient()

      const { POST } = await import('@/app/api/job-search/apply/route')
      const response = await POST(createRequest({ jobPostingId: 'not-a-uuid' }))

      expect(response.status).toBe(400)
    })
  })

  // ==========================================================================
  // Asserts: Authorization
  // ==========================================================================

  describe('Authorization', () => {
    it('A: returns 404 when job posting not found', async () => {
      setupAuthenticatedUser()
      setupServiceClient({
        job: null,
        jobError: { code: 'PGRST116', message: 'No rows found' },
      })

      const { POST } = await import('@/app/api/job-search/apply/route')
      const response = await POST(createRequest({ jobPostingId: '550e8400-e29b-41d4-a716-446655440000' }))

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toContain('not found')
    })

    it('A: returns 403 when job belongs to different user', async () => {
      setupAuthenticatedUser('user-123')
      setupServiceClient({
        job: createMockJobPosting({ user_id: 'different-user' }),
      })

      const { POST } = await import('@/app/api/job-search/apply/route')
      const response = await POST(createRequest({ jobPostingId: '550e8400-e29b-41d4-a716-446655440000' }))

      expect(response.status).toBe(403)
    })
  })

  // ==========================================================================
  // Logic: Already Applied
  // ==========================================================================

  describe('Already Applied', () => {
    it('L: returns existing application if already applied', async () => {
      setupAuthenticatedUser()
      setupServiceClient({
        job: createMockJobPosting({
          id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'applied',
          job_application_id: 'existing-app-123',
        }),
      })

      const { POST } = await import('@/app/api/job-search/apply/route')
      const response = await POST(createRequest({ jobPostingId: '550e8400-e29b-41d4-a716-446655440000' }))

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.applicationId).toBe('existing-app-123')
      expect(data.redirectUrl).toContain('existing-app-123')
    })
  })

  // ==========================================================================
  // Logic: Application Creation
  // ==========================================================================

  describe('Application Creation', () => {
    it('L: creates application with data from job posting', async () => {
      setupAuthenticatedUser()
      let capturedApplication: Record<string, unknown> | null = null
      setupServiceClient({
        job: createMockJobPosting({
          id: '550e8400-e29b-41d4-a716-446655440000',
          title: 'Frontend Developer',
          company_name: 'StartupXYZ',
          description: 'Build UIs',
          location: 'New York',
          source_url: 'https://startup.xyz/careers',
          source_platform: 'Company Website',
          salary_min: 100000,
          salary_max: 130000,
          salary_currency: 'EUR',
        }),
        captureApplication: (data) => {
          capturedApplication = data
        },
      })

      const { POST } = await import('@/app/api/job-search/apply/route')
      await POST(createRequest({ jobPostingId: '550e8400-e29b-41d4-a716-446655440000' }))

      expect(capturedApplication).not.toBeNull()
      expect(capturedApplication!.company_name).toBe('StartupXYZ')
      expect(capturedApplication!.position_title).toBe('Frontend Developer')
      expect(capturedApplication!.job_description).toBe('Build UIs')
      expect(capturedApplication!.location).toBe('New York')
      expect(capturedApplication!.application_url).toBe('https://startup.xyz/careers')
      expect(capturedApplication!.application_method).toBe('Company Website')
      expect(capturedApplication!.salary_min).toBe(100000)
      expect(capturedApplication!.salary_max).toBe(130000)
      expect(capturedApplication!.salary_currency).toBe('EUR')
    })

    it('L: sets application_status to "prepared"', async () => {
      setupAuthenticatedUser()
      let capturedApplication: Record<string, unknown> | null = null
      setupServiceClient({
        job: createMockJobPosting({ id: '550e8400-e29b-41d4-a716-446655440000' }),
        captureApplication: (data) => {
          capturedApplication = data
        },
      })

      const { POST } = await import('@/app/api/job-search/apply/route')
      await POST(createRequest({ jobPostingId: '550e8400-e29b-41d4-a716-446655440000' }))

      expect(capturedApplication!.application_status).toBe('prepared')
    })

    it('L: sets application_date to today', async () => {
      setupAuthenticatedUser()
      let capturedApplication: Record<string, unknown> | null = null
      setupServiceClient({
        job: createMockJobPosting({ id: '550e8400-e29b-41d4-a716-446655440000' }),
        captureApplication: (data) => {
          capturedApplication = data
        },
      })

      const { POST } = await import('@/app/api/job-search/apply/route')
      await POST(createRequest({ jobPostingId: '550e8400-e29b-41d4-a716-446655440000' }))

      const today = new Date().toISOString().split('T')[0]
      expect(capturedApplication!.application_date).toBe(today)
    })

    it('L: populates notes from match_reasons', async () => {
      setupAuthenticatedUser()
      let capturedApplication: Record<string, unknown> | null = null
      setupServiceClient({
        job: createMockJobPosting({
          id: '550e8400-e29b-41d4-a716-446655440000',
          match_reasons: ['Great skills match', 'Remote work', 'Good salary'],
        }),
        captureApplication: (data) => {
          capturedApplication = data
        },
      })

      const { POST } = await import('@/app/api/job-search/apply/route')
      await POST(createRequest({ jobPostingId: '550e8400-e29b-41d4-a716-446655440000' }))

      expect(capturedApplication!.notes).toContain('Great skills match')
      expect(capturedApplication!.notes).toContain('Remote work')
      expect(capturedApplication!.notes).toContain('Good salary')
    })

    it('L: sets priority_level based on match_score', async () => {
      setupAuthenticatedUser()
      let capturedApplication: Record<string, unknown> | null = null
      setupServiceClient({
        job: createMockJobPosting({
          id: '550e8400-e29b-41d4-a716-446655440000',
          match_score: 92,
        }),
        captureApplication: (data) => {
          capturedApplication = data
        },
      })

      const { POST } = await import('@/app/api/job-search/apply/route')
      await POST(createRequest({ jobPostingId: '550e8400-e29b-41d4-a716-446655440000' }))

      expect(capturedApplication!.priority_level).toBe('high')
    })

    it('L: sets priority_level to medium for 80-89 score', async () => {
      setupAuthenticatedUser()
      let capturedApplication: Record<string, unknown> | null = null
      setupServiceClient({
        job: createMockJobPosting({
          id: '550e8400-e29b-41d4-a716-446655440000',
          match_score: 85,
        }),
        captureApplication: (data) => {
          capturedApplication = data
        },
      })

      const { POST } = await import('@/app/api/job-search/apply/route')
      await POST(createRequest({ jobPostingId: '550e8400-e29b-41d4-a716-446655440000' }))

      expect(capturedApplication!.priority_level).toBe('medium')
    })

    it('L: sets priority_level to low for <80 score', async () => {
      setupAuthenticatedUser()
      let capturedApplication: Record<string, unknown> | null = null
      setupServiceClient({
        job: createMockJobPosting({
          id: '550e8400-e29b-41d4-a716-446655440000',
          match_score: 75,
        }),
        captureApplication: (data) => {
          capturedApplication = data
        },
      })

      const { POST } = await import('@/app/api/job-search/apply/route')
      await POST(createRequest({ jobPostingId: '550e8400-e29b-41d4-a716-446655440000' }))

      expect(capturedApplication!.priority_level).toBe('low')
    })
  })

  // ==========================================================================
  // Logic: Job Posting Update
  // ==========================================================================

  describe('Job Posting Update', () => {
    it('L: updates job_posting status to "applied"', async () => {
      setupAuthenticatedUser()
      let capturedJobUpdate: Record<string, unknown> | null = null
      setupServiceClient({
        job: createMockJobPosting({ id: '550e8400-e29b-41d4-a716-446655440000' }),
        captureJobUpdate: (data) => {
          capturedJobUpdate = data
        },
      })

      const { POST } = await import('@/app/api/job-search/apply/route')
      await POST(createRequest({ jobPostingId: '550e8400-e29b-41d4-a716-446655440000' }))

      expect(capturedJobUpdate).not.toBeNull()
      expect(capturedJobUpdate!.status).toBe('applied')
    })

    it('L: sets job_application_id on job_posting', async () => {
      setupAuthenticatedUser()
      let capturedJobUpdate: Record<string, unknown> | null = null
      setupServiceClient({
        job: createMockJobPosting({ id: '550e8400-e29b-41d4-a716-446655440000' }),
        applicationId: 'new-app-789',
        captureJobUpdate: (data) => {
          capturedJobUpdate = data
        },
      })

      const { POST } = await import('@/app/api/job-search/apply/route')
      await POST(createRequest({ jobPostingId: '550e8400-e29b-41d4-a716-446655440000' }))

      expect(capturedJobUpdate!.job_application_id).toBe('new-app-789')
    })
  })

  // ==========================================================================
  // Returns: Success Response
  // ==========================================================================

  describe('Success Response', () => {
    it('R: returns success with applicationId', async () => {
      setupAuthenticatedUser()
      setupServiceClient({
        job: createMockJobPosting({ id: '550e8400-e29b-41d4-a716-446655440000' }),
        applicationId: 'created-app-123',
      })

      const { POST } = await import('@/app/api/job-search/apply/route')
      const response = await POST(createRequest({ jobPostingId: '550e8400-e29b-41d4-a716-446655440000' }))

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.applicationId).toBe('created-app-123')
    })

    it('R: returns redirectUrl to cv-tailor page', async () => {
      setupAuthenticatedUser()
      setupServiceClient({
        job: createMockJobPosting({ id: '550e8400-e29b-41d4-a716-446655440000' }),
        applicationId: 'app-xyz',
      })

      const { POST } = await import('@/app/api/job-search/apply/route')
      const response = await POST(createRequest({ jobPostingId: '550e8400-e29b-41d4-a716-446655440000' }))

      const data = await response.json()
      expect(data.redirectUrl).toBe('/cv-tailor?applicationId=app-xyz')
    })
  })

  // ==========================================================================
  // Handling: Errors
  // ==========================================================================

  describe('Error Handling', () => {
    it('H: returns 500 when application creation fails', async () => {
      setupAuthenticatedUser()
      setupServiceClient({
        job: createMockJobPosting({ id: '550e8400-e29b-41d4-a716-446655440000' }),
        insertError: { code: 'DB_ERROR', message: 'Insert failed' },
      })

      const { POST } = await import('@/app/api/job-search/apply/route')
      const response = await POST(createRequest({ jobPostingId: '550e8400-e29b-41d4-a716-446655440000' }))

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toContain('Failed to create application')
    })

    it('H: succeeds even when job posting update fails', async () => {
      setupAuthenticatedUser()
      setupServiceClient({
        job: createMockJobPosting({ id: '550e8400-e29b-41d4-a716-446655440000' }),
        updateError: { code: 'DB_ERROR', message: 'Update failed' },
      })

      const { POST } = await import('@/app/api/job-search/apply/route')
      const response = await POST(createRequest({ jobPostingId: '550e8400-e29b-41d4-a716-446655440000' }))

      // Should succeed - application was created
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it('H: handles unexpected errors gracefully', async () => {
      setupAuthenticatedUser()
      mockCreateServiceClient.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const { POST } = await import('@/app/api/job-search/apply/route')
      const response = await POST(createRequest({ jobPostingId: '550e8400-e29b-41d4-a716-446655440000' }))

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Unexpected error')
    })
  })
})
