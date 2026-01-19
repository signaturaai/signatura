/**
 * Companion Types
 *
 * Types for the AI Companion system - emotional intelligence first.
 */

import type { EnergyLevel, GoalType, GoalDifficulty, BurnoutRiskLevel, ConfidenceTrend, ConversationType } from './database'

/**
 * Message in a companion conversation
 */
export interface CompanionMessage {
  role: 'user' | 'companion'
  content: string
  timestamp: string
  emotionalTone?: string
}

/**
 * Key insight from a conversation
 */
export interface KeyInsight {
  type: 'vulnerability' | 'breakthrough' | 'celebration' | 'concern' | 'commitment'
  quote?: string
  description: string
  importance: 'low' | 'medium' | 'high'
  useInFuture: boolean
}

/**
 * Celebration moment to reference later
 */
export interface CelebrationMoment {
  type: string
  description: string
  date: string
}

/**
 * Struggle mentioned by user
 */
export interface StruggleMentioned {
  concern: string
  quote: string
  date: string
}

/**
 * Commitment made by companion
 */
export interface CompanionCommitment {
  promise: string
  deadline?: string
  fulfilled: boolean
}

/**
 * User's emotional state at a point in time
 */
export interface EmotionalState {
  mood: number // 1-10
  energy: EnergyLevel
  burnoutRisk: number // 0-100
  burnoutLevel: BurnoutRiskLevel
  confidenceTrend: ConfidenceTrend
  recentRejections: number
  daysSinceResponse: number
}

/**
 * Context for generating companion responses
 */
export interface CompanionContext {
  userId: string
  userName: string
  currentMessage: string

  // Emotional state
  emotionalState: EmotionalState

  // Recent activity
  recentActivity: {
    applicationsThisWeek: number
    daysSinceLastApplication: number
    daysSinceLastInterview: number
    recentWins: CelebrationMoment[]
    recentStruggles: StruggleMentioned[]
  }

  // Relationship history
  relationshipHistory: {
    daysWithCompanion: number
    totalCheckins: number
    currentStreak: number
    pendingCommitments: CompanionCommitment[]
    keyQuotes: string[]
    relevantConversations: ConversationSummary[]
  }

  // Personalization
  personalization: {
    companionName: string
    responseLengthPreference: 'brief' | 'moderate' | 'detailed'
    celebrationStyle: 'subtle' | 'warm' | 'enthusiastic'
    motivationalApproach: 'empowering' | 'challenging' | 'gentle'
    usesHumor: boolean
    sensitiveTopic: string[]
  }
}

/**
 * Summary of a past conversation
 */
export interface ConversationSummary {
  id: string
  type: ConversationType
  date: string
  keyInsights: KeyInsight[]
  moodShift: number
  topicsDiscussed: string[]
}

/**
 * Generated micro-goal
 */
export interface MicroGoal {
  goal: string
  reasoning: string
  timeEstimate: string
  difficulty: GoalDifficulty
  type: GoalType
  completionCriteria: string
  encouragement: string
}

/**
 * Response from companion generation
 */
export interface CompanionResponse {
  message: string
  tone: string
  suggestedGoal?: MicroGoal
  detectedMood: number
  detectedEnergy: EnergyLevel
  emotionalKeywords: string[]
  shouldFollowUp: boolean
  followUpTopic?: string
  celebrationDetected: boolean
  burnoutWarning: boolean
}

/**
 * Daily check-in data
 */
export interface DailyCheckIn {
  id: string
  userId: string
  date: string
  moodRating: number
  energyLevel: EnergyLevel
  userMessage: string
  companionResponse: string
  suggestedGoal?: MicroGoal
  goalAccepted: boolean
  goalCompleted: boolean
  completionReflection?: string
}

/**
 * Companion personality configuration
 */
export interface CompanionPersonality {
  name: string
  traits: {
    empathy: number // 1-10
    directness: number // 1-10
    enthusiasm: number // 1-10
    humor: number // 1-10
  }
  boundaries: {
    suggestsProfessionalHelp: boolean
    respectsRestRequests: boolean
    avoidsOverwhelmingGoals: boolean
  }
}
