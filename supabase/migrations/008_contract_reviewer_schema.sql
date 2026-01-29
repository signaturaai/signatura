-- ============================================================================
-- CONTRACT REVIEWER MODULE - DATABASE SCHEMA
-- Module 5 (Final MVP): Contract Analysis Storage with RLS
-- ============================================================================
-- This migration creates the contract_analyses table for storing
-- AI-powered employment contract analysis results.
--
-- SECURITY: Implements Row Level Security (RLS) to ensure users can only
-- access their own contract analyses.
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE CONTRACT ANALYSES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS contract_analyses (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User ownership (required for RLS)
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Optional link to job application
    job_application_id UUID REFERENCES job_applications(id) ON DELETE SET NULL,

    -- File information
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'png', 'jpg', 'jpeg')),

    -- Extracted content (limited to 50KB for storage efficiency)
    extracted_text TEXT,

    -- AI Analysis result (JSONB for flexible querying)
    analysis JSONB NOT NULL,

    -- Computed summary fields for quick filtering/sorting
    red_flag_count INTEGER NOT NULL DEFAULT 0,
    yellow_flag_count INTEGER NOT NULL DEFAULT 0,
    green_clause_count INTEGER NOT NULL DEFAULT 0,

    -- User interaction tracking
    user_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
    user_notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for user lookups (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_contract_analyses_user_id
    ON contract_analyses(user_id);

-- Index for job application lookups
CREATE INDEX IF NOT EXISTS idx_contract_analyses_job_application_id
    ON contract_analyses(job_application_id);

-- Index for filtering by risk level
CREATE INDEX IF NOT EXISTS idx_contract_analyses_red_flags
    ON contract_analyses(user_id, red_flag_count DESC);

-- Index for chronological sorting
CREATE INDEX IF NOT EXISTS idx_contract_analyses_created_at
    ON contract_analyses(user_id, created_at DESC);

-- GIN index for JSONB analysis field (enables searching within analysis)
CREATE INDEX IF NOT EXISTS idx_contract_analyses_analysis
    ON contract_analyses USING GIN (analysis);

-- ============================================================================
-- STEP 3: ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on the table
ALTER TABLE contract_analyses ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: CREATE RLS POLICIES
-- ============================================================================

-- Policy: Users can only view their own contract analyses
CREATE POLICY "Users can view own contract analyses"
    ON contract_analyses
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can only insert their own contract analyses
CREATE POLICY "Users can insert own contract analyses"
    ON contract_analyses
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own contract analyses
CREATE POLICY "Users can update own contract analyses"
    ON contract_analyses
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own contract analyses
CREATE POLICY "Users can delete own contract analyses"
    ON contract_analyses
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 5: CREATE UPDATED_AT TRIGGER
-- ============================================================================

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_contract_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at on changes
DROP TRIGGER IF EXISTS trigger_update_contract_analyses_updated_at ON contract_analyses;
CREATE TRIGGER trigger_update_contract_analyses_updated_at
    BEFORE UPDATE ON contract_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_contract_analyses_updated_at();

-- ============================================================================
-- STEP 6: ADD CONSTRAINTS FOR DATA INTEGRITY
-- ============================================================================

-- Ensure fairness_score in analysis is valid (1-10)
ALTER TABLE contract_analyses
    ADD CONSTRAINT check_valid_analysis
    CHECK (
        (analysis->>'fairness_score')::INTEGER >= 1
        AND (analysis->>'fairness_score')::INTEGER <= 10
        AND analysis->>'risk_level' IN ('Low', 'Medium', 'High')
    );

-- Ensure flag counts are non-negative
ALTER TABLE contract_analyses
    ADD CONSTRAINT check_flag_counts_non_negative
    CHECK (
        red_flag_count >= 0
        AND yellow_flag_count >= 0
        AND green_clause_count >= 0
    );

-- ============================================================================
-- STEP 7: GRANT PERMISSIONS FOR AUTHENTICATED USERS
-- ============================================================================

-- Grant table access to authenticated users (RLS policies will filter)
GRANT SELECT, INSERT, UPDATE, DELETE ON contract_analyses TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================================

-- Check table exists
SELECT 'contract_analyses table created' as status
WHERE EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_name = 'contract_analyses'
);

-- Check RLS is enabled
SELECT 'RLS enabled' as status, relrowsecurity
FROM pg_class
WHERE relname = 'contract_analyses';

-- Check policies exist
SELECT 'Policies created' as status, count(*) as policy_count
FROM pg_policies
WHERE tablename = 'contract_analyses';
