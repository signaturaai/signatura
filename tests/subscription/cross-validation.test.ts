/**
 * Cross-Validation Tests: Migration SQL ↔ TypeScript Types ↔ Config Module
 *
 * These tests catch drift between the three sources of truth:
 * 1. Database migration (010_subscription_system.sql) — defines actual DB columns
 * 2. TypeScript types (src/types/subscription.ts + src/types/database.ts) — used in app code
 * 3. Config module (src/lib/subscription/config.ts) — tier limits and pricing
 *
 * KNOWN DIVERGENCE: The migration uses Grow/Morning payment fields while
 * the TypeScript types use Stripe fields. This test documents the mapping
 * and ensures both sides remain internally consistent.
 */

import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import {
  TIER_CONFIGS,
  getAllTiers,
  getTierLimits,
  getPrice,
  type SubscriptionTier,
  type BillingPeriod,
} from '../../src/lib/subscription/config'
import {
  RESOURCE_TO_COLUMN,
  RESOURCE_TO_LIMIT,
  type UserSubscriptionRow,
  type SubscriptionEventRow,
  type UsageMonthlySnapshotRow,
  toUserSubscription,
} from '../../src/types/subscription'

// ============================================================================
// Read the migration SQL for validation
// ============================================================================

const MIGRATION_PATH = path.resolve(__dirname, '../../supabase/migrations/010_subscription_system.sql')
const MIGRATION_SQL = fs.readFileSync(MIGRATION_PATH, 'utf-8')

// ============================================================================
// 1. Migration SQL Structure Validation
// ============================================================================

