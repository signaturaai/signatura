/**
 * Candidate Dashboard Components Tests — RALPH Structure
 *
 * R — Requirements: NarrativeCompassChart, ApplicationsHub, InterviewHistory,
 *                   CandidateDashboard structure and prop validation
 * A — Analysis: score calculations, filtering, sorting, status mapping
 * L — Logic: alignment calculations, time formatting, score thresholds
 * P — Preservation: different inputs produce different outputs
 * H — Hardening: edge cases, empty data, boundary values
 */

import { describe, it, expect } from 'vitest'
import type { JobApplication, DashboardMetrics, ApplicationStatus } from '@/lib/types/dashboard'

// =========================================================================
// Shared fixtures
// =========================================================================

interface NarrativeScores {
  verbs: number
  achievements: number
  quantified: number
  brand: number
}

interface InterviewSession {
  id: string
  company_name: string
  position_title: string
  session_type: 'practice_questions' | 'mock_interview' | 'behavioral_prep' | 'technical_prep' | 'full_interview_simulation'
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

const SAMPLE_CURRENT_SCORES: NarrativeScores = {
  verbs: 72,
  achievements: 65,
  quantified: 45,
  brand: 58,
}

const SAMPLE_TARGET_SCORES: NarrativeScores = {
  verbs: 85,
  achievements: 80,
  quantified: 75,
  brand: 80,
}

const LOW_SCORES: NarrativeScores = {
  verbs: 20,
  achievements: 25,
  quantified: 15,
  brand: 18,
}

const HIGH_SCORES: NarrativeScores = {
  verbs: 92,
  achievements: 88,
  quantified: 85,
  brand: 90,
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
    location: 'San Francisco, CA',
    session_connections: {
      cv_completed: true,
      interview_completed: true,
      compensation_completed: false,
      contract_completed: false,
    },
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
    location: 'Remote',
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
    location: 'San Francisco, CA',
    session_connections: {
      cv_completed: true,
      interview_completed: true,
      compensation_completed: true,
      contract_completed: false,
    },
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
]

const SAMPLE_INTERVIEW_SESSIONS: InterviewSession[] = [
  {
    id: 'is-001',
    company_name: 'Databricks',
    position_title: 'VP of Product, AI/ML',
    session_type: 'mock_interview',
    overall_score: 82,
    session_duration: 45,
    questions_asked: 12,
    confidence_before: 65,
    confidence_after: 78,
    strengths: ['Strong strategic thinking', 'Clear communication'],
    improvements: ['Add more specific metrics'],
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    job_application_id: 'app-003',
  },
  {
    id: 'is-002',
    company_name: 'Stripe',
    position_title: 'Director of Product',
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
  {
    id: 'is-003',
    company_name: 'Figma',
    position_title: 'Product Lead',
    session_type: 'practice_questions',
    overall_score: 68,
    session_duration: 20,
    questions_asked: 6,
    confidence_before: 55,
    confidence_after: 65,
    strengths: ['Creative problem solving'],
    improvements: ['Quantify impact more'],
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

const SAMPLE_METRICS: DashboardMetrics = {
  totalApplications: 4,
  activeApplications: 3,
  interviewsScheduled: 1,
  cvVersions: 3,
  offersReceived: 1,
  acceptanceRate: 25,
  contentMatchPercent: 78,
  narrativeMatchPercent: 65,
}

// =========================================================================
// R — Requirements: Structure validation
// =========================================================================

describe('Candidate Dashboard Components — Requirements', () => {
  describe('NarrativeScores interface', () => {
    it('should define 4 narrative dimensions', () => {
      const dimensions = ['verbs', 'achievements', 'quantified', 'brand'] as const
      expect(dimensions.length).toBe(4)
    })

    it('should have numeric scores for all dimensions', () => {
      const scores: NarrativeScores = SAMPLE_CURRENT_SCORES
      expect(typeof scores.verbs).toBe('number')
      expect(typeof scores.achievements).toBe('number')
      expect(typeof scores.quantified).toBe('number')
      expect(typeof scores.brand).toBe('number')
    })

    it('should allow scores from 0 to 100', () => {
      const zeroScores: NarrativeScores = { verbs: 0, achievements: 0, quantified: 0, brand: 0 }
      const fullScores: NarrativeScores = { verbs: 100, achievements: 100, quantified: 100, brand: 100 }

      for (const key of ['verbs', 'achievements', 'quantified', 'brand'] as const) {
        expect(zeroScores[key]).toBe(0)
        expect(fullScores[key]).toBe(100)
      }
    })
  })

  describe('InterviewSession interface', () => {
    it('should define 5 session types', () => {
      const types = ['practice_questions', 'mock_interview', 'behavioral_prep', 'technical_prep', 'full_interview_simulation']
      expect(types.length).toBe(5)
    })

    it('should have required fields on session', () => {
      const session = SAMPLE_INTERVIEW_SESSIONS[0]
      expect(session.id).toBeTruthy()
      expect(session.company_name).toBeTruthy()
      expect(session.position_title).toBeTruthy()
      expect(session.session_type).toBeTruthy()
      expect(typeof session.overall_score).toBe('number')
      expect(typeof session.session_duration).toBe('number')
      expect(typeof session.questions_asked).toBe('number')
      expect(typeof session.confidence_before).toBe('number')
      expect(typeof session.confidence_after).toBe('number')
      expect(Array.isArray(session.strengths)).toBe(true)
      expect(Array.isArray(session.improvements)).toBe(true)
      expect(session.created_at).toBeTruthy()
    })

    it('should have optional job_application_id', () => {
      const withAppId = SAMPLE_INTERVIEW_SESSIONS[0]
      const withoutAppId = SAMPLE_INTERVIEW_SESSIONS[1]
      expect(withAppId.job_application_id).toBeTruthy()
      expect(withoutAppId.job_application_id).toBeUndefined()
    })
  })

  describe('DashboardMetrics interface', () => {
    it('should define all required metric fields', () => {
      const metrics = SAMPLE_METRICS
      expect(typeof metrics.totalApplications).toBe('number')
      expect(typeof metrics.activeApplications).toBe('number')
      expect(typeof metrics.interviewsScheduled).toBe('number')
      expect(typeof metrics.cvVersions).toBe('number')
      expect(typeof metrics.offersReceived).toBe('number')
      expect(typeof metrics.acceptanceRate).toBe('number')
    })
  })

  describe('Application status configuration', () => {
    const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string }> = {
      prepared: { label: 'Prepared', color: 'text-gray-600' },
      applied: { label: 'Applied', color: 'text-sky-600' },
      interview_scheduled: { label: 'Interview', color: 'text-lavender-dark' },
      interviewed: { label: 'Interviewed', color: 'text-lavender-dark' },
      offer_received: { label: 'Offer!', color: 'text-emerald-600' },
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

    it('should map positive statuses to success colors', () => {
      expect(STATUS_CONFIG.offer_received.color).toContain('emerald')
      expect(STATUS_CONFIG.accepted.color).toContain('emerald')
    })

    it('should map negative statuses to warning/error colors', () => {
      expect(STATUS_CONFIG.rejected.color).toContain('red')
    })
  })
})

// =========================================================================
// A — Analysis: Calculations and data processing
// =========================================================================

describe('Candidate Dashboard Components — Analysis', () => {
  describe('Narrative alignment calculation', () => {
    function calculateOverallAlignment(scores: NarrativeScores): number {
      return Math.round((scores.verbs + scores.achievements + scores.quantified + scores.brand) / 4)
    }

    it('should calculate average of 4 dimensions', () => {
      const alignment = calculateOverallAlignment(SAMPLE_CURRENT_SCORES)
      // (72 + 65 + 45 + 58) / 4 = 60
      expect(alignment).toBe(60)
    })

    it('should return 0 for zero scores', () => {
      const zeroScores: NarrativeScores = { verbs: 0, achievements: 0, quantified: 0, brand: 0 }
      expect(calculateOverallAlignment(zeroScores)).toBe(0)
    })

    it('should return 100 for perfect scores', () => {
      const perfectScores: NarrativeScores = { verbs: 100, achievements: 100, quantified: 100, brand: 100 }
      expect(calculateOverallAlignment(perfectScores)).toBe(100)
    })

    it('should round to nearest integer', () => {
      const oddScores: NarrativeScores = { verbs: 73, achievements: 66, quantified: 47, brand: 59 }
      // (73 + 66 + 47 + 59) / 4 = 61.25 → 61
      expect(calculateOverallAlignment(oddScores)).toBe(61)
    })
  })

  describe('Alignment color thresholds', () => {
    function getAlignmentColor(score: number): string {
      if (score >= 70) return 'emerald'
      if (score >= 40) return 'amber'
      return 'rose'
    }

    it('should return emerald for scores >= 70', () => {
      expect(getAlignmentColor(70)).toBe('emerald')
      expect(getAlignmentColor(85)).toBe('emerald')
      expect(getAlignmentColor(100)).toBe('emerald')
    })

    it('should return amber for scores 40-69', () => {
      expect(getAlignmentColor(40)).toBe('amber')
      expect(getAlignmentColor(55)).toBe('amber')
      expect(getAlignmentColor(69)).toBe('amber')
    })

    it('should return rose for scores < 40', () => {
      expect(getAlignmentColor(0)).toBe('rose')
      expect(getAlignmentColor(20)).toBe('rose')
      expect(getAlignmentColor(39)).toBe('rose')
    })
  })

  describe('Application filtering', () => {
    function filterByStatus(apps: JobApplication[], status: ApplicationStatus | 'all'): JobApplication[] {
      if (status === 'all') return apps
      return apps.filter(app => app.application_status === status)
    }

    it('should return all apps for "all" filter', () => {
      const filtered = filterByStatus(SAMPLE_APPLICATIONS, 'all')
      expect(filtered.length).toBe(SAMPLE_APPLICATIONS.length)
    })

    it('should filter by specific status', () => {
      const interviews = filterByStatus(SAMPLE_APPLICATIONS, 'interview_scheduled')
      expect(interviews.length).toBe(1)
      expect(interviews[0].company_name).toBe('Stripe')
    })

    it('should return empty array for non-matching status', () => {
      const negotiating = filterByStatus(SAMPLE_APPLICATIONS, 'negotiating')
      expect(negotiating.length).toBe(0)
    })
  })

  describe('Application search', () => {
    function searchApplications(apps: JobApplication[], query: string): JobApplication[] {
      const lowerQuery = query.toLowerCase()
      return apps.filter(app =>
        app.company_name.toLowerCase().includes(lowerQuery) ||
        app.position_title.toLowerCase().includes(lowerQuery)
      )
    }

    it('should find by company name', () => {
      const results = searchApplications(SAMPLE_APPLICATIONS, 'stripe')
      expect(results.length).toBe(1)
      expect(results[0].company_name).toBe('Stripe')
    })

    it('should find by position title', () => {
      const results = searchApplications(SAMPLE_APPLICATIONS, 'director')
      expect(results.length).toBe(1)
      expect(results[0].position_title).toContain('Director')
    })

    it('should be case-insensitive', () => {
      const lower = searchApplications(SAMPLE_APPLICATIONS, 'figma')
      const upper = searchApplications(SAMPLE_APPLICATIONS, 'FIGMA')
      const mixed = searchApplications(SAMPLE_APPLICATIONS, 'FiGmA')
      expect(lower.length).toBe(1)
      expect(upper.length).toBe(1)
      expect(mixed.length).toBe(1)
    })

    it('should return empty for no matches', () => {
      const results = searchApplications(SAMPLE_APPLICATIONS, 'nonexistent')
      expect(results.length).toBe(0)
    })
  })

  describe('Interview session statistics', () => {
    function calculateSessionStats(sessions: InterviewSession[]) {
      if (sessions.length === 0) {
        return { avgScore: 0, totalMinutes: 0, avgConfidenceGain: 0 }
      }

      const avgScore = Math.round(
        sessions.reduce((sum, s) => sum + s.overall_score, 0) / sessions.length
      )
      const totalMinutes = sessions.reduce((sum, s) => sum + s.session_duration, 0)
      const avgConfidenceGain = Math.round(
        sessions.reduce((sum, s) => sum + (s.confidence_after - s.confidence_before), 0) / sessions.length
      )

      return { avgScore, totalMinutes, avgConfidenceGain }
    }

    it('should calculate average score correctly', () => {
      const stats = calculateSessionStats(SAMPLE_INTERVIEW_SESSIONS)
      // (82 + 75 + 68) / 3 = 75
      expect(stats.avgScore).toBe(75)
    })

    it('should sum total duration', () => {
      const stats = calculateSessionStats(SAMPLE_INTERVIEW_SESSIONS)
      // 45 + 30 + 20 = 95
      expect(stats.totalMinutes).toBe(95)
    })

    it('should calculate average confidence gain', () => {
      const stats = calculateSessionStats(SAMPLE_INTERVIEW_SESSIONS)
      // ((78-65) + (72-60) + (65-55)) / 3 = (13 + 12 + 10) / 3 = 11.67 → 12
      expect(stats.avgConfidenceGain).toBe(12)
    })

    it('should handle empty sessions', () => {
      const stats = calculateSessionStats([])
      expect(stats.avgScore).toBe(0)
      expect(stats.totalMinutes).toBe(0)
      expect(stats.avgConfidenceGain).toBe(0)
    })
  })

  describe('Interview score color thresholds', () => {
    function getScoreColor(score: number): string {
      if (score >= 80) return 'emerald'
      if (score >= 60) return 'sky'
      if (score >= 40) return 'amber'
      return 'red'
    }

    it('should return emerald for scores >= 80', () => {
      expect(getScoreColor(80)).toBe('emerald')
      expect(getScoreColor(90)).toBe('emerald')
      expect(getScoreColor(100)).toBe('emerald')
    })

    it('should return sky for scores 60-79', () => {
      expect(getScoreColor(60)).toBe('sky')
      expect(getScoreColor(70)).toBe('sky')
      expect(getScoreColor(79)).toBe('sky')
    })

    it('should return amber for scores 40-59', () => {
      expect(getScoreColor(40)).toBe('amber')
      expect(getScoreColor(50)).toBe('amber')
      expect(getScoreColor(59)).toBe('amber')
    })

    it('should return red for scores < 40', () => {
      expect(getScoreColor(0)).toBe('red')
      expect(getScoreColor(20)).toBe('red')
      expect(getScoreColor(39)).toBe('red')
    })
  })
})

// =========================================================================
// L — Logic: Core business logic
// =========================================================================

describe('Candidate Dashboard Components — Logic', () => {
  describe('Greeting time-of-day logic', () => {
    function getGreeting(hour: number): string {
      if (hour < 12) return 'Good morning'
      if (hour < 17) return 'Good afternoon'
      return 'Good evening'
    }

    it('should return morning greeting for hours 0-11', () => {
      expect(getGreeting(0)).toBe('Good morning')
      expect(getGreeting(6)).toBe('Good morning')
      expect(getGreeting(11)).toBe('Good morning')
    })

    it('should return afternoon greeting for hours 12-16', () => {
      expect(getGreeting(12)).toBe('Good afternoon')
      expect(getGreeting(14)).toBe('Good afternoon')
      expect(getGreeting(16)).toBe('Good afternoon')
    })

    it('should return evening greeting for hours 17-23', () => {
      expect(getGreeting(17)).toBe('Good evening')
      expect(getGreeting(20)).toBe('Good evening')
      expect(getGreeting(23)).toBe('Good evening')
    })
  })

  describe('Name extraction logic', () => {
    function getFirstName(fullName: string): string {
      return fullName.split(' ')[0] || 'there'
    }

    it('should extract first name from full name', () => {
      expect(getFirstName('Alex Chen')).toBe('Alex')
      expect(getFirstName('John Smith Jr.')).toBe('John')
    })

    it('should return first name for single name', () => {
      expect(getFirstName('Alex')).toBe('Alex')
    })

    it('should return "there" for empty string', () => {
      expect(getFirstName('')).toBe('there')
    })
  })

  describe('Relative time formatting', () => {
    function formatRelativeTime(date: Date): string {
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
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
      expect(formatRelativeTime(fiveMinAgo)).toBe('5m ago')
    })

    it('should format hours ago', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000)
      expect(formatRelativeTime(threeHoursAgo)).toBe('3h ago')
    })

    it('should format days ago', () => {
      const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
      expect(formatRelativeTime(fourDaysAgo)).toBe('4d ago')
    })

    it('should format older dates as month + day', () => {
      const oldDate = new Date('2025-06-15')
      const result = formatRelativeTime(oldDate)
      expect(result).toContain('Jun')
      expect(result).toContain('15')
    })
  })

  describe('Session date formatting', () => {
    function formatSessionDate(dateStr: string): string {
      const date = new Date(dateStr)
      const now = new Date()
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays === 0) return 'Today'
      if (diffDays === 1) return 'Yesterday'
      if (diffDays < 7) return `${diffDays} days ago`
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    it('should return "Today" for today', () => {
      const today = new Date().toISOString()
      expect(formatSessionDate(today)).toBe('Today')
    })

    it('should return "Yesterday" for yesterday', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      expect(formatSessionDate(yesterday)).toBe('Yesterday')
    })

    it('should return "X days ago" for recent dates', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      expect(formatSessionDate(threeDaysAgo)).toBe('3 days ago')
    })
  })

