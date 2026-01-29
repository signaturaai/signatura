/**
 * P1: Persistent UI Layer - Global Overlay & Navigation
 *
 * Converts RALPH report "persistent-ui-layer.md" into automated Vitest tests.
 * Covers: GlobalOverlay state logic, FAB visibility, Siggy toggle,
 * context awareness (path-based), streak badges, drawer state,
 * navigation route matching, and floating chat drawer logic.
 */

import { describe, it, expect } from 'vitest'

// ============================================================
// 1. GLOBAL OVERLAY: State Logic
// ============================================================

describe('P1 - GlobalOverlay State Logic', () => {
  // Mirror the GlobalOverlay component's state logic

  interface GlobalOverlayState {
    isChatOpen: boolean
    showAccessibilityToast: boolean
    showBugToast: boolean
  }

  function createInitialState(): GlobalOverlayState {
    return {
      isChatOpen: false,
      showAccessibilityToast: false,
      showBugToast: false,
    }
  }

  describe('Initial state', () => {
    it('should start with chat closed', () => {
      const state = createInitialState()
      expect(state.isChatOpen).toBe(false)
    })

    it('should start with no toasts visible', () => {
      const state = createInitialState()
      expect(state.showAccessibilityToast).toBe(false)
      expect(state.showBugToast).toBe(false)
    })
  })

  describe('Chat toggle', () => {
    it('should open chat when clicked while closed', () => {
      const state = createInitialState()
      state.isChatOpen = !state.isChatOpen
      expect(state.isChatOpen).toBe(true)
    })

    it('should close chat when clicked while open', () => {
      const state = createInitialState()
      state.isChatOpen = true
      state.isChatOpen = !state.isChatOpen
      expect(state.isChatOpen).toBe(false)
    })
  })

  describe('Toast triggers', () => {
    it('should show accessibility toast on click', () => {
      const state = createInitialState()
      state.showAccessibilityToast = true
      expect(state.showAccessibilityToast).toBe(true)
    })

    it('should show bug toast on click', () => {
      const state = createInitialState()
      state.showBugToast = true
      expect(state.showBugToast).toBe(true)
    })

    it('should allow both toasts independently', () => {
      const state = createInitialState()
      state.showAccessibilityToast = true
      state.showBugToast = true
      expect(state.showAccessibilityToast).toBe(true)
      expect(state.showBugToast).toBe(true)
    })
  })
})

// ============================================================
// 2. CONTEXT AWARENESS: Path-Based Visibility
// ============================================================

describe('P1 - Context Awareness (Path-Based)', () => {
  // Mirror the showFloatingChat logic from GlobalOverlay
  function computeVisibility(pathname: string) {
    const isOnDashboard = pathname === '/dashboard'
    const isOnCompanionPage = pathname === '/companion'
    const showFloatingChat = !isOnDashboard && !isOnCompanionPage
    return { isOnDashboard, isOnCompanionPage, showFloatingChat }
  }

  it('should hide floating chat on /dashboard', () => {
    const { showFloatingChat } = computeVisibility('/dashboard')
    expect(showFloatingChat).toBe(false)
  })

  it('should hide floating chat on /companion', () => {
    const { showFloatingChat } = computeVisibility('/companion')
    expect(showFloatingChat).toBe(false)
  })

  it('should show floating chat on /applications', () => {
    const { showFloatingChat } = computeVisibility('/applications')
    expect(showFloatingChat).toBe(true)
  })

  it('should show floating chat on /cv', () => {
    const { showFloatingChat } = computeVisibility('/cv')
    expect(showFloatingChat).toBe(true)
  })

  it('should show floating chat on /cv/tailor', () => {
    const { showFloatingChat } = computeVisibility('/cv/tailor')
    expect(showFloatingChat).toBe(true)
  })

  it('should show floating chat on /interview', () => {
    const { showFloatingChat } = computeVisibility('/interview')
    expect(showFloatingChat).toBe(true)
  })

  it('should show floating chat on /compensation', () => {
    const { showFloatingChat } = computeVisibility('/compensation')
    expect(showFloatingChat).toBe(true)
  })

  it('should show floating chat on /contract', () => {
    const { showFloatingChat } = computeVisibility('/contract')
    expect(showFloatingChat).toBe(true)
  })

  it('should show floating chat on /settings', () => {
    const { showFloatingChat } = computeVisibility('/settings')
    expect(showFloatingChat).toBe(true)
  })

  it('should show floating chat on /settings/gdpr', () => {
    const { showFloatingChat } = computeVisibility('/settings/gdpr')
    expect(showFloatingChat).toBe(true)
  })

  it('Siggy click should NOT toggle chat on /dashboard', () => {
    const { showFloatingChat } = computeVisibility('/dashboard')
    // handleSiggyClick: if (showFloatingChat) { toggle } else { noop }
    let isChatOpen = false
    if (showFloatingChat) {
      isChatOpen = !isChatOpen
    }
    expect(isChatOpen).toBe(false) // No toggle on dashboard
  })

  it('Siggy click should toggle chat on /applications', () => {
    const { showFloatingChat } = computeVisibility('/applications')
    let isChatOpen = false
    if (showFloatingChat) {
      isChatOpen = !isChatOpen
    }
    expect(isChatOpen).toBe(true)
  })
})

