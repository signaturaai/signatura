/**
 * AI Insights Generator Tests (Phase 3.3)
 *
 * RALPH tests for AI-powered search intelligence generation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  shouldRefreshInsights,
  parseKeywordsResponse,
  parseBoardsResponse,
} from '@/lib/job-search/ai-insights'
import type { JobSearchPreferencesRow } from '@/types/job-search'

// ============================================================================
// Test Fixtures
// ============================================================================

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
// shouldRefreshInsights Tests
// ============================================================================

describe('shouldRefreshInsights', () => {
  // --- Returns: Never analyzed ---

  it('R: returns true when ai_last_analysis_at is null', () => {
    const prefs = createMockPreferences({ ai_last_analysis_at: null })
    expect(shouldRefreshInsights(prefs)).toBe(true)
  })

  // --- Asserts: Age check ---

  it('A: returns true when analysis is >7 days old', () => {
    const eightDaysAgo = new Date()
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8)
    const prefs = createMockPreferences({ ai_last_analysis_at: eightDaysAgo.toISOString() })
    expect(shouldRefreshInsights(prefs)).toBe(true)
  })

  it('A: returns true when analysis is exactly 8 days old', () => {
    const eightDaysAgo = new Date()
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8)
    const prefs = createMockPreferences({ ai_last_analysis_at: eightDaysAgo.toISOString() })
    expect(shouldRefreshInsights(prefs)).toBe(true)
  })

  it('A: returns false when analysis is <7 days old', () => {
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const prefs = createMockPreferences({ ai_last_analysis_at: threeDaysAgo.toISOString() })
    expect(shouldRefreshInsights(prefs)).toBe(false)
  })

  it('A: returns false when analysis is exactly 7 days old', () => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const prefs = createMockPreferences({ ai_last_analysis_at: sevenDaysAgo.toISOString() })
    expect(shouldRefreshInsights(prefs)).toBe(false)
  })

  it('A: returns false when analysis is 1 day old', () => {
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)
    const prefs = createMockPreferences({ ai_last_analysis_at: oneDayAgo.toISOString() })
    expect(shouldRefreshInsights(prefs)).toBe(false)
  })

  it('A: returns false when analysis just happened', () => {
    const prefs = createMockPreferences({ ai_last_analysis_at: new Date().toISOString() })
    expect(shouldRefreshInsights(prefs)).toBe(false)
  })

  // --- Logic: Edge cases ---

  it('L: handles midnight boundary correctly', () => {
    const justOver7Days = new Date()
    justOver7Days.setDate(justOver7Days.getDate() - 7)
    justOver7Days.setHours(justOver7Days.getHours() - 1)
    const prefs = createMockPreferences({ ai_last_analysis_at: justOver7Days.toISOString() })
    expect(shouldRefreshInsights(prefs)).toBe(true)
  })
})

// ============================================================================
// parseKeywordsResponse Tests
// ============================================================================

describe('parseKeywordsResponse', () => {
  // --- Returns: JSON array ---

  it('R: extracts array from valid JSON', () => {
    const input = '["AI", "SaaS", "Product"]'
    const result = parseKeywordsResponse(input)
    expect(result).toEqual(['AI', 'SaaS', 'Product'])
  })

  it('R: extracts array from JSON with extra whitespace', () => {
    const input = '  ["AI", "SaaS", "Product"]  '
    const result = parseKeywordsResponse(input)
    expect(result).toEqual(['AI', 'SaaS', 'Product'])
  })

  it('R: extracts JSON array embedded in text', () => {
    const input = 'Here are some keywords: ["AI", "SaaS", "Product"] for your search.'
    const result = parseKeywordsResponse(input)
    expect(result).toEqual(['AI', 'SaaS', 'Product'])
  })

  // --- Asserts: Comma-separated ---

  it('A: handles comma-separated text', () => {
    const input = 'AI, SaaS, Product Management'
    const result = parseKeywordsResponse(input)
    expect(result).toEqual(['AI', 'SaaS', 'Product Management'])
  })

  it('A: handles comma-separated with quotes', () => {
    const input = '"AI", "SaaS", "Product"'
    const result = parseKeywordsResponse(input)
    expect(result).toEqual(['AI', 'SaaS', 'Product'])
  })

  it('A: handles comma-separated with single quotes', () => {
    const input = "'AI', 'SaaS', 'Product'"
    const result = parseKeywordsResponse(input)
    expect(result).toEqual(['AI', 'SaaS', 'Product'])
  })

  // --- Asserts: Newline-separated ---

  it('A: handles newline-separated list', () => {
    const input = 'AI\nSaaS\nProduct Management'
    const result = parseKeywordsResponse(input)
    expect(result).toEqual(['AI', 'SaaS', 'Product Management'])
  })

  it('A: handles numbered list', () => {
    const input = '1. AI\n2. SaaS\n3. Product Management'
    const result = parseKeywordsResponse(input)
    expect(result).toEqual(['AI', 'SaaS', 'Product Management'])
  })

  it('A: handles bulleted list', () => {
    const input = '- AI\n- SaaS\n- Product Management'
    const result = parseKeywordsResponse(input)
    expect(result).toEqual(['AI', 'SaaS', 'Product Management'])
  })

  it('A: handles asterisk bulleted list', () => {
    const input = '* AI\n* SaaS\n* Product Management'
    const result = parseKeywordsResponse(input)
    expect(result).toEqual(['AI', 'SaaS', 'Product Management'])
  })

  // --- Logic: Edge cases ---

  it('L: filters out empty strings', () => {
    const input = '["AI", "", "SaaS", ""]'
    const result = parseKeywordsResponse(input)
    expect(result).toEqual(['AI', 'SaaS'])
  })

  it('L: trims whitespace from keywords', () => {
    const input = '["  AI  ", "  SaaS  "]'
    const result = parseKeywordsResponse(input)
    expect(result).toEqual(['AI', 'SaaS'])
  })

  it('L: filters keywords longer than 50 chars (for comma-separated)', () => {
    const longKeyword = 'a'.repeat(60)
    const input = `AI, ${longKeyword}, SaaS`
    const result = parseKeywordsResponse(input)
    expect(result).toEqual(['AI', 'SaaS'])
  })

  // --- Handling: Invalid input ---

  it('H: returns empty array for null input', () => {
    expect(parseKeywordsResponse(null as unknown as string)).toEqual([])
  })

  it('H: returns empty array for undefined input', () => {
    expect(parseKeywordsResponse(undefined as unknown as string)).toEqual([])
  })

  it('H: returns empty array for empty string', () => {
    expect(parseKeywordsResponse('')).toEqual([])
  })

  it('H: returns empty array for non-string input', () => {
    expect(parseKeywordsResponse(123 as unknown as string)).toEqual([])
  })

  it('H: returns empty array for long prose text', () => {
    // Long prose with many words is not valid keywords
    const longProse = 'This is a long sentence that contains many words and is clearly not meant to be parsed as individual keywords because it would result in too many items to be useful for job search purposes.'
    expect(parseKeywordsResponse(longProse)).toEqual([])
  })
})

// ============================================================================
// parseBoardsResponse Tests
// ============================================================================

describe('parseBoardsResponse', () => {
  // --- Returns: Valid JSON ---

  it('R: extracts structured board objects from valid JSON', () => {
    const input = JSON.stringify([
      { name: 'LinkedIn', url: 'https://linkedin.com', reason: 'Most jobs' },
      { name: 'Indeed', url: 'https://indeed.com', reason: 'Volume' },
    ])
    const result = parseBoardsResponse(input)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ name: 'LinkedIn', url: 'https://linkedin.com', reason: 'Most jobs' })
    expect(result[1]).toEqual({ name: 'Indeed', url: 'https://indeed.com', reason: 'Volume' })
  })

  it('R: extracts JSON from markdown code block', () => {
    const input = `Here are the boards:
\`\`\`json
[{"name": "LinkedIn", "url": "https://linkedin.com", "reason": "Best for professionals"}]
\`\`\`
Let me know if you need more.`
    const result = parseBoardsResponse(input)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('LinkedIn')
  })

  // --- Asserts: Validation ---

  it('A: filters out objects missing name', () => {
    const input = JSON.stringify([
      { url: 'https://test.com', reason: 'Test' },
      { name: 'Valid', url: 'https://valid.com', reason: 'Valid' },
    ])
    const result = parseBoardsResponse(input)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Valid')
  })

  it('A: filters out objects missing url', () => {
    const input = JSON.stringify([
      { name: 'Test', reason: 'Test' },
      { name: 'Valid', url: 'https://valid.com', reason: 'Valid' },
    ])
    const result = parseBoardsResponse(input)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Valid')
  })

  it('A: filters out objects missing reason', () => {
    const input = JSON.stringify([
      { name: 'Test', url: 'https://test.com' },
      { name: 'Valid', url: 'https://valid.com', reason: 'Valid' },
    ])
    const result = parseBoardsResponse(input)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Valid')
  })

  it('A: filters out objects with empty strings', () => {
    const input = JSON.stringify([
      { name: '', url: 'https://test.com', reason: 'Test' },
      { name: 'Valid', url: 'https://valid.com', reason: 'Valid' },
    ])
    const result = parseBoardsResponse(input)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Valid')
  })

  it('A: trims whitespace from all fields', () => {
    const input = JSON.stringify([
      { name: '  LinkedIn  ', url: '  https://linkedin.com  ', reason: '  Best  ' },
    ])
    const result = parseBoardsResponse(input)
    expect(result[0]).toEqual({
      name: 'LinkedIn',
      url: 'https://linkedin.com',
      reason: 'Best',
    })
  })

  // --- Logic ---

  it('L: handles multiple JSON arrays in text (takes first valid)', () => {
    const input = `Invalid: [1,2,3]
Valid: [{"name": "Board", "url": "https://board.com", "reason": "Good"}]`
    const result = parseBoardsResponse(input)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Board')
  })

  // --- Handling: Invalid input ---

  it('H: returns empty array for null input', () => {
    expect(parseBoardsResponse(null as unknown as string)).toEqual([])
  })

  it('H: returns empty array for undefined input', () => {
    expect(parseBoardsResponse(undefined as unknown as string)).toEqual([])
  })

  it('H: returns empty array for empty string', () => {
    expect(parseBoardsResponse('')).toEqual([])
  })

  it('H: returns empty array for invalid JSON', () => {
    expect(parseBoardsResponse('{not valid json}')).toEqual([])
  })

  it('H: returns empty array for plain text', () => {
    expect(parseBoardsResponse('Just some text about job boards')).toEqual([])
  })

  it('H: returns empty array for array of primitives', () => {
    expect(parseBoardsResponse('["LinkedIn", "Indeed"]')).toEqual([])
  })
})

// ============================================================================
// generateSearchInsights Integration Tests (Mocked)
// ============================================================================

describe('generateSearchInsights', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('R: is exported as a function', async () => {
    const { generateSearchInsights } = await import('@/lib/job-search/ai-insights')
    expect(typeof generateSearchInsights).toBe('function')
  })

  it('A: returns SearchInsights structure', async () => {
    // Mock OpenAI
    vi.doMock('openai', () => ({
      default: class MockOpenAI {
        chat = {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{ message: { content: '["AI", "SaaS"]' } }],
            }),
          },
        }
      },
    }))

    // Mock Supabase
    vi.doMock('@/lib/job-search/clients', () => ({
      getSupabaseAdmin: vi.fn(() => ({
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        })),
      })),
    }))

    const { generateSearchInsights } = await import('@/lib/job-search/ai-insights')

    const profile = {
      id: 'user-123',
      preferred_job_titles: ['Software Engineer'],
      preferred_industries: ['Fintech'],
      minimum_salary_expectation: null,
      salary_currency: 'USD',
      location_preferences: {},
      company_size_preferences: [],
      career_goals: null,
      general_cv_analysis: { skills: ['TypeScript'], experience_years: 5, industries: [], seniority_level: 'senior' },
    }
    const prefs = createMockPreferences()

    const result = await generateSearchInsights(profile, prefs, [])

    expect(result).toHaveProperty('keywords')
    expect(result).toHaveProperty('recommendedBoards')
    expect(result).toHaveProperty('marketInsights')
    expect(result).toHaveProperty('personalizedStrategy')
    expect(result).toHaveProperty('generatedAt')
    expect(Array.isArray(result.keywords)).toBe(true)
    expect(Array.isArray(result.recommendedBoards)).toBe(true)
    expect(typeof result.generatedAt).toBe('string')
  })
})
