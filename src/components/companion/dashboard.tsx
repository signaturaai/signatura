'use client'

/**
 * Companion Dashboard
 *
 * The main client-side component for the companion experience.
 * Manages state, API calls, and orchestrates the full check-in flow.
 */

import { useState, useCallback } from 'react'
import { CompanionChat } from './chat'
import { EmotionalState } from './emotional-state'
import { GoalCard } from './goal-card'
import { Button, Card, CardContent } from '@/components/ui'
import { FeatureGate } from '@/components/subscription'
import { Heart, Sparkles, AlertTriangle, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EnergyLevel } from '@/types/database'

interface CompanionDashboardProps {
  userId: string
  userName: string
  initialData: {
    hasCheckedInToday: boolean
    todayCheckin: any | null
    streak: number
    totalCheckins: number
  }
}

interface CheckinState {
  hasCheckedIn: boolean
  mood: number
  energy: EnergyLevel
  goal: any | null
  goalAccepted: boolean
  goalCompleted: boolean
  burnoutWarning: boolean
}

export function CompanionDashboard({
  userId,
  userName,
  initialData,
}: CompanionDashboardProps) {
  const [state, setState] = useState<CheckinState>({
    hasCheckedIn: initialData.hasCheckedInToday,
    mood: initialData.todayCheckin?.mood_rating || 5,
    energy: initialData.todayCheckin?.energy_level || 'neutral',
    goal: initialData.todayCheckin?.suggested_micro_goal
      ? {
          goal: initialData.todayCheckin.suggested_micro_goal,
          type: initialData.todayCheckin.goal_type,
          difficulty: initialData.todayCheckin.goal_difficulty,
        }
      : null,
    goalAccepted: initialData.todayCheckin?.user_accepted_goal || false,
    goalCompleted: initialData.todayCheckin?.goal_completed || false,
    burnoutWarning: initialData.todayCheckin?.burnout_risk_level === 'high' || false,
  })

  const [streak, setStreak] = useState(initialData.streak)
  const [showChat, setShowChat] = useState(!initialData.hasCheckedInToday)
  const [celebrationMessage, setCelebrationMessage] = useState<string | null>(null)

  // Handle goal acceptance
  const handleGoalAccept = useCallback(async () => {
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      })

      if (!response.ok) throw new Error('Failed to accept goal')

      setState(prev => ({ ...prev, goalAccepted: true }))
    } catch (error) {
      console.error('Failed to accept goal:', error)
      throw error
    }
  }, [])

  // Handle requesting a new goal
  const handleRequestNewGoal = useCallback(async () => {
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_new' }),
      })

      if (!response.ok) throw new Error('Failed to request new goal')

      const data = await response.json()
      setState(prev => ({
        ...prev,
        goal: data.goal,
        goalAccepted: false,
        goalCompleted: false,
      }))
    } catch (error) {
      console.error('Failed to request new goal:', error)
      throw error
    }
  }, [])

  // Handle goal completion
  const handleGoalComplete = useCallback(async (reflection?: string) => {
    try {
      const response = await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reflection }),
      })

      if (!response.ok) throw new Error('Failed to complete goal')

      const data = await response.json()
      setState(prev => ({ ...prev, goalCompleted: true }))
      setCelebrationMessage(data.celebration)

      // Clear celebration after 5 seconds
      setTimeout(() => setCelebrationMessage(null), 5000)
    } catch (error) {
      console.error('Failed to complete goal:', error)
      throw error
    }
  }, [])

  // Update state when check-in is completed through chat
  const _handleCheckinComplete = useCallback((checkinData: any) => {
    setState(prev => ({
      ...prev,
      hasCheckedIn: true,
      mood: checkinData.detectedMood || prev.mood,
      energy: checkinData.detectedEnergy || prev.energy,
      goal: checkinData.suggestedGoal || prev.goal,
      burnoutWarning: checkinData.burnoutWarning || false,
    }))

    // Update streak
    if (!initialData.hasCheckedInToday) {
      setStreak(prev => prev + 1)
    }
  }, [initialData.hasCheckedInToday])

  return (
    <div className="space-y-6">
      {/* Celebration Banner */}
      {celebrationMessage && (
        <div className="animate-fade-up p-4 rounded-xl bg-success/10 border border-success/30">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-success flex-shrink-0" />
            <p className="text-success-foreground">{celebrationMessage}</p>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Emotional State & Goal */}
        <div className="lg:col-span-1 space-y-6">
          {/* Emotional State */}
          {state.hasCheckedIn && (
            <EmotionalState
              mood={state.mood}
              energy={state.energy}
              streak={streak}
              burnoutWarning={state.burnoutWarning}
            />
          )}

          {/* Today's Goal */}
          {state.goal && state.hasCheckedIn && (
            <GoalCard
              goal={state.goal}
              isAccepted={state.goalAccepted}
              isCompleted={state.goalCompleted}
              onAccept={handleGoalAccept}
              onRequestNew={handleRequestNewGoal}
              onComplete={handleGoalComplete}
            />
          )}

          {/* Quick Actions */}
          <Card className="bg-white border-rose-light/30">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium text-text-primary">Quick Actions</p>
              <div className="grid grid-cols-2 gap-2">
                <QuickActionButton
                  icon={<Heart className="h-4 w-4" />}
                  label="Log a win"
                  onClick={() => {/* TODO: Open celebration modal */}}
                  color="rose"
                />
                <QuickActionButton
                  icon={<AlertTriangle className="h-4 w-4" />}
                  label="Need support"
                  onClick={() => {/* TODO: Open support modal */}}
                  color="lavender"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Chat */}
        <div className="lg:col-span-2">
          {/* Toggle Chat Button (Mobile) */}
          <div className="lg:hidden mb-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowChat(!showChat)}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {showChat ? 'Hide Chat' : 'Open Chat'}
            </Button>
          </div>

          {/* Chat Interface - Gated by aiAvatarInterviews feature */}
          <div className={cn(
            'transition-all duration-300',
            showChat ? 'block' : 'hidden lg:block'
          )}>
            <FeatureGate feature="aiAvatarInterviews">
              <CompanionChat
                userId={userId}
                userName={userName}
                hasCheckedInToday={state.hasCheckedIn}
                todayContext={initialData.todayCheckin}
                streak={streak}
                totalCheckins={initialData.totalCheckins}
              />
            </FeatureGate>
          </div>
        </div>
      </div>
    </div>
  )
}

interface QuickActionButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  color: 'rose' | 'lavender' | 'peach' | 'sky'
}

function QuickActionButton({ icon, label, onClick, color }: QuickActionButtonProps) {
  const colorClasses = {
    rose: 'bg-rose-light hover:bg-rose/30 text-rose-dark',
    lavender: 'bg-lavender-light hover:bg-lavender/30 text-lavender-dark',
    peach: 'bg-peach-light hover:bg-peach/30 text-peach-dark',
    sky: 'bg-sky-light hover:bg-sky/30 text-sky-dark',
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 p-3 rounded-lg text-sm font-medium transition-colors',
        colorClasses[color]
      )}
    >
      {icon}
      {label}
    </button>
  )
}
