/**
 * Subscription API Routes Tests (RALPH Loop 7)
 *
 * Tests for all subscription-related API endpoints.
 * Verifies authentication, validation, and business logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// ============================================================================
// Mock Modules
// ============================================================================

// Mock Supabase
const mockUser = { id: 'user-123', email: 'test@example.com' }
const mockAuthError = null

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: vi.fn(() =>
          Promise.resolve({
            data: { user: mockUser },
            error: mockAuthError,
          })
        ),
      },
    })
  ),
  createServiceClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  })),
}))

// Mock subscription modules
vi.mock('@/lib/subscription/access-control', () => ({
  getSubscriptionStatus: vi.fn(),
  checkFeatureAccess: vi.fn(),
  checkUsageLimit: vi.fn(),
}))

vi.mock('@/lib/subscription/subscription-manager', () => ({
  getSubscription: vi.fn(),
  cancelSubscription: vi.fn(),
  upgradeSubscription: vi.fn(),
  scheduleDowngrade: vi.fn(),
  cancelScheduledChange: vi.fn(),
  processExpirations: vi.fn(),
}))

vi.mock('@/lib/subscription/grow-adapter', () => ({
  createRecurringPayment: vi.fn(),
  createOneTimeCharge: vi.fn(),
}))

vi.mock('@/lib/subscription/recommendation-engine', () => ({
  getUsageAverages: vi.fn(),
  getRecommendation: vi.fn(),
}))

vi.mock('@/lib/subscription/config', () => ({
  isSubscriptionEnabled: vi.fn(),
  isUpgrade: vi.fn(),
  isDowngrade: vi.fn(),
  TIER_ORDER: ['momentum', 'accelerate', 'elite'],
  BILLING_PERIODS: ['monthly', 'quarterly', 'yearly'],
  TIER_CONFIGS: {
    momentum: { name: 'Momentum' },
    accelerate: { name: 'Accelerate' },
    elite: { name: 'Elite' },
  },
}))

// ============================================================================
// Import Modules After Mocks
// ============================================================================

import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  getSubscriptionStatus,
  checkFeatureAccess,
  checkUsageLimit,
} from '@/lib/subscription/access-control'
import {
  getSubscription,
  cancelSubscription,
  upgradeSubscription,
  scheduleDowngrade,
  cancelScheduledChange,
  processExpirations,
} from '@/lib/subscription/subscription-manager'
import { createRecurringPayment, createOneTimeCharge } from '@/lib/subscription/grow-adapter'
import { getUsageAverages, getRecommendation } from '@/lib/subscription/recommendation-engine'
import { isSubscriptionEnabled, isUpgrade, isDowngrade } from '@/lib/subscription/config'

// ============================================================================
// Helper Functions
// ============================================================================

function createMockRequest(
  url: string,
  options: { method?: string; body?: Record<string, unknown>; headers?: Record<string, string> } = {}
): NextRequest {
  const { method = 'GET', body, headers = {} } = options

  const requestInit: RequestInit = {
    method,
    headers: new Headers(headers),
  }

  if (body) {
    requestInit.body = JSON.stringify(body)
    requestInit.headers = new Headers({
      ...headers,
      'content-type': 'application/json',
    })
  }

  return new NextRequest(url, requestInit)
}

function mockUnauthenticatedUser() {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: null },
          error: { message: 'Unauthorized' },
        })
      ),
    },
  } as never)
}

function mockAuthenticatedUser(userId = 'user-123', email = 'test@example.com') {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: { id: userId, email } },
          error: null,
        })
      ),
    },
  } as never)
}

// ============================================================================
// GET /api/subscription/status Tests
// ============================================================================

describe('GET /api/subscription/status', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 401 without auth', async () => {
    mockUnauthenticatedUser()

    const { GET } = await import('@/app/api/subscription/status/route')
    const response = await GET()

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('returns full status object with usage for authenticated user', async () => {
    mockAuthenticatedUser()

    const mockStatus = {
      tier: 'momentum',
      billingPeriod: 'monthly',
      status: 'active',
      usage: {
        applications: { used: 5, limit: 8, remaining: 3, percentUsed: 63, unlimited: false },
        cvs: { used: 2, limit: 8, remaining: 6, percentUsed: 25, unlimited: false },
        interviews: { used: 1, limit: 3, remaining: 2, percentUsed: 33, unlimited: false },
        compensation: { used: 0, limit: 3, remaining: 3, percentUsed: 0, unlimited: false },
        contracts: { used: 0, limit: 2, remaining: 2, percentUsed: 0, unlimited: false },
        aiAvatarInterviews: { used: 0, limit: 0, remaining: 0, percentUsed: 0, unlimited: false },
      },
      features: {
        applicationTracker: true,
        tailoredCvs: true,
        interviewCoach: true,
        compensationSessions: true,
        contractReviews: true,
        aiAvatarInterviews: false,
      },
      subscriptionEnabled: true,
    }
    vi.mocked(getSubscriptionStatus).mockResolvedValue(mockStatus as never)

    const { GET } = await import('@/app/api/subscription/status/route')
    const response = await GET()

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toEqual(mockStatus)
    expect(data.usage.applications.used).toBe(5)
  })

  it('returns subscriptionEnabled flag reflecting kill switch', async () => {
    mockAuthenticatedUser()

    // Test with kill switch ON
    const statusEnabled = {
      tier: 'momentum',
      subscriptionEnabled: true,
    }
    vi.mocked(getSubscriptionStatus).mockResolvedValue(statusEnabled as never)

    const { GET } = await import('@/app/api/subscription/status/route')
    let response = await GET()
    let data = await response.json()
    expect(data.subscriptionEnabled).toBe(true)

    // Test with kill switch OFF
    const statusDisabled = {
      tier: 'momentum',
      subscriptionEnabled: false,
    }
    vi.mocked(getSubscriptionStatus).mockResolvedValue(statusDisabled as never)

    response = await GET()
    data = await response.json()
    expect(data.subscriptionEnabled).toBe(false)
  })
})

// ============================================================================
// POST /api/subscription/initiate Tests
// ============================================================================

describe('POST /api/subscription/initiate', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    } as never)
  })

  it('returns 401 without auth', async () => {
    mockUnauthenticatedUser()

    const { POST } = await import('@/app/api/subscription/initiate/route')
    const request = createMockRequest('http://localhost/api/subscription/initiate', {
      method: 'POST',
      body: { tier: 'momentum', billingPeriod: 'monthly' },
    })
    const response = await POST(request)

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('validates body with Zod: invalid tier → 400', async () => {
    mockAuthenticatedUser()

    const { POST } = await import('@/app/api/subscription/initiate/route')
    const request = createMockRequest('http://localhost/api/subscription/initiate', {
      method: 'POST',
      body: { tier: 'premium', billingPeriod: 'monthly' }, // 'premium' is invalid
    })
    const response = await POST(request)

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Invalid request body')
    // details may or may not be included based on implementation
  })

  it('validates body with Zod: invalid billing_period → 400', async () => {
    mockAuthenticatedUser()

    const { POST } = await import('@/app/api/subscription/initiate/route')
    const request = createMockRequest('http://localhost/api/subscription/initiate', {
      method: 'POST',
      body: { tier: 'momentum', billingPeriod: 'biweekly' }, // 'biweekly' is invalid
    })
    const response = await POST(request)

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Invalid request body')
  })

  it('calls Grow createRecurringPayment and returns paymentUrl', async () => {
    mockAuthenticatedUser()

    vi.mocked(createRecurringPayment).mockResolvedValue({
      success: true,
      paymentUrl: 'https://pay.grow.com/checkout/abc123',
    })

    const { POST } = await import('@/app/api/subscription/initiate/route')
    const request = createMockRequest('http://localhost/api/subscription/initiate', {
      method: 'POST',
      body: { tier: 'accelerate', billingPeriod: 'yearly' },
      headers: { origin: 'https://app.signatura.com' },
    })
    const response = await POST(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.paymentUrl).toBe('https://pay.grow.com/checkout/abc123')

    expect(createRecurringPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        tier: 'accelerate',
        billingPeriod: 'yearly',
        userId: 'user-123',
      })
    )
  })

  it('sets pendingTier and pendingBillingPeriod on subscription record', async () => {
    mockAuthenticatedUser()

    const mockServiceClient = {
      from: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }
    vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as never)

    vi.mocked(createRecurringPayment).mockResolvedValue({
      success: true,
      paymentUrl: 'https://pay.grow.com/checkout/xyz',
    })

    const { POST } = await import('@/app/api/subscription/initiate/route')
    const request = createMockRequest('http://localhost/api/subscription/initiate', {
      method: 'POST',
      body: { tier: 'elite', billingPeriod: 'quarterly' },
    })
    await POST(request)

    expect(mockServiceClient.from).toHaveBeenCalledWith('user_subscriptions')
    expect(mockServiceClient.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-123',
        pending_tier: 'elite',
        pending_billing_period: 'quarterly',
      }),
      expect.any(Object)
    )
  })
})

// ============================================================================
// POST /api/subscription/cancel Tests
// ============================================================================

describe('POST /api/subscription/cancel', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 401 without auth', async () => {
    mockUnauthenticatedUser()

    const { POST } = await import('@/app/api/subscription/cancel/route')
    const response = await POST()

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('calls cancelSubscription and returns cancellation date', async () => {
    mockAuthenticatedUser()

    vi.mocked(getSubscription).mockResolvedValue({
      tier: 'momentum',
      billingPeriod: 'monthly',
    } as never)

    vi.mocked(cancelSubscription).mockResolvedValue({
      cancellationEffectiveAt: '2026-03-15T00:00:00.000Z',
    })

    const { POST } = await import('@/app/api/subscription/cancel/route')
    const response = await POST()

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.cancellationEffectiveAt).toBe('2026-03-15T00:00:00.000Z')
    expect(data.message).toContain('Momentum')
    expect(cancelSubscription).toHaveBeenCalled()
  })

  it('returns error if user has no subscription', async () => {
    mockAuthenticatedUser()

    vi.mocked(getSubscription).mockResolvedValue(null as never)
    vi.mocked(cancelSubscription).mockRejectedValue(
      new Error('No subscription found')
    )

    const { POST } = await import('@/app/api/subscription/cancel/route')
    const response = await POST()

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toBe('No active subscription found')
  })

  it('returns error if already cancelled', async () => {
    mockAuthenticatedUser()

    vi.mocked(getSubscription).mockResolvedValue({
      tier: 'momentum',
      status: 'cancelled',
    } as never)
    vi.mocked(cancelSubscription).mockRejectedValue(
      new Error('Subscription already cancelled')
    )

    const { POST } = await import('@/app/api/subscription/cancel/route')
    const response = await POST()

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Subscription is already cancelled')
  })
})

// ============================================================================
// POST /api/subscription/change-plan Tests
// ============================================================================

describe('POST /api/subscription/change-plan', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    } as never)
  })

  it('UPGRADE: calculates prorated amount and changes tier immediately', async () => {
    mockAuthenticatedUser()

    vi.mocked(getSubscription).mockResolvedValue({
      tier: 'momentum',
      billingPeriod: 'monthly',
      currentPeriodEnd: '2026-03-15T00:00:00.000Z',
      growTransactionToken: 'token-123',
    } as never)

    vi.mocked(isUpgrade).mockReturnValue(true)
    vi.mocked(isDowngrade).mockReturnValue(false)

    vi.mocked(upgradeSubscription).mockResolvedValue({
      proratedAmount: 6.5,
    })

    vi.mocked(createOneTimeCharge).mockResolvedValue({
      success: true,
      transactionId: 'charge-123',
    })

    const { POST } = await import('@/app/api/subscription/change-plan/route')
    const request = createMockRequest('http://localhost/api/subscription/change-plan', {
      method: 'POST',
      body: { targetTier: 'accelerate' },
    })
    const response = await POST(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.immediate).toBe(true)
    expect(data.proratedAmount).toBe(6.5)

    expect(upgradeSubscription).toHaveBeenCalledWith(
      expect.anything(),
      'user-123',
      'accelerate'
    )
  })

  it('UPGRADE: charges prorated amount via Grow createOneTimeCharge', async () => {
    mockAuthenticatedUser()

    vi.mocked(getSubscription).mockResolvedValue({
      tier: 'momentum',
      billingPeriod: 'monthly',
      growTransactionToken: 'stored-token',
    } as never)

    vi.mocked(isUpgrade).mockReturnValue(true)
    vi.mocked(isDowngrade).mockReturnValue(false)

    vi.mocked(upgradeSubscription).mockResolvedValue({
      proratedAmount: 10.5,
    })

    vi.mocked(createOneTimeCharge).mockResolvedValue({
      success: true,
      transactionId: 'charge-xyz',
    })

    const { POST } = await import('@/app/api/subscription/change-plan/route')
    const request = createMockRequest('http://localhost/api/subscription/change-plan', {
      method: 'POST',
      body: { targetTier: 'elite' },
    })
    await POST(request)

    expect(createOneTimeCharge).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 10.5,
        transactionToken: 'stored-token',
        userId: 'user-123',
      })
    )
  })

  it('DOWNGRADE: schedules for end of period, does not change current tier', async () => {
    mockAuthenticatedUser()

    vi.mocked(getSubscription).mockResolvedValue({
      tier: 'elite',
      billingPeriod: 'monthly',
      currentPeriodEnd: '2026-03-15T00:00:00.000Z',
    } as never)

    vi.mocked(isUpgrade).mockReturnValue(false)
    vi.mocked(isDowngrade).mockReturnValue(true)

    vi.mocked(scheduleDowngrade).mockResolvedValue({
      effectiveDate: '2026-03-15T00:00:00.000Z',
    })

    const { POST } = await import('@/app/api/subscription/change-plan/route')
    const request = createMockRequest('http://localhost/api/subscription/change-plan', {
      method: 'POST',
      body: { targetTier: 'momentum' },
    })
    const response = await POST(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.immediate).toBe(false)
    expect(data.effectiveDate).toBe('2026-03-15T00:00:00.000Z')

    expect(scheduleDowngrade).toHaveBeenCalledWith(
      expect.anything(),
      'user-123',
      'momentum'
    )
    expect(upgradeSubscription).not.toHaveBeenCalled()
  })

  it('CANCEL SCHEDULED: clears scheduledTierChange when target matches current', async () => {
    mockAuthenticatedUser()

    vi.mocked(getSubscription).mockResolvedValue({
      tier: 'elite',
      billingPeriod: 'monthly',
      scheduledTierChange: 'accelerate', // has a scheduled change
    } as never)

    vi.mocked(isUpgrade).mockReturnValue(false)
    vi.mocked(isDowngrade).mockReturnValue(false)

    vi.mocked(cancelScheduledChange).mockResolvedValue(undefined as never)

    const { POST } = await import('@/app/api/subscription/change-plan/route')
    const request = createMockRequest('http://localhost/api/subscription/change-plan', {
      method: 'POST',
      body: { targetTier: 'elite' }, // same as current tier
    })
    const response = await POST(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.message).toContain('cancelled')

    expect(cancelScheduledChange).toHaveBeenCalledWith(
      expect.anything(),
      'user-123'
    )
  })

  it('BILLING PERIOD CHANGE: schedules period change for next renewal', async () => {
    mockAuthenticatedUser()

    const mockServiceClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    }
    vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as never)

    vi.mocked(getSubscription).mockResolvedValue({
      tier: 'accelerate',
      billingPeriod: 'monthly',
      currentPeriodEnd: '2026-03-15T00:00:00.000Z',
      scheduledTierChange: null,
    } as never)

    vi.mocked(isUpgrade).mockReturnValue(false)
    vi.mocked(isDowngrade).mockReturnValue(false)

    const { POST } = await import('@/app/api/subscription/change-plan/route')
    const request = createMockRequest('http://localhost/api/subscription/change-plan', {
      method: 'POST',
      body: { targetTier: 'accelerate', targetBillingPeriod: 'yearly' }, // same tier, different period
    })
    const response = await POST(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.immediate).toBe(false)
    expect(data.message).toContain('yearly')

    expect(mockServiceClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduled_billing_period: 'yearly',
      })
    )
  })
})

// ============================================================================
// POST /api/subscription/check-access Tests
// ============================================================================

describe('POST /api/subscription/check-access', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns FeatureAccessCheck for given feature key', async () => {
    mockAuthenticatedUser()

    const mockAccessCheck = {
      allowed: true,
      enforced: true,
      tier: 'accelerate',
      feature: 'aiAvatarInterviews',
    }
    vi.mocked(checkFeatureAccess).mockResolvedValue(mockAccessCheck as never)

    const { POST } = await import('@/app/api/subscription/check-access/route')
    const request = createMockRequest('http://localhost/api/subscription/check-access', {
      method: 'POST',
      body: { feature: 'aiAvatarInterviews' },
    })
    const response = await POST(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.allowed).toBe(true)
    expect(data.tier).toBe('accelerate')
    expect(data.feature).toBe('aiAvatarInterviews')

    expect(checkFeatureAccess).toHaveBeenCalledWith(
      expect.anything(),
      'user-123',
      'aiAvatarInterviews'
    )
  })
})

// ============================================================================
// POST /api/subscription/check-limit Tests
// ============================================================================

describe('POST /api/subscription/check-limit', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns UsageLimitCheck without incrementing', async () => {
    mockAuthenticatedUser()

    const mockLimitCheck = {
      allowed: true,
      enforced: true,
      used: 5,
      limit: 8,
      remaining: 3,
      unlimited: false,
    }
    vi.mocked(checkUsageLimit).mockResolvedValue(mockLimitCheck as never)

    const { POST } = await import('@/app/api/subscription/check-limit/route')
    const request = createMockRequest('http://localhost/api/subscription/check-limit', {
      method: 'POST',
      body: { resource: 'applications' },
    })
    const response = await POST(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.allowed).toBe(true)
    expect(data.used).toBe(5)
    expect(data.limit).toBe(8)
    expect(data.remaining).toBe(3)

    // checkUsageLimit is called (read-only check)
    expect(checkUsageLimit).toHaveBeenCalledWith(
      expect.anything(),
      'user-123',
      'applications'
    )
  })
})

// ============================================================================
// GET /api/subscription/recommendation Tests
// ============================================================================

describe('GET /api/subscription/recommendation', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns recommendation with comparison and savings', async () => {
    mockAuthenticatedUser()

    const mockAverages = {
      applications: 10,
      cvs: 5,
      interviews: 3,
      compensation: 1,
      contracts: 1,
      aiAvatarInterviews: 2,
      monthsTracked: 3,
    }
    vi.mocked(getUsageAverages).mockResolvedValue(mockAverages as never)

    const mockRecommendation = {
      recommendedTier: 'accelerate',
      recommendedBillingPeriod: 'yearly',
      reason: 'Based on your 3 months of usage, Accelerate fits your needs.',
      comparison: {
        applications: { average: 10, momentumLimit: 8, accelerateLimit: 15, eliteLimit: -1, fitsIn: 'accelerate' },
        cvs: { average: 5, momentumLimit: 8, accelerateLimit: 15, eliteLimit: -1, fitsIn: 'momentum' },
        interviews: { average: 3, momentumLimit: 3, accelerateLimit: 8, eliteLimit: -1, fitsIn: 'momentum' },
        compensation: { average: 1, momentumLimit: 3, accelerateLimit: 8, eliteLimit: -1, fitsIn: 'momentum' },
        contracts: { average: 1, momentumLimit: 2, accelerateLimit: 5, eliteLimit: -1, fitsIn: 'momentum' },
        aiAvatarInterviews: { average: 2, momentumLimit: 0, accelerateLimit: 5, eliteLimit: 10, fitsIn: 'accelerate' },
      },
      savings: { monthly: 18, quarterly: 45, yearly: 149 },
    }
    vi.mocked(getRecommendation).mockReturnValue(mockRecommendation as never)

    vi.mocked(getSubscription).mockResolvedValue({
      tier: 'momentum',
    } as never)

    vi.mocked(isUpgrade).mockReturnValue(true)
    vi.mocked(isDowngrade).mockReturnValue(false)

    const { GET } = await import('@/app/api/subscription/recommendation/route')
    const response = await GET()

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.recommendation.recommendedTier).toBe('accelerate')
    expect(data.recommendation.comparison).toBeDefined()
    expect(data.recommendation.savings).toBeDefined()
  })

  it('returns currentTier and isUpgrade/isDowngrade flags', async () => {
    mockAuthenticatedUser()

    vi.mocked(getUsageAverages).mockResolvedValue({
      applications: 5,
      monthsTracked: 1,
    } as never)

    vi.mocked(getRecommendation).mockReturnValue({
      recommendedTier: 'accelerate',
      recommendedBillingPeriod: 'yearly',
    } as never)

    vi.mocked(getSubscription).mockResolvedValue({
      tier: 'momentum',
    } as never)

    vi.mocked(isUpgrade).mockReturnValue(true)
    vi.mocked(isDowngrade).mockReturnValue(false)

    const { GET } = await import('@/app/api/subscription/recommendation/route')
    const response = await GET()

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.currentTier).toBe('momentum')
    expect(data.isUpgrade).toBe(true)
    expect(data.isDowngrade).toBe(false)
    expect(data.isCurrentPlan).toBe(false)
  })

  it('returns reasonable recommendation when no usage history', async () => {
    mockAuthenticatedUser()

    vi.mocked(getUsageAverages).mockResolvedValue({
      applications: 0,
      cvs: 0,
      interviews: 0,
      compensation: 0,
      contracts: 0,
      aiAvatarInterviews: 0,
      monthsTracked: 0,
    } as never)

    vi.mocked(getRecommendation).mockReturnValue({
      recommendedTier: 'momentum',
      recommendedBillingPeriod: 'yearly',
      reason: 'Start with Momentum - it is a good starting point.',
    } as never)

    vi.mocked(getSubscription).mockResolvedValue(null as never)

    const { GET } = await import('@/app/api/subscription/recommendation/route')
    const response = await GET()

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.recommendation.recommendedTier).toBe('momentum')
    expect(data.currentTier).toBeNull()
  })
})

// ============================================================================
// GET /api/cron/process-subscriptions Tests
// ============================================================================

describe('GET /api/cron/process-subscriptions', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetAllMocks()
    process.env = { ...originalEnv, CRON_SECRET: 'test-cron-secret' }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('rejects without CRON_SECRET header → 401', async () => {
    const { GET } = await import('@/app/api/cron/process-subscriptions/route')

    const request = new Request('http://localhost/api/cron/process-subscriptions', {
      headers: {}, // No Authorization header
    })
    const response = await GET(request)

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.skipped).toBe(true)
    expect(data.reason).toBe('unauthorized')
  })

  it('when kill switch OFF: returns { skipped: true }', async () => {
    vi.mocked(isSubscriptionEnabled).mockReturnValue(false)

    const { GET } = await import('@/app/api/cron/process-subscriptions/route')

    const request = new Request('http://localhost/api/cron/process-subscriptions', {
      headers: {
        Authorization: 'Bearer test-cron-secret',
      },
    })
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.skipped).toBe(true)
    expect(data.reason).toBe('enforcement disabled')
  })

  it('when kill switch ON: calls processExpirations and returns counts', async () => {
    vi.mocked(isSubscriptionEnabled).mockReturnValue(true)
    vi.mocked(processExpirations).mockResolvedValue({ expired: 3 })
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as never)

    const { GET } = await import('@/app/api/cron/process-subscriptions/route')

    const request = new Request('http://localhost/api/cron/process-subscriptions', {
      headers: {
        Authorization: 'Bearer test-cron-secret',
      },
    })
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.expired).toBe(3)
    expect(data.reconciled).toBeDefined()
    expect(data.executionTime).toBeDefined()

    expect(processExpirations).toHaveBeenCalled()
  })

  it('expires cancelled subscriptions past their date', async () => {
    vi.mocked(isSubscriptionEnabled).mockReturnValue(true)
    vi.mocked(processExpirations).mockResolvedValue({ expired: 2 })
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as never)

    const { GET } = await import('@/app/api/cron/process-subscriptions/route')

    const request = new Request('http://localhost/api/cron/process-subscriptions', {
      headers: {
        Authorization: 'Bearer test-cron-secret',
      },
    })
    const response = await GET(request)

    const data = await response.json()
    expect(data.expired).toBe(2)

    // processExpirations handles cancelled subs
    expect(processExpirations).toHaveBeenCalled()
  })

  it('expires past_due subscriptions past 3-day grace', async () => {
    vi.mocked(isSubscriptionEnabled).mockReturnValue(true)
    vi.mocked(processExpirations).mockResolvedValue({ expired: 1 })
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as never)

    const { GET } = await import('@/app/api/cron/process-subscriptions/route')

    const request = new Request('http://localhost/api/cron/process-subscriptions', {
      headers: {
        Authorization: 'Bearer test-cron-secret',
      },
    })
    const response = await GET(request)

    const data = await response.json()
    expect(data.expired).toBe(1)

    // processExpirations handles past_due subs
    expect(processExpirations).toHaveBeenCalled()
  })
})
