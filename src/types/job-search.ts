/**
 * Job Search Types
 *
 * TypeScript definitions for the AI Job Search Agent feature.
 * These types map to the job_postings table and related API structures.
 * Includes Zod schemas for runtime validation of API inputs.
 */

import { z } from 'zod'

// ============================================================================
// Database Types (match job_postings table)
// ============================================================================

export type WorkType = 'remote' | 'hybrid' | 'onsite' | 'flexible'

export type JobPostingStatus = 'new' | 'viewed' | 'applied' | 'dismissed' | 'liked'

export type UserFeedback = 'like' | 'dislike' | 'hide'

export type FeedbackReason =
  | 'Salary too low'
  | 'Wrong location'
  | 'Not interested in company'
  | 'Skills mismatch'
  | 'Other'

export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'executive'

export type CompanySize =
  | '1-10'
  | '11-50'
  | '51-200'
  | '201-500'
  | '501-1000'
  | '1000+'

export type SourcePlatform =
  | 'LinkedIn'
  | 'Indeed'
  | 'Glassdoor'
  | 'Wellfound'
  | 'Company Website'
  | 'Other'

/**
 * Match breakdown showing how the match score was calculated
 * Total should equal match_score (0-100)
 */
export interface MatchBreakdown {
  skills: number // Max ~36 points
  experience: number // Max ~20 points
  location: number // Max ~12 points
  salary: number // Max ~15 points
  preferences: number // Max ~9 points
  behavioral?: number // Max ~8 points (from past application patterns)
}

/**
 * Database row structure for job_postings table
 */
export interface JobPostingRow {
  id: string
  user_id: string

  // Job details
  title: string
  company_name: string
  company_logo_url: string | null
  description: string | null
  location: string | null
  work_type: WorkType | null
  experience_level: ExperienceLevel | null

  // Compensation
  salary_min: number | null
  salary_max: number | null
  salary_currency: string

  // Structured data
  required_skills: string[]
  benefits: string[]

  // Company info
  company_size: CompanySize | null

  // Source tracking
  source_url: string | null
  source_platform: SourcePlatform | null
  posted_date: string | null
  discovered_at: string

  // Matching
  match_score: number
  match_breakdown: MatchBreakdown | null
  match_reasons: string[]

  // User interaction
  status: JobPostingStatus
  user_feedback: UserFeedback | null
  feedback_reason: FeedbackReason | null
  discarded_until: string | null

  // Links
  job_application_id: string | null

  // Deduplication
  content_hash: string | null

  // Timestamps
  created_at: string
  updated_at: string
}

// ============================================================================
// API Types
// ============================================================================

/**
 * Job posting as returned by the API (with computed fields)
 */
export interface JobPosting extends JobPostingRow {
  // Computed convenience fields
  salaryRange: string | null // e.g., "$120k - $180k USD"
  daysAgo: number // Days since posted_date
  isNew: boolean // Discovered within last 24 hours
  matchTier: 'excellent' | 'great' | 'good' // 90+, 80-89, 75-79
}

/**
 * Minimal job posting for list views
 */
export interface JobPostingSummary {
  id: string
  title: string
  company_name: string
  company_logo_url: string | null
  location: string | null
  work_type: WorkType | null
  match_score: number
  match_reasons: string[]
  salaryRange: string | null
  status: JobPostingStatus
  user_feedback: UserFeedback | null
  discovered_at: string
  isNew: boolean
}

/**
 * Request to update job posting status/feedback
 */
export interface JobPostingUpdateRequest {
  status?: JobPostingStatus
  user_feedback?: UserFeedback | null
  feedback_reason?: FeedbackReason | null
  job_application_id?: string | null
}

/**
 * Job discovery request (for manual refresh)
 */
export interface JobDiscoveryRequest {
  forceRefresh?: boolean
  maxJobs?: number
}

/**
 * Job discovery response
 */
export interface JobDiscoveryResponse {
  discovered: number
  matched: number // Jobs with ≥75% match
  stored: number // Jobs stored (≥65%)
  discarded: number // Jobs <65% (not stored)
  newMatches: JobPostingSummary[]
}

// ============================================================================
// Search Preferences Types
// ============================================================================

export interface SalaryRange {
  min: number
  max: number | null
  currency: string
}

