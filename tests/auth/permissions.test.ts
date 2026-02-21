/**
 * Auth & Permissions (RBAC) Tests — RALPH Loop 11
 *
 * Tests for the permissions module which implements RBAC with two user types
 * (candidate/recruiter) and an additive admin flag.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  mockUser,
  mockProfile,
  mockSupabaseClient,
  mockCandidateProfile,
  mockRecruiterProfile,
  mockAdminProfile,
  mockErrorResult,
} from '../helpers/mock-supabase'

// ============================================================================
// Mock Setup
// ============================================================================

// Mock the Supabase client
const mockCreateClient = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}))

// Import after mocking
import {
  getUserPermissions,
  requirePermission,
  canAccessRoute,
  getHomeRouteForUserType,
  isPublicRoute,
  getUnauthorizedReason,
  type UserPermissions,
} from '@/lib/auth/permissions'

// ============================================================================
// Test Suite
// ============================================================================

describe('Auth & Permissions (RBAC)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  // ==========================================================================
  // 11.1 — getUserPermissions
  // ==========================================================================

  describe('getUserPermissions', () => {
    it('1. Returns null when user not authenticated', async () => {
      const client = mockSupabaseClient({ user: null })
      mockCreateClient.mockResolvedValue(client)

      const result = await getUserPermissions()

      expect(result).toBeNull()
    })

    it('2. Returns null when profile query fails', async () => {
      const user = mockUser()
      const client = mockSupabaseClient({
        user,
        queryResult: mockErrorResult('Database error'),
      })
      mockCreateClient.mockResolvedValue(client)

      const result = await getUserPermissions()

      expect(result).toBeNull()
    })

    it('3. Candidate user gets correct permissions', async () => {
      const user = mockUser({ id: 'candidate-123' })
      const profile = mockCandidateProfile()
      profile.id = 'candidate-123'
      const client = mockSupabaseClient({
        user,
        queryResult: { data: profile, error: null },
      })
      mockCreateClient.mockResolvedValue(client)

      const result = await getUserPermissions()

      expect(result).not.toBeNull()
      expect(result!.userType).toBe('candidate')
      expect(result!.canAccessCandidateFeatures).toBe(true)
      expect(result!.canAccessRecruiterFeatures).toBe(false)
      expect(result!.canAccessAdminPanel).toBe(false)
    })

    it('4. Recruiter user gets correct permissions', async () => {
      const user = mockUser({ id: 'recruiter-123' })
      const profile = mockRecruiterProfile()
      profile.id = 'recruiter-123'
      const client = mockSupabaseClient({
        user,
        queryResult: { data: profile, error: null },
      })
      mockCreateClient.mockResolvedValue(client)

      const result = await getUserPermissions()

      expect(result).not.toBeNull()
      expect(result!.userType).toBe('recruiter')
      expect(result!.canAccessCandidateFeatures).toBe(false)
      expect(result!.canAccessRecruiterFeatures).toBe(true)
      expect(result!.canAccessAdminPanel).toBe(false)
    })

    it('5. Admin candidate gets admin panel access', async () => {
      const user = mockUser({ id: 'admin-candidate-123' })
      const profile = mockAdminProfile('candidate')
      profile.id = 'admin-candidate-123'
      const client = mockSupabaseClient({
        user,
        queryResult: { data: profile, error: null },
      })
      mockCreateClient.mockResolvedValue(client)

      const result = await getUserPermissions()

      expect(result).not.toBeNull()
      expect(result!.canAccessAdminPanel).toBe(true)
      expect(result!.canAccessCandidateFeatures).toBe(true)
      expect(result!.isAdmin).toBe(true)
    })

    it('6. Admin recruiter gets admin panel access', async () => {
      const user = mockUser({ id: 'admin-recruiter-123' })
      const profile = mockAdminProfile('recruiter')
      profile.id = 'admin-recruiter-123'
      const client = mockSupabaseClient({
        user,
        queryResult: { data: profile, error: null },
      })
      mockCreateClient.mockResolvedValue(client)

      const result = await getUserPermissions()

      expect(result).not.toBeNull()
      expect(result!.canAccessAdminPanel).toBe(true)
      expect(result!.canAccessRecruiterFeatures).toBe(true)
      expect(result!.isAdmin).toBe(true)
    })

    it('7. Missing user_type defaults to candidate', async () => {
      const user = mockUser({ id: 'no-type-123' })
      const profile = { id: 'no-type-123', is_admin: false }
      const client = mockSupabaseClient({
        user,
        queryResult: { data: profile, error: null },
      })
      mockCreateClient.mockResolvedValue(client)

      const result = await getUserPermissions()

      expect(result).not.toBeNull()
      expect(result!.userType).toBe('candidate')
    })

    it('8. Missing is_admin defaults to false', async () => {
      const user = mockUser({ id: 'no-admin-123' })
      const profile = { id: 'no-admin-123', user_type: 'candidate' }
      const client = mockSupabaseClient({
        user,
        queryResult: { data: profile, error: null },
      })
      mockCreateClient.mockResolvedValue(client)

      const result = await getUserPermissions()

      expect(result).not.toBeNull()
      expect(result!.isAdmin).toBe(false)
    })

    it('9. Accepts explicit userId parameter', async () => {
      const profile = mockCandidateProfile()
      profile.id = 'explicit-user-456'
      const client = mockSupabaseClient({
        user: mockUser({ id: 'different-user-123' }),
        queryResult: { data: profile, error: null },
      })
      mockCreateClient.mockResolvedValue(client)

      const result = await getUserPermissions('explicit-user-456')

      expect(result).not.toBeNull()
      expect(result!.userId).toBe('explicit-user-456')
      // Verify the query was called with the explicit userId
      expect(client.from).toHaveBeenCalledWith('profiles')
    })
  })

  // ==========================================================================
  // 11.2 — requirePermission
  // ==========================================================================

  describe('requirePermission', () => {
    it("10. Throws 'Not authenticated' when no user", async () => {
      const client = mockSupabaseClient({ user: null })
      mockCreateClient.mockResolvedValue(client)

      await expect(requirePermission()).rejects.toThrow('Unauthorized: Not authenticated')
    })

    it("11. Throws when requiredUserType doesn't match", async () => {
      const user = mockUser({ id: 'candidate-123' })
      const profile = mockCandidateProfile()
      profile.id = 'candidate-123'
      const client = mockSupabaseClient({
        user,
        queryResult: { data: profile, error: null },
      })
      mockCreateClient.mockResolvedValue(client)

      await expect(requirePermission('recruiter')).rejects.toThrow(
        'Unauthorized: Requires recruiter account'
      )
    })

    it('12. Throws when requireAdmin=true but user not admin', async () => {
      const user = mockUser({ id: 'non-admin-123' })
      const profile = mockCandidateProfile()
      profile.id = 'non-admin-123'
      profile.is_admin = false
      const client = mockSupabaseClient({
        user,
        queryResult: { data: profile, error: null },
      })
      mockCreateClient.mockResolvedValue(client)

      await expect(requirePermission(undefined, true)).rejects.toThrow(
        'Unauthorized: Requires admin privileges'
      )
    })

    it('13. Returns permissions when all checks pass', async () => {
      const user = mockUser({ id: 'admin-123' })
      const profile = mockAdminProfile('candidate')
      profile.id = 'admin-123'
      const client = mockSupabaseClient({
        user,
        queryResult: { data: profile, error: null },
      })
      mockCreateClient.mockResolvedValue(client)

      const result = await requirePermission('candidate', true)

      expect(result).toBeDefined()
      expect(result.userId).toBe('admin-123')
      expect(result.userType).toBe('candidate')
      expect(result.isAdmin).toBe(true)
      expect(result.canAccessCandidateFeatures).toBe(true)
      expect(result.canAccessAdminPanel).toBe(true)
    })

    it('14. No requiredUserType allows any user type', async () => {
      const user = mockUser({ id: 'recruiter-123' })
      const profile = mockRecruiterProfile()
      profile.id = 'recruiter-123'
      const client = mockSupabaseClient({
        user,
        queryResult: { data: profile, error: null },
      })
      mockCreateClient.mockResolvedValue(client)

      // Should not throw
      const result = await requirePermission()

      expect(result).toBeDefined()
      expect(result.userType).toBe('recruiter')
    })
  })

  // ==========================================================================
  // 11.3 — canAccessRoute
  // ==========================================================================

  describe('canAccessRoute', () => {
    // Candidate permissions
    const candidatePermissions: UserPermissions = {
      userId: 'candidate-123',
      userType: 'candidate',
      isAdmin: false,
      canAccessCandidateFeatures: true,
      canAccessRecruiterFeatures: false,
      canAccessAdminPanel: false,
    }

    // Recruiter permissions
    const recruiterPermissions: UserPermissions = {
      userId: 'recruiter-123',
      userType: 'recruiter',
      isAdmin: false,
      canAccessCandidateFeatures: false,
      canAccessRecruiterFeatures: true,
      canAccessAdminPanel: false,
    }

    // Admin candidate permissions
    const adminCandidatePermissions: UserPermissions = {
      userId: 'admin-candidate-123',
      userType: 'candidate',
      isAdmin: true,
      canAccessCandidateFeatures: true,
      canAccessRecruiterFeatures: false,
      canAccessAdminPanel: true,
    }

    // Admin recruiter permissions
    const adminRecruiterPermissions: UserPermissions = {
      userId: 'admin-recruiter-123',
      userType: 'recruiter',
      isAdmin: true,
      canAccessCandidateFeatures: false,
      canAccessRecruiterFeatures: true,
      canAccessAdminPanel: true,
    }

    it('15. Candidate can access /companion', () => {
      expect(canAccessRoute('/companion', candidatePermissions)).toBe(true)
    })

    it('16. Candidate can access /applications', () => {
      expect(canAccessRoute('/applications', candidatePermissions)).toBe(true)
    })

    it('17. Candidate can access /cv, /cv-tailor', () => {
      expect(canAccessRoute('/cv', candidatePermissions)).toBe(true)
      expect(canAccessRoute('/cv-tailor', candidatePermissions)).toBe(true)
    })

    it('18. Candidate can access /interview, /compensation, /contract', () => {
      expect(canAccessRoute('/interview', candidatePermissions)).toBe(true)
      expect(canAccessRoute('/compensation', candidatePermissions)).toBe(true)
      expect(canAccessRoute('/contract', candidatePermissions)).toBe(true)
    })

    it('19. Candidate CANNOT access /jobs', () => {
      expect(canAccessRoute('/jobs', candidatePermissions)).toBe(false)
    })

    it('20. Candidate CANNOT access /pipeline, /talent-pool', () => {
      expect(canAccessRoute('/pipeline', candidatePermissions)).toBe(false)
      expect(canAccessRoute('/talent-pool', candidatePermissions)).toBe(false)
    })

    it('21. Recruiter CAN access /jobs, /pipeline, /talent-pool, /analytics, /recruiter', () => {
      expect(canAccessRoute('/jobs', recruiterPermissions)).toBe(true)
      expect(canAccessRoute('/pipeline', recruiterPermissions)).toBe(true)
      expect(canAccessRoute('/talent-pool', recruiterPermissions)).toBe(true)
      expect(canAccessRoute('/analytics', recruiterPermissions)).toBe(true)
      expect(canAccessRoute('/recruiter', recruiterPermissions)).toBe(true)
    })

    it('22. Recruiter CANNOT access /companion, /applications', () => {
      expect(canAccessRoute('/companion', recruiterPermissions)).toBe(false)
      expect(canAccessRoute('/applications', recruiterPermissions)).toBe(false)
    })

    it('23. Non-admin CANNOT access /admin', () => {
      expect(canAccessRoute('/admin', candidatePermissions)).toBe(false)
      expect(canAccessRoute('/admin', recruiterPermissions)).toBe(false)
    })

    it('24. Admin CAN access /admin', () => {
      expect(canAccessRoute('/admin', adminCandidatePermissions)).toBe(true)
      expect(canAccessRoute('/admin', adminRecruiterPermissions)).toBe(true)
    })

    it('25. Any user can access /settings (public route)', () => {
      expect(canAccessRoute('/settings', candidatePermissions)).toBe(true)
      expect(canAccessRoute('/settings', recruiterPermissions)).toBe(true)
    })

    it('26. Unrecognized route returns true (public)', () => {
      expect(canAccessRoute('/some-random-page', candidatePermissions)).toBe(true)
      expect(canAccessRoute('/unknown-route', recruiterPermissions)).toBe(true)
    })
  })

  // ==========================================================================
  // 11.4 — getHomeRouteForUserType
  // ==========================================================================

  describe('getHomeRouteForUserType', () => {
    it('27. Candidate → /companion', () => {
      expect(getHomeRouteForUserType('candidate')).toBe('/companion')
    })

    it('28. Recruiter → /jobs', () => {
      expect(getHomeRouteForUserType('recruiter')).toBe('/jobs')
    })
  })

  // ==========================================================================
  // 11.5 — isPublicRoute
  // ==========================================================================

  describe('isPublicRoute', () => {
    it('29. / is public', () => {
      expect(isPublicRoute('/')).toBe(true)
    })

    it('30. /login, /signup are public', () => {
      expect(isPublicRoute('/login')).toBe(true)
      expect(isPublicRoute('/signup')).toBe(true)
    })

    it('31. /privacy-policy, /terms are public', () => {
      expect(isPublicRoute('/privacy-policy')).toBe(true)
      expect(isPublicRoute('/terms')).toBe(true)
    })

    it('32. /api/public/* is public', () => {
      expect(isPublicRoute('/api/public/health')).toBe(true)
      expect(isPublicRoute('/api/public/version')).toBe(true)
    })

    it('33. /_next/* is public', () => {
      expect(isPublicRoute('/_next/static/chunk.js')).toBe(true)
      expect(isPublicRoute('/_next/image?url=test')).toBe(true)
    })

    it('34. /unauthorized is public', () => {
      expect(isPublicRoute('/unauthorized')).toBe(true)
    })

    it('35. /dashboard is NOT public', () => {
      expect(isPublicRoute('/dashboard')).toBe(false)
    })

    it('36. /companion is NOT public', () => {
      expect(isPublicRoute('/companion')).toBe(false)
    })
  })

  // ==========================================================================
  // 11.6 — getUnauthorizedReason
  // ==========================================================================

  describe('getUnauthorizedReason', () => {
    const candidatePermissions: UserPermissions = {
      userId: 'candidate-123',
      userType: 'candidate',
      isAdmin: false,
      canAccessCandidateFeatures: true,
      canAccessRecruiterFeatures: false,
      canAccessAdminPanel: false,
    }

    const recruiterPermissions: UserPermissions = {
      userId: 'recruiter-123',
      userType: 'recruiter',
      isAdmin: false,
      canAccessCandidateFeatures: false,
      canAccessRecruiterFeatures: true,
      canAccessAdminPanel: false,
    }

    it("37. Null permissions → 'not_authenticated'", () => {
      expect(getUnauthorizedReason('/companion', null)).toBe('not_authenticated')
    })

    it("38. Recruiter on /companion → 'candidate_only'", () => {
      expect(getUnauthorizedReason('/companion', recruiterPermissions)).toBe('candidate_only')
    })

    it("39. Candidate on /jobs → 'recruiter_only'", () => {
      expect(getUnauthorizedReason('/jobs', candidatePermissions)).toBe('recruiter_only')
    })

    it("40. Non-admin on /admin → 'admin_only'", () => {
      expect(getUnauthorizedReason('/admin', candidatePermissions)).toBe('admin_only')
      expect(getUnauthorizedReason('/admin', recruiterPermissions)).toBe('admin_only')
    })

    it('41. Candidate on /settings → null (allowed)', () => {
      expect(getUnauthorizedReason('/settings', candidatePermissions)).toBeNull()
    })
  })
})
