'use client'

/**
 * Application Strategy Card — "Your Winning Strategy"
 *
 * A premium, high-impact summary component that presents:
 * - Core Value Proposition
 * - 3 Strategic Pillars
 * - Executive Summary with Copy to Clipboard
 * - Interview Talking Points
 * - Success Probability Meter
 *
 * Designed to be the final confidence-building step before PDF download.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui'
import {
  Trophy,
  Copy,
  Check,
  Sparkles,
  Target,
  MessageSquareQuote,
  Shield,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ApplicationStrategy, StrategicPillar, TalkingPoint } from '@/lib/ai/siggy-integration-guide'

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Animated circular probability meter */
function ProbabilityMeter({ probability, label }: { probability: number; label: string }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (probability / 100) * circumference

  // Color based on probability range
  const color =
    probability >= 80 ? 'text-emerald-500' :
    probability >= 65 ? 'text-indigo-500' :
    probability >= 50 ? 'text-amber-500' :
    'text-gray-400'

  const strokeColor =
    probability >= 80 ? '#10b981' :
    probability >= 65 ? '#6366f1' :
    probability >= 50 ? '#f59e0b' :
    '#9ca3af'

  const bgRingColor =
    probability >= 80 ? '#d1fae5' :
    probability >= 65 ? '#e0e7ff' :
    probability >= 50 ? '#fef3c7' :
    '#f3f4f6'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke={bgRingColor}
            strokeWidth="8"
          />
          <motion.circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={cn('text-2xl font-bold', color)}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            {probability}%
          </motion.span>
        </div>
      </div>
      <span className={cn('text-sm font-semibold', color)}>{label}</span>
    </div>
  )
}

/** Single strategic pillar card */
function PillarCard({ pillar, index }: { pillar: StrategicPillar; index: number }) {
  const icons = [Shield, Target, Sparkles]
  const Icon = icons[index % icons.length]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.15 }}
      className="flex items-start gap-3 rounded-lg border border-emerald-200/60 bg-emerald-50/30 p-4"
    >
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h4 className="font-semibold text-gray-900">{pillar.title}</h4>
        <p className="mt-0.5 text-sm text-gray-600">{pillar.description}</p>
      </div>
    </motion.div>
  )
}

/** Single talking point row */
function TalkingPointRow({ tp, index }: { tp: TalkingPoint; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6 + index * 0.12 }}
      className="flex items-start gap-3 rounded-lg border border-indigo-100 bg-indigo-50/30 p-4"
    >
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
        <ChevronRight className="h-3.5 w-3.5" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-800">{tp.point}</p>
        <p className="mt-1 text-xs text-gray-500 italic line-clamp-1">From: &quot;{tp.sourceBullet}&quot;</p>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface ApplicationStrategyCardProps {
  strategy: ApplicationStrategy
  className?: string
}

export function ApplicationStrategyCard({ strategy, className }: ApplicationStrategyCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(strategy.executiveSummary)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for environments without clipboard API
    }
  }

  const isEmpty = strategy.strategicPillars.length === 0

  return (
    <Card className={cn(
      'relative overflow-hidden border-2 border-emerald-300/60 bg-white/80 backdrop-blur-sm shadow-lg',
      className
    )}>
      {/* Subtle premium gradient border glow */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500" />

      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl text-gray-900">Your Winning Strategy</CardTitle>
            <p className="text-sm text-gray-500">AI-powered positioning for maximum impact</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        {isEmpty ? (
          <div className="py-8 text-center text-gray-400">
            <Trophy className="mx-auto h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">Complete your CV tailoring to unlock your strategy.</p>
          </div>
        ) : (
          <>
            {/* ---- Value Proposition ---- */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-teal-50/60 p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-2">
                Core Value Proposition
              </p>
              <p className="text-lg font-semibold text-gray-900 leading-relaxed">
                {strategy.valueProposition}
              </p>
            </motion.div>

            {/* ---- Success Probability + Pillars row ---- */}
            <div className="grid gap-6 md:grid-cols-[1fr_160px]">
              {/* Pillars */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Strategic Pillars
                </h3>
                <div className="space-y-2">
                  {strategy.strategicPillars.map((pillar, i) => (
                    <PillarCard key={pillar.principleId} pillar={pillar} index={i} />
                  ))}
                </div>
              </div>

              {/* Probability Meter */}
              <div className="flex flex-col items-center justify-center">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 text-center">
                  Success Probability
                </h3>
                <ProbabilityMeter
                  probability={strategy.successProbability}
                  label={strategy.confidenceLabel}
                />
              </div>
            </div>

            {/* ---- Executive Summary ---- */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  <MessageSquareQuote className="h-4 w-4" />
                  The &quot;Why You?&quot; Summary
                </h3>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                >
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.span
                        key="copied"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-1 text-emerald-600"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Copied!
                      </motion.span>
                    ) : (
                      <motion.span
                        key="copy"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-1"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="rounded-lg border border-gray-200 bg-gray-50/50 p-4"
              >
                <p className="text-sm leading-relaxed text-gray-700">
                  {strategy.executiveSummary}
                </p>
              </motion.div>
            </div>

            {/* ---- Talking Points ---- */}
            {strategy.talkingPoints.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  <Target className="h-4 w-4" />
                  Interview Talking Points
                </h3>
                <div className="space-y-2">
                  {strategy.talkingPoints.map((tp, i) => (
                    <TalkingPointRow key={i} tp={tp} index={i} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
