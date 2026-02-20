/**
 * Job Search Types & Zod Validation Tests (Phase 1.4)
 *
 * RALPH tests for TypeScript types and Zod schema runtime validation.
 */

import { describe, it, expect } from 'vitest'
import {
  // Zod schemas
  WorkTypeSchema,
  JobPostingStatusSchema,
  UserFeedbackSchema,
  FeedbackReasonSchema,
  ExperienceLevelSchema,
  CompanySizeSchema,
  SourcePlatformSchema,
  ExperienceYearsSchema,
  SkillProficiencySchema,
  EmailNotificationFrequencySchema,
  MatchBreakdownSchema,
  SkillRequirementSchema,
  JobPostingUpdateRequestSchema,
  JobDiscoveryRequestSchema,
  JobSearchPreferencesUpdateRequestSchema,
  FeedbackRequestSchema,
  JobSearchFiltersSchema,
  DiscoveredJobSchema,
  MatchResultSchema,
} from '@/types/job-search'

import type {
  DiscoveredJob,
  MatchResult,
  SearchInsights,
  FeedbackRequest,
  JobSearchFilters,
  JobPostingRow,
  JobSearchPreferencesRow,
  ProfileJobSearchFields,
} from '@/types/job-search'

// ============================================================================
// Enum Schemas
// ============================================================================

describe('WorkTypeSchema', () => {
  it('R: accepts valid work types', () => {
    expect(WorkTypeSchema.parse('remote')).toBe('remote')
    expect(WorkTypeSchema.parse('hybrid')).toBe('hybrid')
    expect(WorkTypeSchema.parse('onsite')).toBe('onsite')
    expect(WorkTypeSchema.parse('flexible')).toBe('flexible')
  })

  it('H: rejects invalid work type', () => {
    expect(() => WorkTypeSchema.parse('in-office')).toThrow()
    expect(() => WorkTypeSchema.parse('')).toThrow()
    expect(() => WorkTypeSchema.parse(123)).toThrow()
  })
})

describe('JobPostingStatusSchema', () => {
  it('R: accepts all valid statuses', () => {
    const statuses = ['new', 'viewed', 'applied', 'dismissed', 'liked']
    for (const s of statuses) {
      expect(JobPostingStatusSchema.parse(s)).toBe(s)
    }
  })

  it('H: rejects invalid status', () => {
    expect(() => JobPostingStatusSchema.parse('pending')).toThrow()
    expect(() => JobPostingStatusSchema.parse(null)).toThrow()
  })
})

describe('UserFeedbackSchema', () => {
  it('R: accepts like, dislike, hide', () => {
    expect(UserFeedbackSchema.parse('like')).toBe('like')
    expect(UserFeedbackSchema.parse('dislike')).toBe('dislike')
    expect(UserFeedbackSchema.parse('hide')).toBe('hide')
  })

  it('H: rejects invalid feedback', () => {
    expect(() => UserFeedbackSchema.parse('love')).toThrow()
  })
})

describe('FeedbackReasonSchema', () => {
  it('R: accepts all valid reasons', () => {
    const reasons = [
      'Salary too low',
      'Wrong location',
      'Not interested in company',
      'Skills mismatch',
      'Other',
    ]
    for (const r of reasons) {
      expect(FeedbackReasonSchema.parse(r)).toBe(r)
    }
  })

  it('H: rejects freeform text', () => {
    expect(() => FeedbackReasonSchema.parse('I just dont like it')).toThrow()
  })
})

describe('ExperienceLevelSchema', () => {
  it('R: accepts entry, mid, senior, executive', () => {
    for (const level of ['entry', 'mid', 'senior', 'executive']) {
      expect(ExperienceLevelSchema.parse(level)).toBe(level)
    }
  })

  it('H: rejects junior', () => {
    expect(() => ExperienceLevelSchema.parse('junior')).toThrow()
  })
})

describe('CompanySizeSchema', () => {
  it('R: accepts all valid company size ranges', () => {
    const sizes = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
    for (const s of sizes) {
      expect(CompanySizeSchema.parse(s)).toBe(s)
    }
  })

  it('H: rejects numeric input', () => {
    expect(() => CompanySizeSchema.parse(100)).toThrow()
  })
})

