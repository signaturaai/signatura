/**
 * My Applications Page - Filter Logic Tests
 *
 * Tests for search, status filtering, date range filtering, and sorting
 * functionality in the applications dashboard.
 */

import { describe, it, expect } from 'vitest'
import type { JobApplication, ApplicationStatus } from '@/lib/types/dashboard'

// Mock application data for testing
const mockApplications: JobApplication[] = [
  {
    id: 'app-001',
    user_id: 'user-1',
    company_name: 'Stripe',
    position_title: 'Product Director, Payments',
    location: 'San Francisco, CA',
    application_date: '2026-01-27T10:30:00Z',
    application_status: 'interview_scheduled',
    notes: 'Great fintech opportunity',
    created_at: '2026-01-27T10:30:00Z',
    updated_at: '2026-01-27T10:30:00Z',
    created_by: 'user',
  },
  {
    id: 'app-002',
    user_id: 'user-1',
    company_name: 'Figma',
    position_title: 'Director of Product, Enterprise',
    location: 'San Francisco, CA',
    application_date: '2026-01-26T14:00:00Z',
    application_status: 'applied',
    notes: 'Design tools leader',
    created_at: '2026-01-26T14:00:00Z',
    updated_at: '2026-01-26T14:00:00Z',
    created_by: 'user',
  },
  {
    id: 'app-003',
    user_id: 'user-1',
    company_name: 'Plaid',
    position_title: 'Product Director, Platform',
    location: 'Remote',
    application_date: '2026-01-28T09:00:00Z',
    application_status: 'prepared',
    notes: 'Fintech API company',
    created_at: '2026-01-28T09:00:00Z',
    updated_at: '2026-01-28T09:00:00Z',
    created_by: 'user',
  },
  {
    id: 'app-004',
    user_id: 'user-1',
    company_name: 'Linear',
    position_title: 'Head of Product',
    location: 'Remote',
    application_date: '2026-01-25T11:00:00Z',
    application_status: 'rejected',
    notes: 'Developer tools',
    created_at: '2026-01-25T11:00:00Z',
    updated_at: '2026-01-25T11:00:00Z',
    created_by: 'user',
  },
  {
    id: 'app-005',
    user_id: 'user-1',
    company_name: 'Databricks',
    position_title: 'Product Director, AI/ML Platform',
    location: 'San Francisco, CA',
    application_date: '2026-01-24T16:00:00Z',
    application_status: 'offer_received',
    notes: 'Data and AI platform',
    created_at: '2026-01-24T16:00:00Z',
    updated_at: '2026-01-24T16:00:00Z',
    created_by: 'user',
  },
]

// ============================================================================
// FILTER FUNCTIONS (extracted from page logic for testing)
// ============================================================================

function filterBySearch(applications: JobApplication[], searchTerm: string): JobApplication[] {
  if (!searchTerm) return applications
  const lowerSearch = searchTerm.toLowerCase()
  return applications.filter(
    (app) =>
      app.company_name.toLowerCase().includes(lowerSearch) ||
      app.position_title.toLowerCase().includes(lowerSearch) ||
      (app.notes && app.notes.toLowerCase().includes(lowerSearch)) ||
      (app.location && app.location.toLowerCase().includes(lowerSearch))
  )
}

function filterByStatus(
  applications: JobApplication[],
  statuses: ApplicationStatus[]
): JobApplication[] {
  if (statuses.length === 0) return applications
  return applications.filter((app) => statuses.includes(app.application_status))
}

function filterByDateRange(
  applications: JobApplication[],
  fromDate: string,
  toDate: string
): JobApplication[] {
  let result = applications

  if (fromDate) {
    const from = new Date(fromDate)
    result = result.filter((app) => new Date(app.application_date) >= from)
  }
  if (toDate) {
    const to = new Date(toDate)
    to.setHours(23, 59, 59, 999)
    result = result.filter((app) => new Date(app.application_date) <= to)
  }

  return result
}

type SortOption = 'newest' | 'oldest' | 'company_asc' | 'company_desc' | 'status'

