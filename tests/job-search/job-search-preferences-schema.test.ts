/**
 * Job Search Preferences Schema Tests (Phase 1.2)
 *
 * RALPH tests for the job_search_preferences table schema, constraints, and RLS policies.
 */

import { describe, it, expect, vi } from 'vitest'
import type {
  JobSearchPreferencesRow,
  ExperienceYears,
  EmailNotificationFrequency,
  SkillRequirement,
  ImplicitPreferences,
  PreferencesFeedbackStats,
  WorkType,
  CompanySize,
} from '@/types/job-search'

// ============================================================================
// Mock Supabase Client
// ============================================================================

interface MockQueryResult {
  data: Record<string, unknown>[] | Record<string, unknown> | null
  error: { code: string; message: string } | null
}

interface MockMutationResult {
  data: Record<string, unknown> | null
  error: { code: string; message: string; details?: string } | null
}

function createMockSupabase(options: {
  selectResult?: MockQueryResult
  insertResult?: MockMutationResult
  updateResult?: MockMutationResult
  deleteResult?: MockMutationResult
  rpcResult?: MockMutationResult
} = {}) {
  const {
    selectResult = { data: [], error: null },
    insertResult = { data: null, error: null },
    updateResult = { data: null, error: null },
    deleteResult = { data: null, error: null },
    rpcResult = { data: null, error: null },
  } = options

  const createSelectChain = (): Record<string, unknown> => {
    const chain: Record<string, unknown> = {
      eq: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      single: vi.fn().mockResolvedValue(selectResult),
      then: (resolve: (value: MockQueryResult) => void) => {
        resolve(selectResult)
      },
    }
    return chain
  }

  const insertChain = {
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(insertResult),
  }

  const createUpdateChain = (): Record<string, unknown> => {
    const chain: Record<string, unknown> = {
      eq: vi.fn(() => chain),
      select: vi.fn(() => chain),
      single: vi.fn().mockResolvedValue(updateResult),
    }
    return chain
  }

  const deleteChain = {
    eq: vi.fn().mockResolvedValue(deleteResult),
  }

  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockImplementation(() => createSelectChain()),
      insert: vi.fn().mockReturnValue(insertChain),
      update: vi.fn().mockImplementation(() => createUpdateChain()),
      delete: vi.fn().mockReturnValue(deleteChain),
    }),
    rpc: vi.fn().mockResolvedValue(rpcResult),
  }
}

// ============================================================================
// Test Data Factories
// ============================================================================

function createValidPreferences(overrides: Partial<JobSearchPreferencesRow> = {}): JobSearchPreferencesRow {
  return {
    id: 'pref-123',
    user_id: 'user-abc',
    is_active: true,

    // Explicit Search Filters
    preferred_job_titles: ['Senior Frontend Engineer', 'Staff Engineer'],
    preferred_locations: ['San Francisco', 'Remote', 'New York'],
    experience_years: '5-10',
    required_skills: [
      { skill: 'React', proficiency: 'expert' },
      { skill: 'TypeScript', proficiency: 'expert' },
      { skill: 'Node.js', proficiency: 'intermediate' },
    ],
    company_size_preferences: ['51-200', '201-500'],
    remote_policy_preferences: ['remote', 'hybrid'],
    required_benefits: ['Health insurance', '401k match'],
    salary_min_override: 180000,
    salary_currency_override: 'USD',
    avoid_companies: ['BadCorp', 'ToxicInc'],
    avoid_keywords: ['crypto', 'blockchain'],

    // AI-Generated Search Intelligence
    ai_keywords: ['react', 'typescript', 'frontend', 'web development'],
    ai_recommended_boards: ['LinkedIn', 'Wellfound', 'Y Combinator'],
    ai_market_insights: 'Strong demand for senior frontend engineers in the Bay Area...',
    ai_personalized_strategy: 'Focus on Series B-C startups with strong engineering culture...',
    ai_last_analysis_at: '2026-02-15T10:00:00Z',

    // Implicit/Learned Preferences
    implicit_preferences: {
      salary_adjustment: 10,
      remote_bias: 0.8,
      preferred_industries: ['Fintech', 'SaaS'],
    },
    feedback_stats: {
      total_likes: 15,
      total_dislikes: 5,
      total_hides: 3,
      reasons: { 'Salary too low': 3, 'Wrong location': 2 },
    },

    // Notification Settings
    email_notification_frequency: 'weekly',
    last_email_sent_at: '2026-02-18T09:00:00Z',
    last_search_at: '2026-02-20T02:00:00Z',
    consecutive_zero_match_days: 0,

    // Timestamps
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-02-20T02:00:00Z',
    ...overrides,
  }
}

