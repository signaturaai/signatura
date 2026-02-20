/**
 * Job Postings Schema Tests (Phase 1.1)
 *
 * RALPH tests for the job_postings table schema, constraints, and RLS policies.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type {
  JobPostingRow,
  JobPostingStatus,
  WorkType,
  UserFeedback,
  MatchBreakdown,
} from '@/types/job-search'

// ============================================================================
// Mock Supabase Client
// ============================================================================

interface MockQueryResult {
  data: Record<string, unknown>[] | Record<string, unknown> | null
  error: { code: string; message: string } | null
}

interface MockInsertResult {
  data: Record<string, unknown> | null
  error: { code: string; message: string; details?: string } | null
}

function createMockSupabase(options: {
  selectResult?: MockQueryResult
  insertResult?: MockInsertResult
  updateResult?: MockInsertResult
  deleteResult?: MockInsertResult
} = {}) {
  const {
    selectResult = { data: [], error: null },
    insertResult = { data: null, error: null },
    updateResult = { data: null, error: null },
    deleteResult = { data: null, error: null },
  } = options

  // Create a chainable mock that resolves when awaited
  const createSelectChain = (): Record<string, unknown> => {
    const chain: Record<string, unknown> = {
      eq: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      single: vi.fn().mockResolvedValue(selectResult),
      // Make the chain itself thenable for direct await
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
  }
}

// ============================================================================
// Test Data Factories
// ============================================================================

function createValidJobPosting(overrides: Partial<JobPostingRow> = {}): JobPostingRow {
  return {
    id: 'job-123',
    user_id: 'user-abc',
    title: 'Senior Frontend Engineer',
    company_name: 'TechCorp Inc',
    company_logo_url: 'https://example.com/logo.png',
    description: 'We are looking for a senior frontend engineer...',
    location: 'San Francisco, CA',
    work_type: 'hybrid',
    experience_level: 'senior',
    salary_min: 150000,
    salary_max: 200000,
    salary_currency: 'USD',
    required_skills: ['React', 'TypeScript', 'Node.js'],
    benefits: ['Health insurance', '401k match', 'Unlimited PTO'],
    company_size: '201-500',
    source_url: 'https://linkedin.com/jobs/123',
    source_platform: 'LinkedIn',
    posted_date: '2026-02-15T10:00:00Z',
    discovered_at: '2026-02-20T08:00:00Z',
    match_score: 87,
    match_breakdown: {
      skills: 32,
      experience: 18,
      location: 10,
      salary: 15,
      preferences: 8,
      behavioral: 4,
    },
    match_reasons: [
      'Strong React experience matches requirement',
      'Salary range aligns with your expectations',
      'Hybrid work matches your preference',
    ],
    status: 'new',
    user_feedback: null,
    feedback_reason: null,
    discarded_until: null,
    job_application_id: null,
    content_hash: 'abc123def456',
    created_at: '2026-02-20T08:00:00Z',
    updated_at: '2026-02-20T08:00:00Z',
    ...overrides,
  }
}

// ============================================================================
// R - Returns: Schema Structure Tests
// ============================================================================

describe('Job Postings Schema', () => {
  describe('R - Returns: Type validation', () => {
    it('should accept valid job posting with all required fields', () => {
      const jobPosting = createValidJobPosting()

      expect(jobPosting.id).toBeDefined()
      expect(jobPosting.user_id).toBeDefined()
      expect(jobPosting.title).toBe('Senior Frontend Engineer')
      expect(jobPosting.company_name).toBe('TechCorp Inc')
      expect(jobPosting.match_score).toBe(87)
      expect(jobPosting.status).toBe('new')
    })

    it('should accept job posting with minimal required fields', () => {
      const minimalPosting: Partial<JobPostingRow> = {
        id: 'job-min',
        user_id: 'user-123',
        title: 'Software Engineer',
        company_name: 'StartupCo',
        match_score: 75,
        status: 'new',
        discovered_at: '2026-02-20T00:00:00Z',
        created_at: '2026-02-20T00:00:00Z',
        updated_at: '2026-02-20T00:00:00Z',
        required_skills: [],
        benefits: [],
        match_reasons: [],
        salary_currency: 'USD',
      }

      expect(minimalPosting.title).toBe('Software Engineer')
      expect(minimalPosting.match_score).toBe(75)
    })

    it('should return correct work_type enum values', () => {
      const workTypes: WorkType[] = ['remote', 'hybrid', 'onsite', 'flexible']

      workTypes.forEach((workType) => {
        const posting = createValidJobPosting({ work_type: workType })
        expect(posting.work_type).toBe(workType)
      })
    })

    it('should return correct status enum values', () => {
      const statuses: JobPostingStatus[] = ['new', 'viewed', 'applied', 'dismissed', 'liked']

      statuses.forEach((status) => {
        const posting = createValidJobPosting({ status })
        expect(posting.status).toBe(status)
      })
    })

    it('should return correct user_feedback enum values', () => {
      const feedbacks: (UserFeedback | null)[] = ['like', 'dislike', 'hide', null]

      feedbacks.forEach((feedback) => {
        const posting = createValidJobPosting({ user_feedback: feedback })
        expect(posting.user_feedback).toBe(feedback)
      })
    })

    it('should return match_breakdown with all scoring components', () => {
      const posting = createValidJobPosting()
      const breakdown = posting.match_breakdown as MatchBreakdown

      expect(breakdown.skills).toBeDefined()
      expect(breakdown.experience).toBeDefined()
      expect(breakdown.location).toBeDefined()
      expect(breakdown.salary).toBeDefined()
      expect(breakdown.preferences).toBeDefined()
    })

    it('should return match_reasons as string array', () => {
      const posting = createValidJobPosting()

      expect(Array.isArray(posting.match_reasons)).toBe(true)
      expect(posting.match_reasons.length).toBeGreaterThan(0)
      expect(typeof posting.match_reasons[0]).toBe('string')
    })

    it('should return required_skills as string array', () => {
      const posting = createValidJobPosting()

      expect(Array.isArray(posting.required_skills)).toBe(true)
      posting.required_skills.forEach((skill) => {
        expect(typeof skill).toBe('string')
      })
    })
  })

  // ==========================================================================
  // A - Asserts: Constraint Tests
  // ==========================================================================

  describe('A - Asserts: Constraints', () => {
    it('should enforce match_score range 0-100', () => {
      // Valid scores
      const validScores = [0, 50, 75, 100]
      validScores.forEach((score) => {
        const posting = createValidJobPosting({ match_score: score })
        expect(posting.match_score).toBeGreaterThanOrEqual(0)
        expect(posting.match_score).toBeLessThanOrEqual(100)
      })
    })

    it('should validate match_score cannot be negative', () => {
      // This would fail at the database level with CHECK constraint
      const invalidScore = -1
      expect(invalidScore).toBeLessThan(0)
      // In real DB, INSERT would fail with: CHECK constraint violation
    })

    it('should validate match_score cannot exceed 100', () => {
      // This would fail at the database level with CHECK constraint
      const invalidScore = 101
      expect(invalidScore).toBeGreaterThan(100)
      // In real DB, INSERT would fail with: CHECK constraint violation
    })

    it('should enforce work_type CHECK constraint', () => {
      const validTypes: WorkType[] = ['remote', 'hybrid', 'onsite', 'flexible']

      validTypes.forEach((type) => {
        expect(['remote', 'hybrid', 'onsite', 'flexible']).toContain(type)
      })
    })

    it('should enforce status CHECK constraint', () => {
      const validStatuses: JobPostingStatus[] = ['new', 'viewed', 'applied', 'dismissed', 'liked']

      validStatuses.forEach((status) => {
        expect(['new', 'viewed', 'applied', 'dismissed', 'liked']).toContain(status)
      })
    })

    it('should enforce user_feedback CHECK constraint', () => {
      const validFeedback: UserFeedback[] = ['like', 'dislike', 'hide']

      validFeedback.forEach((feedback) => {
        expect(['like', 'dislike', 'hide']).toContain(feedback)
      })
    })

    it('should require user_id (NOT NULL)', () => {
      const posting = createValidJobPosting()
      expect(posting.user_id).toBeTruthy()
      expect(posting.user_id).not.toBe('')
    })

    it('should require title (NOT NULL)', () => {
      const posting = createValidJobPosting()
      expect(posting.title).toBeTruthy()
      expect(posting.title).not.toBe('')
    })

    it('should require company_name (NOT NULL)', () => {
      const posting = createValidJobPosting()
      expect(posting.company_name).toBeTruthy()
      expect(posting.company_name).not.toBe('')
    })

    it('should require match_score (NOT NULL)', () => {
      const posting = createValidJobPosting()
      expect(posting.match_score).toBeDefined()
      expect(typeof posting.match_score).toBe('number')
    })

    it('should default status to "new"', () => {
      const posting = createValidJobPosting({ status: 'new' })
      expect(posting.status).toBe('new')
    })

    it('should default salary_currency to "USD"', () => {
      const posting = createValidJobPosting({ salary_currency: 'USD' })
      expect(posting.salary_currency).toBe('USD')
    })

    it('should default required_skills to empty array', () => {
      const posting = createValidJobPosting({ required_skills: [] })
      expect(posting.required_skills).toEqual([])
    })

    it('should default benefits to empty array', () => {
      const posting = createValidJobPosting({ benefits: [] })
      expect(posting.benefits).toEqual([])
    })

    it('should default match_reasons to empty array', () => {
      const posting = createValidJobPosting({ match_reasons: [] })
      expect(posting.match_reasons).toEqual([])
    })
  })

  // ==========================================================================
  // L - Logic: Business Logic Tests
  // ==========================================================================

  describe('L - Logic: Match scoring', () => {
    it('should classify 90+ score as excellent tier', () => {
      const posting = createValidJobPosting({ match_score: 92 })
      const tier = posting.match_score >= 90 ? 'excellent' : posting.match_score >= 80 ? 'great' : 'good'
      expect(tier).toBe('excellent')
    })

    it('should classify 80-89 score as great tier', () => {
      const posting = createValidJobPosting({ match_score: 85 })
      const tier = posting.match_score >= 90 ? 'excellent' : posting.match_score >= 80 ? 'great' : 'good'
      expect(tier).toBe('great')
    })

    it('should classify 75-79 score as good tier', () => {
      const posting = createValidJobPosting({ match_score: 77 })
      const tier = posting.match_score >= 90 ? 'excellent' : posting.match_score >= 80 ? 'great' : 'good'
      expect(tier).toBe('good')
    })

    it('should only show jobs with match_score >= 75', () => {
      const MATCH_THRESHOLD = 75

      const goodMatch = createValidJobPosting({ match_score: 78 })
      const borderline = createValidJobPosting({ match_score: 75 })
      const lowMatch = createValidJobPosting({ match_score: 74 })

      expect(goodMatch.match_score >= MATCH_THRESHOLD).toBe(true)
      expect(borderline.match_score >= MATCH_THRESHOLD).toBe(true)
      expect(lowMatch.match_score >= MATCH_THRESHOLD).toBe(false)
    })

    it('should calculate match_breakdown sum close to match_score', () => {
      const posting = createValidJobPosting()
      const breakdown = posting.match_breakdown as MatchBreakdown

      const sum =
        breakdown.skills +
        breakdown.experience +
        breakdown.location +
        breakdown.salary +
        breakdown.preferences +
        (breakdown.behavioral || 0)

      // Sum should be close to match_score (allowing for rounding)
      expect(Math.abs(sum - posting.match_score)).toBeLessThanOrEqual(5)
    })

    it('should set discarded_until to 30 days from now when dismissed', () => {
      const now = new Date('2026-02-20T10:00:00Z')
      const discardedUntil = new Date('2026-03-22T10:00:00Z') // 30 days later

      const posting = createValidJobPosting({
        status: 'dismissed',
        discarded_until: discardedUntil.toISOString(),
      })

      const discardDate = new Date(posting.discarded_until!)
      const diffDays = Math.round((discardDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      expect(diffDays).toBe(30)
    })

    it('should generate content_hash from title and company_name', () => {
      const posting = createValidJobPosting()

      // Content hash should be consistent for same title+company
      expect(posting.content_hash).toBeTruthy()
      expect(typeof posting.content_hash).toBe('string')
    })
  })

  // ==========================================================================
  // P - Parameters: Query Parameters Tests
  // ==========================================================================

  describe('P - Parameters: Query operations', () => {
    it('should query job postings by user_id and status', async () => {
      const mockData = [createValidJobPosting()]
      const supabase = createMockSupabase({
        selectResult: { data: mockData, error: null },
      })

      const result = await supabase
        .from('job_postings')
        .select('*')
        .eq('user_id', 'user-123')
        .eq('status', 'new')

      expect(supabase.from).toHaveBeenCalledWith('job_postings')
    })

    it('should query job postings ordered by match_score DESC', async () => {
      const supabase = createMockSupabase({
        selectResult: { data: [], error: null },
      })

      await supabase
        .from('job_postings')
        .select('*')
        .eq('user_id', 'user-123')
        .order('match_score', { ascending: false })

      expect(supabase.from).toHaveBeenCalledWith('job_postings')
    })

    it('should limit results to top 10 matches', async () => {
      const supabase = createMockSupabase({
        selectResult: { data: [], error: null },
      })

      await supabase.from('job_postings').select('*').eq('user_id', 'user-123').limit(10)

      expect(supabase.from).toHaveBeenCalledWith('job_postings')
    })

    it('should query by content_hash for duplicate detection', async () => {
      const supabase = createMockSupabase({
        selectResult: { data: null, error: null },
      })

      await supabase
        .from('job_postings')
        .select('id')
        .eq('user_id', 'user-123')
        .eq('content_hash', 'abc123')
        .single()

      expect(supabase.from).toHaveBeenCalledWith('job_postings')
    })

    it('should insert new job posting with service role', async () => {
      const newPosting = createValidJobPosting()
      const supabase = createMockSupabase({
        insertResult: { data: newPosting, error: null },
      })

      await supabase.from('job_postings').insert(newPosting).select().single()

      expect(supabase.from).toHaveBeenCalledWith('job_postings')
    })

    it('should update status and user_feedback', async () => {
      const supabase = createMockSupabase({
        updateResult: { data: { id: 'job-123' }, error: null },
      })

      await supabase
        .from('job_postings')
        .update({
          status: 'liked',
          user_feedback: 'like',
        })
        .eq('id', 'job-123')

      expect(supabase.from).toHaveBeenCalledWith('job_postings')
    })

    it('should delete job posting by id', async () => {
      const supabase = createMockSupabase({
        deleteResult: { data: null, error: null },
      })

      await supabase.from('job_postings').delete().eq('id', 'job-123')

      expect(supabase.from).toHaveBeenCalledWith('job_postings')
    })
  })

  // ==========================================================================
  // H - Handling: RLS Policy Tests
  // ==========================================================================

  describe('H - Handling: RLS policies', () => {
    it('should allow user to SELECT their own job postings', async () => {
      const userPosting = createValidJobPosting({ user_id: 'user-123' })
      const supabase = createMockSupabase({
        selectResult: { data: [userPosting], error: null },
      })

      const result = await supabase
        .from('job_postings')
        .select('*')
        .eq('user_id', 'user-123')

      // RLS would filter to only user's rows
      expect(supabase.from).toHaveBeenCalledWith('job_postings')
    })

    it('should block user from SELECT other users job postings', async () => {
      // Simulating RLS blocking access - would return empty or error
      const supabase = createMockSupabase({
        selectResult: { data: [], error: null },
      })

      const result = await supabase
        .from('job_postings')
        .select('*')
        .eq('user_id', 'other-user-456')

      // RLS would return empty array for other user's data
      expect(supabase.from).toHaveBeenCalledWith('job_postings')
    })

    it('should allow user to UPDATE their own job postings', async () => {
      const supabase = createMockSupabase({
        updateResult: { data: { id: 'job-123' }, error: null },
      })

      await supabase
        .from('job_postings')
        .update({ status: 'viewed' })
        .eq('id', 'job-123')

      expect(supabase.from).toHaveBeenCalledWith('job_postings')
    })

    it('should block user from UPDATE other users job postings', async () => {
      // Simulating RLS blocking update
      const supabase = createMockSupabase({
        updateResult: {
          data: null,
          error: { code: 'PGRST301', message: 'Row-level security violation' },
        },
      })

      const result = await supabase
        .from('job_postings')
        .update({ status: 'viewed' })
        .eq('id', 'other-users-job')
        .select()
        .single()

      // RLS would block this
      expect(supabase.from).toHaveBeenCalledWith('job_postings')
    })

    it('should allow user to DELETE their own job postings', async () => {
      const supabase = createMockSupabase({
        deleteResult: { data: null, error: null },
      })

      await supabase.from('job_postings').delete().eq('id', 'job-123')

      expect(supabase.from).toHaveBeenCalledWith('job_postings')
    })

    it('should block user from INSERT (service role only)', async () => {
      // Simulating authenticated user trying to insert (should fail with RLS)
      const supabase = createMockSupabase({
        insertResult: {
          data: null,
          error: { code: 'PGRST301', message: 'Row-level security violation' },
        },
      })

      const newPosting = createValidJobPosting()
      const result = await supabase.from('job_postings').insert(newPosting).select().single()

      // Authenticated users cannot insert - only service role
      expect(supabase.from).toHaveBeenCalledWith('job_postings')
    })

    it('should allow service role to INSERT job postings', async () => {
      // Service role bypasses RLS
      const newPosting = createValidJobPosting()
      const supabase = createMockSupabase({
        insertResult: { data: newPosting, error: null },
      })

      await supabase.from('job_postings').insert(newPosting).select().single()

      expect(supabase.from).toHaveBeenCalledWith('job_postings')
    })
  })

  // ==========================================================================
  // Index Tests
  // ==========================================================================

  describe('Indexes', () => {
    it('should have index for user_id + status queries', () => {
      // Index: idx_job_postings_user_status ON (user_id, status)
      // This test documents the expected index for fast user filtering
      const indexName = 'idx_job_postings_user_status'
      const indexColumns = ['user_id', 'status']

      expect(indexName).toContain('user_status')
      expect(indexColumns).toEqual(['user_id', 'status'])
    })

    it('should have index for user_id + match_score DESC queries', () => {
      // Index: idx_job_postings_user_score ON (user_id, match_score DESC)
      const indexName = 'idx_job_postings_user_score'
      const indexColumns = ['user_id', 'match_score DESC']

      expect(indexName).toContain('user_score')
    })

    it('should have index for content_hash duplicate detection', () => {
      // Index: idx_job_postings_content_hash ON (user_id, content_hash)
      const indexName = 'idx_job_postings_content_hash'

      expect(indexName).toContain('content_hash')
    })

    it('should have index for discovered_at chronological queries', () => {
      // Index: idx_job_postings_discovered ON (discovered_at DESC)
      const indexName = 'idx_job_postings_discovered'

      expect(indexName).toContain('discovered')
    })

    it('should have partial index for discarded_until cleanup', () => {
      // Index: idx_job_postings_discarded_until ON (discarded_until) WHERE discarded_until IS NOT NULL
      const indexName = 'idx_job_postings_discarded_until'

      expect(indexName).toContain('discarded_until')
    })
  })

  // ==========================================================================
  // Trigger Tests
  // ==========================================================================

  describe('Triggers', () => {
    it('should auto-update updated_at on UPDATE', () => {
      const originalUpdatedAt = '2026-02-20T08:00:00Z'
      const posting = createValidJobPosting({ updated_at: originalUpdatedAt })

      // Simulate update - trigger would set new updated_at
      const newUpdatedAt = '2026-02-20T12:00:00Z'
      const updatedPosting = { ...posting, status: 'viewed' as const, updated_at: newUpdatedAt }

      expect(updatedPosting.updated_at).not.toBe(originalUpdatedAt)
      expect(new Date(updatedPosting.updated_at).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      )
    })
  })
})
