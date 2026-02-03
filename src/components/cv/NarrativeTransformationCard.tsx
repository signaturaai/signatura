'use client'

/**
 * Narrative Transformation Card — "The Victory Lap"
 *
 * Final comparison component for the result screen showing:
 * - Before → After archetype shift with percentages
 * - Narrative shift summary sentence
 * - Per-dimension progress bars
 * - Top 3 bullet transformations (before/after)
 * - Success summary (the CPO's "feel ready to lead" moment)
 *
 * Premium emerald→teal gradient with animated reveals.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from '@/components/ui'
import {
  Trophy,
  ArrowRight,
  TrendingUp,
  CheckCircle,
  Sparkles,
  ChevronDown,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NarrativeTransformationSummary } from '@/lib/ai/siggy-integration-guide'

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Animated archetype badge with percent ring */
function ArchetypeBadge({
  name,
  percent,
  variant,
}: {
  name: string
  percent: number
  variant: 'before' | 'after'
}) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percent / 100) * circumference
  const colors = variant === 'before'
    ? { ring: '#9ca3af', bg: '#f3f4f6', text: 'text-gray-600', label: 'text-gray-400' }
    : { ring: '#10b981', bg: '#ecfdf5', text: 'text-emerald-700', label: 'text-emerald-500' }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width={88} height={88} className="rotate-[-90deg]">
          <circle
            cx={44} cy={44} r={radius}
            fill="none"
            stroke={colors.bg}
            strokeWidth={6}
          />
          <motion.circle
            cx={44} cy={44} r={radius}
            fill="none"
            stroke={colors.ring}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: variant === 'after' ? 0.4 : 0 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('text-lg font-bold tabular-nums', colors.text)}>
            {percent}%
          </span>
        </div>
      </div>
      <p className={cn('text-xs font-semibold text-center max-w-[100px]', colors.label)}>
        {variant === 'before' ? 'FROM' : 'TO'}
      </p>
      <p className={cn('text-sm font-bold text-center max-w-[120px] leading-tight', colors.text)}>
        {name}
      </p>
    </div>
  )
}

/** Per-dimension shift bar */
function DimensionShiftBar({
  dimension,
  before,
  after,
  delta,
}: {
  dimension: string
  before: number
  after: number
  delta: number
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">{dimension}</span>
        <span className={cn(
          'text-xs font-bold',
          delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-500' : 'text-gray-400'
        )}>
          {delta > 0 ? '+' : ''}{delta}%
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-gray-100 overflow-hidden">
        {/* Before bar (faded) */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gray-300/50"
          style={{ width: `${Math.min(before, 100)}%` }}
        />
        {/* After bar */}
        <motion.div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full',
            after >= 70 ? 'bg-emerald-400' : after >= 45 ? 'bg-amber-400' : 'bg-red-400'
          )}
          initial={{ width: `${before}%` }}
          animate={{ width: `${Math.min(after, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
        />
      </div>
    </div>
  )
}

/** A single bullet transformation row */
function TransformationRow({
  original,
  transformed,
  boostLabel,
  index,
}: {
  original: string
  transformed: string
  boostLabel: string
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 + index * 0.15 }}
      className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-3 space-y-2"
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
          {boostLabel}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 items-start">
        <div className="text-xs text-gray-500 leading-relaxed line-through decoration-gray-300">
          {original}
        </div>
        <ArrowRight className="hidden sm:block w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-gray-800 font-medium leading-relaxed">
          {transformed}
        </div>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export interface NarrativeTransformationCardProps {
  summary: NarrativeTransformationSummary
  className?: string
}

export function NarrativeTransformationCard({
  summary,
  className,
}: NarrativeTransformationCardProps) {
  const [showTransformations, setShowTransformations] = useState(false)

  if (!summary) return null

  const hasMeaningfulShift = summary.afterArchetype.percent > summary.beforeArchetype.percent

  return (
    <Card className={cn(
      'overflow-hidden border-emerald-200/60 shadow-lg',
      className
    )}>
      {/* Premium gradient header accent */}
      <div className="h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500" />

      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Trophy className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-gray-900">
              Your Narrative Transformation
            </CardTitle>
            <p className="text-xs text-gray-400">
              How your professional identity shifted
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ===== Archetype Before → After ===== */}
        <div className="flex items-center justify-center gap-4 sm:gap-8">
          <ArchetypeBadge
            name={summary.beforeArchetype.name}
            percent={summary.beforeArchetype.percent}
            variant="before"
          />
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
            className="flex items-center gap-1"
          >
            <ArrowRight className="w-6 h-6 text-emerald-400" />
          </motion.div>
          <ArchetypeBadge
            name={summary.afterArchetype.name}
            percent={summary.afterArchetype.percent}
            variant="after"
          />
        </div>

        {/* ===== Narrative Shift Summary ===== */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center px-4"
        >
          <p className="text-sm text-gray-700 leading-relaxed">
            {summary.narrativeShift}
          </p>
          {summary.jdAlignmentMaintained && (
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <Shield className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-xs font-medium text-indigo-600">
                JD alignment preserved at {summary.jdScore} pts
              </span>
            </div>
          )}
        </motion.div>

        {/* ===== Dimension Progress Bars ===== */}
        <div className="space-y-2.5 px-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Dimension Breakdown
          </p>
          {summary.dimensionShifts.map((dim) => (
            <DimensionShiftBar
              key={dim.dimension}
              dimension={dim.dimension}
              before={dim.before}
              after={dim.after}
              delta={dim.delta}
            />
          ))}
        </div>

        {/* ===== Top Transformations (expandable) ===== */}
        {summary.topTransformations.length > 0 && (
          <div>
            <button
              onClick={() => setShowTransformations(!showTransformations)}
              className="flex items-center gap-2 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Top {summary.topTransformations.length} Identity-Transforming Bullets
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showTransformations && 'rotate-180')} />
            </button>

            <AnimatePresence>
              {showTransformations && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden mt-3 space-y-2"
                >
                  {summary.topTransformations.map((t, idx) => (
                    <TransformationRow
                      key={idx}
                      original={t.original}
                      transformed={t.transformed}
                      boostLabel={t.boostLabel}
                      index={idx}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ===== Success Summary (the victory statement) ===== */}
        {hasMeaningfulShift && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-200/50"
          >
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
                  Success Summary
                </p>
                <p className="text-sm text-emerald-800 leading-relaxed">
                  {summary.successSummary}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ===== Completion Marker ===== */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-medium text-emerald-600">
            Transformation Complete
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
