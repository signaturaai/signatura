/**
 * Pricing Page
 *
 * Displays subscription tiers with pricing, features, and personalized recommendations.
 * Shows "Coming Soon" when subscription system is disabled.
 */

'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Star, Sparkles, BarChart3, Loader2 } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui'
import { useSubscription } from '@/hooks/useSubscription'
import {
  TIER_CONFIGS,
  TIER_ORDER,
  formatPrice,
  isUpgrade,
  isDowngrade,
} from '@/lib/subscription/config'
import type { SubscriptionTier, BillingPeriod } from '@/types/subscription'

// ============================================================================
// Types
// ============================================================================

interface PricingCardProps {
  tier: SubscriptionTier
  billingPeriod: BillingPeriod
  currentTier: SubscriptionTier | null
  isRecommended: boolean
  onSelect: (tier: SubscriptionTier) => void
  isLoading: boolean
  loadingTier: SubscriptionTier | null
}

// ============================================================================
// Constants
// ============================================================================

const TIER_COLORS: Record<SubscriptionTier, { border: string; text: string; bg: string; button: string }> = {
  momentum: {
    border: 'border-l-teal-500',
    text: 'text-teal-600',
    bg: 'bg-teal-50',
    button: 'bg-teal-600 hover:bg-teal-700 text-white',
  },
  accelerate: {
    border: 'border-l-purple-500',
    text: 'text-purple-600',
    bg: 'bg-purple-50',
    button: 'bg-amber-500 hover:bg-amber-600 text-white',
  },
  elite: {
    border: 'border-l-amber-500',
    text: 'text-amber-600',
    bg: 'bg-amber-50',
    button: 'bg-amber-500 hover:bg-amber-600 text-white',
  },
}

const FEATURE_LABELS: Record<SubscriptionTier, string[]> = {
  momentum: [
    '8 Application Tracker',
    '8 Tailored CVs',
    '8 Interview Coach Sessions',
    '8 Compensation Sessions',
    '8 Contract Reviews',
  ],
  accelerate: [
    '15 Application Tracker',
    '15 Tailored CVs',
    '15 Interview Coach Sessions',
    '15 Compensation Sessions',
    '15 Contract Reviews',
    '5 AI-Powered Avatar Full Conversational Interviews',
  ],
  elite: [
    'Unlimited Access to All non AI-voiced Features',
    '10 AI-Powered Avatar Full Conversational Interviews',
  ],
}

const PERIOD_LABELS: Record<BillingPeriod, string> = {
  monthly: 'per month',
  quarterly: 'per quarter',
  yearly: 'per year',
}

// ============================================================================
// Components
// ============================================================================

function BillingPeriodToggle({
  value,
  onChange,
}: {
  value: BillingPeriod
  onChange: (period: BillingPeriod) => void
}) {
  const periods: BillingPeriod[] = ['monthly', 'quarterly', 'yearly']
  const labels: Record<BillingPeriod, string> = {
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly',
  }

  return (
    <div className="inline-flex items-center rounded-full bg-gray-100 p-1">
      {periods.map((period) => (
        <button
          key={period}
          onClick={() => onChange(period)}
          className={`
            relative px-4 py-2 text-sm font-medium rounded-full transition-all duration-200
            ${value === period
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
            }
          `}
        >
          {labels[period]}
          {value === period && (
            <motion.div
              layoutId="billing-period-indicator"
              className="absolute inset-0 bg-white rounded-full shadow-sm -z-10"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
            />
          )}
        </button>
      ))}
    </div>
  )
}

function RecommendationBanner({ reason }: { reason: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-4"
    >
      <div className="flex items-start gap-3">
        <BarChart3 className="h-5 w-5 text-blue-600 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-900">Based on your usage:</p>
          <p className="text-sm text-blue-700 mt-1">{reason}</p>
        </div>
      </div>
    </motion.div>
  )
}

