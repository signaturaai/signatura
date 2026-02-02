'use client'

/**
 * CV Analysis Dashboard
 *
 * Pulls data from the ScoreArbiter and analyzeCVContent functions to show:
 * - Overall score comparison (Original vs Optimized)
 * - Radar chart with 10 indicator axes (Original vs Optimized overlay)
 * - Per-indicator breakdown with scores and Siggy Insights
 *
 * Fully responsive: stacks vertically on mobile, side-by-side on desktop.
 */

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CVAnalysisRadar, type RadarDataPoint } from '@/components/cv/CVAnalysisRadar'
import { IndicatorBreakdown, type IndicatorItem } from '@/components/cv/IndicatorBreakdown'
import {
  analyzeCVContent,
  scoreArbiter,
  PM_CORE_PRINCIPLES,
  analyzeWithPMPrinciples,
  isProductRole,
  getWeightsForRole,
  type FourStageAnalysis,
} from '@/lib/ai/siggy-integration-guide'

// ---------------------------------------------------------------------------
// Helper: Map 4-stage analysis + PM principles → 10 radar data points
// ---------------------------------------------------------------------------

interface AnalysisMapped {
  radarData: RadarDataPoint[]
  indicators: IndicatorItem[]
  overallOriginal: number
  overallOptimized: number
  improvementPct: number
}

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

