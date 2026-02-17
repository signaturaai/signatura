/**
 * RALPH Tests for Subscription TypeScript Types
 *
 * Tests the type definitions, conversion utilities, and constants
 * in src/types/subscription.ts
 *
 * Test Categories:
 * 1. Core Type Validation - Verify type unions have correct values
 * 2. Interface Structure - Verify interfaces have all required fields
 * 3. Utility Constants - Verify RESOURCE_TO_COLUMN and RESOURCE_TO_LIMIT mappings
 * 4. Conversion Functions - Verify snake_case to camelCase conversions
 * 5. Type Compatibility - Verify alignment with config module
 * 6. Database Type Alignment - Verify types match database schema
 */

import { describe, it, expect } from 'vitest'
import {
  // Core types
  type SubscriptionTier,
  type BillingPeriod,
  type SubscriptionStatus,
  type SubscriptionResource,
  type SubscriptionEventType,
  type FeatureAccessReason,

  // Database row types
  type UserSubscription,
  type UserSubscriptionRow,
  type SubscriptionEvent,
  type SubscriptionEventRow,
  type UsageMonthlySnapshot,
  type UsageMonthlySnapshotRow,

  // Configuration types
  type TierLimits,
  type TierPricing,
  type TierConfig,

  // Runtime check types
  type UsageLimitCheck,
  type FeatureAccessCheck,

  // Analytics types
  type UsageAverages,
  type TierRecommendation,

  // API types
  type SubscriptionUpdateRequest,
  type SubscriptionCancelRequest,
  type SubscriptionOperationResponse,
  type UsageIncrementRequest,
  type UsageIncrementResponse,

  // Utility constants
  RESOURCE_TO_COLUMN,
  RESOURCE_TO_LIMIT,

  // Conversion functions
  toUserSubscription,
  toSubscriptionEvent,
  toUsageMonthlySnapshot,
} from '../../src/types/subscription'

import {
  type SubscriptionTier as ConfigTier,
  type BillingPeriod as ConfigBillingPeriod,
  type SubscriptionStatus as ConfigStatus,
  TIER_CONFIGS,
  getAllTiers,
} from '../../src/lib/subscription/config'

// ============================================================================
// Test Data Fixtures
// ============================================================================

const createMockUserSubscriptionRow = (overrides: Partial<UserSubscriptionRow> = {}): UserSubscriptionRow => ({
  id: 'sub-uuid-123',
  user_id: 'user-uuid-456',
  tier: 'accelerate',
  billing_period: 'monthly',
  status: 'active',
  current_period_start: '2024-01-01T00:00:00Z',
  current_period_end: '2024-02-01T00:00:00Z',
  cancel_at_period_end: false,
  cancelled_at: null,
  cancel_reason: null,
  scheduled_tier: null,
  scheduled_billing_period: null,
  scheduled_change_at: null,
  stripe_customer_id: 'cus_abc123',
  stripe_subscription_id: 'sub_xyz789',
  usage_applications: 5,
  usage_cvs: 3,
  usage_interviews: 2,
  usage_compensation: 1,
  usage_contracts: 0,
  usage_ai_avatar_interviews: 0,
  last_reset_at: '2024-01-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T12:00:00Z',
  ...overrides,
})

