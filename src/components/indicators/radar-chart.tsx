'use client'

/**
 * Indicator Radar Chart
 *
 * Visual spider/radar chart showing all 10 indicators.
 * Color-coded by score: red (<5), yellow (5-7), green (>7)
 */

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { IndicatorScores, INDICATOR_SHORT_NAMES, getScoreLabel } from '@/lib/indicators'

interface IndicatorRadarChartProps {
  scores: IndicatorScores
  compareScores?: IndicatorScores // Optional second set for comparison
  showLabels?: boolean
  height?: number
  className?: string
}

interface ChartData {
  indicator: string
  fullName: string
  score: number
  compareScore?: number
  maxScore: number
}

export function IndicatorRadarChart({
  scores,
  compareScores,
  showLabels: _showLabels = true,
  height = 400,
  className = '',
}: IndicatorRadarChartProps) {
  // Transform scores into chart data
  const data: ChartData[] = Object.entries(INDICATOR_SHORT_NAMES).map(([numStr, shortName]) => {
    const num = parseInt(numStr)
    return {
      indicator: shortName,
      fullName: scores.scores[num]?.indicatorName || shortName,
      score: scores.scores[num]?.score || 0,
      compareScore: compareScores?.scores[num]?.score,
      maxScore: 10,
    }
  })

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as ChartData
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-medium text-gray-900">{item.fullName}</p>
          <p className="text-sm">
            Score: <span className="font-semibold">{item.score}/10</span>
            <span className="text-gray-500 ml-2">({getScoreLabel(item.score)})</span>
          </p>
          {item.compareScore !== undefined && (
            <p className="text-sm text-gray-600">
              Compare: {item.compareScore}/10
              {item.compareScore !== item.score && (
                <span className={item.score > item.compareScore ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                  ({item.score > item.compareScore ? '+' : ''}{(item.score - item.compareScore).toFixed(1)})
                </span>
              )}
            </p>
          )}
        </div>
      )
    }
    return null
  }

  // Get color based on average score
  const avgScore = scores.overall
  const primaryColor = avgScore >= 7 ? '#22c55e' : avgScore >= 5 ? '#eab308' : '#ef4444'
  const primaryFill = avgScore >= 7 ? 'rgba(34, 197, 94, 0.3)' : avgScore >= 5 ? 'rgba(234, 179, 8, 0.3)' : 'rgba(239, 68, 68, 0.3)'

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="indicator"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            tickLine={false}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 10]}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickCount={6}
            axisLine={false}
          />

          {/* Comparison scores (if provided) - shown first so main scores overlay */}
          {compareScores && (
            <Radar
              name="Before"
              dataKey="compareScore"
              stroke="#9ca3af"
              fill="rgba(156, 163, 175, 0.2)"
              strokeWidth={2}
              strokeDasharray="5 5"
            />
          )}

          {/* Main scores */}
          <Radar
            name={compareScores ? 'After' : 'Score'}
            dataKey="score"
            stroke={primaryColor}
            fill={primaryFill}
            strokeWidth={2}
          />

          <Tooltip content={<CustomTooltip />} />

          {compareScores && (
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value: string) => (
                <span className="text-sm text-gray-600">{value}</span>
              )}
            />
          )}
        </RadarChart>
      </ResponsiveContainer>

      {/* Overall score display */}
      <div className="text-center mt-2">
        <span className="text-sm text-gray-500">Overall Score: </span>
        <span
          className={`text-lg font-bold ${
            avgScore >= 7 ? 'text-green-600' : avgScore >= 5 ? 'text-yellow-600' : 'text-red-600'
          }`}
        >
          {scores.overall.toFixed(1)}/10
        </span>
        <span className="text-sm text-gray-500 ml-2">({getScoreLabel(scores.overall)})</span>
      </div>
    </div>
  )
}
