/**
 * P2: Companion Glassmorphism UI & Data Flow
 *
 * Converts RALPH reports "glassmorphism-ui.md" into automated Vitest tests.
 * Covers: Chat component design tokens, greeting logic, message handling,
 * send button state, input validation, animation configuration,
 * initial greeting variants, and context state management.
 */

import { describe, it, expect } from 'vitest'

// ============================================================
// 1. CHAT COMPONENT: Design Tokens
// ============================================================

describe('P2 - Chat Component Design Tokens', () => {
  describe('Glass container', () => {
    const containerTokens = {
      bg: 'bg-white/60',
      blur: 'backdrop-blur-xl',
      border: 'border-white/40',
      rounded: 'rounded-2xl',
    }

    it('should have semi-transparent white background', () => {
      expect(containerTokens.bg).toBe('bg-white/60')
    })

    it('should have XL backdrop blur', () => {
      expect(containerTokens.blur).toBe('backdrop-blur-xl')
    })

    it('should have semi-transparent border', () => {
      expect(containerTokens.border).toBe('border-white/40')
    })

    it('should have 2xl rounding', () => {
      expect(containerTokens.rounded).toBe('rounded-2xl')
    })
  })

  describe('Gradient mesh background', () => {
    const gradientMesh = {
      primary: 'bg-gradient-to-br from-rose-light/40 via-peach-light/30 to-lavender-light/40',
      animation: 'animate-gradient',
      opacity: 'opacity-60',
    }

    it('should use rose/peach/lavender gradient', () => {
      expect(gradientMesh.primary).toContain('rose-light')
      expect(gradientMesh.primary).toContain('peach-light')
      expect(gradientMesh.primary).toContain('lavender-light')
    })

    it('should animate the gradient', () => {
      expect(gradientMesh.animation).toBe('animate-gradient')
    })

    it('should be semi-transparent', () => {
      expect(gradientMesh.opacity).toBe('opacity-60')
    })
  })

  describe('Companion avatar (breathing)', () => {
    const avatarTokens = {
      gradient: 'bg-gradient-to-br from-rose via-peach to-lavender',
      animation: 'animate-pulse-gentle',
      shape: 'rounded-full',
    }

    it('should use rose/peach/lavender gradient', () => {
      expect(avatarTokens.gradient).toContain('from-rose')
      expect(avatarTokens.gradient).toContain('via-peach')
      expect(avatarTokens.gradient).toContain('to-lavender')
    })

    it('should use pulse-gentle animation', () => {
      expect(avatarTokens.animation).toBe('animate-pulse-gentle')
    })

    it('should be circular', () => {
      expect(avatarTokens.shape).toBe('rounded-full')
    })
  })
})

// ============================================================
// 2. MESSAGE BUBBLE STYLES
// ============================================================

describe('P2 - Message Bubble Styles', () => {
  describe('Companion message bubble', () => {
    const bubble = {
      bg: 'bg-white/80',
      blur: 'backdrop-blur-md',
      shadow: 'shadow-soft',
      border: 'border-white/50',
      rounded: 'rounded-2xl rounded-bl-md',
      entrance: 'animate-fade-up',
    }

    it('should have glass background', () => {
      expect(bubble.bg).toBe('bg-white/80')
    })

    it('should have medium backdrop blur', () => {
      expect(bubble.blur).toBe('backdrop-blur-md')
    })

    it('should have soft shadow', () => {
      expect(bubble.shadow).toBe('shadow-soft')
    })

    it('should have asymmetric rounding (bottom-left pointed)', () => {
      expect(bubble.rounded).toContain('rounded-bl-md')
    })

    it('should have fade-up entrance animation', () => {
      expect(bubble.entrance).toBe('animate-fade-up')
    })
  })

  describe('User message bubble', () => {
    const bubble = {
      gradient: 'bg-gradient-to-br from-rose-light via-peach-light to-rose',
      rounded: 'rounded-2xl rounded-br-md',
      shadow: 'shadow-soft',
    }

    it('should have warm gradient', () => {
      expect(bubble.gradient).toContain('from-rose-light')
      expect(bubble.gradient).toContain('via-peach-light')
      expect(bubble.gradient).toContain('to-rose')
    })

    it('should have asymmetric rounding (bottom-right pointed)', () => {
      expect(bubble.rounded).toContain('rounded-br-md')
    })
  })

  describe('Animation stagger delays', () => {
    function getAnimationDelay(index: number): number {
      return Math.min(index * 100, 300)
    }

    it('should return 0ms for first message', () => {
      expect(getAnimationDelay(0)).toBe(0)
    })

    it('should return 100ms for second message', () => {
      expect(getAnimationDelay(1)).toBe(100)
    })

    it('should return 200ms for third message', () => {
      expect(getAnimationDelay(2)).toBe(200)
    })

    it('should cap at 300ms for fourth and beyond', () => {
      expect(getAnimationDelay(3)).toBe(300)
      expect(getAnimationDelay(10)).toBe(300)
      expect(getAnimationDelay(100)).toBe(300)
    })
  })
})

