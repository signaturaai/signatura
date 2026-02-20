-- ============================================================================
-- Migration 013: Add Job Search Fields to Profiles
-- AI Job Search Agent - Adds columns referenced by the job matching algorithm
-- ============================================================================
-- Note: The prompt references "candidate_profiles" but the actual table in
-- this codebase is "profiles". All columns use ADD COLUMN IF NOT EXISTS
-- for idempotent execution.
-- ============================================================================

-- ============================================================================
-- Job Search Preferences on Profile
-- ============================================================================

-- Target job titles (array of strings, JSONB for flexible querying)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_job_titles JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN profiles.preferred_job_titles IS 'Target job titles e.g. ["VP Product", "Head of Product"] — used by Job Search Agent for matching';

-- Preferred industries (array of strings)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_industries JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN profiles.preferred_industries IS 'Preferred industries e.g. ["Fintech", "Healthcare", "SaaS"] — used by Job Search Agent for matching';

-- Minimum salary expectation
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS minimum_salary_expectation NUMERIC;
COMMENT ON COLUMN profiles.minimum_salary_expectation IS 'Minimum salary expectation — used as baseline by Job Search Agent (overridable via job_search_preferences.salary_min_override)';

-- Salary currency
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS salary_currency TEXT DEFAULT 'USD';
COMMENT ON COLUMN profiles.salary_currency IS 'Currency for salary expectation — default USD';

-- Location preferences (structured JSONB object)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_preferences JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN profiles.location_preferences IS 'Structured location prefs: { city: string, remote_policy: "remote"|"hybrid"|"onsite" }';

-- Company size preferences (array of size ranges)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_size_preferences JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN profiles.company_size_preferences IS 'Preferred company sizes e.g. ["51-200", "201-500"] — used by Job Search Agent';

-- Career goals (free-text aspirational goals)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS career_goals TEXT;
COMMENT ON COLUMN profiles.career_goals IS 'Free-text aspirational career goals — used by Job Search Agent as lowest priority matching signal';

-- General CV analysis (cached AI analysis of base CV)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS general_cv_analysis JSONB;
COMMENT ON COLUMN profiles.general_cv_analysis IS 'Cached AI analysis of base CV: { skills: string[], experience_years: number, industries: string[], seniority_level: string }';

-- ============================================================================
-- Indexes for Job Search Agent queries
-- ============================================================================

-- Index for finding profiles with salary expectations set (for salary matching)
CREATE INDEX IF NOT EXISTS idx_profiles_salary_expectation
  ON profiles(minimum_salary_expectation)
  WHERE minimum_salary_expectation IS NOT NULL;

-- GIN index for JSONB preferred_job_titles (for contains queries)
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_job_titles
  ON profiles USING GIN (preferred_job_titles);

-- GIN index for JSONB preferred_industries
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_industries
  ON profiles USING GIN (preferred_industries);

-- GIN index for general_cv_analysis (for skill matching queries)
CREATE INDEX IF NOT EXISTS idx_profiles_cv_analysis
  ON profiles USING GIN (general_cv_analysis)
  WHERE general_cv_analysis IS NOT NULL;
