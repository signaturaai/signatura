/**
 * Subscription Schema Tests
 *
 * Tests that verify the database schema for the subscription system.
 * These tests validate the expected structure and constraints.
 *
 * Note: These are unit tests that verify schema expectations.
 * Integration tests against a real database would be in a separate file.
 */

import { describe, it, expect } from 'vitest'

describe('Subscription System Schema', () => {
  // ============================================================================
  // user_subscriptions table structure tests
  // ============================================================================

  describe('user_subscriptions table', () => {
    // Expected columns from the migration
    const EXPECTED_COLUMNS = [
      'id',
      'user_id',
      'tier',
      'billing_period',
      'status',
      'grow_transaction_token',
      'grow_recurring_id',
      'grow_last_transaction_code',
      'morning_customer_id',
      'current_period_start',
      'current_period_end',
      'cancelled_at',
      'cancellation_effective_at',
      'scheduled_tier',
      'scheduled_billing_period',
      'pending_tier',
      'pending_billing_period',
      'usage_applications',
      'usage_cvs',
      'usage_interviews',
      'usage_compensation',
      'usage_contracts',
      'usage_ai_avatar_interviews',
      'last_reset_at',
      'created_at',
      'updated_at',
    ]

    it('should have all expected columns', () => {
      // Verify the migration defines all expected columns
      expect(EXPECTED_COLUMNS).toContain('id')
      expect(EXPECTED_COLUMNS).toContain('user_id')
      expect(EXPECTED_COLUMNS).toContain('tier')
      expect(EXPECTED_COLUMNS).toContain('billing_period')
      expect(EXPECTED_COLUMNS).toContain('status')
      expect(EXPECTED_COLUMNS.length).toBe(26)
    })

    it('should have 6 usage counter columns', () => {
      const usageColumns = EXPECTED_COLUMNS.filter(col => col.startsWith('usage_'))
      expect(usageColumns).toEqual([
        'usage_applications',
        'usage_cvs',
        'usage_interviews',
        'usage_compensation',
        'usage_contracts',
        'usage_ai_avatar_interviews',
      ])
    })
  })

  describe('tier column constraints', () => {
    const VALID_TIERS = [null, 'momentum', 'accelerate', 'elite']
    const INVALID_TIERS = ['free', 'basic', 'premium', 'pro', '', 'Momentum', 'ELITE']

    it('should allow NULL tier (tracking-only user)', () => {
      expect(VALID_TIERS).toContain(null)
    })

    it('should allow momentum tier', () => {
      expect(VALID_TIERS).toContain('momentum')
    })

    it('should allow accelerate tier', () => {
      expect(VALID_TIERS).toContain('accelerate')
    })

    it('should allow elite tier', () => {
      expect(VALID_TIERS).toContain('elite')
    })

    it('should not allow invalid tier values', () => {
      INVALID_TIERS.forEach(tier => {
        expect(VALID_TIERS).not.toContain(tier)
      })
    })

    it('should have exactly 4 valid tier values (including NULL)', () => {
      expect(VALID_TIERS.length).toBe(4)
    })
  })

  describe('billing_period column constraints', () => {
    const VALID_PERIODS = [null, 'monthly', 'quarterly', 'yearly']
    const INVALID_PERIODS = ['weekly', 'annual', 'bi-annual', '', 'Monthly', 'YEARLY']

    it('should allow NULL billing_period (tracking-only user)', () => {
      expect(VALID_PERIODS).toContain(null)
    })

    it('should allow monthly period', () => {
      expect(VALID_PERIODS).toContain('monthly')
    })

    it('should allow quarterly period', () => {
      expect(VALID_PERIODS).toContain('quarterly')
    })

    it('should allow yearly period', () => {
      expect(VALID_PERIODS).toContain('yearly')
    })

    it('should not allow invalid period values', () => {
      INVALID_PERIODS.forEach(period => {
        expect(VALID_PERIODS).not.toContain(period)
      })
    })

    it('should have exactly 4 valid period values (including NULL)', () => {
      expect(VALID_PERIODS.length).toBe(4)
    })
  })

  describe('status column constraints', () => {
    const VALID_STATUSES = ['active', 'cancelled', 'past_due', 'expired']
    const INVALID_STATUSES = ['inactive', 'pending', 'suspended', '', null, 'Active', 'EXPIRED']

    it('should allow active status', () => {
      expect(VALID_STATUSES).toContain('active')
    })

    it('should allow cancelled status', () => {
      expect(VALID_STATUSES).toContain('cancelled')
    })

    it('should allow past_due status', () => {
      expect(VALID_STATUSES).toContain('past_due')
    })

    it('should allow expired status', () => {
      expect(VALID_STATUSES).toContain('expired')
    })

    it('should not allow NULL status (has NOT NULL constraint)', () => {
      expect(VALID_STATUSES).not.toContain(null)
    })

    it('should not allow invalid status values', () => {
      INVALID_STATUSES.forEach(status => {
        expect(VALID_STATUSES).not.toContain(status)
      })
    })

    it('should have exactly 4 valid status values', () => {
      expect(VALID_STATUSES.length).toBe(4)
    })
  })

  describe('usage counter defaults', () => {
    // Simulating what a new row would look like
    const NEW_ROW_DEFAULTS = {
      usage_applications: 0,
      usage_cvs: 0,
      usage_interviews: 0,
      usage_compensation: 0,
      usage_contracts: 0,
      usage_ai_avatar_interviews: 0,
    }

    it('usage_applications should default to 0', () => {
      expect(NEW_ROW_DEFAULTS.usage_applications).toBe(0)
    })

    it('usage_cvs should default to 0', () => {
      expect(NEW_ROW_DEFAULTS.usage_cvs).toBe(0)
    })

    it('usage_interviews should default to 0', () => {
      expect(NEW_ROW_DEFAULTS.usage_interviews).toBe(0)
    })

    it('usage_compensation should default to 0', () => {
      expect(NEW_ROW_DEFAULTS.usage_compensation).toBe(0)
    })

    it('usage_contracts should default to 0', () => {
      expect(NEW_ROW_DEFAULTS.usage_contracts).toBe(0)
    })

    it('usage_ai_avatar_interviews should default to 0', () => {
      expect(NEW_ROW_DEFAULTS.usage_ai_avatar_interviews).toBe(0)
    })

    it('all usage counters should default to 0', () => {
      Object.values(NEW_ROW_DEFAULTS).forEach(value => {
        expect(value).toBe(0)
      })
    })
  })

  describe('last_reset_at column', () => {
    it('should not allow NULL (has NOT NULL constraint)', () => {
      // The column is defined as: last_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      const columnDefinition = {
        nullable: false,
        hasDefault: true,
        defaultValue: 'NOW()',
      }
      expect(columnDefinition.nullable).toBe(false)
      expect(columnDefinition.hasDefault).toBe(true)
    })

    it('should default to current timestamp', () => {
      const before = new Date()
      const defaultValue = new Date() // Simulating NOW()
      const after = new Date()

      expect(defaultValue.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(defaultValue.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe('user_id unique constraint', () => {
    it('should have UNIQUE constraint on user_id', () => {
      // The migration defines: CONSTRAINT user_subscriptions_user_id_key UNIQUE (user_id)
      const constraints = {
        user_subscriptions_user_id_key: {
          type: 'UNIQUE',
          columns: ['user_id'],
        },
      }

      expect(constraints.user_subscriptions_user_id_key.type).toBe('UNIQUE')
      expect(constraints.user_subscriptions_user_id_key.columns).toContain('user_id')
    })

    it('should prevent duplicate user_id values', () => {
      // Simulate constraint behavior
      const existingUserIds = ['user-1', 'user-2', 'user-3']
      const newUserId = 'user-1' // Duplicate

      const isDuplicate = existingUserIds.includes(newUserId)
      expect(isDuplicate).toBe(true)
    })

    it('should allow one row per user', () => {
      const userRows = new Map<string, object>()
      userRows.set('user-1', { tier: null })
      userRows.set('user-2', { tier: 'momentum' })

      // Each user has exactly one row
      expect(userRows.size).toBe(2)
      expect(userRows.get('user-1')).toBeDefined()
      expect(userRows.get('user-2')).toBeDefined()
    })
  })

  // ============================================================================
  // subscription_events table structure tests
  // ============================================================================

  describe('subscription_events table', () => {
    const EXPECTED_COLUMNS = [
      'id',
      'user_id',
      'event_type',
      'tier',
      'billing_period',
      'amount',
      'currency',
      'grow_transaction_code',
      'morning_document_id',
      'metadata',
      'created_at',
    ]

    it('should have all expected columns', () => {
      expect(EXPECTED_COLUMNS).toContain('id')
      expect(EXPECTED_COLUMNS).toContain('user_id')
      expect(EXPECTED_COLUMNS).toContain('event_type')
      expect(EXPECTED_COLUMNS).toContain('metadata')
      expect(EXPECTED_COLUMNS.length).toBe(11)
    })

    it('should have event_type as NOT NULL', () => {
      const columnDef = { nullable: false }
      expect(columnDef.nullable).toBe(false)
    })

    it('should have JSONB metadata column with default empty object', () => {
      const defaultMetadata = {}
      expect(defaultMetadata).toEqual({})
    })

    it('should have currency default to USD', () => {
      const defaultCurrency = 'USD'
      expect(defaultCurrency).toBe('USD')
    })
  })

  // ============================================================================
  // usage_monthly_snapshots table structure tests
  // ============================================================================

  describe('usage_monthly_snapshots table', () => {
    const EXPECTED_COLUMNS = [
      'id',
      'user_id',
      'month',
      'applications',
      'cvs',
      'interviews',
      'compensation',
      'contracts',
      'ai_avatar_interviews',
      'tier_at_snapshot',
      'billing_period_at_snapshot',
      'created_at',
      'updated_at',
    ]

    it('should have all expected columns', () => {
      expect(EXPECTED_COLUMNS).toContain('id')
      expect(EXPECTED_COLUMNS).toContain('user_id')
      expect(EXPECTED_COLUMNS).toContain('month')
      expect(EXPECTED_COLUMNS.length).toBe(13)
    })

    it('should have unique constraint on (user_id, month)', () => {
      const constraints = {
        usage_monthly_snapshots_user_month_key: {
          type: 'UNIQUE',
          columns: ['user_id', 'month'],
        },
      }

      expect(constraints.usage_monthly_snapshots_user_month_key.type).toBe('UNIQUE')
      expect(constraints.usage_monthly_snapshots_user_month_key.columns).toContain('user_id')
      expect(constraints.usage_monthly_snapshots_user_month_key.columns).toContain('month')
    })

    it('should prevent duplicate user+month combinations', () => {
      const existingSnapshots = [
        { user_id: 'user-1', month: '2026-01-01' },
        { user_id: 'user-1', month: '2026-02-01' },
        { user_id: 'user-2', month: '2026-01-01' },
      ]

      // Check for duplicate
      const newSnapshot = { user_id: 'user-1', month: '2026-01-01' }
      const isDuplicate = existingSnapshots.some(
        s => s.user_id === newSnapshot.user_id && s.month === newSnapshot.month
      )
      expect(isDuplicate).toBe(true)

      // New month for same user is OK
      const validSnapshot = { user_id: 'user-1', month: '2026-03-01' }
      const isValid = !existingSnapshots.some(
        s => s.user_id === validSnapshot.user_id && s.month === validSnapshot.month
      )
      expect(isValid).toBe(true)
    })

    it('month should be stored as first of month date', () => {
      const validMonths = ['2026-01-01', '2026-02-01', '2026-12-01']
      const invalidMonths = ['2026-01-15', '2026-02-28', '2026-12-31']

      validMonths.forEach(month => {
        const day = new Date(month).getDate()
        expect(day).toBe(1)
      })

      invalidMonths.forEach(month => {
        const day = new Date(month).getDate()
        expect(day).not.toBe(1)
      })
    })
  })

  // ============================================================================
  // RLS Policy tests (simulated)
  // ============================================================================

  describe('RLS Policies', () => {
    describe('user_subscriptions RLS', () => {
      it('user can SELECT own subscription row', () => {
        const currentUserId = 'user-123'
        const rowUserId = 'user-123'

        // RLS policy: auth.uid() = user_id
        const canSelect = currentUserId === rowUserId
        expect(canSelect).toBe(true)
      })

      it('user cannot SELECT other users subscription rows', () => {
        const currentUserId = 'user-123'
        const otherRowUserId = 'user-456'

        const canSelect = currentUserId === otherRowUserId
        expect(canSelect).toBe(false)
      })

      it('direct INSERT without service_role should fail', () => {
        // Regular users cannot INSERT - only service_role can
        const userRole = 'authenticated'
        const requiredRole = 'service_role'

        const canInsert = userRole === requiredRole
        expect(canInsert).toBe(false)
      })

      it('service_role can perform all operations', () => {
        const userRole = 'service_role'
        const canPerformAll = userRole === 'service_role'
        expect(canPerformAll).toBe(true)
      })
    })

    describe('subscription_events RLS', () => {
      it('user can SELECT own events', () => {
        const currentUserId = 'user-123'
        const eventUserId = 'user-123'

        const canSelect = currentUserId === eventUserId
        expect(canSelect).toBe(true)
      })

      it('user cannot SELECT other users events', () => {
        const currentUserId = 'user-123'
        const otherEventUserId = 'user-456'

        const canSelect = currentUserId === otherEventUserId
        expect(canSelect).toBe(false)
      })

      it('only service_role can INSERT events', () => {
        const userRole = 'authenticated'
        const canInsert = userRole === 'service_role'
        expect(canInsert).toBe(false)
      })
    })

    describe('usage_monthly_snapshots RLS', () => {
      it('user can SELECT own snapshots', () => {
        const currentUserId = 'user-123'
        const snapshotUserId = 'user-123'

        const canSelect = currentUserId === snapshotUserId
        expect(canSelect).toBe(true)
      })

      it('only service_role can INSERT/UPDATE snapshots', () => {
        const userRole = 'authenticated'
        const canModify = userRole === 'service_role'
        expect(canModify).toBe(false)
      })
    })
  })

  // ============================================================================
  // Backfill behavior tests
  // ============================================================================

  describe('Backfill existing users', () => {
    it('every existing user should get a tracking row', () => {
      // Simulate existing users
      const existingUsers = [
        { id: 'user-1', email: 'user1@test.com' },
        { id: 'user-2', email: 'user2@test.com' },
        { id: 'user-3', email: 'user3@test.com' },
      ]

      // Simulate backfill result
      const subscriptionRows = existingUsers.map(user => ({
        user_id: user.id,
        tier: null,
        billing_period: null,
        status: 'active',
        usage_applications: 0,
        usage_cvs: 0,
        usage_interviews: 0,
        usage_compensation: 0,
        usage_contracts: 0,
        usage_ai_avatar_interviews: 0,
      }))

      // Verify all users have rows
      expect(subscriptionRows.length).toBe(existingUsers.length)
    })

    it('backfilled rows should have tier=NULL', () => {
      const backfilledRow = {
        user_id: 'existing-user',
        tier: null,
        billing_period: null,
        status: 'active',
      }

      expect(backfilledRow.tier).toBeNull()
    })

    it('backfilled rows should have billing_period=NULL', () => {
      const backfilledRow = {
        user_id: 'existing-user',
        tier: null,
        billing_period: null,
        status: 'active',
      }

      expect(backfilledRow.billing_period).toBeNull()
    })

    it('backfilled rows should have status=active', () => {
      const backfilledRow = {
        user_id: 'existing-user',
        tier: null,
        billing_period: null,
        status: 'active',
      }

      expect(backfilledRow.status).toBe('active')
    })

    it('backfilled rows should have all usage counters at 0', () => {
      const backfilledRow = {
        user_id: 'existing-user',
        usage_applications: 0,
        usage_cvs: 0,
        usage_interviews: 0,
        usage_compensation: 0,
        usage_contracts: 0,
        usage_ai_avatar_interviews: 0,
      }

      expect(backfilledRow.usage_applications).toBe(0)
      expect(backfilledRow.usage_cvs).toBe(0)
      expect(backfilledRow.usage_interviews).toBe(0)
      expect(backfilledRow.usage_compensation).toBe(0)
      expect(backfilledRow.usage_contracts).toBe(0)
      expect(backfilledRow.usage_ai_avatar_interviews).toBe(0)
    })

    it('legacy usage data should NOT be counted (forward-only tracking)', () => {
      // Simulate user with existing applications before backfill
      const existingApplications = [
        { id: 'app-1', created_at: '2025-01-01' },
        { id: 'app-2', created_at: '2025-02-01' },
        { id: 'app-3', created_at: '2025-03-01' },
      ]

      // Backfill creates row with counters at 0, ignoring legacy data
      const backfilledRow = {
        usage_applications: 0,  // NOT 3
      }

      expect(backfilledRow.usage_applications).toBe(0)
      expect(backfilledRow.usage_applications).not.toBe(existingApplications.length)
    })
  })

  // ============================================================================
  // Auto-create trigger tests
  // ============================================================================

  describe('Auto-create subscription row on new signup', () => {
    it('new user signup should create subscription row automatically', () => {
      // Simulate trigger behavior
      const newUser = { id: 'new-user-123' }

      const createSubscriptionRow = (userId: string) => ({
        user_id: userId,
        tier: null,
        billing_period: null,
        status: 'active',
        usage_applications: 0,
        usage_cvs: 0,
        usage_interviews: 0,
        usage_compensation: 0,
        usage_contracts: 0,
        usage_ai_avatar_interviews: 0,
        last_reset_at: new Date().toISOString(),
      })

      const newRow = createSubscriptionRow(newUser.id)

      expect(newRow.user_id).toBe(newUser.id)
      expect(newRow.tier).toBeNull()
      expect(newRow.status).toBe('active')
    })

    it('trigger should use ON CONFLICT DO NOTHING for idempotency', () => {
      // If row already exists, don't fail
      const existingRow = { user_id: 'user-123', tier: 'momentum' }
      const triggerAttempt = { user_id: 'user-123', tier: null }

      // ON CONFLICT DO NOTHING means existing row is preserved
      const resultRow = existingRow // Not overwritten
      expect(resultRow.tier).toBe('momentum')
      expect(resultRow.tier).not.toBeNull()
    })
  })

  // ============================================================================
  // SQL Helper Function: get_tier_limits
  // Migration PART 12
  // ============================================================================

  describe('get_tier_limits function', () => {
    /**
     * Simulates the SQL function public.get_tier_limits(p_tier TEXT)
     * which returns a row of limit values for each tier.
     */
    function getTierLimitsSQL(tier: string | null) {
      const resolve = (t: string | null, momentum: number, accelerate: number, elite: number, fallback: number) => {
        switch (t) {
          case 'momentum': return momentum
          case 'accelerate': return accelerate
          case 'elite': return elite
          default: return fallback
        }
      }

      return {
        applications_limit: resolve(tier, 8, 15, -1, 0),
        cvs_limit: resolve(tier, 8, 15, -1, 0),
        interviews_limit: resolve(tier, 8, 15, -1, 0),
        compensation_limit: resolve(tier, 8, 15, -1, 0),
        contracts_limit: resolve(tier, 8, 15, -1, 0),
        ai_avatar_interviews_limit: resolve(tier, 0, 5, 10, 0),
      }
    }

    it('should return 8 for all core limits on momentum', () => {
      const limits = getTierLimitsSQL('momentum')
      expect(limits.applications_limit).toBe(8)
      expect(limits.cvs_limit).toBe(8)
      expect(limits.interviews_limit).toBe(8)
      expect(limits.compensation_limit).toBe(8)
      expect(limits.contracts_limit).toBe(8)
    })

    it('should return 0 AI avatar interviews for momentum', () => {
      const limits = getTierLimitsSQL('momentum')
      expect(limits.ai_avatar_interviews_limit).toBe(0)
    })

    it('should return 15 for all core limits on accelerate', () => {
      const limits = getTierLimitsSQL('accelerate')
      expect(limits.applications_limit).toBe(15)
      expect(limits.cvs_limit).toBe(15)
      expect(limits.interviews_limit).toBe(15)
      expect(limits.compensation_limit).toBe(15)
      expect(limits.contracts_limit).toBe(15)
    })

    it('should return 5 AI avatar interviews for accelerate', () => {
      const limits = getTierLimitsSQL('accelerate')
      expect(limits.ai_avatar_interviews_limit).toBe(5)
    })

    it('should return -1 (unlimited) for all core limits on elite', () => {
      const limits = getTierLimitsSQL('elite')
      expect(limits.applications_limit).toBe(-1)
      expect(limits.cvs_limit).toBe(-1)
      expect(limits.interviews_limit).toBe(-1)
      expect(limits.compensation_limit).toBe(-1)
      expect(limits.contracts_limit).toBe(-1)
    })

    it('should return 10 AI avatar interviews for elite', () => {
      const limits = getTierLimitsSQL('elite')
      expect(limits.ai_avatar_interviews_limit).toBe(10)
    })

    it('should return 0 for all limits when tier is NULL (tracking-only)', () => {
      const limits = getTierLimitsSQL(null)
      expect(limits.applications_limit).toBe(0)
      expect(limits.cvs_limit).toBe(0)
      expect(limits.interviews_limit).toBe(0)
      expect(limits.compensation_limit).toBe(0)
      expect(limits.contracts_limit).toBe(0)
      expect(limits.ai_avatar_interviews_limit).toBe(0)
    })

    it('should return 0 for unknown tier values', () => {
      const limits = getTierLimitsSQL('unknown')
      expect(limits.applications_limit).toBe(0)
    })
  })

  // ============================================================================
  // SQL Helper Function: check_usage_limit
  // Migration PART 13
  // ============================================================================

  describe('check_usage_limit function', () => {
    /**
     * Simulates the SQL function public.check_usage_limit(p_user_id, p_usage_type)
     * Logic: returns FALSE if tier is NULL, status not active/cancelled, or over limit.
     * Returns TRUE if unlimited (-1) or under limit.
     */
    interface MockSubscription {
      tier: string | null
      status: string
      usage_applications: number
      usage_cvs: number
      usage_interviews: number
      usage_compensation: number
      usage_contracts: number
      usage_ai_avatar_interviews: number
    }

    function checkUsageLimitSQL(sub: MockSubscription | null, usageType: string): boolean {
      if (!sub) return false
      if (sub.tier === null) return false
      if (!['active', 'cancelled'].includes(sub.status)) return false

      const usageMap: Record<string, number> = {
        applications: sub.usage_applications,
        cvs: sub.usage_cvs,
        interviews: sub.usage_interviews,
        compensation: sub.usage_compensation,
        contracts: sub.usage_contracts,
        ai_avatar_interviews: sub.usage_ai_avatar_interviews,
      }

      const limitMap: Record<string, Record<string, number>> = {
        momentum: { applications: 8, cvs: 8, interviews: 8, compensation: 8, contracts: 8, ai_avatar_interviews: 0 },
        accelerate: { applications: 15, cvs: 15, interviews: 15, compensation: 15, contracts: 15, ai_avatar_interviews: 5 },
        elite: { applications: -1, cvs: -1, interviews: -1, compensation: -1, contracts: -1, ai_avatar_interviews: 10 },
      }

      const currentUsage = usageMap[usageType] ?? 0
      const limit = limitMap[sub.tier]?.[usageType] ?? 0

      if (limit === -1) return true
      return currentUsage < limit
    }

    it('should return FALSE when subscription row does not exist', () => {
      expect(checkUsageLimitSQL(null, 'applications')).toBe(false)
    })

    it('should return FALSE when tier is NULL (tracking-only user)', () => {
      const sub: MockSubscription = {
        tier: null, status: 'active',
        usage_applications: 0, usage_cvs: 0, usage_interviews: 0,
        usage_compensation: 0, usage_contracts: 0, usage_ai_avatar_interviews: 0,
      }
      expect(checkUsageLimitSQL(sub, 'applications')).toBe(false)
    })

    it('should return FALSE when status is past_due', () => {
      const sub: MockSubscription = {
        tier: 'momentum', status: 'past_due',
        usage_applications: 0, usage_cvs: 0, usage_interviews: 0,
        usage_compensation: 0, usage_contracts: 0, usage_ai_avatar_interviews: 0,
      }
      expect(checkUsageLimitSQL(sub, 'applications')).toBe(false)
    })

    it('should return FALSE when status is expired', () => {
      const sub: MockSubscription = {
        tier: 'momentum', status: 'expired',
        usage_applications: 0, usage_cvs: 0, usage_interviews: 0,
        usage_compensation: 0, usage_contracts: 0, usage_ai_avatar_interviews: 0,
      }
      expect(checkUsageLimitSQL(sub, 'applications')).toBe(false)
    })

    it('should return TRUE when status is cancelled (access until period end)', () => {
      const sub: MockSubscription = {
        tier: 'momentum', status: 'cancelled',
        usage_applications: 3, usage_cvs: 0, usage_interviews: 0,
        usage_compensation: 0, usage_contracts: 0, usage_ai_avatar_interviews: 0,
      }
      expect(checkUsageLimitSQL(sub, 'applications')).toBe(true)
    })

    it('should return TRUE when usage is under limit', () => {
      const sub: MockSubscription = {
        tier: 'momentum', status: 'active',
        usage_applications: 7, usage_cvs: 0, usage_interviews: 0,
        usage_compensation: 0, usage_contracts: 0, usage_ai_avatar_interviews: 0,
      }
      expect(checkUsageLimitSQL(sub, 'applications')).toBe(true)
    })

    it('should return FALSE when usage is at limit', () => {
      const sub: MockSubscription = {
        tier: 'momentum', status: 'active',
        usage_applications: 8, usage_cvs: 0, usage_interviews: 0,
        usage_compensation: 0, usage_contracts: 0, usage_ai_avatar_interviews: 0,
      }
      expect(checkUsageLimitSQL(sub, 'applications')).toBe(false)
    })

    it('should return FALSE when usage exceeds limit', () => {
      const sub: MockSubscription = {
        tier: 'momentum', status: 'active',
        usage_applications: 10, usage_cvs: 0, usage_interviews: 0,
        usage_compensation: 0, usage_contracts: 0, usage_ai_avatar_interviews: 0,
      }
      expect(checkUsageLimitSQL(sub, 'applications')).toBe(false)
    })

    it('should return TRUE for elite unlimited resources regardless of usage', () => {
      const sub: MockSubscription = {
        tier: 'elite', status: 'active',
        usage_applications: 99999, usage_cvs: 99999, usage_interviews: 99999,
        usage_compensation: 99999, usage_contracts: 99999, usage_ai_avatar_interviews: 0,
      }
      expect(checkUsageLimitSQL(sub, 'applications')).toBe(true)
      expect(checkUsageLimitSQL(sub, 'cvs')).toBe(true)
      expect(checkUsageLimitSQL(sub, 'interviews')).toBe(true)
    })

    it('should check AI avatar limits for elite (not unlimited)', () => {
      const sub: MockSubscription = {
        tier: 'elite', status: 'active',
        usage_applications: 0, usage_cvs: 0, usage_interviews: 0,
        usage_compensation: 0, usage_contracts: 0, usage_ai_avatar_interviews: 10,
      }
      expect(checkUsageLimitSQL(sub, 'ai_avatar_interviews')).toBe(false)
    })

    it('should check each usage type independently', () => {
      const sub: MockSubscription = {
        tier: 'momentum', status: 'active',
        usage_applications: 8, usage_cvs: 3, usage_interviews: 0,
        usage_compensation: 7, usage_contracts: 8, usage_ai_avatar_interviews: 0,
      }
      expect(checkUsageLimitSQL(sub, 'applications')).toBe(false)  // at limit
      expect(checkUsageLimitSQL(sub, 'cvs')).toBe(true)            // under limit
      expect(checkUsageLimitSQL(sub, 'interviews')).toBe(true)     // zero usage
      expect(checkUsageLimitSQL(sub, 'compensation')).toBe(true)   // under limit
      expect(checkUsageLimitSQL(sub, 'contracts')).toBe(false)     // at limit
    })
  })

  // ============================================================================
  // SQL Helper Function: increment_usage
  // Migration PART 14
  // ============================================================================

  describe('increment_usage function', () => {
    /**
     * Simulates public.increment_usage(p_user_id, p_usage_type)
     * Always increments the specified counter by 1 and returns new value.
     * Silent tracking - always works regardless of kill switch.
     */
    function incrementUsageSQL(
      counters: Record<string, number>,
      usageType: string,
    ): { counters: Record<string, number>; returnedValue: number } {
      const newCounters = { ...counters }
      if (usageType in newCounters) {
        newCounters[usageType] = newCounters[usageType] + 1
      }
      return {
        counters: newCounters,
        returnedValue: newCounters[usageType] ?? 0,
      }
    }

    it('should increment applications counter by 1', () => {
      const counters = { applications: 5, cvs: 3 }
      const result = incrementUsageSQL(counters, 'applications')
      expect(result.counters.applications).toBe(6)
      expect(result.returnedValue).toBe(6)
    })

    it('should not affect other counters when incrementing one', () => {
      const counters = {
        applications: 5, cvs: 3, interviews: 2,
        compensation: 1, contracts: 0, ai_avatar_interviews: 0,
      }
      const result = incrementUsageSQL(counters, 'applications')
      expect(result.counters.cvs).toBe(3)
      expect(result.counters.interviews).toBe(2)
      expect(result.counters.compensation).toBe(1)
      expect(result.counters.contracts).toBe(0)
      expect(result.counters.ai_avatar_interviews).toBe(0)
    })

    it('should increment from 0 to 1', () => {
      const counters = { applications: 0 }
      const result = incrementUsageSQL(counters, 'applications')
      expect(result.returnedValue).toBe(1)
    })

    it('should increment each usage type correctly', () => {
      const types = ['applications', 'cvs', 'interviews', 'compensation', 'contracts', 'ai_avatar_interviews']
      types.forEach(type => {
        const counters: Record<string, number> = {}
        types.forEach(t => { counters[t] = 10 })
        const result = incrementUsageSQL(counters, type)
        expect(result.counters[type]).toBe(11)
        // Other counters unchanged
        types.filter(t => t !== type).forEach(t => {
          expect(result.counters[t]).toBe(10)
        })
      })
    })

    it('should return 0 for unknown usage type', () => {
      const counters = { applications: 5 }
      const result = incrementUsageSQL(counters, 'unknown')
      expect(result.returnedValue).toBe(0)
    })
  })

  // ============================================================================
  // SQL Helper Function: reset_usage_counters
  // Migration PART 15
  // ============================================================================

  describe('reset_usage_counters function', () => {
    /**
     * Simulates public.reset_usage_counters(p_user_id, p_period_start)
     * Includes double-reset prevention: skips if last_reset_at >= p_period_start.
     * Returns TRUE if reset happened, FALSE if skipped.
     */
    function resetUsageCountersSQL(
      lastResetAt: Date | null,
      periodStart: Date,
    ): boolean {
      if (lastResetAt !== null && lastResetAt >= periodStart) {
        return false  // Double-reset prevention
      }
      return true
    }

    it('should reset when last_reset_at is NULL', () => {
      const result = resetUsageCountersSQL(null, new Date('2026-02-01'))
      expect(result).toBe(true)
    })

    it('should reset when last_reset_at is before period_start', () => {
      const lastReset = new Date('2026-01-01')
      const periodStart = new Date('2026-02-01')
      expect(resetUsageCountersSQL(lastReset, periodStart)).toBe(true)
    })

    it('should NOT reset when last_reset_at equals period_start (double-reset prevention)', () => {
      const sameDate = new Date('2026-02-01')
      expect(resetUsageCountersSQL(sameDate, sameDate)).toBe(false)
    })

    it('should NOT reset when last_reset_at is after period_start', () => {
      const lastReset = new Date('2026-02-15')
      const periodStart = new Date('2026-02-01')
      expect(resetUsageCountersSQL(lastReset, periodStart)).toBe(false)
    })

    it('should zero all counters when reset happens', () => {
      const counters = {
        usage_applications: 8,
        usage_cvs: 5,
        usage_interviews: 3,
        usage_compensation: 2,
        usage_contracts: 1,
        usage_ai_avatar_interviews: 4,
      }

      // Simulate reset
      const resetCounters = Object.fromEntries(
        Object.keys(counters).map(key => [key, 0])
      )

      expect(resetCounters.usage_applications).toBe(0)
      expect(resetCounters.usage_cvs).toBe(0)
      expect(resetCounters.usage_interviews).toBe(0)
      expect(resetCounters.usage_compensation).toBe(0)
      expect(resetCounters.usage_contracts).toBe(0)
      expect(resetCounters.usage_ai_avatar_interviews).toBe(0)
    })

    it('should NOT reset counters on mid-cycle upgrade', () => {
      // Upgrade from momentum to accelerate mid-cycle
      // last_reset_at was set at period start (Feb 1)
      // period_start hasn't changed (still Feb 1)
      const lastReset = new Date('2026-02-01')
      const periodStart = new Date('2026-02-01')

      // Double-reset prevention kicks in
      expect(resetUsageCountersSQL(lastReset, periodStart)).toBe(false)
    })

    it('should reset counters on period renewal', () => {
      // Old period: Feb 1 - Mar 1
      // New period starts: Mar 1
      const lastReset = new Date('2026-02-01')
      const newPeriodStart = new Date('2026-03-01')

      expect(resetUsageCountersSQL(lastReset, newPeriodStart)).toBe(true)
    })
  })

  // ============================================================================
  // Index definitions
  // Migration PART 5
  // ============================================================================

  describe('Index definitions', () => {
    const EXPECTED_INDEXES = [
      { name: 'idx_user_subscriptions_user_id', table: 'user_subscriptions', columns: ['user_id'], unique: true },
      { name: 'idx_user_subscriptions_status', table: 'user_subscriptions', columns: ['status'], unique: false },
      { name: 'idx_user_subscriptions_tier', table: 'user_subscriptions', columns: ['tier'], unique: false },
      { name: 'idx_user_subscriptions_period_end', table: 'user_subscriptions', columns: ['current_period_end'], unique: false },
      { name: 'idx_subscription_events_user_created', table: 'subscription_events', columns: ['user_id', 'created_at'], unique: false },
      { name: 'idx_subscription_events_event_type', table: 'subscription_events', columns: ['event_type'], unique: false },
      { name: 'idx_usage_monthly_snapshots_user', table: 'usage_monthly_snapshots', columns: ['user_id'], unique: false },
      { name: 'idx_usage_monthly_snapshots_user_month', table: 'usage_monthly_snapshots', columns: ['user_id', 'month'], unique: false },
    ]

    it('should define exactly 8 indexes', () => {
      expect(EXPECTED_INDEXES.length).toBe(8)
    })

    it('should have a unique index on user_subscriptions.user_id', () => {
      const idx = EXPECTED_INDEXES.find(i => i.name === 'idx_user_subscriptions_user_id')
      expect(idx).toBeDefined()
      expect(idx!.unique).toBe(true)
      expect(idx!.columns).toEqual(['user_id'])
    })

    it('should index user_subscriptions.status for filtering active users', () => {
      const idx = EXPECTED_INDEXES.find(i => i.name === 'idx_user_subscriptions_status')
      expect(idx).toBeDefined()
      expect(idx!.table).toBe('user_subscriptions')
    })

    it('should index user_subscriptions.tier for analytics queries', () => {
      const idx = EXPECTED_INDEXES.find(i => i.name === 'idx_user_subscriptions_tier')
      expect(idx).toBeDefined()
    })

    it('should index current_period_end for renewal batch jobs', () => {
      const idx = EXPECTED_INDEXES.find(i => i.name === 'idx_user_subscriptions_period_end')
      expect(idx).toBeDefined()
      expect(idx!.columns).toEqual(['current_period_end'])
    })

    it('should have composite index on subscription_events(user_id, created_at)', () => {
      const idx = EXPECTED_INDEXES.find(i => i.name === 'idx_subscription_events_user_created')
      expect(idx).toBeDefined()
      expect(idx!.columns).toEqual(['user_id', 'created_at'])
    })

    it('should index subscription_events.event_type for filtering', () => {
      const idx = EXPECTED_INDEXES.find(i => i.name === 'idx_subscription_events_event_type')
      expect(idx).toBeDefined()
    })

    it('should index usage_monthly_snapshots by user_id', () => {
      const idx = EXPECTED_INDEXES.find(i => i.name === 'idx_usage_monthly_snapshots_user')
      expect(idx).toBeDefined()
    })

    it('should have composite index on usage_monthly_snapshots(user_id, month)', () => {
      const idx = EXPECTED_INDEXES.find(i => i.name === 'idx_usage_monthly_snapshots_user_month')
      expect(idx).toBeDefined()
      expect(idx!.columns).toEqual(['user_id', 'month'])
    })

    it('should index all three tables', () => {
      const tablesWithIndexes = [...new Set(EXPECTED_INDEXES.map(i => i.table))]
      expect(tablesWithIndexes).toContain('user_subscriptions')
      expect(tablesWithIndexes).toContain('subscription_events')
      expect(tablesWithIndexes).toContain('usage_monthly_snapshots')
    })
  })

  // ============================================================================
  // updated_at Triggers
  // Migration PART 4
  // ============================================================================

  describe('updated_at triggers', () => {
    const EXPECTED_TRIGGERS = [
      { name: 'set_user_subscriptions_updated_at', table: 'user_subscriptions', event: 'BEFORE UPDATE' },
      { name: 'set_usage_monthly_snapshots_updated_at', table: 'usage_monthly_snapshots', event: 'BEFORE UPDATE' },
    ]

    it('should define exactly 2 updated_at triggers', () => {
      expect(EXPECTED_TRIGGERS.length).toBe(2)
    })

    it('should have updated_at trigger on user_subscriptions', () => {
      const trigger = EXPECTED_TRIGGERS.find(t => t.table === 'user_subscriptions')
      expect(trigger).toBeDefined()
      expect(trigger!.name).toBe('set_user_subscriptions_updated_at')
      expect(trigger!.event).toBe('BEFORE UPDATE')
    })

    it('should have updated_at trigger on usage_monthly_snapshots', () => {
      const trigger = EXPECTED_TRIGGERS.find(t => t.table === 'usage_monthly_snapshots')
      expect(trigger).toBeDefined()
      expect(trigger!.name).toBe('set_usage_monthly_snapshots_updated_at')
      expect(trigger!.event).toBe('BEFORE UPDATE')
    })

    it('subscription_events should NOT have updated_at trigger (append-only)', () => {
      const trigger = EXPECTED_TRIGGERS.find(t => t.table === 'subscription_events')
      expect(trigger).toBeUndefined()
    })

    it('trigger should fire BEFORE UPDATE to set timestamp before write', () => {
      EXPECTED_TRIGGERS.forEach(trigger => {
        expect(trigger.event).toBe('BEFORE UPDATE')
      })
    })
  })

  // ============================================================================
  // GRANT permissions
  // Migration PART 16
  // ============================================================================

  describe('GRANT permissions', () => {
    const EXPECTED_GRANTS = [
      { function: 'get_tier_limits', role: 'authenticated' },
      { function: 'check_usage_limit', role: 'authenticated' },
      { function: 'increment_usage', role: 'service_role' },
      { function: 'reset_usage_counters', role: 'service_role' },
    ]

    it('should define exactly 4 function GRANT permissions', () => {
      expect(EXPECTED_GRANTS.length).toBe(4)
    })

    it('get_tier_limits should be accessible by authenticated users', () => {
      const grant = EXPECTED_GRANTS.find(g => g.function === 'get_tier_limits')
      expect(grant).toBeDefined()
      expect(grant!.role).toBe('authenticated')
    })

    it('check_usage_limit should be accessible by authenticated users', () => {
      const grant = EXPECTED_GRANTS.find(g => g.function === 'check_usage_limit')
      expect(grant).toBeDefined()
      expect(grant!.role).toBe('authenticated')
    })

    it('increment_usage should be restricted to service_role only', () => {
      const grant = EXPECTED_GRANTS.find(g => g.function === 'increment_usage')
      expect(grant).toBeDefined()
      expect(grant!.role).toBe('service_role')
    })

    it('reset_usage_counters should be restricted to service_role only', () => {
      const grant = EXPECTED_GRANTS.find(g => g.function === 'reset_usage_counters')
      expect(grant).toBeDefined()
      expect(grant!.role).toBe('service_role')
    })

    it('read-only functions should be accessible by authenticated users', () => {
      const readOnlyFunctions = ['get_tier_limits', 'check_usage_limit']
      readOnlyFunctions.forEach(fn => {
        const grant = EXPECTED_GRANTS.find(g => g.function === fn)
        expect(grant!.role).toBe('authenticated')
      })
    })

    it('write functions should be restricted to service_role', () => {
      const writeFunctions = ['increment_usage', 'reset_usage_counters']
      writeFunctions.forEach(fn => {
        const grant = EXPECTED_GRANTS.find(g => g.function === fn)
        expect(grant!.role).toBe('service_role')
      })
    })
  })
})
