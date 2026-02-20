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
