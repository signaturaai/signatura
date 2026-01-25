'use client'

/**
 * Emotional State Display
 *
 * Shows the user's current emotional state in a warm, supportive way.
 * This is about awareness, not judgment.
 */

import { Heart, Battery, TrendingUp, TrendingDown, Minus, Flame, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EnergyLevel } from '@/types/database'

interface EmotionalStateProps {
  mood: number // 1-10
  energy: EnergyLevel
  streak: number
  burnoutWarning?: boolean
  className?: string
}

const energyLabels: Record<EnergyLevel, string> = {
  burned_out: 'Burned Out',
  exhausted: 'Exhausted',
  low: 'Low Energy',
  neutral: 'Steady',
  good: 'Good',
  energized: 'Energized',
  excited: 'Excited',
}

const energyColors: Record<EnergyLevel, string> = {
  burned_out: 'bg-error',
  exhausted: 'bg-warning',
  low: 'bg-peach',
  neutral: 'bg-lavender',
  good: 'bg-sky',
  energized: 'bg-success',
  excited: 'bg-success',
}

const moodEmojis: Record<number, string> = {
  1: 'Struggling',
  2: 'Rough day',
  3: 'Hanging in',
  4: 'Getting by',
  5: 'Okay',
  6: 'Doing alright',
  7: 'Feeling good',
  8: 'Great!',
  9: 'Excellent!',
  10: 'Amazing!',
}

export function EmotionalState({
  mood,
  energy,
  streak,
  burnoutWarning,
  className,
}: EmotionalStateProps) {
  const moodPercentage = (mood / 10) * 100
  const energyIndex = Object.keys(energyColors).indexOf(energy)
  const energyPercentage = ((energyIndex + 1) / 7) * 100

  return (
    <div className={cn('space-y-4', className)}>
      {/* Burnout Warning */}
      {burnoutWarning && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-warning/10 border border-warning/30">
          <AlertTriangle className="h-5 w-5 text-warning-foreground flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-warning-foreground">Taking care of you</p>
            <p className="text-text-secondary">
              I notice you might be pushing yourself hard. Let&apos;s pace ourselves.
            </p>
          </div>
        </div>
      )}

      {/* Mood & Energy Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Mood */}
        <div className="p-4 rounded-xl bg-rose-light/30 border border-rose-light">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="h-4 w-4 text-rose-dark" />
            <span className="text-sm font-medium text-text-primary">Mood</span>
          </div>
          <div className="mb-2">
            <span className="text-2xl font-semibold text-text-primary">{mood}/10</span>
          </div>
          <div className="energy-bar mb-2">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${moodPercentage}%`,
                background: `linear-gradient(90deg, var(--gradient-from), var(--gradient-to))`,
              }}
            />
          </div>
          <p className="text-xs text-text-secondary">{moodEmojis[mood] || 'Checking in'}</p>
        </div>

        {/* Energy */}
        <div className="p-4 rounded-xl bg-lavender-light/30 border border-lavender-light">
          <div className="flex items-center gap-2 mb-3">
            <Battery className="h-4 w-4 text-lavender-dark" />
            <span className="text-sm font-medium text-text-primary">Energy</span>
          </div>
          <div className="mb-2">
            <span className="text-2xl font-semibold text-text-primary capitalize">
              {energyLabels[energy]}
            </span>
          </div>
          <div className="energy-bar mb-2">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700 ease-out',
                energyColors[energy]
              )}
              style={{ width: `${energyPercentage}%` }}
            />
          </div>
          <p className="text-xs text-text-secondary">
            {energy === 'burned_out' || energy === 'exhausted'
              ? 'Rest is productive'
              : energy === 'energized' || energy === 'excited'
              ? 'Great momentum!'
              : 'Steady pace'}
          </p>
        </div>
      </div>

      {/* Streak */}
      {streak > 0 && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-peach-light/30 border border-peach-light">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-peach flex items-center justify-center">
              <Flame className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">
                {streak} day streak
              </p>
              <p className="text-xs text-text-secondary">
                {streak >= 7
                  ? 'Incredible commitment!'
                  : streak >= 3
                  ? 'Building momentum'
                  : 'Great start!'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(streak, 7) }).map((_, i) => (
              <div
                key={i}
                className="h-2 w-2 rounded-full bg-peach"
                style={{ opacity: 0.4 + (i / 7) * 0.6 }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface MoodTrendProps {
  recentMoods: Array<{ date: string; mood: number }>
  className?: string
}

export function MoodTrend({ recentMoods, className }: MoodTrendProps) {
  if (recentMoods.length < 2) return null

  const latestMood = recentMoods[0]?.mood || 5
  const previousMood = recentMoods[1]?.mood || 5
  const trend = latestMood - previousMood

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {trend > 0 ? (
        <>
          <TrendingUp className="h-4 w-4 text-success" />
          <span className="text-sm text-success">Mood improving</span>
        </>
      ) : trend < 0 ? (
        <>
          <TrendingDown className="h-4 w-4 text-warning" />
          <span className="text-sm text-warning">Mood dipping</span>
        </>
      ) : (
        <>
          <Minus className="h-4 w-4 text-text-tertiary" />
          <span className="text-sm text-text-tertiary">Mood stable</span>
        </>
      )}
    </div>
  )
}
