/**
 * Celebration API
 *
 * Handles moments of joy - interview invites, offers, and wins.
 * Every step forward deserves acknowledgment.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateCelebration } from '@/lib/ai/companion'
import type { EnergyLevel } from '@/types/database'

const useMock = process.env.USE_MOCK_AI === 'true' || !process.env.OPENAI_API_KEY

export interface CelebrationRequest {
  type: 'interview' | 'offer' | 'goal_completed' | 'milestone' | 'custom'
  title: string
  details?: string
  companyName?: string
  position?: string
}

/**
 * POST /api/celebration
 * Generate a celebration response for a win
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CelebrationRequest = await request.json()
    const { type, title, details, companyName, position } = body

    if (!type || !title) {
      return NextResponse.json(
        { error: 'Type and title are required' },
        { status: 400 }
      )
    }

    // Get user's current emotional state
    const today = new Date().toISOString().split('T')[0]
    const { data: todayCheckin } = await supabase
      .from('user_emotional_context')
      .select('energy_level, mood_rating')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle() as { data: { energy_level: string; mood_rating: number } | null }

    let celebrationMessage: string

    if (useMock) {
      // Mock celebration messages based on type
      const mockMessages: Record<string, string> = {
        interview: `This is fantastic news! An interview with ${companyName || 'them'}! All that preparation and persistence is paying off. Take a moment to feel proud - you earned this opportunity. How are you feeling about it?`,
        offer: `An offer! This is a huge moment. After everything you've been through, here's proof that the right opportunity was waiting for you. Before we dive into the details, let's just sit with this for a second. You did it.`,
        goal_completed: `You did it! Completing "${title}" might seem small, but these steps add up. I see your effort, and it matters. How do you feel after getting that done?`,
        milestone: `${title} - that's a real milestone! These achievements remind us that progress is happening, even when it's hard to see day-to-day. I'm genuinely happy for you.`,
        custom: `${title}! That's wonderful to hear. Moments like these matter, and I'm glad you shared this with me. How are you feeling?`,
      }
      celebrationMessage = mockMessages[type] || mockMessages.custom
    } else {
      // Generate personalized celebration
      celebrationMessage = await generateCelebration({
        completedGoal: title,
        difficulty: type === 'offer' ? 'medium' : 'small',
        userEnergy: (todayCheckin?.energy_level as EnergyLevel) || 'neutral',
        completionStreak: 1,
      })
    }

    // Store the celebration moment
    const now = new Date().toISOString()

    if (todayCheckin) {
      // Add to today's check-in (type assertion for unloaded schema)
      await (supabase
        .from('user_emotional_context') as any)
        .update({
          celebration_moments: [
            { type, title, details, companyName, position, at: now },
          ],
        })
        .eq('user_id', user.id)
        .eq('date', today)
    }

    // If it's an interview or offer, also update the job application
    if ((type === 'interview' || type === 'offer') && companyName) {
      const { data: application } = await supabase
        .from('job_applications')
        .select('id')
        .eq('user_id', user.id)
        .ilike('company_name', `%${companyName}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle() as { data: { id: string } | null }

      if (application) {
        await (supabase
          .from('job_applications') as any)
          .update({
            application_status: type === 'interview' ? 'interview_scheduled' : 'offer_received',
            companion_celebration_sent: true,
            updated_at: now,
          })
          .eq('id', application.id)
      }
    }

    return NextResponse.json({
      success: true,
      celebration: celebrationMessage,
      type,
      title,
    })
  } catch (error) {
    console.error('Celebration POST error:', error)
    return NextResponse.json(
      { error: 'Failed to generate celebration' },
      { status: 500 }
    )
  }
}
