/**
 * Subscription Settings Page
 *
 * Displays subscription details, usage stats, trends, and management actions.
 * Shows full-access message when subscription system is disabled.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronRight,
  CreditCard,
  Loader2,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
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
import { useSubscription, type ResourceKey } from '@/hooks/useSubscription'
import {
  TIER_CONFIGS,
  formatPrice,
} from '@/lib/subscription/config'
import type { SubscriptionTier, BillingPeriod } from '@/types/subscription'

// ============================================================================
// Types
// ============================================================================

interface UsageTrendData {
  month: string
  applications: number
  cvs: number
  interviews: number
  compensation: number
  contracts: number
  aiAvatarInterviews: number
}

interface UsageTrendsResponse {
  trends: UsageTrendData[]
  averages: Record<ResourceKey, number>
  monthsTracked: number
}

// ============================================================================
// Constants
// ============================================================================

const RESOURCE_LABELS: Record<ResourceKey, string> = {
  applications: 'Applications',
  cvs: 'Tailored CVs',
  interviews: 'Interview Coach',
  compensation: 'Compensation',
  contracts: 'Contract Reviews',
  aiAvatarInterviews: 'AI Avatar Interviews',
}

const RESOURCE_ORDER: ResourceKey[] = [
  'applications',
  'cvs',
  'interviews',
  'compensation',
  'contracts',
  'aiAvatarInterviews',
]

// ============================================================================
// Helper Components
// ============================================================================

function ProgressBar({
  used,
  limit,
  unlimited
}: {
  used: number
  limit: number
  unlimited: boolean
}) {
  if (unlimited) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-green-600 font-medium">Unlimited</span>
        <Check className="h-4 w-4 text-green-600" />
      </div>
    )
  }

  const percentUsed = limit > 0 ? Math.min((used / limit) * 100, 100) : 0

  let colorClass = 'bg-green-500'
  if (percentUsed >= 80) {
    colorClass = 'bg-red-500'
  } else if (percentUsed >= 50) {
    colorClass = 'bg-yellow-500'
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{used}/{limit} used</span>
        <span className="text-muted-foreground">{Math.round(percentUsed)}%</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentUsed}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full ${colorClass} rounded-full`}
        />
      </div>
    </div>
  )
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatMonth(monthString: string): string {
  const [year, month] = monthString.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

// ============================================================================
// Section Components
// ============================================================================

function CurrentPlanSection({
  tier,
  billingPeriod,
  status,
  currentPeriodStart,
  currentPeriodEnd,
  isCancelled,
  cancellationEffectiveAt,
  scheduledTierChange,
  scheduledChangeDate,
  isPastDue,
  onCancelDowngrade,
  isCancellingDowngrade,
}: {
  tier: SubscriptionTier
  billingPeriod: BillingPeriod
  status: string
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  isCancelled: boolean
  cancellationEffectiveAt: string | null
  scheduledTierChange: SubscriptionTier | null
  scheduledChangeDate: string | null
  isPastDue: boolean
  onCancelDowngrade: () => void
  isCancellingDowngrade: boolean
}) {
  const config = TIER_CONFIGS[tier]
  const price = config.pricing[billingPeriod].amount
  const periodLabel = billingPeriod === 'monthly' ? '/mo' : billingPeriod === 'quarterly' ? '/qtr' : '/yr'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Current Plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Plan Info */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">{config.name}</span>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary capitalize">
                {billingPeriod}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{config.tagline}</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold">{formatPrice(price)}</span>
            <span className="text-muted-foreground">{periodLabel}</span>
          </div>
        </div>

        {/* Period Dates */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Current period: {formatDate(currentPeriodStart)} — {formatDate(currentPeriodEnd)}</span>
        </div>

        {/* Alerts */}
        {isPastDue && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-800">Payment Past Due</p>
              <p className="text-xs text-red-600">Please update your payment method to avoid service interruption.</p>
            </div>
          </div>
        )}

        {isCancelled && cancellationEffectiveAt && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <p className="text-sm text-yellow-800">
              Your subscription will end on <strong>{formatDate(cancellationEffectiveAt)}</strong>
            </p>
          </div>
        )}

        {scheduledTierChange && scheduledChangeDate && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <p className="text-sm text-blue-800">
                Downgrading to <strong>{TIER_CONFIGS[scheduledTierChange].name}</strong> on{' '}
                <strong>{formatDate(scheduledChangeDate)}</strong>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onCancelDowngrade}
              disabled={isCancellingDowngrade}
            >
              {isCancellingDowngrade ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Cancel downgrade'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function UsageSection({
  usage,
}: {
  usage: Record<ResourceKey, { used: number; limit: number; unlimited: boolean }>
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Usage This Period
        </CardTitle>
        <CardDescription>Track your feature usage for the current billing period</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {RESOURCE_ORDER.map((resource) => {
            const data = usage[resource]
            return (
              <div key={resource} className="space-y-1">
                <label className="text-sm font-medium">{RESOURCE_LABELS[resource]}</label>
                <ProgressBar
                  used={data.used}
                  limit={data.limit}
                  unlimited={data.unlimited}
                />
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function UsageTrendsSection({
  trends,
  averages,
  currentTier,
  recommendedTier,
  recommendationReason,
}: {
  trends: UsageTrendData[]
  averages: Record<ResourceKey, number>
  currentTier: SubscriptionTier | null
  recommendedTier: SubscriptionTier | null
  recommendationReason: string | null
}) {
  const isOnRightPlan = currentTier === recommendedTier
  const shouldUpgrade = currentTier && recommendedTier &&
    ['momentum', 'accelerate', 'elite'].indexOf(recommendedTier) >
    ['momentum', 'accelerate', 'elite'].indexOf(currentTier)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Usage Trends
        </CardTitle>
        <CardDescription>Your usage patterns over the last few months</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Trends Table */}
        {trends.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-3 text-left font-medium">Month</th>
                  {RESOURCE_ORDER.map((resource) => (
                    <th key={resource} className="py-2 px-3 text-center font-medium">
                      {RESOURCE_LABELS[resource].split(' ')[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trends.map((trend) => (
                  <tr key={trend.month} className="border-b">
                    <td className="py-2 px-3 font-medium">{formatMonth(trend.month)}</td>
                    <td className="py-2 px-3 text-center">{trend.applications}</td>
                    <td className="py-2 px-3 text-center">{trend.cvs}</td>
                    <td className="py-2 px-3 text-center">{trend.interviews}</td>
                    <td className="py-2 px-3 text-center">{trend.compensation}</td>
                    <td className="py-2 px-3 text-center">{trend.contracts}</td>
                    <td className="py-2 px-3 text-center">{trend.aiAvatarInterviews}</td>
                  </tr>
                ))}
                <tr className="bg-muted/50">
                  <td className="py-2 px-3 font-medium">Average</td>
                  {RESOURCE_ORDER.map((resource) => (
                    <td key={resource} className="py-2 px-3 text-center font-medium">
                      ~{Math.round(averages[resource])}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            No usage history available yet. Keep using Signatura to see trends!
          </p>
        )}

        {/* Recommendation */}
        {recommendedTier && recommendationReason && (
          <div className={`p-4 rounded-lg ${
            isOnRightPlan
              ? 'bg-green-50 border border-green-200'
              : 'bg-amber-50 border border-amber-200'
          }`}>
            {isOnRightPlan ? (
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <p className="text-sm text-green-800">
                  You&apos;re on the right plan!
                </p>
              </div>
            ) : shouldUpgrade ? (
              <div className="flex items-start gap-2">
                <Sparkles className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    You might benefit from upgrading to {TIER_CONFIGS[recommendedTier].name}
                  </p>
                  <p className="text-xs text-amber-700 mt-1">{recommendationReason}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <TrendingUp className="h-5 w-5 text-amber-600 mt-0.5" />
                <p className="text-sm text-amber-800">{recommendationReason}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ActionsSection({
  hasSubscription,
  isCancelled,
  onChangePlan,
  onCancel,
  onResubscribe,
}: {
  hasSubscription: boolean
  isCancelled: boolean
  onChangePlan: () => void
  onCancel: () => void
  onResubscribe: () => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Subscription</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasSubscription && !isCancelled && (
          <>
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={onChangePlan}
            >
              Change Plan
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={onCancel}
            >
              Cancel Subscription
              <X className="h-4 w-4" />
            </Button>
          </>
        )}

        {isCancelled && (
          <Button
            className="w-full"
            onClick={onResubscribe}
          >
            Resubscribe
          </Button>
        )}

        {!hasSubscription && (
          <Button
            className="w-full"
            onClick={onChangePlan}
          >
            Choose a Plan
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function ComingSoonView() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-green-200 bg-green-50 p-6 text-center"
      >
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <Check className="h-6 w-6 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-green-900 mb-2">Full Access Enabled</h2>
        <p className="text-green-700">
          Subscription management coming soon. You currently have full access to all features.
        </p>
      </motion.div>
    </div>
  )
}

function LoadingView() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Loading subscription details...</p>
      </div>
    </div>
  )
}

function NoSubscriptionView({ onChoosePlan }: { onChoosePlan: () => void }) {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border p-6 text-center"
      >
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <CreditCard className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">No Active Subscription</h2>
        <p className="text-muted-foreground mb-4">
          Choose a plan to unlock premium features and take your job search to the next level.
        </p>
        <Button onClick={onChoosePlan}>
          Choose a Plan
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </motion.div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export default function SubscriptionSettingsPage() {
  const router = useRouter()
  const {
    subscription,
    subscriptionEnabled,
    isLoading,
    hasSubscription,
    tier,
    billingPeriod,
    status,
    recommendation,
    cancel,
    changePlan,
  } = useSubscription()

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isCancellingDowngrade, setIsCancellingDowngrade] = useState(false)

  // Usage trends state
  const [trends, setTrends] = useState<UsageTrendData[]>([])
  const [averages, setAverages] = useState<Record<ResourceKey, number> | null>(null)
  const [trendsLoading, setTrendsLoading] = useState(false)

  // Fetch usage trends
  useEffect(() => {
    if (!subscriptionEnabled || !hasSubscription) return

    const fetchTrends = async () => {
      setTrendsLoading(true)
      try {
        const response = await fetch('/api/subscription/trends')
        if (response.ok) {
          const data: UsageTrendsResponse = await response.json()
          setTrends(data.trends)
          setAverages(data.averages)
        }
      } catch (err) {
        console.error('Error fetching trends:', err)
      } finally {
        setTrendsLoading(false)
      }
    }

    fetchTrends()
  }, [subscriptionEnabled, hasSubscription])

  const handleChangePlan = useCallback(() => {
    router.push('/pricing')
  }, [router])

  const handleCancel = useCallback(async () => {
    setIsCancelling(true)
    try {
      await cancel()
      setCancelDialogOpen(false)
    } finally {
      setIsCancelling(false)
    }
  }, [cancel])

  const handleCancelDowngrade = useCallback(async () => {
    if (!tier || !billingPeriod) return

    setIsCancellingDowngrade(true)
    try {
      // Cancel downgrade by changing to current plan (clears scheduled change)
      await changePlan(tier, billingPeriod)
    } finally {
      setIsCancellingDowngrade(false)
    }
  }, [tier, billingPeriod, changePlan])

  const handleResubscribe = useCallback(() => {
    router.push('/pricing')
  }, [router])

  // Loading state
  if (isLoading) {
    return <LoadingView />
  }

  // Kill switch off - show coming soon
  if (!subscriptionEnabled) {
    return <ComingSoonView />
  }

  // No subscription
  if (!hasSubscription || !tier || !billingPeriod) {
    return <NoSubscriptionView onChoosePlan={handleChangePlan} />
  }

  // Build usage data for the usage section
  const usageData = subscription?.usage || {
    applications: { used: 0, limit: 8, unlimited: false },
    cvs: { used: 0, limit: 8, unlimited: false },
    interviews: { used: 0, limit: 8, unlimited: false },
    compensation: { used: 0, limit: 8, unlimited: false },
    contracts: { used: 0, limit: 8, unlimited: false },
    aiAvatarInterviews: { used: 0, limit: 0, unlimited: false },
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Subscription</h1>
        <p className="text-muted-foreground">Manage your subscription and view usage</p>
      </div>

      {/* Current Plan */}
      <CurrentPlanSection
        tier={tier}
        billingPeriod={billingPeriod}
        status={status || 'active'}
        currentPeriodStart={subscription?.currentPeriodStart || null}
        currentPeriodEnd={subscription?.currentPeriodEnd || null}
        isCancelled={subscription?.isCancelled || false}
        cancellationEffectiveAt={subscription?.cancellationEffectiveAt || null}
        scheduledTierChange={subscription?.scheduledTierChange || null}
        scheduledChangeDate={subscription?.currentPeriodEnd || null}
        isPastDue={subscription?.isPastDue || false}
        onCancelDowngrade={handleCancelDowngrade}
        isCancellingDowngrade={isCancellingDowngrade}
      />

      {/* Usage This Period */}
      <UsageSection usage={usageData} />

      {/* Usage Trends */}
      {!trendsLoading && (
        <UsageTrendsSection
          trends={trends}
          averages={averages || {
            applications: 0,
            cvs: 0,
            interviews: 0,
            compensation: 0,
            contracts: 0,
            aiAvatarInterviews: 0,
          }}
          currentTier={tier}
          recommendedTier={recommendation?.recommendedTier || null}
          recommendationReason={recommendation?.reason || null}
        />
      )}

      {/* Actions */}
      <ActionsSection
        hasSubscription={hasSubscription}
        isCancelled={subscription?.isCancelled || false}
        onChangePlan={handleChangePlan}
        onCancel={() => setCancelDialogOpen(true)}
        onResubscribe={handleResubscribe}
      />

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will remain active until the end of your current billing period.
              You won&apos;t be charged again, and you can resubscribe at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-red-600 hover:bg-red-700"
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Yes, Cancel'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
