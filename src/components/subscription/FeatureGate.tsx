/**
 * FeatureGate Component
 *
 * Gates access to features based on subscription status.
 * When subscriptionEnabled is false, always renders children (invisible gating).
 *
 * Usage:
 * <FeatureGate feature="aiAvatarInterviews">
 *   <AIAvatarComponent />
 * </FeatureGate>
 */

'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { Lock, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui'
import { useSubscription, type FeatureKey } from '@/hooks/useSubscription'
import { TIER_CONFIGS } from '@/lib/subscription/config'

// ============================================================================
// Types
// ============================================================================

interface FeatureGateProps {
  /** The feature key to check access for */
  feature: FeatureKey
  /** Content to render when access is granted */
  children: ReactNode
  /** Optional fallback content when access is denied */
  fallback?: ReactNode
  /** Optional class name for the wrapper */
  className?: string
}

// ============================================================================
// Component
// ============================================================================

export function FeatureGate({
  feature,
  children,
  fallback,
  className = '',
}: FeatureGateProps) {
  const {
    subscriptionEnabled,
    isLoading,
    hasSubscription,
    tier,
    canAccessFeature,
  } = useSubscription()

  // When subscription system is disabled, always render children
  if (!subscriptionEnabled) {
    return <>{children}</>
  }

  // While loading, render children to prevent flash
  if (isLoading) {
    return <>{children}</>
  }

  // Check if user can access this feature
  const hasAccess = canAccessFeature(feature)

  // If user has access, render children
  if (hasAccess) {
    return <>{children}</>
  }

  // If custom fallback provided, use it
  if (fallback) {
    return <>{fallback}</>
  }

  // Default lock overlay
  return (
    <div className={`relative ${className}`}>
      {/* Blurred/disabled content */}
      <div className="pointer-events-none select-none opacity-30 blur-[2px]">
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
        <div className="text-center p-6 max-w-sm">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>

          {!hasSubscription ? (
            // No subscription at all
            <>
              <h3 className="font-semibold mb-2">Subscribe to Access</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get a subscription to unlock this feature and more.
              </p>
              <Link href="/pricing">
                <Button>
                  <Sparkles className="mr-2 h-4 w-4" />
                  View Plans
                </Button>
              </Link>
            </>
          ) : (
            // Has subscription but feature not in tier
            <>
              <h3 className="font-semibold mb-2">Upgrade Required</h3>
              <p className="text-sm text-muted-foreground mb-4">
                This feature requires a higher tier plan.
                {tier && (
                  <span className="block mt-1">
                    Current plan: <strong>{TIER_CONFIGS[tier].name}</strong>
                  </span>
                )}
              </p>
              <Link href="/pricing">
                <Button>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Upgrade Plan
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