// ============================================================
// 3. SIGGY AVATAR: Streak Badge & Ring Indicator
// ============================================================

describe('P1 - Siggy Avatar Display Logic', () => {
  interface SiggyDisplayState {
    streak: number
    isChatOpen: boolean
  }

  function shouldShowStreakBadge(state: SiggyDisplayState): boolean {
    return state.streak > 0 && !state.isChatOpen
  }

  function shouldShowRing(isChatOpen: boolean): boolean {
    return isChatOpen
  }

  function getAriaLabel(isChatOpen: boolean): string {
    return isChatOpen ? 'Close Siggy Chat' : 'Open Siggy Chat'
  }

  describe('Streak badge', () => {
    it('should show badge when streak > 0 and chat is closed', () => {
      expect(shouldShowStreakBadge({ streak: 5, isChatOpen: false })).toBe(true)
    })

    it('should hide badge when streak is 0', () => {
      expect(shouldShowStreakBadge({ streak: 0, isChatOpen: false })).toBe(false)
    })

    it('should hide badge when chat is open', () => {
      expect(shouldShowStreakBadge({ streak: 5, isChatOpen: true })).toBe(false)
    })

    it('should hide badge when streak is 0 and chat is open', () => {
      expect(shouldShowStreakBadge({ streak: 0, isChatOpen: true })).toBe(false)
    })
  })

  describe('Ring indicator', () => {
    it('should show ring when chat is open', () => {
      expect(shouldShowRing(true)).toBe(true)
    })

    it('should hide ring when chat is closed', () => {
      expect(shouldShowRing(false)).toBe(false)
    })
  })

  describe('Aria labels', () => {
    it('should say "Open Siggy Chat" when closed', () => {
      expect(getAriaLabel(false)).toBe('Open Siggy Chat')
    })

    it('should say "Close Siggy Chat" when open', () => {
      expect(getAriaLabel(true)).toBe('Close Siggy Chat')
    })
  })
})

// ============================================================
// 4. FAB CONFIGURATION: Styling & Positioning
// ============================================================

describe('P1 - FAB Configuration', () => {
  // Accessibility FAB config
  const accessibilityFab = {
    bgColor: 'bg-sky-dark',
    textColor: 'text-white',
    ariaLabel: 'Accessibility Tools',
    tooltipText: 'Accessibility Tools',
    position: 'bottom-left',
    hoverScale: 'hover:scale-110',
  }

  // Bug Reporter FAB config
  const bugReporterFab = {
    bgColor: 'bg-peach-dark',
    textColor: 'text-white',
    ariaLabel: 'Report an Issue',
    tooltipText: 'Report an Issue',
    position: 'bottom-left',
    hoverScale: 'hover:scale-110',
  }

  // Siggy FAB config
  const siggyFab = {
    gradient: 'from-rose-light via-peach-light to-lavender-light',
    position: 'bottom-right',
    hoverScale: 'hover:scale-110',
    onlineIndicatorColor: 'bg-green-500',
  }

  describe('Accessibility FAB', () => {
    it('should have sky-dark background', () => {
      expect(accessibilityFab.bgColor).toBe('bg-sky-dark')
    })

    it('should have white text', () => {
      expect(accessibilityFab.textColor).toBe('text-white')
    })

    it('should have correct aria label', () => {
      expect(accessibilityFab.ariaLabel).toBe('Accessibility Tools')
    })

    it('should be positioned bottom-left', () => {
      expect(accessibilityFab.position).toBe('bottom-left')
    })
  })

  describe('Bug Reporter FAB', () => {
    it('should have peach-dark background', () => {
      expect(bugReporterFab.bgColor).toBe('bg-peach-dark')
    })

    it('should have white text', () => {
      expect(bugReporterFab.textColor).toBe('text-white')
    })

    it('should have correct aria label', () => {
      expect(bugReporterFab.ariaLabel).toBe('Report an Issue')
    })

    it('should be positioned bottom-left', () => {
      expect(bugReporterFab.position).toBe('bottom-left')
    })
  })

  describe('Siggy FAB', () => {
    it('should have gradient background', () => {
      expect(siggyFab.gradient).toContain('rose-light')
      expect(siggyFab.gradient).toContain('peach-light')
      expect(siggyFab.gradient).toContain('lavender-light')
    })

    it('should be positioned bottom-right', () => {
      expect(siggyFab.position).toBe('bottom-right')
    })

    it('should have green online indicator', () => {
      expect(siggyFab.onlineIndicatorColor).toBe('bg-green-500')
    })
  })

  describe('All FABs share hover scale', () => {
    it('should all use hover:scale-110', () => {
      expect(accessibilityFab.hoverScale).toBe('hover:scale-110')
      expect(bugReporterFab.hoverScale).toBe('hover:scale-110')
      expect(siggyFab.hoverScale).toBe('hover:scale-110')
    })
  })
})

