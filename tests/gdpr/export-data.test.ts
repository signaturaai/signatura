/**
 * GDPR Data Export Tests — RALPH Loop 15
 *
 * Tests for the GDPR data export API endpoint.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// ============================================================================
// Mock Setup
// ============================================================================

// Mock state stored in a module-level object to avoid hoisting issues
const mockState = {
  user: null as { id: string; email: string } | null,
  tableQueries: [] as Array<{ table: string; column: string; value: string }>,
  tableData: {} as Record<string, { data: unknown; error: unknown }>,
}

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
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation((column: string, value: string) => {
          mockState.tableQueries.push({ table: tableName, column, value })
          return {
            single: vi.fn().mockImplementation(async () => {
              const result = mockState.tableData[tableName]
              return result || { data: null, error: null }
            }),
            then: (resolve: (value: { data: unknown; error: unknown }) => void) => {
              const result = mockState.tableData[tableName] || { data: [], error: null }
              resolve(result)
              return Promise.resolve(result)
            },
          }
        }),
      }
    }),
  })),
}))

// Import after mocking
import { GET } from '@/app/api/gdpr/export-data/route'

// ============================================================================
// Helper Functions
// ============================================================================

function createMockRequest(): NextRequest {
  const url = 'http://localhost:3000/api/gdpr/export-data'
  return new NextRequest(url, { method: 'GET' })
}

function setAuthenticatedUser(userId: string = 'user-123', email: string = 'test@example.com') {
  mockState.user = { id: userId, email }
}

function setUnauthenticated() {
  mockState.user = null
}

function setTableData(tableName: string, data: unknown, error: unknown = null) {
  mockState.tableData[tableName] = { data, error }
}

function setAllTablesEmpty() {
  const tables = [
    'profiles',
    'job_applications',
    'cv_versions',
    'cv_tailoring_sessions',
    'daily_check_ins',
    'interview_sessions',
    'compensation_negotiations',
    'contract_reviews',
    'consent_log',
    'account_deletion_requests',
  ]
  tables.forEach((table) => {
    mockState.tableData[table] = { data: table === 'profiles' ? null : [], error: null }
  })
}

function setAllTablesWithData() {
  mockState.tableData = {
    profiles: { data: { id: 'user-123', full_name: 'Test User' }, error: null },
    job_applications: { data: [{ id: 'app-1' }, { id: 'app-2' }], error: null },
    cv_versions: { data: [{ id: 'cv-1' }], error: null },
    cv_tailoring_sessions: { data: [{ id: 'session-1' }, { id: 'session-2' }, { id: 'session-3' }], error: null },
    daily_check_ins: { data: [{ id: 'checkin-1' }], error: null },
    interview_sessions: { data: [{ id: 'interview-1' }, { id: 'interview-2' }], error: null },
    compensation_negotiations: { data: [], error: null },
    contract_reviews: { data: [{ id: 'contract-1' }], error: null },
    consent_log: { data: [{ id: 'consent-1' }, { id: 'consent-2' }], error: null },
    account_deletion_requests: { data: [], error: null },
  }
}

// ============================================================================
// Test Suite
// ============================================================================

describe('GDPR Data Export API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.user = null
    mockState.tableQueries = []
    mockState.tableData = {}
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('1. Returns 401 when unauthenticated', async () => {
    setUnauthenticated()
    const request = createMockRequest()

    const response = await GET(request)

    expect(response.status).toBe(401)
  })

  it('2. Queries ALL 10 tables in parallel', async () => {
    setAuthenticatedUser('user-456')
    setAllTablesEmpty()
    const request = createMockRequest()

    await GET(request)

    const queriedTables = mockState.tableQueries.map((q) => q.table)
    expect(queriedTables).toContain('profiles')
    expect(queriedTables).toContain('job_applications')
    expect(queriedTables).toContain('cv_versions')
    expect(queriedTables).toContain('cv_tailoring_sessions')
    expect(queriedTables).toContain('daily_check_ins')
    expect(queriedTables).toContain('interview_sessions')
    expect(queriedTables).toContain('compensation_negotiations')
    expect(queriedTables).toContain('contract_reviews')
    expect(queriedTables).toContain('consent_log')
    expect(queriedTables).toContain('account_deletion_requests')
    expect(queriedTables.length).toBe(10)
  })

  it('3. All queries filter by user.id', async () => {
    setAuthenticatedUser('user-789')
    setAllTablesEmpty()
    const request = createMockRequest()

    await GET(request)

    // All queries should filter by user id
    mockState.tableQueries.forEach((query) => {
      expect(query.value).toBe('user-789')
    })
  })

  it("4. Profiles query uses '.eq('id', user.id)' (not user_id)", async () => {
    setAuthenticatedUser('user-check-col')
    setAllTablesEmpty()
    const request = createMockRequest()

    await GET(request)

    const profileQuery = mockState.tableQueries.find((q) => q.table === 'profiles')
    expect(profileQuery).toBeDefined()
    expect(profileQuery?.column).toBe('id')

    // Other tables should use user_id
    const otherQueries = mockState.tableQueries.filter((q) => q.table !== 'profiles')
    otherQueries.forEach((query) => {
      expect(query.column).toBe('user_id')
    })
  })

  it('5. Response includes export_info metadata', async () => {
    setAuthenticatedUser('user-meta-123', 'meta@example.com')
    setAllTablesEmpty()
    const request = createMockRequest()

    const response = await GET(request)
    const data = JSON.parse(await response.text())

    expect(data.export_info).toBeDefined()
    expect(data.export_info.export_date).toBeDefined()
    expect(data.export_info.user_id).toBe('user-meta-123')
    expect(data.export_info.user_email).toBe('meta@example.com')
    expect(data.export_info.format_version).toBe('1.0')
    expect(data.export_info.gdpr_article).toContain('Article 15')
  })

  it('6. Response includes all 10 data sections', async () => {
    setAuthenticatedUser()
    setAllTablesEmpty()
    const request = createMockRequest()

    const response = await GET(request)
    const data = JSON.parse(await response.text())

    expect(data).toHaveProperty('profile')
    expect(data).toHaveProperty('job_applications')
    expect(data).toHaveProperty('cv_versions')
    expect(data).toHaveProperty('cv_tailoring_sessions')
    expect(data).toHaveProperty('daily_check_ins')
    expect(data).toHaveProperty('interview_sessions')
    expect(data).toHaveProperty('compensation_negotiations')
    expect(data).toHaveProperty('contract_reviews')
    expect(data).toHaveProperty('consent_history')
    expect(data).toHaveProperty('account_deletion_requests')
  })

  it('7. Response includes data_summary with counts', async () => {
    setAuthenticatedUser()
    setAllTablesWithData()
    const request = createMockRequest()

    const response = await GET(request)
    const data = JSON.parse(await response.text())

    expect(data.data_summary).toBeDefined()
    expect(data.data_summary.total_applications).toBe(2)
    expect(data.data_summary.total_cv_versions).toBe(1)
    expect(data.data_summary.total_tailoring_sessions).toBe(3)
    expect(data.data_summary.total_check_ins).toBe(1)
    expect(data.data_summary.total_interviews).toBe(2)
    expect(data.data_summary.total_consent_records).toBe(2)
  })

  it('8. Empty tables return empty arrays (not null)', async () => {
    setAuthenticatedUser()
    setAllTablesEmpty()
    const request = createMockRequest()

    const response = await GET(request)
    const data = JSON.parse(await response.text())

    // Arrays should be empty, not null
    expect(data.job_applications).toEqual([])
    expect(data.cv_versions).toEqual([])
    expect(data.cv_tailoring_sessions).toEqual([])
    expect(data.daily_check_ins).toEqual([])
    expect(data.interview_sessions).toEqual([])
    expect(data.compensation_negotiations).toEqual([])
    expect(data.contract_reviews).toEqual([])
    expect(data.consent_history).toEqual([])
    expect(data.account_deletion_requests).toEqual([])
  })

  it('9. Content-Type is application/json', async () => {
    setAuthenticatedUser()
    setAllTablesEmpty()
    const request = createMockRequest()

    const response = await GET(request)

    expect(response.headers.get('Content-Type')).toBe('application/json')
  })

  it('10. Content-Disposition has attachment with filename', async () => {
    setAuthenticatedUser('user-file-123')
    setAllTablesEmpty()
    const request = createMockRequest()

    const response = await GET(request)
    const disposition = response.headers.get('Content-Disposition')

    expect(disposition).toBeDefined()
    expect(disposition).toContain('attachment')
    expect(disposition).toContain('signatura-data-export-')
    expect(disposition).toContain('user-fil') // First 8 chars of user id
    expect(disposition).toContain('.json')
  })

  it('11. X-Content-Type-Options: nosniff header set', async () => {
    setAuthenticatedUser()
    setAllTablesEmpty()
    const request = createMockRequest()

    const response = await GET(request)

    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  it('12. Handles individual table errors gracefully', async () => {
    setAuthenticatedUser()
    // Set some tables with data and some with errors
    mockState.tableData = {
      profiles: { data: { id: 'user-123' }, error: null },
      job_applications: { data: null, error: { message: 'Table error' } },
      cv_versions: { data: [{ id: 'cv-1' }], error: null },
      cv_tailoring_sessions: { data: [], error: null },
      daily_check_ins: { data: null, error: { message: 'Another error' } },
      interview_sessions: { data: [], error: null },
      compensation_negotiations: { data: [], error: null },
      contract_reviews: { data: [], error: null },
      consent_log: { data: [], error: null },
      account_deletion_requests: { data: [], error: null },
    }
    const request = createMockRequest()

    const response = await GET(request)
    const data = JSON.parse(await response.text())

    // Should still return 200 and include data from successful tables
    expect(response.status).toBe(200)
    expect(data.cv_versions).toEqual([{ id: 'cv-1' }])
    // Failed tables should return empty arrays (due to || [] fallback)
    expect(data.job_applications).toEqual([])
    expect(data.daily_check_ins).toEqual([])
  })
})