function sortApplications(applications: JobApplication[], sortOption: SortOption): JobApplication[] {
  const sorted = [...applications]
  sorted.sort((a, b) => {
    switch (sortOption) {
      case 'newest':
        return new Date(b.application_date).getTime() - new Date(a.application_date).getTime()
      case 'oldest':
        return new Date(a.application_date).getTime() - new Date(b.application_date).getTime()
      case 'company_asc':
        return a.company_name.localeCompare(b.company_name)
      case 'company_desc':
        return b.company_name.localeCompare(a.company_name)
      case 'status':
        return a.application_status.localeCompare(b.application_status)
      default:
        return 0
    }
  })
  return sorted
}

// ============================================================================
// SEARCH FILTER TESTS
// ============================================================================

describe('Search Filter', () => {
  it('should return all applications when search is empty', () => {
    const result = filterBySearch(mockApplications, '')
    expect(result.length).toBe(5)
  })

  it('should filter by company name (case insensitive)', () => {
    const result = filterBySearch(mockApplications, 'stripe')
    expect(result.length).toBe(1)
    expect(result[0].company_name).toBe('Stripe')
  })

  it('should filter by company name (uppercase)', () => {
    const result = filterBySearch(mockApplications, 'FIGMA')
    expect(result.length).toBe(1)
    expect(result[0].company_name).toBe('Figma')
  })

  it('should filter by position title', () => {
    const result = filterBySearch(mockApplications, 'Director')
    expect(result.length).toBe(4) // 4 applications have "Director" in title
  })

  it('should filter by location', () => {
    const result = filterBySearch(mockApplications, 'San Francisco')
    expect(result.length).toBe(3)
  })

  it('should filter by notes content', () => {
    const result = filterBySearch(mockApplications, 'fintech')
    expect(result.length).toBe(2) // Stripe and Plaid have "fintech" in notes
  })

  it('should return empty array when no matches', () => {
    const result = filterBySearch(mockApplications, 'nonexistent')
    expect(result.length).toBe(0)
  })

  it('should handle partial matches', () => {
    const result = filterBySearch(mockApplications, 'Data')
    expect(result.length).toBe(1)
    expect(result[0].company_name).toBe('Databricks')
  })
})

// ============================================================================
// STATUS FILTER TESTS
// ============================================================================

describe('Status Filter', () => {
  it('should return all applications when no statuses selected', () => {
    const result = filterByStatus(mockApplications, [])
    expect(result.length).toBe(5)
  })

  it('should filter by single status', () => {
    const result = filterByStatus(mockApplications, ['prepared'])
    expect(result.length).toBe(1)
    expect(result[0].application_status).toBe('prepared')
  })

  it('should filter by multiple statuses', () => {
    const result = filterByStatus(mockApplications, ['applied', 'interview_scheduled'])
    expect(result.length).toBe(2)
    expect(result.every((app) => ['applied', 'interview_scheduled'].includes(app.application_status))).toBe(true)
  })

  it('should filter by rejected status', () => {
    const result = filterByStatus(mockApplications, ['rejected'])
    expect(result.length).toBe(1)
    expect(result[0].company_name).toBe('Linear')
  })

  it('should filter by offer_received status', () => {
    const result = filterByStatus(mockApplications, ['offer_received'])
    expect(result.length).toBe(1)
    expect(result[0].company_name).toBe('Databricks')
  })

  it('should return empty array for status with no applications', () => {
    const result = filterByStatus(mockApplications, ['withdrawn'])
    expect(result.length).toBe(0)
  })
})

// ============================================================================
// DATE RANGE FILTER TESTS
// ============================================================================

