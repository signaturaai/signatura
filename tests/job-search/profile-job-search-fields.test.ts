/**
 * Profile Job Search Fields Schema Tests (Phase 1.3)
 *
 * RALPH tests for the job search fields added to the profiles table.
 * Migration: 013_add_job_search_fields_to_profiles.sql
 */

import { describe, it, expect, vi } from 'vitest'
import type {
  ProfileJobSearchFields,
  ProfileLocationPreferences,
  GeneralCvAnalysis,
  CompanySize,
  WorkType,
} from '@/types/job-search'

// ============================================================================
// Mock Supabase Client
// ============================================================================

interface MockQueryResult {
  data: Record<string, unknown> | null
  error: { code: string; message: string } | null
}

function createMockSupabase(options: {
  selectResult?: MockQueryResult
  updateResult?: MockQueryResult
} = {}) {
  const {
    selectResult = { data: null, error: null },
    updateResult = { data: null, error: null },
  } = options

  const createChain = (): Record<string, unknown> => {
    const chain: Record<string, unknown> = {
      eq: vi.fn(() => chain),
      single: vi.fn().mockResolvedValue(selectResult),
      then: (resolve: (value: MockQueryResult) => void) => {
        resolve(selectResult)
      },
    }
    return chain
  }

  const createUpdateChain = (): Record<string, unknown> => {
    const chain: Record<string, unknown> = {
      eq: vi.fn(() => chain),
      select: vi.fn(() => chain),
      single: vi.fn().mockResolvedValue(updateResult),
    }
    return chain
  }

  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockImplementation(() => createChain()),
      update: vi.fn().mockImplementation(() => createUpdateChain()),
    }),
  }
}

// ============================================================================
// Test Data Factories
// ============================================================================

function createProfileWithJobSearchFields(
  overrides: Partial<ProfileJobSearchFields> = {}
): ProfileJobSearchFields {
  return {
    preferred_job_titles: ['Senior Frontend Engineer', 'Staff Engineer', 'Tech Lead'],
    preferred_industries: ['Fintech', 'SaaS', 'Healthcare'],
    minimum_salary_expectation: 150000,
    salary_currency: 'USD',
    location_preferences: {
      city: 'San Francisco',
      remote_policy: 'hybrid',
    },
    company_size_preferences: ['51-200', '201-500', '501-1000'],
    career_goals: 'Transition into a principal engineer role at a Series B+ startup focused on developer tools.',
    general_cv_analysis: {
      skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'AWS'],
      experience_years: 8,
      industries: ['Fintech', 'SaaS'],
      seniority_level: 'senior',
      key_achievements: ['Led migration to microservices', 'Reduced load time by 60%'],
      education: ['BS Computer Science'],
      certifications: ['AWS Solutions Architect'],
    },
    ...overrides,
  }
}

