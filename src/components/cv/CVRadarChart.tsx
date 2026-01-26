'use client'

/**
 * CV Radar Chart Component
 *
 * Dual-polygon radar chart showing Base vs Tailored CV scores
 * across all 10 indicators for visual comparison.
 */

import { INDICATOR_SHORT_NAMES } from '@/lib/indicators'
import { useMemo } from 'react'

// Static indicator list (1-10)
const INDICATORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const
const NUM_INDICATORS = INDICATORS.length

interface CVRadarChartProps {
  baseScores: Record<number, number>
  tailoredScores: Record<number, number>
  size?: number
  className?: string
}

export function CVRadarChart({
  baseScores,
  tailoredScores,
  size = 400,
  className = '',
}: CVRadarChartProps) {
  const numIndicators = NUM_INDICATORS
  const angleStep = (2 * Math.PI) / numIndicators
  const maxScore = 10
  const centerX = size / 2
  const centerY = size / 2
  const maxRadius = (size / 2) - 60 // Leave room for labels

  // Calculate points for a polygon given scores
  const calculatePolygonPoints = useMemo(() => {
    return (scores: Record<number, number>) => {
      return INDICATORS.map((indicator, i) => {
        const score = scores[indicator] || 5
        const angle = i * angleStep - Math.PI / 2 // Start from top
        const radius = (score / maxScore) * maxRadius
        const x = centerX + radius * Math.cos(angle)
        const y = centerY + radius * Math.sin(angle)
        return { x, y, score, indicator }
      })
    }
  }, [maxRadius, centerX, centerY, angleStep])

  const basePoints = calculatePolygonPoints(baseScores)
  const tailoredPoints = calculatePolygonPoints(tailoredScores)

  // Convert points to SVG path
  const pointsToPath = (points: { x: number; y: number }[]) => {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
  }

  // Generate concentric circles for grid
  const gridCircles = [2, 4, 6, 8, 10].map((score) => ({
    score,
    radius: (score / maxScore) * maxRadius,
  }))

  // Generate axis lines
  const axisLines = INDICATORS.map((_, i) => {
    const angle = i * angleStep - Math.PI / 2
    return {
      x1: centerX,
      y1: centerY,
      x2: centerX + maxRadius * Math.cos(angle),
      y2: centerY + maxRadius * Math.sin(angle),
    }
  })

  // Generate label positions
  const labelPositions = INDICATORS.map((indicator, i) => {
    const angle = i * angleStep - Math.PI / 2
    const labelRadius = maxRadius + 30
    return {
      indicator,
      x: centerX + labelRadius * Math.cos(angle),
      y: centerY + labelRadius * Math.sin(angle),
      name: INDICATOR_SHORT_NAMES[indicator] || `Ind ${indicator}`,
    }
  })

  return (
    <div className={`flex justify-center ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background grid circles */}
        {gridCircles.map((circle) => (
          <circle
            key={circle.score}
            cx={centerX}
            cy={centerY}
            r={circle.radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        ))}

        {/* Axis lines */}
        {axisLines.map((line, i) => (
          <line
            key={i}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        ))}

        {/* Grid score labels (only show 5 and 10) */}
        {[5, 10].map((score) => {
          const radius = (score / maxScore) * maxRadius
          return (
            <text
              key={score}
              x={centerX + 5}
              y={centerY - radius - 2}
              fontSize="10"
              fill="#9ca3af"
              textAnchor="start"
            >
              {score}
            </text>
          )
        })}

        {/* Base CV polygon (gray, behind) */}
        <path
          d={pointsToPath(basePoints)}
          fill="rgba(156, 163, 175, 0.2)"
          stroke="#9ca3af"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Tailored CV polygon (green, in front) */}
        <path
          d={pointsToPath(tailoredPoints)}
          fill="rgba(34, 197, 94, 0.2)"
          stroke="#22c55e"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Base CV points */}
        {basePoints.map((point, i) => (
          <circle
            key={`base-${i}`}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="#9ca3af"
            stroke="white"
            strokeWidth="1"
          />
        ))}

        {/* Tailored CV points */}
        {tailoredPoints.map((point, i) => (
          <circle
            key={`tailored-${i}`}
            cx={point.x}
            cy={point.y}
            r="5"
            fill="#22c55e"
            stroke="white"
            strokeWidth="2"
          />
        ))}

        {/* Indicator labels */}
        {labelPositions.map((label) => {
          // Adjust text anchor based on position
          let textAnchor: 'start' | 'middle' | 'end' = 'middle'
          if (label.x < centerX - 10) textAnchor = 'end'
          else if (label.x > centerX + 10) textAnchor = 'start'

          // Adjust vertical alignment
          let dy = '0.35em'
          if (label.y < centerY - maxRadius / 2) dy = '1em'
          else if (label.y > centerY + maxRadius / 2) dy = '-0.3em'

          return (
            <text
              key={label.indicator}
              x={label.x}
              y={label.y}
              textAnchor={textAnchor}
              dy={dy}
              fontSize="11"
              fontWeight="500"
              fill="#4b5563"
            >
              {label.name}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

/**
 * Mini Radar Chart for compact displays
 */
interface MiniRadarChartProps {
  scores: Record<number, number>
  size?: number
  color?: string
  className?: string
}

export function MiniRadarChart({
  scores,
  size = 100,
  color = '#22c55e',
  className = '',
}: MiniRadarChartProps) {
  const numIndicators = NUM_INDICATORS
  const angleStep = (2 * Math.PI) / numIndicators
  const maxScore = 10
  const centerX = size / 2
  const centerY = size / 2
  const maxRadius = (size / 2) - 5

  const points = INDICATORS.map((indicator, i) => {
    const score = scores[indicator] || 5
    const angle = i * angleStep - Math.PI / 2
    const radius = (score / maxScore) * maxRadius
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className}>
      {/* Grid circle */}
      <circle
        cx={centerX}
        cy={centerY}
        r={maxRadius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="1"
      />
      <circle
        cx={centerX}
        cy={centerY}
        r={maxRadius / 2}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="1"
      />

      {/* Polygon */}
      <path
        d={pathD}
        fill={`${color}33`}
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default CVRadarChart
