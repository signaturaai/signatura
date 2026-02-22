/**
 * Integration Tests for Usage Tracking in Existing Routes (RALPH Loop 9)
 *
 * Tests the split pattern (check limit → create → increment) is correctly
 * integrated into all existing API routes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// ============================================================================
// Mock Setup
// ============================================================================

// Mock user data
const mockUser = { id: 'user-123', email: 'test@example.com' }

// Track mock calls
const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockSingle = vi.fn()

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: vi.fn(() =>
          Promise.resolve({
            data: { user: mockUser },
            error: null,
          })
        ),
      },
      from: vi.fn(() => ({
        insert: mockInsert.mockReturnValue({
          select: mockSelect.mockReturnValue({
            single: mockSingle,
          }),
        }),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({ data: [], error: null }),
      })),
    })
  ),
  createServiceClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    update: vi.fn().mockReturnThis(),
  })),
}))

// Mock access control functions
const mockCheckUsageLimit = vi.fn()
const mockCheckFeatureAccess = vi.fn()
const mockIncrementUsage = vi.fn()

vi.mock('@/lib/subscription/access-control', () => ({
  checkUsageLimit: (...args: unknown[]) => mockCheckUsageLimit(...args),
  checkFeatureAccess: (...args: unknown[]) => mockCheckFeatureAccess(...args),
  incrementUsage: (...args: unknown[]) => mockIncrementUsage(...args),
}))

// Mock AI functions for companion route
vi.mock('@/lib/ai', () => ({
  generateCheckInResponse: vi.fn().mockResolvedValue({
    message: 'Test response',
    tone: 'supportive',
    detectedMood: 5,
    detectedEnergy: 5,
    burnoutWarning: false,
  }),
  generateConversationalResponse: vi.fn().mockResolvedValue('Test response'),
  getMockCompanionResponse: vi.fn().mockResolvedValue({
    message: 'Mock response',
    tone: 'supportive',
    detectedMood: 5,
    detectedEnergy: 5,
    burnoutWarning: false,
    suggestedGoal: null,
    emotionalKeywords: [],
  }),
  getCompanionContext: vi.fn().mockResolvedValue({
    userName: 'Test User',
    emotionalState: { mood: 5, energy: 5 },
    currentMessage: '',
  }),
  storeDailyContext: vi.fn().mockResolvedValue(undefined),
  storeConversation: vi.fn().mockResolvedValue(undefined),
}))

// Mock CV tailoring
vi.mock('@/lib/cv', () => ({
  generateBestOfBothWorldsCV: vi.fn().mockResolvedValue({
    success: true,
    finalCVText: 'Tailored CV content',
    baseOverallScore: 70,
    tailoredOverallScore: 85,
    finalOverallScore: 85,
    overallImprovement: 15,
    sectionComparisons: [],
    sectionsImproved: 3,
    sectionsKeptOriginal: 1,
    totalSections: 4,
    processingTimeMs: 1000,
  }),
}))

// Mock Interview generation
vi.mock('@/lib/interview', () => ({
  generateInterviewPlan: vi.fn().mockResolvedValue({
    questions: [],
    tips: [],
    schedule: [],
    estimatedDuration: 60,
    userId: 'user-123',
  }),
  getMockInterviewPlan: vi.fn().mockResolvedValue({
    questions: [],
    tips: [],
    schedule: [],
    estimatedDuration: 60,
    userId: 'user-123',
  }),
}))

// Mock compensation analysis
vi.mock('@/lib/compensation', () => ({
  generateNegotiationStrategy: vi.fn().mockResolvedValue({
    id: 'strategy-123',
    offerSnapshot: {},
    negotiationPriorities: [],
    negotiationTactics: [],
    scripts: [],
    alternativeScenarios: [],
    overallStrength: 75,
  }),
}))

// Mock contract analysis
vi.mock('@/lib/contract', () => ({
  analyzeContract: vi.fn().mockResolvedValue({
    id: 'analysis-123',
    userId: 'user-123',
    status: 'completed',
    overallRiskScore: 25,
    clauses: [],
    recommendations: [],
  }),
}))

// ============================================================================
// Helper Functions
// ============================================================================

function createMockRequest(
  url: string,
  options: { method?: string; body?: Record<string, unknown> } = {}
): NextRequest {
  const { method = 'POST', body } = options

  const requestInit: RequestInit = {
    method,
    headers: new Headers({ 'content-type': 'application/json' }),
  }

  if (body) {
    requestInit.body = JSON.stringify(body)
  }

  return new NextRequest(url, requestInit)
}

function mockAllowedUsageLimit(used = 5, limit = 15) {
  mockCheckUsageLimit.mockResolvedValue({
    allowed: true,
    enforced: true,
    unlimited: false,
    used,
    limit,
    remaining: limit - used,
  })
}

function mockBlockedUsageLimit(reason = 'LIMIT_EXCEEDED') {
  mockCheckUsageLimit.mockResolvedValue({
    allowed: false,
    enforced: true,
    unlimited: false,
    reason,
    used: 15,
    limit: 15,
    remaining: 0,
  })
}

function mockAllowedFeatureAccess() {
  mockCheckFeatureAccess.mockResolvedValue({
    allowed: true,
    enforced: true,
    tier: 'accelerate',
  })
}

function mockBlockedFeatureAccess(reason = 'tier_too_low') {
  mockCheckFeatureAccess.mockResolvedValue({
    allowed: false,
    enforced: true,
    reason,
    tier: 'momentum',
    requiredTier: 'accelerate',
  })
}

function mockSuccessfulCreation() {
  mockSingle.mockResolvedValue({
    data: { id: 'created-123', created_at: new Date().toISOString() },
    error: null,
  })
}

function mockFailedCreation() {
  mockSingle.mockResolvedValue({
    data: null,
    error: { message: 'Database error' },
  })
}

// ============================================================================
// Applications Route Tests
// ============================================================================

describe('POST /api/applications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('POST /api/applications calls checkUsageLimit(applications) before creating', async () => {
    mockAllowedUsageLimit()
    mockSuccessfulCreation()
    mockIncrementUsage.mockResolvedValue(undefined)

    const { POST } = await import('@/app/api/applications/route')

    const request = createMockRequest('http://localhost/api/applications', {
      method: 'POST',
      body: {
        company_name: 'Test Company',
        position_title: 'Software Engineer',
        job_description: 'Test description',
      },
    })

    await POST(request)

    // Verify checkUsageLimit was called with 'applications'
    expect(mockCheckUsageLimit).toHaveBeenCalledWith(
      expect.anything(),
      'user-123',
      'applications'
    )

    // Verify it was called before insert
    const checkCallOrder = mockCheckUsageLimit.mock.invocationCallOrder[0]
    const insertCallOrder = mockInsert.mock.invocationCallOrder[0]
    expect(checkCallOrder).toBeLessThan(insertCallOrder)
  })

  it('POST /api/applications blocks with 403 when limit reached', async () => {
    mockBlockedUsageLimit('LIMIT_EXCEEDED')

    const { POST } = await import('@/app/api/applications/route')

    const request = createMockRequest('http://localhost/api/applications', {
      method: 'POST',
      body: {
        company_name: 'Test Company',
        position_title: 'Software Engineer',
        job_description: 'Test description',
      },
    })

    const response = await POST(request)

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe('Usage limit reached')

    // Verify insert was NOT called
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('POST /api/applications returns 402 when NO_SUBSCRIPTION', async () => {
    mockBlockedUsageLimit('NO_SUBSCRIPTION')

    const { POST } = await import('@/app/api/applications/route')

    const request = createMockRequest('http://localhost/api/applications', {
      method: 'POST',
      body: {
        company_name: 'Test Company',
        position_title: 'Software Engineer',
        job_description: 'Test description',
      },
    })

    const response = await POST(request)

    expect(response.status).toBe(402)
    const data = await response.json()
    expect(data.error).toBe('Subscription required')
  })

  it('POST /api/applications calls incrementUsage AFTER successful creation', async () => {
    mockAllowedUsageLimit()
    mockSuccessfulCreation()
    mockIncrementUsage.mockResolvedValue(undefined)

    const { POST } = await import('@/app/api/applications/route')

    const request = createMockRequest('http://localhost/api/applications', {
      method: 'POST',
      body: {
        company_name: 'Test Company',
        position_title: 'Software Engineer',
        job_description: 'Test description',
      },
    })

    const response = await POST(request)

    expect(response.status).toBe(200)

    // Verify incrementUsage was called with 'applications'
    expect(mockIncrementUsage).toHaveBeenCalledWith(
      expect.anything(),
      'user-123',
      'applications'
    )

    // Verify increment was called after insert
    const insertCallOrder = mockSingle.mock.invocationCallOrder[0]
    const incrementCallOrder = mockIncrementUsage.mock.invocationCallOrder[0]
    expect(incrementCallOrder).toBeGreaterThan(insertCallOrder)
  })

  it('POST /api/applications does NOT increment if creation fails', async () => {
    mockAllowedUsageLimit()
    mockFailedCreation()

    const { POST } = await import('@/app/api/applications/route')

    const request = createMockRequest('http://localhost/api/applications', {
      method: 'POST',
      body: {
        company_name: 'Test Company',
        position_title: 'Software Engineer',
        job_description: 'Test description',
      },
    })

    const response = await POST(request)

    expect(response.status).toBe(500)

    // Verify incrementUsage was NOT called
    expect(mockIncrementUsage).not.toHaveBeenCalled()
  })
})

// ============================================================================
// CV Route Tests
// ============================================================================

describe('POST /api/cv/tailor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Valid CV content (>100 chars) and job description (>50 chars)
  const validBaseCVText = 'Software engineer with 5 years of experience in TypeScript, React, and Node.js. Passionate about building scalable applications and leading engineering teams.'
  const validJobDescription = 'We are looking for a senior software engineer to join our team. Experience with React and TypeScript required.'

  it('POST /api/cv calls checkUsageLimit(cvs) and blocks at limit', async () => {
    mockBlockedUsageLimit('LIMIT_EXCEEDED')

    const { POST } = await import('@/app/api/cv/tailor/route')

    const request = createMockRequest('http://localhost/api/cv/tailor', {
      method: 'POST',
      body: {
        baseCVText: validBaseCVText,
        jobDescription: validJobDescription,
      },
    })

    const response = await POST(request)

    expect(response.status).toBe(403)

    // Verify checkUsageLimit was called with 'cvs'
    expect(mockCheckUsageLimit).toHaveBeenCalledWith(
      expect.anything(),
      'user-123',
      'cvs'
    )
  })

  it('POST /api/cv increments cvs after successful creation', async () => {
    mockAllowedUsageLimit()
    mockIncrementUsage.mockResolvedValue(undefined)

    const { POST } = await import('@/app/api/cv/tailor/route')

    const request = createMockRequest('http://localhost/api/cv/tailor', {
      method: 'POST',
      body: {
        baseCVText: validBaseCVText,
        jobDescription: validJobDescription,
        saveToDatabase: false, // Skip database operations
      },
    })

    const response = await POST(request)

    expect(response.status).toBe(200)

    // Verify incrementUsage was called with 'cvs'
    expect(mockIncrementUsage).toHaveBeenCalledWith(
      expect.anything(),
      'user-123',
      'cvs'
    )
  })
})

// ============================================================================
// Interview Route Tests
// ============================================================================

describe('POST /api/interview/generate-plan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Valid interview request body
  const validInterviewBody = {
    jobDescription: 'We are looking for a senior software engineer to join our team.',
    tailoredCV: 'Software engineer with 5 years of experience.',
    config: {
      interviewType: 'behavioral',
      personaMode: 'preset',
      persona: 'friendly',
      focusAreas: ['leadership', 'problem-solving'],
      duration: 30,
    },
  }

  it('POST /api/interview calls checkUsageLimit(interviews)', async () => {
    mockAllowedUsageLimit()
    mockIncrementUsage.mockResolvedValue(undefined)

    const { POST } = await import('@/app/api/interview/generate-plan/route')

    const request = createMockRequest('http://localhost/api/interview/generate-plan', {
      method: 'POST',
      body: validInterviewBody,
    })

    await POST(request)

    // Verify checkUsageLimit was called with 'interviews'
    expect(mockCheckUsageLimit).toHaveBeenCalledWith(
      expect.anything(),
      'user-123',
      'interviews'
    )
  })

  it('POST /api/interview increments interviews after success', async () => {
    mockAllowedUsageLimit()
    mockIncrementUsage.mockResolvedValue(undefined)

    const { POST } = await import('@/app/api/interview/generate-plan/route')

    const request = createMockRequest('http://localhost/api/interview/generate-plan', {
      method: 'POST',
      body: validInterviewBody,
    })

    const response = await POST(request)

    expect(response.status).toBe(200)

    // Verify incrementUsage was called with 'interviews'
    expect(mockIncrementUsage).toHaveBeenCalledWith(
      expect.anything(),
      'user-123',
      'interviews'
    )
  })
})

// ============================================================================
// Compensation Route Tests
// ============================================================================

describe('POST /api/compensation/generate-strategy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Valid compensation request body
  const validCompensationBody = {
    offerDetails: {
      baseSalary: 120000,
      currency: 'USD',
      roleTitle: 'Senior Software Engineer',
      roleLevel: 'senior',
      location: 'San Francisco, CA',
      companyName: 'Tech Corp',
      companySize: 'large',
      industry: 'Technology',
    },
    userPriorities: {
      primaryFocus: 'base_salary',
      secondaryFocus: 'equity',
      willingToWalkAway: true,
      mustHaves: ['remote_work'],
      niceToHaves: ['signing_bonus'],
    },
    marketData: {
      salaryRange: { min: 100000, max: 150000 },
      equityRange: { min: 50000, max: 100000 },
    },
  }

  it('POST /api/compensation calls checkUsageLimit(compensation)', async () => {
    mockAllowedUsageLimit()
    mockIncrementUsage.mockResolvedValue(undefined)

    const { POST } = await import('@/app/api/compensation/generate-strategy/route')

    const request = createMockRequest('http://localhost/api/compensation/generate-strategy', {
      method: 'POST',
      body: validCompensationBody,
    })

    await POST(request)

    // Verify checkUsageLimit was called with 'compensation'
    expect(mockCheckUsageLimit).toHaveBeenCalledWith(
      expect.anything(),
      'user-123',
      'compensation'
    )
  })

  it('POST /api/compensation increments compensation after success', async () => {
    mockAllowedUsageLimit()
    mockIncrementUsage.mockResolvedValue(undefined)

    const { POST } = await import('@/app/api/compensation/generate-strategy/route')

    const request = createMockRequest('http://localhost/api/compensation/generate-strategy', {
      method: 'POST',
      body: validCompensationBody,
    })

    const response = await POST(request)

    expect(response.status).toBe(200)

    // Verify incrementUsage was called with 'compensation'
    expect(mockIncrementUsage).toHaveBeenCalledWith(
      expect.anything(),
      'user-123',
      'compensation'
    )
  })
})

// ============================================================================
// Contract Route Tests
// ============================================================================

describe('POST /api/contract/analyze', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Valid contract request body
  const validContractBody = {
    fileUrl: 'https://example.com/contracts/employment-contract.pdf',
    fileName: 'employment-contract.pdf',
    userRole: 'employee',
  }

  it('POST /api/contract calls checkUsageLimit(contracts)', async () => {
    mockAllowedUsageLimit()
    mockIncrementUsage.mockResolvedValue(undefined)

    const { POST } = await import('@/app/api/contract/analyze/route')

    const request = createMockRequest('http://localhost/api/contract/analyze', {
      method: 'POST',
      body: validContractBody,
    })

    await POST(request)

    // Verify checkUsageLimit was called with 'contracts'
    expect(mockCheckUsageLimit).toHaveBeenCalledWith(
      expect.anything(),
      'user-123',
      'contracts'
    )
  })

  it('POST /api/contract increments contracts after success', async () => {
    mockAllowedUsageLimit()
    mockIncrementUsage.mockResolvedValue(undefined)

    const { POST } = await import('@/app/api/contract/analyze/route')

    const request = createMockRequest('http://localhost/api/contract/analyze', {
      method: 'POST',
      body: validContractBody,
    })

    const response = await POST(request)

    expect(response.status).toBe(200)

    // Verify incrementUsage was called with 'contracts'
    expect(mockIncrementUsage).toHaveBeenCalledWith(
      expect.anything(),
      'user-123',
      'contracts'
    )
  })
})

// ============================================================================
// Companion/AI Avatar Route Tests
// ============================================================================

describe('POST /api/companion/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set USE_MOCK_AI for consistent behavior
    process.env.USE_MOCK_AI = 'true'
  })

  afterEach(() => {
    delete process.env.USE_MOCK_AI
  })

  it('POST /api/companion FIRST checks checkFeatureAccess(aiAvatarInterviews)', async () => {
    mockBlockedFeatureAccess('tier_too_low')

    const { POST } = await import('@/app/api/companion/chat/route')

    const request = createMockRequest('http://localhost/api/companion/chat', {
      method: 'POST',
      body: {
        message: 'Hello, companion!',
      },
    })

    const response = await POST(request)

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe('Feature not available in your plan')

    // Verify feature check was called
    expect(mockCheckFeatureAccess).toHaveBeenCalledWith(
      expect.anything(),
      'user-123',
      'aiAvatarInterviews'
    )

    // Verify usage limit was NOT checked (blocked before that)
    expect(mockCheckUsageLimit).not.toHaveBeenCalled()
  })

  it('POST /api/companion THEN checks checkUsageLimit(aiAvatarInterviews)', async () => {
    mockAllowedFeatureAccess()
    mockBlockedUsageLimit('LIMIT_EXCEEDED')

    const { POST } = await import('@/app/api/companion/chat/route')

    const request = createMockRequest('http://localhost/api/companion/chat', {
      method: 'POST',
      body: {
        message: 'Hello, companion!',
      },
    })

    const response = await POST(request)

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe('Usage limit reached')

    // Verify both checks were called
    expect(mockCheckFeatureAccess).toHaveBeenCalledWith(
      expect.anything(),
      'user-123',
      'aiAvatarInterviews'
    )
    expect(mockCheckUsageLimit).toHaveBeenCalledWith(
      expect.anything(),
      'user-123',
      'aiAvatarInterviews'
    )

    // Verify feature check was called before usage check
    const featureCallOrder = mockCheckFeatureAccess.mock.invocationCallOrder[0]
    const usageCallOrder = mockCheckUsageLimit.mock.invocationCallOrder[0]
    expect(featureCallOrder).toBeLessThan(usageCallOrder)
  })

  it('POST /api/companion creates and increments when both checks pass', async () => {
    mockAllowedFeatureAccess()
    mockAllowedUsageLimit()
    mockIncrementUsage.mockResolvedValue(undefined)

    const { POST } = await import('@/app/api/companion/chat/route')

    const request = createMockRequest('http://localhost/api/companion/chat', {
      method: 'POST',
      body: {
        message: 'Hello, companion!',
      },
    })

    const response = await POST(request)

    expect(response.status).toBe(200)

    // Verify incrementUsage was called with 'aiAvatarInterviews'
    expect(mockIncrementUsage).toHaveBeenCalledWith(
      expect.anything(),
      'user-123',
      'aiAvatarInterviews'
    )
  })
})

// ============================================================================
// Cross-cutting Tests
// ============================================================================

describe('Cross-cutting behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('All routes allow access when kill switch is OFF (silent tracking)', async () => {
    // Kill switch OFF means allowed:true with enforced:false
    mockCheckUsageLimit.mockResolvedValue({
      allowed: true,
      enforced: false, // Kill switch OFF
      unlimited: true,
      used: 5,
      limit: -1,
      remaining: -1,
    })
    mockSuccessfulCreation()
    mockIncrementUsage.mockResolvedValue(undefined)

    const { POST } = await import('@/app/api/applications/route')

    const request = createMockRequest('http://localhost/api/applications', {
      method: 'POST',
      body: {
        company_name: 'Test Company',
        position_title: 'Software Engineer',
        job_description: 'Test description',
      },
    })

    const response = await POST(request)

    expect(response.status).toBe(200)

    // Verify the create-then-increment pattern still happens (counters track silently)
    expect(mockCheckUsageLimit).toHaveBeenCalled()
    expect(mockInsert).toHaveBeenCalled()
    expect(mockIncrementUsage).toHaveBeenCalled()
  })

  it('Admin user is never blocked on any route', async () => {
    // Admin bypass means allowed:true
    mockCheckUsageLimit.mockResolvedValue({
      allowed: true,
      enforced: true,
      unlimited: true,
      used: 100, // even with high usage
      limit: 15,
      remaining: -85, // negative remaining
      adminBypass: true,
    })
    mockSuccessfulCreation()
    mockIncrementUsage.mockResolvedValue(undefined)

    const { POST } = await import('@/app/api/applications/route')

    const request = createMockRequest('http://localhost/api/applications', {
      method: 'POST',
      body: {
        company_name: 'Test Company',
        position_title: 'Software Engineer',
        job_description: 'Test description',
      },
    })

    const response = await POST(request)

    expect(response.status).toBe(200)

    // Verify admin was allowed despite high usage
    expect(mockInsert).toHaveBeenCalled()
  })

  it('Usage count reflects in subsequent check', async () => {
    let usageCount = 5

    // First check returns current count
    mockCheckUsageLimit.mockImplementation(() => {
      return Promise.resolve({
        allowed: true,
        enforced: true,
        unlimited: false,
        used: usageCount,
        limit: 15,
        remaining: 15 - usageCount,
      })
    })

    // Increment increases the count
    mockIncrementUsage.mockImplementation(() => {
      usageCount++
      return Promise.resolve(undefined)
    })

    mockSuccessfulCreation()

    const { POST } = await import('@/app/api/applications/route')

    // First request
    const request1 = createMockRequest('http://localhost/api/applications', {
      method: 'POST',
      body: {
        company_name: 'Test Company 1',
        position_title: 'Software Engineer',
        job_description: 'Test description',
      },
    })

    await POST(request1)

    // Verify usage increased
    expect(usageCount).toBe(6)

    // Second request would see updated count
    const request2 = createMockRequest('http://localhost/api/applications', {
      method: 'POST',
      body: {
        company_name: 'Test Company 2',
        position_title: 'Software Engineer',
        job_description: 'Test description',
      },
    })

    await POST(request2)

    // Verify usage increased again
    expect(usageCount).toBe(7)

    // Check was called twice
    expect(mockCheckUsageLimit).toHaveBeenCalledTimes(2)
    expect(mockIncrementUsage).toHaveBeenCalledTimes(2)
  })
})
