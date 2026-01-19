-- ============================================================================
-- SIGNATURA AI CAREER COMPANION - DATABASE SCHEMA
-- Emotional Intelligence Core Architecture
-- ============================================================================
-- 
-- PHILOSOPHY:
-- This is not a job search database. This is a companion relationship database.
-- Every table exists to support the ongoing emotional connection between
-- user and AI companion.
--
-- Priority order:
-- 1. Emotional context and memory
-- 2. User empowerment and control
-- 3. Communication and connection
-- 4. Job search tools (as touchpoints)
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";  -- For AI embeddings and memory
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- ============================================================================
-- TIER 1: EMOTIONAL FOUNDATION (The Companion Relationship)
-- ============================================================================

-- ============================================
-- Daily Companion: Emotional State Tracking
-- ============================================

-- User's emotional journey over time
CREATE TABLE user_emotional_context (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  
  -- Morning check-in
  time_of_checkin TIME,
  greeting_type TEXT, -- "morning", "afternoon", "evening"
  
  -- User's emotional state
  mood_rating INTEGER CHECK (mood_rating BETWEEN 1 AND 10),
  energy_level TEXT CHECK (energy_level IN ('burned_out', 'exhausted', 'low', 'neutral', 'good', 'energized', 'excited')),
  user_message TEXT NOT NULL, -- What the user actually said
  emotional_keywords JSONB, -- Extracted emotions: ["anxious", "hopeful", "frustrated"]
  
  -- Companion's response
  ai_validation_response TEXT NOT NULL, -- The empathetic response
  response_tone TEXT, -- "supportive", "celebratory", "concerned", "encouraging"
  referenced_past_moment BOOLEAN DEFAULT false, -- Did AI reference previous conversations?
  
  -- Micro-goal system
  suggested_micro_goal TEXT,
  goal_type TEXT, -- "application", "rest", "preparation", "reflection", "celebration"
  goal_difficulty TEXT, -- "tiny", "small", "medium"
  user_accepted_goal BOOLEAN DEFAULT false,
  goal_completed BOOLEAN DEFAULT false,
  completion_time TIMESTAMP WITH TIME ZONE,
  completion_reflection TEXT,
  
  -- Context awareness (what companion knows about user's situation)
  days_since_last_application INTEGER,
  days_since_last_response INTEGER,
  days_since_last_interview INTEGER,
  rejection_count_this_week INTEGER,
  rejection_count_total INTEGER,
  applications_this_week INTEGER,
  
  -- Celebration moments (things to reference later)
  celebration_moments JSONB DEFAULT '[]', -- [{type: "goal_completed", description: "...", date: "..."}]
  struggles_mentioned JSONB DEFAULT '[]', -- [{concern: "imposter_syndrome", quote: "I don't think I'm qualified"}]
  
  -- Long-term emotional patterns
  burnout_risk_score INTEGER CHECK (burnout_risk_score BETWEEN 0 AND 100),
  burnout_risk_level TEXT, -- "low", "moderate", "high", "severe"
  confidence_trend TEXT, -- "increasing", "stable", "declining", "volatile"
  energy_trend_7day NUMERIC(3,2), -- Average energy over last week
  
  -- Companion's notes (for future reference)
  companion_observations TEXT, -- AI's internal notes about user's state
  follow_up_needed BOOLEAN DEFAULT false,
  follow_up_topic TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  UNIQUE(user_id, date)
);

CREATE INDEX idx_emotional_context_user_date ON user_emotional_context(user_id, date DESC);
CREATE INDEX idx_emotional_context_burnout ON user_emotional_context(user_id, burnout_risk_score DESC) 
  WHERE burnout_risk_score > 60;
CREATE INDEX idx_emotional_context_energy ON user_emotional_context(user_id, energy_level);

-- ============================================
-- Companion Conversations: Memory System
-- ============================================

-- Every meaningful conversation the companion has
CREATE TABLE companion_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_type TEXT NOT NULL, 
  -- Types: "daily_checkin", "cv_session", "interview_debrief", "compensation_talk", 
  --        "contract_review", "rejection_support", "celebration", "burnout_intervention"
  
  -- Full conversation transcript
  messages JSONB NOT NULL, 
  -- [{role: "user|companion", content: "...", timestamp: "...", emotional_tone: "..."}]
  
  -- Conversation metadata
  duration_minutes INTEGER,
  message_count INTEGER,
  user_engagement_score INTEGER CHECK (user_engagement_score BETWEEN 1 AND 10),
  -- Higher score = user shared more, engaged deeply
  
  -- Key moments to remember (AI-identified important parts)
  key_insights JSONB DEFAULT '[]',
  -- [{type: "vulnerability", quote: "I'm scared I'll never find something", 
  --   importance: "high", use_in_future: true}]
  
  breakthrough_moments JSONB DEFAULT '[]', -- Moments of realization or confidence gain
  vulnerability_shared JSONB DEFAULT '[]', -- Times user opened up about fears/doubts
  celebrations_noted JSONB DEFAULT '[]',   -- Wins to reference later
  
  -- Topics discussed (for context retrieval)
  topics_discussed JSONB DEFAULT '[]', -- ["technical_interview_anxiety", "salary_expectations", "career_transition"]
  skills_mentioned JSONB DEFAULT '[]',
  companies_mentioned JSONB DEFAULT '[]',
  
  -- Emotional journey within conversation
  starting_mood INTEGER CHECK (starting_mood BETWEEN 1 AND 10),
  ending_mood INTEGER CHECK (ending_mood BETWEEN 1 AND 10),
  mood_shift INTEGER, -- Positive means mood improved
  
  -- Companion commitments (things AI said it would remember/do)
  commitments_made JSONB DEFAULT '[]',
  -- [{promise: "I'll ask about the TechCorp interview next time", 
  --   deadline: "...", fulfilled: false}]
  
  -- Context for personalization
  user_personality_traits JSONB DEFAULT '{}', 
  -- {communication_style: "detailed", humor_level: "appreciates", formality: "casual"}
  
  -- Memory embeddings for semantic search
  conversation_embedding vector(1536),
  key_quotes_embeddings JSONB, -- Store embeddings of important quotes
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_companion_conv_user ON companion_conversations(user_id, created_at DESC);
CREATE INDEX idx_companion_conv_type ON companion_conversations(conversation_type);
CREATE INDEX idx_companion_conv_topics ON companion_conversations USING gin(topics_discussed);
CREATE INDEX idx_companion_conv_embedding ON companion_conversations USING ivfflat (conversation_embedding vector_cosine_ops);

-- ============================================
-- Companion Personality & User Preferences
-- ============================================

-- How the companion should talk to this specific user
CREATE TABLE companion_personalization (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- User-set preferences
  preferred_companion_name TEXT DEFAULT 'companion', -- User can name their companion
  communication_frequency TEXT DEFAULT 'daily', -- "daily", "every_other_day", "weekly"
  preferred_checkin_time TIME, -- When user wants to be prompted
  timezone TEXT DEFAULT 'UTC',
  
  -- Learned personality preferences
  response_length_preference TEXT, -- "brief", "moderate", "detailed"
  uses_humor BOOLEAN DEFAULT true,
  appreciation_for_directness INTEGER CHECK (appreciation_for_directness BETWEEN 1 AND 5),
  -- 1 = wants gentle support, 5 = wants blunt honesty
  
  -- Topics user is comfortable discussing
  comfortable_topics JSONB DEFAULT '[]',
  sensitive_topics JSONB DEFAULT '[]', -- Topics to approach gently
  
  -- Celebration preferences
  celebration_style TEXT DEFAULT 'warm', -- "subtle", "warm", "enthusiastic"
  acknowledges_small_wins BOOLEAN DEFAULT true,
  
  -- Motivation style
  motivational_approach TEXT DEFAULT 'empowering', -- "empowering", "challenging", "gentle"
  responds_well_to_data BOOLEAN DEFAULT true, -- Prefers facts vs feelings
  
  -- Boundaries
  remind_about_breaks BOOLEAN DEFAULT true,
  intervene_on_burnout BOOLEAN DEFAULT true,
  maximum_daily_goals INTEGER DEFAULT 3,
  
  -- AI's observations (learned over time)
  personality_profile JSONB DEFAULT '{}',
  -- {is_perfectionist: true, needs_validation: high, risk_taking: low, ...}
  
  communication_patterns JSONB DEFAULT '{}',
  -- {active_hours: ["9am-11am", "8pm-10pm"], avg_session_length: 15, ...}
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- TIER 2: USER EMPOWERMENT (Power to the Candidate)
-- ============================================================================

-- ============================================
-- Candidate Visibility & Privacy Control
-- ============================================

-- Granular control over who sees what
CREATE TABLE candidate_visibility_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Global talent pool visibility
  visible_in_talent_pool BOOLEAN DEFAULT false,
  visibility_enabled_at TIMESTAMP WITH TIME ZONE,
  visibility_paused BOOLEAN DEFAULT false, -- Temporary pause without full opt-out
  pause_reason TEXT,
  pause_until TIMESTAMP WITH TIME ZONE,
  
  -- What recruiters can see
  show_full_name BOOLEAN DEFAULT false,
  show_contact_info BOOLEAN DEFAULT false,
  show_email BOOLEAN DEFAULT false,
  show_phone BOOLEAN DEFAULT false,
  show_linkedin BOOLEAN DEFAULT true,
  show_current_employer BOOLEAN DEFAULT false, -- For discrete job searching
  show_work_history_dates BOOLEAN DEFAULT false, -- Age-blind option
  show_education_dates BOOLEAN DEFAULT false, -- Age-blind option
  show_exact_location BOOLEAN DEFAULT false, -- Just city/region vs full address
  show_salary_expectations BOOLEAN DEFAULT false,
  show_availability_date BOOLEAN DEFAULT true,
  
  -- CV visibility
  share_full_cv BOOLEAN DEFAULT false,
  share_anonymized_cv BOOLEAN DEFAULT true,
  share_skills_only BOOLEAN DEFAULT false,
  
  -- Anonymization level
  anonymization_level TEXT CHECK (anonymization_level IN ('none', 'partial', 'full')) DEFAULT 'full',
  anonymized_name TEXT, -- e.g., "Senior Engineer #7421"
  anonymized_identifier TEXT UNIQUE, -- Consistent anonymous ID
  
  -- Recruiter filtering (who can see profile)
  only_verified_recruiters BOOLEAN DEFAULT true,
  only_premium_companies BOOLEAN DEFAULT false,
  minimum_company_rating INTEGER CHECK (minimum_company_rating BETWEEN 1 AND 5),
  
  -- Blocklists
  blocked_companies JSONB DEFAULT '[]', -- ["PreviousEmployer", "CompetitorCorp"]
  blocked_recruiters JSONB DEFAULT '[]', -- ["bad.recruiter@spam.com"]
  blocked_industries JSONB DEFAULT '[]', -- ["cryptocurrency", "mlm"]
  
  -- Allowlists (if set, only these can see)
  allowed_companies JSONB DEFAULT '[]',
  allowed_industries JSONB DEFAULT '[]',
  
  -- Notification preferences
  notify_on_profile_view BOOLEAN DEFAULT true,
  notify_on_match_request BOOLEAN DEFAULT true,
  notify_on_message BOOLEAN DEFAULT true,
  notification_frequency TEXT DEFAULT 'realtime', -- "realtime", "daily_digest", "weekly"
  
  -- User's readiness statement (in their own words)
  readiness_headline TEXT, -- "Seeking senior backend roles in fintech"
  readiness_statement TEXT, -- Longer explanation of what they're looking for
  available_from DATE,
  open_to_relocation BOOLEAN DEFAULT false,
  open_to_remote BOOLEAN DEFAULT true,
  preferred_work_arrangement TEXT, -- "fully_remote", "hybrid", "flexible"
  
  -- Privacy audit trail
  visibility_change_history JSONB DEFAULT '[]',
  -- [{changed_at: "...", field: "visible_in_talent_pool", old: false, new: true, 
  --   reason: "feeling confident after 3 CV versions"}]
  
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_visibility_talent_pool ON candidate_visibility_settings(visible_in_talent_pool) 
  WHERE visible_in_talent_pool = true;

-- ============================================
-- Follow-Up Communication System
-- ============================================

-- Follow-ups user sends from within applications
CREATE TABLE application_follow_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_application_id UUID REFERENCES job_applications(id) ON DELETE CASCADE NOT NULL,
  
  -- What stage of application
  application_stage TEXT NOT NULL,
  -- "post_application", "post_cv_submission", "post_interview", 
  -- "post_offer", "checking_status", "additional_info"
  
  -- When in timeline
  days_since_last_contact INTEGER,
  days_since_application INTEGER,
  previous_follow_ups_count INTEGER DEFAULT 0,
  
  -- Follow-up type
  follow_up_type TEXT NOT NULL,
  -- "status_inquiry", "thank_you", "additional_info", "interview_availability",
  -- "post_interview_thanks", "offer_response", "salary_negotiation"
  
  -- Emotional context (why user wants to follow up)
  user_anxiety_level INTEGER CHECK (user_anxiety_level BETWEEN 1 AND 5),
  user_concern TEXT, -- "worried_seems_pushy", "anxious_about_silence", "eager_to_show_interest"
  companion_encouragement TEXT, -- What companion said to user
  -- e.g., "This is completely professional. Two weeks is normal timing."
  
  -- Email composition
  draft_subject TEXT,
  draft_body TEXT,
  
  -- Tone options provided by AI
  tone_options JSONB,
  -- [{tone: "professional", preview: "Dear Hiring Manager...", full_body: "..."},
  --  {tone: "warm", preview: "Hi Sarah...", full_body: "..."},
  --  {tone: "concise", preview: "Following up on...", full_body: "..."}]
  
  selected_tone TEXT, -- Which tone user chose
  user_customized BOOLEAN DEFAULT false, -- Did user edit the draft?
  customization_level TEXT, -- "minor_edits", "major_rewrite", "complete_custom"
  
  -- Sending
  ready_to_send BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  sent_method TEXT, -- "manual_copy_paste", "gmail_integration", "direct_send"
  recipient_email TEXT,
  recipient_name TEXT,
  
  -- Tracking (if supported)
  email_opened BOOLEAN,
  opened_at TIMESTAMP WITH TIME ZONE,
  open_count INTEGER DEFAULT 0,
  
  -- Response
  response_received BOOLEAN DEFAULT false,
  response_at TIMESTAMP WITH TIME ZONE,
  response_type TEXT, -- "positive", "neutral", "negative", "rejection", "interview_scheduled"
  response_summary TEXT, -- AI summary of recruiter's response
  response_sentiment_score INTEGER CHECK (response_sentiment_score BETWEEN 1 AND 10),
  
  -- Companion follow-up after response
  companion_debrief TEXT, -- What companion said after user reported response
  next_suggested_action TEXT,
  
  -- Outcomes
  led_to_interview BOOLEAN,
  led_to_response BOOLEAN,
  improved_status BOOLEAN,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_followups_user ON application_follow_ups(user_id, created_at DESC);
CREATE INDEX idx_followups_application ON application_follow_ups(job_application_id);
CREATE INDEX idx_followups_sent ON application_follow_ups(sent_at) WHERE sent_at IS NOT NULL;

-- ============================================================================
-- TIER 3: DIGNIFIED COMMUNICATION (Recruiter Accountability)
-- ============================================================================

-- ============================================
-- Recruiter Feedback Quality Tracking
-- ============================================

-- Track how well recruiters communicate with candidates
CREATE TABLE recruiter_feedback_quality (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recruiter_email TEXT NOT NULL,
  company_id UUID REFERENCES companies(id),
  
  -- Overall feedback metrics
  total_rejections_sent INTEGER DEFAULT 0,
  rejections_with_detailed_feedback INTEGER DEFAULT 0,
  rejections_with_indicator_breakdown INTEGER DEFAULT 0,
  generic_rejections INTEGER DEFAULT 0, -- "We've decided to move forward with other candidates"
  
  -- Feedback quality scores
  avg_feedback_word_count NUMERIC(10,2),
  avg_feedback_specificity_score NUMERIC(3,2), -- AI-calculated, 1-10
  avg_candidate_rating NUMERIC(3,2), -- From candidate feedback, 1-5
  
  -- Specific feedback components used
  used_indicator_scores INTEGER DEFAULT 0,
  used_specific_examples INTEGER DEFAULT 0,
  used_constructive_suggestions INTEGER DEFAULT 0,
  used_encouragement INTEGER DEFAULT 0,
  
  -- Response times
  avg_response_time_days NUMERIC(5,2),
  responses_within_week INTEGER DEFAULT 0,
  responses_after_month INTEGER DEFAULT 0,
  no_responses INTEGER DEFAULT 0,
  
  -- Candidate experience ratings
  candidate_ratings JSONB DEFAULT '[]',
  -- [{rating: 4, comment: "Feedback was specific and helpful", date: "..."}]
  
  total_candidate_ratings INTEGER DEFAULT 0,
  positive_ratings INTEGER DEFAULT 0, -- 4-5 stars
  negative_ratings INTEGER DEFAULT 0, -- 1-2 stars
  
  -- Specific feedback from candidates
  appreciation_count INTEGER DEFAULT 0, -- Candidates thanked them
  complaint_count INTEGER DEFAULT 0, -- Candidates complained
  
  -- Behavioral patterns
  sends_rejection_after_interview BOOLEAN DEFAULT true,
  sends_rejection_after_application BOOLEAN DEFAULT false, -- Often ghosted at this stage
  follows_up_on_applicant_questions BOOLEAN DEFAULT true,
  provides_timeline_updates BOOLEAN DEFAULT true,
  
  -- Quality badges (earned through consistent good feedback)
  verified_respectful_recruiter BOOLEAN DEFAULT false,
  transparency_badge BOOLEAN DEFAULT false,
  responsive_communicator_badge BOOLEAN DEFAULT false,
  
  -- Accountability measures
  low_feedback_warning BOOLEAN DEFAULT false,
  feedback_warning_date TIMESTAMP WITH TIME ZONE,
  feedback_required_before_next_post BOOLEAN DEFAULT false,
  suspended_from_posting BOOLEAN DEFAULT false,
  suspension_reason TEXT,
  
  -- Improvement over time
  feedback_quality_trend TEXT, -- "improving", "stable", "declining"
  last_quality_review_date TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  UNIQUE(recruiter_email, company_id)
);

CREATE INDEX idx_feedback_quality_recruiter ON recruiter_feedback_quality(recruiter_email);
CREATE INDEX idx_feedback_quality_rating ON recruiter_feedback_quality(avg_candidate_rating DESC);
CREATE INDEX idx_feedback_quality_warning ON recruiter_feedback_quality(low_feedback_warning) 
  WHERE low_feedback_warning = true;

-- ============================================
-- Candidate Communication (Recruiter → Candidate)
-- ============================================

-- Every message recruiters send to candidates (tracked for quality)
CREATE TABLE candidate_communication (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline_id UUID REFERENCES candidate_pipeline(id) ON DELETE CASCADE NOT NULL,
  candidate_profile_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE NOT NULL,
  job_requisition_id UUID REFERENCES job_requisitions(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  sender_email TEXT NOT NULL, -- Recruiter who sent it
  
  -- Communication type
  communication_type TEXT NOT NULL CHECK (communication_type IN (
    'initial_outreach', 'interview_invitation', 'status_update', 
    'rejection', 'offer', 'follow_up', 'request_for_info'
  )),
  
  -- Email content
  subject TEXT,
  body TEXT NOT NULL,
  
  -- For rejections - REQUIRED detailed feedback
  is_rejection BOOLEAN DEFAULT false,
  rejection_reasons JSONB DEFAULT '[]', -- High-level reasons
  
  -- FORCED indicator-based feedback (if rejection)
  feedback_indicators JSONB DEFAULT '[]',
  -- [{indicator_number: 1, indicator_name: "Technical Skills", 
  --   candidate_score: 7, required_score: 8, 
  --   gap_explanation: "Strong in Python, but this role requires deep distributed systems experience",
  --   crucial_for_role: true}]
  
  indicator_breakdown_provided BOOLEAN DEFAULT false,
  feedback_word_count INTEGER,
  feedback_specificity_score INTEGER, -- AI-calculated quality
  
  -- Constructive elements (AI checks for these)
  includes_specific_feedback BOOLEAN DEFAULT false,
  includes_encouragement BOOLEAN DEFAULT false,
  includes_suggestions BOOLEAN DEFAULT false,
  includes_timeline_info BOOLEAN DEFAULT false,
  
  -- Respect score (AI-evaluated tone)
  respect_score INTEGER CHECK (respect_score BETWEEN 1 AND 10),
  tone_analysis JSONB, 
  -- {professional: true, empathetic: true, generic: false, dismissive: false}
  
  -- Red flags (AI-detected issues)
  contains_red_flags JSONB DEFAULT '[]',
  -- ["generic_template", "no_specific_reason", "dismissive_tone", "contradictory_info"]
  
  -- Delivery tracking
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  first_open_at TIMESTAMP WITH TIME ZONE,
  open_count INTEGER DEFAULT 0,
  
  -- Candidate response
  candidate_responded BOOLEAN DEFAULT false,
  responded_at TIMESTAMP WITH TIME ZONE,
  response_time_hours INTEGER,
  
  -- Follow-up scheduled
  follow_up_scheduled BOOLEAN DEFAULT false,
  follow_up_date TIMESTAMP WITH TIME ZONE,
  follow_up_completed BOOLEAN DEFAULT false,
  
  -- Status
  status TEXT CHECK (status IN ('draft', 'sent', 'delivered', 'opened', 'responded', 'bounced')) DEFAULT 'sent',
  
  -- Candidate feedback on THIS communication
  candidate_rated BOOLEAN DEFAULT false,
  candidate_rating INTEGER CHECK (candidate_rating BETWEEN 1 AND 5),
  candidate_rating_comment TEXT,
  candidate_found_helpful BOOLEAN,
  
  -- Companion integration (what companion said to candidate about this)
  companion_framed_for_candidate TEXT,
  -- e.g., "They gave specific feedback about distributed systems. 
  --       This is actually helpful - let's add that to your learning plan."
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_candidate_comm_pipeline ON candidate_communication(pipeline_id, created_at DESC);
CREATE INDEX idx_candidate_comm_type ON candidate_communication(communication_type);
CREATE INDEX idx_candidate_comm_rejection ON candidate_communication(is_rejection) WHERE is_rejection = true;
CREATE INDEX idx_candidate_comm_quality ON candidate_communication(feedback_specificity_score DESC) 
  WHERE is_rejection = true;

-- ============================================
-- Candidate Feedback (Candidate → Recruiter/Company)
-- ============================================

-- Candidates rate their experience (holds companies accountable)
CREATE TABLE candidate_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline_id UUID REFERENCES candidate_pipeline(id) ON DELETE CASCADE NOT NULL,
  candidate_profile_id UUID REFERENCES candidate_profiles(id),
  company_id UUID REFERENCES companies(id) NOT NULL,
  job_requisition_id UUID REFERENCES job_requisitions(id),
  
  -- Feedback request
  feedback_token TEXT UNIQUE NOT NULL, -- Sent in email link
  feedback_requested_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  feedback_submitted BOOLEAN DEFAULT false,
  submitted_at TIMESTAMP WITH TIME ZONE,
  
  -- Overall experience
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  would_recommend_company BOOLEAN,
  would_apply_again BOOLEAN,
  
  -- Application experience
  application_process_rating INTEGER CHECK (application_process_rating BETWEEN 1 AND 5),
  application_process_comments TEXT,
  application_clarity_rating INTEGER CHECK (application_clarity_rating BETWEEN 1 AND 5),
  
  -- Communication experience
  communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
  communication_comments TEXT,
  response_time_rating INTEGER CHECK (response_time_rating BETWEEN 1 AND 5),
  feedback_quality_rating INTEGER CHECK (feedback_quality_rating BETWEEN 1 AND 5),
  recruiter_professionalism_rating INTEGER CHECK (recruiter_professionalism_rating BETWEEN 1 AND 5),
  
  -- Interview experience (if applicable)
  had_interview BOOLEAN,
  interview_experience_rating INTEGER CHECK (interview_experience_rating BETWEEN 1 AND 5),
  interview_comments TEXT,
  interviewer_preparedness_rating INTEGER CHECK (interviewer_preparedness_rating BETWEEN 1 AND 5),
  interview_respect_rating INTEGER CHECK (interview_respect_rating BETWEEN 1 AND 5),
  
  -- Rejection experience (if applicable)
  was_rejected BOOLEAN,
  rejection_feedback_rating INTEGER CHECK (rejection_feedback_rating BETWEEN 1 AND 5),
  rejection_feedback_helpful BOOLEAN,
  rejection_feedback_specific BOOLEAN,
  rejection_feedback_respectful BOOLEAN,
  rejection_comments TEXT,
  
  -- Specific praise
  what_went_well JSONB DEFAULT '[]', -- ["responsive_recruiter", "clear_job_description", "respectful_interview"]
  
  -- Specific complaints
  what_needs_improvement JSONB DEFAULT '[]', -- ["no_feedback_given", "ghosted_after_interview", "unclear_timeline"]
  
  -- Open feedback
  positive_highlights TEXT,
  suggestions_for_improvement TEXT,
  additional_comments TEXT,
  
  -- Red flags (serious issues)
  report_discrimination BOOLEAN DEFAULT false,
  discrimination_details TEXT,
  report_unprofessional_behavior BOOLEAN DEFAULT false,
  unprofessional_behavior_details TEXT,
  
  -- Companion support after feedback
  companion_acknowledgment TEXT,
  -- "Thank you for taking time to provide feedback. This helps hold companies accountable."
  
  -- Usage of feedback
  shared_with_company BOOLEAN DEFAULT true,
  company_responded BOOLEAN DEFAULT false,
  company_response TEXT,
  company_made_changes BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_candidate_feedback_company ON candidate_feedback(company_id, overall_rating);
CREATE INDEX idx_candidate_feedback_token ON candidate_feedback(feedback_token);
CREATE INDEX idx_candidate_feedback_submitted ON candidate_feedback(feedback_submitted, submitted_at);

-- ============================================================================
-- TIER 4: JOB SEARCH TOOLS (Touchpoints for Companion Relationship)
-- ============================================================================

-- ============================================
-- User Profiles
-- ============================================

CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT UNIQUE NOT NULL,
  linkedin_url TEXT,
  personal_website_url TEXT,
  current_job_title TEXT,
  profile_image TEXT,
  
  -- Base CV
  base_cv_url TEXT,
  base_cv_uploaded_at TIMESTAMP WITH TIME ZONE,
  base_cv_last_updated TIMESTAMP WITH TIME ZONE,
  
  -- Role
  role TEXT CHECK (role IN ('candidate', 'recruiter', 'admin')) DEFAULT 'candidate',
  is_active BOOLEAN DEFAULT true,
  
  -- Onboarding
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_completed_at TIMESTAMP WITH TIME ZONE,
  onboarding_step INTEGER DEFAULT 0,
  
  -- Preferences
  preferences JSONB DEFAULT '{}',
  notification_settings JSONB DEFAULT '{}',
  
  -- Companion relationship stats
  days_with_companion INTEGER DEFAULT 0,
  total_checkins INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);

-- ============================================
-- Job Applications
-- ============================================

CREATE TABLE job_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Basic info
  company_name TEXT NOT NULL,
  position_title TEXT NOT NULL,
  job_url TEXT,
  job_description TEXT,
  location TEXT,
  
  -- Application details
  application_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  application_url TEXT,
  application_method TEXT, -- "company_website", "linkedin", "email", "other"
  
  -- Status
  application_status TEXT CHECK (application_status IN (
    'prepared', 'applied', 'interview_scheduled', 'interviewed', 
    'offer_received', 'negotiating', 'accepted', 'rejected', 'withdrawn'
  )) DEFAULT 'applied',
  status_updated_at TIMESTAMP WITH TIME ZONE,
  
  -- Salary & compensation
  salary_range TEXT,
  salary_min NUMERIC(12,2),
  salary_max NUMERIC(12,2),
  salary_currency TEXT DEFAULT 'USD',
  
  -- People
  recruiter_name TEXT,
  recruiter_email TEXT,
  recruiter_phone TEXT,
  referral_name TEXT,
  referral_email TEXT,
  referral_relationship TEXT,
  hiring_manager_name TEXT,
  
  -- Notes and context
  notes TEXT,
  application_notes TEXT,
  user_excitement_level INTEGER CHECK (user_excitement_level BETWEEN 1 AND 5),
  priority_level TEXT CHECK (priority_level IN ('low', 'medium', 'high', 'dream_job')),
  
  -- Session connections (which tools used for this app)
  session_connections JSONB DEFAULT '{
    "cv_completed": false,
    "interview_completed": false,
    "compensation_completed": false,
    "contract_completed": false
  }',
  
  -- Linked resources
  tailored_cv_url TEXT,
  cover_letter_url TEXT,
  
  -- Interview tracking
  interview_schedule JSONB DEFAULT '[]',
  -- [{type: "phone_screen", date: "...", interviewers: [...], notes: "..."}]
  interview_prep_notes TEXT,
  
  -- Compensation tracking
  compensation_context JSONB,
  compensation_analysis JSONB,
  compensation_feedback JSONB,
  offer_details JSONB,
  
  -- Contract tracking
  contract_analysis JSONB,
  contract_signed BOOLEAN DEFAULT false,
  
  -- Follow-up system
  follow_up JSONB DEFAULT '{
    "scheduled_date": null,
    "status": "none",
    "email_draft": "",
    "last_follow_up_date": null,
    "follow_up_count": 0,
    "next_follow_up_suggested": null
  }',
  
  -- Auto-tracking
  auto_tracked BOOLEAN DEFAULT false,
  tracking_confirmed BOOLEAN DEFAULT false,
  auto_track_source TEXT, -- "email", "webhook", "api"
  auto_track_confidence NUMERIC(3,2), -- How confident AI was in extraction
  
  -- Outcome
  outcome TEXT, -- "accepted", "rejected", "withdrawn", "offer_declined"
  outcome_date TIMESTAMP WITH TIME ZONE,
  outcome_notes TEXT,
  
  -- Companion integration
  companion_first_mention TIMESTAMP WITH TIME ZONE,
  companion_last_discussed TIMESTAMP WITH TIME ZONE,
  companion_celebration_sent BOOLEAN DEFAULT false,
  companion_support_provided JSONB DEFAULT '[]',
  -- [{type: "rejection_support", date: "...", message: "..."}]
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by TEXT NOT NULL
);

