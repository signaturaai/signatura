'use client'

/**
 * Goal Card Component
 *
 * Displays the daily micro-goal with options to accept,
 * request a new one, or mark as complete.
 */

import { useState } from 'react'
import { Button, Card, CardContent, Textarea } from '@/components/ui'
import { Target, Check, RefreshCw, Clock, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GoalType, GoalDifficulty } from '@/types/database'

interface GoalCardProps {
  goal: {
    goal: string
    type?: GoalType | null
    difficulty?: GoalDifficulty | null
    reasoning?: string
    timeEstimate?: string
    encouragement?: string
  }
  isAccepted: boolean
  isCompleted: boolean
  onAccept: () => Promise<void>
  onRequestNew: () => Promise<void>
  onComplete: (reflection?: string) => Promise<void>
  className?: string
}

const difficultyColors: Record<string, string> = {
  tiny: 'bg-sky-light text-sky-dark',
  small: 'bg-lavender-light text-lavender-dark',
  medium: 'bg-peach-light text-peach-dark',
}

const typeIcons: Record<string, string> = {
  application: 'Send an application',
  rest: 'Take a break',
  preparation: 'Prepare for something',
  reflection: 'Reflect on your journey',
  celebration: 'Celebrate a win',
}

export function GoalCard({
  goal,
  isAccepted,
  isCompleted,
  onAccept,
  onRequestNew,
  onComplete,
  className,
}: GoalCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showReflection, setShowReflection] = useState(false)
  const [reflection, setReflection] = useState('')

  const handleAccept = async () => {
    setIsLoading(true)
    try {
      await onAccept()
    } finally {
      setIsLoading(false)
    }
  }

  const handleRequestNew = async () => {
    setIsLoading(true)
    try {
      await onRequestNew()
    } finally {
      setIsLoading(false)
    }
  }

  const handleComplete = async () => {
    if (showReflection) {
      setIsLoading(true)
      try {
        await onComplete(reflection)
      } finally {
        setIsLoading(false)
        setShowReflection(false)
      }
    } else {
      setShowReflection(true)
    }
  }

  if (isCompleted) {
    return (
      <Card className={cn('bg-success/10 border-success/30', className)}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-success flex items-center justify-center flex-shrink-0">
              <Check className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-success-foreground mb-1">Goal Completed!</p>
              <p className="text-sm text-text-secondary line-through">{goal.goal}</p>
              <p className="text-sm text-success-foreground mt-2">
                Well done! Every step counts.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(
      'border-lavender-light/50 transition-all duration-300',
      isAccepted ? 'bg-lavender-light/20' : 'bg-white',
      className
    )}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="h-12 w-12 rounded-xl bg-lavender-light flex items-center justify-center flex-shrink-0">
            <Target className="h-6 w-6 text-lavender-dark" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium text-text-primary">Today&apos;s Micro-Goal</p>
              {goal.difficulty && (
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full',
                  difficultyColors[goal.difficulty] || difficultyColors.small
                )}>
                  {goal.difficulty}
                </span>
              )}
            </div>
            {goal.type && (
              <p className="text-xs text-text-tertiary">
                {typeIcons[goal.type] || goal.type}
              </p>
            )}
          </div>
          {goal.timeEstimate && (
            <div className="flex items-center gap-1 text-xs text-text-tertiary">
              <Clock className="h-3 w-3" />
              {goal.timeEstimate}
            </div>
          )}
        </div>

        {/* Goal Content */}
        <div className="mb-4">
          <p className="text-text-primary leading-relaxed">{goal.goal}</p>
          {goal.reasoning && (
            <p className="text-sm text-text-secondary mt-2 italic">
              {goal.reasoning}
            </p>
          )}
        </div>

        {/* Encouragement */}
        {goal.encouragement && isAccepted && (
          <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-rose-light/30">
            <Sparkles className="h-4 w-4 text-rose-dark flex-shrink-0 mt-0.5" />
            <p className="text-sm text-text-secondary">{goal.encouragement}</p>
          </div>
        )}

        {/* Reflection Input */}
        {showReflection && (
          <div className="mb-4">
            <Textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="How did it go? (optional)"
              className="min-h-[80px] resize-none rounded-xl border-lavender-light focus:border-lavender"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {!isAccepted ? (
            <>
              <Button
                onClick={handleAccept}
                disabled={isLoading}
                className="flex-1 bg-lavender hover:bg-lavender-dark text-white"
              >
                {isLoading ? 'Accepting...' : "I'll do it"}
              </Button>
              <Button
                variant="outline"
                onClick={handleRequestNew}
                disabled={isLoading}
                className="border-lavender-light hover:bg-lavender-light/30"
              >
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
            </>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={isLoading}
              className="flex-1 bg-success hover:bg-success/90 text-white"
            >
              {isLoading ? 'Saving...' : showReflection ? 'Save & Complete' : 'Mark Complete'}
              <Check className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