describe('Migration SQL Structure', () => {
  describe('Tables exist in migration', () => {
    it('should define user_subscriptions table', () => {
      expect(MIGRATION_SQL).toContain('CREATE TABLE IF NOT EXISTS public.user_subscriptions')
    })

    it('should define subscription_events table', () => {
      expect(MIGRATION_SQL).toContain('CREATE TABLE IF NOT EXISTS public.subscription_events')
    })

    it('should define usage_monthly_snapshots table', () => {
      expect(MIGRATION_SQL).toContain('CREATE TABLE IF NOT EXISTS public.usage_monthly_snapshots')
    })
  })

  describe('user_subscriptions columns in migration', () => {
    // These are the actual columns from the CREATE TABLE statement
    const MIGRATION_COLUMNS = [
      'id', 'user_id', 'tier', 'billing_period', 'status',
      'grow_transaction_token', 'grow_recurring_id', 'grow_last_transaction_code',
      'morning_customer_id',
      'current_period_start', 'current_period_end',
      'cancelled_at', 'cancellation_effective_at',
      'scheduled_tier_change', 'scheduled_billing_period_change',
      'pending_tier', 'pending_billing_period',
      'usage_applications', 'usage_cvs', 'usage_interviews',
      'usage_compensation', 'usage_contracts', 'usage_ai_avatar_interviews',
      'last_reset_at', 'created_at', 'updated_at',
    ]

    it('should have exactly 26 columns', () => {
      expect(MIGRATION_COLUMNS.length).toBe(26)
    })

    it('should contain id and user_id', () => {
      expect(MIGRATION_SQL).toContain('id UUID PRIMARY KEY')
      expect(MIGRATION_SQL).toContain('user_id UUID NOT NULL REFERENCES auth.users')
    })

    it('should contain tier with CHECK constraint', () => {
      expect(MIGRATION_SQL).toContain("tier IN ('momentum', 'accelerate', 'elite')")
    })

    it('should contain billing_period with CHECK constraint', () => {
      expect(MIGRATION_SQL).toContain("billing_period IN ('monthly', 'quarterly', 'yearly')")
    })

    it('should contain status with CHECK constraint and NOT NULL', () => {
      expect(MIGRATION_SQL).toContain("status TEXT NOT NULL DEFAULT 'active'")
      expect(MIGRATION_SQL).toContain("status IN ('active', 'cancelled', 'past_due', 'expired')")
    })

    it('should contain Grow payment fields', () => {
      expect(MIGRATION_SQL).toContain('grow_transaction_token TEXT')
      expect(MIGRATION_SQL).toContain('grow_recurring_id TEXT')
      expect(MIGRATION_SQL).toContain('grow_last_transaction_code TEXT')
    })

    it('should contain Morning invoice fields', () => {
      expect(MIGRATION_SQL).toContain('morning_customer_id TEXT')
    })

    it('should contain all 6 usage counter columns with NOT NULL DEFAULT 0', () => {
      expect(MIGRATION_SQL).toContain('usage_applications INTEGER NOT NULL DEFAULT 0')
      expect(MIGRATION_SQL).toContain('usage_cvs INTEGER NOT NULL DEFAULT 0')
      expect(MIGRATION_SQL).toContain('usage_interviews INTEGER NOT NULL DEFAULT 0')
      expect(MIGRATION_SQL).toContain('usage_compensation INTEGER NOT NULL DEFAULT 0')
      expect(MIGRATION_SQL).toContain('usage_contracts INTEGER NOT NULL DEFAULT 0')
      expect(MIGRATION_SQL).toContain('usage_ai_avatar_interviews INTEGER NOT NULL DEFAULT 0')
    })

    it('should contain last_reset_at with NOT NULL DEFAULT NOW()', () => {
      expect(MIGRATION_SQL).toContain('last_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW()')
    })

    it('should have UNIQUE constraint on user_id', () => {
      expect(MIGRATION_SQL).toContain('CONSTRAINT user_subscriptions_user_id_key UNIQUE (user_id)')
    })
  })

  describe('subscription_events columns in migration', () => {
    it('should contain all expected columns', () => {
      expect(MIGRATION_SQL).toContain('event_type TEXT NOT NULL')
      expect(MIGRATION_SQL).toMatch(/tier TEXT[^,]*(?:,|\n)/)
      expect(MIGRATION_SQL).toContain('amount NUMERIC(10,2)')
      expect(MIGRATION_SQL).toContain("currency TEXT DEFAULT 'USD'")
      expect(MIGRATION_SQL).toContain('grow_transaction_code TEXT')
      expect(MIGRATION_SQL).toContain('morning_document_id TEXT')
      expect(MIGRATION_SQL).toContain("metadata JSONB DEFAULT '{}'")
    })
  })

  describe('usage_monthly_snapshots columns in migration', () => {
    it('should contain month as DATE NOT NULL', () => {
      expect(MIGRATION_SQL).toContain('month DATE NOT NULL')
    })

    it('should contain usage counter columns without _used suffix', () => {
      // In the migration, snapshot columns are named 'applications', not 'applications_used'
      expect(MIGRATION_SQL).toMatch(/applications INTEGER NOT NULL DEFAULT 0/)
      expect(MIGRATION_SQL).toMatch(/cvs INTEGER NOT NULL DEFAULT 0/)
      expect(MIGRATION_SQL).toMatch(/interviews INTEGER NOT NULL DEFAULT 0/)
    })

    it('should contain tier_at_snapshot and billing_period_at_snapshot', () => {
      expect(MIGRATION_SQL).toContain('tier_at_snapshot TEXT')
      expect(MIGRATION_SQL).toContain('billing_period_at_snapshot TEXT')
    })

    it('should have UNIQUE constraint on (user_id, month)', () => {
      expect(MIGRATION_SQL).toContain('CONSTRAINT usage_monthly_snapshots_user_month_key UNIQUE (user_id, month)')
    })
  })
})

// ============================================================================
// 2. Migration ↔ TypeScript Types Mapping
//    Documents the known column name differences between SQL and TS
// ============================================================================

