/**
 * Industry Weights API
 *
 * GET /api/indicators/weights/:industry
 * Returns the weight profile for a specific industry.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getIndustryWeights,
  formatWeightsForDisplay,
  getTopIndicators,
  getSupportedIndustries,
} from '@/lib/indicators'

interface RouteParams {
  params: Promise<{ industry: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { industry } = await params

    // Special case: list all supported industries
    if (industry === 'list' || industry === 'all') {
      return NextResponse.json({
        industries: getSupportedIndustries(),
      })
    }

    // Get weights for specific industry
    const weights = getIndustryWeights(industry)
    const formatted = formatWeightsForDisplay(industry)
    const topIndicators = getTopIndicators(industry, 3)

    return NextResponse.json({
      industry: weights.industry,
      displayName: weights.displayName,
      description: weights.description,
      weights: weights.weights,
      formattedWeights: formatted,
      topIndicators,
      isGeneric: weights.industry === 'generic',
    })
  } catch (error) {
    console.error('Weights API error:', error)
    return NextResponse.json(
      { error: 'Failed to get industry weights' },
      { status: 500 }
    )
  }
}
