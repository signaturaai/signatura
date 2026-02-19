/**
 * Subscription Manager Tests (Phase 7.1)
 *
 * RALPH tests for subscription lifecycle management.
 * Tests business rules for activations, renewals, upgrades, downgrades, and cancellations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getSubscription,
  activateSubscription,
  renewSubscription,
  upgradeSubscription,
  scheduleDowngrade,
  cancelScheduledChange,
  cancelSubscription,
  handlePaymentFailure,
  processExpirations,
  type UserSubscription,
  type GrowPaymentData,
} from '@/lib/subscription/subscription-manager'

// ============================================================================
// Mock Supabase Client Factory
// ============================================================================

function createMockSupabase(options: {
  subscriptionData?: Record<string, unknown> | null
  subscriptionError?: { code: string; message: string } | null
  updateError?: { message: string } | null
  insertError?: { message: string } | null
  selectData?: unknown[]
  selectError?: { message: string } | null
} = {}) {
  const {
    subscriptionData = null,
    subscriptionError = null,
    updateError = null,
    insertError = null,
    selectData = [],
    selectError = null,
  } = options

  const updateCalls: Record<string, unknown>[] = []
  const upsertCalls: Record<string, unknown>[] = []
  const insertCalls: Record<string, unknown>[] = []

  const mockBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockImplementation((data: Record<string, unknown>) => {
      insertCalls.push(data)
      return Promise.resolve({ error: insertError })
    }),
    update: vi.fn().mockImplementation((data: Record<string, unknown>) => {
      updateCalls.push(data)
      return mockBuilder
    }),
    upsert: vi.fn().mockImplementation((data: Record<string, unknown>, opts?: unknown) => {
      upsertCalls.push(data)
      return Promise.resolve({ error: updateError })
    }),
    eq: vi.fn().mockImplementation(() => {
      return {
        single: vi.fn().mockResolvedValue({
          data: subscriptionData,
          error: subscriptionError,
        }),
        then: (resolve: (value: unknown) => void) => resolve({ error: updateError }),
        not: vi.fn().mockResolvedValue({ data: selectData, error: selectError }),
      }
    }),
    not: vi.fn().mockImplementation(() => {
      return Promise.resolve({ data: selectData, error: selectError })
    }),
    single: vi.fn().mockResolvedValue({
      data: subscriptionData,
      error: subscriptionError,
    }),
  }

  return {
    from: vi.fn().mockReturnValue(mockBuilder),
    _getUpdateCalls: () => updateCalls,
    _getUpsertCalls: () => upsertCalls,
    _getInsertCalls: () => insertCalls,
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
    scheduled_tier_change: null,
    scheduled_billing_period_change: null,
    grow_transaction_token: null,
    grow_recurring_id: null,
    grow_last_transaction_code: null,
    morning_customer_id: null,
    pending_tier: null,
    pending_billing_period: null,
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

describe('Subscription Manager', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-15T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ==========================================================================
  // getSubscription Tests
  // ==========================================================================

  describe('getSubscription', () => {
    it('should return null when no subscription exists', async () => {
      const supabase = createMockSupabase({
        subscriptionError: { code: 'PGRST116', message: 'Not found' },
      })

      const result = await getSubscription(supabase as never, 'user-123')

      expect(result).toBeNull()
    })

    it('should return UserSubscription when found', async () => {
      const mockRow = createMockSubscriptionRow()
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      const result = await getSubscription(supabase as never, 'user-abc')

      expect(result).not.toBeNull()
      expect(result?.userId).toBe('user-abc')
      expect(result?.tier).toBe('momentum')
      expect(result?.status).toBe('active')
    })

    it('should throw on unexpected database error', async () => {
      const supabase = createMockSupabase({
        subscriptionError: { code: 'OTHER', message: 'Database error' },
      })

      await expect(getSubscription(supabase as never, 'user-123')).rejects.toThrow(
        'Failed to get subscription'
      )
    })

    it('should convert snake_case to camelCase', async () => {
      const mockRow = createMockSubscriptionRow({
        current_period_start: '2026-02-01T00:00:00Z',
        current_period_end: '2026-03-01T00:00:00Z',
        last_reset_at: '2026-02-01T00:00:00Z',
      })
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      const result = await getSubscription(supabase as never, 'user-abc')

      expect(result?.currentPeriodStart).toBe('2026-02-01T00:00:00Z')
      expect(result?.currentPeriodEnd).toBe('2026-03-01T00:00:00Z')
      expect(result?.lastResetAt).toBe('2026-02-01T00:00:00Z')
    })
  })

  // ==========================================================================
  // activateSubscription Tests
  // ==========================================================================

  describe('activateSubscription', () => {
    it('should upsert with correct tier and billing period', async () => {
      const supabase = createMockSupabase()

      await activateSubscription(supabase as never, 'user-123', 'accelerate', 'quarterly')

      const upsertCalls = supabase._getUpsertCalls()
      expect(upsertCalls.length).toBeGreaterThan(0)
      expect(upsertCalls[0].tier).toBe('accelerate')
      expect(upsertCalls[0].billing_period).toBe('quarterly')
      expect(upsertCalls[0].status).toBe('active')
    })

    it('should set period dates correctly for monthly', async () => {
      const supabase = createMockSupabase()

      await activateSubscription(supabase as never, 'user-123', 'momentum', 'monthly')

      const upsertCalls = supabase._getUpsertCalls()
      expect(upsertCalls[0].current_period_start).toBe('2026-02-15T10:00:00.000Z')
      // Monthly should add 1 month
      expect(upsertCalls[0].current_period_end).toContain('2026-03-15')
    })

    it('should set period dates correctly for quarterly', async () => {
      const supabase = createMockSupabase()

      await activateSubscription(supabase as never, 'user-123', 'momentum', 'quarterly')

      const upsertCalls = supabase._getUpsertCalls()
      // Quarterly should add 3 months
      expect(upsertCalls[0].current_period_end).toContain('2026-05-15')
    })

    it('should set period dates correctly for yearly', async () => {
      const supabase = createMockSupabase()

      await activateSubscription(supabase as never, 'user-123', 'momentum', 'yearly')

      const upsertCalls = supabase._getUpsertCalls()
      // Yearly should add 12 months
      expect(upsertCalls[0].current_period_end).toContain('2027-02-15')
    })

    it('should reset ALL 6 usage counters to 0', async () => {
      const supabase = createMockSupabase()

      await activateSubscription(supabase as never, 'user-123', 'elite', 'yearly')

      const upsertCalls = supabase._getUpsertCalls()
      expect(upsertCalls[0].usage_applications).toBe(0)
      expect(upsertCalls[0].usage_cvs).toBe(0)
      expect(upsertCalls[0].usage_interviews).toBe(0)
      expect(upsertCalls[0].usage_compensation).toBe(0)
      expect(upsertCalls[0].usage_contracts).toBe(0)
      expect(upsertCalls[0].usage_ai_avatar_interviews).toBe(0)
    })

    it('should set last_reset_at to now', async () => {
      const supabase = createMockSupabase()

      await activateSubscription(supabase as never, 'user-123', 'momentum', 'monthly')

      const upsertCalls = supabase._getUpsertCalls()
      expect(upsertCalls[0].last_reset_at).toBe('2026-02-15T10:00:00.000Z')
    })

    it('should clear pending/scheduled/cancellation state', async () => {
      const supabase = createMockSupabase()

      await activateSubscription(supabase as never, 'user-123', 'momentum', 'monthly')

      const upsertCalls = supabase._getUpsertCalls()
      expect(upsertCalls[0].pending_tier).toBeNull()
      expect(upsertCalls[0].pending_billing_period).toBeNull()
      expect(upsertCalls[0].scheduled_tier_change).toBeNull()
      expect(upsertCalls[0].scheduled_billing_period_change).toBeNull()
      expect(upsertCalls[0].cancelled_at).toBeNull()
      expect(upsertCalls[0].cancellation_effective_at).toBeNull()
    })

    it('should include Grow payment data when provided', async () => {
      const supabase = createMockSupabase()
      const growData: GrowPaymentData = {
        transactionToken: 'token-abc',
        recurringId: 'rec-123',
        transactionCode: 'code-xyz',
      }

      await activateSubscription(supabase as never, 'user-123', 'momentum', 'monthly', growData)

      const upsertCalls = supabase._getUpsertCalls()
      expect(upsertCalls[0].grow_transaction_token).toBe('token-abc')
      expect(upsertCalls[0].grow_recurring_id).toBe('rec-123')
      expect(upsertCalls[0].grow_last_transaction_code).toBe('code-xyz')
    })

    it('should log payment_success event', async () => {
      const supabase = createMockSupabase()

      await activateSubscription(supabase as never, 'user-123', 'accelerate', 'monthly')

      expect(supabase.from).toHaveBeenCalledWith('subscription_events')
    })
  })

  // ==========================================================================
  // upgradeSubscription Tests
  // ==========================================================================

  describe('upgradeSubscription', () => {
    it('should throw if not actually an upgrade', async () => {
      const mockRow = createMockSubscriptionRow({ tier: 'elite' })
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      await expect(
        upgradeSubscription(supabase as never, 'user-abc', 'momentum')
      ).rejects.toThrow('momentum is not an upgrade from elite')
    })

    it('should calculate prorated charge correctly', async () => {
      // Period: Feb 1 to Mar 1 (28 days)
      // Today: Feb 15 (14 days remaining)
      const periodStart = new Date('2026-02-01T00:00:00Z')
      const periodEnd = new Date('2026-03-01T00:00:00Z')

      const mockRow = createMockSubscriptionRow({
        tier: 'momentum',
        billing_period: 'monthly',
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
      })
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      const result = await upgradeSubscription(supabase as never, 'user-abc', 'accelerate')

      // oldPrice = $12, newPrice = $18, diff = $6
      // totalDays = 28, remainingDays = 14
      // prorated = (6 / 28) * 14 = $3.00
      expect(result.proratedAmount).toBe(3)
    })

    it('should update tier IMMEDIATELY', async () => {
      const mockRow = createMockSubscriptionRow({ tier: 'momentum' })
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      await upgradeSubscription(supabase as never, 'user-abc', 'elite')

      const updateCalls = supabase._getUpdateCalls()
      expect(updateCalls.length).toBeGreaterThan(0)
      expect(updateCalls[0].tier).toBe('elite')
    })

    it('should NOT change period dates on upgrade', async () => {
      const mockRow = createMockSubscriptionRow({ tier: 'momentum' })
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      await upgradeSubscription(supabase as never, 'user-abc', 'accelerate')

      const updateCalls = supabase._getUpdateCalls()
      expect(updateCalls[0].current_period_start).toBeUndefined()
      expect(updateCalls[0].current_period_end).toBeUndefined()
    })

    it('should NOT reset usage counters on upgrade', async () => {
      const mockRow = createMockSubscriptionRow({
        tier: 'momentum',
        usage_applications: 5,
        usage_cvs: 3,
      })
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      await upgradeSubscription(supabase as never, 'user-abc', 'accelerate')

      const updateCalls = supabase._getUpdateCalls()
      expect(updateCalls[0].usage_applications).toBeUndefined()
      expect(updateCalls[0].usage_cvs).toBeUndefined()
      expect(updateCalls[0].last_reset_at).toBeUndefined()
    })

    it('should clear scheduled_tier_change on upgrade', async () => {
      const mockRow = createMockSubscriptionRow({
        tier: 'momentum',
        scheduled_tier_change: 'elite',
      })
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      await upgradeSubscription(supabase as never, 'user-abc', 'accelerate')

      const updateCalls = supabase._getUpdateCalls()
      expect(updateCalls[0].scheduled_tier_change).toBeNull()
    })

    it('should log upgraded event', async () => {
      const mockRow = createMockSubscriptionRow({ tier: 'momentum' })
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      await upgradeSubscription(supabase as never, 'user-abc', 'accelerate')

      expect(supabase.from).toHaveBeenCalledWith('subscription_events')
    })

    it('momentum → accelerate should be valid upgrade', async () => {
      const mockRow = createMockSubscriptionRow({ tier: 'momentum' })
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      const result = await upgradeSubscription(supabase as never, 'user-abc', 'accelerate')

      expect(result.proratedAmount).toBeGreaterThanOrEqual(0)
    })

    it('momentum → elite should be valid upgrade', async () => {
      const mockRow = createMockSubscriptionRow({ tier: 'momentum' })
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      const result = await upgradeSubscription(supabase as never, 'user-abc', 'elite')

      expect(result.proratedAmount).toBeGreaterThanOrEqual(0)
    })

    it('accelerate → elite should be valid upgrade', async () => {
      const mockRow = createMockSubscriptionRow({ tier: 'accelerate' })
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      const result = await upgradeSubscription(supabase as never, 'user-abc', 'elite')

      expect(result.proratedAmount).toBeGreaterThanOrEqual(0)
    })
  })

  // ==========================================================================
  // scheduleDowngrade Tests
  // ==========================================================================

  describe('scheduleDowngrade', () => {
    it('should throw if not actually a downgrade', async () => {
      const mockRow = createMockSubscriptionRow({ tier: 'momentum' })
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      await expect(
        scheduleDowngrade(supabase as never, 'user-abc', 'elite')
      ).rejects.toThrow('elite is not a downgrade from momentum')
    })

    it('should set scheduled_tier_change', async () => {
      const mockRow = createMockSubscriptionRow({ tier: 'elite' })
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      await scheduleDowngrade(supabase as never, 'user-abc', 'momentum')

      const updateCalls = supabase._getUpdateCalls()
      expect(updateCalls[0].scheduled_tier_change).toBe('momentum')
    })

    it('should NOT change current tier', async () => {
      const mockRow = createMockSubscriptionRow({ tier: 'elite' })
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      await scheduleDowngrade(supabase as never, 'user-abc', 'momentum')

      const updateCalls = supabase._getUpdateCalls()
      expect(updateCalls[0].tier).toBeUndefined()
    })

    it('should return effectiveDate as currentPeriodEnd', async () => {
      const periodEnd = '2026-03-15T10:00:00.000Z'
      const mockRow = createMockSubscriptionRow({
        tier: 'elite',
        current_period_end: periodEnd,
      })
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      const result = await scheduleDowngrade(supabase as never, 'user-abc', 'momentum')

      expect(result.effectiveDate).toBe(periodEnd)
    })

    it('should log downgrade_scheduled event', async () => {
      const mockRow = createMockSubscriptionRow({ tier: 'accelerate' })
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      await scheduleDowngrade(supabase as never, 'user-abc', 'momentum')

      expect(supabase.from).toHaveBeenCalledWith('subscription_events')
    })

    it('elite → accelerate should be valid downgrade', async () => {
      const mockRow = createMockSubscriptionRow({ tier: 'elite' })
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      const result = await scheduleDowngrade(supabase as never, 'user-abc', 'accelerate')

      expect(result.effectiveDate).toBeDefined()
    })

    it('elite → momentum should be valid downgrade', async () => {
      const mockRow = createMockSubscriptionRow({ tier: 'elite' })
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      const result = await scheduleDowngrade(supabase as never, 'user-abc', 'momentum')

      expect(result.effectiveDate).toBeDefined()
    })

    it('accelerate → momentum should be valid downgrade', async () => {
      const mockRow = createMockSubscriptionRow({ tier: 'accelerate' })
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      const result = await scheduleDowngrade(supabase as never, 'user-abc', 'momentum')

      expect(result.effectiveDate).toBeDefined()
    })
  })

  // ==========================================================================
  // cancelScheduledChange Tests
  // ==========================================================================

  describe('cancelScheduledChange', () => {
    it('should clear scheduled_tier_change and scheduled_billing_period_change', async () => {
      const supabase = createMockSupabase()

      await cancelScheduledChange(supabase as never, 'user-abc')

      const updateCalls = supabase._getUpdateCalls()
      expect(updateCalls[0].scheduled_tier_change).toBeNull()
      expect(updateCalls[0].scheduled_billing_period_change).toBeNull()
    })

    it('should log scheduled_change_cancelled event', async () => {
      const supabase = createMockSupabase()

      await cancelScheduledChange(supabase as never, 'user-abc')

      expect(supabase.from).toHaveBeenCalledWith('subscription_events')
    })
  })

  // ==========================================================================
  // cancelSubscription Tests
  // ==========================================================================

  describe('cancelSubscription', () => {
    it('should throw if no subscription found', async () => {
      const supabase = createMockSupabase({
        subscriptionError: { code: 'PGRST116', message: 'Not found' },
      })

      await expect(cancelSubscription(supabase as never, 'user-123')).rejects.toThrow(
        'No subscription found'
      )
    })

    it('should throw if already cancelled', async () => {
      const mockRow = createMockSubscriptionRow({ status: 'cancelled' })
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      await expect(cancelSubscription(supabase as never, 'user-abc')).rejects.toThrow(
        'Subscription is already cancelled'
      )
    })

    it('should throw if no tier (tracking-only)', async () => {
      const mockRow = createMockSubscriptionRow({ tier: null })
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      await expect(cancelSubscription(supabase as never, 'user-abc')).rejects.toThrow(
        'No active subscription to cancel'
      )
    })

    it('should set status to cancelled', async () => {
      const mockRow = createMockSubscriptionRow()
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      await cancelSubscription(supabase as never, 'user-abc')

      const updateCalls = supabase._getUpdateCalls()
      expect(updateCalls[0].status).toBe('cancelled')
    })

    it('should set cancelled_at to now', async () => {
      const mockRow = createMockSubscriptionRow()
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      await cancelSubscription(supabase as never, 'user-abc')

      const updateCalls = supabase._getUpdateCalls()
      expect(updateCalls[0].cancelled_at).toBe('2026-02-15T10:00:00.000Z')
    })

    it('should set cancellation_effective_at to period end', async () => {
      const periodEnd = '2026-03-15T10:00:00.000Z'
      const mockRow = createMockSubscriptionRow({
        current_period_end: periodEnd,
      })
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      await cancelSubscription(supabase as never, 'user-abc')

      const updateCalls = supabase._getUpdateCalls()
      expect(updateCalls[0].cancellation_effective_at).toBe(periodEnd)
    })

    it('should NOT reset counters on cancellation', async () => {
      const mockRow = createMockSubscriptionRow({ usage_applications: 5 })
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      await cancelSubscription(supabase as never, 'user-abc')

      const updateCalls = supabase._getUpdateCalls()
      expect(updateCalls[0].usage_applications).toBeUndefined()
    })

    it('should return cancellationEffectiveAt', async () => {
      const periodEnd = '2026-03-15T10:00:00.000Z'
      const mockRow = createMockSubscriptionRow({
        current_period_end: periodEnd,
      })
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      const result = await cancelSubscription(supabase as never, 'user-abc')

      expect(result.cancellationEffectiveAt).toBe(periodEnd)
    })

    it('should log cancelled event', async () => {
      const mockRow = createMockSubscriptionRow()
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      await cancelSubscription(supabase as never, 'user-abc')

      expect(supabase.from).toHaveBeenCalledWith('subscription_events')
    })
  })

  // ==========================================================================
  // handlePaymentFailure Tests
  // ==========================================================================

  describe('handlePaymentFailure', () => {
    it('should set status to past_due', async () => {
      const supabase = createMockSupabase()

      await handlePaymentFailure(supabase as never, 'user-abc')

      const updateCalls = supabase._getUpdateCalls()
      expect(updateCalls[0].status).toBe('past_due')
    })

    it('should log payment_failed event', async () => {
      const supabase = createMockSupabase()

      await handlePaymentFailure(supabase as never, 'user-abc')

      expect(supabase.from).toHaveBeenCalledWith('subscription_events')
    })
  })

  // ==========================================================================
  // renewSubscription Tests
  // ==========================================================================

  describe('renewSubscription', () => {
    it('should throw if no subscription found', async () => {
      const supabase = createMockSupabase({
        subscriptionError: { code: 'PGRST116', message: 'Not found' },
      })

      await expect(renewSubscription(supabase as never, 'user-123', 'txn-code')).rejects.toThrow(
        'No subscription found'
      )
    })

    it('should throw if no tier set', async () => {
      const mockRow = createMockSubscriptionRow({ tier: null })
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      await expect(renewSubscription(supabase as never, 'user-abc', 'txn-code')).rejects.toThrow(
        'Subscription has no tier or billing period'
      )
    })

    it('should update transaction code', async () => {
      const mockRow = createMockSubscriptionRow()
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      await renewSubscription(supabase as never, 'user-abc', 'new-txn-code')

      const updateCalls = supabase._getUpdateCalls()
      expect(updateCalls[0].grow_last_transaction_code).toBe('new-txn-code')
    })

    it('should set new period dates', async () => {
      const mockRow = createMockSubscriptionRow()
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      await renewSubscription(supabase as never, 'user-abc', 'txn-code')

      const updateCalls = supabase._getUpdateCalls()
      expect(updateCalls[0].current_period_start).toBe('2026-02-15T10:00:00.000Z')
      expect(updateCalls[0].current_period_end).toContain('2026-03-15')
    })

    it('should log renewed event', async () => {
      const mockRow = createMockSubscriptionRow()
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      await renewSubscription(supabase as never, 'user-abc', 'txn-123')

      expect(supabase.from).toHaveBeenCalledWith('subscription_events')
    })

    it('should apply scheduledTierChange on renewal', async () => {
      const mockRow = createMockSubscriptionRow({
        tier: 'elite',
        scheduled_tier_change: 'momentum',
      })
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      await renewSubscription(supabase as never, 'user-abc', 'txn-456')

      const updateCalls = supabase._getUpdateCalls()
      // Tier should now be the scheduled tier (momentum), not the original (elite)
      expect(updateCalls[0].tier).toBe('momentum')
      // Scheduled change should be cleared
      expect(updateCalls[0].scheduled_tier_change).toBeNull()
    })

    it('should apply scheduledBillingPeriodChange on renewal', async () => {
      const mockRow = createMockSubscriptionRow({
        tier: 'momentum',
        billing_period: 'monthly',
        scheduled_billing_period_change: 'yearly',
      })
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      await renewSubscription(supabase as never, 'user-abc', 'txn-789')

      const updateCalls = supabase._getUpdateCalls()
      expect(updateCalls[0].billing_period).toBe('yearly')
      expect(updateCalls[0].scheduled_billing_period_change).toBeNull()
    })

    it('should keep current tier if no scheduledTierChange', async () => {
      const mockRow = createMockSubscriptionRow({
        tier: 'accelerate',
        scheduled_tier_change: null,
      })
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      await renewSubscription(supabase as never, 'user-abc', 'txn-abc')

      const updateCalls = supabase._getUpdateCalls()
      expect(updateCalls[0].tier).toBe('accelerate')
    })

    it('should reset counters when last_reset_at < current_period_start (double-reset prevention)', async () => {
      // last_reset_at is before current_period_start → should reset
      const mockRow = createMockSubscriptionRow({
        last_reset_at: '2026-01-01T00:00:00Z', // Before period start
        current_period_start: '2026-02-15T10:00:00Z', // Period start
        usage_applications: 5,
        usage_cvs: 3,
      })
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      await renewSubscription(supabase as never, 'user-abc', 'txn-reset')

      const updateCalls = supabase._getUpdateCalls()
      // Counters should be reset to 0
      expect(updateCalls[0].usage_applications).toBe(0)
      expect(updateCalls[0].usage_cvs).toBe(0)
      expect(updateCalls[0].usage_interviews).toBe(0)
      expect(updateCalls[0].usage_compensation).toBe(0)
      expect(updateCalls[0].usage_contracts).toBe(0)
      expect(updateCalls[0].usage_ai_avatar_interviews).toBe(0)
      expect(updateCalls[0].last_reset_at).toBeDefined()
    })

    it('should NOT reset counters when last_reset_at >= current_period_start (double-reset prevention)', async () => {
      // last_reset_at equals current_period_start → already reset, don't reset again
      const mockRow = createMockSubscriptionRow({
        last_reset_at: '2026-02-15T10:00:00Z', // Same as period start
        current_period_start: '2026-02-15T10:00:00Z',
        usage_applications: 5,
      })
      const supabase = createMockSupabase({ subscriptionData: mockRow })

      await renewSubscription(supabase as never, 'user-abc', 'txn-no-reset')

      const updateCalls = supabase._getUpdateCalls()
      // Counters should NOT be in the update
      expect(updateCalls[0].usage_applications).toBeUndefined()
      expect(updateCalls[0].usage_cvs).toBeUndefined()
      expect(updateCalls[0].last_reset_at).toBeUndefined()
    })
  })

  // ==========================================================================
  // processExpirations Tests
  // ==========================================================================

  describe('processExpirations', () => {
    it('should return expired count', async () => {
      const supabase = createMockSupabase({ selectData: [] })

      const result = await processExpirations(supabase as never)

      expect(result).toHaveProperty('expired')
      expect(typeof result.expired).toBe('number')
    })
  })

  // ==========================================================================
  // Type Export Tests
  // ==========================================================================

  describe('Type Exports', () => {
    it('UserSubscription should have all required fields', () => {
      const sub: UserSubscription = {
        id: 'id',
        userId: 'user',
        tier: 'momentum',
        billingPeriod: 'monthly',
        status: 'active',
        currentPeriodStart: '2026-01-01',
        currentPeriodEnd: '2026-02-01',
        cancelledAt: null,
        cancellationEffectiveAt: null,
        scheduledTierChange: null,
        scheduledBillingPeriodChange: null,
        growTransactionToken: null,
        growRecurringId: null,
        growLastTransactionCode: null,
        morningCustomerId: null,
        usageApplications: 0,
        usageCvs: 0,
        usageInterviews: 0,
        usageCompensation: 0,
        usageContracts: 0,
        usageAiAvatarInterviews: 0,
        lastResetAt: '2026-01-01',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      }

      expect(sub.id).toBeDefined()
    })

    it('GrowPaymentData should be optional', () => {
      const data: GrowPaymentData = {}
      expect(data.transactionToken).toBeUndefined()
    })
  })

  // ==========================================================================
  // Business Rules Tests
  // ==========================================================================

  describe('Business Rules', () => {
    describe('Upgrade Rules', () => {
      it('upgrades should be IMMEDIATE - tier changes right away', async () => {
        const mockRow = createMockSubscriptionRow({ tier: 'momentum' })
        const supabase = createMockSupabase({ subscriptionData: mockRow })

        await upgradeSubscription(supabase as never, 'user-abc', 'accelerate')

        const updateCalls = supabase._getUpdateCalls()
        expect(updateCalls[0].tier).toBe('accelerate')
      })

      it('upgrades should NOT reset counters', async () => {
        const mockRow = createMockSubscriptionRow({
          tier: 'momentum',
          usage_applications: 7,
        })
        const supabase = createMockSupabase({ subscriptionData: mockRow })

        await upgradeSubscription(supabase as never, 'user-abc', 'accelerate')

        const updateCalls = supabase._getUpdateCalls()
        expect(updateCalls[0].usage_applications).toBeUndefined()
        expect(updateCalls[0].last_reset_at).toBeUndefined()
      })

      it('upgrades should NOT change period dates', async () => {
        const mockRow = createMockSubscriptionRow({ tier: 'momentum' })
        const supabase = createMockSupabase({ subscriptionData: mockRow })

        await upgradeSubscription(supabase as never, 'user-abc', 'accelerate')

        const updateCalls = supabase._getUpdateCalls()
        expect(updateCalls[0].current_period_start).toBeUndefined()
        expect(updateCalls[0].current_period_end).toBeUndefined()
        expect(updateCalls[0].billing_period).toBeUndefined()
      })
    })

    describe('Downgrade Rules', () => {
      it('downgrades should be SCHEDULED - tier does NOT change immediately', async () => {
        const mockRow = createMockSubscriptionRow({ tier: 'elite' })
        const supabase = createMockSupabase({ subscriptionData: mockRow })

        await scheduleDowngrade(supabase as never, 'user-abc', 'momentum')

        const updateCalls = supabase._getUpdateCalls()
        expect(updateCalls[0].scheduled_tier_change).toBe('momentum')
        expect(updateCalls[0].tier).toBeUndefined() // Current tier unchanged
      })
    })

    describe('Cancellation Rules', () => {
      it('cancelled subscription should keep working until period end', async () => {
        const periodEnd = '2026-03-15T10:00:00.000Z'
        const mockRow = createMockSubscriptionRow({
          current_period_end: periodEnd,
        })
        const supabase = createMockSupabase({ subscriptionData: mockRow })

        const result = await cancelSubscription(supabase as never, 'user-abc')

        const updateCalls = supabase._getUpdateCalls()
        // Status is cancelled but tier is NOT changed
        expect(updateCalls[0].status).toBe('cancelled')
        expect(updateCalls[0].tier).toBeUndefined()
        // Effective date is period end, not now
        expect(result.cancellationEffectiveAt).toBe(periodEnd)
      })
    })
  })
})