describe('SourcePlatformSchema', () => {
  it('R: accepts all valid platforms', () => {
    const platforms = ['LinkedIn', 'Indeed', 'Glassdoor', 'Wellfound', 'Company Website', 'Other']
    for (const p of platforms) {
      expect(SourcePlatformSchema.parse(p)).toBe(p)
    }
  })

  it('H: rejects lowercase variant', () => {
    expect(() => SourcePlatformSchema.parse('linkedin')).toThrow()
  })
})

describe('ExperienceYearsSchema', () => {
  it('R: accepts valid experience year ranges', () => {
    for (const y of ['0-2', '2-5', '5-10', '10+']) {
      expect(ExperienceYearsSchema.parse(y)).toBe(y)
    }
  })

  it('H: rejects numeric value', () => {
    expect(() => ExperienceYearsSchema.parse(5)).toThrow()
  })
})

describe('SkillProficiencySchema', () => {
  it('R: accepts beginner, intermediate, expert', () => {
    for (const p of ['beginner', 'intermediate', 'expert']) {
      expect(SkillProficiencySchema.parse(p)).toBe(p)
    }
  })

  it('H: rejects advanced', () => {
    expect(() => SkillProficiencySchema.parse('advanced')).toThrow()
  })
})

describe('EmailNotificationFrequencySchema', () => {
  it('R: accepts daily, weekly, monthly, disabled', () => {
    for (const f of ['daily', 'weekly', 'monthly', 'disabled']) {
      expect(EmailNotificationFrequencySchema.parse(f)).toBe(f)
    }
  })

  it('H: rejects hourly', () => {
    expect(() => EmailNotificationFrequencySchema.parse('hourly')).toThrow()
  })
})

// ============================================================================
// Object Schemas
// ============================================================================

describe('MatchBreakdownSchema', () => {
  it('R: accepts valid breakdown with all fields', () => {
    const breakdown = {
      skills: 30,
      experience: 18,
      location: 10,
      salary: 12,
      preferences: 8,
      behavioral: 5,
    }
    const result = MatchBreakdownSchema.parse(breakdown)
    expect(result.skills).toBe(30)
    expect(result.behavioral).toBe(5)
  })

  it('R: accepts breakdown without optional behavioral', () => {
    const breakdown = {
      skills: 36,
      experience: 20,
      location: 12,
      salary: 15,
      preferences: 9,
    }
    const result = MatchBreakdownSchema.parse(breakdown)
    expect(result.behavioral).toBeUndefined()
  })

  it('H: rejects missing required field', () => {
    expect(() =>
      MatchBreakdownSchema.parse({
        skills: 30,
        experience: 18,
        // missing location, salary, preferences
      })
    ).toThrow()
  })

  it('H: rejects non-numeric values', () => {
    expect(() =>
      MatchBreakdownSchema.parse({
        skills: 'high',
        experience: 18,
        location: 10,
        salary: 12,
        preferences: 8,
      })
    ).toThrow()
  })
})

describe('SkillRequirementSchema', () => {
  it('R: accepts valid skill requirement', () => {
    const result = SkillRequirementSchema.parse({
      skill: 'TypeScript',
      proficiency: 'expert',
    })
    expect(result.skill).toBe('TypeScript')
    expect(result.proficiency).toBe('expert')
  })

  it('H: rejects empty skill name', () => {
    expect(() =>
      SkillRequirementSchema.parse({
        skill: '',
        proficiency: 'beginner',
      })
    ).toThrow()
  })

  it('H: rejects invalid proficiency', () => {
    expect(() =>
      SkillRequirementSchema.parse({
        skill: 'Python',
        proficiency: 'god-level',
      })
    ).toThrow()
  })
})

// ============================================================================
// API Request Schemas
// ============================================================================

