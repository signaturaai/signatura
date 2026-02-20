-- ============================================================================
-- Migration 012: Job Search Preferences Schema
-- AI Job Search Agent - User's persistent search filters and notification settings
-- ============================================================================

-- ============================================================================
-- Table: job_search_preferences
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_search_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,

  -- =========================================================================
  -- Explicit Search Filters
  -- =========================================================================

  -- Target job titles (array of strings)
  preferred_job_titles JSONB DEFAULT '[]'::jsonb,

  -- Preferred locations (array of strings)
  preferred_locations JSONB DEFAULT '[]'::jsonb,

  -- Experience level range
  experience_years TEXT CHECK (experience_years IN ('0-2', '2-5', '5-10', '10+') OR experience_years IS NULL),

  -- Required skills with proficiency levels
  -- Format: [{ "skill": "React", "proficiency": "expert" }, ...]
  required_skills JSONB DEFAULT '[]'::jsonb,

  -- Company size preferences (array of size ranges)
  company_size_preferences JSONB DEFAULT '[]'::jsonb,

  -- Remote policy preferences (array)
  remote_policy_preferences JSONB DEFAULT '[]'::jsonb,

  -- Required benefits (array of benefit strings)
  required_benefits JSONB DEFAULT '[]'::jsonb,

  -- Salary overrides (if set, overrides CandidateProfile values)
  salary_min_override NUMERIC,
  salary_currency_override TEXT,

  -- Exclusion lists
  avoid_companies JSONB DEFAULT '[]'::jsonb,
  avoid_keywords JSONB DEFAULT '[]'::jsonb,

  -- =========================================================================
  -- AI-Generated Search Intelligence
  -- =========================================================================

  -- AI-suggested search keywords based on profile analysis
  ai_keywords JSONB DEFAULT '[]'::jsonb,

  -- AI-recommended job boards/platforms
  ai_recommended_boards JSONB DEFAULT '[]'::jsonb,

  -- AI-generated market insights (paragraph)
  ai_market_insights TEXT,

  -- AI-generated personalized search strategy
  ai_personalized_strategy TEXT,

  -- When AI insights were last refreshed
  ai_last_analysis_at TIMESTAMPTZ,

  -- =========================================================================
  -- Implicit/Learned Preferences
  -- =========================================================================

  -- AI-learned preferences from feedback patterns
  -- Format: { "salary_adjustment": 10, "remote_bias": 0.8, "preferred_industries": [...], ... }
  implicit_preferences JSONB DEFAULT '{}'::jsonb,

  -- Feedback statistics for learning
  -- Format: { "total_likes": 0, "total_dislikes": 0, "total_hides": 0, "reasons": {} }
  feedback_stats JSONB DEFAULT '{"total_likes": 0, "total_dislikes": 0, "total_hides": 0, "reasons": {}}'::jsonb,

  -- =========================================================================
  -- Notification Settings
  -- =========================================================================

  -- Email notification frequency
  email_notification_frequency TEXT DEFAULT 'weekly' CHECK (
    email_notification_frequency IN ('daily', 'weekly', 'monthly', 'disabled')
  ),

  -- When the last digest email was sent
  last_email_sent_at TIMESTAMPTZ,

  -- When the last automated search ran
  last_search_at TIMESTAMPTZ,

  -- Counter for cost optimization (if 7+ consecutive zero-match days, reduce search frequency)
  consecutive_zero_match_days INTEGER DEFAULT 0,

  -- =========================================================================
  -- Timestamps
  -- =========================================================================

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- Table Comments
-- ============================================================================

COMMENT ON TABLE job_search_preferences IS 'User preferences for AI Job Search Agent - search filters, notifications, and AI insights';

