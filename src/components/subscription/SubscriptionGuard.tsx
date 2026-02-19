/**
 * SubscriptionGuard Component
 *
 * Guards routes that require an active subscription.
 * When subscriptionEnabled is false, always renders children.
 * When enabled and no subscription, redirects to pricing page.
 *
 * Usage:
 * <SubscriptionGuard>
 *   <ProtectedPage />
 * </SubscriptionGuard>
 */

'use client'

import { useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useSubscription } from '@/hooks/useSubscription'

// ============================================================================
// Types
// ============================================================================

interface SubscriptionGuardProps {
  /** Content to render when subscription is valid */
  children: ReactNode
  /** Optional redirect URL (defaults to /pricing) */
  redirectTo?: string
  /** Optional custom loading component */
  loadingComponent?: ReactNode
}

// ============================================================================
// Component
// ============================================================================

export function SubscriptionGuard({
  children,
  redirectTo = '/pricing',
  loadingComponent,
}: SubscriptionGuardProps) {
  const router = useRouter()
  const {
    subscriptionEnabled,
    isLoading,
    hasSubscription,
    recommendation,
  } = useSubscription()

  // Redirect to pricing if no subscription
  useEffect(() => {
    if (!subscriptionEnabled) {
      // Kill switch off - no redirect needed
      return
    }

    if (isLoading) {
      // Still loading - wait
      return
    }

    if (!hasSubscription) {
      // No subscription - redirect to pricing with recommendation
      const recommendedTier = recommendation?.recommendation?.recommendedTier
      const redirectUrl = recommendedTier
        ? `${redirectTo}?recommended=${recommendedTier}`
        : redirectTo

      router.replace(redirectUrl)
    }
  }, [subscriptionEnabled, isLoading, hasSubscription, recommendation, redirectTo, router])

  // When subscription system is disabled, always render children
  if (!subscriptionEnabled) {
    return <>{children}</>
  }

  // While loading, show loading state
  if (isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>
    }

    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // If no subscription, show nothing (redirect will happen)
  if (!hasSubscription) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Redirecting to pricing...</p>
        </div>
      </div>
    )
  }

  // Has subscription - render children
  return <>{children}</>
}
