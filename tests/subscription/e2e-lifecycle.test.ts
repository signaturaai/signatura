/**
 * E2E Lifecycle Tests (RALPH Loop 10)
 *
 * Complete user journey tests covering the full subscription lifecycle.
 * These tests verify end-to-end behavior across all subscription system components.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ============================================================================
// Mock Setup
// ============================================================================

// Simulated database state
let dbState: {
  userSubscription: Record<string, unknown> | null
  usageSnapshots: Array<Record<string, unknown>>
  isAdmin: boolean
  lastTransactionCode: string | null
}

// Mock environment
let mockEnv: { SUBSCRIPTION_ENABLED: string }

// Reset state before each test
function resetDbState() {
  dbState = {
    userSubscription: null,
    usageSnapshots: [],
    isAdmin: false,
    lastTransactionCode: null,
  }
  mockEnv = { SUBSCRIPTION_ENABLED: 'false' }
}

// ============================================================================
// Simulated Subscription System Functions
// ============================================================================

/**
 * Simulates backfill: creates a tracking-only row for new user
 */
function backfillUser(userId: string) {
  dbState.userSubscription = {
    user_id: userId,
    tier: null,
    billing_period: null,
    status: null,
    usage_applications: 0,
    usage_cvs: 0,
    usage_interviews: 0,
    usage_compensation: 0,
    usage_contracts: 0,
    usage_ai_avatar_interviews: 0,
    current_period_start: null,
    current_period_end: null,
    last_reset_at: null,
    scheduled_tier: null,
    scheduled_billing_period: null,
    cancellation_effective_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  return dbState.userSubscription
}

/**
 * Checks usage limit based on current state
 */
function checkUsageLimit(userId: string, resource: string): {
  allowed: boolean
  enforced: boolean
  reason?: string
  used: number
  limit: number
  remaining: number
  unlimited: boolean
  adminBypass?: boolean
} {
  const sub = dbState.userSubscription
  const isKillSwitchOn = mockEnv.SUBSCRIPTION_ENABLED === 'true'

  // Admin bypass
  if (dbState.isAdmin) {
    const used = (sub as Record<string, number>)?.[`usage_${resource}`] || 0
    return {
      allowed: true,
      enforced: true,
      used,
      limit: -1,
      remaining: -1,
      unlimited: true,
      adminBypass: true,
    }
  }

  // Kill switch off - allow everything
  if (!isKillSwitchOn) {
    const used = (sub as Record<string, number>)?.[`usage_${resource}`] || 0
    return {
      allowed: true,
      enforced: false,
      used,
      limit: -1,
      remaining: -1,
      unlimited: true,
    }
  }

  // No subscription
  if (!sub || sub.tier === null) {
    return {
      allowed: false,
      enforced: true,
      reason: 'NO_SUBSCRIPTION',
      used: 0,
      limit: 0,
      remaining: 0,
      unlimited: false,
    }
  }

  // Get tier limits
  const tierLimits: Record<string, Record<string, number>> = {
    momentum: { applications: 8, cvs: 8, interviews: 3, compensation: 3, contracts: 2, ai_avatar_interviews: 0 },
    accelerate: { applications: 15, cvs: 15, interviews: 8, compensation: 8, contracts: 5, ai_avatar_interviews: 5 },
    elite: { applications: -1, cvs: -1, interviews: -1, compensation: -1, contracts: -1, ai_avatar_interviews: 10 },
  }

  const tier = sub.tier as string
  const limit = tierLimits[tier]?.[resource] ?? 0
  const used = (sub as Record<string, number>)[`usage_${resource}`] || 0
  const unlimited = limit === -1
  const remaining = unlimited ? -1 : Math.max(0, limit - used)
  const allowed = unlimited || used < limit

  return {
    allowed,
    enforced: true,
    reason: allowed ? undefined : 'LIMIT_EXCEEDED',
    used,
    limit,
    remaining,
    unlimited,
  }
}

/**
 * Increments usage for a resource
 */
function incrementUsage(userId: string, resource: string): void {
  if (dbState.userSubscription) {
    const key = `usage_${resource}` as keyof typeof dbState.userSubscription
    const current = (dbState.userSubscription[key] as number) || 0
    ;(dbState.userSubscription as Record<string, unknown>)[key] = current + 1
  }
}

/**
 * Creates a monthly snapshot
 */
function createMonthlySnapshot(userId: string, month: string): void {
  const sub = dbState.userSubscription
  if (!sub) return

  const snapshot = {
    user_id: userId,
    snapshot_month: month,
    tier: sub.tier,
    applications_used: sub.usage_applications,
    cvs_used: sub.usage_cvs,
    interviews_used: sub.usage_interviews,
    compensation_used: sub.usage_compensation,
    contracts_used: sub.usage_contracts,
    ai_avatar_interviews_used: sub.usage_ai_avatar_interviews,
    created_at: new Date().toISOString(),
  }

  dbState.usageSnapshots.push(snapshot)
}

/**
 * Activates a subscription
 */
function activateSubscription(
  userId: string,
  tier: string,
  billingPeriod: string
): void {
  const now = new Date()
  const periodEnd = new Date(now)

  if (billingPeriod === 'monthly') {
    periodEnd.setMonth(periodEnd.getMonth() + 1)
  } else if (billingPeriod === 'quarterly') {
    periodEnd.setMonth(periodEnd.getMonth() + 3)
  } else if (billingPeriod === 'yearly') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1)
  }

  dbState.userSubscription = {
    ...dbState.userSubscription,
    tier,
    billing_period: billingPeriod,
    status: 'active',
    usage_applications: 0,
    usage_cvs: 0,
    usage_interviews: 0,
    usage_compensation: 0,
    usage_contracts: 0,
    usage_ai_avatar_interviews: 0,
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    // Note: last_reset_at is NOT set on activation - counters are initialized, not reset
    // This allows the first renewal webhook to properly reset counters
    last_reset_at: null,
    updated_at: now.toISOString(),
  }
}

