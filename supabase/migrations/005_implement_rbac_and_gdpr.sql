-- ============================================================================
-- SIGNATURA: RBAC AND GDPR COMPLIANCE
-- Implements role-based access control and GDPR compliance features
-- ============================================================================
-- User Types: candidate OR recruiter (mutually exclusive)
-- Admin Flag: additive (can be candidate+admin or recruiter+admin)
-- ============================================================================

-- ============================================================================
-- PART 1: UPDATE PROFILES TABLE FOR RBAC
-- ============================================================================

-- Add new columns for RBAC
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_type TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Migrate existing data (if any users exist with old role column)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
    UPDATE profiles
    SET user_type = CASE
      WHEN role = 'candidate' THEN 'candidate'
      WHEN role = 'recruiter' THEN 'recruiter'
      WHEN role = 'admin' THEN 'candidate'
      ELSE 'candidate'
    END
    WHERE user_type IS NULL;

    UPDATE profiles
    SET is_admin = (role = 'admin')
    WHERE is_admin IS NULL OR is_admin = FALSE;
  ELSE
    -- No role column, default all to candidate
    UPDATE profiles
    SET user_type = 'candidate'
    WHERE user_type IS NULL;
  END IF;
END $$;

-- Set default for new users
ALTER TABLE profiles ALTER COLUMN user_type SET DEFAULT 'candidate';

-- Add check constraint for valid user types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_user_type') THEN
    ALTER TABLE profiles ADD CONSTRAINT check_user_type
      CHECK (user_type IN ('candidate', 'recruiter'));
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);

-- ============================================================================
-- PART 2: ADD GDPR COMPLIANCE FIELDS TO PROFILES
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_policy_accepted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS marketing_emails_consent BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS data_processing_consent BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- PART 3: CREATE ACCOUNT DELETION REQUESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_deletion_date TIMESTAMPTZ NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deletion_requests_user_id ON account_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON account_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_scheduled ON account_deletion_requests(scheduled_deletion_date);

-- ============================================================================
-- PART 4: CREATE CONSENT LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('privacy_policy', 'terms_of_service', 'marketing_emails', 'data_processing', 'cookies')),
  action TEXT NOT NULL CHECK (action IN ('granted', 'revoked')),
  version TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_log_user_id ON consent_log(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_log_type ON consent_log(consent_type);
CREATE INDEX IF NOT EXISTS idx_consent_log_created ON consent_log(created_at);

-- ============================================================================
-- PART 5: CREATE JOB POSTINGS TABLE (FOR RECRUITERS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  company_name TEXT NOT NULL,
  position_title TEXT NOT NULL,
  job_description TEXT NOT NULL,
  requirements TEXT,
  location TEXT,
  remote_policy TEXT CHECK (remote_policy IN ('remote', 'hybrid', 'onsite')),
  salary_range_min DECIMAL(12,2),
  salary_range_max DECIMAL(12,2),
  salary_currency TEXT DEFAULT 'USD',
  employment_type TEXT CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'internship', 'temporary')),
  experience_level TEXT CHECK (experience_level IN ('entry', 'mid', 'senior', 'lead', 'executive')),
  industry TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'paused', 'closed')),
  published_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,
  views_count INTEGER DEFAULT 0,
  applications_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_postings_recruiter ON job_postings(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status);
CREATE INDEX IF NOT EXISTS idx_job_postings_industry ON job_postings(industry);

-- ============================================================================
-- PART 6: ENABLE RLS ON NEW TABLES
-- ============================================================================

ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 7: RLS POLICIES FOR ACCOUNT DELETION REQUESTS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own deletion requests" ON account_deletion_requests;
DROP POLICY IF EXISTS "Users can create own deletion requests" ON account_deletion_requests;
DROP POLICY IF EXISTS "Users can cancel own deletion requests" ON account_deletion_requests;
DROP POLICY IF EXISTS "Admins can view all deletion requests" ON account_deletion_requests;