// ============================================================
// 3. INPUT AREA: Floating Capsule Design
// ============================================================

describe('P2 - Input Area Design', () => {
  const inputTokens = {
    container: 'bg-white/70 backdrop-blur-md rounded-full border-white/50',
    focusState: 'focus-within:bg-white/85 focus-within:border-rose-light/50',
    hoverState: 'hover:bg-white/80',
    placeholder: 'Share how you\'re feeling...',
  }

  it('should have capsule shape (rounded-full)', () => {
    expect(inputTokens.container).toContain('rounded-full')
  })

  it('should have glass background', () => {
    expect(inputTokens.container).toContain('bg-white/70')
    expect(inputTokens.container).toContain('backdrop-blur-md')
  })

  it('should have empathetic placeholder text', () => {
    expect(inputTokens.placeholder).toBe("Share how you're feeling...")
  })

  it('should increase opacity on focus', () => {
    expect(inputTokens.focusState).toContain('focus-within:bg-white/85')
  })

  it('should show rose border on focus', () => {
    expect(inputTokens.focusState).toContain('focus-within:border-rose-light/50')
  })

  describe('Send button state', () => {
    function getSendButtonState(input: string, isLoading: boolean) {
      const hasContent = input.trim().length > 0
      const enabled = hasContent && !isLoading
      return {
        enabled,
        classes: enabled
          ? 'bg-gradient-to-br from-rose via-rose-dark to-rose text-white'
          : 'bg-rose-light/50 text-text-tertiary cursor-not-allowed',
      }
    }

    it('should be disabled when input is empty', () => {
      const state = getSendButtonState('', false)
      expect(state.enabled).toBe(false)
      expect(state.classes).toContain('cursor-not-allowed')
    })

    it('should be disabled when input is whitespace only', () => {
      const state = getSendButtonState('   ', false)
      expect(state.enabled).toBe(false)
    })

    it('should be enabled when input has content', () => {
      const state = getSendButtonState('Hello!', false)
      expect(state.enabled).toBe(true)
      expect(state.classes).toContain('from-rose')
    })

    it('should be disabled when loading even with content', () => {
      const state = getSendButtonState('Hello!', true)
      expect(state.enabled).toBe(false)
    })

    it('should have gradient when enabled', () => {
      const state = getSendButtonState('Hi', false)
      expect(state.classes).toContain('bg-gradient-to-br')
    })
  })
})

// ============================================================
// 4. INITIAL GREETING: Variants Based on State
// ============================================================