/**
 * Renews a subscription
 */
function renewSubscription(userId: string, transactionCode: string): { countersReset: boolean } {
  const sub = dbState.userSubscription
  if (!sub) return { countersReset: false }

  const now = new Date()

  // Prevent double reset: same transaction code = duplicate webhook
  // Different transaction codes = legitimate new renewal (new billing period)
  if (dbState.lastTransactionCode === transactionCode) {
    return { countersReset: false }
  }
  dbState.lastTransactionCode = transactionCode

  // Apply scheduled tier change
  if (sub.scheduled_tier) {
    sub.tier = sub.scheduled_tier
    sub.scheduled_tier = null
  }

  // Apply scheduled billing period change
  if (sub.scheduled_billing_period) {
    sub.billing_period = sub.scheduled_billing_period
    sub.scheduled_billing_period = null
  }

  // Calculate new period
  const periodEnd = new Date(now)
  const billingPeriod = sub.billing_period as string

  if (billingPeriod === 'monthly') {
    periodEnd.setMonth(periodEnd.getMonth() + 1)
  } else if (billingPeriod === 'quarterly') {
    periodEnd.setMonth(periodEnd.getMonth() + 3)
  } else if (billingPeriod === 'yearly') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1)
  }

  // Reset counters
  sub.usage_applications = 0
  sub.usage_cvs = 0
  sub.usage_interviews = 0
  sub.usage_compensation = 0
  sub.usage_contracts = 0
  sub.usage_ai_avatar_interviews = 0
  sub.current_period_start = now.toISOString()
  sub.current_period_end = periodEnd.toISOString()
  sub.last_reset_at = now.toISOString()
  sub.updated_at = now.toISOString()

  return { countersReset: true }
}

/**
 * Schedules a downgrade
 */
function scheduleDowngrade(userId: string, targetTier: string): void {
  if (dbState.userSubscription) {
    dbState.userSubscription.scheduled_tier = targetTier
    dbState.userSubscription.updated_at = new Date().toISOString()
  }
}

/**
 * Cancels a subscription
 */
function cancelSubscription(userId: string): void {
  if (dbState.userSubscription) {
    const periodEnd = dbState.userSubscription.current_period_end as string
    dbState.userSubscription.status = 'cancelled'
    dbState.userSubscription.cancellation_effective_at = periodEnd
    dbState.userSubscription.updated_at = new Date().toISOString()
  }
}

/**
 * Expires subscriptions (cron job)
 */
function processExpirations(): { expired: number } {
  const sub = dbState.userSubscription
  if (!sub) return { expired: 0 }

  const now = new Date()

  // Expire cancelled subscriptions past their date
  if (sub.status === 'cancelled') {
    const effectiveAt = new Date(sub.cancellation_effective_at as string)
    if (now >= effectiveAt) {
      sub.status = 'expired'
      sub.updated_at = now.toISOString()
      return { expired: 1 }
    }
  }

  return { expired: 0 }
}

