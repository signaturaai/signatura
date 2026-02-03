/**
 * Dashboard Types
 *
 * TypeScript interfaces matching Supabase schema for job applications and CV versions.
 * Used for type-safe data handling across the dashboard.
 */

// Application status enum matching database CHECK constraint
export type ApplicationStatus =
  | 'prepared'
  | 'applied'
  | 'interview_scheduled'
  | 'interviewed'
  | 'offer_received'
  | 'negotiating'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'

// Priority level enum
export type PriorityLevel = 'low' | 'medium' | 'high' | 'dream_job'

// CV submission status
export type CVSubmissionStatus = 'draft' | 'prepared' | 'submitted' | 'accepted' | 'rejected'

// CV tailoring mode
export type TailoringMode = 'none' | 'light' | 'moderate' | 'heavy' | 'custom'

/**
 * JobApplication interface
 * Matches the job_applications table in Supabase
 */
export interface JobApplication {
  id: string
  user_id: string

  // Basic info
  company_name: string
  position_title: string
  job_url?: string | null
  job_description?: string | null
  location?: string | null

  // Application details
  application_date: string // ISO timestamp
  application_url?: string | null
  application_method?: 'company_website' | 'linkedin' | 'email' | 'other' | null

  // Status
  application_status: ApplicationStatus
  status_updated_at?: string | null

  // Salary & compensation
  salary_range?: string | null
  salary_min?: number | null
  salary_max?: number | null
  salary_currency?: string

  // People
  recruiter_name?: string | null
  recruiter_email?: string | null
  recruiter_phone?: string | null
  referral_name?: string | null
  referral_email?: string | null
  referral_relationship?: string | null
  hiring_manager_name?: string | null

  // Notes and context
  notes?: string | null
  application_notes?: string | null
  user_excitement_level?: number | null // 1-5
  priority_level?: PriorityLevel | null

  // Enhanced fields from migration 003
  cv_version_id?: string | null
  excitement_level?: number | null // 1-10
  priority?: 'high' | 'medium' | 'low' | null
  source?: string | null
  industry?: string | null

  // Session connections
  session_connections?: {
    cv_completed: boolean
    interview_completed: boolean
    compensation_completed: boolean
    contract_completed: boolean
  }

  // Linked resources
  tailored_cv_url?: string | null
  cover_letter_url?: string | null

  // Interview tracking
  interview_schedule?: Array<{
    type: string
    date: string
    interviewers: string[]
    notes: string
  }>
  interview_prep_notes?: string | null

  // Compensation tracking
  compensation_context?: Record<string, unknown> | null
  compensation_analysis?: Record<string, unknown> | null
  compensation_feedback?: Record<string, unknown> | null
  offer_details?: Record<string, unknown> | null

  // Contract tracking
  contract_analysis?: Record<string, unknown> | null
  contract_signed?: boolean

  // Follow-up system
  follow_up?: {
    scheduled_date: string | null
    status: string
    email_draft: string
    last_follow_up_date: string | null
    follow_up_count: number
    next_follow_up_suggested: string | null
  }

  // Outcome
  outcome?: 'accepted' | 'rejected' | 'withdrawn' | 'offer_declined' | null
  outcome_date?: string | null
  outcome_notes?: string | null

  // Companion integration
  companion_first_mention?: string | null
  companion_last_discussed?: string | null
  companion_celebration_sent?: boolean
  companion_support_provided?: Array<{
    type: string
    date: string
    message: string
  }>

  // Timestamps
  created_at: string
  updated_at: string
  created_by: string
}

/**
 * CVVersion interface
 * Matches the cv_versions table in Supabase
 */
export interface CVVersion {
  id: string
  user_id: string
  job_application_id?: string | null

  // Version info
  version_name: string
  is_base_cv: boolean
  version_number: number

  // Files
  original_cv_url: string
  tailored_cv_url?: string | null

  // Tailoring context
  job_description?: string | null
  company_name?: string | null
  position_title?: string | null
  tailoring_mode?: TailoringMode | null

  // AI analysis
  tailoring_suggestions?: string | null
  gap_filling_qa?: Record<string, unknown> | null
  transferable_skills_analysis?: Record<string, unknown> | null

  // Scoring (10-indicator framework)
  initial_scores?: Record<string, number> | null
  final_scores?: Record<string, number> | null
  score_improvement?: number | null

  // Status
  submission_status: CVSubmissionStatus

  // Analysis metadata
  analysis?: Record<string, unknown> | null
  ats_compatibility_score?: number | null // 0-100
  keyword_match_percentage?: number | null

  // Enhanced fields from migration 003
  application_id?: string | null
  base_cv_id?: string | null
  indicator_scores_before?: Record<string, unknown> | null
  indicator_scores_after?: Record<string, unknown> | null

  // Companion celebration
  companion_celebrated_completion?: boolean
  companion_highlighted_improvements?: Record<string, unknown> | null

  // Timestamps
  created_at: string
  updated_at: string
  created_by: string
}

/**
 * Dashboard metrics summary
 */
export interface DashboardMetrics {
  totalApplications: number
  activeApplications: number
  interviewsScheduled: number
  cvVersions: number
  offersReceived: number
  acceptanceRate: number
  contentMatchPercent: number
  narrativeMatchPercent: number
}

/**
 * Activity item for recent activity feed
 */
export interface ActivityItem {
  id: string
  type: 'application' | 'interview' | 'cv_update' | 'status_change' | 'offer'
  title: string
  description: string
  timestamp: string
  applicationId?: string
  status?: ApplicationStatus
  icon?: string
  color?: string
}

/**
 * Quick action configuration
 */
export interface QuickAction {
  id: string
  label: string
  description: string
  href: string
  icon: string
  color: string
  bgColor: string
}