CREATE INDEX idx_job_applications_user ON job_applications(user_id, created_at DESC);
CREATE INDEX idx_job_applications_status ON job_applications(application_status);
CREATE INDEX idx_job_applications_company ON job_applications(company_name);
CREATE INDEX idx_job_applications_excitement ON job_applications(user_excitement_level DESC);

-- Full-text search
CREATE INDEX idx_job_applications_search ON job_applications 
  USING gin(to_tsvector('english', coalesce(company_name, '') || ' ' || coalesce(position_title, '') || ' ' || coalesce(notes, '')));

-- ============================================
-- CV Versions
-- ============================================

CREATE TABLE cv_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_application_id UUID REFERENCES job_applications(id) ON DELETE SET NULL,
  
  -- Version info
  version_name TEXT NOT NULL,
  is_base_cv BOOLEAN DEFAULT false,
  version_number INTEGER DEFAULT 1,
  
  -- Files
  original_cv_url TEXT NOT NULL,
  tailored_cv_url TEXT,
  
  -- Tailoring context
  job_description TEXT,
  company_name TEXT,
  position_title TEXT,
  tailoring_mode TEXT CHECK (tailoring_mode IN ('none', 'light', 'moderate', 'heavy', 'custom')),
  
  -- AI analysis
  tailoring_suggestions TEXT,
  gap_filling_qa JSONB,
  transferable_skills_analysis JSONB,
  
  -- Scoring (10-indicator framework)
  initial_scores JSONB,
  final_scores JSONB,
  score_improvement NUMERIC(5,2),
  
  -- Status
  submission_status TEXT CHECK (submission_status IN (
    'draft', 'prepared', 'submitted', 'accepted', 'rejected'
  )) DEFAULT 'prepared',
  
  -- Analysis metadata
  analysis JSONB,
  ats_compatibility_score INTEGER CHECK (ats_compatibility_score BETWEEN 0 AND 100),
  keyword_match_percentage NUMERIC(5,2),
  
  -- Companion celebration
  companion_celebrated_completion BOOLEAN DEFAULT false,
  companion_highlighted_improvements JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by TEXT NOT NULL
);

