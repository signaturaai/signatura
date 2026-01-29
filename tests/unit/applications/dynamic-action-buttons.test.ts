/**
 * My Applications Page - Dynamic Action Button Tests
 *
 * Tests for the dynamic action buttons that change based on
 * application status (Tailor CV, Follow Up, Review Offer, etc.)
 */

import { describe, it, expect } from 'vitest'
import type { ApplicationStatus } from '@/lib/types/dashboard'

// ============================================================================
// ACTION BUTTON LOGIC (extracted from component for testing)
// ============================================================================

interface ActionButton {
  label: string
  variant: 'teal' | 'orange' | 'gray'
}

function getActionButton(status: ApplicationStatus): ActionButton | null {
  switch (status) {
    case 'prepared':
      return { label: 'Tailor CV', variant: 'teal' }
    case 'applied':
    case 'interview_scheduled':
      return { label: 'Follow Up', variant: 'orange' }
    case 'interviewed':
      return { label: 'Check Status', variant: 'orange' }
    case 'offer_received':
    case 'negotiating':
      return { label: 'Review Offer', variant: 'teal' }
    case 'rejected':
    case 'withdrawn':
    case 'accepted':
      return null
    default:
      return null
  }
}

// ============================================================================
// PROGRESS CALCULATION LOGIC
// ============================================================================

function getProgressPercentage(status: ApplicationStatus): number {
  const progressMap: Record<ApplicationStatus, number> = {
    prepared: 15,
    applied: 30,
    interview_scheduled: 50,
    interviewed: 65,
    offer_received: 85,
    negotiating: 90,
    accepted: 100,
    rejected: 100,
    withdrawn: 100,
  }
  return progressMap[status] || 0
}

// ============================================================================
// STATUS BADGE STYLES
// ============================================================================

const STATUS_BADGE_STYLES: Record<ApplicationStatus, string> = {
  prepared: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  applied: 'bg-blue-100 text-blue-700 border-blue-200',
  interview_scheduled: 'bg-purple-100 text-purple-700 border-purple-200',
  interviewed: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  offer_received: 'bg-green-100 text-green-700 border-green-200',
  negotiating: 'bg-teal-100 text-teal-700 border-teal-200',
  accepted: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  withdrawn: 'bg-gray-100 text-gray-700 border-gray-200',
}

function getStatusBadgeStyle(status: ApplicationStatus): string {
  return STATUS_BADGE_STYLES[status] || 'bg-gray-100 text-gray-700 border-gray-200'
}

// ============================================================================
// DYNAMIC ACTION BUTTON TESTS
// ============================================================================

describe('Dynamic Action Buttons', () => {
  describe('Tailor CV Button (Teal)', () => {
    it('should return "Tailor CV" for prepared status', () => {
      const button = getActionButton('prepared')
      expect(button).not.toBeNull()
      expect(button!.label).toBe('Tailor CV')
      expect(button!.variant).toBe('teal')
    })
  })

  describe('Follow Up Button (Orange)', () => {
    it('should return "Follow Up" for applied status', () => {
      const button = getActionButton('applied')
      expect(button).not.toBeNull()
      expect(button!.label).toBe('Follow Up')
      expect(button!.variant).toBe('orange')
    })

    it('should return "Follow Up" for interview_scheduled status', () => {
      const button = getActionButton('interview_scheduled')
      expect(button).not.toBeNull()
      expect(button!.label).toBe('Follow Up')
      expect(button!.variant).toBe('orange')
    })
  })

  describe('Check Status Button (Orange)', () => {
    it('should return "Check Status" for interviewed status', () => {
      const button = getActionButton('interviewed')
      expect(button).not.toBeNull()
      expect(button!.label).toBe('Check Status')
      expect(button!.variant).toBe('orange')
    })
  })

  describe('Review Offer Button (Teal)', () => {
    it('should return "Review Offer" for offer_received status', () => {
      const button = getActionButton('offer_received')
      expect(button).not.toBeNull()
      expect(button!.label).toBe('Review Offer')
      expect(button!.variant).toBe('teal')
    })

    it('should return "Review Offer" for negotiating status', () => {
      const button = getActionButton('negotiating')
      expect(button).not.toBeNull()
      expect(button!.label).toBe('Review Offer')
      expect(button!.variant).toBe('teal')
    })
  })

  describe('No Button (Terminal States)', () => {
    it('should return null for rejected status', () => {
      const button = getActionButton('rejected')
      expect(button).toBeNull()
    })

    it('should return null for withdrawn status', () => {
      const button = getActionButton('withdrawn')
      expect(button).toBeNull()
    })

    it('should return null for accepted status', () => {
      const button = getActionButton('accepted')
      expect(button).toBeNull()
    })
  })

  describe('Button Variant Coverage', () => {
    it('should only use teal variant for positive actions', () => {
      const tealStatuses: ApplicationStatus[] = ['prepared', 'offer_received', 'negotiating']
      tealStatuses.forEach((status) => {
        const button = getActionButton(status)
        expect(button?.variant).toBe('teal')
      })
    })

    it('should only use orange variant for follow-up actions', () => {
      const orangeStatuses: ApplicationStatus[] = ['applied', 'interview_scheduled', 'interviewed']
      orangeStatuses.forEach((status) => {
        const button = getActionButton(status)
        expect(button?.variant).toBe('orange')
      })
    })
  })
})