describe('Date Range Filter', () => {
  it('should return all applications when no dates specified', () => {
    const result = filterByDateRange(mockApplications, '', '')
    expect(result.length).toBe(5)
  })

  it('should filter by from date only', () => {
    const result = filterByDateRange(mockApplications, '2026-01-27', '')
    expect(result.length).toBe(2) // Stripe (Jan 27) and Plaid (Jan 28)
    expect(result.map((a) => a.company_name).sort()).toEqual(['Plaid', 'Stripe'])
  })

  it('should filter by to date only', () => {
    const result = filterByDateRange(mockApplications, '', '2026-01-25')
    expect(result.length).toBe(2) // Linear (Jan 25) and Databricks (Jan 24)
    expect(result.map((a) => a.company_name).sort()).toEqual(['Databricks', 'Linear'])
  })

  it('should filter by date range', () => {
    const result = filterByDateRange(mockApplications, '2026-01-25', '2026-01-26')
    expect(result.length).toBe(2) // Linear (Jan 25) and Figma (Jan 26)
    expect(result.map((a) => a.company_name).sort()).toEqual(['Figma', 'Linear'])
  })

  it('should filter single day range', () => {
    const result = filterByDateRange(mockApplications, '2026-01-27', '2026-01-27')
    expect(result.length).toBe(1)
    expect(result[0].company_name).toBe('Stripe')
  })

  it('should return empty for impossible date range', () => {
    const result = filterByDateRange(mockApplications, '2026-02-01', '2026-02-28')
    expect(result.length).toBe(0)
  })
})

// ============================================================================
// SORT TESTS
// ============================================================================

describe('Sort Applications', () => {
  it('should sort by newest first (default)', () => {
    const result = sortApplications(mockApplications, 'newest')
    expect(result[0].company_name).toBe('Plaid') // Jan 28
    expect(result[1].company_name).toBe('Stripe') // Jan 27
    expect(result[4].company_name).toBe('Databricks') // Jan 24
  })

  it('should sort by oldest first', () => {
    const result = sortApplications(mockApplications, 'oldest')
    expect(result[0].company_name).toBe('Databricks') // Jan 24
    expect(result[4].company_name).toBe('Plaid') // Jan 28
  })

  it('should sort by company name A-Z', () => {
    const result = sortApplications(mockApplications, 'company_asc')
    expect(result[0].company_name).toBe('Databricks')
    expect(result[1].company_name).toBe('Figma')
    expect(result[2].company_name).toBe('Linear')
    expect(result[3].company_name).toBe('Plaid')
    expect(result[4].company_name).toBe('Stripe')
  })

  it('should sort by company name Z-A', () => {
    const result = sortApplications(mockApplications, 'company_desc')
    expect(result[0].company_name).toBe('Stripe')
    expect(result[4].company_name).toBe('Databricks')
  })

  it('should sort by status alphabetically', () => {
    const result = sortApplications(mockApplications, 'status')
    // Status order: applied, interview_scheduled, offer_received, prepared, rejected
    expect(result[0].application_status).toBe('applied')
    expect(result[1].application_status).toBe('interview_scheduled')
    expect(result[2].application_status).toBe('offer_received')
    expect(result[3].application_status).toBe('prepared')
    expect(result[4].application_status).toBe('rejected')
  })

  it('should not mutate original array', () => {
    const originalFirst = mockApplications[0].company_name
    sortApplications(mockApplications, 'company_asc')
    expect(mockApplications[0].company_name).toBe(originalFirst)
  })
})

// ============================================================================
// COMBINED FILTER TESTS
// ============================================================================

describe('Combined Filters', () => {
  it('should apply search and status filter together', () => {
    const searchFiltered = filterBySearch(mockApplications, 'San Francisco')
    const result = filterByStatus(searchFiltered, ['applied'])
    expect(result.length).toBe(1)
    expect(result[0].company_name).toBe('Figma')
  })

  it('should apply search and date range together', () => {
    const searchFiltered = filterBySearch(mockApplications, 'Director')
    const result = filterByDateRange(searchFiltered, '2026-01-26', '2026-01-28')
    expect(result.length).toBe(3) // Stripe, Figma, Plaid
  })

  it('should apply all filters and sort', () => {
    let result = filterBySearch(mockApplications, 'product')
    result = filterByDateRange(result, '2026-01-24', '2026-01-27')
    result = sortApplications(result, 'newest')

    // Linear (Head of Product), Stripe, Figma, Databricks all have "Product" in title
    expect(result.length).toBe(4)
    expect(result[0].company_name).toBe('Stripe') // Jan 27
    expect(result[3].company_name).toBe('Databricks') // Jan 24
  })

  it('should return empty when filters exclude all', () => {
    const searchFiltered = filterBySearch(mockApplications, 'Stripe')
    const result = filterByStatus(searchFiltered, ['rejected'])
    expect(result.length).toBe(0)
  })
})
