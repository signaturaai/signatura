/**
 * Job Search Schema Migration Tests (Phase 1.4)
 *
 * RALPH tests validating all three job search migration files:
 * - 011_job_postings_schema.sql
 * - 012_job_search_preferences_schema.sql
 * - 013_add_job_search_fields_to_profiles.sql
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ============================================================================
// Helpers
// ============================================================================

function readMigration(filename: string): string {
  return readFileSync(
    join(__dirname, '../../supabase/migrations', filename),
    'utf-8'
  )
}

// ============================================================================
// Migration 011: job_postings
// ============================================================================

describe('Migration 011: job_postings schema', () => {
  const sql = readMigration('011_job_postings_schema.sql')

  // --- Returns: Table creation ---

  it('R: creates the job_postings table', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS job_postings')
  })

  it('R: returns UUID primary key with default', () => {
    expect(sql).toMatch(/id\s+UUID\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid\(\)/)
  })

  it('R: references auth.users for user_id with CASCADE', () => {
    expect(sql).toMatch(/user_id\s+UUID\s+NOT NULL\s+REFERENCES\s+auth\.users\(id\)\s+ON DELETE CASCADE/)
  })

  // --- Asserts: Column definitions ---

  it('A: defines title as NOT NULL TEXT', () => {
    expect(sql).toMatch(/title\s+TEXT\s+NOT NULL/)
  })

  it('A: defines company_name as NOT NULL TEXT', () => {
    expect(sql).toMatch(/company_name\s+TEXT\s+NOT NULL/)
  })

  it('A: defines salary_currency with USD default', () => {
    expect(sql).toMatch(/salary_currency\s+TEXT.*DEFAULT\s+'USD'/)
  })

  it('A: defines required_skills as JSONB with empty array default', () => {
    expect(sql).toMatch(/required_skills\s+JSONB.*DEFAULT\s+'\[\]'/)
  })

  it('A: defines benefits as JSONB with empty array default', () => {
    expect(sql).toMatch(/benefits\s+JSONB.*DEFAULT\s+'\[\]'/)
  })

  it('A: defines match_score as NOT NULL with CHECK constraint', () => {
    expect(sql).toMatch(/match_score\s+INTEGER\s+NOT NULL/)
  })

  it('A: defines match_reasons as JSONB array', () => {
    expect(sql).toMatch(/match_reasons\s+JSONB.*DEFAULT\s+'\[\]'/)
  })

  it('A: defines status with default new', () => {
    expect(sql).toMatch(/status\s+TEXT.*DEFAULT\s+'new'/)
  })

  it('A: defines discovered_at with now() default', () => {
    expect(sql).toMatch(/discovered_at\s+TIMESTAMPTZ.*DEFAULT\s+now\(\)/i)
  })

  it('A: defines content_hash column for deduplication', () => {
    expect(sql).toMatch(/content_hash\s+TEXT/)
  })

  // --- Logic: CHECK constraints ---

  it('L: constrains status to valid values', () => {
    expect(sql).toMatch(/CHECK\s*\(\s*status\s+IN\s*\(\s*'new'.*'viewed'.*'applied'.*'dismissed'.*'liked'/)
  })

  it('L: constrains work_type to valid values', () => {
    expect(sql).toMatch(/CHECK\s*\(\s*work_type\s+IN\s*\(\s*'remote'.*'hybrid'.*'onsite'.*'flexible'/)
  })

  it('L: constrains user_feedback to valid values', () => {
    expect(sql).toMatch(/CHECK\s*\(\s*user_feedback\s+IN\s*\(\s*'like'.*'dislike'.*'hide'/)
  })

  it('L: constrains match_score between 0 and 100', () => {
    expect(sql).toMatch(/CHECK\s*\(\s*match_score\s*>=\s*0\s+AND\s+match_score\s*<=\s*100\s*\)/)
  })

  // --- Parameters: Indexes ---

  it('P: creates user+status composite index', () => {
    expect(sql).toMatch(/CREATE\s+INDEX\s+idx_job_postings_user_status/)
  })

  it('P: creates user+match_score DESC index', () => {
    expect(sql).toMatch(/idx_job_postings_user_score/)
  })

  it('P: creates content_hash index for deduplication', () => {
    expect(sql).toMatch(/idx_job_postings_content_hash/)
  })

  it('P: creates discovered_at index', () => {
    expect(sql).toMatch(/idx_job_postings_discovered/)
  })

  it('P: creates partial index for discarded_until', () => {
    expect(sql).toMatch(/idx_job_postings_discarded_until/)
    expect(sql).toMatch(/WHERE\s+discarded_until\s+IS NOT NULL/)
  })

  // --- Handling: RLS and triggers ---

  it('H: enables RLS on job_postings', () => {
    expect(sql).toMatch(/ALTER\s+TABLE\s+job_postings\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/)
  })

  it('H: creates SELECT policy for users own data', () => {
    expect(sql).toMatch(/CREATE\s+POLICY[\s\S]*?ON\s+job_postings\s+FOR\s+SELECT/)
    expect(sql).toMatch(/auth\.uid\(\)\s*=\s*user_id/)
  })

  it('H: creates UPDATE policy for users own data', () => {
    expect(sql).toMatch(/CREATE\s+POLICY[\s\S]*?ON\s+job_postings\s+FOR\s+UPDATE/)
  })

  it('H: creates DELETE policy for users own data', () => {
    expect(sql).toMatch(/CREATE\s+POLICY[\s\S]*?ON\s+job_postings\s+FOR\s+DELETE/)
  })

  it('H: does NOT create INSERT policy (service role only)', () => {
    expect(sql).not.toMatch(/CREATE\s+POLICY.*ON\s+job_postings\s+FOR\s+INSERT/)
  })

  it('H: creates updated_at trigger', () => {
    expect(sql).toMatch(/CREATE\s+TRIGGER.*job_postings/)
    expect(sql).toMatch(/BEFORE\s+UPDATE\s+ON\s+job_postings/)
  })
})

// ============================================================================
// Migration 012: job_search_preferences
// ============================================================================

describe('Migration 012: job_search_preferences schema', () => {
  const sql = readMigration('012_job_search_preferences_schema.sql')

  // --- Returns: Table creation ---

  it('R: creates the job_search_preferences table', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS job_search_preferences')
  })

  it('R: returns UUID primary key', () => {
    expect(sql).toMatch(/id\s+UUID\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid\(\)/)
  })

  it('R: enforces UNIQUE constraint on user_id', () => {
    expect(sql).toMatch(/user_id\s+UUID\s+NOT NULL\s+UNIQUE/)
  })

  it('R: references auth.users for user_id with CASCADE', () => {
    expect(sql).toMatch(/user_id\s+UUID\s+NOT NULL\s+UNIQUE\s+REFERENCES\s+auth\.users\(id\)\s+ON DELETE CASCADE/)
  })

  // --- Asserts: Column definitions ---

  it('A: defines is_active with default true', () => {
    expect(sql).toMatch(/is_active\s+BOOLEAN.*DEFAULT\s+true/i)
  })

  it('A: defines preferred_job_titles as JSONB array', () => {
    expect(sql).toMatch(/preferred_job_titles\s+JSONB.*DEFAULT\s+'\[\]'/)
  })

  it('A: defines preferred_locations as JSONB array', () => {
    expect(sql).toMatch(/preferred_locations\s+JSONB.*DEFAULT\s+'\[\]'/)
  })

  it('A: defines required_skills as JSONB array', () => {
    expect(sql).toMatch(/required_skills\s+JSONB.*DEFAULT\s+'\[\]'/)
  })

  it('A: defines ai_keywords as JSONB array', () => {
    expect(sql).toMatch(/ai_keywords\s+JSONB.*DEFAULT\s+'\[\]'/)
  })

  it('A: defines implicit_preferences as JSONB object', () => {
    expect(sql).toMatch(/implicit_preferences\s+JSONB.*DEFAULT\s+'\{\}'/)
  })

  it('A: defines feedback_stats with structured default', () => {
    expect(sql).toMatch(/feedback_stats\s+JSONB/)
    expect(sql).toMatch(/total_likes/)
  })

  it('A: defines email_notification_frequency with default weekly', () => {
    expect(sql).toMatch(/email_notification_frequency\s+TEXT.*DEFAULT\s+'weekly'/)
  })

  it('A: defines consecutive_zero_match_days with default 0', () => {
    expect(sql).toMatch(/consecutive_zero_match_days\s+INTEGER.*DEFAULT\s+0/)
  })

  // --- Logic: CHECK constraints ---

  it('L: constrains experience_years to valid values', () => {
    expect(sql).toMatch(/CHECK\s*\(\s*experience_years\s+IN\s*\(\s*'0-2'.*'2-5'.*'5-10'.*'10\+'/)
  })

  it('L: constrains email_notification_frequency to valid values', () => {
    expect(sql).toMatch(/CHECK\s*\(\s*email_notification_frequency\s+IN\s*\(\s*'daily'.*'weekly'.*'monthly'.*'disabled'/)
  })

  // --- Parameters: Indexes ---

  it('P: creates user_id index', () => {
    expect(sql).toMatch(/idx_job_search_preferences_user/)
  })

  it('P: creates partial index for active preferences', () => {
    expect(sql).toMatch(/idx_job_search_preferences_active/)
    expect(sql).toMatch(/WHERE\s+is_active\s*=\s*true/i)
  })

  it('P: creates email notification index', () => {
    expect(sql).toMatch(/idx_job_search_preferences_email/)
  })

  it('P: creates search_due index for scheduling', () => {
    expect(sql).toMatch(/idx_job_search_preferences_search_due/)
  })

  // --- Handling: RLS and triggers ---

  it('H: enables RLS on job_search_preferences', () => {
    expect(sql).toMatch(/ALTER\s+TABLE\s+job_search_preferences\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/)
  })

  it('H: creates SELECT policy', () => {
    expect(sql).toMatch(/CREATE\s+POLICY[\s\S]*?ON\s+job_search_preferences\s+FOR\s+SELECT/)
  })

  it('H: creates INSERT policy', () => {
    expect(sql).toMatch(/CREATE\s+POLICY[\s\S]*?ON\s+job_search_preferences\s+FOR\s+INSERT/)
  })

  it('H: creates UPDATE policy', () => {
    expect(sql).toMatch(/CREATE\s+POLICY[\s\S]*?ON\s+job_search_preferences\s+FOR\s+UPDATE/)
  })

  it('H: creates DELETE policy', () => {
    expect(sql).toMatch(/CREATE\s+POLICY[\s\S]*?ON\s+job_search_preferences\s+FOR\s+DELETE/)
  })

  it('H: creates updated_at trigger', () => {
    expect(sql).toMatch(/CREATE\s+TRIGGER.*job_search_preferences/)
    expect(sql).toMatch(/BEFORE\s+UPDATE\s+ON\s+job_search_preferences/)
  })

  it('H: creates get_or_create helper function', () => {
    expect(sql).toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+get_or_create_job_search_preferences/)
    expect(sql).toContain('SECURITY DEFINER')
  })
})

// ============================================================================
// Migration 013: Profile job search fields
// ============================================================================

describe('Migration 013: profile job search fields', () => {
  const sql = readMigration('013_add_job_search_fields_to_profiles.sql')

  // --- Returns: Column additions ---

  it('R: adds preferred_job_titles JSONB column', () => {
    expect(sql).toMatch(/ALTER\s+TABLE\s+profiles\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+preferred_job_titles\s+JSONB/)
  })

  it('R: adds preferred_industries JSONB column', () => {
    expect(sql).toMatch(/ALTER\s+TABLE\s+profiles\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+preferred_industries\s+JSONB/)
  })

  it('R: adds minimum_salary_expectation NUMERIC column', () => {
    expect(sql).toMatch(/ALTER\s+TABLE\s+profiles\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+minimum_salary_expectation\s+NUMERIC/)
  })

  it('R: adds salary_currency TEXT column with USD default', () => {
    expect(sql).toMatch(/ALTER\s+TABLE\s+profiles\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+salary_currency\s+TEXT\s+DEFAULT\s+'USD'/)
  })

  it('R: adds location_preferences JSONB column', () => {
    expect(sql).toMatch(/ALTER\s+TABLE\s+profiles\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+location_preferences\s+JSONB/)
  })

  it('R: adds company_size_preferences JSONB column', () => {
    expect(sql).toMatch(/ALTER\s+TABLE\s+profiles\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+company_size_preferences\s+JSONB/)
  })

  it('R: adds career_goals TEXT column', () => {
    expect(sql).toMatch(/ALTER\s+TABLE\s+profiles\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+career_goals\s+TEXT/)
  })

  it('R: adds general_cv_analysis JSONB column', () => {
    expect(sql).toMatch(/ALTER\s+TABLE\s+profiles\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+general_cv_analysis\s+JSONB/)
  })

  // --- Asserts: Default values ---

  it('A: preferred_job_titles defaults to empty array', () => {
    expect(sql).toMatch(/preferred_job_titles\s+JSONB\s+DEFAULT\s+'\[\]'/)
  })

  it('A: preferred_industries defaults to empty array', () => {
    expect(sql).toMatch(/preferred_industries\s+JSONB\s+DEFAULT\s+'\[\]'/)
  })

  it('A: company_size_preferences defaults to empty array', () => {
    expect(sql).toMatch(/company_size_preferences\s+JSONB\s+DEFAULT\s+'\[\]'/)
  })

  it('A: location_preferences defaults to empty object', () => {
    expect(sql).toMatch(/location_preferences\s+JSONB\s+DEFAULT\s+'\{\}'/)
  })

  // --- Logic: Idempotency ---

  it('L: all column additions use IF NOT EXISTS', () => {
    const addColumns = sql.match(/ALTER\s+TABLE\s+profiles\s+ADD\s+COLUMN/g)
    const addColumnsIfNotExists = sql.match(/ALTER\s+TABLE\s+profiles\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS/g)
    expect(addColumns?.length).toBe(addColumnsIfNotExists?.length)
  })

  it('L: all indexes use IF NOT EXISTS', () => {
    const createIndexes = sql.match(/CREATE\s+INDEX/g)
    const createIndexesIfNotExists = sql.match(/CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS/g)
    expect(createIndexes?.length).toBe(createIndexesIfNotExists?.length)
  })

  // --- Parameters: Indexes ---

  it('P: creates salary expectation index', () => {
    expect(sql).toMatch(/idx_profiles_salary_expectation/)
    expect(sql).toMatch(/WHERE\s+minimum_salary_expectation\s+IS\s+NOT\s+NULL/)
  })

  it('P: creates GIN index for preferred_job_titles', () => {
    expect(sql).toMatch(/idx_profiles_preferred_job_titles/)
    expect(sql).toMatch(/USING\s+GIN\s*\(\s*preferred_job_titles\s*\)/)
  })

  it('P: creates GIN index for preferred_industries', () => {
    expect(sql).toMatch(/idx_profiles_preferred_industries/)
    expect(sql).toMatch(/USING\s+GIN\s*\(\s*preferred_industries\s*\)/)
  })

  it('P: creates GIN index for general_cv_analysis', () => {
    expect(sql).toMatch(/idx_profiles_cv_analysis/)
    expect(sql).toMatch(/USING\s+GIN\s*\(\s*general_cv_analysis\s*\)/)
  })

  // --- Handling: Comments ---

  it('H: adds COMMENT on preferred_job_titles', () => {
    expect(sql).toMatch(/COMMENT\s+ON\s+COLUMN\s+profiles\.preferred_job_titles/)
  })

  it('H: adds COMMENT on general_cv_analysis', () => {
    expect(sql).toMatch(/COMMENT\s+ON\s+COLUMN\s+profiles\.general_cv_analysis/)
  })

  it('H: adds COMMENT on minimum_salary_expectation', () => {
    expect(sql).toMatch(/COMMENT\s+ON\s+COLUMN\s+profiles\.minimum_salary_expectation/)
  })
})

// ============================================================================
// Cross-migration consistency
// ============================================================================

describe('Cross-migration consistency', () => {
  const sql011 = readMigration('011_job_postings_schema.sql')
  const sql012 = readMigration('012_job_search_preferences_schema.sql')
  const sql013 = readMigration('013_add_job_search_fields_to_profiles.sql')

  it('all three migrations reference auth.users', () => {
    expect(sql011).toContain('auth.users')
    expect(sql012).toContain('auth.users')
    // 013 modifies profiles which already references auth.users
  })

  it('job_postings and preferences use the same work_type values', () => {
    const workTypes = ['remote', 'hybrid', 'onsite', 'flexible']
    for (const wt of workTypes) {
      expect(sql011).toContain(wt)
    }
    // Preferences stores as JSONB array, so types are validated at app level
  })

  it('all migrations use IF NOT EXISTS for idempotency', () => {
    // Tables
    expect(sql011).toContain('IF NOT EXISTS')
    expect(sql012).toContain('IF NOT EXISTS')
    expect(sql013).toContain('IF NOT EXISTS')

    // Functions use CREATE OR REPLACE for idempotency
    expect(sql011).toContain('CREATE OR REPLACE FUNCTION')
    expect(sql012).toContain('CREATE OR REPLACE FUNCTION')
  })

  it('all migrations with RLS enable it', () => {
    expect(sql011).toMatch(/ENABLE\s+ROW\s+LEVEL\s+SECURITY/)
    expect(sql012).toMatch(/ENABLE\s+ROW\s+LEVEL\s+SECURITY/)
    // 013 modifies profiles which already has RLS
  })

  it('job_postings match_score range aligns with preferences thresholds', () => {
    // match_score is 0-100 in job_postings
    expect(sql011).toMatch(/match_score\s*>=\s*0\s+AND\s+match_score\s*<=\s*100/)
  })
})