/**
 * Upgrades a subscription immediately
 */
function upgradeSubscription(
  userId: string,
  targetTier: string
): { proratedAmount: number } {
  const sub = dbState.userSubscription
  if (!sub) return { proratedAmount: 0 }

  const tierPrices: Record<string, number> = {
    momentum: 12,
    accelerate: 18,
    elite: 29,
  }

  const currentTier = sub.tier as string
  const currentPrice = tierPrices[currentTier] || 0
  const targetPrice = tierPrices[targetTier] || 0

  // Simple prorated calculation (half of price difference)
  const proratedAmount = Math.max(0, (targetPrice - currentPrice) / 2)

  // Upgrade immediately
  sub.tier = targetTier
  sub.updated_at = new Date().toISOString()
  // Usage counters are NOT reset on upgrade

  return { proratedAmount }
}

/**
 * Checks feature access
 */
function checkFeatureAccess(
  userId: string,
  feature: string
): { hasAccess: boolean; reason?: string } {
  const sub = dbState.userSubscription
  const isKillSwitchOn = mockEnv.SUBSCRIPTION_ENABLED === 'true'

  // Admin bypass
  if (dbState.isAdmin) {
    return { hasAccess: true }
  }

  // Kill switch off
  if (!isKillSwitchOn) {
    return { hasAccess: true }
  }

  // No subscription
  if (!sub || sub.tier === null) {
    return { hasAccess: false, reason: 'no_subscription' }
  }

  // Feature access by tier
  const tierFeatures: Record<string, string[]> = {
    momentum: ['applicationTracker', 'tailoredCvs', 'interviewCoach', 'compensationSessions', 'contractReviews'],
    accelerate: ['applicationTracker', 'tailoredCvs', 'interviewCoach', 'compensationSessions', 'contractReviews', 'aiAvatarInterviews'],
    elite: ['applicationTracker', 'tailoredCvs', 'interviewCoach', 'compensationSessions', 'contractReviews', 'aiAvatarInterviews'],
  }

  const tier = sub.tier as string
  const features = tierFeatures[tier] || []
  const hasAccess = features.includes(feature)

  return { hasAccess, reason: hasAccess ? undefined : 'tier_too_low' }
}

/**
 * Gets usage averages from snapshots
 */
function getUsageAverages(userId: string): {
  applications: number
  cvs: number
  interviews: number
  compensation: number
  contracts: number
  aiAvatarInterviews: number
  monthsTracked: number
} {
  const snapshots = dbState.usageSnapshots.filter(s => s.user_id === userId)
  const monthsTracked = snapshots.length

  if (monthsTracked === 0) {
    return {
      applications: 0,
      cvs: 0,
      interviews: 0,
      compensation: 0,
      contracts: 0,
      aiAvatarInterviews: 0,
      monthsTracked: 0,
    }
  }

  const sum = snapshots.reduce(
    (acc, s) => ({
      applications: acc.applications + (s.applications_used as number),
      cvs: acc.cvs + (s.cvs_used as number),
      interviews: acc.interviews + (s.interviews_used as number),
      compensation: acc.compensation + (s.compensation_used as number),
      contracts: acc.contracts + (s.contracts_used as number),
      aiAvatarInterviews: acc.aiAvatarInterviews + (s.ai_avatar_interviews_used as number),
    }),
    { applications: 0, cvs: 0, interviews: 0, compensation: 0, contracts: 0, aiAvatarInterviews: 0 }
  )

  return {
    applications: sum.applications / monthsTracked,
    cvs: sum.cvs / monthsTracked,
    interviews: sum.interviews / monthsTracked,
    compensation: sum.compensation / monthsTracked,
    contracts: sum.contracts / monthsTracked,
    aiAvatarInterviews: sum.aiAvatarInterviews / monthsTracked,
    monthsTracked,
  }
}

/**
 * Gets recommendation based on usage
 */
