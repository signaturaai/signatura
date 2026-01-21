-- ============================================================================
-- SIGNATURA CV TAILORING: BEST OF BOTH WORLDS
-- Schema updates for section-by-section CV comparison
-- ============================================================================

-- ============================================================================
-- PART 1: UPDATE CV_VERSIONS TABLE
-- ============================================================================

-- Add section comparisons column for storing detailed comparison data
ALTER TABLE cv_versions ADD COLUMN IF NOT EXISTS section_comparisons JSONB;

-- Add tailoring strategy column
ALTER TABLE cv_versions ADD COLUMN IF NOT EXISTS tailoring_strategy TEXT DEFAULT 'best_of_both_worlds';

-- Add original and tailored text columns
ALTER TABLE cv_versions ADD COLUMN IF NOT EXISTS original_text TEXT;
ALTER TABLE cv_versions ADD COLUMN IF NOT EXISTS tailored_text TEXT;

-- Add metadata for tailoring
ALTER TABLE cv_versions ADD COLUMN IF NOT EXISTS sections_improved INTEGER DEFAULT 0;
ALTER TABLE cv_versions ADD COLUMN IF NOT EXISTS sections_kept_original INTEGER DEFAULT 0;
ALTER TABLE cv_versions ADD COLUMN IF NOT EXISTS total_sections INTEGER DEFAULT 0;

-- ============================================================================
-- PART 2: CREATE CV_TAILORING_SESSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cv_tailoring_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  application_id UUID REFERENCES job_applications(id) ON DELETE CASCADE,
  cv_version_id UUID REFERENCES cv_versions(id) ON DELETE SET NULL,

  -- Input data
  base_cv_text TEXT NOT NULL,
  job_description TEXT NOT NULL,
  industry TEXT DEFAULT 'generic',

  -- Scoring results
  base_overall_score DECIMAL(3,1),
  tailored_overall_score DECIMAL(3,1),
  final_overall_score DECIMAL(3,1),
  improvement DECIMAL(3,1),

  -- Section analysis
  section_comparisons JSONB,
  sections_improved INTEGER DEFAULT 0,
  sections_kept_original INTEGER DEFAULT 0,

  -- Output
  final_cv_text TEXT,

  -- Status
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  error_message TEXT,

  -- Metadata
  processing_time_ms INTEGER,
  tokens_used INTEGER,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PART 3: ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE cv_tailoring_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tailoring sessions" ON cv_tailoring_sessions;
DROP POLICY IF EXISTS "Users can insert own tailoring sessions" ON cv_tailoring_sessions;
DROP POLICY IF EXISTS "Users can update own tailoring sessions" ON cv_tailoring_sessions;
DROP POLICY IF EXISTS "Users can delete own tailoring sessions" ON cv_tailoring_sessions;

CREATE POLICY "Users can view own tailoring sessions" ON cv_tailoring_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tailoring sessions" ON cv_tailoring_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tailoring sessions" ON cv_tailoring_sessions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tailoring sessions" ON cv_tailoring_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- PART 4: INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_cv_tailoring_sessions_user ON cv_tailoring_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_cv_tailoring_sessions_application ON cv_tailoring_sessions(application_id);
CREATE INDEX IF NOT EXISTS idx_cv_tailoring_sessions_status ON cv_tailoring_sessions(status);
CREATE INDEX IF NOT EXISTS idx_cv_versions_tailoring_strategy ON cv_versions(tailoring_strategy);

-- ============================================================================
-- PART 5: TRIGGER FOR UPDATED_AT
-- ============================================================================

-- Ensure function exists (in case this migration runs independently)
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON cv_tailoring_sessions;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON cv_tailoring_sessions
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'cv_versions columns: ' || string_agg(column_name, ', ')
FROM information_schema.columns
WHERE table_name = 'cv_versions'
AND column_name IN ('section_comparisons', 'tailoring_strategy', 'original_text', 'tailored_text');
