/**
 * Subscription API Routes Tests (Phase 8.2)
 *
 * RALPH tests for all subscription API endpoints.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ============================================================================
// Mocks
// ============================================================================

const mockGetUser = vi.fn()
const mockCreateClient = vi.fn()
const mockCreateServiceClient = vi.fn()

// Subscription mocks
const mockGetSubscriptionStatus = vi.fn()
const mockGetSubscription = vi.fn()
const mockCancelSubscription = vi.fn()
const mockUpgradeSubscription = vi.fn()
const mockScheduleDowngrade = vi.fn()
const mockCancelScheduledChange = vi.fn()
const mockCheckFeatureAccess = vi.fn()
const mockCheckUsageLimit = vi.fn()
const mockGetUsageAverages = vi.fn()
const mockGetRecommendation = vi.fn()
const mockCreateRecurringPayment = vi.fn()
const mockCreateOneTimeCharge = vi.fn()

// Supabase mock
const mockSupabaseFrom = vi.fn()
const mockSupabaseUpsert = vi.fn()
const mockSupabaseUpdate = vi.fn()
const mockSupabaseEq = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
  createServiceClient: () => mockCreateServiceClient(),
}))

vi.mock('@/lib/subscription/access-control', () => ({
  getSubscriptionStatus: (client: unknown, userId: string) => mockGetSubscriptionStatus(client, userId),
  checkFeatureAccess: (client: unknown, userId: string, feature: string) => mockCheckFeatureAccess(client, userId, feature),
  checkUsageLimit: (client: unknown, userId: string, resource: string) => mockCheckUsageLimit(client, userId, resource),
}))

vi.mock('@/lib/subscription/subscription-manager', () => ({
  getSubscription: (client: unknown, userId: string) => mockGetSubscription(client, userId),
  cancelSubscription: (client: unknown, userId: string) => mockCancelSubscription(client, userId),
  upgradeSubscription: (client: unknown, userId: string, tier: string) => mockUpgradeSubscription(client, userId, tier),
  scheduleDowngrade: (client: unknown, userId: string, tier: string) => mockScheduleDowngrade(client, userId, tier),
  cancelScheduledChange: (client: unknown, userId: string) => mockCancelScheduledChange(client, userId),
}))

vi.mock('@/lib/subscription/recommendation-engine', () => ({
  getUsageAverages: (client: unknown, userId: string) => mockGetUsageAverages(client, userId),
  getRecommendation: (averages: unknown) => mockGetRecommendation(averages),
}))

vi.mock('@/lib/subscription/grow-adapter', () => ({
  createRecurringPayment: (params: unknown) => mockCreateRecurringPayment(params),
  createOneTimeCharge: (params: unknown) => mockCreateOneTimeCharge(params),
}))

vi.mock('@/lib/subscription/config', () => ({
  TIER_ORDER: ['momentum', 'accelerate', 'elite'],
  BILLING_PERIODS: ['monthly', 'quarterly', 'yearly'],
  TIER_CONFIGS: {
    momentum: { name: 'Momentum' },
    accelerate: { name: 'Accelerate' },
    elite: { name: 'Elite' },
  },
  isUpgrade: (from: string, to: string) => {
    const order = ['momentum', 'accelerate', 'elite']
    return order.indexOf(to) > order.indexOf(from)
  },
  isDowngrade: (from: string, to: string) => {
    const order = ['momentum', 'accelerate', 'elite']
    return order.indexOf(to) < order.indexOf(from)
  },
}))

// ============================================================================
// Test Helpers
// ============================================================================

function setupAuthenticatedUser(userId = 'user-123', email = 'test@example.com') {
  mockCreateClient.mockReturnValue({
    auth: {
      getUser: mockGetUser.mockResolvedValue({
        data: { user: { id: userId, email } },
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

function setupServiceClient() {
  mockSupabaseEq.mockResolvedValue({ error: null })
  mockSupabaseUpdate.mockReturnValue({ eq: mockSupabaseEq })
  mockSupabaseUpsert.mockResolvedValue({ error: null })
  mockSupabaseFrom.mockReturnValue({
    upsert: mockSupabaseUpsert,
    update: mockSupabaseUpdate,
  })
  mockCreateServiceClient.mockReturnValue({
    from: mockSupabaseFrom,
  })
}

function createJsonRequest(path: string, body?: Record<string, unknown>): NextRequest {
  const options: RequestInit & { method: string } = { method: body ? 'POST' : 'GET' }
  if (body) {
    options.headers = { 'Content-Type': 'application/json' }
    options.body = JSON.stringify(body)
  }
  return new NextRequest(`http://localhost${path}`, options)
}

// ============================================================================
// Tests
// ============================================================================

describe('Subscription API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupServiceClient()
  })

  // ==========================================================================
  // Status Route
  // ==========================================================================

  describe('GET /api/subscription/status', () => {
    it('should return 401 if not authenticated', async () => {
      setupUnauthenticatedUser()
      const { GET } = await import('@/app/api/subscription/status/route')

      const response = await GET()

      expect(response.status).toBe(401)
    })

    it('should return subscription status when authenticated', async () => {
      setupAuthenticatedUser()
      mockGetSubscriptionStatus.mockResolvedValue({
        subscriptionEnabled: true,
        hasSubscription: true,
        tier: 'momentum',
      })
      const { GET } = await import('@/app/api/subscription/status/route')

      const response = await GET()

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.tier).toBe('momentum')
    })
  })

  // ==========================================================================
  // Initiate Route
  // ==========================================================================

  describe('POST /api/subscription/initiate', () => {
    it('should return 401 if not authenticated', async () => {
      setupUnauthenticatedUser()
      const { POST } = await import('@/app/api/subscription/initiate/route')
      const request = createJsonRequest('/api/subscription/initiate', {
        tier: 'momentum',
        billingPeriod: 'monthly',
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should return 400 for invalid tier', async () => {
      setupAuthenticatedUser()
      const { POST } = await import('@/app/api/subscription/initiate/route')
      const request = createJsonRequest('/api/subscription/initiate', {
        tier: 'invalid',
        billingPeriod: 'monthly',
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should return 400 for invalid billing period', async () => {
      setupAuthenticatedUser()
      const { POST } = await import('@/app/api/subscription/initiate/route')
      const request = createJsonRequest('/api/subscription/initiate', {
        tier: 'momentum',
        billingPeriod: 'invalid',
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should create payment and return URL', async () => {
      setupAuthenticatedUser()
      mockCreateRecurringPayment.mockResolvedValue({
        success: true,
        paymentUrl: 'https://grow.example.com/pay/123',
      })
      const { POST } = await import('@/app/api/subscription/initiate/route')
      const request = createJsonRequest('/api/subscription/initiate', {
        tier: 'accelerate',
        billingPeriod: 'yearly',
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.paymentUrl).toBe('https://grow.example.com/pay/123')
    })

    it('should set pending tier on subscription record', async () => {
      setupAuthenticatedUser('user-xyz')
      mockCreateRecurringPayment.mockResolvedValue({
        success: true,
        paymentUrl: 'https://grow.example.com/pay/123',
      })
      const { POST } = await import('@/app/api/subscription/initiate/route')
      const request = createJsonRequest('/api/subscription/initiate', {
        tier: 'elite',
        billingPeriod: 'quarterly',
      })

      await POST(request)

      expect(mockSupabaseFrom).toHaveBeenCalledWith('user_subscriptions')
      expect(mockSupabaseUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-xyz',
          pending_tier: 'elite',
          pending_billing_period: 'quarterly',
        }),
        expect.anything()
      )
    })
  })

  // ==========================================================================
  // Cancel Route
  // ==========================================================================

  describe('POST /api/subscription/cancel', () => {
    it('should return 401 if not authenticated', async () => {
      setupUnauthenticatedUser()
      const { POST } = await import('@/app/api/subscription/cancel/route')

      const response = await POST()

      expect(response.status).toBe(401)
    })

    it('should cancel subscription and return effective date', async () => {
      setupAuthenticatedUser()
      mockGetSubscription.mockResolvedValue({ tier: 'momentum' })
      mockCancelSubscription.mockResolvedValue({
        cancellationEffectiveAt: '2026-03-15T10:00:00Z',
      })
      const { POST } = await import('@/app/api/subscription/cancel/route')

      const response = await POST()

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.cancellationEffectiveAt).toBe('2026-03-15T10:00:00Z')
      expect(data.message).toContain('Momentum')
    })

    it('should return 404 if no subscription found', async () => {
      setupAuthenticatedUser()
      mockCancelSubscription.mockRejectedValue(new Error('No subscription found'))
      const { POST } = await import('@/app/api/subscription/cancel/route')

      const response = await POST()

      expect(response.status).toBe(404)
    })
  })

  // ==========================================================================
  // Change Plan Route
  // ==========================================================================

  describe('POST /api/subscription/change-plan', () => {
    it('should return 401 if not authenticated', async () => {
      setupUnauthenticatedUser()
      const { POST } = await import('@/app/api/subscription/change-plan/route')
      const request = createJsonRequest('/api/subscription/change-plan', {
        targetTier: 'accelerate',
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should return 404 if no active subscription', async () => {
      setupAuthenticatedUser()
      mockGetSubscription.mockResolvedValue(null)
      const { POST } = await import('@/app/api/subscription/change-plan/route')
      const request = createJsonRequest('/api/subscription/change-plan', {
        targetTier: 'accelerate',
      })

      const response = await POST(request)

      expect(response.status).toBe(404)
    })

    describe('Scenario A: Upgrade', () => {
      it('should upgrade immediately and return prorated amount', async () => {
        setupAuthenticatedUser()
        mockGetSubscription.mockResolvedValue({
          tier: 'momentum',
          billingPeriod: 'monthly',
          growTransactionToken: 'token-123',
        })
        mockUpgradeSubscription.mockResolvedValue({ proratedAmount: 5.50 })
        mockCreateOneTimeCharge.mockResolvedValue({ success: true })
        const { POST } = await import('@/app/api/subscription/change-plan/route')
        const request = createJsonRequest('/api/subscription/change-plan', {
          targetTier: 'accelerate',
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.success).toBe(true)
        expect(data.immediate).toBe(true)
        expect(data.proratedAmount).toBe(5.50)
        expect(data.newTier).toBe('accelerate')
      })

      it('should charge stored card for prorated amount', async () => {
        setupAuthenticatedUser('user-abc')
        mockGetSubscription.mockResolvedValue({
          tier: 'momentum',
          billingPeriod: 'monthly',
          growTransactionToken: 'token-xyz',
        })
        mockUpgradeSubscription.mockResolvedValue({ proratedAmount: 10 })
        mockCreateOneTimeCharge.mockResolvedValue({ success: true })
        const { POST } = await import('@/app/api/subscription/change-plan/route')
        const request = createJsonRequest('/api/subscription/change-plan', {
          targetTier: 'elite',
        })

        await POST(request)

        expect(mockCreateOneTimeCharge).toHaveBeenCalledWith(
          expect.objectContaining({
            amount: 10,
            userId: 'user-abc',
            transactionToken: 'token-xyz',
          })
        )
      })
    })

    describe('Scenario B: Downgrade', () => {
      it('should schedule downgrade and return effective date', async () => {
        setupAuthenticatedUser()
        mockGetSubscription.mockResolvedValue({
          tier: 'elite',
          billingPeriod: 'monthly',
        })
        mockScheduleDowngrade.mockResolvedValue({
          effectiveDate: '2026-03-15T10:00:00Z',
        })
        const { POST } = await import('@/app/api/subscription/change-plan/route')
        const request = createJsonRequest('/api/subscription/change-plan', {
          targetTier: 'momentum',
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.success).toBe(true)
        expect(data.immediate).toBe(false)
        expect(data.effectiveDate).toBe('2026-03-15T10:00:00Z')
        expect(data.message).toContain('Momentum')
      })
    })

    describe('Scenario C: Cancel Scheduled Change', () => {
      it('should cancel scheduled change when target equals current', async () => {
        setupAuthenticatedUser()
        mockGetSubscription.mockResolvedValue({
          tier: 'accelerate',
          billingPeriod: 'monthly',
          scheduledTierChange: 'momentum',
        })
        mockCancelScheduledChange.mockResolvedValue(undefined)
        const { POST } = await import('@/app/api/subscription/change-plan/route')
        const request = createJsonRequest('/api/subscription/change-plan', {
          targetTier: 'accelerate',
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.success).toBe(true)
        expect(data.message).toBe('Scheduled change cancelled.')
        expect(mockCancelScheduledChange).toHaveBeenCalled()
      })
    })

    describe('Scenario D: Billing Period Change', () => {
      it('should schedule billing period change', async () => {
        setupAuthenticatedUser()
        mockGetSubscription.mockResolvedValue({
          tier: 'accelerate',
          billingPeriod: 'monthly',
          currentPeriodEnd: '2026-03-15T10:00:00Z',
        })
        const { POST } = await import('@/app/api/subscription/change-plan/route')
        const request = createJsonRequest('/api/subscription/change-plan', {
          targetTier: 'accelerate',
          targetBillingPeriod: 'yearly',
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.success).toBe(true)
        expect(data.immediate).toBe(false)
        expect(mockSupabaseUpdate).toHaveBeenCalledWith({
          scheduled_billing_period: 'yearly',
        })
      })
    })
  })

  // ==========================================================================
  // Check Access Route
  // ==========================================================================

  describe('POST /api/subscription/check-access', () => {
    it('should return 401 if not authenticated', async () => {
      setupUnauthenticatedUser()
      const { POST } = await import('@/app/api/subscription/check-access/route')
      const request = createJsonRequest('/api/subscription/check-access', {
        feature: 'applicationTracker',
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should return 400 for invalid feature', async () => {
      setupAuthenticatedUser()
      const { POST } = await import('@/app/api/subscription/check-access/route')
      const request = createJsonRequest('/api/subscription/check-access', {
        feature: 'invalidFeature',
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should return feature access check result', async () => {
      setupAuthenticatedUser()
      mockCheckFeatureAccess.mockResolvedValue({
        allowed: true,
        enforced: true,
        tier: 'momentum',
      })
      const { POST } = await import('@/app/api/subscription/check-access/route')
      const request = createJsonRequest('/api/subscription/check-access', {
        feature: 'applicationTracker',
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.allowed).toBe(true)
      expect(data.tier).toBe('momentum')
    })
  })

  // ==========================================================================
  // Check Limit Route
  // ==========================================================================

  describe('POST /api/subscription/check-limit', () => {
    it('should return 401 if not authenticated', async () => {
      setupUnauthenticatedUser()
      const { POST } = await import('@/app/api/subscription/check-limit/route')
      const request = createJsonRequest('/api/subscription/check-limit', {
        resource: 'applications',
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should return 400 for invalid resource', async () => {
      setupAuthenticatedUser()
      const { POST } = await import('@/app/api/subscription/check-limit/route')
      const request = createJsonRequest('/api/subscription/check-limit', {
        resource: 'invalidResource',
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should return usage limit check result', async () => {
      setupAuthenticatedUser()
      mockCheckUsageLimit.mockResolvedValue({
        allowed: true,
        enforced: true,
        unlimited: false,
        used: 5,
        limit: 8,
        remaining: 3,
      })
      const { POST } = await import('@/app/api/subscription/check-limit/route')
      const request = createJsonRequest('/api/subscription/check-limit', {
        resource: 'applications',
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.allowed).toBe(true)
      expect(data.used).toBe(5)
      expect(data.limit).toBe(8)
    })
  })

  // ==========================================================================
  // Recommendation Route
  // ==========================================================================

  describe('GET /api/subscription/recommendation', () => {
    it('should return 401 if not authenticated', async () => {
      setupUnauthenticatedUser()
      const { GET } = await import('@/app/api/subscription/recommendation/route')

      const response = await GET()

      expect(response.status).toBe(401)
    })

    it('should return recommendation with current tier comparison', async () => {
      setupAuthenticatedUser()
      mockGetUsageAverages.mockResolvedValue({
        applications: 10,
        cvs: 5,
        monthsTracked: 3,
      })
      mockGetRecommendation.mockReturnValue({
        recommendedTier: 'accelerate',
        recommendedBillingPeriod: 'yearly',
        reason: 'Based on your usage...',
      })
      mockGetSubscription.mockResolvedValue({ tier: 'momentum' })
      const { GET } = await import('@/app/api/subscription/recommendation/route')

      const response = await GET()

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.recommendation.recommendedTier).toBe('accelerate')
      expect(data.currentTier).toBe('momentum')
      expect(data.isUpgrade).toBe(true)
      expect(data.isDowngrade).toBe(false)
      expect(data.isCurrentPlan).toBe(false)
    })

    it('should indicate when recommendation matches current plan', async () => {
      setupAuthenticatedUser()
      mockGetUsageAverages.mockResolvedValue({ applications: 5, monthsTracked: 2 })
      mockGetRecommendation.mockReturnValue({ recommendedTier: 'momentum' })
      mockGetSubscription.mockResolvedValue({ tier: 'momentum' })
      const { GET } = await import('@/app/api/subscription/recommendation/route')

      const response = await GET()

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.isCurrentPlan).toBe(true)
      expect(data.isUpgrade).toBe(false)
      expect(data.isDowngrade).toBe(false)
    })

    it('should handle no current subscription', async () => {
      setupAuthenticatedUser()
      mockGetUsageAverages.mockResolvedValue({ applications: 0, monthsTracked: 0 })
      mockGetRecommendation.mockReturnValue({ recommendedTier: 'momentum' })
      mockGetSubscription.mockResolvedValue(null)
      const { GET } = await import('@/app/api/subscription/recommendation/route')

      const response = await GET()

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.currentTier).toBeNull()
      expect(data.isUpgrade).toBe(false)
      expect(data.isDowngrade).toBe(false)
    })
  })
})
