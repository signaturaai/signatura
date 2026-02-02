'use client'

/**
 * Indicator Breakdown List
 *
 * Shows each of the 10 PM-mapped indicators with:
 *  - Indicator name
 *  - Base vs Tailored score comparison (color-coded)
 *  - A progress bar showing tailored score with base marker
 *  - A "Siggy Insight" coaching text explaining the score
 */

export interface IndicatorItem {
  id: string
  name: string
  score: number
  baseScore: number
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

function getDeltaDisplay(score: number, base: number): { text: string; color: string } | null {
  const delta = score - base
  if (Math.abs(delta) < 0.1) return null
  return {
    text: `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`,
    color: delta > 0 ? 'text-emerald-600' : 'text-red-500',
  }
}

export function IndicatorBreakdown({
  indicators,
  className = '',
}: IndicatorBreakdownProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {indicators.map((item) => {
        const delta = getDeltaDisplay(item.score, item.baseScore)
        return (
          <div
            key={item.id}
            className="rounded-xl border border-gray-100 bg-white/80 backdrop-blur-sm p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-900">{item.name}</h4>
              <div className="flex items-center gap-2">
                {delta && (
                  <span className={`text-[11px] font-bold ${delta.color}`}>
                    {delta.text}
                  </span>
                )}
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getScoreColor(item.score)}`}
                >
                  {item.score.toFixed(1)}/{item.maxScore}
                </span>
              </div>
            </div>

            {/* Score bar with base marker */}
            <div className="relative w-full h-2 bg-gray-100 rounded-full mb-2.5 overflow-visible">
              {/* Tailored score fill */}
              <div
                className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${getBarColor(item.score)}`}
                style={{ width: `${Math.min((item.score / item.maxScore) * 100, 100)}%` }}
              />
              {/* Base score marker */}
              {item.baseScore > 0 && (
                <div
                  className="absolute top-[-2px] w-[3px] h-[12px] bg-gray-400 rounded-full transition-all duration-500"
                  style={{ left: `${Math.min((item.baseScore / item.maxScore) * 100, 100)}%` }}
                  title={`Original: ${item.baseScore.toFixed(1)}`}
                />
              )}
            </div>

            {/* Score labels */}
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                <span className="inline-block w-2 h-[3px] bg-gray-400 rounded" />
                Original: {item.baseScore.toFixed(1)}
              </span>
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                <span className={`inline-block w-2 h-[3px] rounded ${getBarColor(item.score)}`} />
                Tailored: {item.score.toFixed(1)}
              </span>
            </div>

            {/* Siggy Insight */}
            <div className="bg-gray-50/80 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-500 leading-relaxed">
                <span className="font-medium text-indigo-600">Siggy:</span>{' '}
                {item.insight}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