function PricingCard({
  tier,
  billingPeriod,
  currentTier,
  isRecommended,
  onSelect,
  isLoading,
  loadingTier,
}: PricingCardProps) {
  const config = TIER_CONFIGS[tier]
  const colors = TIER_COLORS[tier]
  const features = FEATURE_LABELS[tier]
  const pricing = config.pricing[billingPeriod]
  const isCurrentPlan = currentTier === tier
  const isUpgradeAction = currentTier ? isUpgrade(currentTier, tier) : false
  const isDowngradeAction = currentTier ? isDowngrade(currentTier, tier) : false
  const isThisLoading = isLoading && loadingTier === tier

  const getButtonLabel = () => {
    if (isCurrentPlan) return 'Current Plan'
    if (isUpgradeAction) return 'Upgrade'
    if (isDowngradeAction) return 'Downgrade'
    return 'Select Plan'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <Card
        className={`
          relative h-full flex flex-col border-l-4 ${colors.border}
          ${config.isMostPopular ? 'ring-2 ring-purple-500 shadow-lg' : ''}
        `}
      >
        {/* Badges */}
        <div className="absolute -top-3 left-4 flex gap-2">
          {config.isMostPopular && (
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-600 px-3 py-1 text-xs font-medium text-white">
              <Star className="h-3 w-3" /> Most Popular
            </span>
          )}
          {isRecommended && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-xs font-medium text-white">
              <Sparkles className="h-3 w-3" /> Recommended for you
            </span>
          )}
        </div>

        <CardHeader className={config.isMostPopular || isRecommended ? 'pt-8' : ''}>
          <CardTitle className={`text-xl font-bold ${colors.text}`}>
            {config.name.toUpperCase()}
          </CardTitle>
          {pricing.discount && (
            <span className={`inline-block mt-1 text-xs font-medium ${colors.bg} ${colors.text} px-2 py-0.5 rounded-full`}>
              ({pricing.discount} OFF)
            </span>
          )}
          <CardDescription className="mt-2">{config.tagline}</CardDescription>
        </CardHeader>

        <CardContent className="flex-grow">
          <ul className="space-y-3">
            {features.map((feature, index) => {
              const isBold = tier === 'accelerate' && feature.includes('AI-Powered') ||
                tier === 'elite'
              return (
                <li key={index} className="flex items-start gap-2">
                  <Check className={`h-5 w-5 shrink-0 ${colors.text}`} />
                  <span className={`text-sm ${isBold ? 'font-semibold' : ''}`}>{feature}</span>
                </li>
              )
            })}
          </ul>
        </CardContent>

        <CardFooter className="flex flex-col items-stretch gap-4 border-t pt-6">
          <div className="text-center">
            <span className="text-3xl font-bold">{formatPrice(pricing.amount)}</span>
            <span className="text-muted-foreground ml-1">{PERIOD_LABELS[billingPeriod]}</span>
          </div>

          <Button
            onClick={() => onSelect(tier)}
            disabled={isCurrentPlan || isLoading}
            className={`w-full ${isCurrentPlan ? '' : colors.button}`}
            variant={isCurrentPlan ? 'outline' : 'default'}
          >
            {isThisLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              getButtonLabel()
            )}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}

