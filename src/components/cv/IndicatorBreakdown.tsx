'use client'

/**
 * Indicator Breakdown List
 *
 * Shows each of the 10 PM-mapped indicators with:
 *  - Indicator name
 *  - Score out of 10 (color-coded)
 *  - A "Siggy Insight" explaining the score
 */

export interface IndicatorItem {
  id: string
  name: string
  score: number
  maxScore: number
  insight: string
}

interface IndicatorBreakdownProps {
  indicators: IndicatorItem[]
  className?: string
}

function getScoreColor(score: number): string {
  if (score >= 8) return 'text-emerald-600 bg-emerald-50 border-emerald-200'
  if (score >= 6) return 'text-sky-600 bg-sky-50 border-sky-200'
  if (score >= 4) return 'text-amber-600 bg-amber-50 border-amber-200'
  return 'text-red-500 bg-red-50 border-red-200'
}

function getBarColor(score: number): string {
  if (score >= 8) return 'bg-emerald-500'
  if (score >= 6) return 'bg-sky-500'
  if (score >= 4) return 'bg-amber-500'
  return 'bg-red-400'
}

export function IndicatorBreakdown({
  indicators,
  className = '',
}: IndicatorBreakdownProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {indicators.map((item) => (
        <div
          key={item.id}
          className="rounded-xl border border-gray-100 bg-white/80 backdrop-blur-sm p-4 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-900">{item.name}</h4>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getScoreColor(item.score)}`}
            >
              {item.score.toFixed(1)}/{item.maxScore}
            </span>
          </div>

          {/* Score bar */}
          <div className="w-full h-1.5 bg-gray-100 rounded-full mb-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getBarColor(item.score)}`}
              style={{ width: `${(item.score / item.maxScore) * 100}%` }}
            />
          </div>

          {/* Siggy Insight */}
          <p className="text-xs text-gray-500 leading-relaxed">
            <span className="font-medium text-gray-600">Siggy&apos;s Insight:</span>{' '}
            {item.insight}
          </p>
        </div>
      ))}
    </div>
  )
}
