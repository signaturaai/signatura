/**
 * useSubscription Hook
 *
 * React hook for managing subscription state and actions.
 * Exposes subscriptionEnabled flag - when false, all access checks return true.
 *
 * Features:
 * - Auto-refresh on window focus (for payment completion in other tabs)
 * - Lazy loading of recommendations (non-blocking)
 * - SPLIT PATTERN for usage: check first, then increment after action
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  SubscriptionTier,
  BillingPeriod,
  SubscriptionStatus,
  TierLimits,
} from '@/types/subscription'

// ============================================================================
// Types
// ============================================================================

export type FeatureKey =
  | 'applicationTracker'
  | 'tailoredCvs'
  | 'interviewCoach'
  | 'compensationSessions'
  | 'contractReviews'
  | 'aiAvatarInterviews'

export type ResourceKey = keyof TierLimits

export interface UsageSummary {
  used: number
  limit: number
  remaining: number
  percentUsed: number
  unlimited: boolean
}

export interface SubscriptionStatusResponse {
  subscriptionEnabled: boolean
  hasSubscription: boolean
  tier: SubscriptionTier | null
  billingPeriod: BillingPeriod | null
  status: SubscriptionStatus | null
  usage: Record<ResourceKey, UsageSummary>
  features: Record<FeatureKey, boolean> | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelledAt: string | null
  cancellationEffectiveAt: string | null
  scheduledTierChange: SubscriptionTier | null
  scheduledBillingPeriodChange: BillingPeriod | null
  isCancelled: boolean
  isPastDue: boolean
  isExpired: boolean
  canUpgrade: boolean
  canDowngrade: boolean
  isAdmin?: boolean
}

export interface TierRecommendation {
  recommendedTier: SubscriptionTier
  recommendedBillingPeriod: BillingPeriod
  comparison: Record<ResourceKey, {
    average: number
    momentumLimit: number
    accelerateLimit: number
    eliteLimit: number
    fitsIn: SubscriptionTier
  }>
  savings: {
    monthly: number
    quarterly: number
    yearly: number
    monthlySavings: number
    quarterlySavings: number
    yearlySavings: number
  }
  reason: string
  monthsTracked: number
}

export interface RecommendationResponse {
  recommendation: TierRecommendation
  currentTier: SubscriptionTier | null
  isCurrentPlan: boolean
  isUpgrade: boolean
  isDowngrade: boolean
}

export interface UsageLimitCheck {
  allowed: boolean
  enforced: boolean
  unlimited: boolean
  reason?: string
  used?: number
  limit?: number
  remaining?: number
  tier?: SubscriptionTier | null
}

export interface InitiateResult {
  success: boolean
  paymentUrl?: string
  error?: string
}

export interface CancelResult {
  success: boolean
  cancellationEffectiveAt?: string
  message?: string
  error?: string
}

export interface ChangePlanResult {
  success: boolean
  immediate?: boolean
  proratedAmount?: number
  newTier?: SubscriptionTier
  effectiveDate?: string
  message?: string
  error?: string
}

// ============================================================================
// Hook
// ============================================================================

export function useSubscription() {
  // State
  const [subscription, setSubscription] = useState<SubscriptionStatusResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null)
  const [recommendationLoading, setRecommendationLoading] = useState(false)

  const hasFetchedRecommendation = useRef(false)

  // ==========================================================================
  // Fetch Status
  // ==========================================================================

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/subscription/status')

      if (!response.ok) {
        if (response.status === 401) {
          setError('Not authenticated')
          return
        }
        throw new Error('Failed to fetch subscription status')
      }

      const data: SubscriptionStatusResponse = await response.json()
      setSubscription(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // ==========================================================================
  // Fetch Recommendation (Lazy)
  // ==========================================================================

  const fetchRecommendation = useCallback(async () => {
    if (hasFetchedRecommendation.current) return
    hasFetchedRecommendation.current = true

    setRecommendationLoading(true)
    try {
      const response = await fetch('/api/subscription/recommendation')

      if (!response.ok) {
        console.error('Failed to fetch recommendation')
        return
      }

      const data: RecommendationResponse = await response.json()
      setRecommendation(data)
    } catch (err) {
      console.error('Error fetching recommendation:', err)
    } finally {
      setRecommendationLoading(false)
    }
  }, [])

  // ==========================================================================
  // Initial Load + Window Focus Refresh
  // ==========================================================================

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Lazy load recommendation after main status
  useEffect(() => {
    if (subscription && !hasFetchedRecommendation.current) {
      fetchRecommendation()
    }
  }, [subscription, fetchRecommendation])

  // Auto-refresh on window focus (user may have completed payment in another tab)
  useEffect(() => {
    const handleFocus = () => {
      fetchStatus()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchStatus])

  // ==========================================================================
  // Derived Values
  // ==========================================================================

  const subscriptionEnabled = subscription?.subscriptionEnabled ?? false
  const hasSubscription = subscription?.hasSubscription ?? false
  const tier = subscription?.tier ?? null
  const billingPeriod = subscription?.billingPeriod ?? null
  const status = subscription?.status ?? null

  // ==========================================================================
  // Access Check Functions
  // ==========================================================================

  /**
   * Check if user can access a feature
   * Returns true if:
   * - Subscription system is disabled (kill switch OFF)
   * - User's tier includes the feature
   */
  const canAccessFeature = useCallback(
    (featureKey: FeatureKey): boolean => {
      // Admin bypass — always allowed
      if (subscription?.isAdmin) {
        return true
      }

      // If subscription system is disabled, always allow
      if (!subscriptionEnabled) {
        return true
      }

      // If no subscription data yet, be permissive during load
      if (!subscription) {
        return true
      }

      // If no tier, deny
      if (!subscription.tier || !subscription.features) {
        return false
      }

      // Check feature in tier
      return subscription.features[featureKey] ?? false
    },
    [subscriptionEnabled, subscription]
  )

  /**
   * Get usage info for a resource
   */
  const usageFor = useCallback(
    (resource: ResourceKey): UsageSummary => {
      // Admin bypass — always unlimited
      if (subscription?.isAdmin) {
        return {
          used: 0,
          limit: -1,
          remaining: -1,
          percentUsed: 0,
          unlimited: true,
        }
      }

      if (!subscription?.usage) {
        return {
          used: 0,
          limit: -1,
          remaining: -1,
          percentUsed: 0,
          unlimited: true,
        }
      }

      return subscription.usage[resource]
    },
    [subscription]
  )

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Initiate a new subscription
   * Redirects to Grow payment page on success
   */
  const initiate = useCallback(
    async (targetTier: SubscriptionTier, targetBillingPeriod: BillingPeriod): Promise<InitiateResult> => {
      try {
        const response = await fetch('/api/subscription/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tier: targetTier, billingPeriod: targetBillingPeriod }),
        })

        const data = await response.json()

        if (!response.ok) {
          return { success: false, error: data.error || 'Failed to initiate subscription' }
        }

        // Redirect to payment URL
        if (data.paymentUrl) {
          window.location.href = data.paymentUrl
        }

        return { success: true, paymentUrl: data.paymentUrl }
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
      }
    },
    []
  )

  /**
   * Cancel subscription
   * Refreshes status after cancellation
   */
  const cancel = useCallback(async (): Promise<CancelResult> => {
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to cancel subscription' }
      }

      // Refresh status after cancellation
      await fetchStatus()

      return {
        success: true,
        cancellationEffectiveAt: data.cancellationEffectiveAt,
        message: data.message,
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }, [fetchStatus])

  /**
   * Change plan (upgrade, downgrade, or billing period)
   * Returns payment URL for immediate charges or effective date for scheduled changes
   */
  const changePlan = useCallback(
    async (
      targetTier: SubscriptionTier,
      targetBillingPeriod?: BillingPeriod
    ): Promise<ChangePlanResult> => {
      try {
        const body: Record<string, unknown> = { targetTier }
        if (targetBillingPeriod) {
          body.targetBillingPeriod = targetBillingPeriod
        }

        const response = await fetch('/api/subscription/change-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        const data = await response.json()

        if (!response.ok) {
          return { success: false, error: data.error || 'Failed to change plan' }
        }

        // Refresh status after change
        await fetchStatus()

        return {
          success: true,
          immediate: data.immediate,
          proratedAmount: data.proratedAmount,
          newTier: data.newTier,
          effectiveDate: data.effectiveDate,
          message: data.message,
        }
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
      }
    },
    [fetchStatus]
  )

  /**
   * SPLIT PATTERN: Check usage limit and get permission
   *
   * This implements the check-then-increment pattern:
   * 1. Call this to check if action is allowed
   * 2. If allowed, perform the action
   * 3. After success, call the returned increment function
   *
   * When kill switch is OFF:
   * - Check always passes (allowed=true, enforced=false)
   * - Caller proceeds with action
   * - Increment always happens (silent tracking)
   *
   * When kill switch is ON:
   * - Check may fail if no subscription or limit exceeded
   * - Caller should block action if not allowed
   * - Increment only happens if caller proceeds
   */
  const checkAndConsume = useCallback(
    async (
      resource: ResourceKey
    ): Promise<{
      check: UsageLimitCheck
      increment: () => Promise<void>
    }> => {
      // Step 1: Check usage limit
      let check: UsageLimitCheck

      try {
        const response = await fetch('/api/subscription/check-limit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resource }),
        })

        if (!response.ok) {
          // On error, be permissive
          check = { allowed: true, enforced: false, unlimited: true }
        } else {
          check = await response.json()
        }
      } catch {
        // On error, be permissive
        check = { allowed: true, enforced: false, unlimited: true }
      }

      // Step 2: Return check result and increment function
      const increment = async () => {
        try {
          await fetch('/api/subscription/increment-usage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resource }),
          })

          // Refresh status to update usage counts in UI
          fetchStatus()
        } catch {
          // Silent fail - tracking shouldn't break the app
          console.error('Failed to increment usage')
        }
      }

      return { check, increment }
    },
    [fetchStatus]
  )

  /**
   * Manually refresh subscription status
   */
  const refresh = useCallback(async () => {
    setIsLoading(true)
    await fetchStatus()
  }, [fetchStatus])

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // Status values
    subscription,
    subscriptionEnabled,
    isLoading,
    error,
    hasSubscription,
    tier,
    billingPeriod,
    status,
    isAdmin: subscription?.isAdmin ?? false,

    // Access checks
    canAccessFeature,
    usageFor,

    // Recommendation
    recommendation: recommendation?.recommendation ?? null,
    recommendationLoading,
    isRecommendationUpgrade: recommendation?.isUpgrade ?? false,
    isRecommendationDowngrade: recommendation?.isDowngrade ?? false,
    isRecommendationCurrentPlan: recommendation?.isCurrentPlan ?? false,

    // Actions
    initiate,
    cancel,
    changePlan,
    checkAndConsume,
    refresh,
  }
}
