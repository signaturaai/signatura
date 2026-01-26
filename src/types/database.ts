/**
 * Supabase Database Types
 *
 * These types are generated from the database schema.
 * Run `supabase gen types typescript` to regenerate after schema changes.
 *
 * For now, we define the core types manually based on database-schema-emotional-core.sql
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type EnergyLevel = 'burned_out' | 'exhausted' | 'low' | 'neutral' | 'good' | 'energized' | 'excited'
export type GoalType = 'application' | 'rest' | 'preparation' | 'reflection' | 'celebration'
export type GoalDifficulty = 'tiny' | 'small' | 'medium'
export type ConfidenceTrend = 'increasing' | 'stable' | 'declining' | 'volatile'
export type BurnoutRiskLevel = 'low' | 'moderate' | 'high' | 'severe'
export type ConversationType = 'daily_checkin' | 'cv_session' | 'interview_debrief' | 'compensation_talk' | 'contract_review' | 'rejection_support' | 'celebration' | 'burnout_intervention'
export type ApplicationStatus = 'prepared' | 'applied' | 'interview_scheduled' | 'interviewed' | 'offer_received' | 'negotiating' | 'accepted' | 'rejected' | 'withdrawn'
export type PriorityLevel = 'low' | 'medium' | 'high' | 'dream_job'
export type AnonymizationLevel = 'none' | 'partial' | 'full'
export type VisibilityMode = 'hidden' | 'visible' | 'paused'

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          full_name: string | null
          email: string
          linkedin_url: string | null
          personal_website_url: string | null
          current_job_title: string | null
          profile_image: string | null
          base_cv_url: string | null
          base_cv_uploaded_at: string | null
          base_cv_last_updated: string | null
          role: 'candidate' | 'recruiter' | 'admin'
          is_active: boolean
          onboarding_completed: boolean
          onboarding_completed_at: string | null
          onboarding_step: number
          preferences: Json
          notification_settings: Json
          days_with_companion: number
          total_checkins: number
          current_streak: number
          longest_streak: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          email: string
          linkedin_url?: string | null
          personal_website_url?: string | null
          current_job_title?: string | null
          profile_image?: string | null
          base_cv_url?: string | null
          role?: 'candidate' | 'recruiter' | 'admin'
          is_active?: boolean
          onboarding_completed?: boolean
          onboarding_step?: number
          preferences?: Json
          notification_settings?: Json
        }
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>
      }

      user_emotional_context: {
        Row: {
          id: string
          user_id: string
          date: string
          time_of_checkin: string | null
          greeting_type: string | null
          mood_rating: number | null
          energy_level: EnergyLevel | null
          user_message: string
          emotional_keywords: Json | null
          ai_validation_response: string
          response_tone: string | null
          referenced_past_moment: boolean
          suggested_micro_goal: string | null
          goal_type: GoalType | null
          goal_difficulty: GoalDifficulty | null
          user_accepted_goal: boolean
          goal_completed: boolean
          completion_time: string | null
          completion_reflection: string | null
          days_since_last_application: number | null
          days_since_last_response: number | null
          days_since_last_interview: number | null
          rejection_count_this_week: number | null
          rejection_count_total: number | null
          applications_this_week: number | null
          celebration_moments: Json
          struggles_mentioned: Json
          burnout_risk_score: number | null
          burnout_risk_level: BurnoutRiskLevel | null
          confidence_trend: ConfidenceTrend | null
          energy_trend_7day: number | null
          companion_observations: string | null
          follow_up_needed: boolean
          follow_up_topic: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          mood_rating?: number | null
          energy_level?: EnergyLevel | null
          user_message: string
          ai_validation_response: string
          suggested_micro_goal?: string | null
          goal_type?: GoalType | null
          goal_difficulty?: GoalDifficulty | null
        }
        Update: Partial<Database['public']['Tables']['user_emotional_context']['Insert']>
      }

      companion_conversations: {
        Row: {
          id: string
          user_id: string
          conversation_type: ConversationType
          messages: Json
          duration_minutes: number | null
          message_count: number | null
          user_engagement_score: number | null
          key_insights: Json
          breakthrough_moments: Json
          vulnerability_shared: Json
          celebrations_noted: Json
          topics_discussed: Json
          skills_mentioned: Json
          companies_mentioned: Json
          starting_mood: number | null
          ending_mood: number | null
          mood_shift: number | null
          commitments_made: Json
          user_personality_traits: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          conversation_type: ConversationType
          messages: Json
          key_insights?: Json
          topics_discussed?: Json
        }
        Update: Partial<Database['public']['Tables']['companion_conversations']['Insert']>
      }

      companion_personalization: {
        Row: {
          id: string
          user_id: string
          preferred_companion_name: string
          communication_frequency: string
          preferred_checkin_time: string | null
          timezone: string
          response_length_preference: string | null
          uses_humor: boolean
          appreciation_for_directness: number
          comfortable_topics: Json
          sensitive_topics: Json
          celebration_style: string
          acknowledges_small_wins: boolean
          motivational_approach: string
          responds_well_to_data: boolean
          remind_about_breaks: boolean
          intervene_on_burnout: boolean
          maximum_daily_goals: number
          personality_profile: Json
          communication_patterns: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          preferred_companion_name?: string
          communication_frequency?: string
          timezone?: string
        }
        Update: Partial<Database['public']['Tables']['companion_personalization']['Insert']>
      }

      job_applications: {
        Row: {
          id: string
          user_id: string
          company_name: string
          position_title: string
          job_url: string | null
          job_description: string | null
          location: string | null
          application_date: string
          application_url: string | null
          application_method: string | null
          application_status: ApplicationStatus
          status_updated_at: string | null
          salary_range: string | null
          salary_min: number | null
          salary_max: number | null
          salary_currency: string
          recruiter_name: string | null
          recruiter_email: string | null
          recruiter_phone: string | null
          referral_name: string | null
          referral_email: string | null
          referral_relationship: string | null
          hiring_manager_name: string | null
          notes: string | null
          application_notes: string | null
          user_excitement_level: number | null
          priority_level: PriorityLevel | null
          session_connections: Json
          tailored_cv_url: string | null
          cover_letter_url: string | null
          interview_schedule: Json
          interview_prep_notes: string | null
          compensation_context: Json | null
          compensation_analysis: Json | null
          compensation_feedback: Json | null
          offer_details: Json | null
          contract_analysis: Json | null
          contract_signed: boolean
          follow_up: Json
          auto_tracked: boolean
          tracking_confirmed: boolean
          auto_track_source: string | null
          auto_track_confidence: number | null
          outcome: string | null
          outcome_date: string | null
          outcome_notes: string | null
          companion_first_mention: string | null
          companion_last_discussed: string | null
          companion_celebration_sent: boolean
          companion_support_provided: Json
          created_at: string
          updated_at: string
          created_by: string
        }
        Insert: {
          id?: string
          user_id: string
          company_name: string
          position_title: string
          created_by: string
          application_status?: ApplicationStatus
          priority_level?: PriorityLevel | null
          job_url?: string | null
          job_description?: string | null
          location?: string | null
          notes?: string | null
          user_excitement_level?: number | null
          salary_min?: number | null
          salary_max?: number | null
          salary_currency?: string
          recruiter_name?: string | null
          recruiter_email?: string | null
          referral_name?: string | null
          referral_email?: string | null
          hiring_manager_name?: string | null
        }
        Update: Partial<Database['public']['Tables']['job_applications']['Insert']>
      }

      candidate_visibility_settings: {
        Row: {
          id: string
          user_id: string
          visible_in_talent_pool: boolean
          visibility_enabled_at: string | null
          visibility_paused: boolean
          pause_reason: string | null
          pause_until: string | null
          show_full_name: boolean
          show_contact_info: boolean
          show_email: boolean
          show_phone: boolean
          show_linkedin: boolean
          show_current_employer: boolean
          show_work_history_dates: boolean
          show_education_dates: boolean
          show_exact_location: boolean
          show_salary_expectations: boolean
          show_availability_date: boolean
          share_full_cv: boolean
          share_anonymized_cv: boolean
          share_skills_only: boolean
          anonymization_level: AnonymizationLevel
          anonymized_name: string | null
          anonymized_identifier: string | null
          only_verified_recruiters: boolean
          only_premium_companies: boolean
          minimum_company_rating: number | null
          blocked_companies: Json
          blocked_recruiters: Json
          blocked_industries: Json
          allowed_companies: Json
          allowed_industries: Json
          notify_on_profile_view: boolean
          notify_on_match_request: boolean
          notify_on_message: boolean
          notification_frequency: string
          readiness_headline: string | null
          readiness_statement: string | null
          available_from: string | null
          open_to_relocation: boolean
          open_to_remote: boolean
          preferred_work_arrangement: string | null
          visibility_change_history: Json
          last_updated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          visible_in_talent_pool?: boolean
          anonymization_level?: AnonymizationLevel
        }
        Update: Partial<Database['public']['Tables']['candidate_visibility_settings']['Insert']>
      }

      application_follow_ups: {
        Row: {
          id: string
          user_id: string
          job_application_id: string
          application_stage: string
          days_since_last_contact: number | null
          days_since_application: number | null
          previous_follow_ups_count: number
          follow_up_type: string
          user_anxiety_level: number | null
          user_concern: string | null
          companion_encouragement: string | null
          draft_subject: string | null
          draft_body: string | null
          tone_options: Json | null
          selected_tone: string | null
          user_customized: boolean
          customization_level: string | null
          ready_to_send: boolean
          sent_at: string | null
          sent_method: string | null
          recipient_email: string | null
          recipient_name: string | null
          email_opened: boolean | null
          opened_at: string | null
          open_count: number
          response_received: boolean
          response_at: string | null
          response_type: string | null
          response_summary: string | null
          response_sentiment_score: number | null
          companion_debrief: string | null
          next_suggested_action: string | null
          led_to_interview: boolean | null
          led_to_response: boolean | null
          improved_status: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          job_application_id: string
          application_stage: string
          follow_up_type: string
        }
        Update: Partial<Database['public']['Tables']['application_follow_ups']['Insert']>
      }
      // Allow access to tables not yet fully typed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: any
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
