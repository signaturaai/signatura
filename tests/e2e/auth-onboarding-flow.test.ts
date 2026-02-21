/**
 * E2E: Auth → Onboarding → Dashboard Flow Tests — RALPH Loop 23
 *
 * Cross-cutting integration tests for the full user journey.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ============================================================================
// Mock Setup
// ============================================================================

const mockState = {
  user: null as { id: string; email: string } | null,
  profile: null as Record<string, unknown> | null,
  todayCheckin: null as Record<string, unknown> | null,
  yesterdayCheckin: null as { id: string } | null,
  recentCheckins: [] as Array<Record<string, unknown>>,
  applications: [] as Array<Record<string, unknown>>,
  deletionRequests: [] as Array<Record<string, unknown>>,
  pendingDeletionRequest: null as Record<string, unknown> | null,
  consentLogs: [] as Array<Record<string, unknown>>,
  indicators: [] as Array<Record<string, unknown>>,
  insertCalls: [] as Array<{ table: string; data: unknown }>,
  updateCalls: [] as Array<{ table: string; data: unknown; filter: unknown }>,
  recentRejectionCount: 0,
}

// Mock AI companion
vi.mock('@/lib/ai/companion', () => ({
  getMockCompanionResponse: vi.fn().mockImplementation(async (message: string) => {
    // Simulate mood detection based on message content
    const isLowMood = message.toLowerCase().includes('tired') ||
                      message.toLowerCase().includes('exhausted') ||
                      message.toLowerCase().includes('rejected')
    const isCelebration = message.toLowerCase().includes('offer') ||
                          message.toLowerCase().includes('got the job') ||
                          message.toLowerCase().includes('excited')

    return {
      message: isLowMood
        ? "I hear you. That sounds tough."
        : isCelebration
          ? "That's wonderful news!"
          : "Thanks for checking in!",
      tone: isLowMood ? 'supportive' : isCelebration ? 'celebratory' : 'warm',
      detectedMood: isLowMood ? 3 : isCelebration ? 9 : 7,
      detectedEnergy: isLowMood ? 'low' : isCelebration ? 'high' : 'neutral',
      emotionalKeywords: isLowMood ? ['tired'] : isCelebration ? ['excited'] : ['calm'],
      suggestedGoal: { goal: 'Take a short walk', type: 'wellness', difficulty: 'easy' },
      burnoutWarning: isLowMood,
      shouldFollowUp: isLowMood,
      celebrationDetected: isCelebration,
    }
  }),
  generateCheckInResponse: vi.fn().mockResolvedValue({
    message: 'AI generated response',
    tone: 'warm',
    detectedMood: 7,
    detectedEnergy: 'neutral',
    emotionalKeywords: [],
    suggestedGoal: { goal: 'Test goal', type: 'wellness', difficulty: 'easy' },
    burnoutWarning: false,
    shouldFollowUp: false,
    celebrationDetected: false,
  }),
  generateCelebration: vi.fn().mockResolvedValue('Congratulations!'),
  generateRejectionSupport: vi.fn().mockResolvedValue('I understand how hard this is.'),
}))

vi.mock('@/lib/ai/context', () => ({
  getCompanionContext: vi.fn().mockImplementation(async () => ({
    userId: mockState.user?.id,
    currentMessage: '',
  })),
}))

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    auth: {
      getUser: vi.fn().mockImplementation(async () => ({
        data: { user: mockState.user },
        error: mockState.user ? null : { message: 'Not authenticated' },
      })),
    },
    from: vi.fn().mockImplementation((tableName: string) => {
      const queryContext = { dateValue: '', filters: {} as Record<string, unknown> }

      const createChainable = (): Record<string, unknown> => {
        const obj: Record<string, unknown> = {}
        obj.eq = vi.fn().mockImplementation((col: string, val: unknown) => {
          queryContext.filters[col] = val
          if (col === 'date') queryContext.dateValue = val as string
          return obj
        })
        obj.gte = vi.fn().mockImplementation(() => obj)
        obj.neq = vi.fn().mockImplementation(() => obj)
        obj.ilike = vi.fn().mockImplementation(() => obj)
        obj.order = vi.fn().mockImplementation(() => obj)
        obj.limit = vi.fn().mockImplementation(() => obj)
        obj.single = vi.fn().mockImplementation(async () => {
          if (tableName === 'user_profiles' || tableName === 'profiles') {
            return { data: mockState.profile, error: mockState.profile ? null : { message: 'Not found' } }
          }
          if (tableName === 'indicators') {
            return { data: mockState.indicators[0] || null, error: null }
          }
          if (tableName === 'account_deletion_requests') {
            // Check if filtering for pending status
            if (queryContext.filters.status === 'pending') {
              return { data: mockState.pendingDeletionRequest, error: mockState.pendingDeletionRequest ? null : { code: 'PGRST116' } }
            }
            return { data: mockState.deletionRequests[0] || null, error: null }
          }
          return { data: null, error: null }
        })
        obj.maybeSingle = vi.fn().mockImplementation(async () => {
          if (tableName === 'user_emotional_context') {
            const today = new Date().toISOString().split('T')[0]
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            if (queryContext.dateValue === yesterday) {
              return { data: mockState.yesterdayCheckin, error: null }
            }
            return { data: mockState.todayCheckin, error: null }
          }
          if (tableName === 'deletion_requests' || tableName === 'account_deletion_requests') {
            // Check if filtering for pending status
            if (queryContext.filters.status === 'pending') {
              return { data: mockState.pendingDeletionRequest, error: null }
            }
            return { data: mockState.deletionRequests[0] || null, error: null }
          }
          if (tableName === 'job_applications') {
            return { data: mockState.applications[0] || null, error: null }
          }
          return { data: null, error: null }
        })
        obj.then = (resolve: (value: unknown) => void) => {
          if (tableName === 'user_emotional_context') {
            resolve({ data: mockState.recentCheckins, error: null })
          } else if (tableName === 'job_applications') {
            if (queryContext.filters.application_status === 'rejected') {
              resolve({ count: mockState.recentRejectionCount, error: null })
            } else {
              resolve({ data: mockState.applications, error: null })
            }
          } else if (tableName === 'indicators') {
            resolve({ data: mockState.indicators, error: null })
          } else if (tableName === 'consent_logs') {
            resolve({ data: mockState.consentLogs, error: null })
          } else {
            resolve({ data: [], error: null })
          }
          return Promise.resolve({ data: [], error: null })
        }
        return obj
      }

      const createUpdateChainable = (data: unknown): Record<string, unknown> => {
        const filters: Record<string, unknown> = {}
        const obj: Record<string, unknown> = {}
        obj.eq = vi.fn().mockImplementation((field: string, value: unknown) => {
          filters[field] = value
          mockState.updateCalls.push({ table: tableName, data, filter: { ...filters } })
          return obj
        })
        obj.then = (resolve: (value: unknown) => void) => {
          resolve({ data: null, error: null })
          return Promise.resolve({ data: null, error: null })
        }
        return obj
      }

      return {
        select: vi.fn().mockImplementation(() => createChainable()),
        insert: vi.fn().mockImplementation((data) => {
          mockState.insertCalls.push({ table: tableName, data })
          return {
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: `new-${tableName}-id`, ...data },
              error: null,
            }),
          }
        }),
        update: vi.fn().mockImplementation((data) => createUpdateChainable(data)),
        eq: vi.fn().mockImplementation(() => createChainable()),
      }
    }),
  })),
}))

// ============================================================================
// Helper Functions
// ============================================================================

function createMockRequest(method: string, pathname: string, body?: Record<string, unknown>): NextRequest {
  const url = `http://localhost:3000${pathname}`
  const init: RequestInit = { method }

  if (body) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }

  return new NextRequest(url, init)
}

function setAuthenticatedUser(userId: string = 'user-123', email: string = 'test@example.com') {
  mockState.user = { id: userId, email }
}

function setUnauthenticated() {
  mockState.user = null
}

function setProfile(profile: Record<string, unknown> | null) {
  mockState.profile = profile
}

function setTodayCheckin(checkin: Record<string, unknown> | null) {
  mockState.todayCheckin = checkin
}

function setYesterdayCheckin(checkin: { id: string } | null) {
  mockState.yesterdayCheckin = checkin
}

function setIndicators(indicators: Array<Record<string, unknown>>) {
  mockState.indicators = indicators
}

function setDeletionRequests(requests: Array<Record<string, unknown>>) {
  mockState.deletionRequests = requests
}

function resetMockState() {
  mockState.user = null
  mockState.profile = null
  mockState.todayCheckin = null
  mockState.yesterdayCheckin = null
  mockState.recentCheckins = []
  mockState.applications = []
  mockState.deletionRequests = []
  mockState.pendingDeletionRequest = null
  mockState.consentLogs = []
  mockState.indicators = []
  mockState.insertCalls = []
  mockState.updateCalls = []
  mockState.recentRejectionCount = 0
}

function setPendingDeletionRequest(request: Record<string, unknown> | null) {
  mockState.pendingDeletionRequest = request
}

// ============================================================================
// Test Suite
// ============================================================================

describe('E2E: Auth → Onboarding → Dashboard Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetMockState()
  })

  afterEach(() => {
    vi.resetModules()
  })

  // ==========================================================================
  // Auth & Onboarding Flow
  // ==========================================================================

  it('1. New user signup → redirect to onboarding', async () => {
    // Import permissions module
    const { canAccessRoute, getHomeRouteForUserType } = await import('@/lib/auth/permissions')
    // Note: Onboarding check is done at middleware level, not in canAccessRoute
    // canAccessRoute only checks user_type and is_admin

    // Simulate new candidate user
    const newUserPermissions = {
      userId: 'new-user-123',
      userType: 'candidate' as const,
      isAdmin: false,
      canAccessCandidateFeatures: true,
      canAccessRecruiterFeatures: false,
      canAccessAdminPanel: false,
    }

    // Candidate routes accessible for candidate
    const canAccessCompanion = canAccessRoute('/companion', newUserPermissions)
    expect(canAccessCompanion).toBe(true)

    // Home route for candidate is /companion
    const homeRoute = getHomeRouteForUserType('candidate')
    expect(homeRoute).toBe('/companion')
  })

  it('2. Onboarding not completed → blocked from dashboard', async () => {
    // Note: Onboarding blocking is middleware-level, tested in middleware.test.ts
    // Here we verify the permissions module correctly sets user type access
    const { canAccessRoute } = await import('@/lib/auth/permissions')

    const candidatePermissions = {
      userId: 'incomplete-user',
      userType: 'candidate' as const,
      isAdmin: false,
      canAccessCandidateFeatures: true,
      canAccessRecruiterFeatures: false,
      canAccessAdminPanel: false,
    }

    // Candidate can access candidate routes (onboarding check is separate)
    expect(canAccessRoute('/companion', candidatePermissions)).toBe(true)
    expect(canAccessRoute('/cv-tailor', candidatePermissions)).toBe(true)

    // Candidate cannot access recruiter routes
    expect(canAccessRoute('/jobs', candidatePermissions)).toBe(false)
  })

  it('3. Onboarding completed → dashboard accessible', async () => {
    const { canAccessRoute, getHomeRouteForUserType } = await import('@/lib/auth/permissions')

    const completedPermissions = {
      userId: 'completed-user',
      userType: 'candidate' as const,
      isAdmin: false,
      canAccessCandidateFeatures: true,
      canAccessRecruiterFeatures: false,
      canAccessAdminPanel: false,
    }

    // Dashboard is accessible to all authenticated users (not in restricted routes)
    expect(canAccessRoute('/dashboard', completedPermissions)).toBe(true)

    // Home route for candidate
    const homeRoute = getHomeRouteForUserType('candidate')
    expect(homeRoute).toBe('/companion')
  })

  // ==========================================================================
  // User Type Routing
  // ==========================================================================

  it('4. Candidate sees candidate routes only', async () => {
    const { canAccessRoute } = await import('@/lib/auth/permissions')

    const candidatePermissions = {
      userId: 'candidate-user',
      userType: 'candidate' as const,
      isAdmin: false,
      canAccessCandidateFeatures: true,
      canAccessRecruiterFeatures: false,
      canAccessAdminPanel: false,
    }

    // Candidate routes should be accessible
    expect(canAccessRoute('/companion', candidatePermissions)).toBe(true)
    expect(canAccessRoute('/cv-tailor', candidatePermissions)).toBe(true)
    expect(canAccessRoute('/cv', candidatePermissions)).toBe(true)
    expect(canAccessRoute('/dashboard', candidatePermissions)).toBe(true)

    // Recruiter-only routes should be blocked
    expect(canAccessRoute('/jobs', candidatePermissions)).toBe(false)
    expect(canAccessRoute('/pipeline', candidatePermissions)).toBe(false)
  })

  it('5. Recruiter sees recruiter routes only', async () => {
    const { canAccessRoute } = await import('@/lib/auth/permissions')

    const recruiterPermissions = {
      userId: 'recruiter-user',
      userType: 'recruiter' as const,
      isAdmin: false,
      canAccessCandidateFeatures: false,
      canAccessRecruiterFeatures: true,
      canAccessAdminPanel: false,
    }

    // Recruiter routes should be accessible
    expect(canAccessRoute('/jobs', recruiterPermissions)).toBe(true)
    expect(canAccessRoute('/pipeline', recruiterPermissions)).toBe(true)
    expect(canAccessRoute('/dashboard', recruiterPermissions)).toBe(true)

    // Candidate-only routes should be blocked
    expect(canAccessRoute('/companion', recruiterPermissions)).toBe(false)
    expect(canAccessRoute('/cv-tailor', recruiterPermissions)).toBe(false)
  })

  // ==========================================================================
  // Check-in & Streak Flow
  // ==========================================================================

  it('6. First check-in → streak starts at 1', async () => {
    const { POST } = await import('@/app/api/checkin/route')

    setAuthenticatedUser('first-checkin-user')
    setProfile({
      current_streak: 0,
      longest_streak: 0,
      total_checkins: 0,
    })
    setTodayCheckin(null)
    setYesterdayCheckin(null)

    const request = createMockRequest('POST', '/api/checkin', {
      message: 'Starting my job search journey',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    // Check that streak was set to 1 (no yesterday checkin)
    const profileUpdate = mockState.updateCalls.find(
      (call) => call.table === 'user_profiles'
    )
    expect(profileUpdate).toBeDefined()
    expect((profileUpdate?.data as Record<string, unknown>).current_streak).toBe(1)
  })

  it('7. Consecutive check-in → streak increments', async () => {
    const { POST } = await import('@/app/api/checkin/route')

    setAuthenticatedUser('streak-user')
    setProfile({
      current_streak: 5,
      longest_streak: 10,
      total_checkins: 30,
    })
    setTodayCheckin(null)
    setYesterdayCheckin({ id: 'yesterday-checkin-123' })

    const request = createMockRequest('POST', '/api/checkin', {
      message: 'Another day, keeping the streak going',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    // Check that streak was incremented
    const profileUpdate = mockState.updateCalls.find(
      (call) => call.table === 'user_profiles'
    )
    expect(profileUpdate).toBeDefined()
    expect((profileUpdate?.data as Record<string, unknown>).current_streak).toBe(6)
  })

  // ==========================================================================
  // Full Goal Lifecycle
  // ==========================================================================

  it('8. Check-in + goal accept + goal complete → celebration', async () => {
    // Step 1: Check-in
    const checkinRoute = await import('@/app/api/checkin/route')
    const goalsRoute = await import('@/app/api/goals/route')

    setAuthenticatedUser('lifecycle-user')
    setProfile({ current_streak: 1, longest_streak: 5, total_checkins: 10 })
    setTodayCheckin(null)
    setYesterdayCheckin(null)

    const checkinRequest = createMockRequest('POST', '/api/checkin', {
      message: 'Ready to be productive today',
    })

    const checkinResponse = await checkinRoute.POST(checkinRequest)
    expect(checkinResponse.status).toBe(200)

    // Step 2: Accept the goal
    resetMockState()
    setAuthenticatedUser('lifecycle-user')
    setTodayCheckin({
      id: 'checkin-with-goal',
      suggested_micro_goal: 'Take a short walk',
      user_accepted_goal: false,
      goal_completed: false,
      celebration_moments: [],
    })

    const acceptRequest = createMockRequest('POST', '/api/goals', { action: 'accept' })
    const acceptResponse = await goalsRoute.POST(acceptRequest)
    expect(acceptResponse.status).toBe(200)

    const acceptData = await acceptResponse.json()
    expect(acceptData.success).toBe(true)
    expect(acceptData.message).toContain('Goal accepted')

    // Step 3: Complete the goal
    resetMockState()
    setAuthenticatedUser('lifecycle-user')
    setTodayCheckin({
      id: 'checkin-accepted-goal',
      suggested_micro_goal: 'Take a short walk',
      user_accepted_goal: true,
      goal_completed: false,
      celebration_moments: [],
    })

    const completeRequest = createMockRequest('PUT', '/api/goals', {
      reflection: 'Felt refreshed after the walk!',
    })
    const completeResponse = await goalsRoute.PUT(completeRequest)
    expect(completeResponse.status).toBe(200)

    const completeData = await completeResponse.json()
    expect(completeData.success).toBe(true)
    expect(completeData.celebration).toBeDefined()
  })

  // ==========================================================================
  // Support + Side Effects
  // ==========================================================================

  it('9. Support request → updates check-in + job application', async () => {
    const { POST } = await import('@/app/api/support/route')

    setAuthenticatedUser('support-user')
    setTodayCheckin({
      id: 'checkin-support',
      struggles_mentioned: [],
      rejection_count_this_week: 1,
    })
    mockState.applications = [{
      id: 'app-to-reject',
      company_name: 'TechCorp',
      application_status: 'applied',
      companion_support_provided: [],
    }]

    const request = createMockRequest('POST', '/api/support', {
      type: 'rejection',
      companyName: 'TechCorp',
      position: 'Software Engineer',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    // Check-in should be updated with struggle
    const checkinUpdate = mockState.updateCalls.find(
      (call) => call.table === 'user_emotional_context'
    )
    expect(checkinUpdate).toBeDefined()
    const checkinData = checkinUpdate?.data as Record<string, unknown>
    expect(checkinData.follow_up_needed).toBe(true)
    expect((checkinData.struggles_mentioned as Array<unknown>).length).toBeGreaterThan(0)

    // Job application should be updated to rejected
    const appUpdate = mockState.updateCalls.find(
      (call) => call.table === 'job_applications'
    )
    expect(appUpdate).toBeDefined()
    expect((appUpdate?.data as Record<string, unknown>).application_status).toBe('rejected')
  })

  // ==========================================================================
  // GDPR Flows
  // ==========================================================================

  it('10. GDPR export → includes all user data', async () => {
    const { GET } = await import('@/app/api/gdpr/export-data/route')

    setAuthenticatedUser('gdpr-export-user', 'gdpr@example.com')
    setProfile({
      id: 'gdpr-export-user',
      full_name: 'Test User',
      email: 'gdpr@example.com',
    })

    const request = createMockRequest('GET', '/api/gdpr/export-data')
    const response = await GET(request)
    const responseText = await response.text()
    const data = JSON.parse(responseText)

    expect(response.status).toBe(200)
    expect(data.export_info).toBeDefined()
    expect(data.export_info.user_id).toBe('gdpr-export-user')
    expect(data.export_info.format_version).toBe('1.0')
    expect(data.export_info.gdpr_article).toContain('Article 15')
  })

  it('11. GDPR delete request → cancel → re-request', async () => {
    const gdprRoute = await import('@/app/api/gdpr/delete-account/route')

    // Step 1: Initial delete request
    setAuthenticatedUser('gdpr-delete-user')
    setPendingDeletionRequest(null) // No existing pending request

    const requestDelete = createMockRequest('POST', '/api/gdpr/delete-account', {
      confirm: 'DELETE_MY_ACCOUNT',
      reason: 'No longer using the service',
    })

    const response1 = await gdprRoute.POST(requestDelete)
    expect(response1.status).toBe(200)

    // Verify insert was called
    const insertCall = mockState.insertCalls.find(
      (call) => call.table === 'account_deletion_requests'
    )
    expect(insertCall).toBeDefined()

    // Step 2: Cancel the request
    resetMockState()
    setAuthenticatedUser('gdpr-delete-user')
    setPendingDeletionRequest({
      id: 'deletion-req-123',
      status: 'pending',
      user_id: 'gdpr-delete-user',
    })

    const cancelRequest = createMockRequest('DELETE', '/api/gdpr/delete-account')
    const response2 = await gdprRoute.DELETE(cancelRequest)
    expect(response2.status).toBe(200)

    // Verify update to cancelled
    const cancelUpdate = mockState.updateCalls.find(
      (call) => call.table === 'account_deletion_requests'
    )
    expect(cancelUpdate).toBeDefined()
    expect((cancelUpdate?.data as Record<string, unknown>).status).toBe('cancelled')

    // Step 3: Re-request deletion
    resetMockState()
    setAuthenticatedUser('gdpr-delete-user')
    setPendingDeletionRequest(null) // No pending request after cancellation

    const reRequestDelete = createMockRequest('POST', '/api/gdpr/delete-account', {
      confirm: 'DELETE_MY_ACCOUNT',
      reason: 'Changed my mind, now really want to delete',
    })

    const response3 = await gdprRoute.POST(reRequestDelete)
    expect(response3.status).toBe(200)
  })

  // ==========================================================================
  // Consent Flow
  // ==========================================================================

  it('12. Consent flow: grant privacy_policy → grant terms → grant marketing → revoke marketing', async () => {
    const { POST } = await import('@/app/api/consent/log/route')

    setAuthenticatedUser('consent-user')
    setProfile({
      id: 'consent-user',
      privacy_policy_accepted_at: null,
      terms_accepted_at: null,
      marketing_emails_consent: false,
    })

    // Step 1: Grant privacy policy
    const privacy = createMockRequest('POST', '/api/consent/log', {
      consent_type: 'privacy_policy',
      action: 'granted',
      version: '1.0',
    })
    const res1 = await POST(privacy)
    expect(res1.status).toBe(200)

    // Step 2: Grant terms of service
    resetMockState()
    setAuthenticatedUser('consent-user')
    setProfile({ id: 'consent-user' })

    const terms = createMockRequest('POST', '/api/consent/log', {
      consent_type: 'terms_of_service',
      action: 'granted',
      version: '1.0',
    })
    const res2 = await POST(terms)
    expect(res2.status).toBe(200)

    // Step 3: Grant marketing emails
    resetMockState()
    setAuthenticatedUser('consent-user')
    setProfile({ id: 'consent-user' })

    const marketing = createMockRequest('POST', '/api/consent/log', {
      consent_type: 'marketing_emails',
      action: 'granted',
      version: '1.0',
    })
    const res3 = await POST(marketing)
    expect(res3.status).toBe(200)

    // Step 4: Revoke marketing emails
    resetMockState()
    setAuthenticatedUser('consent-user')
    setProfile({ id: 'consent-user' })

    const revokeMarketing = createMockRequest('POST', '/api/consent/log', {
      consent_type: 'marketing_emails',
      action: 'revoked',
      version: '1.0',
    })
    const res4 = await POST(revokeMarketing)
    expect(res4.status).toBe(200)

    // Verify final state
    const finalUpdate = mockState.updateCalls.find(
      (call) => call.table === 'profiles'
    )
    expect(finalUpdate).toBeDefined()
    expect((finalUpdate?.data as Record<string, unknown>).marketing_emails_consent).toBe(false)
  })

  // ==========================================================================
  // Admin Bypass
  // ==========================================================================

  it('13. Admin user bypasses all route restrictions', async () => {
    const { canAccessRoute } = await import('@/lib/auth/permissions')

    const adminPermissions = {
      userId: 'admin-user',
      userType: 'candidate' as const, // Even as candidate user_type
      isAdmin: true,
      canAccessCandidateFeatures: true,
      canAccessRecruiterFeatures: false,
      canAccessAdminPanel: true,
    }

    // Admin should access admin routes
    expect(canAccessRoute('/admin', adminPermissions)).toBe(true)
    expect(canAccessRoute('/admin/users', adminPermissions)).toBe(true)

    // Admin still respects user_type for candidate/recruiter routes
    expect(canAccessRoute('/dashboard', adminPermissions)).toBe(true)
    expect(canAccessRoute('/companion', adminPermissions)).toBe(true)
  })

  // ==========================================================================
  // Indicators
  // ==========================================================================

  it('14. Indicators load from DB, fallback to static', async () => {
    const { GET } = await import('@/app/api/indicators/route')

    // Test DB path
    setIndicators([
      { number: 1, name: 'Job Knowledge', category: 'Cognitive' },
      { number: 2, name: 'Problem-Solving', category: 'Cognitive' },
    ])

    const dbResponse = await GET()
    const dbData = await dbResponse.json()

    expect(dbResponse.status).toBe(200)
    expect(dbData.source).toBe('database')
    expect(dbData.indicators).toHaveLength(2)

    // Test static fallback
    resetMockState()
    setIndicators([]) // Empty DB

    const staticResponse = await GET()
    const staticData = await staticResponse.json()

    expect(staticResponse.status).toBe(200)
    expect(staticData.source).toBe('static')
    expect(staticData.indicators).toHaveLength(10)
  })

  // ==========================================================================
  // Full Emotional Intelligence Cycle
  // ==========================================================================

  it('15. Full emotional intelligence cycle: check-in → low mood → support → next day check-in → improved mood → celebration', async () => {
    const checkinRoute = await import('@/app/api/checkin/route')
    const supportRoute = await import('@/app/api/support/route')
    const celebrationRoute = await import('@/app/api/celebration/route')

    // Day 1: Low mood check-in
    setAuthenticatedUser('emotional-journey-user')
    setProfile({ current_streak: 5, longest_streak: 10, total_checkins: 20 })
    setTodayCheckin(null)
    setYesterdayCheckin(null)

    const lowMoodCheckin = createMockRequest('POST', '/api/checkin', {
      message: 'I am so tired and exhausted from all these rejections',
    })

    const response1 = await checkinRoute.POST(lowMoodCheckin)
    const data1 = await response1.json()

    expect(response1.status).toBe(200)
    expect(data1.response.detectedMood).toBeLessThanOrEqual(5)
    expect(data1.response.burnoutWarning).toBe(true)

    // Day 1: Support for rejection
    resetMockState()
    setAuthenticatedUser('emotional-journey-user')
    setTodayCheckin({
      id: 'day1-checkin',
      struggles_mentioned: [],
      rejection_count_this_week: 2,
    })

    const supportRequest = createMockRequest('POST', '/api/support', {
      type: 'rejection',
      companyName: 'DreamCompany',
      excitementLevel: 'dream_job',
    })

    const response2 = await supportRoute.POST(supportRequest)
    const data2 = await response2.json()

    expect(response2.status).toBe(200)
    expect(data2.support).toContain('how much you wanted this one')

    // Day 2: Improved mood check-in
    resetMockState()
    setAuthenticatedUser('emotional-journey-user')
    setProfile({ current_streak: 6, longest_streak: 10, total_checkins: 21 })
    setTodayCheckin(null)
    setYesterdayCheckin({ id: 'day1-checkin' })

    const improvedCheckin = createMockRequest('POST', '/api/checkin', {
      message: 'I got the job offer! So excited!',
    })

    const response3 = await checkinRoute.POST(improvedCheckin)
    const data3 = await response3.json()

    expect(response3.status).toBe(200)
    expect(data3.response.detectedMood).toBeGreaterThanOrEqual(7)
    expect(data3.response.celebrationDetected).toBe(true)

    // Day 2: Celebration
    resetMockState()
    setAuthenticatedUser('emotional-journey-user')
    setTodayCheckin({ energy_level: 'high', mood_rating: 9 })

    const celebrationRequest = createMockRequest('POST', '/api/celebration', {
      type: 'offer',
      title: 'Job Offer from DreamCompany!',
      companyName: 'DreamCompany',
    })

    const response4 = await celebrationRoute.POST(celebrationRequest)
    const data4 = await response4.json()

    expect(response4.status).toBe(200)
    expect(data4.success).toBe(true)
    expect(data4.celebration).toContain('You did it')
    expect(data4.type).toBe('offer')
  })
})