CREATE INDEX idx_cv_versions_user ON cv_versions(user_id, created_at DESC);
CREATE INDEX idx_cv_versions_application ON cv_versions(job_application_id);
CREATE INDEX idx_cv_versions_base ON cv_versions(is_base_cv) WHERE is_base_cv = true;

-- ============================================
-- Interview Sessions
-- ============================================

CREATE TABLE interview_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_application_id UUID REFERENCES job_applications(id) ON DELETE SET NULL,
  
  -- Session details
  company_name TEXT NOT NULL,
  position_title TEXT NOT NULL,
  session_type TEXT CHECK (session_type IN (
    'practice_questions', 'mock_interview', 'behavioral_prep', 
    'technical_prep', 'full_interview_simulation'
  )) DEFAULT 'practice_questions',
  
  -- Questions and answers
  questions_asked JSONB DEFAULT '[]',
  -- [{question: "...", answer: "...", duration: 120, word_count: 150,
  --   feedback: {...}, scores: {...}, improvements: [...]}]
  
  -- Overall session feedback
  overall_feedback TEXT,
  session_duration INTEGER, -- minutes
  
  -- User self-assessment
  confidence_rating_before INTEGER CHECK (confidence_rating_before BETWEEN 1 AND 5),
  confidence_rating_after INTEGER CHECK (confidence_rating_after BETWEEN 1 AND 5),
  confidence_improvement INTEGER,
  
  -- Context
  job_description_used TEXT,
  tailored_cv_used TEXT,
  interviewer_persona_used JSONB,
  
  -- Companion support
  companion_encouragement_before TEXT,
  companion_celebration_after TEXT,
  companion_identified_growth JSONB,
  -- [{skill: "STAR method usage", before: 4, after: 7, improvement: "significant"}]
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by TEXT NOT NULL
);