function ComparisonTable({
  recommendation,
  recommendedTier,
}: {
  recommendation: NonNullable<ReturnType<typeof useSubscription>['recommendation']>
  recommendedTier: SubscriptionTier
}) {
  const resources = [
    { key: 'applications', label: 'Applications' },
    { key: 'cvs', label: 'CVs' },
    { key: 'interviews', label: 'Interviews' },
    { key: 'compensation', label: 'Compensation' },
    { key: 'contracts', label: 'Contracts' },
    { key: 'aiAvatarInterviews', label: 'AI Avatar Interviews' },
  ] as const

  const formatLimit = (limit: number) => (limit === -1 ? '∞' : limit.toString())
  const checkMark = (fits: boolean) => (fits ? '✓' : '✗')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mt-12"
    >
      <h3 className="text-lg font-semibold mb-4">Your average monthly usage:</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-3 px-4 text-left">Resource</th>
              <th className="py-3 px-4 text-center">Your Avg</th>
              <th className={`py-3 px-4 text-center ${recommendedTier === 'momentum' ? 'bg-teal-50' : ''}`}>
                Momentum (8)
              </th>
              <th className={`py-3 px-4 text-center ${recommendedTier === 'accelerate' ? 'bg-purple-50' : ''}`}>
                Accelerate (15)
              </th>
              <th className={`py-3 px-4 text-center ${recommendedTier === 'elite' ? 'bg-amber-50' : ''}`}>
                Elite (∞)
              </th>
            </tr>
          </thead>
          <tbody>
            {resources.map(({ key, label }) => {
              const data = recommendation.comparison[key]
              if (!data) return null

              return (
                <tr key={key} className="border-b">
                  <td className="py-3 px-4">{label}</td>
                  <td className="py-3 px-4 text-center font-medium">~{Math.round(data.average)}/mo</td>
                  <td className={`py-3 px-4 text-center ${recommendedTier === 'momentum' ? 'bg-teal-50' : ''}`}>
                    {formatLimit(data.momentumLimit)}{' '}
                    <span className={data.average <= data.momentumLimit || data.momentumLimit === -1 ? 'text-green-600' : 'text-red-600'}>
                      {checkMark(data.average <= data.momentumLimit || data.momentumLimit === -1)}
                    </span>
                  </td>
                  <td className={`py-3 px-4 text-center ${recommendedTier === 'accelerate' ? 'bg-purple-50' : ''}`}>
                    {formatLimit(data.accelerateLimit)}{' '}
                    <span className={data.average <= data.accelerateLimit || data.accelerateLimit === -1 ? 'text-green-600' : 'text-red-600'}>
                      {checkMark(data.average <= data.accelerateLimit || data.accelerateLimit === -1)}
                    </span>
                  </td>
                  <td className={`py-3 px-4 text-center ${recommendedTier === 'elite' ? 'bg-amber-50' : ''}`}>
                    {formatLimit(data.eliteLimit)}{' '}
                    <span className="text-green-600">✓</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}

function ComingSoonView() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-amber-100">
          <Sparkles className="h-10 w-10 text-purple-600" />
        </div>
        <h1 className="text-3xl font-bold mb-3">Coming Soon</h1>
        <p className="text-muted-foreground max-w-md">
          We&apos;re working on exciting subscription plans to help you accelerate your job search.
          Stay tuned!
        </p>
      </motion.div>
    </div>
  )
}

function LoadingView() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Loading pricing...</p>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export default function PricingPage() {
  const {
    subscriptionEnabled,
    isLoading: subscriptionLoading,
    tier: currentTier,
    billingPeriod: currentBillingPeriod,
    recommendation,
    recommendationLoading,
    initiate,
    changePlan,
  } = useSubscription()

  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod>('quarterly')
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingTier, setProcessingTier] = useState<SubscriptionTier | null>(null)
  const [downgradeDialogOpen, setDowngradeDialogOpen] = useState(false)
  const [pendingDowngrade, setPendingDowngrade] = useState<SubscriptionTier | null>(null)

  const handleSelectPlan = useCallback(
    async (tier: SubscriptionTier) => {
      if (isProcessing) return

      // Check if this is a downgrade
      if (currentTier && isDowngrade(currentTier, tier)) {
        setPendingDowngrade(tier)
        setDowngradeDialogOpen(true)
        return
      }

      setIsProcessing(true)
      setProcessingTier(tier)

      try {
        if (!currentTier) {
          // New subscription - initiate
          await initiate(tier, selectedPeriod)
        } else if (isUpgrade(currentTier, tier)) {
          // Upgrade - immediate change
          await changePlan(tier, selectedPeriod)
        }
      } finally {
        setIsProcessing(false)
        setProcessingTier(null)
      }
    },
    [currentTier, selectedPeriod, isProcessing, initiate, changePlan]
  )

  const handleConfirmDowngrade = useCallback(async () => {
    if (!pendingDowngrade) return

    setDowngradeDialogOpen(false)
    setIsProcessing(true)
    setProcessingTier(pendingDowngrade)

    try {
      await changePlan(pendingDowngrade, selectedPeriod)
    } finally {
      setIsProcessing(false)
      setProcessingTier(null)
      setPendingDowngrade(null)
    }
  }, [pendingDowngrade, selectedPeriod, changePlan])

  // Show loading state
  if (subscriptionLoading) {
    return <LoadingView />
  }

  // Show "Coming Soon" if subscription system is disabled
  if (!subscriptionEnabled) {
    return <ComingSoonView />
  }

  const hasUsageData = Boolean(recommendation && recommendation.monthsTracked >= 1)
  const recommendedTier = recommendation?.recommendedTier || null

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Choose Your Plan</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Select the plan that best fits your job search needs. All plans include our core features.
        </p>
      </div>

      {/* Billing Period Toggle */}
      <div className="flex justify-center">
        <BillingPeriodToggle value={selectedPeriod} onChange={setSelectedPeriod} />
      </div>

      {/* Recommendation Banner */}
      <AnimatePresence>
        {hasUsageData && recommendation && (
          <RecommendationBanner reason={recommendation.reason} />
        )}
      </AnimatePresence>

      {/* Pricing Cards */}
      <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
        {TIER_ORDER.map((tier) => (
          <PricingCard
            key={tier}
            tier={tier}
            billingPeriod={selectedPeriod}
            currentTier={currentTier}
            isRecommended={recommendedTier === tier && hasUsageData}
            onSelect={handleSelectPlan}
            isLoading={isProcessing}
            loadingTier={processingTier}
          />
        ))}
      </div>

      {/* Comparison Table */}
      {hasUsageData && recommendation && (
        <ComparisonTable recommendation={recommendation} recommendedTier={recommendedTier!} />
      )}

      {/* No Usage Data Message */}
      {!hasUsageData && !recommendationLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mt-8"
        >
          <p className="text-muted-foreground">
            Not sure? Start with <span className="font-semibold text-purple-600">Accelerate</span> — our most popular plan.
          </p>
        </motion.div>
      )}

      {/* Downgrade Confirmation Dialog */}
      <AlertDialog open={downgradeDialogOpen} onOpenChange={setDowngradeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Downgrade</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to downgrade to {pendingDowngrade ? TIER_CONFIGS[pendingDowngrade].name : ''}?
              Your current plan benefits will remain active until the end of your billing period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingDowngrade(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDowngrade}>
              Confirm Downgrade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
