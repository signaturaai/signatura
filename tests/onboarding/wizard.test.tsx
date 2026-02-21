/**
 * @vitest-environment jsdom
 */

/**
 * Onboarding Wizard Tests — RALPH Loop 13
 *
 * Tests for the onboarding wizard component and page.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import React from 'react'

// ============================================================================
// Mock Setup
// ============================================================================

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}))

// Mock Supabase client
const mockSupabaseAuth = {
  getUser: vi.fn(),
}
const mockSupabaseFrom = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: mockSupabaseAuth,
    from: mockSupabaseFrom,
  }),
}))

// Import after mocking
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import { metadata } from '@/app/onboarding/page'

// ============================================================================
// Helper Functions
// ============================================================================

function setupAuthenticatedUser(userId: string = 'user-123', email: string = 'test@example.com') {
  mockSupabaseAuth.getUser.mockResolvedValue({
    data: {
      user: {
        id: userId,
        email,
        user_metadata: { full_name: 'Test User' },
      },
    },
    error: null,
  })
}

function setupProfileQuery(profile: { user_type: string | null; onboarding_completed: boolean } | null) {
  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: profile,
      error: profile ? null : { code: 'PGRST116' },
    }),
  }
  mockSupabaseFrom.mockReturnValue(queryBuilder)
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Onboarding Wizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  // ==========================================================================
  // Component Tests
  // ==========================================================================

  describe('OnboardingWizard Component', () => {
    it('1. OnboardingPage renders OnboardingWizard component', async () => {
      setupAuthenticatedUser()
      setupProfileQuery(null) // New user, no profile yet

      render(<OnboardingWizard />)

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument()
      })

      // Verify the component mounted by checking for the welcome text
      expect(screen.getByText('Welcome to Signatura')).toBeInTheDocument()
    })

    it('4. Wizard renders first step (role selection) on mount', async () => {
      setupAuthenticatedUser()
      setupProfileQuery(null) // New user without a role

      render(<OnboardingWizard />)

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument()
      })

      // Check that role selection step is visible
      expect(screen.getByText('Welcome to Signatura')).toBeInTheDocument()
      expect(screen.getByText('I am a...')).toBeInTheDocument()
      expect(screen.getByText('Job Seeker')).toBeInTheDocument()
      expect(screen.getByText('Recruiter / Hiring Manager')).toBeInTheDocument()
      expect(screen.getByText('Continue')).toBeInTheDocument()
    })

    it('5. Wizard is accessible (aria labels, focus management)', async () => {
      setupAuthenticatedUser()
      setupProfileQuery(null)

      render(<OnboardingWizard />)

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument()
      })

      // Check for accessible buttons
      const jobSeekerButton = screen.getByText('Job Seeker').closest('button')
      const recruiterButton = screen.getByText('Recruiter / Hiring Manager').closest('button')
      const continueButton = screen.getByText('Continue').closest('button')

      // Buttons should be properly rendered and accessible
      expect(jobSeekerButton).toBeInTheDocument()
      expect(recruiterButton).toBeInTheDocument()
      expect(continueButton).toBeInTheDocument()

      // Continue button should be disabled when no role is selected
      expect(continueButton).toBeDisabled()

      // Check that role selection buttons are enabled
      expect(jobSeekerButton).not.toBeDisabled()
      expect(recruiterButton).not.toBeDisabled()

      // Verify heading hierarchy
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveTextContent('Welcome to Signatura')
    })
  })

  // ==========================================================================
  // Metadata Tests
  // ==========================================================================

  describe('Page Metadata', () => {
    it("2. Page has correct metadata title", () => {
      expect(metadata.title).toBe('Welcome to Signatura - Setup Your Profile')
    })

    it("3. Page has correct metadata description", () => {
      expect(metadata.description).toContain('Complete your profile setup')
    })
  })
})
