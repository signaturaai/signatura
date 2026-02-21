/**
 * Supabase Middleware & Routing Tests — RALPH Loop 12
 *
 * Tests for the middleware that enforces auth, onboarding gates, and route redirects.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextResponse, type NextRequest } from 'next/server'

// ============================================================================
// Mock Setup
// ============================================================================

// Track onboarding check calls
let onboardingCheckCalls: string[] = []

// Mock state
let mockUser: { id: string } | null = null
let mockProfilesData: { onboarding_completed: boolean | null; user_type: string | null } | null = null
let mockUserProfilesData: { onboarding_completed: boolean | null; user_type: string | null } | null = null

// Mock Supabase client
const mockSupabaseFrom = vi.fn()
const mockSupabaseAuth = {
  getUser: vi.fn(),
}

// Create mock query builder for each table
function createMockQueryBuilder(tableName: string) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(async () => {
      onboardingCheckCalls.push(tableName)
      if (tableName === 'profiles') {
        return { data: mockProfilesData, error: mockProfilesData ? null : { code: 'PGRST116' } }
      }
      if (tableName === 'user_profiles') {
        return { data: mockUserProfilesData, error: mockUserProfilesData ? null : { code: 'PGRST116' } }
      }
      return { data: null, error: null }
    }),
  }
}

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: mockSupabaseAuth,
    from: (tableName: string) => {
      mockSupabaseFrom(tableName)
      return createMockQueryBuilder(tableName)
    },
  })),
}))

// Import after mocking
import { updateSession } from '@/lib/supabase/middleware'

// ============================================================================
// Helper Functions
// ============================================================================

function createMockRequest(pathname: string, searchParams?: Record<string, string>): NextRequest {
  const baseUrl = 'http://localhost:3000'
  const url = new URL(`${baseUrl}${pathname}`)
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }

  // Create a proper NextURL-like object that can be cloned
  const nextUrl = {
    pathname: url.pathname,
    searchParams: url.searchParams,
    href: url.href,
    origin: url.origin,
    clone: () => {
      // Return a real URL object that NextResponse.redirect can use
      return new URL(url.href)
    },
  }

  return {
    nextUrl,
    cookies: {
      getAll: () => [],
      set: vi.fn(),
    },
  } as unknown as NextRequest
}

function setUnauthenticated() {
  mockUser = null
  mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: null }, error: null })
}

function setAuthenticatedUser(userId: string = 'user-123') {
  mockUser = { id: userId }
  mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
}

function setOnboardingStatus(
  profiles: { completed: boolean | null; userType: string | null } | null,
  userProfiles: { completed: boolean | null; userType: string | null } | null = null
) {
  mockProfilesData = profiles ? { onboarding_completed: profiles.completed, user_type: profiles.userType } : null
  mockUserProfilesData = userProfiles ? { onboarding_completed: userProfiles.completed, user_type: userProfiles.userType } : null
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Supabase Middleware & Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    onboardingCheckCalls = []
    mockUser = null
    mockProfilesData = null
    mockUserProfilesData = null
  })

  afterEach(() => {
    vi.resetModules()
  })

  // ==========================================================================
  // 12.1 — Unauthenticated user redirects
  // ==========================================================================

  describe('Unauthenticated user redirects', () => {
    beforeEach(() => {
      setUnauthenticated()
    })

    it('1. Unauthenticated on /companion → redirect /signup?redirect=/companion', async () => {
      const request = createMockRequest('/companion')
      const response = await updateSession(request)

      expect(response.status).toBe(307) // NextResponse.redirect uses 307 by default
      const location = response.headers.get('location')
      expect(location).toContain('/signup')
      expect(location).toContain('redirect=%2Fcompanion')
    })

    it('2. Unauthenticated on /dashboard → redirect /signup?redirect=/dashboard', async () => {
      const request = createMockRequest('/dashboard')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/signup')
      expect(location).toContain('redirect=%2Fdashboard')
    })

    it('3. Unauthenticated on /applications → redirect /signup', async () => {
      const request = createMockRequest('/applications')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/signup')
    })

    it('4. Unauthenticated on /cv → redirect /signup', async () => {
      const request = createMockRequest('/cv')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/signup')
    })

    it('5. Unauthenticated on /interview → redirect /signup', async () => {
      const request = createMockRequest('/interview')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/signup')
    })

    it('6. Unauthenticated on /compensation → redirect /signup', async () => {
      const request = createMockRequest('/compensation')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/signup')
    })

    it('7. Unauthenticated on /contract → redirect /signup', async () => {
      const request = createMockRequest('/contract')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/signup')
    })

    it('8. Unauthenticated on /settings → redirect /signup', async () => {
      const request = createMockRequest('/settings')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/signup')
    })

    it('9. Unauthenticated on /jobs → redirect /signup', async () => {
      const request = createMockRequest('/jobs')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/signup')
    })

    it('10. Unauthenticated on /onboarding → redirect /signup?redirect=/onboarding', async () => {
      const request = createMockRequest('/onboarding')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/signup')
      expect(location).toContain('redirect=%2Fonboarding')
    })

    it('11. Unauthenticated on / → passes through (public)', async () => {
      const request = createMockRequest('/')
      const response = await updateSession(request)

      // NextResponse.next() returns 200 status
      expect(response.status).toBe(200)
      expect(response.headers.get('location')).toBeNull()
    })

    it('12. Unauthenticated on /login → passes through', async () => {
      const request = createMockRequest('/login')
      const response = await updateSession(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('location')).toBeNull()
    })

    it('13. Unauthenticated on /signup → passes through', async () => {
      const request = createMockRequest('/signup')
      const response = await updateSession(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('location')).toBeNull()
    })

    it('14. Unauthenticated on /api/* → passes through', async () => {
      const request = createMockRequest('/api/health')
      const response = await updateSession(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('location')).toBeNull()
    })
  })

  // ==========================================================================
  // 12.2 — Authenticated user on auth pages
  // ==========================================================================

  describe('Authenticated user on auth pages', () => {
    beforeEach(() => {
      setAuthenticatedUser()
    })

    it('15. Authenticated on /login → redirect /dashboard', async () => {
      const request = createMockRequest('/login')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/dashboard')
    })

    it('16. Authenticated on /signup → redirect /dashboard', async () => {
      const request = createMockRequest('/signup')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/dashboard')
    })

    it('17. Authenticated on /login?redirect=/cv → redirect /cv', async () => {
      const request = createMockRequest('/login', { redirect: '/cv' })
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/cv')
    })
  })

  // ==========================================================================
  // 12.3 — Onboarding gate
  // ==========================================================================

  describe('Onboarding gate', () => {
    it('18. Authenticated, NOT onboarded, on /dashboard → redirect /onboarding', async () => {
      setAuthenticatedUser()
      setOnboardingStatus({ completed: false, userType: 'candidate' })

      const request = createMockRequest('/dashboard')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/onboarding')
    })

    it('19. Authenticated, NOT onboarded, on /companion → redirect /onboarding', async () => {
      setAuthenticatedUser()
      setOnboardingStatus({ completed: false, userType: 'candidate' })

      const request = createMockRequest('/companion')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/onboarding')
    })

    it('20. Authenticated, onboarded, on /dashboard → passes through', async () => {
      setAuthenticatedUser()
      setOnboardingStatus({ completed: true, userType: 'candidate' })

      const request = createMockRequest('/dashboard')
      const response = await updateSession(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('location')).toBeNull()
    })

    it('21. Authenticated, onboarded, on /onboarding → redirect /dashboard (candidate)', async () => {
      setAuthenticatedUser()
      setOnboardingStatus({ completed: true, userType: 'candidate' })

      const request = createMockRequest('/onboarding')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/dashboard')
    })

    it('22. Authenticated, onboarded recruiter, on /onboarding → redirect /jobs', async () => {
      setAuthenticatedUser()
      setOnboardingStatus({ completed: true, userType: 'recruiter' })

      const request = createMockRequest('/onboarding')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/jobs')
    })

    it('23. Onboarding checks profiles table first, then user_profiles as fallback', async () => {
      setAuthenticatedUser()
      // Set profiles to NOT completed, user_profiles to completed
      setOnboardingStatus(
        { completed: false, userType: 'candidate' },
        { completed: true, userType: 'candidate' }
      )

      const request = createMockRequest('/dashboard')
      await updateSession(request)

      // Should check profiles first, then user_profiles
      expect(onboardingCheckCalls).toContain('profiles')
      expect(onboardingCheckCalls).toContain('user_profiles')
      // Profiles should be checked first
      expect(onboardingCheckCalls.indexOf('profiles')).toBeLessThan(
        onboardingCheckCalls.indexOf('user_profiles')
      )
    })

    it('24. Profile missing entirely (no row) → NOT completed → redirect /onboarding', async () => {
      setAuthenticatedUser()
      // Both tables return null (no profile row exists)
      setOnboardingStatus(null, null)

      const request = createMockRequest('/dashboard')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/onboarding')
    })
  })
})