export interface LocationPreference {
  city?: string
  state?: string
  country: string
  remoteOk: boolean
  hybridOk: boolean
  willingToRelocate: boolean
}

// ============================================================================
// Job Search Preferences Types (match job_search_preferences table)
// ============================================================================

export type ExperienceYears = '0-2' | '2-5' | '5-10' | '10+'

export type SkillProficiency = 'beginner' | 'intermediate' | 'expert'

export type EmailNotificationFrequency = 'daily' | 'weekly' | 'monthly' | 'disabled'

/**
 * Skill with proficiency level
 */
export interface SkillRequirement {
  skill: string
  proficiency: SkillProficiency
}

/**
 * AI-learned implicit preferences from user feedback patterns
 */
export interface ImplicitPreferences {
  salary_adjustment?: number // Percentage adjustment e.g., +10
  remote_bias?: number // 0-1 preference for remote
  preferred_industries?: string[]
  avoided_industries?: string[]
  preferred_company_sizes?: CompanySize[]
  title_preferences?: string[]
  [key: string]: unknown // Allow additional learned preferences
}

/**
 * Feedback statistics for learning algorithm
 */
export interface PreferencesFeedbackStats {
  total_likes: number
  total_dislikes: number
  total_hides: number
  reasons: Record<string, number> // reason -> count
}

/**
 * Database row structure for job_search_preferences table
 */
export interface JobSearchPreferencesRow {
  id: string
  user_id: string
  is_active: boolean

  // Explicit Search Filters
  preferred_job_titles: string[]
  preferred_locations: string[]
  experience_years: ExperienceYears | null
  required_skills: SkillRequirement[]
  company_size_preferences: CompanySize[]
  remote_policy_preferences: WorkType[]
  required_benefits: string[]
  salary_min_override: number | null
  salary_currency_override: string | null
  avoid_companies: string[]
  avoid_keywords: string[]

  // AI-Generated Search Intelligence
  ai_keywords: string[]
  ai_recommended_boards: string[]
  ai_market_insights: string | null
  ai_personalized_strategy: string | null
  ai_last_analysis_at: string | null

  // Implicit/Learned Preferences
  implicit_preferences: ImplicitPreferences
  feedback_stats: PreferencesFeedbackStats

  // Notification Settings
  email_notification_frequency: EmailNotificationFrequency
  last_email_sent_at: string | null
  last_search_at: string | null
  consecutive_zero_match_days: number

  // Timestamps
  created_at: string
  updated_at: string
}

/**
 * API request to update job search preferences
 */
export interface JobSearchPreferencesUpdateRequest {
  is_active?: boolean
  preferred_job_titles?: string[]
  preferred_locations?: string[]
  experience_years?: ExperienceYears | null
  required_skills?: SkillRequirement[]
  company_size_preferences?: CompanySize[]
  remote_policy_preferences?: WorkType[]
  required_benefits?: string[]
  salary_min_override?: number | null
  salary_currency_override?: string | null
  avoid_companies?: string[]
  avoid_keywords?: string[]
  email_notification_frequency?: EmailNotificationFrequency
}

/**
 * Legacy interface for backwards compatibility
 * @deprecated Use JobSearchPreferencesRow instead
 */
export interface JobSearchPreferences extends JobSearchPreferencesRow {}

// ============================================================================
// AI Insights Types
// ============================================================================

/**
 * AI-generated market insights for the user
 */
export interface MarketInsights {
  // Keyword analysis
  trending_skills: Array<{
    skill: string
    demand_change: 'rising' | 'stable' | 'declining'
    frequency: number // How often it appears in matched jobs
  }>

  // Market positioning
  market_position: {
    match_rate: number // Percentage of discovered jobs that match ≥75%
    average_match_score: number
    top_matching_companies: string[]
    top_matching_titles: string[]
  }

  // Recommendations
  skill_gaps: string[] // Skills frequently required but user doesn't have
  salary_insights: {
    market_average: number
    user_target: number
    percentile: number // Where user's target falls in market
  } | null

  // Trends
  job_volume_trend: 'increasing' | 'stable' | 'decreasing'
  last_updated: string
}

// ============================================================================
// Profile Job Search Fields (added to profiles table for Job Search Agent)
// ============================================================================