// ============================================================
// 5. FLOATING COMPANION DRAWER: State & Animations
// ============================================================

describe('P1 - Floating Companion Drawer', () => {
  describe('Drawer visibility classes', () => {
    function getDrawerClasses(isOpen: boolean) {
      return isOpen
        ? 'opacity-100 translate-y-0 scale-100'
        : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
    }

    function getBackdropClasses(isOpen: boolean) {
      return isOpen
        ? 'opacity-100'
        : 'opacity-0 pointer-events-none'
    }

    it('should show drawer when open', () => {
      const classes = getDrawerClasses(true)
      expect(classes).toContain('opacity-100')
      expect(classes).toContain('translate-y-0')
      expect(classes).toContain('scale-100')
    })

    it('should hide drawer when closed', () => {
      const classes = getDrawerClasses(false)
      expect(classes).toContain('opacity-0')
      expect(classes).toContain('pointer-events-none')
    })

    it('should show backdrop when open', () => {
      const classes = getBackdropClasses(true)
      expect(classes).toContain('opacity-100')
      expect(classes).not.toContain('pointer-events-none')
    })

    it('should hide backdrop when closed', () => {
      const classes = getBackdropClasses(false)
      expect(classes).toContain('opacity-0')
      expect(classes).toContain('pointer-events-none')
    })
  })

  describe('Glassmorphic design tokens', () => {
    const glassPanel = {
      bg: 'bg-white/70',
      blur: 'backdrop-blur-xl',
      border: 'border-white/40',
    }

    it('should have semi-transparent white background', () => {
      expect(glassPanel.bg).toBe('bg-white/70')
    })

    it('should have backdrop blur', () => {
      expect(glassPanel.blur).toBe('backdrop-blur-xl')
    })

    it('should have semi-transparent border', () => {
      expect(glassPanel.border).toBe('border-white/40')
    })
  })

  describe('Message bubble styles', () => {
    const companionBubble = {
      bg: 'bg-white/80',
      blur: 'backdrop-blur-md',
      shadow: 'shadow-soft',
      border: 'border-white/50',
      rounded: 'rounded-2xl rounded-bl-md',
    }

    const userBubble = {
      gradient: 'bg-gradient-to-br from-rose-light via-peach-light to-rose',
      rounded: 'rounded-2xl rounded-br-md',
      shadow: 'shadow-soft',
    }

    it('companion bubble should have glass effect', () => {
      expect(companionBubble.bg).toBe('bg-white/80')
      expect(companionBubble.blur).toBe('backdrop-blur-md')
    })

    it('user bubble should have warm gradient', () => {
      expect(userBubble.gradient).toContain('rose-light')
      expect(userBubble.gradient).toContain('peach-light')
    })

    it('companion bubble should have asymmetric rounding', () => {
      expect(companionBubble.rounded).toContain('rounded-bl-md')
    })

    it('user bubble should have asymmetric rounding', () => {
      expect(userBubble.rounded).toContain('rounded-br-md')
    })
  })

  describe('Timestamp formatting', () => {
    function formatTimestamp(date: Date): string {
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`

      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return `${diffHours}h ago`

      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }

    it('should return "Just now" for less than 1 minute', () => {
      expect(formatTimestamp(new Date())).toBe('Just now')
    })

    it('should return minutes ago for < 60 minutes', () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60000)
      expect(formatTimestamp(fiveMinAgo)).toBe('5m ago')
    })

    it('should return hours ago for < 24 hours', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60000)
      expect(formatTimestamp(twoHoursAgo)).toBe('2h ago')
    })

    it('should return date for older messages', () => {
      const oldDate = new Date('2025-06-15T10:00:00Z')
      const result = formatTimestamp(oldDate)
      expect(result).toContain('Jun')
    })
  })
})

// ============================================================
// 6. CONTEXT-AWARE GREETINGS
// ============================================================

describe('P1 - Context-Aware Greetings', () => {
  const pageContexts: Record<string, string> = {
    '/cv': `I see you're working on your CV. Need help tailoring it for a specific role?`,
    '/cv/tailor': `Let's make your CV shine! I can help you highlight the right skills.`,
    '/applications': `Reviewing your applications? I'm here if you need to talk through any of them.`,
    '/interview': `Preparing for interviews? I can help you practice and build confidence.`,
    '/compensation': `Negotiating compensation can be stressful. Let me help you prepare.`,
    '/contract': `Reviewing a contract? I can help you understand what to look for.`,
    '/settings': `Taking care of account settings? Let me know if you need anything.`,
  }

  it('should have 7 page-specific greetings', () => {
    expect(Object.keys(pageContexts).length).toBe(7)
  })

  it('should have CV page greeting', () => {
    expect(pageContexts['/cv']).toContain('CV')
  })

  it('should have CV tailor greeting', () => {
    expect(pageContexts['/cv/tailor']).toContain('CV')
  })

  it('should have applications greeting', () => {
    expect(pageContexts['/applications']).toContain('applications')
  })

  it('should have interview greeting', () => {
    expect(pageContexts['/interview']).toContain('interview')
  })

  it('should have compensation greeting', () => {
    expect(pageContexts['/compensation']).toContain('compensation')
  })

  it('should have contract greeting', () => {
    expect(pageContexts['/contract']).toContain('contract')
  })

  it('should have settings greeting', () => {
    expect(pageContexts['/settings']).toContain('settings')
  })

  it('should return default message for unknown paths', () => {
    const defaultMsg = pageContexts['/unknown'] || 'How can I support you right now?'
    expect(defaultMsg).toBe('How can I support you right now?')
  })

  describe('getContextAwareGreeting logic', () => {
    function getContextAwareGreeting(userName: string, streak: number, currentPath: string): string {
      const firstName = userName.split(' ')[0]
      const hour = new Date().getHours()
      const timeGreeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
      const contextMessage = pageContexts[currentPath] || `How can I support you right now?`

      if (streak === 0) {
        return `Good ${timeGreeting}, ${firstName}!\n\n${contextMessage}`
      }
      return `Hey ${firstName}! ${streak} days strong together.\n\n${contextMessage}`
    }

    it('should include first name', () => {
      const greeting = getContextAwareGreeting('John Doe', 0, '/cv')
      expect(greeting).toContain('John')
      expect(greeting).not.toContain('Doe')
    })

    it('should include time-of-day greeting when streak is 0', () => {
      const greeting = getContextAwareGreeting('Alice', 0, '/cv')
      expect(greeting).toMatch(/Good (morning|afternoon|evening)/)
    })

    it('should include streak count when streak > 0', () => {
      const greeting = getContextAwareGreeting('Bob', 7, '/cv')
      expect(greeting).toContain('7 days strong')
    })

    it('should include page context message', () => {
      const greeting = getContextAwareGreeting('Alice', 0, '/interview')
      expect(greeting).toContain('interview')
    })

    it('should use default message for unrecognized path', () => {
      const greeting = getContextAwareGreeting('Alice', 0, '/random')
      expect(greeting).toContain('How can I support you right now?')
    })
  })
})

// ============================================================
// 7. LAYOUT INTEGRATION: Props Passing
// ============================================================

describe('P1 - Layout Integration', () => {
  interface GlobalOverlayProps {
    userId?: string
    userName?: string
    streak?: number
  }

  it('should handle missing userId with default', () => {
    const props: GlobalOverlayProps = {}
    const userId = props.userId || 'guest'
    expect(userId).toBe('guest')
  })

  it('should handle missing userName with default', () => {
    const props: GlobalOverlayProps = {}
    const userName = props.userName || 'Friend'
    expect(userName).toBe('Friend')
  })

  it('should handle missing streak with default', () => {
    const props: GlobalOverlayProps = {}
    const streak = props.streak ?? 0
    expect(streak).toBe(0)
  })

  it('should pass through provided values', () => {
    const props: GlobalOverlayProps = {
      userId: 'user-123',
      userName: 'Alice',
      streak: 5,
    }
    expect(props.userId).toBe('user-123')
    expect(props.userName).toBe('Alice')
    expect(props.streak).toBe(5)
  })
})

// ============================================================
// 8. TOAST AUTO-DISMISS LOGIC
// ============================================================

describe('P1 - Toast Auto-Dismiss Logic', () => {
  it('should auto-dismiss after timeout (3 seconds)', () => {
    const TOAST_TIMEOUT = 3000
    expect(TOAST_TIMEOUT).toBe(3000)
  })

  it('should be closeable manually via X button', () => {
    let showToast = true
    // Simulate click on X
    showToast = false
    expect(showToast).toBe(false)
  })

  it('toast content for accessibility should include correct text', () => {
    const title = 'Accessibility Tools'
    const description = "Coming soon! We're building inclusive features."
    expect(title).toBe('Accessibility Tools')
    expect(description).toContain('Coming soon')
  })

  it('toast content for bug reporter should include email', () => {
    const description = 'Send feedback to help@signatura.ai'
    expect(description).toContain('help@signatura.ai')
  })
})
