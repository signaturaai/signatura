/**
 * Cron Job: Process Subscriptions Tests
 *
 * Tests for the /api/cron/process-subscriptions endpoint.
 * Validates cron secret verification, kill switch behavior,
 * expiration processing, and snapshot reconciliation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Test configuration state
let shouldEnableSubscription = true
let processExpirationsResult = { expired: 0 }
let snapshotsData: any[] = []
let snapshotQueryError: any = null

// Setup all mocks before importing the route
vi.mock('@/lib/subscription/config', () => ({
  isSubscriptionEnabled: vi.fn(() => shouldEnableSubscription),
}))

vi.mock('@/lib/subscription/subscription-manager', () => ({
  processExpirations: vi.fn(() => Promise.resolve(processExpirationsResult)),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({
    from: (table: string) => ({
      select: () => ({
        eq: (field: string, value: unknown) => {
          if (table === 'usage_monthly_snapshots') {
            if (snapshotQueryError) {
              return Promise.resolve({ data: null, error: snapshotQueryError })
            }
            return Promise.resolve({ data: snapshotsData, error: null })
          }
          if (table === 'user_subscriptions') {
            return {
              single: () => Promise.resolve({
                data: { tier: 'momentum', billing_period: 'monthly' },
                error: null,
              }),
            }
          }
          return Promise.resolve({ data: [], error: null })
        },
      }),
    }),
  })),
}))

vi.mock('date-fns', async () => {
  const actual = await vi.importActual('date-fns')
  return {
    ...actual,
    format: vi.fn(() => '2025-01'),
    subMonths: vi.fn(() => new Date('2025-01-01')),
  }
})

// Helper to create a mock request
function createMockRequest(authHeader?: string): Request {
  const headers = new Headers()
  if (authHeader) {
    headers.set('Authorization', authHeader)
  }
  return new Request('http://localhost/api/cron/process-subscriptions', {
    method: 'GET',
    headers,
  })
}

describe('Process Subscriptions Cron', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('CRON_SECRET', 'test-cron-secret')
    // Reset test state
    shouldEnableSubscription = true
    processExpirationsResult = { expired: 0 }
    snapshotsData = []
    snapshotQueryError = null
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('Authorization', () => {
    it('should return 401 if no Authorization header', async () => {
      const { GET } = await import('@/app/api/cron/process-subscriptions/route')
      const request = createMockRequest()

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.skipped).toBe(true)
      expect(data.reason).toBe('unauthorized')
    })

    it('should return 401 if Authorization header is invalid', async () => {
      const { GET } = await import('@/app/api/cron/process-subscriptions/route')
      const request = createMockRequest('Bearer wrong-secret')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.skipped).toBe(true)
      expect(data.reason).toBe('unauthorized')
    })

    it('should return 401 if Authorization format is wrong', async () => {
      const { GET } = await import('@/app/api/cron/process-subscriptions/route')
      const request = createMockRequest('Basic test-cron-secret')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.skipped).toBe(true)
    })

    it('should accept valid Authorization header', async () => {
      const { GET } = await import('@/app/api/cron/process-subscriptions/route')
      const request = createMockRequest('Bearer test-cron-secret')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.skipped).not.toBe(true)
    })
  })

  describe('Kill Switch', () => {
    it('should skip processing when SUBSCRIPTION_ENABLED=false', async () => {
      shouldEnableSubscription = false
      const { GET } = await import('@/app/api/cron/process-subscriptions/route')
      const request = createMockRequest('Bearer test-cron-secret')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.skipped).toBe(true)
      expect(data.reason).toBe('enforcement disabled')
    })
  })

  describe('Expiration Processing', () => {
    it('should process expirations and return count', async () => {
      processExpirationsResult = { expired: 5 }
      const { GET } = await import('@/app/api/cron/process-subscriptions/route')
      const request = createMockRequest('Bearer test-cron-secret')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.expired).toBe(5)
    })

    it('should return expired count of 0 when no subscriptions to expire', async () => {
      processExpirationsResult = { expired: 0 }
      const { GET } = await import('@/app/api/cron/process-subscriptions/route')
      const request = createMockRequest('Bearer test-cron-secret')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.expired).toBe(0)
    })
  })

  describe('Snapshot Reconciliation', () => {
    it('should reconcile snapshots and count them', async () => {
      snapshotsData = [
        {
          user_id: 'user-1',
          snapshot_month: '2025-01',
          tier: 'momentum',
          applications_used: 5,
          cvs_used: 3,
          interviews_used: 2,
          compensation_used: 1,
          contracts_used: 0,
          ai_avatar_interviews_used: 0,
        },
        {
          user_id: 'user-2',
          snapshot_month: '2025-01',
          tier: 'accelerate',
          applications_used: 10,
          cvs_used: 8,
          interviews_used: 5,
          compensation_used: 3,
          contracts_used: 2,
          ai_avatar_interviews_used: 1,
        },
      ]
      const { GET } = await import('@/app/api/cron/process-subscriptions/route')
      const request = createMockRequest('Bearer test-cron-secret')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.reconciled).toBe(2)
      expect(data.mismatches).toBeUndefined() // No mismatches with valid data
    })

    it('should report mismatches for negative usage values', async () => {
      snapshotsData = [
        {
          user_id: 'user-1',
          snapshot_month: '2025-01',
          tier: 'momentum',
          applications_used: -5, // Invalid
          cvs_used: -3, // Invalid
          interviews_used: 2,
          compensation_used: 1,
          contracts_used: 0,
          ai_avatar_interviews_used: 0,
        },
      ]
      const { GET } = await import('@/app/api/cron/process-subscriptions/route')
      const request = createMockRequest('Bearer test-cron-secret')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.mismatches).toBeDefined()
      expect(data.mismatches.length).toBe(2)
      expect(data.mismatches[0].field).toBe('applications_used')
      expect(data.mismatches[0].snapshotValue).toBe(-5)
    })

    it('should handle empty snapshots gracefully', async () => {
      snapshotsData = []
      const { GET } = await import('@/app/api/cron/process-subscriptions/route')
      const request = createMockRequest('Bearer test-cron-secret')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.reconciled).toBe(0)
      expect(data.mismatches).toBeUndefined()
    })

    it('should handle snapshot query errors gracefully', async () => {
      snapshotQueryError = { message: 'Query failed' }
      const { GET } = await import('@/app/api/cron/process-subscriptions/route')
      const request = createMockRequest('Bearer test-cron-secret')

      const response = await GET(request)
      const data = await response.json()

      // Should still succeed but with 0 reconciled
      expect(response.status).toBe(200)
      expect(data.reconciled).toBe(0)
    })
  })

  describe('Response Format', () => {
    it('should include timestamp and execution time', async () => {
      const { GET } = await import('@/app/api/cron/process-subscriptions/route')
      const request = createMockRequest('Bearer test-cron-secret')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.timestamp).toBeDefined()
      expect(data.executionTime).toBeDefined()
      expect(typeof data.executionTime).toBe('number')
    })
  })
})

describe('vercel.json Configuration', () => {
  it('should have correct cron schedule', async () => {
    const fs = await import('fs')
    const path = await import('path')

    const vercelConfig = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'vercel.json'),
        'utf-8'
      )
    )

    expect(vercelConfig.crons).toBeDefined()
    expect(vercelConfig.crons.length).toBeGreaterThanOrEqual(1)

    const subscriptionCron = vercelConfig.crons.find(
      (c: { path: string }) => c.path === '/api/cron/process-subscriptions'
    )
    expect(subscriptionCron).toBeDefined()
    expect(subscriptionCron.schedule).toBe('0 0 * * *') // Daily at midnight
  })
})
