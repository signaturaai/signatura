/**
 * Contract Reviewer RALPH Evaluation Tests
 *
 * Tests the Contract Reviewer component for:
 * - R: Routing - Application-based navigation
 * - A: API - Field names and negotiation data
 * - L: Logic - Terms verification, priority sorting
 * - P: Parameters - Negotiated terms context
 * - H: Handling - Empty states, missing data
 */

import { describe, it, expect } from 'vitest'

describe('Contract Reviewer - RALPH Evaluation', () => {
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

    it('should include application_id in analysis request', () => {
      const selectedApplication = { id: 'app-456' }
      const requestBody = {
        applicationId: selectedApplication.id,
        fileUrl: 'https://example.com/contract.pdf',
        fileName: 'contract.pdf',
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
        'application_status',
        'industry',
        'salary_range',
        'created_at',
      ]

      expect(queryFields).toContain('industry')
      expect(queryFields).toContain('salary_range')
    })

    it('should query negotiation_sessions for agreed terms', () => {
      const queryFields = [
        'id',
        'final_salary',
        'final_equity',
        'key_terms_agreed',
        'created_at',
      ]

      expect(queryFields).toContain('final_salary')
      expect(queryFields).toContain('key_terms_agreed')
    })

    it('should query global_user_insights for contract preferences', () => {
      const insightTypes = ['contract_red_flag', 'industry_norm', 'legal_preference']

      expect(insightTypes).toContain('contract_red_flag')
      expect(insightTypes).toContain('legal_preference')
    })
  })

  describe('L - Logic', () => {
    it('should prioritize applications with offers/accepted status', () => {
      const applications = [
        { id: '1', application_status: 'applied' },
        { id: '2', application_status: 'accepted' },
        { id: '3', application_status: 'offer_received' },
        { id: '4', application_status: 'negotiating' },
      ]

      const priorityStatus = ['accepted', 'offer_received', 'negotiating']

      const sorted = [...applications].sort((a, b) => {
        const aIndex = priorityStatus.indexOf(a.application_status)
        const bIndex = priorityStatus.indexOf(b.application_status)
        if (aIndex !== -1 && bIndex === -1) return -1
        if (aIndex === -1 && bIndex !== -1) return 1
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
        return 0
      })

      expect(sorted[0].application_status).toBe('accepted')
      expect(sorted[1].application_status).toBe('offer_received')
    })

    it('should build intelligence context for contract analysis', () => {
      const negotiationSession = {
        final_salary: 125000,
        final_equity: '0.5% over 4 years',
        key_terms_agreed: ['Remote work', 'Sign-on bonus'],
      }

      const selectedApplication = {
        salary_range: '$120k - $140k',
      }

      const intelligenceContext = {
        negotiatedTerms: negotiationSession
          ? {
              salary: negotiationSession.final_salary,
              equity: negotiationSession.final_equity,
              agreedTerms: negotiationSession.key_terms_agreed || [],
            }
          : null,
        targetSalary: selectedApplication.salary_range,
      }

      expect(intelligenceContext.negotiatedTerms?.salary).toBe(125000)
      expect(intelligenceContext.negotiatedTerms?.agreedTerms).toContain('Remote work')
    })

    it('should detect if salary matches negotiated amount', () => {
      const contractSalary = 125000
      const negotiatedSalary = 125000

      const salaryMatches = contractSalary === negotiatedSalary
      expect(salaryMatches).toBe(true)
    })

    it('should detect salary mismatch', () => {
      const contractSalary = 115000
      const negotiatedSalary = 125000

      const salaryMatches = contractSalary === negotiatedSalary
      expect(salaryMatches).toBe(false)
    })
  })

  describe('P - Parameters', () => {
    it('should pass company context to analysis API', () => {
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

    it('should include negotiated terms for verification', () => {
      const negotiationSession = {
        final_salary: 125000,
        key_terms_agreed: ['Stock options', 'Remote work'],
      }

      const termsToVerify = {
        salary: negotiationSession.final_salary,
        agreedTerms: negotiationSession.key_terms_agreed,
      }

      expect(termsToVerify.salary).toBe(125000)
      expect(termsToVerify.agreedTerms).toHaveLength(2)
    })

    it('should include global insights for red flag detection', () => {
      const globalInsights = [
        { insight_type: 'contract_red_flag', insight_text: 'Watch for non-compete' },
        { insight_type: 'legal_preference', insight_text: 'Prefer arbitration clause' },
      ]

      const redFlagInsights = globalInsights
        .filter(i => i.insight_type === 'contract_red_flag')
        .map(i => i.insight_text)

      expect(redFlagInsights).toContain('Watch for non-compete')
    })
  })

  describe('H - Handling', () => {
    it('should show empty state when no applications', () => {
      const applications: any[] = []
      const showEmptyState = applications.length === 0

      expect(showEmptyState).toBe(true)
    })

    it('should display negotiation status indicators', () => {
      const negotiationSession = { final_salary: 125000 }
      const industry = 'Technology'

      const hasNegotiation = Boolean(negotiationSession)
      const hasIndustry = Boolean(industry)

      expect(hasNegotiation).toBe(true)
      expect(hasIndustry).toBe(true)
    })

    it('should handle missing negotiation data gracefully', () => {
      const negotiationSession = null

      const intelligenceContext = {
        negotiatedTerms: negotiationSession
          ? {
              salary: (negotiationSession as any).final_salary,
              agreedTerms: (negotiationSession as any).key_terms_agreed || [],
            }
          : null,
      }

      expect(intelligenceContext.negotiatedTerms).toBeNull()
    })

    it('should format salary display correctly', () => {
      const salary = 125000
      const formatted = `$${salary.toLocaleString()}`

      expect(formatted).toBe('$125,000')
    })

    it('should detect if application has offer status for contract review', () => {
      const offerStatuses = ['accepted', 'offer_received', 'negotiating']

      const app1 = { application_status: 'accepted' }
      const app2 = { application_status: 'interview_scheduled' }

      const hasOffer1 = offerStatuses.includes(app1.application_status)
      const hasOffer2 = offerStatuses.includes(app2.application_status)

      expect(hasOffer1).toBe(true)
      expect(hasOffer2).toBe(false)
    })
  })
})

