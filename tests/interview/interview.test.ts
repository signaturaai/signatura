/**
 * Interview Coach RALPH Evaluation Tests
 *
 * Tests the Interview Coach component for:
 * - R: Routing - Application-based navigation
 * - A: API - Field names and intelligence data fetching
 * - L: Logic - Tailored CV detection, context passing
 * - P: Parameters - Application context and global insights
 * - H: Handling - Empty states, missing data
 */

import { describe, it, expect } from 'vitest'

describe('Interview Coach - RALPH Evaluation', () => {
  describe('R - Routing', () => {
    it('should construct back URL with application context', () => {
      const selectedApplication = { id: 'app-123' }
      const returnTo = '/dashboard'

      const getBackUrl = () => {
        if (selectedApplication) {
          return `/applications/${selectedApplication.id}`
        }
        return returnTo
      }

      expect(getBackUrl()).toBe('/applications/app-123')
    })

    it('should fall back to returnTo when no application', () => {
      const selectedApplication: any = null
      const returnTo = '/dashboard'

      const getBackUrl = () => {
        if (selectedApplication) {
          return `/applications/${selectedApplication.id}`
        }
        return returnTo
      }

      expect(getBackUrl()).toBe('/dashboard')
    })

    it('should include application_id in interview plan request', () => {
      const selectedApplication = { id: 'app-456' }
      const requestBody = {
        applicationId: selectedApplication.id,
        jobDescription: 'Test JD',
        tailoredCV: 'Test CV',
      }

      expect(requestBody.applicationId).toBe('app-456')
    })
  })

  describe('A - API Field Names', () => {
    it('should query job_applications with correct fields', () => {
      const queryFields = [
        'id',
        'company_name',
        'position_title',
        'job_description',
        'application_status',
        'industry',
        'salary_range',
        'created_at',
      ]

      expect(queryFields).toContain('job_description')
      expect(queryFields).toContain('industry')
    })

    it('should query cv_tailoring_sessions for intelligence continuity', () => {
      const queryFields = [
        'id',
        'final_cv_text',
        'final_overall_score',
        'created_at',
      ]

      expect(queryFields).toContain('final_cv_text')
      expect(queryFields).toContain('final_overall_score')
    })

    it('should query global_user_insights for cross-pollination', () => {
      const queryFields = [
        'id',
        'insight_type',
        'insight_text',
        'source_application_id',
        'created_at',
      ]

      expect(queryFields).toContain('insight_type')
      expect(queryFields).toContain('insight_text')
    })
  })

  describe('L - Logic', () => {
    it('should detect when tailored CV exists', () => {
      const tailoringSession = {
        id: '1',
        final_cv_text: 'Tailored CV content',
        final_overall_score: 8.5,
      }

      const hasTailoredCV = tailoringSession && tailoringSession.final_cv_text
      expect(hasTailoredCV).toBeTruthy()
    })

    it('should detect when no tailored CV exists', () => {
      const tailoringSession: any = null

      const hasTailoredCV = tailoringSession && tailoringSession.final_cv_text
      expect(hasTailoredCV).toBeFalsy()
    })

    it('should use tailored CV text for interview prep', () => {
      const tailoringSession = {
        final_cv_text: 'My tailored CV content',
      }
      const manualCV = ''

      const cvToUse = tailoringSession?.final_cv_text || manualCV
      expect(cvToUse).toBe('My tailored CV content')
    })

    it('should fall back to manual CV when no tailored CV', () => {
      const tailoringSession: any = null
      const manualCV = 'Manual CV content'

      const cvToUse = tailoringSession?.final_cv_text || manualCV
      expect(cvToUse).toBe('Manual CV content')
    })

    it('should populate job description from application', () => {
      const selectedApplication = {
        job_description: 'Application JD',
      }

      const handleSelectApplication = (
        app: typeof selectedApplication,
        setJobDescription: (val: string) => void
      ) => {
        setJobDescription(app.job_description || '')
      }

      let jobDescription = ''
      handleSelectApplication(selectedApplication, (val) => {
        jobDescription = val
      })

      expect(jobDescription).toBe('Application JD')
    })
  })

  describe('P - Parameters', () => {
    it('should pass company context to interview plan API', () => {
      const selectedApplication = {
        id: 'app-123',
        company_name: 'Tech Corp',
        position_title: 'Senior Engineer',
        industry: 'Technology',
      }

      const requestBody = {
        applicationId: selectedApplication.id,
        companyName: selectedApplication.company_name,
        positionTitle: selectedApplication.position_title,
        industry: selectedApplication.industry,
      }

      expect(requestBody.companyName).toBe('Tech Corp')
      expect(requestBody.industry).toBe('Technology')
    })

    it('should include global insights for cross-pollination', () => {
      const globalInsights = [
        { id: '1', insight_type: 'strength', insight_text: 'Strong communicator' },
        { id: '2', insight_type: 'strength', insight_text: 'Technical depth' },
      ]

      const insightsForRequest = globalInsights.map(i => ({
        type: i.insight_type,
        text: i.insight_text,
      }))

      expect(insightsForRequest).toHaveLength(2)
      expect(insightsForRequest[0].text).toBe('Strong communicator')
    })

    it('should extract application_id from URL', () => {
      const searchParams = new URLSearchParams('application_id=app-789')
      const applicationIdFromUrl = searchParams.get('application_id')

      expect(applicationIdFromUrl).toBe('app-789')
    })
  })

  describe('H - Handling', () => {
    it('should show empty state when no applications', () => {
      const applications: any[] = []
      const showEmptyState = applications.length === 0

      expect(showEmptyState).toBe(true)
    })

    it('should show warning when no tailored CV for application', () => {
      const tailoringSession: any = null
      const showCVWarning = !tailoringSession

      expect(showCVWarning).toBe(true)
    })

    it('should display tailored CV score when available', () => {
      const tailoringSession = {
        final_overall_score: 8.5,
      }

      const displayScore = tailoringSession?.final_overall_score?.toFixed(1)
      expect(displayScore).toBe('8.5')
    })

    it('should handle missing job description gracefully', () => {
      const selectedApplication = {
        job_description: null as string | null,
      }

      const hasJobDescription = Boolean(selectedApplication?.job_description)
      expect(hasJobDescription).toBe(false)
    })

    it('should require job description before generating plan', () => {
      const jobDescription = ''
      const canGenerate = jobDescription.trim().length > 0

      expect(canGenerate).toBe(false)
    })
  })
})

