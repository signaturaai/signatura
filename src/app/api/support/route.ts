/**
 * Support API
 *
 * Handles difficult moments - rejections, setbacks, and burnout.
 * This is where emotional intelligence matters most.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateRejectionSupport } from '@/lib/ai/companion'

const useMock = process.env.USE_MOCK_AI === 'true' || !process.env.OPENAI_API_KEY

export interface SupportRequest {
  type: 'rejection' | 'ghosted' | 'setback' | 'burnout' | 'frustration'
  companyName?: string
  position?: string
  stage?: string // 'application' | 'phone_screen' | 'interview' | 'final_round' | 'offer_negotiation'
  feedback?: string
  excitementLevel?: 'low' | 'medium' | 'high' | 'dream_job'
  message?: string // For general venting/support
}

/**
 * POST /api/support
 * Generate supportive response for difficult moments
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: SupportRequest = await request.json()
    const { type, companyName, position, stage, feedback, excitementLevel, message } = body

    if (!type) {
      return NextResponse.json(
        { error: 'Support type is required' },
        { status: 400 }
      )
    }

    // Get recent rejection count
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { count: recentRejections } = await supabase
      .from('job_applications')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('application_status', 'rejected')
      .gte('status_updated_at', weekAgo)

    let supportMessage: string

    if (useMock) {
      // Mock support messages based on type and context
      if (type === 'rejection') {
        const dreamJobMessages = [
          `I'm so sorry about ${companyName || 'this'}. I know how much you wanted this one. It's okay to feel disappointed - this really matters to you, and that's not nothing. Take whatever time you need before we figure out next steps. How are you feeling right now?`,
        ]
        const regularMessages = [
          `Getting a rejection is never easy, even when you knew it might happen. ${companyName ? `${companyName} missing out on you doesn't define your worth.` : 'This doesn\'t define your worth.'} How are you doing with this?`,
        ]
        const multipleRejectionMessages = [
          `Another rejection. I know this is wearing on you - ${(recentRejections || 0) + 1} this week is a lot to process. But I want you to hear me: this many rejections means you're putting yourself out there. That takes courage. Let's talk about how you're really feeling.`,
        ]

        if ((recentRejections || 0) >= 3) {
          supportMessage = multipleRejectionMessages[0]
        } else if (excitementLevel === 'dream_job' || excitementLevel === 'high') {
          supportMessage = dreamJobMessages[0]
        } else {
          supportMessage = regularMessages[0]
        }
      } else if (type === 'ghosted') {
        supportMessage = `Being ghosted is one of the most frustrating parts of job searching. You put in effort, maybe even got your hopes up, and then... silence. ${companyName ? `${companyName} owes you better than that.` : ''} Your frustration is completely valid. Do you want to talk about it, or would you prefer we move on to something else?`
      } else if (type === 'burnout') {
        supportMessage = `I hear you, and I'm concerned. The exhaustion you're describing sounds like burnout setting in. Job searching isn't meant to feel like this forever. Here's what I think: you need a break. Not a "quick 15 minutes" break - a real one. Can we talk about what rest would look like for you right now?`
      } else if (type === 'frustration') {
        supportMessage = `It sounds like you're at the end of your rope. That makes total sense - the job search process is designed in a way that often disregards candidates' time and emotions. Your frustration is valid. Would it help to vent a bit more, or do you want to brainstorm something constructive we can do about it?`
      } else {
        supportMessage = `I'm here with you through this. Whatever you're feeling right now, it's valid. Take your time - we can talk about it whenever you're ready.`
      }
    } else {
      // Generate real supportive response
      supportMessage = await generateRejectionSupport({
        companyName: companyName || 'the company',
        position: position || 'the role',
        stage: stage || 'application',
        feedback,
        excitementLevel: excitementLevel || 'medium',
        recentRejections: recentRejections || 0,
      })
    }

    // Store the support moment
    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toISOString()

    // Update today's check-in with the struggle (type assertion for unloaded schema)
    const { data: todayCheckin } = await supabase
      .from('user_emotional_context')
      .select('id, struggles_mentioned, rejection_count_this_week')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle() as { data: { id: string; struggles_mentioned: any[]; rejection_count_this_week: number } | null }

    if (todayCheckin) {
      const currentStruggles = todayCheckin.struggles_mentioned || []
      await (supabase
        .from('user_emotional_context') as any)
        .update({
          struggles_mentioned: [
            ...currentStruggles,
            { type, companyName, position, message, at: now },
          ],
          rejection_count_this_week: type === 'rejection'
            ? (todayCheckin.rejection_count_this_week || 0) + 1
            : todayCheckin.rejection_count_this_week,
          follow_up_needed: true,
          follow_up_topic: type === 'burnout' ? 'burnout_check' : 'emotional_support',
        })
        .eq('id', todayCheckin.id)
    }

    // If it's a rejection, also update the job application
    if (type === 'rejection' && companyName) {
      const { data: application } = await supabase
        .from('job_applications')
        .select('id, companion_support_provided')
        .eq('user_id', user.id)
        .ilike('company_name', `%${companyName}%`)
        .neq('application_status', 'rejected')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle() as { data: { id: string; companion_support_provided: any[] } | null }

      if (application) {
        const currentSupport = application.companion_support_provided || []
        await (supabase
          .from('job_applications') as any)
          .update({
            application_status: 'rejected',
            status_updated_at: now,
            outcome: 'rejected',
            outcome_date: today,
            companion_support_provided: [
              ...currentSupport,
              { type: 'rejection_support', at: now, feedback },
            ],
            updated_at: now,
          })
          .eq('id', application.id)
      }
    }

    return NextResponse.json({
      success: true,
      support: supportMessage,
      type,
      followUpScheduled: type === 'burnout',
    })
  } catch (error) {
    console.error('Support POST error:', error)
    return NextResponse.json(
      { error: 'Failed to generate support' },
      { status: 500 }
    )
  }
}