const createMockSubscriptionEventRow = (overrides: Partial<SubscriptionEventRow> = {}): SubscriptionEventRow => ({
  id: 'event-uuid-123',
  user_id: 'user-uuid-456',
  event_type: 'subscription_created',
  event_data: { source: 'checkout' },
  previous_tier: null,
  new_tier: 'momentum',
  previous_billing_period: null,
  new_billing_period: 'monthly',
  amount_paid: 1200,
  currency: 'USD',
  stripe_event_id: 'evt_123',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

const createMockUsageSnapshotRow = (overrides: Partial<UsageMonthlySnapshotRow> = {}): UsageMonthlySnapshotRow => ({
  id: 'snapshot-uuid-123',
  user_id: 'user-uuid-456',
  snapshot_month: '2024-01',
  tier: 'accelerate',
  billing_period: 'monthly',
  applications_used: 12,
  cvs_used: 8,
  interviews_used: 6,
  compensation_used: 4,
  contracts_used: 3,
  ai_avatar_interviews_used: 2,
  days_active: 25,
  peak_usage_day: '2024-01-15',
  created_at: '2024-02-01T00:00:00Z',
  ...overrides,
})

// ============================================================================
// 1. Core Type Validation
// ============================================================================

describe('Core Type Validation', () => {
  describe('SubscriptionTier', () => {
    const VALID_TIERS: SubscriptionTier[] = ['momentum', 'accelerate', 'elite']

    it('should have exactly 3 tiers', () => {
      expect(VALID_TIERS.length).toBe(3)
    })

    it('should include momentum tier', () => {
      expect(VALID_TIERS).toContain('momentum')
    })

    it('should include accelerate tier', () => {
      expect(VALID_TIERS).toContain('accelerate')
    })

    it('should include elite tier', () => {
      expect(VALID_TIERS).toContain('elite')
    })

    it('should match config module tiers', () => {
      const configTiers = getAllTiers()
      expect(VALID_TIERS).toEqual(configTiers)
    })
  })

  describe('BillingPeriod', () => {
    const VALID_PERIODS: BillingPeriod[] = ['monthly', 'quarterly', 'yearly']

    it('should have exactly 3 billing periods', () => {
      expect(VALID_PERIODS.length).toBe(3)
    })

    it('should include monthly', () => {
      expect(VALID_PERIODS).toContain('monthly')
    })

    it('should include quarterly', () => {
      expect(VALID_PERIODS).toContain('quarterly')
    })

    it('should include yearly', () => {
      expect(VALID_PERIODS).toContain('yearly')
    })
  })

  describe('SubscriptionStatus', () => {
    const VALID_STATUSES: SubscriptionStatus[] = ['active', 'cancelled', 'past_due', 'expired']

    it('should have exactly 4 statuses', () => {
      expect(VALID_STATUSES.length).toBe(4)
    })

    it('should include active status', () => {
      expect(VALID_STATUSES).toContain('active')
    })

    it('should include cancelled status', () => {
      expect(VALID_STATUSES).toContain('cancelled')
    })

    it('should include past_due status', () => {
      expect(VALID_STATUSES).toContain('past_due')
    })

    it('should include expired status', () => {
      expect(VALID_STATUSES).toContain('expired')
    })
  })

  describe('SubscriptionResource', () => {
    const VALID_RESOURCES: SubscriptionResource[] = [
      'applications',
      'cvs',
      'interviews',
      'compensation',
      'contracts',
      'aiAvatarInterviews',
    ]

    it('should have exactly 6 resources', () => {
      expect(VALID_RESOURCES.length).toBe(6)
    })

    it('should include applications', () => {
      expect(VALID_RESOURCES).toContain('applications')
    })

    it('should include cvs', () => {
      expect(VALID_RESOURCES).toContain('cvs')
    })

    it('should include interviews', () => {
      expect(VALID_RESOURCES).toContain('interviews')
    })

    it('should include compensation', () => {
      expect(VALID_RESOURCES).toContain('compensation')
    })

    it('should include contracts', () => {
      expect(VALID_RESOURCES).toContain('contracts')
    })

    it('should include aiAvatarInterviews', () => {
      expect(VALID_RESOURCES).toContain('aiAvatarInterviews')
    })
  })

  describe('SubscriptionEventType', () => {
    const VALID_EVENT_TYPES: SubscriptionEventType[] = [
      'subscription_created',
      'subscription_activated',
      'tier_upgraded',
      'tier_downgraded',
      'period_changed',
      'payment_received',
      'payment_failed',
      'subscription_cancelled',
      'subscription_expired',
      'counters_reset',
      'usage_limit_reached',
      'admin_adjustment',
    ]

    it('should have exactly 12 event types', () => {
      expect(VALID_EVENT_TYPES.length).toBe(12)
    })

    it('should include subscription lifecycle events', () => {
      expect(VALID_EVENT_TYPES).toContain('subscription_created')
      expect(VALID_EVENT_TYPES).toContain('subscription_activated')
      expect(VALID_EVENT_TYPES).toContain('subscription_cancelled')
      expect(VALID_EVENT_TYPES).toContain('subscription_expired')
    })

    it('should include tier change events', () => {
      expect(VALID_EVENT_TYPES).toContain('tier_upgraded')
      expect(VALID_EVENT_TYPES).toContain('tier_downgraded')
      expect(VALID_EVENT_TYPES).toContain('period_changed')
    })

    it('should include payment events', () => {
      expect(VALID_EVENT_TYPES).toContain('payment_received')
      expect(VALID_EVENT_TYPES).toContain('payment_failed')
    })

    it('should include usage events', () => {
      expect(VALID_EVENT_TYPES).toContain('counters_reset')
      expect(VALID_EVENT_TYPES).toContain('usage_limit_reached')
    })

    it('should include admin events', () => {
      expect(VALID_EVENT_TYPES).toContain('admin_adjustment')
    })
  })

  describe('FeatureAccessReason', () => {
    const VALID_REASONS: FeatureAccessReason[] = [
      'subscription_active',
      'enforcement_disabled',
      'within_limits',
      'no_subscription',
      'subscription_expired',
      'subscription_past_due',
      'limit_exceeded',
      'feature_not_in_tier',
    ]

    it('should have exactly 8 reasons', () => {
      expect(VALID_REASONS.length).toBe(8)
    })

    it('should include access granted reasons', () => {
      expect(VALID_REASONS).toContain('subscription_active')
      expect(VALID_REASONS).toContain('enforcement_disabled')
      expect(VALID_REASONS).toContain('within_limits')
    })

    it('should include access denied reasons', () => {
      expect(VALID_REASONS).toContain('no_subscription')
      expect(VALID_REASONS).toContain('subscription_expired')
      expect(VALID_REASONS).toContain('subscription_past_due')
      expect(VALID_REASONS).toContain('limit_exceeded')
      expect(VALID_REASONS).toContain('feature_not_in_tier')
    })
  })
})

// ============================================================================
// 2. Interface Structure Validation
// ============================================================================

describe('Interface Structure Validation', () => {
  describe('UserSubscription', () => {
    it('should have all required fields', () => {
      const subscription: UserSubscription = {
        id: 'sub-123',
        userId: 'user-456',
        tier: 'momentum',
        billingPeriod: 'monthly',
        status: 'active',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: '2024-02-01T00:00:00Z',
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        cancelReason: null,
        scheduledTier: null,
        scheduledBillingPeriod: null,
        scheduledChangeAt: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        usageApplications: 0,
        usageCvs: 0,
        usageInterviews: 0,
        usageCompensation: 0,
        usageContracts: 0,
        usageAiAvatarInterviews: 0,
        lastResetAt: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      expect(subscription.id).toBeDefined()
      expect(subscription.userId).toBeDefined()
      expect(subscription.status).toBeDefined()
    })

    it('should allow null tier for tracking-only users', () => {
      const trackingOnlyUser: UserSubscription = {
        id: 'sub-123',
        userId: 'user-456',
        tier: null,  // Key: tier is null for tracking-only
        billingPeriod: null,
        status: 'active',
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        cancelReason: null,
        scheduledTier: null,
        scheduledBillingPeriod: null,
        scheduledChangeAt: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        usageApplications: 5,  // Still tracking usage
        usageCvs: 3,
        usageInterviews: 2,
        usageCompensation: 1,
        usageContracts: 0,
        usageAiAvatarInterviews: 0,
        lastResetAt: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      expect(trackingOnlyUser.tier).toBeNull()
      expect(trackingOnlyUser.usageApplications).toBe(5)
    })

    it('should support scheduled tier changes', () => {
      const subscription: UserSubscription = {
        id: 'sub-123',
        userId: 'user-456',
        tier: 'elite',
        billingPeriod: 'monthly',
        status: 'active',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: '2024-02-01T00:00:00Z',
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        cancelReason: null,
        scheduledTier: 'momentum',  // Downgrade scheduled
        scheduledBillingPeriod: 'yearly',
        scheduledChangeAt: '2024-02-01T00:00:00Z',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
        usageApplications: 0,
        usageCvs: 0,
        usageInterviews: 0,
        usageCompensation: 0,
        usageContracts: 0,
        usageAiAvatarInterviews: 0,
        lastResetAt: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      expect(subscription.scheduledTier).toBe('momentum')
      expect(subscription.scheduledBillingPeriod).toBe('yearly')
      expect(subscription.scheduledChangeAt).toBeDefined()
    })
  })

  describe('UserSubscriptionRow', () => {
    it('should use snake_case field names', () => {
      const row = createMockUserSubscriptionRow()

      expect(row.user_id).toBeDefined()
      expect(row.billing_period).toBeDefined()
      expect(row.current_period_start).toBeDefined()
      expect(row.cancel_at_period_end).toBeDefined()
      expect(row.stripe_customer_id).toBeDefined()
      expect(row.usage_applications).toBeDefined()
      expect(row.usage_ai_avatar_interviews).toBeDefined()
      expect(row.last_reset_at).toBeDefined()
      expect(row.created_at).toBeDefined()
      expect(row.updated_at).toBeDefined()
    })
  })

  describe('SubscriptionEvent', () => {
    it('should have all required fields', () => {
      const event: SubscriptionEvent = {
        id: 'event-123',
        userId: 'user-456',
        eventType: 'tier_upgraded',
        eventData: { previous: 'momentum', new: 'accelerate' },
        previousTier: 'momentum',
        newTier: 'accelerate',
        previousBillingPeriod: 'monthly',
        newBillingPeriod: 'monthly',
        amountPaid: 1800,
        currency: 'USD',
        stripeEventId: 'evt_123',
        createdAt: '2024-01-01T00:00:00Z',
      }

      expect(event.id).toBeDefined()
      expect(event.eventType).toBe('tier_upgraded')
      expect(event.eventData).toEqual({ previous: 'momentum', new: 'accelerate' })
    })
  })

  describe('UsageMonthlySnapshot', () => {
    it('should have all required fields', () => {
      const snapshot: UsageMonthlySnapshot = {
        id: 'snapshot-123',
        userId: 'user-456',
        snapshotMonth: '2024-01',
        tier: 'accelerate',
        billingPeriod: 'monthly',
        applicationsUsed: 10,
        cvsUsed: 8,
        interviewsUsed: 6,
        compensationUsed: 4,
        contractsUsed: 2,
        aiAvatarInterviewsUsed: 1,
        daysActive: 20,
        peakUsageDay: '2024-01-15',
        createdAt: '2024-02-01T00:00:00Z',
      }

      expect(snapshot.snapshotMonth).toBe('2024-01')
      expect(snapshot.applicationsUsed).toBe(10)
      expect(snapshot.daysActive).toBe(20)
    })
  })

  describe('TierLimits', () => {
    it('should have all resource limit fields', () => {
      const limits: TierLimits = {
        applications: 8,
        cvs: 8,
        interviews: 8,
        compensation: 8,
        contracts: 8,
        aiAvatarInterviews: 0,
      }

      expect(Object.keys(limits).length).toBe(6)
      expect(limits.applications).toBe(8)
      expect(limits.aiAvatarInterviews).toBe(0)
    })

    it('should support -1 for unlimited', () => {
      const unlimitedLimits: TierLimits = {
        applications: -1,
        cvs: -1,
        interviews: -1,
        compensation: -1,
        contracts: -1,
        aiAvatarInterviews: 10,
      }

      expect(unlimitedLimits.applications).toBe(-1)
      expect(unlimitedLimits.aiAvatarInterviews).toBe(10)
    })
  })

  describe('TierPricing', () => {
    it('should have all billing period prices', () => {
      const pricing: TierPricing = {
        monthly: 12,
        quarterly: 30,
        yearly: 99,
      }

      expect(Object.keys(pricing).length).toBe(3)
      expect(pricing.monthly).toBe(12)
      expect(pricing.quarterly).toBe(30)
      expect(pricing.yearly).toBe(99)
    })
  })

  describe('TierConfig', () => {
    it('should have all required fields', () => {
      const config: TierConfig = {
        name: 'momentum',
        displayName: 'Momentum',
        limits: {
          applications: 8,
          cvs: 8,
          interviews: 8,
          compensation: 8,
          contracts: 8,
          aiAvatarInterviews: 0,
        },
        pricing: {
          monthly: 12,
          quarterly: 30,
          yearly: 99,
        },
        features: ['8 Application Tracking', '8 Tailored CVs'],
      }

      expect(config.name).toBe('momentum')
      expect(config.displayName).toBe('Momentum')
      expect(config.limits.applications).toBe(8)
      expect(config.pricing.monthly).toBe(12)
      expect(config.features.length).toBeGreaterThan(0)
    })

    it('should support optional isPopular flag', () => {
      const popularConfig: TierConfig = {
        name: 'accelerate',
        displayName: 'Accelerate',
        isPopular: true,
        limits: {
          applications: 15,
          cvs: 15,
          interviews: 15,
          compensation: 15,
          contracts: 15,
          aiAvatarInterviews: 5,
        },
        pricing: {
          monthly: 18,
          quarterly: 45,
          yearly: 149,
        },
        features: [],
      }

      expect(popularConfig.isPopular).toBe(true)
    })
  })

  describe('UsageLimitCheck', () => {
    it('should have all required fields', () => {
      const check: UsageLimitCheck = {
        allowed: true,
        currentUsage: 5,
        limit: 8,
        remaining: 3,
        isUnlimited: false,
        tier: 'momentum',
        resource: 'applications',
      }

      expect(check.allowed).toBe(true)
      expect(check.remaining).toBe(3)
    })

    it('should support unlimited with -1 limit', () => {
      const unlimitedCheck: UsageLimitCheck = {
        allowed: true,
        currentUsage: 100,
        limit: -1,
        remaining: -1,
        isUnlimited: true,
        tier: 'elite',
        resource: 'applications',
      }

      expect(unlimitedCheck.isUnlimited).toBe(true)
      expect(unlimitedCheck.limit).toBe(-1)
    })
  })

  describe('FeatureAccessCheck', () => {
    it('should have all required fields', () => {
      const check: FeatureAccessCheck = {
        hasAccess: true,
        reason: 'subscription_active',
        subscription: null,
        isEnforcementEnabled: true,
      }

      expect(check.hasAccess).toBe(true)
      expect(check.reason).toBe('subscription_active')
    })

    it('should support enforcement_disabled reason', () => {
      const disabledCheck: FeatureAccessCheck = {
        hasAccess: true,
        reason: 'enforcement_disabled',
        subscription: null,
        isEnforcementEnabled: false,
      }

      expect(disabledCheck.hasAccess).toBe(true)
      expect(disabledCheck.reason).toBe('enforcement_disabled')
      expect(disabledCheck.isEnforcementEnabled).toBe(false)
    })
  })

  describe('UsageAverages', () => {
    it('should have all resource averages plus monthsTracked', () => {
      const averages: UsageAverages = {
        applications: 10.5,
        cvs: 7.2,
        interviews: 5.8,
        compensation: 3.4,
        contracts: 2.1,
        aiAvatarInterviews: 1.5,
        monthsTracked: 6,
      }

      expect(Object.keys(averages).length).toBe(7)
      expect(averages.monthsTracked).toBe(6)
    })
  })

  describe('TierRecommendation', () => {
    it('should have all required fields', () => {
      const recommendation: TierRecommendation = {
        recommendedTier: 'accelerate',
        currentTier: 'momentum',
        reason: 'Your usage exceeds Momentum limits',
        projectedMonthlyCost: 18,
        projectedYearlySavings: 67,
        usageAnalysis: [
          {
            resource: 'applications',
            averageUsage: 12,
            recommendedLimit: 15,
            wouldExceedMomentum: true,
            wouldExceedAccelerate: false,
          },
        ],
      }

      expect(recommendation.recommendedTier).toBe('accelerate')
      expect(recommendation.usageAnalysis.length).toBe(1)
      expect(recommendation.usageAnalysis[0].wouldExceedMomentum).toBe(true)
    })
  })

  describe('API Types', () => {
    it('SubscriptionUpdateRequest should have tier and billingPeriod', () => {
      const request: SubscriptionUpdateRequest = {
        tier: 'accelerate',
        billingPeriod: 'yearly',
      }

      expect(request.tier).toBe('accelerate')
      expect(request.billingPeriod).toBe('yearly')
    })

    it('SubscriptionCancelRequest should support optional fields', () => {
      const minimalRequest: SubscriptionCancelRequest = {}
      const fullRequest: SubscriptionCancelRequest = {
        reason: 'Too expensive',
        immediate: false,
      }

      expect(minimalRequest.reason).toBeUndefined()
      expect(fullRequest.reason).toBe('Too expensive')
      expect(fullRequest.immediate).toBe(false)
    })

    it('SubscriptionOperationResponse should handle success and error', () => {
      const successResponse: SubscriptionOperationResponse = {
        success: true,
        subscription: {
          id: 'sub-123',
          userId: 'user-456',
          tier: 'accelerate',
          billingPeriod: 'monthly',
          status: 'active',
          currentPeriodStart: '2024-01-01T00:00:00Z',
          currentPeriodEnd: '2024-02-01T00:00:00Z',
          cancelAtPeriodEnd: false,
          cancelledAt: null,
          cancelReason: null,
          scheduledTier: null,
          scheduledBillingPeriod: null,
          scheduledChangeAt: null,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          usageApplications: 0,
          usageCvs: 0,
          usageInterviews: 0,
          usageCompensation: 0,
          usageContracts: 0,
          usageAiAvatarInterviews: 0,
          lastResetAt: null,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      }

      const errorResponse: SubscriptionOperationResponse = {
        success: false,
        error: 'Payment failed',
      }

      expect(successResponse.success).toBe(true)
      expect(successResponse.subscription).toBeDefined()
      expect(errorResponse.success).toBe(false)
      expect(errorResponse.error).toBe('Payment failed')
    })

    it('UsageIncrementRequest should have required fields', () => {
      const request: UsageIncrementRequest = {
        userId: 'user-123',
        resource: 'applications',
        amount: 1,
      }

      expect(request.userId).toBe('user-123')
      expect(request.resource).toBe('applications')
    })

    it('UsageIncrementResponse should handle blocked state', () => {
      const allowedResponse: UsageIncrementResponse = {
        success: true,
        newUsage: 6,
        limit: 8,
        remaining: 2,
        isUnlimited: false,
        blocked: false,
      }

      const blockedResponse: UsageIncrementResponse = {
        success: false,
        newUsage: 8,
        limit: 8,
        remaining: 0,
        isUnlimited: false,
        blocked: true,
        error: 'Usage limit reached',
      }

      expect(allowedResponse.blocked).toBe(false)
      expect(blockedResponse.blocked).toBe(true)
      expect(blockedResponse.error).toBe('Usage limit reached')
    })
  })
})

// ============================================================================
// 3. Utility Constants
// ============================================================================

describe('Utility Constants', () => {
  describe('RESOURCE_TO_COLUMN', () => {
    it('should map all 6 resources', () => {
      expect(Object.keys(RESOURCE_TO_COLUMN).length).toBe(6)
    })

    it('should map applications to usage_applications', () => {
      expect(RESOURCE_TO_COLUMN.applications).toBe('usage_applications')
    })

    it('should map cvs to usage_cvs', () => {
      expect(RESOURCE_TO_COLUMN.cvs).toBe('usage_cvs')
    })

    it('should map interviews to usage_interviews', () => {
      expect(RESOURCE_TO_COLUMN.interviews).toBe('usage_interviews')
    })

    it('should map compensation to usage_compensation', () => {
      expect(RESOURCE_TO_COLUMN.compensation).toBe('usage_compensation')
    })

    it('should map contracts to usage_contracts', () => {
      expect(RESOURCE_TO_COLUMN.contracts).toBe('usage_contracts')
    })

    it('should map aiAvatarInterviews to usage_ai_avatar_interviews', () => {
      expect(RESOURCE_TO_COLUMN.aiAvatarInterviews).toBe('usage_ai_avatar_interviews')
    })

    it('should produce valid UserSubscriptionRow keys', () => {
      const mockRow = createMockUserSubscriptionRow()
      Object.values(RESOURCE_TO_COLUMN).forEach(column => {
        expect(mockRow).toHaveProperty(column)
      })
    })
  })

  describe('RESOURCE_TO_LIMIT', () => {
    it('should map all 6 resources', () => {
      expect(Object.keys(RESOURCE_TO_LIMIT).length).toBe(6)
    })

    it('should map applications to applications', () => {
      expect(RESOURCE_TO_LIMIT.applications).toBe('applications')
    })

    it('should map cvs to cvs', () => {
      expect(RESOURCE_TO_LIMIT.cvs).toBe('cvs')
    })

    it('should map interviews to interviews', () => {
      expect(RESOURCE_TO_LIMIT.interviews).toBe('interviews')
    })

    it('should map compensation to compensation', () => {
      expect(RESOURCE_TO_LIMIT.compensation).toBe('compensation')
    })

    it('should map contracts to contracts', () => {
      expect(RESOURCE_TO_LIMIT.contracts).toBe('contracts')
    })

    it('should map aiAvatarInterviews to aiAvatarInterviews', () => {
      expect(RESOURCE_TO_LIMIT.aiAvatarInterviews).toBe('aiAvatarInterviews')
    })

    it('should produce valid TierLimits keys', () => {
      const mockLimits: TierLimits = {
        applications: 8,
        cvs: 8,
        interviews: 8,
        compensation: 8,
        contracts: 8,
        aiAvatarInterviews: 0,
      }
      Object.values(RESOURCE_TO_LIMIT).forEach(limitKey => {
        expect(mockLimits).toHaveProperty(limitKey)
      })
    })
  })

  describe('Constant Consistency', () => {
    it('should have same keys in both mappings', () => {
      const columnKeys = Object.keys(RESOURCE_TO_COLUMN).sort()
      const limitKeys = Object.keys(RESOURCE_TO_LIMIT).sort()
      expect(columnKeys).toEqual(limitKeys)
    })

    it('should cover all SubscriptionResource values', () => {
      const resources: SubscriptionResource[] = [
        'applications',
        'cvs',
        'interviews',
        'compensation',
        'contracts',
        'aiAvatarInterviews',
      ]

      resources.forEach(resource => {
        expect(RESOURCE_TO_COLUMN).toHaveProperty(resource)
        expect(RESOURCE_TO_LIMIT).toHaveProperty(resource)
      })
    })
  })
})

// ============================================================================
// 4. Conversion Functions
// ============================================================================

describe('Conversion Functions', () => {
  describe('toUserSubscription', () => {
    it('should convert all fields from snake_case to camelCase', () => {
      const row = createMockUserSubscriptionRow()
      const subscription = toUserSubscription(row)

      expect(subscription.id).toBe(row.id)
      expect(subscription.userId).toBe(row.user_id)
      expect(subscription.tier).toBe(row.tier)
      expect(subscription.billingPeriod).toBe(row.billing_period)
      expect(subscription.status).toBe(row.status)
      expect(subscription.currentPeriodStart).toBe(row.current_period_start)
      expect(subscription.currentPeriodEnd).toBe(row.current_period_end)
      expect(subscription.cancelAtPeriodEnd).toBe(row.cancel_at_period_end)
      expect(subscription.cancelledAt).toBe(row.cancelled_at)
      expect(subscription.cancelReason).toBe(row.cancel_reason)
      expect(subscription.scheduledTier).toBe(row.scheduled_tier)
      expect(subscription.scheduledBillingPeriod).toBe(row.scheduled_billing_period)
      expect(subscription.scheduledChangeAt).toBe(row.scheduled_change_at)
      expect(subscription.stripeCustomerId).toBe(row.stripe_customer_id)
      expect(subscription.stripeSubscriptionId).toBe(row.stripe_subscription_id)
      expect(subscription.usageApplications).toBe(row.usage_applications)
      expect(subscription.usageCvs).toBe(row.usage_cvs)
      expect(subscription.usageInterviews).toBe(row.usage_interviews)
      expect(subscription.usageCompensation).toBe(row.usage_compensation)
      expect(subscription.usageContracts).toBe(row.usage_contracts)
      expect(subscription.usageAiAvatarInterviews).toBe(row.usage_ai_avatar_interviews)
      expect(subscription.lastResetAt).toBe(row.last_reset_at)
      expect(subscription.createdAt).toBe(row.created_at)
      expect(subscription.updatedAt).toBe(row.updated_at)
    })

    it('should preserve null values', () => {
      const row = createMockUserSubscriptionRow({
        tier: null,
        billing_period: null,
        cancelled_at: null,
        scheduled_tier: null,
      })
      const subscription = toUserSubscription(row)

      expect(subscription.tier).toBeNull()
      expect(subscription.billingPeriod).toBeNull()
      expect(subscription.cancelledAt).toBeNull()
      expect(subscription.scheduledTier).toBeNull()
    })

    it('should preserve numeric values', () => {
      const row = createMockUserSubscriptionRow({
        usage_applications: 10,
        usage_cvs: 5,
        usage_ai_avatar_interviews: 3,
      })
      const subscription = toUserSubscription(row)

      expect(subscription.usageApplications).toBe(10)
      expect(subscription.usageCvs).toBe(5)
      expect(subscription.usageAiAvatarInterviews).toBe(3)
    })

    it('should preserve boolean values', () => {
      const rowFalse = createMockUserSubscriptionRow({ cancel_at_period_end: false })
      const rowTrue = createMockUserSubscriptionRow({ cancel_at_period_end: true })

      expect(toUserSubscription(rowFalse).cancelAtPeriodEnd).toBe(false)
      expect(toUserSubscription(rowTrue).cancelAtPeriodEnd).toBe(true)
    })
  })

  describe('toSubscriptionEvent', () => {
    it('should convert all fields from snake_case to camelCase', () => {
      const row = createMockSubscriptionEventRow()
      const event = toSubscriptionEvent(row)

      expect(event.id).toBe(row.id)
      expect(event.userId).toBe(row.user_id)
      expect(event.eventType).toBe(row.event_type)
      expect(event.eventData).toEqual(row.event_data)
      expect(event.previousTier).toBe(row.previous_tier)
      expect(event.newTier).toBe(row.new_tier)
      expect(event.previousBillingPeriod).toBe(row.previous_billing_period)
      expect(event.newBillingPeriod).toBe(row.new_billing_period)
      expect(event.amountPaid).toBe(row.amount_paid)
      expect(event.currency).toBe(row.currency)
      expect(event.stripeEventId).toBe(row.stripe_event_id)
      expect(event.createdAt).toBe(row.created_at)
    })

    it('should preserve event_data object', () => {
      const row = createMockSubscriptionEventRow({
        event_data: {
          source: 'upgrade_modal',
          promo_code: 'SAVE20',
          user_agent: 'Mozilla/5.0',
        },
      })
      const event = toSubscriptionEvent(row)

      expect(event.eventData).toEqual({
        source: 'upgrade_modal',
        promo_code: 'SAVE20',
        user_agent: 'Mozilla/5.0',
      })
    })

    it('should handle tier upgrade event', () => {
      const row = createMockSubscriptionEventRow({
        event_type: 'tier_upgraded',
        previous_tier: 'momentum',
        new_tier: 'accelerate',
        amount_paid: 1800,
      })
      const event = toSubscriptionEvent(row)

      expect(event.eventType).toBe('tier_upgraded')
      expect(event.previousTier).toBe('momentum')
      expect(event.newTier).toBe('accelerate')
      expect(event.amountPaid).toBe(1800)
    })
  })

  describe('toUsageMonthlySnapshot', () => {
    it('should convert all fields from snake_case to camelCase', () => {
      const row = createMockUsageSnapshotRow()
      const snapshot = toUsageMonthlySnapshot(row)

      expect(snapshot.id).toBe(row.id)
      expect(snapshot.userId).toBe(row.user_id)
      expect(snapshot.snapshotMonth).toBe(row.snapshot_month)
      expect(snapshot.tier).toBe(row.tier)
      expect(snapshot.billingPeriod).toBe(row.billing_period)
      expect(snapshot.applicationsUsed).toBe(row.applications_used)
      expect(snapshot.cvsUsed).toBe(row.cvs_used)
      expect(snapshot.interviewsUsed).toBe(row.interviews_used)
      expect(snapshot.compensationUsed).toBe(row.compensation_used)
      expect(snapshot.contractsUsed).toBe(row.contracts_used)
      expect(snapshot.aiAvatarInterviewsUsed).toBe(row.ai_avatar_interviews_used)
      expect(snapshot.daysActive).toBe(row.days_active)
      expect(snapshot.peakUsageDay).toBe(row.peak_usage_day)
      expect(snapshot.createdAt).toBe(row.created_at)
    })

    it('should handle zero usage values', () => {
      const row = createMockUsageSnapshotRow({
        applications_used: 0,
        cvs_used: 0,
        interviews_used: 0,
        compensation_used: 0,
        contracts_used: 0,
        ai_avatar_interviews_used: 0,
        days_active: 0,
      })
      const snapshot = toUsageMonthlySnapshot(row)

      expect(snapshot.applicationsUsed).toBe(0)
      expect(snapshot.cvsUsed).toBe(0)
      expect(snapshot.daysActive).toBe(0)
    })

    it('should handle null peak_usage_day', () => {
      const row = createMockUsageSnapshotRow({ peak_usage_day: null })
      const snapshot = toUsageMonthlySnapshot(row)

      expect(snapshot.peakUsageDay).toBeNull()
    })
  })

  describe('Conversion Round-Trip Consistency', () => {
    it('should preserve all data through conversion', () => {
      const originalRow = createMockUserSubscriptionRow({
        tier: 'elite',
        billing_period: 'yearly',
        usage_applications: 100,
        usage_ai_avatar_interviews: 5,
        scheduled_tier: 'momentum',
        cancel_at_period_end: true,
      })

      const subscription = toUserSubscription(originalRow)

      // Verify critical fields survived conversion
      expect(subscription.tier).toBe('elite')
      expect(subscription.billingPeriod).toBe('yearly')
      expect(subscription.usageApplications).toBe(100)
      expect(subscription.usageAiAvatarInterviews).toBe(5)
      expect(subscription.scheduledTier).toBe('momentum')
      expect(subscription.cancelAtPeriodEnd).toBe(true)
    })
  })
})

// ============================================================================
// 5. Type Compatibility with Config Module
// ============================================================================

describe('Type Compatibility with Config Module', () => {
  describe('SubscriptionTier alignment', () => {
    it('should accept config module tier values', () => {
      const tiers = getAllTiers()
      tiers.forEach(tier => {
        const subscription: Partial<UserSubscription> = { tier }
        expect(subscription.tier).toBeDefined()
      })
    })

    it('should match TIER_CONFIGS keys', () => {
      const configKeys = Object.keys(TIER_CONFIGS) as SubscriptionTier[]
      const validTiers: SubscriptionTier[] = ['momentum', 'accelerate', 'elite']
      expect(configKeys.sort()).toEqual(validTiers.sort())
    })
  })

  describe('TierLimits alignment', () => {
    it('should match config module limit structure', () => {
      Object.entries(TIER_CONFIGS).forEach(([tierName, config]) => {
        const limits: TierLimits = config.limits
        expect(limits).toHaveProperty('applications')
        expect(limits).toHaveProperty('cvs')
        expect(limits).toHaveProperty('interviews')
        expect(limits).toHaveProperty('compensation')
        expect(limits).toHaveProperty('contracts')
        expect(limits).toHaveProperty('aiAvatarInterviews')
      })
    })

    it('should have correct limit values for momentum', () => {
      const momentumLimits = TIER_CONFIGS.momentum.limits
      expect(momentumLimits.applications).toBe(8)
      expect(momentumLimits.cvs).toBe(8)
      expect(momentumLimits.interviews).toBe(8)
      expect(momentumLimits.compensation).toBe(8)
      expect(momentumLimits.contracts).toBe(8)
      expect(momentumLimits.aiAvatarInterviews).toBe(0)
    })

    it('should have correct limit values for accelerate', () => {
      const accelerateLimits = TIER_CONFIGS.accelerate.limits
      expect(accelerateLimits.applications).toBe(15)
      expect(accelerateLimits.aiAvatarInterviews).toBe(5)
    })

    it('should have unlimited (-1) values for elite', () => {
      const eliteLimits = TIER_CONFIGS.elite.limits
      expect(eliteLimits.applications).toBe(-1)
      expect(eliteLimits.cvs).toBe(-1)
      expect(eliteLimits.interviews).toBe(-1)
      expect(eliteLimits.compensation).toBe(-1)
      expect(eliteLimits.contracts).toBe(-1)
      expect(eliteLimits.aiAvatarInterviews).toBe(10)
    })
  })

  describe('TierPricing alignment', () => {
    it('should match config module pricing structure', () => {
      Object.values(TIER_CONFIGS).forEach(config => {
        expect(config.pricing).toHaveProperty('monthly')
        expect(config.pricing).toHaveProperty('quarterly')
        expect(config.pricing).toHaveProperty('yearly')
      })
    })

    it('should have correct pricing for each tier', () => {
      expect(TIER_CONFIGS.momentum.pricing.monthly).toBe(12)
      expect(TIER_CONFIGS.accelerate.pricing.monthly).toBe(18)
      expect(TIER_CONFIGS.elite.pricing.monthly).toBe(29)
    })
  })
})

// ============================================================================
// 6. Database Type Alignment
// ============================================================================

describe('Database Type Alignment', () => {
  describe('UserSubscriptionRow field count', () => {
    it('should have exactly 24 fields', () => {
      const row = createMockUserSubscriptionRow()
      expect(Object.keys(row).length).toBe(24)
    })
  })

  describe('SubscriptionEventRow field count', () => {
    it('should have exactly 12 fields', () => {
      const row = createMockSubscriptionEventRow()
      expect(Object.keys(row).length).toBe(12)
    })
  })

  describe('UsageMonthlySnapshotRow field count', () => {
    it('should have exactly 14 fields', () => {
      const row = createMockUsageSnapshotRow()
      expect(Object.keys(row).length).toBe(14)
    })
  })

  describe('Usage counter columns', () => {
    it('should have 6 usage counter columns in UserSubscriptionRow', () => {
      const row = createMockUserSubscriptionRow()
      const usageColumns = Object.keys(row).filter(key => key.startsWith('usage_'))
      expect(usageColumns.length).toBe(6)
      expect(usageColumns).toContain('usage_applications')
      expect(usageColumns).toContain('usage_cvs')
      expect(usageColumns).toContain('usage_interviews')
      expect(usageColumns).toContain('usage_compensation')
      expect(usageColumns).toContain('usage_contracts')
      expect(usageColumns).toContain('usage_ai_avatar_interviews')
    })

    it('should have matching usage columns in UsageMonthlySnapshotRow', () => {
      const row = createMockUsageSnapshotRow()
      const usageColumns = Object.keys(row).filter(key => key.endsWith('_used'))
      expect(usageColumns.length).toBe(6)
    })
  })

  describe('Stripe integration fields', () => {
    it('should have stripe_customer_id and stripe_subscription_id', () => {
      const row = createMockUserSubscriptionRow({
        stripe_customer_id: 'cus_abc123',
        stripe_subscription_id: 'sub_xyz789',
      })

      expect(row.stripe_customer_id).toBe('cus_abc123')
      expect(row.stripe_subscription_id).toBe('sub_xyz789')
    })

    it('should have stripe_event_id in SubscriptionEventRow', () => {
      const row = createMockSubscriptionEventRow({
        stripe_event_id: 'evt_123',
      })

      expect(row.stripe_event_id).toBe('evt_123')
    })
  })

  describe('Scheduled change fields', () => {
    it('should have scheduled tier change fields', () => {
      const row = createMockUserSubscriptionRow({
        scheduled_tier: 'momentum',
        scheduled_billing_period: 'yearly',
        scheduled_change_at: '2024-03-01T00:00:00Z',
      })

      expect(row.scheduled_tier).toBe('momentum')
      expect(row.scheduled_billing_period).toBe('yearly')
      expect(row.scheduled_change_at).toBe('2024-03-01T00:00:00Z')
    })
  })

  describe('Cancellation fields', () => {
    it('should have all cancellation tracking fields', () => {
      const row = createMockUserSubscriptionRow({
        cancel_at_period_end: true,
        cancelled_at: '2024-01-15T00:00:00Z',
        cancel_reason: 'Too expensive',
      })

      expect(row.cancel_at_period_end).toBe(true)
      expect(row.cancelled_at).toBe('2024-01-15T00:00:00Z')
      expect(row.cancel_reason).toBe('Too expensive')
    })
  })
})

// ============================================================================
// 7. Edge Cases and Error Scenarios
// ============================================================================

describe('Edge Cases and Error Scenarios', () => {
  describe('Tracking-only users (tier=null)', () => {
    it('should support null tier with usage tracking', () => {
      const trackingOnlyRow = createMockUserSubscriptionRow({
        tier: null,
        billing_period: null,
        current_period_start: null,
        current_period_end: null,
        usage_applications: 25,
        usage_cvs: 15,
      })

      const subscription = toUserSubscription(trackingOnlyRow)

      expect(subscription.tier).toBeNull()
      expect(subscription.billingPeriod).toBeNull()
      expect(subscription.usageApplications).toBe(25)
      expect(subscription.usageCvs).toBe(15)
    })
  })

  describe('High usage numbers', () => {
    it('should handle large usage counts', () => {
      const highUsageRow = createMockUserSubscriptionRow({
        usage_applications: 999999,
        usage_cvs: 888888,
      })

      const subscription = toUserSubscription(highUsageRow)

      expect(subscription.usageApplications).toBe(999999)
      expect(subscription.usageCvs).toBe(888888)
    })
  })

  describe('All null optional fields', () => {
    it('should handle all optional fields being null', () => {
      const minimalRow = createMockUserSubscriptionRow({
        tier: null,
        billing_period: null,
        current_period_start: null,
        current_period_end: null,
        cancelled_at: null,
        cancel_reason: null,
        scheduled_tier: null,
        scheduled_billing_period: null,
        scheduled_change_at: null,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        last_reset_at: null,
      })

      const subscription = toUserSubscription(minimalRow)

      expect(subscription.tier).toBeNull()
      expect(subscription.stripeCustomerId).toBeNull()
      expect(subscription.scheduledTier).toBeNull()
    })
  })

  describe('Event data variations', () => {
    it('should handle empty event_data', () => {
      const row = createMockSubscriptionEventRow({
        event_data: {},
      })
      const event = toSubscriptionEvent(row)

      expect(event.eventData).toEqual({})
    })

    it('should handle complex event_data', () => {
      const row = createMockSubscriptionEventRow({
        event_data: {
          user_agent: 'Mozilla/5.0',
          ip_address: '192.168.1.1',
          checkout_session: 'cs_123',
          promo_codes: ['SAVE10', 'WELCOME'],
          metadata: { referrer: 'google' },
        },
      })
      const event = toSubscriptionEvent(row)

      expect(event.eventData).toHaveProperty('user_agent')
      expect(event.eventData).toHaveProperty('promo_codes')
      expect((event.eventData as any).promo_codes).toHaveLength(2)
    })
  })

  describe('Zero values', () => {
    it('should handle all zero usage counts', () => {
      const zeroUsageRow = createMockUserSubscriptionRow({
        usage_applications: 0,
        usage_cvs: 0,
        usage_interviews: 0,
        usage_compensation: 0,
        usage_contracts: 0,
        usage_ai_avatar_interviews: 0,
      })

      const subscription = toUserSubscription(zeroUsageRow)

      expect(subscription.usageApplications).toBe(0)
      expect(subscription.usageCvs).toBe(0)
      expect(subscription.usageInterviews).toBe(0)
      expect(subscription.usageCompensation).toBe(0)
      expect(subscription.usageContracts).toBe(0)
      expect(subscription.usageAiAvatarInterviews).toBe(0)
    })

    it('should handle zero amount_paid in events', () => {
      const row = createMockSubscriptionEventRow({
        amount_paid: 0,
      })
      const event = toSubscriptionEvent(row)

      expect(event.amountPaid).toBe(0)
    })
  })
})