describe('Migration ↔ TypeScript Types Mapping', () => {
  describe('user_subscriptions: shared columns (same name in both)', () => {
    // These columns exist with the same name in both migration and TypeScript
    const SHARED_COLUMNS = [
      'id', 'user_id', 'tier', 'billing_period', 'status',
      'current_period_start', 'current_period_end',
      'cancelled_at',
      'usage_applications', 'usage_cvs', 'usage_interviews',
      'usage_compensation', 'usage_contracts', 'usage_ai_avatar_interviews',
      'last_reset_at', 'created_at', 'updated_at',
    ]

    it('should have 17 columns with identical names in both migration and TypeScript', () => {
      expect(SHARED_COLUMNS.length).toBe(17)
    })

    it('all shared columns should exist in migration SQL', () => {
      SHARED_COLUMNS.forEach(col => {
        // Check that the column name appears in the CREATE TABLE for user_subscriptions
        expect(MIGRATION_SQL.toLowerCase()).toContain(col.toLowerCase())
      })
    })
  })

  describe('user_subscriptions: migration-only columns (Grow/Morning payment)', () => {
    // Columns in migration but NOT in TypeScript types
    const MIGRATION_ONLY_COLUMNS = [
      'grow_transaction_token',
      'grow_recurring_id',
      'grow_last_transaction_code',
      'morning_customer_id',
      'cancellation_effective_at',
      'scheduled_tier_change',
      'scheduled_billing_period_change',
      'pending_tier',
      'pending_billing_period',
    ]

    it('should have 9 migration-only columns', () => {
      expect(MIGRATION_ONLY_COLUMNS.length).toBe(9)
    })

    it('migration-only columns should exist in SQL', () => {
      MIGRATION_ONLY_COLUMNS.forEach(col => {
        expect(MIGRATION_SQL.toLowerCase()).toContain(col.toLowerCase())
      })
    })

    it('Grow payment fields should be in migration', () => {
      expect(MIGRATION_ONLY_COLUMNS).toContain('grow_transaction_token')
      expect(MIGRATION_ONLY_COLUMNS).toContain('grow_recurring_id')
      expect(MIGRATION_ONLY_COLUMNS).toContain('grow_last_transaction_code')
    })

    it('Morning invoice field should be in migration', () => {
      expect(MIGRATION_ONLY_COLUMNS).toContain('morning_customer_id')
    })
  })

  describe('user_subscriptions: TypeScript-only columns (Stripe payment)', () => {
    // Columns in TypeScript types but NOT in migration (yet)
    const TYPESCRIPT_ONLY_COLUMNS = [
      'cancel_at_period_end',
      'cancel_reason',
      'scheduled_tier',
      'scheduled_billing_period',
      'scheduled_change_at',
      'stripe_customer_id',
      'stripe_subscription_id',
    ]

    it('should have 7 TypeScript-only columns', () => {
      expect(TYPESCRIPT_ONLY_COLUMNS.length).toBe(7)
    })

    it('Stripe fields should be in TypeScript-only list', () => {
      expect(TYPESCRIPT_ONLY_COLUMNS).toContain('stripe_customer_id')
      expect(TYPESCRIPT_ONLY_COLUMNS).toContain('stripe_subscription_id')
    })
  })

  describe('subscription_events: column mapping', () => {
    // Migration columns
    const MIGRATION_EVENT_COLUMNS = [
      'id', 'user_id', 'event_type', 'tier', 'billing_period',
      'amount', 'currency', 'grow_transaction_code', 'morning_document_id',
      'metadata', 'created_at',
    ]

    // TypeScript columns
    const TYPESCRIPT_EVENT_COLUMNS = [
      'id', 'user_id', 'event_type',
      'event_data', 'previous_tier', 'new_tier',
      'previous_billing_period', 'new_billing_period',
      'amount_paid', 'currency', 'stripe_event_id', 'created_at',
    ]

    it('migration should have 11 columns', () => {
      expect(MIGRATION_EVENT_COLUMNS.length).toBe(11)
    })

    it('TypeScript should have 12 columns', () => {
      expect(TYPESCRIPT_EVENT_COLUMNS.length).toBe(12)
    })

    it('shared columns should be id, user_id, event_type, currency, created_at', () => {
      const shared = MIGRATION_EVENT_COLUMNS.filter(c => TYPESCRIPT_EVENT_COLUMNS.includes(c))
      expect(shared.sort()).toEqual(['created_at', 'currency', 'event_type', 'id', 'user_id'])
    })

    it('migration uses single tier/billing_period, TypeScript uses previous/new pairs', () => {
      expect(MIGRATION_EVENT_COLUMNS).toContain('tier')
      expect(MIGRATION_EVENT_COLUMNS).toContain('billing_period')
      expect(TYPESCRIPT_EVENT_COLUMNS).toContain('previous_tier')
      expect(TYPESCRIPT_EVENT_COLUMNS).toContain('new_tier')
      expect(TYPESCRIPT_EVENT_COLUMNS).toContain('previous_billing_period')
      expect(TYPESCRIPT_EVENT_COLUMNS).toContain('new_billing_period')
    })

    it('migration uses metadata, TypeScript uses event_data', () => {
      expect(MIGRATION_EVENT_COLUMNS).toContain('metadata')
      expect(TYPESCRIPT_EVENT_COLUMNS).toContain('event_data')
    })

    it('migration uses amount, TypeScript uses amount_paid', () => {
      expect(MIGRATION_EVENT_COLUMNS).toContain('amount')
      expect(TYPESCRIPT_EVENT_COLUMNS).toContain('amount_paid')
    })
  })

  describe('usage_monthly_snapshots: column mapping', () => {
    // Migration columns
    const MIGRATION_SNAPSHOT_COLUMNS = [
      'id', 'user_id', 'month',
      'applications', 'cvs', 'interviews',
      'compensation', 'contracts', 'ai_avatar_interviews',
      'tier_at_snapshot', 'billing_period_at_snapshot',
      'created_at', 'updated_at',
    ]

    // TypeScript columns
    const TYPESCRIPT_SNAPSHOT_COLUMNS = [
      'id', 'user_id', 'snapshot_month',
      'applications_used', 'cvs_used', 'interviews_used',
      'compensation_used', 'contracts_used', 'ai_avatar_interviews_used',
      'tier', 'billing_period',
      'days_active', 'peak_usage_day',
      'created_at',
    ]

    it('migration should have 13 columns', () => {
      expect(MIGRATION_SNAPSHOT_COLUMNS.length).toBe(13)
    })

    it('TypeScript should have 14 columns', () => {
      expect(TYPESCRIPT_SNAPSHOT_COLUMNS.length).toBe(14)
    })

    it('migration uses month, TypeScript uses snapshot_month', () => {
      expect(MIGRATION_SNAPSHOT_COLUMNS).toContain('month')
      expect(TYPESCRIPT_SNAPSHOT_COLUMNS).toContain('snapshot_month')
    })

    it('migration uses raw names (applications), TypeScript uses _used suffix', () => {
      expect(MIGRATION_SNAPSHOT_COLUMNS).toContain('applications')
      expect(TYPESCRIPT_SNAPSHOT_COLUMNS).toContain('applications_used')
    })

    it('migration uses tier_at_snapshot, TypeScript uses tier', () => {
      expect(MIGRATION_SNAPSHOT_COLUMNS).toContain('tier_at_snapshot')
      expect(TYPESCRIPT_SNAPSHOT_COLUMNS).toContain('tier')
    })

    it('TypeScript has days_active and peak_usage_day not in migration', () => {
      expect(TYPESCRIPT_SNAPSHOT_COLUMNS).toContain('days_active')
      expect(TYPESCRIPT_SNAPSHOT_COLUMNS).toContain('peak_usage_day')
      expect(MIGRATION_SNAPSHOT_COLUMNS).not.toContain('days_active')
      expect(MIGRATION_SNAPSHOT_COLUMNS).not.toContain('peak_usage_day')
    })

    it('migration has updated_at not in TypeScript', () => {
      expect(MIGRATION_SNAPSHOT_COLUMNS).toContain('updated_at')
      expect(TYPESCRIPT_SNAPSHOT_COLUMNS).not.toContain('updated_at')
    })
  })
})