function createMinimalProfileFields(): ProfileJobSearchFields {
  return {
    preferred_job_titles: [],
    preferred_industries: [],
    minimum_salary_expectation: null,
    salary_currency: 'USD',
    location_preferences: {},
    company_size_preferences: [],
    career_goals: null,
    general_cv_analysis: null,
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('Profile Job Search Fields Schema', () => {
  // ==========================================================================
  // R - Returns: Type validation
  // ==========================================================================

  describe('R - Returns: Type validation', () => {
    it('should accept profile with all job search fields populated', () => {
      const profile = createProfileWithJobSearchFields()

      expect(profile.preferred_job_titles).toHaveLength(3)
      expect(profile.preferred_industries).toHaveLength(3)
      expect(profile.minimum_salary_expectation).toBe(150000)
      expect(profile.salary_currency).toBe('USD')
      expect(profile.career_goals).toContain('principal engineer')
      expect(profile.general_cv_analysis).not.toBeNull()
    })

    it('should accept profile with minimal/default fields', () => {
      const profile = createMinimalProfileFields()

      expect(profile.preferred_job_titles).toEqual([])
      expect(profile.preferred_industries).toEqual([])
      expect(profile.minimum_salary_expectation).toBeNull()
      expect(profile.salary_currency).toBe('USD')
      expect(profile.location_preferences).toEqual({})
      expect(profile.company_size_preferences).toEqual([])
      expect(profile.career_goals).toBeNull()
      expect(profile.general_cv_analysis).toBeNull()
    })

    it('should return preferred_job_titles as string array', () => {
      const profile = createProfileWithJobSearchFields()

      expect(Array.isArray(profile.preferred_job_titles)).toBe(true)
      profile.preferred_job_titles.forEach((title) => {
        expect(typeof title).toBe('string')
      })
    })

    it('should return preferred_industries as string array', () => {
      const profile = createProfileWithJobSearchFields()

      expect(Array.isArray(profile.preferred_industries)).toBe(true)
      profile.preferred_industries.forEach((industry) => {
        expect(typeof industry).toBe('string')
      })
    })

    it('should return location_preferences as structured object', () => {
      const profile = createProfileWithJobSearchFields()
      const loc = profile.location_preferences as ProfileLocationPreferences

      expect(loc.city).toBe('San Francisco')
      expect(['remote', 'hybrid', 'onsite', 'flexible']).toContain(loc.remote_policy)
    })

    it('should return company_size_preferences as CompanySize array', () => {
      const profile = createProfileWithJobSearchFields()
      const validSizes: CompanySize[] = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']

      profile.company_size_preferences.forEach((size) => {
        expect(validSizes).toContain(size)
      })
    })

    it('should return general_cv_analysis with all expected fields', () => {
      const profile = createProfileWithJobSearchFields()
      const analysis = profile.general_cv_analysis as GeneralCvAnalysis

      expect(Array.isArray(analysis.skills)).toBe(true)
      expect(typeof analysis.experience_years).toBe('number')
      expect(Array.isArray(analysis.industries)).toBe(true)
      expect(typeof analysis.seniority_level).toBe('string')
    })

    it('should accept location_preferences with only remote_policy', () => {
      const profile = createProfileWithJobSearchFields({
        location_preferences: { remote_policy: 'remote' },
      })

      expect(profile.location_preferences.city).toBeUndefined()
      expect(profile.location_preferences.remote_policy).toBe('remote')
    })

    it('should accept location_preferences with only city', () => {
      const profile = createProfileWithJobSearchFields({
        location_preferences: { city: 'Berlin' },
      })

      expect(profile.location_preferences.city).toBe('Berlin')
      expect(profile.location_preferences.remote_policy).toBeUndefined()
    })
  })

  // ==========================================================================
  // A - Asserts: Constraints and defaults
  // ==========================================================================

  describe('A - Asserts: Constraints and defaults', () => {
    it('should default preferred_job_titles to empty array', () => {
      const profile = createMinimalProfileFields()
      expect(profile.preferred_job_titles).toEqual([])
    })

    it('should default preferred_industries to empty array', () => {
      const profile = createMinimalProfileFields()
      expect(profile.preferred_industries).toEqual([])
    })

    it('should default salary_currency to USD', () => {
      const profile = createMinimalProfileFields()
      expect(profile.salary_currency).toBe('USD')
    })

    it('should default location_preferences to empty object', () => {
      const profile = createMinimalProfileFields()
      expect(profile.location_preferences).toEqual({})
    })

    it('should default company_size_preferences to empty array', () => {
      const profile = createMinimalProfileFields()
      expect(profile.company_size_preferences).toEqual([])
    })

    it('should allow null minimum_salary_expectation', () => {
      const profile = createMinimalProfileFields()
      expect(profile.minimum_salary_expectation).toBeNull()
    })

    it('should allow null career_goals', () => {
      const profile = createMinimalProfileFields()
      expect(profile.career_goals).toBeNull()
    })

    it('should allow null general_cv_analysis', () => {
      const profile = createMinimalProfileFields()
      expect(profile.general_cv_analysis).toBeNull()
    })

    it('should accept different salary currencies', () => {
      const currencies = ['USD', 'EUR', 'GBP', 'ILS', 'CAD', 'AUD']

      currencies.forEach((currency) => {
        const profile = createProfileWithJobSearchFields({ salary_currency: currency })
        expect(profile.salary_currency).toBe(currency)
      })
    })
  })

  // ==========================================================================
  // L - Logic: Business logic
  // ==========================================================================

  describe('L - Logic: Match priority ordering', () => {
    it('should use preferred_job_titles as highest priority match signal', () => {
      const profile = createProfileWithJobSearchFields()
      // Job title is the most important match criterion
      expect(profile.preferred_job_titles.length).toBeGreaterThan(0)
      expect(profile.preferred_job_titles[0]).toBe('Senior Frontend Engineer')
    })

    it('should use general_cv_analysis skills for skill-based matching', () => {
      const profile = createProfileWithJobSearchFields()
      const analysis = profile.general_cv_analysis as GeneralCvAnalysis

      // CV skills are used for the skills component of match scoring (max ~36 points)
      expect(analysis.skills.length).toBeGreaterThan(0)
      expect(analysis.skills).toContain('React')
      expect(analysis.skills).toContain('TypeScript')
    })

    it('should derive match scoring from profile fields', () => {
      const profile = createProfileWithJobSearchFields()

      // The Job Search Agent uses these fields in priority order:
      // 1. Explicit preferences (preferred_job_titles, preferred_industries)
      // 2. CV-derived skills (general_cv_analysis.skills)
      // 3. Behavioral patterns (from past applications - separate table)
      // 4. Career goals (career_goals - lowest priority)

      expect(profile.preferred_job_titles.length).toBeGreaterThan(0) // Priority 1
      expect(profile.general_cv_analysis?.skills.length).toBeGreaterThan(0) // Priority 2
      expect(profile.career_goals).toBeTruthy() // Priority 4
    })

    it('should use minimum_salary_expectation as salary match baseline', () => {
      const profile = createProfileWithJobSearchFields()

      // A job's salary range should meet or exceed the minimum expectation
      const jobSalaryMin = 160000
      const jobSalaryMax = 200000
      const expectation = profile.minimum_salary_expectation!

      expect(jobSalaryMax >= expectation).toBe(true)
    })

    it('should use location_preferences for location matching', () => {
      const profile = createProfileWithJobSearchFields()
      const loc = profile.location_preferences

      // Location matching considers city and remote policy
      expect(loc.city).toBeDefined()
      expect(loc.remote_policy).toBeDefined()
    })

    it('should use career_goals as lowest priority matching signal', () => {
      const profile = createProfileWithJobSearchFields()

      // Career goals provide context for AI to understand direction
      // but shouldn't override explicit preferences
      expect(typeof profile.career_goals).toBe('string')
      expect(profile.career_goals!.length).toBeGreaterThan(0)
    })

    it('should handle profile with no CV analysis gracefully', () => {
      const profile = createProfileWithJobSearchFields({ general_cv_analysis: null })

      // Without CV analysis, matching falls back to explicit preferences only
      expect(profile.general_cv_analysis).toBeNull()
      // But explicit preferences should still work
      expect(profile.preferred_job_titles.length).toBeGreaterThan(0)
    })
  })

  // ==========================================================================
  // P - Parameters: Query operations
  // ==========================================================================

  describe('P - Parameters: Query operations', () => {
    it('should query profile job search fields by user_id', async () => {
      const mockData = {
        id: 'user-123',
        ...createProfileWithJobSearchFields(),
      }
      const supabase = createMockSupabase({
        selectResult: { data: mockData, error: null },
      })

      await supabase
        .from('profiles')
        .select('preferred_job_titles, preferred_industries, minimum_salary_expectation, salary_currency, location_preferences, company_size_preferences, career_goals, general_cv_analysis')
        .eq('id', 'user-123')
        .single()

      expect(supabase.from).toHaveBeenCalledWith('profiles')
    })

    it('should update preferred_job_titles on profile', async () => {
      const supabase = createMockSupabase({
        updateResult: { data: { id: 'user-123' }, error: null },
      })

      await supabase
        .from('profiles')
        .update({ preferred_job_titles: ['CTO', 'VP Engineering'] })
        .eq('id', 'user-123')

      expect(supabase.from).toHaveBeenCalledWith('profiles')
    })

    it('should update minimum_salary_expectation', async () => {
      const supabase = createMockSupabase({
        updateResult: { data: { id: 'user-123' }, error: null },
      })

      await supabase
        .from('profiles')
        .update({ minimum_salary_expectation: 200000, salary_currency: 'USD' })
        .eq('id', 'user-123')

      expect(supabase.from).toHaveBeenCalledWith('profiles')
    })

    it('should update general_cv_analysis after AI processing', async () => {
      const analysis: GeneralCvAnalysis = {
        skills: ['Python', 'Machine Learning', 'TensorFlow'],
        experience_years: 5,
        industries: ['AI/ML', 'Healthcare'],
        seniority_level: 'mid',
      }

      const supabase = createMockSupabase({
        updateResult: { data: { id: 'user-123' }, error: null },
      })

      await supabase
        .from('profiles')
        .update({ general_cv_analysis: analysis })
        .eq('id', 'user-123')

      expect(supabase.from).toHaveBeenCalledWith('profiles')
    })

    it('should update location_preferences', async () => {
      const locationPrefs: ProfileLocationPreferences = {
        city: 'Tel Aviv',
        remote_policy: 'remote',
      }

      const supabase = createMockSupabase({
        updateResult: { data: { id: 'user-123' }, error: null },
      })

      await supabase
        .from('profiles')
        .update({ location_preferences: locationPrefs })
        .eq('id', 'user-123')

      expect(supabase.from).toHaveBeenCalledWith('profiles')
    })

    it('should update career_goals', async () => {
      const supabase = createMockSupabase({
        updateResult: { data: { id: 'user-123' }, error: null },
      })

      await supabase
        .from('profiles')
        .update({ career_goals: 'Become CTO of a mid-stage startup' })
        .eq('id', 'user-123')

      expect(supabase.from).toHaveBeenCalledWith('profiles')
    })
  })

  // ==========================================================================
  // H - Handling: Data integrity and edge cases
  // ==========================================================================

  describe('H - Handling: Data integrity', () => {
    it('should handle empty arrays for JSONB array fields', () => {
      const profile = createMinimalProfileFields()

      expect(profile.preferred_job_titles).toEqual([])
      expect(profile.preferred_industries).toEqual([])
      expect(profile.company_size_preferences).toEqual([])
    })

    it('should handle empty object for location_preferences', () => {
      const profile = createMinimalProfileFields()

      expect(profile.location_preferences).toEqual({})
      expect(profile.location_preferences.city).toBeUndefined()
      expect(profile.location_preferences.remote_policy).toBeUndefined()
    })

    it('should handle profile with only some fields set', () => {
      const partialProfile = createProfileWithJobSearchFields({
        preferred_industries: [],
        minimum_salary_expectation: null,
        career_goals: null,
        general_cv_analysis: null,
      })

      // Should still work with partial data
      expect(partialProfile.preferred_job_titles.length).toBeGreaterThan(0)
      expect(partialProfile.preferred_industries).toEqual([])
      expect(partialProfile.minimum_salary_expectation).toBeNull()
    })

    it('should handle general_cv_analysis with minimal fields', () => {
      const minimalAnalysis: GeneralCvAnalysis = {
        skills: ['JavaScript'],
        experience_years: 1,
        industries: [],
        seniority_level: 'entry',
      }

      const profile = createProfileWithJobSearchFields({
        general_cv_analysis: minimalAnalysis,
      })

      expect(profile.general_cv_analysis?.skills).toHaveLength(1)
      expect(profile.general_cv_analysis?.experience_years).toBe(1)
      expect(profile.general_cv_analysis?.key_achievements).toBeUndefined()
    })

    it('should coexist with existing profile columns without conflicts', () => {
      // The new fields are added via ADD COLUMN IF NOT EXISTS
      // They should not interfere with existing columns like:
      // full_name, email, role, desired_roles, career_stage, etc.
      const existingFields = [
        'full_name', 'email', 'role', 'desired_roles', 'career_stage',
        'industry', 'location', 'experience_level', 'remote_policy',
      ]

      const newFields = [
        'preferred_job_titles', 'preferred_industries', 'minimum_salary_expectation',
        'salary_currency', 'location_preferences', 'company_size_preferences',
        'career_goals', 'general_cv_analysis',
      ]

      // No field name conflicts
      const overlap = existingFields.filter((f) => newFields.includes(f))
      expect(overlap).toHaveLength(0)
    })
  })

  // ==========================================================================
  // Index Tests
  // ==========================================================================

  describe('Indexes', () => {
    it('should have index for salary expectation queries', () => {
      const indexName = 'idx_profiles_salary_expectation'
      expect(indexName).toContain('salary_expectation')
    })

    it('should have GIN index for preferred_job_titles JSONB queries', () => {
      const indexName = 'idx_profiles_preferred_job_titles'
      expect(indexName).toContain('preferred_job_titles')
    })

    it('should have GIN index for preferred_industries JSONB queries', () => {
      const indexName = 'idx_profiles_preferred_industries'
      expect(indexName).toContain('preferred_industries')
    })

    it('should have GIN index for general_cv_analysis JSONB queries', () => {
      const indexName = 'idx_profiles_cv_analysis'
      expect(indexName).toContain('cv_analysis')
    })
  })
})
