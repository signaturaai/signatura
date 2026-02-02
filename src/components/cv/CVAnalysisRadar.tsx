'use client'

/**
 * CV Analysis Radar Chart
 *
 * Displays a radar chart comparing Original (Base) and Optimized (Tailored)
 * scores across the 4-stage analysis pipeline dimensions, broken into
 * 10 sub-indicators mapped from the PM Core Principles.
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

export interface RadarDataPoint {
  subject: string
  base: number
  tailored: number
  fullMark: number
}

interface CVAnalysisRadarProps {
  data: RadarDataPoint[]
  height?: number
  className?: string
}

export function CVAnalysisRadar({
  data,
  height = 380,
  className = '',
}: CVAnalysisRadarProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0]?.payload as RadarDataPoint
      if (!item) return null
      const delta = item.tailored - item.base
      return (
        <div className="bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-gray-200/60">
          <p className="font-semibold text-gray-900 text-sm mb-1">{item.subject}</p>
          <div className="space-y-0.5 text-xs">
            <p className="text-gray-500">
              Original: <span className="font-medium text-gray-700">{item.base.toFixed(1)}/10</span>
            </p>
            <p className="text-gray-500">
              Optimized: <span className="font-medium text-gray-700">{item.tailored.toFixed(1)}/10</span>
            </p>
            {delta !== 0 && (
              <p className={delta > 0 ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
                {delta > 0 ? '+' : ''}{delta.toFixed(1)} improvement
              </p>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#e5e7eb" strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 500 }}
            tickLine={false}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 10]}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickCount={6}
            axisLine={false}
          />

          {/* Original scores — dashed, muted */}
          <Radar
            name="Original"
            dataKey="base"
            stroke="#94a3b8"
            fill="rgba(148, 163, 184, 0.15)"
            strokeWidth={2}
            strokeDasharray="5 5"
          />

          {/* Optimized scores — solid, vibrant */}
          <Radar
            name="Optimized"
            dataKey="tailored"
            stroke="#6366f1"
            fill="rgba(99, 102, 241, 0.2)"
            strokeWidth={2.5}
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            wrapperStyle={{ paddingTop: '16px' }}
            formatter={(value: string) => (
              <span className="text-xs text-gray-600 font-medium">{value}</span>
            )}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