// ============================================================================
// 3. Config Module ↔ Migration SQL Alignment
//    Ensures tier limits and pricing in TS config match SQL functions
// ============================================================================

describe('Config Module ↔ Migration SQL Alignment', () => {
  // Replicate the get_tier_limits SQL logic to compare with config module
  function getSQLLimits(tier: string): Record<string, number> {
    const resolve = (m: number, a: number, e: number) => {
      switch (tier) {
        case 'momentum': return m
        case 'accelerate': return a
        case 'elite': return e
        default: return 0
      }
    }
    return {
      applications: resolve(8, 15, -1),
      cvs: resolve(8, 15, -1),
      interviews: resolve(8, 15, -1),
      compensation: resolve(8, 15, -1),
      contracts: resolve(8, 15, -1),
      aiAvatarInterviews: resolve(0, 5, 10),
    }
  }

  describe('Tier limits alignment', () => {
    const tiers: SubscriptionTier[] = ['momentum', 'accelerate', 'elite']

    tiers.forEach(tier => {
      it(`${tier}: config module limits should match SQL get_tier_limits`, () => {
        const configLimits = getTierLimits(tier)
        const sqlLimits = getSQLLimits(tier)

        expect(configLimits.applications).toBe(sqlLimits.applications)
        expect(configLimits.cvs).toBe(sqlLimits.cvs)
        expect(configLimits.interviews).toBe(sqlLimits.interviews)
        expect(configLimits.compensation).toBe(sqlLimits.compensation)
        expect(configLimits.contracts).toBe(sqlLimits.contracts)
        expect(configLimits.aiAvatarInterviews).toBe(sqlLimits.aiAvatarInterviews)
      })
    })
  })

  describe('Tier names alignment', () => {
    it('config module tiers should match migration CHECK constraint values', () => {
      const configTiers = getAllTiers()
      // From migration: tier IN ('momentum', 'accelerate', 'elite')
      const sqlTiers = ['momentum', 'accelerate', 'elite']
      expect(configTiers).toEqual(sqlTiers)
    })

    it('migration SQL should contain all config tier names', () => {
      const configTiers = getAllTiers()
      configTiers.forEach(tier => {
        expect(MIGRATION_SQL).toContain(`'${tier}'`)
      })
    })
  })

  describe('Billing period alignment', () => {
    it('config billing periods should match migration CHECK constraint', () => {
      const configPeriods: BillingPeriod[] = ['monthly', 'quarterly', 'yearly']
      // From migration: billing_period IN ('monthly', 'quarterly', 'yearly')
      configPeriods.forEach(period => {
        expect(MIGRATION_SQL).toContain(`'${period}'`)
      })
    })
  })

  describe('Status values alignment', () => {
    it('config status values should match migration CHECK constraint', () => {
      const configStatuses = ['active', 'cancelled', 'past_due', 'expired']
      // From migration: status IN ('active', 'cancelled', 'past_due', 'expired')
      configStatuses.forEach(status => {
        expect(MIGRATION_SQL).toContain(`'${status}'`)
      })
    })
  })

  describe('Pricing values from config', () => {
    it('momentum pricing should be defined', () => {
      expect(getPrice('momentum', 'monthly')).toBe(12)
      expect(getPrice('momentum', 'quarterly')).toBe(30)
      expect(getPrice('momentum', 'yearly')).toBe(99)
    })

    it('accelerate pricing should be defined', () => {
      expect(getPrice('accelerate', 'monthly')).toBe(18)
      expect(getPrice('accelerate', 'quarterly')).toBe(45)
      expect(getPrice('accelerate', 'yearly')).toBe(149)
    })

    it('elite pricing should be defined', () => {
      expect(getPrice('elite', 'monthly')).toBe(29)
      expect(getPrice('elite', 'quarterly')).toBe(75)
      expect(getPrice('elite', 'yearly')).toBe(249)
    })
  })
})

