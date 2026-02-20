/**
 * AI Insights API Route Tests (Phase 4.5)
 *
 * RALPH tests for POST /api/job-search/insights endpoint.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import type {
  JobSearchPreferencesRow,
  SearchInsights,
  JobPostingRow,
} from '@/types/job-search'

// ============================================================================
// Mocks
// ============================================================================

const mockGetUser = vi.fn()
const mockCreateClient = vi.fn()
const mockCreateServiceClient = vi.fn()
const mockGenerateSearchInsights = vi.fn()
const mockShouldRefreshInsights = vi.fn()

// Supabase mock chains
const mockSupabaseFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
  createServiceClient: () => mockCreateServiceClient(),
}))

vi.mock('@/lib/job-search', () => ({
  generateSearchInsights: (profile: unknown, prefs: unknown, jobs: unknown) =>
    mockGenerateSearchInsights(profile, prefs, jobs),
  shouldRefreshInsights: (prefs: unknown) => mockShouldRefreshInsights(prefs),
}))

// ============================================================================
// Test Fixtures
// ============================================================================

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
    career_goals: 'Lead a team',
    general_cv_analysis: {
      skills: ['TypeScript', 'React'],
      experience_years: 5,
    },
    ...overrides,
  }
}

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
    ai_keywords: ['typescript', 'react', 'node'],
    ai_recommended_boards: [{ name: 'LinkedIn', url: 'https://linkedin.com', reason: 'Best for tech' }],
    ai_market_insights: 'Market is competitive for senior roles.',
    ai_personalized_strategy: 'Focus on highlighting your React experience.',
    ai_last_analysis_at: '2026-02-15T10:00:00Z',
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
    match_score: 85,
    match_breakdown: { skills: 35, experience: 18, location: 12, salary: 12, preferences: 8 },
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

function createMockInsights(overrides: Partial<SearchInsights> = {}): SearchInsights {
  return {
    keywords: ['typescript', 'react', 'node.js', 'aws'],
    recommendedBoards: [
      { name: 'LinkedIn', url: 'https://linkedin.com/jobs', reason: 'Best for tech roles' },
      { name: 'Wellfound', url: 'https://wellfound.com', reason: 'Great for startups' },
    ],
    marketInsights: 'The tech market shows strong demand for full-stack developers.',
    personalizedStrategy: 'Focus on highlighting your TypeScript and React expertise.',
    generatedAt: new Date().toISOString(),
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
  profile?: ReturnType<typeof createMockProfile> | null
  profileError?: { code: string; message: string } | null
  prefs?: JobSearchPreferencesRow | null
  prefsError?: { code: string; message: string } | null
  recentJobs?: JobPostingRow[]
  jobsError?: { code: string; message: string } | null
  insertError?: { code: string; message: string } | null
  updateError?: { code: string; message: string } | null
  captureUpdate?: (data: Record<string, unknown>) => void
}

function setupServiceClient(options: ServiceClientOptions = {}) {
  const {
    profile = createMockProfile(),
    profileError = null,
    prefs = createMockPreferences(),
    prefsError = null,
    recentJobs = [],
    jobsError = null,
    insertError = null,
    updateError = null,
    captureUpdate,
  } = options

  mockSupabaseFrom.mockImplementation((table: string) => {
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
            eq: vi.fn().mockResolvedValue({ error: updateError }),
          }
        }),
      }
    }

    if (table === 'job_postings') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: recentJobs,
                error: jobsError,
              }),
            }),
          }),
        }),
      }
    }

    return {}
  })

  mockCreateServiceClient.mockReturnValue({
    from: mockSupabaseFrom,
  })
}

function createRequest(body?: Record<string, unknown>): NextRequest {
  const options: RequestInit = { method: 'POST' }
  if (body) {
    options.headers = { 'Content-Type': 'application/json' }
    options.body = JSON.stringify(body)
  }
  return new NextRequest('http://localhost/api/job-search/insights', options)
}

// ============================================================================
// Tests
// ============================================================================

describe('POST /api/job-search/insights', () => {
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

      const { POST } = await import('@/app/api/job-search/insights/route')
      const response = await POST(createRequest())

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
    })
  })

  // ==========================================================================
  // Returns: Profile Errors
  // ==========================================================================

  describe('Profile Handling', () => {
    it('R: returns 404 when profile not found', async () => {
      setupAuthenticatedUser()
      setupServiceClient({
        profile: null,
        profileError: { code: 'PGRST116', message: 'No rows found' },
      })

      const { POST } = await import('@/app/api/job-search/insights/route')
      const response = await POST(createRequest())

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toContain('Profile not found')
    })
  })

  // ==========================================================================
  // Logic: Cached Insights
  // ==========================================================================

  describe('Cached Insights', () => {
    it('L: returns cached insights when refresh not needed', async () => {
      setupAuthenticatedUser()
      const cachedPrefs = createMockPreferences({
        ai_keywords: ['cached', 'keywords'],
        ai_market_insights: 'Cached market insights',
        ai_last_analysis_at: '2026-02-18T10:00:00Z',
      })
      setupServiceClient({ prefs: cachedPrefs })
      mockShouldRefreshInsights.mockReturnValue(false)

      const { POST } = await import('@/app/api/job-search/insights/route')
      const response = await POST(createRequest())

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.cached).toBe(true)
      expect(data.insights.keywords).toEqual(['cached', 'keywords'])
      expect(mockGenerateSearchInsights).not.toHaveBeenCalled()
    })

    it('L: generates fresh insights when forceRefresh is true', async () => {
      setupAuthenticatedUser()
      setupServiceClient()
      mockShouldRefreshInsights.mockReturnValue(false) // Would return cached normally
      mockGenerateSearchInsights.mockResolvedValue(createMockInsights())

      const { POST } = await import('@/app/api/job-search/insights/route')
      const response = await POST(createRequest({ forceRefresh: true }))

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.cached).toBe(false)
      expect(mockGenerateSearchInsights).toHaveBeenCalled()
    })

    it('L: generates fresh insights when shouldRefreshInsights returns true', async () => {
      setupAuthenticatedUser()
      setupServiceClient()
      mockShouldRefreshInsights.mockReturnValue(true)
      mockGenerateSearchInsights.mockResolvedValue(createMockInsights())

      const { POST } = await import('@/app/api/job-search/insights/route')
      const response = await POST(createRequest())

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.cached).toBe(false)
      expect(mockGenerateSearchInsights).toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // Logic: Insight Generation
  // ==========================================================================

  describe('Insight Generation', () => {
    it('L: calls generateSearchInsights with profile, prefs, and recent jobs', async () => {
      setupAuthenticatedUser()
      const recentJobs = [
        createMockJobPosting({ title: 'Job 1' }),
        createMockJobPosting({ title: 'Job 2' }),
      ]
      setupServiceClient({ recentJobs })
      mockShouldRefreshInsights.mockReturnValue(true)
      mockGenerateSearchInsights.mockResolvedValue(createMockInsights())

      const { POST } = await import('@/app/api/job-search/insights/route')
      await POST(createRequest())

      expect(mockGenerateSearchInsights).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-123' }),
        expect.objectContaining({ user_id: 'user-123' }),
        expect.arrayContaining([
          expect.objectContaining({ title: 'Job 1' }),
          expect.objectContaining({ title: 'Job 2' }),
        ])
      )
    })

    it('L: creates default preferences if none exist', async () => {
      setupAuthenticatedUser()
      setupServiceClient({
        prefs: null,
        prefsError: { code: 'PGRST116', message: 'No rows found' },
      })
      mockShouldRefreshInsights.mockReturnValue(true)
      mockGenerateSearchInsights.mockResolvedValue(createMockInsights())

      const { POST } = await import('@/app/api/job-search/insights/route')
      const response = await POST(createRequest())

      expect(response.status).toBe(200)
    })

    it('L: continues without recent jobs if job fetch fails', async () => {
      setupAuthenticatedUser()
      setupServiceClient({
        jobsError: { code: 'DB_ERROR', message: 'Query failed' },
      })
      mockShouldRefreshInsights.mockReturnValue(true)
      mockGenerateSearchInsights.mockResolvedValue(createMockInsights())

      const { POST } = await import('@/app/api/job-search/insights/route')
      const response = await POST(createRequest())

      expect(response.status).toBe(200)
      expect(mockGenerateSearchInsights).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        [] // Empty array when jobs fetch fails
      )
    })
  })

  // ==========================================================================
  // Logic: Save Results
  // ==========================================================================

  describe('Save Results', () => {
    it('L: saves generated insights to preferences', async () => {
      setupAuthenticatedUser()
      let capturedUpdate: Record<string, unknown> | null = null
      setupServiceClient({
        captureUpdate: (data) => {
          capturedUpdate = data
        },
      })
      mockShouldRefreshInsights.mockReturnValue(true)
      const insights = createMockInsights({
        keywords: ['new', 'keywords'],
        marketInsights: 'Fresh market insights',
      })
      mockGenerateSearchInsights.mockResolvedValue(insights)

      const { POST } = await import('@/app/api/job-search/insights/route')
      await POST(createRequest())

      expect(capturedUpdate).not.toBeNull()
      expect(capturedUpdate!.ai_keywords).toEqual(['new', 'keywords'])
      expect(capturedUpdate!.ai_market_insights).toBe('Fresh market insights')
      expect(capturedUpdate!.ai_last_analysis_at).toBeDefined()
    })

    it('L: returns insights even if save fails', async () => {
      setupAuthenticatedUser()
      setupServiceClient({
        updateError: { code: 'DB_ERROR', message: 'Update failed' },
      })
      mockShouldRefreshInsights.mockReturnValue(true)
      mockGenerateSearchInsights.mockResolvedValue(createMockInsights())

      const { POST } = await import('@/app/api/job-search/insights/route')
      const response = await POST(createRequest())

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.insights).toBeDefined()
    })
  })

  // ==========================================================================
  // Returns: Success Response
  // ==========================================================================

  describe('Success Response', () => {
    it('R: returns SearchInsights structure', async () => {
      setupAuthenticatedUser()
      setupServiceClient()
      mockShouldRefreshInsights.mockReturnValue(true)
      mockGenerateSearchInsights.mockResolvedValue(createMockInsights())

      const { POST } = await import('@/app/api/job-search/insights/route')
      const response = await POST(createRequest())

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.insights).toBeDefined()
      expect(data.insights.keywords).toBeDefined()
      expect(data.insights.recommendedBoards).toBeDefined()
      expect(data.insights.marketInsights).toBeDefined()
      expect(data.insights.personalizedStrategy).toBeDefined()
      expect(data.insights.generatedAt).toBeDefined()
    })

    it('R: returns cached flag correctly', async () => {
      setupAuthenticatedUser()
      setupServiceClient()
      mockShouldRefreshInsights.mockReturnValue(true)
      mockGenerateSearchInsights.mockResolvedValue(createMockInsights())

      const { POST } = await import('@/app/api/job-search/insights/route')
      const response = await POST(createRequest())

      const data = await response.json()
      expect(data.cached).toBe(false)
    })
  })

  // ==========================================================================
  // Handling: Errors
  // ==========================================================================

  describe('Error Handling', () => {
    it('H: returns 500 when generateSearchInsights throws', async () => {
      setupAuthenticatedUser()
      setupServiceClient()
      mockShouldRefreshInsights.mockReturnValue(true)
      mockGenerateSearchInsights.mockRejectedValue(new Error('OpenAI API error'))

      const { POST } = await import('@/app/api/job-search/insights/route')
      const response = await POST(createRequest())

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('OpenAI API error')
    })

    it('H: returns 500 on preferences fetch error', async () => {
      setupAuthenticatedUser()
      setupServiceClient({
        prefs: null,
        prefsError: { code: 'DB_ERROR', message: 'Connection failed' },
      })

      const { POST } = await import('@/app/api/job-search/insights/route')
      const response = await POST(createRequest())

      expect(response.status).toBe(500)
    })

    it('H: handles unexpected errors gracefully', async () => {
      setupAuthenticatedUser()
      mockCreateServiceClient.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const { POST } = await import('@/app/api/job-search/insights/route')
      const response = await POST(createRequest())

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Unexpected error')
    })
  })
})