/**
 * Cached AI analysis of the user's base CV
 */
export interface GeneralCvAnalysis {
  skills: string[]
  experience_years: number
  industries: string[]
  seniority_level: ExperienceLevel | string
  key_achievements?: string[]
  education?: string[]
  certifications?: string[]
}

/**
 * Structured location preferences on profile
 */
export interface ProfileLocationPreferences {
  city?: string
  remote_policy?: WorkType
}

/**
 * Job search related fields on the profiles table
 */
export interface ProfileJobSearchFields {
  preferred_job_titles: string[]
  preferred_industries: string[]
  minimum_salary_expectation: number | null
  salary_currency: string
  location_preferences: ProfileLocationPreferences
  company_size_preferences: CompanySize[]
  career_goals: string | null
  general_cv_analysis: GeneralCvAnalysis | null
}

/**
 * Feedback aggregation for learning
 */
export interface FeedbackStats {
  total_jobs_shown: number
  liked: number
  disliked: number
  hidden: number
  applied: number
  average_liked_score: number
  average_disliked_score: number
  common_dislike_reasons: Array<{
    reason: FeedbackReason
    count: number
  }>
  // Patterns learned
  preferred_companies: string[]
  avoided_companies: string[]
  preferred_salary_range: SalaryRange | null
}

// ============================================================================
// Pipeline Types (used between discovery and storage)
// ============================================================================

/**
 * Raw job data from Gemini before scoring — no user-specific fields
 */
export interface DiscoveredJob {
  title: string
  company_name: string
  company_logo_url?: string | null
  description?: string | null
  location?: string | null
  work_type?: WorkType | null
  experience_level?: ExperienceLevel | null
  salary_min?: number | null
  salary_max?: number | null
  salary_currency?: string
  required_skills: string[]
  benefits: string[]
  company_size?: CompanySize | null
  source_url: string
  source_platform?: SourcePlatform | null
  posted_date?: string | null
  content_hash?: string | null
}

/**
 * Scoring output from the match algorithm
 */
export interface MatchResult {
  totalScore: number // 0-100
  breakdown: MatchBreakdown
  matchReasons: string[] // Human-readable reasons for the match
  passesThreshold: boolean // totalScore >= 75
  isBorderline: boolean // totalScore >= 65 && totalScore < 75
}

/**
 * AI-generated search intelligence for a user's preferences
 */
export interface SearchInsights {
  keywords: string[]
  recommendedBoards: Array<{
    name: string
    url: string
    reason: string
  }>
  marketInsights: string
  personalizedStrategy: string
  generatedAt: string // ISO 8601 timestamp
}

/**
 * API request to submit feedback on a job posting
 */
export interface FeedbackRequest {
  jobPostingId: string
  feedback: UserFeedback
  reason?: FeedbackReason | null
}

/**
 * Subset of preferences used for active job filtering
 */
export interface JobSearchFilters {
  job_titles?: string[]
  locations?: string[]
  work_types?: WorkType[]
  experience_level?: ExperienceLevel | null
  salary_min?: number | null
  salary_currency?: string
  company_sizes?: CompanySize[]
  required_skills?: string[]
  avoid_companies?: string[]
  avoid_keywords?: string[]
}

// ============================================================================
// Zod Schemas (runtime validation for API inputs)
// ============================================================================

export const WorkTypeSchema = z.enum(['remote', 'hybrid', 'onsite', 'flexible'])

export const JobPostingStatusSchema = z.enum(['new', 'viewed', 'applied', 'dismissed', 'liked'])

export const UserFeedbackSchema = z.enum(['like', 'dislike', 'hide'])

export const FeedbackReasonSchema = z.enum([
  'Salary too low',
  'Wrong location',
  'Not interested in company',
  'Skills mismatch',
  'Other',
])

export const ExperienceLevelSchema = z.enum(['entry', 'mid', 'senior', 'executive'])

export const CompanySizeSchema = z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'])

export const SourcePlatformSchema = z.enum([
  'LinkedIn',
  'Indeed',
  'Glassdoor',
  'Wellfound',
  'Company Website',
  'Other',
])

export const ExperienceYearsSchema = z.enum(['0-2', '2-5', '5-10', '10+'])

