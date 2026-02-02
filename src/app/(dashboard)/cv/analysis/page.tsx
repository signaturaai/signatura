'use client'

/**
 * CV Analysis Dashboard — Full Parity
 *
 * The "first value screen" of Signatura: shows the user precisely
 * how their CV improved across 10 professional indicators.
 *
 * Sections:
 *  1. Score Header — prominent 0-10 score with dynamic Improvement Badge
 *  2. Input — job title, original bullets, optimized bullets
 *  3. Interactive Radar Chart — Base (dashed gray) vs Tailored (solid indigo)
 *  4. Indicator Breakdown — 10 indicators with progress bars, scores, Siggy Insights
 *  5. Arbiter Decision Log — per-bullet decisions with rejection reasons
 *  6. Active Weight Profile — PM Specialist vs General Professional
 *
 * Fully responsive: stacks vertically on mobile, side-by-side on desktop.
 */

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CVAnalysisRadar, type RadarDataPoint } from '@/components/cv/CVAnalysisRadar'
import { IndicatorBreakdown, type IndicatorItem } from '@/components/cv/IndicatorBreakdown'
import {
  analyzeCVContent,
  scoreArbiter,
  PM_CORE_PRINCIPLES,
  analyzeWithPMPrinciples,
  analyzeIndicatorDetail,
  isProductRole,
  getWeightsForRole,
  type FourStageAnalysis,
} from '@/lib/ai/siggy-integration-guide'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnalysisMapped {
  radarData: RadarDataPoint[]
  indicators: IndicatorItem[]
  /** Overall score on 0-100 scale */
  overallOriginal: number
  overallOptimized: number
  /** Scores on 0-10 scale for the hero display */
  scoreOriginal10: number
  scoreOptimized10: number
  improvementPct: number
}

// ---------------------------------------------------------------------------
// Helper: Map 4-stage analysis + PM principles → 10 radar data points
// ---------------------------------------------------------------------------

function generateSiggyInsight(principleId: string, score: number): string {
  const insightMap: Record<string, { high: string; mid: string; low: string }> = {
    'outcome-over-output': {
      high: 'Clear outcomes with measurable impact. Hiring managers see a results-driven professional.',
      mid: 'Some outcomes visible but could be more specific. Try adding a "which resulted in..." clause.',
      low: 'Focuses on tasks rather than outcomes. Lead with what changed because of your work.',
    },
    'data-driven-decisions': {
      high: 'Strong use of data and metrics. This shows analytical rigor.',
      mid: 'Some data points present. Try quantifying more — percentages, dollar amounts, user counts.',
      low: 'Missing quantified evidence. Add at least one metric to prove your impact.',
    },
    'user-centricity': {
      high: 'Great user focus. It\'s clear you think about the people your work serves.',
      mid: 'User awareness is there but could be stronger. Name the user segment and their pain point.',
      low: 'No mention of users or customers. Who benefited from your work?',
    },
    'strategic-thinking': {
      high: 'Shows strong strategic vision and ability to connect work to bigger goals.',
      mid: 'Strategic elements present but could tie more clearly to business strategy.',
      low: 'Reads as tactical. Try connecting your work to a larger strategic objective.',
    },
    'cross-functional-leadership': {
      high: 'Clear evidence of leading across teams. This signals senior-level collaboration.',
      mid: 'Some team mentions but the leadership aspect could be more visible.',
      low: 'No cross-team collaboration shown. Even "partnered with engineering" helps.',
    },
    'problem-solving': {
      high: 'Excellent problem identification and resolution. Shows strong analytical thinking.',
      mid: 'Problem-solving implied but not explicit. Name the problem you solved.',
      low: 'No problem framing visible. Start with the challenge, then show your solution.',
    },
    'iterative-development': {
      high: 'Shows an iterative, learning-driven approach. Very PM-minded.',
      mid: 'Some process awareness but could highlight iteration and learning more.',
      low: 'No mention of iteration, testing, or learning from data.',
    },
    'communication-storytelling': {
      high: 'Well-structured and compelling narrative. Easy to follow and remember.',
      mid: 'Good structure but could be more compelling. Try the "Action → Method → Outcome" formula.',
      low: 'Needs stronger narrative structure. Lead with the action, close with the result.',
    },
    'technical-aptitude': {
      high: 'Demonstrates technical fluency without being overly jargon-heavy.',
      mid: 'Some technical context present. Balance technical depth with accessibility.',
      low: 'No technical context shown. Even a brief mention of tools or systems helps.',
    },
    'business-acumen': {
      high: 'Strong business awareness — revenue, growth, efficiency all represented.',
      mid: 'Some business language present. Try connecting your work to revenue or cost savings.',
      low: 'Missing business impact framing. What was the ROI of your work?',
    },
  }

  const map = insightMap[principleId] || {
    high: 'Strong performance on this dimension.',
    mid: 'Room for improvement on this dimension.',
    low: 'This area needs attention.',
  }

  if (score >= 7) return map.high
  if (score >= 4) return map.mid
  return map.low
}

