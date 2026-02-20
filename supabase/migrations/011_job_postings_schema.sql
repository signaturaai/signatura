-- ============================================================================
-- Migration 011: Job Postings Schema
-- AI Job Search Agent - Stores AI-discovered job opportunities matched to candidates
-- ============================================================================

-- ============================================================================
-- Table: job_postings
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Job details
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  company_logo_url TEXT,
  description TEXT,
  location TEXT,
  work_type TEXT CHECK (work_type IN ('remote', 'hybrid', 'onsite', 'flexible')),
  experience_level TEXT,

  -- Compensation
  salary_min NUMERIC,
  salary_max NUMERIC,
  salary_currency TEXT DEFAULT 'USD',

  -- Structured data (JSONB)
  required_skills JSONB DEFAULT '[]'::jsonb,
  benefits JSONB DEFAULT '[]'::jsonb,

  -- Company info
  company_size TEXT,

  -- Source tracking
  source_url TEXT,
  source_platform TEXT,
  posted_date TIMESTAMPTZ,
  discovered_at TIMESTAMPTZ DEFAULT now(),

  -- Matching
  match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  match_breakdown JSONB,
  match_reasons JSONB DEFAULT '[]'::jsonb,

  -- User interaction
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'viewed', 'applied', 'dismissed', 'liked')),
  user_feedback TEXT CHECK (user_feedback IN ('like', 'dislike', 'hide')),
  feedback_reason TEXT,
  discarded_until TIMESTAMPTZ,

  -- Link to job application if user applied
  job_application_id UUID REFERENCES job_applications(id) ON DELETE SET NULL,

  -- Duplicate detection
  content_hash TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add table comment
COMMENT ON TABLE job_postings IS 'AI-discovered job opportunities matched to candidates by the Job Search Agent';

-- Column comments
COMMENT ON COLUMN job_postings.user_id IS 'The candidate this job was matched for';
COMMENT ON COLUMN job_postings.match_score IS '0-100 match percentage - only jobs ≥75% are shown';
COMMENT ON COLUMN job_postings.match_breakdown IS 'Detailed scoring: { skills: 36, experience: 20, location: 12, salary: 15, preferences: 9 }';
COMMENT ON COLUMN job_postings.match_reasons IS 'Array of "Why this fits you" strings';
COMMENT ON COLUMN job_postings.content_hash IS 'Hash of title+company for duplicate detection';
COMMENT ON COLUMN job_postings.discarded_until IS 'If dismissed, do not re-surface until this date (30 days)';

-- ============================================================================
-- Indexes
-- ============================================================================

-- Fast filtering per user by status
CREATE INDEX idx_job_postings_user_status ON job_postings(user_id, status);

-- Top matches for a user (sorted by score descending)
CREATE INDEX idx_job_postings_user_score ON job_postings(user_id, match_score DESC);

-- Duplicate detection per user
CREATE INDEX idx_job_postings_content_hash ON job_postings(user_id, content_hash);

-- Chronological listing
CREATE INDEX idx_job_postings_discovered ON job_postings(discovered_at DESC);

-- Efficient cleanup of expired dismissed jobs
CREATE INDEX idx_job_postings_discarded_until ON job_postings(discarded_until) WHERE discarded_until IS NOT NULL;

-- ============================================================================
-- Updated At Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_job_postings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_job_postings_updated_at
  BEFORE UPDATE ON job_postings
  FOR EACH ROW
  EXECUTE FUNCTION update_job_postings_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;

-- Users can SELECT their own job postings
CREATE POLICY "Users can view their own job postings"
  ON job_postings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can UPDATE their own job postings (limited columns enforced by application)
CREATE POLICY "Users can update their own job postings"
  ON job_postings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Only service role can INSERT (backend discovers jobs)
-- No policy needed - service role bypasses RLS

-- Users can DELETE their own job postings
CREATE POLICY "Users can delete their own job postings"
  ON job_postings
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Service role INSERT policy (explicit for clarity)
-- ============================================================================

-- The service role bypasses RLS by default, but we add this comment for documentation:
-- INSERT operations are restricted to service_role only (no authenticated user policy)
-- This ensures only the backend AI Job Search Agent can create job postings

COMMENT ON POLICY "Users can view their own job postings" ON job_postings IS
  'Candidates can only see jobs matched to them';
COMMENT ON POLICY "Users can update their own job postings" ON job_postings IS
  'Candidates can update status, feedback, and link to applications';
COMMENT ON POLICY "Users can delete their own job postings" ON job_postings IS
  'Candidates can remove jobs from their list';
