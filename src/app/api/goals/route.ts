/**
 * Goals API
 *
 * Manages micro-goals - the gentle, achievable tasks
 * that help job seekers maintain momentum without burning out.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateMicroGoal, generateCelebration, getMockCompanionResponse } from '@/lib/ai/companion'
import { getCompanionContext } from '@/lib/ai/context'
import type { GoalType, GoalDifficulty } from '@/types/database'

const useMock = process.env.USE_MOCK_AI === 'true' || !process.env.OPENAI_API_KEY

// Type definitions for untyped Supabase queries
type CheckinGoalData = {
  suggested_micro_goal: string | null
  goal_type: string | null
  goal_difficulty: string | null
  user_accepted_goal: boolean
  goal_completed: boolean
  completion_time: string | null
  completion_reflection: string | null
}

type CheckinRecord = {
  id: string
  mood_rating: number
  energy_level: string
  suggested_micro_goal: string | null
  goal_difficulty: string | null
  user_accepted_goal: boolean
  celebration_moments: any[]
}

type WeekStats = {
  user_accepted_goal: boolean
  goal_completed: boolean
}

/**
 * GET /api/goals
 * Get user's current and recent goals
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date().toISOString().split('T')[0]

    // Get today's goal from check-in
    const { data: todayCheckin } = await supabase
      .from('user_emotional_context')
      .select('suggested_micro_goal, goal_type, goal_difficulty, user_accepted_goal, goal_completed, completion_time, completion_reflection')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle() as { data: CheckinGoalData | null }

    // Get completed goals from last 7 days
    const { data: recentGoals } = await supabase
      .from('user_emotional_context')
      .select('date, suggested_micro_goal, goal_type, goal_completed, completion_reflection')
      .eq('user_id', user.id)
      .eq('goal_completed', true)
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false }) as { data: any[] | null }

    // Calculate completion stats
    const { data: weekStats } = await supabase
      .from('user_emotional_context')
      .select('user_accepted_goal, goal_completed')
      .eq('user_id', user.id)
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) as { data: WeekStats[] | null }

    const acceptedCount = weekStats?.filter((s: WeekStats) => s.user_accepted_goal).length || 0
    const completedCount = weekStats?.filter((s: WeekStats) => s.goal_completed).length || 0
    const completionRate = acceptedCount > 0 ? Math.round((completedCount / acceptedCount) * 100) : 0

    return NextResponse.json({
      todayGoal: todayCheckin?.suggested_micro_goal ? {
        goal: todayCheckin.suggested_micro_goal,
        type: todayCheckin.goal_type,
        difficulty: todayCheckin.goal_difficulty,
        accepted: todayCheckin.user_accepted_goal,
        completed: todayCheckin.goal_completed,
        completionTime: todayCheckin.completion_time,
        reflection: todayCheckin.completion_reflection,
      } : null,
      recentCompletedGoals: recentGoals || [],
      stats: {
        acceptedThisWeek: acceptedCount,
        completedThisWeek: completedCount,
        completionRate,
      },
    })
  } catch (error) {
    console.error('Goals GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get goals' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/goals
 * Accept today's goal or request a new one
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body // 'accept' | 'request_new'

    const today = new Date().toISOString().split('T')[0]

    // Get today's check-in
    const { data: todayCheckin, error: checkinError } = await supabase
      .from('user_emotional_context')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle() as { data: CheckinRecord | null; error: any }

    if (checkinError || !todayCheckin) {
      return NextResponse.json(
        { error: 'Please complete your daily check-in first' },
        { status: 400 }
      )
    }

    if (action === 'accept') {
      // Mark goal as accepted
      const { error } = await (supabase
        .from('user_emotional_context') as any)
        .update({
          user_accepted_goal: true,
        })
        .eq('id', todayCheckin.id)

      if (error) throw error

      return NextResponse.json({
        success: true,
        message: 'Goal accepted! You\'ve got this.',
        goal: todayCheckin.suggested_micro_goal,
      })
    }

    if (action === 'request_new') {
      // Generate a new goal
      let newGoal

      if (useMock) {
        const mockResponse = await getMockCompanionResponse('I need a different goal')
        newGoal = mockResponse.suggestedGoal
      } else {
        const context = await getCompanionContext(user.id)
        if (context) {
          newGoal = await generateMicroGoal(context, {
            mood: todayCheckin.mood_rating || 5,
            energy: (todayCheckin.energy_level as any) || 'neutral',
          })
        }
      }

      if (!newGoal) {
        return NextResponse.json(
          { error: 'Could not generate a new goal' },
          { status: 500 }
        )
      }

      // Update check-in with new goal
      const { error } = await (supabase
        .from('user_emotional_context') as any)
        .update({
          suggested_micro_goal: newGoal.goal,
          goal_type: newGoal.type as GoalType,
          goal_difficulty: newGoal.difficulty as GoalDifficulty,
          user_accepted_goal: false,
          goal_completed: false,
        })
        .eq('id', todayCheckin.id)

      if (error) throw error

      return NextResponse.json({
        success: true,
        goal: newGoal,
        message: 'Here\'s a different goal for you.',
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Goals POST error:', error)
    return NextResponse.json(
      { error: 'Failed to process goal action' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/goals
 * Complete a goal
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { reflection } = body

    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toISOString()

    // Get today's check-in
    const { data: todayCheckin, error: checkinError } = await supabase
      .from('user_emotional_context')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle() as { data: CheckinRecord | null; error: any }

    if (checkinError || !todayCheckin) {
      return NextResponse.json(
        { error: 'No check-in found for today' },
        { status: 400 }
      )
    }

    if (!todayCheckin.user_accepted_goal) {
      return NextResponse.json(
        { error: 'Goal was not accepted' },
        { status: 400 }
      )
    }

    // Generate celebration message
    let celebrationMessage = 'Well done! You completed your goal.'

    if (!useMock) {
      try {
        celebrationMessage = await generateCelebration({
          completedGoal: todayCheckin.suggested_micro_goal || 'your goal',
          difficulty: todayCheckin.goal_difficulty || 'small',
          userEnergy: (todayCheckin.energy_level as any) || 'neutral',
          completionStreak: 1,
        })
      } catch (e) {
        console.error('Failed to generate celebration:', e)
      }
    }

    // Mark goal as completed
    const { error } = await (supabase
      .from('user_emotional_context') as any)
      .update({
        goal_completed: true,
        completion_time: now,
        completion_reflection: reflection || null,
        celebration_moments: [
          ...(todayCheckin.celebration_moments || []),
          { type: 'goal_completed', goal: todayCheckin.suggested_micro_goal, at: now },
        ],
      })
      .eq('id', todayCheckin.id)

    if (error) throw error

    return NextResponse.json({
      success: true,
      celebration: celebrationMessage,
      goal: todayCheckin.suggested_micro_goal,
    })
  } catch (error) {
    console.error('Goals PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to complete goal' },
      { status: 500 }
    )
  }
}
