/**
 * UsageBadge Component
 *
 * Displays usage status for a resource with color-coded indicator.
 * When subscriptionEnabled is false, renders null (invisible).
 *
 * Usage:
 * <UsageBadge resource="applications" />
 */

'use client'

import Link from 'next/link'
import { AlertTriangle, Check, Infinity } from 'lucide-react'
import { useSubscription, type ResourceKey } from '@/hooks/useSubscription'

// ============================================================================
// Types
// ============================================================================

interface UsageBadgeProps {
  /** The resource key to show usage for */
  resource: ResourceKey
  /** Show full text or compact version */
  compact?: boolean
  /** Optional class name */
  className?: string
}

// ============================================================================
// Helper Functions
// ============================================================================

function getColorClass(percentUsed: number, atLimit: boolean): string {
  if (atLimit) return 'bg-red-100 text-red-700 border-red-200'
  if (percentUsed >= 80) return 'bg-red-100 text-red-700 border-red-200'
  if (percentUsed >= 50) return 'bg-yellow-100 text-yellow-700 border-yellow-200'
  return 'bg-green-100 text-green-700 border-green-200'
}

// ============================================================================
// Component
// ============================================================================

export function UsageBadge({
  resource,
  compact = false,
  className = '',
}: UsageBadgeProps) {
  const {
    subscriptionEnabled,
    isLoading,
    usageFor,
  } = useSubscription()

  // When subscription system is disabled, render nothing
  if (!subscriptionEnabled) {
    return null
  }

  // While loading, render nothing to prevent flash
  if (isLoading) {
    return null
  }

  const usage = usageFor(resource)

  // If no usage data available, render nothing
  if (!usage) {
    return null
  }

  const { used, limit, remaining, percentUsed, unlimited } = usage

  // Unlimited resource
  if (unlimited) {
    return (
      <span
        className={`
          inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full
          bg-green-100 text-green-700 border border-green-200
          ${className}
        `}
      >
        <Infinity className="h-3 w-3" />
        {!compact && 'Unlimited'}
      </span>
    )
  }

  const atLimit = remaining <= 0
  const colorClass = getColorClass(percentUsed, atLimit)

  // At limit - show upgrade prompt
  if (atLimit) {
    return (
      <Link href="/pricing" className="no-underline">
        <span
          className={`
            inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full
            border cursor-pointer hover:opacity-80 transition-opacity
            ${colorClass}
            ${className}
          `}
        >
          <AlertTriangle className="h-3 w-3" />
          {compact ? `${used}/${limit}` : 'Limit reached — Upgrade'}
        </span>
      </Link>
    )
  }

  // Normal usage display
  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full
        border
        ${colorClass}
        ${className}
      `}
    >
      {percentUsed < 50 && <Check className="h-3 w-3" />}
      {compact ? `${used}/${limit}` : `${used}/${limit} used`}
    </span>
  )
}