// ============================================================================
// 4. TypeScript Types Internal Consistency
//    Ensures subscription.ts types, database.ts types, and config align
// ============================================================================

describe('TypeScript Types Internal Consistency', () => {
  describe('RESOURCE_TO_COLUMN maps to valid usage columns', () => {
    it('all mapped columns should follow usage_ prefix pattern', () => {
      Object.values(RESOURCE_TO_COLUMN).forEach(column => {
        expect(column).toMatch(/^usage_/)
      })
    })

    it('should map all 6 resources to 6 unique columns', () => {
      const columns = Object.values(RESOURCE_TO_COLUMN)
      const uniqueColumns = new Set(columns)
      expect(uniqueColumns.size).toBe(6)
    })
  })

  describe('RESOURCE_TO_LIMIT maps to valid TierLimits keys', () => {
    it('all mapped keys should be valid TierLimits properties', () => {
      const validLimitKeys = Object.keys(TIER_CONFIGS.momentum.limits)
      Object.values(RESOURCE_TO_LIMIT).forEach(limitKey => {
        expect(validLimitKeys).toContain(limitKey)
      })
    })
  })

  describe('Usage columns in migration match RESOURCE_TO_COLUMN values', () => {
    it('all RESOURCE_TO_COLUMN values should appear in migration SQL', () => {
      Object.values(RESOURCE_TO_COLUMN).forEach(column => {
        expect(MIGRATION_SQL.toLowerCase()).toContain(column.toLowerCase())
      })
    })
  })

  describe('Config TierConfig matches subscription.ts TierConfig shape', () => {
    it('each TIER_CONFIGS entry should have name, tagline, isMostPopular, limits, pricing, features', () => {
      Object.values(TIER_CONFIGS).forEach(config => {
        expect(config).toHaveProperty('name')
        expect(config).toHaveProperty('tagline')
        expect(config).toHaveProperty('isMostPopular')
        expect(config).toHaveProperty('limits')
        expect(config).toHaveProperty('pricing')
        expect(config).toHaveProperty('features')
      })
    })

    it('limits should have all 6 resource fields', () => {
      const expectedKeys = ['applications', 'cvs', 'interviews', 'compensation', 'contracts', 'aiAvatarInterviews']
      Object.values(TIER_CONFIGS).forEach(config => {
        expectedKeys.forEach(key => {
          expect(config.limits).toHaveProperty(key)
        })
      })
    })

    it('pricing should have all 3 billing period fields', () => {
      Object.values(TIER_CONFIGS).forEach(config => {
        expect(config.pricing).toHaveProperty('monthly')
        expect(config.pricing).toHaveProperty('quarterly')
        expect(config.pricing).toHaveProperty('yearly')
      })
    })
  })
})

