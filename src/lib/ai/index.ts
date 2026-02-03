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

// PM Integration Guide - System prompt generation, content analysis, Score Arbiter, and Gap Filling
export {
  generateSiggySystemPrompt,
  analyzePMContent,
  getCoachingPrompt,
  analyzeIndicators,
  analyzeATS,
  analyzeRecruiterUX,
  analyzePMStage,
  analyzeCVContent,
  arbitrateBullet,
  scoreArbiter,
  isProductRole,
  getWeightsForRole,
  identifyGaps,
  draftGapAnswer,
  analyzeIndicatorDetail,
  extractJobKeywords,
  findKeywordMatches,
  detectGapClosures,
  analyzeTailoringPair,
  generateApplicationStrategy,
  STAGE_WEIGHTS,
  PM_SPECIALIST_WEIGHTS,
  GENERAL_PROFESSIONAL_WEIGHTS,
  type StageScore,
  type StageDropDetail,
  type WeightProfile,
  type FourStageAnalysis,
  type ArbiterDecision,
  type ArbiterResult,
  type GapQuestion,
  type GapAnalysisResult,
  type SubIndicator,
  type EvidenceHighlight,
  type IndicatorDetail,
  type KeywordMatch,
  type GapClosure,
  type TailoringAnalysis,
  type StrategicPillar,
  type TalkingPoint,
  type ApplicationStrategy,
} from './siggy-integration-guide'
