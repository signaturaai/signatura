/**
 * Indicators Scoring API
 *
 * POST /api/indicators/score
 * Analyzes text and returns scores for all 10 indicators.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scoreText, ScoringContext } from '@/lib/indicators'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication (optional - can be used without auth for demo)
    const { data: { user } } = await supabase.auth.getUser()

    const body = await request.json()
    const { text, context, industry, indicatorIds } = body

    // Validate input
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    if (text.length < 50) {
      return NextResponse.json(
        { error: 'Text must be at least 50 characters' },
        { status: 400 }
      )
    }

    if (text.length > 50000) {
      return NextResponse.json(
        { error: 'Text must be less than 50,000 characters' },
        { status: 400 }
      )
    }

    // Build scoring context
    const scoringContext: ScoringContext = {
      type: context || 'general',
      industry: industry,
    }

    // Score the text
    const result = await scoreText(text, scoringContext, indicatorIds)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Scoring failed' },
        { status: 500 }
      )
    }

    // Optionally save to database if user is authenticated
    if (user && result.scores) {
      try {
        await (supabase.from('indicator_scores') as any).insert({
          user_id: user.id,
          scores: result.scores.scores,
          overall_score: result.scores.overall,
          strengths: result.scores.strengths,
          gaps: result.scores.gaps,
          context_type: scoringContext.type,
          industry: scoringContext.industry,
          text_preview: text.slice(0, 500),
        })
      } catch (dbError) {
        // Don't fail the request if DB save fails
        console.error('Failed to save scores to database:', dbError)
      }
    }

    return NextResponse.json({
      success: true,
      scores: result.scores,
      tokensUsed: result.tokensUsed,
      model: result.model,
    })
  } catch (error) {
    console.error('Score API error:', error)
    return NextResponse.json(
      { error: 'Failed to score text' },
      { status: 500 }
    )
  }
}
