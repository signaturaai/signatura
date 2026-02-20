/**
 * Job Search Preferences & Keywords API Tests (Phase 4.4)
 *
 * RALPH tests for:
 * - GET/PUT /api/job-search/preferences
 * - PATCH /api/job-search/keywords
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import type { JobSearchPreferencesRow, JobPostingRow } from '@/types/job-search'

// ============================================================================
// Mocks
// ============================================================================

const mockGetUser = vi.fn()
const mockCreateClient = vi.fn()
const mockCreateServiceClient = vi.fn()
const mockCalculateMatchScore = vi.fn()

// Supabase mock chains
const mockSupabaseFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
  createServiceClient: () => mockCreateServiceClient(),
}))

vi.mock('@/lib/job-search', () => ({
  calculateMatchScore: (job: unknown, profile: unknown, prefs: unknown) =>
    mockCalculateMatchScore(job, profile, prefs),
}))

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockPreferences(overrides: Partial<JobSearchPreferencesRow> = {}): JobSearchPreferencesRow {
  return {
    id: 'prefs-123',
    user_id: 'user-123',
    is_active: true,
    preferred_job_titles: ['Software Engineer'],
    preferred_locations: ['San Francisco'],
    experience_years: '5-10',
    required_skills: [],
    company_size_preferences: [],
    remote_policy_preferences: ['remote'],
    required_benefits: [],
    salary_min_override: null,
    salary_currency_override: null,
    avoid_companies: [],
    avoid_keywords: [],
    ai_keywords: ['typescript', 'react'],
    ai_recommended_boards: [],
    ai_market_insights: null,
    ai_personalized_strategy: null,
    ai_last_analysis_at: null,
    implicit_preferences: {},
    feedback_stats: { total_likes: 0, total_dislikes: 0, total_hides: 0, reasons: {} },
    email_notification_frequency: 'weekly',
    last_email_sent_at: null,
    last_search_at: null,
    consecutive_zero_match_days: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

function createMockProfile(overrides = {}) {
  return {
    id: 'user-123',
    full_name: 'Test User',
    preferred_job_titles: ['Software Engineer'],
    preferred_industries: ['Technology'],
    minimum_salary_expectation: 100000,
    salary_currency: 'USD',
    location_preferences: { city: 'San Francisco' },
    company_size_preferences: [],
    career_goals: null,
    general_cv_analysis: null,
    ...overrides,
  }
}

function createMockJobPosting(overrides: Partial<JobPostingRow> = {}): JobPostingRow {
  return {
    id: 'job-123',
    user_id: 'user-123',
    title: 'Software Engineer',
    company_name: 'TechCorp',
    company_logo_url: null,
    description: 'Build stuff',
    location: 'San Francisco',
    work_type: 'remote',
    experience_level: 'senior',
    salary_min: 120000,
    salary_max: 180000,
    salary_currency: 'USD',
    required_skills: ['TypeScript'],
    benefits: [],
    company_size: '51-200',
    source_url: 'https://example.com/job',
    source_platform: 'LinkedIn',
    posted_date: '2026-02-15',
    discovered_at: new Date().toISOString(),
    match_score: 70,
    match_breakdown: { skills: 30, experience: 15, location: 10, salary: 10, preferences: 5 },
    match_reasons: [],
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
  prefs?: JobSearchPreferencesRow | null
  prefsError?: { code: string; message: string } | null
  profile?: ReturnType<typeof createMockProfile> | null
  profileError?: { code: string; message: string } | null
  borderlineJobs?: JobPostingRow[]
  jobsError?: { code: string; message: string } | null
  insertError?: { code: string; message: string } | null
  updateError?: { code: string; message: string } | null
  captureUpdate?: (data: Record<string, unknown>) => void
}

function setupServiceClient(options: ServiceClientOptions = {}) {
  const {
    prefs = createMockPreferences(),
    prefsError = null,
    profile = createMockProfile(),
    profileError = null,
    borderlineJobs = [],
    jobsError = null,
    insertError = null,
    updateError = null,
    captureUpdate,
  } = options

  mockSupabaseFrom.mockImplementation((table: string) => {
    if (table === 'job_search_preferences') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: prefs,
              error: prefsError,
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: prefs || createMockPreferences(),
              error: insertError,
            }),
          }),
        }),
        update: vi.fn().mockImplementation((data: Record<string, unknown>) => {
          if (captureUpdate) captureUpdate(data)
          return {
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...prefs, ...data },
                  error: updateError,
                }),
              }),
            }),
          }
        }),
      }
    }

    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: profile,
              error: profileError,
            }),
          }),
        }),
      }
    }

    if (table === 'job_postings') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                gte: vi.fn().mockResolvedValue({
                  data: borderlineJobs,
                  error: jobsError,
                }),
              }),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }
    }

    return {}
  })

  mockCreateServiceClient.mockReturnValue({
    from: mockSupabaseFrom,
  })
}

function createGetRequest(): NextRequest {
  return new NextRequest('http://localhost/api/job-search/preferences', {
    method: 'GET',
  })
}

function createPutRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/job-search/preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function createPatchRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/job-search/keywords', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ============================================================================
// Preferences GET Tests
// ============================================================================

describe('GET /api/job-search/preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('Authentication', () => {
    it('R: returns 401 when not authenticated', async () => {
      setupUnauthenticatedUser()
      setupServiceClient()

      const { GET } = await import('@/app/api/job-search/preferences/route')
      const response = await GET()

      expect(response.status).toBe(401)
    })
  })

  describe('Success Response', () => {
    it('R: returns existing preferences', async () => {
      setupAuthenticatedUser()
      const prefs = createMockPreferences({ preferred_job_titles: ['Developer'] })
      setupServiceClient({ prefs })

      const { GET } = await import('@/app/api/job-search/preferences/route')
      const response = await GET()

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.preferences).toBeDefined()
      expect(data.preferences.preferred_job_titles).toContain('Developer')
    })

    it('R: creates default preferences if none exist', async () => {
      setupAuthenticatedUser()
      setupServiceClient({
        prefs: null,
        prefsError: { code: 'PGRST116', message: 'No rows found' },
      })

      const { GET } = await import('@/app/api/job-search/preferences/route')
      const response = await GET()

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.preferences).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('H: returns 500 on database error', async () => {
      setupAuthenticatedUser()
      setupServiceClient({
        prefs: null,
        prefsError: { code: 'DB_ERROR', message: 'Connection failed' },
      })

      const { GET } = await import('@/app/api/job-search/preferences/route')
      const response = await GET()

      expect(response.status).toBe(500)
    })
  })
})

// ============================================================================
// Preferences PUT Tests
// ============================================================================

describe('PUT /api/job-search/preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('Authentication', () => {
    it('R: returns 401 when not authenticated', async () => {
      setupUnauthenticatedUser()
      setupServiceClient()

      const { PUT } = await import('@/app/api/job-search/preferences/route')
      const response = await PUT(createPutRequest({ is_active: false }))

      expect(response.status).toBe(401)
    })
  })

  describe('Validation', () => {
    it('A: returns 400 for invalid JSON', async () => {
      setupAuthenticatedUser()
      setupServiceClient()

      const { PUT } = await import('@/app/api/job-search/preferences/route')
      const request = new NextRequest('http://localhost/api/job-search/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      })
      const response = await PUT(request)

      expect(response.status).toBe(400)
    })

    it('A: returns 400 for invalid field values', async () => {
      setupAuthenticatedUser()
      setupServiceClient()

      const { PUT } = await import('@/app/api/job-search/preferences/route')
      const response = await PUT(
        createPutRequest({ email_notification_frequency: 'invalid' })
      )

      expect(response.status).toBe(400)
    })

    it('A: accepts valid partial updates', async () => {
      setupAuthenticatedUser()
      setupServiceClient()

      const { PUT } = await import('@/app/api/job-search/preferences/route')
      const response = await PUT(createPutRequest({ is_active: false }))

      expect(response.status).toBe(200)
    })
  })

  describe('Update Logic', () => {
    it('L: updates preferences successfully', async () => {
      setupAuthenticatedUser()
      let capturedUpdate: Record<string, unknown> | null = null
      setupServiceClient({
        captureUpdate: (data) => {
          capturedUpdate = data
        },
      })

      const { PUT } = await import('@/app/api/job-search/preferences/route')
      const response = await PUT(
        createPutRequest({
          preferred_job_titles: ['Senior Developer'],
          is_active: true,
        })
      )

      expect(response.status).toBe(200)
      expect(capturedUpdate).not.toBeNull()
      expect(capturedUpdate!.preferred_job_titles).toContain('Senior Developer')
    })

    it('L: creates preferences if none exist before update', async () => {
      setupAuthenticatedUser()
      setupServiceClient({
        prefs: null,
        prefsError: { code: 'PGRST116', message: 'No rows found' },
      })

      const { PUT } = await import('@/app/api/job-search/preferences/route')
      const response = await PUT(createPutRequest({ is_active: false }))

      expect(response.status).toBe(200)
    })
  })

  describe('Borderline Job Re-scoring', () => {
    it('L: re-scores borderline jobs on significant changes', async () => {
      setupAuthenticatedUser()
      const borderlineJob = createMockJobPosting({ match_score: 70 })
      setupServiceClient({ borderlineJobs: [borderlineJob] })

      mockCalculateMatchScore.mockReturnValue({
        totalScore: 80,
        breakdown: { skills: 35, experience: 18, location: 12, salary: 10, preferences: 5 },
        matchReasons: ['Improved match'],
        passesThreshold: true,
        isBorderline: false,
      })

      const { PUT } = await import('@/app/api/job-search/preferences/route')
      const response = await PUT(
        createPutRequest({ preferred_job_titles: ['Senior Engineer'] })
      )

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.promotedJobs).toBe(1)
    })

    it('L: does not re-score for non-significant changes', async () => {
      setupAuthenticatedUser()
      setupServiceClient()

      const { PUT } = await import('@/app/api/job-search/preferences/route')
      const response = await PUT(
        createPutRequest({ email_notification_frequency: 'daily' })
      )

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.promotedJobs).toBe(0)
    })

    it('L: only promotes jobs that reach 75+ after re-score', async () => {
      setupAuthenticatedUser()
      const job1 = createMockJobPosting({ id: 'job-1', match_score: 70 })
      const job2 = createMockJobPosting({ id: 'job-2', match_score: 68 })
      setupServiceClient({ borderlineJobs: [job1, job2] })

      mockCalculateMatchScore
        .mockReturnValueOnce({
          totalScore: 78,
          breakdown: {},
          matchReasons: [],
          passesThreshold: true,
          isBorderline: false,
        })
        .mockReturnValueOnce({
          totalScore: 72, // Still borderline
          breakdown: {},
          matchReasons: [],
          passesThreshold: false,
          isBorderline: true,
        })

      const { PUT } = await import('@/app/api/job-search/preferences/route')
      const response = await PUT(
        createPutRequest({ preferred_locations: ['New York'] })
      )

      const data = await response.json()
      expect(data.promotedJobs).toBe(1)
    })
  })

  describe('Error Handling', () => {
    it('H: returns 500 on update failure', async () => {
      setupAuthenticatedUser()
      setupServiceClient({
        updateError: { code: 'DB_ERROR', message: 'Update failed' },
      })

      const { PUT } = await import('@/app/api/job-search/preferences/route')
      const response = await PUT(createPutRequest({ is_active: false }))

      expect(response.status).toBe(500)
    })
  })
})

// ============================================================================
// Keywords PATCH Tests
// ============================================================================

describe('PATCH /api/job-search/keywords', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('Authentication', () => {
    it('R: returns 401 when not authenticated', async () => {
      setupUnauthenticatedUser()
      setupServiceClient()

      const { PATCH } = await import('@/app/api/job-search/keywords/route')
      const response = await PATCH(createPatchRequest({ action: 'add', keyword: 'node' }))

      expect(response.status).toBe(401)
    })
  })

  describe('Validation', () => {
    it('A: returns 400 for invalid JSON', async () => {
      setupAuthenticatedUser()
      setupServiceClient()

      const { PATCH } = await import('@/app/api/job-search/keywords/route')
      const request = new NextRequest('http://localhost/api/job-search/keywords', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid',
      })
      const response = await PATCH(request)

      expect(response.status).toBe(400)
    })

    it('A: returns 400 for missing action', async () => {
      setupAuthenticatedUser()
      setupServiceClient()

      const { PATCH } = await import('@/app/api/job-search/keywords/route')
      const response = await PATCH(createPatchRequest({ keyword: 'node' }))

      expect(response.status).toBe(400)
    })

    it('A: returns 400 for invalid action', async () => {
      setupAuthenticatedUser()
      setupServiceClient()

      const { PATCH } = await import('@/app/api/job-search/keywords/route')
      const response = await PATCH(createPatchRequest({ action: 'invalid', keyword: 'node' }))

      expect(response.status).toBe(400)
    })

    it('A: returns 400 for empty keyword', async () => {
      setupAuthenticatedUser()
      setupServiceClient()

      const { PATCH } = await import('@/app/api/job-search/keywords/route')
      const response = await PATCH(createPatchRequest({ action: 'add', keyword: '' }))

      expect(response.status).toBe(400)
    })
  })

  describe('Add Keyword', () => {
    it('L: adds keyword to ai_keywords array', async () => {
      setupAuthenticatedUser()
      let capturedUpdate: Record<string, unknown> | null = null

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'job_search_preferences') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ai_keywords: ['react', 'typescript'] },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockImplementation((data: Record<string, unknown>) => {
              capturedUpdate = data
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              }
            }),
          }
        }
        return {}
      })
      mockCreateServiceClient.mockReturnValue({ from: mockSupabaseFrom })

      const { PATCH } = await import('@/app/api/job-search/keywords/route')
      const response = await PATCH(createPatchRequest({ action: 'add', keyword: 'node' }))

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.keywords).toContain('node')
      expect(capturedUpdate!.ai_keywords).toContain('node')
    })

    it('L: does not add duplicate keyword (case insensitive)', async () => {
      setupAuthenticatedUser()

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'job_search_preferences') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ai_keywords: ['React', 'TypeScript'] },
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })
      mockCreateServiceClient.mockReturnValue({ from: mockSupabaseFrom })

      const { PATCH } = await import('@/app/api/job-search/keywords/route')
      const response = await PATCH(createPatchRequest({ action: 'add', keyword: 'react' }))

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.keywords).toEqual(['React', 'TypeScript'])
    })
  })

  describe('Remove Keyword', () => {
    it('L: removes keyword from ai_keywords array', async () => {
      setupAuthenticatedUser()
      let capturedUpdate: Record<string, unknown> | null = null

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'job_search_preferences') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ai_keywords: ['react', 'typescript', 'node'] },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockImplementation((data: Record<string, unknown>) => {
              capturedUpdate = data
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              }
            }),
          }
        }
        return {}
      })
      mockCreateServiceClient.mockReturnValue({ from: mockSupabaseFrom })

      const { PATCH } = await import('@/app/api/job-search/keywords/route')
      const response = await PATCH(createPatchRequest({ action: 'remove', keyword: 'typescript' }))

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.keywords).not.toContain('typescript')
      expect(capturedUpdate!.ai_keywords).not.toContain('typescript')
    })

    it('L: removes keyword case insensitively', async () => {
      setupAuthenticatedUser()
      let capturedUpdate: Record<string, unknown> | null = null

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'job_search_preferences') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ai_keywords: ['React', 'TypeScript'] },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockImplementation((data: Record<string, unknown>) => {
              capturedUpdate = data
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              }
            }),
          }
        }
        return {}
      })
      mockCreateServiceClient.mockReturnValue({ from: mockSupabaseFrom })

      const { PATCH } = await import('@/app/api/job-search/keywords/route')
      const response = await PATCH(createPatchRequest({ action: 'remove', keyword: 'REACT' }))

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.keywords).not.toContain('React')
    })

    it('L: returns current keywords if keyword not found', async () => {
      setupAuthenticatedUser()

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'job_search_preferences') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ai_keywords: ['react', 'typescript'] },
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })
      mockCreateServiceClient.mockReturnValue({ from: mockSupabaseFrom })

      const { PATCH } = await import('@/app/api/job-search/keywords/route')
      const response = await PATCH(createPatchRequest({ action: 'remove', keyword: 'nonexistent' }))

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.keywords).toEqual(['react', 'typescript'])
    })
  })

  describe('Error Handling', () => {
    it('H: returns 404 when preferences not found', async () => {
      setupAuthenticatedUser()
      setupServiceClient({
        prefs: null,
        prefsError: { code: 'PGRST116', message: 'No rows found' },
      })

      const { PATCH } = await import('@/app/api/job-search/keywords/route')
      const response = await PATCH(createPatchRequest({ action: 'add', keyword: 'node' }))

      expect(response.status).toBe(404)
    })

    it('H: returns 500 on database error', async () => {
      setupAuthenticatedUser()
      setupServiceClient({
        prefs: null,
        prefsError: { code: 'DB_ERROR', message: 'Connection failed' },
      })

      const { PATCH } = await import('@/app/api/job-search/keywords/route')
      const response = await PATCH(createPatchRequest({ action: 'add', keyword: 'node' }))

      expect(response.status).toBe(500)
    })
  })
})
