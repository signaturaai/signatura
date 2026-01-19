/**
 * Companion Chat API Route
 *
 * Handles conversation with the AI companion.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  generateCheckInResponse,
  generateConversationalResponse,
  getMockCompanionResponse,
  getCompanionContext,
  storeDailyContext,
  storeConversation,
} from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { message, conversationType = 'general' } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Use mock response in development to save API costs
    const useMock = process.env.USE_MOCK_AI === 'true' || !process.env.OPENAI_API_KEY

    if (useMock) {
      const mockResponse = await getMockCompanionResponse(message)

      // Still store the context even with mock
      if (conversationType === 'daily_checkin') {
        await storeDailyContext({
          userId: user.id,
          moodRating: mockResponse.detectedMood,
          energyLevel: mockResponse.detectedEnergy,
          userMessage: message,
          aiResponse: mockResponse.message,
          suggestedGoal: mockResponse.suggestedGoal?.goal,
          goalType: mockResponse.suggestedGoal?.type,
          goalDifficulty: mockResponse.suggestedGoal?.difficulty,
          emotionalKeywords: mockResponse.emotionalKeywords,
          responseTone: mockResponse.tone,
          burnoutRiskScore: mockResponse.burnoutWarning ? 70 : 20,
        })
      }

      return NextResponse.json({
        message: mockResponse.message,
        tone: mockResponse.tone,
        suggestedGoal: mockResponse.suggestedGoal,
        detectedMood: mockResponse.detectedMood,
        detectedEnergy: mockResponse.detectedEnergy,
        burnoutWarning: mockResponse.burnoutWarning,
      })
    }

    // Get user context for personalized response
    const context = await getCompanionContext(user.id)

    if (!context) {
      return NextResponse.json(
        { error: 'Could not load user context' },
        { status: 500 }
      )
    }

    context.currentMessage = message

    let response

    if (conversationType === 'daily_checkin') {
      // Daily check-in with full emotional analysis
      response = await generateCheckInResponse(context)

      // Store the daily context
      await storeDailyContext({
        userId: user.id,
        moodRating: response.detectedMood,
        energyLevel: response.detectedEnergy,
        userMessage: message,
        aiResponse: response.message,
        suggestedGoal: response.suggestedGoal?.goal,
        goalType: response.suggestedGoal?.type,
        goalDifficulty: response.suggestedGoal?.difficulty,
        emotionalKeywords: response.emotionalKeywords,
        responseTone: response.tone,
        burnoutRiskScore: response.burnoutWarning ? 70 : 20,
      })
    } else {
      // General conversation
      const conversationHistory = [{ role: 'user' as const, content: message }]
      const responseMessage = await generateConversationalResponse(context, conversationHistory)
      response = {
        message: responseMessage,
        tone: 'supportive',
        detectedMood: context.emotionalState.mood,
        detectedEnergy: context.emotionalState.energy,
        burnoutWarning: false,
      }
    }

    // Store the conversation
    await storeConversation({
      userId: user.id,
      type: conversationType as any,
      messages: [
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { role: 'companion', content: response.message, timestamp: new Date().toISOString() },
      ],
      startingMood: response.detectedMood,
      endingMood: response.detectedMood, // Will be updated as conversation continues
      topicsDiscussed: response.emotionalKeywords || [],
    })

    return NextResponse.json({
      message: response.message,
      tone: response.tone,
      suggestedGoal: response.suggestedGoal,
      detectedMood: response.detectedMood,
      detectedEnergy: response.detectedEnergy,
      burnoutWarning: response.burnoutWarning,
    })
  } catch (error) {
    console.error('Companion chat error:', error)
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
