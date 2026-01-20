/**
 * Indicators Comparison API
 *
 * POST /api/indicators/compare
 * Compares two sets of indicator scores (before/after).
 */

import { NextRequest, NextResponse } from 'next/server'
import { compareScores, IndicatorScores } from '@/lib/indicators'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { beforeScores, afterScores } = body

    // Validate input
    if (!beforeScores || !afterScores) {
      return NextResponse.json(
        { error: 'Both beforeScores and afterScores are required' },
        { status: 400 }
      )
    }

    // Validate score structure
    if (!beforeScores.scores || !afterScores.scores) {
      return NextResponse.json(
        { error: 'Invalid score structure - scores object required' },
        { status: 400 }
      )
    }

    // Ensure timestamps are Date objects
    const before: IndicatorScores = {
      ...beforeScores,
      timestamp: new Date(beforeScores.timestamp || Date.now()),
    }

    const after: IndicatorScores = {
      ...afterScores,
      timestamp: new Date(afterScores.timestamp || Date.now()),
    }

    // Perform comparison
    const comparison = compareScores(before, after)

    return NextResponse.json({
      success: true,
      comparison,
    })
  } catch (error) {
    console.error('Compare API error:', error)
    return NextResponse.json(
      { error: 'Failed to compare scores' },
      { status: 500 }
    )
  }
}