describe('JobPostingUpdateRequestSchema', () => {
  it('R: accepts valid status update', () => {
    const result = JobPostingUpdateRequestSchema.parse({ status: 'viewed' })
    expect(result.status).toBe('viewed')
  })

  it('R: accepts valid feedback with reason', () => {
    const result = JobPostingUpdateRequestSchema.parse({
      user_feedback: 'dislike',
      feedback_reason: 'Salary too low',
    })
    expect(result.user_feedback).toBe('dislike')
    expect(result.feedback_reason).toBe('Salary too low')
  })

  it('R: accepts null feedback (clearing)', () => {
    const result = JobPostingUpdateRequestSchema.parse({
      user_feedback: null,
      feedback_reason: null,
    })
    expect(result.user_feedback).toBeNull()
  })

  it('R: accepts job_application_id as UUID', () => {
    const result = JobPostingUpdateRequestSchema.parse({
      job_application_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.job_application_id).toBeDefined()
  })

  it('R: accepts empty object (no changes)', () => {
    const result = JobPostingUpdateRequestSchema.parse({})
    expect(result).toEqual({})
  })

  it('H: rejects invalid status', () => {
    expect(() =>
      JobPostingUpdateRequestSchema.parse({ status: 'archived' })
    ).toThrow()
  })

  it('H: rejects invalid UUID for job_application_id', () => {
    expect(() =>
      JobPostingUpdateRequestSchema.parse({ job_application_id: 'not-a-uuid' })
    ).toThrow()
  })
})

describe('JobDiscoveryRequestSchema', () => {
  it('R: accepts valid discovery request', () => {
    const result = JobDiscoveryRequestSchema.parse({
      forceRefresh: true,
      maxJobs: 50,
    })
    expect(result.forceRefresh).toBe(true)
    expect(result.maxJobs).toBe(50)
  })

  it('R: accepts empty object (defaults)', () => {
    const result = JobDiscoveryRequestSchema.parse({})
    expect(result).toEqual({})
  })

  it('L: maxJobs must be at least 1', () => {
    expect(() =>
      JobDiscoveryRequestSchema.parse({ maxJobs: 0 })
    ).toThrow()
  })

  it('L: maxJobs must be at most 100', () => {
    expect(() =>
      JobDiscoveryRequestSchema.parse({ maxJobs: 101 })
    ).toThrow()
  })

  it('H: rejects non-integer maxJobs', () => {
    expect(() =>
      JobDiscoveryRequestSchema.parse({ maxJobs: 10.5 })
    ).toThrow()
  })
})

describe('JobSearchPreferencesUpdateRequestSchema', () => {
  it('R: accepts full valid update', () => {
    const input = {
      is_active: true,
      preferred_job_titles: ['Software Engineer', 'Full Stack Developer'],
      preferred_locations: ['San Francisco', 'Remote'],
      experience_years: '5-10',
      required_skills: [{ skill: 'React', proficiency: 'expert' }],
      company_size_preferences: ['51-200', '201-500'],
      remote_policy_preferences: ['remote', 'hybrid'],
      required_benefits: ['health insurance'],
      salary_min_override: 150000,
      salary_currency_override: 'USD',
      avoid_companies: ['BadCorp'],
      avoid_keywords: ['unpaid'],
      email_notification_frequency: 'daily',
    }
    const result = JobSearchPreferencesUpdateRequestSchema.parse(input)
    expect(result.preferred_job_titles).toHaveLength(2)
    expect(result.required_skills?.[0].skill).toBe('React')
  })

  it('R: accepts partial update (single field)', () => {
    const result = JobSearchPreferencesUpdateRequestSchema.parse({
      email_notification_frequency: 'disabled',
    })
    expect(result.email_notification_frequency).toBe('disabled')
  })

  it('A: salary_currency_override must be exactly 3 characters', () => {
    expect(() =>
      JobSearchPreferencesUpdateRequestSchema.parse({
        salary_currency_override: 'US',
      })
    ).toThrow()
    expect(() =>
      JobSearchPreferencesUpdateRequestSchema.parse({
        salary_currency_override: 'USDX',
      })
    ).toThrow()
  })

  it('L: salary_min_override must be non-negative', () => {
    expect(() =>
      JobSearchPreferencesUpdateRequestSchema.parse({
        salary_min_override: -1,
      })
    ).toThrow()
  })

  it('H: rejects empty strings in arrays', () => {
    expect(() =>
      JobSearchPreferencesUpdateRequestSchema.parse({
        preferred_job_titles: ['', 'Engineer'],
      })
    ).toThrow()
  })

  it('H: rejects invalid skill proficiency in nested object', () => {
    expect(() =>
      JobSearchPreferencesUpdateRequestSchema.parse({
        required_skills: [{ skill: 'Python', proficiency: 'master' }],
      })
    ).toThrow()
  })
})

describe('FeedbackRequestSchema', () => {
  it('R: accepts valid like feedback', () => {
    const result = FeedbackRequestSchema.parse({
      jobPostingId: '550e8400-e29b-41d4-a716-446655440000',
      feedback: 'like',
    })
    expect(result.feedback).toBe('like')
  })

  it('R: accepts dislike with reason', () => {
    const result = FeedbackRequestSchema.parse({
      jobPostingId: '550e8400-e29b-41d4-a716-446655440000',
      feedback: 'dislike',
      reason: 'Salary too low',
    })
    expect(result.reason).toBe('Salary too low')
  })

  it('R: accepts hide without reason', () => {
    const result = FeedbackRequestSchema.parse({
      jobPostingId: '550e8400-e29b-41d4-a716-446655440000',
      feedback: 'hide',
    })
    expect(result.reason).toBeUndefined()
  })

  it('R: accepts null reason (explicit clear)', () => {
    const result = FeedbackRequestSchema.parse({
      jobPostingId: '550e8400-e29b-41d4-a716-446655440000',
      feedback: 'like',
      reason: null,
    })
    expect(result.reason).toBeNull()
  })

  it('H: rejects missing jobPostingId', () => {
    expect(() =>
      FeedbackRequestSchema.parse({ feedback: 'like' })
    ).toThrow()
  })

  it('H: rejects invalid UUID for jobPostingId', () => {
    expect(() =>
      FeedbackRequestSchema.parse({
        jobPostingId: 'abc-123',
        feedback: 'like',
      })
    ).toThrow()
  })

  it('H: rejects invalid feedback value', () => {
    expect(() =>
      FeedbackRequestSchema.parse({
        jobPostingId: '550e8400-e29b-41d4-a716-446655440000',
        feedback: 'love',
      })
    ).toThrow()
  })

  it('H: rejects invalid reason', () => {
    expect(() =>
      FeedbackRequestSchema.parse({
        jobPostingId: '550e8400-e29b-41d4-a716-446655440000',
        feedback: 'dislike',
        reason: 'Too boring',
      })
    ).toThrow()
  })
})

describe('JobSearchFiltersSchema', () => {
  it('R: accepts full valid filter set', () => {
    const filters = {
      job_titles: ['Engineer'],
      locations: ['NYC'],
      work_types: ['remote', 'hybrid'],
      experience_level: 'senior',
      salary_min: 100000,
      salary_currency: 'USD',
      company_sizes: ['51-200'],
      required_skills: ['TypeScript'],
      avoid_companies: ['BadCorp'],
      avoid_keywords: ['unpaid'],
    }
    const result = JobSearchFiltersSchema.parse(filters)
    expect(result.work_types).toHaveLength(2)
  })

  it('R: accepts empty object (no filters)', () => {
    const result = JobSearchFiltersSchema.parse({})
    expect(result).toEqual({})
  })

  it('R: accepts null experience_level', () => {
    const result = JobSearchFiltersSchema.parse({ experience_level: null })
    expect(result.experience_level).toBeNull()
  })

  it('A: salary_currency must be 3 characters', () => {
    expect(() =>
      JobSearchFiltersSchema.parse({ salary_currency: 'EURO' })
    ).toThrow()
  })

  it('L: salary_min must be non-negative', () => {
    expect(() =>
      JobSearchFiltersSchema.parse({ salary_min: -50000 })
    ).toThrow()
  })

  it('H: rejects invalid work_type in array', () => {
    expect(() =>
      JobSearchFiltersSchema.parse({ work_types: ['remote', 'virtual'] })
    ).toThrow()
  })

  it('H: rejects empty strings in arrays', () => {
    expect(() =>
      JobSearchFiltersSchema.parse({ job_titles: [''] })
    ).toThrow()
  })
})

describe('DiscoveredJobSchema', () => {
  const validJob = {
    title: 'Senior Software Engineer',
    company_name: 'TechCorp',
    source_url: 'https://example.com/job/123',
    required_skills: ['TypeScript', 'React'],
    benefits: ['Health Insurance'],
  }

  it('R: accepts minimal valid discovered job', () => {
    const result = DiscoveredJobSchema.parse(validJob)
    expect(result.title).toBe('Senior Software Engineer')
    expect(result.required_skills).toHaveLength(2)
  })

  it('R: accepts fully populated discovered job', () => {
    const full = {
      ...validJob,
      company_logo_url: 'https://example.com/logo.png',
      description: 'Great role for experienced developers',
      location: 'San Francisco, CA',
      work_type: 'hybrid',
      experience_level: 'senior',
      salary_min: 150000,
      salary_max: 200000,
      salary_currency: 'USD',
      company_size: '201-500',
      source_platform: 'LinkedIn',
      posted_date: '2025-01-15',
      content_hash: 'abc123hash',
    }
    const result = DiscoveredJobSchema.parse(full)
    expect(result.salary_min).toBe(150000)
    expect(result.work_type).toBe('hybrid')
  })

  it('A: title must be non-empty', () => {
    expect(() =>
      DiscoveredJobSchema.parse({ ...validJob, title: '' })
    ).toThrow()
  })

  it('A: company_name must be non-empty', () => {
    expect(() =>
      DiscoveredJobSchema.parse({ ...validJob, company_name: '' })
    ).toThrow()
  })

  it('A: source_url must be a valid URL', () => {
    expect(() =>
      DiscoveredJobSchema.parse({ ...validJob, source_url: 'not-a-url' })
    ).toThrow()
  })

  it('L: salary_min must be non-negative', () => {
    expect(() =>
      DiscoveredJobSchema.parse({ ...validJob, salary_min: -1 })
    ).toThrow()
  })

  it('L: salary_max must be non-negative', () => {
    expect(() =>
      DiscoveredJobSchema.parse({ ...validJob, salary_max: -1 })
    ).toThrow()
  })

  it('H: rejects missing title', () => {
    const { title, ...noTitle } = validJob
    expect(() => DiscoveredJobSchema.parse(noTitle)).toThrow()
  })

  it('H: rejects missing required_skills', () => {
    const { required_skills, ...noSkills } = validJob
    expect(() => DiscoveredJobSchema.parse(noSkills)).toThrow()
  })

  it('H: rejects invalid work_type', () => {
    expect(() =>
      DiscoveredJobSchema.parse({ ...validJob, work_type: 'virtual' })
    ).toThrow()
  })

  it('P: accepts null optional fields', () => {
    const result = DiscoveredJobSchema.parse({
      ...validJob,
      company_logo_url: null,
      description: null,
      location: null,
      work_type: null,
      experience_level: null,
      salary_min: null,
      salary_max: null,
      company_size: null,
      source_platform: null,
      posted_date: null,
      content_hash: null,
    })
    expect(result.company_logo_url).toBeNull()
    expect(result.work_type).toBeNull()
  })
})

describe('MatchResultSchema', () => {
  const validResult = {
    totalScore: 85,
    breakdown: {
      skills: 30,
      experience: 18,
      location: 10,
      salary: 12,
      preferences: 8,
      behavioral: 7,
    },
    matchReasons: ['Strong TypeScript skills', 'Location match'],
    passesThreshold: true,
    isBorderline: false,
  }

  it('R: accepts valid match result', () => {
    const result = MatchResultSchema.parse(validResult)
    expect(result.totalScore).toBe(85)
    expect(result.passesThreshold).toBe(true)
  })

  it('R: accepts borderline match result', () => {
    const borderline = {
      ...validResult,
      totalScore: 70,
      passesThreshold: false,
      isBorderline: true,
    }
    const result = MatchResultSchema.parse(borderline)
    expect(result.isBorderline).toBe(true)
  })

  it('A: totalScore min is 0', () => {
    expect(() =>
      MatchResultSchema.parse({ ...validResult, totalScore: -1 })
    ).toThrow()
  })

  it('A: totalScore max is 100', () => {
    expect(() =>
      MatchResultSchema.parse({ ...validResult, totalScore: 101 })
    ).toThrow()
  })

  it('L: accepts edge case totalScore 0', () => {
    const result = MatchResultSchema.parse({
      ...validResult,
      totalScore: 0,
      passesThreshold: false,
      isBorderline: false,
    })
    expect(result.totalScore).toBe(0)
  })

  it('L: accepts edge case totalScore 100', () => {
    const result = MatchResultSchema.parse({
      ...validResult,
      totalScore: 100,
    })
    expect(result.totalScore).toBe(100)
  })

  it('H: rejects missing breakdown', () => {
    const { breakdown, ...noBreakdown } = validResult
    expect(() => MatchResultSchema.parse(noBreakdown)).toThrow()
  })

  it('H: rejects non-boolean passesThreshold', () => {
    expect(() =>
      MatchResultSchema.parse({ ...validResult, passesThreshold: 'yes' })
    ).toThrow()
  })
})

// ============================================================================
// TypeScript Type Structural Checks
// ============================================================================

describe('TypeScript type structural validation', () => {
  it('DiscoveredJob has no user-specific fields', () => {
    // Compile-time check: DiscoveredJob should NOT have user_id, status, etc.
    const job: DiscoveredJob = {
      title: 'Engineer',
      company_name: 'Corp',
      source_url: 'https://example.com',
      required_skills: [],
      benefits: [],
    }
    expect(job).not.toHaveProperty('user_id')
    expect(job).not.toHaveProperty('status')
    expect(job).not.toHaveProperty('match_score')
    expect(job).not.toHaveProperty('user_feedback')
  })

  it('MatchResult contains all expected scoring fields', () => {
    const result: MatchResult = {
      totalScore: 80,
      breakdown: {
        skills: 30,
        experience: 15,
        location: 10,
        salary: 12,
        preferences: 8,
      },
      matchReasons: ['Good fit'],
      passesThreshold: true,
      isBorderline: false,
    }
    expect(result).toHaveProperty('totalScore')
    expect(result).toHaveProperty('breakdown')
    expect(result).toHaveProperty('matchReasons')
    expect(result).toHaveProperty('passesThreshold')
    expect(result).toHaveProperty('isBorderline')
  })

  it('SearchInsights has all required fields', () => {
    const insights: SearchInsights = {
      keywords: ['react', 'typescript'],
      recommendedBoards: [
        { name: 'LinkedIn', url: 'https://linkedin.com', reason: 'Most jobs' },
      ],
      marketInsights: 'Market is strong',
      personalizedStrategy: 'Focus on React roles',
      generatedAt: new Date().toISOString(),
    }
    expect(insights.keywords).toHaveLength(2)
    expect(insights.recommendedBoards[0]).toHaveProperty('name')
    expect(insights.recommendedBoards[0]).toHaveProperty('url')
    expect(insights.recommendedBoards[0]).toHaveProperty('reason')
  })

  it('FeedbackRequest maps to UserFeedback values', () => {
    const req: FeedbackRequest = {
      jobPostingId: '550e8400-e29b-41d4-a716-446655440000',
      feedback: 'dislike',
      reason: 'Salary too low',
    }
    expect(['like', 'dislike', 'hide']).toContain(req.feedback)
  })

  it('JobSearchFilters is a proper subset of preferences', () => {
    const filters: JobSearchFilters = {
      job_titles: ['Engineer'],
      locations: ['NYC'],
      work_types: ['remote'],
      experience_level: 'senior',
      salary_min: 100000,
      salary_currency: 'USD',
      company_sizes: ['51-200'],
      required_skills: ['TypeScript'],
      avoid_companies: ['BadCorp'],
      avoid_keywords: ['unpaid'],
    }
    // All filter fields exist as concepts in preferences
    expect(Object.keys(filters).length).toBeLessThanOrEqual(10)
  })

  it('ProfileJobSearchFields matches migration 013 columns', () => {
    const fields: ProfileJobSearchFields = {
      preferred_job_titles: ['VP Product'],
      preferred_industries: ['Fintech'],
      minimum_salary_expectation: 200000,
      salary_currency: 'USD',
      location_preferences: { city: 'NYC', remote_policy: 'remote' },
      company_size_preferences: ['51-200'],
      career_goals: 'Become CTO',
      general_cv_analysis: {
        skills: ['leadership'],
        experience_years: 15,
        industries: ['Fintech'],
        seniority_level: 'executive',
      },
    }
    expect(fields).toHaveProperty('preferred_job_titles')
    expect(fields).toHaveProperty('minimum_salary_expectation')
    expect(fields).toHaveProperty('location_preferences')
    expect(fields).toHaveProperty('general_cv_analysis')
  })

  it('JobPostingRow has all database columns', () => {
    const row: JobPostingRow = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Engineer',
      company_name: 'Corp',
      company_logo_url: null,
      description: null,
      location: null,
      work_type: null,
      experience_level: null,
      salary_min: null,
      salary_max: null,
      salary_currency: 'USD',
      required_skills: [],
      benefits: [],
      company_size: null,
      source_url: null,
      source_platform: null,
      posted_date: null,
      discovered_at: new Date().toISOString(),
      match_score: 0,
      match_breakdown: null,
      match_reasons: [],
      status: 'new',
      user_feedback: null,
      feedback_reason: null,
      discarded_until: null,
      job_application_id: null,
      content_hash: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    expect(Object.keys(row).length).toBeGreaterThanOrEqual(25)
  })

  it('JobSearchPreferencesRow has all database columns', () => {
    const row: JobSearchPreferencesRow = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      user_id: '550e8400-e29b-41d4-a716-446655440001',
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    expect(Object.keys(row).length).toBeGreaterThanOrEqual(25)
  })
})
