/**
 * NarrativeCompassChart — Radar visualization of narrative alignment
 *
 * Shows the 4 narrative dimensions comparing current vs target scores:
 * - Action Verb Strength
 * - Achievement Keywords
 * - Quantified Results
 * - Brand-Aligned Language
 *
 * This is the visual anchor for the candidate dashboard.
 */
'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'

// The 4 narrative dimensions
const DIMENSIONS = [
  { key: 'verbs', label: 'Action Verbs', color: '#E8A77D' },      // peach
  { key: 'achievements', label: 'Achievements', color: '#E8B5CD' }, // rose
  { key: 'quantified', label: 'Quantified Results', color: '#B8A5D8' }, // lavender
  { key: 'brand', label: 'Brand Language', color: '#8CC5DE' },    // sky
] as const

type DimensionKey = typeof DIMENSIONS[number]['key']

export interface NarrativeScores {
  verbs: number
  achievements: number
  quantified: number
  brand: number
}

interface NarrativeCompassChartProps {
  currentScores: NarrativeScores
  targetScores: NarrativeScores
  size?: number
  showLabels?: boolean
  showLegend?: boolean
  className?: string
}

export function NarrativeCompassChart({
  currentScores,
  targetScores,
  size = 280,
  showLabels = true,
  showLegend = true,
  className = '',
}: NarrativeCompassChartProps) {
  const numDimensions = DIMENSIONS.length
  const angleStep = (2 * Math.PI) / numDimensions
  const maxScore = 100
  const centerX = size / 2
  const centerY = size / 2
  const maxRadius = (size / 2) - (showLabels ? 50 : 20)

  // Calculate polygon points
  const calculatePoints = useMemo(() => {
    return (scores: NarrativeScores) => {
      return DIMENSIONS.map((dim, i) => {
        const score = scores[dim.key as DimensionKey] || 0
        const angle = i * angleStep - Math.PI / 2 // Start from top
        const radius = (score / maxScore) * maxRadius
        const x = centerX + radius * Math.cos(angle)
        const y = centerY + radius * Math.sin(angle)
        return { x, y, score, key: dim.key }
      })
    }
  }, [maxRadius, centerX, centerY, angleStep])

  const currentPoints = calculatePoints(currentScores)
  const targetPoints = calculatePoints(targetScores)

  const pointsToPath = (points: { x: number; y: number }[]) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'

  // Grid circles at 25%, 50%, 75%, 100%
  const gridCircles = [25, 50, 75, 100].map(pct => ({
    pct,
    radius: (pct / maxScore) * maxRadius,
  }))

  // Axis lines
  const axisLines = DIMENSIONS.map((_, i) => {
    const angle = i * angleStep - Math.PI / 2
    return {
      x1: centerX,
      y1: centerY,
      x2: centerX + maxRadius * Math.cos(angle),
      y2: centerY + maxRadius * Math.sin(angle),
    }
  })

  // Label positions
  const labelPositions = DIMENSIONS.map((dim, i) => {
    const angle = i * angleStep - Math.PI / 2
    const labelRadius = maxRadius + 25
    return {
      x: centerX + labelRadius * Math.cos(angle),
      y: centerY + labelRadius * Math.sin(angle),
      label: dim.label,
      color: dim.color,
      angle,
    }
  })

  // Calculate overall alignment percentage
  const overallCurrent = Math.round(
    (currentScores.verbs + currentScores.achievements + currentScores.quantified + currentScores.brand) / 4
  )
  const overallTarget = Math.round(
    (targetScores.verbs + targetScores.achievements + targetScores.quantified + targetScores.brand) / 4
  )

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
      >
        {/* Grid circles */}
        {gridCircles.map(({ pct, radius }) => (
          <circle
            key={pct}
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="1"
            strokeDasharray={pct === 100 ? undefined : '4 4'}
            opacity={0.6}
          />
        ))}

        {/* Axis lines */}
        {axisLines.map((line, i) => (
          <line
            key={i}
            {...line}
            stroke="#D1D5DB"
            strokeWidth="1"
            opacity={0.5}
          />
        ))}

        {/* Target polygon (dashed outline) */}
        <motion.path
          d={pointsToPath(targetPoints)}
          fill="none"
          stroke="#B8A5D8"
          strokeWidth="2"
          strokeDasharray="6 4"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.8 }}
          transition={{ duration: 1, delay: 0.3 }}
        />

        {/* Current polygon (filled) */}
        <motion.path
          d={pointsToPath(currentPoints)}
          fill="url(#narrativeGradient)"
          stroke="#E8A77D"
          strokeWidth="2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.8 }}
        />

        {/* Gradient definition */}
        <defs>
          <linearGradient id="narrativeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F4C5A5" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#F5D5E0" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#D5C5E8" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* Current score dots */}
        {currentPoints.map((point, i) => (
          <motion.circle
            key={`current-${i}`}
            cx={point.x}
            cy={point.y}
            r="5"
            fill={DIMENSIONS[i].color}
            stroke="white"
            strokeWidth="2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 + i * 0.1 }}
          />
        ))}

        {/* Labels */}
        {showLabels && labelPositions.map((pos, i) => {
          const isTop = Math.abs(pos.angle + Math.PI / 2) < 0.1
          const isBottom = Math.abs(pos.angle - Math.PI / 2) < 0.1
          const textAnchor = pos.x < centerX - 10 ? 'end' : pos.x > centerX + 10 ? 'start' : 'middle'
          const dy = isTop ? '-0.5em' : isBottom ? '1em' : '0.35em'
          return (
            <text
              key={i}
              x={pos.x}
              y={pos.y}
              textAnchor={textAnchor}
              dy={dy}
              className="text-[10px] font-medium fill-gray-600"
            >
              {pos.label}
            </text>
          )
        })}

        {/* Center score */}
        <text
          x={centerX}
          y={centerY - 8}
          textAnchor="middle"
          className="text-2xl font-bold fill-gray-800"
        >
          {overallCurrent}%
        </text>
        <text
          x={centerX}
          y={centerY + 12}
          textAnchor="middle"
          className="text-[10px] font-medium fill-gray-400"
        >
          ALIGNMENT
        </text>
      </svg>

      {/* Legend */}
      {showLegend && (
        <div className="flex items-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-peach-light to-lavender-light border border-peach" />
            <span className="text-gray-600">Current</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-lavender border-dashed" style={{ borderStyle: 'dashed' }} />
            <span className="text-gray-600">Target ({overallTarget}%)</span>
          </div>
        </div>
      )}
    </div>
  )
}

/** Mini compass for compact display (e.g., in cards) */
export function MiniNarrativeCompass({
  currentScores,
  targetScores,
  size = 80,
}: {
  currentScores: NarrativeScores
  targetScores: NarrativeScores
  size?: number
}) {
  return (
    <NarrativeCompassChart
      currentScores={currentScores}
      targetScores={targetScores}
      size={size}
      showLabels={false}
      showLegend={false}
    />
  )
}