CREATE POLICY "Users can view own deletion requests"
  ON account_deletion_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own deletion requests"
  ON account_deletion_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel own deletion requests"
  ON account_deletion_requests FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all deletion requests"
  ON account_deletion_requests FOR SELECT
  USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()) = true);

-- ============================================================================
-- PART 8: RLS POLICIES FOR CONSENT LOG
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own consent log" ON consent_log;
DROP POLICY IF EXISTS "Users can insert own consent log" ON consent_log;
DROP POLICY IF EXISTS "Admins can view all consent logs" ON consent_log;

CREATE POLICY "Users can view own consent log"
  ON consent_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consent log"
  ON consent_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all consent logs"
  ON consent_log FOR SELECT
  USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()) = true);

-- ============================================================================
-- PART 9: RLS POLICIES FOR JOB POSTINGS
-- ============================================================================

DROP POLICY IF EXISTS "Recruiters can view own job postings" ON job_postings;
DROP POLICY IF EXISTS "Recruiters can insert own job postings" ON job_postings;
DROP POLICY IF EXISTS "Recruiters can update own job postings" ON job_postings;
DROP POLICY IF EXISTS "Recruiters can delete own job postings" ON job_postings;
DROP POLICY IF EXISTS "Anyone can view published job postings" ON job_postings;
DROP POLICY IF EXISTS "Admins can view all job postings" ON job_postings;

CREATE POLICY "Recruiters can view own job postings"
  ON job_postings FOR SELECT
  USING (
    auth.uid() = recruiter_id
    AND (SELECT user_type FROM profiles WHERE id = auth.uid()) = 'recruiter'
  );

CREATE POLICY "Recruiters can insert own job postings"
  ON job_postings FOR INSERT
  WITH CHECK (
    auth.uid() = recruiter_id
    AND (SELECT user_type FROM profiles WHERE id = auth.uid()) = 'recruiter'
  );

CREATE POLICY "Recruiters can update own job postings"
  ON job_postings FOR UPDATE
  USING (
    auth.uid() = recruiter_id
    AND (SELECT user_type FROM profiles WHERE id = auth.uid()) = 'recruiter'
  );

CREATE POLICY "Recruiters can delete own job postings"
  ON job_postings FOR DELETE
  USING (
    auth.uid() = recruiter_id
    AND (SELECT user_type FROM profiles WHERE id = auth.uid()) = 'recruiter'
  );

CREATE POLICY "Anyone can view published job postings"
  ON job_postings FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can view all job postings"
  ON job_postings FOR SELECT
  USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()) = true);

-- ============================================================================
-- PART 10: UPDATE JOB APPLICATIONS RLS FOR RBAC
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own applications" ON job_applications;
DROP POLICY IF EXISTS "Users can insert own applications" ON job_applications;
DROP POLICY IF EXISTS "Users can update own applications" ON job_applications;
DROP POLICY IF EXISTS "Users can delete own applications" ON job_applications;
DROP POLICY IF EXISTS "Candidates can view own applications" ON job_applications;
DROP POLICY IF EXISTS "Candidates can insert own applications" ON job_applications;
DROP POLICY IF EXISTS "Candidates can update own applications" ON job_applications;
DROP POLICY IF EXISTS "Candidates can delete own applications" ON job_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON job_applications;

-- Create role-specific policies
CREATE POLICY "Candidates can view own applications"
  ON job_applications FOR SELECT
  USING (
    auth.uid() = user_id
    AND (SELECT user_type FROM profiles WHERE id = auth.uid()) = 'candidate'
  );

CREATE POLICY "Candidates can insert own applications"
  ON job_applications FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (SELECT user_type FROM profiles WHERE id = auth.uid()) = 'candidate'
  );

CREATE POLICY "Candidates can update own applications"
  ON job_applications FOR UPDATE
  USING (
    auth.uid() = user_id
    AND (SELECT user_type FROM profiles WHERE id = auth.uid()) = 'candidate'
  );

