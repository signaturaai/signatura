/**
 * Companion Page
 *
 * The heart of Signatura - the daily check-in with your AI companion.
 * This is THE foundation of the application.
 */

import { createClient } from '@/lib/supabase/server'
import { CompanionChat } from '@/components/companion/chat'

export const metadata = {
  title: 'Your Companion | Signatura',
  description: 'Daily check-in with your AI career companion.',
}

export default async function CompanionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Get user profile and personalization
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, current_streak, total_checkins')
    .eq('id', user.id)
    .single()

  // Get today's emotional context if exists
  const today = new Date().toISOString().split('T')[0]
  const { data: todayContext } = await supabase
    .from('user_emotional_context')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .single()

  // Get recent conversations for context
  const { data: recentConversations } = await supabase
    .from('companion_conversations')
    .select('id, conversation_type, created_at, key_insights')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(3)

  const userName = profile?.full_name || 'Friend'
  const streak = profile?.current_streak || 0
  const totalCheckins = profile?.total_checkins || 0
  const hasCheckedInToday = !!todayContext

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header with streak */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {getGreeting()}, {userName.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground">
            {hasCheckedInToday
              ? "You've already checked in today. I'm here if you need me."
              : "How are you feeling today?"}
          </p>
        </div>
        {streak > 0 && (
          <div className="text-right">
            <p className="text-2xl font-bold text-companion">{streak}</p>
            <p className="text-xs text-muted-foreground">day streak</p>
          </div>
        )}
      </div>

      {/* Main chat interface */}
      <CompanionChat
        userId={user.id}
        userName={userName}
        hasCheckedInToday={hasCheckedInToday}
        todayContext={todayContext}
        streak={streak}
        totalCheckins={totalCheckins}
      />

      {/* Recent activity summary */}
      {recentConversations && recentConversations.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Recent conversations
          </h2>
          <div className="space-y-2">
            {recentConversations.map((conv) => (
              <div
                key={conv.id}
                className="p-3 rounded-lg bg-muted/50 text-sm"
              >
                <p className="font-medium capitalize">
                  {conv.conversation_type.replace(/_/g, ' ')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeDate(conv.created_at)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString()
}
