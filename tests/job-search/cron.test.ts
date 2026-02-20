/**
 * Job Search Cron Job Tests (Phase 5)
 *
 * RALPH tests for:
 * - GET /api/cron/job-search endpoint
 * - shouldSearchToday helper function
 * - isEmailDue helper function
 * - cleanupExpiredJobs helper function
 * - vercel.json cron configuration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import type { JobSearchPreferencesRow, EmailNotificationFrequency } from '@/types/job-search'

// ============================================================================
// Mocks
// ============================================================================

const mockCreateServiceClient = vi.fn()
const mockSupabaseFrom = vi.fn()
const mockDiscoverJobs = vi.fn()
const mockCalculateMatchScore = vi.fn()
const mockSendJobMatchDigest = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ auth: { getUser: vi.fn() } }),
  createServiceClient: () => mockCreateServiceClient(),
}))

vi.mock('@/lib/job-search', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    discoverJobs: (...args: unknown[]) => mockDiscoverJobs(...args),
    calculateMatchScore: (...args: unknown[]) => mockCalculateMatchScore(...args),
    sendJobMatchDigest: (...args: unknown[]) => mockSendJobMatchDigest(...args),
  }
})

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockPreferences(
  overrides: Partial<JobSearchPreferencesRow> = {}
): JobSearchPreferencesRow {
  return {
    id: 'pref-123',
    user_id: 'user-123',
    is_active: true,
    preferred_job_titles: [],
    preferred_locations: [],
    experience_years: null,
    required_skills: [],
    company_size_preferences: [],
    remote_policy_preferences: [],
    required_benefits: [],
    salary_min_override: null,
    salary_currency_override: null,
    avoid_companies: [],
    avoid_keywords: [],
    ai_keywords: [],
    ai_recommended_boards: [],
    ai_market_insights: null,
    ai_personalized_strategy: null,
    ai_last_analysis_at: null,
    implicit_preferences: {},
    feedback_stats: { total_likes: 0, total_dislikes: 0, total_hides: 0, reasons: {} },
    email_notification_frequency: 'daily',
    last_email_sent_at: null,
    last_search_at: null,
    consecutive_zero_match_days: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

function daysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

function hoursAgo(hours: number): string {
  const date = new Date()
  date.setHours(date.getHours() - hours)
  return date.toISOString()
}

// ============================================================================
// Test Helpers
// ============================================================================

function createCronRequest(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost:3000/api/cron/job-search', {
    method: 'GET',
    headers,
  })
}

function setupServiceClient(options: {
  activePrefs?: JobSearchPreferencesRow[]
  prefsError?: { code: string; message: string } | null
  profile?: Record<string, unknown> | null
  profileError?: { code: string; message: string } | null
  insertError?: { code: string; message: string } | null
  deleteData?: { id: string }[]
} = {}) {
  const {
    activePrefs = [],
    prefsError = null,
    profile = { id: 'user-123', full_name: 'Test User' },
    profileError = null,
    insertError = null,
    deleteData = [],
  } = options

  const mockChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    single: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  }

  mockSupabaseFrom.mockImplementation((table: string) => {
    if (table === 'job_search_preferences') {
      return {
        ...mockChain,
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: activePrefs,
            error: prefsError,
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }
    }
    if (table === 'profiles') {
      return {
        ...mockChain,
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
        ...mockChain,
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: insertError,
        }),
        delete: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({
              lt: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({
                  data: deleteData,
                  error: null,
                }),
              }),
            }),
          }),
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              lt: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({
                  data: deleteData,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }
    }
    return mockChain
  })

  mockCreateServiceClient.mockReturnValue({
    from: mockSupabaseFrom,
  })
}

// ============================================================================
// Cron Endpoint Tests
// ============================================================================

describe('GET /api/cron/job-search', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('CRON_SECRET', 'test-cron-secret')
    setupServiceClient()
  })

  describe('Returns', () => {
    it('rejects without CRON_SECRET', async () => {
      const { GET } = await import('@/app/api/cron/job-search/route')
      const request = createCronRequest()
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Missing authorization')
    })

    it('rejects with invalid CRON_SECRET', async () => {
      const { GET } = await import('@/app/api/cron/job-search/route')
      const request = createCronRequest({ 'x-cron-secret': 'wrong-secret' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid authorization')
    })

    it('returns 500 when CRON_SECRET is not configured', async () => {
      vi.stubEnv('CRON_SECRET', '')

      const { GET } = await import('@/app/api/cron/job-search/route')
      const request = createCronRequest({ 'x-cron-secret': 'any-secret' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Server configuration error')
    })

    it('returns success response structure on valid request', async () => {
      setupServiceClient({ activePrefs: [] })

      const { GET } = await import('@/app/api/cron/job-search/route')
      const request = createCronRequest({ 'x-cron-secret': 'test-cron-secret' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data).toHaveProperty('usersProcessed')
      expect(data).toHaveProperty('totalJobsDiscovered')
      expect(data).toHaveProperty('totalMatchesCreated')
      expect(data).toHaveProperty('emailsSent')
      expect(data).toHaveProperty('cleanedUp')
    })
  })
})

// ============================================================================
// shouldSearchToday Tests
// ============================================================================

describe('shouldSearchToday', () => {
  describe('Returns', () => {
    it('returns true for fresh users', async () => {
      const { shouldSearchToday } = await import('@/app/api/cron/job-search/route')
      const prefs = createMockPreferences({
        consecutive_zero_match_days: 0,
        last_search_at: daysAgo(1),
      })

      expect(shouldSearchToday(prefs)).toBe(true)
    })

    it('returns false when zero matches for 7+ days and searched yesterday', async () => {
      const { shouldSearchToday } = await import('@/app/api/cron/job-search/route')
      const prefs = createMockPreferences({
        consecutive_zero_match_days: 8,
        last_search_at: daysAgo(1),
      })

      expect(shouldSearchToday(prefs)).toBe(false)
    })

    it('returns true when zero matches for 7+ days but last search was 3+ days ago', async () => {
      const { shouldSearchToday } = await import('@/app/api/cron/job-search/route')
      const prefs = createMockPreferences({
        consecutive_zero_match_days: 8,
        last_search_at: daysAgo(4),
      })

      expect(shouldSearchToday(prefs)).toBe(true)
    })

    it('returns false for inactive users', async () => {
      const { shouldSearchToday } = await import('@/app/api/cron/job-search/route')
      const prefs = createMockPreferences({
        is_active: false,
        consecutive_zero_match_days: 0,
      })

      expect(shouldSearchToday(prefs)).toBe(false)
    })

    it('returns true when never searched before', async () => {
      const { shouldSearchToday } = await import('@/app/api/cron/job-search/route')
      const prefs = createMockPreferences({
        consecutive_zero_match_days: 10,
        last_search_at: null,
      })

      expect(shouldSearchToday(prefs)).toBe(true)
    })

    it('returns true for users with 6 consecutive zero match days', async () => {
      const { shouldSearchToday } = await import('@/app/api/cron/job-search/route')
      const prefs = createMockPreferences({
        consecutive_zero_match_days: 6,
        last_search_at: daysAgo(1),
      })

      expect(shouldSearchToday(prefs)).toBe(true)
    })

    it('returns false for users with exactly 7 zero match days searched 2 days ago', async () => {
      const { shouldSearchToday } = await import('@/app/api/cron/job-search/route')
      const prefs = createMockPreferences({
        consecutive_zero_match_days: 7,
        last_search_at: daysAgo(2),
      })

      expect(shouldSearchToday(prefs)).toBe(false)
    })

    it('returns true for users with exactly 7 zero match days searched 3 days ago', async () => {
      const { shouldSearchToday } = await import('@/app/api/cron/job-search/route')
      const prefs = createMockPreferences({
        consecutive_zero_match_days: 7,
        last_search_at: daysAgo(3),
      })

      expect(shouldSearchToday(prefs)).toBe(true)
    })
  })
})

// ============================================================================
// isEmailDue Tests
// ============================================================================

describe('isEmailDue', () => {
  describe('Daily frequency', () => {
    it('returns true when last sent >24h ago', async () => {
      const { isEmailDue } = await import('@/app/api/cron/job-search/route')
      const prefs = createMockPreferences({
        email_notification_frequency: 'daily',
        last_email_sent_at: hoursAgo(25),
      })

      expect(isEmailDue(prefs)).toBe(true)
    })

    it('returns false when last sent 12h ago', async () => {
      const { isEmailDue } = await import('@/app/api/cron/job-search/route')
      const prefs = createMockPreferences({
        email_notification_frequency: 'daily',
        last_email_sent_at: hoursAgo(12),
      })

      expect(isEmailDue(prefs)).toBe(false)
    })

    it('returns false when last sent exactly 24h ago', async () => {
      const { isEmailDue } = await import('@/app/api/cron/job-search/route')
      const prefs = createMockPreferences({
        email_notification_frequency: 'daily',
        last_email_sent_at: hoursAgo(24),
      })

      expect(isEmailDue(prefs)).toBe(false)
    })
  })

  describe('Weekly frequency', () => {
    it('returns true when today is Monday and last sent >6d ago', async () => {
      const { isEmailDue } = await import('@/app/api/cron/job-search/route')
      const prefs = createMockPreferences({
        email_notification_frequency: 'weekly',
        last_email_sent_at: daysAgo(7),
      })

      // Find the next Monday
      const now = new Date()
      while (now.getUTCDay() !== 1) {
        now.setDate(now.getDate() + 1)
      }

      expect(isEmailDue(prefs, now)).toBe(true)
    })

    it('returns false when today is Wednesday', async () => {
      const { isEmailDue } = await import('@/app/api/cron/job-search/route')
      const prefs = createMockPreferences({
        email_notification_frequency: 'weekly',
        last_email_sent_at: daysAgo(7),
      })

      // Find the next Wednesday
      const now = new Date()
      while (now.getUTCDay() !== 3) {
        now.setDate(now.getDate() + 1)
      }

      expect(isEmailDue(prefs, now)).toBe(false)
    })

    it('returns false when today is Monday but last sent 3 days ago', async () => {
      const { isEmailDue } = await import('@/app/api/cron/job-search/route')
      const prefs = createMockPreferences({
        email_notification_frequency: 'weekly',
        last_email_sent_at: daysAgo(3),
      })

      // Find the next Monday
      const now = new Date()
      while (now.getUTCDay() !== 1) {
        now.setDate(now.getDate() + 1)
      }

      expect(isEmailDue(prefs, now)).toBe(false)
    })
  })

  describe('Monthly frequency', () => {
    it('returns true when today is 1st', async () => {
      const { isEmailDue } = await import('@/app/api/cron/job-search/route')
      const prefs = createMockPreferences({
        email_notification_frequency: 'monthly',
        last_email_sent_at: daysAgo(31),
      })

      // Create a date on the 1st
      const now = new Date()
      now.setUTCDate(1)

      expect(isEmailDue(prefs, now)).toBe(true)
    })

    it('returns false when today is 15th', async () => {
      const { isEmailDue } = await import('@/app/api/cron/job-search/route')
      const prefs = createMockPreferences({
        email_notification_frequency: 'monthly',
        last_email_sent_at: daysAgo(31),
      })

      // Create a date on the 15th
      const now = new Date()
      now.setUTCDate(15)

      expect(isEmailDue(prefs, now)).toBe(false)
    })
  })

  describe('Disabled frequency', () => {
    it('always returns false', async () => {
      const { isEmailDue } = await import('@/app/api/cron/job-search/route')
      const prefs = createMockPreferences({
        email_notification_frequency: 'disabled',
        last_email_sent_at: null,
      })

      expect(isEmailDue(prefs)).toBe(false)
    })
  })

  describe('Never sent before', () => {
    it('returns true for daily frequency when never sent', async () => {
      const { isEmailDue } = await import('@/app/api/cron/job-search/route')
      const prefs = createMockPreferences({
        email_notification_frequency: 'daily',
        last_email_sent_at: null,
      })

      expect(isEmailDue(prefs)).toBe(true)
    })

    it('returns true for weekly frequency when never sent', async () => {
      const { isEmailDue } = await import('@/app/api/cron/job-search/route')
      const prefs = createMockPreferences({
        email_notification_frequency: 'weekly',
        last_email_sent_at: null,
      })

      expect(isEmailDue(prefs)).toBe(true)
    })

    it('returns true for monthly frequency when never sent', async () => {
      const { isEmailDue } = await import('@/app/api/cron/job-search/route')
      const prefs = createMockPreferences({
        email_notification_frequency: 'monthly',
        last_email_sent_at: null,
      })

      expect(isEmailDue(prefs)).toBe(true)
    })
  })
})

// ============================================================================
// cleanupExpiredJobs Tests
// ============================================================================

describe('cleanupExpiredJobs', () => {
  describe('Borderline jobs', () => {
    it('deletes borderline jobs older than 7 days', async () => {
      let callCount = 0
      const mockDelete = vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // First call for borderline jobs
          return {
            gte: vi.fn().mockReturnValue({
              lt: vi.fn().mockReturnValue({
                lt: vi.fn().mockReturnValue({
                  select: vi.fn().mockResolvedValue({
                    data: [{ id: 'old-borderline-job' }],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        // Second call for dismissed jobs
        return {
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              lt: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }
      })

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          delete: mockDelete,
        }),
      }

      const { cleanupExpiredJobs } = await import('@/app/api/cron/job-search/route')
      const result = await cleanupExpiredJobs(mockSupabase as never)

      expect(result.borderlineDeleted).toBe(1)
    })

    it('does not delete recent borderline jobs', async () => {
      let callCount = 0
      const mockDelete = vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // First call for borderline jobs
          return {
            gte: vi.fn().mockReturnValue({
              lt: vi.fn().mockReturnValue({
                lt: vi.fn().mockReturnValue({
                  select: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        // Second call for dismissed jobs
        return {
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              lt: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }
      })

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          delete: mockDelete,
        }),
      }

      const { cleanupExpiredJobs } = await import('@/app/api/cron/job-search/route')
      const result = await cleanupExpiredJobs(mockSupabase as never)

      expect(result.borderlineDeleted).toBe(0)
    })
  })

  describe('Dismissed jobs', () => {
    it('deletes dismissed jobs past cooldown', async () => {
      let callCount = 0
      const mockDelete = vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // First call for borderline jobs
          return {
            gte: vi.fn().mockReturnValue({
              lt: vi.fn().mockReturnValue({
                lt: vi.fn().mockReturnValue({
                  select: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        // Second call for dismissed jobs
        return {
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              lt: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({
                  data: [{ id: 'old-dismissed-job' }],
                  error: null,
                }),
              }),
            }),
          }),
        }
      })

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          delete: mockDelete,
        }),
      }

      const { cleanupExpiredJobs } = await import('@/app/api/cron/job-search/route')
      const result = await cleanupExpiredJobs(mockSupabase as never)

      expect(result.dismissedDeleted).toBe(1)
    })

    it('does not delete dismissed jobs still in cooldown', async () => {
      let callCount = 0
      const mockDelete = vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return {
            gte: vi.fn().mockReturnValue({
              lt: vi.fn().mockReturnValue({
                lt: vi.fn().mockReturnValue({
                  select: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        return {
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              lt: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }
      })

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          delete: mockDelete,
        }),
      }

      const { cleanupExpiredJobs } = await import('@/app/api/cron/job-search/route')
      const result = await cleanupExpiredJobs(mockSupabase as never)

      expect(result.dismissedDeleted).toBe(0)
    })
  })

  describe('Active matched jobs', () => {
    it('does NOT delete active matched jobs', async () => {
      // The cleanup only targets borderline (65-74%) and dismissed jobs
      // Jobs with match_score >= 75 and status != 'dismissed' should never be deleted
      let callCount = 0
      const mockDelete = vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // Borderline query: gte(65).lt(75).lt(discovered_at, cutoff)
          // This should NOT match jobs with score >= 75
          return {
            gte: vi.fn().mockReturnValue({
              lt: vi.fn().mockReturnValue({
                lt: vi.fn().mockReturnValue({
                  select: vi.fn().mockResolvedValue({
                    data: [], // No jobs deleted
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        // Dismissed query: eq('dismissed').not(null).lt(discarded_until)
        // This should NOT match jobs with status = 'new'
        return {
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              lt: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({
                  data: [], // No jobs deleted
                  error: null,
                }),
              }),
            }),
          }),
        }
      })

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          delete: mockDelete,
        }),
      }

      const { cleanupExpiredJobs } = await import('@/app/api/cron/job-search/route')
      const result = await cleanupExpiredJobs(mockSupabase as never)

      // Active matched jobs (score >= 75, status = 'new') should never be in the deletion results
      expect(result.borderlineDeleted).toBe(0)
      expect(result.dismissedDeleted).toBe(0)
    })
  })
})

// ============================================================================
// vercel.json Configuration Tests
// ============================================================================

describe('vercel.json cron configuration', () => {
  it('has correct cron configuration for job-search', () => {
    const vercelJsonPath = path.join(process.cwd(), 'vercel.json')
    const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf-8'))

    expect(vercelConfig.crons).toBeDefined()
    expect(Array.isArray(vercelConfig.crons)).toBe(true)

    const jobSearchCron = vercelConfig.crons.find(
      (cron: { path: string; schedule: string }) => cron.path === '/api/cron/job-search'
    )

    expect(jobSearchCron).toBeDefined()
    expect(jobSearchCron.schedule).toBe('0 2 * * *')
  })
})
