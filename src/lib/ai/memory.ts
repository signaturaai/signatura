/**
 * Companion Memory System
 *
 * Stores and retrieves conversation memory for personalized interactions.
 * This is what makes the companion "remember" past conversations.
 */

import { createClient } from '@/lib/supabase/server'
import type {
  CompanionMessage,
  KeyInsight,
  CompanionCommitment,
  ConversationType,
} from '@/types'

/**
 * Store a conversation in memory
 */
export async function storeConversation(params: {
  userId: string
  type: ConversationType
  messages: CompanionMessage[]
  startingMood?: number
  endingMood?: number
  keyInsights?: KeyInsight[]
  commitmentsMade?: CompanionCommitment[]
  topicsDiscussed?: string[]
}): Promise<string | null> {
  const supabase = await createClient()

  // Type assertion for unloaded schema
  const { data, error } = await (supabase
    .from('companion_conversations') as any)
    .insert({
      user_id: params.userId,
      conversation_type: params.type,
      messages: params.messages,
      message_count: params.messages.length,
      duration_minutes: calculateDuration(params.messages),
      starting_mood: params.startingMood,
      ending_mood: params.endingMood,
      mood_shift: params.endingMood && params.startingMood
        ? params.endingMood - params.startingMood
        : null,
      key_insights: params.keyInsights || [],
      commitments_made: params.commitmentsMade || [],
      topics_discussed: params.topicsDiscussed || [],
      user_engagement_score: calculateEngagementScore(params.messages),
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error storing conversation:', error)
    return null
  }

  return data?.id || null
}

/**
 * Add a message to an existing conversation
 */
export async function addMessageToConversation(
  conversationId: string,
  message: CompanionMessage
): Promise<boolean> {
  const supabase = await createClient()

  // First get current messages
  const { data: current, error: fetchError } = await supabase
    .from('companion_conversations')
    .select('messages')
    .eq('id', conversationId)
    .single() as { data: { messages: any[] } | null; error: any }

  if (fetchError || !current) {
    console.error('Error fetching conversation:', fetchError)
    return false
  }

  const messages = [...(current.messages || []), message]

  const { error: updateError } = await (supabase
    .from('companion_conversations') as any)
    .update({
      messages: messages,
      message_count: messages.length,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)

  if (updateError) {
    console.error('Error updating conversation:', updateError)
    return false
  }

  return true
}

/**
 * Store daily emotional context
 */
export async function storeDailyContext(params: {
  userId: string
  moodRating: number
  energyLevel: string
  userMessage: string
  aiResponse: string
  suggestedGoal?: string
  goalType?: string
  goalDifficulty?: string
  emotionalKeywords?: string[]
  responseTone?: string
  burnoutRiskScore?: number
  celebrationMoments?: any[]
  strugglesMentioned?: any[]
}): Promise<string | null> {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]

  // Check if we already have an entry for today
  const { data: existing } = await supabase
    .from('user_emotional_context')
    .select('id')
    .eq('user_id', params.userId)
    .eq('date', today)
    .single() as { data: { id: string } | null }

  if (existing) {
    // Update existing entry
    const { error } = await (supabase
      .from('user_emotional_context') as any)
      .update({
        mood_rating: params.moodRating,
        energy_level: params.energyLevel,
        user_message: params.userMessage,
        ai_validation_response: params.aiResponse,
        suggested_micro_goal: params.suggestedGoal,
        goal_type: params.goalType,
        goal_difficulty: params.goalDifficulty,
        emotional_keywords: params.emotionalKeywords,
        response_tone: params.responseTone,
        burnout_risk_score: params.burnoutRiskScore,
        celebration_moments: params.celebrationMoments,
        struggles_mentioned: params.strugglesMentioned,
      })
      .eq('id', existing.id)

    if (error) {
      console.error('Error updating daily context:', error)
      return null
    }

    return existing.id
  }

  // Create new entry
  const { data, error } = await (supabase
    .from('user_emotional_context') as any)
    .insert({
      user_id: params.userId,
      date: today,
      time_of_checkin: new Date().toTimeString().split(' ')[0],
      greeting_type: getGreetingType(),
      mood_rating: params.moodRating,
      energy_level: params.energyLevel,
      user_message: params.userMessage,
      ai_validation_response: params.aiResponse,
      suggested_micro_goal: params.suggestedGoal,
      goal_type: params.goalType,
      goal_difficulty: params.goalDifficulty,
      emotional_keywords: params.emotionalKeywords,
      response_tone: params.responseTone,
      burnout_risk_score: params.burnoutRiskScore,
      celebration_moments: params.celebrationMoments || [],
      struggles_mentioned: params.strugglesMentioned || [],
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error storing daily context:', error)
    return null
  }

  // Update user profile streak
  await updateUserStreak(params.userId)

  return data?.id || null
}

/**
 * Mark a goal as completed
 */
export async function markGoalCompleted(
  userId: string,
  reflection?: string
): Promise<boolean> {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]

  const { error } = await (supabase
    .from('user_emotional_context') as any)
    .update({
      goal_completed: true,
      completion_time: new Date().toISOString(),
      completion_reflection: reflection,
    })
    .eq('user_id', userId)
    .eq('date', today)

  if (error) {
    console.error('Error marking goal completed:', error)
    return false
  }

  return true
}

/**
 * Store a key insight from conversation
 */
export async function storeKeyInsight(
  conversationId: string,
  insight: KeyInsight
): Promise<boolean> {
  const supabase = await createClient()

  // Get current insights
  const { data: current, error: fetchError } = await supabase
    .from('companion_conversations')
    .select('key_insights')
    .eq('id', conversationId)
    .single() as { data: { key_insights: any[] } | null; error: any }

  if (fetchError || !current) {
    console.error('Error fetching conversation:', fetchError)
    return false
  }

  const insights = [...(current.key_insights || []), insight]

  const { error: updateError } = await (supabase
    .from('companion_conversations') as any)
    .update({
      key_insights: insights,
    })
    .eq('id', conversationId)

  if (updateError) {
    console.error('Error storing insight:', updateError)
    return false
  }

  return true
}

/**
 * Fulfill a commitment
 */
export async function fulfillCommitment(
  conversationId: string,
  commitmentPromise: string
): Promise<boolean> {
  const supabase = await createClient()

  // Get current commitments
  const { data: current, error: fetchError } = await supabase
    .from('companion_conversations')
    .select('commitments_made')
    .eq('id', conversationId)
    .single() as { data: { commitments_made: any[] } | null; error: any }

  if (fetchError || !current) {
    console.error('Error fetching conversation:', fetchError)
    return false
  }

  const commitments = (current.commitments_made || []).map((c: any) => {
    if (c.promise === commitmentPromise) {
      return { ...c, fulfilled: true }
    }
    return c
  })

  const { error: updateError } = await (supabase
    .from('companion_conversations') as any)
    .update({
      commitments_made: commitments,
    })
    .eq('id', conversationId)

  if (updateError) {
    console.error('Error fulfilling commitment:', updateError)
    return false
  }

  return true
}

/**
 * Get unfulfilled commitments for a user
 */
export async function getUnfulfilledCommitments(
  userId: string
): Promise<CompanionCommitment[]> {
  const supabase = await createClient()

  const { data: conversations, error } = await supabase
    .from('companion_conversations')
    .select('commitments_made')
    .eq('user_id', userId)
    .not('commitments_made', 'eq', '[]')
    .order('created_at', { ascending: false })
    .limit(10) as { data: any[] | null; error: any }

  if (error || !conversations) {
    console.error('Error fetching commitments:', error)
    return []
  }

  const unfulfilled: CompanionCommitment[] = []

  for (const conv of conversations) {
    const commitments = (conv.commitments_made as any[]) || []
    unfulfilled.push(
      ...commitments.filter((c: any) => !c.fulfilled)
    )
  }

  return unfulfilled
}

/**
 * Search conversation memory by topic
 */
export async function searchMemory(
  userId: string,
  query: string,
  limit: number = 5
): Promise<Array<{
  conversationId: string
  type: ConversationType
  date: string
  relevantInsights: KeyInsight[]
  relevantQuotes: string[]
}>> {
  const supabase = await createClient()

  // For now, use simple text search
  // TODO: Implement vector search for semantic similarity
  const { data: conversations, error } = await supabase
    .from('companion_conversations')
    .select('id, conversation_type, created_at, key_insights, messages')
    .eq('user_id', userId)
    .textSearch('topics_discussed', query, { type: 'plain' })
    .limit(limit) as { data: any[] | null; error: any }

  if (error || !conversations) {
    console.error('Error searching memory:', error)
    return []
  }

  return conversations.map((conv: any) => {
    const insights = (conv.key_insights as KeyInsight[]) || []
    const messages = (conv.messages as any[]) || []
    const relevantQuotes = messages
      .filter((m: any) => m.role === 'user' && m.content.toLowerCase().includes(query.toLowerCase()))
      .map((m: any) => m.content)
      .slice(0, 2)

    return {
      conversationId: conv.id,
      type: conv.conversation_type as ConversationType,
      date: conv.created_at,
      relevantInsights: insights.filter((i: any) =>
        i.description.toLowerCase().includes(query.toLowerCase()) ||
        (i.quote && i.quote.toLowerCase().includes(query.toLowerCase()))
      ),
      relevantQuotes,
    }
  })
}

// Helper functions

function calculateDuration(messages: CompanionMessage[]): number {
  if (messages.length < 2) return 0

  const first = new Date(messages[0].timestamp)
  const last = new Date(messages[messages.length - 1].timestamp)
  const diff = last.getTime() - first.getTime()

  return Math.round(diff / (1000 * 60)) // Minutes
}

function calculateEngagementScore(messages: CompanionMessage[]): number {
  const userMessages = messages.filter(m => m.role === 'user')
  if (userMessages.length === 0) return 1

  // Score based on:
  // - Number of messages
  // - Average message length
  // - Presence of emotional content

  const avgLength = userMessages.reduce((acc, m) => acc + m.content.length, 0) / userMessages.length
  const messageCountScore = Math.min(userMessages.length * 1.5, 5)
  const lengthScore = Math.min(avgLength / 50, 5)

  return Math.round(messageCountScore + lengthScore)
}

function getGreetingType(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

async function updateUserStreak(userId: string): Promise<void> {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('current_streak, longest_streak, total_checkins')
    .eq('id', userId)
    .single() as { data: { current_streak: number; longest_streak: number; total_checkins: number } | null }

  if (!profile) return

  const newStreak = (profile.current_streak || 0) + 1
  const newLongest = Math.max(newStreak, profile.longest_streak || 0)

  await (supabase
    .from('user_profiles') as any)
    .update({
      current_streak: newStreak,
      longest_streak: newLongest,
      total_checkins: (profile.total_checkins || 0) + 1,
      days_with_companion: (profile.total_checkins || 0) + 1,
    })
    .eq('id', userId)
}
