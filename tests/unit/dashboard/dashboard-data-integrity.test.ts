/**
 * P0: Dashboard Data Integrity & Metrics Alignment
 *
 * Converts RALPH report "base44-migration.md" into automated Vitest tests.
 * Covers: TypeScript interfaces, mock data alignment, metrics computation,
 * status config completeness, activity feed, quick actions, helper functions.
 */

import { describe, it, expect } from 'vitest'
import type {
  JobApplication,
  ApplicationStatus,
  CVVersion,
  DashboardMetrics,
  ActivityItem,
  QuickAction,
  PriorityLevel,
  CVSubmissionStatus,
  TailoringMode,
} from '@/lib/types/dashboard'
import {
  mockJobApplications,
  mockCVVersions,
  mockDashboardMetrics,
  mockActivityItems,
  mockQuickActions,
  getApplicationById,
  getCVVersionByApplicationId,
  getActiveApplications,
  getApplicationsWithInterviews,
} from '@/lib/data/mockData'

// ============================================================
// 1. DATA STRUCTURE: TypeScript Interface Alignment
// ============================================================

describe('P0 - Data Structure: TypeScript Interfaces', () => {
  describe('ApplicationStatus enum', () => {
    const ALL_STATUSES: ApplicationStatus[] = [
      'prepared',
      'applied',
      'interview_scheduled',
      'interviewed',
      'offer_received',
      'negotiating',
      'accepted',
      'rejected',
      'withdrawn',
    ]

    it('should define exactly 9 application statuses', () => {
      expect(ALL_STATUSES.length).toBe(9)
    })

    it.each(ALL_STATUSES)('should include status: %s', (status) => {
      const app: Partial<JobApplication> = { application_status: status }
      expect(app.application_status).toBe(status)
    })
  })

  describe('PriorityLevel enum', () => {
    const ALL_PRIORITIES: PriorityLevel[] = ['low', 'medium', 'high', 'dream_job']

    it('should define exactly 4 priority levels', () => {
      expect(ALL_PRIORITIES.length).toBe(4)
    })

    it.each(ALL_PRIORITIES)('should include priority: %s', (priority) => {
      const app: Partial<JobApplication> = { priority_level: priority }
      expect(app.priority_level).toBe(priority)
    })
  })

  describe('CVSubmissionStatus enum', () => {
    const ALL_CV_STATUSES: CVSubmissionStatus[] = [
      'draft', 'prepared', 'submitted', 'accepted', 'rejected',
    ]

    it('should define exactly 5 CV submission statuses', () => {
      expect(ALL_CV_STATUSES.length).toBe(5)
    })
  })

  describe('TailoringMode enum', () => {
    const ALL_MODES: TailoringMode[] = ['none', 'light', 'moderate', 'heavy', 'custom']

    it('should define exactly 5 tailoring modes', () => {
      expect(ALL_MODES.length).toBe(5)
    })
  })

  describe('JobApplication required fields', () => {
    it('should enforce required fields on every mock application', () => {
      for (const app of mockJobApplications) {
        expect(app.id).toBeTruthy()
        expect(app.user_id).toBeTruthy()
        expect(app.company_name).toBeTruthy()
        expect(app.position_title).toBeTruthy()
        expect(app.application_date).toBeTruthy()
        expect(app.application_status).toBeTruthy()
        expect(app.created_at).toBeTruthy()
        expect(app.updated_at).toBeTruthy()
        expect(app.created_by).toBeTruthy()
      }
    })

    it('should have unique IDs for every application', () => {
      const ids = mockJobApplications.map((a) => a.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('should have valid ISO date strings for application_date', () => {
      for (const app of mockJobApplications) {
        const parsed = new Date(app.application_date)
        expect(parsed.getTime()).not.toBeNaN()
      }
    })
  })

  describe('CVVersion required fields', () => {
    it('should enforce required fields on every mock CV version', () => {
      for (const cv of mockCVVersions) {
        expect(cv.id).toBeTruthy()
        expect(cv.user_id).toBeTruthy()
        expect(cv.version_name).toBeTruthy()
        expect(typeof cv.is_base_cv).toBe('boolean')
        expect(typeof cv.version_number).toBe('number')
        expect(cv.original_cv_url).toBeTruthy()
        expect(cv.submission_status).toBeTruthy()
        expect(cv.created_at).toBeTruthy()
        expect(cv.updated_at).toBeTruthy()
        expect(cv.created_by).toBeTruthy()
      }
    })

    it('should have unique IDs for every CV version', () => {
      const ids = mockCVVersions.map((c) => c.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('should have exactly one base CV', () => {
      const baseCVs = mockCVVersions.filter((c) => c.is_base_cv)
      expect(baseCVs.length).toBe(1)
    })

    it('should have sequential version numbers', () => {
      const versions = mockCVVersions.map((c) => c.version_number).sort((a, b) => a - b)
      for (let i = 0; i < versions.length; i++) {
        expect(versions[i]).toBe(i + 1)
      }
    })
  })

  describe('DashboardMetrics interface', () => {
    it('should define all required metric fields', () => {
      const metrics: DashboardMetrics = mockDashboardMetrics
      expect(typeof metrics.totalApplications).toBe('number')
      expect(typeof metrics.activeApplications).toBe('number')
      expect(typeof metrics.interviewsScheduled).toBe('number')
      expect(typeof metrics.cvVersions).toBe('number')
      expect(typeof metrics.offersReceived).toBe('number')
      expect(typeof metrics.acceptanceRate).toBe('number')
    })
  })

  describe('ActivityItem interface', () => {
    it('should have required fields on every activity', () => {
      for (const activity of mockActivityItems) {
        expect(activity.id).toBeTruthy()
        expect(activity.type).toBeTruthy()
        expect(activity.title).toBeTruthy()
        expect(activity.description).toBeTruthy()
        expect(activity.timestamp).toBeTruthy()
      }
    })

    it('should have valid activity types', () => {
      const validTypes = ['application', 'interview', 'cv_update', 'status_change', 'offer']
      for (const activity of mockActivityItems) {
        expect(validTypes).toContain(activity.type)
      }
    })
  })

  describe('QuickAction interface', () => {
    it('should have required fields on every quick action', () => {
      for (const action of mockQuickActions) {
        expect(action.id).toBeTruthy()
        expect(action.label).toBeTruthy()
        expect(action.description).toBeTruthy()
        expect(action.href).toBeTruthy()
        expect(action.icon).toBeTruthy()
        expect(action.color).toBeTruthy()
        expect(action.bgColor).toBeTruthy()
      }
    })
  })
})

// ============================================================
// 2. MOCK DATA: Population & Realistic Content
// ============================================================

describe('P0 - Mock Data Population', () => {
  describe('Job Applications', () => {
    it('should have 13 applications', () => {
      expect(mockJobApplications.length).toBe(13)
    })

    it('should include Product Director roles', () => {
      const directorRoles = mockJobApplications.filter(
        (a) =>
          a.position_title.toLowerCase().includes('director') ||
          a.position_title.toLowerCase().includes('head of')
      )
      expect(directorRoles.length).toBe(mockJobApplications.length)
    })

    it('should include real company names', () => {
      const companies = mockJobApplications.map((a) => a.company_name)
      expect(companies).toContain('Stripe')
      expect(companies).toContain('Figma')
      expect(companies).toContain('Notion')
      expect(companies).toContain('Airbnb')
      expect(companies).toContain('Shopify')
      expect(companies).toContain('Databricks')
    })

    it('should have salary ranges in $250k-$400k range', () => {
      for (const app of mockJobApplications) {
        if (app.salary_min && app.salary_max) {
          expect(app.salary_min).toBeGreaterThanOrEqual(250000)
          expect(app.salary_max).toBeLessThanOrEqual(400000)
        }
      }
    })

    it('should have diverse statuses across applications', () => {
      const statuses = new Set(mockJobApplications.map((a) => a.application_status))
      expect(statuses.size).toBeGreaterThanOrEqual(5)
    })

    it('should have location data on most applications', () => {
      const withLocation = mockJobApplications.filter((a) => a.location)
      expect(withLocation.length).toBeGreaterThanOrEqual(10)
    })

    it('should have industry data on most applications', () => {
      const withIndustry = mockJobApplications.filter((a) => a.industry)
      expect(withIndustry.length).toBeGreaterThanOrEqual(10)
    })
  })

  describe('CV Versions', () => {
    it('should have 5 CV versions', () => {
      expect(mockCVVersions.length).toBe(5)
    })

    it('should link tailored CVs to applications', () => {
      const linked = mockCVVersions.filter((c) => c.job_application_id)
      expect(linked.length).toBe(4) // 4 tailored + 1 base
    })

    it('should have ATS compatibility scores', () => {
      for (const cv of mockCVVersions) {
        expect(cv.ats_compatibility_score).toBeDefined()
        expect(cv.ats_compatibility_score).toBeGreaterThanOrEqual(80)
        expect(cv.ats_compatibility_score).toBeLessThanOrEqual(100)
      }
    })

    it('should have score improvements on tailored CVs', () => {
      const tailored = mockCVVersions.filter((c) => !c.is_base_cv)
      for (const cv of tailored) {
        expect(cv.score_improvement).toBeDefined()
        expect(cv.score_improvement!).toBeGreaterThan(0)
      }
    })
  })

  describe('Activity Items', () => {
    it('should have 6 activity items', () => {
      expect(mockActivityItems.length).toBe(6)
    })

    it('should include an offer activity', () => {
      const offers = mockActivityItems.filter((a) => a.type === 'offer')
      expect(offers.length).toBeGreaterThanOrEqual(1)
    })

    it('should include interview activities', () => {
      const interviews = mockActivityItems.filter((a) => a.type === 'interview')
      expect(interviews.length).toBeGreaterThanOrEqual(1)
    })

    it('should include a rejection activity', () => {
      const rejections = mockActivityItems.filter(
        (a) => a.type === 'status_change' && a.status === 'rejected'
      )
      expect(rejections.length).toBeGreaterThanOrEqual(1)
    })

    it('should reference valid application IDs', () => {
      const appIds = new Set(mockJobApplications.map((a) => a.id))
      for (const activity of mockActivityItems) {
        if (activity.applicationId) {
          expect(appIds.has(activity.applicationId)).toBe(true)
        }
      }
    })
  })

  describe('Quick Actions', () => {
    it('should have 4 quick actions', () => {
      expect(mockQuickActions.length).toBe(4)
    })

    it('should include Tailor CV action', () => {
      const tailorCV = mockQuickActions.find((a) => a.label === 'Tailor CV')
      expect(tailorCV).toBeDefined()
      expect(tailorCV!.href).toBe('/cv/tailor')
    })

    it('should include Practice Interview action', () => {
      const interview = mockQuickActions.find((a) => a.label === 'Practice Interview')
      expect(interview).toBeDefined()
      expect(interview!.href).toBe('/interview')
    })

    it('should include New Application action', () => {
      const addApp = mockQuickActions.find((a) => a.label === 'New Application')
      expect(addApp).toBeDefined()
      expect(addApp!.href).toContain('/applications')
    })

    it('should include Review Offer action', () => {
      const reviewOffer = mockQuickActions.find((a) => a.label === 'Review Offer')
      expect(reviewOffer).toBeDefined()
      expect(reviewOffer!.href).toBe('/compensation')
    })

    it('should have unique IDs', () => {
      const ids = mockQuickActions.map((a) => a.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })
})

// ============================================================
// 3. METRICS COMPUTATION: Derived Values
// ============================================================

describe('P0 - Metrics Computation', () => {
  it('totalApplications should match mock data length', () => {
    expect(mockDashboardMetrics.totalApplications).toBe(mockJobApplications.length)
  })

  it('activeApplications should exclude rejected, withdrawn, accepted', () => {
    const expected = mockJobApplications.filter(
      (a) => !['rejected', 'withdrawn', 'accepted'].includes(a.application_status)
    ).length
    expect(mockDashboardMetrics.activeApplications).toBe(expected)
  })

  it('interviewsScheduled should count interview_scheduled status', () => {
    const expected = mockJobApplications.filter(
      (a) => a.application_status === 'interview_scheduled'
    ).length
    expect(mockDashboardMetrics.interviewsScheduled).toBe(expected)
  })

  it('cvVersions should match CV versions length', () => {
    expect(mockDashboardMetrics.cvVersions).toBe(mockCVVersions.length)
  })

  it('offersReceived should count offer_received status', () => {
    const expected = mockJobApplications.filter(
      (a) => a.application_status === 'offer_received'
    ).length
    expect(mockDashboardMetrics.offersReceived).toBe(expected)
  })

  it('activeApplications should be less than totalApplications', () => {
    expect(mockDashboardMetrics.activeApplications).toBeLessThan(
      mockDashboardMetrics.totalApplications
    )
  })

  it('interviewsScheduled should be less than or equal to activeApplications', () => {
    expect(mockDashboardMetrics.interviewsScheduled).toBeLessThanOrEqual(
      mockDashboardMetrics.activeApplications
    )
  })

  it('offersReceived should be positive (Databricks has offer)', () => {
    expect(mockDashboardMetrics.offersReceived).toBeGreaterThan(0)
  })
})

// ============================================================
// 4. STATUS CONFIG: All 9 Statuses Covered
// ============================================================

describe('P0 - Status Config Completeness', () => {
  // Mirrors the statusConfig in dashboard/page.tsx
  const ALL_STATUSES: ApplicationStatus[] = [
    'prepared', 'applied', 'interview_scheduled', 'interviewed',
    'offer_received', 'negotiating', 'accepted', 'rejected', 'withdrawn',
  ]

  // Expected color mappings from the dashboard page component
  const statusConfig: Record<ApplicationStatus, { color: string; bgColor: string }> = {
    prepared: { color: 'text-text-secondary', bgColor: 'bg-muted' },
    applied: { color: 'text-sky-dark', bgColor: 'bg-sky-light' },
    interview_scheduled: { color: 'text-lavender-dark', bgColor: 'bg-lavender-light' },
    interviewed: { color: 'text-lavender-dark', bgColor: 'bg-lavender-light' },
    offer_received: { color: 'text-success-dark', bgColor: 'bg-success-light' },
    negotiating: { color: 'text-peach-dark', bgColor: 'bg-peach-light' },
    accepted: { color: 'text-success-dark', bgColor: 'bg-success-light' },
    rejected: { color: 'text-error-dark', bgColor: 'bg-error-light' },
    withdrawn: { color: 'text-text-tertiary', bgColor: 'bg-muted' },
  }

  it.each(ALL_STATUSES)('should have config for status: %s', (status) => {
    expect(statusConfig[status]).toBeDefined()
    expect(statusConfig[status].color).toBeTruthy()
    expect(statusConfig[status].bgColor).toBeTruthy()
  })

  it('should map positive statuses to success colors', () => {
    expect(statusConfig.offer_received.color).toBe('text-success-dark')
    expect(statusConfig.accepted.color).toBe('text-success-dark')
  })

  it('should map negative statuses to error colors', () => {
    expect(statusConfig.rejected.color).toBe('text-error-dark')
  })

  it('should map inactive statuses to muted colors', () => {
    expect(statusConfig.prepared.bgColor).toBe('bg-muted')
    expect(statusConfig.withdrawn.bgColor).toBe('bg-muted')
  })
})

// ============================================================
// 5. FORMAT HELPERS: Status & Time Formatters
// ============================================================

describe('P0 - Format Helpers', () => {
  describe('formatStatus logic', () => {
    function formatStatus(status: ApplicationStatus): string {
      return status
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    }

    it('should capitalize single-word statuses', () => {
      expect(formatStatus('prepared')).toBe('Prepared')
      expect(formatStatus('applied')).toBe('Applied')
      expect(formatStatus('rejected')).toBe('Rejected')
    })

    it('should capitalize multi-word statuses with spaces', () => {
      expect(formatStatus('interview_scheduled')).toBe('Interview Scheduled')
      expect(formatStatus('offer_received')).toBe('Offer Received')
    })

    it('should handle all 9 statuses', () => {
      const allStatuses: ApplicationStatus[] = [
        'prepared', 'applied', 'interview_scheduled', 'interviewed',
        'offer_received', 'negotiating', 'accepted', 'rejected', 'withdrawn',
      ]
      for (const status of allStatuses) {
        const formatted = formatStatus(status)
        expect(formatted.length).toBeGreaterThan(0)
        expect(formatted[0]).toBe(formatted[0].toUpperCase())
        expect(formatted).not.toContain('_')
      }
    })
  })

  describe('formatRelativeTime logic', () => {
    function formatRelativeTime(dateString: string): string {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays < 7) return `${diffDays}d ago`
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    it('should format minutes ago', () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString()
      expect(formatRelativeTime(fiveMinAgo)).toBe('5m ago')
    })

    it('should format hours ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60000).toISOString()
      expect(formatRelativeTime(twoHoursAgo)).toBe('2h ago')
    })

    it('should format days ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60000).toISOString()
      expect(formatRelativeTime(threeDaysAgo)).toBe('3d ago')
    })

    it('should format older dates with month and day', () => {
      const oldDate = '2025-06-15T10:00:00Z'
      const result = formatRelativeTime(oldDate)
      expect(result).toContain('Jun')
      expect(result).toContain('15')
    })

    it('should handle zero minutes ago', () => {
      const justNow = new Date().toISOString()
      expect(formatRelativeTime(justNow)).toBe('0m ago')
    })
  })
})

// ============================================================
// 6. HELPER FUNCTIONS
// ============================================================

describe('P0 - Helper Functions', () => {
  describe('getApplicationById', () => {
    it('should find existing application', () => {
      const app = getApplicationById('app-001')
      expect(app).toBeDefined()
      expect(app!.company_name).toBe('Stripe')
    })

    it('should return undefined for non-existent ID', () => {
      const app = getApplicationById('non-existent')
      expect(app).toBeUndefined()
    })

    it('should find each application by its ID', () => {
      for (const app of mockJobApplications) {
        const found = getApplicationById(app.id)
        expect(found).toBeDefined()
        expect(found!.id).toBe(app.id)
      }
    })
  })

  describe('getCVVersionByApplicationId', () => {
    it('should find CV for Stripe application', () => {
      const cv = getCVVersionByApplicationId('app-001')
      expect(cv).toBeDefined()
      expect(cv!.company_name).toBe('Stripe')
    })

    it('should return undefined for application without CV', () => {
      const cv = getCVVersionByApplicationId('app-003')
      expect(cv).toBeUndefined()
    })
  })

  describe('getActiveApplications', () => {
    it('should exclude rejected applications', () => {
      const active = getActiveApplications()
      const rejected = active.filter((a) => a.application_status === 'rejected')
      expect(rejected.length).toBe(0)
    })

    it('should exclude withdrawn applications', () => {
      const active = getActiveApplications()
      const withdrawn = active.filter((a) => a.application_status === 'withdrawn')
      expect(withdrawn.length).toBe(0)
    })

    it('should exclude accepted applications', () => {
      const active = getActiveApplications()
      const accepted = active.filter((a) => a.application_status === 'accepted')
      expect(accepted.length).toBe(0)
    })

    it('should include prepared, applied, interview_scheduled, interviewed, offer_received, negotiating', () => {
      const active = getActiveApplications()
      const validStatuses = new Set([
        'prepared', 'applied', 'interview_scheduled', 'interviewed',
        'offer_received', 'negotiating',
      ])
      for (const app of active) {
        expect(validStatuses.has(app.application_status)).toBe(true)
      }
    })

    it('should match the metrics activeApplications count', () => {
      const active = getActiveApplications()
      expect(active.length).toBe(mockDashboardMetrics.activeApplications)
    })
  })

  describe('getApplicationsWithInterviews', () => {
    it('should return only interview_scheduled applications', () => {
      const interviews = getApplicationsWithInterviews()
      for (const app of interviews) {
        expect(app.application_status).toBe('interview_scheduled')
      }
    })

    it('should match the metrics interviewsScheduled count', () => {
      const interviews = getApplicationsWithInterviews()
      expect(interviews.length).toBe(mockDashboardMetrics.interviewsScheduled)
    })

    it('should include Stripe and Airbnb', () => {
      const interviews = getApplicationsWithInterviews()
      const companies = interviews.map((a) => a.company_name)
      expect(companies).toContain('Stripe')
      expect(companies).toContain('Airbnb')
    })
  })
})

// ============================================================
// 7. NAVIGATION BADGES: Config Alignment
// ============================================================

describe('P0 - Navigation Badge Configuration', () => {
  // Mirrors navItems from nav.tsx
  const navItems = [
    { href: '/dashboard', label: 'Dashboard', badge: undefined },
    { href: '/companion', label: 'Companion', badge: undefined },
    { href: '/applications', label: 'Applications', badge: 10, badgeColor: 'bg-lavender text-white' },
    { href: '/cv', label: 'CV Tailor', badge: undefined },
    { href: '/interview', label: 'Interview', badge: 3, badgeColor: 'bg-sky text-white' },
    { href: '/compensation', label: 'Offers', badge: 1, badgeColor: 'bg-success text-white' },
    { href: '/contract', label: 'Contract', badge: undefined },
    { href: '/settings', label: 'Settings', badge: undefined },
  ]

  it('should have 8 navigation items', () => {
    expect(navItems.length).toBe(8)
  })

  it('should have 3 items with badges', () => {
    const withBadges = navItems.filter((n) => n.badge !== undefined)
    expect(withBadges.length).toBe(3)
  })

  it('Applications badge should be 10', () => {
    const apps = navItems.find((n) => n.label === 'Applications')
    expect(apps!.badge).toBe(10)
  })

  it('Interview badge should be 3', () => {
    const interview = navItems.find((n) => n.label === 'Interview')
    expect(interview!.badge).toBe(3)
  })

  it('Offers badge should be 1', () => {
    const offers = navItems.find((n) => n.label === 'Offers')
    expect(offers!.badge).toBe(1)
  })

  it('should have correct badge colors', () => {
    const apps = navItems.find((n) => n.label === 'Applications')
    expect(apps!.badgeColor).toContain('bg-lavender')

    const interview = navItems.find((n) => n.label === 'Interview')
    expect(interview!.badgeColor).toContain('bg-sky')

    const offers = navItems.find((n) => n.label === 'Offers')
    expect(offers!.badgeColor).toContain('bg-success')
  })

  describe('isNavActive logic', () => {
    function isNavActive(href: string, pathname: string): boolean {
      if (href === '/dashboard') {
        return pathname === '/dashboard' || pathname === '/'
      }
      return pathname === href || pathname.startsWith(href + '/')
    }

    it('should match /dashboard for dashboard nav', () => {
      expect(isNavActive('/dashboard', '/dashboard')).toBe(true)
    })

    it('should match / for dashboard nav', () => {
      expect(isNavActive('/dashboard', '/')).toBe(true)
    })

    it('should match exact path', () => {
      expect(isNavActive('/applications', '/applications')).toBe(true)
    })

    it('should match child paths', () => {
      expect(isNavActive('/applications', '/applications/app-001')).toBe(true)
    })

    it('should not match unrelated paths', () => {
      expect(isNavActive('/applications', '/cv')).toBe(false)
    })

    it('should not match partial prefix matches', () => {
      expect(isNavActive('/cv', '/cv-tailor')).toBe(false)
    })
  })
})

// ============================================================
// 8. CROSS-REFERENCE: Mock Data ↔ Metrics Consistency
// ============================================================

describe('P0 - Cross-Reference Consistency', () => {
  it('Databricks should be the offer_received application', () => {
    const databricks = mockJobApplications.find((a) => a.company_name === 'Databricks')
    expect(databricks).toBeDefined()
    expect(databricks!.application_status).toBe('offer_received')
  })

  it('Databricks should have offer_details', () => {
    const databricks = mockJobApplications.find((a) => a.company_name === 'Databricks')
    expect(databricks!.offer_details).toBeDefined()
  })

  it('Coinbase should be rejected', () => {
    const coinbase = mockJobApplications.find((a) => a.company_name === 'Coinbase')
    expect(coinbase).toBeDefined()
    expect(coinbase!.application_status).toBe('rejected')
    expect(coinbase!.outcome).toBe('rejected')
  })

  it('Linear should be withdrawn', () => {
    const linear = mockJobApplications.find((a) => a.company_name === 'Linear')
    expect(linear).toBeDefined()
    expect(linear!.application_status).toBe('withdrawn')
    expect(linear!.outcome).toBe('withdrawn')
  })

  it('activity items should reference correct companies', () => {
    const offerActivity = mockActivityItems.find((a) => a.type === 'offer')
    expect(offerActivity!.description).toContain('Databricks')
    expect(offerActivity!.applicationId).toBe('app-006')
  })

  it('CV versions should reference existing applications', () => {
    const appIds = new Set(mockJobApplications.map((a) => a.id))
    for (const cv of mockCVVersions) {
      if (cv.job_application_id) {
        expect(appIds.has(cv.job_application_id)).toBe(true)
      }
    }
  })

  it('session_connections should be typed correctly', () => {
    for (const app of mockJobApplications) {
      if (app.session_connections) {
        expect(typeof app.session_connections.cv_completed).toBe('boolean')
        expect(typeof app.session_connections.interview_completed).toBe('boolean')
        expect(typeof app.session_connections.compensation_completed).toBe('boolean')
        expect(typeof app.session_connections.contract_completed).toBe('boolean')
      }
    }
  })
})