CREATE INDEX idx_interview_sessions_user ON interview_sessions(user_id, created_at DESC);
CREATE INDEX idx_interview_sessions_application ON interview_sessions(job_application_id);

-- ============================================================================
-- REMAINING TABLES (Abbreviated for space)
-- ============================================================================

-- Job Postings, Indicators, Companies, Recruiter tables, etc.
-- [Include remaining tables from previous schema, but with companion integration fields]

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_emotional_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE companion_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE companion_personalization ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_visibility_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruiter_feedback_quality ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_communication ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;

-- Emotional Context: Users can only access their own
CREATE POLICY "Users can manage own emotional context"
  ON user_emotional_context FOR ALL
  USING (auth.uid() = user_id);

-- Companion Conversations: Users can only access their own
CREATE POLICY "Users can manage own conversations"
  ON companion_conversations FOR ALL
  USING (auth.uid() = user_id);

-- Companion Personalization: Users can only access their own
CREATE POLICY "Users can manage own personalization"
  ON companion_personalization FOR ALL
  USING (auth.uid() = user_id);

-- Visibility Settings: Users can only access their own
CREATE POLICY "Users can manage own visibility settings"
  ON candidate_visibility_settings FOR ALL
  USING (auth.uid() = user_id);

-- Follow-ups: Users can manage own follow-ups
CREATE POLICY "Users can manage own follow-ups"
  ON application_follow_ups FOR ALL
  USING (auth.uid() = user_id);

