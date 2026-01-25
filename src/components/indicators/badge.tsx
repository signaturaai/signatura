'use client'

/**
 * Indicator Badge Component
 *
 * Small badge showing a single indicator score.
 * Color-coded with tooltip for details.
 */

import { useState } from 'react'
import { IndicatorScore, getScoreColor, getScoreLabel, INDICATOR_SHORT_NAMES } from '@/lib/indicators'

interface IndicatorBadgeProps {
  score: IndicatorScore
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
  showTooltip?: boolean
  className?: string
}

export function IndicatorBadge({
  score,
  size = 'md',
  showName = false,
  showTooltip = true,
  className = '',
}: IndicatorBadgeProps) {
  const [isHovered, setIsHovered] = useState(false)
  const colors = getScoreColor(score.score)

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span
        className={`
          inline-flex items-center gap-1 rounded-full font-medium
          ${colors.bg} ${colors.text} ${colors.border} border
          ${sizeClasses[size]}
          transition-all duration-200
          ${isHovered && showTooltip ? 'shadow-md' : ''}
        `}
      >
        {showName && (
          <span className="font-normal">
            {INDICATOR_SHORT_NAMES[score.indicatorNumber]}:
          </span>
        )}
        <span className="font-bold">{score.score.toFixed(1)}</span>
      </span>

      {/* Tooltip */}
      {showTooltip && isHovered && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64">
          <div className="bg-gray-900 text-white rounded-lg shadow-lg p-3 text-sm">
            <div className="font-medium mb-1">
              {score.indicatorNumber}. {score.indicatorName}
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
                {score.score.toFixed(1)}/10
              </span>
              <span className="text-gray-300">{getScoreLabel(score.score)}</span>
            </div>
            {score.evidence && (
              <div className="text-xs text-gray-300 mb-2">
                <strong className="text-gray-100">Evidence:</strong> {score.evidence.slice(0, 100)}
                {score.evidence.length > 100 && '...'}
              </div>
            )}
            {score.suggestion && (
              <div className="text-xs text-gray-300">
                <strong className="text-gray-100">Suggestion:</strong> {score.suggestion.slice(0, 100)}
                {score.suggestion.length > 100 && '...'}
              </div>
            )}
            {/* Arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
              <div className="border-8 border-transparent border-t-gray-900" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Compact badge row showing multiple indicators
 */
interface IndicatorBadgeRowProps {
  scores: Record<number, IndicatorScore>
  maxDisplay?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function IndicatorBadgeRow({
  scores,
  maxDisplay = 5,
  size = 'sm',
  className = '',
}: IndicatorBadgeRowProps) {
  // Sort by score descending and take top N
  const sortedScores = Object.values(scores)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxDisplay)

  const remaining = Object.keys(scores).length - maxDisplay

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {sortedScores.map((score) => (
        <IndicatorBadge key={score.indicatorNumber} score={score} size={size} showName />
      ))}
      {remaining > 0 && (
        <span className="text-xs text-gray-500 ml-1">
          +{remaining} more
        </span>
      )}
    </div>
  )
}

/**
 * Mini score indicator (just the number with color)
 */
interface MiniScoreBadgeProps {
  score: number
  className?: string
}

export function MiniScoreBadge({ score, className = '' }: MiniScoreBadgeProps) {
  const colors = getScoreColor(score)

  return (
    <span
      className={`
        inline-flex items-center justify-center
        w-6 h-6 rounded-full text-xs font-bold
        ${colors.bg} ${colors.text}
        ${className}
      `}
    >
      {Math.round(score)}
    </span>
  )
}

/**
 * Overall score display with label
 */
interface OverallScoreBadgeProps {
  score: number
  label?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function OverallScoreBadge({
  score,
  label = 'Overall',
  size = 'md',
  className = '',
}: OverallScoreBadgeProps) {
  const colors = getScoreColor(score)

  const sizeClasses = {
    sm: { container: 'p-2', score: 'text-lg', label: 'text-xs' },
    md: { container: 'p-3', score: 'text-2xl', label: 'text-sm' },
    lg: { container: 'p-4', score: 'text-3xl', label: 'text-base' },
  }

  return (
    <div
      className={`
        inline-flex flex-col items-center rounded-lg
        ${colors.bg} ${colors.border} border
        ${sizeClasses[size].container}
        ${className}
      `}
    >
      <span className={`font-bold ${colors.text} ${sizeClasses[size].score}`}>
        {score.toFixed(1)}
      </span>
      <span className={`text-gray-600 ${sizeClasses[size].label}`}>
        {label}
      </span>
      <span className={`text-gray-500 ${sizeClasses[size].label}`}>
        {getScoreLabel(score)}
      </span>
    </div>
  )
}
