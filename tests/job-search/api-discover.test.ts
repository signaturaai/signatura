/**
 * Job Discovery API Route Tests (Phase 4.1)
 *
 * RALPH tests for POST /api/job-search/discover endpoint.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import type {
  DiscoveredJob,
  JobSearchPreferencesRow,
  MatchResult,
  MatchBreakdown,
} from '@/types/job-search'

// ============================================================================
// Mocks
// ============================================================================

const mockGetUser = vi.fn()
const mockCreateClient = vi.fn()
const mockCreateServiceClient = vi.fn()

// Job search mocks
const mockDiscoverJobs = vi.fn()
const mockCalculateMatchScore = vi.fn()

// Supabase mock chains
const mockSupabaseFrom = vi.fn()
const mockSupabaseSelect = vi.fn()
const mockSupabaseInsert = vi.fn()
const mockSupabaseUpdate = vi.fn()
const mockSupabaseEq = vi.fn()
const mockSupabaseSingle = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
  createServiceClient: () => mockCreateServiceClient(),
}))

vi.mock('@/lib/job-search', () => ({
  discoverJobs: (profile: unknown, prefs: unknown) => mockDiscoverJobs(profile, prefs),
  calculateMatchScore: (job: unknown, profile: unknown, prefs: unknown) =>
    mockCalculateMatchScore(job, profile, prefs),
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
    location_preferences: { city: 'San Francisco', remote_policy: 'remote' },
    company_size_preferences: ['51-200', '201-500'],
    career_goals: 'Lead a team',
    general_cv_analysis: {
      skills: ['TypeScript', 'React', 'Node.js'],
      experience_years: 5,
      industries: ['SaaS'],
      seniority_level: 'senior',
    },
    ...overrides,
  }
}

function createMockPreferences(overrides: Partial<JobSearchPreferencesRow> = {}): JobSearchPreferencesRow {
  return {
    id: 'prefs-123',
    user_id: 'user-123',
    is_active: true,
    preferred_job_titles: ['Senior Software Engineer'],
    preferred_locations: ['San Francisco', 'Remote'],
    experience_years: '5-10',
    required_skills: [{ skill: 'TypeScript', proficiency: 'expert' }],
    company_size_preferences: ['51-200'],
    remote_policy_preferences: ['remote', 'hybrid'],
    required_benefits: ['Health Insurance'],
    salary_min_override: null,
    salary_currency_override: null,
    avoid_companies: ['BadCorp'],
    avoid_keywords: ['junior'],
    ai_keywords: [],
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

function createMockDiscoveredJob(overrides: Partial<DiscoveredJob> = {}): DiscoveredJob {
  return {
    title: 'Senior Software Engineer',
    company_name: 'TechCorp',
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
    content_hash: 'abc123def456',
    ...overrides,
  }
}

function createMockMatchResult(overrides: Partial<MatchResult> = {}): MatchResult {
  return {
    totalScore: 85,
    breakdown: {
      skills: 35,
      experience: 18,
      location: 12,
      salary: 12,
      preferences: 8,
    },
    matchReasons: ['Strong TypeScript experience', 'Remote work available'],
    passesThreshold: true,
    isBorderline: false,
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
  profile?: ReturnType<typeof createMockProfile> | null
  profileError?: { code: string; message: string } | null
  preferences?: JobSearchPreferencesRow | null
  prefsError?: { code: string; message: string } | null
  insertError?: { code: string; message: string } | null
  updateError?: { code: string; message: string } | null
} = {}) {
  const {
    profile = createMockProfile(),
    profileError = null,
    preferences = createMockPreferences(),
    prefsError = null,
    insertError = null,
    updateError = null,
  } = options

  // Reset mocks
  mockSupabaseSingle.mockReset()
  mockSupabaseEq.mockReset()
  mockSupabaseSelect.mockReset()
  mockSupabaseInsert.mockReset()
  mockSupabaseUpdate.mockReset()
  mockSupabaseFrom.mockReset()

  // Build select chain for profiles
  const profileSelectChain = {
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: profile,
        error: profileError,
      }),
    }),
  }

  // Build select chain for preferences
  const prefsSelectChain = {
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: preferences,
        error: prefsError,
      }),
    }),
  }

  // Build insert chain
  const insertChain = {
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: preferences || createMockPreferences(),
        error: null,
      }),
    }),
  }

  // Build update chain
  const updateChain = {
    eq: vi.fn().mockResolvedValue({
      error: updateError,
    }),
  }

  // Configure from() to return different chains based on table
  let profileCallCount = 0
  let prefsCallCount = 0

  mockSupabaseFrom.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnValue(profileSelectChain),
      }
    }
    if (table === 'job_search_preferences') {
      prefsCallCount++
      if (prefsCallCount === 1) {
        // First call is select
        return {
          select: vi.fn().mockReturnValue(prefsSelectChain),
          insert: vi.fn().mockReturnValue(insertChain),
          update: vi.fn().mockReturnValue(updateChain),
        }
      }
      // Subsequent calls might be insert/update
      return {
        select: vi.fn().mockReturnValue(prefsSelectChain),
        insert: vi.fn().mockReturnValue(insertChain),
        update: vi.fn().mockReturnValue(updateChain),
      }
    }
    if (table === 'job_postings') {
      return {
        insert: vi.fn().mockResolvedValue({ error: insertError }),
      }
    }
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }
  })

  mockCreateServiceClient.mockReturnValue({
    from: mockSupabaseFrom,
  })
}

function createRequest(): NextRequest {
  return new NextRequest('http://localhost/api/job-search/discover', {
    method: 'POST',
  })
}

// ============================================================================
// Tests
// ============================================================================

describe('POST /api/job-search/discover', () => {
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

      const { POST } = await import('@/app/api/job-search/discover/route')
      const response = await POST(createRequest())

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
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

      const { POST } = await import('@/app/api/job-search/discover/route')
      const response = await POST(createRequest())

      expect(response.status).toBe(401)
    })
  })

  // ==========================================================================
  // Returns: Profile Errors
  // ==========================================================================

  describe('Profile Handling', () => {
    it('R: returns 404 when profile is not found', async () => {
      setupAuthenticatedUser()
      setupServiceClient({
        profile: null,
        profileError: { code: 'PGRST116', message: 'No rows found' },
      })

      const { POST } = await import('@/app/api/job-search/discover/route')
      const response = await POST(createRequest())

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Profile not found')
    })
  })

  // ==========================================================================
  // Asserts: Rate Limiting
  // ==========================================================================

  describe('Rate Limiting', () => {
    it('A: returns 429 when last search was <5 minutes ago', async () => {
      setupAuthenticatedUser()
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
      setupServiceClient({
        preferences: createMockPreferences({ last_search_at: twoMinutesAgo }),
      })

      const { POST } = await import('@/app/api/job-search/discover/route')
      const response = await POST(createRequest())

      expect(response.status).toBe(429)
      const data = await response.json()
      expect(data.error).toContain('Rate limited')
      expect(data.error).toContain('minute')
    })

    it('A: returns 429 with correct wait time (3 minutes remaining)', async () => {
      setupAuthenticatedUser()
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
      setupServiceClient({
        preferences: createMockPreferences({ last_search_at: twoMinutesAgo }),
      })

      const { POST } = await import('@/app/api/job-search/discover/route')
      const response = await POST(createRequest())

      expect(response.status).toBe(429)
      const data = await response.json()
      expect(data.error).toContain('3 minute')
    })

    it('A: allows search when last search was >5 minutes ago', async () => {
      setupAuthenticatedUser()
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      setupServiceClient({
        preferences: createMockPreferences({ last_search_at: tenMinutesAgo }),
      })
      mockDiscoverJobs.mockResolvedValue({
        jobs: [],
        tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        queriesExecuted: 0,
        duplicatesSkipped: 0,
      })

      const { POST } = await import('@/app/api/job-search/discover/route')
      const response = await POST(createRequest())

      expect(response.status).toBe(200)
    })

    it('A: allows search when last_search_at is null (first search)', async () => {
      setupAuthenticatedUser()
      setupServiceClient({
        preferences: createMockPreferences({ last_search_at: null }),
      })
      mockDiscoverJobs.mockResolvedValue({
        jobs: [],
        tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        queriesExecuted: 0,
        duplicatesSkipped: 0,
      })

      const { POST } = await import('@/app/api/job-search/discover/route')
      const response = await POST(createRequest())

      expect(response.status).toBe(200)
    })
  })

  // ==========================================================================
  // Logic: Preferences Creation
  // ==========================================================================

  describe('Preferences Creation', () => {
    it('L: creates default preferences when none exist', async () => {
      setupAuthenticatedUser('new-user-456')

      // First call returns no preferences, second returns created ones
      let prefsCallCount = 0
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: createMockProfile({ id: 'new-user-456' }),
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'job_search_preferences') {
          prefsCallCount++
          if (prefsCallCount === 1) {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: 'PGRST116', message: 'No rows found' },
                  }),
                }),
              }),
            }
          }
          // Insert call
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: createMockPreferences({
                    id: 'new-prefs-789',
                    user_id: 'new-user-456',
                    last_search_at: null,
                  }),
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'job_postings') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      })
      mockCreateServiceClient.mockReturnValue({
        from: mockSupabaseFrom,
      })

      mockDiscoverJobs.mockResolvedValue({
        jobs: [],
        tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        queriesExecuted: 3,
        duplicatesSkipped: 0,
      })

      const { POST } = await import('@/app/api/job-search/discover/route')
      const response = await POST(createRequest())

      expect(response.status).toBe(200)
    })
  })

  // ==========================================================================
  // Logic: Job Discovery and Scoring
  // ==========================================================================

  describe('Job Discovery and Scoring', () => {
    it('L: calls discoverJobs with profile and preferences', async () => {
      setupAuthenticatedUser()
      setupServiceClient()
      mockDiscoverJobs.mockResolvedValue({
        jobs: [],
        tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        queriesExecuted: 3,
        duplicatesSkipped: 0,
      })

      const { POST } = await import('@/app/api/job-search/discover/route')
      await POST(createRequest())

      expect(mockDiscoverJobs).toHaveBeenCalledTimes(1)
      expect(mockDiscoverJobs).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-123' }),
        expect.objectContaining({ user_id: 'user-123' })
      )
    })

    it('L: calls calculateMatchScore for each discovered job', async () => {
      setupAuthenticatedUser()
      setupServiceClient()

      const job1 = createMockDiscoveredJob({ title: 'Job 1' })
      const job2 = createMockDiscoveredJob({ title: 'Job 2' })

      mockDiscoverJobs.mockResolvedValue({
        jobs: [job1, job2],
        tokenUsage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
        queriesExecuted: 3,
        duplicatesSkipped: 0,
      })

      mockCalculateMatchScore.mockReturnValue(createMockMatchResult({ totalScore: 50 }))

      const { POST } = await import('@/app/api/job-search/discover/route')
      await POST(createRequest())

      expect(mockCalculateMatchScore).toHaveBeenCalledTimes(2)
    })

    it('L: filters out jobs with score <65', async () => {
      setupAuthenticatedUser()
      setupServiceClient()

      mockDiscoverJobs.mockResolvedValue({
        jobs: [
          createMockDiscoveredJob({ title: 'Low Score Job' }),
          createMockDiscoveredJob({ title: 'High Score Job' }),
        ],
        tokenUsage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
        queriesExecuted: 3,
        duplicatesSkipped: 0,
      })

      mockCalculateMatchScore
        .mockReturnValueOnce(createMockMatchResult({ totalScore: 50, passesThreshold: false, isBorderline: false }))
        .mockReturnValueOnce(createMockMatchResult({ totalScore: 80, passesThreshold: true, isBorderline: false }))

      const { POST } = await import('@/app/api/job-search/discover/route')
      const response = await POST(createRequest())
      const data = await response.json()

      // Only high score job should be counted
      expect(data.newMatches).toBe(1)
    })

    it('L: counts borderline jobs (65-74) separately', async () => {
      setupAuthenticatedUser()
      setupServiceClient()

      mockDiscoverJobs.mockResolvedValue({
        jobs: [
          createMockDiscoveredJob({ title: 'Borderline Job' }),
          createMockDiscoveredJob({ title: 'High Score Job' }),
        ],
        tokenUsage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
        queriesExecuted: 3,
        duplicatesSkipped: 0,
      })

      mockCalculateMatchScore
        .mockReturnValueOnce(createMockMatchResult({ totalScore: 70, passesThreshold: false, isBorderline: true }))
        .mockReturnValueOnce(createMockMatchResult({ totalScore: 85, passesThreshold: true, isBorderline: false }))

      const { POST } = await import('@/app/api/job-search/discover/route')
      const response = await POST(createRequest())
      const data = await response.json()

      expect(data.newMatches).toBe(1)
      expect(data.borderlineCount).toBe(1)
    })
  })

  // ==========================================================================
  // Returns: Success Response
  // ==========================================================================

  describe('Success Response', () => {
    it('R: returns success with newMatches count', async () => {
      setupAuthenticatedUser()
      setupServiceClient()

      mockDiscoverJobs.mockResolvedValue({
        jobs: [createMockDiscoveredJob()],
        tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        queriesExecuted: 3,
        duplicatesSkipped: 0,
      })

      mockCalculateMatchScore.mockReturnValue(
        createMockMatchResult({ totalScore: 85, passesThreshold: true })
      )

      const { POST } = await import('@/app/api/job-search/discover/route')
      const response = await POST(createRequest())

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.newMatches).toBe(1)
    })

    it('R: returns topScore from highest scoring job', async () => {
      setupAuthenticatedUser()
      setupServiceClient()

      mockDiscoverJobs.mockResolvedValue({
        jobs: [
          createMockDiscoveredJob({ title: 'Job 1' }),
          createMockDiscoveredJob({ title: 'Job 2' }),
          createMockDiscoveredJob({ title: 'Job 3' }),
        ],
        tokenUsage: { promptTokens: 300, completionTokens: 150, totalTokens: 450 },
        queriesExecuted: 3,
        duplicatesSkipped: 0,
      })

      mockCalculateMatchScore
        .mockReturnValueOnce(createMockMatchResult({ totalScore: 75 }))
        .mockReturnValueOnce(createMockMatchResult({ totalScore: 92 }))
        .mockReturnValueOnce(createMockMatchResult({ totalScore: 80 }))

      const { POST } = await import('@/app/api/job-search/discover/route')
      const response = await POST(createRequest())
      const data = await response.json()

      expect(data.topScore).toBe(92)
    })

    it('R: returns 0 for topScore when no jobs qualify', async () => {
      setupAuthenticatedUser()
      setupServiceClient()

      mockDiscoverJobs.mockResolvedValue({
        jobs: [createMockDiscoveredJob()],
        tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        queriesExecuted: 3,
        duplicatesSkipped: 0,
      })

      mockCalculateMatchScore.mockReturnValue(
        createMockMatchResult({ totalScore: 40, passesThreshold: false, isBorderline: false })
      )

      const { POST } = await import('@/app/api/job-search/discover/route')
      const response = await POST(createRequest())
      const data = await response.json()

      expect(data.topScore).toBe(0)
      expect(data.newMatches).toBe(0)
    })

    it('R: returns success even when no jobs discovered', async () => {
      setupAuthenticatedUser()
      setupServiceClient()

      mockDiscoverJobs.mockResolvedValue({
        jobs: [],
        tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        queriesExecuted: 3,
        duplicatesSkipped: 0,
      })

      const { POST } = await import('@/app/api/job-search/discover/route')
      const response = await POST(createRequest())

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.newMatches).toBe(0)
      expect(data.topScore).toBe(0)
    })
  })

  // ==========================================================================
  // Logic: Zero Match Day Tracking
  // ==========================================================================

  describe('Zero Match Day Tracking', () => {
    it('L: resets consecutive_zero_match_days when matches found', async () => {
      setupAuthenticatedUser()

      // Track update calls
      let updateData: Record<string, unknown> | null = null
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: createMockProfile(),
                  error: null,
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
                  data: createMockPreferences({ consecutive_zero_match_days: 5 }),
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockImplementation((data) => {
              updateData = data
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              }
            }),
          }
        }
        if (table === 'job_postings') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      })
      mockCreateServiceClient.mockReturnValue({
        from: mockSupabaseFrom,
      })

      mockDiscoverJobs.mockResolvedValue({
        jobs: [createMockDiscoveredJob()],
        tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        queriesExecuted: 3,
        duplicatesSkipped: 0,
      })
      mockCalculateMatchScore.mockReturnValue(createMockMatchResult({ totalScore: 80 }))

      const { POST } = await import('@/app/api/job-search/discover/route')
      await POST(createRequest())

      expect(updateData).not.toBeNull()
      expect(updateData!.consecutive_zero_match_days).toBe(0)
    })

    it('L: increments consecutive_zero_match_days when no matches', async () => {
      setupAuthenticatedUser()

      let updateData: Record<string, unknown> | null = null
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: createMockProfile(),
                  error: null,
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
                  data: createMockPreferences({ consecutive_zero_match_days: 3 }),
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockImplementation((data) => {
              updateData = data
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              }
            }),
          }
        }
        return {}
      })
      mockCreateServiceClient.mockReturnValue({
        from: mockSupabaseFrom,
      })

      mockDiscoverJobs.mockResolvedValue({
        jobs: [],
        tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        queriesExecuted: 3,
        duplicatesSkipped: 0,
      })

      const { POST } = await import('@/app/api/job-search/discover/route')
      await POST(createRequest())

      expect(updateData).not.toBeNull()
      expect(updateData!.consecutive_zero_match_days).toBe(4)
    })
  })

  // ==========================================================================
  // Handling: Duplicate Jobs
  // ==========================================================================

  describe('Duplicate Handling', () => {
    it('H: skips duplicate jobs (content_hash constraint)', async () => {
      setupAuthenticatedUser()

      let insertCallCount = 0
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: createMockProfile(),
                  error: null,
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
                  data: createMockPreferences(),
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'job_postings') {
          return {
            insert: vi.fn().mockImplementation(() => {
              insertCallCount++
              if (insertCallCount === 1) {
                // First insert succeeds
                return Promise.resolve({ error: null })
              }
              // Second insert fails with unique constraint (duplicate)
              return Promise.resolve({ error: { code: '23505', message: 'Duplicate' } })
            }),
          }
        }
        return {}
      })
      mockCreateServiceClient.mockReturnValue({
        from: mockSupabaseFrom,
      })

      mockDiscoverJobs.mockResolvedValue({
        jobs: [
          createMockDiscoveredJob({ title: 'Job 1' }),
          createMockDiscoveredJob({ title: 'Job 2' }), // Will be duplicate
        ],
        tokenUsage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
        queriesExecuted: 3,
        duplicatesSkipped: 0,
      })

      mockCalculateMatchScore.mockReturnValue(createMockMatchResult({ totalScore: 85 }))

      const { POST } = await import('@/app/api/job-search/discover/route')
      const response = await POST(createRequest())
      const data = await response.json()

      // Only one job should be counted as new match
      expect(data.newMatches).toBe(1)
    })
  })

  // ==========================================================================
  // Handling: Errors
  // ==========================================================================

  describe('Error Handling', () => {
    it('H: returns 500 when discoverJobs throws', async () => {
      setupAuthenticatedUser()
      setupServiceClient()
      mockDiscoverJobs.mockRejectedValue(new Error('Gemini API error'))

      const { POST } = await import('@/app/api/job-search/discover/route')
      const response = await POST(createRequest())

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Gemini API error')
    })

    it('H: continues processing if single job insert fails', async () => {
      setupAuthenticatedUser()

      let insertCallCount = 0
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: createMockProfile(),
                  error: null,
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
                  data: createMockPreferences(),
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'job_postings') {
          return {
            insert: vi.fn().mockImplementation(() => {
              insertCallCount++
              if (insertCallCount === 1) {
                // First insert fails with generic error
                return Promise.resolve({ error: { code: 'OTHER', message: 'DB error' } })
              }
              // Second insert succeeds
              return Promise.resolve({ error: null })
            }),
          }
        }
        return {}
      })
      mockCreateServiceClient.mockReturnValue({
        from: mockSupabaseFrom,
      })

      mockDiscoverJobs.mockResolvedValue({
        jobs: [
          createMockDiscoveredJob({ title: 'Job 1' }),
          createMockDiscoveredJob({ title: 'Job 2' }),
        ],
        tokenUsage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
        queriesExecuted: 3,
        duplicatesSkipped: 0,
      })

      mockCalculateMatchScore.mockReturnValue(createMockMatchResult({ totalScore: 85 }))

      const { POST } = await import('@/app/api/job-search/discover/route')
      const response = await POST(createRequest())

      // Should still succeed, just with fewer matches
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.newMatches).toBe(1) // Only second job succeeded
    })
  })
})
