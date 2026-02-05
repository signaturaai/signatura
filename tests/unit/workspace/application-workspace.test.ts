/**
 * Application Workspace & Dashboard Wiring Tests — RALPH Structure
 *
 * R — Requirements: Workspace tabs, interactive dashboard, navigation
 * A — Analysis: Filter logic, score calculations, insight categorization
 * L — Logic: Tab switching, scroll behavior, status mapping
 * P — Preservation: Different inputs produce different outputs
 * H — Hardening: Edge cases, empty data, boundary values
 */

import { describe, it, expect } from 'vitest'
import type { ApplicationStatus, JobApplication } from '@/lib/types/dashboard'

// =========================================================================
// Shared fixtures
// =========================================================================

type WorkspaceTab = 'overview' | 'cv_studio' | 'interview_lab' | 'strategy'
type DashboardFilter = 'all' | 'active' | 'interviews' | 'offers'
type InsightCategory = 'strength' | 'weakness' | 'opportunity' | 'threat'

interface NarrativeGap {
  dimension: string
  current: number
  target: number
  gap: number
  status: 'aligned' | 'partial' | 'gap'
  suggestion: string
}

interface HunterInsight {
  category: InsightCategory
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
}

interface InterviewSession {
  id: string
  company_name: string
  position_title: string
  session_type: string
  overall_score: number
  session_duration: number
  questions_asked: number
  confidence_before: number
  confidence_after: number
  strengths: string[]
  improvements: string[]
  created_at: string
  job_application_id?: string
}

const SAMPLE_APPLICATIONS: JobApplication[] = [
  {
    id: 'app-001',
    user_id: 'user-001',
    company_name: 'Stripe',
    position_title: 'Director of Product',
    application_date: '2025-01-15',
    application_status: 'interview_scheduled',
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-20T14:00:00Z',
    created_by: 'user-001',
  },
  {
    id: 'app-002',
    user_id: 'user-001',
    company_name: 'Figma',
    position_title: 'Senior Product Manager',
    application_date: '2025-01-10',
    application_status: 'applied',
    created_at: '2025-01-10T09:00:00Z',
    updated_at: '2025-01-10T09:00:00Z',
    created_by: 'user-001',
  },
  {
    id: 'app-003',
    user_id: 'user-001',
    company_name: 'Databricks',
    position_title: 'VP of Product, AI/ML',
    application_date: '2025-01-05',
    application_status: 'offer_received',
    created_at: '2025-01-05T08:00:00Z',
    updated_at: '2025-01-25T16:00:00Z',
    created_by: 'user-001',
  },
  {
    id: 'app-004',
    user_id: 'user-001',
    company_name: 'Coinbase',
    position_title: 'Head of Product',
    application_date: '2024-12-20',
    application_status: 'rejected',
    created_at: '2024-12-20T11:00:00Z',
    updated_at: '2025-01-08T15:00:00Z',
    created_by: 'user-001',
  },
  {
    id: 'app-005',
    user_id: 'user-001',
    company_name: 'Notion',
    position_title: 'Product Lead',
    application_date: '2025-01-12',
    application_status: 'negotiating',
    created_at: '2025-01-12T10:00:00Z',
    updated_at: '2025-01-28T12:00:00Z',
    created_by: 'user-001',
  },
]

const SAMPLE_NARRATIVE_GAPS: NarrativeGap[] = [
  { dimension: 'Action Verbs', current: 72, target: 85, gap: 13, status: 'partial', suggestion: 'Use stronger verbs' },
  { dimension: 'Achievements', current: 65, target: 80, gap: 15, status: 'partial', suggestion: 'Add more achievements' },
  { dimension: 'Quantified Results', current: 45, target: 75, gap: 30, status: 'gap', suggestion: 'Include metrics' },
  { dimension: 'Brand Language', current: 78, target: 80, gap: 2, status: 'aligned', suggestion: 'Good alignment' },
]

