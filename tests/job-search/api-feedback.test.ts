/**
 * Job Feedback API Route Tests (Phase 4.3)
 *
 * RALPH tests for POST /api/job-search/feedback endpoint.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import type {
  FeedbackReason,
  ImplicitPreferences,
  PreferencesFeedbackStats,
} from '@/types/job-search'

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

function createMockJobPosting(overrides = {}) {
  return {
    id: 'job-123',
    user_id: 'user-123',
    company_name: 'TechCorp',
    location: 'San Francisco, CA',
    ...overrides,
  }
}

function createMockPreferences(overrides: {
  implicit_preferences?: ImplicitPreferences
  feedback_stats?: PreferencesFeedbackStats
  avoid_companies?: string[]
} = {}) {
  return {
    implicit_preferences: overrides.implicit_preferences || {},
    feedback_stats: overrides.feedback_stats || {
      total_likes: 0,
      total_dislikes: 0,
      total_hides: 0,
      reasons: {},
    },
    avoid_companies: overrides.avoid_companies || [],
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
  job?: ReturnType<typeof createMockJobPosting> | null
  jobError?: { code: string; message: string } | null
  prefs?: ReturnType<typeof createMockPreferences> | null
  prefsError?: { code: string; message: string } | null
  updateJobError?: { code: string; message: string } | null
  updatePrefsError?: { code: string; message: string } | null
  captureJobUpdate?: (data: Record<string, unknown>) => void
  capturePrefsUpdate?: (data: Record<string, unknown>) => void
} = {}) {
  const {
    job = createMockJobPosting(),
    jobError = null,
    prefs = createMockPreferences(),
    prefsError = null,
    updateJobError = null,
    updatePrefsError = null,
    captureJobUpdate,
    capturePrefsUpdate,
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
            eq: vi.fn().mockResolvedValue({ error: updateJobError }),
          }
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
        update: vi.fn().mockImplementation((data: Record<string, unknown>) => {
          if (capturePrefsUpdate) capturePrefsUpdate(data)
          return {
            eq: vi.fn().mockResolvedValue({ error: updatePrefsError }),
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
  return new NextRequest('http://localhost/api/job-search/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ============================================================================
// Tests
// ============================================================================

describe('POST /api/job-search/feedback', () => {
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

      const { POST } = await import('@/app/api/job-search/feedback/route')
      const response = await POST(
        createRequest({ jobPostingId: 'job-123', feedback: 'like' })
      )

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
    it('A: returns 400 for invalid JSON body', async () => {
      setupAuthenticatedUser()
      setupServiceClient()

      const { POST } = await import('@/app/api/job-search/feedback/route')
      const request = new NextRequest('http://localhost/api/job-search/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json',
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid JSON')
    })

    it('A: returns 400 for missing jobPostingId', async () => {
      setupAuthenticatedUser()
      setupServiceClient()

      const { POST } = await import('@/app/api/job-search/feedback/route')
      const response = await POST(createRequest({ feedback: 'like' }))

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Validation error')
    })

    it('A: returns 400 for invalid jobPostingId (not UUID)', async () => {
      setupAuthenticatedUser()
      setupServiceClient()

      const { POST } = await import('@/app/api/job-search/feedback/route')
      const response = await POST(
        createRequest({ jobPostingId: 'not-a-uuid', feedback: 'like' })
      )

      expect(response.status).toBe(400)
    })

    it('A: returns 400 for missing feedback', async () => {
      setupAuthenticatedUser()
      setupServiceClient()

      const { POST } = await import('@/app/api/job-search/feedback/route')
      const response = await POST(
        createRequest({ jobPostingId: '550e8400-e29b-41d4-a716-446655440000' })
      )

      expect(response.status).toBe(400)
    })

    it('A: returns 400 for invalid feedback value', async () => {
      setupAuthenticatedUser()
      setupServiceClient()

      const { POST } = await import('@/app/api/job-search/feedback/route')
      const response = await POST(
        createRequest({
          jobPostingId: '550e8400-e29b-41d4-a716-446655440000',
          feedback: 'invalid',
        })
      )

      expect(response.status).toBe(400)
    })

    it('A: returns 400 for invalid reason value', async () => {
      setupAuthenticatedUser()
      setupServiceClient()

      const { POST } = await import('@/app/api/job-search/feedback/route')
      const response = await POST(
        createRequest({
          jobPostingId: '550e8400-e29b-41d4-a716-446655440000',
          feedback: 'dislike',
          reason: 'Invalid reason',
        })
      )

      expect(response.status).toBe(400)
    })

    it('A: accepts valid reason values', async () => {
      setupAuthenticatedUser()
      setupServiceClient({
        job: createMockJobPosting({ id: '550e8400-e29b-41d4-a716-446655440000' }),
      })

      const { POST } = await import('@/app/api/job-search/feedback/route')
      const response = await POST(
        createRequest({
          jobPostingId: '550e8400-e29b-41d4-a716-446655440000',
          feedback: 'dislike',
          reason: 'Salary too low',
        })
      )

      expect(response.status).toBe(200)
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

      const { POST } = await import('@/app/api/job-search/feedback/route')
      const response = await POST(
        createRequest({
          jobPostingId: '550e8400-e29b-41d4-a716-446655440000',
          feedback: 'like',
        })
      )

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toContain('not found')
    })

    it('A: returns 403 when job belongs to different user', async () => {
      setupAuthenticatedUser('user-123')
      setupServiceClient({
        job: createMockJobPosting({
          id: '550e8400-e29b-41d4-a716-446655440000',
          user_id: 'different-user',
        }),
      })

      const { POST } = await import('@/app/api/job-search/feedback/route')
      const response = await POST(
        createRequest({
          jobPostingId: '550e8400-e29b-41d4-a716-446655440000',
          feedback: 'like',
        })
      )

      expect(response.status).toBe(403)
    })
  })

  // ==========================================================================
  // Logic: Like Feedback
  // ==========================================================================

  describe('Like Feedback', () => {
    it('L: sets status to "liked" and user_feedback to "like"', async () => {
      setupAuthenticatedUser()
      let capturedUpdate: Record<string, unknown> | null = null
      setupServiceClient({
        job: createMockJobPosting({ id: '550e8400-e29b-41d4-a716-446655440000' }),
        captureJobUpdate: (data) => {
          capturedUpdate = data
        },
      })

      const { POST } = await import('@/app/api/job-search/feedback/route')
      await POST(
        createRequest({
          jobPostingId: '550e8400-e29b-41d4-a716-446655440000',
          feedback: 'like',
        })
      )

      expect(capturedUpdate).not.toBeNull()
      expect(capturedUpdate!.status).toBe('liked')
      expect(capturedUpdate!.user_feedback).toBe('like')
      expect(capturedUpdate!.discarded_until).toBeNull()
    })

    it('L: increments total_likes in feedback_stats', async () => {
      setupAuthenticatedUser()
      let capturedPrefsUpdate: Record<string, unknown> | null = null
      setupServiceClient({
        job: createMockJobPosting({ id: '550e8400-e29b-41d4-a716-446655440000' }),
        prefs: createMockPreferences({
          feedback_stats: { total_likes: 5, total_dislikes: 2, total_hides: 1, reasons: {} },
        }),
        capturePrefsUpdate: (data) => {
          capturedPrefsUpdate = data
        },
      })

      const { POST } = await import('@/app/api/job-search/feedback/route')
      await POST(
        createRequest({
          jobPostingId: '550e8400-e29b-41d4-a716-446655440000',
          feedback: 'like',
        })
      )

      expect(capturedPrefsUpdate).not.toBeNull()
      const stats = capturedPrefsUpdate!.feedback_stats as PreferencesFeedbackStats
      expect(stats.total_likes).toBe(6)
    })
  })

  // ==========================================================================
  // Logic: Dislike Feedback
  // ==========================================================================

  describe('Dislike Feedback', () => {
    it('L: sets status to "dismissed" and user_feedback to "dislike"', async () => {
      setupAuthenticatedUser()
      let capturedUpdate: Record<string, unknown> | null = null
      setupServiceClient({
        job: createMockJobPosting({ id: '550e8400-e29b-41d4-a716-446655440000' }),
        captureJobUpdate: (data) => {
          capturedUpdate = data
        },
      })

      const { POST } = await import('@/app/api/job-search/feedback/route')
      await POST(
        createRequest({
          jobPostingId: '550e8400-e29b-41d4-a716-446655440000',
          feedback: 'dislike',
          reason: 'Skills mismatch',
        })
      )

      expect(capturedUpdate).not.toBeNull()
      expect(capturedUpdate!.status).toBe('dismissed')
      expect(capturedUpdate!.user_feedback).toBe('dislike')
      expect(capturedUpdate!.feedback_reason).toBe('Skills mismatch')
    })

    it('L: sets discarded_until to 30 days in future', async () => {
      setupAuthenticatedUser()
      let capturedUpdate: Record<string, unknown> | null = null
      setupServiceClient({
        job: createMockJobPosting({ id: '550e8400-e29b-41d4-a716-446655440000' }),
        captureJobUpdate: (data) => {
          capturedUpdate = data
        },
      })

      const beforeTime = new Date()
      const { POST } = await import('@/app/api/job-search/feedback/route')
      await POST(
        createRequest({
          jobPostingId: '550e8400-e29b-41d4-a716-446655440000',
          feedback: 'dislike',
        })
      )

      expect(capturedUpdate).not.toBeNull()
      const discardedUntil = new Date(capturedUpdate!.discarded_until as string)
      const expectedMin = new Date(beforeTime.getTime() + 29 * 24 * 60 * 60 * 1000)
      const expectedMax = new Date(beforeTime.getTime() + 31 * 24 * 60 * 60 * 1000)
      expect(discardedUntil.getTime()).toBeGreaterThan(expectedMin.getTime())
      expect(discardedUntil.getTime()).toBeLessThan(expectedMax.getTime())
    })

    it('L: increments total_dislikes in feedback_stats', async () => {
      setupAuthenticatedUser()
      let capturedPrefsUpdate: Record<string, unknown> | null = null
      setupServiceClient({
        job: createMockJobPosting({ id: '550e8400-e29b-41d4-a716-446655440000' }),
        prefs: createMockPreferences({
          feedback_stats: { total_likes: 5, total_dislikes: 2, total_hides: 1, reasons: {} },
        }),
        capturePrefsUpdate: (data) => {
          capturedPrefsUpdate = data
        },
      })

      const { POST } = await import('@/app/api/job-search/feedback/route')
      await POST(
        createRequest({
          jobPostingId: '550e8400-e29b-41d4-a716-446655440000',
          feedback: 'dislike',
        })
      )

      const stats = capturedPrefsUpdate!.feedback_stats as PreferencesFeedbackStats
      expect(stats.total_dislikes).toBe(3)
    })

    it('L: tracks reason in feedback_stats.reasons', async () => {
      setupAuthenticatedUser()
      let capturedPrefsUpdate: Record<string, unknown> | null = null
      setupServiceClient({
        job: createMockJobPosting({ id: '550e8400-e29b-41d4-a716-446655440000' }),
        prefs: createMockPreferences({
          feedback_stats: {
            total_likes: 0,
            total_dislikes: 1,
            total_hides: 0,
            reasons: { 'Salary too low': 1 },
          },
        }),
        capturePrefsUpdate: (data) => {
          capturedPrefsUpdate = data
        },
      })

      const { POST } = await import('@/app/api/job-search/feedback/route')
      await POST(
        createRequest({
          jobPostingId: '550e8400-e29b-41d4-a716-446655440000',
          feedback: 'dislike',
          reason: 'Salary too low',
        })
      )

      const stats = capturedPrefsUpdate!.feedback_stats as PreferencesFeedbackStats
      expect(stats.reasons['Salary too low']).toBe(2)
    })
  })

  // ==========================================================================
  // Logic: Hide Feedback
  // ==========================================================================

  describe('Hide Feedback', () => {
    it('L: sets status to "dismissed" and user_feedback to "hide"', async () => {
      setupAuthenticatedUser()
      let capturedUpdate: Record<string, unknown> | null = null
      setupServiceClient({
        job: createMockJobPosting({ id: '550e8400-e29b-41d4-a716-446655440000' }),
        captureJobUpdate: (data) => {
          capturedUpdate = data
        },
      })

      const { POST } = await import('@/app/api/job-search/feedback/route')
      await POST(
        createRequest({
          jobPostingId: '550e8400-e29b-41d4-a716-446655440000',
          feedback: 'hide',
        })
      )

      expect(capturedUpdate!.status).toBe('dismissed')
      expect(capturedUpdate!.user_feedback).toBe('hide')
      expect(capturedUpdate!.feedback_reason).toBeNull()
    })

    it('L: sets discarded_until to 30 days in future', async () => {
      setupAuthenticatedUser()
      let capturedUpdate: Record<string, unknown> | null = null
      setupServiceClient({
        job: createMockJobPosting({ id: '550e8400-e29b-41d4-a716-446655440000' }),
        captureJobUpdate: (data) => {
          capturedUpdate = data
        },
      })

      const { POST } = await import('@/app/api/job-search/feedback/route')
      await POST(
        createRequest({
          jobPostingId: '550e8400-e29b-41d4-a716-446655440000',
          feedback: 'hide',
        })
      )

      expect(capturedUpdate!.discarded_until).toBeDefined()
      expect(capturedUpdate!.discarded_until).not.toBeNull()
    })

    it('L: increments total_hides in feedback_stats', async () => {
      setupAuthenticatedUser()
      let capturedPrefsUpdate: Record<string, unknown> | null = null
      setupServiceClient({
        job: createMockJobPosting({ id: '550e8400-e29b-41d4-a716-446655440000' }),
        prefs: createMockPreferences({
          feedback_stats: { total_likes: 5, total_dislikes: 2, total_hides: 3, reasons: {} },
        }),
        capturePrefsUpdate: (data) => {
          capturedPrefsUpdate = data
        },
      })

      const { POST } = await import('@/app/api/job-search/feedback/route')
      await POST(
        createRequest({
          jobPostingId: '550e8400-e29b-41d4-a716-446655440000',
          feedback: 'hide',
        })
      )

      const stats = capturedPrefsUpdate!.feedback_stats as PreferencesFeedbackStats
      expect(stats.total_hides).toBe(4)
    })
  })

  // ==========================================================================
  // Logic: Adaptive Learning
  // ==========================================================================

  describe('Adaptive Learning', () => {
    it('L: increases salary_adjustment by 10% for "Salary too low"', async () => {
      setupAuthenticatedUser()
      let capturedPrefsUpdate: Record<string, unknown> | null = null
      setupServiceClient({
        job: createMockJobPosting({ id: '550e8400-e29b-41d4-a716-446655440000' }),
        prefs: createMockPreferences({
          implicit_preferences: { salary_adjustment: 10 },
        }),
        capturePrefsUpdate: (data) => {
          capturedPrefsUpdate = data
        },
      })

      const { POST } = await import('@/app/api/job-search/feedback/route')
      await POST(
        createRequest({
          jobPostingId: '550e8400-e29b-41d4-a716-446655440000',
          feedback: 'dislike',
          reason: 'Salary too low',
        })
      )

      const implicit = capturedPrefsUpdate!.implicit_preferences as ImplicitPreferences
      expect(implicit.salary_adjustment).toBe(20)
    })

    it('L: caps salary_adjustment at 50%', async () => {
      setupAuthenticatedUser()
      let capturedPrefsUpdate: Record<string, unknown> | null = null
      setupServiceClient({
        job: createMockJobPosting({ id: '550e8400-e29b-41d4-a716-446655440000' }),
        prefs: createMockPreferences({
          implicit_preferences: { salary_adjustment: 45 },
        }),
        capturePrefsUpdate: (data) => {
          capturedPrefsUpdate = data
        },
      })

      const { POST } = await import('@/app/api/job-search/feedback/route')
      await POST(
        createRequest({
          jobPostingId: '550e8400-e29b-41d4-a716-446655440000',
          feedback: 'dislike',
          reason: 'Salary too low',
        })
      )

      const implicit = capturedPrefsUpdate!.implicit_preferences as ImplicitPreferences
      expect(implicit.salary_adjustment).toBe(50)
    })

    it('L: starts salary_adjustment from 0 if not set', async () => {
      setupAuthenticatedUser()
      let capturedPrefsUpdate: Record<string, unknown> | null = null
      setupServiceClient({
        job: createMockJobPosting({ id: '550e8400-e29b-41d4-a716-446655440000' }),
        prefs: createMockPreferences({
          implicit_preferences: {},
        }),
        capturePrefsUpdate: (data) => {
          capturedPrefsUpdate = data
        },
      })

      const { POST } = await import('@/app/api/job-search/feedback/route')
      await POST(
        createRequest({
          jobPostingId: '550e8400-e29b-41d4-a716-446655440000',
          feedback: 'dislike',
          reason: 'Salary too low',
        })
      )

      const implicit = capturedPrefsUpdate!.implicit_preferences as ImplicitPreferences
      expect(implicit.salary_adjustment).toBe(10)
    })

    it('L: adds company to avoid_companies for "Not interested in company"', async () => {
      setupAuthenticatedUser()
      let capturedPrefsUpdate: Record<string, unknown> | null = null
      setupServiceClient({
        job: createMockJobPosting({
          id: '550e8400-e29b-41d4-a716-446655440000',
          company_name: 'BadCorp',
        }),
        prefs: createMockPreferences({
          avoid_companies: ['OtherBadCorp'],
        }),
        capturePrefsUpdate: (data) => {
          capturedPrefsUpdate = data
        },
      })

      const { POST } = await import('@/app/api/job-search/feedback/route')
      await POST(
        createRequest({
          jobPostingId: '550e8400-e29b-41d4-a716-446655440000',
          feedback: 'dislike',
          reason: 'Not interested in company',
        })
      )

      expect(capturedPrefsUpdate!.avoid_companies).toContain('BadCorp')
      expect(capturedPrefsUpdate!.avoid_companies).toContain('OtherBadCorp')
    })

    it('L: does not duplicate company in avoid_companies', async () => {
      setupAuthenticatedUser()
      let capturedPrefsUpdate: Record<string, unknown> | null = null
      setupServiceClient({
        job: createMockJobPosting({
          id: '550e8400-e29b-41d4-a716-446655440000',
          company_name: 'BadCorp',
        }),
        prefs: createMockPreferences({
          avoid_companies: ['BadCorp'],
        }),
        capturePrefsUpdate: (data) => {
          capturedPrefsUpdate = data
        },
      })

      const { POST } = await import('@/app/api/job-search/feedback/route')
      await POST(
        createRequest({
          jobPostingId: '550e8400-e29b-41d4-a716-446655440000',
          feedback: 'dislike',
          reason: 'Not interested in company',
        })
      )

      // avoid_companies should not be updated since company already in list
      expect(capturedPrefsUpdate!.avoid_companies).toBeUndefined()
    })
  })

  // ==========================================================================
  // Handling: Errors
  // ==========================================================================

  describe('Error Handling', () => {
    it('H: returns 500 when job update fails', async () => {
      setupAuthenticatedUser()
      setupServiceClient({
        job: createMockJobPosting({ id: '550e8400-e29b-41d4-a716-446655440000' }),
        updateJobError: { code: 'DB_ERROR', message: 'Update failed' },
      })

      const { POST } = await import('@/app/api/job-search/feedback/route')
      const response = await POST(
        createRequest({
          jobPostingId: '550e8400-e29b-41d4-a716-446655440000',
          feedback: 'like',
        })
      )

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toContain('Failed to update')
    })

    it('H: succeeds even when preferences update fails', async () => {
      setupAuthenticatedUser()
      setupServiceClient({
        job: createMockJobPosting({ id: '550e8400-e29b-41d4-a716-446655440000' }),
        updatePrefsError: { code: 'DB_ERROR', message: 'Prefs update failed' },
      })

      const { POST } = await import('@/app/api/job-search/feedback/route')
      const response = await POST(
        createRequest({
          jobPostingId: '550e8400-e29b-41d4-a716-446655440000',
          feedback: 'like',
        })
      )

      // Should still succeed - job feedback was recorded
      expect(response.status).toBe(200)
    })

    it('H: succeeds when no preferences exist', async () => {
      setupAuthenticatedUser()
      setupServiceClient({
        job: createMockJobPosting({ id: '550e8400-e29b-41d4-a716-446655440000' }),
        prefs: null,
        prefsError: { code: 'PGRST116', message: 'No rows found' },
      })

      const { POST } = await import('@/app/api/job-search/feedback/route')
      const response = await POST(
        createRequest({
          jobPostingId: '550e8400-e29b-41d4-a716-446655440000',
          feedback: 'like',
        })
      )

      expect(response.status).toBe(200)
    })

    it('H: handles unexpected errors gracefully', async () => {
      setupAuthenticatedUser()
      mockCreateServiceClient.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const { POST } = await import('@/app/api/job-search/feedback/route')
      const response = await POST(
        createRequest({
          jobPostingId: '550e8400-e29b-41d4-a716-446655440000',
          feedback: 'like',
        })
      )

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Unexpected error')
    })
  })

  // ==========================================================================
  // Returns: Success Response
  // ==========================================================================

  describe('Success Response', () => {
    it('R: returns success true on valid feedback', async () => {
      setupAuthenticatedUser()
      setupServiceClient({
        job: createMockJobPosting({ id: '550e8400-e29b-41d4-a716-446655440000' }),
      })

      const { POST } = await import('@/app/api/job-search/feedback/route')
      const response = await POST(
        createRequest({
          jobPostingId: '550e8400-e29b-41d4-a716-446655440000',
          feedback: 'like',
        })
      )

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })
  })
})
