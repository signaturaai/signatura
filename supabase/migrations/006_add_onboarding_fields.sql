-- Migration: Add Onboarding Fields and Tables
-- Description: Adds onboarding tracking, candidate/recruiter specific fields,
--              companion_preferences table, and base_cvs table

-- ============================================================================
-- PART 1: Add onboarding fields to profiles table
-- ============================================================================

-- Onboarding tracking fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Candidate-specific fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS career_stage TEXT; -- 'student', 'entry', 'mid', 'senior', 'executive', 'career_change'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS job_search_status TEXT; -- 'actively_looking', 'open_to_opportunities', 'not_looking', 'employed_exploring'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS desired_roles TEXT[]; -- Array of target job titles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS years_of_experience INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS base_cv_uploaded BOOLEAN DEFAULT FALSE;

-- Additional candidate fields for new UI
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_profile TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS professional_summary TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS target_job_titles TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience_level TEXT CHECK (experience_level IN ('entry_level', 'mid_level', 'senior', 'executive', 'career_change'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS remote_policy TEXT CHECK (remote_policy IN ('remote', 'hybrid', 'onsite', 'flexible'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_location TEXT;

-- Recruiter-specific fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_size TEXT; -- 'startup', 'small', 'medium', 'large', 'enterprise'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_industry TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS recruiter_role TEXT; -- 'internal', 'agency', 'freelance', 'hr_generalist'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hiring_focus TEXT[]; -- Array of roles they typically hire for
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monthly_hires INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS team_size INTEGER;

-- ============================================================================
-- PART 2: Create companion_preferences table
-- ============================================================================

CREATE TABLE IF NOT EXISTS companion_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Communication style
    tone TEXT DEFAULT 'supportive', -- 'supportive', 'direct', 'balanced', 'encouraging'
    check_in_frequency TEXT DEFAULT 'daily', -- 'daily', 'every_few_days', 'weekly', 'as_needed'

    -- Focus areas (what user wants help with most)
    focus_areas TEXT[] DEFAULT ARRAY['job_search', 'interview_prep', 'cv_improvement'],

    -- Notification preferences
    daily_reminder_enabled BOOLEAN DEFAULT TRUE,
    daily_reminder_time TIME DEFAULT '09:00:00',
    weekly_summary_enabled BOOLEAN DEFAULT TRUE,
    weekly_summary_day INTEGER DEFAULT 1, -- 1=Monday, 7=Sunday

    -- Motivational style
    celebration_style TEXT DEFAULT 'moderate', -- 'minimal', 'moderate', 'enthusiastic'
    tough_love_enabled BOOLEAN DEFAULT FALSE,

    -- Job search specific
    target_applications_per_week INTEGER DEFAULT 5,
    track_rejections BOOLEAN DEFAULT TRUE,
    rejection_support_enabled BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure one preference set per user
    UNIQUE(user_id)
);

-- Create updated_at trigger for companion_preferences
DROP TRIGGER IF EXISTS set_companion_preferences_updated_at ON companion_preferences;
CREATE TRIGGER set_companion_preferences_updated_at
    BEFORE UPDATE ON companion_preferences
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- RLS for companion_preferences
ALTER TABLE companion_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own companion preferences" ON companion_preferences;
CREATE POLICY "Users can view own companion preferences"
    ON companion_preferences FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own companion preferences" ON companion_preferences;
CREATE POLICY "Users can insert own companion preferences"
    ON companion_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own companion preferences" ON companion_preferences;
CREATE POLICY "Users can update own companion preferences"
    ON companion_preferences FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own companion preferences" ON companion_preferences;
CREATE POLICY "Users can delete own companion preferences"
    ON companion_preferences FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- PART 3: Create base_cvs table
-- ============================================================================

CREATE TABLE IF NOT EXISTS base_cvs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- CV identification
    name TEXT NOT NULL DEFAULT 'My CV',
    is_primary BOOLEAN DEFAULT FALSE,

    -- File storage
    file_path TEXT, -- Supabase storage path
    file_name TEXT,
    file_url TEXT, -- Public URL for the file
    file_type TEXT, -- 'pdf', 'docx', 'txt'
    file_size INTEGER,
    is_current BOOLEAN DEFAULT FALSE, -- Current active CV

    -- Parsed content
    raw_text TEXT,
    parsed_content JSONB, -- Structured CV data

    -- Analysis results
    quality_score INTEGER, -- 0-100
    analysis_summary TEXT,
    improvement_suggestions JSONB,

    -- Metadata
    last_analyzed_at TIMESTAMPTZ,
    version INTEGER DEFAULT 1,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create updated_at trigger for base_cvs
DROP TRIGGER IF EXISTS set_base_cvs_updated_at ON base_cvs;
CREATE TRIGGER set_base_cvs_updated_at
    BEFORE UPDATE ON base_cvs
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- RLS for base_cvs
ALTER TABLE base_cvs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own base CVs" ON base_cvs;
CREATE POLICY "Users can view own base CVs"
    ON base_cvs FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own base CVs" ON base_cvs;
CREATE POLICY "Users can insert own base CVs"
    ON base_cvs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own base CVs" ON base_cvs;
CREATE POLICY "Users can update own base CVs"
    ON base_cvs FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own base CVs" ON base_cvs;
CREATE POLICY "Users can delete own base CVs"
    ON base_cvs FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- PART 4: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(onboarding_completed, user_type);
CREATE INDEX IF NOT EXISTS idx_companion_preferences_user ON companion_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_base_cvs_user ON base_cvs(user_id);
CREATE INDEX IF NOT EXISTS idx_base_cvs_primary ON base_cvs(user_id, is_primary) WHERE is_primary = TRUE;

-- ============================================================================
-- PART 5: Function to ensure only one primary CV per user
-- ============================================================================

CREATE OR REPLACE FUNCTION ensure_single_primary_cv()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = TRUE THEN
        UPDATE base_cvs
        SET is_primary = FALSE
        WHERE user_id = NEW.user_id
        AND id != NEW.id
        AND is_primary = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_single_primary_cv_trigger ON base_cvs;
CREATE TRIGGER ensure_single_primary_cv_trigger
    BEFORE INSERT OR UPDATE ON base_cvs
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_primary_cv();

-- ============================================================================
-- PART 6: Storage bucket for CVs (run manually in Supabase dashboard if needed)
-- ============================================================================

-- Note: Storage bucket creation must be done via Supabase Dashboard or API
-- Bucket name: 'cvs'
-- Settings: Private bucket, 10MB max file size
-- Allowed MIME types: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain
