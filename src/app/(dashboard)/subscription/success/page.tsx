/**
 * Subscription Success Page
 *
 * Displayed after successful payment completion.
 * Polls subscription status while webhook processes.
 * Always functional (even when kill switch off - payment may have been initiated during testing).
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Check, ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { Button, Card, CardContent } from '@/components/ui'
import { TIER_CONFIGS } from '@/lib/subscription/config'
import type { SubscriptionTier, BillingPeriod } from '@/types/subscription'

// ============================================================================
// Types
// ============================================================================

interface SubscriptionStatusResponse {
  subscriptionEnabled: boolean
  hasSubscription: boolean
  tier: SubscriptionTier | null
  billingPeriod: BillingPeriod | null
  status: string | null
  currentPeriodEnd: string | null
}

// ============================================================================
// Constants
// ============================================================================

const POLL_INTERVAL_MS = 2000 // 2 seconds
const MAX_POLL_DURATION_MS = 30000 // 30 seconds
const MAX_POLL_ATTEMPTS = MAX_POLL_DURATION_MS / POLL_INTERVAL_MS // 15 attempts

const TIER_EMOJIS: Record<SubscriptionTier, string> = {
  momentum: '🚀',
  accelerate: '⚡',
  elite: '👑',
}

const TIER_COLORS: Record<SubscriptionTier, string> = {
  momentum: 'text-teal-600',
  accelerate: 'text-purple-600',
  elite: 'text-amber-600',
}

const TIER_FEATURES: Record<SubscriptionTier, string[]> = {
  momentum: [
    '8 Application Tracker entries per month',
    '8 Tailored CVs per month',
    '8 Interview Coach sessions per month',
    '8 Compensation negotiation sessions per month',
    '8 Contract reviews per month',
  ],
  accelerate: [
    '15 Application Tracker entries per month',
    '15 Tailored CVs per month',
    '15 Interview Coach sessions per month',
    '15 Compensation negotiation sessions per month',
    '15 Contract reviews per month',
    '5 AI-Powered Avatar Interviews per month',
  ],
  elite: [
    'Unlimited Application Tracker entries',
    'Unlimited Tailored CVs',
    'Unlimited Interview Coach sessions',
    'Unlimited Compensation negotiation sessions',
    'Unlimited Contract reviews',
    '10 AI-Powered Avatar Interviews per month',
  ],
}

// ============================================================================
// Animation Variants
// ============================================================================

const checkmarkVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 0.5, ease: 'easeInOut' as const },
      opacity: { duration: 0.2 },
    },
  },
}

const circleVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: 'easeOut' as const,
    },
  },
}

const contentVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      delay: 0.3,
    },
  },
}

const featureVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      delay: 0.5 + i * 0.1,
    },
  }),
}

// ============================================================================
// Components
// ============================================================================

function SuccessCheckmark() {
  return (
    <motion.div
      variants={circleVariants}
      initial="hidden"
      animate="visible"
      className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center"
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <motion.path
          d="M12 24L20 32L36 16"
          stroke="#16a34a"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={checkmarkVariants}
          initial="hidden"
          animate="visible"
        />
      </svg>
    </motion.div>
  )
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-6"
      >
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </motion.div>
      <p className="text-muted-foreground">{message}</p>
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-yellow-100 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-yellow-600" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Processing Your Subscription</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Your payment was successful, but we&apos;re still processing your subscription.
          This usually takes just a moment.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={onRetry}>
            Check Again
          </Button>
          <Button onClick={() => window.location.href = '/dashboard'}>
            Go to Dashboard
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

// ============================================================================
// Main Component
// ============================================================================

export default function SubscriptionSuccessPage() {
  const router = useRouter()
  const [subscription, setSubscription] = useState<SubscriptionStatusResponse | null>(null)
  const [isPolling, setIsPolling] = useState(true)
  const [hasTimedOut, setHasTimedOut] = useState(false)
  const pollCount = useRef(0)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch subscription status
  const fetchStatus = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/subscription/status')
      if (!response.ok) return false

      const data: SubscriptionStatusResponse = await response.json()
      setSubscription(data)

      // Check if subscription is active
      if (data.hasSubscription && data.tier && data.status === 'active') {
        return true // Successfully found active subscription
      }

      return false
    } catch (error) {
      console.error('Error fetching subscription status:', error)
      return false
    }
  }, [])

  // Polling logic
  useEffect(() => {
    const poll = async () => {
      pollCount.current += 1

      const success = await fetchStatus()

      if (success) {
        // Found active subscription, stop polling
        setIsPolling(false)
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
        }
        return
      }

      if (pollCount.current >= MAX_POLL_ATTEMPTS) {
        // Timed out, stop polling
        setIsPolling(false)
        setHasTimedOut(true)
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
        }
      }
    }

    // Initial fetch
    poll()

    // Start polling interval
    pollIntervalRef.current = setInterval(poll, POLL_INTERVAL_MS)

    // Cleanup on unmount
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [fetchStatus])

  // Handle retry
  const handleRetry = useCallback(() => {
    pollCount.current = 0
    setIsPolling(true)
    setHasTimedOut(false)
    fetchStatus()
  }, [fetchStatus])

  // Handle go to dashboard
  const handleGoToDashboard = useCallback(() => {
    router.push('/dashboard')
  }, [router])

  // Loading state while polling
  if (isPolling && !subscription?.hasSubscription) {
    return <LoadingState message="Confirming your subscription..." />
  }

  // Timeout state - subscription not found after polling
  if (hasTimedOut && !subscription?.hasSubscription) {
    return <ErrorState onRetry={handleRetry} />
  }

  // No subscription found (shouldn't happen normally)
  if (!subscription?.tier) {
    return <ErrorState onRetry={handleRetry} />
  }

  const tier = subscription.tier
  const config = TIER_CONFIGS[tier]
  const features = TIER_FEATURES[tier]
  const emoji = TIER_EMOJIS[tier]
  const colorClass = TIER_COLORS[tier]

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12">
      <div className="max-w-2xl w-full mx-auto px-4">
        {/* Success Animation */}
        <SuccessCheckmark />

        {/* Welcome Message */}
        <motion.div
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">
            Welcome to <span className={colorClass}>{config.name}</span>! {emoji}
          </h1>
          <p className="text-muted-foreground">
            Your subscription is now active. Here&apos;s what&apos;s included:
          </p>
        </motion.div>

        {/* Features Card */}
        <motion.div
          variants={contentVariants}
          initial="hidden"
          animate="visible"
        >
          <Card className="mb-8">
            <CardContent className="pt-6">
              <h2 className="font-semibold mb-4">Your Plan Features</h2>
              <ul className="space-y-3">
                {features.map((feature, index) => (
                  <motion.li
                    key={index}
                    custom={index}
                    variants={featureVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex items-start gap-3"
                  >
                    <div className={`mt-0.5 rounded-full p-1 bg-green-100`}>
                      <Check className="w-3 h-3 text-green-600" />
                    </div>
                    <span className="text-sm">{feature}</span>
                  </motion.li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* Billing Info */}
        <motion.div
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          className="text-center mb-8"
        >
          <p className="text-sm text-muted-foreground">
            Next billing date:{' '}
            <span className="font-medium text-foreground">
              {formatDate(subscription.currentPeriodEnd)}
            </span>
          </p>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-center"
        >
          <Button
            size="lg"
            onClick={handleGoToDashboard}
            className="min-w-[200px]"
          >
            Go to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
