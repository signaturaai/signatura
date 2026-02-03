'use client'

/**
 * Narrative Reflection — "The Aha! Moment"
 *
 * Post-analysis comparison view showing:
 * - Narrative Match Meter (animated gauge)
 * - Side-by-side: "Your Desired Brand" vs "Your Current CV Signal"
 * - Evidence list: "Why this score?"
 * - CTA: "Align My Narrative & Close the Gap"
 *
 * Uses coaching-style professional UI with clear data visualization.
 */

import { motion } from 'framer-motion'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from '@/components/ui'
import {
  Gauge,
  Eye,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NarrativeProfile, NarrativeAnalysisResult, NarrativeEvidence } from '@/lib/ai/siggy-integration-guide'

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Animated gauge meter for narrative match */
function MatchGauge({ percent }: { percent: number }) {
  // SVG arc gauge (semi-circle)
  const radius = 70
  const halfCircumference = Math.PI * radius
  const strokeDashoffset = halfCircumference - (percent / 100) * halfCircumference

  const color =
    percent >= 70 ? '#10b981' :
    percent >= 45 ? '#f59e0b' :
    '#ef4444'

  const bgColor =
    percent >= 70 ? '#d1fae5' :
    percent >= 45 ? '#fef3c7' :
    '#fee2e2'

  const label =
    percent >= 70 ? 'Strong Alignment' :
    percent >= 45 ? 'Partial Alignment' :
    'Significant Gap'

  const labelColor =
    percent >= 70 ? 'text-emerald-600' :
    percent >= 45 ? 'text-amber-600' :
    'text-red-500'

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-28 overflow-hidden">
        <svg viewBox="0 0 160 90" className="w-full h-full">
          {/* Background arc */}
          <path
            d="M 10 80 A 70 70 0 0 1 150 80"
            fill="none"
            stroke={bgColor}
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Filled arc */}
          <motion.path
            d="M 10 80 A 70 70 0 0 1 150 80"
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={halfCircumference}
            initial={{ strokeDashoffset: halfCircumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <motion.span
            className="text-3xl font-bold text-gray-900"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.4 }}
          >
            {percent}%
          </motion.span>
        </div>
      </div>
      <span className={cn('text-sm font-semibold mt-1', labelColor)}>{label}</span>
      <span className="text-xs text-gray-400 mt-0.5">Narrative Match</span>
    </div>
  )
}

/** Single evidence row */
function EvidenceRow({ item, index }: { item: NarrativeEvidence; index: number }) {
  const ratio = item.maxContribution > 0 ? item.contribution / item.maxContribution : 0
  const barColor =
    ratio >= 0.6 ? 'bg-emerald-400' :
    ratio >= 0.3 ? 'bg-amber-400' :
    'bg-red-300'

  const Icon = ratio >= 0.6 ? CheckCircle : ratio >= 0.3 ? AlertTriangle : XCircle
  const iconColor = ratio >= 0.6 ? 'text-emerald-500' : ratio >= 0.3 ? 'text-amber-500' : 'text-red-400'

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4 + index * 0.1 }}
      className="space-y-2 rounded-lg border border-gray-100 bg-gray-50/50 p-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', iconColor)} />
          <span className="text-sm font-medium text-gray-800">{item.dimension}</span>
        </div>
        <span className="text-xs font-mono text-gray-500">{item.contribution}/{item.maxContribution}</span>
      </div>
      {/* Score bar */}
      <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', barColor)}
          initial={{ width: 0 }}
          animate={{ width: `${ratio * 100}%` }}
          transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
        />
      </div>
      <div className="grid gap-1 text-xs sm:grid-cols-2">
        <div className="text-gray-500"><span className="font-medium">Desired:</span> {item.desired}</div>
        <div className="text-gray-500"><span className="font-medium">CV Signal:</span> {item.actual}</div>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface NarrativeReflectionProps {
  profile: NarrativeProfile
  analysis: NarrativeAnalysisResult
  onAlignNarrative: () => void
  className?: string
}

export function NarrativeReflection({ profile, analysis, onAlignNarrative, className }: NarrativeReflectionProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Match Gauge */}
      <Card className="border border-gray-200 bg-white/90 backdrop-blur-sm">
        <CardContent className="flex flex-col items-center py-8">
          <MatchGauge percent={analysis.narrativeMatchPercent} />
        </CardContent>
      </Card>

      {/* Narrative Contrast — side by side */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Desired Brand */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="h-full border-2 border-indigo-200/60 bg-indigo-50/30">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-indigo-500" />
                <CardTitle className="text-base text-indigo-700">Your Desired Brand</CardTitle>
              </div>
              <p className="text-xs text-indigo-400">What you want recruiters to see</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm font-medium text-gray-800 italic">
                &quot;{profile.desiredBrand}&quot;
              </p>
              <div className="space-y-1.5 text-xs text-gray-600">
                <div><span className="font-medium text-indigo-600">Target:</span> {profile.targetRole}</div>
                <div><span className="font-medium text-indigo-600">Level:</span> {profile.seniorityLevel.charAt(0).toUpperCase() + profile.seniorityLevel.slice(1)}</div>
                <div><span className="font-medium text-indigo-600">Superpower:</span> {profile.coreStrength.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Current CV Signal */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="h-full border-2 border-amber-200/60 bg-amber-50/30">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-amber-600" />
                <CardTitle className="text-base text-amber-700">Your Current CV Signal</CardTitle>
              </div>
              <p className="text-xs text-amber-400">What the AI actually detected</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm font-semibold text-gray-900">{analysis.detectedArchetype}</p>
              <p className="text-xs text-gray-600">{analysis.archetypeDescription}</p>
              <div className="text-xs text-gray-500">
                <span className="font-medium text-amber-600">CV Score:</span> {analysis.cvScore}/100
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Evidence: Why this score? */}
      <Card className="border border-gray-200 bg-white/90 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-gray-500" />
            <CardTitle className="text-base">Why This Score?</CardTitle>
          </div>
          <p className="text-xs text-gray-400">Transparent evidence behind your Narrative Match</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {analysis.evidence.map((item, i) => (
            <EvidenceRow key={item.dimension} item={item} index={i} />
          ))}

          {/* Keyword summary */}
          {(analysis.alignedKeywords.length > 0 || analysis.missingKeywords.length > 0) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-4 grid gap-4 sm:grid-cols-2"
            >
              {analysis.alignedKeywords.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Aligned Keywords ({analysis.alignedKeywords.length})
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {analysis.alignedKeywords.map(kw => (
                      <span
                        key={kw}
                        className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs text-emerald-700"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {analysis.missingKeywords.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-red-500 flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5" />
                    Missing Keywords ({analysis.missingKeywords.length})
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {analysis.missingKeywords.map(kw => (
                      <span
                        key={kw}
                        className="rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-xs text-red-600"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="flex justify-center"
      >
        <Button
          onClick={onAlignNarrative}
          className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600 px-8 py-3 text-base shadow-lg shadow-indigo-200/50"
        >
          <Sparkles className="mr-2 h-5 w-5" />
          Align My Narrative & Close the Gap
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </motion.div>
    </div>
  )
}