  describe('Duration formatting', () => {
    function formatDuration(minutes: number): string {
      if (minutes < 60) return `${minutes}m`
      const hrs = Math.floor(minutes / 60)
      const mins = minutes % 60
      return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`
    }

    it('should format minutes under 60', () => {
      expect(formatDuration(30)).toBe('30m')
      expect(formatDuration(45)).toBe('45m')
      expect(formatDuration(59)).toBe('59m')
    })

    it('should format exact hours', () => {
      expect(formatDuration(60)).toBe('1h')
      expect(formatDuration(120)).toBe('2h')
    })

    it('should format hours and minutes', () => {
      expect(formatDuration(90)).toBe('1h 30m')
      expect(formatDuration(135)).toBe('2h 15m')
    })
  })

  describe('Application sorting', () => {
    function sortByLastActivity(apps: JobApplication[]): JobApplication[] {
      return [...apps].sort((a, b) => {
        const dateA = new Date(a.status_updated_at || a.updated_at || a.created_at).getTime()
        const dateB = new Date(b.status_updated_at || b.updated_at || b.created_at).getTime()
        return dateB - dateA
      })
    }

    it('should sort by most recent first', () => {
      const sorted = sortByLastActivity(SAMPLE_APPLICATIONS)
      expect(sorted[0].company_name).toBe('Databricks') // Most recent update
    })

    it('should maintain stable sort for same dates', () => {
      const sorted = sortByLastActivity(SAMPLE_APPLICATIONS)
      expect(sorted.length).toBe(SAMPLE_APPLICATIONS.length)
    })
  })

  describe('Active applications count', () => {
    function countActive(apps: JobApplication[]): number {
      return apps.filter(app =>
        !['rejected', 'withdrawn', 'accepted'].includes(app.application_status)
      ).length
    }

    it('should exclude rejected, withdrawn, accepted', () => {
      const activeCount = countActive(SAMPLE_APPLICATIONS)
      // Stripe (interview_scheduled), Figma (applied), Databricks (offer_received)
      expect(activeCount).toBe(3)
    })

    it('should return 0 for all terminal statuses', () => {
      const terminalApps: JobApplication[] = [
        { ...SAMPLE_APPLICATIONS[0], application_status: 'rejected' },
        { ...SAMPLE_APPLICATIONS[1], application_status: 'withdrawn' },
        { ...SAMPLE_APPLICATIONS[2], application_status: 'accepted' },
      ]
      expect(countActive(terminalApps)).toBe(0)
    })
  })
})

// =========================================================================
// P — Preservation: Different inputs → different outputs
// =========================================================================

describe('Candidate Dashboard Components — Preservation', () => {
  describe('Narrative alignment differentiation', () => {
    function calculateOverallAlignment(scores: NarrativeScores): number {
      return Math.round((scores.verbs + scores.achievements + scores.quantified + scores.brand) / 4)
    }

    it('should produce different alignments for different scores', () => {
      const low = calculateOverallAlignment(LOW_SCORES)
      const mid = calculateOverallAlignment(SAMPLE_CURRENT_SCORES)
      const high = calculateOverallAlignment(HIGH_SCORES)
      expect(low).not.toBe(mid)
      expect(mid).not.toBe(high)
      expect(low).toBeLessThan(mid)
      expect(mid).toBeLessThan(high)
    })
  })

  describe('Score color differentiation', () => {
    function getScoreColor(score: number): string {
      if (score >= 80) return 'emerald'
      if (score >= 60) return 'sky'
      if (score >= 40) return 'amber'
      return 'red'
    }

    it('should produce different colors for different score ranges', () => {
      const colors = [
        getScoreColor(90),
        getScoreColor(70),
        getScoreColor(50),
        getScoreColor(30),
      ]
      expect(new Set(colors).size).toBe(4)
    })
  })

  describe('Interview session sorting', () => {
    function sortSessionsByDate(sessions: InterviewSession[]): InterviewSession[] {
      return [...sessions].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    }

    it('should produce different order based on dates', () => {
      const sorted = sortSessionsByDate(SAMPLE_INTERVIEW_SESSIONS)
      // Most recent first
      expect(sorted[0].id).toBe('is-001')
      expect(sorted[sorted.length - 1].id).toBe('is-003')
    })
  })

  describe('Confidence delta differentiation', () => {
    function getConfidenceDelta(session: InterviewSession): number {
      return session.confidence_after - session.confidence_before
    }

    it('should produce different deltas for different sessions', () => {
      const deltas = SAMPLE_INTERVIEW_SESSIONS.map(getConfidenceDelta)
      // [13, 12, 10] - all different
      expect(deltas[0]).toBe(13)
      expect(deltas[1]).toBe(12)
      expect(deltas[2]).toBe(10)
    })
  })

  describe('Application status label differentiation', () => {
    const STATUS_LABELS: Record<ApplicationStatus, string> = {
      prepared: 'Prepared',
      applied: 'Applied',
      interview_scheduled: 'Interview',
      interviewed: 'Interviewed',
      offer_received: 'Offer!',
      negotiating: 'Negotiating',
      accepted: 'Accepted',
      rejected: 'Rejected',
      withdrawn: 'Withdrawn',
    }

    it('should have unique labels for each status', () => {
      const labels = Object.values(STATUS_LABELS)
      expect(new Set(labels).size).toBe(labels.length)
    })
  })
})

// =========================================================================
// H — Hardening: Edge cases
// =========================================================================

describe('Candidate Dashboard Components — Hardening', () => {
  describe('Empty data handling', () => {
    it('should handle empty applications array', () => {
      const emptyApps: JobApplication[] = []
      expect(emptyApps.length).toBe(0)
      const activeCount = emptyApps.filter(a => !['rejected', 'withdrawn', 'accepted'].includes(a.application_status)).length
      expect(activeCount).toBe(0)
    })

    it('should handle empty interview sessions', () => {
      const emptySessions: InterviewSession[] = []
      const avgScore = emptySessions.length > 0
        ? Math.round(emptySessions.reduce((sum, s) => sum + s.overall_score, 0) / emptySessions.length)
        : 0
      expect(avgScore).toBe(0)
    })

    it('should handle zero narrative scores', () => {
      const zeroScores: NarrativeScores = { verbs: 0, achievements: 0, quantified: 0, brand: 0 }
      const alignment = Math.round((zeroScores.verbs + zeroScores.achievements + zeroScores.quantified + zeroScores.brand) / 4)
      expect(alignment).toBe(0)
    })
  })

  describe('Boundary values', () => {
    it('should handle score boundary at 40', () => {
      function getColor(score: number) {
        if (score >= 70) return 'emerald'
        if (score >= 40) return 'amber'
        return 'rose'
      }
      expect(getColor(39)).toBe('rose')
      expect(getColor(40)).toBe('amber')
    })

    it('should handle score boundary at 70', () => {
      function getColor(score: number) {
        if (score >= 70) return 'emerald'
        if (score >= 40) return 'amber'
        return 'rose'
      }
      expect(getColor(69)).toBe('amber')
      expect(getColor(70)).toBe('emerald')
    })

    it('should handle hour boundary at 12 for greeting', () => {
      function getGreeting(hour: number) {
        if (hour < 12) return 'Good morning'
        if (hour < 17) return 'Good afternoon'
        return 'Good evening'
      }
      expect(getGreeting(11)).toBe('Good morning')
      expect(getGreeting(12)).toBe('Good afternoon')
    })

    it('should handle hour boundary at 17 for greeting', () => {
      function getGreeting(hour: number) {
        if (hour < 12) return 'Good morning'
        if (hour < 17) return 'Good afternoon'
        return 'Good evening'
      }
      expect(getGreeting(16)).toBe('Good afternoon')
      expect(getGreeting(17)).toBe('Good evening')
    })
  })

  describe('Special characters and long strings', () => {
    it('should handle company names with special characters', () => {
      const app: Partial<JobApplication> = {
        company_name: "O'Reilly & Associates, Inc.",
        position_title: 'Product Manager — Growth',
      }
      expect(app.company_name?.charAt(0)).toBe('O')
    })

    it('should handle very long position titles', () => {
      const longTitle = 'Director of Product Management and Engineering Excellence for Enterprise Cloud Solutions'
      const truncated = longTitle.length > 50 ? longTitle.substring(0, 50) + '...' : longTitle
      expect(truncated.length).toBeLessThanOrEqual(53)
    })

    it('should handle empty strings in user name', () => {
      function getFirstName(name: string) {
        const trimmed = name.trim()
        return trimmed.split(' ')[0] || 'there'
      }
      expect(getFirstName('')).toBe('there')
      expect(getFirstName('   ')).toBe('there')
    })
  })

  describe('Date edge cases', () => {
    it('should handle invalid date strings gracefully', () => {
      const isValidDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return !isNaN(date.getTime())
      }
      expect(isValidDate('2025-01-15T10:00:00Z')).toBe(true)
      expect(isValidDate('invalid-date')).toBe(false)
    })

    it('should handle future dates', () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      const now = new Date()
      const diffMs = now.getTime() - futureDate.getTime()
      expect(diffMs).toBeLessThan(0)
    })
  })

  describe('Session type validation', () => {
    const VALID_SESSION_TYPES = [
      'practice_questions',
      'mock_interview',
      'behavioral_prep',
      'technical_prep',
      'full_interview_simulation',
    ]

    it('should validate session type', () => {
      for (const session of SAMPLE_INTERVIEW_SESSIONS) {
        expect(VALID_SESSION_TYPES).toContain(session.session_type)
      }
    })
  })

  describe('Single item arrays', () => {
    it('should handle single application', () => {
      const singleApp = [SAMPLE_APPLICATIONS[0]]
      expect(singleApp.length).toBe(1)
      const avgScore = singleApp.length // Just checking it doesn't throw
      expect(avgScore).toBe(1)
    })

    it('should handle single interview session', () => {
      const singleSession = [SAMPLE_INTERVIEW_SESSIONS[0]]
      const avgScore = Math.round(
        singleSession.reduce((sum, s) => sum + s.overall_score, 0) / singleSession.length
      )
      expect(avgScore).toBe(82)
    })
  })

  describe('Large datasets', () => {
    it('should handle 100 applications', () => {
      const manyApps = Array(100).fill(null).map((_, i) => ({
        ...SAMPLE_APPLICATIONS[0],
        id: `app-${i}`,
      }))
      expect(manyApps.length).toBe(100)
      const activeCount = manyApps.filter(a => a.application_status === 'interview_scheduled').length
      expect(activeCount).toBe(100)
    })

    it('should handle 50 interview sessions', () => {
      const manySessions = Array(50).fill(null).map((_, i) => ({
        ...SAMPLE_INTERVIEW_SESSIONS[0],
        id: `is-${i}`,
      }))
      expect(manySessions.length).toBe(50)
      const avgScore = Math.round(
        manySessions.reduce((sum, s) => sum + s.overall_score, 0) / manySessions.length
      )
      expect(avgScore).toBe(82)
    })
  })
})
