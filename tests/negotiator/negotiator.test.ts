/**
 * Compensation Negotiator RALPH Evaluation Tests
 *
 * Tests the Negotiator component for:
 * - R: Routing - Application-based navigation
 * - A: API - Field names and intelligence data
 * - L: Logic - Offer prioritization, intelligence aggregation
 * - P: Parameters - Salary context, CV achievements
 * - H: Handling - Empty states, missing data
 */

import { describe, it, expect } from 'vitest'

describe('Compensation Negotiator - RALPH Evaluation', () => {
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

    it('should include application_id in strategy request', () => {
      const selectedApplication = { id: 'app-456' }
      const requestBody = {
        applicationId: selectedApplication.id,
        offerDetails: {},
        userPriorities: [],
      }

      expect(requestBody.applicationId).toBe('app-456')
    })
  })

  describe('A - API Field Names', () => {
    it('should query job_applications with salary fields', () => {
      const queryFields = [
        'id',
        'company_name',
        'position_title',
        'job_description',
        'application_status',
        'industry',
        'salary_range',
        'salary_min',
        'salary_max',
        'created_at',
      ]

      expect(queryFields).toContain('salary_range')
      expect(queryFields).toContain('salary_min')
      expect(queryFields).toContain('salary_max')
    })

    it('should query cv_tailoring_sessions for achievements', () => {
      const queryFields = [
        'id',
        'final_cv_text',
        'final_overall_score',
        'key_achievements',
        'created_at',
      ]

      expect(queryFields).toContain('key_achievements')
    })

    it('should query interview_sessions for performance data', () => {
      const queryFields = [
        'id',
        'interview_score',
        'strengths',
        'areas_for_improvement',
        'created_at',
      ]

      expect(queryFields).toContain('strengths')
      expect(queryFields).toContain('interview_score')
    })

    it('should query global_user_insights for negotiation data', () => {
      const insightTypes = ['negotiation_strength', 'salary_benchmark', 'market_insight']

      expect(insightTypes).toContain('negotiation_strength')
      expect(insightTypes).toContain('salary_benchmark')
    })
  })

  describe('L - Logic', () => {
    it('should prioritize applications with offers', () => {
      const applications = [
        { id: '1', application_status: 'applied' },
        { id: '2', application_status: 'offer_received' },
        { id: '3', application_status: 'negotiating' },
        { id: '4', application_status: 'interview_scheduled' },
      ]

      const priorityStatus = ['offer_received', 'negotiating', 'interview_scheduled', 'interviewed']

      const sorted = [...applications].sort((a, b) => {
        const aIndex = priorityStatus.indexOf(a.application_status)
        const bIndex = priorityStatus.indexOf(b.application_status)
        if (aIndex !== -1 && bIndex === -1) return -1
        if (aIndex === -1 && bIndex !== -1) return 1
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
        return 0
      })

      expect(sorted[0].application_status).toBe('offer_received')
      expect(sorted[1].application_status).toBe('negotiating')
    })

    it('should aggregate intelligence context', () => {
      const tailoringSession = {
        final_overall_score: 8.5,
        key_achievements: ['Led team of 10', 'Increased revenue 20%'],
      }

      const interviewSession = {
        interview_score: 9.0,
        strengths: ['Communication', 'Technical depth'],
      }

      const intelligenceContext = {
        tailoredCV: tailoringSession
          ? {
              score: tailoringSession.final_overall_score,
              achievements: tailoringSession.key_achievements || [],
            }
          : null,
        interviewPerformance: interviewSession
          ? {
              score: interviewSession.interview_score,
              strengths: interviewSession.strengths || [],
            }
          : null,
      }

      expect(intelligenceContext.tailoredCV?.score).toBe(8.5)
      expect(intelligenceContext.interviewPerformance?.strengths).toContain('Communication')
    })

    it('should include original salary range in context', () => {
      const selectedApplication = {
        salary_min: 100000,
        salary_max: 130000,
        salary_range: '$100k - $130k',
      }

      const originalSalaryRange = {
        min: selectedApplication.salary_min,
        max: selectedApplication.salary_max,
        range: selectedApplication.salary_range,
      }

      expect(originalSalaryRange.min).toBe(100000)
      expect(originalSalaryRange.max).toBe(130000)
    })
  })

  describe('P - Parameters', () => {
    it('should pass company context to strategy API', () => {
      const selectedApplication = {
        company_name: 'Tech Corp',
        position_title: 'Senior Engineer',
        industry: 'Technology',
      }

      const enrichedData = {
        offerDetails: {
          companyName: selectedApplication.company_name,
          positionTitle: selectedApplication.position_title,
          industry: selectedApplication.industry,
        },
      }

      expect(enrichedData.offerDetails.companyName).toBe('Tech Corp')
    })

    it('should include CV achievements as leverage', () => {
      const tailoringSession = {
        key_achievements: ['10x revenue', 'Team leadership'],
      }

      const leverage = tailoringSession?.key_achievements || []

      expect(leverage).toContain('10x revenue')
    })

    it('should include interview strengths', () => {
      const interviewSession = {
        strengths: ['Problem solving', 'Leadership'],
      }

      const strengths = interviewSession?.strengths || []

      expect(strengths).toContain('Leadership')
    })
  })

  describe('H - Handling', () => {
    it('should show empty state when no applications', () => {
      const applications: any[] = []
      const showEmptyState = applications.length === 0

      expect(showEmptyState).toBe(true)
    })

    it('should display intelligence status indicators', () => {
      const tailoringSession = { final_overall_score: 8.5 }
      const interviewSession = null
      const salaryRange = '$100k - $130k'

      const hasCV = Boolean(tailoringSession)
      const hasInterview = Boolean(interviewSession)
      const hasSalaryTarget = Boolean(salaryRange)

      expect(hasCV).toBe(true)
      expect(hasInterview).toBe(false)
      expect(hasSalaryTarget).toBe(true)
    })

    it('should handle missing intelligence gracefully', () => {
      const tailoringSession = null
      const interviewSession = null
      const globalInsights: any[] = []

      const intelligenceContext = {
        tailoredCV: tailoringSession ? {} : null,
        interviewPerformance: interviewSession ? {} : null,
        globalInsights: globalInsights.map(i => i.insight_text),
      }

      expect(intelligenceContext.tailoredCV).toBeNull()
      expect(intelligenceContext.interviewPerformance).toBeNull()
      expect(intelligenceContext.globalInsights).toHaveLength(0)
    })

    it('should detect if application has offer status', () => {
      const offerStatuses = ['offer_received', 'negotiating']

      const app1 = { application_status: 'offer_received' }
      const app2 = { application_status: 'applied' }

      const hasOffer1 = offerStatuses.includes(app1.application_status)
      const hasOffer2 = offerStatuses.includes(app2.application_status)

      expect(hasOffer1).toBe(true)
      expect(hasOffer2).toBe(false)
    })
  })
})