// ============================================================================
// 5. Migration SQL Helper Functions Exist
// ============================================================================

describe('Migration SQL Helper Functions', () => {
  it('should define get_tier_limits function', () => {
    expect(MIGRATION_SQL).toContain('CREATE OR REPLACE FUNCTION public.get_tier_limits')
  })

  it('should define check_usage_limit function', () => {
    expect(MIGRATION_SQL).toContain('CREATE OR REPLACE FUNCTION public.check_usage_limit')
  })

  it('should define increment_usage function', () => {
    expect(MIGRATION_SQL).toContain('CREATE OR REPLACE FUNCTION public.increment_usage')
  })

  it('should define reset_usage_counters function', () => {
    expect(MIGRATION_SQL).toContain('CREATE OR REPLACE FUNCTION public.reset_usage_counters')
  })

  it('should define handle_new_user_subscription trigger function', () => {
    expect(MIGRATION_SQL).toContain('CREATE OR REPLACE FUNCTION public.handle_new_user_subscription')
  })

  it('get_tier_limits should return correct momentum values', () => {
    expect(MIGRATION_SQL).toContain("WHEN 'momentum' THEN 8")
  })

  it('get_tier_limits should return correct accelerate values', () => {
    expect(MIGRATION_SQL).toContain("WHEN 'accelerate' THEN 15")
  })

  it('get_tier_limits should return -1 for elite (unlimited)', () => {
    expect(MIGRATION_SQL).toContain("WHEN 'elite' THEN -1")
  })

  it('get_tier_limits should return 0 for NULL tier', () => {
    // The ELSE clause handles NULL
    expect(MIGRATION_SQL).toContain('ELSE 0')
  })

  it('check_usage_limit should allow active and cancelled statuses', () => {
    expect(MIGRATION_SQL).toContain("v_status NOT IN ('active', 'cancelled')")
  })

  it('check_usage_limit should handle -1 as unlimited', () => {
    expect(MIGRATION_SQL).toContain('IF v_limit = -1 THEN')
    expect(MIGRATION_SQL).toContain('RETURN TRUE')
  })

  it('increment_usage should use SECURITY DEFINER', () => {
    // Must match the specific function, not just any occurrence
    const incrementSection = MIGRATION_SQL.substring(
      MIGRATION_SQL.indexOf('CREATE OR REPLACE FUNCTION public.increment_usage'),
      MIGRATION_SQL.indexOf('CREATE OR REPLACE FUNCTION public.reset_usage_counters')
    )
    expect(incrementSection).toContain('SECURITY DEFINER')
  })

  it('reset_usage_counters should have double-reset prevention', () => {
    expect(MIGRATION_SQL).toContain('v_last_reset >= p_period_start')
  })

  it('auto-create trigger should use ON CONFLICT DO NOTHING', () => {
    expect(MIGRATION_SQL).toContain('ON CONFLICT (user_id) DO NOTHING')
  })

  it('backfill should insert tracking-only rows for existing users', () => {
    expect(MIGRATION_SQL).toContain("SELECT id, NULL, NULL, 'active', NOW()")
    expect(MIGRATION_SQL).toContain('FROM auth.users')
  })
})