function mapAnalysisToIndicators(
  originalAnalysis: FourStageAnalysis,
  optimizedAnalysis: FourStageAnalysis,
  originalText: string,
  optimizedText: string
): AnalysisMapped {
  // Map the 10 PM principles to radar axes, scoring each on 0-10 scale
  const originalPM = analyzeWithPMPrinciples(originalText)
  const optimizedPM = analyzeWithPMPrinciples(optimizedText)

  // Build per-principle scores (0-10 scale from 0-20 raw dimension contribution)
  const principleScores = PM_CORE_PRINCIPLES.map((principle) => {
    // Each principle maps to one of the 5 scoring dimensions in the PM analyzer
    // We approximate per-principle by keyword presence scoring (0-10)
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

  const indicators: IndicatorItem[] = principleScores.map(p => ({
    id: p.id,
    name: p.name,
    score: p.tailored,
    maxScore: 10,
    insight: generateSiggyInsight(p.id, p.tailored),
  }))

  const overallOriginal = originalAnalysis.totalScore
  const overallOptimized = optimizedAnalysis.totalScore
  const improvementPct = overallOriginal === 0
    ? (overallOptimized > 0 ? 100 : 0)
    : Math.round(((overallOptimized - overallOriginal) / overallOriginal) * 100)

  return { radarData, indicators, overallOriginal, overallOptimized, improvementPct }
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

  // Bonus for longer, more detailed text
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

// ---------------------------------------------------------------------------
// Sample data — used as placeholder until user inputs their own CV text
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
  const [originalText, setOriginalText] = useState(SAMPLE_ORIGINAL.join('\n'))
  const [optimizedText, setOptimizedText] = useState(SAMPLE_OPTIMIZED.join('\n'))
  const [jobTitle, setJobTitle] = useState('Senior Product Manager')

  const analysis = useMemo(() => {
    const originalBullets = originalText.split('\n').filter(b => b.trim().length > 0)
    const optimizedBullets = optimizedText.split('\n').filter(b => b.trim().length > 0)

    const arbiterResult = scoreArbiter(originalBullets, optimizedBullets, jobTitle || undefined)

    // Combine all bullets for the overall analysis
    const originalCombined = originalBullets.join('. ')
    const optimizedCombined = arbiterResult.optimisedBullets.join('. ')

    const originalAnalysis = analyzeCVContent(originalCombined, jobTitle || undefined)
    const optimizedAnalysis = analyzeCVContent(optimizedCombined, jobTitle || undefined)

    const mapped = mapAnalysisToIndicators(
      originalAnalysis,
      optimizedAnalysis,
      originalCombined,
      optimizedCombined
    )

    return {
      ...mapped,
      arbiterResult,
      weights: getWeightsForRole(jobTitle || undefined),
      isPM: jobTitle ? isProductRole(jobTitle) : true,
    }
  }, [originalText, optimizedText, jobTitle])

  const scoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-600'
    if (score >= 50) return 'text-sky-600'
    if (score >= 30) return 'text-amber-600'
    return 'text-red-500'
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">CV Analysis Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Compare your original CV against the optimized version across 10 professional indicators.
        </p>
      </div>

      {/* Input Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Job Title */}
        <Card className="bg-white/80 backdrop-blur-sm border-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">Target Role</CardTitle>
          </CardHeader>
          <CardContent>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Product Manager"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
            />
            <p className="text-xs text-gray-400 mt-2">
              {analysis.isPM ? (
                <span className="text-indigo-500 font-medium">PM Specialist Mode</span>
              ) : (
                <span className="text-sky-500 font-medium">General Professional Mode</span>
              )}
              {' '}&mdash; weights adjust automatically
            </p>
          </CardContent>
        </Card>

        {/* Original CV */}
        <Card className="bg-white/80 backdrop-blur-sm border-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">Original Bullets</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={originalText}
              onChange={(e) => setOriginalText(e.target.value)}
              rows={4}
              placeholder="Paste your original CV bullets (one per line)"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 resize-none"
            />
          </CardContent>
        </Card>

        {/* Optimized CV */}
        <Card className="bg-white/80 backdrop-blur-sm border-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">Optimized Bullets</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={optimizedText}
              onChange={(e) => setOptimizedText(e.target.value)}
              rows={4}
              placeholder="Paste the AI-tailored bullets (one per line)"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 resize-none"
            />
          </CardContent>
        </Card>
      </div>

      {/* Score Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-gray-50 to-gray-100/50 border-gray-200">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Original</p>
            <p className={`text-3xl font-bold mt-1 ${scoreColor(analysis.overallOriginal)}`}>
              {analysis.overallOriginal}
            </p>
            <p className="text-xs text-gray-400">/ 100</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-violet-50/50 border-indigo-200/50">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-indigo-500 font-medium uppercase tracking-wider">Optimized</p>
            <p className={`text-3xl font-bold mt-1 ${scoreColor(analysis.overallOptimized)}`}>
              {analysis.overallOptimized}
            </p>
            <p className="text-xs text-gray-400">/ 100</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-green-50/50 border-emerald-200/50">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-emerald-600 font-medium uppercase tracking-wider">Improvement</p>
            <p className="text-3xl font-bold mt-1 text-emerald-600">
              {analysis.improvementPct > 0 ? '+' : ''}{analysis.improvementPct}%
            </p>
            <p className="text-xs text-gray-400">score delta</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-sky-50 to-blue-50/50 border-sky-200/50">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-sky-600 font-medium uppercase tracking-wider">Methodology</p>
            <p className={`text-lg font-bold mt-2 ${analysis.arbiterResult.methodologyPreserved ? 'text-emerald-600' : 'text-red-500'}`}>
              {analysis.arbiterResult.methodologyPreserved ? 'Preserved' : 'Degraded'}
            </p>
            <p className="text-xs text-gray-400">
              {analysis.arbiterResult.decisions.filter(d => d.winner === 'original').length} reverted
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content: Radar + Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <Card className="bg-white/80 backdrop-blur-sm border-gray-100">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-800">
              10-Indicator Radar Comparison
            </CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">
              Original (dashed) vs Optimized (solid) across all PM-mapped dimensions
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

      {/* Arbiter Decision Log */}
      <Card className="bg-white/80 backdrop-blur-sm border-gray-100">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-gray-800">
            Arbiter Decision Log
          </CardTitle>
          <p className="text-xs text-gray-400 mt-0.5">
            Per-bullet comparison — the Arbiter keeps the highest-scoring version of each bullet
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {analysis.arbiterResult.decisions.map((decision, idx) => (
              <div
                key={idx}
                className={`rounded-xl border p-4 text-sm ${
                  decision.winner === 'tailored'
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : 'border-amber-200 bg-amber-50/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500">Bullet {idx + 1}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      decision.winner === 'tailored'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {decision.winner === 'tailored' ? 'Optimized Kept' : 'Original Kept'}
                    </span>
                    <span className={`text-xs font-medium ${
                      decision.scoreDelta >= 0 ? 'text-emerald-600' : 'text-red-500'
                    }`}>
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

      {/* Weight Profile Breakdown */}
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
                    className="h-full rounded-full bg-indigo-400"
                    style={{ width: `${value * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