COMMENT ON COLUMN job_search_preferences.user_id IS 'One preferences record per user (UNIQUE constraint)';
COMMENT ON COLUMN job_search_preferences.is_active IS 'Whether the job search agent is enabled for this user';
COMMENT ON COLUMN job_search_preferences.preferred_job_titles IS 'Target job titles e.g. ["VP Product", "Head of Product"]';
COMMENT ON COLUMN job_search_preferences.preferred_locations IS 'Preferred locations e.g. ["Israel", "Remote", "San Francisco"]';
COMMENT ON COLUMN job_search_preferences.experience_years IS 'Experience level range: 0-2, 2-5, 5-10, 10+';
COMMENT ON COLUMN job_search_preferences.required_skills IS 'Skills with proficiency: [{ skill: string, proficiency: beginner|intermediate|expert }]';
COMMENT ON COLUMN job_search_preferences.salary_min_override IS 'Overrides CandidateProfile.minimum_salary_expectation if set';
COMMENT ON COLUMN job_search_preferences.avoid_companies IS 'Companies to exclude from search results';
COMMENT ON COLUMN job_search_preferences.avoid_keywords IS 'Keywords to filter out from results';
COMMENT ON COLUMN job_search_preferences.ai_keywords IS 'AI-suggested search keywords based on profile analysis';
COMMENT ON COLUMN job_search_preferences.ai_recommended_boards IS 'AI-recommended job boards/platforms';
COMMENT ON COLUMN job_search_preferences.ai_market_insights IS 'AI-generated market insights paragraph';
COMMENT ON COLUMN job_search_preferences.ai_personalized_strategy IS 'AI-generated personalized search strategy';
COMMENT ON COLUMN job_search_preferences.implicit_preferences IS 'AI-learned from feedback: { salary_adjustment, remote_bias, etc. }';
COMMENT ON COLUMN job_search_preferences.feedback_stats IS 'Aggregated feedback stats for learning algorithm';
COMMENT ON COLUMN job_search_preferences.consecutive_zero_match_days IS 'Cost optimization: reduce search frequency after 7+ zero-match days';

-- ============================================================================
-- Indexes
-- ============================================================================

-- Primary lookup by user
CREATE INDEX idx_job_search_preferences_user ON job_search_preferences(user_id);

-- Active users for cron job
CREATE INDEX idx_job_search_preferences_active ON job_search_preferences(is_active) WHERE is_active = true;

-- Users needing email notifications
CREATE INDEX idx_job_search_preferences_email ON job_search_preferences(email_notification_frequency, last_email_sent_at)
  WHERE email_notification_frequency != 'disabled';

-- Users due for search
CREATE INDEX idx_job_search_preferences_search_due ON job_search_preferences(last_search_at, is_active)
  WHERE is_active = true;

-- ============================================================================
-- Updated At Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_job_search_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_job_search_preferences_updated_at
  BEFORE UPDATE ON job_search_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_job_search_preferences_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE job_search_preferences ENABLE ROW LEVEL SECURITY;

-- Users can SELECT their own preferences
CREATE POLICY "Users can view their own job search preferences"
  ON job_search_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can INSERT their own preferences
CREATE POLICY "Users can create their own job search preferences"
  ON job_search_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can UPDATE their own preferences
CREATE POLICY "Users can update their own job search preferences"
  ON job_search_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can DELETE their own preferences
CREATE POLICY "Users can delete their own job search preferences"
  ON job_search_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Policy Comments
-- ============================================================================

COMMENT ON POLICY "Users can view their own job search preferences" ON job_search_preferences IS
  'Users can only see their own job search preferences';
COMMENT ON POLICY "Users can create their own job search preferences" ON job_search_preferences IS
  'Users can create preferences for themselves (one per user due to UNIQUE constraint)';
COMMENT ON POLICY "Users can update their own job search preferences" ON job_search_preferences IS
  'Users can modify their own search filters and notification settings';
COMMENT ON POLICY "Users can delete their own job search preferences" ON job_search_preferences IS
  'Users can remove their job search preferences';

-- ============================================================================
-- Helper Function: Get or Create Preferences
-- ============================================================================

CREATE OR REPLACE FUNCTION get_or_create_job_search_preferences(p_user_id UUID)
RETURNS job_search_preferences AS $$
DECLARE
  result job_search_preferences;
BEGIN
  -- Try to get existing preferences
  SELECT * INTO result
  FROM job_search_preferences
  WHERE user_id = p_user_id;

  -- If not found, create default preferences
  IF NOT FOUND THEN
    INSERT INTO job_search_preferences (user_id)
    VALUES (p_user_id)
    RETURNING * INTO result;
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_or_create_job_search_preferences IS
  'Gets existing preferences or creates default ones for the user';
