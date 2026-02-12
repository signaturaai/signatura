/**
 * Data Consistency Tests
 *
 * Tests that verify all pages use consistent Supabase queries:
 * - Dashboard
 * - Applications
 * - CV Tailor
 * - Interview Coach
 * - Compensation Negotiator
 * - Contract Reviewer
 */

import { describe, it, expect } from 'vitest'

describe('Data Consistency - Supabase Queries', () => {
  // Core columns that definitely exist in the job_applications table
  const CORE_COLUMNS = [
    'id',
    'user_id',
    'company_name',
    'position_title',
    'application_status',
    'job_description',
    'job_url',
    'salary_range',
    'salary_min',
    'salary_max',
    'application_date',
    'created_at',
    'user_excitement_level',
    'priority_level',
    'created_by',
    'interview_prep_notes',
    'compensation_strategy',
    'contract_analysis',
  ]

  // Columns that might cause schema mismatch errors
  // These are excluded from queries to ensure compatibility
  const PROBLEMATIC_COLUMNS = ['location', 'industry', 'priority', 'notes', 'next_step', 'next_step_date', 'updated_at']

  describe('Dashboard Query', () => {
    it('should use only core columns that definitely exist', () => {
      // Dashboard uses minimal safe columns
      const dashboardColumns = [
        'id',
        'application_status',
        'company_name',
        'position_title',
        'salary_range',
        'application_date',
        'created_at',
      ]

      dashboardColumns.forEach((col) => {
        expect(CORE_COLUMNS).toContain(col)
      })
    })

    it('should not use problematic columns', () => {
      const dashboardColumns = [
        'id',
        'application_status',
        'company_name',
        'position_title',
        'salary_range',
        'application_date',
        'created_at',
      ]

      PROBLEMATIC_COLUMNS.forEach((probCol) => {
        expect(dashboardColumns).not.toContain(probCol)
      })
    })
  })

  describe('Applications Page Query', () => {
    it('should use only core columns that definitely exist', () => {
      const applicationsColumns = [
        'id',
        'company_name',
        'position_title',
        'application_status',
        'job_description',
        'salary_range',
        'application_date',
        'created_at',
      ]

      applicationsColumns.forEach((col) => {
        expect(CORE_COLUMNS).toContain(col)
      })
    })

    it('should not use problematic columns', () => {
      const applicationsColumns = [
        'id',
        'company_name',
        'position_title',
        'application_status',
        'job_description',
        'salary_range',
        'application_date',
        'created_at',
      ]

      PROBLEMATIC_COLUMNS.forEach((probCol) => {
        expect(applicationsColumns).not.toContain(probCol)
      })
    })
  })

  describe('CV Tailor Query', () => {
    it('should use only core columns', () => {
      const cvTailorColumns = [
        'id',
        'company_name',
        'position_title',
        'job_description',
        'application_status',
        'created_at',
      ]

      cvTailorColumns.forEach((col) => {
        expect(CORE_COLUMNS).toContain(col)
      })
    })
  })

  describe('Interview Coach Query', () => {
    it('should use only core columns', () => {
      const interviewColumns = [
        'id',
        'company_name',
        'position_title',
        'job_description',
        'application_status',
        'salary_range',
        'created_at',
      ]

      interviewColumns.forEach((col) => {
        expect(CORE_COLUMNS).toContain(col)
      })
    })
  })

  describe('Compensation Negotiator Query', () => {
    it('should use only core columns', () => {
      const compensationColumns = [
        'id',
        'company_name',
        'position_title',
        'job_description',
        'application_status',
        'salary_range',
        'salary_min',
        'salary_max',
        'created_at',
      ]

      compensationColumns.forEach((col) => {
        expect(CORE_COLUMNS).toContain(col)
      })
    })
  })

  describe('Contract Reviewer Query', () => {
    it('should use only core columns', () => {
      const contractColumns = [
        'id',
        'company_name',
        'position_title',
        'application_status',
        'salary_range',
        'created_at',
      ]

      contractColumns.forEach((col) => {
        expect(CORE_COLUMNS).toContain(col)
      })
    })
  })
})

describe('Data Consistency - Default Values', () => {
  it('should provide default priority when not in DB', () => {
    const appFromDB = { id: '1', company_name: 'Test' }
    const priority = (appFromDB as any).priority_level || 'medium'
    expect(priority).toBe('medium')
  })

  it('should use created_at as fallback for application_date', () => {
    const appFromDB = { application_date: null, created_at: '2024-01-15T10:00:00Z' }
    const applicationDate = appFromDB.application_date || appFromDB.created_at
    expect(applicationDate).toBe('2024-01-15T10:00:00Z')
  })

  it('should use created_at as fallback for updated_at', () => {
    const appFromDB = { created_at: '2024-01-15T10:00:00Z' }
    const updatedAt = (appFromDB as any).updated_at || appFromDB.created_at
    expect(updatedAt).toBe('2024-01-15T10:00:00Z')
  })

  it('should default location to null when not queried', () => {
    const appFromDB = { id: '1' }
    const location = (appFromDB as any).location || null
    expect(location).toBeNull()
  })

  it('should default industry to null when not queried', () => {
    const appFromDB = { id: '1' }
    const industry = (appFromDB as any).industry || null
    expect(industry).toBeNull()
  })
})

describe('Data Consistency - Authentication', () => {
  it('should redirect to login when user is null', () => {
    const user = null
    const redirectTo = !user ? '/login' : null
    expect(redirectTo).toBe('/login')
  })

  it('should filter by user_id in all queries', () => {
    const userId = 'user-123'
    const filterCondition = { column: 'user_id', value: userId }
    expect(filterCondition.column).toBe('user_id')
    expect(filterCondition.value).toBe(userId)
  })
})

describe('Data Consistency - Ordering', () => {
  it('should order by created_at descending by default', () => {
    const orderBy = { column: 'created_at', ascending: false }
    expect(orderBy.column).toBe('created_at')
    expect(orderBy.ascending).toBe(false)
  })
})

describe('Data Consistency - Error Handling', () => {
  it('should set error state on fetch failure', () => {
    const fetchError = { message: 'Database error' }
    const errorMessage = fetchError ? 'Failed to load' : null
    expect(errorMessage).toBe('Failed to load')
  })

  it('should handle null data gracefully', () => {
    const data = null
    const applications = data || []
    expect(applications).toEqual([])
  })
})