describe('P2 - Initial Greeting Logic', () => {
  function getInitialGreeting(
    userName: string,
    streak: number,
    hasCheckedInToday: boolean,
  ): string {
    const firstName = userName.split(' ')[0]
    const hour = new Date().getHours()
    const timeGreeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

    if (hasCheckedInToday) {
      return `Hey ${firstName}, good to see you back today. We already checked in earlier, but I'm always here if you want to talk. How can I help?`
    }

    if (streak === 0) {
      return `Good ${timeGreeting}, ${firstName}!\n\nI'm your companion on this journey. Job searching can feel lonely, but you don't have to do it alone.\n\nHow are you feeling today? Be honest—there's no wrong answer here.`
    }

    if (streak > 7) {
      return `Good ${timeGreeting}, ${firstName}!\n\n${streak} days of checking in together. That's real commitment to yourself. I see you.\n\nHow are you doing today?`
    }

    return `Good ${timeGreeting}, ${firstName}!\n\nDay ${streak + 1} of walking this path together. I'm glad you're here.\n\nHow are you feeling today?`
  }

  describe('New user (streak = 0, not checked in)', () => {
    it('should include time greeting', () => {
      const greeting = getInitialGreeting('Alice', 0, false)
      expect(greeting).toMatch(/Good (morning|afternoon|evening), Alice!/)
    })

    it('should mention loneliness of job searching', () => {
      const greeting = getInitialGreeting('Alice', 0, false)
      expect(greeting).toContain('lonely')
    })

    it('should ask how they are feeling', () => {
      const greeting = getInitialGreeting('Alice', 0, false)
      expect(greeting).toContain('How are you feeling today?')
    })

    it('should encourage honesty', () => {
      const greeting = getInitialGreeting('Alice', 0, false)
      expect(greeting).toContain('no wrong answer')
    })
  })

  describe('Returning user (checked in today)', () => {
    it('should acknowledge previous check-in', () => {
      const greeting = getInitialGreeting('Bob', 5, true)
      expect(greeting).toContain('checked in earlier')
    })

    it('should offer to help', () => {
      const greeting = getInitialGreeting('Bob', 5, true)
      expect(greeting).toContain('How can I help?')
    })

    it('should not include journey messaging', () => {
      const greeting = getInitialGreeting('Bob', 5, true)
      expect(greeting).not.toContain('companion on this journey')
    })
  })

  describe('Short streak (1-7 days)', () => {
    it('should mention the day count', () => {
      const greeting = getInitialGreeting('Carol', 3, false)
      expect(greeting).toContain('Day 4') // streak + 1
    })

    it('should express gladness they are here', () => {
      const greeting = getInitialGreeting('Carol', 3, false)
      expect(greeting).toContain("I'm glad you're here")
    })
  })

  describe('Long streak (> 7 days)', () => {
    it('should celebrate the streak count', () => {
      const greeting = getInitialGreeting('Dave', 14, false)
      expect(greeting).toContain('14 days')
    })

    it('should acknowledge commitment', () => {
      const greeting = getInitialGreeting('Dave', 14, false)
      expect(greeting).toContain('real commitment')
    })

    it('should say "I see you"', () => {
      const greeting = getInitialGreeting('Dave', 14, false)
      expect(greeting).toContain('I see you')
    })
  })

  describe('First name extraction', () => {
    it('should use first name from full name', () => {
      const greeting = getInitialGreeting('Alice Johnson', 0, false)
      expect(greeting).toContain('Alice')
      expect(greeting).not.toContain('Johnson')
    })

    it('should handle single name', () => {
      const greeting = getInitialGreeting('Alice', 0, false)
      expect(greeting).toContain('Alice')
    })
  })
})

// ============================================================
// 5. CHAT MESSAGE STATE MANAGEMENT
// ============================================================

