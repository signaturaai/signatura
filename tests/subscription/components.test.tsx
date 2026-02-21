/**
 * Subscription Components Tests (RALPH Loop 8)
 *
 * Tests for subscription UI components.
 * Verifies rendering behavior based on subscription state.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// ============================================================================
// Mock Setup
// ============================================================================

// Mock next/navigation
const mockPush = vi.fn()
const mockReplace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}))

// Mock useSubscription hook
const mockUseSubscription = vi.fn()
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => mockUseSubscription(),
}))

// Mock framer-motion (to avoid animation issues in tests)
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Lock: () => <span data-testid="lock-icon">Lock</span>,
  Sparkles: () => <span data-testid="sparkles-icon">Sparkles</span>,
  Check: () => <span data-testid="check-icon">Check</span>,
  Infinity: () => <span data-testid="infinity-icon">Infinity</span>,
  AlertTriangle: () => <span data-testid="alert-icon">AlertTriangle</span>,
  TrendingUp: () => <span data-testid="trending-icon">TrendingUp</span>,
  X: () => <span data-testid="x-icon">X</span>,
  ChevronRight: () => <span data-testid="chevron-icon">ChevronRight</span>,
  Loader2: () => <span data-testid="loader-icon">Loader</span>,
  Star: () => <span data-testid="star-icon">Star</span>,
  BarChart3: () => <span data-testid="chart-icon">BarChart</span>,
  Calendar: () => <span data-testid="calendar-icon">Calendar</span>,
  CreditCard: () => <span data-testid="card-icon">CreditCard</span>,
}))

// Mock UI components
vi.mock('@/components/ui', () => ({
  Button: ({ children, onClick, disabled, variant, className }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    variant?: string
    className?: string
  }) => (
    <button onClick={onClick} disabled={disabled} className={className} data-variant={variant}>
      {children}
    </button>
  ),
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className} data-testid="card">{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  AlertDialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    open ? <div data-testid="alert-dialog">{children}</div> : null
  ),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}))

// Mock subscription config
vi.mock('@/lib/subscription/config', () => ({
  TIER_CONFIGS: {
    momentum: {
      name: 'Momentum',
      tagline: 'Get started',
      pricing: {
        monthly: { amount: 12, discount: null },
        quarterly: { amount: 30, discount: '17%' },
        yearly: { amount: 99, discount: '31%' },
      },
      limits: { applications: 8, cvs: 8, interviews: 3, compensation: 3, contracts: 2, aiAvatarInterviews: 0 },
      isMostPopular: false,
    },
    accelerate: {
      name: 'Accelerate',
      tagline: 'Most popular',
      pricing: {
        monthly: { amount: 18, discount: null },
        quarterly: { amount: 45, discount: '17%' },
        yearly: { amount: 149, discount: '31%' },
      },
      limits: { applications: 15, cvs: 15, interviews: 8, compensation: 8, contracts: 5, aiAvatarInterviews: 5 },
      isMostPopular: true,
    },
    elite: {
      name: 'Elite',
      tagline: 'Unlimited power',
      pricing: {
        monthly: { amount: 29, discount: null },
        quarterly: { amount: 75, discount: '14%' },
        yearly: { amount: 249, discount: '28%' },
      },
      limits: { applications: -1, cvs: -1, interviews: -1, compensation: -1, contracts: -1, aiAvatarInterviews: 10 },
      isMostPopular: false,
    },
  },
  TIER_ORDER: ['momentum', 'accelerate', 'elite'],
  formatPrice: (amount: number) => `$${amount}`,
  isUpgrade: (from: string, to: string) => {
    const order = ['momentum', 'accelerate', 'elite']
    return order.indexOf(to) > order.indexOf(from)
  },
  isDowngrade: (from: string, to: string) => {
    const order = ['momentum', 'accelerate', 'elite']
    return order.indexOf(to) < order.indexOf(from)
  },
}))

// Import components after mocks
import { FeatureGate } from '@/components/subscription/FeatureGate'
import { UsageBadge } from '@/components/subscription/UsageBadge'
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt'
import { SubscriptionGuard } from '@/components/subscription/SubscriptionGuard'

// ============================================================================
// Default Mock Values
// ============================================================================

const createDefaultMockSubscription = (overrides: Record<string, unknown> = {}) => ({
  subscriptionEnabled: true,
  isLoading: false,
  hasSubscription: true,
  tier: 'accelerate',
  billingPeriod: 'monthly',
  status: 'active',
  canAccessFeature: vi.fn(() => true),
  usageFor: vi.fn(() => ({
    used: 3,
    limit: 15,
    remaining: 12,
    percentUsed: 20,
    unlimited: false,
  })),
  recommendation: {
    recommendedTier: 'accelerate',
    recommendedBillingPeriod: 'yearly',
    reason: 'Based on your usage, Accelerate is recommended.',
    comparison: {},
    savings: { monthly: 18, quarterly: 45, yearly: 149 },
  },
  recommendationLoading: false,
  isAdmin: false,
  initiate: vi.fn(),
  cancel: vi.fn(),
  changePlan: vi.fn(),
  checkAndConsume: vi.fn(),
  refresh: vi.fn(),
  ...overrides,
})

// ============================================================================
// FeatureGate Tests
// ============================================================================

describe('FeatureGate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('FeatureGate renders children when kill switch off', () => {
    mockUseSubscription.mockReturnValue(createDefaultMockSubscription({
      subscriptionEnabled: false,
    }))

    render(
      <FeatureGate feature="aiAvatarInterviews">
        <div data-testid="protected-content">Protected Content</div>
      </FeatureGate>
    )

    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
  })

  it('FeatureGate renders children when feature is allowed', () => {
    mockUseSubscription.mockReturnValue(createDefaultMockSubscription({
      subscriptionEnabled: true,
      canAccessFeature: vi.fn(() => true),
    }))

    render(
      <FeatureGate feature="aiAvatarInterviews">
        <div data-testid="protected-content">Protected Content</div>
      </FeatureGate>
    )

    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
  })

  it('FeatureGate renders lock overlay when feature denied', () => {
    mockUseSubscription.mockReturnValue(createDefaultMockSubscription({
      subscriptionEnabled: true,
      hasSubscription: true,
      tier: 'momentum',
      canAccessFeature: vi.fn(() => false),
    }))

    render(
      <FeatureGate feature="aiAvatarInterviews">
        <div data-testid="protected-content">Protected Content</div>
      </FeatureGate>
    )

    // Lock overlay should be shown
    expect(screen.getByTestId('lock-icon')).toBeInTheDocument()
    expect(screen.getByText('Upgrade Required')).toBeInTheDocument()
    expect(screen.getByText('Upgrade Plan')).toBeInTheDocument()
  })

  it('FeatureGate renders subscribe prompt when tier=NULL', () => {
    mockUseSubscription.mockReturnValue(createDefaultMockSubscription({
      subscriptionEnabled: true,
      hasSubscription: false,
      tier: null,
      canAccessFeature: vi.fn(() => false),
    }))

    render(
      <FeatureGate feature="aiAvatarInterviews">
        <div data-testid="protected-content">Protected Content</div>
      </FeatureGate>
    )

    // Subscribe prompt should be shown
    expect(screen.getByText('Subscribe to Access')).toBeInTheDocument()
    expect(screen.getByText('View Plans')).toBeInTheDocument()
  })

  it('FeatureGate is invisible (renders children) when disabled', () => {
    // When subscriptionEnabled is false, FeatureGate is effectively disabled
    mockUseSubscription.mockReturnValue(createDefaultMockSubscription({
      subscriptionEnabled: false,
      canAccessFeature: vi.fn(() => false), // even if this returns false
    }))

    render(
      <FeatureGate feature="aiAvatarInterviews">
        <div data-testid="protected-content">Protected Content</div>
      </FeatureGate>
    )

    // Children should render (gate is invisible)
    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
  })
})

// ============================================================================
// UsageBadge Tests
// ============================================================================

describe('UsageBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('UsageBadge renders null when kill switch off', () => {
    mockUseSubscription.mockReturnValue(createDefaultMockSubscription({
      subscriptionEnabled: false,
    }))

    const { container } = render(<UsageBadge resource="applications" />)

    expect(container.firstChild).toBeNull()
  })

  it('UsageBadge shows count when enabled: "3/15 used"', () => {
    mockUseSubscription.mockReturnValue(createDefaultMockSubscription({
      subscriptionEnabled: true,
      usageFor: vi.fn(() => ({
        used: 3,
        limit: 15,
        remaining: 12,
        percentUsed: 20,
        unlimited: false,
      })),
    }))

    render(<UsageBadge resource="applications" />)

    expect(screen.getByText('3/15 used')).toBeInTheDocument()
  })

  it('UsageBadge shows green when <50%', () => {
    mockUseSubscription.mockReturnValue(createDefaultMockSubscription({
      subscriptionEnabled: true,
      usageFor: vi.fn(() => ({
        used: 3,
        limit: 15,
        remaining: 12,
        percentUsed: 20,
        unlimited: false,
      })),
    }))

    const { container } = render(<UsageBadge resource="applications" />)

    const badge = container.querySelector('span')
    expect(badge?.className).toContain('bg-green')
  })

  it('UsageBadge shows yellow when 50-80%', () => {
    mockUseSubscription.mockReturnValue(createDefaultMockSubscription({
      subscriptionEnabled: true,
      usageFor: vi.fn(() => ({
        used: 10,
        limit: 15,
        remaining: 5,
        percentUsed: 66,
        unlimited: false,
      })),
    }))

    const { container } = render(<UsageBadge resource="applications" />)

    const badge = container.querySelector('span')
    expect(badge?.className).toContain('bg-yellow')
  })

  it('UsageBadge shows red when >80%', () => {
    mockUseSubscription.mockReturnValue(createDefaultMockSubscription({
      subscriptionEnabled: true,
      usageFor: vi.fn(() => ({
        used: 14,
        limit: 15,
        remaining: 1,
        percentUsed: 93,
        unlimited: false,
      })),
    }))

    const { container } = render(<UsageBadge resource="applications" />)

    const badge = container.querySelector('span')
    expect(badge?.className).toContain('bg-red')
  })

  it('UsageBadge shows limit reached message at capacity', () => {
    mockUseSubscription.mockReturnValue(createDefaultMockSubscription({
      subscriptionEnabled: true,
      usageFor: vi.fn(() => ({
        used: 15,
        limit: 15,
        remaining: 0,
        percentUsed: 100,
        unlimited: false,
      })),
    }))

    render(<UsageBadge resource="applications" />)

    expect(screen.getByText(/Limit reached|Upgrade/)).toBeInTheDocument()
  })

  it('UsageBadge shows Unlimited for unlimited resources', () => {
    mockUseSubscription.mockReturnValue(createDefaultMockSubscription({
      subscriptionEnabled: true,
      usageFor: vi.fn(() => ({
        used: 50,
        limit: -1,
        remaining: -1,
        percentUsed: 0,
        unlimited: true,
      })),
    }))

    render(<UsageBadge resource="applications" />)

    // Should show infinity icon or "Unlimited" text
    expect(screen.getByTestId('infinity-icon')).toBeInTheDocument()
  })
})

// ============================================================================
// UpgradePrompt Tests
// ============================================================================

describe('UpgradePrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('UpgradePrompt renders null when kill switch off', () => {
    mockUseSubscription.mockReturnValue(createDefaultMockSubscription({
      subscriptionEnabled: false,
    }))

    const { container } = render(<UpgradePrompt resource="applications" open={true} />)

    expect(container.firstChild).toBeNull()
  })

  it('UpgradePrompt shows personalized message with recommendation', () => {
    mockUseSubscription.mockReturnValue(createDefaultMockSubscription({
      subscriptionEnabled: true,
      tier: 'momentum',
      recommendation: {
        recommendedTier: 'accelerate',
        recommendedBillingPeriod: 'yearly',
        reason: 'Based on your usage',
        comparison: {
          applications: { average: 10, momentumLimit: 8, accelerateLimit: 15, eliteLimit: -1, fitsIn: 'accelerate' },
        },
        savings: { monthly: 18, quarterly: 45, yearly: 149 },
      },
      usageFor: vi.fn(() => ({
        used: 8,
        limit: 8,
        remaining: 0,
        percentUsed: 100,
        unlimited: false,
      })),
    }))

    render(<UpgradePrompt resource="applications" open={true} />)

    // Should show recommendation with tier name and price
    expect(screen.getByText(/Accelerate/)).toBeInTheDocument()
    expect(screen.getByText(/\$18\/mo/)).toBeInTheDocument()
  })

  it('UpgradePrompt includes upgrade button linking to pricing', () => {
    mockUseSubscription.mockReturnValue(createDefaultMockSubscription({
      subscriptionEnabled: true,
      recommendation: {
        recommendedTier: 'accelerate',
        recommendedBillingPeriod: 'yearly',
        reason: 'Based on usage',
        comparison: {},
        savings: { monthly: 18, quarterly: 45, yearly: 149 },
      },
    }))

    render(<UpgradePrompt resource="applications" open={true} />)

    const upgradeButton = screen.getByText(/Upgrade to Accelerate/)
    expect(upgradeButton).toBeInTheDocument()

    // Click should navigate to pricing
    fireEvent.click(upgradeButton)
    expect(mockPush).toHaveBeenCalledWith('/pricing?recommended=accelerate')
  })
})

// ============================================================================
// SubscriptionGuard Tests
// ============================================================================

describe('SubscriptionGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('SubscriptionGuard renders children when kill switch off', () => {
    mockUseSubscription.mockReturnValue(createDefaultMockSubscription({
      subscriptionEnabled: false,
    }))

    render(
      <SubscriptionGuard>
        <div data-testid="protected-page">Protected Page</div>
      </SubscriptionGuard>
    )

    expect(screen.getByTestId('protected-page')).toBeInTheDocument()
  })

  it('SubscriptionGuard renders children when user has subscription', () => {
    mockUseSubscription.mockReturnValue(createDefaultMockSubscription({
      subscriptionEnabled: true,
      hasSubscription: true,
    }))

    render(
      <SubscriptionGuard>
        <div data-testid="protected-page">Protected Page</div>
      </SubscriptionGuard>
    )

    expect(screen.getByTestId('protected-page')).toBeInTheDocument()
  })

  it('SubscriptionGuard redirects to /pricing when tier=NULL and enabled', async () => {
    mockUseSubscription.mockReturnValue(createDefaultMockSubscription({
      subscriptionEnabled: true,
      hasSubscription: false,
      tier: null,
      recommendation: null,
    }))

    render(
      <SubscriptionGuard>
        <div data-testid="protected-page">Protected Page</div>
      </SubscriptionGuard>
    )

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/pricing')
    })
  })
})

// ============================================================================
// Pricing Page Tests
// ============================================================================

// Import pricing page component
// Note: We need to test the page itself
import PricingPage from '@/app/(dashboard)/pricing/page'

describe('Pricing Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Pricing page shows coming soon when kill switch off', () => {
    mockUseSubscription.mockReturnValue(createDefaultMockSubscription({
      subscriptionEnabled: false,
      isLoading: false,
    }))

    render(<PricingPage />)

    expect(screen.getByText('Coming Soon')).toBeInTheDocument()
  })

  it('Pricing page renders 3 tier cards when enabled', () => {
    mockUseSubscription.mockReturnValue(createDefaultMockSubscription({
      subscriptionEnabled: true,
      isLoading: false,
      tier: null,
      hasSubscription: false,
    }))

    render(<PricingPage />)

    // Check for all 3 tiers
    expect(screen.getByText('MOMENTUM')).toBeInTheDocument()
    expect(screen.getByText('ACCELERATE')).toBeInTheDocument()
    expect(screen.getByText('ELITE')).toBeInTheDocument()
  })

  it('Pricing page billing period toggle switches prices', () => {
    mockUseSubscription.mockReturnValue(createDefaultMockSubscription({
      subscriptionEnabled: true,
      isLoading: false,
      tier: null,
      hasSubscription: false,
    }))

    render(<PricingPage />)

    // Default is quarterly - check for quarterly prices
    // Momentum quarterly = $30
    expect(screen.getByText('$30')).toBeInTheDocument()

    // Click monthly
    const monthlyButton = screen.getByText('Monthly')
    fireEvent.click(monthlyButton)

    // Now should show monthly prices - Momentum monthly = $12
    expect(screen.getByText('$12')).toBeInTheDocument()
  })

  it('Pricing page highlights Accelerate as Most Popular', () => {
    mockUseSubscription.mockReturnValue(createDefaultMockSubscription({
      subscriptionEnabled: true,
      isLoading: false,
      tier: null,
      hasSubscription: false,
    }))

    render(<PricingPage />)

    expect(screen.getByText('Most Popular')).toBeInTheDocument()
  })

  it('Pricing page shows recommendation banner when data available', () => {
    mockUseSubscription.mockReturnValue(createDefaultMockSubscription({
      subscriptionEnabled: true,
      isLoading: false,
      tier: 'momentum',
      recommendation: {
        recommendedTier: 'accelerate',
        recommendedBillingPeriod: 'yearly',
        reason: 'Based on your 3 months of usage, Accelerate fits your needs.',
        comparison: {},
        savings: { monthly: 18, quarterly: 45, yearly: 149 },
        monthsTracked: 3,
      },
    }))

    render(<PricingPage />)

    expect(screen.getByText(/Based on your usage/)).toBeInTheDocument()
    expect(screen.getByText(/Based on your 3 months of usage/)).toBeInTheDocument()
  })

  it('Pricing page shows Current Plan badge on user current tier', () => {
    mockUseSubscription.mockReturnValue(createDefaultMockSubscription({
      subscriptionEnabled: true,
      isLoading: false,
      tier: 'momentum',
      hasSubscription: true,
    }))

    render(<PricingPage />)

    expect(screen.getByText('Current Plan')).toBeInTheDocument()
  })

  it('Pricing page shows Upgrade button for higher tiers', () => {
    mockUseSubscription.mockReturnValue(createDefaultMockSubscription({
      subscriptionEnabled: true,
      isLoading: false,
      tier: 'momentum',
      hasSubscription: true,
    }))

    render(<PricingPage />)

    // Accelerate card should show "Upgrade" button
    const buttons = screen.getAllByText('Upgrade')
    expect(buttons.length).toBeGreaterThan(0)
  })
})

// ============================================================================
// Subscription Settings Page Tests
// ============================================================================

import SubscriptionSettingsPage from '@/app/(dashboard)/settings/subscription/page'

describe('Subscription Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock fetch for trends API
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          trends: [],
          averages: {
            applications: 0,
            cvs: 0,
            interviews: 0,
            compensation: 0,
            contracts: 0,
            aiAvatarInterviews: 0,
          },
          monthsTracked: 0,
        }),
      })
    ) as unknown as typeof fetch
  })

  it('Settings page shows coming soon when disabled', () => {
    mockUseSubscription.mockReturnValue(createDefaultMockSubscription({
      subscriptionEnabled: false,
      isLoading: false,
    }))

    render(<SubscriptionSettingsPage />)

    expect(screen.getByText('Full Access Enabled')).toBeInTheDocument()
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
  })

  it('Settings page shows current plan details when enabled', async () => {
    mockUseSubscription.mockReturnValue(createDefaultMockSubscription({
      subscriptionEnabled: true,
      isLoading: false,
      tier: 'accelerate',
      billingPeriod: 'monthly',
      hasSubscription: true,
      subscription: {
        tier: 'accelerate',
        billingPeriod: 'monthly',
        status: 'active',
        currentPeriodStart: '2026-02-01T00:00:00.000Z',
        currentPeriodEnd: '2026-03-01T00:00:00.000Z',
        isCancelled: false,
        isPastDue: false,
        scheduledTierChange: null,
        usage: {
          applications: { used: 5, limit: 15, unlimited: false },
          cvs: { used: 3, limit: 15, unlimited: false },
          interviews: { used: 2, limit: 8, unlimited: false },
          compensation: { used: 1, limit: 8, unlimited: false },
          contracts: { used: 0, limit: 5, unlimited: false },
          aiAvatarInterviews: { used: 1, limit: 5, unlimited: false },
        },
      },
    }))

    render(<SubscriptionSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Accelerate')).toBeInTheDocument()
    })
  })

  it('Settings page shows usage progress bars for all 6 resources', async () => {
    mockUseSubscription.mockReturnValue(createDefaultMockSubscription({
      subscriptionEnabled: true,
      isLoading: false,
      tier: 'accelerate',
      billingPeriod: 'monthly',
      hasSubscription: true,
      subscription: {
        tier: 'accelerate',
        billingPeriod: 'monthly',
        status: 'active',
        currentPeriodStart: '2026-02-01T00:00:00.000Z',
        currentPeriodEnd: '2026-03-01T00:00:00.000Z',
        isCancelled: false,
        isPastDue: false,
        scheduledTierChange: null,
        usage: {
          applications: { used: 5, limit: 15, unlimited: false },
          cvs: { used: 3, limit: 15, unlimited: false },
          interviews: { used: 2, limit: 8, unlimited: false },
          compensation: { used: 1, limit: 8, unlimited: false },
          contracts: { used: 0, limit: 5, unlimited: false },
          aiAvatarInterviews: { used: 1, limit: 5, unlimited: false },
        },
      },
    }))

    render(<SubscriptionSettingsPage />)

    await waitFor(() => {
      // Check for all 6 resource labels
      expect(screen.getByText('Applications')).toBeInTheDocument()
      expect(screen.getByText('Tailored CVs')).toBeInTheDocument()
      expect(screen.getByText('Interview Coach')).toBeInTheDocument()
      expect(screen.getByText('Compensation')).toBeInTheDocument()
      expect(screen.getByText('Contract Reviews')).toBeInTheDocument()
      expect(screen.getByText('AI Avatar Interviews')).toBeInTheDocument()
    })
  })

  it('Settings page shows scheduled downgrade notice when pending', async () => {
    mockUseSubscription.mockReturnValue(createDefaultMockSubscription({
      subscriptionEnabled: true,
      isLoading: false,
      tier: 'elite',
      billingPeriod: 'monthly',
      hasSubscription: true,
      subscription: {
        tier: 'elite',
        billingPeriod: 'monthly',
        status: 'active',
        currentPeriodStart: '2026-02-01T00:00:00.000Z',
        currentPeriodEnd: '2026-03-01T00:00:00.000Z',
        isCancelled: false,
        isPastDue: false,
        scheduledTierChange: 'momentum',
        usage: {
          applications: { used: 5, limit: -1, unlimited: true },
          cvs: { used: 3, limit: -1, unlimited: true },
          interviews: { used: 2, limit: -1, unlimited: true },
          compensation: { used: 1, limit: -1, unlimited: true },
          contracts: { used: 0, limit: -1, unlimited: true },
          aiAvatarInterviews: { used: 1, limit: 10, unlimited: false },
        },
      },
    }))

    render(<SubscriptionSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText(/Downgrading to/)).toBeInTheDocument()
      expect(screen.getByText(/Momentum/)).toBeInTheDocument()
    })
  })

  it('Settings page Cancel button triggers confirmation dialog', async () => {
    mockUseSubscription.mockReturnValue(createDefaultMockSubscription({
      subscriptionEnabled: true,
      isLoading: false,
      tier: 'accelerate',
      billingPeriod: 'monthly',
      hasSubscription: true,
      subscription: {
        tier: 'accelerate',
        billingPeriod: 'monthly',
        status: 'active',
        currentPeriodStart: '2026-02-01T00:00:00.000Z',
        currentPeriodEnd: '2026-03-01T00:00:00.000Z',
        isCancelled: false,
        isPastDue: false,
        scheduledTierChange: null,
        usage: {
          applications: { used: 5, limit: 15, unlimited: false },
          cvs: { used: 3, limit: 15, unlimited: false },
          interviews: { used: 2, limit: 8, unlimited: false },
          compensation: { used: 1, limit: 8, unlimited: false },
          contracts: { used: 0, limit: 5, unlimited: false },
          aiAvatarInterviews: { used: 1, limit: 5, unlimited: false },
        },
      },
    }))

    render(<SubscriptionSettingsPage />)

    await waitFor(() => {
      const cancelButton = screen.getByText('Cancel Subscription')
      expect(cancelButton).toBeInTheDocument()

      fireEvent.click(cancelButton)
    })

    // Dialog should open
    await waitFor(() => {
      expect(screen.getByText('Cancel Subscription?')).toBeInTheDocument()
    })
  })
})