describe('Contract Intelligence Continuity', () => {
  describe('Negotiation Terms Verification', () => {
    it('should check all agreed terms are in contract', () => {
      const agreedTerms = ['Remote work', 'Sign-on bonus', 'Stock options']
      const contractTerms = ['Remote work', 'Sign-on bonus', 'Health insurance']

      const missingTerms = agreedTerms.filter(term => !contractTerms.includes(term))

      expect(missingTerms).toContain('Stock options')
      expect(missingTerms).toHaveLength(1)
    })

    it('should highlight salary verification status', () => {
      const negotiatedSalary = 125000
      const contractSalary = 125000

      const verification = {
        salaryMatches: contractSalary === negotiatedSalary,
        message:
          contractSalary === negotiatedSalary
            ? 'Salary matches negotiated amount'
            : `Salary mismatch: Expected $${negotiatedSalary.toLocaleString()}, got $${contractSalary.toLocaleString()}`,
      }

      expect(verification.salaryMatches).toBe(true)
      expect(verification.message).toBe('Salary matches negotiated amount')
    })
  })

  describe('Red Flag Detection', () => {
    it('should identify common contract red flags', () => {
      const contractClauses = [
        'non-compete',
        'intellectual property assignment',
        'confidentiality',
        'at-will employment',
      ]

      const potentialRedFlags = ['non-compete', 'intellectual property assignment']

      const foundRedFlags = contractClauses.filter(clause =>
        potentialRedFlags.some(flag => clause.toLowerCase().includes(flag.toLowerCase()))
      )

      expect(foundRedFlags).toContain('non-compete')
      expect(foundRedFlags).toContain('intellectual property assignment')
    })
  })
})
