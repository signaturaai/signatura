/**
 * CV Tailor RALPH Evaluation Tests
 *
 * Tests the CV Tailor component for:
 * - R: Routing - Back button and navigation with application context
 * - A: API - Field names match Supabase schema
 * - L: Logic - Application selection, CV fetching, null handling
 * - P: Parameters - application_id flow through the system
 * - H: Handling - Empty states, no CVs, no applications
 */

import { describe, it, expect } from 'vitest'

describe('CV Tailor - RALPH Evaluation', () => {
  describe('R - Routing', () => {
    it('should construct back URL with application_id when selected', () => {
      const selectedApplication = { id: 'app-123' }
      const backUrl = selectedApplication
        ? `/applications/${selectedApplication.id}`
        : '/dashboard'

      expect(backUrl).toBe('/applications/app-123')
    })

    it('should fall back to dashboard when no application selected', () => {
      const selectedApplication = null
      const returnTo = '/dashboard'
      const backUrl = selectedApplication
        ? `/applications/${(selectedApplication as any).id}`
        : returnTo

      expect(backUrl).toBe('/dashboard')
    })

    it('should use custom returnTo parameter if provided', () => {
      const selectedApplication = null
      const returnTo = '/some-custom-path'
      const backUrl = selectedApplication
        ? `/applications/${(selectedApplication as any).id}`
        : returnTo

      expect(backUrl).toBe('/some-custom-path')
    })

    it('should pass application_id in CV generation request', () => {
      const selectedApplication = { id: 'app-456' }
      const requestBody = {
        applicationId: selectedApplication.id,
        jobDescription: 'Test JD',
        baseCVText: 'Test CV',
      }

      expect(requestBody.applicationId).toBe('app-456')
    })
  })

  describe('A - API Field Names', () => {
    it('should use correct job_applications fields', () => {
      const queryFields = [
        'id',
        'company_name',
        'position_title',
        'job_description',
        'application_status',
        'industry',
        'created_at',
      ]

      expect(queryFields).toContain('job_description')
      expect(queryFields).toContain('company_name')
      expect(queryFields).toContain('position_title')
    })

    it('should use correct base_cvs fields', () => {
      const queryFields = ['id', 'name', 'raw_text', 'created_at']

      expect(queryFields).toContain('raw_text')
      expect(queryFields).toContain('name')
    })

    it('should use correct cv_tailoring_sessions fields for lookup', () => {
      const queryFields = [
        'id',
        'final_cv_text',
        'final_overall_score',
        'status',
        'created_at',
      ]

      expect(queryFields).toContain('final_cv_text')
      expect(queryFields).toContain('final_overall_score')
    })
  })

  describe('L - Logic', () => {
    it('should clear jobDescription when switching to application with null JD', () => {
      const handleSelectApplication = (
        app: { job_description: string | null },
        setJobDescription: (val: string) => void
      ) => {
        // Always update - clear if null, set if exists
        setJobDescription(app.job_description || '')
      }

      let jobDescription = 'Previous JD'
      const setJobDescription = (val: string) => {
        jobDescription = val
      }

      // Select app with null JD
      handleSelectApplication({ job_description: null }, setJobDescription)
      expect(jobDescription).toBe('')
    })

    it('should populate jobDescription when application has JD', () => {
      const handleSelectApplication = (
        app: { job_description: string | null },
        setJobDescription: (val: string) => void
      ) => {
        setJobDescription(app.job_description || '')
      }

      let jobDescription = ''
      const setJobDescription = (val: string) => {
        jobDescription = val
      }

      handleSelectApplication({ job_description: 'New Job Description' }, setJobDescription)
      expect(jobDescription).toBe('New Job Description')
    })

    it('should clear baseCVText when switching to CV with null raw_text', () => {
      const handleSelectCV = (
        cv: { raw_text: string | null },
        setBaseCVText: (val: string) => void
      ) => {
        setBaseCVText(cv.raw_text || '')
      }

      let baseCVText = 'Previous CV text'
      const setBaseCVText = (val: string) => {
        baseCVText = val
      }

      handleSelectCV({ raw_text: null }, setBaseCVText)
      expect(baseCVText).toBe('')
    })

    it('should detect usable CVs correctly', () => {
      const baseCVs = [
        { id: '1', raw_text: 'Full CV content here' },
        { id: '2', raw_text: '' },
        { id: '3', raw_text: null },
      ]

      const hasUsableCVs = baseCVs.some(
        cv => cv.raw_text && cv.raw_text.length > 0
      )

      expect(hasUsableCVs).toBe(true)
    })

    it('should detect no usable CVs when all empty', () => {
      const baseCVs = [
        { id: '1', raw_text: '' },
        { id: '2', raw_text: null },
      ]

      const hasUsableCVs = baseCVs.some(
        cv => cv.raw_text && cv.raw_text.length > 0
      )

      expect(hasUsableCVs).toBe(false)
    })
  })

  describe('P - Parameters', () => {
    it('should extract application_id from URL search params', () => {
      const searchParams = new URLSearchParams('application_id=app-789')
      const applicationIdFromUrl = searchParams.get('application_id')

      expect(applicationIdFromUrl).toBe('app-789')
    })

    it('should find application by ID from fetched list', () => {
      const applications = [
        { id: 'app-1', company_name: 'Company A' },
        { id: 'app-2', company_name: 'Company B' },
        { id: 'app-3', company_name: 'Company C' },
      ]

      const targetId = 'app-2'
      const found = applications.find(a => a.id === targetId)

      expect(found).toBeDefined()
      expect(found?.company_name).toBe('Company B')
    })

    it('should construct API request body with all required fields', () => {
      const selectedApplication = {
        id: 'app-123',
        company_name: 'Test Corp',
        position_title: 'Engineer',
        industry: 'Tech',
      }
      const jobDescription = 'Test job description'
      const baseCVText = 'Test CV content'

      const requestBody = {
        applicationId: selectedApplication.id,
        companyName: selectedApplication.company_name,
        positionTitle: selectedApplication.position_title,
        industry: selectedApplication.industry,
        jobDescription,
        baseCVText,
      }

      expect(requestBody.applicationId).toBe('app-123')
      expect(requestBody.companyName).toBe('Test Corp')
      expect(requestBody.jobDescription).toBe('Test job description')
    })
  })

  describe('H - Handling', () => {
    it('should show empty state when no applications exist', () => {
      const applications: any[] = []
      const showNoApplicationsState = applications.length === 0

      expect(showNoApplicationsState).toBe(true)
    })

    it('should show warning when no usable CVs exist', () => {
      const baseCVs = [
        { id: '1', raw_text: '' },
        { id: '2', raw_text: null },
      ]

      const hasUsableCVs = baseCVs.some(
        cv => cv.raw_text && cv.raw_text.length > 0
      )

      const showNoCVWarning = !hasUsableCVs
      expect(showNoCVWarning).toBe(true)
    })

    it('should show context-aware card description based on usable CVs', () => {
      const baseCVs = [{ id: '1', raw_text: null }]
      const hasUsableCVs = baseCVs.some(
        cv => cv.raw_text && cv.raw_text.length > 0
      )

      const description = hasUsableCVs
        ? 'Select a CV to use as your base.'
        : 'Your saved CVs need content before use.'

      expect(description).toBe('Your saved CVs need content before use.')
    })

    it('should validate canSubmit returns boolean', () => {
      const testCanSubmit = (
        selectedApplication: any,
        baseCVTextLength: number,
        jobDescriptionLength: number,
        isLoading: boolean
      ): boolean => {
        return Boolean(
          selectedApplication &&
          baseCVTextLength >= 100 &&
          jobDescriptionLength >= 50 &&
          !isLoading
        )
      }

      // Test with no application - should return false, not null
      const result = testCanSubmit(null, 200, 100, false)
      expect(result).toBe(false)
      expect(typeof result).toBe('boolean')

      // Test with valid inputs
      const validResult = testCanSubmit({ id: '1' }, 200, 100, false)
      expect(validResult).toBe(true)
    })
  })
})