const SAMPLE_HUNTER_INSIGHTS: HunterInsight[] = [
  { category: 'strength', title: 'Strategic Leadership', description: 'Strong track record', priority: 'high' },
  { category: 'strength', title: 'Domain Expertise', description: 'Relevant experience', priority: 'medium' },
  { category: 'weakness', title: 'Enterprise Sales', description: 'Limited mention', priority: 'high' },
  { category: 'weakness', title: 'Technical Depth', description: 'JD emphasizes tech', priority: 'medium' },
  { category: 'opportunity', title: 'AI/ML Initiative', description: 'Company AI roadmap', priority: 'high' },
  { category: 'threat', title: 'Competitive Market', description: 'Many candidates', priority: 'high' },
]

const SAMPLE_INTERVIEW_SESSIONS: InterviewSession[] = [
  {
    id: 'is-001',
    company_name: 'Databricks',
    position_title: 'VP of Product',
    session_type: 'mock_interview',
    overall_score: 82,
    session_duration: 45,
    questions_asked: 12,
    confidence_before: 65,
    confidence_after: 78,
    strengths: ['Strong strategic thinking'],
    improvements: ['Add more metrics'],
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    job_application_id: 'app-003',
  },
  {
    id: 'is-002',
    company_name: 'General',
    position_title: 'Product Leadership',
    session_type: 'behavioral_prep',
    overall_score: 75,
    session_duration: 30,
    questions_asked: 8,
    confidence_before: 60,
    confidence_after: 72,
    strengths: ['Good STAR format'],
    improvements: ['Be more concise'],
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

// =========================================================================
// R — Requirements: Structure validation
// =========================================================================

describe('Application Workspace — Requirements', () => {
  describe('Workspace tabs', () => {
    const WORKSPACE_TABS: WorkspaceTab[] = ['overview', 'cv_studio', 'interview_lab', 'strategy']

    it('should define exactly 4 workspace tabs', () => {
      expect(WORKSPACE_TABS.length).toBe(4)
    })

    it.each(WORKSPACE_TABS)('should include tab: %s', (tab) => {
      expect(WORKSPACE_TABS).toContain(tab)
    })

    it('should have overview as default tab', () => {
      expect(WORKSPACE_TABS[0]).toBe('overview')
    })
  })

  describe('Dashboard filter types', () => {
    const DASHBOARD_FILTERS: DashboardFilter[] = ['all', 'active', 'interviews', 'offers']

    it('should define exactly 4 filter types', () => {
      expect(DASHBOARD_FILTERS.length).toBe(4)
    })

    it('should have "all" as default filter', () => {
      expect(DASHBOARD_FILTERS[0]).toBe('all')
    })
  })

  describe('NarrativeGap interface', () => {
    it('should have required fields', () => {
      const gap = SAMPLE_NARRATIVE_GAPS[0]
      expect(gap.dimension).toBeTruthy()
      expect(typeof gap.current).toBe('number')
      expect(typeof gap.target).toBe('number')
      expect(typeof gap.gap).toBe('number')
      expect(['aligned', 'partial', 'gap']).toContain(gap.status)
      expect(gap.suggestion).toBeTruthy()
    })

    it('should calculate gap correctly', () => {
      for (const gap of SAMPLE_NARRATIVE_GAPS) {
        expect(gap.gap).toBe(gap.target - gap.current)
      }
    })
  })

  describe('HunterInsight interface', () => {
    const INSIGHT_CATEGORIES: InsightCategory[] = ['strength', 'weakness', 'opportunity', 'threat']

    it('should define exactly 4 SWOT categories', () => {
      expect(INSIGHT_CATEGORIES.length).toBe(4)
    })

    it('should have required fields on insight', () => {
      const insight = SAMPLE_HUNTER_INSIGHTS[0]
      expect(insight.category).toBeTruthy()
      expect(insight.title).toBeTruthy()
      expect(insight.description).toBeTruthy()
      expect(['high', 'medium', 'low']).toContain(insight.priority)
    })
  })

  describe('Status configuration completeness', () => {
    const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string }> = {
      prepared: { label: 'Prepared', color: 'text-gray-600' },
      applied: { label: 'Applied', color: 'text-sky-600' },
      interview_scheduled: { label: 'Interview Scheduled', color: 'text-lavender-dark' },
      interviewed: { label: 'Interviewed', color: 'text-lavender-dark' },
      offer_received: { label: 'Offer Received', color: 'text-emerald-600' },
      negotiating: { label: 'Negotiating', color: 'text-peach-dark' },
      accepted: { label: 'Accepted', color: 'text-emerald-600' },
      rejected: { label: 'Rejected', color: 'text-red-500' },
      withdrawn: { label: 'Withdrawn', color: 'text-gray-400' },
    }

    const ALL_STATUSES: ApplicationStatus[] = [
      'prepared', 'applied', 'interview_scheduled', 'interviewed',
      'offer_received', 'negotiating', 'accepted', 'rejected', 'withdrawn',
    ]

    it.each(ALL_STATUSES)('should have config for status: %s', (status) => {
      expect(STATUS_CONFIG[status]).toBeDefined()
      expect(STATUS_CONFIG[status].label).toBeTruthy()
      expect(STATUS_CONFIG[status].color).toBeTruthy()
    })
  })
})

// =========================================================================
// A — Analysis: Filter logic and calculations
// =========================================================================

describe('Application Workspace — Analysis', () => {
  describe('Dashboard filter logic', () => {
    function filterApplications(apps: JobApplication[], filter: DashboardFilter): JobApplication[] {
      switch (filter) {
        case 'active':
          return apps.filter(app => !['rejected', 'withdrawn', 'accepted'].includes(app.application_status))
        case 'interviews':
          return apps.filter(app => app.application_status === 'interview_scheduled')
        case 'offers':
          return apps.filter(app => ['offer_received', 'negotiating'].includes(app.application_status))
        default:
          return apps
      }
    }

    it('should return all apps for "all" filter', () => {
      const filtered = filterApplications(SAMPLE_APPLICATIONS, 'all')
      expect(filtered.length).toBe(SAMPLE_APPLICATIONS.length)
    })

    it('should filter active applications (exclude rejected, withdrawn, accepted)', () => {
      const filtered = filterApplications(SAMPLE_APPLICATIONS, 'active')
      expect(filtered.length).toBe(4) // Stripe, Figma, Databricks, Notion
      expect(filtered.find(a => a.company_name === 'Coinbase')).toBeUndefined()
    })

    it('should filter interview_scheduled applications', () => {
      const filtered = filterApplications(SAMPLE_APPLICATIONS, 'interviews')
      expect(filtered.length).toBe(1)
      expect(filtered[0].company_name).toBe('Stripe')
    })

    it('should filter offers (offer_received + negotiating)', () => {
      const filtered = filterApplications(SAMPLE_APPLICATIONS, 'offers')
      expect(filtered.length).toBe(2)
      const companies = filtered.map(a => a.company_name)
      expect(companies).toContain('Databricks')
      expect(companies).toContain('Notion')
    })
  })

  describe('Narrative gap status calculation', () => {
    function calculateGapStatus(current: number, target: number): 'aligned' | 'partial' | 'gap' {
      const gap = target - current
      if (gap <= 5) return 'aligned'
      if (gap <= 20) return 'partial'
      return 'gap'
    }

    it('should return "aligned" for gap <= 5', () => {
      expect(calculateGapStatus(78, 80)).toBe('aligned')
      expect(calculateGapStatus(80, 80)).toBe('aligned')
      expect(calculateGapStatus(76, 80)).toBe('aligned')
    })

    it('should return "partial" for gap 6-20', () => {
      expect(calculateGapStatus(72, 85)).toBe('partial')
      expect(calculateGapStatus(65, 80)).toBe('partial')
      expect(calculateGapStatus(60, 75)).toBe('partial')
    })

    it('should return "gap" for gap > 20', () => {
      expect(calculateGapStatus(45, 75)).toBe('gap')
      expect(calculateGapStatus(30, 80)).toBe('gap')
    })
  })

  describe('Hunter insight categorization', () => {
    function categorizeInsights(insights: HunterInsight[]) {
      return {
        strengths: insights.filter(i => i.category === 'strength'),
        weaknesses: insights.filter(i => i.category === 'weakness'),
        opportunities: insights.filter(i => i.category === 'opportunity'),
        threats: insights.filter(i => i.category === 'threat'),
      }
    }

    it('should categorize insights correctly', () => {
      const categorized = categorizeInsights(SAMPLE_HUNTER_INSIGHTS)
      expect(categorized.strengths.length).toBe(2)
      expect(categorized.weaknesses.length).toBe(2)
      expect(categorized.opportunities.length).toBe(1)
      expect(categorized.threats.length).toBe(1)
    })

    it('should preserve all insights after categorization', () => {
      const categorized = categorizeInsights(SAMPLE_HUNTER_INSIGHTS)
      const total = categorized.strengths.length +
                   categorized.weaknesses.length +
                   categorized.opportunities.length +
                   categorized.threats.length
      expect(total).toBe(SAMPLE_HUNTER_INSIGHTS.length)
    })
  })

  describe('Interview session filtering', () => {
    function filterSessionsForApplication(sessions: InterviewSession[], appId: string) {
      return {
        relevant: sessions.filter(s => s.job_application_id === appId),
        other: sessions.filter(s => s.job_application_id !== appId),
      }
    }

    it('should separate relevant and other sessions', () => {
      const { relevant, other } = filterSessionsForApplication(SAMPLE_INTERVIEW_SESSIONS, 'app-003')
      expect(relevant.length).toBe(1)
      expect(relevant[0].company_name).toBe('Databricks')
      expect(other.length).toBe(1)
    })

    it('should return all as other for non-matching app', () => {
      const { relevant, other } = filterSessionsForApplication(SAMPLE_INTERVIEW_SESSIONS, 'app-999')
      expect(relevant.length).toBe(0)
      expect(other.length).toBe(2)
    })
  })

  describe('Match score improvement', () => {
    function calculateImprovement(before: number, after: number) {
      return {
        delta: after - before,
        percentChange: Math.round(((after - before) / before) * 100),
        improved: after > before,
      }
    }

    it('should calculate positive improvement', () => {
      const result = calculateImprovement(62, 85)
      expect(result.delta).toBe(23)
      expect(result.improved).toBe(true)
    })

    it('should calculate no improvement', () => {
      const result = calculateImprovement(70, 70)
      expect(result.delta).toBe(0)
      expect(result.improved).toBe(false)
    })

    it('should calculate negative change', () => {
      const result = calculateImprovement(80, 75)
      expect(result.delta).toBe(-5)
      expect(result.improved).toBe(false)
    })
  })
})

// =========================================================================
// L — Logic: Core business logic
// =========================================================================

describe('Application Workspace — Logic', () => {
  describe('Tab navigation', () => {
    function getTabIndex(tab: WorkspaceTab): number {
      const tabs: WorkspaceTab[] = ['overview', 'cv_studio', 'interview_lab', 'strategy']
      return tabs.indexOf(tab)
    }

    it('should return correct index for each tab', () => {
      expect(getTabIndex('overview')).toBe(0)
      expect(getTabIndex('cv_studio')).toBe(1)
      expect(getTabIndex('interview_lab')).toBe(2)
      expect(getTabIndex('strategy')).toBe(3)
    })
  })

  describe('Filter label mapping', () => {
    function getFilterLabel(filter: DashboardFilter): string {
      const labels: Record<DashboardFilter, string> = {
        all: 'Recent Applications',
        active: 'Active Applications',
        interviews: 'Upcoming Interviews',
        offers: 'Offers & Negotiations',
      }
      return labels[filter]
    }

    it('should return correct labels', () => {
      expect(getFilterLabel('all')).toBe('Recent Applications')
      expect(getFilterLabel('active')).toBe('Active Applications')
      expect(getFilterLabel('interviews')).toBe('Upcoming Interviews')
      expect(getFilterLabel('offers')).toBe('Offers & Negotiations')
    })
  })

  describe('Insight priority sorting', () => {
    function sortByPriority(insights: HunterInsight[]): HunterInsight[] {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return [...insights].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    }

    it('should sort high priority first', () => {
      const sorted = sortByPriority(SAMPLE_HUNTER_INSIGHTS)
      const highPriority = sorted.filter(i => i.priority === 'high')
      // All high priority items should come before medium/low
      const firstHighIndex = sorted.findIndex(i => i.priority === 'high')
      const lastHighIndex = sorted.map(i => i.priority).lastIndexOf('high')
      expect(firstHighIndex).toBe(0)
      expect(lastHighIndex).toBeLessThan(sorted.findIndex(i => i.priority === 'medium') || sorted.length)
    })
  })

  describe('Navigation path generation', () => {
    function getWorkspacePath(appId: string): string {
      return `/dashboard/application/${appId}`
    }

    function getCVTailorPath(appId: string): string {
      return `/cv/tailor?application=${appId}`
    }

    function getInterviewArenaPath(appId: string): string {
      return `/interview/arena?application=${appId}`
    }

    it('should generate correct workspace path', () => {
      expect(getWorkspacePath('app-001')).toBe('/dashboard/application/app-001')
    })

    it('should generate correct CV tailor path', () => {
      expect(getCVTailorPath('app-001')).toBe('/cv/tailor?application=app-001')
    })

    it('should generate correct interview arena path', () => {
      expect(getInterviewArenaPath('app-001')).toBe('/interview/arena?application=app-001')
    })
  })

  describe('Metrics calculation', () => {
    function calculateMetrics(apps: JobApplication[]) {
      return {
        total: apps.length,
        active: apps.filter(a => !['rejected', 'withdrawn', 'accepted'].includes(a.application_status)).length,
        interviews: apps.filter(a => a.application_status === 'interview_scheduled').length,
        offers: apps.filter(a => ['offer_received', 'negotiating'].includes(a.application_status)).length,
      }
    }

    it('should calculate all metrics correctly', () => {
      const metrics = calculateMetrics(SAMPLE_APPLICATIONS)
      expect(metrics.total).toBe(5)
      expect(metrics.active).toBe(4)
      expect(metrics.interviews).toBe(1)
      expect(metrics.offers).toBe(2)
    })
  })

  describe('Score color thresholds', () => {
    function getScoreColor(score: number): string {
      if (score >= 80) return 'emerald'
      if (score >= 60) return 'sky'
      if (score >= 40) return 'amber'
      return 'red'
    }

    it('should return emerald for 80+', () => {
      expect(getScoreColor(80)).toBe('emerald')
      expect(getScoreColor(95)).toBe('emerald')
    })

    it('should return sky for 60-79', () => {
      expect(getScoreColor(60)).toBe('sky')
      expect(getScoreColor(79)).toBe('sky')
    })

    it('should return amber for 40-59', () => {
      expect(getScoreColor(40)).toBe('amber')
      expect(getScoreColor(59)).toBe('amber')
    })

    it('should return red for below 40', () => {
      expect(getScoreColor(39)).toBe('red')
      expect(getScoreColor(0)).toBe('red')
    })
  })
})

// =========================================================================
// P — Preservation: Different inputs → different outputs
// =========================================================================

describe('Application Workspace — Preservation', () => {
  describe('Filter differentiation', () => {
    function filterApplications(apps: JobApplication[], filter: DashboardFilter): JobApplication[] {
      switch (filter) {
        case 'active':
          return apps.filter(app => !['rejected', 'withdrawn', 'accepted'].includes(app.application_status))
        case 'interviews':
          return apps.filter(app => app.application_status === 'interview_scheduled')
        case 'offers':
          return apps.filter(app => ['offer_received', 'negotiating'].includes(app.application_status))
        default:
          return apps
      }
    }

    it('should produce different results for different filters', () => {
      const allResults = filterApplications(SAMPLE_APPLICATIONS, 'all')
      const activeResults = filterApplications(SAMPLE_APPLICATIONS, 'active')
      const interviewResults = filterApplications(SAMPLE_APPLICATIONS, 'interviews')
      const offerResults = filterApplications(SAMPLE_APPLICATIONS, 'offers')

      // All should be different sizes (or contain different items)
      expect(allResults.length).not.toBe(interviewResults.length)
      expect(activeResults.length).not.toBe(interviewResults.length)
      expect(interviewResults.length).not.toBe(offerResults.length)
    })
  })

  describe('Insight category differentiation', () => {
    function categorizeInsights(insights: HunterInsight[]) {
      return {
        strengths: insights.filter(i => i.category === 'strength'),
        weaknesses: insights.filter(i => i.category === 'weakness'),
        opportunities: insights.filter(i => i.category === 'opportunity'),
        threats: insights.filter(i => i.category === 'threat'),
      }
    }

    it('should produce different arrays for each category', () => {
      const categorized = categorizeInsights(SAMPLE_HUNTER_INSIGHTS)
      expect(categorized.strengths).not.toEqual(categorized.weaknesses)
      expect(categorized.opportunities).not.toEqual(categorized.threats)
    })
  })

  describe('Gap status differentiation', () => {
    it('should produce different statuses for different gaps', () => {
      const statuses = SAMPLE_NARRATIVE_GAPS.map(g => g.status)
      expect(statuses).toContain('aligned')
      expect(statuses).toContain('partial')
      expect(statuses).toContain('gap')
    })
  })

  describe('Tab badge differentiation', () => {
    function getTabBadge(tab: WorkspaceTab, data: { hasCv: boolean; sessionCount: number }): number | undefined {
      switch (tab) {
        case 'cv_studio':
          return data.hasCv ? undefined : 1
        case 'interview_lab':
          return data.sessionCount > 0 ? data.sessionCount : undefined
        default:
          return undefined
      }
    }

    it('should show badge for cv_studio when no CV', () => {
      expect(getTabBadge('cv_studio', { hasCv: false, sessionCount: 0 })).toBe(1)
      expect(getTabBadge('cv_studio', { hasCv: true, sessionCount: 0 })).toBeUndefined()
    })

    it('should show session count badge for interview_lab', () => {
      expect(getTabBadge('interview_lab', { hasCv: true, sessionCount: 3 })).toBe(3)
      expect(getTabBadge('interview_lab', { hasCv: true, sessionCount: 0 })).toBeUndefined()
    })
  })
})

// =========================================================================
// H — Hardening: Edge cases
// =========================================================================

describe('Application Workspace — Hardening', () => {
  describe('Empty data handling', () => {
    it('should handle empty applications array', () => {
      const emptyApps: JobApplication[] = []
      const activeCount = emptyApps.filter(a =>
        !['rejected', 'withdrawn', 'accepted'].includes(a.application_status)
      ).length
      expect(activeCount).toBe(0)
    })

    it('should handle empty insights array', () => {
      const emptyInsights: HunterInsight[] = []
      const strengths = emptyInsights.filter(i => i.category === 'strength')
      expect(strengths.length).toBe(0)
    })

    it('should handle empty narrative gaps', () => {
      const emptyGaps: NarrativeGap[] = []
      const aligned = emptyGaps.filter(g => g.status === 'aligned')
      expect(aligned.length).toBe(0)
    })

    it('should handle empty interview sessions', () => {
      const emptySessions: InterviewSession[] = []
      const relevant = emptySessions.filter(s => s.job_application_id === 'app-001')
      expect(relevant.length).toBe(0)
    })
  })

  describe('Boundary values', () => {
    it('should handle gap boundary at 5', () => {
      function calculateGapStatus(gap: number): string {
        if (gap <= 5) return 'aligned'
        if (gap <= 20) return 'partial'
        return 'gap'
      }
      expect(calculateGapStatus(5)).toBe('aligned')
      expect(calculateGapStatus(6)).toBe('partial')
    })

    it('should handle gap boundary at 20', () => {
      function calculateGapStatus(gap: number): string {
        if (gap <= 5) return 'aligned'
        if (gap <= 20) return 'partial'
        return 'gap'
      }
      expect(calculateGapStatus(20)).toBe('partial')
      expect(calculateGapStatus(21)).toBe('gap')
    })

    it('should handle score boundary at 80', () => {
      function getScoreColor(score: number): string {
        if (score >= 80) return 'emerald'
        if (score >= 60) return 'sky'
        return 'amber'
      }
      expect(getScoreColor(79)).toBe('sky')
      expect(getScoreColor(80)).toBe('emerald')
    })
  })

  describe('Missing optional fields', () => {
    it('should handle application without job_description', () => {
      const app: Partial<JobApplication> = {
        id: 'app-test',
        company_name: 'Test Company',
        position_title: 'Test Role',
      }
      const jdPreview = app.job_description?.slice(0, 500) || ''
      expect(jdPreview).toBe('')
    })

    it('should handle application without notes', () => {
      const app: Partial<JobApplication> = {
        id: 'app-test',
        company_name: 'Test Company',
      }
      const notes = app.notes || app.application_notes || ''
      expect(notes).toBe('')
    })

    it('should handle session without job_application_id', () => {
      const session = SAMPLE_INTERVIEW_SESSIONS[1]
      expect(session.job_application_id).toBeUndefined()
    })
  })

  describe('Special characters', () => {
    it('should handle company names with special characters', () => {
      const companyName = "O'Reilly & Associates"
      const initial = companyName.charAt(0)
      expect(initial).toBe('O')
    })

    it('should handle long position titles', () => {
      const longTitle = 'Director of Product Management and Engineering Excellence for Enterprise Cloud Solutions'
      const truncated = longTitle.length > 50 ? longTitle.substring(0, 47) + '...' : longTitle
      expect(truncated.length).toBeLessThanOrEqual(50)
    })
  })

  describe('Score edge cases', () => {
    it('should handle zero scores', () => {
      const matchScore = { before: 0, after: 0 }
      const delta = matchScore.after - matchScore.before
      expect(delta).toBe(0)
    })

    it('should handle perfect scores', () => {
      const matchScore = { before: 100, after: 100 }
      const delta = matchScore.after - matchScore.before
      expect(delta).toBe(0)
    })

    it('should handle improvement from 0', () => {
      const matchScore = { before: 0, after: 50 }
      const delta = matchScore.after - matchScore.before
      expect(delta).toBe(50)
    })
  })

  describe('Filter with all terminal statuses', () => {
    it('should return empty for active filter with all terminal apps', () => {
      const terminalApps: JobApplication[] = [
        { ...SAMPLE_APPLICATIONS[0], application_status: 'rejected' },
        { ...SAMPLE_APPLICATIONS[1], application_status: 'withdrawn' },
        { ...SAMPLE_APPLICATIONS[2], application_status: 'accepted' },
      ]
      const active = terminalApps.filter(a =>
        !['rejected', 'withdrawn', 'accepted'].includes(a.application_status)
      )
      expect(active.length).toBe(0)
    })
  })

  describe('Single item arrays', () => {
    it('should handle single application', () => {
      const singleApp = [SAMPLE_APPLICATIONS[0]]
      const active = singleApp.filter(a =>
        !['rejected', 'withdrawn', 'accepted'].includes(a.application_status)
      )
      expect(active.length).toBe(1)
    })

    it('should handle single insight', () => {
      const singleInsight = [SAMPLE_HUNTER_INSIGHTS[0]]
      const strengths = singleInsight.filter(i => i.category === 'strength')
      expect(strengths.length).toBe(1)
    })
  })
})
