/**
 * Job Discovery Service Tests (Phase 3)
 *
 * RALPH tests for query building, content hashing, response parsing, and job discovery.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  buildSearchQueries,
  generateContentHash,
  parseGeminiJobResponse,
} from '@/lib/job-search/discover-jobs'
import type { JobSearchPreferencesRow, ProfileJobSearchFields } from '@/types/job-search'

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockProfile(overrides: Partial<ProfileJobSearchFields & { id: string; skills?: string[] }> = {}) {
  return {
    id: 'user-123',
    preferred_job_titles: ['Software Engineer', 'Full Stack Developer'],
    preferred_industries: ['Fintech', 'SaaS'],
    minimum_salary_expectation: 120000,
    salary_currency: 'USD',
    location_preferences: { city: 'San Francisco', country: 'USA', remote_policy: 'remote' },
    company_size_preferences: ['51-200', '201-500'] as const,
    career_goals: 'Become a tech lead',
    general_cv_analysis: {
      skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'AWS'],
      experience_years: 5,
      industries: ['Fintech'],
      seniority_level: 'senior',
    },
    skills: ['TypeScript', 'React'],
    ...overrides,
  }
}

function createMockPreferences(overrides: Partial<JobSearchPreferencesRow> = {}): JobSearchPreferencesRow {
  return {
    id: 'prefs-123',
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

// ============================================================================
// buildSearchQueries Tests
// ============================================================================

describe('buildSearchQueries', () => {
  const currentYear = new Date().getFullYear()

  // --- Returns ---

  it('R: returns an array of 2-3 search queries', () => {
    const profile = createMockProfile()
    const prefs = createMockPreferences()
    const queries = buildSearchQueries(profile, prefs)
    expect(queries.length).toBeGreaterThanOrEqual(2)
    expect(queries.length).toBeLessThanOrEqual(3)
  })

  it('R: queries include the current year for freshness', () => {
    const profile = createMockProfile()
    const prefs = createMockPreferences()
    const queries = buildSearchQueries(profile, prefs)
    for (const query of queries) {
      expect(query).toContain(String(currentYear))
    }
  })

  it('R: queries include "open positions" keyword', () => {
    const profile = createMockProfile()
    const prefs = createMockPreferences()
    const queries = buildSearchQueries(profile, prefs)
    for (const query of queries) {
      expect(query.toLowerCase()).toContain('open positions')
    }
  })

  // --- Asserts: Job Titles ---

  it('A: uses job titles from preferences when available', () => {
    const profile = createMockProfile()
    const prefs = createMockPreferences({
      preferred_job_titles: ['Product Manager', 'VP Product'],
    })
    const queries = buildSearchQueries(profile, prefs)
    expect(queries[0]).toContain('Product Manager')
  })

  it('A: falls back to profile job titles when preferences empty', () => {
    const profile = createMockProfile({
      preferred_job_titles: ['Backend Engineer'],
    })
    const prefs = createMockPreferences({ preferred_job_titles: [] })
    const queries = buildSearchQueries(profile, prefs)
    expect(queries[0]).toContain('Backend Engineer')
  })

  it('A: generates variation query with alternative title', () => {
    const profile = createMockProfile({
      preferred_job_titles: ['Software Engineer', 'Backend Developer'],
    })
    const prefs = createMockPreferences()
    const queries = buildSearchQueries(profile, prefs)
    const hasAlternative = queries.some(q => q.includes('Backend Developer'))
    expect(hasAlternative).toBe(true)
  })

  // --- Asserts: Location ---

  it('A: uses locations from preferences when available', () => {
    const profile = createMockProfile()
    const prefs = createMockPreferences({
      preferred_locations: ['New York', 'Remote'],
    })
    const queries = buildSearchQueries(profile, prefs)
    expect(queries[0]).toContain('New York')
  })

  it('A: falls back to profile location preferences', () => {
    const profile = createMockProfile({
      location_preferences: { city: 'Austin', country: 'USA' },
    })
    const prefs = createMockPreferences({ preferred_locations: [] })
    const queries = buildSearchQueries(profile, prefs)
    expect(queries[0]).toContain('Austin')
  })

  // --- Asserts: Remote Preference ---

  it('A: includes "remote" keyword when remote is preferred', () => {
    const profile = createMockProfile()
    const prefs = createMockPreferences({
      remote_policy_preferences: ['remote', 'hybrid'],
    })
    const queries = buildSearchQueries(profile, prefs)
    expect(queries[0]).toContain('remote')
  })

  it('A: excludes "remote" keyword when onsite-only preference', () => {
    const profile = createMockProfile()
    const prefs = createMockPreferences({
      remote_policy_preferences: ['onsite'],
    })
    const queries = buildSearchQueries(profile, prefs)
    expect(queries[0]).not.toContain('remote')
  })

  // --- Asserts: Skills ---

  it('A: includes skills from profile CV analysis', () => {
    const profile = createMockProfile({
      general_cv_analysis: {
        skills: ['Rust', 'Go', 'Kubernetes'],
        experience_years: 7,
        industries: [],
        seniority_level: 'senior',
      },
    })
    const prefs = createMockPreferences()
    const queries = buildSearchQueries(profile, prefs)
    const hasSkill = queries.some(q => q.includes('Rust') || q.includes('Go') || q.includes('Kubernetes'))
    expect(hasSkill).toBe(true)
  })

  it('A: includes required skills from preferences', () => {
    const profile = createMockProfile({
      general_cv_analysis: null, // No CV skills, so preference skills should be used
    })
    const prefs = createMockPreferences({
      required_skills: [
        { skill: 'Python', proficiency: 'expert' },
        { skill: 'Machine Learning', proficiency: 'intermediate' },
      ],
    })
    const queries = buildSearchQueries(profile, prefs)
    const hasSkill = queries.some(q => q.includes('Python') || q.includes('Machine Learning'))
    expect(hasSkill).toBe(true)
  })

  // --- Logic ---

  it('L: generates exactly 2 queries when only one job title', () => {
    const profile = createMockProfile({
      preferred_job_titles: ['Data Scientist'],
      preferred_industries: [],
    })
    const prefs = createMockPreferences()
    const queries = buildSearchQueries(profile, prefs)
    expect(queries.length).toBe(2)
  })

  it('L: generates 3 queries when multiple titles and industries', () => {
    const profile = createMockProfile({
      preferred_job_titles: ['Software Engineer', 'Full Stack Developer'],
      preferred_industries: ['Healthcare', 'Education'],
    })
    const prefs = createMockPreferences()
    const queries = buildSearchQueries(profile, prefs)
    expect(queries.length).toBe(3)
  })

  // --- Handling ---

  it('H: handles empty profile gracefully with defaults', () => {
    const profile = {
      id: 'user-123',
      preferred_job_titles: [],
      preferred_industries: [],
      minimum_salary_expectation: null,
      salary_currency: 'USD',
      location_preferences: {},
      company_size_preferences: [],
      career_goals: null,
      general_cv_analysis: null,
    }
    const prefs = createMockPreferences()
    const queries = buildSearchQueries(profile, prefs)
    expect(queries.length).toBeGreaterThanOrEqual(2)
    // Should fall back to default title
    expect(queries[0]).toContain('Software Engineer')
  })
})

// ============================================================================
// generateContentHash Tests
// ============================================================================

describe('generateContentHash', () => {
  // --- Returns ---

  it('R: returns a 32-character hexadecimal string', () => {
    const hash = generateContentHash('Software Engineer', 'TechCorp')
    expect(hash).toMatch(/^[a-f0-9]{32}$/)
  })

  it('R: returns consistent hash for same inputs', () => {
    const hash1 = generateContentHash('Product Manager', 'Acme Inc')
    const hash2 = generateContentHash('Product Manager', 'Acme Inc')
    expect(hash1).toBe(hash2)
  })

  // --- Asserts: Normalization ---

  it('A: produces same hash regardless of case', () => {
    const hash1 = generateContentHash('SOFTWARE ENGINEER', 'TECHCORP')
    const hash2 = generateContentHash('software engineer', 'techcorp')
    expect(hash1).toBe(hash2)
  })

  it('A: produces same hash with whitespace variations', () => {
    const hash1 = generateContentHash('  Software Engineer  ', '  TechCorp  ')
    const hash2 = generateContentHash('Software Engineer', 'TechCorp')
    expect(hash1).toBe(hash2)
  })

  // --- Logic: Uniqueness ---

  it('L: different titles produce different hashes', () => {
    const hash1 = generateContentHash('Software Engineer', 'TechCorp')
    const hash2 = generateContentHash('Product Manager', 'TechCorp')
    expect(hash1).not.toBe(hash2)
  })

  it('L: different companies produce different hashes', () => {
    const hash1 = generateContentHash('Software Engineer', 'TechCorp')
    const hash2 = generateContentHash('Software Engineer', 'AnotherCorp')
    expect(hash1).not.toBe(hash2)
  })

  // --- Handling ---

  it('H: handles special characters in title', () => {
    const hash = generateContentHash('Software Engineer (Remote)', 'Tech & Co.')
    expect(hash).toMatch(/^[a-f0-9]{32}$/)
  })

  it('H: handles unicode characters', () => {
    const hash = generateContentHash('Développeur Senior', 'Société Générale')
    expect(hash).toMatch(/^[a-f0-9]{32}$/)
  })

  it('H: handles empty strings', () => {
    const hash = generateContentHash('', '')
    expect(hash).toMatch(/^[a-f0-9]{32}$/)
  })
})

// ============================================================================
// parseGeminiJobResponse Tests
// ============================================================================

describe('parseGeminiJobResponse', () => {
  // --- Returns: Valid JSON ---

  it('R: parses valid JSON array of jobs', () => {
    const json = JSON.stringify([
      {
        title: 'Software Engineer',
        company_name: 'TechCorp',
        source_url: 'https://techcorp.com/jobs/123',
        required_skills: ['TypeScript'],
        benefits: ['Health'],
      },
    ])
    const jobs = parseGeminiJobResponse(json)
    expect(jobs).toHaveLength(1)
    expect(jobs[0].title).toBe('Software Engineer')
    expect(jobs[0].company_name).toBe('TechCorp')
  })

  it('R: parses multiple jobs from array', () => {
    const json = JSON.stringify([
      { title: 'Job 1', company_name: 'Company A', source_url: 'https://a.com/1', required_skills: [], benefits: [] },
      { title: 'Job 2', company_name: 'Company B', source_url: 'https://b.com/2', required_skills: [], benefits: [] },
      { title: 'Job 3', company_name: 'Company C', source_url: 'https://c.com/3', required_skills: [], benefits: [] },
    ])
    const jobs = parseGeminiJobResponse(json)
    expect(jobs).toHaveLength(3)
  })

  // --- Returns: JSON in code blocks ---

  it('R: extracts JSON from markdown code block', () => {
    const text = `Here are some jobs:
\`\`\`json
[{"title": "Developer", "company_name": "Corp", "source_url": "https://corp.com/job", "required_skills": [], "benefits": []}]
\`\`\`
Let me know if you need more.`
    const jobs = parseGeminiJobResponse(text)
    expect(jobs).toHaveLength(1)
    expect(jobs[0].title).toBe('Developer')
  })

  it('R: extracts JSON from code block without language tag', () => {
    const text = `\`\`\`
[{"title": "Engineer", "company_name": "Inc", "source_url": "https://inc.com/job", "required_skills": [], "benefits": []}]
\`\`\``
    const jobs = parseGeminiJobResponse(text)
    expect(jobs).toHaveLength(1)
  })

  // --- Returns: JSON with wrapper object ---

  it('R: extracts jobs array from wrapper object', () => {
    const json = JSON.stringify({
      jobs: [
        { title: 'PM', company_name: 'Startup', source_url: 'https://startup.com/pm', required_skills: [], benefits: [] },
      ],
      totalFound: 1,
    })
    const jobs = parseGeminiJobResponse(json)
    expect(jobs).toHaveLength(1)
    expect(jobs[0].title).toBe('PM')
  })

  // --- Asserts: Field Normalization ---

  it('A: normalizes work_type to valid enum', () => {
    const json = JSON.stringify([
      { title: 'Job', company_name: 'Co', source_url: 'https://co.com/j', work_type: 'REMOTE', required_skills: [], benefits: [] },
    ])
    const jobs = parseGeminiJobResponse(json)
    expect(jobs[0].work_type).toBe('remote')
  })

  it('A: normalizes "work from home" to remote', () => {
    const json = JSON.stringify([
      { title: 'Job', company_name: 'Co', source_url: 'https://co.com/j', work_type: 'work from home / remote', required_skills: [], benefits: [] },
    ])
    const jobs = parseGeminiJobResponse(json)
    expect(jobs[0].work_type).toBe('remote')
  })

  it('A: normalizes experience_level to valid enum', () => {
    const json = JSON.stringify([
      { title: 'Job', company_name: 'Co', source_url: 'https://co.com/j', experience_level: 'Junior/Entry Level', required_skills: [], benefits: [] },
    ])
    const jobs = parseGeminiJobResponse(json)
    expect(jobs[0].experience_level).toBe('entry')
  })

  it('A: normalizes "Lead" to senior experience level', () => {
    const json = JSON.stringify([
      { title: 'Job', company_name: 'Co', source_url: 'https://co.com/j', experience_level: 'Lead Engineer', required_skills: [], benefits: [] },
    ])
    const jobs = parseGeminiJobResponse(json)
    expect(jobs[0].experience_level).toBe('senior')
  })

  it('A: truncates description to 500 characters', () => {
    const longDescription = 'x'.repeat(1000)
    const json = JSON.stringify([
      { title: 'Job', company_name: 'Co', source_url: 'https://co.com/j', description: longDescription, required_skills: [], benefits: [] },
    ])
    const jobs = parseGeminiJobResponse(json)
    expect(jobs[0].description?.length).toBe(500)
  })

  it('A: generates content_hash for each job', () => {
    const json = JSON.stringify([
      { title: 'Engineer', company_name: 'Corp', source_url: 'https://corp.com/j', required_skills: [], benefits: [] },
    ])
    const jobs = parseGeminiJobResponse(json)
    expect(jobs[0].content_hash).toMatch(/^[a-f0-9]{32}$/)
  })

  it('A: detects source_platform from URL', () => {
    const json = JSON.stringify([
      { title: 'Job', company_name: 'Co', source_url: 'https://linkedin.com/jobs/123', required_skills: [], benefits: [] },
    ])
    const jobs = parseGeminiJobResponse(json)
    expect(jobs[0].source_platform).toBe('LinkedIn')
  })

  it('A: uses provided source_platform over URL detection', () => {
    const json = JSON.stringify([
      { title: 'Job', company_name: 'Co', source_url: 'https://company.com/job', source_platform: 'Indeed', required_skills: [], benefits: [] },
    ])
    const jobs = parseGeminiJobResponse(json)
    expect(jobs[0].source_platform).toBe('Indeed')
  })

  // --- Logic: Validation ---

  it('L: skips jobs without required title', () => {
    const json = JSON.stringify([
      { company_name: 'Co', source_url: 'https://co.com/j', required_skills: [], benefits: [] },
      { title: 'Valid', company_name: 'Corp', source_url: 'https://corp.com/j', required_skills: [], benefits: [] },
    ])
    const jobs = parseGeminiJobResponse(json)
    expect(jobs).toHaveLength(1)
    expect(jobs[0].title).toBe('Valid')
  })

  it('L: skips jobs without company_name', () => {
    const json = JSON.stringify([
      { title: 'Job', source_url: 'https://co.com/j', required_skills: [], benefits: [] },
    ])
    const jobs = parseGeminiJobResponse(json)
    expect(jobs).toHaveLength(0)
  })

  it('L: skips jobs without source_url', () => {
    const json = JSON.stringify([
      { title: 'Job', company_name: 'Co', required_skills: [], benefits: [] },
    ])
    const jobs = parseGeminiJobResponse(json)
    expect(jobs).toHaveLength(0)
  })

  it('L: skips jobs with invalid URL', () => {
    const json = JSON.stringify([
      { title: 'Job', company_name: 'Co', source_url: 'not-a-url', required_skills: [], benefits: [] },
    ])
    const jobs = parseGeminiJobResponse(json)
    expect(jobs).toHaveLength(0)
  })

  it('L: validates salary values are non-negative', () => {
    const json = JSON.stringify([
      { title: 'Job', company_name: 'Co', source_url: 'https://co.com/j', salary_min: -1000, salary_max: 100000, required_skills: [], benefits: [] },
    ])
    const jobs = parseGeminiJobResponse(json)
    expect(jobs[0].salary_min).toBeUndefined()
    expect(jobs[0].salary_max).toBe(100000)
  })

  it('L: normalizes posted_date to ISO format', () => {
    const json = JSON.stringify([
      { title: 'Job', company_name: 'Co', source_url: 'https://co.com/j', posted_date: '2025-01-15T12:00:00Z', required_skills: [], benefits: [] },
    ])
    const jobs = parseGeminiJobResponse(json)
    expect(jobs[0].posted_date).toBe('2025-01-15')
  })

  // --- Handling: Malformed JSON ---

  it('H: returns empty array for null input', () => {
    const jobs = parseGeminiJobResponse(null as unknown as string)
    expect(jobs).toEqual([])
  })

  it('H: returns empty array for empty string', () => {
    const jobs = parseGeminiJobResponse('')
    expect(jobs).toEqual([])
  })

  it('H: returns empty array for non-string input', () => {
    const jobs = parseGeminiJobResponse(123 as unknown as string)
    expect(jobs).toEqual([])
  })

  it('H: handles JSON with trailing commas', () => {
    const malformed = `[{"title": "Job", "company_name": "Co", "source_url": "https://co.com/j", "required_skills": [], "benefits": [],}]`
    const jobs = parseGeminiJobResponse(malformed)
    expect(jobs).toHaveLength(1)
  })

  it('H: handles text with no JSON at all', () => {
    const text = "I couldn't find any jobs matching your criteria."
    const jobs = parseGeminiJobResponse(text)
    expect(jobs).toEqual([])
  })

  it('H: handles JSON embedded in narrative text', () => {
    const text = `Based on my search, here are some positions:
    [{"title": "Engineer", "company_name": "Corp", "source_url": "https://corp.com/j", "required_skills": [], "benefits": []}]
    These look like good matches for your profile.`
    const jobs = parseGeminiJobResponse(text)
    expect(jobs).toHaveLength(1)
  })

  it('H: handles completely invalid JSON gracefully', () => {
    const invalid = '{{{not valid json at all}}}}'
    const jobs = parseGeminiJobResponse(invalid)
    expect(jobs).toEqual([])
  })
})

// ============================================================================
// discoverJobs Integration Tests (Mocked)
// ============================================================================

describe('discoverJobs', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('R: is exported as a function', async () => {
    const { discoverJobs } = await import('@/lib/job-search/discover-jobs')
    expect(typeof discoverJobs).toBe('function')
  })

  it('A: returns DiscoveryResult structure', async () => {
    // Mock the clients to prevent actual API calls
    vi.doMock('@/lib/job-search/clients', () => ({
      getGeminiClient: vi.fn(() => ({
        getGenerativeModel: vi.fn(() => ({
          generateContent: vi.fn().mockResolvedValue({
            response: {
              text: () => '[]',
              usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50 },
            },
          }),
        })),
      })),
      getSupabaseAdmin: vi.fn(() => ({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(() => ({
                or: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
            })),
          })),
        })),
      })),
    }))

    const { discoverJobs } = await import('@/lib/job-search/discover-jobs')
    const profile = createMockProfile()
    const prefs = createMockPreferences()

    const result = await discoverJobs(profile, prefs)

    expect(result).toHaveProperty('jobs')
    expect(result).toHaveProperty('tokenUsage')
    expect(result).toHaveProperty('queriesExecuted')
    expect(result).toHaveProperty('duplicatesSkipped')
    expect(Array.isArray(result.jobs)).toBe(true)
    expect(typeof result.tokenUsage.totalTokens).toBe('number')
  })

  it('H: returns empty result on complete failure', async () => {
    vi.doMock('@/lib/job-search/clients', () => ({
      getGeminiClient: vi.fn(() => {
        throw new Error('API unavailable')
      }),
      getSupabaseAdmin: vi.fn(),
    }))

    const { discoverJobs } = await import('@/lib/job-search/discover-jobs')
    const profile = createMockProfile()
    const prefs = createMockPreferences()

    const result = await discoverJobs(profile, prefs)

    expect(result.jobs).toEqual([])
    expect(result.queriesExecuted).toBe(0)
  })
})