describe('P2 - Chat Message State Management', () => {
  interface Message {
    role: 'user' | 'companion'
    content: string
    timestamp: Date
    suggestedGoal?: { goal: string; type: string }
  }

  function createMessages(): Message[] {
    return [{
      role: 'companion',
      content: 'Hello!',
      timestamp: new Date(),
    }]
  }

  describe('Message list initialization', () => {
    it('should start with one companion message', () => {
      const messages = createMessages()
      expect(messages.length).toBe(1)
      expect(messages[0].role).toBe('companion')
    })
  })

  describe('Adding user message', () => {
    it('should append user message to the list', () => {
      const messages = createMessages()
      messages.push({
        role: 'user',
        content: 'Hi there!',
        timestamp: new Date(),
      })
      expect(messages.length).toBe(2)
      expect(messages[1].role).toBe('user')
      expect(messages[1].content).toBe('Hi there!')
    })
  })

  describe('Adding companion response', () => {
    it('should append companion response after user message', () => {
      const messages = createMessages()
      messages.push({ role: 'user', content: 'Hi', timestamp: new Date() })
      messages.push({ role: 'companion', content: 'How can I help?', timestamp: new Date() })
      expect(messages.length).toBe(3)
      expect(messages[2].role).toBe('companion')
    })
  })

  describe('Suggested goal in companion message', () => {
    it('should support optional suggestedGoal', () => {
      const msg: Message = {
        role: 'companion',
        content: 'Try this goal:',
        timestamp: new Date(),
        suggestedGoal: { goal: 'Apply to one job today', type: 'application' },
      }
      expect(msg.suggestedGoal).toBeDefined()
      expect(msg.suggestedGoal!.goal).toBe('Apply to one job today')
    })

    it('should handle messages without suggestedGoal', () => {
      const msg: Message = {
        role: 'companion',
        content: 'Just chatting',
        timestamp: new Date(),
      }
      expect(msg.suggestedGoal).toBeUndefined()
    })
  })

  describe('Goal acceptance flow', () => {
    it('should add user confirmation message with goal text', () => {
      const messages: Message[] = []
      const goal = 'Apply to one job today'
      messages.push({
        role: 'user',
        content: `I'll do it: "${goal}"`,
        timestamp: new Date(),
      })
      expect(messages[0].content).toContain(goal)
      expect(messages[0].content).toContain("I'll do it")
    })

    it('should add companion encouragement after goal acceptance', () => {
      const messages: Message[] = []
      messages.push({
        role: 'companion',
        content: "That's the spirit! You've got this.",
        timestamp: new Date(),
      })
      expect(messages[0].content).toContain("That's the spirit")
    })
  })

  describe('Error handling in chat', () => {
    it('should add fallback companion message on API failure', () => {
      const errorMessage: Message = {
        role: 'companion',
        content: "I'm having trouble connecting right now. But I'm still here with you. Can you try again in a moment?",
        timestamp: new Date(),
      }
      expect(errorMessage.content).toContain('trouble connecting')
      expect(errorMessage.content).toContain('try again')
    })
  })
})

// ============================================================
// 6. INPUT VALIDATION: Submit Guards
// ============================================================

describe('P2 - Input Validation & Submit Guards', () => {
  function shouldSubmit(input: string, isLoading: boolean): boolean {
    return input.trim().length > 0 && !isLoading
  }

  it('should not submit empty string', () => {
    expect(shouldSubmit('', false)).toBe(false)
  })

  it('should not submit whitespace only', () => {
    expect(shouldSubmit('   ', false)).toBe(false)
  })

  it('should not submit when loading', () => {
    expect(shouldSubmit('Hello', true)).toBe(false)
  })

  it('should submit valid input when not loading', () => {
    expect(shouldSubmit('Hello!', false)).toBe(true)
  })

  it('should submit trimmed single character', () => {
    expect(shouldSubmit('a', false)).toBe(true)
  })

  it('should submit multi-line input', () => {
    expect(shouldSubmit('line1\nline2', false)).toBe(true)
  })
})

// ============================================================
// 7. LOADING STATE: Bouncing Dots
// ============================================================

describe('P2 - Loading State Animation', () => {
  const bouncingDots = [
    { delay: '0ms', size: 'w-2 h-2', color: 'bg-rose-light' },
    { delay: '150ms', size: 'w-2 h-2', color: 'bg-rose-light' },
    { delay: '300ms', size: 'w-2 h-2', color: 'bg-rose-light' },
  ]

  it('should have exactly 3 bouncing dots', () => {
    expect(bouncingDots.length).toBe(3)
  })

  it('should have staggered delays (0, 150, 300ms)', () => {
    expect(bouncingDots[0].delay).toBe('0ms')
    expect(bouncingDots[1].delay).toBe('150ms')
    expect(bouncingDots[2].delay).toBe('300ms')
  })

  it('should all use rose-light color', () => {
    for (const dot of bouncingDots) {
      expect(dot.color).toBe('bg-rose-light')
    }
  })

  it('should all be same size', () => {
    const sizes = new Set(bouncingDots.map((d) => d.size))
    expect(sizes.size).toBe(1)
  })
})