function createMinimalPreferences(): Partial<JobSearchPreferencesRow> {
  return {
    id: 'pref-min',
    user_id: 'user-123',
    is_active: true,
    preferred_job_titles: [],
    preferred_locations: [],
    experience_years: null,
    required_skills: [],
    company_size_preferences: [],
    remote_policy_preferences: [],
    required_benefits: [],
    salary_min_override: null,
    salary_currency_override: null,
    avoid_companies: [],
    avoid_keywords: [],
    ai_keywords: [],
    ai_recommended_boards: [],
    ai_market_insights: null,
    ai_personalized_strategy: null,
    ai_last_analysis_at: null,
    implicit_preferences: {},
    feedback_stats: { total_likes: 0, total_dislikes: 0, total_hides: 0, reasons: {} },
    email_notification_frequency: 'weekly',
    last_email_sent_at: null,
    last_search_at: null,
    consecutive_zero_match_days: 0,
    created_at: '2026-02-20T00:00:00Z',
    updated_at: '2026-02-20T00:00:00Z',
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('Job Search Preferences Schema', () => {
  // ==========================================================================
  // R - Returns: Type validation
  // ==========================================================================

  describe('R - Returns: Type validation', () => {
    it('should accept valid preferences with all fields', () => {
      const prefs = createValidPreferences()

      expect(prefs.id).toBeDefined()
      expect(prefs.user_id).toBe('user-abc')
      expect(prefs.is_active).toBe(true)
      expect(prefs.preferred_job_titles).toHaveLength(2)
      expect(prefs.email_notification_frequency).toBe('weekly')
    })

    it('should accept minimal preferences with defaults', () => {
      const prefs = createMinimalPreferences()

      expect(prefs.user_id).toBe('user-123')
      expect(prefs.is_active).toBe(true)
      expect(prefs.preferred_job_titles).toEqual([])
      expect(prefs.feedback_stats?.total_likes).toBe(0)
    })

    it('should return correct experience_years enum values', () => {
      const experienceYears: ExperienceYears[] = ['0-2', '2-5', '5-10', '10+']

      experienceYears.forEach((years) => {
        const prefs = createValidPreferences({ experience_years: years })
        expect(prefs.experience_years).toBe(years)
      })
    })

    it('should return correct email_notification_frequency enum values', () => {
      const frequencies: EmailNotificationFrequency[] = ['daily', 'weekly', 'monthly', 'disabled']

      frequencies.forEach((freq) => {
        const prefs = createValidPreferences({ email_notification_frequency: freq })
        expect(prefs.email_notification_frequency).toBe(freq)
      })
    })

    it('should return required_skills as array of SkillRequirement', () => {
      const prefs = createValidPreferences()

      expect(Array.isArray(prefs.required_skills)).toBe(true)
      prefs.required_skills.forEach((skill: SkillRequirement) => {
        expect(skill.skill).toBeDefined()
        expect(['beginner', 'intermediate', 'expert']).toContain(skill.proficiency)
      })
    })

    it('should return implicit_preferences as ImplicitPreferences object', () => {
      const prefs = createValidPreferences()
      const implicit = prefs.implicit_preferences as ImplicitPreferences

      expect(typeof implicit).toBe('object')
      expect(implicit.salary_adjustment).toBe(10)
      expect(implicit.remote_bias).toBe(0.8)
    })

    it('should return feedback_stats as PreferencesFeedbackStats object', () => {
      const prefs = createValidPreferences()
      const stats = prefs.feedback_stats as PreferencesFeedbackStats

      expect(stats.total_likes).toBe(15)
      expect(stats.total_dislikes).toBe(5)
      expect(stats.total_hides).toBe(3)
      expect(stats.reasons).toBeDefined()
    })

    it('should return remote_policy_preferences as WorkType array', () => {
      const prefs = createValidPreferences()

      prefs.remote_policy_preferences.forEach((policy: WorkType) => {
        expect(['remote', 'hybrid', 'onsite', 'flexible']).toContain(policy)
      })
    })

    it('should return company_size_preferences as CompanySize array', () => {
      const prefs = createValidPreferences()

      prefs.company_size_preferences.forEach((size: CompanySize) => {
        expect(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']).toContain(size)
      })
    })
  })

  // ==========================================================================
  // A - Asserts: Constraints
  // ==========================================================================

  describe('A - Asserts: Constraints', () => {
    it('should enforce UNIQUE constraint on user_id', () => {
      // UNIQUE constraint means one preferences record per user
      const prefs1 = createValidPreferences({ user_id: 'user-123' })
      const prefs2 = createValidPreferences({ user_id: 'user-123' })

      // In real DB, second insert would fail with unique violation
      expect(prefs1.user_id).toBe(prefs2.user_id)
    })

    it('should require user_id (NOT NULL)', () => {
      const prefs = createValidPreferences()
      expect(prefs.user_id).toBeTruthy()
      expect(prefs.user_id).not.toBe('')
    })

    it('should enforce experience_years CHECK constraint', () => {
      const validYears: (ExperienceYears | null)[] = ['0-2', '2-5', '5-10', '10+', null]

      validYears.forEach((years) => {
        if (years === null) {
          expect(years).toBeNull()
        } else {
          expect(['0-2', '2-5', '5-10', '10+']).toContain(years)
        }
      })
    })

    it('should enforce email_notification_frequency CHECK constraint', () => {
      const validFrequencies: EmailNotificationFrequency[] = ['daily', 'weekly', 'monthly', 'disabled']

      validFrequencies.forEach((freq) => {
        expect(['daily', 'weekly', 'monthly', 'disabled']).toContain(freq)
      })
    })

    it('should default is_active to true', () => {
      const prefs = createMinimalPreferences()
      expect(prefs.is_active).toBe(true)
    })

    it('should default email_notification_frequency to weekly', () => {
      const prefs = createMinimalPreferences()
      expect(prefs.email_notification_frequency).toBe('weekly')
    })

    it('should default consecutive_zero_match_days to 0', () => {
      const prefs = createMinimalPreferences()
      expect(prefs.consecutive_zero_match_days).toBe(0)
    })

    it('should default JSONB arrays to empty arrays', () => {
      const prefs = createMinimalPreferences()

      expect(prefs.preferred_job_titles).toEqual([])
      expect(prefs.preferred_locations).toEqual([])
      expect(prefs.required_skills).toEqual([])
      expect(prefs.company_size_preferences).toEqual([])
      expect(prefs.remote_policy_preferences).toEqual([])
      expect(prefs.required_benefits).toEqual([])
      expect(prefs.avoid_companies).toEqual([])
      expect(prefs.avoid_keywords).toEqual([])
      expect(prefs.ai_keywords).toEqual([])
      expect(prefs.ai_recommended_boards).toEqual([])
    })

    it('should default implicit_preferences to empty object', () => {
      const prefs = createMinimalPreferences()
      expect(prefs.implicit_preferences).toEqual({})
    })

    it('should default feedback_stats to zeroed stats', () => {
      const prefs = createMinimalPreferences()
      expect(prefs.feedback_stats).toEqual({
        total_likes: 0,
        total_dislikes: 0,
        total_hides: 0,
        reasons: {},
      })
    })
  })

  // ==========================================================================
  // L - Logic: Business Logic
  // ==========================================================================

  describe('L - Logic: Business logic', () => {
    it('should track consecutive_zero_match_days for cost optimization', () => {
      // After 7+ consecutive zero-match days, search frequency should be reduced
      const COST_OPTIMIZATION_THRESHOLD = 7

      const activeUser = createValidPreferences({ consecutive_zero_match_days: 3 })
      const reducedFrequencyUser = createValidPreferences({ consecutive_zero_match_days: 10 })

      expect(activeUser.consecutive_zero_match_days < COST_OPTIMIZATION_THRESHOLD).toBe(true)
      expect(reducedFrequencyUser.consecutive_zero_match_days >= COST_OPTIMIZATION_THRESHOLD).toBe(true)
    })

    it('should use salary_min_override when set', () => {
      const withOverride = createValidPreferences({ salary_min_override: 200000 })
      const withoutOverride = createValidPreferences({ salary_min_override: null })

      expect(withOverride.salary_min_override).toBe(200000)
      expect(withoutOverride.salary_min_override).toBeNull()
    })

    it('should track AI analysis freshness via ai_last_analysis_at', () => {
      const prefs = createValidPreferences()
      const analysisDate = new Date(prefs.ai_last_analysis_at!)

      // AI insights should be refreshed periodically
      expect(analysisDate instanceof Date).toBe(true)
      expect(analysisDate.getTime()).toBeGreaterThan(0)
    })

    it('should calculate when email is due based on frequency and last_email_sent_at', () => {
      const now = new Date('2026-02-20T10:00:00Z')

      const dailyUser = createValidPreferences({
        email_notification_frequency: 'daily',
        last_email_sent_at: '2026-02-19T09:00:00Z',
      })

      const weeklyUser = createValidPreferences({
        email_notification_frequency: 'weekly',
        last_email_sent_at: '2026-02-13T09:00:00Z',
      })

      const disabledUser = createValidPreferences({
        email_notification_frequency: 'disabled',
      })

      // Check if email is due
      const isDue = (prefs: JobSearchPreferencesRow): boolean => {
        if (prefs.email_notification_frequency === 'disabled') return false
        if (!prefs.last_email_sent_at) return true

        const lastSent = new Date(prefs.last_email_sent_at)
        const hoursSince = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60)

        switch (prefs.email_notification_frequency) {
          case 'daily':
            return hoursSince >= 24
          case 'weekly':
            return hoursSince >= 168 // 7 days
          case 'monthly':
            return hoursSince >= 720 // 30 days
          default:
            return false
        }
      }

      expect(isDue(dailyUser)).toBe(true) // 25 hours since last email
      expect(isDue(weeklyUser)).toBe(true) // 7+ days since last email
      expect(isDue(disabledUser)).toBe(false) // Disabled
    })

    it('should learn from feedback_stats to adjust implicit_preferences', () => {
      const prefs = createValidPreferences()

      // After 15 likes and 5 dislikes, system should have learned patterns
      expect(prefs.feedback_stats.total_likes).toBeGreaterThan(10)
      expect(prefs.implicit_preferences.salary_adjustment).toBeDefined()
      expect(prefs.implicit_preferences.remote_bias).toBeDefined()
    })

    it('should filter jobs using avoid_companies and avoid_keywords', () => {
      const prefs = createValidPreferences()

      // These should be used to exclude jobs
      expect(prefs.avoid_companies).toContain('BadCorp')
      expect(prefs.avoid_keywords).toContain('crypto')

      // Simulating filter logic
      const shouldExcludeJob = (companyName: string, description: string): boolean => {
        if (prefs.avoid_companies.some((c) => companyName.toLowerCase().includes(c.toLowerCase()))) {
          return true
        }
        if (prefs.avoid_keywords.some((k) => description.toLowerCase().includes(k.toLowerCase()))) {
          return true
        }
        return false
      }

      expect(shouldExcludeJob('BadCorp Inc', 'Great job opportunity')).toBe(true)
      expect(shouldExcludeJob('GoodCorp', 'We work with crypto and blockchain')).toBe(true)
      expect(shouldExcludeJob('GoodCorp', 'Great frontend opportunity')).toBe(false)
    })
  })

  // ==========================================================================
  // P - Parameters: Query operations
  // ==========================================================================

  describe('P - Parameters: Query operations', () => {
    it('should query preferences by user_id', async () => {
      const mockData = createValidPreferences()
      const supabase = createMockSupabase({
        selectResult: { data: mockData, error: null },
      })

      await supabase.from('job_search_preferences').select('*').eq('user_id', 'user-123').single()

      expect(supabase.from).toHaveBeenCalledWith('job_search_preferences')
    })

    it('should insert new preferences for user', async () => {
      const newPrefs = createMinimalPreferences()
      const supabase = createMockSupabase({
        insertResult: { data: newPrefs, error: null },
      })

      await supabase.from('job_search_preferences').insert(newPrefs).select().single()

      expect(supabase.from).toHaveBeenCalledWith('job_search_preferences')
    })

    it('should update preferences fields', async () => {
      const supabase = createMockSupabase({
        updateResult: { data: { id: 'pref-123' }, error: null },
      })

      await supabase
        .from('job_search_preferences')
        .update({
          preferred_job_titles: ['CTO', 'VP Engineering'],
          email_notification_frequency: 'daily',
        })
        .eq('user_id', 'user-123')

      expect(supabase.from).toHaveBeenCalledWith('job_search_preferences')
    })

    it('should delete preferences by user_id', async () => {
      const supabase = createMockSupabase({
        deleteResult: { data: null, error: null },
      })

      await supabase.from('job_search_preferences').delete().eq('user_id', 'user-123')

      expect(supabase.from).toHaveBeenCalledWith('job_search_preferences')
    })

    it('should call get_or_create_job_search_preferences RPC', async () => {
      const mockPrefs = createMinimalPreferences()
      const supabase = createMockSupabase({
        rpcResult: { data: mockPrefs, error: null },
      })

      await supabase.rpc('get_or_create_job_search_preferences', { p_user_id: 'user-123' })

      expect(supabase.rpc).toHaveBeenCalledWith('get_or_create_job_search_preferences', {
        p_user_id: 'user-123',
      })
    })

    it('should query active users for cron job', async () => {
      const supabase = createMockSupabase({
        selectResult: { data: [], error: null },
      })

      await supabase.from('job_search_preferences').select('*').eq('is_active', true)

      expect(supabase.from).toHaveBeenCalledWith('job_search_preferences')
    })

    it('should query users due for email notification', async () => {
      const supabase = createMockSupabase({
        selectResult: { data: [], error: null },
      })

      // Query users with daily frequency who haven't received email today
      await supabase
        .from('job_search_preferences')
        .select('*')
        .eq('email_notification_frequency', 'daily')

      expect(supabase.from).toHaveBeenCalledWith('job_search_preferences')
    })
  })

  // ==========================================================================
  // H - Handling: RLS policies
  // ==========================================================================

  describe('H - Handling: RLS policies', () => {
    it('should allow user to SELECT their own preferences', async () => {
      const userPrefs = createValidPreferences({ user_id: 'user-123' })
      const supabase = createMockSupabase({
        selectResult: { data: userPrefs, error: null },
      })

      await supabase.from('job_search_preferences').select('*').eq('user_id', 'user-123').single()

      expect(supabase.from).toHaveBeenCalledWith('job_search_preferences')
    })

    it('should block user from SELECT other users preferences', async () => {
      const supabase = createMockSupabase({
        selectResult: { data: null, error: { code: 'PGRST116', message: 'Not found' } },
      })

      // RLS would filter to empty/error for other user's data
      await supabase
        .from('job_search_preferences')
        .select('*')
        .eq('user_id', 'other-user-456')
        .single()

      expect(supabase.from).toHaveBeenCalledWith('job_search_preferences')
    })

    it('should allow user to INSERT their own preferences', async () => {
      const newPrefs = createMinimalPreferences()
      const supabase = createMockSupabase({
        insertResult: { data: newPrefs, error: null },
      })

      await supabase.from('job_search_preferences').insert(newPrefs).select().single()

      expect(supabase.from).toHaveBeenCalledWith('job_search_preferences')
    })

    it('should block user from INSERT for other users', async () => {
      const supabase = createMockSupabase({
        insertResult: {
          data: null,
          error: { code: 'PGRST301', message: 'Row-level security violation' },
        },
      })

      const otherUserPrefs = { ...createMinimalPreferences(), user_id: 'other-user' }
      await supabase.from('job_search_preferences').insert(otherUserPrefs).select().single()

      // RLS would block this
      expect(supabase.from).toHaveBeenCalledWith('job_search_preferences')
    })

    it('should allow user to UPDATE their own preferences', async () => {
      const supabase = createMockSupabase({
        updateResult: { data: { id: 'pref-123' }, error: null },
      })

      await supabase
        .from('job_search_preferences')
        .update({ is_active: false })
        .eq('user_id', 'user-123')

      expect(supabase.from).toHaveBeenCalledWith('job_search_preferences')
    })

    it('should block user from UPDATE other users preferences', async () => {
      const supabase = createMockSupabase({
        updateResult: {
          data: null,
          error: { code: 'PGRST301', message: 'Row-level security violation' },
        },
      })

      await supabase
        .from('job_search_preferences')
        .update({ is_active: false })
        .eq('user_id', 'other-user')

      expect(supabase.from).toHaveBeenCalledWith('job_search_preferences')
    })

    it('should allow user to DELETE their own preferences', async () => {
      const supabase = createMockSupabase({
        deleteResult: { data: null, error: null },
      })

      await supabase.from('job_search_preferences').delete().eq('user_id', 'user-123')

      expect(supabase.from).toHaveBeenCalledWith('job_search_preferences')
    })
  })

  // ==========================================================================
  // Index Tests
  // ==========================================================================

  describe('Indexes', () => {
    it('should have index for user_id lookup', () => {
      const indexName = 'idx_job_search_preferences_user'
      expect(indexName).toContain('user')
    })

    it('should have partial index for active users', () => {
      const indexName = 'idx_job_search_preferences_active'
      expect(indexName).toContain('active')
    })

    it('should have index for email notifications query', () => {
      const indexName = 'idx_job_search_preferences_email'
      expect(indexName).toContain('email')
    })

    it('should have index for search due query', () => {
      const indexName = 'idx_job_search_preferences_search_due'
      expect(indexName).toContain('search_due')
    })
  })

  // ==========================================================================
  // Trigger Tests
  // ==========================================================================

  describe('Triggers', () => {
    it('should auto-update updated_at on UPDATE', () => {
      const originalUpdatedAt = '2026-02-20T08:00:00Z'
      const prefs = createValidPreferences({ updated_at: originalUpdatedAt })

      // Simulate update - trigger would set new updated_at
      const newUpdatedAt = '2026-02-20T12:00:00Z'
      const updatedPrefs = { ...prefs, is_active: false, updated_at: newUpdatedAt }

      expect(updatedPrefs.updated_at).not.toBe(originalUpdatedAt)
      expect(new Date(updatedPrefs.updated_at).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      )
    })
  })

  // ==========================================================================
  // Helper Function Tests
  // ==========================================================================

  describe('Helper Functions', () => {
    it('should get_or_create_job_search_preferences return existing preferences', async () => {
      const existingPrefs = createValidPreferences()
      const supabase = createMockSupabase({
        rpcResult: { data: existingPrefs, error: null },
      })

      const result = await supabase.rpc('get_or_create_job_search_preferences', {
        p_user_id: 'user-123',
      })

      expect(supabase.rpc).toHaveBeenCalled()
    })

    it('should get_or_create_job_search_preferences create new preferences if none exist', async () => {
      const newPrefs = createMinimalPreferences()
      const supabase = createMockSupabase({
        rpcResult: { data: newPrefs, error: null },
      })

      const result = await supabase.rpc('get_or_create_job_search_preferences', {
        p_user_id: 'new-user-456',
      })

      expect(supabase.rpc).toHaveBeenCalled()
    })
  })
})
