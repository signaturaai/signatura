/**
 * Job Search Env Validation & Client Tests (Phase 2)
 *
 * RALPH tests for environment variable validation and lazy client initialization.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ============================================================================
// Env Validation Tests
// ============================================================================

describe('validateJobSearchEnv', () => {
  const VALID_ENV = {
    GOOGLE_AI_API_KEY: 'AIzaSyTest1234567890abcdef',
    RESEND_API_KEY: 're_1234567890abcdef',
    RESEND_FROM_EMAIL: 'jobs@signatura.com',
    NEXT_PUBLIC_APP_URL: 'https://signatura.com',
    CRON_SECRET: 'a_very_long_secret_string_1234',
  }

  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    // Reset module cache so validateJobSearchEnv reads fresh env
    vi.resetModules()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  async function getValidator() {
    const mod = await import('@/lib/job-search/env')
    return mod.validateJobSearchEnv
  }

  function setEnv(overrides: Partial<Record<string, string>> = {}) {
    const env = { ...VALID_ENV, ...overrides }
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  }

  // --- Returns ---

  it('R: passes with all valid env vars and returns validated object', async () => {
    setEnv()
    const validateJobSearchEnv = await getValidator()
    const result = validateJobSearchEnv()
    expect(result).toEqual(VALID_ENV)
    expect(result.GOOGLE_AI_API_KEY).toBe(VALID_ENV.GOOGLE_AI_API_KEY)
    expect(result.RESEND_API_KEY).toBe(VALID_ENV.RESEND_API_KEY)
    expect(result.RESEND_FROM_EMAIL).toBe(VALID_ENV.RESEND_FROM_EMAIL)
    expect(result.NEXT_PUBLIC_APP_URL).toBe(VALID_ENV.NEXT_PUBLIC_APP_URL)
    expect(result.CRON_SECRET).toBe(VALID_ENV.CRON_SECRET)
  })

  // --- Asserts: GOOGLE_AI_API_KEY ---

  it('A: throws when GOOGLE_AI_API_KEY is missing', async () => {
    setEnv()
    delete process.env.GOOGLE_AI_API_KEY
    const validateJobSearchEnv = await getValidator()
    expect(() => validateJobSearchEnv()).toThrow('GOOGLE_AI_API_KEY')
  })

  it('A: throws when GOOGLE_AI_API_KEY is empty', async () => {
    setEnv({ GOOGLE_AI_API_KEY: '' })
    const validateJobSearchEnv = await getValidator()
    expect(() => validateJobSearchEnv()).toThrow('GOOGLE_AI_API_KEY')
  })

  // --- Asserts: RESEND_API_KEY ---

  it('A: throws when RESEND_API_KEY is missing', async () => {
    setEnv()
    delete process.env.RESEND_API_KEY
    const validateJobSearchEnv = await getValidator()
    expect(() => validateJobSearchEnv()).toThrow('RESEND_API_KEY')
  })

  it('A: throws when RESEND_API_KEY has wrong prefix', async () => {
    setEnv({ RESEND_API_KEY: 'bad_key_1234567890' })
    const validateJobSearchEnv = await getValidator()
    expect(() => validateJobSearchEnv()).toThrow("re_")
  })

  // --- Asserts: RESEND_FROM_EMAIL ---

  it('A: throws when RESEND_FROM_EMAIL is missing', async () => {
    setEnv()
    delete process.env.RESEND_FROM_EMAIL
    const validateJobSearchEnv = await getValidator()
    expect(() => validateJobSearchEnv()).toThrow('RESEND_FROM_EMAIL')
  })

  it('A: throws when RESEND_FROM_EMAIL is not valid email', async () => {
    setEnv({ RESEND_FROM_EMAIL: 'not-an-email' })
    const validateJobSearchEnv = await getValidator()
    expect(() => validateJobSearchEnv()).toThrow('RESEND_FROM_EMAIL')
  })

  // --- Asserts: NEXT_PUBLIC_APP_URL ---

  it('A: throws when NEXT_PUBLIC_APP_URL is missing', async () => {
    setEnv()
    delete process.env.NEXT_PUBLIC_APP_URL
    const validateJobSearchEnv = await getValidator()
    expect(() => validateJobSearchEnv()).toThrow('NEXT_PUBLIC_APP_URL')
  })

  it('A: throws when NEXT_PUBLIC_APP_URL is not valid URL', async () => {
    setEnv({ NEXT_PUBLIC_APP_URL: 'not-a-url' })
    const validateJobSearchEnv = await getValidator()
    expect(() => validateJobSearchEnv()).toThrow('NEXT_PUBLIC_APP_URL')
  })

  // --- Asserts: CRON_SECRET ---

  it('A: throws when CRON_SECRET is missing', async () => {
    setEnv()
    delete process.env.CRON_SECRET
    const validateJobSearchEnv = await getValidator()
    expect(() => validateJobSearchEnv()).toThrow('CRON_SECRET')
  })

  it('A: throws when CRON_SECRET is too short', async () => {
    setEnv({ CRON_SECRET: 'abc' })
    const validateJobSearchEnv = await getValidator()
    expect(() => validateJobSearchEnv()).toThrow('CRON_SECRET')
  })

  it('A: throws when CRON_SECRET is exactly 15 chars (boundary)', async () => {
    setEnv({ CRON_SECRET: '123456789012345' })
    const validateJobSearchEnv = await getValidator()
    expect(() => validateJobSearchEnv()).toThrow('CRON_SECRET')
  })

  it('A: passes when CRON_SECRET is exactly 16 chars (boundary)', async () => {
    setEnv({ CRON_SECRET: '1234567890123456' })
    const validateJobSearchEnv = await getValidator()
    expect(() => validateJobSearchEnv()).not.toThrow()
  })

  // --- Logic: Multiple failures ---

  it('L: reports multiple missing vars in a single error', async () => {
    // Clear all env vars
    for (const key of Object.keys(VALID_ENV)) {
      delete process.env[key]
    }
    const validateJobSearchEnv = await getValidator()
    try {
      validateJobSearchEnv()
      expect.unreachable('Should have thrown')
    } catch (err) {
      const message = (err as Error).message
      expect(message).toContain('GOOGLE_AI_API_KEY')
      expect(message).toContain('RESEND_API_KEY')
      expect(message).toContain('CRON_SECRET')
    }
  })

  // --- Handling: Error format ---

  it('H: error message includes descriptive prefix', async () => {
    setEnv()
    delete process.env.GOOGLE_AI_API_KEY
    const validateJobSearchEnv = await getValidator()
    try {
      validateJobSearchEnv()
      expect.unreachable('Should have thrown')
    } catch (err) {
      const message = (err as Error).message
      expect(message).toContain('Job Search Agent environment validation failed')
    }
  })
})

// ============================================================================
// Client Initialization Tests
// ============================================================================

describe('clients.ts', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('R: exports lazy initializer functions', async () => {
    // Mock dependencies to prevent actual client creation at import time
    vi.doMock('@/lib/supabase', () => ({
      createServiceClient: vi.fn(),
    }))
    vi.doMock('@google/generative-ai', () => ({
      GoogleGenerativeAI: vi.fn(),
    }))
    vi.doMock('resend', () => ({
      Resend: vi.fn(),
    }))

    const clients = await import('@/lib/job-search/clients')
    expect(typeof clients.getSupabaseAdmin).toBe('function')
    expect(typeof clients.getGeminiClient).toBe('function')
    expect(typeof clients.getResendClient).toBe('function')
  })

  it('R: importing clients.ts does NOT create any clients (lazy)', async () => {
    const mockCreateServiceClient = vi.fn()
    const mockGoogleAI = vi.fn()
    const mockResend = vi.fn()

    vi.doMock('@/lib/supabase', () => ({
      createServiceClient: mockCreateServiceClient,
    }))
    vi.doMock('@google/generative-ai', () => ({
      GoogleGenerativeAI: mockGoogleAI,
    }))
    vi.doMock('resend', () => ({
      Resend: mockResend,
    }))

    // Just importing should not trigger construction
    await import('@/lib/job-search/clients')

    expect(mockCreateServiceClient).not.toHaveBeenCalled()
    expect(mockGoogleAI).not.toHaveBeenCalled()
    expect(mockResend).not.toHaveBeenCalled()
  })

  it('A: getSupabaseAdmin uses service role client (createServiceClient)', async () => {
    const mockClient = { from: vi.fn() }
    const mockCreateServiceClient = vi.fn().mockReturnValue(mockClient)

    vi.doMock('@/lib/supabase', () => ({
      createServiceClient: mockCreateServiceClient,
    }))
    vi.doMock('@google/generative-ai', () => ({
      GoogleGenerativeAI: vi.fn(),
    }))
    vi.doMock('resend', () => ({
      Resend: vi.fn(),
    }))

    const { getSupabaseAdmin } = await import('@/lib/job-search/clients')
    const result = getSupabaseAdmin()

    expect(mockCreateServiceClient).toHaveBeenCalledOnce()
    expect(result).toBe(mockClient)
  })

  it('A: getSupabaseAdmin returns same instance on subsequent calls', async () => {
    const mockClient = { from: vi.fn() }
    const mockCreateServiceClient = vi.fn().mockReturnValue(mockClient)

    vi.doMock('@/lib/supabase', () => ({
      createServiceClient: mockCreateServiceClient,
    }))
    vi.doMock('@google/generative-ai', () => ({
      GoogleGenerativeAI: vi.fn(),
    }))
    vi.doMock('resend', () => ({
      Resend: vi.fn(),
    }))

    const { getSupabaseAdmin } = await import('@/lib/job-search/clients')
    const first = getSupabaseAdmin()
    const second = getSupabaseAdmin()

    expect(mockCreateServiceClient).toHaveBeenCalledOnce()
    expect(first).toBe(second)
  })

  it('A: getGeminiClient creates GoogleGenerativeAI with GOOGLE_AI_API_KEY', async () => {
    const originalKey = process.env.GOOGLE_AI_API_KEY
    process.env.GOOGLE_AI_API_KEY = 'test-gemini-key-123'

    let capturedKey: string | undefined
    class MockGoogleAI {
      constructor(apiKey: string) {
        capturedKey = apiKey
      }
      getGenerativeModel = vi.fn()
    }

    vi.doMock('@/lib/supabase', () => ({
      createServiceClient: vi.fn(),
    }))
    vi.doMock('@google/generative-ai', () => ({
      GoogleGenerativeAI: MockGoogleAI,
    }))
    vi.doMock('resend', () => ({
      Resend: class {},
    }))

    const { getGeminiClient } = await import('@/lib/job-search/clients')
    const result = getGeminiClient()

    expect(capturedKey).toBe('test-gemini-key-123')
    expect(result).toBeInstanceOf(MockGoogleAI)

    process.env.GOOGLE_AI_API_KEY = originalKey
  })

  it('H: getGeminiClient throws when GOOGLE_AI_API_KEY is not set', async () => {
    const originalKey = process.env.GOOGLE_AI_API_KEY
    delete process.env.GOOGLE_AI_API_KEY

    vi.doMock('@/lib/supabase', () => ({
      createServiceClient: vi.fn(),
    }))
    vi.doMock('@google/generative-ai', () => ({
      GoogleGenerativeAI: vi.fn(),
    }))
    vi.doMock('resend', () => ({
      Resend: vi.fn(),
    }))

    const { getGeminiClient } = await import('@/lib/job-search/clients')
    expect(() => getGeminiClient()).toThrow('GOOGLE_AI_API_KEY is not set')

    process.env.GOOGLE_AI_API_KEY = originalKey
  })

  it('A: getResendClient creates Resend with RESEND_API_KEY', async () => {
    const originalKey = process.env.RESEND_API_KEY
    process.env.RESEND_API_KEY = 're_test_resend_key'

    let capturedKey: string | undefined
    class MockResend {
      constructor(apiKey: string) {
        capturedKey = apiKey
      }
      emails = { send: vi.fn() }
    }

    vi.doMock('@/lib/supabase', () => ({
      createServiceClient: vi.fn(),
    }))
    vi.doMock('@google/generative-ai', () => ({
      GoogleGenerativeAI: class {},
    }))
    vi.doMock('resend', () => ({
      Resend: MockResend,
    }))

    const { getResendClient } = await import('@/lib/job-search/clients')
    const result = getResendClient()

    expect(capturedKey).toBe('re_test_resend_key')
    expect(result).toBeInstanceOf(MockResend)

    process.env.RESEND_API_KEY = originalKey
  })

  it('H: getResendClient throws when RESEND_API_KEY is not set', async () => {
    const originalKey = process.env.RESEND_API_KEY
    delete process.env.RESEND_API_KEY

    vi.doMock('@/lib/supabase', () => ({
      createServiceClient: vi.fn(),
    }))
    vi.doMock('@google/generative-ai', () => ({
      GoogleGenerativeAI: vi.fn(),
    }))
    vi.doMock('resend', () => ({
      Resend: vi.fn(),
    }))

    const { getResendClient } = await import('@/lib/job-search/clients')
    expect(() => getResendClient()).toThrow('RESEND_API_KEY is not set')

    process.env.RESEND_API_KEY = originalKey
  })
})