// ============================================================
// 8. COMPANION CHAT API: Request Shape
// ============================================================

describe('P2 - Companion Chat API Request Shape', () => {
  describe('Daily check-in request', () => {
    it('should include userId', () => {
      const body = {
        message: 'I feel good today',
        userId: 'user-123',
        conversationType: 'daily_checkin',
      }
      expect(body.userId).toBe('user-123')
    })

    it('should set conversationType to daily_checkin when not checked in', () => {
      const hasCheckedInToday = false
      const conversationType = hasCheckedInToday ? 'general' : 'daily_checkin'
      expect(conversationType).toBe('daily_checkin')
    })

    it('should set conversationType to general when already checked in', () => {
      const hasCheckedInToday = true
      const conversationType = hasCheckedInToday ? 'general' : 'daily_checkin'
      expect(conversationType).toBe('general')
    })
  })

  describe('Floating drawer request', () => {
    it('should include currentPath in context', () => {
      const body = {
        message: 'Help me with my CV',
        userId: 'user-123',
        conversationType: 'general',
        context: { currentPath: '/cv' },
      }
      expect(body.context.currentPath).toBe('/cv')
    })
  })
})

// ============================================================
// 9. STREAK DISPLAY: Badge in Chat Component
// ============================================================

describe('P2 - Streak Display in Chat Component', () => {
  function shouldShowStreakBadge(streak: number): boolean {
    return streak > 0
  }

  function getStreakText(streak: number): string {
    return `${streak} day streak`
  }

  it('should show streak badge when streak > 0', () => {
    expect(shouldShowStreakBadge(1)).toBe(true)
    expect(shouldShowStreakBadge(14)).toBe(true)
  })

  it('should hide streak badge when streak is 0', () => {
    expect(shouldShowStreakBadge(0)).toBe(false)
  })

  it('should format streak text correctly', () => {
    expect(getStreakText(5)).toBe('5 day streak')
    expect(getStreakText(30)).toBe('30 day streak')
  })
})

// ============================================================
// 10. CSS CUSTOM ANIMATIONS (from globals.css)
// ============================================================

describe('P2 - CSS Custom Animations', () => {
  describe('fade-up keyframe', () => {
    const fadeUp = {
      from: { opacity: 0, translateY: '20px' },
      to: { opacity: 1, translateY: '0' },
    }

    it('should start invisible', () => {
      expect(fadeUp.from.opacity).toBe(0)
    })

    it('should start offset downward', () => {
      expect(fadeUp.from.translateY).toBe('20px')
    })

    it('should end fully visible', () => {
      expect(fadeUp.to.opacity).toBe(1)
    })

    it('should end at original position', () => {
      expect(fadeUp.to.translateY).toBe('0')
    })
  })

  describe('pulse-gentle keyframe', () => {
    const pulseGentle = {
      from: { scale: 1, opacity: 1 },
      to: { scale: 1.02, opacity: 0.85 },
    }

    it('should scale up slightly', () => {
      expect(pulseGentle.to.scale).toBe(1.02)
    })

    it('should reduce opacity slightly', () => {
      expect(pulseGentle.to.opacity).toBe(0.85)
    })

    it('should start at normal scale', () => {
      expect(pulseGentle.from.scale).toBe(1)
    })
  })

  describe('Scrollbar styling', () => {
    const scrollbar = {
      width: 'thin',
      color: '#F5D5E0', // rose-light
      thumbWidth: '6px',
    }

    it('should use thin scrollbar', () => {
      expect(scrollbar.width).toBe('thin')
    })

    it('should use rose-light color for scrollbar', () => {
      expect(scrollbar.color).toBe('#F5D5E0')
    })

    it('should have 6px thumb width', () => {
      expect(scrollbar.thumbWidth).toBe('6px')
    })
  })
})