// ============================================================================
// PROGRESS PERCENTAGE TESTS
// ============================================================================

describe('Progress Percentage', () => {
  it('should return 15% for prepared status', () => {
    expect(getProgressPercentage('prepared')).toBe(15)
  })

  it('should return 30% for applied status', () => {
    expect(getProgressPercentage('applied')).toBe(30)
  })

  it('should return 50% for interview_scheduled status', () => {
    expect(getProgressPercentage('interview_scheduled')).toBe(50)
  })

  it('should return 65% for interviewed status', () => {
    expect(getProgressPercentage('interviewed')).toBe(65)
  })

  it('should return 85% for offer_received status', () => {
    expect(getProgressPercentage('offer_received')).toBe(85)
  })

  it('should return 90% for negotiating status', () => {
    expect(getProgressPercentage('negotiating')).toBe(90)
  })

  it('should return 100% for accepted status', () => {
    expect(getProgressPercentage('accepted')).toBe(100)
  })

  it('should return 100% for rejected status', () => {
    expect(getProgressPercentage('rejected')).toBe(100)
  })

  it('should return 100% for withdrawn status', () => {
    expect(getProgressPercentage('withdrawn')).toBe(100)
  })

  it('should have monotonically increasing progress through workflow', () => {
    const workflow: ApplicationStatus[] = [
      'prepared',
      'applied',
      'interview_scheduled',
      'interviewed',
      'offer_received',
      'negotiating',
      'accepted',
    ]

    for (let i = 1; i < workflow.length; i++) {
      const prevProgress = getProgressPercentage(workflow[i - 1])
      const currProgress = getProgressPercentage(workflow[i])
      expect(currProgress).toBeGreaterThan(prevProgress)
    }
  })
})

// ============================================================================
// STATUS BADGE STYLE TESTS
// ============================================================================

describe('Status Badge Styles', () => {
  it('should return yellow styles for prepared status', () => {
    const style = getStatusBadgeStyle('prepared')
    expect(style).toContain('yellow')
  })

  it('should return blue styles for applied status', () => {
    const style = getStatusBadgeStyle('applied')
    expect(style).toContain('blue')
  })

  it('should return purple styles for interview_scheduled status', () => {
    const style = getStatusBadgeStyle('interview_scheduled')
    expect(style).toContain('purple')
  })

  it('should return indigo styles for interviewed status', () => {
    const style = getStatusBadgeStyle('interviewed')
    expect(style).toContain('indigo')
  })

  it('should return green styles for offer_received status', () => {
    const style = getStatusBadgeStyle('offer_received')
    expect(style).toContain('green')
  })

  it('should return teal styles for negotiating status', () => {
    const style = getStatusBadgeStyle('negotiating')
    expect(style).toContain('teal')
  })

  it('should return emerald styles for accepted status', () => {
    const style = getStatusBadgeStyle('accepted')
    expect(style).toContain('emerald')
  })

  it('should return red styles for rejected status', () => {
    const style = getStatusBadgeStyle('rejected')
    expect(style).toContain('red')
  })

  it('should return gray styles for withdrawn status', () => {
    const style = getStatusBadgeStyle('withdrawn')
    expect(style).toContain('gray')
  })

  it('should have all 9 statuses with defined styles', () => {
    const allStatuses: ApplicationStatus[] = [
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

    allStatuses.forEach((status) => {
      expect(STATUS_BADGE_STYLES[status]).toBeDefined()
      expect(STATUS_BADGE_STYLES[status].length).toBeGreaterThan(0)
    })
  })
})

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Button and Progress Integration', () => {
  it('should have action button before 100% progress', () => {
    const activeStatuses: ApplicationStatus[] = [
      'prepared',
      'applied',
      'interview_scheduled',
      'interviewed',
      'offer_received',
      'negotiating',
    ]

    activeStatuses.forEach((status) => {
      const progress = getProgressPercentage(status)
      const button = getActionButton(status)

      expect(progress).toBeLessThan(100)
      expect(button).not.toBeNull()
    })
  })

  it('should have no action button at 100% progress for terminal states', () => {
    const terminalStatuses: ApplicationStatus[] = ['rejected', 'withdrawn', 'accepted']

    terminalStatuses.forEach((status) => {
      const progress = getProgressPercentage(status)
      const button = getActionButton(status)

      expect(progress).toBe(100)
      expect(button).toBeNull()
    })
  })

  it('should map status to correct action throughout workflow', () => {
    const workflowActions: Record<ApplicationStatus, string | null> = {
      prepared: 'Tailor CV',
      applied: 'Follow Up',
      interview_scheduled: 'Follow Up',
      interviewed: 'Check Status',
      offer_received: 'Review Offer',
      negotiating: 'Review Offer',
      accepted: null,
      rejected: null,
      withdrawn: null,
    }

    Object.entries(workflowActions).forEach(([status, expectedLabel]) => {
      const button = getActionButton(status as ApplicationStatus)
      if (expectedLabel === null) {
        expect(button).toBeNull()
      } else {
        expect(button?.label).toBe(expectedLabel)
      }
    })
  })
})