function scorePrincipleInText(text: string, principleId: string): number {
  const lower = text.toLowerCase()
  let score = 0

  const principleKeywords: Record<string, string[]> = {
    'outcome-over-output': ['increased', 'improved', 'reduced', 'achieved', 'resulted', 'enabled', 'generated', 'delivered'],
    'data-driven-decisions': ['%', '$', 'data', 'metrics', 'analytics', 'measured', 'a/b', 'insights'],
    'user-centricity': ['user', 'customer', 'client', 'patient', 'people', 'pain point', 'needs', 'experience'],
    'strategic-thinking': ['strategy', 'strategic', 'vision', 'roadmap', 'prioriti', 'initiative', 'long-term', 'alignment'],
    'cross-functional-leadership': ['cross-functional', 'led', 'team', 'collaborated', 'partnered', 'stakeholder', 'aligned'],
    'problem-solving': ['solved', 'problem', 'challenge', 'issue', 'root cause', 'identified', 'diagnosed', 'resolved'],
    'iterative-development': ['iterative', 'mvp', 'tested', 'sprint', 'agile', 'experiment', 'prototype', 'release'],
    'communication-storytelling': ['presented', 'communicated', 'storytell', 'narrative', 'report', 'executive', 'aligned'],
    'technical-aptitude': ['platform', 'api', 'infrastructure', 'system', 'architecture', 'integration', 'technical', 'pipeline'],
    'business-acumen': ['revenue', 'profit', 'roi', 'growth', 'market', 'business', 'cost', 'arr', 'mrr', 'churn'],
  }

  const keywords = principleKeywords[principleId] || []
  const hits = keywords.filter(kw => lower.includes(kw)).length
  score = Math.min(Math.round((hits / Math.max(keywords.length * 0.4, 1)) * 10), 10)

  if (text.split(/\s+/).length >= 15 && score < 10) score = Math.min(score + 1, 10)

  return score
}

function shortenPrincipleName(name: string): string {
  const shortNames: Record<string, string> = {
    'Outcome Over Output': 'Outcomes',
    'Data-Driven Decision Making': 'Data-Driven',
    'User-Centricity': 'User Focus',
    'Strategic Thinking': 'Strategy',
    'Cross-Functional Leadership': 'Leadership',
    'Problem-Solving & Root Cause Analysis': 'Problem-Solving',
    'Iterative Development & MVP Mindset': 'Iteration',
    'Communication & Storytelling': 'Communication',
    'Technical Aptitude': 'Technical',
    'Business Acumen': 'Business',
  }
  return shortNames[name] || name
}