export const SkillProficiencySchema = z.enum(['beginner', 'intermediate', 'expert'])

export const EmailNotificationFrequencySchema = z.enum(['daily', 'weekly', 'monthly', 'disabled'])

export const MatchBreakdownSchema = z.object({
  skills: z.number(),
  experience: z.number(),
  location: z.number(),
  salary: z.number(),
  preferences: z.number(),
  behavioral: z.number().optional(),
})

export const SkillRequirementSchema = z.object({
  skill: z.string().min(1),
  proficiency: SkillProficiencySchema,
})

/** Zod schema for JobPostingUpdateRequest */
export const JobPostingUpdateRequestSchema = z.object({
  status: JobPostingStatusSchema.optional(),
  user_feedback: UserFeedbackSchema.nullish(),
  feedback_reason: FeedbackReasonSchema.nullish(),
  job_application_id: z.string().uuid().nullish(),
})

/** Zod schema for JobDiscoveryRequest */
export const JobDiscoveryRequestSchema = z.object({
  forceRefresh: z.boolean().optional(),
  maxJobs: z.number().int().min(1).max(100).optional(),
})

/** Zod schema for JobSearchPreferencesUpdateRequest */
export const JobSearchPreferencesUpdateRequestSchema = z.object({
  is_active: z.boolean().optional(),
  preferred_job_titles: z.array(z.string().min(1)).optional(),
  preferred_locations: z.array(z.string().min(1)).optional(),
  experience_years: ExperienceYearsSchema.nullish(),
  required_skills: z.array(SkillRequirementSchema).optional(),
  company_size_preferences: z.array(CompanySizeSchema).optional(),
  remote_policy_preferences: z.array(WorkTypeSchema).optional(),
  required_benefits: z.array(z.string().min(1)).optional(),
  salary_min_override: z.number().min(0).nullish(),
  salary_currency_override: z.string().length(3).nullish(),
  avoid_companies: z.array(z.string().min(1)).optional(),
  avoid_keywords: z.array(z.string().min(1)).optional(),
  email_notification_frequency: EmailNotificationFrequencySchema.optional(),
})

/** Zod schema for FeedbackRequest */
export const FeedbackRequestSchema = z.object({
  jobPostingId: z.string().uuid(),
  feedback: UserFeedbackSchema,
  reason: FeedbackReasonSchema.nullish(),
})

/** Zod schema for JobSearchFilters */
export const JobSearchFiltersSchema = z.object({
  job_titles: z.array(z.string().min(1)).optional(),
  locations: z.array(z.string().min(1)).optional(),
  work_types: z.array(WorkTypeSchema).optional(),
  experience_level: ExperienceLevelSchema.nullish(),
  salary_min: z.number().min(0).nullish(),
  salary_currency: z.string().length(3).optional(),
  company_sizes: z.array(CompanySizeSchema).optional(),
  required_skills: z.array(z.string().min(1)).optional(),
  avoid_companies: z.array(z.string().min(1)).optional(),
  avoid_keywords: z.array(z.string().min(1)).optional(),
})

/** Zod schema for DiscoveredJob */
export const DiscoveredJobSchema = z.object({
  title: z.string().min(1),
  company_name: z.string().min(1),
  company_logo_url: z.string().url().nullish(),
  description: z.string().nullish(),
  location: z.string().nullish(),
  work_type: WorkTypeSchema.nullish(),
  experience_level: ExperienceLevelSchema.nullish(),
  salary_min: z.number().min(0).nullish(),
  salary_max: z.number().min(0).nullish(),
  salary_currency: z.string().length(3).optional(),
  required_skills: z.array(z.string()),
  benefits: z.array(z.string()),
  company_size: CompanySizeSchema.nullish(),
  source_url: z.string().url(),
  source_platform: SourcePlatformSchema.nullish(),
  posted_date: z.string().nullish(),
  content_hash: z.string().nullish(),
})

/** Zod schema for MatchResult */
export const MatchResultSchema = z.object({
  totalScore: z.number().min(0).max(100),
  breakdown: MatchBreakdownSchema,
  matchReasons: z.array(z.string()),
  passesThreshold: z.boolean(),
  isBorderline: z.boolean(),
})