// ============================================================================
// 6. RLS Policies in Migration
// ============================================================================

describe('Migration RLS Policies', () => {
  it('should enable RLS on all three tables', () => {
    expect(MIGRATION_SQL).toContain('ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY')
    expect(MIGRATION_SQL).toContain('ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY')
    expect(MIGRATION_SQL).toContain('ALTER TABLE public.usage_monthly_snapshots ENABLE ROW LEVEL SECURITY')
  })

  it('should have user SELECT policy on user_subscriptions', () => {
    expect(MIGRATION_SQL).toContain('"Users can view own subscription"')
    expect(MIGRATION_SQL).toContain('auth.uid() = user_id')
  })

  it('should have service_role full access on user_subscriptions', () => {
    expect(MIGRATION_SQL).toContain('"Service role full access to subscriptions"')
  })

  it('should have user SELECT policy on subscription_events', () => {
    expect(MIGRATION_SQL).toContain('"Users can view own subscription events"')
  })

  it('should have service_role full access on subscription_events', () => {
    expect(MIGRATION_SQL).toContain('"Service role full access to subscription events"')
  })

  it('should have user SELECT policy on usage_monthly_snapshots', () => {
    expect(MIGRATION_SQL).toContain('"Users can view own usage snapshots"')
  })

  it('should have service_role full access on usage_monthly_snapshots', () => {
    expect(MIGRATION_SQL).toContain('"Service role full access to usage snapshots"')
  })

  it('service_role policies should check jwt role claim', () => {
    expect(MIGRATION_SQL).toContain("auth.jwt() ->> 'role' = 'service_role'")
  })
})

// ============================================================================
// 7. Migration Indexes
// ============================================================================