function mapAnalysisToIndicators(
  originalAnalysis: FourStageAnalysis,
  optimizedAnalysis: FourStageAnalysis,
  originalText: string,
  optimizedText: string,
  optimizedBullets: string[]
): AnalysisMapped {
  const principleScores = PM_CORE_PRINCIPLES.map((principle) => {
    const baseScore = scorePrincipleInText(originalText, principle.id)
    const tailoredScore = scorePrincipleInText(optimizedText, principle.id)
    return { id: principle.id, name: principle.name, base: baseScore, tailored: tailoredScore }
  })

  const radarData: RadarDataPoint[] = principleScores.map(p => ({
    subject: shortenPrincipleName(p.name),
    base: p.base,
    tailored: p.tailored,
    fullMark: 10,
  }))

  const indicators: IndicatorItem[] = principleScores.map(p => {
    const detail = analyzeIndicatorDetail(p.id, optimizedBullets, p.tailored)
    return {
      id: p.id,
      name: p.name,
      score: p.tailored,
      baseScore: p.base,
      maxScore: 10,
      insight: generateSiggyInsight(p.id, p.tailored),
      subIndicators: detail.subIndicators,
      evidence: detail.evidence,
      actionItem: detail.actionItem,
    }
  })

  const overallOriginal = originalAnalysis.totalScore
  const overallOptimized = optimizedAnalysis.totalScore

  // Convert 0-100 to 0-10 for hero display
  const scoreOriginal10 = Math.round((overallOriginal / 10) * 10) / 10
  const scoreOptimized10 = Math.round((overallOptimized / 10) * 10) / 10

  const improvementPct = overallOriginal === 0
    ? (overallOptimized > 0 ? 100 : 0)
    : Math.round(((overallOptimized - overallOriginal) / overallOriginal) * 100)

  return { radarData, indicators, overallOriginal, overallOptimized, scoreOriginal10, scoreOptimized10, improvementPct }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Animated loading skeleton shown while the AI calculates scores */
function AnalysisSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Hero skeleton */}
      <div className="flex items-center justify-center gap-8 py-8">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 rounded-full bg-gray-200 mx-auto" />
          <div className="w-16 h-3 bg-gray-200 rounded mx-auto" />
        </div>
        <div className="w-12 h-4 bg-gray-100 rounded" />
        <div className="text-center space-y-2">
          <div className="w-20 h-20 rounded-full bg-indigo-100 mx-auto" />
          <div className="w-16 h-3 bg-indigo-100 rounded mx-auto" />
        </div>
      </div>

      {/* Chart + breakdown skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="w-32 h-4 bg-gray-200 rounded mb-4" />
          <div className="w-full h-[340px] bg-gray-50 rounded-xl" />
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-3">
          <div className="w-40 h-4 bg-gray-200 rounded mb-4" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-50 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}

/** Empty state shown before user provides input */
function EmptyState({ onLoadSample }: { onLoadSample: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mb-5">
        <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No CV data to analyze yet
      </h3>
      <p className="text-sm text-gray-500 max-w-md mb-6">
        Paste your original and optimized CV bullet points above, or load our sample data to see the dashboard in action.
      </p>
      <button
        onClick={onLoadSample}
        className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-200"
      >
        Load Sample Data
      </button>
    </div>
  )
}

/** Score ring — circular score display for the hero section */
function ScoreRing({
  score,
  label,
  variant,
}: {
  score: number
  label: string
  variant: 'base' | 'tailored'
}) {
  const pct = Math.min((score / 10) * 100, 100)
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const strokeOffset = circumference - (pct / 100) * circumference

  const colors = variant === 'tailored'
    ? { ring: 'stroke-indigo-500', bg: 'stroke-indigo-100', text: 'text-indigo-600', label: 'text-indigo-500' }
    : { ring: 'stroke-gray-400', bg: 'stroke-gray-100', text: 'text-gray-700', label: 'text-gray-500' }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          <circle
            cx="48" cy="48" r={radius}
            fill="none"
            className={colors.bg}
            strokeWidth={6}
          />
          <circle
            cx="48" cy="48" r={radius}
            fill="none"
            className={colors.ring}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-2xl font-bold ${colors.text}`}>
            {score.toFixed(1)}
          </span>
        </div>
      </div>
      <span className={`text-xs font-medium mt-2 ${colors.label}`}>{label}</span>
    </div>
  )
}

/** Dynamic Improvement Badge */
function ImprovementBadge({ pct }: { pct: number }) {
  if (pct === 0) {
    return (
      <div className="px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200">
        <span className="text-sm font-bold text-gray-500">No change</span>
      </div>
    )
  }

  const isPositive = pct > 0
  return (
    <div
      className={cn(
        'px-4 py-2 rounded-full border shadow-sm',
        isPositive
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-red-50 border-red-200'
      )}
    >
      <span
        className={cn(
          'text-lg font-bold',
          isPositive ? 'text-emerald-600' : 'text-red-600'
        )}
      >
        {isPositive ? '+' : ''}{pct}%
      </span>
      <span
        className={cn(
          'text-xs font-medium ml-1.5',
          isPositive ? 'text-emerald-500' : 'text-red-500'
        )}
      >
        improvement
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const SAMPLE_ORIGINAL = [
  'Managed the product roadmap',
  'Worked with engineering and design teams',
  'Built features for users',
  'Attended meetings and provided updates',
]

const SAMPLE_OPTIMIZED = [
  'Led product roadmap strategy using RICE framework, shipping 15 high-impact features over 6 months resulting in 25% revenue growth',
  'Partnered with cross-functional team of 12 engineers and designers, achieving 95% on-time delivery through weekly syncs and stakeholder alignment',
  'Launched user-facing analytics platform for 50K customers, increasing engagement by 40% and reducing churn by 15%',
  'Drove executive stakeholder alignment through weekly product reviews, resulting in $2M budget approval and accelerated roadmap execution',
]

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function CVAnalysisDashboard() {
  const [originalText, setOriginalText] = useState('')
  const [optimizedText, setOptimizedText] = useState('')
  const [jobTitle, setJobTitle] = useState('Senior Product Manager')
  const [isCalculating, setIsCalculating] = useState(false)
  const [inputCollapsed, setInputCollapsed] = useState(false)

  const hasInput = originalText.trim().length > 0 && optimizedText.trim().length > 0

  // Load sample data
  const handleLoadSample = () => {
    setOriginalText(SAMPLE_ORIGINAL.join('\n'))
    setOptimizedText(SAMPLE_OPTIMIZED.join('\n'))
  }

  // Simulate brief calculation delay for premium feel on input change
  useEffect(() => {
    if (!hasInput) return
    setIsCalculating(true)
    const timer = setTimeout(() => setIsCalculating(false), 400)
    return () => clearTimeout(timer)
  }, [originalText, optimizedText, jobTitle, hasInput])

  const analysis = useMemo(() => {
    if (!hasInput) return null

    const originalBullets = originalText.split('\n').filter(b => b.trim().length > 0)
    const optimizedBullets = optimizedText.split('\n').filter(b => b.trim().length > 0)

    const arbiterResult = scoreArbiter(originalBullets, optimizedBullets, jobTitle || undefined)

    const originalCombined = originalBullets.join('. ')
    const optimizedCombined = arbiterResult.optimisedBullets.join('. ')

    const originalAnalysis = analyzeCVContent(originalCombined, jobTitle || undefined)
    const optimizedAnalysis = analyzeCVContent(optimizedCombined, jobTitle || undefined)

    const mapped = mapAnalysisToIndicators(
      originalAnalysis,
      optimizedAnalysis,
      originalCombined,
      optimizedCombined,
      arbiterResult.optimisedBullets
    )

    return {
      ...mapped,
      arbiterResult,
      weights: getWeightsForRole(jobTitle || undefined),
      isPM: jobTitle ? isProductRole(jobTitle) : true,
    }
  }, [originalText, optimizedText, jobTitle, hasInput])

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CV Analysis Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Compare your original CV against the optimized version across 10 professional indicators.
          </p>
        </div>
        {analysis && (
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-xs font-semibold px-2.5 py-1 rounded-full',
              analysis.isPM ? 'bg-indigo-100 text-indigo-700' : 'bg-sky-100 text-sky-700'
            )}>
              {analysis.isPM ? 'PM Specialist' : 'General Professional'}
            </span>
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* Input Section — collapsible when analysis is showing */}
      {/* ============================================================= */}
      <Card className="bg-white/80 backdrop-blur-sm border-gray-100 overflow-hidden">
        <button
          onClick={() => hasInput && setInputCollapsed(!inputCollapsed)}
          className={cn(
            'w-full px-6 py-4 flex items-center justify-between text-left',
            hasInput && 'cursor-pointer hover:bg-gray-50/50 transition-colors'
          )}
        >
          <div>
            <h2 className="text-sm font-semibold text-gray-700">CV Input</h2>
            {inputCollapsed && hasInput && (
              <p className="text-xs text-gray-400 mt-0.5">
                {originalText.split('\n').filter(b => b.trim()).length} original bullets
                {' · '}
                {optimizedText.split('\n').filter(b => b.trim()).length} optimized bullets
                {jobTitle && ` · ${jobTitle}`}
              </p>
            )}
          </div>
          {hasInput && (
            <svg
              className={cn(
                'w-4 h-4 text-gray-400 transition-transform duration-200',
                inputCollapsed && '-rotate-90'
              )}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          )}
        </button>

        {!inputCollapsed && (
          <CardContent className="pt-0 pb-5 px-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Job Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Target Role
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Senior Product Manager"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
                />
              </div>

              {/* Original CV */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Original Bullets
                </label>
                <textarea
                  value={originalText}
                  onChange={(e) => setOriginalText(e.target.value)}
                  rows={4}
                  placeholder="Paste original CV bullets (one per line)"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 resize-none"
                />
              </div>

              {/* Optimized CV */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Optimized Bullets
                </label>
                <textarea
                  value={optimizedText}
                  onChange={(e) => setOptimizedText(e.target.value)}
                  rows={4}
                  placeholder="Paste AI-tailored bullets (one per line)"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 resize-none"
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ============================================================= */}
      {/* Empty State */}
      {/* ============================================================= */}
      {!hasInput && <EmptyState onLoadSample={handleLoadSample} />}

      {/* ============================================================= */}
      {/* Loading Skeleton */}
      {/* ============================================================= */}
      {hasInput && isCalculating && <AnalysisSkeleton />}

      {/* ============================================================= */}
      {/* Analysis Results */}
      {/* ============================================================= */}
      {analysis && !isCalculating && (
        <div className="space-y-6">
          {/* ========================================================= */}
          {/* Score Header — Hero Section */}
          {/* ========================================================= */}
          <Card className="bg-gradient-to-br from-white via-indigo-50/30 to-violet-50/30 border-indigo-100/50 shadow-lg">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
                {/* Original Score Ring */}
                <ScoreRing
                  score={analysis.scoreOriginal10}
                  label="Original"
                  variant="base"
                />

                {/* Arrow + Improvement Badge */}
                <div className="flex flex-col items-center gap-2">
                  <svg className="w-6 h-6 text-gray-300 hidden sm:block" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                  <ImprovementBadge pct={analysis.improvementPct} />
                </div>

                {/* Optimized Score Ring */}
                <ScoreRing
                  score={analysis.scoreOptimized10}
                  label="Optimized"
                  variant="tailored"
                />
              </div>

              {/* Methodology + Arbiter summary */}
              <div className="flex items-center justify-center gap-4 mt-6 pt-5 border-t border-gray-200/50">
                <div className="flex items-center gap-1.5 text-sm">
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    analysis.arbiterResult.methodologyPreserved ? 'bg-emerald-500' : 'bg-red-400'
                  )} />
                  <span className="text-gray-600 font-medium">
                    Methodology {analysis.arbiterResult.methodologyPreserved ? 'Preserved' : 'Degraded'}
                  </span>
                </div>
                <span className="text-gray-300">|</span>
                <span className="text-sm text-gray-500">
                  {analysis.arbiterResult.decisions.filter(d => d.winner === 'tailored').length}/{analysis.arbiterResult.decisions.length} bullets improved
                </span>
                <span className="text-gray-300">|</span>
                <span className="text-sm text-gray-500">
                  {analysis.arbiterResult.decisions.filter(d => d.winner === 'original').length} reverted
                </span>
              </div>
            </CardContent>
          </Card>

          {/* ========================================================= */}
          {/* Radar Chart + Indicator Breakdown (Side by Side) */}
          {/* ========================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar Chart */}
            <Card className="bg-white/80 backdrop-blur-sm border-gray-100">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-gray-800">
                  10-Indicator Radar Comparison
                </CardTitle>
                <p className="text-xs text-gray-400 mt-0.5">
                  Original (dashed gray) vs Optimized (solid indigo)
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <CVAnalysisRadar data={analysis.radarData} height={380} />
              </CardContent>
            </Card>

            {/* Indicator Breakdown */}
            <Card className="bg-white/80 backdrop-blur-sm border-gray-100">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-gray-800">
                  Indicator Breakdown
                </CardTitle>
                <p className="text-xs text-gray-400 mt-0.5">
                  Per-principle scores with Siggy&apos;s coaching insights
                </p>
              </CardHeader>
              <CardContent className="pt-0 max-h-[500px] overflow-y-auto">
                <IndicatorBreakdown indicators={analysis.indicators} />
              </CardContent>
            </Card>
          </div>

          {/* ========================================================= */}
          {/* Arbiter Decision Log */}
          {/* ========================================================= */}
          <Card className="bg-white/80 backdrop-blur-sm border-gray-100">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-gray-800">
                Arbiter Decision Log
              </CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Per-bullet comparison — the Arbiter keeps the highest-scoring version
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {analysis.arbiterResult.decisions.map((decision, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'rounded-xl border p-4 text-sm transition-colors',
                      decision.winner === 'tailored'
                        ? 'border-emerald-200 bg-emerald-50/30'
                        : 'border-amber-200 bg-amber-50/30'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-500">Bullet {idx + 1}</span>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'text-xs font-bold px-2 py-0.5 rounded-full',
                          decision.winner === 'tailored'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        )}>
                          {decision.winner === 'tailored' ? 'Optimized Kept' : 'Original Kept'}
                        </span>
                        <span className={cn(
                          'text-xs font-medium',
                          decision.scoreDelta >= 0 ? 'text-emerald-600' : 'text-red-500'
                        )}>
                          {decision.scoreDelta >= 0 ? '+' : ''}{decision.scoreDelta} pts
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">
                      {decision.bullet}
                    </p>
                    {decision.rejectionReasons.length > 0 && decision.winner === 'original' && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {decision.rejectionReasons.map((reason, ri) => (
                          <span
                            key={ri}
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600"
                          >
                            {reason.stageName} dropped ({reason.drop} pts)
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ========================================================= */}
          {/* Weight Profile */}
          {/* ========================================================= */}
          <Card className="bg-white/80 backdrop-blur-sm border-gray-100">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-gray-800">
                Active Weight Profile
              </CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                {analysis.isPM ? 'PM Specialist' : 'General Professional'} weights for &quot;{jobTitle || 'No role specified'}&quot;
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'ATS Compatibility', value: analysis.weights.ats },
                  { label: 'Cold Indicators', value: analysis.weights.indicators },
                  { label: 'Recruiter UX', value: analysis.weights.recruiterUX },
                  { label: 'PM Intelligence', value: analysis.weights.pmIntelligence },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center p-3 rounded-lg bg-gray-50/50">
                    <p className="text-xs text-gray-500 font-medium">{label}</p>
                    <p className="text-xl font-bold text-gray-800 mt-1">{Math.round(value * 100)}%</p>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-400 transition-all duration-500"
                        style={{ width: `${value * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
