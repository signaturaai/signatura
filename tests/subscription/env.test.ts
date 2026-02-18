/**
 * Subscription Environment Variables Tests (Phase 4.1)
 *
 * RALPH tests to validate that .env.example contains all required
 * subscription-related environment variables.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// Read .env.example once for all tests
let envExampleContent: string

beforeAll(() => {
  const envExamplePath = path.join(process.cwd(), '.env.example')
  envExampleContent = fs.readFileSync(envExamplePath, 'utf-8')
})

// ============================================================================
// Section Headers
// ============================================================================

describe('.env.example Section Headers', () => {
  it('should have Subscription System — Kill Switch section', () => {
    expect(envExampleContent).toContain('# Subscription System — Kill Switch')
  })

  it('should have Grow (Meshulam) Payment Gateway section', () => {
    expect(envExampleContent).toContain('# Grow (Meshulam) Payment Gateway')
  })

  it('should have Morning (Green Invoice) section', () => {
    expect(envExampleContent).toContain('# Morning (Green Invoice')
  })

  it('should have Cron Secret section', () => {
    expect(envExampleContent).toContain('# Cron Secret')
  })
})

// ============================================================================
// Kill Switch Variables
// ============================================================================

describe('Kill Switch Environment Variables', () => {
  it('should define SUBSCRIPTION_ENABLED=false', () => {
    expect(envExampleContent).toMatch(/^SUBSCRIPTION_ENABLED=false$/m)
  })

  it('should define NEXT_PUBLIC_SUBSCRIPTION_ENABLED=false', () => {
    expect(envExampleContent).toMatch(/^NEXT_PUBLIC_SUBSCRIPTION_ENABLED=false$/m)
  })

  it('kill switch should default to false (DORMANT mode)', () => {
    const subscriptionEnabledMatch = envExampleContent.match(/^SUBSCRIPTION_ENABLED=(.*)$/m)
    const nextPublicMatch = envExampleContent.match(/^NEXT_PUBLIC_SUBSCRIPTION_ENABLED=(.*)$/m)

    expect(subscriptionEnabledMatch?.[1]).toBe('false')
    expect(nextPublicMatch?.[1]).toBe('false')
  })
})

// ============================================================================
// Grow (Meshulam) Payment Gateway Variables
// ============================================================================

describe('Grow Payment Gateway Environment Variables', () => {
  describe('API configuration', () => {
    it('should define GROW_API_URL with sandbox URL', () => {
      expect(envExampleContent).toMatch(/^GROW_API_URL=https:\/\/sandbox\.meshulam\.co\.il\/api\/light\/server\/1\.0$/m)
    })

    it('should define GROW_USER_ID (empty)', () => {
      expect(envExampleContent).toMatch(/^GROW_USER_ID=$/m)
    })

    it('should define GROW_WEBHOOK_KEY (empty)', () => {
      expect(envExampleContent).toMatch(/^GROW_WEBHOOK_KEY=$/m)
    })
  })

  describe('Momentum tier page codes', () => {
    it('should define GROW_PAGE_CODE_MOMENTUM_MONTHLY', () => {
      expect(envExampleContent).toMatch(/^GROW_PAGE_CODE_MOMENTUM_MONTHLY=$/m)
    })

    it('should define GROW_PAGE_CODE_MOMENTUM_QUARTERLY', () => {
      expect(envExampleContent).toMatch(/^GROW_PAGE_CODE_MOMENTUM_QUARTERLY=$/m)
    })

    it('should define GROW_PAGE_CODE_MOMENTUM_YEARLY', () => {
      expect(envExampleContent).toMatch(/^GROW_PAGE_CODE_MOMENTUM_YEARLY=$/m)
    })
  })

  describe('Accelerate tier page codes', () => {
    it('should define GROW_PAGE_CODE_ACCELERATE_MONTHLY', () => {
      expect(envExampleContent).toMatch(/^GROW_PAGE_CODE_ACCELERATE_MONTHLY=$/m)
    })

    it('should define GROW_PAGE_CODE_ACCELERATE_QUARTERLY', () => {
      expect(envExampleContent).toMatch(/^GROW_PAGE_CODE_ACCELERATE_QUARTERLY=$/m)
    })

    it('should define GROW_PAGE_CODE_ACCELERATE_YEARLY', () => {
      expect(envExampleContent).toMatch(/^GROW_PAGE_CODE_ACCELERATE_YEARLY=$/m)
    })
  })

  describe('Elite tier page codes', () => {
    it('should define GROW_PAGE_CODE_ELITE_MONTHLY', () => {
      expect(envExampleContent).toMatch(/^GROW_PAGE_CODE_ELITE_MONTHLY=$/m)
    })

    it('should define GROW_PAGE_CODE_ELITE_QUARTERLY', () => {
      expect(envExampleContent).toMatch(/^GROW_PAGE_CODE_ELITE_QUARTERLY=$/m)
    })

    it('should define GROW_PAGE_CODE_ELITE_YEARLY', () => {
      expect(envExampleContent).toMatch(/^GROW_PAGE_CODE_ELITE_YEARLY=$/m)
    })
  })

  it('should have exactly 9 page code variables (3 tiers × 3 periods)', () => {
    const pageCodeMatches = envExampleContent.match(/^GROW_PAGE_CODE_\w+=.*$/gm)
    expect(pageCodeMatches).toHaveLength(9)
  })

  it('page codes should follow TIER_PERIOD naming convention', () => {
    const tiers = ['MOMENTUM', 'ACCELERATE', 'ELITE']
    const periods = ['MONTHLY', 'QUARTERLY', 'YEARLY']

    tiers.forEach(tier => {
      periods.forEach(period => {
        const varName = `GROW_PAGE_CODE_${tier}_${period}`
        expect(envExampleContent).toContain(varName)
      })
    })
  })
})

// ============================================================================
// Morning (Green Invoice) Variables
// ============================================================================

describe('Morning (Green Invoice) Environment Variables', () => {
  it('should define MORNING_API_URL with sandbox URL', () => {
    expect(envExampleContent).toMatch(/^MORNING_API_URL=https:\/\/sandbox\.d\.greeninvoice\.co\.il\/api\/v1$/m)
  })

  it('should define MORNING_API_KEY (empty)', () => {
    expect(envExampleContent).toMatch(/^MORNING_API_KEY=$/m)
  })

  it('should define MORNING_API_SECRET (empty)', () => {
    expect(envExampleContent).toMatch(/^MORNING_API_SECRET=$/m)
  })

  it('should use sandbox URL for development safety', () => {
    const apiUrlMatch = envExampleContent.match(/^MORNING_API_URL=(.*)$/m)
    expect(apiUrlMatch?.[1]).toContain('sandbox')
  })
})

// ============================================================================
// Cron Secret
// ============================================================================

describe('Cron Secret Environment Variable', () => {
  it('should define CRON_SECRET (empty)', () => {
    expect(envExampleContent).toMatch(/^CRON_SECRET=$/m)
  })

  it('should have comment about generating with openssl', () => {
    expect(envExampleContent).toContain('openssl rand -hex 32')
  })
})

// ============================================================================
// Cross-Validation
// ============================================================================

describe('Environment Variables Cross-Validation', () => {
  it('should not modify existing Supabase configuration', () => {
    expect(envExampleContent).toContain('NEXT_PUBLIC_SUPABASE_URL=')
    expect(envExampleContent).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY=')
    expect(envExampleContent).toContain('SUPABASE_SERVICE_ROLE_KEY=')
  })

  it('should not modify existing OpenAI configuration', () => {
    expect(envExampleContent).toContain('OPENAI_API_KEY=')
    expect(envExampleContent).toContain('OPENAI_MODEL=')
  })

  it('should not modify existing Application configuration', () => {
    expect(envExampleContent).toContain('NEXT_PUBLIC_APP_URL=')
    expect(envExampleContent).toContain('NEXT_PUBLIC_APP_NAME=')
  })

  it('should not modify existing Development settings', () => {
    expect(envExampleContent).toContain('DEBUG_MODE=')
    expect(envExampleContent).toContain('USE_MOCK_AI=')
  })

  it('subscription sections should appear after development settings', () => {
    const developmentIndex = envExampleContent.indexOf('USE_MOCK_AI=')
    const subscriptionIndex = envExampleContent.indexOf('SUBSCRIPTION_ENABLED=')

    expect(subscriptionIndex).toBeGreaterThan(developmentIndex)
  })

  it('all sandbox URLs should use HTTPS', () => {
    const growUrl = envExampleContent.match(/^GROW_API_URL=(.*)$/m)?.[1]
    const morningUrl = envExampleContent.match(/^MORNING_API_URL=(.*)$/m)?.[1]

    expect(growUrl).toMatch(/^https:\/\//)
    expect(morningUrl).toMatch(/^https:\/\//)
  })
})

// ============================================================================
// Variable Count Summary
// ============================================================================

describe('Environment Variables Count', () => {
  it('should have 2 kill switch variables', () => {
    const killSwitchVars = ['SUBSCRIPTION_ENABLED', 'NEXT_PUBLIC_SUBSCRIPTION_ENABLED']
    killSwitchVars.forEach(varName => {
      expect(envExampleContent).toContain(`${varName}=`)
    })
  })

  it('should have 12 Grow variables (API + 9 page codes + webhook)', () => {
    const growVars = [
      'GROW_API_URL',
      'GROW_USER_ID',
      'GROW_PAGE_CODE_MOMENTUM_MONTHLY',
      'GROW_PAGE_CODE_MOMENTUM_QUARTERLY',
      'GROW_PAGE_CODE_MOMENTUM_YEARLY',
      'GROW_PAGE_CODE_ACCELERATE_MONTHLY',
      'GROW_PAGE_CODE_ACCELERATE_QUARTERLY',
      'GROW_PAGE_CODE_ACCELERATE_YEARLY',
      'GROW_PAGE_CODE_ELITE_MONTHLY',
      'GROW_PAGE_CODE_ELITE_QUARTERLY',
      'GROW_PAGE_CODE_ELITE_YEARLY',
      'GROW_WEBHOOK_KEY',
    ]
    expect(growVars).toHaveLength(12)
    growVars.forEach(varName => {
      expect(envExampleContent).toContain(`${varName}=`)
    })
  })

  it('should have 3 Morning variables', () => {
    const morningVars = ['MORNING_API_URL', 'MORNING_API_KEY', 'MORNING_API_SECRET']
    morningVars.forEach(varName => {
      expect(envExampleContent).toContain(`${varName}=`)
    })
  })

  it('should have 1 Cron variable', () => {
    expect(envExampleContent).toContain('CRON_SECRET=')
  })

  it('should have 18 total subscription-related variables', () => {
    // 2 kill switch + 12 Grow + 3 Morning + 1 Cron = 18
    const subscriptionVars = [
      'SUBSCRIPTION_ENABLED',
      'NEXT_PUBLIC_SUBSCRIPTION_ENABLED',
      'GROW_API_URL',
      'GROW_USER_ID',
      'GROW_PAGE_CODE_MOMENTUM_MONTHLY',
      'GROW_PAGE_CODE_MOMENTUM_QUARTERLY',
      'GROW_PAGE_CODE_MOMENTUM_YEARLY',
      'GROW_PAGE_CODE_ACCELERATE_MONTHLY',
      'GROW_PAGE_CODE_ACCELERATE_QUARTERLY',
      'GROW_PAGE_CODE_ACCELERATE_YEARLY',
      'GROW_PAGE_CODE_ELITE_MONTHLY',
      'GROW_PAGE_CODE_ELITE_QUARTERLY',
      'GROW_PAGE_CODE_ELITE_YEARLY',
      'GROW_WEBHOOK_KEY',
      'MORNING_API_URL',
      'MORNING_API_KEY',
      'MORNING_API_SECRET',
      'CRON_SECRET',
    ]

    expect(subscriptionVars).toHaveLength(18)
    subscriptionVars.forEach(varName => {
      expect(envExampleContent).toContain(`${varName}=`)
    })
  })
})