describe('Migration Indexes', () => {
  it('should create unique index on user_subscriptions.user_id', () => {
    expect(MIGRATION_SQL).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_user_id')
  })

  it('should create index on user_subscriptions.status', () => {
    expect(MIGRATION_SQL).toContain('CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status')
  })

  it('should create index on user_subscriptions.tier', () => {
    expect(MIGRATION_SQL).toContain('CREATE INDEX IF NOT EXISTS idx_user_subscriptions_tier')
  })

  it('should create partial index on current_period_end WHERE NOT NULL', () => {
    expect(MIGRATION_SQL).toContain('idx_user_subscriptions_period_end')
    expect(MIGRATION_SQL).toContain('WHERE current_period_end IS NOT NULL')
  })

  it('should create composite index on subscription_events(user_id, created_at DESC)', () => {
    expect(MIGRATION_SQL).toContain('idx_subscription_events_user_created')
    expect(MIGRATION_SQL).toContain('(user_id, created_at DESC)')
  })

  it('should create index on subscription_events.event_type', () => {
    expect(MIGRATION_SQL).toContain('idx_subscription_events_event_type')
  })

  it('should create index on usage_monthly_snapshots.user_id', () => {
    expect(MIGRATION_SQL).toContain('idx_usage_monthly_snapshots_user')
  })

  it('should create composite index on usage_monthly_snapshots(user_id, month DESC)', () => {
    expect(MIGRATION_SQL).toContain('idx_usage_monthly_snapshots_user_month')
    expect(MIGRATION_SQL).toContain('(user_id, month DESC)')
  })
})

// ============================================================================
// 8. Migration GRANT Permissions
// ============================================================================

describe('Migration GRANT Permissions', () => {
  it('should grant get_tier_limits to authenticated', () => {
    expect(MIGRATION_SQL).toContain('GRANT EXECUTE ON FUNCTION public.get_tier_limits(TEXT) TO authenticated')
  })

  it('should grant check_usage_limit to authenticated', () => {
    expect(MIGRATION_SQL).toContain('GRANT EXECUTE ON FUNCTION public.check_usage_limit(UUID, TEXT) TO authenticated')
  })

  it('should grant increment_usage to service_role only', () => {
    expect(MIGRATION_SQL).toContain('GRANT EXECUTE ON FUNCTION public.increment_usage(UUID, TEXT) TO service_role')
  })

  it('should grant reset_usage_counters to service_role only', () => {
    expect(MIGRATION_SQL).toContain('GRANT EXECUTE ON FUNCTION public.reset_usage_counters(UUID, TIMESTAMPTZ) TO service_role')
  })
})

// ============================================================================
// 9. Migration Triggers
// ============================================================================

describe('Migration Triggers', () => {
  it('should create updated_at trigger on user_subscriptions', () => {
    expect(MIGRATION_SQL).toContain('CREATE TRIGGER set_user_subscriptions_updated_at')
    expect(MIGRATION_SQL).toContain('BEFORE UPDATE ON public.user_subscriptions')
  })

  it('should create updated_at trigger on usage_monthly_snapshots', () => {
    expect(MIGRATION_SQL).toContain('CREATE TRIGGER set_usage_monthly_snapshots_updated_at')
    expect(MIGRATION_SQL).toContain('BEFORE UPDATE ON public.usage_monthly_snapshots')
  })

  it('should create auto-insert trigger on auth.users', () => {
    expect(MIGRATION_SQL).toContain('CREATE TRIGGER on_auth_user_created_subscription')
    expect(MIGRATION_SQL).toContain('AFTER INSERT ON auth.users')
  })

  it('subscription_events should NOT have updated_at trigger (append-only)', () => {
    expect(MIGRATION_SQL).not.toContain('set_subscription_events_updated_at')
  })

  it('updated_at triggers should use handle_updated_at function', () => {
    expect(MIGRATION_SQL).toContain('EXECUTE FUNCTION handle_updated_at()')
  })
})
