/**
 * Companion Context Retrieval
 *
 * Retrieves relevant context for personalized companion responses.
 * This is what makes the companion "remember" the user.
 */

import { createClient } from '@/lib/supabase/server'
import type {
  CompanionContext,
  EmotionalState,
  CelebrationMoment,
  StruggleMentioned,
  CompanionCommitment,
  ConversationSummary,
} from '@/types'

/**
 * Retrieve full context for a user
 */
export async function getCompanionContext(userId: string): Promise<CompanionContext | null> {
  const supabase = await createClient()

  // Fetch user profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    console.error('Error fetching profile:', profileError)
    return null
  }

  // Fetch recent emotional context (last 7 days)
  const { data: recentEmotions } = await supabase
    .from('user_emotional_context')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(7)

  // Fetch personalization settings
  const { data: personalization } = await supabase
    .from('companion_personalization')
    .select('*')
    .eq('user_id', userId)
    .single()

  // Fetch recent conversations for context
  const { data: recentConversations } = await supabase
    .from('companion_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5)

  // Fetch recent applications for activity context
  const { data: recentApplications } = await supabase
    .from('job_applications')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', getDateDaysAgo(7).toISOString())
    .order('created_at', { ascending: false })

  // Calculate emotional state
  const emotionalState = calculateEmotionalState(recentEmotions || [])

  // Extract celebration moments and struggles
  const celebrationMoments = extractCelebrations(recentEmotions || [])
  const struggles = extractStruggles(recentEmotions || [])

  // Extract pending commitments
  const pendingCommitments = extractPendingCommitments(recentConversations || [])

  // Extract key quotes
  const keyQuotes = extractKeyQuotes(recentConversations || [])

  // Summarize relevant conversations
  const conversationSummaries = summarizeConversations(recentConversations || [])

  // Calculate recent activity
  const applicationsThisWeek = recentApplications?.length || 0
  const recentRejections = recentApplications?.filter(
    app => app.application_status === 'rejected'
  ).length || 0
  const daysSinceLastApplication = calculateDaysSince(
    recentApplications?.[0]?.created_at
  )
  const daysSinceLastInterview = calculateDaysSinceLastInterview(recentApplications || [])

  return {
    userId,
    userName: profile.full_name || 'Friend',
    currentMessage: '', // Set by caller

    emotionalState,

    recentActivity: {
      applicationsThisWeek,
      daysSinceLastApplication,
      daysSinceLastInterview,
      recentWins: celebrationMoments,
      recentStruggles: struggles,
    },

    relationshipHistory: {
      daysWithCompanion: profile.days_with_companion || 0,
      totalCheckins: profile.total_checkins || 0,
      currentStreak: profile.current_streak || 0,
      pendingCommitments,
      keyQuotes,
      relevantConversations: conversationSummaries,
    },

    personalization: {
      companionName: personalization?.preferred_companion_name || 'companion',
      responseLengthPreference: (personalization?.response_length_preference as 'brief' | 'moderate' | 'detailed') || 'moderate',
      celebrationStyle: (personalization?.celebration_style as 'subtle' | 'warm' | 'enthusiastic') || 'warm',
      motivationalApproach: (personalization?.motivational_approach as 'empowering' | 'challenging' | 'gentle') || 'empowering',
      usesHumor: personalization?.uses_humor ?? true,
      sensitiveTopic: (personalization?.sensitive_topics as string[]) || [],
    },
  }
}

/**
 * Get context specifically for a topic
 */
export async function getTopicContext(
  userId: string,
  topic: string,
  lookbackDays: number = 30
): Promise<ConversationSummary[]> {
  const supabase = await createClient()

  const { data: conversations } = await supabase
    .from('companion_conversations')
    .select('*')
    .eq('user_id', userId)
    .contains('topics_discussed', [topic])
    .gte('created_at', getDateDaysAgo(lookbackDays).toISOString())
    .order('created_at', { ascending: false })
    .limit(10)

  return summarizeConversations(conversations || [])
}

/**
 * Check if user has pending follow-ups
 */
export async function getPendingFollowUps(userId: string): Promise<Array<{
  applicationId: string
  companyName: string
  daysSinceLastContact: number
  stage: string
}>> {
  const supabase = await createClient()

  const { data: followUps } = await supabase
    .from('application_follow_ups')
    .select(`
      *,
      job_applications (
        company_name,
        application_status
      )
    `)
    .eq('user_id', userId)
    .eq('sent_at', null)
    .order('created_at', { ascending: false })

  return (followUps || []).map(fu => ({
    applicationId: fu.job_application_id,
    companyName: (fu.job_applications as any)?.company_name || 'Unknown',
    daysSinceLastContact: fu.days_since_last_contact || 0,
    stage: fu.application_stage,
  }))
}

/**
 * Get burnout risk factors
 */
