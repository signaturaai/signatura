/**
 * Access Control Module Tests (Phase 7.2)
 *
 * RALPH tests for feature access checks, usage limits, and subscription status.
 * Tests the kill switch behavior, tier-based access, and silent tracking.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  checkFeatureAccess,
  checkUsageLimit,
  incrementUsage,
  getSubscriptionStatus,
  isAdmin,
  type FeatureKey,
  type ResourceKey,
} from '@/lib/subscription/access-control'

// ============================================================================
// Mock isSubscriptionEnabled
// ============================================================================

let mockSubscriptionEnabled = false

vi.mock('@/lib/subscription/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/subscription/config')>()
  return {
    ...actual,
    isSubscriptionEnabled: () => mockSubscriptionEnabled,
  }
})

// ============================================================================
// Mock Supabase Client Factory
// ============================================================================

interface MockOptions {
  subscriptionData?: Record<string, unknown> | null
  subscriptionError?: { code: string; message: string } | null
  updateError?: { message: string } | null
  insertError?: { message: string } | null
  rpcError?: { code: string; message: string } | null
  snapshotData?: Record<string, unknown> | null
  profileData?: Record<string, unknown> | null
  profileError?: { code: string; message: string } | null
}

function createMockSupabase(options: MockOptions = {}) {
  const {
    subscriptionData = null,
    subscriptionError = null,
    updateError = null,
    insertError = null,
    rpcError = null,
    snapshotData = null,
    profileData = null,
    profileError = null,
  } = options

  const updateCalls: Record<string, unknown>[] = []
  const insertCalls: Record<string, unknown>[] = []
  const rpcCalls: { name: string; params: unknown }[] = []

  const createBuilder = (tableName: string) => {
    if (tableName === 'profiles') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: profileData,
              error: profileError,
            }),
          }),
        }),
      }
    }

    return {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockImplementation((data: Record<string, unknown>) => {
        insertCalls.push(data)
        return Promise.resolve({ error: insertError })
      }),
      update: vi.fn().mockImplementation((data: Record<string, unknown>) => {
        updateCalls.push(data)
        return {
          eq: vi.fn().mockResolvedValue({ error: updateError }),
        }
      }),
      eq: vi.fn().mockImplementation(() => {
        return {
          single: vi.fn().mockResolvedValue({
            data: subscriptionData,
            error: subscriptionError,
          }),
          eq: vi.fn().mockResolvedValue({
            data: snapshotData,
            error: null,
          }),
        }
      }),
      single: vi.fn().mockResolvedValue({
        data: subscriptionData,
        error: subscriptionError,
      }),
    }
  }

  return {
    from: vi.fn().mockImplementation((tableName: string) => createBuilder(tableName)),
    rpc: vi.fn().mockImplementation((name: string, params: unknown) => {
      rpcCalls.push({ name, params })
      return Promise.resolve({ error: rpcError })
    }),
    _getUpdateCalls: () => updateCalls,
    _getInsertCalls: () => insertCalls,
    _getRpcCalls: () => rpcCalls,
  }
}

// ============================================================================
// Test Data
// ============================================================================

function createMockSubscriptionRow(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date('2026-02-15T10:00:00Z')
  const periodEnd = new Date('2026-03-15T10:00:00Z')

  return {
    id: 'sub-123',
    user_id: 'user-abc',
    tier: 'momentum',
    billing_period: 'monthly',
    status: 'active',
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    cancelled_at: null,
    cancellation_effective_at: null,
    scheduled_tier: null,
    scheduled_billing_period: null,
    grow_transaction_token: null,
    grow_recurring_id: null,
    grow_last_transaction_code: null,
    morning_customer_id: null,
    usage_applications: 5,
    usage_cvs: 3,
    usage_interviews: 2,
    usage_compensation: 1,
    usage_contracts: 0,
    usage_ai_avatar_interviews: 0,
    last_reset_at: now.toISOString(),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    ...overrides,
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('Access Control', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-15T10:00:00Z'))
    mockSubscriptionEnabled = false
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ==========================================================================
  // checkFeatureAccess Tests
  // ==========================================================================

  describe('checkFeatureAccess', () => {
    describe('Kill switch OFF', () => {
      it('should return allowed=true, enforced=false when kill switch is OFF', async () => {
        mockSubscriptionEnabled = false
        const supabase = createMockSupabase()

        const result = await checkFeatureAccess(
          supabase as unknown as Parameters<typeof checkFeatureAccess>[0],
          'user-123',
          'applicationTracker'
        )

        expect(result.allowed).toBe(true)
        expect(result.enforced).toBe(false)
        expect(result.reason).toBeUndefined()
      })

      it('should NOT query user_subscriptions when kill switch is OFF (non-admin)', async () => {
        mockSubscriptionEnabled = false
        const supabase = createMockSupabase({
          profileData: { role: 'user', is_admin: false },
        })

        await checkFeatureAccess(
          supabase as unknown as Parameters<typeof checkFeatureAccess>[0],
          'user-123',
          'applicationTracker'
        )

        // Should query profiles (admin check) but NOT user_subscriptions
        const calls = supabase.from.mock.calls.map((c: string[]) => c[0])
        expect(calls).toContain('profiles')
        expect(calls).not.toContain('user_subscriptions')
      })
    })

    describe('Kill switch ON + No subscription', () => {
      it('should return NO_SUBSCRIPTION when no row exists', async () => {
        mockSubscriptionEnabled = true
        const supabase = createMockSupabase({
          subscriptionError: { code: 'PGRST116', message: 'Not found' },
        })

        const result = await checkFeatureAccess(
          supabase as unknown as Parameters<typeof checkFeatureAccess>[0],
          'user-123',
          'applicationTracker'
        )

        expect(result.allowed).toBe(false)
        expect(result.enforced).toBe(true)
        expect(result.reason).toBe('NO_SUBSCRIPTION')
        expect(result.tier).toBeNull()
      })

      it('should return NO_SUBSCRIPTION when tier is null', async () => {
        mockSubscriptionEnabled = true
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({ tier: null }),
        })

        const result = await checkFeatureAccess(
          supabase as unknown as Parameters<typeof checkFeatureAccess>[0],
          'user-123',
          'applicationTracker'
        )

        expect(result.allowed).toBe(false)
        expect(result.reason).toBe('NO_SUBSCRIPTION')
      })
    })

    describe('Kill switch ON + Subscription status issues', () => {
      it('should return SUBSCRIPTION_EXPIRED when status is expired', async () => {
        mockSubscriptionEnabled = true
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({ status: 'expired' }),
        })

        const result = await checkFeatureAccess(
          supabase as unknown as Parameters<typeof checkFeatureAccess>[0],
          'user-123',
          'applicationTracker'
        )

        expect(result.allowed).toBe(false)
        expect(result.reason).toBe('SUBSCRIPTION_EXPIRED')
        expect(result.tier).toBe('momentum')
      })

      it('should return PAST_DUE_GRACE_EXCEEDED when past_due beyond grace period', async () => {
        mockSubscriptionEnabled = true
        // Set period end 5 days ago (beyond 3-day grace)
        const periodEnd = new Date('2026-02-10T10:00:00Z')
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({
            status: 'past_due',
            current_period_end: periodEnd.toISOString(),
          }),
        })

        const result = await checkFeatureAccess(
          supabase as unknown as Parameters<typeof checkFeatureAccess>[0],
          'user-123',
          'applicationTracker'
        )

        expect(result.allowed).toBe(false)
        expect(result.reason).toBe('PAST_DUE_GRACE_EXCEEDED')
      })

      it('should allow access when past_due within grace period', async () => {
        mockSubscriptionEnabled = true
        // Set period end 2 days ago (within 3-day grace)
        const periodEnd = new Date('2026-02-13T10:00:00Z')
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({
            status: 'past_due',
            current_period_end: periodEnd.toISOString(),
          }),
        })

        const result = await checkFeatureAccess(
          supabase as unknown as Parameters<typeof checkFeatureAccess>[0],
          'user-123',
          'applicationTracker'
        )

        expect(result.allowed).toBe(true)
        expect(result.enforced).toBe(true)
      })
    })

    describe('Kill switch ON + Feature checks', () => {
      it('should allow access to included feature', async () => {
        mockSubscriptionEnabled = true
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({ tier: 'momentum' }),
        })

        const result = await checkFeatureAccess(
          supabase as unknown as Parameters<typeof checkFeatureAccess>[0],
          'user-123',
          'applicationTracker'
        )

        expect(result.allowed).toBe(true)
        expect(result.enforced).toBe(true)
        expect(result.tier).toBe('momentum')
      })

      it('should deny access to non-included feature (aiAvatarInterviews for momentum)', async () => {
        mockSubscriptionEnabled = true
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({ tier: 'momentum' }),
        })

        const result = await checkFeatureAccess(
          supabase as unknown as Parameters<typeof checkFeatureAccess>[0],
          'user-123',
          'aiAvatarInterviews'
        )

        expect(result.allowed).toBe(false)
        expect(result.enforced).toBe(true)
        expect(result.reason).toBe('FEATURE_NOT_INCLUDED')
      })

      it('Momentum has applicationTracker=true (included feature)', async () => {
        mockSubscriptionEnabled = true
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({ tier: 'momentum' }),
        })

        const result = await checkFeatureAccess(
          supabase as unknown as Parameters<typeof checkFeatureAccess>[0],
          'user-123',
          'applicationTracker'
        )

        expect(result.allowed).toBe(true)
        expect(result.enforced).toBe(true)
        expect(result.tier).toBe('momentum')
      })

      it('should allow aiAvatarInterviews for accelerate tier', async () => {
        mockSubscriptionEnabled = true
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({ tier: 'accelerate' }),
        })

        const result = await checkFeatureAccess(
          supabase as unknown as Parameters<typeof checkFeatureAccess>[0],
          'user-123',
          'aiAvatarInterviews'
        )

        expect(result.allowed).toBe(true)
        expect(result.tier).toBe('accelerate')
      })

      it('should allow aiAvatarInterviews for elite tier', async () => {
        mockSubscriptionEnabled = true
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({ tier: 'elite' }),
        })

        const result = await checkFeatureAccess(
          supabase as unknown as Parameters<typeof checkFeatureAccess>[0],
          'user-123',
          'aiAvatarInterviews'
        )

        expect(result.allowed).toBe(true)
        expect(result.tier).toBe('elite')
      })
    })

    describe('Error handling', () => {
      it('should throw on unexpected database error', async () => {
        mockSubscriptionEnabled = true
        const supabase = createMockSupabase({
          subscriptionError: { code: 'UNEXPECTED', message: 'Connection failed' },
        })

        await expect(
          checkFeatureAccess(
            supabase as unknown as Parameters<typeof checkFeatureAccess>[0],
            'user-123',
            'applicationTracker'
          )
        ).rejects.toThrow('Database error: Connection failed')
      })
    })
  })

  // ==========================================================================
  // checkUsageLimit Tests
  // ==========================================================================

  describe('checkUsageLimit', () => {
    describe('Kill switch OFF', () => {
      it('should return allowed=true, unlimited=true, enforced=false when kill switch OFF', async () => {
        mockSubscriptionEnabled = false
        const supabase = createMockSupabase()

        const result = await checkUsageLimit(
          supabase as unknown as Parameters<typeof checkUsageLimit>[0],
          'user-123',
          'applications'
        )

        expect(result.allowed).toBe(true)
        expect(result.enforced).toBe(false)
        expect(result.unlimited).toBe(true)
      })

      it('should NOT query user_subscriptions when kill switch is OFF (non-admin)', async () => {
        mockSubscriptionEnabled = false
        const supabase = createMockSupabase({
          profileData: { role: 'user', is_admin: false },
        })

        await checkUsageLimit(
          supabase as unknown as Parameters<typeof checkUsageLimit>[0],
          'user-123',
          'applications'
        )

        // Should query profiles (admin check) but NOT user_subscriptions
        const calls = supabase.from.mock.calls.map((c: string[]) => c[0])
        expect(calls).toContain('profiles')
        expect(calls).not.toContain('user_subscriptions')
      })
    })

    describe('Kill switch ON + No subscription', () => {
      it('should return NO_SUBSCRIPTION when no row exists', async () => {
        mockSubscriptionEnabled = true
        const supabase = createMockSupabase({
          subscriptionError: { code: 'PGRST116', message: 'Not found' },
        })

        const result = await checkUsageLimit(
          supabase as unknown as Parameters<typeof checkUsageLimit>[0],
          'user-123',
          'applications'
        )

        expect(result.allowed).toBe(false)
        expect(result.enforced).toBe(true)
        expect(result.unlimited).toBe(false)
        expect(result.reason).toBe('NO_SUBSCRIPTION')
      })

      it('should return NO_SUBSCRIPTION when tier is null', async () => {
        mockSubscriptionEnabled = true
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({ tier: null }),
        })

        const result = await checkUsageLimit(
          supabase as unknown as Parameters<typeof checkUsageLimit>[0],
          'user-123',
          'applications'
        )

        expect(result.allowed).toBe(false)
        expect(result.reason).toBe('NO_SUBSCRIPTION')
      })
    })

    describe('Kill switch ON + Usage within limits', () => {
      it('should return allowed=true when usage is below limit', async () => {
        mockSubscriptionEnabled = true
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({
            tier: 'momentum',
            usage_applications: 5, // limit is 8
          }),
        })

        const result = await checkUsageLimit(
          supabase as unknown as Parameters<typeof checkUsageLimit>[0],
          'user-123',
          'applications'
        )

        expect(result.allowed).toBe(true)
        expect(result.enforced).toBe(true)
        expect(result.unlimited).toBe(false)
        expect(result.used).toBe(5)
        expect(result.limit).toBe(8)
        expect(result.remaining).toBe(3)
      })

      it('should return allowed=true when usage is at limit-1', async () => {
        mockSubscriptionEnabled = true
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({
            tier: 'momentum',
            usage_applications: 7, // limit is 8
          }),
        })

        const result = await checkUsageLimit(
          supabase as unknown as Parameters<typeof checkUsageLimit>[0],
          'user-123',
          'applications'
        )

        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(1)
      })
    })

    describe('Kill switch ON + Usage at/over limit', () => {
      it('should return LIMIT_EXCEEDED when usage equals limit', async () => {
        mockSubscriptionEnabled = true
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({
            tier: 'momentum',
            usage_applications: 8, // limit is 8
          }),
        })

        const result = await checkUsageLimit(
          supabase as unknown as Parameters<typeof checkUsageLimit>[0],
          'user-123',
          'applications'
        )

        expect(result.allowed).toBe(false)
        expect(result.reason).toBe('LIMIT_EXCEEDED')
        expect(result.used).toBe(8)
        expect(result.limit).toBe(8)
        expect(result.remaining).toBe(0)
      })

      it('should return LIMIT_EXCEEDED when usage exceeds limit', async () => {
        mockSubscriptionEnabled = true
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({
            tier: 'momentum',
            usage_applications: 10, // limit is 8
          }),
        })

        const result = await checkUsageLimit(
          supabase as unknown as Parameters<typeof checkUsageLimit>[0],
          'user-123',
          'applications'
        )

        expect(result.allowed).toBe(false)
        expect(result.reason).toBe('LIMIT_EXCEEDED')
        expect(result.remaining).toBe(0)
      })
    })

    describe('Kill switch ON + Unlimited resources', () => {
      it('should return unlimited=true for elite tier applications (limit=-1)', async () => {
        mockSubscriptionEnabled = true
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({
            tier: 'elite',
            usage_applications: 100,
          }),
        })

        const result = await checkUsageLimit(
          supabase as unknown as Parameters<typeof checkUsageLimit>[0],
          'user-123',
          'applications'
        )

        expect(result.allowed).toBe(true)
        expect(result.unlimited).toBe(true)
        expect(result.limit).toBe(-1)
        expect(result.remaining).toBe(-1)
        expect(result.used).toBe(100)
      })

      it('should enforce limits for aiAvatarInterviews even for elite (limit=10)', async () => {
        mockSubscriptionEnabled = true
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({
            tier: 'elite',
            usage_ai_avatar_interviews: 10,
          }),
        })

        const result = await checkUsageLimit(
          supabase as unknown as Parameters<typeof checkUsageLimit>[0],
          'user-123',
          'aiAvatarInterviews'
        )

        expect(result.allowed).toBe(false)
        expect(result.unlimited).toBe(false)
        expect(result.reason).toBe('LIMIT_EXCEEDED')
        expect(result.limit).toBe(10)
      })
    })

    describe('Resource mapping', () => {
      const testCases: Array<{ resource: ResourceKey; column: string }> = [
        { resource: 'applications', column: 'usage_applications' },
        { resource: 'cvs', column: 'usage_cvs' },
        { resource: 'interviews', column: 'usage_interviews' },
        { resource: 'compensation', column: 'usage_compensation' },
        { resource: 'contracts', column: 'usage_contracts' },
        { resource: 'aiAvatarInterviews', column: 'usage_ai_avatar_interviews' },
      ]

      testCases.forEach(({ resource, column }) => {
        it(`should correctly map ${resource} to ${column}`, async () => {
          mockSubscriptionEnabled = true
          const supabase = createMockSupabase({
            subscriptionData: createMockSubscriptionRow({
              tier: 'momentum',
              [column]: 5,
            }),
          })

          const result = await checkUsageLimit(
            supabase as unknown as Parameters<typeof checkUsageLimit>[0],
            'user-123',
            resource
          )

          expect(result.used).toBe(5)
        })
      })
    })

    describe('Status checks', () => {
      it('should return SUBSCRIPTION_EXPIRED when status is expired', async () => {
        mockSubscriptionEnabled = true
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({ status: 'expired' }),
        })

        const result = await checkUsageLimit(
          supabase as unknown as Parameters<typeof checkUsageLimit>[0],
          'user-123',
          'applications'
        )

        expect(result.allowed).toBe(false)
        expect(result.reason).toBe('SUBSCRIPTION_EXPIRED')
      })

      it('should return PAST_DUE_GRACE_EXCEEDED when past_due beyond grace', async () => {
        mockSubscriptionEnabled = true
        const periodEnd = new Date('2026-02-10T10:00:00Z')
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({
            status: 'past_due',
            current_period_end: periodEnd.toISOString(),
          }),
        })

        const result = await checkUsageLimit(
          supabase as unknown as Parameters<typeof checkUsageLimit>[0],
          'user-123',
          'applications'
        )

        expect(result.allowed).toBe(false)
        expect(result.reason).toBe('PAST_DUE_GRACE_EXCEEDED')
      })
    })
  })

  // ==========================================================================
  // incrementUsage Tests
  // ==========================================================================

  describe('incrementUsage', () => {
    describe('Always runs regardless of kill switch', () => {
      it('should increment usage when kill switch is OFF', async () => {
        mockSubscriptionEnabled = false
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({ usage_applications: 5 }),
        })

        const result = await incrementUsage(
          supabase as unknown as Parameters<typeof incrementUsage>[0],
          'user-123',
          'applications'
        )

        expect(result.newCount).toBe(6)
      })

      it('should increment usage when kill switch is ON', async () => {
        mockSubscriptionEnabled = true
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({ usage_applications: 5 }),
        })

        const result = await incrementUsage(
          supabase as unknown as Parameters<typeof incrementUsage>[0],
          'user-123',
          'applications'
        )

        expect(result.newCount).toBe(6)
      })
    })

    describe('Counter increments', () => {
      it('should increment from 0 to 1', async () => {
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({ usage_applications: 0 }),
        })

        const result = await incrementUsage(
          supabase as unknown as Parameters<typeof incrementUsage>[0],
          'user-123',
          'applications'
        )

        expect(result.newCount).toBe(1)
      })

      it('should call update with incremented value', async () => {
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({ usage_applications: 5 }),
        })

        await incrementUsage(
          supabase as unknown as Parameters<typeof incrementUsage>[0],
          'user-123',
          'applications'
        )

        const updateCalls = supabase._getUpdateCalls()
        expect(updateCalls).toHaveLength(1)
        expect(updateCalls[0]).toEqual({ usage_applications: 6 })
      })
    })

    describe('Creates tracking row if none exists', () => {
      it('should create new row when no subscription exists', async () => {
        const supabase = createMockSupabase({
          subscriptionError: { code: 'PGRST116', message: 'Not found' },
        })

        const result = await incrementUsage(
          supabase as unknown as Parameters<typeof incrementUsage>[0],
          'user-123',
          'applications'
        )

        expect(result.newCount).toBe(1)
        const insertCalls = supabase._getInsertCalls()
        expect(insertCalls).toHaveLength(1)
        expect(insertCalls[0]).toMatchObject({
          user_id: 'user-123',
          tier: null,
          billing_period: null,
          status: 'active',
          usage_applications: 1,
        })
      })
    })

    describe('Monthly snapshot upsert', () => {
      it('should call RPC for snapshot upsert', async () => {
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({
            tier: 'momentum',
            usage_applications: 5,
          }),
        })

        await incrementUsage(
          supabase as unknown as Parameters<typeof incrementUsage>[0],
          'user-123',
          'applications'
        )

        const rpcCalls = supabase._getRpcCalls()
        expect(rpcCalls).toHaveLength(1)
        expect(rpcCalls[0].name).toBe('upsert_usage_snapshot')
        expect(rpcCalls[0].params).toMatchObject({
          p_user_id: 'user-123',
          p_month: '2026-02-01',
          p_column: 'usage_applications',
          p_tier: 'momentum',
        })
      })

      it('should use null tier for tracking-only rows', async () => {
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({
            tier: null,
            usage_applications: 5,
          }),
        })

        await incrementUsage(
          supabase as unknown as Parameters<typeof incrementUsage>[0],
          'user-123',
          'applications'
        )

        const rpcCalls = supabase._getRpcCalls()
        expect(rpcCalls[0].params).toMatchObject({ p_tier: null })
      })
    })

    describe('Resource column mapping', () => {
      const testCases: Array<{ resource: ResourceKey; column: string }> = [
        { resource: 'applications', column: 'usage_applications' },
        { resource: 'cvs', column: 'usage_cvs' },
        { resource: 'interviews', column: 'usage_interviews' },
        { resource: 'compensation', column: 'usage_compensation' },
        { resource: 'contracts', column: 'usage_contracts' },
        { resource: 'aiAvatarInterviews', column: 'usage_ai_avatar_interviews' },
      ]

      testCases.forEach(({ resource, column }) => {
        it(`should update ${column} for resource ${resource}`, async () => {
          const supabase = createMockSupabase({
            subscriptionData: createMockSubscriptionRow({ [column]: 10 }),
          })

          await incrementUsage(
            supabase as unknown as Parameters<typeof incrementUsage>[0],
            'user-123',
            resource
          )

          const updateCalls = supabase._getUpdateCalls()
          expect(updateCalls[0]).toHaveProperty(column, 11)
        })
      })
    })

    describe('Error handling', () => {
      it('should throw on unexpected database error', async () => {
        const supabase = createMockSupabase({
          subscriptionError: { code: 'UNEXPECTED', message: 'Connection failed' },
        })

        await expect(
          incrementUsage(
            supabase as unknown as Parameters<typeof incrementUsage>[0],
            'user-123',
            'applications'
          )
        ).rejects.toThrow('Database error: Connection failed')
      })

      it('should throw on update error', async () => {
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow(),
          updateError: { message: 'Update failed' },
        })

        await expect(
          incrementUsage(
            supabase as unknown as Parameters<typeof incrementUsage>[0],
            'user-123',
            'applications'
          )
        ).rejects.toThrow('Failed to update usage: Update failed')
      })
    })
  })

  // ==========================================================================
  // getSubscriptionStatus Tests
  // ==========================================================================

  describe('getSubscriptionStatus', () => {
    describe('Returns real data regardless of kill switch', () => {
      it('should include subscriptionEnabled=false when kill switch is OFF', async () => {
        mockSubscriptionEnabled = false
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow(),
        })

        const result = await getSubscriptionStatus(
          supabase as unknown as Parameters<typeof getSubscriptionStatus>[0],
          'user-123'
        )

        expect(result.subscriptionEnabled).toBe(false)
        expect(result.hasSubscription).toBe(true)
        expect(result.tier).toBe('momentum')
      })

      it('should include subscriptionEnabled=true when kill switch is ON', async () => {
        mockSubscriptionEnabled = true
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow(),
        })

        const result = await getSubscriptionStatus(
          supabase as unknown as Parameters<typeof getSubscriptionStatus>[0],
          'user-123'
        )

        expect(result.subscriptionEnabled).toBe(true)
      })
    })

    describe('No subscription', () => {
      it('should return hasSubscription=false when no row exists', async () => {
        const supabase = createMockSupabase({
          subscriptionError: { code: 'PGRST116', message: 'Not found' },
        })

        const result = await getSubscriptionStatus(
          supabase as unknown as Parameters<typeof getSubscriptionStatus>[0],
          'user-123'
        )

        expect(result.hasSubscription).toBe(false)
        expect(result.tier).toBeNull()
        expect(result.billingPeriod).toBeNull()
        expect(result.status).toBeNull()
        expect(result.features).toBeNull()
      })

      it('should return empty usage with unlimited flags', async () => {
        const supabase = createMockSupabase({
          subscriptionError: { code: 'PGRST116', message: 'Not found' },
        })

        const result = await getSubscriptionStatus(
          supabase as unknown as Parameters<typeof getSubscriptionStatus>[0],
          'user-123'
        )

        expect(result.usage.applications.used).toBe(0)
        expect(result.usage.applications.unlimited).toBe(true)
        expect(result.usage.applications.limit).toBe(-1)
      })
    })

    describe('Active subscription', () => {
      it('should return all subscription fields', async () => {
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow(),
        })

        const result = await getSubscriptionStatus(
          supabase as unknown as Parameters<typeof getSubscriptionStatus>[0],
          'user-123'
        )

        expect(result.hasSubscription).toBe(true)
        expect(result.tier).toBe('momentum')
        expect(result.billingPeriod).toBe('monthly')
        expect(result.status).toBe('active')
        expect(result.currentPeriodStart).not.toBeNull()
        expect(result.currentPeriodEnd).not.toBeNull()
      })

      it('should include features map for tier', async () => {
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({ tier: 'accelerate' }),
        })

        const result = await getSubscriptionStatus(
          supabase as unknown as Parameters<typeof getSubscriptionStatus>[0],
          'user-123'
        )

        expect(result.features).not.toBeNull()
        expect(result.features?.applicationTracker).toBe(true)
        expect(result.features?.aiAvatarInterviews).toBe(true)
      })
    })

    describe('Usage summary', () => {
      it('should include all 6 resource usage summaries', async () => {
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({
            tier: 'momentum',
            usage_applications: 5,
            usage_cvs: 3,
            usage_interviews: 2,
            usage_compensation: 1,
            usage_contracts: 0,
            usage_ai_avatar_interviews: 0,
          }),
        })

        const result = await getSubscriptionStatus(
          supabase as unknown as Parameters<typeof getSubscriptionStatus>[0],
          'user-123'
        )

        expect(result.usage.applications.used).toBe(5)
        expect(result.usage.applications.limit).toBe(8)
        expect(result.usage.applications.remaining).toBe(3)
        expect(result.usage.applications.percentUsed).toBe(63) // 5/8 = 62.5 → 63

        expect(result.usage.cvs.used).toBe(3)
        expect(result.usage.interviews.used).toBe(2)
        expect(result.usage.compensation.used).toBe(1)
        expect(result.usage.contracts.used).toBe(0)
        expect(result.usage.aiAvatarInterviews.used).toBe(0)
      })

      it('should return full usage summary for accelerate with percentUsed', async () => {
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({
            tier: 'accelerate',
            usage_applications: 7, // 7/15 = 46.67%
          }),
        })

        const result = await getSubscriptionStatus(
          supabase as unknown as Parameters<typeof getSubscriptionStatus>[0],
          'user-123'
        )

        expect(result.usage.applications.used).toBe(7)
        expect(result.usage.applications.limit).toBe(15)
        expect(result.usage.applications.remaining).toBe(8)
        expect(result.usage.applications.percentUsed).toBe(47) // 7/15 = 46.67 → 47
        expect(result.usage.applications.unlimited).toBe(false)
      })

      it('should mark unlimited resources correctly', async () => {
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({
            tier: 'elite',
            usage_applications: 50,
          }),
        })

        const result = await getSubscriptionStatus(
          supabase as unknown as Parameters<typeof getSubscriptionStatus>[0],
          'user-123'
        )

        expect(result.usage.applications.unlimited).toBe(true)
        expect(result.usage.applications.limit).toBe(-1)
        expect(result.usage.applications.remaining).toBe(-1)
        expect(result.usage.applications.percentUsed).toBe(0)
      })
    })

    describe('UI flags', () => {
      it('should set isCancelled=true when status is cancelled', async () => {
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({
            status: 'cancelled',
            cancelled_at: '2026-02-10T10:00:00Z',
          }),
        })

        const result = await getSubscriptionStatus(
          supabase as unknown as Parameters<typeof getSubscriptionStatus>[0],
          'user-123'
        )

        expect(result.isCancelled).toBe(true)
      })

      it('should set isPastDue=true when status is past_due', async () => {
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({ status: 'past_due' }),
        })

        const result = await getSubscriptionStatus(
          supabase as unknown as Parameters<typeof getSubscriptionStatus>[0],
          'user-123'
        )

        expect(result.isPastDue).toBe(true)
      })

      it('should set isExpired=true when status is expired', async () => {
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({ status: 'expired' }),
        })

        const result = await getSubscriptionStatus(
          supabase as unknown as Parameters<typeof getSubscriptionStatus>[0],
          'user-123'
        )

        expect(result.isExpired).toBe(true)
      })

      it('should set canUpgrade=true for active momentum subscription', async () => {
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({ tier: 'momentum', status: 'active' }),
        })

        const result = await getSubscriptionStatus(
          supabase as unknown as Parameters<typeof getSubscriptionStatus>[0],
          'user-123'
        )

        expect(result.canUpgrade).toBe(true)
        expect(result.canDowngrade).toBe(false)
      })

      it('should set canDowngrade=true for active elite subscription', async () => {
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({ tier: 'elite', status: 'active' }),
        })

        const result = await getSubscriptionStatus(
          supabase as unknown as Parameters<typeof getSubscriptionStatus>[0],
          'user-123'
        )

        expect(result.canUpgrade).toBe(false)
        expect(result.canDowngrade).toBe(true)
      })

      it('should set canUpgrade=false for cancelled subscription', async () => {
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({
            tier: 'momentum',
            status: 'cancelled',
          }),
        })

        const result = await getSubscriptionStatus(
          supabase as unknown as Parameters<typeof getSubscriptionStatus>[0],
          'user-123'
        )

        expect(result.canUpgrade).toBe(false)
      })
    })

    describe('Scheduled changes', () => {
      it('should include scheduledTierChange when present', async () => {
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({
            scheduled_tier: 'accelerate',
          }),
        })

        const result = await getSubscriptionStatus(
          supabase as unknown as Parameters<typeof getSubscriptionStatus>[0],
          'user-123'
        )

        expect(result.scheduledTierChange).toBe('accelerate')
      })

      it('should include scheduledBillingPeriodChange when present', async () => {
        const supabase = createMockSupabase({
          subscriptionData: createMockSubscriptionRow({
            scheduled_billing_period: 'yearly',
          }),
        })

        const result = await getSubscriptionStatus(
          supabase as unknown as Parameters<typeof getSubscriptionStatus>[0],
          'user-123'
        )

        expect(result.scheduledBillingPeriodChange).toBe('yearly')
      })
    })
  })

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('Integration: Split Pattern Usage', () => {
    it('check then increment pattern - allowed scenario', async () => {
      mockSubscriptionEnabled = true
      const supabase = createMockSupabase({
        subscriptionData: createMockSubscriptionRow({
          tier: 'momentum',
          usage_applications: 5,
        }),
      })

      // Step 1: Check if allowed
      const check = await checkUsageLimit(
        supabase as unknown as Parameters<typeof checkUsageLimit>[0],
        'user-123',
        'applications'
      )

      expect(check.allowed).toBe(true)

      // Step 2: If allowed, increment
      if (check.allowed) {
        const increment = await incrementUsage(
          supabase as unknown as Parameters<typeof incrementUsage>[0],
          'user-123',
          'applications'
        )
        expect(increment.newCount).toBe(6)
      }
    })

    it('check then increment pattern - denied scenario', async () => {
      mockSubscriptionEnabled = true
      const supabase = createMockSupabase({
        subscriptionData: createMockSubscriptionRow({
          tier: 'momentum',
          usage_applications: 8, // at limit
        }),
      })

      // Step 1: Check if allowed
      const check = await checkUsageLimit(
        supabase as unknown as Parameters<typeof checkUsageLimit>[0],
        'user-123',
        'applications'
      )

      expect(check.allowed).toBe(false)
      expect(check.reason).toBe('LIMIT_EXCEEDED')

      // Step 2: Don't increment if denied
      // (but increment always runs for tracking - this is the API route's decision)
    })
  })

  // ==========================================================================
  // Phase 14 Spec: Cancelled but within period
  // ==========================================================================

  describe('Cancelled but within period', () => {
    it('should allow feature access when cancelled but cancellation_effective_at is in the future', async () => {
      mockSubscriptionEnabled = true
      // Cancelled at Feb 10, but effective at Mar 15 (period end) - user still has access
      const supabase = createMockSupabase({
        subscriptionData: createMockSubscriptionRow({
          status: 'cancelled',
          cancelled_at: '2026-02-10T10:00:00Z',
          cancellation_effective_at: '2026-03-15T10:00:00Z', // Future date
        }),
      })

      const result = await checkFeatureAccess(
        supabase as unknown as Parameters<typeof checkFeatureAccess>[0],
        'user-123',
        'applicationTracker'
      )

      expect(result.allowed).toBe(true)
      expect(result.enforced).toBe(true)
      expect(result.tier).toBe('momentum')
    })

    it('should allow usage check when cancelled but within period', async () => {
      mockSubscriptionEnabled = true
      const supabase = createMockSupabase({
        subscriptionData: createMockSubscriptionRow({
          status: 'cancelled',
          cancelled_at: '2026-02-10T10:00:00Z',
          cancellation_effective_at: '2026-03-15T10:00:00Z',
          usage_applications: 5,
        }),
      })

      const result = await checkUsageLimit(
        supabase as unknown as Parameters<typeof checkUsageLimit>[0],
        'user-123',
        'applications'
      )

      expect(result.allowed).toBe(true)
      expect(result.enforced).toBe(true)
      expect(result.used).toBe(5)
      expect(result.limit).toBe(8)
    })
  })

  // ==========================================================================
  // Phase 14 Spec: Momentum tier limits
  // ==========================================================================

  describe('Momentum tier: Usage limit enforcement', () => {
    it('Momentum at 7/8 applications → allowed', async () => {
      mockSubscriptionEnabled = true
      const supabase = createMockSupabase({
        subscriptionData: createMockSubscriptionRow({
          tier: 'momentum',
          usage_applications: 7, // limit is 8
        }),
      })

      const result = await checkUsageLimit(
        supabase as unknown as Parameters<typeof checkUsageLimit>[0],
        'user-123',
        'applications'
      )

      expect(result.allowed).toBe(true)
      expect(result.used).toBe(7)
      expect(result.limit).toBe(8)
      expect(result.remaining).toBe(1)
    })

    it('Momentum at 8/8 applications → denied LIMIT_REACHED', async () => {
      mockSubscriptionEnabled = true
      const supabase = createMockSupabase({
        subscriptionData: createMockSubscriptionRow({
          tier: 'momentum',
          usage_applications: 8, // at limit
        }),
      })

      const result = await checkUsageLimit(
        supabase as unknown as Parameters<typeof checkUsageLimit>[0],
        'user-123',
        'applications'
      )

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('LIMIT_EXCEEDED')
      expect(result.used).toBe(8)
      expect(result.limit).toBe(8)
      expect(result.remaining).toBe(0)
    })

    it('Momentum at 0/0 aiAvatarInterviews → denied (limit is 0)', async () => {
      mockSubscriptionEnabled = true
      const supabase = createMockSupabase({
        subscriptionData: createMockSubscriptionRow({
          tier: 'momentum',
          usage_ai_avatar_interviews: 0, // 0 used, but limit is also 0
        }),
      })

      const result = await checkUsageLimit(
        supabase as unknown as Parameters<typeof checkUsageLimit>[0],
        'user-123',
        'aiAvatarInterviews'
      )

      // Even 0 used, limit is 0 → denied because Momentum has no AI avatar access
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('LIMIT_EXCEEDED')
      expect(result.used).toBe(0)
      expect(result.limit).toBe(0)
      expect(result.remaining).toBe(0)
    })
  })

  // ==========================================================================
  // Phase 14 Spec: Accelerate tier limits
  // ==========================================================================

  describe('Accelerate tier: Usage limit enforcement', () => {
    it('Accelerate has aiAvatarInterviews feature enabled', async () => {
      mockSubscriptionEnabled = true
      const supabase = createMockSupabase({
        subscriptionData: createMockSubscriptionRow({ tier: 'accelerate' }),
      })

      const result = await checkFeatureAccess(
        supabase as unknown as Parameters<typeof checkFeatureAccess>[0],
        'user-123',
        'aiAvatarInterviews'
      )

      expect(result.allowed).toBe(true)
      expect(result.tier).toBe('accelerate')
    })

    it('Accelerate at 14/15 applications → allowed', async () => {
      mockSubscriptionEnabled = true
      const supabase = createMockSupabase({
        subscriptionData: createMockSubscriptionRow({
          tier: 'accelerate',
          usage_applications: 14, // limit is 15
        }),
      })

      const result = await checkUsageLimit(
        supabase as unknown as Parameters<typeof checkUsageLimit>[0],
        'user-123',
        'applications'
      )

      expect(result.allowed).toBe(true)
      expect(result.used).toBe(14)
      expect(result.limit).toBe(15)
      expect(result.remaining).toBe(1)
    })
  })

  // ==========================================================================
  // Phase 14 Spec: Elite tier limits
  // ==========================================================================

  describe('Elite tier: Usage limit enforcement', () => {
    it('Elite has unlimited (-1) for applications', async () => {
      mockSubscriptionEnabled = true
      const supabase = createMockSupabase({
        subscriptionData: createMockSubscriptionRow({
          tier: 'elite',
          usage_applications: 9999, // huge usage but unlimited
        }),
      })

      const result = await checkUsageLimit(
        supabase as unknown as Parameters<typeof checkUsageLimit>[0],
        'user-123',
        'applications'
      )

      expect(result.allowed).toBe(true)
      expect(result.unlimited).toBe(true)
      expect(result.used).toBe(9999)
      expect(result.limit).toBe(-1)
    })

    it('Elite at 9/10 AI avatar → allowed', async () => {
      mockSubscriptionEnabled = true
      const supabase = createMockSupabase({
        subscriptionData: createMockSubscriptionRow({
          tier: 'elite',
          usage_ai_avatar_interviews: 9, // limit is 10
        }),
      })

      const result = await checkUsageLimit(
        supabase as unknown as Parameters<typeof checkUsageLimit>[0],
        'user-123',
        'aiAvatarInterviews'
      )

      expect(result.allowed).toBe(true)
      expect(result.used).toBe(9)
      expect(result.limit).toBe(10)
      expect(result.remaining).toBe(1)
    })

    it('Elite at 10/10 AI avatar → denied', async () => {
      mockSubscriptionEnabled = true
      const supabase = createMockSupabase({
        subscriptionData: createMockSubscriptionRow({
          tier: 'elite',
          usage_ai_avatar_interviews: 10, // at limit
        }),
      })

      const result = await checkUsageLimit(
        supabase as unknown as Parameters<typeof checkUsageLimit>[0],
        'user-123',
        'aiAvatarInterviews'
      )

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('LIMIT_EXCEEDED')
      expect(result.used).toBe(10)
      expect(result.limit).toBe(10)
      expect(result.remaining).toBe(0)
    })
  })

  // ==========================================================================
  // Phase 14 Spec: Accelerate AI avatar 5-limit enforcement
  // ==========================================================================

  describe('Accelerate tier: AI avatar 5-limit enforcement', () => {
    it('should allow aiAvatarInterviews when under limit (4 used, limit 5)', async () => {
      mockSubscriptionEnabled = true
      const supabase = createMockSupabase({
        subscriptionData: createMockSubscriptionRow({
          tier: 'accelerate',
          usage_ai_avatar_interviews: 4,
        }),
      })

      const result = await checkUsageLimit(
        supabase as unknown as Parameters<typeof checkUsageLimit>[0],
        'user-123',
        'aiAvatarInterviews'
      )

      expect(result.allowed).toBe(true)
      expect(result.used).toBe(4)
      expect(result.limit).toBe(5)
      expect(result.remaining).toBe(1)
    })

    it('should deny aiAvatarInterviews when at limit (5 used, limit 5)', async () => {
      mockSubscriptionEnabled = true
      const supabase = createMockSupabase({
        subscriptionData: createMockSubscriptionRow({
          tier: 'accelerate',
          usage_ai_avatar_interviews: 5,
        }),
      })

      const result = await checkUsageLimit(
        supabase as unknown as Parameters<typeof checkUsageLimit>[0],
        'user-123',
        'aiAvatarInterviews'
      )

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('LIMIT_EXCEEDED')
      expect(result.used).toBe(5)
      expect(result.limit).toBe(5)
      expect(result.remaining).toBe(0)
    })
  })

  describe('Type exports', () => {
    it('FeatureKey should cover all tier features', () => {
      const features: FeatureKey[] = [
        'applicationTracker',
        'tailoredCvs',
        'interviewCoach',
        'compensationSessions',
        'contractReviews',
        'aiAvatarInterviews',
      ]
      expect(features).toHaveLength(6)
    })

    it('ResourceKey should cover all usage counters', () => {
      const resources: ResourceKey[] = [
        'applications',
        'cvs',
        'interviews',
        'compensation',
        'contracts',
        'aiAvatarInterviews',
      ]
      expect(resources).toHaveLength(6)
    })
  })

  // ==========================================================================
  // Admin Bypass Tests
  // ==========================================================================

  describe('Admin Bypass', () => {
    describe('isAdmin helper', () => {
      it('should return true when profile role is admin', async () => {
        const supabase = createMockSupabase({
          profileData: { role: 'admin', is_admin: false },
        })

        const result = await isAdmin(
          supabase as unknown as Parameters<typeof isAdmin>[0],
          'user-admin'
        )

        expect(result).toBe(true)
      })

      it('should return true when profile is_admin is true (role != admin)', async () => {
        const supabase = createMockSupabase({
          profileData: { role: 'user', is_admin: true },
        })

        const result = await isAdmin(
          supabase as unknown as Parameters<typeof isAdmin>[0],
          'user-admin'
        )

        expect(result).toBe(true)
      })

      it('should return true when BOTH role=admin AND is_admin=true', async () => {
        const supabase = createMockSupabase({
          profileData: { role: 'admin', is_admin: true },
        })

        const result = await isAdmin(
          supabase as unknown as Parameters<typeof isAdmin>[0],
          'user-admin'
        )

        expect(result).toBe(true)
      })

      it('should return false for non-admin user', async () => {
        const supabase = createMockSupabase({
          profileData: { role: 'user', is_admin: false },
        })

        const result = await isAdmin(
          supabase as unknown as Parameters<typeof isAdmin>[0],
          'user-regular'
        )

        expect(result).toBe(false)
      })

      it('should return false when profile not found', async () => {
        const supabase = createMockSupabase({
          profileError: { code: 'PGRST116', message: 'Not found' },
        })

        const result = await isAdmin(
          supabase as unknown as Parameters<typeof isAdmin>[0],
          'user-missing'
        )

        expect(result).toBe(false)
      })
    })

    describe('checkFeatureAccess with admin', () => {
      it('should allow admin with kill switch OFF, adminBypass=true', async () => {
        mockSubscriptionEnabled = false
        const supabase = createMockSupabase({
          profileData: { role: 'admin', is_admin: false },
        })

        const result = await checkFeatureAccess(
          supabase as unknown as Parameters<typeof checkFeatureAccess>[0],
          'user-admin',
          'applicationTracker'
        )

        expect(result.allowed).toBe(true)
        expect(result.adminBypass).toBe(true)
      })

      it('should allow admin with kill switch ON + tier=NULL, adminBypass=true', async () => {
        mockSubscriptionEnabled = true
        const supabase = createMockSupabase({
          profileData: { role: 'admin', is_admin: true },
          subscriptionData: createMockSubscriptionRow({ tier: null }),
        })

        const result = await checkFeatureAccess(
          supabase as unknown as Parameters<typeof checkFeatureAccess>[0],
          'user-admin',
          'applicationTracker'
        )

        expect(result.allowed).toBe(true)
        expect(result.adminBypass).toBe(true)
      })

      it('should allow admin with kill switch ON + no subscription record', async () => {
        mockSubscriptionEnabled = true
        const supabase = createMockSupabase({
          profileData: { role: 'admin', is_admin: false },
          subscriptionError: { code: 'PGRST116', message: 'Not found' },
        })

        const result = await checkFeatureAccess(
          supabase as unknown as Parameters<typeof checkFeatureAccess>[0],
          'user-admin',
          'aiAvatarInterviews'
        )

        expect(result.allowed).toBe(true)
        expect(result.adminBypass).toBe(true)
      })
    })

    describe('checkUsageLimit with admin', () => {
      it('should always allow admin, unlimited, adminBypass=true', async () => {
        mockSubscriptionEnabled = true
        const supabase = createMockSupabase({
          profileData: { role: 'admin', is_admin: true },
          subscriptionData: createMockSubscriptionRow({
            tier: 'momentum',
            usage_applications: 100, // way over limit
          }),
        })

        const result = await checkUsageLimit(
          supabase as unknown as Parameters<typeof checkUsageLimit>[0],
          'user-admin',
          'applications'
        )

        expect(result.allowed).toBe(true)
        expect(result.unlimited).toBe(true)
        expect(result.adminBypass).toBe(true)
      })

      it('admin bypasses even when kill switch ON + tier=NULL', async () => {
        mockSubscriptionEnabled = true
        const supabase = createMockSupabase({
          profileData: { role: 'admin', is_admin: false },
          subscriptionData: createMockSubscriptionRow({ tier: null }),
        })

        const result = await checkUsageLimit(
          supabase as unknown as Parameters<typeof checkUsageLimit>[0],
          'user-admin',
          'applications'
        )

        expect(result.allowed).toBe(true)
        expect(result.enforced).toBe(false)
        expect(result.unlimited).toBe(true)
        expect(result.adminBypass).toBe(true)
      })

      it('admin bypasses even when usage at limit (momentum tier, 8/8)', async () => {
        mockSubscriptionEnabled = true
        const supabase = createMockSupabase({
          profileData: { role: 'admin', is_admin: true },
          subscriptionData: createMockSubscriptionRow({
            tier: 'momentum',
            usage_applications: 8, // at limit for momentum
          }),
        })

        const result = await checkUsageLimit(
          supabase as unknown as Parameters<typeof checkUsageLimit>[0],
          'user-admin',
          'applications'
        )

        // Admin is never blocked
        expect(result.allowed).toBe(true)
        expect(result.adminBypass).toBe(true)
      })
    })

    describe('Non-admin + kill switch ON + tier=NULL', () => {
      it('should still block non-admin user with no subscription', async () => {
        mockSubscriptionEnabled = true
        const supabase = createMockSupabase({
          profileData: { role: 'user', is_admin: false },
          subscriptionData: createMockSubscriptionRow({ tier: null }),
        })

        const result = await checkFeatureAccess(
          supabase as unknown as Parameters<typeof checkFeatureAccess>[0],
          'user-regular',
          'applicationTracker'
        )

        expect(result.allowed).toBe(false)
        expect(result.reason).toBe('NO_SUBSCRIPTION')
        expect(result.adminBypass).toBeUndefined()
      })
    })

    describe('getSubscriptionStatus with admin', () => {
      it('should return virtual Elite with isAdmin=true for admin users', async () => {
        mockSubscriptionEnabled = true
        const supabase = createMockSupabase({
          profileData: { role: 'admin', is_admin: false },
        })

        const result = await getSubscriptionStatus(
          supabase as unknown as Parameters<typeof getSubscriptionStatus>[0],
          'user-admin'
        )

        expect(result.isAdmin).toBe(true)
        expect(result.tier).toBe('elite')
        expect(result.billingPeriod).toBe('yearly')
        expect(result.status).toBe('active')
        expect(result.hasSubscription).toBe(true)
        expect(result.canUpgrade).toBe(false)
        expect(result.canDowngrade).toBe(false)

        // All usage should be unlimited
        expect(result.usage.applications.unlimited).toBe(true)
        expect(result.usage.cvs.unlimited).toBe(true)
        expect(result.usage.interviews.unlimited).toBe(true)
        expect(result.usage.compensation.unlimited).toBe(true)
        expect(result.usage.contracts.unlimited).toBe(true)
        expect(result.usage.aiAvatarInterviews.unlimited).toBe(true)

        // Features should be elite features
        expect(result.features).not.toBeNull()
      })
    })
  })
})
