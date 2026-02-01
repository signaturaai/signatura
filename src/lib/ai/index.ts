/**
 * AI Module Exports
 *
 * The emotional intelligence core of Signatura.
 */

// Companion - The main AI interaction module
export {
  detectEmotionalState,
  generateCheckInResponse,
  generateMicroGoal,
  generateCelebration,
  generateRejectionSupport,
  generateFollowUpEmail,
  generateConversationalResponse,
  getMockCompanionResponse,
  type CompanionContext,
  type CompanionResponse,
  type MicroGoal,
} from './companion'

// Context - Retrieves user context for personalized responses
export {
  getCompanionContext,
  getTopicContext,
  getPendingFollowUps,
  getBurnoutRisk,
} from './context'

// Memory - Stores and retrieves conversation history
export {
  storeConversation,
  addMessageToConversation,
  storeDailyContext,
  markGoalCompleted,
  storeKeyInsight,
  fulfillCommitment,
  getUnfulfilledCommitments,
  searchMemory,
} from './memory'

// Prompts - The emotional intelligence prompts
export {
  COMPANION_SYSTEM_PROMPT,
  buildDailyCheckInPrompt,
  buildMoodResponsePrompt,
  buildMicroGoalPrompt,
  buildCelebrationPrompt,
  buildRejectionSupportPrompt,
  buildFollowUpEmailPrompt,
  buildContextRetrievalPrompt,
} from './prompts'

// PM Intelligence - Senior PM coaching brain for CV Tailor and Interview Coach
export {
  PM_CORE_PRINCIPLES,
  PM_FRAMEWORKS,
  PM_COACHING_CONTEXTS,
  getPrinciplesForContext,
  analyzeWithPMPrinciples,
  generateSiggyPMContext,
  type PMPrinciple,
  type PMFramework,
} from './siggy-pm-intelligence'

// PM Integration Guide - System prompt generation and content analysis
export {
  generateSiggySystemPrompt,
  analyzePMContent,
  getCoachingPrompt,
} from './siggy-integration-guide'
