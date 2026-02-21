/**
 * Phase 8 RALPH Tests: Navigation Integration + Dashboard Summary Card
 *
 * Tests navigation integration and dashboard summary card functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import fs from 'fs'
import path from 'path'

// =============================================================================
// Test Setup
// =============================================================================

// Mock Next.js navigation
const mockPush = vi.fn()
const mockUseRouter = vi.fn(() => ({
  push: mockPush,
  refresh: vi.fn(),
}))
const mockUsePathname = vi.fn(() => '/dashboard')

vi.mock('next/navigation', () => ({
  useRouter: () => mockUseRouter(),
  usePathname: () => mockUsePathname(),
}))

// Mock Next/Image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}))

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
    }),
    signOut: vi.fn().mockResolvedValue({}),
  },
  from: vi.fn(),
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}))

// Helper to setup Supabase mock responses
function setupSupabaseMock(options: {
  newMatchCount?: number
  topMatches?: Array<{ id: string; job_title: string; company_name: string; match_score: number }>
  lastSearchedAt?: string | null
  noUser?: boolean
} = {}) {
  const {
    newMatchCount = 0,
    topMatches = [],
    lastSearchedAt = null,
    noUser = false,
  } = options

  if (noUser) {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
    })
  } else {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
    })
  }

  mockSupabaseClient.from.mockImplementation((table: string) => {
    if (table === 'job_matches') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: topMatches, error: null }),
                }),
              }),
              // For count query
              count: newMatchCount,
            }),
          }),
        }),
      }
    }
    if (table === 'job_search_preferences') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: lastSearchedAt ? { last_search_at: lastSearchedAt } : null,
              error: null,
            }),
          }),
        }),
      }
    }
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }
  })
}

// =============================================================================
// SECTION R: Rendering Tests - Navigation
// =============================================================================

describe('Navigation - Job Search Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupSupabaseMock()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('R: navigation component file exists', () => {
    const navPath = path.resolve(__dirname, '../../src/components/dashboard/nav.tsx')
    expect(fs.existsSync(navPath)).toBe(true)
  })

  it('R: navigation component imports Search icon', async () => {
    const navPath = path.resolve(__dirname, '../../src/components/dashboard/nav.tsx')
    const content = fs.readFileSync(navPath, 'utf-8')
    expect(content).toContain('Search')
    expect(content).toContain("from 'lucide-react'")
  })

  it('R: navigation has Job Search nav item configured', async () => {
    const navPath = path.resolve(__dirname, '../../src/components/dashboard/nav.tsx')
    const content = fs.readFileSync(navPath, 'utf-8')

    // Check for Job Search nav item
    expect(content).toContain("href: '/job-search'")
    expect(content).toContain("label: 'Job Search'")
    expect(content).toContain("id: 'job-search'")
  })

  it('R: Job Search nav item is positioned after Applications', async () => {
    const navPath = path.resolve(__dirname, '../../src/components/dashboard/nav.tsx')
    const content = fs.readFileSync(navPath, 'utf-8')

    // Find the positions of Applications and Job Search in navItems array
    const applicationsIndex = content.indexOf("href: '/applications'")
    const jobSearchIndex = content.indexOf("href: '/job-search'")

    expect(applicationsIndex).toBeGreaterThan(-1)
    expect(jobSearchIndex).toBeGreaterThan(-1)
    expect(jobSearchIndex).toBeGreaterThan(applicationsIndex)
  })

  it('R: Job Search is only visible to candidates and admins', async () => {
    const navPath = path.resolve(__dirname, '../../src/components/dashboard/nav.tsx')
    const content = fs.readFileSync(navPath, 'utf-8')

    // Find the Job Search nav item definition
    const jobSearchMatch = content.match(/id: 'job-search'[\s\S]*?roles: \[(.*?)\]/m)
    expect(jobSearchMatch).toBeTruthy()

    const roles = jobSearchMatch![1]
    expect(roles).toContain("'candidate'")
    expect(roles).toContain("'admin'")
    expect(roles).not.toContain("'recruiter'")
  })

  it('R: navigation filters nav items by user role', async () => {
    const navPath = path.resolve(__dirname, '../../src/components/dashboard/nav.tsx')
    const content = fs.readFileSync(navPath, 'utf-8')

    // Check that the component filters by role
    expect(content).toContain('filteredNavItems')
    expect(content).toContain('item.roles')
    expect(content).toContain('userRole')
  })
})

// =============================================================================
// SECTION A: Accessibility Tests - Navigation Badge
// =============================================================================

describe('Navigation - Badge Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('A: navigation uses useNewMatchCount hook', async () => {
    const navPath = path.resolve(__dirname, '../../src/components/dashboard/nav.tsx')
    const content = fs.readFileSync(navPath, 'utf-8')

    expect(content).toContain('useNewMatchCount')
    expect(content).toContain("import { useNewMatchCount }")
  })

  it('A: useNewMatchCount hook queries job_matches with correct filters', async () => {
    const hookPath = path.resolve(__dirname, '../../src/hooks/useNewMatchCount.ts')
    const content = fs.readFileSync(hookPath, 'utf-8')

    // Check for correct query filters
    expect(content).toContain("from('job_matches')")
    expect(content).toContain("eq('status', 'new')")
    expect(content).toContain("gte('match_score', 75)")
  })

  it('A: useNewMatchCount respects enabled option', async () => {
    const hookPath = path.resolve(__dirname, '../../src/hooks/useNewMatchCount.ts')
    const content = fs.readFileSync(hookPath, 'utf-8')

    expect(content).toContain('enabled')
    expect(content).toContain('if (!enabled)')
  })

  it('A: useNewMatchCount has auto-refresh interval', async () => {
    const hookPath = path.resolve(__dirname, '../../src/hooks/useNewMatchCount.ts')
    const content = fs.readFileSync(hookPath, 'utf-8')

    expect(content).toContain('refetchInterval')
    expect(content).toContain('setInterval')
    expect(content).toContain('clearInterval')
  })

  it('A: navigation adds dynamic badge to Job Search when matches exist', async () => {
    const navPath = path.resolve(__dirname, '../../src/components/dashboard/nav.tsx')
    const content = fs.readFileSync(navPath, 'utf-8')

    // Check that badge is added dynamically
    expect(content).toContain("item.id === 'job-search'")
    expect(content).toContain('newMatchCount > 0')
    expect(content).toContain('badge: newMatchCount')
  })
})

// =============================================================================
// SECTION L: Layout Tests - Dashboard Card Structure
// =============================================================================

describe('Dashboard - Job Matches Card', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('L: JobMatchesCard component exists', async () => {
    const cardPath = path.resolve(__dirname, '../../src/components/dashboard/JobMatchesCard.tsx')
    expect(fs.existsSync(cardPath)).toBe(true)
  })

  it('L: JobMatchesCard displays card header with title', async () => {
    const cardPath = path.resolve(__dirname, '../../src/components/dashboard/JobMatchesCard.tsx')
    const content = fs.readFileSync(cardPath, 'utf-8')

    expect(content).toContain('New Job Matches')
    expect(content).toContain('CardHeader')
    expect(content).toContain('CardTitle')
  })

  it('L: JobMatchesCard shows Search icon', async () => {
    const cardPath = path.resolve(__dirname, '../../src/components/dashboard/JobMatchesCard.tsx')
    const content = fs.readFileSync(cardPath, 'utf-8')

    expect(content).toContain("import { Search")
    expect(content).toContain('<Search')
  })

  it('L: JobMatchesCard has empty state message', async () => {
    const cardPath = path.resolve(__dirname, '../../src/components/dashboard/JobMatchesCard.tsx')
    const content = fs.readFileSync(cardPath, 'utf-8')

    expect(content).toContain('No new matches yet')
    expect(content).toContain('Start searching for jobs')
  })

  it('L: JobMatchesCard shows top 3 match mini-cards', async () => {
    const cardPath = path.resolve(__dirname, '../../src/components/dashboard/JobMatchesCard.tsx')
    const content = fs.readFileSync(cardPath, 'utf-8')

    // Check for mapping over topMatches
    expect(content).toContain('topMatches.map')
    expect(content).toContain('match.job_title')
    expect(content).toContain('match.company_name')
    expect(content).toContain('match.match_score')
  })

  it('L: JobMatchesCard has View All Matches link', async () => {
    const cardPath = path.resolve(__dirname, '../../src/components/dashboard/JobMatchesCard.tsx')
    const content = fs.readFileSync(cardPath, 'utf-8')

    expect(content).toContain('View All Matches')
    expect(content).toContain("href=\"/job-search\"")
  })

  it('L: JobMatchesCard shows last searched time', async () => {
    const cardPath = path.resolve(__dirname, '../../src/components/dashboard/JobMatchesCard.tsx')
    const content = fs.readFileSync(cardPath, 'utf-8')

    expect(content).toContain('lastSearchedAt')
    expect(content).toContain('Last searched:')
    expect(content).toContain('formatRelativeTime')
  })

  it('L: JobMatchesCard fetches from job_matches table', async () => {
    const cardPath = path.resolve(__dirname, '../../src/components/dashboard/JobMatchesCard.tsx')
    const content = fs.readFileSync(cardPath, 'utf-8')

    expect(content).toContain("from('job_matches')")
    expect(content).toContain("eq('status', 'new')")
  })

  it('L: JobMatchesCard fetches from job_search_preferences for last search time', async () => {
    const cardPath = path.resolve(__dirname, '../../src/components/dashboard/JobMatchesCard.tsx')
    const content = fs.readFileSync(cardPath, 'utf-8')

    expect(content).toContain("from('job_search_preferences')")
    expect(content).toContain('last_search_at')
  })
})

// =============================================================================
// SECTION P: Props Tests - Dashboard Integration
// =============================================================================

describe('Dashboard - Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('P: DashboardContent imports JobMatchesCard', async () => {
    const dashboardPath = path.resolve(__dirname, '../../src/app/(dashboard)/dashboard/DashboardContent.tsx')
    const content = fs.readFileSync(dashboardPath, 'utf-8')

    expect(content).toContain("import { JobMatchesCard }")
    expect(content).toContain("from '@/components/dashboard/JobMatchesCard'")
  })

  it('P: DashboardContent renders JobMatchesCard', async () => {
    const dashboardPath = path.resolve(__dirname, '../../src/app/(dashboard)/dashboard/DashboardContent.tsx')
    const content = fs.readFileSync(dashboardPath, 'utf-8')

    expect(content).toContain('<JobMatchesCard')
  })

  it('P: JobMatchesCard is in the right column of dashboard grid', async () => {
    const dashboardPath = path.resolve(__dirname, '../../src/app/(dashboard)/dashboard/DashboardContent.tsx')
    const content = fs.readFileSync(dashboardPath, 'utf-8')

    // Check that JobMatchesCard appears in the right column div
    const rightColumnMatch = content.match(/Right Column[\s\S]*?<JobMatchesCard/)
    expect(rightColumnMatch).toBeTruthy()
  })
})

// =============================================================================
// SECTION H: Handler Tests - Navigation Role Filtering
// =============================================================================

describe('Navigation - Role-based Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('H: layout passes userRole to DashboardNav', async () => {
    const layoutPath = path.resolve(__dirname, '../../src/app/(dashboard)/layout.tsx')
    const content = fs.readFileSync(layoutPath, 'utf-8')

    expect(content).toContain('userRole')
    expect(content).toContain('userRole={userRole}')
  })

  it('H: layout fetches role from user_profiles', async () => {
    const layoutPath = path.resolve(__dirname, '../../src/app/(dashboard)/layout.tsx')
    const content = fs.readFileSync(layoutPath, 'utf-8')

    expect(content).toContain("'full_name, profile_image, current_streak, role'")
  })

  it('H: DashboardNav accepts userRole prop', async () => {
    const navPath = path.resolve(__dirname, '../../src/components/dashboard/nav.tsx')
    const content = fs.readFileSync(navPath, 'utf-8')

    expect(content).toContain("userRole?: 'candidate' | 'recruiter' | 'admin'")
    expect(content).toContain("{ user, userRole = 'candidate' }")
  })

  it('H: navigation filters items when userRole is recruiter', async () => {
    const navPath = path.resolve(__dirname, '../../src/components/dashboard/nav.tsx')
    const content = fs.readFileSync(navPath, 'utf-8')

    // Check filter logic
    expect(content).toContain('filter((item)')
    expect(content).toContain('item.roles.includes(userRole)')
  })

  it('H: useNewMatchCount is disabled for recruiters', async () => {
    const navPath = path.resolve(__dirname, '../../src/components/dashboard/nav.tsx')
    const content = fs.readFileSync(navPath, 'utf-8')

    expect(content).toContain("enabled: userRole !== 'recruiter'")
  })
})

// =============================================================================
// SECTION I: Integration Tests - Full Flow
// =============================================================================

describe('Integration - Job Search Navigation Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('I: Job Search nav item links to /job-search', async () => {
    const navPath = path.resolve(__dirname, '../../src/components/dashboard/nav.tsx')
    const content = fs.readFileSync(navPath, 'utf-8')

    // Verify the href value
    const jobSearchMatch = content.match(/id: 'job-search'[\s\S]*?href: '([^']+)'/)
    expect(jobSearchMatch).toBeTruthy()
    expect(jobSearchMatch![1]).toBe('/job-search')
  })

  it('I: JobMatchesCard links matches to job-search with match param', async () => {
    const cardPath = path.resolve(__dirname, '../../src/components/dashboard/JobMatchesCard.tsx')
    const content = fs.readFileSync(cardPath, 'utf-8')

    expect(content).toContain('href={`/job-search?match=${match.id}`}')
  })

  it('I: JobMatchesCard has loading state', async () => {
    const cardPath = path.resolve(__dirname, '../../src/components/dashboard/JobMatchesCard.tsx')
    const content = fs.readFileSync(cardPath, 'utf-8')

    expect(content).toContain('isLoading')
    expect(content).toContain('animate-pulse')
  })

  it('I: JobMatchesCard auto-refreshes every minute', async () => {
    const cardPath = path.resolve(__dirname, '../../src/components/dashboard/JobMatchesCard.tsx')
    const content = fs.readFileSync(cardPath, 'utf-8')

    expect(content).toContain('setInterval(fetchData, 60000)')
    expect(content).toContain('clearInterval')
  })

  it('I: formatRelativeTime handles various time ranges', async () => {
    const cardPath = path.resolve(__dirname, '../../src/components/dashboard/JobMatchesCard.tsx')
    const content = fs.readFileSync(cardPath, 'utf-8')

    expect(content).toContain('Just now')
    expect(content).toContain('minute')
    expect(content).toContain('hour')
    expect(content).toContain('day')
    expect(content).toContain('Never')
  })
})

// =============================================================================
// SECTION: Score Colors and Visual Indicators
// =============================================================================

describe('JobMatchesCard - Visual Indicators', () => {
  it('V: getScoreColor returns correct colors for score ranges', async () => {
    const cardPath = path.resolve(__dirname, '../../src/components/dashboard/JobMatchesCard.tsx')
    const content = fs.readFileSync(cardPath, 'utf-8')

    // Check score color thresholds
    expect(content).toContain('score >= 85')
    expect(content).toContain('score >= 75')
    expect(content).toContain('score >= 60')

    // Check color classes
    expect(content).toContain('text-success-dark bg-success-light')
    expect(content).toContain('text-sky-dark bg-sky-light')
    expect(content).toContain('text-peach-dark bg-peach-light')
  })

  it('V: high scores (>=85) show Sparkles icon', async () => {
    const cardPath = path.resolve(__dirname, '../../src/components/dashboard/JobMatchesCard.tsx')
    const content = fs.readFileSync(cardPath, 'utf-8')

    expect(content).toContain('match.match_score >= 85')
    expect(content).toContain('<Sparkles')
  })

  it('V: match count badge shows in header when count > 0', async () => {
    const cardPath = path.resolve(__dirname, '../../src/components/dashboard/JobMatchesCard.tsx')
    const content = fs.readFileSync(cardPath, 'utf-8')

    expect(content).toContain('newMatchCount > 0')
    expect(content).toContain('{newMatchCount}')
    expect(content).toContain('bg-sky text-white')
  })
})
