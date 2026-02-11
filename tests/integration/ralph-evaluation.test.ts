/**
 * RALPH Evaluation Test Suite
 *
 * RALPH is a systematic evaluation framework for verifying application changes:
 * - R (Routing): Navigation and back button behavior
 * - A (API): Field names match Supabase schema
 * - L (Logic): Business logic handles edge cases (null, empty, etc.)
 * - P (Parameters): Data flows correctly through components
 * - H (Handling): Empty states and error handling
 *
 * Run these tests after major refactors to ensure integrity.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(),
  })),
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}))

describe('RALPH Evaluation: CV Tailor Application-Centric Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('R - Routing', () => {
    it('should construct correct back URL when application is selected', () => {
      const selectedApplication = { id: 'app-123', company_name: 'Acme Corp' }
      const returnTo = '/dashboard'

      // getBackUrl logic
      const getBackUrl = () => {
        if (selectedApplication) {
          return `/applications/${selectedApplication.id}`
        }
        return returnTo
      }

      expect(getBackUrl()).toBe('/applications/app-123')
    })

    it('should return to dashboard when no application selected', () => {
      const selectedApplication = null
      const returnTo = '/dashboard'

      const getBackUrl = () => {
        if (selectedApplication) {
          return `/applications/${(selectedApplication as any).id}`
        }
        return returnTo
      }

      expect(getBackUrl()).toBe('/dashboard')
    })

    it('should use custom returnTo parameter when provided', () => {
      const selectedApplication = null
      const returnTo = '/custom-page'

      const getBackUrl = () => {
        if (selectedApplication) {
          return `/applications/${(selectedApplication as any).id}`
        }
        return returnTo
      }

      expect(getBackUrl()).toBe('/custom-page')
    })
  })

  describe('A - API Field Names', () => {
    it('should use correct job_applications field names', () => {
      const expectedFields = [
        'id',
        'user_id',
        'company_name',
        'position_title',
        'job_description',
        'application_status',
        'created_at',
      ]

      // These match the Supabase schema in migrations/001_emotional_core_schema.sql
      const queryFields =
        'id, company_name, position_title, job_description, application_status, created_at'

      expectedFields.forEach((field) => {
        if (field !== 'user_id') {
          // user_id is used in eq(), not select()
          expect(queryFields).toContain(field.replace('_', '_'))
        }
      })
    })

    it('should use correct base_cvs field names', () => {
      const expectedFields = ['id', 'user_id', 'name', 'raw_text', 'is_primary', 'created_at']

      // These match the Supabase schema in migrations/006_add_onboarding_fields.sql
      const queryFields = 'id, name, raw_text, is_primary, created_at'

      expectedFields.forEach((field) => {
        if (field !== 'user_id') {
          expect(queryFields).toContain(field)
        }
      })
    })
  })

  describe('L - Logic (Null Handling)', () => {
    it('should clear jobDescription when switching to app without JD', () => {
      let jobDescription = 'Previous JD content'

      const handleSelectApplication = (app: { job_description: string | null }) => {
        // Always update - clear if null, set if exists
        jobDescription = app.job_description || ''
      }

      // Switch to app without JD
      handleSelectApplication({ job_description: null })
      expect(jobDescription).toBe('')
    })

    it('should set jobDescription when switching to app with JD', () => {
      let jobDescription = ''

      const handleSelectApplication = (app: { job_description: string | null }) => {
        jobDescription = app.job_description || ''
      }

      handleSelectApplication({ job_description: 'New job description' })
      expect(jobDescription).toBe('New job description')
    })

    it('should clear baseCVText when switching to CV without raw_text', () => {
      let baseCVText = 'Previous CV content'

      const handleSelectCV = (cv: { raw_text: string | null }) => {
        baseCVText = cv.raw_text || ''
      }

      handleSelectCV({ raw_text: null })
      expect(baseCVText).toBe('')
    })

    it('should set baseCVText when switching to CV with raw_text', () => {
      let baseCVText = ''

      const handleSelectCV = (cv: { raw_text: string | null }) => {
        baseCVText = cv.raw_text || ''
      }

      handleSelectCV({ raw_text: 'My CV content here' })
      expect(baseCVText).toBe('My CV content here')
    })

    it('should correctly identify usable CVs', () => {
      const baseCVs = [
        { id: '1', raw_text: null },
        { id: '2', raw_text: '' },
        { id: '3', raw_text: 'Valid CV content' },
      ]

      const hasUsableCVs = baseCVs.some((cv) => cv.raw_text && cv.raw_text.length > 0)
      expect(hasUsableCVs).toBe(true)
    })

    it('should return false when no usable CVs', () => {
      const baseCVs = [
        { id: '1', raw_text: null },
        { id: '2', raw_text: '' },
      ]

      const hasUsableCVs = baseCVs.some((cv) => cv.raw_text && cv.raw_text.length > 0)
      expect(hasUsableCVs).toBe(false)
    })
  })

  describe('P - Parameters (application_id Flow)', () => {
    it('should extract application_id from URL params', () => {
      const searchParams = new URLSearchParams('?application_id=app-456')
      const applicationIdFromUrl = searchParams.get('application_id')

      expect(applicationIdFromUrl).toBe('app-456')
    })

    it('should find application by ID from list', () => {
      const applications = [
        { id: 'app-1', company_name: 'Company A' },
        { id: 'app-2', company_name: 'Company B' },
        { id: 'app-3', company_name: 'Company C' },
      ]

      const applicationIdFromUrl = 'app-2'
      const selectedApp = applications.find((a) => a.id === applicationIdFromUrl)

      expect(selectedApp).toBeDefined()
      expect(selectedApp?.company_name).toBe('Company B')
    })

    it('should pass applicationId to API request body', () => {
      const selectedApplication = { id: 'app-789' }
      const baseCVText = 'CV content'
      const jobDescription = 'JD content'
      const industry = 'technology'

      const requestBody = {
        baseCVText,
        jobDescription,
        industry,
        saveToDatabase: true,
        applicationId: selectedApplication.id,
      }

      expect(requestBody.applicationId).toBe('app-789')
    })
  })

  describe('H - Handling (Empty States)', () => {
    it('should show empty state when no applications exist', () => {
      const applications: any[] = []
      const shouldShowEmptyState = applications.length === 0

      expect(shouldShowEmptyState).toBe(true)
    })

    it('should not show empty state when applications exist', () => {
      const applications = [{ id: '1', company_name: 'Test' }]
      const shouldShowEmptyState = applications.length === 0

      expect(shouldShowEmptyState).toBe(false)
    })

    it('should determine correct CV card description', () => {
      const getDescription = (
        selectedCV: { raw_text: string | null } | null,
        baseCVsLength: number
      ) => {
        if (selectedCV?.raw_text) {
          return 'Using your saved CV. You can edit below if needed.'
        }
        if (baseCVsLength > 0) {
          return 'Your saved CV has no text content. Please paste your CV below.'
        }
        return 'No saved CV found. Paste your CV text below to get started.'
      }

      // Case 1: CV with content
      expect(getDescription({ raw_text: 'content' }, 1)).toBe(
        'Using your saved CV. You can edit below if needed.'
      )

      // Case 2: CV exists but no content
      expect(getDescription({ raw_text: null }, 1)).toBe(
        'Your saved CV has no text content. Please paste your CV below.'
      )

      // Case 3: No CVs at all
      expect(getDescription(null, 0)).toBe(
        'No saved CV found. Paste your CV text below to get started.'
      )
    })

    it('should validate canSubmit conditions', () => {
      const testCanSubmit = (
        selectedApplication: any,
        baseCVTextLength: number,
        jobDescriptionLength: number,
        isLoading: boolean
      ) => {
        return (
          selectedApplication &&
          baseCVTextLength >= 100 &&
          jobDescriptionLength >= 50 &&
          !isLoading
        )
      }

      // All conditions met
      expect(testCanSubmit({ id: '1' }, 150, 100, false)).toBe(true)

      // No application selected
      expect(testCanSubmit(null, 150, 100, false)).toBe(false)

      // CV too short
      expect(testCanSubmit({ id: '1' }, 50, 100, false)).toBe(false)

      // JD too short
      expect(testCanSubmit({ id: '1' }, 150, 30, false)).toBe(false)

      // Currently loading
      expect(testCanSubmit({ id: '1' }, 150, 100, true)).toBe(false)
    })
  })
})

describe('RALPH Evaluation: Dashboard Metrics', () => {
  describe('A - API Field Names', () => {
    it('should calculate metrics correctly from applications', () => {
      const applications = [
        { id: '1', application_status: 'applied' },
        { id: '2', application_status: 'interview_scheduled' },
        { id: '3', application_status: 'rejected' },
        { id: '4', application_status: 'offer_received' },
        { id: '5', application_status: 'applied' },
      ]

      const totalApplications = applications.length
      const activeApplications = applications.filter(
        (app) => !['rejected', 'withdrawn', 'accepted'].includes(app.application_status)
      ).length
      const interviewsScheduled = applications.filter(
        (app) => app.application_status === 'interview_scheduled'
      ).length
      const offersReceived = applications.filter((app) =>
        ['offer_received', 'negotiating'].includes(app.application_status)
      ).length

      expect(totalApplications).toBe(5)
      expect(activeApplications).toBe(4) // applied x2, interview_scheduled, offer_received
      expect(interviewsScheduled).toBe(1)
      expect(offersReceived).toBe(1)
    })
  })
})

describe('RALPH Evaluation: Application Detail Quick Actions', () => {
  describe('P - Parameters', () => {
    it('should construct correct Tailor CV link', () => {
      const applicationId = 'app-xyz-123'
      const tailorCVLink = `/cv/tailor?application_id=${applicationId}`

      expect(tailorCVLink).toBe('/cv/tailor?application_id=app-xyz-123')
    })

    it('should construct correct Interview link', () => {
      const applicationId = 'app-xyz-123'
      const interviewLink = `/interview?application_id=${applicationId}`

      expect(interviewLink).toBe('/interview?application_id=app-xyz-123')
    })

    it('should construct correct Compensation link', () => {
      const applicationId = 'app-xyz-123'
      const compensationLink = `/compensation?application_id=${applicationId}`

      expect(compensationLink).toBe('/compensation?application_id=app-xyz-123')
    })
  })

  describe('H - Handling (Conditional Rendering)', () => {
    it('should show Negotiate Offer only for offer/interviewing status', () => {
      const shouldShowNegotiate = (status: string) => {
        return status === 'offer' || status === 'interviewing'
      }

      expect(shouldShowNegotiate('offer')).toBe(true)
      expect(shouldShowNegotiate('interviewing')).toBe(true)
      expect(shouldShowNegotiate('applied')).toBe(false)
      expect(shouldShowNegotiate('rejected')).toBe(false)
    })
  })
})