CREATE POLICY "Candidates can delete own applications"
  ON job_applications FOR DELETE
  USING (
    auth.uid() = user_id
    AND (SELECT user_type FROM profiles WHERE id = auth.uid()) = 'candidate'
  );

CREATE POLICY "Admins can view all applications"
  ON job_applications FOR SELECT
  USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()) = true);

-- ============================================================================
-- PART 11: UPDATE CV VERSIONS RLS FOR RBAC
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own CV versions" ON cv_versions;
DROP POLICY IF EXISTS "Users can insert own CV versions" ON cv_versions;
DROP POLICY IF EXISTS "Users can update own CV versions" ON cv_versions;
DROP POLICY IF EXISTS "Users can delete own CV versions" ON cv_versions;
DROP POLICY IF EXISTS "Candidates can view own CV versions" ON cv_versions;
DROP POLICY IF EXISTS "Candidates can insert own CV versions" ON cv_versions;
DROP POLICY IF EXISTS "Candidates can update own CV versions" ON cv_versions;
DROP POLICY IF EXISTS "Candidates can delete own CV versions" ON cv_versions;

CREATE POLICY "Candidates can view own CV versions"
  ON cv_versions FOR SELECT
  USING (
    auth.uid() = user_id
    AND (SELECT user_type FROM profiles WHERE id = auth.uid()) = 'candidate'
  );

CREATE POLICY "Candidates can insert own CV versions"
  ON cv_versions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (SELECT user_type FROM profiles WHERE id = auth.uid()) = 'candidate'
  );

CREATE POLICY "Candidates can update own CV versions"
  ON cv_versions FOR UPDATE
  USING (
    auth.uid() = user_id
    AND (SELECT user_type FROM profiles WHERE id = auth.uid()) = 'candidate'
  );

CREATE POLICY "Candidates can delete own CV versions"
  ON cv_versions FOR DELETE
  USING (
    auth.uid() = user_id
    AND (SELECT user_type FROM profiles WHERE id = auth.uid()) = 'candidate'
  );

-- ============================================================================
-- PART 12: UPDATE CV TAILORING SESSIONS RLS FOR RBAC
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own tailoring sessions" ON cv_tailoring_sessions;
DROP POLICY IF EXISTS "Users can insert own tailoring sessions" ON cv_tailoring_sessions;
DROP POLICY IF EXISTS "Users can update own tailoring sessions" ON cv_tailoring_sessions;
DROP POLICY IF EXISTS "Users can delete own tailoring sessions" ON cv_tailoring_sessions;

CREATE POLICY "Candidates can view own tailoring sessions"
  ON cv_tailoring_sessions FOR SELECT
  USING (
    auth.uid() = user_id
    AND (SELECT user_type FROM profiles WHERE id = auth.uid()) = 'candidate'
  );

CREATE POLICY "Candidates can insert own tailoring sessions"
  ON cv_tailoring_sessions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (SELECT user_type FROM profiles WHERE id = auth.uid()) = 'candidate'
  );

CREATE POLICY "Candidates can update own tailoring sessions"
  ON cv_tailoring_sessions FOR UPDATE
  USING (
    auth.uid() = user_id
    AND (SELECT user_type FROM profiles WHERE id = auth.uid()) = 'candidate'
  );

CREATE POLICY "Candidates can delete own tailoring sessions"
  ON cv_tailoring_sessions FOR DELETE
  USING (
    auth.uid() = user_id
    AND (SELECT user_type FROM profiles WHERE id = auth.uid()) = 'candidate'
  );

-- ============================================================================
-- PART 13: TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Ensure handle_updated_at function exists
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON job_postings;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON job_postings
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Profiles columns added: ' || string_agg(column_name, ', ')
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('user_type', 'is_admin', 'privacy_policy_accepted_at', 'terms_accepted_at', 'marketing_emails_consent');

SELECT 'New tables created: account_deletion_requests, consent_log, job_postings' AS status;