export async function getBurnoutRisk(userId: string): Promise<{
  score: number
  level: 'low' | 'moderate' | 'high' | 'severe'
  factors: string[]
}> {
  const supabase = await createClient()

  // Get recent emotional data
  const { data: recentEmotions } = await supabase
    .from('user_emotional_context')
    .select('mood_rating, energy_level, rejection_count_this_week, burnout_risk_score')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(7)

  // Get recent rejections
  const { data: recentRejections } = await supabase
    .from('job_applications')
    .select('id')
    .eq('user_id', userId)
    .eq('application_status', 'rejected')
    .gte('updated_at', getDateDaysAgo(14).toISOString())

  const factors: string[] = []
  let score = 0

  // Check energy levels
  const avgEnergy = calculateAverageEnergy(recentEmotions || [])
  if (avgEnergy === 'burned_out' || avgEnergy === 'exhausted') {
    score += 40
    factors.push('Consistently low energy levels')
  } else if (avgEnergy === 'low') {
    score += 20
    factors.push('Below average energy')
  }

  // Check rejection count
  const rejectionCount = recentRejections?.length || 0
  if (rejectionCount > 5) {
    score += 30
    factors.push(`${rejectionCount} rejections in the last 2 weeks`)
  } else if (rejectionCount > 3) {
    score += 15
    factors.push(`${rejectionCount} rejections recently`)
  }

  // Check mood trend
  const avgMood = calculateAverageMood(recentEmotions || [])
  if (avgMood < 4) {
    score += 25
    factors.push('Mood has been consistently low')
  } else if (avgMood < 5) {
    score += 10
    factors.push('Mood is below average')
  }

  // Determine level
  const level: 'low' | 'moderate' | 'high' | 'severe' =
    score >= 80 ? 'severe' :
    score >= 60 ? 'high' :
    score >= 40 ? 'moderate' : 'low'

  return {
    score: Math.min(score, 100),
    level,
    factors,
  }
}

// Helper functions

function getDateDaysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

function calculateEmotionalState(recentEmotions: any[]): EmotionalState {
  if (recentEmotions.length === 0) {
    return {
      mood: 5,
      energy: 'neutral',
      burnoutRisk: 0,
      burnoutLevel: 'low',
      confidenceTrend: 'stable',
      recentRejections: 0,
      daysSinceResponse: 0,
    }
  }

  const latest = recentEmotions[0]
  const avgMood = calculateAverageMood(recentEmotions)
  const avgEnergy = calculateAverageEnergy(recentEmotions)

  return {
    mood: latest.mood_rating || avgMood,
    energy: latest.energy_level || avgEnergy,
    burnoutRisk: latest.burnout_risk_score || 0,
    burnoutLevel: (latest.burnout_risk_level as any) || 'low',
    confidenceTrend: (latest.confidence_trend as any) || 'stable',
    recentRejections: latest.rejection_count_this_week || 0,
    daysSinceResponse: latest.days_since_last_response || 0,
  }
}

function calculateAverageMood(emotions: any[]): number {
  if (emotions.length === 0) return 5
  const sum = emotions.reduce((acc, e) => acc + (e.mood_rating || 5), 0)
  return Math.round(sum / emotions.length)
}

function calculateAverageEnergy(emotions: any[]): 'burned_out' | 'exhausted' | 'low' | 'neutral' | 'good' | 'energized' | 'excited' {
  if (emotions.length === 0) return 'neutral'

  const energyLevels = ['burned_out', 'exhausted', 'low', 'neutral', 'good', 'energized', 'excited']
  const avgIndex = Math.round(
    emotions.reduce((acc, e) => {
      const idx = energyLevels.indexOf(e.energy_level || 'neutral')
      return acc + (idx >= 0 ? idx : 3)
    }, 0) / emotions.length
  )

  return energyLevels[avgIndex] as any
}

function extractCelebrations(emotions: any[]): CelebrationMoment[] {
  const celebrations: CelebrationMoment[] = []

  for (const emotion of emotions) {
    const moments = (emotion.celebration_moments as any[]) || []
    celebrations.push(...moments)
  }

  return celebrations.slice(0, 5)
}

function extractStruggles(emotions: any[]): StruggleMentioned[] {
  const struggles: StruggleMentioned[] = []

  for (const emotion of emotions) {
    const mentioned = (emotion.struggles_mentioned as any[]) || []
    struggles.push(...mentioned)
  }

  return struggles.slice(0, 5)
}

function extractPendingCommitments(conversations: any[]): CompanionCommitment[] {
  const commitments: CompanionCommitment[] = []

  for (const conv of conversations) {
    const made = (conv.commitments_made as any[]) || []
    commitments.push(
      ...made.filter((c: any) => !c.fulfilled)
    )
  }

  return commitments.slice(0, 3)
}

function extractKeyQuotes(conversations: any[]): string[] {
  const quotes: string[] = []

  for (const conv of conversations) {
    const insights = (conv.key_insights as any[]) || []
    for (const insight of insights) {
      if (insight.quote && insight.importance === 'high') {
        quotes.push(insight.quote)
      }
    }
  }

  return quotes.slice(0, 3)
}

function summarizeConversations(conversations: any[]): ConversationSummary[] {
  return conversations.map(conv => ({
    id: conv.id,
    type: conv.conversation_type,
    date: conv.created_at,
    keyInsights: (conv.key_insights as any[]) || [],
    moodShift: conv.mood_shift || 0,
    topicsDiscussed: (conv.topics_discussed as string[]) || [],
  }))
}

function calculateDaysSince(dateString?: string): number {
  if (!dateString) return 999
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function calculateDaysSinceLastInterview(applications: any[]): number {
  const interviewed = applications.find(
    app => app.application_status === 'interviewed' ||
           app.interview_schedule?.length > 0
  )
  if (!interviewed) return 999
  return calculateDaysSince(interviewed.updated_at)
}
