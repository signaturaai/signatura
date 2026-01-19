/**
 * Companion Page
 *
 * The heart of Signatura - the daily check-in with your AI companion.
 * This is THE foundation of the application.
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CompanionDashboard } from '@/components/companion/dashboard'
import { Heart } from 'lucide-react'

export const metadata = {
  title: 'Your Companion | Signatura',
  description: 'Daily check-in with your AI career companion.',
}

export default async function CompanionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile and personalization
  // Using any type here since the database tables may not exist yet
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, current_streak, total_checkins, longest_streak')
    .eq('id', user.id)
    .single() as { data: { full_name: string | null; current_streak: number; total_checkins: number; longest_streak: number } | null }

  // Get today's emotional context if exists
  const today = new Date().toISOString().split('T')[0]
  const { data: todayContext } = await supabase
    .from('user_emotional_context')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .maybeSingle() as { data: any }

  const userName = (profile?.full_name as string) || 'Friend'
  const streak = (profile?.current_streak as number) || 0
  const longestStreak = (profile?.longest_streak as number) || 0
  const totalCheckins = (profile?.total_checkins as number) || 0
  const hasCheckedInToday = !!todayContext

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-brand-gradient flex items-center justify-center shadow-soft">
            <Heart className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {getGreeting()}, {userName.split(' ')[0]}
            </h1>
            <p className="text-text-secondary">
              {hasCheckedInToday
                ? "You've checked in today. I'm here whenever you need me."
                : "Ready for your daily check-in?"}
            </p>
          </div>
        </div>

        {/* Streak Display */}
        {streak > 0 && (
          <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-xl bg-peach-light/50 border border-peach-light">
            <div className="text-center">
              <p className="text-2xl font-bold text-peach-dark">{streak}</p>
              <p className="text-xs text-text-secondary">day streak</p>
            </div>
            {longestStreak > streak && (
              <div className="text-center border-l border-peach pl-3">
                <p className="text-lg font-semibold text-text-tertiary">{longestStreak}</p>
                <p className="text-xs text-text-tertiary">best</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Welcome Message for First-Time Users */}
      {totalCheckins === 0 && !hasCheckedInToday && (
        <div className="p-6 rounded-xl bg-rose-light/30 border border-rose-light">
          <h2 className="text-lg font-semibold text-text-primary mb-2">
            Welcome to Signatura
          </h2>
          <p className="text-text-secondary mb-4">
            I&apos;m your companion on this journey. Job searching can feel lonely,
            but you don&apos;t have to do it alone. Let&apos;s start with a simple check-in—
            tell me how you&apos;re feeling today.
          </p>
          <div className="flex flex-wrap gap-2">
            <MoodHint emoji="Struggling" />
            <MoodHint emoji="Anxious" />
            <MoodHint emoji="Hopeful" />
            <MoodHint emoji="Motivated" />
            <MoodHint emoji="Exhausted" />
          </div>
        </div>
      )}

      {/* Main Dashboard */}
      <CompanionDashboard
        userId={user.id}
        userName={userName}
        initialData={{
          hasCheckedInToday,
          todayCheckin: todayContext,
          streak,
          totalCheckins,
        }}
      />
    </div>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function MoodHint({ emoji }: { emoji: string }) {
  return (
    <span className="px-3 py-1 rounded-full bg-white/50 text-sm text-text-secondary">
      {emoji}
    </span>
  )
}
