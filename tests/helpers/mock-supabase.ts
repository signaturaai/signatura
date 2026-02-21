/**
 * Reusable Supabase Mock Factory
 *
 * Provides consistent mocking utilities for Supabase client in tests.
 */

import { vi } from 'vitest'

// ============================================================================
// Types
// ============================================================================

export interface MockUser {
  id: string
  email: string
  role?: string
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
  created_at?: string
}

export interface MockProfile {
  id: string
  user_type: 'candidate' | 'recruiter'
  is_admin: boolean
  full_name?: string
  email?: string
  avatar_url?: string | null
  created_at?: string
  updated_at?: string
}

// ============================================================================
// Mock User Factories
// ============================================================================

/**
 * Creates a mock user object
 */
export function mockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: 'user-test-123',
    email: 'test@example.com',
    role: 'authenticated',
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Creates a mock profile object
 */
export function mockProfile(overrides: Partial<MockProfile> = {}): MockProfile {
  return {
    id: 'user-test-123',
    user_type: 'candidate',
    is_admin: false,
    full_name: 'Test User',
    email: 'test@example.com',
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Creates a mock admin user
 */
export function mockAdminUser(): MockUser {
  return mockUser({ id: 'admin-user-123', email: 'admin@example.com' })
}

/**
 * Creates a mock admin profile
 */
export function mockAdminProfile(userType: 'candidate' | 'recruiter' = 'candidate'): MockProfile {
  return mockProfile({
    id: 'admin-user-123',
    user_type: userType,
    is_admin: true,
    email: 'admin@example.com',
  })
}

/**
 * Creates a mock candidate user
 */
export function mockCandidateUser(): MockUser {
  return mockUser({ id: 'candidate-user-123', email: 'candidate@example.com' })
}

/**
 * Creates a mock candidate profile
 */
export function mockCandidateProfile(): MockProfile {
  return mockProfile({
    id: 'candidate-user-123',
    user_type: 'candidate',
    is_admin: false,
    email: 'candidate@example.com',
  })
}

/**
 * Creates a mock recruiter user
 */
export function mockRecruiterUser(): MockUser {
  return mockUser({ id: 'recruiter-user-123', email: 'recruiter@example.com' })
}

/**
 * Creates a mock recruiter profile
 */
export function mockRecruiterProfile(): MockProfile {
  return mockProfile({
    id: 'recruiter-user-123',
    user_type: 'recruiter',
    is_admin: false,
    email: 'recruiter@example.com',
  })
}

// ============================================================================
// Mock Supabase Client
// ============================================================================

export interface MockSupabaseResult {
  data: unknown
  error: null | { message: string; code?: string }
}

/**
 * Creates a chainable mock query builder
 */
export function createMockQueryBuilder(result: MockSupabaseResult) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
    then: (resolve: (value: MockSupabaseResult) => void) => {
      resolve(result)
      return Promise.resolve(result)
    },
  }
  return builder
}

/**
 * Creates a mock Supabase client with configurable responses
 */
export function mockSupabaseClient(config: {
  user?: MockUser | null
  profile?: MockProfile | null
  queryResult?: MockSupabaseResult
} = {}) {
  const { user = mockUser(), profile = mockProfile(), queryResult } = config

  const defaultQueryResult: MockSupabaseResult = queryResult || {
    data: profile,
    error: null,
  }

  const queryBuilder = createMockQueryBuilder(defaultQueryResult)

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: user ? { user, access_token: 'mock-token' } : null },
        error: null,
      }),
      signIn: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn().mockReturnValue(queryBuilder),
    rpc: vi.fn().mockResolvedValue(defaultQueryResult),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
        remove: vi.fn().mockResolvedValue({ data: [], error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/file' } }),
      }),
    },
  }
}

/**
 * Creates a mock for unauthenticated state
 */
export function mockUnauthenticated() {
  return mockSupabaseClient({ user: null, profile: null })
}

/**
 * Creates an error result
 */
export function mockErrorResult(message: string, code?: string): MockSupabaseResult {
  return {
    data: null,
    error: { message, code },
  }
}
