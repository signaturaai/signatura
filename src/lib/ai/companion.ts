/**
 * Signatura AI Companion
 *
 * The core companion system - emotional intelligence first.
 * This is not a chatbot. This is a trusted companion.
 */

import OpenAI from 'openai'
import {
  COMPANION_SYSTEM_PROMPT,
  buildDailyCheckInPrompt,
  buildMicroGoalPrompt,
  buildCelebrationPrompt,
  buildRejectionSupportPrompt,
  buildFollowUpEmailPrompt,
} from './prompts'
import type {
  CompanionContext,
  CompanionResponse,
  MicroGoal,
  EmotionalState,
  EnergyLevel,
} from '@/types'

// Lazy-initialize OpenAI client to avoid build-time errors
let openai: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openai
}

const MODEL = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'

/**
 * Detect emotional state from user message
 */
export async function detectEmotionalState(
  message: string,
  _recentContext?: Partial<EmotionalState>
): Promise<{
  mood: number
  energy: EnergyLevel
  emotionalKeywords: string[]
  burnoutWarning: boolean
}> {
  const response = await getOpenAI().chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are an emotional intelligence analyzer. Analyze the user's message for emotional state.

Output JSON only:
{
  "mood": 1-10 (1=very low, 10=very high),
  "energy": "burned_out"|"exhausted"|"low"|"neutral"|"good"|"energized"|"excited",
  "emotionalKeywords": ["anxious", "hopeful", etc.],
  "burnoutWarning": true if showing burnout signs
}

Signs of burnout: exhausted language, hopelessness, mentions of giving up, physical tiredness, overwhelm.`,
      },
      {
        role: 'user',
        content: message,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })

  const result = JSON.parse(response.choices[0].message.content || '{}')

  return {
    mood: result.mood || 5,
    energy: result.energy || 'neutral',
    emotionalKeywords: result.emotionalKeywords || [],
    burnoutWarning: result.burnoutWarning || false,
  }
}

/**
 * Generate daily check-in response
 */
export async function generateCheckInResponse(
  context: CompanionContext
): Promise<CompanionResponse> {
  const prompt = buildDailyCheckInPrompt({
    userName: context.userName,
    currentTime: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    daysSinceLastCheckin: context.relationshipHistory.currentStreak === 0 ? 1 : 0,
    currentStreak: context.relationshipHistory.currentStreak,
    lastMood: context.emotionalState.mood,
    energyLevel: context.emotionalState.energy,
    recentContextSummary: buildRecentContextSummary(context),
    userCurrentMessage: context.currentMessage,
    conversationNumber: context.relationshipHistory.totalCheckins + 1,
    relevantPastQuote: context.relationshipHistory.keyQuotes[0],
    completedGoalsRatio: '7/10', // TODO: Calculate from actual data
  })

  const response = await getOpenAI().chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: COMPANION_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 500,
  })

  const message = response.choices[0].message.content || ''

  // Detect emotional state from user message
  const emotionalAnalysis = await detectEmotionalState(
    context.currentMessage,
    context.emotionalState
  )

  // Generate micro-goal if appropriate
  let suggestedGoal: MicroGoal | undefined
  if (emotionalAnalysis.mood >= 3 && !emotionalAnalysis.burnoutWarning) {
    suggestedGoal = await generateMicroGoal(context, emotionalAnalysis)
  }

  return {
    message,
    tone: determineTone(emotionalAnalysis),
    suggestedGoal,
    detectedMood: emotionalAnalysis.mood,
    detectedEnergy: emotionalAnalysis.energy,
    emotionalKeywords: emotionalAnalysis.emotionalKeywords,
    shouldFollowUp: emotionalAnalysis.mood <= 4 || emotionalAnalysis.burnoutWarning,
    followUpTopic: emotionalAnalysis.burnoutWarning ? 'burnout_check' : undefined,
    celebrationDetected: emotionalAnalysis.mood >= 7,
    burnoutWarning: emotionalAnalysis.burnoutWarning,
  }
}

/**
 * Generate a micro-goal based on context
 */
export async function generateMicroGoal(
  context: CompanionContext,
  emotionalState: { mood: number; energy: EnergyLevel }
): Promise<MicroGoal> {
  const prompt = buildMicroGoalPrompt({
    moodRating: emotionalState.mood,
    energyLevel: emotionalState.energy,
    burnoutScore: context.emotionalState.burnoutRisk,
    activitySummary: `${context.recentActivity.applicationsThisWeek} applications this week`,
    dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
    goalCompletionPercentage: 70, // TODO: Calculate from actual data
    goalPreference: context.personalization.motivationalApproach,
    pendingFollowUps: context.recentActivity.daysSinceLastApplication > 7,
    recentRejections: context.emotionalState.recentRejections,
    noApplicationsInDays: context.recentActivity.daysSinceLastApplication,
  })

  const response = await getOpenAI().chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: COMPANION_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  })

  const result = JSON.parse(response.choices[0].message.content || '{}')

  return {
    goal: result.goal || 'Take a 15-minute break to recharge',
    reasoning: result.reasoning || 'Rest is productive when energy is low.',
    timeEstimate: result.timeEstimate || '15 minutes',
    difficulty: result.difficulty || 'small',
    type: result.type || 'rest',
    completionCriteria: result.completionCriteria || 'You feel a bit more refreshed',
    encouragement: result.encouragement || 'Small steps matter.',
  }
}

/**
 * Generate celebration response
 */
export async function generateCelebration(context: {
  completedGoal: string
  difficulty: string
  userEnergy: EnergyLevel
  completionStreak: number
}): Promise<string> {
  const prompt = buildCelebrationPrompt({
    completedGoal: context.completedGoal,
    difficultyLevel: context.difficulty,
    completedCount: context.completionStreak,
    suggestedCount: 10,
    energyAtStart: context.userEnergy,
    hoursSinceSet: 2, // TODO: Calculate actual time
  })

  const response = await getOpenAI().chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: COMPANION_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 200,
  })

  return response.choices[0].message.content || 'Well done! You did it.'
}

/**
 * Generate rejection support response
 */
export async function generateRejectionSupport(context: {
  companyName: string
  position: string
  stage: string
  feedback?: string
  excitementLevel: 'low' | 'medium' | 'high' | 'dream_job'
  recentRejections: number
}): Promise<string> {
  const prompt = buildRejectionSupportPrompt({
    companyName: context.companyName,
    position: context.position,
    rejectionStage: context.stage,
    hasFeedback: !!context.feedback,
    feedbackContent: context.feedback,
    excitementLevel: context.excitementLevel,
    recentRejectionCount: context.recentRejections,
  })

  const response = await getOpenAI().chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: COMPANION_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 400,
  })

  return response.choices[0].message.content || "I'm sorry about this rejection. It's okay to feel disappointed."
}

/**
 * Generate follow-up email drafts
 */
export async function generateFollowUpEmail(context: {
  stage: string
  companyName: string
  position: string
  daysSinceContact: number
  recruiterName?: string
  anxiety: string
  tonePreference: string
}): Promise<{
  reassurance: string
  options: Array<{
    tone: string
    subject: string
    body: string
    reasons: string[]
  }>
}> {
  const prompt = buildFollowUpEmailPrompt({
    applicationStage: context.stage,
    companyName: context.companyName,
    position: context.position,
    daysSinceLastContact: context.daysSinceContact,
    previousInteractions: `Interview for ${context.position}`,
    userAnxiety: context.anxiety,
    tonePreference: context.tonePreference,
    recruiterName: context.recruiterName,
  })

  const response = await getOpenAI().chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: COMPANION_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  })

  const result = JSON.parse(response.choices[0].message.content || '{}')

  return {
    reassurance: result.reassurance || "Following up is completely professional. You're not being pushy.",
    options: result.toneOptions || [],
  }
}

/**
 * Generate a conversational response (general chat)
 */
export async function generateConversationalResponse(
  context: CompanionContext,
  conversationHistory: Array<{ role: 'user' | 'companion'; content: string }>
): Promise<string> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: COMPANION_SYSTEM_PROMPT },
    // Add context about the user
    {
      role: 'system',
      content: `USER CONTEXT:
- Name: ${context.userName}
- Days with you: ${context.relationshipHistory.daysWithCompanion}
- Current mood: ${context.emotionalState.mood}/10
- Energy: ${context.emotionalState.energy}
- Recent wins: ${context.recentActivity.recentWins.map(w => w.description).join(', ') || 'None recently'}
- Recent struggles: ${context.recentActivity.recentStruggles.map(s => s.concern).join(', ') || 'None mentioned'}
- Pending commitments you made: ${context.relationshipHistory.pendingCommitments.map(c => c.promise).join('; ') || 'None'}`,
    },
    // Add conversation history
    ...conversationHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.content,
    })),
  ]

  const response = await getOpenAI().chat.completions.create({
    model: MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 500,
  })

  return response.choices[0].message.content || "I'm here for you."
}

// Helper functions

function buildRecentContextSummary(context: CompanionContext): string {
  const parts: string[] = []

  if (context.recentActivity.applicationsThisWeek > 0) {
    parts.push(`Sent ${context.recentActivity.applicationsThisWeek} applications this week`)
  }

  if (context.emotionalState.recentRejections > 0) {
    parts.push(`Received ${context.emotionalState.recentRejections} rejections recently`)
  }

  if (context.recentActivity.recentWins.length > 0) {
    parts.push(`Recent win: ${context.recentActivity.recentWins[0].description}`)
  }

  if (context.relationshipHistory.pendingCommitments.length > 0) {
    parts.push(`You promised to: ${context.relationshipHistory.pendingCommitments[0].promise}`)
  }

  return parts.join('. ') || 'No recent context available.'
}

function determineTone(emotionalState: {
  mood: number
  energy: EnergyLevel
  burnoutWarning: boolean
}): string {
  if (emotionalState.burnoutWarning) return 'concerned'
  if (emotionalState.mood <= 3) return 'supportive'
  if (emotionalState.mood <= 5) return 'encouraging'
  if (emotionalState.mood >= 8) return 'celebratory'
  return 'warm'
}

/**
 * Mock companion response for development (saves API costs)
 */
export async function getMockCompanionResponse(
  message: string
): Promise<CompanionResponse> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500))

  const isBurnedOut = message.toLowerCase().includes('exhausted') ||
                      message.toLowerCase().includes('tired') ||
                      message.toLowerCase().includes('giving up')

  const isPositive = message.toLowerCase().includes('good') ||
                     message.toLowerCase().includes('excited') ||
                     message.toLowerCase().includes('got an interview')

  return {
    message: isBurnedOut
      ? "I can hear how exhausted you are. Job searching is genuinely draining, and it's okay to feel this way. Before we do anything else, let's acknowledge that you've been pushing hard. What would feel supportive right now—a small, gentle goal, or permission to rest?"
      : isPositive
      ? "That's wonderful to hear! I can feel your energy shift. Let's build on this momentum—what feels like the right next step while you're feeling good?"
      : "Thank you for sharing that with me. I'm here to walk through this with you. What's weighing on you most right now?",
    tone: isBurnedOut ? 'concerned' : isPositive ? 'celebratory' : 'supportive',
    suggestedGoal: isBurnedOut ? undefined : {
      goal: 'Review one job posting that genuinely excites you',
      reasoning: 'Reconnecting with what you actually want can restore motivation.',
      timeEstimate: '15 minutes',
      difficulty: 'small',
      type: 'reflection',
      completionCriteria: 'You found one posting that made you feel interested',
      encouragement: 'Quality over quantity. Finding the right fit matters.',
    },
    detectedMood: isBurnedOut ? 3 : isPositive ? 8 : 5,
    detectedEnergy: isBurnedOut ? 'exhausted' : isPositive ? 'energized' : 'neutral',
    emotionalKeywords: isBurnedOut ? ['exhausted', 'overwhelmed'] : isPositive ? ['hopeful', 'excited'] : ['uncertain'],
    shouldFollowUp: isBurnedOut,
    followUpTopic: isBurnedOut ? 'burnout_check' : undefined,
    celebrationDetected: isPositive,
    burnoutWarning: isBurnedOut,
  }
}

// Export type for external use
export type { CompanionContext, CompanionResponse, MicroGoal }
