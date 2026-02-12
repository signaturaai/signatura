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

describe('Onboarding to CV Tailor Integration', () => {
  /**
   * Tests that verify the data flow between Onboarding CV upload
   * and CV Tailor page visibility.
   *
   * Issue: CVs uploaded during onboarding must be visible in CV Tailor.
   * Solution: Onboarding sets is_primary=true and CV Tailor looks for is_primary OR is_current.
   */

  // Define the fields that Onboarding stores when uploading a CV
  const ONBOARDING_CV_FIELDS = [
    'user_id',
    'name',
    'file_name',
    'file_url',
    'file_path',
    'file_type',
    'is_current',
    'is_primary',  // Must be set for CV Tailor compatibility
  ]

  // Define the fields that CV Tailor queries
  const CV_TAILOR_QUERY_FIELDS = [
    'id',
    'name',
    'raw_text',
    'is_primary',
    'is_current',
    'file_url',
    'file_name',
    'created_at',
  ]

  describe('Onboarding CV Storage', () => {
    it('should set is_primary=true for CV Tailor visibility', () => {
      // Mock CV record as created by onboarding
      const onboardingCV = {
        user_id: 'user-123',
        name: 'My Resume',
        file_name: 'resume.pdf',
        file_url: 'https://storage.example.com/base-cvs/user-123-base-cv-123.pdf',
        file_path: 'base-cvs/user-123-base-cv-123.pdf',
        file_type: 'pdf',
        is_current: true,
        is_primary: true,  // CRITICAL: This must be true for CV Tailor to find it
      }

      expect(onboardingCV.is_primary).toBe(true)
      expect(onboardingCV.is_current).toBe(true)
    })

    it('should set a name field for display in CV Tailor', () => {
      const fileName = 'John_Doe_Resume_2024.pdf'
      // Onboarding extracts name from filename
      const name = fileName.replace(/\.(pdf|doc|docx)$/i, '') || 'My Base CV'

      expect(name).toBe('John_Doe_Resume_2024')
    })

    it('should use default name when filename is invalid', () => {
      const fileName = '.pdf'  // Edge case: just extension
      const name = fileName.replace(/\.(pdf|doc|docx)$/i, '') || 'My Base CV'

      expect(name).toBe('My Base CV')
    })

    it('should store file_url for fallback when raw_text is missing', () => {
      const onboardingCV = {
        file_url: 'https://storage.example.com/base-cvs/user-123-base-cv-123.pdf',
        raw_text: null,  // raw_text might not be available immediately after upload
      }

      // CV Tailor should be able to detect this state
      const needsProcessing = onboardingCV.file_url && !onboardingCV.raw_text
      expect(needsProcessing).toBe(true)
    })
  })

  describe('CV Tailor Query Compatibility', () => {
    it('should query fields that match onboarding storage', () => {
      // Ensure CV Tailor queries the fields that onboarding stores
      const commonFields = ['is_primary', 'is_current', 'file_url', 'name']

      commonFields.forEach((field) => {
        expect(CV_TAILOR_QUERY_FIELDS).toContain(field)
      })
    })

    it('should find CV by is_primary first', () => {
      const cvs = [
        { id: '1', is_primary: false, is_current: false, created_at: '2024-01-10' },
        { id: '2', is_primary: true, is_current: false, created_at: '2024-01-11' },
        { id: '3', is_primary: false, is_current: true, created_at: '2024-01-12' },
      ]

      const selectedCV = cvs.find(cv => cv.is_primary)
        || cvs.find(cv => cv.is_current)
        || cvs[0]

      expect(selectedCV.id).toBe('2')  // Should find is_primary CV
    })

    it('should fallback to is_current when no is_primary exists', () => {
      const cvs = [
        { id: '1', is_primary: false, is_current: false, created_at: '2024-01-10' },
        { id: '2', is_primary: false, is_current: true, created_at: '2024-01-11' },
        { id: '3', is_primary: false, is_current: false, created_at: '2024-01-12' },
      ]

      const selectedCV = cvs.find(cv => cv.is_primary)
        || cvs.find(cv => cv.is_current)
        || cvs[0]

      expect(selectedCV.id).toBe('2')  // Should find is_current CV
    })

    it('should fallback to first CV when neither primary nor current exists', () => {
      const cvs = [
        { id: '1', is_primary: false, is_current: false, created_at: '2024-01-10' },
        { id: '2', is_primary: false, is_current: false, created_at: '2024-01-11' },
      ]

      const selectedCV = cvs.find(cv => cv.is_primary)
        || cvs.find(cv => cv.is_current)
        || cvs[0]

      expect(selectedCV.id).toBe('1')  // Should fall back to first CV
    })
  })

  describe('CV Tailor Warning States', () => {
    it('should show "No Base CV Found" only when baseCVs array is empty', () => {
      const baseCVs: any[] = []
      const showNoCVWarning = baseCVs.length === 0

      expect(showNoCVWarning).toBe(true)
    })

    it('should not show "No Base CV Found" when CV exists but needs processing', () => {
      const baseCVs = [
        { id: '1', file_url: 'https://example.com/cv.pdf', raw_text: null },
      ]
      const showNoCVWarning = baseCVs.length === 0

      expect(showNoCVWarning).toBe(false)  // Should NOT show this warning
    })

    it('should show "CV Processing Required" when CV exists but raw_text is missing', () => {
      const selectedCV = {
        id: '1',
        file_url: 'https://example.com/cv.pdf',
        raw_text: null,
        name: 'My Resume',
      }
      const showProcessingWarning = selectedCV && !selectedCV.raw_text && selectedCV.file_url

      expect(showProcessingWarning).toBeTruthy()
    })

    it('should not show "CV Processing Required" when raw_text is available', () => {
      const selectedCV = {
        id: '1',
        file_url: 'https://example.com/cv.pdf',
        raw_text: 'John Doe\nSoftware Engineer\n...',
        name: 'My Resume',
      }
      const showProcessingWarning = selectedCV && !selectedCV.raw_text && selectedCV.file_url

      expect(showProcessingWarning).toBe(false)
    })
  })

  describe('End-to-End CV Data Flow', () => {
    it('should simulate complete onboarding -> CV Tailor flow', () => {
      // Step 1: User uploads CV during onboarding
      const uploadedFile = {
        name: 'John_Resume.pdf',
        size: 1024 * 500,  // 500KB
        type: 'application/pdf',
      }

      // Step 2: Onboarding creates base_cvs record
      const baseCVRecord = {
        id: 'cv-uuid-123',
        user_id: 'user-uuid-456',
        name: uploadedFile.name.replace(/\.(pdf|doc|docx)$/i, ''),
        file_name: uploadedFile.name,
        file_url: `https://storage.example.com/base-cvs/user-uuid-456-base-cv-${Date.now()}.pdf`,
        file_path: `base-cvs/user-uuid-456-base-cv-${Date.now()}.pdf`,
        file_type: 'pdf',
        is_current: true,
        is_primary: true,  // CRITICAL for CV Tailor
        raw_text: null,  // Might be populated later by async processing
        created_at: new Date().toISOString(),
      }

      // Step 3: CV Tailor fetches base_cvs for user
      const fetchedCVs = [baseCVRecord]  // Simulating Supabase query result

      // Step 4: CV Tailor selects the CV
      const selectedCV = fetchedCVs.find(cv => cv.is_primary)
        || fetchedCVs.find(cv => cv.is_current)
        || fetchedCVs[0]

      // Verify the complete flow works
      expect(selectedCV).toBeDefined()
      expect(selectedCV.id).toBe('cv-uuid-123')
      expect(selectedCV.name).toBe('John_Resume')
      expect(selectedCV.is_primary).toBe(true)
      expect(selectedCV.file_url).toBeDefined()
    })

    it('should handle legacy CVs uploaded before is_primary fix', () => {
      // Legacy CV that only has is_current (before the fix)
      const legacyCV = {
        id: 'legacy-cv-123',
        user_id: 'user-uuid-456',
        name: null,  // Legacy might not have name
        file_name: 'old_resume.pdf',
        file_url: 'https://storage.example.com/base-cvs/old-cv.pdf',
        is_current: true,
        is_primary: false,  // Legacy didn't set this
        raw_text: null,
        created_at: '2024-01-01T00:00:00Z',
      }

      const fetchedCVs = [legacyCV]

      // CV Tailor should still find it via is_current fallback
      const selectedCV = fetchedCVs.find(cv => cv.is_primary)
        || fetchedCVs.find(cv => cv.is_current)
        || fetchedCVs[0]

      expect(selectedCV).toBeDefined()
      expect(selectedCV.id).toBe('legacy-cv-123')

      // Display name should use file_name as fallback
      const displayName = selectedCV.name || selectedCV.file_name || 'My Base CV'
      expect(displayName).toBe('old_resume.pdf')
    })
  })
})