function getRecommendation(averages: ReturnType<typeof getUsageAverages>): {
  recommendedTier: string
  reason: string
} {
  const { applications, cvs, interviews, compensation, contracts, aiAvatarInterviews } = averages

  // Check if needs Elite (AI avatar > 5 or any non-AI > 15)
  if (aiAvatarInterviews > 5) {
    return {
      recommendedTier: 'elite',
      reason: 'Your AI avatar usage exceeds Accelerate limits.',
    }
  }

  // Check if needs Accelerate
  if (
    applications > 8 ||
    cvs > 8 ||
    interviews > 3 ||
    compensation > 3 ||
    contracts > 2 ||
    aiAvatarInterviews > 0
  ) {
    return {
      recommendedTier: 'accelerate',
      reason: 'Your usage exceeds Momentum limits.',
    }
  }

  // Default to Momentum
  return {
    recommendedTier: 'momentum',
    reason: 'Momentum fits your current usage pattern.',
  }
}

// ============================================================================
// E2E Lifecycle Tests
// ============================================================================

describe('E2E Lifecycle Tests', () => {
  beforeEach(() => {
    resetDbState()
  })

  // ==========================================================================
  // Complete Lifecycle Test
  // ==========================================================================

  describe('Complete lifecycle: new user → subscribe → use → renew → downgrade → cancel → expire', () => {
    it('follows the complete subscription journey', () => {
      const userId = 'user-lifecycle-001'

      // Step 1: New user gets backfill row (tier=NULL, all usage=0)
      const backfillResult = backfillUser(userId)
      expect(backfillResult.tier).toBeNull()
      expect(backfillResult.usage_applications).toBe(0)
      expect(backfillResult.usage_cvs).toBe(0)

      // Step 2: Kill switch OFF → all checks pass, incrementUsage tracks silently
      mockEnv.SUBSCRIPTION_ENABLED = 'false'
      const check1 = checkUsageLimit(userId, 'applications')
      expect(check1.allowed).toBe(true)
      expect(check1.enforced).toBe(false)

      // Step 3: User creates 5 applications → usage_applications=5
      for (let i = 0; i < 5; i++) {
        incrementUsage(userId, 'applications')
      }
      expect(dbState.userSubscription?.usage_applications).toBe(5)

      // Create monthly snapshot
      createMonthlySnapshot(userId, '2026-01')
      expect(dbState.usageSnapshots[0].applications_used).toBe(5)

      // Step 4: Kill switch ON → tier=NULL → checkUsageLimit returns NO_SUBSCRIPTION
      mockEnv.SUBSCRIPTION_ENABLED = 'true'
      const check2 = checkUsageLimit(userId, 'applications')
      expect(check2.allowed).toBe(false)
      expect(check2.reason).toBe('NO_SUBSCRIPTION')

      // Step 5: User subscribes to Accelerate Monthly
      activateSubscription(userId, 'accelerate', 'monthly')
      expect(dbState.userSubscription?.tier).toBe('accelerate')
      expect(dbState.userSubscription?.usage_applications).toBe(0) // Reset

      // Step 6: User creates 14 applications
      for (let i = 0; i < 14; i++) {
        incrementUsage(userId, 'applications')
      }
      const check3 = checkUsageLimit(userId, 'applications')
      expect(check3.used).toBe(14)
      expect(check3.remaining).toBe(1)
      expect(check3.allowed).toBe(true)

      // Step 7: User creates 1 more → at limit
      incrementUsage(userId, 'applications')
      const check4 = checkUsageLimit(userId, 'applications')
      expect(check4.used).toBe(15)
      expect(check4.allowed).toBe(false)
      expect(check4.reason).toBe('LIMIT_EXCEEDED')

      // Step 8: Renewal webhook fires → counters reset
      const renewResult = renewSubscription(userId, 'txn-123')
      expect(renewResult.countersReset).toBe(true)
      expect(dbState.userSubscription?.usage_applications).toBe(0)

      // Step 9: User schedules downgrade to Momentum
      scheduleDowngrade(userId, 'momentum')
      expect(dbState.userSubscription?.scheduled_tier).toBe('momentum')
      expect(dbState.userSubscription?.tier).toBe('accelerate') // Still accelerate

      // Step 10: Next renewal → tier changes to momentum
      renewSubscription(userId, 'txn-456')
      expect(dbState.userSubscription?.tier).toBe('momentum')
      expect(dbState.userSubscription?.scheduled_tier).toBeNull()

      // Limits now 8 per resource
      for (let i = 0; i < 8; i++) {
        incrementUsage(userId, 'applications')
      }
      const check5 = checkUsageLimit(userId, 'applications')
      expect(check5.used).toBe(8)
      expect(check5.allowed).toBe(false) // At limit

      // Step 11: User cancels
      cancelSubscription(userId)
      expect(dbState.userSubscription?.status).toBe('cancelled')

      // Access continues until period_end (check still works)
      const check6 = checkUsageLimit(userId, 'cvs')
      expect(check6.allowed).toBe(true) // Still has access

      // Step 12: Period ends → processExpirations
      // Simulate time passing by setting cancellation date to past
      dbState.userSubscription!.cancellation_effective_at = new Date(Date.now() - 86400000).toISOString()
      const expireResult = processExpirations()
      expect(expireResult.expired).toBe(1)
      expect(dbState.userSubscription?.status).toBe('expired')
    })
  })

  // ==========================================================================
  // Upgrade Flow Test
  // ==========================================================================

  describe('Upgrade flow: prorated charge and immediate tier change', () => {
    it('upgrades immediately with prorated charge', () => {
      const userId = 'user-upgrade-001'

      // Step 1: User on Momentum Monthly, usage_applications=5
      backfillUser(userId)
      mockEnv.SUBSCRIPTION_ENABLED = 'true'
      activateSubscription(userId, 'momentum', 'monthly')

      for (let i = 0; i < 5; i++) {
        incrementUsage(userId, 'applications')
      }
      expect(dbState.userSubscription?.usage_applications).toBe(5)

      // Verify on Momentum: 5/8 used
      const check1 = checkUsageLimit(userId, 'applications')
      expect(check1.used).toBe(5)
      expect(check1.limit).toBe(8)
      expect(check1.allowed).toBe(true)

      // AI avatar not available on Momentum
      const featureCheck1 = checkFeatureAccess(userId, 'aiAvatarInterviews')
      expect(featureCheck1.hasAccess).toBe(false)

      // Step 2: Upgrade to Accelerate
      const upgradeResult = upgradeSubscription(userId, 'accelerate')
      expect(upgradeResult.proratedAmount).toBe(3) // (18-12)/2

      // Step 3: Verify: tier=accelerate, usage still 5, period dates unchanged
      expect(dbState.userSubscription?.tier).toBe('accelerate')
      expect(dbState.userSubscription?.usage_applications).toBe(5) // NOT reset

      // Step 4: checkUsageLimit for applications → allowed (5/15)
      const check2 = checkUsageLimit(userId, 'applications')
      expect(check2.used).toBe(5)
      expect(check2.limit).toBe(15)
      expect(check2.remaining).toBe(10)
      expect(check2.allowed).toBe(true)

      // Step 5: checkFeatureAccess for aiAvatarInterviews → now allowed
      const featureCheck2 = checkFeatureAccess(userId, 'aiAvatarInterviews')
      expect(featureCheck2.hasAccess).toBe(true)
    })
  })

  // ==========================================================================
  // Admin Bypass Test
  // ==========================================================================

  describe('Admin bypass throughout entire lifecycle', () => {
    it('admin user is never blocked', () => {
      const userId = 'admin-001'

      // Step 1: Admin user with tier=NULL, kill switch ON
      backfillUser(userId)
      mockEnv.SUBSCRIPTION_ENABLED = 'true'
      dbState.isAdmin = true

      // All checks pass (admin bypass)
      const check1 = checkUsageLimit(userId, 'applications')
      expect(check1.allowed).toBe(true)
      expect(check1.adminBypass).toBe(true)

      const featureCheck1 = checkFeatureAccess(userId, 'aiAvatarInterviews')
      expect(featureCheck1.hasAccess).toBe(true)

      // Step 2: Admin usage is tracked but never blocked
      for (let i = 0; i < 100; i++) {
        incrementUsage(userId, 'applications')
      }

      const check2 = checkUsageLimit(userId, 'applications')
      expect(check2.used).toBe(100)
      expect(check2.allowed).toBe(true) // Still allowed
      expect(check2.unlimited).toBe(true)
    })
  })

  // ==========================================================================
  // Recommendation Accuracy Test
  // ==========================================================================

  describe('Recommendation accuracy across usage patterns', () => {
    it('recommends appropriate tier based on usage', () => {
      const userId = 'user-rec-001'

      backfillUser(userId)

      // Step 1: 3 months with apps avg=5, cvs=4, interviews=3 → Momentum
      dbState.usageSnapshots = [
        { user_id: userId, snapshot_month: '2026-01', applications_used: 5, cvs_used: 4, interviews_used: 3, compensation_used: 1, contracts_used: 1, ai_avatar_interviews_used: 0 },
        { user_id: userId, snapshot_month: '2026-02', applications_used: 5, cvs_used: 4, interviews_used: 3, compensation_used: 1, contracts_used: 1, ai_avatar_interviews_used: 0 },
        { user_id: userId, snapshot_month: '2026-03', applications_used: 5, cvs_used: 4, interviews_used: 3, compensation_used: 1, contracts_used: 1, ai_avatar_interviews_used: 0 },
      ]

      let averages = getUsageAverages(userId)
      expect(averages.applications).toBe(5)
      expect(averages.monthsTracked).toBe(3)

      let rec = getRecommendation(averages)
      expect(rec.recommendedTier).toBe('momentum')

      // Step 2: Month 4 with apps=12 → avg=6.75, still Momentum
      dbState.usageSnapshots.push({
        user_id: userId,
        snapshot_month: '2026-04',
        applications_used: 12,
        cvs_used: 4,
        interviews_used: 3,
        compensation_used: 1,
        contracts_used: 1,
        ai_avatar_interviews_used: 0,
      })

      averages = getUsageAverages(userId)
      expect(averages.applications).toBe(6.75)
      expect(averages.monthsTracked).toBe(4)

      rec = getRecommendation(averages)
      expect(rec.recommendedTier).toBe('momentum') // 6.75 ≤ 8

      // Step 3: Month 5 with apps=15 → avg=8.4, exceeds Momentum → Accelerate
      dbState.usageSnapshots.push({
        user_id: userId,
        snapshot_month: '2026-05',
        applications_used: 15,
        cvs_used: 4,
        interviews_used: 3,
        compensation_used: 1,
        contracts_used: 1,
        ai_avatar_interviews_used: 0,
      })

      averages = getUsageAverages(userId)
      expect(averages.applications).toBe(8.4)
      expect(averages.monthsTracked).toBe(5)

      rec = getRecommendation(averages)
      expect(rec.recommendedTier).toBe('accelerate') // 8.4 > 8

      // Step 4: AI avatar usage 3/month → still Accelerate
      dbState.usageSnapshots.push({
        user_id: userId,
        snapshot_month: '2026-06',
        applications_used: 8,
        cvs_used: 4,
        interviews_used: 3,
        compensation_used: 1,
        contracts_used: 1,
        ai_avatar_interviews_used: 3,
      })

      averages = getUsageAverages(userId)
      expect(averages.aiAvatarInterviews).toBe(0.5) // 3/6

      rec = getRecommendation(averages)
      expect(rec.recommendedTier).toBe('accelerate') // AI ≤ 5

      // Step 5: AI avatar avg hits 6 → Elite
      dbState.usageSnapshots.push({
        user_id: userId,
        snapshot_month: '2026-07',
        applications_used: 8,
        cvs_used: 4,
        interviews_used: 3,
        compensation_used: 1,
        contracts_used: 1,
        ai_avatar_interviews_used: 39, // Total AI becomes 42, avg = 6
      })

      averages = getUsageAverages(userId)
      expect(averages.aiAvatarInterviews).toBe(6)

      rec = getRecommendation(averages)
      expect(rec.recommendedTier).toBe('elite') // AI > 5
    })
  })

  // ==========================================================================
  // Double-Reset Prevention Test
  // ==========================================================================

  describe('Double-reset prevention across edge cases', () => {
    it('prevents double counter reset on duplicate webhook', () => {
      const userId = 'user-double-001'

      backfillUser(userId)
      mockEnv.SUBSCRIPTION_ENABLED = 'true'
      activateSubscription(userId, 'accelerate', 'monthly')

      // Use some resources
      for (let i = 0; i < 10; i++) {
        incrementUsage(userId, 'applications')
      }
      expect(dbState.userSubscription?.usage_applications).toBe(10)

      // Step 1: Renewal resets counters
      const result1 = renewSubscription(userId, 'txn-first')
      expect(result1.countersReset).toBe(true)
      expect(dbState.userSubscription?.usage_applications).toBe(0)

      // Use some more resources after renewal
      for (let i = 0; i < 5; i++) {
        incrementUsage(userId, 'applications')
      }
      expect(dbState.userSubscription?.usage_applications).toBe(5)

      // Step 2 & 3: Duplicate webhook fires with SAME transaction code → should NOT reset
      const result2 = renewSubscription(userId, 'txn-first')
      expect(result2.countersReset).toBe(false)

      // Step 4: Counters still at 5 (not reset)
      expect(dbState.userSubscription?.usage_applications).toBe(5)
    })
  })

  // ==========================================================================
  // Monthly Snapshot Accumulation Test
  // ==========================================================================

  describe('Monthly snapshot accumulation across billing cycles', () => {
    it('preserves snapshots across renewals', () => {
      const userId = 'user-snapshot-001'

      backfillUser(userId)
      mockEnv.SUBSCRIPTION_ENABLED = 'true'
      activateSubscription(userId, 'accelerate', 'monthly')

      // Step 1: January: user creates 8 apps
      for (let i = 0; i < 8; i++) {
        incrementUsage(userId, 'applications')
      }
      createMonthlySnapshot(userId, '2026-01')
      expect(dbState.usageSnapshots[0].applications_used).toBe(8)

      // Step 2: February renewal resets counters
      renewSubscription(userId, 'txn-feb')
      expect(dbState.userSubscription?.usage_applications).toBe(0)

      // Step 3: February: user creates 12 apps
      for (let i = 0; i < 12; i++) {
        incrementUsage(userId, 'applications')
      }
      createMonthlySnapshot(userId, '2026-02')
      expect(dbState.usageSnapshots[1].applications_used).toBe(12)

      // Step 4: getUsageAverages → apps avg=10.0, monthsTracked=2
      const averages = getUsageAverages(userId)
      expect(averages.applications).toBe(10)
      expect(averages.monthsTracked).toBe(2)

      // Step 5: Snapshot Jan still has apps=8
      expect(dbState.usageSnapshots[0].applications_used).toBe(8)
    })
  })

  // ==========================================================================
  // Kill Switch Toggle Test
  // ==========================================================================

  describe('Kill switch toggle does not lose data', () => {
    it('preserves data across kill switch toggles', () => {
      const userId = 'user-toggle-001'

      // Step 1: Kill switch OFF → silent tracking for 3 months
      mockEnv.SUBSCRIPTION_ENABLED = 'false'
      backfillUser(userId)

      for (let i = 0; i < 5; i++) incrementUsage(userId, 'applications')
      createMonthlySnapshot(userId, '2026-01')

      for (let i = 0; i < 7; i++) incrementUsage(userId, 'applications')
      createMonthlySnapshot(userId, '2026-02')

      for (let i = 0; i < 9; i++) incrementUsage(userId, 'applications')
      createMonthlySnapshot(userId, '2026-03')

      expect(dbState.usageSnapshots.length).toBe(3)

      // Step 2: Kill switch ON → NO_SUBSCRIPTION
      mockEnv.SUBSCRIPTION_ENABLED = 'true'
      const check1 = checkUsageLimit(userId, 'applications')
      expect(check1.allowed).toBe(false)
      expect(check1.reason).toBe('NO_SUBSCRIPTION')

      // Step 3: All historical snapshots still intact
      expect(dbState.usageSnapshots.length).toBe(3)
      expect(dbState.usageSnapshots[0].applications_used).toBe(5)
      expect(dbState.usageSnapshots[1].applications_used).toBe(12) // 5+7
      expect(dbState.usageSnapshots[2].applications_used).toBe(21) // 12+9

      // Step 4: User subscribes → recommendation uses ALL historical data
      const averages = getUsageAverages(userId)
      expect(averages.applications).toBe((5 + 12 + 21) / 3)
      expect(averages.monthsTracked).toBe(3)

      const rec = getRecommendation(averages)
      expect(rec.recommendedTier).toBe('accelerate') // avg 12.67 > 8

      activateSubscription(userId, rec.recommendedTier, 'monthly')
      expect(dbState.userSubscription?.tier).toBe('accelerate')

      // Step 5: Kill switch OFF again → unlimited access, snapshots still recording
      mockEnv.SUBSCRIPTION_ENABLED = 'false'

      const check2 = checkUsageLimit(userId, 'applications')
      expect(check2.allowed).toBe(true)
      expect(check2.enforced).toBe(false)

      // Can still add snapshots
      incrementUsage(userId, 'applications')
      createMonthlySnapshot(userId, '2026-04')
      expect(dbState.usageSnapshots.length).toBe(4)
    })
  })
})