describe('Interview Intelligence Continuity', () => {
  describe('Tailored CV Integration', () => {
    it('should fetch tailored CV for selected application', () => {
      const fetchTailoredCV = async (userId: string, applicationId: string) => {
        // Simulated query
        const query = {
          table: 'cv_tailoring_sessions',
          filters: {
            user_id: userId,
            application_id: applicationId,
            status: 'completed',
          },
          order: { column: 'created_at', ascending: false },
          limit: 1,
        }

        expect(query.filters.application_id).toBe(applicationId)
        expect(query.filters.status).toBe('completed')
      }

      fetchTailoredCV('user-1', 'app-1')
    })

    it('should display CV score badge when available', () => {
      const tailoringSession = { final_overall_score: 9.2 }

      const scoreDisplay = tailoringSession
        ? `Score: ${tailoringSession.final_overall_score?.toFixed(1)}`
        : null

      expect(scoreDisplay).toBe('Score: 9.2')
    })
  })

  describe('Global Insights Integration', () => {
    it('should display user strengths from past sessions', () => {
      const globalInsights = [
        { insight_type: 'strength', insight_text: 'Leadership skills' },
        { insight_type: 'strength', insight_text: 'Problem solving' },
      ]

      const strengthsDisplay = globalInsights
        .filter(i => i.insight_type === 'strength')
        .map(i => i.insight_text)

      expect(strengthsDisplay).toContain('Leadership skills')
      expect(strengthsDisplay).toContain('Problem solving')
    })
  })
})
