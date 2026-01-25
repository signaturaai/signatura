/**
 * Daily Check-in API
 *
 * Handles daily emotional check-ins with the companion.
 * This is the heart of the Signatura emotional intelligence system.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  generateCheckInResponse,
  getMockCompanionResponse,
} from '@/lib/ai/companion'
import { getCompanionContext } from '@/lib/ai/context'
import type { EnergyLevel, GoalType, GoalDifficulty, BurnoutRiskLevel } from '@/types/database'

const useMock = process.env.USE_MOCK_AI === 'true' || !process.env.OPENAI_API_KEY

/**
 * GET /api/checkin
 * Get today's check-in status and recent check-ins
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date().toISOString().split('T')[0]

    // Get today's check-in if it exists
    const { data: todayCheckin } = await supabase
      .from('user_emotional_context')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle()

    // Get recent check-ins (last 7 days)
    const { data: recentCheckins } = await supabase
      .from('user_emotional_context')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(7)

    // Get user profile for streak info (type assertion for unloaded schema)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('current_streak, longest_streak, total_checkins, full_name')
      .eq('id', user.id)
      .single() as { data: { current_streak: number; longest_streak: number; total_checkins: number; full_name: string | null } | null }

    return NextResponse.json({
      hasCheckedInToday: !!todayCheckin,
      todayCheckin,
      recentCheckins: recentCheckins || [],
      streak: (profile?.current_streak as number) || 0,
      longestStreak: (profile?.longest_streak as number) || 0,
      totalCheckins: (profile?.total_checkins as number) || 0,
      userName: (profile?.full_name as string) || 'Friend',
    })
  } catch (error) {
    console.error('Check-in GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get check-in status' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/checkin
 * Create or update today's check-in
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { message } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toISOString()

    // Check if already checked in today
    const { data: existingCheckin } = await supabase
      .from('user_emotional_context')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle() as { data: { id: string } | null }

    let companionResponse

    if (useMock) {
      // Use mock response for development
      companionResponse = await getMockCompanionResponse(message)
    } else {
      // Get full context and generate real response
      const context = await getCompanionContext(user.id)
      if (context) {
        context.currentMessage = message
        companionResponse = await generateCheckInResponse(context)
      } else {
        // Fallback to mock if context is not available
        companionResponse = await getMockCompanionResponse(message)
      }
    }

    // Calculate burnout risk level
    const burnoutRiskLevel: BurnoutRiskLevel = companionResponse.burnoutWarning
      ? 'high'
      : companionResponse.detectedMood <= 3
      ? 'moderate'
      : 'low'

    // Prepare check-in data
    const checkinData = {
      user_id: user.id,
      date: today,
      time_of_checkin: now,
      mood_rating: companionResponse.detectedMood,
      energy_level: companionResponse.detectedEnergy as EnergyLevel,
      user_message: message,
      emotional_keywords: companionResponse.emotionalKeywords,
      ai_validation_response: companionResponse.message,
      response_tone: companionResponse.tone,
      suggested_micro_goal: companionResponse.suggestedGoal?.goal || null,
      goal_type: (companionResponse.suggestedGoal?.type || null) as GoalType | null,
      goal_difficulty: (companionResponse.suggestedGoal?.difficulty || null) as GoalDifficulty | null,
      user_accepted_goal: false,
      goal_completed: false,
      burnout_risk_score: companionResponse.burnoutWarning ? 80 : companionResponse.detectedMood <= 3 ? 50 : 20,
      burnout_risk_level: burnoutRiskLevel,
      follow_up_needed: companionResponse.shouldFollowUp,
      follow_up_topic: companionResponse.followUpTopic || null,
      celebration_moments: companionResponse.celebrationDetected ? [{ type: 'mood', detected_at: now }] : [],
      struggles_mentioned: companionResponse.detectedMood <= 4 ? [{ concern: 'low mood', detected_at: now }] : [],
    }

    let checkinRecord

    if (existingCheckin) {
      // Update existing check-in (type assertion for unloaded schema)
      const { data, error } = await (supabase
        .from('user_emotional_context') as any)
        .update(checkinData)
        .eq('id', existingCheckin.id)
        .select()
        .single()

      if (error) throw error
      checkinRecord = data
    } else {
      // Create new check-in (type assertion for unloaded schema)
      const { data, error } = await (supabase
        .from('user_emotional_context') as any)
        .insert(checkinData)
        .select()
        .single()

      if (error) throw error
      checkinRecord = data

      // Update user profile streak
      await updateStreak(supabase, user.id)
    }

    return NextResponse.json({
      success: true,
      checkin: checkinRecord,
      response: {
        message: companionResponse.message,
        tone: companionResponse.tone,
        suggestedGoal: companionResponse.suggestedGoal,
        detectedMood: companionResponse.detectedMood,
        detectedEnergy: companionResponse.detectedEnergy,
        burnoutWarning: companionResponse.burnoutWarning,
        celebrationDetected: companionResponse.celebrationDetected,
      },
    })
  } catch (error) {
    console.error('Check-in POST error:', error)
    return NextResponse.json(
      { error: 'Failed to save check-in' },
      { status: 500 }
    )
  }
}

/**
 * Update user's streak after check-in
 */
async function updateStreak(supabase: any, userId: string) {
  // Get user's current profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('current_streak, longest_streak, total_checkins')
    .eq('id', userId)
    .single()

  if (!profile) return

  // Check if checked in yesterday
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data: yesterdayCheckin } = await supabase
    .from('user_emotional_context')
    .select('id')
    .eq('user_id', userId)
    .eq('date', yesterday)
    .maybeSingle()

  const newStreak = yesterdayCheckin ? profile.current_streak + 1 : 1
  const newLongestStreak = Math.max(newStreak, profile.longest_streak)

  await supabase
    .from('user_profiles')
    .update({
      current_streak: newStreak,
      longest_streak: newLongestStreak,
      total_checkins: profile.total_checkins + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
}