-- Recruiter Feedback Quality: Public read for candidates, recruiters can see own
CREATE POLICY "Anyone can view recruiter quality scores"
  ON recruiter_feedback_quality FOR SELECT
  USING (true);

CREATE POLICY "Recruiters can view own quality"
  ON recruiter_feedback_quality FOR SELECT
  USING (recruiter_email = auth.email());

-- Job Applications: Users manage own, admins view all
CREATE POLICY "Users can manage own applications"
  ON job_applications FOR ALL
  USING (auth.uid() = user_id);

-- CV Versions: Users manage own
CREATE POLICY "Users can manage own CVs"
  ON cv_versions FOR ALL
  USING (auth.uid() = user_id);

-- Interview Sessions: Users manage own
CREATE POLICY "Users can manage own sessions"
  ON interview_sessions FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER set_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON user_emotional_context
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON companion_conversations
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON companion_personalization
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON job_applications
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON cv_versions
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON interview_sessions
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON application_follow_ups
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON recruiter_feedback_quality
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON candidate_communication
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Calculate burnout risk score
CREATE OR REPLACE FUNCTION calculate_burnout_risk(
  p_user_id UUID,
  p_recent_rejections INTEGER,
  p_days_since_response INTEGER,
  p_energy_level TEXT,
  p_applications_this_week INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_risk_score INTEGER := 0;
BEGIN
  -- High rejection count
  IF p_recent_rejections > 5 THEN v_risk_score := v_risk_score + 30; END IF;
  IF p_recent_rejections > 10 THEN v_risk_score := v_risk_score + 20; END IF;
  
  -- Long silence periods
  IF p_days_since_response > 14 THEN v_risk_score := v_risk_score + 20; END IF;
  IF p_days_since_response > 30 THEN v_risk_score := v_risk_score + 15; END IF;
  
  -- Low energy
  IF p_energy_level IN ('burned_out', 'exhausted') THEN v_risk_score := v_risk_score + 40; END IF;
  IF p_energy_level = 'low' THEN v_risk_score := v_risk_score + 20; END IF;
  
  -- Over-applying (sign of desperation)
  IF p_applications_this_week > 20 THEN v_risk_score := v_risk_score + 15; END IF;
  
  -- Cap at 100
  IF v_risk_score > 100 THEN v_risk_score := 100; END IF;
  
  RETURN v_risk_score;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INITIAL DATA SEEDING
-- ============================================================================

-- Seed the 10 Indicators
INSERT INTO indicators (number, name, description) VALUES
(1, 'Job Knowledge & Technical Skills', 'Mastery of job-specific knowledge and technical competencies'),
(2, 'Problem-Solving & Critical Thinking', 'Ability to analyze complex situations and develop effective solutions'),
(3, 'Communication & Articulation', 'Clear and effective verbal and written communication'),
(4, 'Social Skills & Interpersonal Ability', 'Building relationships and working effectively with others'),
(5, 'Integrity & Ethical Standards', 'Honesty, reliability, and adherence to ethical principles'),
(6, 'Adaptability & Flexibility', 'Adjusting to change and handling ambiguity'),
(7, 'Learning Agility & Growth Mindset', 'Capacity to learn quickly and apply new knowledge'),
(8, 'Leadership & Initiative', 'Taking charge, motivating others, and driving results'),
(9, 'Creativity & Innovation', 'Generating novel ideas and innovative approaches'),
(10, 'Motivation & Drive', 'Intrinsic motivation, ambition, and work ethic')
ON CONFLICT (number) DO NOTHING;

-- ============================================================================
-- ANALYTICS VIEWS
-- ============================================================================

-- View: User emotional journey
CREATE OR REPLACE VIEW user_emotional_journey AS
SELECT 
  uec.user_id,
  uec.date,
  uec.mood_rating,
  uec.energy_level,
  uec.burnout_risk_score,
  uec.confidence_trend,
  uec.goal_completed,
  COUNT(ja.id) as applications_that_day,
  COUNT(is.id) as interview_sessions_that_day,
  AVG(uec.mood_rating) OVER (
    PARTITION BY uec.user_id 
    ORDER BY uec.date 
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) as mood_7day_avg
FROM user_emotional_context uec
LEFT JOIN job_applications ja ON ja.user_id = uec.user_id 
  AND DATE(ja.created_at) = uec.date
LEFT JOIN interview_sessions is ON is.user_id = uec.user_id 
  AND DATE(is.created_at) = uec.date
GROUP BY uec.id, uec.user_id, uec.date, uec.mood_rating, uec.energy_level,
         uec.burnout_risk_score, uec.confidence_trend, uec.goal_completed;

-- View: Recruiter accountability dashboard
CREATE OR REPLACE VIEW recruiter_accountability_dashboard AS
SELECT 
  rfq.recruiter_email,
  rfq.company_id,
  c.name as company_name,
  rfq.total_rejections_sent,
  rfq.rejections_with_detailed_feedback,
  ROUND(100.0 * rfq.rejections_with_detailed_feedback / NULLIF(rfq.total_rejections_sent, 0), 2) as feedback_rate_percent,
  rfq.avg_candidate_rating,
  rfq.positive_ratings,
  rfq.negative_ratings,
  rfq.verified_respectful_recruiter,
  rfq.low_feedback_warning,
  rfq.suspended_from_posting
FROM recruiter_feedback_quality rfq
LEFT JOIN companies c ON c.id = rfq.company_id
WHERE rfq.total_rejections_sent > 0;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE user_emotional_context IS 'Core emotional state tracking for companion relationship. Stores daily check-ins, mood, energy, micro-goals, and burnout risk. This is THE foundation of the companion system.';

COMMENT ON TABLE companion_conversations IS 'Full conversation memory for the AI companion. Stores every meaningful interaction with rich context for future personalization. Enables the companion to "remember" and reference past conversations.';

COMMENT ON TABLE companion_personalization IS 'User-specific personality preferences for how the companion should communicate. Learned over time through interaction patterns.';

COMMENT ON TABLE candidate_visibility_settings IS 'Granular privacy controls giving candidates power over who sees their profile. Supports age-blind recruiting and discrete job searching.';

COMMENT ON TABLE application_follow_ups IS 'Follow-up email system integrated into every application stage. Helps users stay proactive without feeling desperate.';

COMMENT ON TABLE recruiter_feedback_quality IS 'Accountability system tracking how well recruiters communicate with candidates. Forces quality feedback on rejections.';

COMMENT ON TABLE candidate_communication IS 'Every message sent from recruiters to candidates, tracked for quality and respect. Enables dignified rejections with specific, constructive feedback.';

COMMENT ON TABLE candidate_feedback IS 'Candidates rate their experience with companies/recruiters. Holds companies accountable for respectful treatment.';

COMMENT ON COLUMN user_emotional_context.burnout_risk_score IS 'Calculated risk score (0-100) based on rejections, energy levels, and application patterns. Triggers companion intervention at high levels.';

COMMENT ON COLUMN companion_conversations.key_insights IS 'AI-identified important moments in conversations that should be referenced in future interactions. Builds long-term relationship depth.';

COMMENT ON COLUMN application_follow_ups.companion_encouragement IS 'What the companion said to encourage the user to send this follow-up. E.g., "This is completely professional. Two weeks is normal timing."';

COMMENT ON COLUMN candidate_communication.feedback_indicators IS 'REQUIRED for rejections: 10-indicator breakdown with scores, gaps, and explanations. Forces recruiters to provide specific, actionable feedback.';
