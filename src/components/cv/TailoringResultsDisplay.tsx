'use client'

/**
 * Tailoring Results Display
 *
 * Shows the overall results of a CV tailoring operation including:
 * - Apples-to-Apples score comparison (Core 70% + Landing Page 30%)
 * - Initial Analysis breakdown (Base CV scores)
 * - Final Analysis (Best of Both Worlds scores)
 * - Section-by-section comparison with Base/Tailored terminology
 * - Dual-polygon radar chart
 */

import { TailoringResult, CVScore } from '@/lib/cv'
import { SectionComparisonViewer } from './SectionComparisonViewer'
import { CVRadarChart } from './CVRadarChart'
import { INDICATOR_SHORT_NAMES } from '@/lib/indicators'
import {
  TrendingUp,
  Clock,
  Zap,
  CheckCircle,
  AlertCircle,
  Copy,
  Download,
  BarChart3,
  FileText,
  Target,
  Layers,
  ArrowRight,
} from 'lucide-react'
import { useState } from 'react'

interface TailoringResultsDisplayProps {
  result: TailoringResult
  onCopy?: (text: string) => void
  onDownload?: (text: string, filename: string) => void
  className?: string
}

export function TailoringResultsDisplay({
  result,
  onCopy,
  onDownload,
  className = '',
}: TailoringResultsDisplayProps) {
  const [activeTab, setActiveTab] = useState<'analysis' | 'final' | 'comparison'>('analysis')
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.finalCVText)
      setCopied(true)
      onCopy?.(result.finalCVText)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([result.finalCVText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'tailored-cv.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    onDownload?.(result.finalCVText, 'tailored-cv.txt')
  }

  if (!result.success) {
    return (
      <div className={`p-6 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-600" />
          <div>
            <h3 className="font-medium text-red-900">Tailoring Failed</h3>
            <p className="text-sm text-red-700 mt-1">{result.error || 'Unknown error occurred'}</p>
          </div>
        </div>
      </div>
    )
  }

  const { initial_scores, final_scores } = result

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Success header */}
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <div>
            <h3 className="font-medium text-green-900">
              CV Successfully Tailored - Best of Both Worlds
            </h3>
            <p className="text-sm text-green-700 mt-1">
              Your CV has been optimized using our non-regression algorithm. Each indicator uses the
              better score between Base and Tailored.
            </p>
          </div>
        </div>
      </div>

      {/* Apples-to-Apples Score Comparison */}
      <ApplesToApplesComparison
        initial={initial_scores}
        final={final_scores}
        improvement={result.overallImprovement}
      />

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Score improvement */}
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Improvement</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-green-600">
              +{result.overallImprovement.toFixed(1)}
            </span>
            <span className="text-sm text-gray-500">points</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Non-regression guaranteed
          </div>
        </div>

        {/* Final score */}
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Zap className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Final Score</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${
                final_scores.overall_score >= 7
                  ? 'text-green-600'
                  : final_scores.overall_score >= 5
                    ? 'text-yellow-600'
                    : 'text-red-600'
              }`}
            >
              {final_scores.overall_score.toFixed(1)}
            </span>
            <span className="text-sm text-gray-500">/10</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Was {initial_scores.overall_score.toFixed(1)}/10
          </div>
        </div>

        {/* Sections improved */}
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Sections</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600">
              {result.sectionsImproved}
            </span>
            <span className="text-sm text-gray-500">
              /{result.totalSections} improved
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {result.sectionsKeptOriginal} kept base version
          </div>
        </div>

        {/* Processing time */}
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Time</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-700">
              {(result.processingTimeMs / 1000).toFixed(1)}
            </span>
            <span className="text-sm text-gray-500">seconds</span>
          </div>
          {result.tokensUsed && (
            <div className="text-xs text-gray-500 mt-1">
              {result.tokensUsed.toLocaleString()} tokens used
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'analysis'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Score Analysis
          </button>
          <button
            onClick={() => setActiveTab('final')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'final'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            Final CV
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'comparison'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            Section Comparison ({result.sectionComparisons.length})
          </button>
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'analysis' ? (
        <ScoreAnalysisView initial={initial_scores} final={final_scores} />
      ) : activeTab === 'final' ? (
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          {/* Actions */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>

          {/* CV text */}
          <div className="whitespace-pre-wrap text-sm text-gray-700 font-mono bg-gray-50 p-4 rounded-lg max-h-[600px] overflow-y-auto">
            {result.finalCVText}
          </div>
        </div>
      ) : (
        <SectionComparisonViewer comparisons={result.sectionComparisons} />
      )}
    </div>
  )
}

/**
 * Apples-to-Apples Score Comparison
 * Shows Core (70%) + Landing Page (30%) = Overall breakdown
 */
interface ApplesToApplesComparisonProps {
  initial: CVScore
  final: CVScore
  improvement: number
}

function ApplesToApplesComparison({ initial, final, improvement }: ApplesToApplesComparisonProps) {
  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Target className="w-5 h-5 text-blue-600" />
        Apples-to-Apples Score Comparison
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Base CV Scores */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-sm font-medium text-gray-600 mb-3 uppercase tracking-wide">
            Base CV
          </h4>
          <ScoreBreakdown scores={initial} variant="base" />
        </div>

        {/* Arrow */}
        <div className="hidden md:flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <ArrowRight className="w-8 h-8 text-green-500" />
            <span className="text-sm font-medium text-green-600">
              +{improvement.toFixed(1)} points
            </span>
            <span className="text-xs text-gray-500">Best of Both Worlds</span>
          </div>
        </div>

        {/* Final CV Scores */}
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <h4 className="text-sm font-medium text-green-700 mb-3 uppercase tracking-wide">
            Final CV (Tailored)
          </h4>
          <ScoreBreakdown scores={final} variant="final" />
        </div>
      </div>

      {/* Formula explanation */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-sm text-blue-800">
          <strong>Scoring Formula:</strong> Overall = (Core Content × 70%) + (Landing Page × 30%)
        </p>
        <p className="text-xs text-blue-600 mt-1">
          Core Content measures the 10 indicators (skills, knowledge, etc.). Landing Page measures
          formatting, ATS compatibility, and visual clarity.
        </p>
      </div>
    </div>
  )
}

/**
 * Score Breakdown Component
 */
interface ScoreBreakdownProps {
  scores: CVScore
  variant: 'base' | 'final'
}

function ScoreBreakdown({ scores, variant }: ScoreBreakdownProps) {
  const isHighlight = variant === 'final'
  const bgOverall = isHighlight ? 'bg-green-100' : 'bg-gray-200'
  const textOverall = isHighlight ? 'text-green-800' : 'text-gray-800'

  return (
    <div className="space-y-3">
      {/* Overall score - large */}
      <div className={`p-3 rounded-lg ${bgOverall}`}>
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-gray-600">Overall Score</span>
          <span className={`text-2xl font-bold ${textOverall}`}>
            {scores.overall_score.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Core Content (70%) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-sm text-gray-600">Core Content (70%)</span>
        </div>
        <span className="text-sm font-semibold text-gray-900">
          {scores.core_score.toFixed(1)}
        </span>
      </div>

      {/* Landing Page (30%) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-sm text-gray-600">Landing Page (30%)</span>
        </div>
        <span className="text-sm font-semibold text-gray-900">
          {scores.landing_page_score.toFixed(1)}
        </span>
      </div>
    </div>
  )
}

/**
 * Score Analysis View
 * Shows detailed indicator breakdown and radar chart
 */
interface ScoreAnalysisViewProps {
  initial: CVScore
  final: CVScore
}

function ScoreAnalysisView({ initial, final }: ScoreAnalysisViewProps) {
  // Prepare data for radar chart
  const baseScores: Record<number, number> = {}
  const tailoredScores: Record<number, number> = {}

  initial.indicator_scores.forEach((s) => {
    baseScores[s.indicator_number] = s.score
  })

  final.indicator_scores.forEach((s) => {
    tailoredScores[s.indicator_number] = s.score
  })

  // Calculate improvements per indicator
  const indicatorImprovements = final.indicator_scores
    .map((finalScore) => {
      const baseScore = initial.indicator_scores.find(
        (s) => s.indicator_number === finalScore.indicator_number
      )
      return {
        ...finalScore,
        baseScore: baseScore?.score || 5,
        improvement: finalScore.score - (baseScore?.score || 5),
      }
    })
    .sort((a, b) => b.improvement - a.improvement)

  return (
    <div className="space-y-6">
      {/* Radar Chart */}
      <div className="p-6 bg-white border border-gray-200 rounded-lg">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">
          10-Indicator Radar Comparison
        </h4>
        <CVRadarChart baseScores={baseScores} tailoredScores={tailoredScores} />
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-400" />
            <span className="text-sm text-gray-600">Base CV</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-gray-600">Tailored CV</span>
          </div>
        </div>
      </div>

      {/* Indicator Breakdown Table */}
      <div className="p-6 bg-white border border-gray-200 rounded-lg">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">
          Indicator Score Breakdown
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 font-medium text-gray-600">Indicator</th>
                <th className="text-center py-2 px-4 font-medium text-gray-600">Base</th>
                <th className="text-center py-2 px-4 font-medium text-gray-600">Tailored</th>
                <th className="text-center py-2 px-4 font-medium text-gray-600">Change</th>
              </tr>
            </thead>
            <tbody>
              {indicatorImprovements.map((indicator) => (
                <tr key={indicator.indicator_number} className="border-b border-gray-100">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-5">
                        {indicator.indicator_number}.
                      </span>
                      <span className="font-medium text-gray-900">
                        {INDICATOR_SHORT_NAMES[indicator.indicator_number] || indicator.indicator_name}
                      </span>
                    </div>
                  </td>
                  <td className="text-center py-3 px-4">
                    <span className="text-gray-600">{indicator.baseScore.toFixed(1)}</span>
                  </td>
                  <td className="text-center py-3 px-4">
                    <span
                      className={`font-semibold ${
                        indicator.score >= 7
                          ? 'text-green-600'
                          : indicator.score >= 5
                            ? 'text-yellow-600'
                            : 'text-red-600'
                      }`}
                    >
                      {indicator.score.toFixed(1)}
                    </span>
                  </td>
                  <td className="text-center py-3 px-4">
                    {indicator.improvement > 0 ? (
                      <span className="text-green-600 font-medium">
                        +{indicator.improvement.toFixed(1)}
                      </span>
                    ) : indicator.improvement < 0 ? (
                      <span className="text-red-600 font-medium">
                        {indicator.improvement.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Landing Page Metrics */}
      {final.landing_page_metrics && (
        <div className="p-6 bg-white border border-gray-200 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            Landing Page Metrics (30% of Overall)
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <MetricCard
              label="Structure"
              score={final.landing_page_metrics.structureScore}
              weight="25%"
            />
            <MetricCard
              label="ATS Compatibility"
              score={final.landing_page_metrics.atsScore}
              weight="25%"
            />
            <MetricCard
              label="Visual Clarity"
              score={final.landing_page_metrics.visualClarityScore}
              weight="20%"
            />
            <MetricCard
              label="Content Density"
              score={final.landing_page_metrics.contentDensityScore}
              weight="15%"
            />
            <MetricCard
              label="Formatting"
              score={final.landing_page_metrics.formattingScore}
              weight="15%"
            />
          </div>

          {/* Issues and strengths */}
          {final.landing_page_metrics.details && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {final.landing_page_metrics.details.strengths.length > 0 && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                  <h5 className="text-sm font-medium text-green-800 mb-2">Strengths</h5>
                  <ul className="text-sm text-green-700 space-y-1">
                    {final.landing_page_metrics.details.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {final.landing_page_metrics.details.issues.length > 0 && (
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                  <h5 className="text-sm font-medium text-yellow-800 mb-2">Areas for Improvement</h5>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {final.landing_page_metrics.details.issues.map((issue, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Metric Card Component
 */
interface MetricCardProps {
  label: string
  score: number
  weight: string
}

function MetricCard({ label, score, weight }: MetricCardProps) {
  const color =
    score >= 7 ? 'text-green-600' : score >= 5 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{score.toFixed(1)}</p>
      <p className="text-xs text-gray-400">{weight} weight</p>
    </div>
  )
}

export default TailoringResultsDisplay
