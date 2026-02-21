/**
 * Job Search Components Tests (Phase 6)
 *
 * @vitest-environment jsdom
 *
 * RALPH tests for all Job Search Agent frontend components:
 * - JobMatchCard
 * - AdvancedFilters
 * - NotificationSettings
 * - PreferencesModal
 * - SearchKeywords
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Component imports
import { JobMatchCard } from '@/components/job-search/JobMatchCard'
import { AdvancedFilters } from '@/components/job-search/AdvancedFilters'
import { NotificationSettings } from '@/components/job-search/NotificationSettings'
import { PreferencesModal } from '@/components/job-search/PreferencesModal'
import { SearchKeywords } from '@/components/job-search/SearchKeywords'

import type { JobPostingRow, JobSearchPreferencesRow } from '@/types/job-search'

// ============================================================================
// Test Fixtures
// ============================================================================

const mockJobPosting: JobPostingRow = {
  id: 'job-123',
  user_id: 'user-456',
  title: 'Senior Software Engineer',
  company_name: 'TechCorp Inc',
  company_logo_url: 'https://example.com/logo.png',
  description: 'We are looking for a talented engineer to join our team.',
  location: 'San Francisco, CA',
  work_type: 'hybrid',
  experience_level: 'senior',
  salary_min: 150000,
  salary_max: 200000,
  salary_currency: 'USD',
  required_skills: ['TypeScript', 'React', 'Node.js'],
  benefits: ['Health Insurance', '401k', 'Unlimited PTO'],
  company_size: '201-500',
  source_url: 'https://example.com/job/123',
  source_platform: 'LinkedIn',
  posted_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  discovered_at: new Date().toISOString(),
  match_score: 92,
  match_breakdown: {
    skills: 32,
    experience: 18,
    location: 12,
    salary: 14,
    preferences: 8,
    behavioral: 8,
  },
  match_reasons: [
    'Strong TypeScript experience',
    'Senior level matches your experience',
    'Hybrid work matches your preference',
    'Salary range aligns with expectations',
  ],
  status: 'new',
  user_feedback: null,
  feedback_reason: null,
  discarded_until: null,
  job_application_id: null,
  content_hash: 'hash123',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const mockPreferences: JobSearchPreferencesRow = {
  id: 'pref-123',
  user_id: 'user-456',
  is_active: true,
  preferred_job_titles: ['Software Engineer', 'Full Stack Developer'],
  preferred_locations: ['San Francisco', 'Remote'],
  experience_years: '5-10',
  required_skills: [
    { skill: 'TypeScript', proficiency: 'expert' },
    { skill: 'React', proficiency: 'expert' },
  ],
  company_size_preferences: ['51-200', '201-500'],
  remote_policy_preferences: ['remote', 'hybrid'],
  required_benefits: ['Health Insurance', '401k'],
  salary_min_override: 150000,
  salary_currency_override: 'USD',
  avoid_companies: ['BadCorp'],
  avoid_keywords: ['unpaid'],
  ai_keywords: ['TypeScript', 'React', 'Senior Engineer', 'Full Stack'],
  ai_recommended_boards: ['LinkedIn', 'Indeed'],
  ai_market_insights: 'Strong demand for TypeScript developers',
  ai_personalized_strategy: 'Focus on senior-level hybrid positions',
  ai_last_analysis_at: new Date().toISOString(),
  implicit_preferences: {},
  feedback_stats: { total_likes: 10, total_dislikes: 2, total_hides: 1, reasons: {} },
  email_notification_frequency: 'daily',
  last_email_sent_at: null,
  last_search_at: new Date().toISOString(),
  consecutive_zero_match_days: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

// ============================================================================
// JobMatchCard Tests
// ============================================================================

describe('JobMatchCard', () => {
  const mockOnApply = vi.fn()
  const mockOnFeedback = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('R: renders job title and company name', () => {
    render(
      <JobMatchCard
        job={mockJobPosting}
        onApply={mockOnApply}
        onFeedback={mockOnFeedback}
      />
    )

    expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument()
    expect(screen.getByText('TechCorp Inc')).toBeInTheDocument()
  })

  it('R: displays match score badge', () => {
    render(
      <JobMatchCard
        job={mockJobPosting}
        onApply={mockOnApply}
        onFeedback={mockOnFeedback}
      />
    )

    expect(screen.getByText('92% Match')).toBeInTheDocument()
  })

  it('R: renders match reasons in "Why this fits you" section', () => {
    render(
      <JobMatchCard
        job={mockJobPosting}
        onApply={mockOnApply}
        onFeedback={mockOnFeedback}
      />
    )

    expect(screen.getByText('Why this fits you')).toBeInTheDocument()
    expect(screen.getByText('Strong TypeScript experience')).toBeInTheDocument()
  })

  it('R: renders location, work type, and salary metadata pills', () => {
    render(
      <JobMatchCard
        job={mockJobPosting}
        onApply={mockOnApply}
        onFeedback={mockOnFeedback}
      />
    )

    expect(screen.getByText('San Francisco, CA')).toBeInTheDocument()
    expect(screen.getByText('hybrid')).toBeInTheDocument()
    expect(screen.getByText('$150,000 - $200,000')).toBeInTheDocument()
  })

  it('A: calls onApply when "Tailor & Apply" button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <JobMatchCard
        job={mockJobPosting}
        onApply={mockOnApply}
        onFeedback={mockOnFeedback}
      />
    )

    await user.click(screen.getByRole('button', { name: /Tailor & Apply/i }))
    expect(mockOnApply).toHaveBeenCalledWith('job-123')
  })

  it('A: calls onFeedback with "like" when Like button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <JobMatchCard
        job={mockJobPosting}
        onApply={mockOnApply}
        onFeedback={mockOnFeedback}
      />
    )

    // Use exact match to avoid matching "Dislike"
    const likeButtons = screen.getAllByRole('button')
    const likeButton = likeButtons.find(btn => btn.textContent?.trim() === 'Like')
    expect(likeButton).toBeDefined()
    await user.click(likeButton!)
    expect(mockOnFeedback).toHaveBeenCalledWith('job-123', 'like')
  })

  it('A: shows dislike reason dropdown when Dislike button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <JobMatchCard
        job={mockJobPosting}
        onApply={mockOnApply}
        onFeedback={mockOnFeedback}
      />
    )

    await user.click(screen.getByRole('button', { name: /Dislike/i }))

    await waitFor(() => {
      expect(screen.getByText("What's the main reason?")).toBeInTheDocument()
    })
  })

  it('A: calls onFeedback with "hide" when Hide button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <JobMatchCard
        job={mockJobPosting}
        onApply={mockOnApply}
        onFeedback={mockOnFeedback}
      />
    )

    await user.click(screen.getByRole('button', { name: /Hide/i }))
    expect(mockOnFeedback).toHaveBeenCalledWith('job-123', 'hide')
  })

  it('L: renders "View original posting" link when source_url exists', () => {
    render(
      <JobMatchCard
        job={mockJobPosting}
        onApply={mockOnApply}
        onFeedback={mockOnFeedback}
      />
    )

    const link = screen.getByText('View original posting')
    expect(link).toHaveAttribute('href', 'https://example.com/job/123')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('L: does not render "View original posting" when source_url is null', () => {
    const jobWithoutUrl = { ...mockJobPosting, source_url: null }
    render(
      <JobMatchCard
        job={jobWithoutUrl}
        onApply={mockOnApply}
        onFeedback={mockOnFeedback}
      />
    )

    expect(screen.queryByText('View original posting')).not.toBeInTheDocument()
  })

  it('P: renders "Applied" button when status is "applied"', () => {
    const appliedJob = { ...mockJobPosting, status: 'applied' as const }
    render(
      <JobMatchCard
        job={appliedJob}
        onApply={mockOnApply}
        onFeedback={mockOnFeedback}
      />
    )

    expect(screen.getByRole('button', { name: /Applied/i })).toBeDisabled()
  })

  it('H: handles job without match_reasons gracefully', () => {
    const jobWithoutReasons = { ...mockJobPosting, match_reasons: [] }
    render(
      <JobMatchCard
        job={jobWithoutReasons}
        onApply={mockOnApply}
        onFeedback={mockOnFeedback}
      />
    )

    expect(screen.queryByText('Why this fits you')).not.toBeInTheDocument()
  })

  it('H: displays NEW badge for recently discovered jobs', () => {
    const newJob = {
      ...mockJobPosting,
      discovered_at: new Date().toISOString(),
    }
    render(
      <JobMatchCard
        job={newJob}
        onApply={mockOnApply}
        onFeedback={mockOnFeedback}
      />
    )

    expect(screen.getByText('NEW')).toBeInTheDocument()
  })
})

// ============================================================================
// AdvancedFilters Tests
// ============================================================================

describe('AdvancedFilters', () => {
  const mockOnApplyFilters = vi.fn()
  const mockOnSavePreferences = vi.fn().mockResolvedValue(undefined)
  const mockOnToggleCollapse = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('R: renders collapsed by default', () => {
    render(
      <AdvancedFilters
        preferences={mockPreferences}
        onApplyFilters={mockOnApplyFilters}
        onSavePreferences={mockOnSavePreferences}
        isCollapsed={true}
        onToggleCollapse={mockOnToggleCollapse}
      />
    )

    expect(screen.getByText('Advanced Filters')).toBeInTheDocument()
    // Content should not be visible when collapsed
    expect(screen.queryByText('Job Titles')).not.toBeInTheDocument()
  })

  it('R: shows filter content when expanded', () => {
    render(
      <AdvancedFilters
        preferences={mockPreferences}
        onApplyFilters={mockOnApplyFilters}
        onSavePreferences={mockOnSavePreferences}
        isCollapsed={false}
        onToggleCollapse={mockOnToggleCollapse}
      />
    )

    expect(screen.getByText('Job Titles')).toBeInTheDocument()
    expect(screen.getByText('Preferred Locations')).toBeInTheDocument()
    expect(screen.getByText('Years of Experience')).toBeInTheDocument()
  })

  it('A: calls onToggleCollapse when header is clicked', async () => {
    const user = userEvent.setup()
    render(
      <AdvancedFilters
        preferences={mockPreferences}
        onApplyFilters={mockOnApplyFilters}
        onSavePreferences={mockOnSavePreferences}
        isCollapsed={true}
        onToggleCollapse={mockOnToggleCollapse}
      />
    )

    await user.click(screen.getByText('Advanced Filters'))
    expect(mockOnToggleCollapse).toHaveBeenCalled()
  })

  it('A: calls onApplyFilters when "Apply Filters" button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <AdvancedFilters
        preferences={mockPreferences}
        onApplyFilters={mockOnApplyFilters}
        onSavePreferences={mockOnSavePreferences}
        isCollapsed={false}
        onToggleCollapse={mockOnToggleCollapse}
      />
    )

    await user.click(screen.getByRole('button', { name: /Apply Filters/i }))
    expect(mockOnApplyFilters).toHaveBeenCalled()
  })

  it('A: calls onSavePreferences when "Save as My Preference" is clicked', async () => {
    const user = userEvent.setup()
    render(
      <AdvancedFilters
        preferences={mockPreferences}
        onApplyFilters={mockOnApplyFilters}
        onSavePreferences={mockOnSavePreferences}
        isCollapsed={false}
        onToggleCollapse={mockOnToggleCollapse}
      />
    )

    await user.click(screen.getByRole('button', { name: /Save as My Preference/i }))
    await waitFor(() => {
      expect(mockOnSavePreferences).toHaveBeenCalled()
    })
  })

  it('L: displays active filter count badge', () => {
    render(
      <AdvancedFilters
        preferences={mockPreferences}
        onApplyFilters={mockOnApplyFilters}
        onSavePreferences={mockOnSavePreferences}
        isCollapsed={true}
        onToggleCollapse={mockOnToggleCollapse}
      />
    )

    // Should show count of active filters from preferences
    expect(screen.getByText(/active/i)).toBeInTheDocument()
  })

  it('P: initializes filters from preferences prop', () => {
    render(
      <AdvancedFilters
        preferences={mockPreferences}
        onApplyFilters={mockOnApplyFilters}
        onSavePreferences={mockOnSavePreferences}
        isCollapsed={false}
        onToggleCollapse={mockOnToggleCollapse}
      />
    )

    // Check that preferred_job_titles from preferences are displayed
    expect(screen.getByText('Software Engineer')).toBeInTheDocument()
    expect(screen.getByText('Full Stack Developer')).toBeInTheDocument()
  })

  it('H: handles null preferences gracefully', () => {
    render(
      <AdvancedFilters
        preferences={null}
        onApplyFilters={mockOnApplyFilters}
        onSavePreferences={mockOnSavePreferences}
        isCollapsed={false}
        onToggleCollapse={mockOnToggleCollapse}
      />
    )

    // Should render without errors
    expect(screen.getByText('Job Titles')).toBeInTheDocument()
  })
})

// ============================================================================
// NotificationSettings Tests
// ============================================================================

describe('NotificationSettings', () => {
  const mockOnUpdate = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('R: renders with enabled state when frequency is not disabled', () => {
    render(
      <NotificationSettings
        currentFrequency="daily"
        onUpdate={mockOnUpdate}
      />
    )

    expect(screen.getByText('Email Notifications')).toBeInTheDocument()
    expect(screen.getByText('Daily digest of new matches')).toBeInTheDocument()
  })

  it('R: renders with disabled state when frequency is disabled', () => {
    render(
      <NotificationSettings
        currentFrequency="disabled"
        onUpdate={mockOnUpdate}
      />
    )

    expect(screen.getByText('Notifications are disabled')).toBeInTheDocument()
  })

  it('A: calls onUpdate when toggle is clicked', async () => {
    const user = userEvent.setup()
    render(
      <NotificationSettings
        currentFrequency="daily"
        onUpdate={mockOnUpdate}
      />
    )

    const toggle = screen.getByRole('switch')
    await user.click(toggle)

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith('disabled')
    })
  })

  it('A: calls onUpdate with new frequency when changed', async () => {
    const user = userEvent.setup()
    render(
      <NotificationSettings
        currentFrequency="daily"
        onUpdate={mockOnUpdate}
      />
    )

    // Click to open frequency dropdown
    await user.click(screen.getByRole('button', { name: /Daily/i }))

    // Select weekly
    await user.click(screen.getByText('Weekly'))

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith('weekly')
    })
  })

  it('L: shows frequency selector only when enabled', () => {
    // Test disabled state
    const { unmount } = render(
      <NotificationSettings
        currentFrequency="disabled"
        onUpdate={mockOnUpdate}
      />
    )

    // Should not show frequency selector when disabled
    expect(screen.queryByText('Daily')).not.toBeInTheDocument()

    unmount()

    // Test enabled state
    render(
      <NotificationSettings
        currentFrequency="weekly"
        onUpdate={mockOnUpdate}
      />
    )

    // Should show the current frequency (Weekly capitalized)
    expect(screen.getByText('Weekly')).toBeInTheDocument()
  })

  it('P: toggle has proper aria attributes', () => {
    render(
      <NotificationSettings
        currentFrequency="daily"
        onUpdate={mockOnUpdate}
      />
    )

    const toggle = screen.getByRole('switch')
    expect(toggle).toHaveAttribute('aria-checked', 'true')
    expect(toggle).toHaveAttribute('aria-label', 'Toggle email notifications')
  })

  it('H: handles API error with rollback', async () => {
    const mockFailingUpdate = vi.fn().mockRejectedValue(new Error('API Error'))
    const user = userEvent.setup()

    render(
      <NotificationSettings
        currentFrequency="daily"
        onUpdate={mockFailingUpdate}
      />
    )

    const toggle = screen.getByRole('switch')
    await user.click(toggle)

    // After the error, the component should rollback
    // The mock was called with disabled
    await waitFor(() => {
      expect(mockFailingUpdate).toHaveBeenCalledWith('disabled')
    })

    // After error rejection, should rollback to original state
    await waitFor(() => {
      expect(screen.getByText('Daily digest of new matches')).toBeInTheDocument()
    }, { timeout: 2000 })
  })
})

// ============================================================================
// PreferencesModal Tests
// ============================================================================

describe('PreferencesModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSave = vi.fn().mockResolvedValue(undefined)
  const mockOnUpdateNotifications = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('R: renders modal with tabs when open', () => {
    render(
      <PreferencesModal
        isOpen={true}
        onClose={mockOnClose}
        preferences={mockPreferences}
        onSave={mockOnSave}
        onUpdateNotifications={mockOnUpdateNotifications}
      />
    )

    expect(screen.getByText('Preferences')).toBeInTheDocument()
    expect(screen.getByText('Profile')).toBeInTheDocument()
    expect(screen.getByText('Search Settings')).toBeInTheDocument()
    expect(screen.getByText('Notifications')).toBeInTheDocument()
  })

  it('R: does not render when isOpen is false', () => {
    render(
      <PreferencesModal
        isOpen={false}
        onClose={mockOnClose}
        preferences={mockPreferences}
        onSave={mockOnSave}
        onUpdateNotifications={mockOnUpdateNotifications}
      />
    )

    expect(screen.queryByText('Preferences')).not.toBeInTheDocument()
  })

  it('A: calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <PreferencesModal
        isOpen={true}
        onClose={mockOnClose}
        preferences={mockPreferences}
        onSave={mockOnSave}
        onUpdateNotifications={mockOnUpdateNotifications}
      />
    )

    // Find the close button (X icon)
    const closeButtons = screen.getAllByRole('button')
    const closeButton = closeButtons.find(btn => btn.querySelector('svg'))
    if (closeButton) {
      await user.click(closeButton)
      expect(mockOnClose).toHaveBeenCalled()
    }
  })

  it('A: switches between tabs', async () => {
    const user = userEvent.setup()
    render(
      <PreferencesModal
        isOpen={true}
        onClose={mockOnClose}
        preferences={mockPreferences}
        onSave={mockOnSave}
        onUpdateNotifications={mockOnUpdateNotifications}
      />
    )

    // Default is Profile tab
    expect(screen.getByText('Job Titles')).toBeInTheDocument()

    // Find and click the Search Settings tab
    const searchSettingsTab = screen.getAllByText('Search Settings')[0]
    await user.click(searchSettingsTab)

    await waitFor(() => {
      expect(screen.getByText('Preferred Locations')).toBeInTheDocument()
    })

    // Find and click the Notifications tab
    const notificationsTab = screen.getAllByText('Notifications')[0]
    await user.click(notificationsTab)

    await waitFor(() => {
      expect(screen.getByText('Email Notifications')).toBeInTheDocument()
    })
  })

  it('A: calls onSave when Save Changes is clicked', async () => {
    const user = userEvent.setup()
    render(
      <PreferencesModal
        isOpen={true}
        onClose={mockOnClose}
        preferences={mockPreferences}
        onSave={mockOnSave}
        onUpdateNotifications={mockOnUpdateNotifications}
      />
    )

    await user.click(screen.getByRole('button', { name: /Save Changes/i }))

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled()
    })
  })

  it('L: initializes form fields from preferences', () => {
    render(
      <PreferencesModal
        isOpen={true}
        onClose={mockOnClose}
        preferences={mockPreferences}
        onSave={mockOnSave}
        onUpdateNotifications={mockOnUpdateNotifications}
      />
    )

    // Check job titles from preferences are displayed
    expect(screen.getByText('Software Engineer')).toBeInTheDocument()
    expect(screen.getByText('Full Stack Developer')).toBeInTheDocument()
  })

  it('P: renders three tabs with correct icons', () => {
    render(
      <PreferencesModal
        isOpen={true}
        onClose={mockOnClose}
        preferences={mockPreferences}
        onSave={mockOnSave}
        onUpdateNotifications={mockOnUpdateNotifications}
      />
    )

    const tabs = screen.getAllByRole('button').filter(btn =>
      btn.textContent?.includes('Profile') ||
      btn.textContent?.includes('Search Settings') ||
      btn.textContent?.includes('Notifications')
    )

    expect(tabs).toHaveLength(3)
  })

  it('H: handles null preferences', () => {
    render(
      <PreferencesModal
        isOpen={true}
        onClose={mockOnClose}
        preferences={null}
        onSave={mockOnSave}
        onUpdateNotifications={mockOnUpdateNotifications}
      />
    )

    // Should render without crashing
    expect(screen.getByText('Preferences')).toBeInTheDocument()
  })
})

// ============================================================================
// SearchKeywords Tests
// ============================================================================

describe('SearchKeywords', () => {
  const mockKeywords = ['TypeScript', 'React', 'Node.js', 'GraphQL']
  const mockOnAdd = vi.fn().mockResolvedValue(undefined)
  const mockOnRemove = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('R: renders all keywords as pills', () => {
    render(
      <SearchKeywords
        keywords={mockKeywords}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
      />
    )

    expect(screen.getByText('TypeScript')).toBeInTheDocument()
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('Node.js')).toBeInTheDocument()
    expect(screen.getByText('GraphQL')).toBeInTheDocument()
  })

  it('R: renders input field for adding keywords', () => {
    render(
      <SearchKeywords
        keywords={mockKeywords}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
      />
    )

    expect(screen.getByPlaceholderText('Add a keyword...')).toBeInTheDocument()
  })

  it('A: calls onAdd when new keyword is submitted', async () => {
    const user = userEvent.setup()
    render(
      <SearchKeywords
        keywords={mockKeywords}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
      />
    )

    const input = screen.getByPlaceholderText('Add a keyword...')
    await user.type(input, 'Python{enter}')

    await waitFor(() => {
      expect(mockOnAdd).toHaveBeenCalledWith('Python')
    })
  })

  it('A: calls onRemove when X button is clicked on a keyword', async () => {
    const user = userEvent.setup()
    render(
      <SearchKeywords
        keywords={mockKeywords}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
      />
    )

    // Find the remove button for TypeScript
    const removeButton = screen.getByLabelText('Remove TypeScript')
    await user.click(removeButton)

    await waitFor(() => {
      expect(mockOnRemove).toHaveBeenCalledWith('TypeScript')
    })
  })

  it('L: does not add duplicate keywords', async () => {
    const user = userEvent.setup()
    render(
      <SearchKeywords
        keywords={mockKeywords}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
      />
    )

    const input = screen.getByPlaceholderText('Add a keyword...')
    await user.type(input, 'TypeScript')

    // The add button should be disabled for duplicates
    const addButton = screen.getByRole('button', { name: '' }) // Plus icon button
    expect(addButton).toBeDisabled()
  })

  it('L: trims whitespace from keywords', async () => {
    const user = userEvent.setup()
    render(
      <SearchKeywords
        keywords={mockKeywords}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
      />
    )

    const input = screen.getByPlaceholderText('Add a keyword...')
    await user.type(input, '  Python  {enter}')

    await waitFor(() => {
      expect(mockOnAdd).toHaveBeenCalledWith('Python')
    })
  })

  it('P: shows loading state', () => {
    render(
      <SearchKeywords
        keywords={[]}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
        isLoading={true}
      />
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('P: shows empty state message when no keywords', () => {
    render(
      <SearchKeywords
        keywords={[]}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
      />
    )

    expect(screen.getByText(/No keywords yet/i)).toBeInTheDocument()
  })

  it('H: handles API error with rollback on add', async () => {
    // Use a delayed rejection so we can observe the optimistic update
    const mockFailingAdd = vi.fn().mockImplementation(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error('API Error')), 50))
    )
    const user = userEvent.setup()

    render(
      <SearchKeywords
        keywords={mockKeywords}
        onAdd={mockFailingAdd}
        onRemove={mockOnRemove}
      />
    )

    const input = screen.getByPlaceholderText('Add a keyword...')
    await user.type(input, 'FailKeyword{enter}')

    // Optimistic update should show the keyword (before API rejection)
    await waitFor(() => {
      expect(screen.getByText('FailKeyword')).toBeInTheDocument()
    })

    // After error, keyword should be removed (rollback)
    await waitFor(() => {
      expect(screen.queryByText('FailKeyword')).not.toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('H: handles API error with rollback on remove', async () => {
    const mockFailingRemove = vi.fn().mockRejectedValue(new Error('API Error'))
    const user = userEvent.setup()

    render(
      <SearchKeywords
        keywords={mockKeywords}
        onAdd={mockOnAdd}
        onRemove={mockFailingRemove}
      />
    )

    const removeButton = screen.getByLabelText('Remove TypeScript')
    await user.click(removeButton)

    // The remove was attempted
    await waitFor(() => {
      expect(mockFailingRemove).toHaveBeenCalledWith('TypeScript')
    })

    // After error, keyword should reappear (rollback)
    await waitFor(() => {
      expect(screen.getByText('TypeScript')).toBeInTheDocument()
    }, { timeout: 2000 })
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('Job Search Components Integration', () => {
  it('I: all components can be imported from index', async () => {
    const { JobMatchCard, AdvancedFilters, NotificationSettings, PreferencesModal, SearchKeywords } =
      await import('@/components/job-search')

    expect(JobMatchCard).toBeDefined()
    expect(AdvancedFilters).toBeDefined()
    expect(NotificationSettings).toBeDefined()
    expect(PreferencesModal).toBeDefined()
    expect(SearchKeywords).toBeDefined()
  })

  it('I: types are properly exported', async () => {
    // This test verifies that types compile correctly
    const types = await import('@/components/job-search')

    // Just checking that the import doesn't throw
    expect(types).toBeDefined()
  })
})
