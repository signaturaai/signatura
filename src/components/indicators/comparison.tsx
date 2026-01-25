'use client'

/**
 * Indicator Comparison Component
 *
 * Side-by-side before/after comparison of indicator scores.
 * Visual indicators of improvement with percentage changes.
 */

import {
  ScoreComparison,
  IndicatorDelta,
  getScoreColor,
  getScoreLabel,
  INDICATOR_SHORT_NAMES,
} from '@/lib/indicators'
import { ArrowUp, ArrowDown, Minus, TrendingUp, TrendingDown, Award } from 'lucide-react'

interface IndicatorComparisonProps {
  comparison: ScoreComparison
  showDetails?: boolean
  className?: string
}

export function IndicatorComparison({
  comparison,
  showDetails = true,
  className = '',
}: IndicatorComparisonProps) {
  const { before, after, improvements, regressions, unchanged, overallChange, summary } = comparison

  // Change indicator component
  const ChangeIndicator = ({ delta }: { delta: IndicatorDelta }) => {
    const isImprovement = delta.change > 0
    const color = isImprovement ? 'text-green-600' : 'text-red-600'
    const bgColor = isImprovement ? 'bg-green-50' : 'bg-red-50'
    const Icon = isImprovement ? ArrowUp : ArrowDown

    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded ${bgColor} ${color}`}>
        <Icon className="h-3 w-3" />
        <span className="text-sm font-medium">
          {isImprovement ? '+' : ''}{delta.change.toFixed(1)}
        </span>
        <span className="text-xs">
          ({isImprovement ? '+' : ''}{delta.percentChange}%)
        </span>
      </div>
    )
  }

  // Score bar component
  const ScoreBar = ({ score, maxScore = 10 }: { score: number; maxScore?: number }) => {
    const percentage = (score / maxScore) * 100
    const _colors = getScoreColor(score)

    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${
            score >= 7 ? 'bg-green-500' : score >= 5 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Header */}
      <div className={`p-4 rounded-lg ${comparison.overallImprovement ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
        <div className="flex items-center gap-3">
          {comparison.overallImprovement ? (
            <TrendingUp className="h-6 w-6 text-green-600" />
          ) : (
            <TrendingDown className="h-6 w-6 text-amber-600" />
          )}
          <div>
            <h3 className={`font-semibold ${comparison.overallImprovement ? 'text-green-800' : 'text-amber-800'}`}>
              {comparison.overallImprovement ? 'Overall Improvement' : 'Areas Need Attention'}
            </h3>
            <p className="text-sm text-gray-600">{summary}</p>
          </div>
        </div>
      </div>

      {/* Overall Score Comparison */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 uppercase mb-1">Before</p>
          <p className="text-2xl font-bold text-gray-600">{before.overall.toFixed(1)}</p>
          <p className="text-xs text-gray-500">{getScoreLabel(before.overall)}</p>
        </div>
        <div className="text-center p-4 bg-white rounded-lg border-2 border-rose-light">
          <p className="text-xs text-gray-500 uppercase mb-1">Change</p>
          <p className={`text-2xl font-bold ${overallChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {overallChange >= 0 ? '+' : ''}{overallChange}%
          </p>
          <p className="text-xs text-gray-500">
            {improvements.length} improved, {regressions.length} declined
          </p>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 uppercase mb-1">After</p>
          <p className="text-2xl font-bold text-gray-900">{after.overall.toFixed(1)}</p>
          <p className="text-xs text-gray-500">{getScoreLabel(after.overall)}</p>
        </div>
      </div>

      {/* Improvements Section */}
      {improvements.length > 0 && (
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 font-medium text-green-700">
            <Award className="h-4 w-4" />
            Improvements ({improvements.length})
          </h4>
          <div className="space-y-2">
            {improvements.map((delta) => (
              <div key={delta.indicatorNumber} className="p-3 bg-green-50 rounded-lg border border-green-100">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      {delta.indicatorNumber}. {INDICATOR_SHORT_NAMES[delta.indicatorNumber]}
                    </span>
                    <p className="text-xs text-gray-500">{delta.indicatorName}</p>
                  </div>
                  <ChangeIndicator delta={delta} />
                </div>
                {showDetails && (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <span className="text-gray-500 w-16">{delta.beforeScore.toFixed(1)}</span>
                    <div className="flex-1">
                      <ScoreBar score={delta.beforeScore} />
                    </div>
                    <span className="text-gray-400 mx-2">→</span>
                    <div className="flex-1">
                      <ScoreBar score={delta.afterScore} />
                    </div>
                    <span className="text-gray-900 font-medium w-16 text-right">{delta.afterScore.toFixed(1)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regressions Section */}
      {regressions.length > 0 && (
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 font-medium text-red-700">
            <TrendingDown className="h-4 w-4" />
            Needs Attention ({regressions.length})
          </h4>
          <div className="space-y-2">
            {regressions.map((delta) => (
              <div key={delta.indicatorNumber} className="p-3 bg-red-50 rounded-lg border border-red-100">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      {delta.indicatorNumber}. {INDICATOR_SHORT_NAMES[delta.indicatorNumber]}
                    </span>
                    <p className="text-xs text-gray-500">{delta.indicatorName}</p>
                  </div>
                  <ChangeIndicator delta={delta} />
                </div>
                {showDetails && (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <span className="text-gray-500 w-16">{delta.beforeScore.toFixed(1)}</span>
                    <div className="flex-1">
                      <ScoreBar score={delta.beforeScore} />
                    </div>
                    <span className="text-gray-400 mx-2">→</span>
                    <div className="flex-1">
                      <ScoreBar score={delta.afterScore} />
                    </div>
                    <span className="text-gray-900 font-medium w-16 text-right">{delta.afterScore.toFixed(1)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unchanged Section */}
      {unchanged.length > 0 && (
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 font-medium text-gray-500">
            <Minus className="h-4 w-4" />
            Unchanged ({unchanged.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {unchanged.map((num) => (
              <span key={num} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                {INDICATOR_SHORT_NAMES[num]}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
