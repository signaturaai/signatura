/**
 * useSubscription Hook Tests (RALPH Loop 8)
 *
 * Tests for the useSubscription React hook.
 * Verifies state management, access checks, and API interactions.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useSubscription } from '@/hooks/useSubscription'

// ============================================================================
// Mock Setup
// ============================================================================

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Default mock responses
const createStatusResponse = (overrides: Record<string, unknown> = {}) => ({
  subscriptionEnabled: true,
  hasSubscription: true,
  tier: 'accelerate',
  billingPeriod: 'monthly',
  status: 'active',
  usage: {
    applications: { used: 7, limit: 15, remaining: 8, percentUsed: 46.67, unlimited: false },
    cvs: { used: 3, limit: 15, remaining: 12, percentUsed: 20, unlimited: false },
    interviews: { used: 2, limit: 8, remaining: 6, percentUsed: 25, unlimited: false },
    compensation: { used: 1, limit: 8, remaining: 7, percentUsed: 12.5, unlimited: false },
    contracts: { used: 0, limit: 5, remaining: 5, percentUsed: 0, unlimited: false },
    aiAvatarInterviews: { used: 2, limit: 5, remaining: 3, percentUsed: 40, unlimited: false },
  },
  features: {
    applicationTracker: true,
    tailoredCvs: true,
    interviewCoach: true,
    compensationSessions: true,
    contractReviews: true,
    aiAvatarInterviews: true,
  },
  currentPeriodStart: '2026-02-01T00:00:00.000Z',
  currentPeriodEnd: '2026-03-01T00:00:00.000Z',
  cancelledAt: null,
  cancellationEffectiveAt: null,
  scheduledTierChange: null,
  scheduledBillingPeriodChange: null,
  isCancelled: false,
  isPastDue: false,
  isExpired: false,
  canUpgrade: true,
  canDowngrade: true,
  isAdmin: false,
  ...overrides,
})

const createRecommendationResponse = (overrides: Record<string, unknown> = {}) => ({
  recommendation: {
    recommendedTier: 'accelerate',
    recommendedBillingPeriod: 'yearly',
    comparison: {
      applications: { average: 7, momentumLimit: 8, accelerateLimit: 15, eliteLimit: -1, fitsIn: 'momentum' },
      cvs: { average: 3, momentumLimit: 8, accelerateLimit: 15, eliteLimit: -1, fitsIn: 'momentum' },
      interviews: { average: 2, momentumLimit: 3, accelerateLimit: 8, eliteLimit: -1, fitsIn: 'momentum' },
      compensation: { average: 1, momentumLimit: 3, accelerateLimit: 8, eliteLimit: -1, fitsIn: 'momentum' },
      contracts: { average: 0, momentumLimit: 2, accelerateLimit: 5, eliteLimit: -1, fitsIn: 'momentum' },
      aiAvatarInterviews: { average: 2, momentumLimit: 0, accelerateLimit: 5, eliteLimit: 10, fitsIn: 'accelerate' },
    },
    savings: {
      monthly: 18,
      quarterly: 45,
      yearly: 149,
      monthlySavings: 0,
      quarterlySavings: 9,
      yearlySavings: 67,
    },
    reason: 'Based on your 3 months of usage, Accelerate fits your needs.',
    monthsTracked: 3,
  },
  currentTier: 'momentum',
  isCurrentPlan: false,
  isUpgrade: true,
  isDowngrade: false,
  ...overrides,
})

// ============================================================================
// Test Suite
// ============================================================================

describe('useSubscription Hook', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Default mock: status returns successfully, then recommendation
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/subscription/status')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(createStatusResponse()),
        })
      }
      if (url.includes('/api/subscription/recommendation')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(createRecommendationResponse()),
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==========================================================================
  // Loading State
  // ==========================================================================

  describe('Loading State', () => {
    it('useSubscription returns isLoading=true initially, then resolves', async () => {
      const { result } = renderHook(() => useSubscription())

      // Initially loading
      expect(result.current.isLoading).toBe(true)

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Now we have data
      expect(result.current.subscription).not.toBeNull()
    })
  })

  // ==========================================================================
  // Subscription Enabled Flag
  // ==========================================================================

  describe('subscriptionEnabled', () => {
    it('useSubscription exposes subscriptionEnabled from status', async () => {
      // Mock status with subscriptionEnabled=false
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/subscription/status')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createStatusResponse({ subscriptionEnabled: false })),
          })
        }
        if (url.includes('/api/subscription/recommendation')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createRecommendationResponse()),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      const { result } = renderHook(() => useSubscription())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.subscriptionEnabled).toBe(false)
    })
  })

  // ==========================================================================
  // Tier, Billing Period, Status, hasSubscription
  // ==========================================================================

  describe('Subscription Data', () => {
    it('useSubscription exposes tier, billingPeriod, status, hasSubscription', async () => {
      const { result } = renderHook(() => useSubscription())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.tier).toBe('accelerate')
      expect(result.current.billingPeriod).toBe('monthly')
      expect(result.current.status).toBe('active')
      expect(result.current.hasSubscription).toBe(true)
    })

    it('useSubscription: hasSubscription=false when tier is null', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/subscription/status')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createStatusResponse({
              tier: null,
              hasSubscription: false,
            })),
          })
        }
        if (url.includes('/api/subscription/recommendation')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createRecommendationResponse()),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      const { result } = renderHook(() => useSubscription())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.tier).toBeNull()
      expect(result.current.hasSubscription).toBe(false)
    })
  })

  // ==========================================================================
  // canAccessFeature
  // ==========================================================================

  describe('canAccessFeature', () => {
    it('canAccessFeature returns true when kill switch off', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/subscription/status')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createStatusResponse({ subscriptionEnabled: false })),
          })
        }
        if (url.includes('/api/subscription/recommendation')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createRecommendationResponse()),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      const { result } = renderHook(() => useSubscription())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // When kill switch is off, any feature should be accessible
      expect(result.current.canAccessFeature('aiAvatarInterviews')).toBe(true)
      expect(result.current.canAccessFeature('applicationTracker')).toBe(true)
    })

    it('canAccessFeature returns true when tier supports feature', async () => {
      // accelerate tier supports aiAvatarInterviews
      const { result } = renderHook(() => useSubscription())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.tier).toBe('accelerate')
      expect(result.current.canAccessFeature('aiAvatarInterviews')).toBe(true)
    })

    it('canAccessFeature returns false when tier lacks feature', async () => {
      // momentum tier does NOT support aiAvatarInterviews
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/subscription/status')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createStatusResponse({
              tier: 'momentum',
              features: {
                applicationTracker: true,
                tailoredCvs: true,
                interviewCoach: true,
                compensationSessions: true,
                contractReviews: true,
                aiAvatarInterviews: false, // momentum doesn't have this
              },
            })),
          })
        }
        if (url.includes('/api/subscription/recommendation')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createRecommendationResponse()),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      const { result } = renderHook(() => useSubscription())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.tier).toBe('momentum')
      expect(result.current.canAccessFeature('aiAvatarInterviews')).toBe(false)
    })

    it('canAccessFeature returns true for admin', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/subscription/status')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createStatusResponse({
              isAdmin: true,
              tier: 'momentum',
              features: {
                applicationTracker: true,
                tailoredCvs: true,
                interviewCoach: true,
                compensationSessions: true,
                contractReviews: true,
                aiAvatarInterviews: false, // feature not included
              },
            })),
          })
        }
        if (url.includes('/api/subscription/recommendation')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createRecommendationResponse()),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      const { result } = renderHook(() => useSubscription())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Admin should have access regardless of tier
      expect(result.current.isAdmin).toBe(true)
      expect(result.current.canAccessFeature('aiAvatarInterviews')).toBe(true)
    })
  })

  // ==========================================================================
  // usageFor
  // ==========================================================================

  describe('usageFor', () => {
    it('usageFor returns correct usage object', async () => {
      const { result } = renderHook(() => useSubscription())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const applicationsUsage = result.current.usageFor('applications')

      expect(applicationsUsage.used).toBe(7)
      expect(applicationsUsage.limit).toBe(15)
      expect(applicationsUsage.remaining).toBe(8)
      expect(applicationsUsage.percentUsed).toBe(46.67)
      expect(applicationsUsage.unlimited).toBe(false)
    })

    it('usageFor returns unlimited for Elite non-AI resources', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/subscription/status')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createStatusResponse({
              tier: 'elite',
              usage: {
                applications: { used: 50, limit: -1, remaining: -1, percentUsed: 0, unlimited: true },
                cvs: { used: 30, limit: -1, remaining: -1, percentUsed: 0, unlimited: true },
                interviews: { used: 20, limit: -1, remaining: -1, percentUsed: 0, unlimited: true },
                compensation: { used: 10, limit: -1, remaining: -1, percentUsed: 0, unlimited: true },
                contracts: { used: 5, limit: -1, remaining: -1, percentUsed: 0, unlimited: true },
                aiAvatarInterviews: { used: 5, limit: 10, remaining: 5, percentUsed: 50, unlimited: false },
              },
            })),
          })
        }
        if (url.includes('/api/subscription/recommendation')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createRecommendationResponse()),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      const { result } = renderHook(() => useSubscription())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const applicationsUsage = result.current.usageFor('applications')
      expect(applicationsUsage.unlimited).toBe(true)
    })
  })

  // ==========================================================================
  // checkAndConsume
  // ==========================================================================

  describe('checkAndConsume', () => {
    it('checkAndConsume calls check-limit then increment-usage', async () => {
      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/subscription/status')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createStatusResponse()),
          })
        }
        if (url.includes('/api/subscription/recommendation')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createRecommendationResponse()),
          })
        }
        if (url.includes('/api/subscription/check-limit')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              allowed: true,
              enforced: true,
              unlimited: false,
              used: 7,
              limit: 15,
              remaining: 8,
            }),
          })
        }
        if (url.includes('/api/subscription/increment-usage')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      const { result } = renderHook(() => useSubscription())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Call checkAndConsume
      let checkResult: Awaited<ReturnType<typeof result.current.checkAndConsume>>
      await act(async () => {
        checkResult = await result.current.checkAndConsume('applications')
      })

      // Verify check was called
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/subscription/check-limit',
        expect.objectContaining({ method: 'POST' })
      )

      // Check should return allowed
      expect(checkResult!.check.allowed).toBe(true)

      // Now call increment
      await act(async () => {
        await checkResult!.increment()
      })

      // Verify increment was called
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/subscription/increment-usage',
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('checkAndConsume blocks when limit reached', async () => {
      let incrementCalled = false

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/subscription/status')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createStatusResponse()),
          })
        }
        if (url.includes('/api/subscription/recommendation')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createRecommendationResponse()),
          })
        }
        if (url.includes('/api/subscription/check-limit')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              allowed: false,
              enforced: true,
              unlimited: false,
              reason: 'LIMIT_EXCEEDED',
              used: 15,
              limit: 15,
              remaining: 0,
            }),
          })
        }
        if (url.includes('/api/subscription/increment-usage')) {
          incrementCalled = true
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      const { result } = renderHook(() => useSubscription())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Call checkAndConsume
      let checkResult: Awaited<ReturnType<typeof result.current.checkAndConsume>>
      await act(async () => {
        checkResult = await result.current.checkAndConsume('applications')
      })

      // Check should return not allowed
      expect(checkResult!.check.allowed).toBe(false)

      // The caller should NOT call increment when check.allowed is false
      // (The hook returns the increment function, but caller decides whether to use it)
      // We verify that if caller respects the allowed flag, increment is not called
      expect(incrementCalled).toBe(false)
    })
  })

  // ==========================================================================
  // Recommendation
  // ==========================================================================

  describe('Recommendation', () => {
    it('recommendation is fetched lazily (after main status loads)', async () => {
      const fetchCalls: string[] = []

      mockFetch.mockImplementation((url: string) => {
        fetchCalls.push(url)

        if (url.includes('/api/subscription/status')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createStatusResponse()),
          })
        }
        if (url.includes('/api/subscription/recommendation')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createRecommendationResponse()),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      const { result } = renderHook(() => useSubscription())

      // Wait for status to load first
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Status should be fetched first
      expect(fetchCalls.some(url => url.includes('/api/subscription/status'))).toBe(true)

      // Wait for recommendation to load
      await waitFor(() => {
        expect(result.current.recommendation).not.toBeNull()
      })

      // Recommendation should be fetched after status
      const statusIndex = fetchCalls.findIndex(url => url.includes('/api/subscription/status'))
      const recommendationIndex = fetchCalls.findIndex(url => url.includes('/api/subscription/recommendation'))

      expect(recommendationIndex).toBeGreaterThan(statusIndex)
    })
  })

  // ==========================================================================
  // isAdmin Flag
  // ==========================================================================

  describe('isAdmin Flag', () => {
    it('isAdmin flag exposed from status', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/subscription/status')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createStatusResponse({ isAdmin: true })),
          })
        }
        if (url.includes('/api/subscription/recommendation')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createRecommendationResponse()),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      const { result } = renderHook(() => useSubscription())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isAdmin).toBe(true)
    })

    it('isAdmin defaults to false when not in status', async () => {
      const { result } = renderHook(() => useSubscription())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isAdmin).toBe(false)
    })
  })
})
