/**
 * Job Search Agent Module
 *
 * Exports all job search functionality for the AI Job Search Agent.
 */

// Environment validation
export { validateJobSearchEnv } from './env'
export type { JobSearchEnv } from './env'

// Client initializers
export { getSupabaseAdmin, getGeminiClient, getResendClient } from './clients'

// Job discovery
export {
  discoverJobs,
  buildSearchQueries,
  generateContentHash,
  parseGeminiJobResponse,
} from './discover-jobs'

// Job matching/scoring
export {
  calculateMatchScore,
  calculateSkillsScore,
  calculateExperienceScore,
  calculateLocationScore,
  calculateSalaryScore,
  calculatePreferenceScore,
  generateMatchReasons,
  SKILL_RELATIONSHIPS,
} from './match-score'

// AI insights
export {
  generateSearchInsights,
  shouldRefreshInsights,
  parseKeywordsResponse,
  parseBoardsResponse,
} from './ai-insights'

// Email notifications
export {
  sendJobMatchDigest,
  sendBatchDigests,
  buildEmailHtml,
} from './email-notifications'
export type { EmailJob, SendDigestResult } from './email-notifications'
