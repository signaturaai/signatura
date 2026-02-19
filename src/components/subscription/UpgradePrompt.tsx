/**
 * UpgradePrompt Component
 *
 * Modal component for upgrade prompts with personalized messaging.
 * Uses recommendation data to suggest the best tier.
 * When subscriptionEnabled is false, renders null (invisible).
 *
 * Usage:
 * <UpgradePrompt
 *   resource="applications"
 *   onClose={() => setShowPrompt(false)}
 * />
 */

'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, TrendingUp, ChevronRight } from 'lucide-react'
import {
  Button,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui'
import { useSubscription, type ResourceKey, type FeatureKey } from '@/hooks/useSubscription'
import { TIER_CONFIGS, formatPrice } from '@/lib/subscription/config'
import type { SubscriptionTier } from '@/types/subscription'

// ============================================================================
// Types
// ============================================================================

interface UpgradePromptProps {
  /** The resource that triggered the upgrade prompt */
  resource?: ResourceKey
  /** The feature that triggered the upgrade prompt */
  feature?: FeatureKey
  /** Whether the prompt is open */
  open?: boolean
  /** Callback when the prompt is closed */
  onClose?: () => void
}

// ============================================================================
// Constants
// ============================================================================

const RESOURCE_LABELS: Record<ResourceKey, string> = {
  applications: 'applications',
  cvs: 'tailored CVs',
  interviews: 'interview coach sessions',
  compensation: 'compensation sessions',
  contracts: 'contract reviews',
  aiAvatarInterviews: 'AI avatar interviews',
}

const FEATURE_LABELS: Record<FeatureKey, string> = {
  applicationTracker: 'Application Tracker',
  tailoredCvs: 'Tailored CVs',
  interviewCoach: 'Interview Coach',
  compensationSessions: 'Compensation Sessions',
  contractReviews: 'Contract Reviews',
  aiAvatarInterviews: 'AI Avatar Interviews',
}

// ============================================================================
// Component
// ============================================================================

export function UpgradePrompt({
  resource,
  feature,
  open = true,
  onClose,
}: UpgradePromptProps) {
  const router = useRouter()
  const {
    subscriptionEnabled,
    isLoading,
    tier: currentTier,
    usageFor,
    recommendation,
  } = useSubscription()

  // When subscription system is disabled, render nothing
  if (!subscriptionEnabled) {
    return null
  }

  // While loading, render nothing
  if (isLoading) {
    return null
  }

  // Get usage data if resource provided
  const usage = resource ? usageFor(resource) : null
  const resourceLabel = resource ? RESOURCE_LABELS[resource] : ''
  const featureLabel = feature ? FEATURE_LABELS[feature] : ''

  // Get recommendation data
  const recommendedTier = recommendation?.recommendation?.recommendedTier || 'accelerate'
  const recommendedConfig = TIER_CONFIGS[recommendedTier]
  const recommendedPrice = recommendedConfig.pricing.monthly.amount

  // Get recommended limit for this resource
  const recommendedLimit = resource
    ? recommendedConfig.limits[resource]
    : null

  // Get average usage from recommendation
  const averageUsage = resource && recommendation?.recommendation?.comparison?.[resource]
    ? Math.round(recommendation.recommendation.comparison[resource].average)
    : null

  const handleUpgrade = useCallback(() => {
    router.push(`/pricing?recommended=${recommendedTier}`)
    onClose?.()
  }, [router, recommendedTier, onClose])

  const handleViewPlans = useCallback(() => {
    router.push('/pricing')
    onClose?.()
  }, [router, onClose])

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose?.()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 mx-auto">
            <TrendingUp className="h-6 w-6 text-amber-600" />
          </div>
          <AlertDialogTitle className="text-center">
            {usage?.remaining === 0 ? 'Limit Reached' : 'Upgrade Your Plan'}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {/* Resource limit message */}
            {resource && usage && (
              <span className="block mb-3">
                You&apos;ve used all <strong>{usage.limit}</strong> {resourceLabel} this period.
              </span>
            )}

            {/* Feature access message */}
            {feature && !resource && (
              <span className="block mb-3">
                {featureLabel} requires a higher tier plan.
              </span>
            )}

            {/* Personalized recommendation */}
            {averageUsage !== null && recommendedLimit !== null && (
              <span className="block text-sm bg-muted/50 rounded-lg p-3 mt-2">
                Based on your average of <strong>~{averageUsage}/mo</strong>,
                the <strong>{recommendedConfig.name}</strong> plan
                ({recommendedLimit === -1 ? 'unlimited' : `${recommendedLimit}/mo`}) is the best fit.
              </span>
            )}

            {/* Current plan indicator */}
            {currentTier && (
              <span className="block text-xs text-muted-foreground mt-2">
                Current plan: {TIER_CONFIGS[currentTier].name}
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            onClick={handleUpgrade}
            className="w-full bg-amber-500 hover:bg-amber-600"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Upgrade to {recommendedConfig.name} — {formatPrice(recommendedPrice)}/mo
          </Button>
          <Button
            variant="outline"
            onClick={handleViewPlans}
            className="w-full"
          >
            View all plans
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              onClick={onClose}
              className="w-full"
            >
              Maybe later
            </Button>
          )}
        </AlertDialogFooter>

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
